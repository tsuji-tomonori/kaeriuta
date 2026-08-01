# 二人で頁を返す

- Parent: #21
- Issue: #27
- Track ID: bgm_joint_reasoning
- Narrative role: 宗玄の主張を役割分担で崩す共同推理の高揚
- BPM / meter: 96 / 4/4
- Tonal world: D Dorian -> F major
- Dramatic profile: joint_final
- Theme: joint_answer
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: cello, clarinet, frame_drum, nylon_guitar, room_strings
- Duration: 100.000 s
- Loop: yes
- Target loudness: -24.8 LUFS-I
- Rendered loudness: -24.8 LUFS-I
- Rendered true peak: -13.1 dBTP

## Intent

This cue owns both a situation-specific melodic contour and an arrangement
grammar selected by its dramatic profile.  Inquiry uses stop-start questions,
solitary reasoning uses a dry analytical cell, joint reasoning uses growing
call-and-response, arrest closes the register, and escape opens it into a
walking 6/4 texture.  Irregular humanisation and deliberate rests leave space
for Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_joint_reasoning.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
