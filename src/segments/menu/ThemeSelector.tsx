import { TColor } from '@src/theme/definitions';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TThemeSelection } from '@src/types';
import { useAppSelector } from '@store/hooks';
import { settings } from '@src/services/settings';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import Tooltip, { TooltipComplex } from '@ui-toolkit/Tooltip';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
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

type TThemeSelectorProps = {
  /** Whether the sidebar is collapsed: only the icon shows */
  compact: boolean;
};

export default function ThemeSelector({ compact }: TThemeSelectorProps) {
  const { t } = useTranslation('menu');
  const selection = useAppSelector(settings.selectThemeSelection);
  const toggleThemes = () => {
    const nextIndex = (themes.indexOf(selection) + 1) % themes.length;
    settings.setThemeSelection(themes[nextIndex]);
  };
  return (
    <Tooltip
      side="right"
      label={
        <TooltipComplex title={t('buttons.switchTheme')}>
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
        compact={compact}
        onClick={toggleThemes}
        color={StateToColor[selection]}
        icon={StateToIcon[selection]}
      >
        {t(`buttons.theme.${selection}`)}
      </ListItem>
    </Tooltip>
  );
}
