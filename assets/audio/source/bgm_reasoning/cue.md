# 読まれる側

- Parent: #21
- Issue: #27
- Track ID: bgm_reasoning
- Narrative role: 手掛かりが結びつく快感と、知りすぎる危険
- BPM / meter: 92 / 4/4
- Tonal world: D Dorian / G major
- Theme: reasoning_lift
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: alto_flute, cello, pizzicato, room_strings, soft_wood
- Duration: 125.217 s
- Loop: yes
- Target loudness: -25.5 LUFS-I
- Rendered loudness: -25.5 LUFS-I
- Rendered true peak: -13.3 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_reasoning.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
