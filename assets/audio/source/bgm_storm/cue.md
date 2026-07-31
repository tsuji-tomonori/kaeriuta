# 橋のない夜

- Parent: #21
- Issue: #28
- Track ID: bgm_storm
- Narrative role: 孤立と、計画が現実の被害へ変わる圧力
- BPM / meter: 82 / 4/4
- Tonal world: D minor
- Theme: storm_weight
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: bass_clarinet, cello, frame_drum, low_piano, room_strings
- Duration: 117.073 s
- Loop: yes
- Target loudness: -25.0 LUFS-I
- Rendered loudness: -25.0 LUFS-I
- Rendered true peak: -13.3 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_storm.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
