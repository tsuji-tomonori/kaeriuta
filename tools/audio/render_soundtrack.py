#!/usr/bin/env python3
"""Render the Kaeriuta soundtrack from deterministic, editable cue data.

The synthesizer intentionally uses no downloaded samples.  Every audible source
is built from band-limited harmonic models, filtered noise, envelopes and a
small stereo room.  The same event list is also exported as a Standard MIDI
File so an arranger can replace any synthesized voice in a free DAW later.
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
MOTIF = (74, 77, 76, 72, 74, 69, 67, 74)  # D5 F5 E5 C5 | D5 A4 G4 D5


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
    motif: str
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
    Track("bgm_title", 23, "まだ閉じない頁", "雨の館と、まだ読まれていない結末", 72, 6, 16, "D minor / D Dorian", ("Dm9", "BbM7", "Cadd9", "Dsus2"), "felt_piano", "clarinet", "warm_pad", "soft_wood", "unresolved", .82),
    Track("bgm_arrival", 24, "雨の向こうの館", "懐かしさと復讐計画へ入る緊張", 68, 6, 14, "D minor", ("Dm9", "Cadd9", "BbM7", "Asus4"), "felt_piano", "alto_flute", "string_pad", "soft_wood", "fragment", .72),
    Track("bgm_mansion", 26, "閉じた書架の呼吸", "館と家族史が静かに見ている感覚", 60, 4, 20, "D minor", ("Dm9", "BbM7", "Gm9", "Cadd9"), "felt_piano", "bass_clarinet", "warm_pad", "none", "hidden", .52),
    Track("bgm_storm", 28, "橋のない夜", "孤立と、計画が現実の被害へ変わる圧力", 84, 6, 16, "D minor", ("Dm", "C", "Bb", "Asus4"), "low_piano", "cello", "dark_pad", "frame_drum", "compressed", .95),
    Track("bgm_inquiry", 29, "余白を裁く", "返答までの沈黙と観察される緊張", 76, 4, 24, "D minor", ("Dm9", "Gm9", "BbM7", "Asus4"), "muted_piano", "bass_clarinet", "warm_pad", "pizzicato", "question", .68),
    Track("bgm_reasoning", 27, "読まれる側", "手掛かりが結びつく快感と、知りすぎる危険", 96, 4, 28, "D minor / D Dorian", ("Dm", "G", "Bb", "A"), "muted_piano", "clarinet", "moving_pad", "pizzicato", "chromatic", .98),
    Track("bgm_end_arrest", 30, "逮捕 ― 調書の余白", "罪と沈黙を記録へ渡す重さ", 60, 4, 16, "D minor", ("Dm9", "BbM7", "Gm9", "Asus4"), "felt_piano", "cello", "dark_pad", "none", "first_half", .55, -23),
    Track("bgm_end_escape", 31, "脱出 ― 三里先の朝靄", "身体は自由でも物語から逃げ切れない帰路", 72, 6, 14, "D Dorian", ("Dm9", "Cadd9", "G", "BbM7"), "alto_flute", "pizzicato", "warm_pad", "soft_wood", "second_half", .70, -23),
    Track("bgm_end_puppet", 33, "操り人形 ― 糸の先の筆", "操られた虚無と、自分で選んだ罪", 54, 5, 14, "D minor", ("Dm", "EbM7", "Bb", "Asus4"), "muted_piano", "viola", "dark_pad", "soft_wood", "inverted", .58, -23),
    Track("bgm_end_reversal", 32, "逆転 ― 二つの手錠", "真実の前進と栞自身の代償", 80, 4, 24, "D minor / D Dorian", ("Dm9", "G", "BbM7", "Asus4"), "felt_piano", "cello", "string_pad", "frame_drum", "almost_full", .90, -23),
    Track("bgm_end_rescue", 34, "真相 ― 名前を返す朝", "正しい作者名と物語が読者へ帰る夜明け", 72, 6, 18, "D Dorian", ("Dm9", "G", "BbM7", "Dsus2"), "felt_piano", "clarinet", "string_pad", "soft_wood", "resolved", .88, -23),
    Track("bgm_end_unfinished", 35, "未完 ― 長すぎる栞", "届かなかった名前と、次の読者への余白", 60, 4, 20, "D minor / C", ("Dm9", "Cadd9", "BbM7", "Gm9"), "felt_piano", "viola", "warm_pad", "none", "without_last", .52, -23),
    Track("bgm_end_silenced", 36, "口封じ ― 白い羽", "奪われた声と、残った『帰る』の一語", 52, 4, 16, "D minor", ("Dm9", "BbM7", "Gm9", "Dsus2"), "felt_piano", "bass_clarinet", "dark_pad", "none", "breath", .42, -23),
    Track("bgm_credits", 37, "帰り唄", "真相の先で、物語を正しい名へ返すED", 72, 6, 34, "D minor -> D Dorian", ("Dm9", "BbM7", "Cadd9", "G", "Dm9", "G", "BbM7", "Dsus2"), "felt_piano", "clarinet", "string_pad", "soft_wood", "resolved", 1.0, -21, False),
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
    "EbM7": (51, 58, 62, 67),
}


PROGRAMS = {
    "felt_piano": 0,
    "muted_piano": 0,
    "low_piano": 0,
    "cello": 42,
    "viola": 41,
    "string_pad": 48,
    "pizzicato": 45,
    "clarinet": 71,
    "bass_clarinet": 71,
    "alto_flute": 73,
    "warm_pad": 89,
    "dark_pad": 89,
    "moving_pad": 89,
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


def motif_for(name: str) -> tuple[int | None, ...]:
    variants: dict[str, tuple[int | None, ...]] = {
        "unresolved": (*MOTIF[:-1], None),
        "fragment": (74, None, 77, 76, None, 72),
        "hidden": (62, None, 69, None, 67),
        "compressed": (62, 65, 64, 60, None),
        "question": (74, 77, 76, None, 72),
        "chromatic": (74, 77, 78, 76, 72, 74, 69, 67, None),
        "first_half": (74, 77, 76, 72, None),
        "second_half": (74, 69, 67, None),
        "inverted": (74, 71, 72, 76, 74, None),
        "almost_full": (*MOTIF[:-1], 62),
        "resolved": MOTIF,
        "without_last": (*MOTIF[:-1], None),
        "breath": (67, None, 74),
    }
    return variants[name]


def arrangement(track: Track) -> list[Event]:
    events: list[Event] = []
    total_beats = track.bars * track.meter
    rng = np.random.default_rng(track.issue * 7919)
    phrase_bars = 4 if track.density >= .7 else 8

    # Harmony is deliberately voiced sparsely; a cue must leave room for text.
    for bar in range(track.bars):
        chord = CHORDS[track.progression[bar % len(track.progression)]]
        start = bar * track.meter
        texture_velocity = .16 + track.density * .10
        if track.id == "bgm_credits":
            section = bar / track.bars
            texture_velocity *= .55 + min(section * 1.8, .9)
        for index, note in enumerate(chord[1:]):
            pan = (-.36, .30, -.16, .18)[index % 4]
            events.append(Event(track.texture, start, track.meter + .9, note, texture_velocity, pan))
        # A low bowed/breathed anchor replaces the former fixed sine drones.
        if bar % 2 == 0:
            bass_voice = "cello" if track.counter not in {"cello", "viola"} else "bass_clarinet"
            events.append(Event(bass_voice, start, track.meter * 1.8, chord[0], .20 + .08 * track.density, -.24))

    motif = motif_for(track.motif)
    phrase_count = math.ceil(track.bars / phrase_bars)
    for phrase in range(phrase_count):
        if track.motif == "hidden" and phrase % 2:
            continue
        base = phrase * phrase_bars * track.meter + (1.0 if track.meter >= 5 else .5)
        spacing = 1.25 if track.meter >= 5 else .9
        if track.motif in {"breath", "hidden"}:
            spacing *= 2.2
        for index, note in enumerate(motif):
            if note is None:
                continue
            start = base + index * spacing
            if start >= total_beats - .5:
                break
            human = float(rng.uniform(-.035, .035))
            velocity = (.28 + .10 * track.density) * float(rng.uniform(.90, 1.06))
            duration = 1.15 if track.lead in {"felt_piano", "muted_piano", "low_piano"} else 1.8
            events.append(Event(track.lead, start + human, duration, note, velocity, -.10 + .08 * (index % 3)))

        # A restrained counterline answers instead of doubling the melody.
        if phrase % 2 == 0 and track.counter != "none":
            chord = CHORDS[track.progression[(phrase * phrase_bars + 2) % len(track.progression)]]
            counter_start = base + track.meter * 1.8
            for index, note in enumerate((chord[-1], chord[-2], chord[1])):
                if counter_start + index * 1.8 < total_beats - .5:
                    events.append(Event(track.counter, counter_start + index * 1.8, 2.2, note + 12, .20 + .06 * track.density, .28))

    # Organic pulse.  It intentionally avoids a metronomic high tick.
    if track.pulse != "none":
        step = 3 if track.meter == 6 else 2
        for beat in np.arange(0, total_beats, step):
            if track.density < .6 and int(beat / step) % 2:
                continue
            note = 38 if track.pulse == "frame_drum" else (50 if track.pulse == "pizzicato" else 62)
            velocity = (.13 + .11 * track.density) * float(rng.uniform(.86, 1.05))
            pan = float(rng.uniform(-.18, .18))
            events.append(Event(track.pulse, float(beat + rng.uniform(-.025, .025)), .45, note, velocity, pan))

    # ED grows by adding a second theme statement and a final human-scale coda.
    if track.id == "bgm_credits":
        midpoint = total_beats * .55
        for index, note in enumerate(MOTIF):
            events.append(Event("clarinet", midpoint + index * 1.25, 2.3, note, .42, .12))
            if index in {0, 3, 7}:
                events.append(Event("cello", midpoint + index * 1.25, 3.6, note - 12, .32, -.24))
        final = total_beats - track.meter * 2
        for note, pan in zip((50, 57, 62, 64, 66), (-.30, -.12, .0, .16, .30), strict=True):
            events.append(Event("string_pad", final, track.meter * 1.8, note, .28, pan))
        events.append(Event("felt_piano", final, track.meter * 1.5, 74, .36, -.05))

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
        "felt_piano": 2.6, "muted_piano": 1.8, "low_piano": 2.8,
        "cello": 1.1, "viola": .9, "clarinet": .7, "bass_clarinet": .9,
        "alto_flute": .8, "string_pad": 2.4, "warm_pad": 2.6,
        "dark_pad": 2.8, "moving_pad": 2.3, "pizzicato": .8,
        "soft_wood": .45, "frame_drum": .7,
    }.get(instrument, .8)
    full_duration = max(.2, duration + release)
    count = max(1, int(full_duration * SR))
    t = np.arange(count, dtype=np.float32) / SR
    frequency = midi_frequency(note)

    if instrument in {"felt_piano", "muted_piano", "low_piano"}:
        brightness = {"felt_piano": .62, "muted_piano": .42, "low_piano": .50}[instrument]
        signal = np.zeros(count, dtype=np.float32)
        for harmonic, gain in enumerate((1.0, .34, .16, .075, .032), start=1):
            decay = 2.7 / (1 + harmonic * .34)
            detune = 1 + (harmonic - 1) * .00038
            signal += gain * np.sin(TAU * frequency * harmonic * detune * t) * np.exp(-t / decay)
        hammer = filtered_noise(rng, count, 2_800) * np.exp(-t / .024) * .026 * brightness
        signal = (signal + hammer) * adsr(t, duration + release, .012, release, .74)
        signal = soften(signal, 6_800 if instrument != "muted_piano" else 5_200)
    elif instrument in {"cello", "viola", "string_pad"}:
        signal = np.zeros(count, dtype=np.float32)
        phase_vibrato = .035 * np.sin(TAU * (4.7 + rng.uniform(-.2, .2)) * t)
        harmonics = 8 if instrument != "string_pad" else 6
        for harmonic in range(1, harmonics + 1):
            weight = (1 / harmonic ** 1.38) * (1.0 if harmonic < 5 else .55)
            signal += weight * np.sin(TAU * frequency * harmonic * t + harmonic * phase_vibrato)
        bow = filtered_noise(rng, count, 4_000) * .022
        attack = .18 if instrument != "string_pad" else .75
        signal = (signal + bow) * adsr(t, duration + release, attack, release, .78)
        signal = soften(signal, 6_100 if instrument == "cello" else 7_200)
    elif instrument in {"clarinet", "bass_clarinet", "alto_flute"}:
        signal = np.zeros(count, dtype=np.float32)
        if instrument == "alto_flute":
            weights = ((1, 1.0), (2, .14), (3, .19), (4, .04))
            cutoff = 6_600
        else:
            weights = ((1, 1.0), (3, .38), (5, .14), (7, .05))
            cutoff = 5_900 if instrument == "bass_clarinet" else 7_000
        vibrato = .018 * np.sin(TAU * 5.1 * t)
        for harmonic, gain in weights:
            signal += gain * np.sin(TAU * frequency * harmonic * t + harmonic * vibrato)
        breath = filtered_noise(rng, count, 5_200) * (.032 if instrument == "alto_flute" else .018)
        signal = (signal + breath) * adsr(t, duration + release, .13, release, .82)
        signal = soften(signal, cutoff)
    elif instrument in {"warm_pad", "dark_pad", "moving_pad"}:
        signal = np.zeros(count, dtype=np.float32)
        for detune, gain in ((-.006, .42), (0, .72), (.005, .38)):
            phase = TAU * frequency * (1 + detune) * t
            triangle = np.zeros(count, dtype=np.float32)
            for harmonic in (1, 3, 5, 7):
                triangle += ((-1) ** ((harmonic - 1) // 2)) * np.sin(harmonic * phase) / (harmonic * harmonic)
            signal += gain * triangle
        if instrument == "moving_pad":
            signal *= (.82 + .18 * np.sin(TAU * .09 * t)).astype(np.float32)
        cutoff = {"warm_pad": 4_800, "dark_pad": 3_400, "moving_pad": 5_200}[instrument]
        signal *= adsr(t, duration + release, .9, release, .76)
        signal = soften(signal, cutoff)
    elif instrument == "pizzicato":
        signal = np.zeros(count, dtype=np.float32)
        for harmonic in range(1, 9):
            signal += (1 / harmonic ** 1.2) * np.sin(TAU * frequency * harmonic * t) * np.exp(-t * (1.7 + harmonic * .55))
        signal += filtered_noise(rng, count, 3_100) * np.exp(-t / .035) * .035
        signal = soften(signal, 5_800)
    elif instrument == "soft_wood":
        signal = (np.sin(TAU * frequency * t) + .22 * np.sin(TAU * frequency * 2.72 * t))
        signal *= np.exp(-t * 7.2)
        signal += filtered_noise(rng, count, 2_400) * np.exp(-t / .025) * .028
        signal = soften(signal, 5_500)
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
    taps = ((.071, .10, .05), (.113, .075, .095), (.181, .065, .052), (.293, .045, .060), (.421, .030, .026))
    for delay, left_gain, right_gain in taps:
        samples = int(delay * SR)
        wet[samples:, 0] += mix[:-samples, 0] * left_gain + mix[:-samples, 1] * .018
        wet[samples:, 1] += mix[:-samples, 1] * right_gain + mix[:-samples, 0] * .018
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

    mix = add_room(mix, .72 if track.id != "bgm_storm" else .48)
    if track.loop:
        start = int(duration * SR)
        mix = mix[start : start + int(duration * SR)]
    else:
        mix = mix[: int(duration * SR)]
        fade = min(len(mix), int(5 * SR))
        mix[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)[:, None]
        head = min(len(mix), int(.35 * SR))
        mix[:head] *= np.linspace(0, 1, head, dtype=np.float32)[:, None]

    # The renderer keeps generous crest factor.  Final loudness is a fixed-gain
    # operation after measurement, never a per-loop compressor.
    mix = np.tanh(mix * .72).astype(np.float32)
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
- Leitmotif treatment: {track.motif}
- Instruments: {instruments}
- Duration: {track.duration:.3f} s
- Loop: {loop}
- Target loudness: {track.target_lufs:.1f} LUFS-I
- Rendered loudness: {metrics['lufs']:.1f} LUFS-I
- Rendered true peak: {metrics['true_peak']:.1f} dBTP

## Intent

The shared motif is D–F–E–C | D–A–G–D.  This cue uses the treatment above and
keeps the final D unresolved unless the cue belongs to the true ending or ED.
The arrangement leaves space for Japanese text, ambience and scene effects.

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
