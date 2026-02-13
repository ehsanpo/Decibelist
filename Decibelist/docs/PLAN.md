APP name: Decibelist
# Decibelist AI Development Plan

### Project Overview

* **Target:** 2026 Desktop App (Windows first; Mac later)
* **Architecture:** Wails 3 (Go Backend + React Frontend)
* **Design Style:** Skeuomorphic (Tailwind CSS only)
* **Core Feature:** Offline AI Mastering with 2 distinct engines and detailed acoustic analytics.

---

## 1. Project Infrastructure (Wails 3 + Go)

* [x] Initialize Wails 3 project with React/TS template.
* [x] Bundle static binaries for `ffmpeg`, `master_me`, `phaselimiter`, and `essentia` in `tools/windows` (Windows now, Mac later).
* [ ] Integrate **ONNX Runtime Go** for model inference (Offline processing).
* [x] Set up Go `exec` wrappers to trigger CLI engines with real-time `stdout` progress tracking.
* [x] Implement Go-based audio normalization and gain-matching logic using LUFS.

---

## 2. Frontend: Skeuomorphic UI (Tailwind CSS)
Note:  we can add the textures and more design later after everything is done.
* [x] **Global Theme:** Create a "Rack" container using deep inset shadows and brushed-metal background textures.
* [x] **Custom Knobs:** Build a reusable React component for circular knobs using `conic-gradient` and `rotate()` transforms.
* [x] **Module - Selector:** Implementation of 2 physical "Toggle Switches" for **Hybrid** and **Classic** modes.
* [x] **Module - Display:** Use `backdrop-filter: blur` and a "crt-scanline" overlay for the spectrum/waveform screen.
* [x] **Module - Limiter:** Re-create the requested Limiter/Mastering sliders using physical slider-track styles (Tailwind `shadow-inner`).
* [x] **Acoustic Stats Panel:** Design a "Grid of LEDs" and vintage "Digital Segment Displays" for metrics (Loudness, Dissonance, etc.).
* [x] **Rack Tabs:** Add top-level rack navigation to avoid a long single-page UI.
* [x] **Component Split:** Break frontend into rack + UI components instead of a single file.
* [x] **Segmented Controls:** Replace dropdowns/selects with capsule segmented controls.
* [x] **Knob Controls:** Replace sliders with `react-knob-headless` knobs styled to match the rack.
* [x] **Rack Layout Updates:** Move Automatic Mastering + Start Mastering under Limiter, keep Preview on its own rack.
* [x] **Jobs Rack:** Add a rack to list and load previous mastering jobs.
* [x] **Real-time Meters:** Use Web Audio API `AnalyserNode` for LED meters and spectrum instead of mock data.
* [x] **Missing Analytics Charts:** Add Spectrum, Spectrum Distribution (+3dB/oct), and Limiting Error Spectrogram visuals.
* [x] **Remove Demo Fallback:** Remove demo summary/metrics once backend data is guaranteed.


---

## 3. Mastering Engines Implementation

* [x] **Engine A (Hybrid / Master_me):** - Use Essentia to extract features (Spectral Balance, RMS).
* Pass features to a tiny ONNX "Predictor" model to generate optimal JSON parameters.
* Execute `master_me` CLI with predicted parameters.


* [x] **Engine B (Classic / Phaselimiter):** - Wrap the `phaselimiter` C++ binary.
* Map UI sliders (Ceiling, Loudness, Oversampling) directly to CLI flags.



---

## 4. Audio Player & Visuals (Wavesurfer.js)

* [x] **Dual-Engine Sync:** Load both "Original" and "Mastered" files into synced Wavesurfer instances.
* [x] **Bypass Switch:** Implement a crossfade toggle (50ms) that switches volume between instances without stopping playback.
* [x] **Waveform Render:** Generate and display the "Before/After" superimposed waveforms in the main display.
* [x] **Real-time Meters:** Use Web Audio API `AnalyserNode` to drive the skeuomorphic LED peak meters.

---

## 5. Statistics & Analytics (Essentia Integration)

