import { CSSVar, ThemeColors } from '@src/theme/utils';
import Button from '@ui-toolkit/Button/Button';
import { BUTTON_BORDER_RADIUS_VAR, TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { Children, Fragment, isValidElement, ReactElement, ReactNode, useState } from 'react';
import styled from 'styled-components';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from './forms';
import { TIcon } from './Icon/icons';

// ── TabContent ───────────────────────────────────────────────────────────────

type TTabContentProps = {
  /** Matches a tab's id in Tabs' `tabs`, which shows this content while that tab is selected */
  id: string;
  children?: ReactNode;
};

/** One tab's content. Renders its children as they are -- no wrapper, no padding. */
export function TabContent({ children }: TTabContentProps) {
  return <>{children}</>;
}

// ── Tab ──────────────────────────────────────────────────────────────────────

// Where a tab sits in the bar decides which corners keep the button's radius, so the tabs read as
// one segmented control
type TTabPosition = 'first' | 'middle' | 'last' | 'single';

const RADIUS = CSSVar('inputBorderRadius');

// Button draws its corners on an inner pseudo-element, so they're changed through the variable it
// exposes rather than by setting border-radius here
const POSITION_RADIUS: Record<TTabPosition, string | null> = {
  first: `${RADIUS} 0 0 ${RADIUS}`,
  middle: '0',
  last: `0 ${RADIUS} ${RADIUS} 0`,
  single: null,
};

const TabButton = styled(Button)<{ $position: TTabPosition }>`
  ${({ $position }) => {
    const radius = POSITION_RADIUS[$position];
    return radius ? `${BUTTON_BORDER_RADIUS_VAR}: ${radius};` : '';
  }}
`;

type TTabProps = {
  size: TButtonSize;
  isActive: boolean;
  position: TTabPosition;
  onClick: () => void;
  children: string;
};

/** A tab button: transparent, or filled with accent1 while active */
function Tab({ size, isActive, position, onClick, children }: TTabProps) {
  return (
    <TabButton
      $position={position}
      role="tab"
      aria-selected={isActive}
      size={size}
      variant={isActive ? TButtonVariant.PRIMARY : TButtonVariant.TRANSPARENT}
      color={isActive ? ThemeColors.ACCENT1 : ThemeColors.TEXT}
      onClick={onClick}
    >
      {children}
    </TabButton>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type TTabDefinition = {
  id: string;
  title: string;
  /** Selected when Tabs mounts; the first shown tab otherwise */
  default?: boolean;
};

type TTabsProps = {
  title?: string;
  subtext?: string;
  icon?: TIcon;
  tabs: TTabDefinition[];
  tabSize?: TButtonSize;
  /** TabContent elements, matched to `tabs` by id */
  children: ReactNode;
};

const Root = styled.div`
  display: flex;
  flex-direction: column;
`;

// No gap: the tabs form one bar, their inner corners squared off by Tab
const TabBar = styled.div`
  display: flex;
  gap: 0;
`;

const TitledTabs = styled.div`
  display: flex;
  gap: ${CSSVar('formSectionSpacingInnerX')};
  align-items: center;
  justify-content: space-between;
`;
const TitleText = styled.div``;
const TitleTags = styled.div`
  height: 0;
  display: flex;
  align-content: center;
  align-items: center;
`;
const TitledTabsContent = styled.div`
  margin-left: calc(var(--form-spacing-inner-x) + 18px);
`;
function getPosition(index: number, count: number): TTabPosition {
  if (count === 1) return 'single';
  if (index === 0) return 'first';
  return index === count - 1 ? 'last' : 'middle';
}

/** Tab buttons in a row, showing the TabContent child of the selected one. A tab without a
 * matching TabContent child isn't shown. */
export function Tabs({
  title,
  icon,
  tabs,
  subtext,
  tabSize = TButtonSize.REGULAR,
  children,
}: TTabsProps) {
  const contents = new Map<string, ReactElement<TTabContentProps>>();
  Children.toArray(children).forEach((child) => {
    if (isValidElement<TTabContentProps>(child) && child.type === TabContent) {
      contents.set(child.props.id, child);
    }
  });
  const visibleTabs = tabs.filter((tab) => contents.has(tab.id));
  const fallbackId = (visibleTabs.find((tab) => tab.default) ?? visibleTabs[0])?.id ?? null;

  const [selectedId, setSelectedId] = useState(fallbackId);
  // Derived rather than synced in an effect: when the selected tab is no longer shown (tabs or
  // children changed), the default one is, until the user picks another
  const activeId = visibleTabs.some((tab) => tab.id === selectedId) ? selectedId : fallbackId;

  // The same bar either way: beside the title when there is one, in its own row otherwise
  const tabBar = (
    <TabBar role="tablist">
      {visibleTabs.map((tab, index) => (
        <Tab
          key={tab.id}
          size={tabSize}
          isActive={tab.id === activeId}
          position={getPosition(index, visibleTabs.length)}
          onClick={() => setSelectedId(tab.id)}
        >
          {tab.title}
        </Tab>
      ))}
    </TabBar>
  );

  const Wrapper = title && icon ? TitledTabsContent : Fragment;

  return (
    <Root>
      <FormsRow>
        <FormsSection>
          {title ? (
            <FormsSectionTitle icon={icon} subtext={subtext}>
              <TitledTabs>
                <TitleText>{title}</TitleText>
                <TitleTags>{tabBar}</TitleTags>
              </TitledTabs>
            </FormsSectionTitle>
          ) : (
            <FormsSectionContent>{tabBar}</FormsSectionContent>
          )}
        </FormsSection>
      </FormsRow>
      <Wrapper>{activeId != null && contents.get(activeId)}</Wrapper>
    </Root>
  );
}
