"""Erzeugt die Extension-Icons (schwarzes Quadrat mit pinken Schwärzungsbalken) ohne externe Abhängigkeiten."""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "icons"
BLACK = (17, 17, 17, 255)
PINK = (255, 62, 150, 255)
CLEAR = (0, 0, 0, 0)


def pixel(x, y, size):
    u, v = x / size, y / size
    r = 0.18
    cx, cy = min(max(u, r), 1 - r), min(max(v, r), 1 - r)
    if (u - cx) ** 2 + (v - cy) ** 2 > r * r:
        return CLEAR
    for top, bottom, left, right in ((0.28, 0.40, 0.18, 0.82), (0.46, 0.58, 0.18, 0.64), (0.64, 0.76, 0.18, 0.74)):
        if top <= v < bottom and left <= u < right:
            return PINK
    return BLACK


def png(size):
    rows = b""
    for y in range(size):
        rows += b"\x00" + b"".join(bytes(pixel(x, y, size)) for x in range(size))

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(rows, 9))
        + chunk(b"IEND", b"")
    )


for s in (16, 32, 48, 128):
    (OUT / f"icon{s}.png").write_bytes(png(s))
print("ok")
