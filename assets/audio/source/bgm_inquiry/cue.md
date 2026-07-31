# 余白を裁く

- Parent: #21
- Issue: #29
- Track ID: bgm_inquiry
- Narrative role: 返答までの沈黙と観察される緊張
- BPM / meter: 74 / 4/4
- Tonal world: A minor / D Dorian
- Theme: inquiry_pause
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: cello, clarinet, felt_piano, pizzicato, warm_air
- Duration: 136.216 s
- Loop: yes
- Target loudness: -26.0 LUFS-I
- Rendered loudness: -26.0 LUFS-I
- Rendered true peak: -13.6 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_inquiry.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
