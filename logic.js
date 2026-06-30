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
  const VEGAS_WIN = 2, VEGAS_LOSE = 2; // gamble multipliers (+2× right / −2× wrong)
  const LIVES_HARD_MAX = 3;            // Airbag can push beyond the normal cap of 2

  const JOKERS = [
    { id: "obol",   name: "The Obol",       at: 3,  blurb: "Pass this question — no points, no life lost." },
    { id: "easy",   name: "Easy Does It",   at: 6,  blurb: "Swap this question for an easy one." },
    { id: "lucky2", name: "Lucky 2",        at: 9,  blurb: "A second guess: if your first lock is wrong, pick again from the rest — no life lost on the first miss." },
    { id: "host",   name: "Talk-Show Host", at: 12, blurb: "Swap this question to a category you choose." },
    { id: "airbag", name: "Airbag",         at: 16, blurb: "Get this question right and bank a bonus life." },
    { id: "vegas",  name: "Wow, Vegas!",    at: 20, blurb: "Gamble the next answer: +2× points if right, −2× if wrong (and still a life)." },
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
    if (qNum <= 3) return 1;            // ease in: 1, 1, 1
    if (qNum === 4) return 2;           // then a 2
    const mean = Math.min(6, 2 + (qNum - 4) * 0.2);              // slow climb, plateau ~6
    return Math.max(1, Math.min(7, Math.round(mean + (rng() * 2 - 1) * 1.1))); // jitter keeps it mixed & endless
  }

  /* which jokers are unlocked by the time you reach question qNum */
  function unlockedJokers(qNum) { return JOKERS.filter(j => qNum >= j.at).map(j => j.id); }

  const api = {
    CARDS, LIVES_START, LIVES_MAX, LIVES_HARD_MAX, STREAK_FOR_LIFE, POINT_UNIT, VEGAS_WIN, VEGAS_LOSE, JOKERS,
    baseValue, backPenalty, shuffle, scoreQuestion, buildBoard, resolveAnswer, targetDifficulty, unlockedJokers,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GameLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
