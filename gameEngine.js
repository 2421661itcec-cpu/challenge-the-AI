/**
 * Game Rules & Decision Engine — College Career Fest Edition
 * Implements 5 distinct game modes, 4 AI difficulty strategies including
 * multi-order Markov Transition Chains, Human Psychology Heuristics (Win-Stay / Lose-Shift),
 * and the Iocaine Powder Meta-Predictor Algorithm.
 */

export const MOVES = ["stone", "paper", "scissors"];

export const MOVE_DETAILS = {
  stone: { label: "STONE", emoji: "✊", beats: "scissors", losesTo: "paper" },
  paper: { label: "PAPER", emoji: "✋", beats: "stone", losesTo: "scissors" },
  scissors: { label: "SCISSORS", emoji: "✌️", beats: "paper", losesTo: "stone" }
};

export const GAME_MODES = {
  quick: {
    id: "quick",
    name: "Quick Match",
    tagline: "First to 2 Wins",
    description: "Fast-paced exhibition round — first player to reach 2 points wins the match.",
    targetWins: 2,
    maxRounds: 3
  },
  best_of_5: {
    id: "best_of_5",
    name: "Best of 5",
    tagline: "Tournament Classic",
    description: "Standard 5-round championship showdown — first to 3 wins or highest after 5 rounds.",
    targetWins: 3,
    maxRounds: 5
  },
  survival: {
    id: "survival",
    name: "Survival Mode",
    tagline: "Endless Streak",
    description: "Keep throwing until you suffer your first defeat! Draws keep you alive. How high can you streak?",
    targetWins: Infinity,
    maxRounds: Infinity
  },
  time_attack: {
    id: "time_attack",
    name: "Time Attack",
    tagline: "60-Second Blitz",
    description: "Score as many round wins as you can before the 60-second arena timer runs out!",
    durationSeconds: 60,
    targetWins: Infinity,
    maxRounds: Infinity
  },
  practice: {
    id: "practice",
    name: "Practice Mode",
    tagline: "Warm-Up & Calibration",
    description: "Free-play with real-time feedback and skeleton landmarks. Zero competitive pressure.",
    targetWins: Infinity,
    maxRounds: Infinity
  }
};

export class GameEngine {
  constructor() {
    this.mode = "best_of_5";
    this.difficulty = "hard"; // "easy", "normal", "hard", "nightmare"

    // Match Scores
    this.playerScore = 0;
    this.aiScore = 0;
    this.draws = 0;
    this.roundNumber = 0;
    this.matchOver = false;

    // Round State
    this.state = "IDLE";
    this.currentRoundData = null;
    this.roundHistory = [];

    // Player Move Frequency Tracker
    this.playerMoveStats = { stone: 0, paper: 0, scissors: 0 };
    this.lastPlayerMove = null;
    this.lastAiMove = null;
    this.lastRoundWinner = null;

    // --- ADVANCED MARKOV & IOCAINE POWDER PREDICTION MODELS ---
    // 1. First-Order Markov Transition Matrix: P(NextMove | LastPlayerMove)
    // Initialized with Laplace smoothing (each count starts at 1)
    this.markovTransitions = {
      stone: { stone: 1, paper: 1, scissors: 1 },
      paper: { stone: 1, paper: 1, scissors: 1 },
      scissors: { stone: 1, paper: 1, scissors: 1 }
    };

    // 2. Second-Order Joint Transition Matrix: P(NextMove | LastPlayerMove + LastAiMove)
    this.jointTransitions = {};
    MOVES.forEach(p => {
      MOVES.forEach(a => {
        this.jointTransitions[`${p}_${a}`] = { stone: 1, paper: 1, scissors: 1 };
      });
    });

    // 3. Conditional Outcome Psychology: How human shifts after Win, Loss, or Draw
    this.psychologyTransitions = {
      afterWin: { stay: 2, shiftClockwise: 1, shiftCounter: 1 },  // Win-Stay tendency
      afterLoss: { stay: 1, shiftClockwise: 2, shiftCounter: 1 }, // Lose-Shift tendency
      afterDraw: { stay: 1, shiftClockwise: 1, shiftCounter: 1 }
    };

    // 4. Iocaine Powder Meta-Strategy Engine:
    // Tracks accuracy of 3 meta-levels:
    // Meta 0: Directly counter the predicted player move (P0)
    // Meta 1: Player anticipates AI's counter and counters it -> AI counters the counter (P1)
    // Meta 2: Player anticipates AI's meta-counter -> AI counters the double-counter (P2)
    this.metaScores = [0, 0, 0];
    this.lastBasePrediction = null;

    // Time Attack Mode timer
    this.timeAttackRemaining = 60;
    this.timeAttackInterval = null;

    // Comeback detection
    this.maxDeficit = 0;
  }

