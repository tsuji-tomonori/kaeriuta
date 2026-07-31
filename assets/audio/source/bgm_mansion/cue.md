# 閉じた書架の呼吸

- Parent: #21
- Issue: #26
- Track ID: bgm_mansion
- Narrative role: 館と家族史が静かに見ている感覚
- BPM / meter: 58 / 4/4
- Tonal world: F major / D minor
- Theme: mansion_walk
- Theme interval: every 10 bars, with phrase-sized rests
- Instruments: bass_clarinet, cello, felt_piano, warm_air
- Duration: 140.690 s
- Loop: yes
- Target loudness: -27.0 LUFS-I
- Rendered loudness: -26.9 LUFS-I
- Rendered true peak: -14.6 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_mansion.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
