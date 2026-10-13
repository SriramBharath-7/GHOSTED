# GHOSTED runtime pixel art

These PNGs are individual crops of the supplied `asset_sheets/` references. They
contain no atlas labels or screen UI. The parchment-framed habit icons retain
their original frame; character, prop, resource and reward sprites have their
outside matte removed. `dawn` and `night` are the atlas's clean panorama panels.

`provenance.json` records each source file, exact rectangle, matte treatment, and
output dimensions. `contact-sheet.png` is visual QA only and is never imported
by the app. No runtime image processing or additional native package is needed.

Rebuild from the repository root with:

```sh
python scripts/prepare-pixel-assets.py
```

The development script requires Pillow. It crops at source resolution, flood
fills only edge-connected background colors (preserving interior sprite
colors), adds two transparent pixels around cutouts, and optimizes the PNGs.
No resizing, AI generation, screen capture, or screen-sized atlas is used in
the shipped art. Source and output bounds are checked during regeneration.

Use `PixelArt` from `src/components/pixel/PixelArt.tsx`. Its exported names are
listed in `pixelArtNames`; `pixelSources` can also be passed directly to a
React Native `Image`. Defaults are a 48-point box with `contain` sizing and
decorative accessibility. Specify an accessibility label for meaningful art
that does not already have an equivalent visible label.