  setMode(modeKey) {
    if (GAME_MODES[modeKey]) {
      this.mode = modeKey;
    }
  }

  setDifficulty(diff) {
    if (["easy", "normal", "hard", "nightmare"].includes(diff)) {
      this.difficulty = diff;
    }
  }

  getModeConfig() {
    return GAME_MODES[this.mode] || GAME_MODES.best_of_5;
  }

  resetMatch() {
    this.playerScore = 0;
    this.aiScore = 0;
    this.draws = 0;
    this.roundNumber = 0;
    this.matchOver = false;
    this.state = "IDLE";
    this.currentRoundData = null;
    this.roundHistory = [];
    this.playerMoveStats = { stone: 0, paper: 0, scissors: 0 };
    this.lastPlayerMove = null;
    this.lastAiMove = null;
    this.lastRoundWinner = null;
    this.maxDeficit = 0;
    this.lastBasePrediction = null;

    if (this.timeAttackInterval) {
      clearInterval(this.timeAttackInterval);
      this.timeAttackInterval = null;
    }
    this.timeAttackRemaining = 60;
  }

  /**
   * Return the clockwise cyclic next move (Stone -> Paper -> Scissors -> Stone)
   */
  clockwiseNext(move) {
    if (move === "stone") return "paper";
    if (move === "paper") return "scissors";
    return "stone";
  }

  /**
   * Return the counter-clockwise move
   */
  counterClockwise(move) {
    if (move === "stone") return "scissors";
    if (move === "scissors") return "paper";
    return "stone";
  }

  /**
   * Predict human move using N-Gram Sequence History Matching
   * Scans history for the most recent 2-round and 3-round sequences
   */
  predictNgram() {
    const len = this.roundHistory.length;
    if (len < 3) return null;

    // Try 3-gram match first (last 2 moves of player)
    const recent2 = [
      this.roundHistory[len - 2].playerMove,
      this.roundHistory[len - 1].playerMove
    ];

    const matchCounts = { stone: 0, paper: 0, scissors: 0 };
    let matchesFound = 0;

    for (let i = 0; i < len - 2; i++) {
      if (
        this.roundHistory[i].playerMove === recent2[0] &&
        this.roundHistory[i + 1].playerMove === recent2[1]
      ) {
        const nextMove = this.roundHistory[i + 2].playerMove;
        matchCounts[nextMove]++;
        matchesFound++;
      }
    }

    if (matchesFound >= 2) {
      let topMove = "stone";
      for (const m of MOVES) {
        if (matchCounts[m] > matchCounts[topMove]) topMove = m;
      }
      const confidence = Math.round((matchCounts[topMove] / matchesFound) * 100);
      return { predictedMove: topMove, confidence, source: "N-Gram Sequence Match" };
    }

    return null;
  }

  /**
   * Predict human move using 2nd-order & 1st-order Markov Transition Chains
   */
  predictMarkov() {
    if (!this.lastPlayerMove) return null;

    // Check joint transition: P(Move | lastPlayer, lastAi)
    if (this.lastAiMove) {
      const jointKey = `${this.lastPlayerMove}_${this.lastAiMove}`;
      const jointDist = this.jointTransitions[jointKey];
      if (jointDist) {
        const totalJoint = jointDist.stone + jointDist.paper + jointDist.scissors;
        // If there's enough observations beyond initial Laplace prior
        if (totalJoint > 4) {
          let topMove = "stone";
          for (const m of MOVES) {
            if (jointDist[m] > jointDist[topMove]) topMove = m;
          }
          const confidence = Math.round((jointDist[topMove] / totalJoint) * 100);
          return { predictedMove: topMove, confidence, source: "2nd-Order Joint Markov Chain" };
        }
      }
    }

    // Check 1st-order transition: P(Move | lastPlayer)
    const dist = this.markovTransitions[this.lastPlayerMove];
    const total = dist.stone + dist.paper + dist.scissors;
    let topMove = "stone";
    for (const m of MOVES) {
      if (dist[m] > dist[topMove]) topMove = m;
    }
    const confidence = Math.round((dist[topMove] / total) * 100);
    return { predictedMove: topMove, confidence, source: "1st-Order Markov Chain" };
  }

