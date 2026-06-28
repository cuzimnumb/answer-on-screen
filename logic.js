/* ============================================================
   Pure game logic for "Is the Answer on Screen?" (v4 — score economy + Speed-Trap Mine)
   No DOM / no globals — unit-testable headless (node --test) and
   loadable in the browser via <script src="logic.js">.

   Mechanic: 10 questions, 6 answer cards each (1 correct + 5 wrong, shown one at a
   time). Forward swipes are FREE; each backward swipe drops the question's value by
   a quarter (4 back-swipes = 0). No move limit. Tiered values: easy 40, medium 100,
   hard 160 — a flawless game totals 1000. One Easy question hides a Speed-Trap Mine
   one card after the correct answer; revealing it ends the question at 0 and removes
   a flat 40 from the running total (which may go negative).
   ============================================================ */
(function (root) {
  "use strict";

  const ANSWERS = 6;                                  // cards per question
  const SEQUENCE = [2, 1, 4, 5, 6, 7, 4, 6, 3, 5];    // difficulty (1-7) served per slot; 10 questions
  const TIER_BASE = { easy: 40, medium: 100, hard: 160 };
  const MINE_PENALTY = 40;                            // flat points removed from the TOTAL on a mine hit
  const MINE = "__MINE__";                            // sentinel card value
  const MINE_SLOTS = [0, 1, 8];                       // the three Easy slots eligible to be mined

  const tierOf = d => d <= 3 ? "easy" : d <= 5 ? "medium" : "hard";
  const baseValue = d => TIER_BASE[tierOf(d)];
  const backPenalty = d => baseValue(d) / 4;          // 25% quarter-drop per back-swipe

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- scoring ----------
     correct commit -> max(0, base - backwardSwipes * base/4) ; wrong commit -> 0 */
  function scoreQuestion({ base, backwardSwipes, correct }) {
    if (!correct) return 0;
    return Math.max(0, base - backwardSwipes * (base / 4));
  }

  /* ---------- board ----------
     6 cards: 1 correct + 5 unique distractors, correct at a random index.
     If isMine: a Mine card is forced exactly one index AFTER the correct card,
     so the correct answer sits at 0..ANSWERS-2 and the mine at correctIndex+1. */
  function buildBoard(q, isMine) {
    const seen = new Set([q.correct]);
    const wrongs = [];
    for (const d of (q.distractors || [])) { if (!seen.has(d)) { seen.add(d); wrongs.push(d); } }
    const pool = shuffle(wrongs);
    const board = new Array(ANSWERS);
    let ci, mineIndex = -1;
    if (isMine) {
      ci = Math.floor(Math.random() * (ANSWERS - 1));  // 0..4 so ci+1 is valid
      board[ci] = q.correct;
      mineIndex = ci + 1;
      board[mineIndex] = MINE;
    } else {
      ci = Math.floor(Math.random() * ANSWERS);
      board[ci] = q.correct;
    }
    let r = 0;
    for (let i = 0; i < ANSWERS; i++) if (board[i] === undefined) board[i] = pool[r++];
    return { answers: board, correctIndex: ci, mineIndex };
  }

  function perfectTotal() { return SEQUENCE.reduce((s, d) => s + baseValue(d), 0); } // 1000

  /* sim helper: plays = [{correct, backwardSwipes, mineHit}] aligned to SEQUENCE */
  function simulateGame(plays) {
    let score = 0;
    for (let i = 0; i < SEQUENCE.length; i++) {
      const p = plays[i] || {};
      if (p.mineHit) { score -= MINE_PENALTY; continue; }
      score += scoreQuestion({ base: baseValue(SEQUENCE[i]), backwardSwipes: p.backwardSwipes || 0, correct: p.correct });
    }
    return score;
  }

  const api = {
    ANSWERS, SEQUENCE, TIER_BASE, MINE, MINE_PENALTY, MINE_SLOTS,
    tierOf, baseValue, backPenalty, shuffle, scoreQuestion, buildBoard, perfectTotal, simulateGame,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GameLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
