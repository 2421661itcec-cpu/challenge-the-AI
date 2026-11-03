/**
 * Persistent Storage & Progression Engine
 * Handles Player Profile, XP, Levels, Achievements, Match Statistics,
 * Local Leaderboard, and Exhibition Kiosk Settings.
 */

const STORAGE_KEYS = {
  PROFILE: 'rps_fest_profile_v1',
  STATS: 'rps_fest_stats_v1',
  HISTORY: 'rps_fest_history_v1',
  ACHIEVEMENTS: 'rps_fest_achievements_v1',
  LEADERBOARD: 'rps_fest_leaderboard_v1',
  SETTINGS: 'rps_fest_settings_v1'
};

export const LEVEL_TITLES = [
  "Novice Challenger",      // Level 1
  "Cyber Trainee",          // Level 2
  "Code Warrior",           // Level 3
  "Machine Breaker",        // Level 4
  "AI Tactician",           // Level 5
  "Cyber Grandmaster",      // Level 6
  "Fest Champion",          // Level 7
  "Legendary Neural Master" // Level 8+
];

export const ACHIEVEMENTS_LIST = [
  { id: 'first_win', name: 'First Victory', desc: 'Win your first round against the AI', icon: '🏆' },
  { id: 'streak_3', name: 'Winning Streak', desc: 'Achieve 3 round wins in a row', icon: '🔥' },
  { id: 'five_wins', name: 'Five Wins', desc: 'Win 5 rounds across all matches', icon: '⚡' },
  { id: 'perfect_match', name: 'Perfect Match', desc: 'Win a match without losing a single round', icon: '💎' },
  { id: 'comeback', name: 'Comeback Champion', desc: 'Win a match after trailing behind', icon: '🛡️' },
  { id: 'fest_champion', name: 'Fest Champion', desc: 'Win a competitive match on Hard difficulty', icon: '👑' },
  { id: 'nightmare_win', name: 'Titan Slayer', desc: 'Defeat the Grandmaster AI on Nightmare difficulty', icon: '💀' },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Win 4 or more rounds in Time Attack mode', icon: '⏱️' },
  { id: 'iron_hand', name: 'Iron Hand', desc: 'Achieve a streak of 4 or more in Survival Mode', icon: '🦾' }
];

export class StorageService {
  constructor() {
    this.profile = this.loadProfile();
    this.stats = this.loadStats();
    this.history = this.loadHistory();
    this.achievements = this.loadAchievements();
    this.leaderboard = this.loadLeaderboard();
    this.settings = this.loadSettings();
  }

  // --- Safe LocalStorage Utilities ---
  _get(key, defaultVal) {
    try {
      const data = localStorage.getItem(key);
      if (data === null) return defaultVal;
      return JSON.parse(data);
    } catch (e) {
      console.warn(`Error reading localStorage[${key}]:`, e);
      return defaultVal;
    }
  }

