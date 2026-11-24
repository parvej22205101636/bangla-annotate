import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cohenKappa, describeKappa, majorityLabel } from '../src/utils/agreement.js';

test('perfect agreement gives kappa 1', () => {
  const r = cohenKappa([['real', 'real'], ['fake', 'fake'], ['real', 'real']]);
  assert.equal(r.observed, 1);
  assert.equal(r.kappa, 1);
});

test('kappa matches a worked textbook example', () => {
  // 50 items: A says yes 25 times, B says yes 30 times, they agree on 20 yes + 15 no.
  const pairs = [
    ...Array(20).fill(['yes', 'yes']),
    ...Array(5).fill(['yes', 'no']),
    ...Array(10).fill(['no', 'yes']),
    ...Array(15).fill(['no', 'no']),
  ];
  const r = cohenKappa(pairs);
  assert.equal(r.observed, 0.7);
  assert.ok(Math.abs(r.kappa - 0.4) < 1e-9);
  assert.equal(describeKappa(r.kappa), 'fair');
});

test('kappa is undefined when both used a single label', () => {
  assert.equal(cohenKappa([['real', 'real'], ['real', 'real']]).kappa, null);
  assert.equal(cohenKappa([]).kappa, null);
});

test('majority label handles ties', () => {
  assert.equal(majorityLabel(['fake', 'real', 'fake']), 'fake');
  assert.equal(majorityLabel(['fake', 'real']), null);
  assert.equal(majorityLabel([]), null);
});