  /**
   * Predict human move based on Human Psychology Heuristics (Win-Stay / Lose-Shift)
   */
  predictPsychology() {
    if (!this.lastPlayerMove || !this.lastRoundWinner) return null;

    // Human WON last round: Statically 60%+ tend to repeat (Win-Stay)
    if (this.lastRoundWinner === "player") {
      const winBias = this.psychologyTransitions.afterWin;
      if (winBias.stay >= winBias.shiftClockwise) {
        return { predictedMove: this.lastPlayerMove, confidence: 75, source: "Win-Stay Psychological Tendency" };
      } else {
        return { predictedMove: this.clockwiseNext(this.lastPlayerMove), confidence: 68, source: "Win-Shift Forward Tendency" };
      }
    }

    // Human LOST last round: Statically tend to shift to the move that would have beaten AI's move
    if (this.lastRoundWinner === "ai" && this.lastAiMove) {
      const shiftToBeatAi = MOVE_DETAILS[this.lastAiMove].losesTo;
      return { predictedMove: shiftToBeatAi, confidence: 78, source: "Lose-Shift Counter Tendency" };
    }

    // Human DREW last round: Tend to cycle to the next gesture
    if (this.lastRoundWinner === "draw") {
      return { predictedMove: this.clockwiseNext(this.lastPlayerMove), confidence: 65, source: "Draw-Shift Cyclic Tendency" };
    }

    return null;
  }

  /**
   * Predict human move based on overall match move frequency bias
   */
  predictFrequency() {
    const total = this.playerMoveStats.stone + this.playerMoveStats.paper + this.playerMoveStats.scissors;
    if (total < 2) return null;

    let favorite = "stone";
    for (const m of MOVES) {
      if (this.playerMoveStats[m] > this.playerMoveStats[favorite]) favorite = m;
    }

    const freqPercent = Math.round((this.playerMoveStats[favorite] / total) * 100);
    if (freqPercent >= 38) {
      return { predictedMove: favorite, confidence: freqPercent, source: `Frequency Bias (${favorite})` };
    }

    return null;
  }

  /**
   * Synthesize Base Prediction from all prediction models
   */
  computeBasePrediction() {
    // Priority order: N-Gram sequence -> Markov chain -> Psychology -> Frequency
    const ngram = this.predictNgram();
    if (ngram && ngram.confidence >= 55) return ngram;

    const markov = this.predictMarkov();
    if (markov && markov.confidence >= 45) return markov;

    const psych = this.predictPsychology();
    if (psych) return psych;

    const freq = this.predictFrequency();
    if (freq) return freq;

    // Fallback: player's most frequent move or random
    const randomMove = MOVES[Math.floor(Math.random() * MOVES.length)];
    return { predictedMove: randomMove, confidence: 34, source: "Baseline Distribution" };
  }

