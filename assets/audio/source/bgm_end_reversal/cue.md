# 逆転 ― 二つの手錠

- Parent: #21
- Issue: #32
- Track ID: bgm_end_reversal
- Narrative role: 真実の前進と栞自身の代償
- BPM / meter: 78 / 4/4
- Tonal world: D Dorian
- Theme: reversal_cost
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: cello, felt_piano, frame_drum, room_strings
- Duration: 98.462 s
- Loop: yes
- Target loudness: -24.0 LUFS-I
- Rendered loudness: -24.0 LUFS-I
- Rendered true peak: -13.0 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_end_reversal.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
