# まだ閉じない頁

- Parent: #21
- Issue: #23
- Track ID: bgm_title
- Narrative role: 雨の館と、まだ読まれていない結末
- BPM / meter: 72 / 6/4
- Tonal world: D minor / D Dorian
- Leitmotif treatment: unresolved
- Instruments: cello, clarinet, felt_piano, soft_wood, warm_pad
- Duration: 80.000 s
- Loop: yes
- Target loudness: -24.0 LUFS-I
- Rendered loudness: -24.0 LUFS-I
- Rendered true peak: -12.9 dBTP

## Intent

The shared motif is D–F–E–C | D–A–G–D.  This cue uses the treatment above and
keeps the final D unresolved unless the cue belongs to the true ending or ED.
The arrangement leaves space for Japanese text, ambience and scene effects.

## Reproduction

Run tools/audio/render.sh bgm_title.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
