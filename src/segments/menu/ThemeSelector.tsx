import { TColor } from '@src/theme/definitions';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TThemeSelection } from '@src/types';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { selectThemeSelection, setThemeSelection } from '@store/slices/app';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import Tooltip, { TooltipComplex } from '@ui-toolkit/Tooltip';
import styled from 'styled-components';
import { useMainMenuState } from '../../providers/MenuStateProvider';
import { ListItem } from '@ui-toolkit/ListItem';

const ThemeShortcutList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('size1')};
`;

const ThemeShortcutRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${CSSVar('size2')};
`;

const StateToIcon: { [key in TThemeSelection]: TIcon } = {
  [TThemeSelection.LIGHT]: TIcon.SUN,
  [TThemeSelection.DARK]: TIcon.MOON,
  [TThemeSelection.SYSTEM]: TIcon.BRUSH,
};

const StateToColor: { [key in TThemeSelection]: TColor } = {
  [TThemeSelection.LIGHT]: ThemeColors.YELLOW,
  [TThemeSelection.DARK]: ThemeColors.BLUE,
  [TThemeSelection.SYSTEM]: ThemeColors.WHITE,
};

const themes: TThemeSelection[] = [
  TThemeSelection.SYSTEM,
  TThemeSelection.LIGHT,
  TThemeSelection.DARK,
];

const ThemeShortcuts: Array<{ key: string; label: string }> = [
  { key: 'F1', label: 'Dark' },
  { key: 'F2', label: 'Light' },
  { key: 'F3', label: 'System' },
];

export default function ThemeSelector() {
  const dispatch = useAppDispatch();
  const selection = useAppSelector(selectThemeSelection);
  const { dynamic, compact } = useMainMenuState();
  const toggleThemes = () => {
    const nextIndex = (themes.indexOf(selection) + 1) % themes.length;
    dispatch(setThemeSelection(themes[nextIndex]));
  };
  return (
    <Tooltip
      side={dynamic ? 'right' : 'bottom'}
      label={
        <TooltipComplex title="Switch theme">
          <ThemeShortcutList>
            {ThemeShortcuts.map(({ key, label }) => (
              <ThemeShortcutRow key={key}>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  {key}
                </Tag>
                {label}
              </ThemeShortcutRow>
            ))}
          </ThemeShortcutList>
        </TooltipComplex>
      }
    >
      <ListItem
        compact={dynamic ? compact : true}
        onClick={toggleThemes}
        color={StateToColor[selection]}
        icon={StateToIcon[selection]}
      >
        {selection}
      </ListItem>
    </Tooltip>
  );
}
