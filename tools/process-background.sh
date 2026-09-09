#!/usr/bin/env sh
# Builds the Skills section's background layer from the full-size source photo.
#
# The source is a 6720x4480 / ~2 MB screenshot of a code editor with saturated
# syntax highlighting. Two problems for a background: it is far larger than any
# viewport needs, and its rainbow colours fight the forest-green palette. This
# bakes in the size and colour treatment; opacity and the edge fade stay in CSS
# (.skills-media) so they remain tunable without regenerating the file.
#
# Requires ImageMagick 7 (`magick`). Run from the repo root:
#   sh tools/process-background.sh
set -eu

SRC="assets/coding-background.jpg"
OUT="assets/coding-background-dim.jpg"

magick "$SRC" \
  -resize 1500x \
  -modulate 100,40 \
  -fill '#0F3630' -colorize 22 \
  -brightness-contrast -8x-10 \
  -strip -quality 78 -interlace Plane \
  "$OUT"

echo "wrote $OUT"
magick identify "$OUT"
