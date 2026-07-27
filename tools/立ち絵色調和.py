#!/usr/bin/env python3
"""立ち絵の RGB だけを連続マスクで色調和する（アルファ・座標は不変）。"""
import argparse
import importlib.util
import math
from pathlib import Path

from PIL import Image

# value は通常閾値より意図的に厳しい到達値。None は現状維持（補正率0）。
TARGETS = {
    ("sogen", "shadow"): ("smile", {"hair": 41.99}),
    ("sogen", "speech"): ("smile", {"hair": 42., "skin": 25.99}),
    ("detective", "sleepy"): ("normal", {"hair": 30.}),
    ("uno", "kind"): ("normal", None),
    # Q-1 で例外を廃止するため、実測で閾値を超える肌帯だけを補正する。
    ("fujino", "sad"): ("normal", {"skin": 25.99}),
}
BANDS = {
    "hair": (.02, .10, .00, 1.00, .025, .00),
    "clothes": (.55, .80, .25, .75, .035, .050),
    "skin": (.11, .17, .40, .60, .020, .030),
}
MAX_LUMINANCE_CHANGE = .05


def bbox(image):
    box = image.getchannel("A").getbbox()
    if not box:
        raise ValueError("透明画像は補正できません")
    return box


def band_values(image, band):
    y0, y1, x0, x1, _, _ = BANDS[band]
    left, top, right, bottom = bbox(image)
    xa, xb = left + round((right-left)*x0), left + round((right-left)*x1)
    ya, yb = top + round((bottom-top)*y0), top + round((bottom-top)*y1)
    values = [image.getpixel((x, y))[:3] for y in range(ya, max(ya+1, yb)) for x in range(xa, max(xa+1, xb)) if image.getpixel((x, y))[3] > 8]
    if not values:
        return (0., 0., 0.), (1., 1., 1.)
    means = tuple(sum(p[c] for p in values)/len(values) for c in range(3))
    deviations = tuple(max(4., math.sqrt(sum((p[c]-means[c])**2 for p in values)/len(values))) for c in range(3))
    return means, deviations


def fade(value, start, end, feather):
    if feather <= 0:
        return float(start <= value <= end)
    if value < start-feather or value > end+feather:
        return 0.
    if value < start:
        return (value-(start-feather))/feather
    if value > end:
        return ((end+feather)-value)/feather
    return 1.


def weight(rel_x, rel_y, band):
    y0, y1, x0, x1, yf, xf = BANDS[band]
    return fade(rel_y, y0, y1, yf) * fade(rel_x, x0, x1, xf)


def harmonize(master, variant, strength):
    """帯境界をフェザーした線形変換。返却画像の alpha は入力と完全一致する。"""
    if master.size != variant.size:
        raise ValueError("マスターと差分のキャンバスサイズが異なります")
    transforms = {name: (*band_values(master, name), *band_values(variant, name)) for name in BANDS}
    left, top, right, bottom = bbox(variant); source = variant.load(); output = variant.copy(); destination = output.load()
    for y in range(variant.height):
        rel_y = (y-top)/max(1, bottom-top)
        for x in range(variant.width):
            red, green, blue, alpha = source[x, y]
            if not alpha:
                continue
            rel_x = (x-left)/max(1, right-left)
            weights = {name: weight(rel_x, rel_y, name) for name in BANDS}
            total = sum(weights.values())
            if not total:
                continue
            proposed = []
            for channel, value in enumerate((red, green, blue)):
                adjusted = 0.
                for name, w in weights.items():
                    if w:
                        mean_m, sd_m, mean_v, sd_v = transforms[name]
                        linear = (value-mean_v[channel])*(sd_m[channel]/sd_v[channel])+mean_m[channel]
                        adjusted += w*linear
                proposed.append(round(max(0, min(255, value+strength*(adjusted/total-value)))))
            destination[x, y] = (*proposed, alpha)
    if output.getchannel("A").tobytes() != variant.getchannel("A").tobytes():
        raise AssertionError("アルファが変化しました")
    return output


