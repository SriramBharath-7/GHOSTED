#!/usr/bin/env sh
# Rebuilds assets/ghost.png from the original Ghost picture (red background).
# Keys out the red with a chroma mask (the figure is greyscale), recolours the
# figure to the navy→cyan duotone and fades the bottom/side edges.
# Usage: sh scripts/make-ghost.sh "path/to/Ghost COD pfp.jfif"   (needs ffmpeg)
set -e
SRC="$1"
OUT="$(dirname "$0")/../assets/ghost.png"
L='((0.299*r(X\,Y)+0.587*g(X\,Y)+0.114*b(X\,Y))/255)'
CH='(max(r(X\,Y)\,max(g(X\,Y)\,b(X\,Y)))-min(r(X\,Y)\,min(g(X\,Y)\,b(X\,Y))))'
RD='gt(r(X\,Y)\,max(g(X\,Y)\,b(X\,Y)))'
FADE='clip((H-Y)/(H*0.16)\,0\,1)*clip(X/(W*0.05)\,0\,1)*clip((W-X)/(W*0.05)\,0\,1)'
ffmpeg -v error -y -i "$SRC" -vf "format=rgba,geq=r='3+227*pow($L\,1.35)':g='8+242*pow($L\,1.3)':b='18+237*pow($L\,1.2)':a='255*(1-clip(($CH-22)/40\,0\,1)*$RD)*$FADE'" "$OUT"
echo "wrote $OUT"
