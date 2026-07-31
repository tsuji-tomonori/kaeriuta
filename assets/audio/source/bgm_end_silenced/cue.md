# 口封じ ― 白い羽

- Parent: #21
- Issue: #36
- Track ID: bgm_end_silenced
- Narrative role: 奪われた声と、残った『帰る』の一語
- BPM / meter: 56 / 4/4
- Tonal world: F major / D minor
- Theme: silenced_breath
- Theme interval: every 10 bars, with phrase-sized rests
- Instruments: alto_flute, bass_clarinet, warm_air
- Duration: 94.286 s
- Loop: yes
- Target loudness: -25.0 LUFS-I
- Rendered loudness: -24.9 LUFS-I
- Rendered true peak: -12.7 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_end_silenced.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
