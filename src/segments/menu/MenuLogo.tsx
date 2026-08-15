import { useKeystrokeZone } from '@src/layout/components/KeystrokeZone/KeystrokeZone';
import { SETTINGS_KEY } from '@providers/MenuActionsProvider';
import { useMenuRefs } from '@providers/MenuRefsProvider';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { openSettingsOverlay } from '@store/thunks';
import classNames from 'classnames';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { ListItem } from '@ui-toolkit/ListItem';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint } from '@ui-toolkit/Tooltip';
import { useMainMenuState } from '../../providers/MenuStateProvider';
import ThemeSelector from './ThemeSelector';
import Hr, { THrVariant } from '@ui-toolkit/Hr/Hr';
import { selectCurrentOverlay } from '@src/store/slices/overlays';

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
export default function MenuLogo() {
  const { t } = useTranslation('menu');
  const dispatch = useAppDispatch();
  const { dynamic, compact } = useMainMenuState();
  const overlay = useAppSelector(selectCurrentOverlay);
  const { registerMenuItemRef } = useMenuRefs();
  const { zoneRef } = useKeystrokeZone();
  const setSettingsRef = useCallback(
    (el: HTMLDivElement | null) => {
      registerMenuItemRef(SETTINGS_KEY, el);
      // Seeds the menu zone's fallback focus target -- always-mounted, so ctrl+N has somewhere
      // reliable to go even before anything in the menu has ever been focused.
      zoneRef.current = el;
    },
    [registerMenuItemRef, zoneRef]
  );
  return (
    <Root className={classNames({ dynamic })}>
      <VanityContainer>
        <ListItem
          compact={dynamic ? compact : false}
          tabIndex={-1}
          color={ThemeColors.ACCENT1}
          icon={TIcon.LOGO}
        >
          {`v${__APP_VERSION__}`}
        </ListItem>
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
            isActive={overlay === 'settings'}
            onClick={() => dispatch(openSettingsOverlay())}
          >
            {t('buttons.settings')}
          </ListItem>
        </Tooltip>

        <ThemeSelector />
      </PanelSwitch>
    </Root>
  );
}
