# 閉じた書架の呼吸

- Parent: #21
- Issue: #26
- Track ID: bgm_mansion
- Narrative role: 館と家族史が静かに見ている感覚
- BPM / meter: 60 / 4/4
- Tonal world: D minor
- Leitmotif treatment: hidden
- Instruments: bass_clarinet, cello, felt_piano, warm_pad
- Duration: 80.000 s
- Loop: yes
- Target loudness: -24.0 LUFS-I
- Rendered loudness: -24.0 LUFS-I
- Rendered true peak: -13.4 dBTP

## Intent

The shared motif is D–F–E–C | D–A–G–D.  This cue uses the treatment above and
keeps the final D unresolved unless the cue belongs to the true ending or ED.
The arrangement leaves space for Japanese text, ambience and scene effects.

## Reproduction

Run tools/audio/render.sh bgm_mansion.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
