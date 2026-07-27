#!/usr/bin/env python3
"""立ち絵差分の同一人物性を、姿勢に依存しない頭部形状で検査する。"""
import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw

MASTERS = {"sogen": "smile", "uno": "normal"}
LIMITS = {"head_iou": .85, "hair": 42, "clothes": 46, "skin": 26}
# 同一人物として成立している原本ペアの顔帯 MAD（RGB の絶対差平均）の最小値。
EXPRESSION_LIMITS = {"face_mad_min": 13.29}
# 表情消失の疑いがあった差分だけは、顔帯MADも必須にする。ほかの差分は表情の
# 変化量が小さい演出を含むため、顔帯MADは表示して拡大目視の補助に留める。
EXPRESSION_CHECKS = {("makabe", "uneasy"), ("detective", "sleepy"), ("shiori", "resolve"),
                     ("sogen", "speech"), ("sogen", "shadow"), ("uno", "kind")}
HEAD_SIZE = 200
HEAD_FRACTION = .25


def bbox(im):
    box = im.getchannel("A").getbbox()
    if not box:
        raise ValueError("透明画です")
    return box


def visible_width(im, rel_y):
    x0, y0, x1, y1 = bbox(im)
    y = min(y1 - 1, max(y0, y0 + round((y1 - y0) * rel_y)))
    xs = [x for x in range(x0, x1) if im.getpixel((x, y))[3] > 8]
    return (max(xs) - min(xs) + 1) if xs else 0


def mean_band(im, y0, y1, x0=0., x1=1.):
    l, t, r, b = bbox(im)
    xx0, xx1 = l + round((r - l) * x0), l + round((r - l) * x1)
    yy0, yy1 = t + round((b - t) * y0), t + round((b - t) * y1)
    values = [im.getpixel((x, y))[:3] for y in range(yy0, max(yy0 + 1, yy1))
              for x in range(xx0, max(xx0 + 1, xx1)) if im.getpixel((x, y))[3] > 8]
    return tuple(sum(v[i] for v in values) / len(values) for i in range(3)) if values else (0., 0., 0.)


