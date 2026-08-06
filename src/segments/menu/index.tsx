import MenuActionsProvider from '@providers/MenuActionsProvider';
import MenuKeystrokeProvider from '@providers/MenuKeystrokeProvider';
import MenuRefsProvider from '@providers/MenuRefsProvider';
import { TShade } from '@src/theme/definitions';
import { menuExpandDelay, menuHoverExpand, menuWidthDuration } from '@src/toolkit/motion/menu';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import classNames from 'classnames';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useMainMenuState } from '../../providers/MenuStateProvider';
import FileList from './FileList';
import MenuLogo from './MenuLogo';

// Backdrop starts growing only after menuExpandDelay (a quick mouse pass-by over the collapsed
// menu shouldn't trigger a full expand). Root's own (unanimated) width switch waits that same
// delay plus half of the grow animation on top, so it snaps to full width once Backdrop has
// already covered roughly half the reveal -- landing mid-animation instead of at the very start,
// which is what made the width jump visible/glitchy. Collapsing is immediate.
const MENU_EXPAND_DELAY_MS = (menuExpandDelay + menuWidthDuration / 2) * 1000;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex-shrink: 0;
`;
const Scroll = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: ${CSSVar('size34')};
  &::-webkit-scrollbar {
    width: ${CSSVar('appScrollbarWidth')};
  }

  &::-webkit-scrollbar-track {
    background: ${CSSVar('appScrollbarTrackColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }

  &::-webkit-scrollbar-thumb {
    background: ${CSSVar('appScrollbarThumbColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
`;
const SidebarBottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Purely decorative -- carries the background/blur and is the only thing that's actually animated.
// Positioned independently of Root's own (unanimated) width, so it can grow/shrink smoothly behind
// Content without ever forcing the real layout (Header/Scroll/FileList) to reflow mid-transition,
// which was the source of the width glitch when Root's width itself was what framer-motion drove.
const Backdrop = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  z-index: -1;
  backdrop-filter: blur(${CSSVar('blurHeavy')});
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 90)};
  &.compact {
    background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 40)};
  }
`;

const Root = styled.div`
  height: 100%;
  position: relative;
  &.dynamic {
    display: grid;
    grid-template-columns: auto 1px;
    position: absolute;
    z-index: 21;
    width: ${CSSVar('size34')};
    &.expanded {
      width: 240px;
    }
  }
`;
const Content = styled.div`
  height: 100%;
  overflow: hidden;
`;
export default function MainMenu() {
  const { dynamic, compact } = useMainMenuState();

  // Root's own width switches instantly (no transition) -- only Backdrop animates. Expanding waits
  // out the same delay Backdrop's "in" variant does (see MENU_EXPAND_DELAY_MS); collapsing is
  // immediate, since a menu that lingers open after the mouse leaves is worse than one that snaps.
  const [expanded, setExpanded] = useState(!compact);
  useEffect(() => {
    if (compact) {
      setExpanded(false);
      return;
    }
    const timeout = setTimeout(() => setExpanded(true), MENU_EXPAND_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [compact]);

  return (
    <Root className={classNames({ dynamic, expanded: dynamic && expanded })}>
      {dynamic && (
        <Backdrop
          className={classNames({ compact })}
          variants={menuHoverExpand.variants}
          initial={false}
          animate={compact ? 'out' : 'in'}
        />
      )}
      <Content>
        <MenuRefsProvider>
          <MenuActionsProvider>
            <MenuKeystrokeProvider>
              <Header>
                <MenuLogo />
                <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
              </Header>
              <Scroll>
                <FileList />
              </Scroll>
            </MenuKeystrokeProvider>
          </MenuActionsProvider>
        </MenuRefsProvider>
        <SidebarBottom></SidebarBottom>
      </Content>
      {dynamic && !compact && <Hr orientation={THrOrient.VERTICAL} variant={THrVariant.DIMMED} />}
    </Root>
  );
}