  /**
   * Transparent & Formidable AI Move Decision Engine
   * Easy: Uniform random
   * Normal: Psychological win-stay / lose-shift prediction (60%) + random (40%)
   * Hard: Markov transition matrices + sequence tracking (80% tactical, 20% random)
   * Nightmare: Iocaine Powder Meta-Strategy + N-Gram matching (92% tactical, 8% noise)
   */
  decideAiMove() {
    const randomPick = () => MOVES[Math.floor(Math.random() * MOVES.length)];

    // 1. EASY DIFFICULTY: Purely random
    if (this.difficulty === "easy") {
      return {
        move: randomPick(),
        strategy: "Random selection (Beginner)",
        confidence: 33,
        predictedPlayerMove: null
      };
    }

    // 2. NORMAL DIFFICULTY: Win-Stay, Lose-Shift Heuristic
    if (this.difficulty === "normal") {
      // 40% pure random to stay balanced
      if (Math.random() < 0.40 || !this.lastPlayerMove || !this.lastRoundWinner) {
        return {
          move: randomPick(),
          strategy: "Balanced random baseline",
          confidence: 33,
          predictedPlayerMove: null
        };
      }

      const psych = this.predictPsychology();
      if (psych) {
        const counter = MOVE_DETAILS[psych.predictedMove].losesTo;
        return {
          move: counter,
          strategy: psych.source,
          confidence: psych.confidence,
          predictedPlayerMove: psych.predictedMove
        };
      }

      return {
        move: randomPick(),
        strategy: "Adaptive baseline",
        confidence: 40,
        predictedPlayerMove: null
      };
    }

    // 3. HARD DIFFICULTY: Multi-Order Markov Transition & Frequency Counter
    if (this.difficulty === "hard") {
      // 20% entropy to prevent being totally deterministic
      if (Math.random() < 0.20 || this.roundNumber < 1) {
        return {
          move: randomPick(),
          strategy: "Tactical entropy baseline",
          confidence: 38,
          predictedPlayerMove: null
        };
      }

      const base = this.computeBasePrediction();
      this.lastBasePrediction = base.predictedMove;

      // Play the direct counter to predicted human move
      const counterMove = MOVE_DETAILS[base.predictedMove].losesTo;
      return {
        move: counterMove,
        strategy: `Markov Counter: Expected [${base.predictedMove.toUpperCase()}]`,
        confidence: Math.min(95, base.confidence + 15),
        predictedPlayerMove: base.predictedMove,
        source: base.source
      };
    }

    // 4. NIGHTMARE DIFFICULTY (IOCAINE POWDER META-STRATEGY ENGINE)
    if (this.difficulty === "nightmare") {
      // Very low entropy (8% noise only)
      if (Math.random() < 0.08 || this.roundNumber < 1) {
        return {
          move: randomPick(),
          strategy: "Neural noise injection",
          confidence: 40,
          predictedPlayerMove: null
        };
      }

      // Compute base prediction P0
      const base = this.computeBasePrediction();
      const P0 = base.predictedMove;
      this.lastBasePrediction = P0;

      // Determine the 3 candidate meta-moves:
      // Candidate 0: Direct counter to P0 (expects player to play P0)
      const C0 = MOVE_DETAILS[P0].losesTo;

      // Candidate 1: Counter to the player anticipating C0 (player plays C(C0), so AI counters that)
      const P1 = MOVE_DETAILS[C0].losesTo;
      const C1 = MOVE_DETAILS[P1].losesTo;

      // Candidate 2: Counter to the player anticipating C1 (triple-bluff)
      const P2 = MOVE_DETAILS[C1].losesTo;
      const C2 = MOVE_DETAILS[P2].losesTo;

      // Pick the candidate whose meta-level has the highest historical score against this player
      let bestMeta = 0;
      if (this.metaScores[1] > this.metaScores[bestMeta]) bestMeta = 1;
      if (this.metaScores[2] > this.metaScores[bestMeta]) bestMeta = 2;

      const chosenMove = bestMeta === 0 ? C0 : bestMeta === 1 ? C1 : C2;
      const metaLabels = [
        `Direct Counter (P0: ${P0})`,
        `Bluff Counter: Anticipating Level 1 Counter`,
        `Grandmaster Anti-Bluff: Level 2 Meta`
      ];

      return {
        move: chosenMove,
        strategy: `Iocaine Engine: ${metaLabels[bestMeta]}`,
        confidence: Math.min(98, base.confidence + 20),
        predictedPlayerMove: bestMeta === 0 ? P0 : bestMeta === 1 ? P1 : P2,
        metaLevel: bestMeta,
        source: base.source
      };
    }

    return { move: randomPick(), strategy: "Default fallback", confidence: 33, predictedPlayerMove: null };
  }

  evaluateWinner(pMove, aMove) {
    if (pMove === aMove) return "draw";
    if (MOVE_DETAILS[pMove].beats === aMove) return "player";
    return "ai";
  }

  /**
   * Update internal Markov, psychology, and Iocaine meta-scores after each completed round
   */
  updateLearningModels(playerMove, aiDecision) {
    // 1. Update 1st-order Markov transitions: P(playerMove | lastPlayerMove)
    if (this.lastPlayerMove) {
      this.markovTransitions[this.lastPlayerMove][playerMove]++;
    }

    // 2. Update 2nd-order Joint transitions: P(playerMove | lastPlayerMove, lastAiMove)
    if (this.lastPlayerMove && this.lastAiMove) {
      const jointKey = `${this.lastPlayerMove}_${this.lastAiMove}`;
      if (this.jointTransitions[jointKey]) {
        this.jointTransitions[jointKey][playerMove]++;
      }
    }

    // 3. Update conditional psychology transitions
    if (this.lastRoundWinner === "player" && this.lastPlayerMove) {
      if (playerMove === this.lastPlayerMove) {
        this.psychologyTransitions.afterWin.stay++;
      } else if (playerMove === this.clockwiseNext(this.lastPlayerMove)) {
        this.psychologyTransitions.afterWin.shiftClockwise++;
      } else {
        this.psychologyTransitions.afterWin.shiftCounter++;
      }
    } else if (this.lastRoundWinner === "ai" && this.lastPlayerMove) {
      if (playerMove === this.lastPlayerMove) {
        this.psychologyTransitions.afterLoss.stay++;
      } else if (playerMove === this.clockwiseNext(this.lastPlayerMove)) {
        this.psychologyTransitions.afterLoss.shiftClockwise++;
      } else {
        this.psychologyTransitions.afterLoss.shiftCounter++;
      }
    }

    // 4. Update Iocaine Meta-Predictor Scores
    if (this.lastBasePrediction) {
      const P0 = this.lastBasePrediction;
      const C0 = MOVE_DETAILS[P0].losesTo;
      const P1 = MOVE_DETAILS[C0].losesTo;
      const C1 = MOVE_DETAILS[P1].losesTo;
      const P2 = MOVE_DETAILS[C1].losesTo;
      const C2 = MOVE_DETAILS[P2].losesTo;

      // Score Candidate 0
      const win0 = this.evaluateWinner(playerMove, C0);
      if (win0 === "ai") this.metaScores[0] += 1;
      else if (win0 === "player") this.metaScores[0] -= 1;

      // Score Candidate 1
      const win1 = this.evaluateWinner(playerMove, C1);
      if (win1 === "ai") this.metaScores[1] += 1;
      else if (win1 === "player") this.metaScores[1] -= 1;

      // Score Candidate 2
      const win2 = this.evaluateWinner(playerMove, C2);
      if (win2 === "ai") this.metaScores[2] += 1;
      else if (win2 === "player") this.metaScores[2] -= 1;
    }
  }

