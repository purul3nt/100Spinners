#!/usr/bin/env python3
"""Render the 10 final cuts as they would appear in-game: on the parchment background."""
import os
from PIL import Image

# Load background.
bg = Image.open("/home/llama-claw/Repos/SixSixSix/src/assets/game/bg_sixsixsix.png").convert("RGB")
bg_w, bg_h = bg.size
print(f"bg {bg_w}x{bg_h}")

# Place each symbol at a fixed cell in a 5x2 grid.
# Grid: 5 cols x 2 rows. Top row = high-pay, bottom row = low-pay.
cell_w = 240
cell_h = 240
gap_x = 10
gap_y = 30
label_h = 30

canvas_w = 5 * cell_w + 4 * gap_x
canvas_h = 2 * cell_h + gap_y + label_h + 20

# Create final preview with bg as base, then place symbols on top.
out = bg.copy().resize((canvas_w, canvas_h))

# Place symbol PNGs.
high = sorted([f for f in os.listdir("/home/llama-claw/Repos/SixSixSix/src/assets/game/symbols_high") if f.endswith(".png")])
low = sorted([f for f in os.listdir("/home/llama-claw/Repos/SixSixSix/src/assets/game/symbols_low") if f.endswith(".png")])

for i, fname in enumerate(high):
    im = Image.open(f"/home/llama-claw/Repos/SixSixSix/src/assets/game/symbols_high/{fname}").convert("RGBA")
    iw, ih = im.size
    # Fit to cell preserving aspect.
    scale = min(cell_w / iw, cell_h / ih)
    new_w = int(iw * scale)
    new_h = int(ih * scale)
    im = im.resize((new_w, new_h), Image.LANCZOS)
    x = i * (cell_w + gap_x) + (cell_w - new_w) // 2
    y = (cell_h - new_h) // 2
    out.paste(im, (x, y), im)

for i, fname in enumerate(low):
    im = Image.open(f"/home/llama-claw/Repos/SixSixSix/src/assets/game/symbols_low/{fname}").convert("RGBA")
    # Apply grey-tint to simulate Baboon's LOW_PAY_GREY_TINT.
    # Simple approach: blend with grey.
    r, g, b, a = im.split()
    # Convert to greyscale-luminance-like tint.
    import math
    px = im.load()
    w, h = im.size
    tinted = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    tp = tinted.load()
    GREY = (196, 196, 196)  # 0xc4c4c4
    for y in range(h):
        for x in range(w):
            pr, pg, pb, pa = px[x, y]
            if pa == 0:
                continue
            # Blend 60% original + 40% grey.
            nr = int(pr * 0.55 + GREY[0] * 0.45)
            ng = int(pg * 0.55 + GREY[1] * 0.45)
            nb = int(pb * 0.55 + GREY[2] * 0.45)
            tp[x, y] = (nr, ng, nb, pa)
    im = tinted
    iw, ih = im.size
    scale = min(cell_w / iw, cell_h / ih)
    new_w = int(iw * scale)
    new_h = int(ih * scale)
    im = im.resize((new_w, new_h), Image.LANCZOS)
    x = i * (cell_w + gap_x) + (cell_w - new_w) // 2
    y = cell_h + gap_y + (cell_h - new_h) // 2
    out.paste(im, (x, y), im)

out.save("/home/llama-claw/.openclaw/media/outgoing/sixsixsix-mira-verify/_final_in_game_preview.png")
print("wrote /home/llama-claw/.openclaw/media/outgoing/sixsixsix-mira-verify/_final_in_game_preview.png")
