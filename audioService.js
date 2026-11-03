/**
 * Cyber Arcade Sound & Voice Synthesizer
 * Built with Web Audio API and Web Speech Synthesis.
 * Zero external audio files required — fully offline capable!
 */

export class AudioService {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.soundEnabled = true;
    this.voiceEnabled = true;
    this.volume = 0.8; // 0.0 - 1.0
    this.synth = window.speechSynthesis || null;
    this.selectedVoice = null;
    this.isMuted = false;

    // Load voices if SpeechSynthesis is supported
    if (this.synth) {
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer distinct, clear English voices (Google, Microsoft, or en-US)
    this.selectedVoice = voices.find(v => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Zira')) && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0] || null;
  }

  setVolume(level) {
    this.volume = Math.max(0, Math.min(1, level));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = !!enabled;
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = !!enabled;
    if (!this.voiceEnabled && this.synth) {
      this.synth.cancel();
    }
  }

  playTone(freq = 600, duration = 0.12, type = "sine", gainVal = 0.15) {
    if (!this.soundEnabled || this.isMuted) return;
    try {
      this.initAudioContext();
      if (!this.audioCtx || !this.masterGain) return;

      const osc = this.audioCtx.createOscillator();
      const noteGain = this.audioCtx.createGain();
      const now = this.audioCtx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      noteGain.gain.setValueAtTime(gainVal, now);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(noteGain);
      noteGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("Audio playTone error:", e);
    }
  }

  /**
   * Sound effect: UI button click
   */
  playClick() {
    this.playTone(880, 0.05, "sine", 0.08);
  }

  /**
   * Sound effect: Countdown tick (1, 2, 3)
   */
  playCountdown(count) {
    const freqs = { 3: 440, 2: 554, 1: 659 };
    const freq = freqs[count] || 440;
    this.playTone(freq, 0.15, "triangle", 0.18);
  }

  /**
   * Sound effect: Countdown SHOOT!
   */
  playShoot() {
    if (!this.soundEnabled || this.isMuted) return;
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  /**
   * Sound effect: Round Win
   */
  playWin() {
    if (!this.soundEnabled || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.18, "sine", 0.18);
      }, idx * 60);
    });
  }

  /**
   * Sound effect: Round Lose
   */
  playLose() {
    if (!this.soundEnabled || this.isMuted) return;
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  /**
   * Sound effect: Round Draw
   */
  playDraw() {
    this.playTone(493.88, 0.18, "triangle", 0.15); // B4
    setTimeout(() => this.playTone(587.33, 0.22, "triangle", 0.15), 90); // D5
  }

  /**
   * Sound effect: Level Up
   */
  playLevelUp() {
    if (!this.soundEnabled || this.isMuted) return;
    const chord = [440, 554.37, 659.25, 880, 1108.73];
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, "sine", 0.16);
      }, idx * 70);
    });
  }

  /**
   * Sound effect: Achievement Unlocked
   */
  playAchievement() {
    if (!this.soundEnabled || this.isMuted) return;
    const fanfare = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
    fanfare.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.28, "square", 0.12);
      }, idx * 80);
    });
  }

  /**
   * Sound effect: Match Victory
   */
  playMatchVictory() {
    if (!this.soundEnabled || this.isMuted) return;
    const anthem = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51];
    anthem.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.22, "sine", 0.2);
      }, idx * 100);
    });
  }

  /**
   * Sound effect: Match Defeat
   */
  playMatchDefeat() {
    if (!this.soundEnabled || this.isMuted) return;
    const defeat = [392.00, 349.23, 311.13, 261.63];
    defeat.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.35, "sawtooth", 0.14);
      }, idx * 140);
    });
  }

  /**
   * Voice Announcer using Web Speech Synthesis
   * @param {string} text - Message to announce.
   * @param {boolean} interrupt - If true, cancels ongoing utterances.
   */
  speak(text, interrupt = false) {
    if (!this.voiceEnabled || this.isMuted || !this.synth) return;
    try {
      if (interrupt) {
        this.synth.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.volume;
      utterance.rate = 1.05; // Slightly faster for game pacing
      utterance.pitch = 1.0;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      // Handle speech error gracefully
      utterance.onerror = (e) => {
        console.warn("Speech synthesis notice:", e?.error);
      };

      this.synth.speak(utterance);
    } catch (err) {
      console.warn("Speech announcer error:", err);
    }
  }

  announceRound(roundNum, maxRounds = 5) {
    this.speak(`Round ${roundNum}`);
  }

  announceCountdown(num) {
    if (num > 0) {
      this.speak(String(num), true);
    } else {
      this.speak("Shoot!", true);
    }
  }

  announceRoundResult(result, difficulty = "normal") {
    const isHardcore = difficulty === "hard" || difficulty === "nightmare";

    const phrases = {
      win: isHardcore ? [
        "Anomaly detected! You broke my prediction!",
        "Impressive counter-bluff, human!",
        "You got lucky that round!",
        "Sensational strike against the machine!"
      ] : [
        "You win this round!",
        "Sensational move!",
        "Point for human!",
        "Victory is yours!"
      ],
      lose: isHardcore ? [
        "Pattern detected! Your moves are predictable.",
        "I calculated that move three rounds ago!",
        "Neural prediction verified. Point for the machine!",
        "Human psychology is easy to read. Try harder!",
        "You cannot outsmart the Grandmaster algorithm!"
      ] : [
        "Cyber bot scores!",
        "AI takes the round!",
        "Watch out for the machine!",
        "Bot point!"
      ],
      draw: [
        "It's a draw!",
        "Mirror match!",
        "Evenly matched!"
      ]
    };

    const list = phrases[result] || [];
    if (list.length > 0) {
      const phrase = list[Math.floor(Math.random() * list.length)];
      this.speak(phrase);
    }
  }

  announceMatchResult(won, difficulty = "normal") {
    if (won) {
      if (difficulty === "nightmare") {
        this.speak("Impossible! You have defeated the Nightmare Grandmaster AI! You are a true legend!", true);
      } else if (difficulty === "hard") {
        this.speak("Incredible! You defeated the Cyber Overlord! Congratulations, Fest Champion!", true);
      } else {
        this.speak("Congratulations! You are the Fest Champion!", true);
      }
    } else {
      if (difficulty === "nightmare" || difficulty === "hard") {
        this.speak("The machine reigns supreme. The neural network read your every move!", true);
      } else {
        this.speak("Match over! The AI takes victory. Try again!", true);
      }
    }
  }

  announceStreak(streak) {
    if (streak === 3) {
      this.speak("On fire! 3 wins in a row!");
    } else if (streak === 5) {
      this.speak("Unstoppable! 5 winning streak!");
    }
  }
}
