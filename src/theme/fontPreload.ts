import { themeFontFamilies } from './static';

// Loads every face the UI's font families declare (src/theme/static.ts: each family's weights and
// styles), so no text ever renders in a fallback font and swaps later. One `document.fonts.load`
// per family x weight x style: each resolves once the matching @font-face files are parsed and
// usable. The faces are requested by name, not by scanning `document.fonts`, so the families
// fonts.css declares but the UI doesn't use stay lazy. (`document.fonts.ready` alone wouldn't do:
// it only covers the fonts the page currently needs, which is nothing while only the logo shows.)
// A font that fails or stalls must never keep the app from starting: failures are swallowed and
// the whole wait is capped -- `font-display: swap` then handles whatever arrives later.
export async function preloadThemeFonts(timeoutMs = 8000): Promise<void> {
  const loads = themeFontFamilies.flatMap((family) =>
    family.styles.flatMap((style) =>
      family.weights.map((weight) =>
        document.fonts.load(`${style} ${weight} 16px "${family.name}"`)
      )
    )
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([Promise.allSettled(loads), timeout]);
}
