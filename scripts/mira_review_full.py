#!/usr/bin/env python3
"""Full preview: bg + frame overlay + 5 high-pay symbols (color) + 5 low-pay
symbols (grey-tinted)."""
import os
from PIL import Image

GREY = (196, 196, 196)  # 0xc4c4c4

def apply_grey_tint(im):
    """Simulate LOW_PAY_GREY_TINT."""
    px = im.load()
    w, h = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            nr = int(r * 0.55 + GREY[0] * 0.45)
            ng = int(g * 0.55 + GREY[1] * 0.45)
            nb = int(b * 0.55 + GREY[2] * 0.45)
            op[x, y] = (nr, ng, nb, a)
    return out


bg = Image.open("/home/llama-claw/Repos/SixSixSix/src/assets/game/bg_sixsixsix.png").convert("RGBA")
frame = Image.open("/home/llama-claw/Repos/SixSixSix/src/assets/game/reel_frame_overlay.png").convert("RGBA")
fw, fh = frame.size
fx = (bg.size[0] - fw) // 2
fy = (bg.size[1] - fh) // 2

panel_centers_x = [178, 444, 698, 945, 1199]
panel_cy = 360

# Top row: 5 high-pays (centered y=240).
# Bottom row: 5 low-pays (grey, centered y=480).
out = bg.copy()
high = sorted([f for f in os.listdir("/home/llama-claw/Repos/SixSixSix/src/assets/game/symbols_high") if f.endswith(".png")])
low = sorted([f for f in os.listdir("/home/llama-claw/Repos/SixSixSix/src/assets/game/symbols_low") if f.endswith(".png")])

# Place high-pays row.
for i, fname in enumerate(high):
    sym = Image.open(f"/home/llama-claw/Repos/SixSixSix/src/assets/game/symbols_high/{fname}").convert("RGBA")
    sw, sh = sym.size
    max_w = 200
    max_h = 200
    scale = min(max_w / sw, max_h / sh, 1.0)
    nw = int(sw * scale)
    nh = int(sh * scale)
    sym = sym.resize((nw, nh), Image.LANCZOS)
    x = panel_centers_x[i] - nw // 2
    y = 220 - nh // 2
    out.paste(sym, (x, y), sym)

# Place low-pays row (grey).
for i, fname in enumerate(low):
    sym = Image.open(f"/home/llama-claw/Repos/SixSixSix/src/assets/game/symbols_low/{fname}").convert("RGBA")
    sym = apply_grey_tint(sym)
    sw, sh = sym.size
    max_w = 200
    max_h = 200
    scale = min(max_w / sw, max_h / sh, 1.0)
    nw = int(sw * scale)
    nh = int(sh * scale)
    sym = sym.resize((nw, nh), Image.LANCZOS)
    x = panel_centers_x[i] - nw // 2
    y = 480 - nh // 2
    out.paste(sym, (x, y), sym)

# Frame overlay on top.
out.paste(frame, (fx, fy), frame)

out.save("/home/llama-claw/.openclaw/media/outgoing/sixsixsix-mira-verify/_composite_full_preview.png")
print("wrote /home/llama-claw/.openclaw/media/outgoing/sixsixsix-mira-verify/_composite_full_preview.png")