  _set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn(`Error writing localStorage[${key}]:`, e);
    }
  }

  // --- Profile & XP Progression ---
  loadProfile() {
    const defaultProfile = {
      nickname: 'Player One',
      xp: 0,
      avatar: '👤'
    };
    const loaded = this._get(STORAGE_KEYS.PROFILE, defaultProfile);
    // Sanitize nickname
    loaded.nickname = this.sanitizeNickname(loaded.nickname || 'Player One');
    return loaded;
  }

  saveProfile() {
    this._set(STORAGE_KEYS.PROFILE, this.profile);
  }

  setNickname(name) {
    this.profile.nickname = this.sanitizeNickname(name);
    this.saveProfile();
    return this.profile.nickname;
  }

  sanitizeNickname(raw) {
    if (!raw || typeof raw !== 'string') return 'Player One';
    const cleaned = raw.replace(/[^\w\s-]/gi, '').trim().slice(0, 15);
    return cleaned.length > 0 ? cleaned : 'Player One';
  }

  /**
   * Computes Level based on total XP.
   * Level 1: 0 - 150 XP
   * Level 2: 150 - 350 XP (requires 200 XP)
   * Level 3: 350 - 650 XP (requires 300 XP)
   * Each subsequent level requires +100 XP more than the previous tier.
   */
  getLevelInfo(totalXP = this.profile.xp) {
    let level = 1;
    let currentMin = 0;
    let nextTierCost = 150;

    while (totalXP >= currentMin + nextTierCost) {
      currentMin += nextTierCost;
      level++;
      nextTierCost += 100;
    }

    const xpInCurrentLevel = totalXP - currentMin;
    const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / nextTierCost) * 100));
    const titleIndex = Math.min(level - 1, LEVEL_TITLES.length - 1);

    return {
      level,
      title: LEVEL_TITLES[titleIndex],
      currentXP: totalXP,
      xpInCurrentLevel,
      xpNeededForNext: nextTierCost,
      nextLevelAt: currentMin + nextTierCost,
      progressPercent
    };
  }

  addXP(amount) {
    const beforeLevel = this.getLevelInfo(this.profile.xp).level;
    this.profile.xp += Math.max(0, amount);
    this.saveProfile();
    const after = this.getLevelInfo(this.profile.xp);

    return {
      gained: amount,
      leveledUp: after.level > beforeLevel,
      beforeLevel,
      newLevel: after.level,
      levelInfo: after
    };
  }

  // --- Achievements System ---
  loadAchievements() {
    const stored = this._get(STORAGE_KEYS.ACHIEVEMENTS, {});
    const map = {};
    ACHIEVEMENTS_LIST.forEach(ach => {
      map[ach.id] = {
        ...ach,
        unlocked: !!stored[ach.id]?.unlocked,
        unlockedAt: stored[ach.id]?.unlockedAt || null
      };
    });
    return map;
  }

  saveAchievements() {
    this._set(STORAGE_KEYS.ACHIEVEMENTS, this.achievements);
  }

  unlockAchievement(id) {
    if (!this.achievements[id]) return null;
    if (this.achievements[id].unlocked) return null; // already unlocked

    this.achievements[id].unlocked = true;
    this.achievements[id].unlockedAt = new Date().toISOString();
    this.saveAchievements();
    return this.achievements[id];
  }

  // --- Statistics System ---
  loadStats() {
    const defaultStats = {
      totalMatches: 0,
      totalRounds: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0,
      bestStreak: 0,
      survivalHighScore: 0,
      timeAttackHighScore: 0,
      gestureCounts: { stone: 0, paper: 0, scissors: 0 }
    };
    return { ...defaultStats, ...this._get(STORAGE_KEYS.STATS, {}) };
  }

  saveStats() {
    this._set(STORAGE_KEYS.STATS, this.stats);
  }

  recordRound(outcome, playerMove) {
    this.stats.totalRounds++;
    if (playerMove && this.stats.gestureCounts[playerMove] !== undefined) {
      this.stats.gestureCounts[playerMove]++;
    }

    const newlyUnlocked = [];

    if (outcome === 'player') {
      this.stats.wins++;
      this.stats.currentStreak++;
      if (this.stats.currentStreak > this.stats.bestStreak) {
        this.stats.bestStreak = this.stats.currentStreak;
      }

      // Check Achievements
      if (this.stats.wins >= 1) {
        const u = this.unlockAchievement('first_win');
        if (u) newlyUnlocked.push(u);
      }
      if (this.stats.currentStreak >= 3) {
        const u = this.unlockAchievement('streak_3');
        if (u) newlyUnlocked.push(u);
      }
      if (this.stats.wins >= 5) {
        const u = this.unlockAchievement('five_wins');
        if (u) newlyUnlocked.push(u);
      }
    } else if (outcome === 'ai') {
      this.stats.losses++;
      this.stats.currentStreak = 0;
    } else {
      this.stats.draws++;
      // Draws do not break the win streak
    }

    this.saveStats();
    return { newlyUnlocked, currentStreak: this.stats.currentStreak };
  }

  recordMatchEnd(matchData) {
    this.stats.totalMatches++;
    const newlyUnlocked = [];

    // Check match-specific achievements
    if (matchData.mode === 'survival' && matchData.streak > this.stats.survivalHighScore) {
      this.stats.survivalHighScore = matchData.streak;
    }
    if (matchData.mode === 'survival' && matchData.streak >= 4) {
      const u = this.unlockAchievement('iron_hand');
      if (u) newlyUnlocked.push(u);
    }

    if (matchData.mode === 'time_attack' && matchData.playerWins > this.stats.timeAttackHighScore) {
      this.stats.timeAttackHighScore = matchData.playerWins;
    }
    if (matchData.mode === 'time_attack' && matchData.playerWins >= 4) {
      const u = this.unlockAchievement('speed_demon');
      if (u) newlyUnlocked.push(u);
    }

    if (matchData.won) {
      if (matchData.aiWins === 0 && matchData.playerWins >= 2) {
        const u = this.unlockAchievement('perfect_match');
        if (u) newlyUnlocked.push(u);
      }
      if (matchData.wasComeback) {
        const u = this.unlockAchievement('comeback');
        if (u) newlyUnlocked.push(u);
      }
      if (matchData.difficulty === 'hard') {
        const u = this.unlockAchievement('fest_champion');
        if (u) newlyUnlocked.push(u);
      }
      if (matchData.difficulty === 'nightmare') {
        const u = this.unlockAchievement('nightmare_win');
        if (u) newlyUnlocked.push(u);
      }
    }

    this.saveStats();
    this.addHistoryEntry(matchData);

    return newlyUnlocked;
  }

  getWinRate() {
    if (this.stats.totalRounds === 0) return 0;
    return Math.round((this.stats.wins / this.stats.totalRounds) * 100);
  }

  resetStats() {
    this.stats = {
      totalMatches: 0,
      totalRounds: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0,
      bestStreak: 0,
      survivalHighScore: 0,
      timeAttackHighScore: 0,
      gestureCounts: { stone: 0, paper: 0, scissors: 0 }
    };
    this.saveStats();
  }

  // --- Match History ---
  loadHistory() {
    return this._get(STORAGE_KEYS.HISTORY, []);
  }

  addHistoryEntry(entry) {
    this.history.unshift({
      id: Date.now(),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...entry
    });
    // Keep max 20 matches
    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20);
    }
    this._set(STORAGE_KEYS.HISTORY, this.history);
  }

  clearHistory() {
    this.history = [];
    this._set(STORAGE_KEYS.HISTORY, this.history);
  }

  // --- Local Leaderboard ---
  loadLeaderboard() {
    return this._get(STORAGE_KEYS.LEADERBOARD, []);
  }

  addLeaderboardEntry(entry) {
    const record = {
      id: Date.now(),
      nickname: this.sanitizeNickname(entry.nickname || this.profile.nickname),
      mode: entry.mode || 'quick',
      score: entry.score || 0,
      streak: entry.streak || 0,
      winRate: entry.winRate !== undefined ? entry.winRate : this.getWinRate(),
      level: this.getLevelInfo().level,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };

    this.leaderboard.push(record);
    // Sort descending by score/wins
    this.leaderboard.sort((a, b) => b.score - a.score || b.streak - a.streak);
    // Keep top 30 records
    if (this.leaderboard.length > 30) {
      this.leaderboard = this.leaderboard.slice(0, 30);
    }
    this._set(STORAGE_KEYS.LEADERBOARD, this.leaderboard);
    return record;
  }

  clearLeaderboard() {
    this.leaderboard = [];
    this._set(STORAGE_KEYS.LEADERBOARD, this.leaderboard);
  }

  // --- Settings & Exhibition Configuration ---
  loadSettings() {
    const defaultSettings = {
      soundEnabled: true,
      voiceEnabled: true,
      volume: 0.8,
      difficulty: 'hard', // 'easy', 'normal', 'hard', 'nightmare'
      rapidReflexes: false, // faster countdown speed
      showLandmarks: true,
      reducedMotion: false,
      attractTimeout: 45, // seconds of idle before attract mode
      exhibition: {
        collegeName: "College Career & Tech Fest 2026",
        department: "Department of Computer Science & AI",
        eventName: "Annual Tech Carnival Exhibition",
        teamName: "Team CyberArena",
        publicUrl: ""
      }
    };
    return { ...defaultSettings, ...this._get(STORAGE_KEYS.SETTINGS, {}) };
  }

  saveSettings() {
    this._set(STORAGE_KEYS.SETTINGS, this.settings);
  }

  updateSettings(partial) {
    this.settings = { ...this.settings, ...partial };
    if (partial.exhibition) {
      this.settings.exhibition = { ...this.settings.exhibition, ...partial.exhibition };
    }
    this.saveSettings();
  }
}
