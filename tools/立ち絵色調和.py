#!/usr/bin/env python3
"""表情差分の色だけを、マスターの帯域統計へ穏やかに近付ける。

RGB だけを補正し、入力のアルファ値と画素位置は変更しない。したがって
表情・輪郭・構図を複製したり動かしたりせず、透過マットもそのまま保たれる。
"""
import argparse
import importlib.util
import math
from pathlib import Path

from PIL import Image


TARGETS = {
    ("sogen", "shadow"): "smile",
    ("sogen", "speech"): "smile",
    ("detective", "sleepy"): "normal",
    ("uno", "kind"): "normal",
}
# y0, y1, x0, x1, 縦方向のぼかし幅, 横方向のぼかし幅
BANDS = {
    "hair": (.02, .10, .00, 1.00, .025, .00),
    "clothes": (.55, .80, .25, .75, .035, .050),
    "skin": (.11, .17, .40, .60, .020, .030),
}


def bbox(image):
    box = image.getchannel("A").getbbox()
    if not box:
        raise ValueError("透明画像は補正できません")
    return box


def parse(path):
    bits = path.stem.removeprefix("chara_").split("_")
    return bits[0], "_".join(bits[1:])


def band_values(image, band):
    """検査器と同じ相対帯から、可視 RGB の平均・標準偏差を取る。"""
    y0, y1, x0, x1, _, _ = BANDS[band]
    left, top, right, bottom = bbox(image)
    xa, xb = left + round((right - left) * x0), left + round((right - left) * x1)
    ya, yb = top + round((bottom - top) * y0), top + round((bottom - top) * y1)
    values = [image.getpixel((x, y))[:3] for y in range(ya, max(ya + 1, yb))
              for x in range(xa, max(xa + 1, xb)) if image.getpixel((x, y))[3] > 8]
    if not values:
        return (0., 0., 0.), (1., 1., 1.)
    means = tuple(sum(p[c] for p in values) / len(values) for c in range(3))
    # ごく小さい標準偏差で極端な倍率にならないよう、下限を置く。
    deviations = tuple(max(4., math.sqrt(sum((p[c] - means[c]) ** 2 for p in values) / len(values)))
                       for c in range(3))
    return means, deviations


def fade(value, start, end, feather):
    if feather <= 0:
        return 1. if start <= value <= end else 0.
    if value < start - feather or value > end + feather:
        return 0.
    if value < start:
        return (value - (start - feather)) / feather
    if value > end:
        return ((end + feather) - value) / feather
    return 1.


def weight(rel_x, rel_y, band):
    y0, y1, x0, x1, yf, xf = BANDS[band]
    return fade(rel_y, y0, y1, yf) * fade(rel_x, x0, x1, xf)


def harmonize(master, variant, strength):
    """帯ごとの線形変換を連続マスクで混ぜた RGBA 画像を返す。"""
    if master.size != variant.size:
        raise ValueError("マスターと差分のキャンバスサイズが異なります")
    transforms = {}
    for name in BANDS:
        mean_m, sd_m = band_values(master, name)
        mean_v, sd_v = band_values(variant, name)
        transforms[name] = (mean_m, mean_v, sd_m, sd_v)
    left, top, right, bottom = bbox(variant)
    source = variant.load()
    output = variant.copy()
    destination = output.load()
    for y in range(variant.height):
        rel_y = (y - top) / max(1, bottom - top)
        for x in range(variant.width):
            red, green, blue, alpha = source[x, y]
            if not alpha:
                continue
            rel_x = (x - left) / max(1, right - left)
            # 各帯の提案色を重み付き平均にし、無関係な場所には一切触れない。
            weights = {name: weight(rel_x, rel_y, name) for name in BANDS}
            total = sum(weights.values())
            if not total:
                continue
            proposals = []
            for channel, value in enumerate((red, green, blue)):
                corrected = 0.
                for name, w in weights.items():
                    if not w:
                        continue
                    mean_m, mean_v, sd_m, sd_v = transforms[name]
                    linear = (value - mean_v[channel]) * (sd_m[channel] / sd_v[channel]) + mean_m[channel]
                    corrected += w * linear
                proposed = corrected / total
                proposals.append(round(max(0, min(255, value + strength * (proposed - value)))))
            destination[x, y] = (*proposals, alpha)
    return output


