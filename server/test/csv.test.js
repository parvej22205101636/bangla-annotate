import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseItemsCsv } from '../src/utils/csv.js';

test('reads the "text" column and keeps ids', () => {
  const rows = parseItemsCsv('id,text\n1,প্রথম খবর\n2,দ্বিতীয় খবর\n');
  assert.deepEqual(rows, [
    { text: 'প্রথম খবর', externalId: '1' },
    { text: 'দ্বিতীয় খবর', externalId: '2' },
  ]);
});

test('uses the chosen column and skips empty text', () => {
  const rows = parseItemsCsv('headline,source\nখবর এক,x\n,y\n', 'headline');
  assert.deepEqual(rows, [{ text: 'খবর এক', externalId: '' }]);
});

test('handles a UTF-8 BOM from Excel', () => {
  const rows = parseItemsCsv('﻿text\nখবর\n');
  assert.equal(rows[0].text, 'খবর');
});

test('rejects an empty file', () => {
  assert.throws(() => parseItemsCsv('text\n'), /empty/);
});
