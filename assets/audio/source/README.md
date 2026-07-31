# Editable soundtrack sources

Each directory is generated from `tools/audio/render_soundtrack.py` and contains:

- `<track-id>.mid`: notes, tempo, meter and instrument-program hints.
- `cue.md`: narrative role, situation-specific theme, instrumentation, long-play spacing, loudness and reproduction command.

The committed Ogg files use the built-in deterministic acoustic-style renderer. No external samples are required. Each track has a distinct melodic contour; the title is recalled only by the true ending and credits.
