# アイコン生成: uv run --with pillow make_icons.py
from PIL import Image, ImageDraw
N = 64  # ドット単位のキャンバス
img = Image.new('RGB', (N, N), '#1d2b53')
d = ImageDraw.Draw(img)
def cube(x, y, s, base, hi, lo, dark):
    d.rectangle([x, y, x+s-1, y+s-1], fill=dark)
    d.rectangle([x+1, y+1, x+s-2, y+s-2], fill=lo)
    d.rectangle([x+1, y+1, x+s-3, y+s-3], fill=base)
    d.line([x+1, y+1, x+s-3, y+1], fill=hi); d.line([x+1, y+1, x+1, y+s-3], fill=hi)
TEN = ('#ffa300', '#ffe28c', '#d45f00', '#4a1d00'); ONE = ('#29adff', '#c4f0ff', '#1868c0', '#06204a')
for r in range(2):
    for i in range(10): cube(8 + r*9, 8 + i*5, 5, *TEN)
d.rectangle([28, 29, 35, 30], fill='#fff1e8'); d.rectangle([31, 26, 32, 33], fill='#fff1e8')
for i in range(7): cube(40 + (i % 2)*7, 14 + (i//2)*7, 6, *ONE)
for s, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'icon-180.png')]:
    img.resize((s, s), Image.NEAREST).save(name)
