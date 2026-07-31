# 真相 ― 名前を返す朝

- Parent: #21
- Issue: #34
- Track ID: bgm_end_rescue
- Narrative role: 正しい作者名と物語が読者へ帰る夜明け
- BPM / meter: 70 / 6/4
- Tonal world: D Dorian / F major
- Theme: rescue_answer
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: cello, clarinet, felt_piano, room_strings, soft_wood
- Duration: 113.143 s
- Loop: yes
- Target loudness: -24.0 LUFS-I
- Rendered loudness: -24.0 LUFS-I
- Rendered true peak: -13.2 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_end_rescue.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
