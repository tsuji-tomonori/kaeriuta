# 未完 ― 長すぎる栞

- Parent: #21
- Issue: #35
- Track ID: bgm_end_unfinished
- Narrative role: 届かなかった名前と、次の読者への余白
- BPM / meter: 60 / 4/4
- Tonal world: C major / A minor
- Theme: unfinished_page
- Theme interval: every 10 bars, with phrase-sized rests
- Instruments: bass_clarinet, felt_piano, viola, warm_air
- Duration: 104.000 s
- Loop: yes
- Target loudness: -25.0 LUFS-I
- Rendered loudness: -24.9 LUFS-I
- Rendered true peak: -11.2 dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh bgm_end_unfinished.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
