/* ============================================================
   Pure game logic for "Card-4" — endless, score-based, lives + jokers.
   No DOM / no globals — unit-testable headless (node --test) and
   loadable in the browser via <script src="logic.js">.

   4 cards per question (1 correct + 3 wrong), shown one at a time. Forward
   swipes are free; each backward swipe drops the question's value by a quarter.
   Endless: a wrong answer costs a life; starting with 2, the 3rd wrong ends the
   game. Three correct in a row earns a life — with NO cap, so lives accumulate
   indefinitely. Difficulty follows an endless 6-question block rhythm that scales
   to infinity. Six one-time jokers unlock at fixed question thresholds (and extra
   jokers are awarded every 4th question past Q20).
   ============================================================ */
(function (root) {
  "use strict";

  const CARDS = 4;
  const LIVES_START = 2;
  const STREAK_FOR_LIFE = 3;          // correct-in-a-row needed to earn a life
  const POINT_UNIT = 20;              // base value = difficulty(1-7) * POINT_UNIT
  const VEGAS_WIN = 2, VEGAS_LOSE = 2; // gamble multipliers (+2× right / −2× wrong)

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

  /* lives/streak transition. Three-in-a-row always earns a life — no cap, so
     lives can accumulate past the starting 2 indefinitely. */
  function resolveAnswer({ lives, streak, correct }) {
    if (correct) {
      let s = streak + 1, l = lives, lifeGained = false;
      if (s >= STREAK_FOR_LIFE) { s = 0; l++; lifeGained = true; }
      return { lives: l, streak: s, gameOver: false, lifeGained };
    }
    if (lives === 0) return { lives: 0, streak: 0, gameOver: true, lifeGained: false };
    return { lives: lives - 1, streak: 0, gameOver: false, lifeGained: false };
  }

  /* Endless difficulty for the n-th question (1-based). A 6-question block rhythm
     that scales to infinity: a "waving/stuttering" pattern within each block, and a
     baseline that creeps up by 1 every 2 blocks (every 12 questions). The result is
     unbounded above; the question picker maps it onto the nearest available 1-7. */
  function targetDifficulty(qNum) {
    const block = Math.floor((qNum - 1) / 6);     // current 6-question block (0-indexed)
    const position = (qNum - 1) % 6;              // position inside the block (0-5)
    const base = 1 + Math.floor(block / 2);       // baseline creeps up every 2 blocks
    const modifiers = [0, 1, 1, 0, 1, 2];         // signature waving/stuttering shape
    return Math.max(1, base + modifiers[position]);
  }

  /* which jokers are unlocked by the time you reach question qNum */
  function unlockedJokers(qNum) { return JOKERS.filter(j => qNum >= j.at).map(j => j.id); }

  const api = {
    CARDS, LIVES_START, STREAK_FOR_LIFE, POINT_UNIT, VEGAS_WIN, VEGAS_LOSE, JOKERS,
    baseValue, backPenalty, shuffle, scoreQuestion, buildBoard, resolveAnswer, targetDifficulty, unlockedJokers,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GameLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
