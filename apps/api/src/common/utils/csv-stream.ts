import { StreamableFile } from '@nestjs/common';
import { Readable } from 'node:stream';

/**
 * RFC 4180-flavored CSV quoting. Wraps a value in double quotes when it
 * contains the delimiter, a CR/LF, or a literal double quote; doubles up
 * any embedded quotes. Numbers and booleans get coerced to strings; null
 * and undefined become empty fields. Dates are emitted as ISO 8601 so
 * Excel + Sheets both parse them as datetimes without locale guessing.
 */
function quoteField(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else if (typeof value === 'number' || typeof value === 'boolean')
    s = String(value);
  else s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV row from an array of cells (RFC 4180 quoting). */
export function csvRow(cells: ReadonlyArray<unknown>): string {
  return cells.map(quoteField).join(',');
}

/**
 * Build a CSV `StreamableFile` from a header + iterable of row arrays.
 * Streams in chunks so 50k-row exports don't buffer in process memory.
 * Prepends a UTF-8 BOM so Excel opens diacritics (ă/â/î/ș/ț) correctly
 * without manual import-wizard intervention.
 *
 * Pass `filename` to drive the `Content-Disposition` attachment header
 * — the controller layer copies it onto the response.
 */
export function buildCsvStream(
  header: ReadonlyArray<string>,
  rows: AsyncIterable<ReadonlyArray<unknown>> | Iterable<ReadonlyArray<unknown>>,
  filename: string,
): StreamableFile {
  const stream = Readable.from(emit(header, rows));
  return new StreamableFile(stream, {
    type: 'text/csv; charset=utf-8',
    disposition: `attachment; filename="${filename}"`,
  });
}

async function* emit(
  header: ReadonlyArray<string>,
  rows: AsyncIterable<ReadonlyArray<unknown>> | Iterable<ReadonlyArray<unknown>>,
): AsyncGenerator<string> {
  // BOM + header. RFC 4180 says CRLF row terminators; we emit \n which
  // every modern reader (Excel 365, Sheets, LibreOffice) handles fine
  // and produces smaller files.
  yield '﻿' + csvRow(header) + '\n';
  for await (const row of rows as AsyncIterable<ReadonlyArray<unknown>>) {
    yield csvRow(row) + '\n';
  }
}
