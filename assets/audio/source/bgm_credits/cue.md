# 帰り唄

- Parent: #21
- Issue: #37
- Track ID: bgm_credits
- Narrative role: 真相の先で、物語を正しい名へ返すED
- BPM / meter: 70 / 6/4
- Tonal world: D minor -> D Dorian -> F major
- Dramatic profile: credits
- Theme: credits_return
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: cello, clarinet, felt_piano, room_strings, soft_wood
- Duration: 205.714 s
- Loop: no
- Target loudness: -23.5 LUFS-I
- Rendered loudness: -23.5 LUFS-I
- Rendered true peak: -10.3 dBTP

## Intent

This cue owns both a situation-specific melodic contour and an arrangement
grammar selected by its dramatic profile.  Inquiry uses stop-start questions,
solitary reasoning uses a dry analytical cell, joint reasoning uses growing
call-and-response, arrest closes the register, and escape opens it into a
walking 6/4 texture.  Irregular humanisation and deliberate rests leave space
for Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_credits.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