def luminance(image):
    values = [p for p in image.getdata() if p[3] > 8]
    return sum(.2126*p[0]+.7152*p[1]+.0722*p[2] for p in values)/len(values)


def load_inspector():
    path = Path(__file__).with_name("立ち絵同一性検査.py")
    spec = importlib.util.spec_from_file_location("identity_inspector", path)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def color_ok(metrics, goals, inspector):
    limits = {key: inspector.LIMITS[key] for key in ("hair", "clothes", "skin")}
    limits.update(goals or {})
    return all(metrics[key] <= limit for key, limit in limits.items())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", nargs="?", type=Path, default=Path("assets/chara"))
    parser.add_argument("--out", type=Path, help="採用済みPNGの出力先。省略時は検証のみ")
    parser.add_argument("--only", action="append", default=[])
    parser.add_argument("--steps", type=int, default=100)
    args = parser.parse_args()
    if args.steps < 1:
        raise SystemExit("--steps は1以上にしてください")
    inspector = load_inspector(); results = []; failed = False
    for (char, expression), (master_expression, goals) in TARGETS.items():
        name = f"{char}/{expression}"
        if args.only and name not in args.only:
            continue
        master = Image.open(args.directory/f"chara_{char}_{master_expression}.png").convert("RGBA")
        before = Image.open(args.directory/f"chara_{char}_{expression}.png").convert("RGBA")
        before_metrics, before_luma = inspector.measure(master, before), luminance(before)
        selected = None
        if goals is None or color_ok(before_metrics, goals, inspector):
            selected = (0., before, before_metrics, before_luma)
        else:
            # 単調な補正率を二分探索し、最後に指定刻みへ切り上げる。100回の全画素
            # 走査は不要でありつつ、--steps=100 なら最小率を百分率単位で再現できる。
            def acceptable(strength):
                candidate = harmonize(master, before, strength)
                metrics, luma = inspector.measure(master, candidate), luminance(candidate)
                # 二分探索の単調条件は色と顔MADだけに限る。平均輝度の5%制限は
                # 補正率と必ずしも単調に見えないため、最小の色到達率で別途判定する。
                return (color_ok(metrics, goals, inspector)
                        and metrics["face_mad"] >= inspector.EXPRESSION_LIMITS["face_mad_min"]), candidate, metrics, luma
            ok, _, _, _ = acceptable(1.)
            if ok:
                low, high = 0., 1.
                for _ in range(math.ceil(math.log2(args.steps)) + 2):
                    middle = (low + high) / 2
                    if acceptable(middle)[0]:
                        high = middle
                    else:
                        low = middle
                start = max(1, math.ceil(high*args.steps)-1)
                for step in range(start, args.steps+1):
                    strength = step/args.steps
                    ok, candidate, metrics, luma = acceptable(strength)
                    if ok and abs(luma-before_luma)/before_luma <= MAX_LUMINANCE_CHANGE:
                        selected = (strength, candidate, metrics, luma); break
        if not selected:
            full = harmonize(master, before, 1.)
            full_metrics, full_luma = inspector.measure(master, full), luminance(full)
            change = (full_luma-before_luma)/before_luma*100
            failed = True; print(f"{name}: 未達（色・顔MAD・輝度5%の条件を同時に満たせません） / 100%時 髪={full_metrics['hair']:.1f} 服={full_metrics['clothes']:.1f} 肌={full_metrics['skin']:.1f} 顔MAD={full_metrics['face_mad']:.2f} 輝度変化={change:+.1f}%"); continue
        strength, image, metrics, after_luma = selected
        change = (after_luma-before_luma)/before_luma*100
        print(f"{name}: 採用 補正率={strength:.2f} / 髪={metrics['hair']:.1f} 服={metrics['clothes']:.1f} 肌={metrics['skin']:.1f} 顔MAD={metrics['face_mad']:.2f} / 平均輝度={before_luma:.2f}→{after_luma:.2f} ({change:+.1f}%)")
        if args.out:
            args.out.mkdir(parents=True, exist_ok=True); image.save(args.out/f"chara_{char}_{expression}.png")
    if failed:
        raise SystemExit("色調和未達があります")


if __name__ == "__main__":
    main()
