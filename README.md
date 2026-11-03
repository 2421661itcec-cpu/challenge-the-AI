# 🎮 AI Stone Paper Scissors — College Career Fest Edition

An arcade-grade, camera-based hand-tracking showdown built with **HTML5, CSS3, JavaScript (ES6+), and Google MediaPipe Hands Computer Vision**. Designed specifically as a showcase booth project for college career fests, tech symposiums, and interactive exhibitions.

---

## ⚡ Quick Launch Guide

> [!IMPORTANT]
> **Webcam access requires a Secure Context (`http://localhost` or `https://`).**
> Opening the file directly via `file:///...` will cause the browser to block webcam access due to security restrictions.

### 1. Launch a Local Web Server

Open your terminal or command prompt inside the project folder:

#### Option A: Using Python (Recommended)
```bash
# Python 3
python -m http.server 8000
```
Then open your browser at: **`http://localhost:8000`**

#### Option B: Using Node.js / npx
```bash
npx serve .
```
Then open the local URL indicated in your terminal (typically `http://localhost:3000`).

#### Option C: VS Code Live Server Extension
1. Open the project folder in Visual Studio Code.
2. Right-click `index.html` and click **"Open with Live Server"**.

---

## 🎯 Key Exhibition & Gameplay Features

### 1. 🤖 On-Device AI Hand Tracking
- Powered by Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision@0.10.14`).
- **100% On-Device Privacy:** Video frames are analyzed locally in the client browser using WebAssembly (WASM) and WebGL. No video is ever recorded, uploaded, or transmitted.
- **Neon Skeleton Overlay:** Real-time visual overlay displaying hand landmark points and connecting bones directly on the camera preview.

### 2. 🕹️ Five Playable Game Modes
- **Quick Match:** Fast exhibition blitz — first challenger to score 2 wins takes the match.
- **Best of 5:** Classic tournament standard — first to 3 wins or highest score after 5 rounds.
- **Survival Mode:** Endless gauntlet — continue playing until your first defeat. Draws keep you alive! Tracks the ultimate survival streak.
- **Time Attack:** 60-second high-energy clock countdown — score as many wins as possible before the timer runs out.
- **Practice Mode:** Free-play with real-time feedback, landmark skeleton overlay, and gesture tips without affecting competitive stats.

### 3. 🧠 Transparent & Formidable AI Opponent Strategies
- **Easy (Cyber Trainee):** Uniform random decision-making. Beginner friendly.
- **Normal (Cyber Tactician):** Incorporates classic game-theoretic psychological modeling (Win-Stay, Lose-Shift tendency anticipation) combined with 40% tactical randomization.
- **🔥 Hard (Cyber Overlord - Boss Mode):** Analyzes multi-order Markov transition chains ($P(\text{Move} \mid \text{LastMove})$ and joint distributions) + sequence tracking to anticipate human habit shifts. Features accelerated countdown timing and custom taunts.
- **💀 Nightmare (Apex Grandmaster):** State-of-the-art **Iocaine Powder Meta-Strategy Engine** (Dan Egnor tournament algorithm) with 3 adaptive meta-levels (Direct Counter, Anti-Bluff Counter, Double-Bluff Counter) dynamically scored and selected in real-time, plus high-pressure rapid-reflex countdown timing (580ms tick / 420ms shoot window) and live mind-reading telemetry!
- *Notice: Strictly non-cheating and transparent — AI moves are computed independently without looking ahead at camera frames!*

### 4. 🔊 Audio Synthesizer & Speech Announcer
- **Web Audio API Synth:** Procedurally generated 8-bit cyber sounds for countdown beeps, laser shoot sting, winning fanfare, defeat tones, and achievement chimes. Completely offline-capable with zero external MP3 dependencies.
- **Web Speech Synthesis:** Dynamic AI voice announcing round counts, countdown ("3, 2, 1, SHOOT!"), victory praises, streak milestones, and Hardcore/Nightmare AI taunts.
- Independent SFX & Voice toggles, plus a master volume control.

### 5. 📈 XP, Levels, and 9 Unlockable Achievements
- Gain XP for every round played (+50 XP for Win, +20 XP for Draw, +10 XP for Loss, bonus for high difficulty and comebacks).
- Ascend from **Level 1 (Novice Challenger)** through **Level 7 (Fest Champion)** with an animated cyber XP bar.
- Unlocks include:
  1. 🏆 *First Victory* — Win your first round.
  2. 🔥 *Winning Streak* — Win 3 rounds in a row.
  3. ⚡ *Five Wins* — Accumulate 5 total round wins.
  4. 💎 *Perfect Match* — Complete a match without losing a round.
  5. 🛡️ *Comeback Champion* — Win after trailing by 2 or more rounds.
  6. 👑 *Fest Champion* — Defeat the AI on Hard (Boss) difficulty.
  7. 💀 *Titan Slayer* — Defeat the Grandmaster AI on Nightmare difficulty.
  8. ⏱️ *Speed Demon* — Score 4+ wins in Time Attack mode.
  9. 🦾 *Iron Hand* — Reach a streak of 4+ in Survival Mode.
- Live cyberpunk toast notification when an achievement is unlocked.

### 6. 🏆 Local Exhibition Leaderboard & Career Stats
- On-device local leaderboard persisted in `localStorage`.
- Tracks Challenger Nickname, Mode, Score/Wins, Streak, Level, and Date.
- Detailed career analytics: Win percentage, total matches, and gesture preference distribution (Stone vs Paper vs Scissors).

### 7. 🎪 Exhibition Kiosk & Attract Mode
- **Idle Screensaver (Attract Mode):** Automatically activates after 45 seconds of idle inactivity (configurable in Settings). Cycles through simulated demo matches and displays an eye-catching call to action: *"TOUCH SCREEN OR PRESS ANY KEY TO PLAY NOW!"*.
- **Mobile QR Code Portal:** Built-in client-side SVG QR code generator (100% offline-ready). Organizers can enter their LAN IP or public URL so visitors can scan the QR code and play immediately on their own phones.
- **Customizable Event Branding:** Easily edit College Name, Department, Event Name, and Team Name directly in Settings.

### 8. ⌨️ Keyboard Shortcuts
- `Space` / `Enter`: Start Match / Proceed to Next Round
- `1`, `2`, `3`: Manual gesture selection (Stone, Paper, Scissors)
- `P`: Pause / Resume Match
- `M`: Toggle Sound Effects
- `V`: Toggle Voice Announcer
- `F`: Toggle Fullscreen Mode
- `T`: Open How to Play & Calibration Guide
- `Esc`: Close open modal windows

---

## 🛠️ Camera & Troubleshooting Guide

### 1. Camera Permission Denied
- Look at the left side of your browser address bar. Click the **Padlock** or **Site Settings** icon.
- Locate **Camera** and set permission to **"Allow"**.
- Refresh the page and click **START MATCH**.

### 2. "Camera already in use" Error
- Make sure no other application (such as Zoom, Microsoft Teams, Google Meet, or another browser window) is currently accessing your webcam.
- Close conflicting applications and click **"TRY AGAIN"**.

### 3. MediaPipe Model Loading Notice
- On the very first run, your browser requires an internet connection to download the MediaPipe Tasks Vision WASM runtime and pre-trained hand landmark model from CDN.
- Subsequent runs will cache assets according to standard browser caching rules.

### 4. Playing Without a Webcam
- If a webcam is unavailable or malfunctioning at your booth, click **"PLAY WITH BUTTONS"** or use the **Manual Move buttons** (✊ Stone, ✋ Paper, ✌️ Scissors) or keyboard keys `1`, `2`, and `3`.

---

## 📁 Project Architecture

```
ai-stone-paper-scissors-fest/
├── index.html           # Main arcade exhibition markup & modals
├── css/
│   └── styles.css       # Neon cyberpunk arcade UI styles & animations
├── js/
│   ├── app.js           # Main application coordinator & event bindings
│   ├── gameEngine.js    # 5 game modes, transparent AI difficulty strategies
│   ├── gestureDetector.js # MediaPipe HandLandmarker, skeleton visualizer, distance checks
│   ├── audioService.js  # Web Audio synthesizer & SpeechSynthesis announcer
│   ├── storageService.js# Profile, XP, achievements, leaderboard & persistence
│   └── qrService.js     # Pure JavaScript SVG QR code generator (offline)
└── README.md            # Setup guide & exhibition instructions
```

---

## 🎓 College Fest Exhibition Tips

1. **Dual Display / Large Monitor:** Connect the laptop running the game to a large booth TV or external monitor and press `F` to enter **Fullscreen Mode**.
2. **Lighting:** For best hand tracking, ensure the player's hand is well-lit from the front, avoiding harsh backlight or pointing the camera directly toward halogen floodlights.
3. **Distance:** Instruct players to hold their hand roughly 1.5 to 3 feet from the webcam lens with an open palm facing forward.
4. **Mobile Sharing:** Go to **🎪 Booth Info**, input your local Wi-Fi IP address (e.g. `http://192.168.1.50:8000`), and display the dynamic QR code for students to test on their mobile devices!
