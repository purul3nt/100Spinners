#!/usr/bin/env python3
"""For each input PNG, save a version composited over a solid dark background.

This removes ambiguity from checkerboard or white-bg previews: any 'paper'
behind the subject becomes obvious black.
"""
import os
import sys
from PIL import Image

src_dir = sys.argv[1]
out_dir = sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
files = sorted([f for f in os.listdir(src_dir) if f.endswith(".png")])
for f in files:
    im = Image.open(f"{src_dir}/{f}").convert("RGBA")
    bg = Image.new("RGB", im.size, (28, 28, 36))
    out = Image.alpha_composite(bg.convert("RGBA"), im)
    out.convert("RGB").save(f"{out_dir}/dark_{f}")
    print(f"wrote {out_dir}/dark_{f}")
