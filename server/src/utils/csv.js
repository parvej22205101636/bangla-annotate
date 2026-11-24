import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export const MAX_ROWS = 5000;

/**
 * Reads uploaded CSV text into items.
 * The text column is taken from `textColumn`, else a column named "text", else the first column.
 * An optional "id" column is kept as externalId.
 */
export function parseItemsCsv(content, textColumn) {
  const rows = parse(content, { columns: true, skip_empty_lines: true, bom: true, trim: true, relax_column_count: true });
  if (rows.length === 0) throw new Error('The CSV file is empty');
  if (rows.length > MAX_ROWS) throw new Error(`Please upload at most ${MAX_ROWS} rows at a time`);

  const columns = Object.keys(rows[0]);
  const column = textColumn && columns.includes(textColumn)
    ? textColumn
    : columns.find((c) => c.toLowerCase() === 'text') || columns[0];

  return rows
    .map((row) => ({ text: String(row[column] || '').trim(), externalId: String(row.id || row.ID || '').trim() }))
    .filter((row) => row.text.length > 0);
}

export function toCsv(records) {
  return stringify(records, { header: true, bom: true });
}
