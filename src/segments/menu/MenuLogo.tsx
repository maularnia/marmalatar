import { projects } from '@src/services/project';
import { menu, SETTINGS_KEY } from '@src/services/menu';
import { glossaries } from '@src/services/glossary';
import { promptTemplates } from '@src/services/prompt';
import { settings } from '@src/services/settings';
import { useKeystrokeZone } from '@src/layout/components/KeystrokeZone/KeystrokeZone';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import Hr, { THrVariant } from '@ui-toolkit/Hr/Hr';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { ListItem } from '@ui-toolkit/ListItem';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint } from '@ui-toolkit/Tooltip';
import classNames from 'classnames';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import ThemeSelector from './ThemeSelector';

const PanelSwitch = styled.div`
  display: flex;
  align-items: center;
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 100)};
  gap: ${CSSVar('size2')};
`;

const VanityContainer = styled.div`
  display: flex;
  width: min-content;
  align-items: center;
  gap: ${CSSVar('size6')};
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 100)};
`;
const Root = styled.div`
  padding: ${CSSVar('projectListSpacingY')} ${CSSVar('projectListSpacingX')};
  display: flex;
  justify-content: space-between;
  &.dynamic {
    flex-direction: column;
    align-items: stretch;
    ${PanelSwitch} {
      flex-direction: column;
      align-items: stretch;
    }
  }
`;
// Overlays are exclusive: each owner keeps its own open state, and the caller closes the others
// before opening one. Opening settings drops the prompt or glossary editor without saving, as
// before.
function openSettings(): void {
  promptTemplates.closeEditor();
  glossaries.closeEditor();
  settings.closeExport();
  projects.closeArchive();
  settings.open();
}

export default function MenuLogo() {
  const { t } = useTranslation('menu');
  const [isSettingsOpen, dynamic, compact] = useAppSelectors(
    settings.selectIsOpen,
    menu.selectIsDynamic,
    menu.selectIsCompact
  );
  const { zoneRef } = useKeystrokeZone();
  const setSettingsRef = useCallback(
    (el: HTMLDivElement | null) => {
      menu.registerItem(SETTINGS_KEY, el);
      // Seeds the menu zone's fallback focus target -- always-mounted, so ctrl+N has somewhere
      // reliable to go even before anything in the menu has ever been focused.
      zoneRef.current = el;
    },
    [zoneRef]
  );
  return (
    <Root className={classNames({ dynamic })}>
      <VanityContainer>
        <ListItem tabIndex={-1} isDisabled color={ThemeColors.ACCENT2} icon={TIcon.LOGO} />
        {!(dynamic && compact) && (
          <Tag variant={TTagVariant.SECONDARY} size={TTagSize.NANO} color={ThemeColors.ACCENT2}>
            {`v${__APP_VERSION__}`}
          </Tag>
        )}
      </VanityContainer>
      <Hr variant={THrVariant.DIMMED} />
      <PanelSwitch>
        <Tooltip
          side={dynamic ? 'right' : 'bottom'}
          label={
            <TooltipComplex title={t('buttons.settings')}>
              <TooltipKeystrokeHint keys={['Ctrl', 'S']} />
            </TooltipComplex>
          }
        >
          <ListItem
            ref={setSettingsRef}
            compact={dynamic ? compact : true}
            icon={TIcon.SETTINGS}
            isActive={isSettingsOpen}
            onClick={openSettings}
          >
            {t('buttons.settings')}
          </ListItem>
        </Tooltip>

        <ThemeSelector />
      </PanelSwitch>
    </Root>
  );
}