def load_inspector():
    path = Path(__file__).with_name("立ち絵同一性検査.py")
    spec = importlib.util.spec_from_file_location("identity_inspector", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def failures(metrics, char, expression, inspector):
    bad = []
    for key, value in metrics.items():
        if key == "face_mad":
            continue
        if (key == "iou" and value < inspector.LIMITS[key]) or (key != "iou" and value > inspector.LIMITS[key]):
            bad.append(key)
    if (char, expression) in TARGETS:
        if metrics["iou"] > inspector.EXPRESSION_LIMITS["iou_max"]:
            bad.append("複製")
        if metrics["face_mad"] < inspector.EXPRESSION_LIMITS["face_mad_min"]:
            bad.append("表情差")
    return bad


def format_metrics(metrics):
    return (f"IoU={metrics['iou']:.3f} 髪={metrics['hair']:.1f} 服={metrics['clothes']:.1f} "
            f"肌={metrics['skin']:.1f} 頭={metrics['head']:.3f} 肩={metrics['shoulder']:.3f} "
            f"顔MAD={metrics['face_mad']:.2f}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", nargs="?", type=Path, default=Path("assets/chara"))
    parser.add_argument("--before", type=Path, default=Path("assets/chara/_改修前"))
    parser.add_argument("--out", type=Path, help="採用済み画像の出力先。省略時は検証のみ")
    parser.add_argument("--steps", type=int, default=100, help="最小補正率を探す刻み数")
    parser.add_argument("--only", action="append", default=[], help="対象を character/expression で限定（複数可）")
    parser.add_argument("--allow-partial", action="store_true", help="色指標のみ到達時も、アルファ由来の未達を明記して出力する")
    args = parser.parse_args()
    if args.steps < 1:
        raise SystemExit("--steps は 1 以上にしてください")
    inspector = load_inspector()
    results = []
    for (char, expression), master_expression in TARGETS.items():
        if args.only and f"{char}/{expression}" not in args.only:
            continue
        master_path = args.directory / f"chara_{char}_{master_expression}.png"
        variant_path = args.before / f"chara_{char}_{expression}.png"
        master = Image.open(master_path).convert("RGBA")
        before = Image.open(variant_path).convert("RGBA")
        before_metrics = inspector.measure(master, before)
        selected = None
        initial_failures = failures(before_metrics, char, expression, inspector)
        # アルファと座標を不変にする以上、この三つは色調和で直せない。先に
        # 判定して無意味な大量試行を避け、採用画像も作らない。
        immutable = {"iou", "head", "shoulder"}
        if any(item in immutable for item in initial_failures) and not args.allow_partial:
            results.append((char, expression, before_metrics, selected, initial_failures))
            continue
        # 既に基準内なら補正率0が「閾値を満たす最小値」である。
        if not initial_failures:
            selected = (0.0, before, before_metrics)
        else:
            # まず最大補正で到達可能性を確かめ、到達する場合だけ二分探索する。
            full = harmonize(master, before, 1.0)
            full_metrics = inspector.measure(master, full)
            full_bad = failures(full_metrics, char, expression, inspector)
            achievable = not full_bad if not args.allow_partial else not [item for item in full_bad if item not in immutable]
            if achievable:
                low, high = 0.0, 1.0
                for _ in range(max(1, math.ceil(math.log2(args.steps)))):
                    middle = (low + high) / 2
                    candidate = harmonize(master, before, middle)
                    candidate_bad = failures(inspector.measure(master, candidate), char, expression, inspector)
                    if candidate_bad if not args.allow_partial else [item for item in candidate_bad if item not in immutable]:
                        low = middle
                    else:
                        high = middle
                candidate = harmonize(master, before, high)
                selected = (high, candidate, inspector.measure(master, candidate))
        if selected and args.out:
            args.out.mkdir(parents=True, exist_ok=True)
            selected[1].save(args.out / variant_path.name)
        results.append((char, expression, before_metrics, selected, initial_failures))
    any_failure = False
    for char, expression, before_metrics, selected, initial_failures in results:
        prefix = f"{char}/{expression}"
        if selected:
            strength, _, after_metrics = selected
            print(f"{prefix}: 採用 補正率={strength:.2f}\n  改修前 {format_metrics(before_metrics)}\n  改修後 {format_metrics(after_metrics)}")
        else:
            any_failure = True
            immutable_bad = [item for item in initial_failures if item in immutable]
            print(f"{prefix}: 未達（改修前を維持）/ 不合格: {', '.join(initial_failures)}"
                  f"（色調和で直せない値: {', '.join(immutable_bad)}）\n  改修前 {format_metrics(before_metrics)}")
    if any_failure:
        raise SystemExit("色調和候補に全指標を満たさない対象があります")


if __name__ == "__main__":
    main()
