
This is the most critical part of your engineering phase. By using these three specific types of files from **AudioCheck.net**, you are stress-testing the math of your AI engines to ensure they don't "break" the music.

Here is the professional test plan for your three "Master-and-Compare" scenarios.

---

## 1. The Pink Noise Test (Frequency & EQ Neutrality)

**What it is:** A file that contains all frequencies at once with a specific "natural" slope.
**Where to get it:** [AudioCheck.net Pink Noise](https://www.audiocheck.net/testtones_pinknoise.php)

### The Test Procedure:

1. **Run Engine:** Feed the Pink Noise into your app. Set it to **Automatic Mastering** (Neural or Hybrid).
2. **Observe the Spectrum:** Look at the "After" spectrum analyzer.
3. **The Result:** It should be a smooth, straight diagonal line from the top-left to the bottom-right.

### What to look for:

* **"The Bump" (Failure):** If you see a weird mountain in the middle of the line, your AI is boosting frequencies it shouldn't be. This means a vocal or snare drum would sound "honky" or "harsh."
* **The "Professionality" Stat:** Since Pink Noise is the "perfect" musical balance, your app should give this file a **very high score (85%+)**. If the AI gives it a low score, your "Professionality" math is miscalibrated.

---

## 2. The THD Test (Clarity & Distortion)

**What it is:** Pure sine waves designed to see how much "garbage" (harmonics) an engine adds.
**Where to get it:** [AudioCheck.net THD Test Tones](https://www.audiocheck.net/testtones_thd.php)

### The Test Procedure:

1. **Run Engine:** Feed a "Pure 1kHz Sine Tone" into your app.
2. **Loudness Target:** Set your target to -12 dB or higher. This forces the limiter to work hard.

### What to look for:

* **Aliasing (Failure):** Look at the spectrum. You should only see one big peak at 1000Hz. If you see dozens of tiny little peaks (looking like a "comb"), the engine is creating digital distortion (aliasing).
* **Transparency:** A "Neural" engine might add some warmth (Harmonics), which is okay. But the **Classic (Phaselimiter)** engine should be nearly "invisible"—meaning the output looks just as clean as the input.

---

## 3. The Dynamic Test (Limiter & Ceiling Safety)

**What it is:** Tones that alternate between very loud and very quiet.
**Where to get it:** [AudioCheck.net Dynamic Test Tones](https://www.audiocheck.net/testtones_dynamic.php)

### The Test Procedure:

1. **Run Engine:** Use a file that jumps from -20dB to 0dB suddenly.
2. **Verify Ceiling:** Set your ceiling to **-0.5 dB**.

### What to look for:

* **"Pumping" (Failure):** Listen carefully when the sound goes from loud to quiet. Does the volume stay steady, or does it "suck in" and then slowly "breathe" back out? If it breathes, your Limiter’s **Release Time** is too slow.
* **Ceiling Violation:** This is a "Zero Tolerance" test. If your stats show a peak of **-0.4 dB** when you set it to **-0.5 dB**, the engine has failed. In mastering, -0.1 dB is a huge error.
* **Transients:** If the sudden "loud" part sounds "blunted" or "soft," the AI is killing the "punch" of the audio.

---

## Summary Checklist for Testers

| Test File | Success looks like... | Failure looks like... |
| --- | --- | --- |
| **Pink Noise** | A smooth diagonal line. | Bumpy, jagged, or wavy line. |
| **THD Tone** | One single vertical spike. | A "forest" of tiny spikes. |
| **Dynamic Tone** | Fast, transparent volume changes. | Clicking, popping, or "sucking" sounds. |

This tutorial on using spectrum analyzers will help you understand how to "read" those Pink Noise and THD lines when they appear in your app's summary screen.

[How to Use a Spectrum Analyzer for Mastering](https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DF0S02vW9fXo)

This video is relevant because it teaches you how to visually identify the "forest" of spikes (distortion) or the "mountains" (EQ issues) we discussed in your test plan.