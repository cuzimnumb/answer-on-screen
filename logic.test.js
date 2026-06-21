"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("./logic.js");

test("perfect game scores exactly 100", () => {
  const plays = G.SEQUENCE.map(() => ({ correct: true, backwardSwipes: 0 }));
  assert.equal(G.simulateGame(plays).score, 100);
  assert.equal(G.perfectTotal(), 100);
});

test("base points sum to 100 over the 12-question sequence", () => {
  const sum = G.SEQUENCE.reduce((s, k) => s + G.BASE_POINTS[k], 0);
  assert.equal(sum, 100);
  assert.deepEqual(
    [G.BASE_POINTS[1], G.BASE_POINTS[2], G.BASE_POINTS[3], G.BASE_POINTS.special],
    [4, 8, 12, 16]
  );
});

test("scoreQuestion: correct pays base minus backward drops, floored at 0", () => {
  assert.equal(G.scoreQuestion({ base: 12, backwardSwipes: 0, correct: true }), 12);
  assert.equal(G.scoreQuestion({ base: 12, backwardSwipes: 1, correct: true }), 12 - G.BACK_DROP);
  assert.equal(G.scoreQuestion({ base: 12, backwardSwipes: 3, correct: true }), 12 - 3 * G.BACK_DROP);
  // floor: 4 - 2*3 = -2 -> 0
  assert.equal(G.scoreQuestion({ base: 4, backwardSwipes: 2, correct: true }), 0);
  // never below zero, large back count
  assert.equal(G.scoreQuestion({ base: 16, backwardSwipes: 99, correct: true }), 0);
});

test("scoreQuestion: a wrong commit always scores 0", () => {
  assert.equal(G.scoreQuestion({ base: 16, backwardSwipes: 0, correct: false }), 0);
  assert.equal(G.scoreQuestion({ base: 4, backwardSwipes: 0, correct: false }), 0);
});

test("backward swipes strictly reduce a correct question until the floor", () => {
  const base = 12;
  let prev = Infinity;
  for (let b = 0; b <= 4; b++) {
    const pts = G.scoreQuestion({ base, backwardSwipes: b, correct: true });
    if (pts > 0) assert.ok(pts < prev, `b=${b} should drop`);
    prev = pts;
  }
});

function isArithmetic(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const d = s[1] - s[0];
  return s.every((v, i) => i === 0 || v - s[i - 1] === d);
}

test("numeric board: 7 unique values, correct at index 0-6, not arithmetic, no negatives", () => {
  for (let t = 0; t < 3000; t++) {
    const correct = [2, 3, 6, 11, 206, 1440, 1912][t % 7];
    const { answers, correctIndex } = G.buildNumberBoard(String(correct));
    assert.equal(answers.length, 7);
    assert.ok(correctIndex >= 0 && correctIndex <= 6);
    assert.equal(answers[correctIndex], String(correct));
    const nums = answers.map(Number);
    assert.equal(new Set(answers).size, 7, "values unique");
    assert.ok(nums.every(n => n >= 0), "no negatives for non-negative answer");
    assert.ok(!isArithmetic(nums), `board should not be an arithmetic run: ${answers}`);
  }
});

test("numeric board allows negatives only when the answer is negative", () => {
  let sawNeg = false;
  for (let t = 0; t < 500; t++) {
    const { answers } = G.buildNumberBoard("-5");
    if (answers.map(Number).some(n => n < 0)) sawNeg = true;
    assert.equal(new Set(answers).size, 7);
  }
  assert.ok(sawNeg, "negative-answer boards may contain negatives");
});

test("text board: 7 unique answers, correct present once at index 0-6", () => {
  const q = {
    correct: "Mars",
    nearAnswers: ["Venus", "Mercury"],
    distractors: ["Jupiter", "Saturn", "Neptune", "Uranus", "Pluto", "Earth", "Ceres", "Titan"],
  };
  for (let t = 0; t < 2000; t++) {
    const { answers, correctIndex } = G.buildTextBoard(q);
    assert.equal(answers.length, 7);
    assert.equal(answers[correctIndex], "Mars");
    assert.equal(answers.filter(a => a === "Mars").length, 1);
    assert.equal(new Set(answers).size, 7);
  }
});

test("a one-near-style imperfect run scores below 100 (sanity for sim parity)", () => {
  // one question committed wrong, rest perfect
  const plays = G.SEQUENCE.map(() => ({ correct: true, backwardSwipes: 0 }));
  plays[5].correct = false;
  const s = G.simulateGame(plays).score;
  assert.ok(s < 100 && s === 100 - G.BASE_POINTS[G.SEQUENCE[5]]);
});