def distance(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def face_mad(a, b):
    """顔帯（bbox 上端10〜22%、中央35〜65%）の平均絶対 RGB 差。"""
    al, at, ar, ab = bbox(a)
    bl, bt, br, bb = bbox(b)
    total = count = 0
    for iy in range(120):
        for ix in range(180):
            ax, ay = al + round((ar - al) * (.35 + ix / 179 * .30)), at + round((ab - at) * (.10 + iy / 119 * .12))
            bx, by = bl + round((br - bl) * (.35 + ix / 179 * .30)), bt + round((bb - bt) * (.10 + iy / 119 * .12))
            ap, bp = a.getpixel((min(ar - 1, ax), min(ab - 1, ay))), b.getpixel((min(br - 1, bx), min(bb - 1, by)))
            if ap[3] > 8 and bp[3] > 8:
                total += sum(abs(ap[i] - bp[i]) for i in range(3))
                count += 3
    return total / count if count else 0


def head_mask(im):
    """自身の bbox を 200px 正方形へ正規化した、上端 25% のアルファマスク。"""
    normalized = im.getchannel("A").crop(bbox(im)).resize((HEAD_SIZE, HEAD_SIZE), Image.Resampling.NEAREST)
    return normalized.crop((0, 0, HEAD_SIZE, round(HEAD_SIZE * HEAD_FRACTION)))


def mask_iou(a, b):
    both = either = 0
    for av, bv in zip(a.getdata(), b.getdata()):
        av, bv = av > 8, bv > 8
        both += av and bv
        either += av or bv
    return both / either if either else 0.


def full_iou(a, b):
    """従来の全身IoU。姿勢・小道具の影響を受けるため表示専用。"""
    both = either = 0
    for y in range(0, min(a.height, b.height), 4):
        for x in range(0, min(a.width, b.width), 4):
            av, bv = a.getpixel((x, y))[3] > 8, b.getpixel((x, y))[3] > 8
            both += av and bv
            either += av or bv
    return both / either if either else 0.


def measure(master, variant):
    return {
        "head_iou": mask_iou(head_mask(master), head_mask(variant)),
        "hair": distance(mean_band(master, .02, .10), mean_band(variant, .02, .10)),
        "clothes": distance(mean_band(master, .55, .80, .25, .75), mean_band(variant, .55, .80, .25, .75)),
        "skin": distance(mean_band(master, .11, .17, .40, .60), mean_band(variant, .11, .17, .40, .60)),
        "face_mad": face_mad(master, variant),
        # 以下は姿勢・小道具で変動する補助情報であり、不合格条件にはしない。
        "full_iou": full_iou(master, variant),
        "head_width": abs(visible_width(master, .07) / bbox(master)[2] - visible_width(variant, .07) / bbox(variant)[2]),
        "shoulder": abs(visible_width(master, .30) / bbox(master)[2] - visible_width(variant, .30) / bbox(variant)[2]),
    }


def failures(metrics, char=None, expression=None):
    bad = []
    for key in ("head_iou", "hair", "clothes", "skin"):
        if (key == "head_iou" and metrics[key] < LIMITS[key]) or (key != "head_iou" and metrics[key] > LIMITS[key]):
            bad.append(key)
    if (char, expression) in EXPRESSION_CHECKS and metrics["face_mad"] < EXPRESSION_LIMITS["face_mad_min"]:
        bad.append("face_mad")
    return bad


def parse(path):
    bits = path.stem.removeprefix("chara_").split("_")
    return bits[0], "_".join(bits[1:])


def sheet(groups, out, old_dir):
    out.mkdir(parents=True, exist_ok=True)
    for char, paths in groups.items():
        paths = sorted(paths, key=lambda p: (parse(p)[1] != MASTERS.get(char, "normal"), p.name))
        entries = []
        for p in paths:
            expr = parse(p)[1]
            if (old_dir / p.name).exists() and expr != MASTERS.get(char, "normal"):
                entries += [("master", next(q for q in paths if parse(q)[1] == MASTERS.get(char, "normal"))), ("before", old_dir / p.name), ("after", p)]
            else:
                entries.append((expr, p))
        canvas = Image.new("RGB", (420 * len(entries), 520), (38, 38, 38)); draw = ImageDraw.Draw(canvas)
        for n, (label, p) in enumerate(entries):
            im = Image.open(p).convert("RGBA"); bg = Image.new("RGBA", im.size, (112, 112, 112, 255)); bg.alpha_composite(im)
            l, t, r, b = bbox(im); crop = bg.crop((l + round((r-l)*.20), t, l + round((r-l)*.80), t + round((b-t)*.20))).resize((420,480), Image.Resampling.LANCZOS)
            canvas.paste(crop.convert("RGB"), (420*n, 0)); draw.text((420*n+12, 492), label, fill="white")
        canvas.save(out / f"立ち絵_{char}.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("directory", nargs="?", type=Path, default=Path("assets/chara"))
    ap.add_argument("--contact-sheet", action="store_true")
    ap.add_argument("--out", type=Path, default=Path("/tmp/kaeriuta-contact-sheets"))
    ap.add_argument("--before", type=Path, default=Path("assets/chara/_改修前2"))
    args = ap.parse_args(); groups = {}
    for p in sorted(args.directory.glob("chara_*.png")):
        groups.setdefault(parse(p)[0], []).append(p)
    failures_count = 0
    for char, paths in sorted(groups.items()):
        master_id = MASTERS.get(char, "normal")
        master_path = next((p for p in paths if parse(p)[1] == master_id), None)
        if not master_path:
            print(f"{char}: マスター {master_id} がないため未検査"); continue
        master = Image.open(master_path).convert("RGBA")
        for p in paths:
            _, expr = parse(p)
            if p == master_path:
                continue
            metrics = measure(master, Image.open(p).convert("RGBA")); bad = failures(metrics, char, expr)
            status = "OK" if not bad else "NG"
            reason = "" if not bad else " / 不合格: " + ", ".join(bad)
            print(f"{char}/{expr}: {status} 頭部IoU={metrics['head_iou']:.3f} 髪={metrics['hair']:.1f} 服={metrics['clothes']:.1f} 肌={metrics['skin']:.1f} 顔MAD={metrics['face_mad']:.2f} 補助: 全身IoU={metrics['full_iou']:.3f} 頭幅差={metrics['head_width']:.3f} 肩幅差={metrics['shoulder']:.3f}{reason}")
            failures_count += bool(bad)
    if args.contact_sheet:
        sheet(groups, args.out, args.before); print(f"コンタクトシート: {args.out}")
    if failures_count:
        raise SystemExit(f"不合格: {failures_count} 点")


if __name__ == "__main__":
    main()
