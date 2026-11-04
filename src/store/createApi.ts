// Builds a slice's domain facade: one frozen object holding the selectors, actions and thunks of a
// domain, so typing the domain's name lists everything about it.
//
//   export const glossaries = api('glossary', { selectGlossaryItems, renameGlossary, refreshGlossaries });
//   glossaries.selectItems, glossaries.rename, glossaries.refresh
//
// Each member's key is its name with the keyword taken out: the first occurrence of the capitalized
// plural ("Glossaries"), then of the capitalized singular ("Glossary"), then the first letter
// lowercased. The plural goes first so "refreshPromptTemplates" becomes "refresh", not "refreshs".
// TKey below and toKey must apply the same rule; the assertions at the bottom pin it.

type TVowel = 'a' | 'e' | 'i' | 'o' | 'u';

// "glossary" → "glossaries", but "overlay" → "overlays"
type TPlural<W extends string> = W extends `${string}${TVowel}y`
  ? `${W}s`
  : W extends `${infer S}y`
    ? `${S}ies`
    : `${W}s`;

type TStripOnce<S extends string, W extends string> = S extends `${infer A}${W}${infer B}`
  ? `${A}${B}`
  : S;

type TKey<K extends string, W extends string> = Uncapitalize<
  TStripOnce<TStripOnce<K, Capitalize<TPlural<W>>>, Capitalize<W>>
>;

type TApi<W extends string, T> = { readonly [K in keyof T as TKey<K & string, W>]: T[K] };

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function plural(word: string): string {
  return /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`;
}

function stripOnce(value: string, word: string): string {
  const index = value.indexOf(word);
  return index < 0 ? value : value.slice(0, index) + value.slice(index + word.length);
}

function toKey(name: string, keyword: string): string {
  const stripped = stripOnce(stripOnce(name, capitalize(plural(keyword))), capitalize(keyword));
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}

// Throws on load if two members end up under the same key, so a clash can't silently hide one
export function api<const W extends string, const T extends Record<string, unknown>>(
  keyword: W,
  members: T
): TApi<W, T> {
  const facade: Record<string, unknown> = {};
  for (const [name, member] of Object.entries(members)) {
    const key = toKey(name, keyword);
    if (key in facade) throw new Error(`api('${keyword}'): "${name}" clashes on key "${key}"`);
    facade[key] = member;
  }
  return Object.freeze(facade) as TApi<W, T>;
}

// Compile-time checks that TKey follows the rule described above
const _plural: TKey<'refreshPromptTemplates', 'promptTemplate'> = 'refresh';
const _singular: TKey<'selectCurrentGlossary', 'glossary'> = 'selectCurrent';
const _leading: TKey<'selectGlossaryItems', 'glossary'> = 'selectItems';
const _vowelY: TKey<'closeAllOverlays', 'overlay'> = 'closeAll';
const _untouched: TKey<'selectFolder', 'workingFolder'> = 'selectFolder';
void [_plural, _singular, _leading, _vowelY, _untouched];
