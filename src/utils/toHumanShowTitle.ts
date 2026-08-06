export function toHumanShowTitle(filename: string): string {
  let s = filename.replace(/\.[^.]+$/, '');

  // Combined season+episode (S02E01 → Season 2 Episode 1)
  s = s.replace(/\b[Ss]0*(\d+)[Ee]0*(\d+)\b/g, 'Season $1 Episode $2');
  // Standalone season (S01 → Season 1)
  s = s.replace(/\b[Ss]0*(\d+)\b/g, 'Season $1');
  // Standalone episode (E01 → Episode 1)
  s = s.replace(/\b[Ee]0*(\d+)\b/g, 'Episode $1');

  // Insert space between lowercase and following uppercase (camelCase)
  s = s.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Insert space between letter and following number
  s = s.replace(/([A-Za-z])(\d)/g, '$1 $2');
  // Insert space between number and following letter
  s = s.replace(/(\d)([A-Za-z])/g, '$1 $2');

  // Replace anything that is not a letter or digit with a space
  s = s.replace(/[^A-Za-z0-9]+/g, ' ');
  // Normalize whitespace
  s = s.trim().replace(/\s+/g, ' ');
  // Title-case: capitalize first letter of each word, lowercase the rest
  s = s
    .split(' ')
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');

  return s;
}
