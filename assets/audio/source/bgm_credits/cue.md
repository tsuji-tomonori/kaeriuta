# 帰り唄

- Parent: #21
- Issue: #37
- Track ID: bgm_credits
- Narrative role: 真相の先で、物語を正しい名へ返すED
- BPM / meter: 72 / 6/4
- Tonal world: D minor -> D Dorian
- Leitmotif treatment: resolved
- Instruments: cello, clarinet, felt_piano, soft_wood, string_pad
- Duration: 170.000 s
- Loop: no
- Target loudness: -21.0 LUFS-I
- Rendered loudness: -21.0 LUFS-I
- Rendered true peak: -9.7 dBTP

## Intent

The shared motif is D–F–E–C | D–A–G–D.  This cue uses the treatment above and
keeps the final D unresolved unless the cue belongs to the true ending or ED.
The arrangement leaves space for Japanese text, ambience and scene effects.

## Reproduction

Run tools/audio/render.sh bgm_credits.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
