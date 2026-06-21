/* ============================================================
   Pure game logic for "Is the Answer on Screen?" (v3 — swipe/quota)
   No DOM / no globals — unit-testable headless (node --test) and
   loadable in the browser via <script src="logic.js">.

   Mechanic: 7 answers per question shown one at a time. The player
   navigates forward/back (a quota of 7 moves). Each BACKWARD move
   drops this question's achievable points by BACK_DROP. Committing
   on the correct answer banks the remaining points; a wrong commit
   scores 0. No multiplier.
   ============================================================ */
(function (root) {
  "use strict";

  const ANSWERS = 7;           // options per question
  const MOVE_QUOTA = 7;        // forward/back moves allowed per question
  const SEQUENCE = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, "special"]; // 4E,4M,3H,1S
  // Fixed base points per type — tuned via 100k-run simulation for a normal
  // 0–100 distribution; sum across the 12-question sequence is exactly 100.
  const BASE_POINTS = { 1: 4, 2: 8, 3: 12, special: 16 };
  const BACK_DROP = 3;         // points lost per backward swipe (fixed)

  const round2 = n => Math.round(n * 100) / 100;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- scoring ----------
     Correct commit  -> max(0, base - backwardSwipes*BACK_DROP)
     Wrong commit     -> 0 */
  function scoreQuestion({ base, backwardSwipes, correct }) {
    if (!correct) return 0;
    return Math.max(0, round2(base - backwardSwipes * BACK_DROP));
  }

  /* ---------- text board ----------
     correct at a random index 0..6; the other 6 slots are unique distractors
     (curated near-answers, if any, fold into the distractor pool). */
  function buildTextBoard(q) {
    const seen = new Set([q.correct]);
    const pool = [];
    for (const d of [...(q.nearAnswers || []), ...q.distractors]) {
      if (!seen.has(d)) { seen.add(d); pool.push(d); }
    }
    const picks = shuffle(pool).slice(0, ANSWERS - 1);
    const ci = Math.floor(Math.random() * ANSWERS);
    const board = new Array(ANSWERS);
    board[ci] = q.correct;
    let r = 0;
    for (let i = 0; i < ANSWERS; i++) if (board[i] === undefined) board[i] = picks[r++];
    return { answers: board, correctIndex: ci };
  }

  /* ---------- numeric board ---------- (varied-gap, non-extrapolable)
     correct at a random index 0..6; 6 distractors use mixed step sizes so the
     board is NOT an arithmetic run; 7 unique values; no negatives unless the
     answer itself is negative. */
  function isArithmetic(vals) {
    const s = [...vals].sort((a, b) => a - b);
    const d = s[1] - s[0];
    return s.every((v, i) => i === 0 || v - s[i - 1] === d);
  }

  function buildNumberBoard(correctStr) {
    const correct = parseInt(correctStr, 10);
    const allowNeg = correct < 0;
    const need = ANSWERS - 1; // 6 distractors
    const STEPS = [1, 2, 3, 4];

    function genOffsets() {
      const offsets = new Set();
      let posCursor = 0, negCursor = 0, guard = 0;
      while (offsets.size < need && guard++ < 3000) {
        const goPos = Math.random() < 0.5;
        const step = STEPS[Math.floor(Math.random() * STEPS.length)];
        let off;
        if (goPos) { posCursor += step; off = posCursor; }
        else { negCursor -= step; off = negCursor; }
        if (!allowNeg && correct + off < 0) continue; // no negatives out of domain
        offsets.add(off);
      }
      while (offsets.size < need && guard++ < 6000) { // domain-limited fallback
        posCursor += STEPS[Math.floor(Math.random() * STEPS.length)];
        offsets.add(posCursor);
      }
      return [...offsets];
    }

    // Reject arithmetic runs (a chance alignment of equal steps); retry, then
    // deterministically break the top gap so the board is never extrapolable.
    let offsets = genOffsets(), tries = 0;
    while (isArithmetic([0, ...offsets]) && tries++ < 25) offsets = genOffsets();
    if (isArithmetic([0, ...offsets])) {
      const oldMax = Math.max(...offsets);
      const seen = new Set(offsets);
      let bump = oldMax + 1;
      while (seen.has(bump)) bump++;
      offsets[offsets.indexOf(oldMax)] = bump;
    }

    const offsArr = shuffle(offsets);
    const ci = Math.floor(Math.random() * ANSWERS);
    const board = new Array(ANSWERS);
    board[ci] = String(correct);
    let r = 0;
    for (let i = 0; i < ANSWERS; i++) if (board[i] === undefined) board[i] = String(correct + offsArr[r++]);
    return { answers: board, correctIndex: ci };
  }

  /* ---------- whole-game simulator (tests / analysis) ----------
     plays: array of 12 { correct, backwardSwipes } objects. */
  function simulateGame(plays) {
    let score = 0;
    const points = [];
    for (let i = 0; i < SEQUENCE.length; i++) {
      const base = BASE_POINTS[SEQUENCE[i]];
      const p = scoreQuestion({ base, backwardSwipes: plays[i].backwardSwipes || 0, correct: plays[i].correct });
      points.push(p);
      score = round2(score + p);
    }
    return { score, points };
  }

  function perfectTotal() {
    return SEQUENCE.reduce((s, k) => s + BASE_POINTS[k], 0);
  }

  const api = {
    ANSWERS, MOVE_QUOTA, SEQUENCE, BASE_POINTS, BACK_DROP,
    round2, shuffle, scoreQuestion, buildTextBoard, buildNumberBoard, simulateGame, perfectTotal,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GameLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
