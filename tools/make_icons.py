"""Generates the extension and Safari app icons: a retro neon sunset with a palm tree,
covered by a black "censored" bar. Requires Pillow (pip install pillow).

Usage: python3 tools/make_icons.py [--preview DIR]
  Without arguments the icons are written into the project.
  --preview DIR writes all variants plus a contact sheet into DIR instead.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
EXT_ICONS = ROOT / "icons"
SAFARI_APP = ROOT / "safari" / "No Spoiler for GTA VI" / "Shared (App)"
APPICONSET = SAFARI_APP / "Assets.xcassets" / "AppIcon.appiconset"
LARGEICON = SAFARI_APP / "Assets.xcassets" / "LargeIcon.imageset"

S = 1024  # drawing canvas; everything is drawn large and scaled down for smooth edges

BG_TOP = (26, 11, 46)
BG_BOTTOM = (61, 20, 80)
GROUND = (20, 7, 34)
SUN_TOP = (255, 214, 110)
SUN_MID = (255, 140, 66)
SUN_BOTTOM = (255, 62, 150)
GRID = (255, 62, 150)
PALM = (12, 4, 22)
BAR = (10, 10, 12)
NEON = (255, 62, 150)

# Layout per detail level: full (48 px and up), small (32 px), tiny (16 px)
LAYOUT = {
    "full": dict(horizon=0.70, sun=(0.47, 0.46, 0.29), gaps=[(0.10, 0.025), (0.17, 0.035), (0.235, 0.045)],
                 bar=(0.84, 0.17, 0.014)),
    "small": dict(horizon=0.78, sun=(0.50, 0.46, 0.36), gaps=[(0.16, 0.06)], bar=(0.92, 0.24, 0.045)),
    "tiny": dict(horizon=0.80, sun=(0.50, 0.44, 0.38), gaps=[], bar=(1.0, 0.28, 0)),
}


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def vgradient(w, h, stops):
    """Vertical gradient through (position, color) stops."""
    img = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(h - 1, 1)
        for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
            if p0 <= t <= p1:
                img.putpixel((0, y), lerp(c0, c1, (t - p0) / (p1 - p0)))
                break
    return img.resize((w, h))


def rounded_mask(radius=0.22):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, S - 1, S - 1), radius=round(radius * S), fill=255)
    return m


def bezier(p0, p1, p2, n=24):
    return [
        ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
         (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
        for t in (i / n for i in range(n + 1))
    ]


def ribbon(points, w0, w1):
    """Polygon around a polyline whose width tapers from w0 to w1."""
    left, right = [], []
    for i, (x, y) in enumerate(points):
        a = points[max(i - 1, 0)]
        b = points[min(i + 1, len(points) - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dy) or 1
        nx, ny = -dy / length, dx / length
        w = (w0 + (w1 - w0) * i / (len(points) - 1)) / 2
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    return left + right[::-1]


def draw_palm(d):
    px = lambda x, y: (x * S, y * S)
    trunk = bezier(px(0.86, 0.80), px(0.88, 0.52), px(0.75, 0.30))
    d.polygon(ribbon(trunk, 0.055 * S, 0.028 * S), fill=PALM)
    crown = px(0.75, 0.30)
    # (control point, tip) for each frond, relative to the crown
    fronds = [
        ((-0.10, -0.10), (-0.24, -0.02)),
        ((-0.08, -0.13), (-0.17, -0.11)),
        ((-0.01, -0.15), (-0.06, -0.17)),
        ((0.05, -0.14), (0.10, -0.15)),
        ((0.10, -0.10), (0.21, -0.06)),
        ((0.12, -0.05), (0.22, 0.06)),
        ((-0.12, -0.04), (-0.20, 0.08)),
    ]
    for (cx, cy), (tx, ty) in fronds:
        pts = bezier(crown, (crown[0] + cx * S, crown[1] + cy * S), (crown[0] + tx * S, crown[1] + ty * S))
        d.polygon(ribbon(pts, 0.05 * S, 0.004 * S), fill=PALM)
    d.ellipse((crown[0] - 0.03 * S, crown[1] - 0.03 * S, crown[0] + 0.03 * S, crown[1] + 0.03 * S), fill=PALM)


def artwork(level, rounded=True):
    """Full-bleed artwork at S x S for the given detail level; rounded=False gives the square iOS variant."""
    L = LAYOUT[level]
    simple = level != "full"
    HORIZON = L["horizon"]
    sx, sy, sr = L["sun"]
    img = vgradient(S, S, [(0, BG_TOP), (HORIZON, BG_BOTTOM), (1, BG_BOTTOM)]).convert("RGBA")
    d = ImageDraw.Draw(img)

    if not simple:
        for x, y, r in [(0.12, 0.12, 6), (0.24, 0.22, 4), (0.86, 0.10, 5), (0.62, 0.08, 3), (0.08, 0.38, 4), (0.38, 0.06, 4)]:
            d.ellipse((x * S - r, y * S - r, x * S + r, y * S + r), fill=(255, 220, 245, 170))

    # Sun with synthwave gaps, setting behind the horizon
    cx, cy, r = sx * S, sy * S, sr * S
    sun = vgradient(S, S, [(0, SUN_TOP), (sy - sr, SUN_TOP), (sy, SUN_MID), (min(sy + sr, 0.99), SUN_BOTTOM), (1, SUN_BOTTOM)])
    mask = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    for off, h in L["gaps"]:
        y = cy + off * S
        md.rectangle((0, y, S, y + h * S), fill=0)
    md.rectangle((0, HORIZON * S, S, S), fill=0)
    glow = mask.filter(ImageFilter.GaussianBlur(0.05 * S))
    img.paste(Image.new("RGBA", (S, S), SUN_BOTTOM + (255,)), (0, 0), glow.point(lambda v: v * 0.45))
    img.paste(sun, (0, 0), mask)

    # Ground with perspective grid
    d.rectangle((0, HORIZON * S, S, S), fill=GROUND)
    if not simple:
        hz = HORIZON * S
        grid = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        gd = ImageDraw.Draw(grid)
        for k in range(1, 7):
            y = hz + (S - hz) * (k / 6) ** 1.8
            gd.line((0, y, S, y), fill=GRID + (150,), width=round(0.006 * S))
        for k in range(-6, 7):
            gd.line((S / 2 + k * 0.03 * S, hz, S / 2 + k * 0.30 * S, S), fill=GRID + (150,), width=round(0.006 * S))
        img.alpha_composite(grid)
    d.line((0, HORIZON * S, S, HORIZON * S), fill=NEON, width=round(0.012 * S))

    if not simple:
        draw_palm(d)

    # The censor bar, slightly tilted, with a neon outline
    bw, bh, outline = L["bar"]
    bw, bh, outline = bw * S, bh * S, round(outline * S)
    bar = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar)
    bd.rounded_rectangle((S / 2 - bw / 2, S / 2 - bh / 2, S / 2 + bw / 2, S / 2 + bh / 2),
                         radius=round(0.03 * S), fill=BAR + (255,), outline=NEON + (255,) if outline else None, width=outline)
    bar = bar.rotate(7, resample=Image.BICUBIC, center=(S / 2, S / 2))
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    shadow.putalpha(bar.getchannel("A").filter(ImageFilter.GaussianBlur(0.02 * S)).point(lambda v: v * 0.6))
    img.alpha_composite(shadow, (0, round(0.015 * S)))
    bar = bar.transform((S, S), Image.AFFINE, (1, 0, 0, 0, 1, -(cy - S / 2)), resample=Image.BICUBIC)
    img.alpha_composite(bar)

    if rounded:
        img.putalpha(rounded_mask())
    return img


def mac_icon(art):
    """macOS app icon grid: artwork at 824/1024 centered, with a soft drop shadow."""
    inner = 824
    off = (S - inner) // 2
    small = art.resize((inner, inner), Image.LANCZOS)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    shadow.paste(Image.new("RGBA", (inner, inner), (0, 0, 0, 255)), (off, off + 12), small.getchannel("A"))
    shadow.putalpha(shadow.getchannel("A").filter(ImageFilter.GaussianBlur(14)).point(lambda v: v * 0.35))
    out.alpha_composite(shadow)
    out.alpha_composite(small, (off, off))
    return out


def scaled(img, size):
    return img.resize((size, size), Image.LANCZOS)


def main():
    preview = None
    if len(sys.argv) == 3 and sys.argv[1] == "--preview":
        preview = Path(sys.argv[2])
        preview.mkdir(parents=True, exist_ok=True)

    arts = {level: artwork(level) for level in LAYOUT}
    full = arts["full"]
    level_for = lambda px: "tiny" if px <= 16 else "small" if px <= 32 else "full"
    pick = lambda px: arts[level_for(px)]
    macs = {level: mac_icon(art) for level, art in arts.items()}
    mac_pick = lambda px: macs[level_for(px)]

    ext_dir = preview or EXT_ICONS
    for size in (16, 32, 48, 128):
        scaled(pick(size), size).save(ext_dir / f"icon{size}.png")

    set_dir = preview or APPICONSET
    for pt in (16, 32, 128, 256, 512):
        for scale in (1, 2):
            scaled(mac_pick(pt * scale), pt * scale).save(set_dir / f"mac-icon-{pt}@{scale}x.png")
    scaled(full, 128).save((preview or SAFARI_APP / "Resources") / "Icon.png")
    scaled(full, 128).save((preview or LARGEICON) / "icon128.png")
    # iOS applies its own mask, so the icon is a square without rounded corners or transparency.
    artwork("full", rounded=False).convert("RGB").save(set_dir / "universal-icon-1024@1x.png")

    if preview:
        sheet = Image.new("RGBA", (4 * 280, 560), (240, 240, 244, 255))
        for row, bg in enumerate([(240, 240, 244), (40, 40, 40)]):
            for i, size in enumerate((16, 32, 48, 128)):
                k = 256 // size
                tile = Image.new("RGBA", (270, 270), bg + (255,))
                big = scaled(pick(size), size).resize((size * k, size * k), Image.NEAREST)
                tile.alpha_composite(big, ((270 - size * k) // 2, (270 - size * k) // 2))
                sheet.alpha_composite(tile, (i * 280, row * 280))
        sheet.save(preview / "sheet.png")
        full.save(preview / "large.png")
    print("ok")


if __name__ == "__main__":
    main()
