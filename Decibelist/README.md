# Decibelist

Offline AI Mastering and Acoustic Analytics for Desktop.

![Decibelist Logo](frontend/public/favicon.ico)

Decibelist is a professional-grade audio mastering application that works completely offline. It combines advanced AI-driven mastering engines with deep acoustic analytics to help producers achieve commercial-level sound quality without sending data to the cloud.

## Features

- **Dual AI Mastering Engines:**
  - **Hybrid Engine:** Uses Essentia for feature extraction and `master_me` for intelligent parameter adjustment.
  - **Classic Engine:** A high-precision `phaselimiter` chain for traditional mastering control.
- **Deep Acoustic Analytics:**
  - Real-time spectrum analysis.
  - LUFS, RMS, and Peak loudness metrics.
  - Spectral Distribution and Limiting Error Spectrograms.
  - "Professionality Score" to compare your tracks against industry golden curves.
- **Precision Controls:**
  - Target Loudness (Loudness or YouTube modes).
  - True Peak Ceiling and Oversampling.
  - Low/High Cut filters.
  - Automatic mastering with adjustable intensity.
- **Real-time Preview Rack:**
  - High-fidelity waveform visualization.
  - Zero-latency bypass toggle with crossfading for A/B testing.
  - Skeuomorphic LED peak meters.
- **Job Management:** Save and reload previous mastering sessions.

## Tech Stack

- **Backend:** Go with Wails 3.
- **Frontend:** React, TypeScript, and Tailwind CSS.
- **Audio Engines:** FFmpeg, Essentia, Master_me, and Phaselimiter.
- **Visualization:** WaveSurfer.js and Chart.js.

## Getting Started

### Prerequisites

- [Go](https://golang.org/dl/) 1.21+
- [Node.js](https://nodejs.org/) & [npm](https://www.npmjs.com/)
- [Wails v3](https://v3.wails.io/introduction/installation)

### Development

1. Clone the repository.
2. Navigate to the `Decibelist` directory.
3. Run the application in development mode:
   ```bash
   wails3 dev
   ```

### Production Build

To create a production-ready executable:
```bash
wails3 build
```
The executable will be located in the `bin` directory.

## Project Structure

- `frontend/`: React frontend application.
- `tools/`: Static binaries for audio processing engines (FFmpeg, Essentia, etc.).
- `audio_*.go`: Backend audio processing logic and service implementation.
- `main.go`: Application entry point and Wails configuration.

## License

Copyright © 2026. All rights reserved.
