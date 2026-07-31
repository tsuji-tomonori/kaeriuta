# 操り人形 ― 糸の先の筆

- Parent: #21
- Issue: #33
- Track ID: bgm_end_puppet
- Narrative role: 操られた虚無と、自分で選んだ罪
- BPM / meter: 62 / 5/4
- Tonal world: G minor / B-flat major
- Theme: puppet_choice
- Theme interval: every 8 bars, with phrase-sized rests
- Instruments: cello, felt_piano, room_strings, viola
- Duration: 96.774 s
- Loop: yes
- Target loudness: -24.5 LUFS-I
- Rendered loudness: -24.5 LUFS-I
- Rendered true peak: -13.1 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_end_puppet.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
