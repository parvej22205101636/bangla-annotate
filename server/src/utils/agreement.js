// Inter-annotator agreement helpers.

/**
 * Cohen's kappa for two annotators.
 * @param {Array<[string, string]>} pairs label given by annotator A and B to the same item
 * @returns {{ n: number, observed: number, kappa: number|null }}
 */
export function cohenKappa(pairs) {
  const n = pairs.length;
  if (n === 0) return { n: 0, observed: 0, kappa: null };

  let agree = 0;
  const countA = new Map();
  const countB = new Map();
  for (const [a, b] of pairs) {
    if (a === b) agree += 1;
    countA.set(a, (countA.get(a) || 0) + 1);
    countB.set(b, (countB.get(b) || 0) + 1);
  }

  const observed = agree / n;
  let expected = 0;
  for (const [label, ca] of countA) expected += (ca / n) * ((countB.get(label) || 0) / n);

  // Both annotators used one single label for everything: kappa is undefined.
  if (expected === 1) return { n, observed, kappa: null };
  return { n, observed, kappa: (observed - expected) / (1 - expected) };
}

/** Landis & Koch (1977) wording for a kappa value. */
export function describeKappa(kappa) {
  if (kappa === null) return 'not enough data';
  if (kappa < 0) return 'poor';
  if (kappa <= 0.2) return 'slight';
  if (kappa <= 0.4) return 'fair';
  if (kappa <= 0.6) return 'moderate';
  if (kappa <= 0.8) return 'substantial';
  return 'almost perfect';
}

/** Most frequent label, or null when there is a tie or no label. */
export function majorityLabel(labels) {
  const counts = new Map();
  for (const l of labels) counts.set(l, (counts.get(l) || 0) + 1);
  let best = null;
  let bestCount = 0;
  let tie = false;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
      tie = false;
    } else if (count === bestCount) {
      tie = true;
    }
  }
  return tie ? null : best;
}
