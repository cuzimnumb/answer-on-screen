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
  assert.equal(G.LIVES_START, 2);
  let r = G.resolveAnswer({ lives: 2, streak: 0, correct: false }); assert.deepEqual([r.lives, r.gameOver], [1, false]);
  r = G.resolveAnswer({ lives: 1, streak: 0, correct: false }); assert.deepEqual([r.lives, r.gameOver], [0, false]);
  r = G.resolveAnswer({ lives: 0, streak: 0, correct: false }); assert.equal(r.gameOver, true); // 3rd wrong
});

test("unlimited lives: streak of 3 always earns a life, accumulating past 2", () => {
  // lose one, then 3 correct -> regain
  let r = G.resolveAnswer({ lives: 1, streak: 2, correct: true }); // 3rd correct in a row
  assert.deepEqual([r.lives, r.streak, r.lifeGained], [2, 0, true]);
  // already high: still earns a life, no cap
  r = G.resolveAnswer({ lives: 5, streak: 2, correct: true });
  assert.deepEqual([r.lives, r.streak, r.lifeGained], [6, 0, true]);
  // partial streak just increments
  r = G.resolveAnswer({ lives: 2, streak: 0, correct: true });
  assert.deepEqual([r.lives, r.streak], [2, 1]);
});

test("endless difficulty: 6-block rhythm, baseline creeps every 12 questions, unbounded", () => {
  const td = G.targetDifficulty;
  assert.deepEqual([1,2,3,4,5,6].map(td),      [1,2,2,1,2,3]); // block 0, base 1
  assert.deepEqual([7,8,9,10,11,12].map(td),   [1,2,2,1,2,3]); // block 1, base 1
  assert.deepEqual([13,14,15,16,17,18].map(td),[2,3,3,2,3,4]); // block 2, base 2
  assert.deepEqual([25,26,27,28,29,30].map(td),[3,4,4,3,4,5]); // block 4, base 3
  for (let n = 1; n <= 600; n++) assert.ok(td(n) >= 1, "never below 1");
  assert.ok(td(120) > td(6), "later questions scale higher with no ceiling");
});

test("jokers unlock one-by-one at their thresholds (6 jokers incl. Airbag, no hindsight)", () => {
  assert.deepEqual(G.unlockedJokers(1), []);
  assert.deepEqual(G.unlockedJokers(3), ["obol"]);
  assert.deepEqual(G.unlockedJokers(9), ["obol","easy","lucky2"]);
  assert.deepEqual(G.unlockedJokers(99), ["obol","easy","lucky2","host","airbag","vegas"]);
  assert.ok(!G.JOKERS.some(j => j.id === "hindsight"));
  assert.equal(G.VEGAS_LOSE, 2);
});
