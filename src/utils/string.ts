export const camelToKebab = (name: string) => '--' + name.replace(/([A-Z])/g, '-$1').toLowerCase();

export function formatToFileName(text: string): string {
  return text
    .trim()
    .replace(/[^\p{L}\p{N}-]/gu, '-')
    .replace(/-{2,}/g, '-');
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .trim();
}

export function pad(value: number | string, length: number): string {
  return String(value).padStart(length, '0');
}

export function contentEditableHtmlToText(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;

  container.querySelectorAll('div, p').forEach((element) => {
    element.before(document.createTextNode('\n'));
  });

  container.querySelectorAll('br').forEach((br) => {
    if (br.parentNode?.childNodes.length === 1) {
      br.remove();
    } else {
      br.replaceWith(document.createTextNode('\n'));
    }
  });

  const text = container.textContent ?? '';
  return text.startsWith('\n') ? text.slice(1) : text;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// `custom` marks are the consumer's own highlights (TinyDivEditor's `customMarks`), told apart
// from spellcheck marks in the DOM by their attribute; their id is their index in the consumer's list
export type TTextMark = {
  id: string;
  start: number;
  end: number;
  kind?: 'spellcheck' | 'custom';
  // A custom mark drawn as the focused one. Written with a value: renderText compares markup with
  // the DOM's innerHTML, which serializes a bare attribute as `data-active=""`
  isActive?: boolean;
};

const markAttribute = (mark: TTextMark): string =>
  mark.kind === 'custom'
    ? `data-custom-mark="${mark.id}"${mark.isActive ? ' data-active="true"' : ''}`
    : `data-mark-id="${mark.id}"`;

function lineToHtml(line: string, lineStart: number, marks: TTextMark[]): string {
  const lineEnd = lineStart + line.length;
  const lineMarks = marks
    .filter((m) => m.start >= lineStart && m.end <= lineEnd)
    .sort((a, b) => a.start - b.start);

  if (!line) return '<br>';
  if (!lineMarks.length) return escapeHtml(line);

  let html = '';
  let cursor = 0;
  for (const mark of lineMarks) {
    const relStart = mark.start - lineStart;
    const relEnd = mark.end - lineStart;
    html += escapeHtml(line.slice(cursor, relStart));
    // Overlapping marks (a misspelled word inside a custom highlight) can't nest in this flat
    // markup: the one starting first wins
    if (relStart < cursor) continue;
    html += `<mark ${markAttribute(mark)}>${escapeHtml(line.slice(relStart, relEnd))}</mark>`;
    cursor = relEnd;
  }
  html += escapeHtml(line.slice(cursor));
  return html;
}

export function textToContentEditableHtml(text: string, marks: TTextMark[] = []): string {
  let offset = 0;
  return text
    .split('\n')
    .map((line) => {
      const lineHtml = lineToHtml(line, offset, marks);
      offset += line.length + 1;
      return `<div>${lineHtml}</div>`;
    })
    .join('');
}
