import { PROJECT_TEMPO_DEFAULTS, type TProjectTempo } from '@bridge/definitions/projectEntry';
import { TLanguage } from '@src/types';

// The limits a subtitle standard sets. `enabled` and `highlightOverlaps` are the user's own choices,
// so a standard never touches them.
type TTempoStandard = Pick<
  TProjectTempo,
  | 'maxLinesPerEntry'
  | 'maxCharsPerLine'
  | 'maxCharsPerSecond'
  | 'minDurationMs'
  | 'minIntervalFrames'
>;

const STANDARD_FIELDS: readonly (keyof TTempoStandard)[] = [
  'maxLinesPerEntry',
  'maxCharsPerLine',
  'maxCharsPerSecond',
  'minDurationMs',
  'minIntervalFrames',
];

// What every Netflix Timed Text Style Guide shares: 2 lines of up to 42 characters, 5/6 of a second
// on screen, 2 frames between entries. Only the reading speed (adult content) differs per language.
const NETFLIX_BASE: Omit<TTempoStandard, 'maxCharsPerSecond'> = {
  maxLinesPerEntry: 2,
  maxCharsPerLine: 42,
  minDurationMs: 833,
  minIntervalFrames: 2,
};

/** Netflix's standard per supported language. Belarusian has no guide of its own: it follows the
 * Russian one. */
const TEMPO_TEMPLATES: Record<TLanguage, TTempoStandard> = {
  [TLanguage.English]: { ...NETFLIX_BASE, maxCharsPerSecond: 20 },
  [TLanguage.German]: { ...NETFLIX_BASE, maxCharsPerSecond: 17 },
  [TLanguage.Spanish]: { ...NETFLIX_BASE, maxCharsPerSecond: 17 },
  [TLanguage.Italian]: { ...NETFLIX_BASE, maxCharsPerSecond: 17 },
  [TLanguage.Polish]: { ...NETFLIX_BASE, maxCharsPerSecond: 15 },
  [TLanguage.Ukrainian]: { ...NETFLIX_BASE, maxCharsPerSecond: 17 },
  [TLanguage.Belarusian]: { ...NETFLIX_BASE, maxCharsPerSecond: 17 },
};

/** The language's standard; the general defaults' limits for a code that isn't a known language */
export function getTempoTemplate(lang: string): TTempoStandard {
  const template = TEMPO_TEMPLATES[lang as TLanguage];
  if (template) return template;
  return Object.fromEntries(
    STANDARD_FIELDS.map((field) => [field, PROJECT_TEMPO_DEFAULTS[field]])
  ) as TTempoStandard;
}

/** A whole tempo block for a new (or upgraded) project in this language: its standard over the
 * defaults, so the check starts on and overlaps highlighted */
export function buildTempoForLanguage(lang: string): TProjectTempo {
  return { ...PROJECT_TEMPO_DEFAULTS, ...getTempoTemplate(lang) };
}

/** The languages whose standard the tempo's limits match exactly, in TLanguage order */
export function findMatchingTempoLanguages(tempo: TProjectTempo): TLanguage[] {
  return Object.values(TLanguage).filter((lang) =>
    STANDARD_FIELDS.every((field) => TEMPO_TEMPLATES[lang][field] === tempo[field])
  );
}
