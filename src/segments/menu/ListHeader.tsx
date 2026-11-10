import { CSSVar } from '@src/theme/utils';
import H from '@ui-toolkit/H';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import { ReactNode } from 'react';
import styled from 'styled-components';

type TListHeaderProps = {
  children: ReactNode;
  /** Shown to the left of the text */
  icon?: TIcon;
  /** Rendered to the right of the text, pushed to the header's right edge */
  actionBar?: ReactNode;
  className?: string;
};

const Root = styled(H)`
  display: flex;
  align-items: center;
  gap: ${CSSVar('size6')};
  padding: ${CSSVar('size6')} ${CSSVar('size6')} 0;
`;

const HeaderText = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: ${CSSVar('size4')};
`;

// A menu list's title, with an optional icon before it and actions after it
export function ListHeader({ children, icon, actionBar, className }: TListHeaderProps) {
  return (
    <Root className={className} level={6}>
      {icon && <Icon icon={icon} size={TIconSize.S} />}
      <HeaderText>{children}</HeaderText>
      {actionBar && <ActionBar>{actionBar}</ActionBar>}
    </Root>
  );
}
