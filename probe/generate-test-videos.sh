#!/usr/bin/env bash
# Generate the media used by the Phase2 tests. Files are NOT shipped with the PWA.
set -euo pipefail
cd "$(dirname "$0")"
# ~64MB, 75s 720p, used by smoke/large-file quick checks
ffmpeg -y -f lavfi -i "testsrc2=size=1280x720:rate=30:duration=75" \
  -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=75" \
  -c:v libx264 -preset veryfast -b:v 7M -maxrate 8M -bufsize 16M -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart test.mp4
# ~487MB, 340s 720p, used for the 500MB acceptance check
ffmpeg -y -f lavfi -i "testsrc2=size=1280x720:rate=30:duration=340" \
  -f lavfi -i "anullsrc=r=48000:cl=mono" \
  -c:v libx264 -preset ultrafast -b:v 12M -maxrate 14M -bufsize 24M -pix_fmt yuv420p \
  -c:a aac -b:a 96k -shortest -movflags +faststart test-500.mp4
ls -lh test.mp4 test-500.mp4
