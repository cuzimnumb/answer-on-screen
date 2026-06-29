/* ============================================================
   Pure game logic for "Card-4" — endless, score-based, lives + jokers.
   No DOM / no globals — unit-testable headless (node --test) and
   loadable in the browser via <script src="logic.js">.

   4 cards per question (1 correct + 3 wrong), shown one at a time. Forward
   swipes are free; each backward swipe drops the question's value by a quarter.
   Endless: a wrong answer costs a life; starting with 2, the 3rd wrong ends the
   game. Three correct in a row refills a life (max 2). Difficulty ramps with the
   question number. Six one-time jokers unlock at fixed question thresholds.
   ============================================================ */
(function (root) {
  "use strict";

  const CARDS = 4;
  const LIVES_START = 2, LIVES_MAX = 2;
  const STREAK_FOR_LIFE = 3;          // correct-in-a-row needed to refill a life
  const POINT_UNIT = 20;              // base value = difficulty(1-7) * POINT_UNIT
  const VEGAS_WIN = 2, VEGAS_LOSE = 3; // gamble multipliers

  const JOKERS = [
    { id: "obol",      name: "The Obol",       at: 3,  blurb: "Pass the question" },
    { id: "hindsight", name: "Hindsight",      at: 6,  blurb: "See all 4 at once, no swipe penalty" },
    { id: "undt",      name: "Uno, Dos, Tres", at: 9,  blurb: "Swap in a different question" },
    { id: "lucky2",    name: "Lucky 2",        at: 12, blurb: "Mark two cards; win if either is right" },
    { id: "host",      name: "Talk-Show Host", at: 16, blurb: "Pick the next question's category" },
    { id: "vegas",     name: "Wow, Vegas!",    at: 20, blurb: "Gamble: 2× points, or lose 3×" },
  ];

  const baseValue = d => d * POINT_UNIT;
  const backPenalty = d => baseValue(d) / 4;   // 25% quarter-drop per back-swipe

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* correct -> max(0, base - backwardSwipes*base/4); wrong -> 0 */
  function scoreQuestion({ base, backwardSwipes, correct }) {
    if (!correct) return 0;
    return Math.max(0, base - backwardSwipes * (base / 4));
  }

  /* 4-card board: correct at a random index, 3 unique distractors elsewhere */
  function buildBoard(q) {
    const wrongs = shuffle((q.wrongs || []).filter(w => w && w !== q.correct)).slice(0, CARDS - 1);
    const ci = Math.floor(Math.random() * CARDS);
    const board = new Array(CARDS);
    board[ci] = q.correct;
    let r = 0;
    for (let i = 0; i < CARDS; i++) if (board[i] === undefined) board[i] = wrongs[r++];
    return { answers: board, correctIndex: ci };
  }

  /* lives/streak transition. Returns the new lives & streak plus flags. */
  function resolveAnswer({ lives, streak, correct, livesMax = LIVES_MAX }) {
    if (correct) {
      let s = streak + 1, l = lives, lifeGained = false;
      if (s >= STREAK_FOR_LIFE) { s = 0; if (l < livesMax) { l++; lifeGained = true; } }
      return { lives: l, streak: s, gameOver: false, lifeGained };
    }
    if (lives === 0) return { lives: 0, streak: 0, gameOver: true, lifeGained: false };
    return { lives: lives - 1, streak: 0, gameOver: false, lifeGained: false };
  }

  /* difficulty (1-7) for the n-th question (1-based): rises ~1 level / 4 questions,
     plateaus near 6, with ±1 jitter so the ramp feels organic, not robotic. */
  function targetDifficulty(qNum, rng = Math.random) {
    const mean = Math.min(6, 1 + (qNum - 1) * 0.25);
    const jitter = Math.round((rng() * 2 - 1) * 1.2);
    return Math.max(1, Math.min(7, Math.round(mean) + jitter));
  }

  /* which jokers are unlocked by the time you reach question qNum */
  function unlockedJokers(qNum) { return JOKERS.filter(j => qNum >= j.at).map(j => j.id); }

  const api = {
    CARDS, LIVES_START, LIVES_MAX, STREAK_FOR_LIFE, POINT_UNIT, VEGAS_WIN, VEGAS_LOSE, JOKERS,
    baseValue, backPenalty, shuffle, scoreQuestion, buildBoard, resolveAnswer, targetDifficulty, unlockedJokers,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GameLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
