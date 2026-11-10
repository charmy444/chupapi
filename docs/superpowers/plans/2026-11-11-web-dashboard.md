# Forecast dashboard implementation plan

**Goal:** Show the supplied real CatBoost forecast, mapped to the existing test Parquet, in a responsive local dashboard.

**Architecture:** A FastAPI service validates and joins predictions by `id`, preserves source CSV bytes, and exposes historical slices. A React client displays per-timestamp aggregates, direction charts, and a searchable table. Inference remains explicitly unavailable until actual model artifacts and a supported inference entry point exist.

**Constraints:** Never add predictions across overlapping hour windows; do not fabricate live data, model status, geographic routes or performance figures. Keep input data out of Git. Use Docker Compose. Work on `web` without pushing.

1. Validate CSV-to-Parquet identity, timestamp and numeric data; preserve the original download and allow compatible imports.
2. Build the three responsive views with honest data provenance, per-slice values, accessibility and keyboard support.
3. Verify join failures, filtering, download fidelity, startup, empty/error states, responsive layout, and document local and Docker use.
