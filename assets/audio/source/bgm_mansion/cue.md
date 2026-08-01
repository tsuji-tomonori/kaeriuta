# 閉じた書架の呼吸

- Parent: #21
- Issue: #26
- Track ID: bgm_mansion
- Narrative role: 館と家族史が静かに見ている感覚
- BPM / meter: 58 / 4/4
- Tonal world: F major / D minor
- Dramatic profile: mansion
- Theme: mansion_walk
- Theme interval: every 10 bars, with phrase-sized rests
- Instruments: cello, felt_piano, warm_air
- Duration: 140.690 s
- Loop: yes
- Target loudness: -27.0 LUFS-I
- Rendered loudness: -26.9 LUFS-I
- Rendered true peak: -13.9 dBTP

## Intent

This cue owns both a situation-specific melodic contour and an arrangement
grammar selected by its dramatic profile.  Inquiry uses stop-start questions,
solitary reasoning uses a dry analytical cell, joint reasoning uses growing
call-and-response, arrest closes the register, and escape opens it into a
walking 6/4 texture.  Irregular humanisation and deliberate rests leave space
for Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_mansion.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
