import { CSSVar, ThemeColors } from '@src/theme/utils';
import { ListItem } from '@ui-toolkit/ListItem';
import { Logo } from '@ui-toolkit/Logo/Logo';
import Span from '@ui-toolkit/Span';
import styled from 'styled-components';
import { MenuSection } from './MenuSection';

// Same box as FileList's rows. It's a label, not a control: the item underneath stays out of
// reach of the pointer (no hover, no pointer cursor) and of Tab.
const Root = styled.div`
  padding: ${CSSVar('projectListSpacingY')} ${CSSVar('projectListSpacingX')};
  pointer-events: none;
`;

// Logo draws at a fixed px size (width/height attributes); the theme's size wins over them here
const LogoBox = styled.span`
  display: flex;
  svg {
    width: ${CSSVar('menuLogoSize')};
    height: ${CSSVar('menuLogoSize')};
  }
`;

// The menu's header: one menu item with the app's logo as its icon, then its name and version.
// Only the logo stays while the sidebar is collapsed to its icon column.
type TMenuLogoProps = {
  /** Whether the sidebar is collapsed: the same value FileList gets */
  compact: boolean;
};

export default function MenuLogo({ compact }: TMenuLogoProps) {
  return (
    <Root>
      <MenuSection>
        <ListItem
          tabIndex={-1}
          compact={compact}
          color={ThemeColors.TEXT}
          emoji={
            <LogoBox>
              <Logo animated={false} />
            </LogoBox>
          }
        >
          <>
            Marmalatar <Span color={ThemeColors.ACCENT1}>{`v${__APP_VERSION__}`}</Span>
          </>
        </ListItem>
      </MenuSection>
    </Root>
  );
}
