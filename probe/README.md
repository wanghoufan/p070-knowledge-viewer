# T0 / Phase2 test probe (not shipped)

This folder is a test harness, not part of the PWA. It contains:

- `index.html` + `sw.js`: MIUI/desktop capability probe (secure context, SW, 64MB Cache/OPFS/IDB, blob/SW seek, iframe sandbox, fullscreen).
- `seek.html`: smaller OPFS/IDB blob seek probe.
- `server.mjs`: static test server with a `/report` POST endpoint (writes `report-*.json`).
- `generate-test-videos.sh`: regenerates `test.mp4` (~64MB) and `test-500.mp4` (~487MB). Video files are intentionally not committed.

Run:

```bash
bash generate-test-videos.sh
node server.mjs
# desktop: http://127.0.0.1:8765/
# phone: adb reverse tcp:8765 tcp:8765; open http://localhost:8765/
```

Results are copied to `docs/qa/phase2/T0-真机能力探针-2026-11-14.md` and `docs/qa/phase2/T0-miyui-browser-probe.json`.
