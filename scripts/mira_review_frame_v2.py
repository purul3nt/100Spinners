#!/usr/bin/env python3
"""Composite the reel-frame OVERLAY (interior transparent) over bg + symbols."""
import os
from PIL import Image

bg = Image.open("/home/llama-claw/Repos/100Spinners/src/assets/game/shogun_background_source.png").convert("RGBA")
frame = Image.open("/home/llama-claw/Repos/100Spinners/src/assets/game/reel_frame_overlay.png").convert("RGBA")
fw, fh = frame.size
fx = (bg.size[0] - fw) // 2
fy = (bg.size[1] - fh) // 2

# 5 panel centers (from frame analysis).
panel_centers_x = [178, 444, 698, 945, 1199]
panel_cy = 360

out = bg.copy()

# Place 5 high-pay symbols.
high = sorted([f for f in os.listdir("/home/llama-claw/Repos/100Spinners/src/assets/game/symbols_high") if f.endswith(".png")])
for i, fname in enumerate(high):
    sym = Image.open(f"/home/llama-claw/Repos/100Spinners/src/assets/game/symbols_high/{fname}").convert("RGBA")
    sw, sh = sym.size
    max_w = 220
    max_h = 220
    scale = min(max_w / sw, max_h / sh, 1.0)
    nw = int(sw * scale)
    nh = int(sh * scale)
    sym = sym.resize((nw, nh), Image.LANCZOS)
    x = panel_centers_x[i] - nw // 2
    y = panel_cy - nh // 2
    out.paste(sym, (x, y), sym)

# Place frame overlay (interior transparent).
out.paste(frame, (fx, fy), frame)

out.save("/home/llama-claw/.openclaw/media/outgoing/shogun-spinners-mira-verify/_composite_with_frame_overlay.png")
print("wrote /home/llama-claw/.openclaw/media/outgoing/shogun-spinners-mira-verify/_composite_with_frame_overlay.png")
