// RFC 4180-style escaping: a field is quoted (with internal quotes doubled) only when it
// contains a comma, a double quote, or a newline -- otherwise left bare, to keep output compact.
function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsvTable(headers: string[], rows: string[][]): string {
  const headerRow = headers.map(escapeCsvField).join(',');
  const dataRows = rows.map((row) => row.map(escapeCsvField).join(','));
  return [headerRow, ...dataRows].join('\n');
}
