#!/usr/bin/env python3
"""Composite all cuts over a checkerboard + dark background for visual inspection."""
import sys
from PIL import Image

src_dir = sys.argv[1]
out_path = sys.argv[2]
files = sorted([f for f in __import__("os").listdir(src_dir) if f.endswith(".png")])
print(f"compositing {len(files)} files from {src_dir}")

# Read first to get sizes.
ims = [Image.open(f"{src_dir}/{f}").convert("RGBA") for f in files]
max_w = max(im.size[0] for im in ims)
max_h = max(im.size[1] for im in ims)

# Lay out 5 across.
n = len(ims)
gap = 12
total_w = n * max_w + (n - 1) * gap
total_h = max_h + 40

# Checkerboard background.
def checker(w, h, sq=24):
    img = Image.new("RGB", (w, h), (200, 200, 200))
    px = img.load()
    for y in range(h):
        for x in range(w):
            if ((x // sq) + (y // sq)) % 2 == 0:
                px[x, y] = (140, 140, 140)
    return img

canvas = checker(total_w, total_h)
cpx = canvas.load()

for i, im in enumerate(ims):
    ox = i * (max_w + gap)
    oy = 20
    iw, ih = im.size
    # Center vertically.
    cy = oy + (max_h - ih) // 2
    cx = ox + (max_w - iw) // 2
    for y in range(ih):
        for x in range(iw):
            r, g, b, a = im.getpixel((x, y))
            if a == 0:
                continue
            br, bgc, bb = cpx[cx + x, cy + y]
            # Standard "over" compositing.
            af = a / 255.0
            nr = int(r * af + br * (1 - af))
            ng = int(g * af + bgc * (1 - af))
            nb = int(b * af + bb * (1 - af))
            cpx[cx + x, cy + y] = (nr, ng, nb)

canvas.save(out_path)
print(f"wrote {out_path}")
