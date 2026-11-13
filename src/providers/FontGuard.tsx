import { preloadThemeFonts } from '@src/theme/fontPreload';
import { LogoLoader } from '@ui-toolkit/LogoLoader';
import { PropsWithChildren, useEffect, useState } from 'react';
import styled from 'styled-components';

// Shown while the fonts load. No text node may ever appear in here: the fonts aren't in yet, so
// anything written would render in a fallback font and jump once they are. The background is the
// one body/#root have (index.css), so the screen is seamless with what follows.
const Screen = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-default-100);
`;

// Mounts its children only once the theme's fonts are loaded (preloadThemeFonts), showing the
// animated logo until then. Sits inside ThemeProvider, whose effect has already put the theme class
// on body, so the logo's accent colors (theme CSS variables) are right from the first frame.
export function FontGuard({ children }: PropsWithChildren) {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    // StrictMode runs this twice; a second `document.fonts.load` for a face that's loading joins
    // the same load, so only the stale callback needs guarding
    let cancelled = false;
    void preloadThemeFonts().then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!fontsReady) {
    return (
      <Screen>
        <LogoLoader size={128} />
      </Screen>
    );
  }
  return children;
}
