# 余白を裁く

- Parent: #21
- Issue: #29
- Track ID: bgm_inquiry
- Narrative role: 返答までの沈黙と観察される緊張
- BPM / meter: 74 / 4/4
- Tonal world: A minor / D Dorian
- Dramatic profile: inquiry
- Theme: inquiry_pause
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: cello, clarinet, felt_piano
- Duration: 136.216 s
- Loop: yes
- Target loudness: -26.0 LUFS-I
- Rendered loudness: -25.9 LUFS-I
- Rendered true peak: -11.7 dBTP

## Intent

This cue owns both a situation-specific melodic contour and an arrangement
grammar selected by its dramatic profile.  Inquiry uses stop-start questions,
solitary reasoning uses a dry analytical cell, joint reasoning uses growing
call-and-response, arrest closes the register, and escape opens it into a
walking 6/4 texture.  Irregular humanisation and deliberate rests leave space
for Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_inquiry.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
