#!/usr/bin/env python3
"""透過立ち絵を、頭部比率を揃えた 700x1200 のバストアップへ整形する。"""
import argparse
import shutil
from pathlib import Path

from PIL import Image


CANVAS = (700, 1200)
# 髪型と葡萄色の肩線が連続する藤乃だけは、アルファの横幅が髪の膨らみを
# 肩と誤認する。原本を目視して得た頭頂から肩までの値で補正する。
HEAD_OVERRIDES = {
    "chara_fujino_normal.png": 300,
    "chara_fujino_sad.png": 200,
    "chara_fujino_uneasy.png": 300,
}


def bbox_and_widths(alpha: Image.Image):
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("非透明画素がありません")
    px = alpha.load()
    widths = []
    for y in range(bbox[1], bbox[3]):
        xs = [x for x in range(bbox[0], bbox[2]) if px[x, y] > 8]
        widths.append((y, max(xs) - min(xs) + 1 if xs else 0))
    return bbox, widths


def shoulder_line(bbox, widths):
    """頭部直後に横幅が初めて大きく広がる行を、肩の近似として返す。"""
    body_width = max(width for _, width in widths)
    top = bbox[1]
    # 髪先の細い揺れを避け、上端の2%より下から探す。頭部幅より十分広い
    # （全身・寄りのどちらでも肩に相当する）最初の連続行を採る。
    start = top + max(3, int((bbox[3] - top) * 0.02))
    threshold = max(40, int(body_width * 0.62))
    candidates = []
    for i, (y, width) in enumerate(widths):
        if y < start or width < threshold:
            continue
        following = [item[1] for item in widths[i:i + 8]]
        if len(following) >= 4 and sum(value >= threshold for value in following) >= 4:
            candidates.append(y)
    if not candidates:
        return top + max(1, int((bbox[3] - top) * 0.22))
    return candidates[0]


def crop_one(source: Path, output: Path, multiplier: float) -> tuple[int, int, int]:
    im = Image.open(source).convert("RGBA")
    bbox, widths = bbox_and_widths(im.getchannel("A"))
    shoulder = shoulder_line(bbox, widths)
    head = HEAD_OVERRIDES.get(source.name, max(20, shoulder - bbox[1]))
    shoulder = bbox[1] + head
    crop_height = max(head * multiplier, 80)
    # 頭頂に4%の余白を取り、人物の切断位置を出力下端に合わせる。
    top = bbox[1] - head * 0.04
    bottom = top + crop_height
    crop_width = crop_height * CANVAS[0] / CANVAS[1]
    center = (bbox[0] + bbox[2]) / 2
    left = center - crop_width / 2
    right = center + crop_width / 2

    # Pillow は範囲外を透明で補うため、元キャンバスの端にいても安全に切り出せる。
    cropped = im.crop((round(left), round(top), round(right), round(bottom)))
    cropped = cropped.resize(CANVAS, Image.Resampling.LANCZOS)
    cropped.save(output)
    return bbox[1], shoulder, head


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", nargs="?", type=Path, default=Path("assets/chara"))
    parser.add_argument("--backup", type=Path, default=Path("assets/chara/_原本"))
    parser.add_argument("--multiplier", type=float, default=3.55)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    files = sorted(args.directory.glob("*.png"))
    if not files:
        raise SystemExit("立ち絵 PNG がありません")
    if not args.dry_run:
        args.backup.mkdir(parents=True, exist_ok=True)
    for path in files:
        backup = args.backup / path.name
        if not args.dry_run and not backup.exists():
            shutil.copy2(path, backup)
        source = backup if backup.exists() else path
        if args.dry_run:
            im = Image.open(source).convert("RGBA")
            bbox, widths = bbox_and_widths(im.getchannel("A"))
            shoulder = bbox[1] + HEAD_OVERRIDES.get(path.name, shoulder_line(bbox, widths) - bbox[1])
            print(f"{path.name}: top={bbox[1]} shoulder={shoulder} head={shoulder-bbox[1]}")
        else:
            top, shoulder, head = crop_one(source, path, args.multiplier)
            print(f"{path.name}: top={top} shoulder={shoulder} head={head}")


if __name__ == "__main__":
    main()
