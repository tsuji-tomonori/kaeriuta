#!/usr/bin/env python3
"""Render the Kaeriuta soundtrack from deterministic, editable cue data.

The synthesizer intentionally uses no downloaded samples.  Every audible source
is built from softly excited resonators, filtered noise, envelopes and a small
stereo room.  Each dramatic situation owns a distinct theme: the title theme
returns only where the story earns that recognition.  The same event list is
also exported as a Standard MIDI File so an arranger can replace any rendered
voice in a free DAW later.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import struct
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt


ROOT = Path(__file__).resolve().parents[2]
SR = 48_000
TAU = math.tau
@dataclass(frozen=True)
class Track:
    id: str
    issue: int
    title: str
    role: str
    bpm: int
    meter: int
    bars: int
    mode: str
    progression: tuple[str, ...]
    lead: str
    counter: str
    texture: str
    pulse: str
    theme: str
    phrase_bars: int
    density: float = 1.0
    target_lufs: float = -24.0
    loop: bool = True

    @property
    def seconds_per_beat(self) -> float:
        return 60.0 / self.bpm

    @property
    def duration(self) -> float:
        return self.bars * self.meter * self.seconds_per_beat


TRACKS = (
    Track("bgm_title", 23, "まだ閉じない頁", "雨の館と、まだ読まれていない結末", 70, 6, 28, "D minor / F major", ("Dm9", "F6", "Cadd9", "Bb6"), "felt_piano", "clarinet", "room_strings", "soft_wood", "title_question", 8, .55, -26),
    Track("bgm_arrival", 24, "雨の向こうの館", "懐かしさと復讐計画へ入る緊張", 66, 6, 26, "A minor / C major", ("Am7", "C6", "F6", "G6"), "alto_flute", "felt_piano", "warm_air", "none", "arrival_memory", 8, .48, -26),
    Track("bgm_mansion", 26, "閉じた書架の呼吸", "館と家族史が静かに見ている感覚", 58, 4, 34, "F major / D minor", ("F6", "Cadd9", "Dm9", "Bb6"), "felt_piano", "cello", "warm_air", "none", "mansion_walk", 10, .34, -27),
    Track("bgm_storm", 28, "橋のない夜", "孤立と、計画が現実の被害へ変わる圧力", 82, 4, 40, "D minor", ("Dm", "Bb6", "F6", "Cadd9"), "low_piano", "cello", "room_strings", "frame_drum", "storm_weight", 8, .68, -25),
    Track("bgm_inquiry", 29, "余白を裁く", "返答までの沈黙と観察される緊張", 74, 4, 42, "A minor / D Dorian", ("Am7", "Dm9", "G6", "C6"), "felt_piano", "clarinet", "warm_air", "pizzicato", "inquiry_pause", 8, .48, -26),
    Track("bgm_reasoning", 27, "読まれる側", "手掛かりが結びつく快感と、知りすぎる危険", 92, 4, 48, "D Dorian / G major", ("Dm9", "G6", "Em7", "A7sus4"), "pizzicato", "alto_flute", "room_strings", "soft_wood", "reasoning_lift", 8, .67, -25.5),
    Track("bgm_end_arrest", 30, "逮捕 ― 調書の余白", "罪と沈黙を記録へ渡す重さ", 58, 4, 22, "D minor / F major", ("Dm9", "Bb6", "F6", "Cadd9"), "felt_piano", "cello", "room_strings", "none", "arrest_record", 8, .38, -24.5),
    Track("bgm_end_escape", 31, "脱出 ― 三里先の朝靄", "身体は自由でも物語から逃げ切れない帰路", 72, 6, 20, "D Dorian / G major", ("Dm9", "G6", "C6", "F6"), "alto_flute", "pizzicato", "warm_air", "soft_wood", "escape_horizon", 8, .56, -24.5),
    Track("bgm_end_puppet", 33, "操り人形 ― 糸の先の筆", "操られた虚無と、自分で選んだ罪", 62, 5, 20, "G minor / B-flat major", ("Gm9", "Bb6", "F6", "Cadd9"), "viola", "felt_piano", "room_strings", "none", "puppet_choice", 8, .42, -24.5),
    Track("bgm_end_reversal", 32, "逆転 ― 二つの手錠", "真実の前進と栞自身の代償", 78, 4, 32, "D Dorian", ("Dm9", "G6", "C6", "A7sus4"), "cello", "felt_piano", "room_strings", "frame_drum", "reversal_cost", 8, .66, -24),
    Track("bgm_end_rescue", 34, "真相 ― 名前を返す朝", "正しい作者名と物語が読者へ帰る夜明け", 70, 6, 22, "D Dorian / F major", ("Dm9", "G6", "Bb6", "F6"), "clarinet", "felt_piano", "room_strings", "soft_wood", "rescue_answer", 8, .62, -24),
    Track("bgm_end_unfinished", 35, "未完 ― 長すぎる栞", "届かなかった名前と、次の読者への余白", 60, 4, 26, "C major / A minor", ("C6", "Am7", "F6", "Dm9"), "felt_piano", "viola", "warm_air", "none", "unfinished_page", 10, .34, -25),
    Track("bgm_end_silenced", 36, "口封じ ― 白い羽", "奪われた声と、残った『帰る』の一語", 56, 4, 22, "F major / D minor", ("F6", "Dm9", "Bb6", "Cadd9"), "alto_flute", "cello", "warm_air", "none", "silenced_breath", 10, .28, -25),
    Track("bgm_credits", 37, "帰り唄", "真相の先で、物語を正しい名へ返すED", 70, 6, 40, "D minor -> D Dorian -> F major", ("Dm9", "Bb6", "F6", "Cadd9", "Dm9", "G6", "Bb6", "F6"), "felt_piano", "clarinet", "room_strings", "soft_wood", "credits_return", 8, .72, -23.5, False),
)


CHORDS: dict[str, tuple[int, ...]] = {
    "Dm": (50, 57, 62, 65),
    "Dm9": (50, 57, 60, 64, 65),
    "Dsus2": (50, 57, 62, 64),
    "Bb": (46, 53, 58, 62),
    "BbM7": (46, 53, 57, 62),
    "C": (48, 55, 60, 64),
    "Cadd9": (48, 55, 60, 62, 64),
    "Gm9": (43, 50, 53, 57, 58),
    "G": (43, 50, 55, 59),
    "A": (45, 52, 57, 61),
    "Asus4": (45, 52, 57, 62),
    "A7sus4": (45, 52, 55, 62),
    "Am7": (45, 52, 55, 60, 64),
    "F6": (41, 48, 53, 57, 62),
    "C6": (48, 55, 60, 64, 69),
    "G6": (43, 50, 55, 59, 64),
    "Bb6": (46, 53, 58, 62, 67),
    "Em7": (40, 47, 52, 55, 59),
}


PROGRAMS = {
    "felt_piano": 0,
    "muted_piano": 0,
    "low_piano": 0,
    "cello": 42,
    "viola": 41,
    "room_strings": 48,
    "pizzicato": 45,
    "clarinet": 71,
    "bass_clarinet": 71,
    "alto_flute": 73,
    "warm_air": 89,
    "soft_wood": 115,
    "frame_drum": 116,
    "none": 0,
}


@dataclass(frozen=True)
class Event:
    instrument: str
    beat: float
    duration: float
    note: int
    velocity: float
    pan: float


THEMES: dict[str, tuple[tuple[float, float, int], ...]] = {
    # offset, duration, MIDI note.  Rests are represented by gaps, not repeated
    # sentinel notes, so every cue has its own contour and breathing pattern.
    "title_question": ((0, 1.8, 69), (2.2, 1.2, 72), (4.0, 2.0, 74), (7.0, 1.4, 72), (9.0, 2.2, 65)),
    "arrival_memory": ((0, 2.4, 64), (3.0, 1.4, 67), (5.0, 2.2, 69), (8.5, 1.2, 67), (10.5, 2.8, 60)),
    "mansion_walk": ((0, 2.6, 65), (4.5, 1.8, 60), (8.0, 2.6, 57), (13.0, 2.0, 62)),
    "storm_weight": ((0, 1.2, 50), (1.8, .8, 57), (3.0, 1.6, 53), (5.5, .8, 60), (7.0, 2.2, 55)),
    "inquiry_pause": ((0, 1.2, 69), (2.0, 1.0, 72), (5.0, 1.8, 71), (8.0, 1.0, 67), (11.0, 2.4, 64)),
    "reasoning_lift": ((0, .8, 62), (1.2, .8, 64), (2.4, 1.2, 67), (4.2, .8, 69), (5.4, 1.6, 71), (8.0, 1.0, 69), (10.0, 2.0, 74)),
    "arrest_record": ((0, 2.0, 60), (3.0, 2.8, 57), (7.0, 1.4, 53), (10.0, 3.2, 50)),
    "escape_horizon": ((0, 1.4, 62), (2.0, 1.4, 66), (4.0, 2.0, 67), (7.0, 1.2, 69), (9.0, 2.6, 64)),
    "puppet_choice": ((0, 1.8, 67), (3.0, 1.1, 70), (5.0, 2.4, 74), (9.0, 1.4, 69), (12.0, 2.5, 67)),
    "reversal_cost": ((0, 1.0, 57), (1.5, 1.0, 62), (3.0, 1.5, 64), (5.2, 1.0, 65), (7.0, 1.8, 69), (10.0, 2.2, 67)),
    # The title contour is recognized here, but it is answered and resolved
    # instead of copied note-for-note.
    "rescue_answer": ((0, 1.4, 69), (2.0, 1.0, 72), (3.5, 1.8, 74), (6.0, 1.2, 76), (8.0, 1.4, 74), (10.0, 3.0, 69)),
    "unfinished_page": ((0, 2.2, 60), (3.5, 1.4, 67), (6.0, 2.0, 64), (10.0, 1.2, 62), (14.0, 2.8, 57)),
    "silenced_breath": ((0, 3.2, 65), (6.0, 2.0, 62), (11.0, 3.4, 57)),
    "credits_return": ((0, 1.5, 69), (2.0, 1.0, 72), (3.5, 1.6, 74), (5.8, 1.0, 76), (7.5, 1.3, 74), (9.5, 1.3, 72), (11.5, 3.0, 69)),
}


def arrangement(track: Track) -> list[Event]:
    events: list[Event] = []
    total_beats = track.bars * track.meter
    rng = np.random.default_rng(track.issue * 7919)

    # Harmony changes every two bars and is not re-attacked on every measure.
    # That slower breathing is important during a two-hour, text-heavy play.
    for bar in range(0, track.bars, 2):
        chord = CHORDS[track.progression[(bar // 2) % len(track.progression)]]
        start = bar * track.meter
        texture_velocity = .10 + track.density * .08
        if track.id == "bgm_credits":
            section = bar / track.bars
            texture_velocity *= .55 + min(section * 1.8, .9)
        for index, note in enumerate(chord[1:4]):
            pan = (-.36, .30, -.16, .18)[index % 4]
            duration = track.meter * 1.75 + float(rng.uniform(-.15, .22))
            events.append(Event(track.texture, start + float(rng.uniform(-.04, .04)), duration, note, texture_velocity, pan))
        # A low acoustic anchor appears only once every four bars.  Avoid a
        # continuous sub drone: this is a mystery, not a horror score.
        if bar % 4 == 0:
            bass_voice = "cello" if track.counter not in {"cello", "viola"} else "bass_clarinet"
            events.append(Event(bass_voice, start + .15, track.meter * 1.35, chord[0] + 12, .13 + .05 * track.density, -.24))

    theme = THEMES[track.theme]
    phrase_count = math.ceil(track.bars / track.phrase_bars)
    for phrase in range(phrase_count):
        # Whole phrase-sized rests prevent the score from demanding attention.
        if track.density < .45 and phrase % 3 == 1:
            continue
        base = phrase * track.phrase_bars * track.meter + (1.0 if track.meter >= 5 else .5)
        transpose_cycle = (0, 0, -2, 0, 2, 0)
        transpose = transpose_cycle[phrase % len(transpose_cycle)] if phrase else 0
        for index, (offset, note_duration, note) in enumerate(theme):
            start = base + offset
            if start >= total_beats - .5:
                break
            human = float(rng.uniform(-.075, .075))
            velocity = (.22 + .09 * track.density) * float(rng.uniform(.84, 1.08))
            duration = note_duration * float(rng.uniform(.92, 1.08))
            events.append(Event(track.lead, start + human, duration, note + transpose, velocity, -.10 + .08 * (index % 3)))

        # A restrained, situation-specific answer appears in only one phrase
        # out of three instead of shadowing every melody statement.
        if phrase % 3 == 2 and track.counter != "none":
            chord = CHORDS[track.progression[(phrase * track.phrase_bars + 2) % len(track.progression)]]
            counter_start = base + track.meter * 2.4
            for index, note in enumerate((chord[-1], chord[-2], chord[1])):
                if counter_start + index * 2.1 < total_beats - .5:
                    events.append(Event(track.counter, counter_start + index * 2.1, 2.5, note + 12, .15 + .05 * track.density, .28))

    # Pulse is limited to short activity windows.  It never becomes a high,
    # metronomic click that follows the player for the entire scene.
    if track.pulse != "none":
        step = 4 if track.meter >= 5 else 3
        for beat in np.arange(0, total_beats, step):
            bar = int(beat / track.meter)
            if bar % 12 not in {4, 5, 6, 9}:
                continue
            note = 38 if track.pulse == "frame_drum" else (50 if track.pulse == "pizzicato" else 62)
            velocity = (.08 + .08 * track.density) * float(rng.uniform(.80, 1.08))
            pan = float(rng.uniform(-.18, .18))
            events.append(Event(track.pulse, float(beat + rng.uniform(-.07, .07)), .55, note, velocity, pan))

    # The ED recalls the title only after a new middle section, then resolves
    # into an open major-sixth sonority.  It is a return, not a looped slogan.
    if track.id == "bgm_credits":
        midpoint = total_beats * .56
        middle_theme = THEMES["arrival_memory"]
        for index, (offset, duration, note) in enumerate(middle_theme):
            events.append(Event("clarinet", midpoint + offset, duration * 1.25, note + 5, .30, .12))
            if index in {0, 2, 4}:
                events.append(Event("cello", midpoint + offset, duration * 1.6, note - 7, .22, -.24))
        final = total_beats - track.meter * 2
        for note, pan in zip((53, 60, 65, 69, 74), (-.30, -.12, .0, .16, .30), strict=True):
            events.append(Event("room_strings", final, track.meter * 1.8, note, .22, pan))
        events.append(Event("felt_piano", final + .25, track.meter * 1.5, 69, .30, -.05))

    return sorted(events, key=lambda event: event.beat)


def midi_frequency(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def adsr(t: np.ndarray, duration: float, attack: float, release: float, sustain: float = .78) -> np.ndarray:
    envelope = np.ones_like(t, dtype=np.float32) * sustain
    if attack > 0:
        envelope *= np.minimum(1.0, t / attack).astype(np.float32)
    release_start = max(0.0, duration - release)
    if release > 0:
        envelope *= np.minimum(1.0, np.maximum(0.0, (duration - t) / release)).astype(np.float32)
    envelope[t > duration] = 0
    envelope[t < 0] = 0
    return envelope


def filtered_noise(rng: np.random.Generator, size: int, cutoff: float, highpass: bool = False) -> np.ndarray:
    noise = rng.normal(0, 1, size).astype(np.float32)
    kind = "highpass" if highpass else "lowpass"
    sos = butter(2, cutoff, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, noise).astype(np.float32)


def soften(signal: np.ndarray, cutoff: float = 8_000) -> np.ndarray:
    sos = butter(2, min(cutoff, SR * .45), btype="lowpass", fs=SR, output="sos")
    return np.tanh(sosfilt(sos, signal).astype(np.float32) * .88).astype(np.float32)


def synth_note(instrument: str, note: int, duration: float, velocity: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    release = {
        "felt_piano": 2.8, "low_piano": 3.0,
        "cello": 1.3, "viola": 1.1, "clarinet": .9, "bass_clarinet": 1.0,
        "alto_flute": 1.0, "room_strings": 3.0, "warm_air": 3.2, "pizzicato": .9,
        "soft_wood": .45, "frame_drum": .7,
    }.get(instrument, .8)
    full_duration = max(.2, duration + release)
    count = max(1, int(full_duration * SR))
    t = np.arange(count, dtype=np.float32) / SR
    # No two attacks use an identical oscillator.  Tiny tuning and phase
    # differences remove the organ-like lock that made the former render feel
    # mechanical without making the ensemble audibly out of tune.
    frequency = midi_frequency(note) * 2 ** (float(rng.normal(0, 1.7)) / 1200)

    if instrument in {"felt_piano", "low_piano"}:
        brightness = {"felt_piano": .46, "low_piano": .38}[instrument]
        signal = np.zeros(count, dtype=np.float32)
        for string_detune, string_gain in ((-.0011, .32), (0, .48), (.0015, .28)):
            for harmonic, gain in enumerate((1.0, .30, .12, .045, .018), start=1):
                inharmonicity = math.sqrt(1 + .00032 * harmonic * harmonic)
                decay = 3.1 / (1 + harmonic * .44)
                phase = float(rng.uniform(0, TAU))
                signal += string_gain * gain * np.sin(
                    TAU * frequency * (1 + string_detune) * harmonic * inharmonicity * t + phase
                ) * np.exp(-t / decay)
        hammer = filtered_noise(rng, count, 1_900) * np.exp(-t / .030) * .018 * brightness
        signal = (signal + hammer) * adsr(t, duration + release, .012, release, .74)
        signal = soften(signal, 4_900 if instrument == "felt_piano" else 4_100)
    elif instrument in {"cello", "viola", "room_strings"}:
        signal = np.zeros(count, dtype=np.float32)
        vibrato_rate = 4.5 + float(rng.uniform(-.35, .35))
        vibrato_depth = .018 if instrument == "room_strings" else .026
        phase_vibrato = vibrato_depth * np.sin(TAU * vibrato_rate * t + float(rng.uniform(0, TAU)))
        harmonics = 5 if instrument == "room_strings" else 6
        for harmonic in range(1, harmonics + 1):
            weight = 1 / harmonic ** 1.65
            phase = float(rng.uniform(0, TAU))
            signal += weight * np.sin(TAU * frequency * harmonic * t + harmonic * phase_vibrato + phase)
        bow = filtered_noise(rng, count, 2_800) * .012
        attack = .26 if instrument != "room_strings" else 1.05
        signal = (signal + bow) * adsr(t, duration + release, attack, release, .78)
        signal = soften(signal, 4_500 if instrument == "cello" else 5_000)
    elif instrument in {"clarinet", "bass_clarinet", "alto_flute"}:
        signal = np.zeros(count, dtype=np.float32)
        if instrument == "alto_flute":
            weights = ((1, 1.0), (2, .10), (3, .12), (4, .025))
            cutoff = 4_700
        else:
            weights = ((1, 1.0), (3, .25), (5, .065))
            cutoff = 4_200 if instrument == "bass_clarinet" else 5_000
        vibrato = .012 * np.sin(TAU * (4.8 + rng.uniform(-.2, .2)) * t + rng.uniform(0, TAU))
        for harmonic, gain in weights:
            signal += gain * np.sin(TAU * frequency * harmonic * t + harmonic * vibrato + rng.uniform(0, TAU))
        breath = filtered_noise(rng, count, 3_800) * (.026 if instrument == "alto_flute" else .014)
        signal = (signal + breath) * adsr(t, duration + release, .20, release, .80)
        signal = soften(signal, cutoff)
    elif instrument == "warm_air":
        signal = np.zeros(count, dtype=np.float32)
        for detune, gain in ((-.004, .28), (0, .54), (.0035, .26)):
            phase = float(rng.uniform(0, TAU))
            drift = .004 * np.sin(TAU * (.035 + rng.uniform(0, .018)) * t + phase)
            signal += gain * np.sin(TAU * frequency * (1 + detune) * t + drift + phase)
            signal += gain * .08 * np.sin(TAU * frequency * 2 * (1 + detune) * t + phase * .7)
        signal += filtered_noise(rng, count, 1_500) * .009
        signal *= adsr(t, duration + release, 1.25, release, .72)
        signal = soften(signal, 3_600)
    elif instrument == "pizzicato":
        signal = np.zeros(count, dtype=np.float32)
        for harmonic in range(1, 7):
            signal += (1 / harmonic ** 1.45) * np.sin(TAU * frequency * harmonic * t + rng.uniform(0, TAU)) * np.exp(-t * (1.9 + harmonic * .68))
        signal += filtered_noise(rng, count, 2_200) * np.exp(-t / .040) * .022
        signal = soften(signal, 4_600)
    elif instrument == "soft_wood":
        signal = (np.sin(TAU * frequency * t) + .22 * np.sin(TAU * frequency * 2.72 * t))
        signal *= np.exp(-t * 7.2)
        signal += filtered_noise(rng, count, 1_800) * np.exp(-t / .032) * .020
        signal = soften(signal, 4_200)
    elif instrument == "frame_drum":
        sweep = frequency * (.72 + .28 * np.exp(-t * 14))
        phase = np.cumsum(TAU * sweep / SR).astype(np.float32)
        signal = np.sin(phase) * np.exp(-t * 5.2)
        signal += filtered_noise(rng, count, 1_900) * np.exp(-t * 8.5) * .20
        signal = soften(signal, 3_500)
    else:
        signal = np.sin(TAU * frequency * t) * np.exp(-t * 3)

    return (signal * velocity).astype(np.float32)


def pan_gains(pan: float) -> tuple[float, float]:
    angle = (max(-1.0, min(1.0, pan)) + 1) * math.pi / 4
    return math.cos(angle), math.sin(angle)


def add_room(mix: np.ndarray, amount: float) -> np.ndarray:
    wet = np.zeros_like(mix)
    taps = ((.083, .075, .042), (.137, .050, .068), (.211, .042, .034), (.347, .026, .036), (.509, .016, .014))
    for delay, left_gain, right_gain in taps:
        samples = int(delay * SR)
        wet[samples:, 0] += mix[:-samples, 0] * left_gain + mix[:-samples, 1] * .018
        wet[samples:, 1] += mix[:-samples, 1] * right_gain + mix[:-samples, 0] * .018
    # Darken the reflections so the algorithmic room does not reveal itself as
    # a metallic delay line on headphones.
    room_filter = butter(2, 4_200, btype="lowpass", fs=SR, output="sos")
    wet[:, 0] = sosfilt(room_filter, wet[:, 0])
    wet[:, 1] = sosfilt(room_filter, wet[:, 1])
    return (mix + wet * amount).astype(np.float32)


def render_mix(track: Track, events: list[Event]) -> np.ndarray:
    cycles = 3 if track.loop else 1
    duration = track.duration
    tail = 4.0 if not track.loop else 3.0
    total_samples = int((duration * cycles + tail) * SR)
    mix = np.zeros((total_samples, 2), dtype=np.float32)
    beat_seconds = track.seconds_per_beat
    for cycle in range(cycles):
        for event_index, event in enumerate(events):
            start_seconds = cycle * duration + event.beat * beat_seconds
            start = max(0, int(start_seconds * SR))
            note = synth_note(
                event.instrument,
                event.note,
                event.duration * beat_seconds,
                event.velocity,
                track.issue * 1_000_003 + event_index * 97,
            )
            end = min(total_samples, start + len(note))
            if end <= start:
                continue
            left, right = pan_gains(event.pan)
            mix[start:end, 0] += note[: end - start] * left
            mix[start:end, 1] += note[: end - start] * right

    mix = add_room(mix, .55 if track.id != "bgm_storm" else .38)
    if track.loop:
        start = int(duration * SR)
        mix = mix[start : start + int(duration * SR)]
    else:
        mix = mix[: int(duration * SR)]
        fade = min(len(mix), int(5 * SR))
        mix[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)[:, None]
        head = min(len(mix), int(.35 * SR))
        mix[:head] *= np.linspace(0, 1, head, dtype=np.float32)[:, None]

    # Long-play comfort master: a broad, gentle top roll-off removes narrow
    # synthetic edges while retaining speech-space and natural transients.
    comfort_filter = butter(3, 6_800, btype="lowpass", fs=SR, output="sos")
    mix[:, 0] = sosfilt(comfort_filter, mix[:, 0])
    mix[:, 1] = sosfilt(comfort_filter, mix[:, 1])
    mix = np.tanh(mix * .62).astype(np.float32)
    peak = float(np.max(np.abs(mix))) or 1.0
    mix *= .48 / peak
    return mix


def measure(path: Path) -> dict[str, float]:
    process = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "loudnorm=I=-24:TP=-2:LRA=7:print_format=json", "-f", "null", "-"],
        check=True,
        capture_output=True,
        text=True,
    )
    match = re.search(r"\{\s*\"input_i\".*?\}", process.stderr, flags=re.S)
    if not match:
        raise RuntimeError(f"loudness measurement failed for {path}")
    data = json.loads(match.group(0))
    return {"lufs": float(data["input_i"]), "true_peak": float(data["input_tp"])}


def encode(wav_path: Path, output: Path, target_lufs: float) -> dict[str, float]:
    first = measure(wav_path)
    gain = target_lufs - first["lufs"]
    gain = min(gain, -3.2 - first["true_peak"])
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
            "-af", f"volume={gain:.4f}dB", "-ar", str(SR), "-ac", "2",
            "-c:a", "libvorbis", "-b:a", "160k", str(output),
        ],
        check=True,
    )
    final = measure(output)
    final["gain_db"] = gain
    return final


def variable_length(value: int) -> bytes:
    buffer = value & 0x7F
    output = bytearray([buffer])
    while value >> 7:
        value >>= 7
        buffer = (value & 0x7F) | 0x80
        output.insert(0, buffer)
    return bytes(output)


def write_midi(track: Track, events: list[Event], path: Path) -> None:
    ticks = 480
    instruments = sorted({event.instrument for event in events})
    channels = {instrument: index if index < 9 else index + 1 for index, instrument in enumerate(instruments)}
    timeline: list[tuple[int, int, bytes]] = []
    tempo = round(60_000_000 / track.bpm)
    timeline.append((0, 0, b"\xff\x51\x03" + tempo.to_bytes(3, "big")))
    denominator_power = 3 if track.meter == 6 else 2
    numerator = track.meter
    timeline.append((0, 0, b"\xff\x58\x04" + bytes((numerator, denominator_power, 24, 8))))
    for instrument, channel in channels.items():
        timeline.append((0, 1, bytes((0xC0 | channel, PROGRAMS.get(instrument, 0)))))
    for event in events:
        channel = channels[event.instrument]
        start = max(0, round(event.beat * ticks))
        end = max(start + 1, round((event.beat + event.duration) * ticks))
        velocity = max(1, min(127, round(event.velocity * 190)))
        timeline.append((start, 2, bytes((0x90 | channel, event.note, velocity))))
        timeline.append((end, 1, bytes((0x80 | channel, event.note, 0))))
    timeline.sort(key=lambda item: (item[0], item[1]))
    data = bytearray()
    previous = 0
    for tick, _, message in timeline:
        data.extend(variable_length(tick - previous))
        data.extend(message)
        previous = tick
    data.extend(b"\x00\xff\x2f\x00")
    header = b"MThd" + struct.pack(">IHHH", 6, 0, 1, ticks)
    path.write_bytes(header + b"MTrk" + struct.pack(">I", len(data)) + data)


def cue_markdown(track: Track, events: list[Event], metrics: dict[str, float]) -> str:
    instruments = ", ".join(sorted({event.instrument for event in events}))
    loop = "yes" if track.loop else "no"
    return f"""# {track.title}