  recordRoundResult(playerMove, aiDecision) {
    const aiMove = aiDecision.move;
    const outcome = this.evaluateWinner(playerMove, aiMove);

    this.roundNumber++;

    // Update learning models with the new observation
    this.updateLearningModels(playerMove, aiDecision);

    this.lastPlayerMove = playerMove;
    this.lastAiMove = aiMove;
    this.lastRoundWinner = outcome;

    // Update player move tracking
    if (this.playerMoveStats[playerMove] !== undefined) {
      this.playerMoveStats[playerMove]++;
    }

    if (outcome === "player") {
      this.playerScore++;
    } else if (outcome === "ai") {
      this.aiScore++;
    } else {
      this.draws++;
    }

    // Track deficit for comeback achievement
    const deficit = this.aiScore - this.playerScore;
    if (deficit > this.maxDeficit) {
      this.maxDeficit = deficit;
    }

    const roundData = {
      round: this.roundNumber,
      playerMove,
      aiMove,
      outcome,
      strategy: aiDecision.strategy,
      confidence: aiDecision.confidence || 50,
      predictedPlayerMove: aiDecision.predictedPlayerMove || null,
      playerScore: this.playerScore,
      aiScore: this.aiScore,
      draws: this.draws
    };

    this.roundHistory.push(roundData);
    this.currentRoundData = roundData;

    // Check if match has ended
    this.matchOver = this.checkIfMatchEnded();

    return roundData;
  }

  checkIfMatchEnded() {
    if (this.mode === "practice") {
      return false; // Never auto-ends
    }

    if (this.mode === "survival") {
      // In survival mode, any round loss immediately ends the match!
      return this.lastRoundWinner === "ai";
    }

    if (this.mode === "time_attack") {
      return this.timeAttackRemaining <= 0;
    }

    if (this.mode === "quick") {
      // First to 2 wins, or max 3 rounds
      if (this.playerScore >= 2 || this.aiScore >= 2) return true;
      if (this.roundNumber >= 3) return true;
      return false;
    }

    if (this.mode === "best_of_5") {
      // First to 3 wins, or max 5 rounds
      if (this.playerScore >= 3 || this.aiScore >= 3) return true;
      if (this.roundNumber >= 5) return true;
      return false;
    }

    return false;
  }

  getMatchSummary() {
    const won = this.playerScore > this.aiScore;
    const tied = this.playerScore === this.aiScore;
    const wasComeback = won && this.maxDeficit >= 2;

    // Calculate XP reward
    let xpEarned = 0;
    if (this.mode !== "practice") {
      xpEarned += this.playerScore * 50;
      xpEarned += this.draws * 20;
      xpEarned += this.aiScore * 10;
      if (won) xpEarned += 100;
      if (this.difficulty === "normal") xpEarned += 25;
      if (this.difficulty === "hard") xpEarned += 75;
      if (this.difficulty === "nightmare") xpEarned += 150; // Massive bonus for Nightmare!
      if (wasComeback) xpEarned += 75;
    }

    return {
      mode: this.mode,
      difficulty: this.difficulty,
      playerWins: this.playerScore,
      aiWins: this.aiScore,
      draws: this.draws,
      roundsPlayed: this.roundNumber,
      won,
      tied,
      wasComeback,
      streak: this.mode === "survival" ? this.playerScore : 0,
      xpEarned,
      history: this.roundHistory
    };
  }
}
