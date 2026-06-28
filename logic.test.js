"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./logic.js");

test("structure: 10 questions, 6 cards, exact sequence", () => {
  assert.equal(G.SEQUENCE.length, 10);
  assert.deepEqual(G.SEQUENCE, [2, 1, 4, 5, 6, 7, 4, 6, 3, 5]);
  assert.equal(G.ANSWERS, 6);
});

test("a flawless game totals exactly 1000", () => {
  assert.equal(G.perfectTotal(), 1000);
  const plays = G.SEQUENCE.map(() => ({ correct: true, backwardSwipes: 0 }));
  assert.equal(G.simulateGame(plays), 1000);
});

test("tier base values: easy 40 / medium 100 / hard 160", () => {
  assert.equal(G.baseValue(1), 40);
  assert.equal(G.baseValue(2), 40);
  assert.equal(G.baseValue(3), 40);
  assert.equal(G.baseValue(4), 100);
  assert.equal(G.baseValue(5), 100);
  assert.equal(G.baseValue(6), 160);
  assert.equal(G.baseValue(7), 160);
});

test("mine slots are the three Easy questions", () => {
  assert.deepEqual(G.MINE_SLOTS, [0, 1, 8]);
  for (const s of G.MINE_SLOTS) assert.ok(G.SEQUENCE[s] <= 3, `slot ${s} should be easy`);
});

test("scoreQuestion: quarter-drop per back-swipe, floored at 0", () => {
  // easy
  assert.deepEqual([0, 1, 2, 3, 4].map(b => G.scoreQuestion({ base: 40, backwardSwipes: b, correct: true })), [40, 30, 20, 10, 0]);
  // medium
  assert.deepEqual([0, 1, 2, 3, 4].map(b => G.scoreQuestion({ base: 100, backwardSwipes: b, correct: true })), [100, 75, 50, 25, 0]);
  // hard
  assert.deepEqual([0, 1, 2, 3, 4].map(b => G.scoreQuestion({ base: 160, backwardSwipes: b, correct: true })), [160, 120, 80, 40, 0]);
  // never negative
  assert.equal(G.scoreQuestion({ base: 40, backwardSwipes: 9, correct: true }), 0);
  // a wrong commit always scores 0
  assert.equal(G.scoreQuestion({ base: 160, backwardSwipes: 0, correct: false }), 0);
});

const Q = { correct: "RIGHT", distractors: ["a", "b", "c", "d", "e", "f"] };

test("normal board: 6 unique cards, correct present once, no mine", () => {
  for (let t = 0; t < 2000; t++) {
    const { answers, correctIndex, mineIndex } = G.buildBoard(Q, false);
    assert.equal(answers.length, 6);
    assert.equal(mineIndex, -1);
    assert.equal(answers[correctIndex], "RIGHT");
    assert.equal(answers.filter(a => a === "RIGHT").length, 1);
    assert.ok(!answers.includes(G.MINE));
    assert.equal(new Set(answers).size, 6);
  }
});

test("mine board: Mine sits exactly one card after the correct answer", () => {
  for (let t = 0; t < 2000; t++) {
    const { answers, correctIndex, mineIndex } = G.buildBoard(Q, true);
    assert.equal(answers.length, 6);
    assert.ok(correctIndex >= 0 && correctIndex <= 4, "correct leaves room for the mine after it");
    assert.equal(mineIndex, correctIndex + 1);
    assert.equal(answers[mineIndex], G.MINE);
    assert.equal(answers[correctIndex], "RIGHT");
    assert.equal(answers.filter(a => a === "RIGHT").length, 1);
    assert.equal(answers.filter(a => a === G.MINE).length, 1);
  }
});

test("hitting the mine subtracts a flat 40 and can drive the total negative", () => {
  const plays = G.SEQUENCE.map(() => ({ correct: false, backwardSwipes: 0 })); // all wrong -> 0
  plays[0] = { mineHit: true }; // mine on the first question
  assert.equal(G.simulateGame(plays), -40);
});

test("a near-perfect run minus one mine = 1000 - that question - 40", () => {
  const plays = G.SEQUENCE.map(() => ({ correct: true, backwardSwipes: 0 }));
  plays[8] = { mineHit: true }; // slot 8 is an easy (40) question
  // lose its 40 of value AND a 40 penalty
  assert.equal(G.simulateGame(plays), 1000 - 40 - 40);
});
