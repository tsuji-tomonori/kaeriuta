#!/usr/bin/env python3
"""立ち絵のキー色漏れと不透明度を全画素・輪郭帯ごとに検品する。"""
import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


def alpha_edge_band(alpha: Image.Image, inward: int) -> Image.Image:
    """非透明領域の外周から内側 ``inward`` px を返す。

    MaxFilter は背景側へ膨張するため、アルファを反転してから膨張し、
    もう一度反転して内側への収縮を得る。元アルファとの差分が輪郭帯である。
    """
    size = inward * 2 + 1
    solid = alpha.point(lambda value: 255 if value else 0)
    eroded = ImageChops.invert(ImageChops.invert(solid).filter(ImageFilter.MaxFilter(size)))
    return ImageChops.subtract(solid, eroded)


def alpha_interior(alpha: Image.Image, inward: int) -> Image.Image:
    """非透明形状の外周から ``inward`` px 以上離れた内側領域を返す。"""
    size = inward * 2 + 1
    solid = alpha.point(lambda value: 255 if value else 0)
    return ImageChops.invert(ImageChops.invert(solid).filter(ImageFilter.MaxFilter(size)))


def inspect(path: Path, gap: int, inward: int) -> tuple[int, int, int, int, int, float, float, float, bool]:
    im = Image.open(path).convert("RGBA")
    r, g, b, alpha = im.split()
    # 明るさは条件にしない。G が R/B の双方より gap 以上低い紫・マゼンタを
    # 対象にする。R/B の差が大きすぎる青紫・赤紫の衣装は対象外にする。
    min_rb = ImageChops.darker(r, b)
    green_gap = ImageChops.subtract(min_rb, g).point(lambda value: 255 if value >= gap else 0)
    balanced_rb = ImageChops.difference(r, b).point(lambda value: 255 if value <= 72 else 0)
    purple = ImageChops.multiply(green_gap, balanced_rb)
    visible = alpha.point(lambda value: 255 if value else 0)
    hits = ImageChops.multiply(purple, visible)
    band = alpha_edge_band(alpha, inward)
    edge_hits = ImageChops.multiply(hits, band)

    hit_values = list(hits.get_flattened_data())
    edge_values = list(edge_hits.get_flattened_data())
    alpha_values = list(alpha.get_flattened_data())
    # 半透明画素も検出対象にするため、個数に加えて alpha/255 の重み付き量を出す。
    total_weight = sum(a for hit, a in zip(hit_values, alpha_values) if hit) / 255.0
    edge_weight = sum(a for hit, a in zip(edge_values, alpha_values) if hit) / 255.0
    visible_values = [value for value in alpha_values if value]
    interior = alpha_interior(alpha, inward)
    interior_values = [value for value, mask in zip(alpha_values, interior.get_flattened_data()) if mask]
    mean_alpha = sum(visible_values) / len(visible_values) if visible_values else 0.0
    opaque_ratio = 100.0 * sum(value == 255 for value in visible_values) / len(visible_values) if visible_values else 0.0
    interior_mean = sum(interior_values) / len(interior_values) if interior_values else 0.0
    return (
        sum(1 for value in hit_values if value),
        round(total_weight),
        sum(1 for value in edge_values if value),
        round(edge_weight),
        sum(1 for value in visible.get_flattened_data() if value),
        mean_alpha,
        opaque_ratio,
        interior_mean,
        im.size == (700, 1200) and im.mode == "RGBA",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="*", type=Path, default=[Path("assets/chara")])
    parser.add_argument("--gap", type=int, default=18, help="G と R/B の最小差")
    parser.add_argument("--inward", type=int, default=5, help="輪郭から内側へ調べる幅 px")
    parser.add_argument("--min-interior-alpha", type=float, default=250.0, help="内側領域の平均α下限")
    parser.add_argument("--min-opaque-ratio", type=float, default=95.0, help="完全不透明画素率の下限(%%)")
    parser.add_argument("--require-zero-edge-purple", action="store_true", default=True, help="輪郭紫を0pxとする")
    args = parser.parse_args()
    files = []
    for path in args.paths:
        files.extend(sorted(path.glob("*.png")) if path.is_dir() else [path])
    totals = [0, 0, 0, 0]
    failures = 0
    for path in files:
        all_px, all_weight, edge_px, edge_weight, visible, mean_alpha, opaque_ratio, interior_mean, valid_format = inspect(path, args.gap, args.inward)
        totals = [a + b for a, b in zip(totals, (all_px, all_weight, edge_px, edge_weight))]
        errors = []
        if interior_mean < args.min_interior_alpha:
            errors.append(f"内側平均α {interior_mean:.1f} < {args.min_interior_alpha:.1f}")
        if opaque_ratio < args.min_opaque_ratio:
            errors.append(f"不透明率 {opaque_ratio:.1f}% < {args.min_opaque_ratio:.1f}%")
        if args.require_zero_edge_purple and edge_px:
            errors.append(f"輪郭紫 {edge_px}px")
        if not valid_format:
            errors.append("700x1200 RGBAではない")
        failures += bool(errors)
        result = "エラー: " + " / ".join(errors) if errors else "OK"
        print(f"{path}: {result} / 可視平均α {mean_alpha:.1f} / 完全不透明 {opaque_ratio:.1f}% / 内側平均α {interior_mean:.1f} / 輪郭紫 {edge_px}px (α重み {edge_weight}) / 全体紫 {all_px}px / 可視 {visible}px")
    print(f"合計: 輪郭紫 {totals[2]}px (α重み {totals[3]}) / 全体紫 {totals[0]}px (α重み {totals[1]}) / {len(files)} 点")
    if failures:
        raise SystemExit(f"不合格: {failures}/{len(files)} 点")


if __name__ == "__main__":
    main()
