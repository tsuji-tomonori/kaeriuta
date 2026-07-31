# Editable soundtrack sources

Each directory is generated from `tools/audio/render_soundtrack.py` and contains:

- `<track-id>.mid`: notes, tempo, meter and instrument-program hints.
- `cue.md`: narrative role, motif treatment, instrumentation, loudness and reproduction command.

The committed Ogg files use the built-in deterministic synthesizer. No external samples are required.
