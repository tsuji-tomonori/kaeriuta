#!/usr/bin/env python3
"""単色クロマキーをアルファPNGへ変換し、輪郭帯のキー色を除去する。"""
import argparse
from collections import deque
from PIL import Image, ImageChops, ImageFilter


def edge_band(alpha: Image.Image, inward: int) -> Image.Image:
    size = inward * 2 + 1
    solid = alpha.point(lambda value: 255 if value else 0)
    eroded = ImageChops.invert(ImageChops.invert(solid).filter(ImageFilter.MaxFilter(size)))
    return ImageChops.subtract(solid, eroded)


def exterior_key_alpha(source: Image.Image, key: tuple[int, int, int], inner: int, outer: int) -> Image.Image:
    """外周と連結したキー色だけを透明化するアルファマットを返す。

    色距離だけで全画素を抜くと、紫の衣装など画像内のキー色に近い物まで
    背景と誤認する。外周から ``outer`` 以下のキー候補を探索することで、
    人物の内側に閉じた同系色は常に不透明のまま残す。
    """
    rgb = source.convert("RGB")
    width, height = rgb.size
    pixels = list(rgb.get_flattened_data())
    distance = [max(abs(red - key[0]), abs(green - key[1]), abs(blue - key[2]))
                for red, green, blue in pixels]
    exterior = bytearray(width * height)
    queue: deque[int] = deque()

    def add(index: int) -> None:
        if not exterior[index] and distance[index] <= outer:
            exterior[index] = 1
            queue.append(index)

    for x in range(width):
        add(x)
        add((height - 1) * width + x)
    for y in range(1, height - 1):
        add(y * width)
        add(y * width + width - 1)
    while queue:
        index = queue.popleft()
        x, y = index % width, index // width
        if x:
            add(index - 1)
        if x + 1 < width:
            add(index + 1)
        if y:
            add(index - width)
        if y + 1 < height:
            add(index + width)

    scale = 255.0 / max(1, outer - inner)
    # 外周背景内だけに距離に応じたアンチエイリアスを許す。前景は必ず255。
    alpha = bytearray(len(pixels))
    for index, is_exterior in enumerate(exterior):
        if not is_exterior:
            alpha[index] = 255
        elif distance[index] <= inner:
            alpha[index] = 0
        else:
            alpha[index] = min(255, int((distance[index] - inner) * scale))
    return Image.frombytes("L", (width, height), bytes(alpha))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("input")
    p.add_argument("output")
    p.add_argument("--key", default="#ff00ff")
    p.add_argument("--inner", type=int, default=50, help="完全透明になる色距離")
    p.add_argument("--outer", type=int, default=135, help="外周連結背景として探索する色距離")
    p.add_argument("--inward", type=int, default=5, help="デスピルを輪郭から内側へ広げる幅 px")
    p.add_argument("--size", default=None, help="出力サイズ。例: 700x1200")
    a = p.parse_args()
    key = tuple(int(a.key.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    source = Image.open(a.input).convert("RGBA")
    if a.size:
        width, height = (int(value) for value in a.size.lower().split("x", 1))
        source = source.resize((width, height), Image.Resampling.LANCZOS)
    r, g, b, source_alpha = source.split()
    if source_alpha.getextrema() != (255, 255):
        # 既に透過済みの素材を再調整する際は既存マットを維持する。
        alpha = source_alpha
    else:
        alpha = exterior_key_alpha(source, key, a.inner, a.outer)

    min_rb = ImageChops.darker(r, b)
    # 輪郭から内側 a.inward px の範囲では、暗いマゼンタ焼き込みも除去する。
    # 色相を保つ必要がないキー漏れなので R/B を G まで下げ、G も軽く持ち上げる。
    purple = ImageChops.subtract(min_rb, g).point(lambda x: 255 if x >= 12 else 0)
    band = edge_band(alpha, a.inward)
    mask = ImageChops.multiply(purple, band)
    neutral = ImageChops.lighter(g, ImageChops.subtract(min_rb, Image.new("L", source.size, 6)))
    clean_r = Image.composite(neutral, r, mask)
    clean_b = Image.composite(neutral, b, mask)
    clean_g = Image.composite(neutral, g, mask)
    out = Image.merge("RGBA", (clean_r, clean_g, clean_b, alpha))
    out.save(a.output)


if __name__ == "__main__":
    main()
