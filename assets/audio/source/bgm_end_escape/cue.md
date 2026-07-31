# 脱出 ― 三里先の朝靄

- Parent: #21
- Issue: #31
- Track ID: bgm_end_escape
- Narrative role: 身体は自由でも物語から逃げ切れない帰路
- BPM / meter: 72 / 6/4
- Tonal world: D Dorian / G major
- Theme: escape_horizon
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: alto_flute, cello, pizzicato, soft_wood, warm_air
- Duration: 100.000 s
- Loop: yes
- Target loudness: -24.5 LUFS-I
- Rendered loudness: -24.5 LUFS-I
- Rendered true peak: -12.6 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_end_escape.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
