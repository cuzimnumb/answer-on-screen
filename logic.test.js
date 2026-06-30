"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./logic.js");

test("4 cards, base value = difficulty * 20", () => {
  assert.equal(G.CARDS, 4);
  assert.deepEqual([1,2,3,4,5,6,7].map(G.baseValue), [20,40,60,80,100,120,140]);
});

test("scoreQuestion: quarter-drop per back-swipe; wrong = 0", () => {
  assert.deepEqual([0,1,2,3].map(b => G.scoreQuestion({ base: 80, backwardSwipes: b, correct: true })), [80,60,40,20]);
  assert.equal(G.scoreQuestion({ base: 80, backwardSwipes: 9, correct: true }), 0); // floored
  assert.equal(G.scoreQuestion({ base: 140, backwardSwipes: 0, correct: false }), 0);
});

test("board: 4 cards, correct present once, 3 unique distractors", () => {
  const q = { correct: "RIGHT", wrongs: ["a","b","c"] };
  for (let t = 0; t < 1000; t++) {
    const { answers, correctIndex } = G.buildBoard(q);
    assert.equal(answers.length, 4);
    assert.equal(answers[correctIndex], "RIGHT");
    assert.equal(answers.filter(a => a === "RIGHT").length, 1);
    assert.equal(new Set(answers).size, 4);
  }
});

test("lives: start 2, three wrongs ends the game", () => {
  let s = { lives: G.LIVES_START, streak: 0 };
  assert.equal(G.LIVES_START, 2);
  let r = G.resolveAnswer({ ...s, correct: false }); assert.deepEqual([r.lives, r.gameOver], [1, false]);
  r = G.resolveAnswer({ lives: r.lives, streak: r.streak, correct: false }); assert.deepEqual([r.lives, r.gameOver], [0, false]);
  r = G.resolveAnswer({ lives: r.lives, streak: r.streak, correct: false }); assert.equal(r.gameOver, true); // 3rd wrong
});

test("streak of 3 refills a lost life, capped at max", () => {
  // lose one, then 3 correct -> regain
  let r = G.resolveAnswer({ lives: 1, streak: 2, correct: true }); // 3rd correct in a row
  assert.deepEqual([r.lives, r.streak, r.lifeGained], [2, 0, true]);
  // already at max: streak resets but no life beyond 2
  r = G.resolveAnswer({ lives: 2, streak: 2, correct: true });
  assert.deepEqual([r.lives, r.streak, r.lifeGained], [2, 0, false]);
  // partial streak just increments
  r = G.resolveAnswer({ lives: 2, streak: 0, correct: true });
  assert.deepEqual([r.lives, r.streak], [2, 1]);
});

test("ease-in then ramp: first questions are 1,1,1,2 and it climbs, staying 1-7", () => {
  assert.equal(G.targetDifficulty(1), 1);
  assert.equal(G.targetDifficulty(2), 1);
  assert.equal(G.targetDifficulty(3), 1);
  assert.equal(G.targetDifficulty(4), 2);
  const lo = [], hi = [];
  for (let t = 0; t < 4000; t++) {
    const a = G.targetDifficulty(6), b = G.targetDifficulty(30);
    assert.ok(a >= 1 && a <= 7 && b >= 1 && b <= 7);
    lo.push(a); hi.push(b);
  }
  const mean = xs => xs.reduce((s,x)=>s+x,0)/xs.length;
  assert.ok(mean(hi) > mean(lo) + 2, "late questions are clearly harder than early ones");
});

test("jokers unlock one-by-one at their thresholds (6 jokers incl. Airbag, no hindsight)", () => {
  assert.deepEqual(G.unlockedJokers(1), []);
  assert.deepEqual(G.unlockedJokers(3), ["obol"]);
  assert.deepEqual(G.unlockedJokers(9), ["obol","easy","lucky2"]);
  assert.deepEqual(G.unlockedJokers(99), ["obol","easy","lucky2","host","airbag","vegas"]);
  assert.ok(!G.JOKERS.some(j => j.id === "hindsight"));
  assert.equal(G.VEGAS_LOSE, 2);
  assert.equal(G.LIVES_HARD_MAX, 3);
});
