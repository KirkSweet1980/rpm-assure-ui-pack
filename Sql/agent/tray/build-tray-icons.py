#!/usr/bin/env python3
"""Rasterize a crisp RPM Assure tray mark (navy badge + isometric cube + RAG pip)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent
SIZES = (16, 20, 24, 32, 48, 64, 128, 256, 512, 1024)
VARIANTS = {
    "ok": "#16A34A",
    "error": "#D97706",
    "off": "#DC2626",
}


def lerp(a, b, t):
    return int(a + (b - a) * t)


def draw_mark(master: int, pip_hex: str) -> Image.Image:
    img = Image.new("RGBA", (master, master), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(master * 0.06)
    badge = master - pad * 2
    rad = max(6, int(badge * 0.18))
    bx0, by0 = pad, pad
    bx1, by1 = pad + badge - 1, pad + badge - 1

    body = Image.new("RGBA", (master, master), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    bd.rounded_rectangle((bx0, by0, bx1, by1), radius=rad, fill=(11, 26, 58, 255))
    rim = max(2, int(master * 0.028))
    bd.rounded_rectangle(
        (bx0 + rim, by0 + rim, bx1 - rim, by1 - rim),
        radius=max(4, rad - rim),
        outline=(27, 184, 166, 230),
        width=max(2, int(master * 0.018)),
    )
    img = Image.alpha_composite(img, body)

    # Cube in brand viewBox 0..120, mapped into the badge
    def pt(x: float, y: float) -> tuple[int, int]:
        s = badge * 0.72 / 70.0
        cx = pad + badge / 2
        cy = pad + badge * 0.50
        return (int(cx + (x - 60) * s), int(cy + (y - 50) * s))

    faces = Image.new("RGBA", (master, master), (0, 0, 0, 0))
    fd = ImageDraw.Draw(faces)
    left = [pt(60, 80), pt(30, 63), pt(30, 37), pt(60, 54)]
    right = [pt(60, 80), pt(90, 63), pt(90, 37), pt(60, 54)]
    top = [pt(60, 54), pt(90, 37), pt(60, 20), pt(30, 37)]
    fd.polygon(left, fill=(62, 207, 191, 255))
    fd.polygon(right, fill=(26, 77, 122, 255))
    fd.polygon(top, fill=(27, 184, 166, 255))
    # lime wash on top face
    wash = Image.new("RGBA", (master, master), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    wd.polygon(top, fill=(143, 206, 74, 160))
    faces = Image.alpha_composite(faces, wash)
    edge = max(1, int(master * 0.008))
    fd = ImageDraw.Draw(faces)
    fd.line([pt(60, 20), pt(90, 37), pt(90, 63), pt(60, 80), pt(30, 63), pt(30, 37), pt(60, 20)], fill=(255, 255, 255, 200), width=edge, joint="curve")
    fd.line([pt(60, 54), pt(60, 80)], fill=(255, 255, 255, 140), width=max(1, edge - 1))
    fd.line([pt(60, 54), pt(90, 37)], fill=(255, 255, 255, 130), width=max(1, edge - 1))
    fd.line([pt(60, 54), pt(30, 37)], fill=(255, 255, 255, 130), width=max(1, edge - 1))
    r = max(3, int(master * 0.028))
    hx, hy = pt(60, 44)
    fd.ellipse((hx - r, hy - r, hx + r, hy + r), fill=(255, 255, 255, 255), outline=(27, 184, 166, 255), width=max(1, edge))
    img = Image.alpha_composite(img, faces)

    # Status pip — lower right
    pip = Image.new("RGBA", (master, master), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pip)
    pr = max(4, int(badge * 0.10))
    px = bx1 - int(badge * 0.16)
    py = by1 - int(badge * 0.16)
    hexv = pip_hex.lstrip("#")
    rgb = tuple(int(hexv[i : i + 2], 16) for i in (0, 2, 4))
    pd.ellipse((px - pr - 2, py - pr - 2, px + pr + 2, py + pr + 2), fill=(11, 26, 58, 255))
    pd.ellipse((px - pr, py - pr, px + pr, py + pr), fill=rgb + (255,))
    ring = max(1, int(master * 0.008))
    pd.ellipse((px - pr, py - pr, px + pr, py + pr), outline=(255, 255, 255, 210), width=ring)
    img = Image.alpha_composite(img, pip)
    return img


def save_set(kind: str, pip: str) -> None:
    master = draw_mark(1024, pip)
    master.save(OUT / f"robot-{kind}.png", "PNG")
    master.save(OUT / f"assure-{kind}.png", "PNG")
    for n in SIZES:
        im = master.resize((n, n), Image.Resampling.LANCZOS)
        if n <= 32:
            im = im.filter(ImageFilter.UnsharpMask(radius=0.6, percent=140, threshold=2))
        im.save(OUT / f"robot-{kind}-{n}.png", "PNG")
        if n in (32, 256):
            im.save(OUT / f"assure-{kind}-{n}.png", "PNG")
    print(f"wrote {kind}")


def main() -> None:
    for kind, pip in VARIANTS.items():
        save_set(kind, pip)
    print("done", OUT)


if __name__ == "__main__":
    main()
