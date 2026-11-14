import { menu } from '@src/services/menu';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { ListItem } from '@ui-toolkit/ListItem';
import Span from '@ui-toolkit/Span';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import styled from 'styled-components';

const Root = styled.div`
  padding: ${CSSVar('projectListSpacingY')} ${CSSVar('projectListSpacingX')};
  display: flex;
  align-items: center;
  gap: ${CSSVar('size6')};
  white-space: nowrap;
`;

// ListItem fills its row by default, which would push the name to the far side of the logo. It's
// wrapped rather than styled: ListItem's own className (its state classes) would be replaced.
const Logo = styled.div`
  flex: 0 0 auto;
`;

const Title = styled(Span)`
  font-family: ${CSSVar('fontHeadingSansSerif')};
  font-weight: ${CSSVar('black')};
  text-align: left;
`;

// The menu's header: the app's logo, name and version. The name and version are hidden while the
// sidebar is collapsed to its icon column.
export default function MenuLogo() {
  const [dynamic, compact] = useAppSelectors(menu.selectIsDynamic, menu.selectIsCompact);
  const isCollapsed = dynamic && compact;
  return (
    <Root>
      <Logo>
        <ListItem tabIndex={-1} isDisabled color={ThemeColors.ACCENT2} icon={TIcon.LOGO} />
      </Logo>
      {!isCollapsed && (
        <>
          <Title color={ThemeColors.TEXT}>Marmalatar</Title>
          <Tag variant={TTagVariant.SECONDARY} size={TTagSize.NANO} color={ThemeColors.ACCENT2}>
            {`v${__APP_VERSION__}`}
          </Tag>
        </>
      )}
    </Root>
  );
}
