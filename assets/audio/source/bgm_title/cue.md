# まだ閉じない頁

- Parent: #21
- Issue: #23
- Track ID: bgm_title
- Narrative role: 雨の館と、まだ読まれていない結末
- BPM / meter: 70 / 6/4
- Tonal world: D minor / F major
- Theme: title_question
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: cello, clarinet, felt_piano, room_strings, soft_wood
- Duration: 144.000 s
- Loop: yes
- Target loudness: -26.0 LUFS-I
- Rendered loudness: -26.0 LUFS-I
- Rendered true peak: -14.7 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_title.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