- Parent: #21
- Issue: #{track.issue}
- Track ID: {track.id}
- Narrative role: {track.role}
- BPM / meter: {track.bpm} / {track.meter}/4
- Tonal world: {track.mode}
- Theme: {track.theme}
- Theme interval: every {track.phrase_bars} bars, with phrase-sized rests
- Instruments: {instruments}
- Duration: {track.duration:.3f} s
- Loop: {loop}
- Target loudness: {track.target_lufs:.1f} LUFS-I
- Rendered loudness: {metrics['lufs']:.1f} LUFS-I
- Rendered true peak: {metrics['true_peak']:.1f} dBTP

## Intent

This cue owns a situation-specific melodic contour.  It does not repeat the
title melody as a default device.  Title recognition is reserved for the true
ending and credits, where it is reharmonised and answered rather than copied.
Two-bar harmony, irregular humanisation and phrase-sized rests leave space for
Japanese text, ambience and scene effects during a long play session.

## Reproduction

Run tools/audio/render.sh {track.id}.  No downloaded samples are required.  The
MIDI file contains the editable note and tempo data; synthesis patches are the
named instrument functions in tools/audio/render_soundtrack.py.
"""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def render(track: Track) -> dict[str, object]:
    events = arrangement(track)
    source_dir = ROOT / "assets" / "audio" / "source" / track.id
    source_dir.mkdir(parents=True, exist_ok=True)
    midi_path = source_dir / f"{track.id}.mid"
    write_midi(track, events, midi_path)
    output = ROOT / "assets" / "audio" / f"{track.id}.ogg"
    with tempfile.TemporaryDirectory(prefix="kaeriuta-audio-") as temp_dir:
        wav_path = Path(temp_dir) / f"{track.id}.wav"
        mix = render_mix(track, events)
        wavfile.write(wav_path, SR, np.clip(mix * 32767, -32768, 32767).astype(np.int16))
        metrics = encode(wav_path, output, track.target_lufs)
    (source_dir / "cue.md").write_text(cue_markdown(track, events, metrics), encoding="utf-8")
    return {
        "id": track.id,
        "issue": track.issue,
        "duration": round(track.duration, 3),
        "loop": track.loop,
        "theme": track.theme,
        "phrase_bars": track.phrase_bars,
        "melody_onsets_per_minute": round(
            sum(event.instrument == track.lead for event in events) / (track.duration / 60), 2
        ),
        "lufs": metrics["lufs"],
        "true_peak": metrics["true_peak"],
        "sha256": sha256(output),
        "midi_sha256": sha256(midi_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("track", nargs="*", help="track IDs; omit to render all")
    arguments = parser.parse_args()
    selected = [track for track in TRACKS if not arguments.track or track.id in arguments.track]
    unknown = set(arguments.track) - {track.id for track in TRACKS}
    if unknown:
        parser.error(f"unknown track(s): {', '.join(sorted(unknown))}")
    report = []
    for index, track in enumerate(selected, start=1):
        print(f"[{index}/{len(selected)}] rendering {track.id}", flush=True)
        report.append(render(track))
    report_path = ROOT / "docs" / "audio" / "render-report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    previous = []
    if report_path.exists() and arguments.track:
        previous = json.loads(report_path.read_text(encoding="utf-8"))
        previous = [item for item in previous if item["id"] not in {row["id"] for row in report}]
    report_path.write_text(json.dumps(previous + report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
