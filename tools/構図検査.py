#!/usr/bin/env python3
"""構図統一後の立ち絵について、アルファ形状から頭部比率を検査する。"""
import argparse
import statistics
from pathlib import Path

from PIL import Image, ImageDraw

from 構図統一 import bbox_and_widths, shoulder_line


# 藤乃は夜会巻きの横幅を肩と誤認するため、構図統一時と同じ目視補正を適用する。
POST_CROP_HEAD_OVERRIDES = {
    # 同行者kindは首をかしげた髪の横幅を肩と誤認するため、目視した頭頂から
    # 肩までの値で補正する。
    "chara_companion_kind.png": 338,
    "chara_fujino_normal.png": 338,
    "chara_fujino_sad.png": 338,
    "chara_fujino_uneasy.png": 338,
}


def inspect(path: Path):
    image = Image.open(path).convert("RGBA")
    bbox, widths = bbox_and_widths(image.getchannel("A"))
    shoulder = shoulder_line(bbox, widths)
    head = POST_CROP_HEAD_OVERRIDES.get(path.name, shoulder - bbox[1])
    shoulder = bbox[1] + head
    ratio = head / image.height
    return image, bbox, shoulder, head, ratio


def contact_sheet(paths, output: Path):
    tiles = []
    for path in paths:
        im = Image.open(path).convert("RGBA")
        bg = Image.new("RGBA", im.size, (112, 112, 112, 255))
        bg.alpha_composite(im)
        tiles.append(bg.convert("RGB"))
    sheet = Image.new("RGB", (700 * len(tiles), 1240), (42, 42, 42))
    draw = ImageDraw.Draw(sheet)
    for i, (tile, path) in enumerate(zip(tiles, paths)):
        sheet.paste(tile, (i * 700, 0))
        draw.text((i * 700 + 12, 1210), path.stem.replace("chara_", ""), fill="white")
    sheet.save(output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", nargs="?", type=Path, default=Path("assets/chara"))
    parser.add_argument("--sheet", type=Path)
    args = parser.parse_args()
    files = sorted(args.directory.glob("*.png"))
    ratios = []
    for path in files:
        _, bbox, shoulder, head, ratio = inspect(path)
        ratios.append(ratio)
        print(f"{path.name}: 頭部 {head}px / 1200px = {ratio:.1%} (top={bbox[1]}, shoulder={shoulder})")
    mean = statistics.mean(ratios)
    print(f"平均 {mean:.1%} / 最小 {min(ratios):.1%} / 最大 {max(ratios):.1%} / 平均からの最大差 {max(abs(x-mean) for x in ratios):.1%}")
    if args.sheet:
        wanted = ["chara_shiori_normal.png", "chara_sogen_speech.png", "chara_goko_normal.png",
                  "chara_companion_normal.png", "chara_observer_watch.png", "chara_detective_normal.png"]
        lookup = {p.name: p for p in files}
        missing = [name for name in wanted if name not in lookup]
        if missing:
            raise SystemExit(f"確認画像用ファイルがありません: {', '.join(missing)}")
        contact_sheet([lookup[name] for name in wanted], args.sheet)
        print(f"確認画像: {args.sheet}")


if __name__ == "__main__":
    main()