* [x] **Loudness:** Calculate Integrated LUFS, Range, and True Peak (EBU R128).
* [x] **Professionality Score:** Calculate distance between the track's Spectral Centroid and the "Golden Curve."
* [x] **Space:** Compute Mid/Side energy ratio for stereo width analysis.
* [x] **Ear Damage:** Measure A-weighted energy in the 2kHz–8kHz range.
* [x] **Dissonance:** Implement Essentia’s `Dissonance` algorithm for harmonic roughness detection.

---

## 6. Export & Post-Processing

* [x] **Format Conversion:** Use FFmpeg to encode the final output to WAV (16/24/32-bit) or MP3 (320kbps).
* [x] **Metadata:** Transfer ID3 tags from original file to mastered file.
* [x] **Summary Report:** Generate the final statistics table and diagrams (Histogram, Spectrogram) using React-Chartjs-2.

---

### Would you like me to generate the React component code for the Skeuomorphic Knob or the Go wrapper for the Phaselimiter CLI?

# THE FRONTEND WORK LIKE THIS: 

## Select option screen

Select audio
 - Audio file selection

Limiter 
- Target Loudness Mode (Loudness / youtubeloudness)
- Target Loudness (dB) (Slider -  -12 t0 -3 )
- Ceiling Mode (Peack /true peack / true peak (15kGz lowpass))
- Ceiling (dBFS) (Slider - -1 to 0 )
- Oversampling (1xfast /2xslow)

Automatic Mastering
- Automatic Mastering Enabled (Checkbox)
- Level (Slider)
- Output Format (Wave(16bit), WAV(24pit), WAV(32bit float) , MP3(320kbps) )
- Sampling Rate (44.1kHz , 48Hz, same as original)
- Low Cut Freq  (Slider 0 to 40)
- High Cut Freq (Slider 18000 to 22000 )

Preserve Bass (Depending on the sound source, it may be easy to distort.) (checkbox)


##  Preview

Audio player that can switch between Original and master with out droping or pausing the audio


Download Buttons


### Summary
Status	Succeeded
Time	9 februari 2026 kl. 02:08
Length	01:12
Mode	Custom Mastering
Mastering Algorithm	v2
Target Loudness 	-3.0 dB
Target Loudness Mode	Loudness
Automatic Mastering 	Enabled
Automatic Mastering Level 	0.5
Low Cut Freq	40.00 Hz
High Cut Freq	22000.00 Hz
Ceiling Mode	True Peak (15kHz Lowpass)
Ceiling	-0.6 dB
Oversampling 	1x
Output Format	WAV (16bit)
Sampling Rate	44100 Hz
Download Full Audio	Available
Bass Preservation	Disabled
Limiting Error 	2.6 dB

### Statistics The description of indicies can be shown by clicking "?" icon.
Original	Mastered
Loudness 	-10.5 dB (71%)	-8.1 dB (92%)
RMS 	-9.8 dB (95%)	-9.2 dB (98%)
Peak	0.0 dB (0%)	-3.3 dB (9%)
True Peak	0.5 dB	-0.7 dB
True Peak(15kHz lowpass) 	0.6 dB	-0.6 dB
Loudness Range 	8.6 dB (41%)	3.3 dB (2%)
YouTube Loudness	-10.1 dB	-6.9 dB
YouTube Loudness Compensation 	-0.2 dB	-3.4 dB
Micro Dynamics	2.8 dB (53%)	2.2 dB (25%)
Space	-8.3 dB (50%)	-8.6 dB (46%)
Professionality 	42 %	71 %
Professionality2 	10 %	50 %
Acoustic Entropy 	145 bit	178 bit
Ear Damage	23.6 dB	19.2 dB
Dissonance	6.05	7.85

### Waveform (Diagram/graph of mastered and original)
### Loudness (Diagram/graph of mastered and original)
### Spectrum (Diagram/graph of mastered and original)
### Spectrum Distribution (+3dB/oct)
Original (spectrum analyzer display.)
Mastered (spectrum analyzer display.)
### Loudness Histogram (Diagram/graph of mastered and original)
### Limiting Error Spectrogram (Diagram/graph of mastered and original)


---
