"""Rebuild the small runtime sprites from the supplied reference atlases.

Run: python scripts/prepare-pixel-assets.py (requires Pillow, build-time only).
Coordinates are source pixels: left, top, right, bottom, with exclusive edges.
"""

from collections import deque
from pathlib import Path
import json

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "pixel"
SHEETS = {
    "character": "ghosted_character_and_mascot_sprite_sheet.png",
    "environment": "pixel_art_environment_asset_atlas.png",
    "icons": "ghosted_pixel_ui_icon_atlas.png",
    "rewards": "ghosted_pixel_reward_shop_asset_sheet.png",
    "ui": "ghosted_pixel_ui_asset_sheet.png",
}

# Framed icons keep their parchment. Sprites remove only edge-connected matte.
# No text, adjacent sprite, or whole reference sheet is included in runtime art.
CROPS = {
    "dawn": ("environment", (17, 1131, 403, 1230), False),
    "night": ("environment", (417, 1129, 723, 1230), False),
    "ghost": ("character", (20, 1020, 120, 1113), True),
    "ghostCelebrate": ("character", (660, 1004, 792, 1110), True),
    "player": ("character", (49, 187, 171, 300), False),
    "hero": ("character", (358, 385, 586, 571), True),
    "merchant": ("environment", (553, 683, 778, 848), True),
    "chest": ("environment", (948, 694, 1041, 790), True),
    "backpack": ("character", (25, 1303, 119, 1378), True),
    "lantern": ("environment", (376, 559, 443, 638), "glow"),
    "tree": ("environment", (705, 275, 794, 420), True),
    "brain": ("icons", (35, 211, 192, 348), False),
    "dumbbell": ("icons", (215, 211, 374, 348), False),
    "book": ("icons", (397, 211, 550, 348), False),
    "flame": ("icons", (574, 211, 729, 348), False),
    "apple": ("icons", (749, 211, 906, 348), False),
    "coin": ("icons", (777, 646, 834, 712), "cream"),
    "crown": ("ui", (752, 1227, 801, 1274), True),
    "trophy": ("icons", (944, 645, 1003, 707), "cream"),
    "star": ("ui", (816, 1225, 864, 1275), True),
    "burger": ("rewards", (22, 176, 239, 305), True),
    "popcorn": ("rewards", (244, 176, 459, 305), True),
    "gamepad": ("rewards", (469, 178, 670, 305), True),
    "shirt": ("rewards", (682, 177, 885, 305), True),
    "bed": ("rewards", (26, 356, 237, 482), True),
    "coffee": ("rewards", (252, 354, 448, 482), True),
    "gift": ("rewards", (691, 530, 887, 661), True),
    "map": ("character", (700, 1300, 819, 1372), True),
    "mountain": ("ui", (802, 961, 894, 1027), True),
    "flag": ("ui", (879, 1226, 920, 1278), True),
    "home": ("ui", (43, 963, 111, 1025), True),
    "calendar": ("ui", (153, 961, 219, 1027), True),
    "swords": ("ui", (266, 961, 335, 1027), True),
    "shop": ("ui", (586, 961, 658, 1027), True),
    "settings": ("icons", (340, 642, 400, 707), "brown"),
    "bell": ("icons", (244, 642, 299, 705), "brown"),
}


def remove_matte(image, matte=True):
    """Flood the neutral gray outside a sprite; retain enclosed art colors."""
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    visited = set()
    queue = deque(
        [(x, y) for x in range(width) for y in (0, height - 1)]
        + [(x, y) for y in range(height) for x in (0, width - 1)]
    )
    while queue:
        x, y = queue.popleft()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        r, g, b, _ = pixels[x, y]
        matches = 65 <= min(r, g, b) <= 190 and max(r, g, b) - min(r, g, b) <= 32
        if matte == "cream":
            matches = r > 170 and g > 150 and b > 100 and r >= g >= b
        elif matte == "brown":
            matches = 18 < min(r, g, b) and r < 110 and g < 85 and b < 70 and r >= g >= b
        elif matte == "glow":
            matches = 65 <= min(r, g, b) <= 190 and max(r, g, b) - min(r, g, b) <= 70
        if not matches:
            continue
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                queue.append((nx, ny))
    bounds = image.getbbox()
    if bounds:
        image = image.crop(bounds)
    # Two transparent pixels prevent clipping when the sprite is scaled.
    padded = Image.new("RGBA", (image.width + 4, image.height + 4))
    padded.paste(image, (2, 2))
    return padded


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sources = {name: Image.open(ROOT / "asset_sheets" / file) for name, file in SHEETS.items()}
    manifest = {}
    contact = Image.new("RGB", (960, 180 * ((len(CROPS) + 5) // 6)), "#172b32")
    draw = ImageDraw.Draw(contact)
    for index, (name, (sheet, box, transparent)) in enumerate(CROPS.items()):
        source = sources[sheet]
        assert 0 <= box[0] < box[2] <= source.width
        assert 0 <= box[1] < box[3] <= source.height
        crop = source.crop(box).convert("RGBA")
        if transparent:
            crop = remove_matte(crop, transparent)
        crop.save(OUT / f"{name}.png", optimize=True)
        manifest[name] = {
            "source": f"asset_sheets/{SHEETS[sheet]}",
            "crop": box,
            "matteRemoved": transparent,
            "width": crop.width,
            "height": crop.height,
        }
        preview = crop.copy()
        preview.thumbnail((146, 138), Image.Resampling.NEAREST)
        x, y = (index % 6) * 160, (index // 6) * 180
        contact.paste(preview, (x + (160 - preview.width) // 2, y + (145 - preview.height) // 2), preview)
        draw.text((x + 8, y + 150), name, fill="#fff4d8")
    (OUT / "provenance.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    contact.save(OUT / "contact-sheet.png", optimize=True)
    print(f"Prepared {len(manifest)} sprites in {OUT}")


if __name__ == "__main__":
    main()
