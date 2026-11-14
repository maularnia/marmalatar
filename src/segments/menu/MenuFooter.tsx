import { glossaries } from '@src/services/glossary';
import { menu, SETTINGS_KEY } from '@src/services/menu';
import { projects } from '@src/services/project';
import { promptTemplates } from '@src/services/prompt';
import { settings } from '@src/services/settings';
import { KeystrokeZoneContext } from '@src/layout/components/KeystrokeZone/KeystrokeZone';
import { CSSVar } from '@src/theme/utils';
import { useAppSelector } from '@store/hooks';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { ListItem } from '@ui-toolkit/ListItem';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint } from '@ui-toolkit/Tooltip';
import { use, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import ThemeSelector from './ThemeSelector';

// Padded like FileList's sections, so the footer's rows line up with the file rows above
const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('projectListSpacingInnerY')};
  flex-shrink: 0;
  padding: ${CSSVar('projectListSpacingY')} ${CSSVar('projectListSpacingX')};
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

type TMenuFooterProps = {
  /** Whether the sidebar is collapsed: the same value FileList gets */
  compact: boolean;
};

// The app-wide items pinned to the bottom of the menu: settings and the theme switch
export default function MenuFooter({ compact }: TMenuFooterProps) {
  const { t } = useTranslation('menu');
  const isSettingsOpen = useAppSelector(settings.selectIsOpen);
  const { zoneRef } = use(KeystrokeZoneContext);
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
    <Root>
      <Tooltip
        side="right"
        label={
          <TooltipComplex title={t('buttons.settings')}>
            <TooltipKeystrokeHint keys={['Ctrl', 'S']} />
          </TooltipComplex>
        }
      >
        <ListItem
          ref={setSettingsRef}
          compact={compact}
          icon={TIcon.SETTINGS}
          isActive={isSettingsOpen}
          onClick={openSettings}
        >
          {t('buttons.settings')}
        </ListItem>
      </Tooltip>
      <ThemeSelector compact={compact} />
    </Root>
  );
}
