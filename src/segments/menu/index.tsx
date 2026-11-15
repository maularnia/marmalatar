import { useAppSelectors } from '@store/hooks';
import { MenuKeystrokeProvider } from '@providers/MenuKeystrokeProvider';
import { TShade } from '@src/theme/definitions';
import { menuExpandDelay, menuHoverExpand, menuWidthDuration } from '@src/toolkit/motion/menu';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import classNames from 'classnames';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { menu } from '@src/services/menu';
import FileList from './FileList';
import MenuFooter from './MenuFooter';
import MenuLogo from './MenuLogo';

// Backdrop starts growing only after menuExpandDelay (a quick mouse pass-by over the collapsed
// menu shouldn't trigger a full expand). Everything else -- Root's own (unanimated) width, the
// header, the file list and the footer leaving their compact state, the backdrop's color -- waits
// exactly that same delay, so the whole menu expands at one moment. Collapsing is immediate.
const MENU_EXPAND_DELAY_MS = menuExpandDelay * 1000;

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
  gap: ${CSSVar('size4')};
  padding: ${CSSVar('size4')};
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
  background: ${CSSVar('menuExpandedBg')};
  &.compact {
    background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 40)};
  }
`;

// Blurs the whole app behind a dynamic sidebar while it's expanded over the content. Fixed to the
// screen, but rendered inside Root so it shares Root's z-index: under the menu (and its Backdrop),
// over everything else. It's only a visual, so it never takes pointer events -- the sidebar's
// own hover tracking decides when it collapses.
const ScreenBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: -2;
  backdrop-filter: blur(${CSSVar('blurExtreme')});
  pointer-events: none;
`;

const Root = styled.div`
  height: 100%;
  position: relative;
  &.dynamic {
    position: absolute;
    z-index: 21;
    width: ${CSSVar('appMenuCollapsedWidth')};
    &.expanded {
      width: ${CSSVar('appMenuExpandedWidth')};
    }
  }
`;
const Content = styled.div`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;
export default function MainMenu() {
  const [dynamic, compact, isOverlayOpen] = useAppSelectors(
    menu.selectIsDynamic,
    menu.selectIsCompact,
    menu.selectIsOverlayOpen
  );

  // Root's own width switches instantly (no transition) -- only Backdrop animates. Expanding waits
  // out the same delay Backdrop's "in" variant does (see MENU_EXPAND_DELAY_MS); collapsing is
  // immediate, since a menu that lingers open after the mouse leaves is worse than one that snaps.
  const [expanded, setExpanded] = useState(!compact);
  useEffect(() => {
    if (compact) {
      setExpanded(false);
      return;
    }
    // An open overlay expands the sidebar on its own (see isExpanded): no hover to wait for
    if (isOverlayOpen) return;
    const timeout = setTimeout(() => setExpanded(true), MENU_EXPAND_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [compact, isOverlayOpen]);
  // An open overlay holds the sidebar expanded: there's no hover to confirm, so it expands at once,
  // without the delay (and, on Backdrop, without the animation)
  const isExpanded = expanded || (isOverlayOpen && !compact);

  return (
    <Root className={classNames({ dynamic, expanded: dynamic && isExpanded })}>
      {dynamic && (
        <ScreenBackdrop
          initial={false}
          // An open overlay holds the sidebar expanded, but brings its own backdrop
          animate={{ opacity: isExpanded && !isOverlayOpen ? 1 : 0 }}
          transition={{ ease: 'circOut', duration: menuWidthDuration }}
        />
      )}
      {/* Also behind the static column, so the expanded menu has the same background everywhere */}
      <Backdrop
        className={classNames({ compact: dynamic && !isExpanded })}
        variants={menuHoverExpand.variants}
        initial={false}
        animate={!dynamic ? 'instant' : compact ? 'out' : isOverlayOpen ? 'instant' : 'in'}
      />
      <Content>
        <MenuKeystrokeProvider>
          <Header>
            <MenuLogo compact={!isExpanded} />
            <Hr variant={THrVariant.TRANSPARENT} orientation={THrOrient.HORIZONTAL} />
          </Header>
          <Scroll>
            <FileList compact={!isExpanded} />
          </Scroll>
          <MenuFooter compact={!isExpanded} />
        </MenuKeystrokeProvider>
      </Content>
    </Root>
  );
}
