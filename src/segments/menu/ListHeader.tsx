import { CSSVar } from '@src/theme/utils';
import H from '@ui-toolkit/H';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import classNames from 'classnames';
import { ReactNode } from 'react';
import styled from 'styled-components';

type TListHeaderProps = {
  children: string;
  /** The collapsed sidebar: only the title's first letter, no actions */
  compact?: boolean;
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
  padding: 0 ${CSSVar('size6')};
`;

const HeaderText = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  height: ${CSSVar('buttonHeightSmall')};
  line-height: calc(${CSSVar('buttonHeightSmall')} * 1.1);
  &.compact {
    text-align: center;
  }
`;

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

// A menu list's title, with an optional icon before it and actions after it. Rendered in both
// sidebar states: the collapsed one shows the title's first letter only.
export function ListHeader({
  children,
  compact = false,
  icon,
  actionBar,
  className,
}: TListHeaderProps) {
  return (
    <Root className={className} level={6}>
      {icon && <Icon icon={icon} size={TIconSize.S} />}
      {/* Array.from: the first character, not half of a surrogate pair */}
      <HeaderText className={classNames({ compact })}>
        {compact ? Array.from(children)[0] : children}
      </HeaderText>
      {!compact && actionBar && <ActionBar>{actionBar}</ActionBar>}
    </Root>
  );
}
