import { ai } from '@src/services/ai';
import { glossaries } from '@src/services/glossary';
import { projects } from '@src/services/project';
import { promptTemplates } from '@src/services/prompt';
import { settings } from '@src/services/settings';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint } from '@ui-toolkit/Tooltip';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

// Right after the editor table's list, centred on the table. Sticky, so while the list runs past
// the bottom of the screen it stays pinned there, over the table, reachable wherever it's scrolled;
// once the list's end is in view it sits just below the last line.
const Slot = styled.div`
  position: sticky;
  z-index: 2;
  bottom: ${CSSVar('size10')};
  align-self: center;
  margin: ${CSSVar('size34')} 0 0;
`;

// Overlays are exclusive: each owner keeps its own open state, and the caller closes the others
// before opening one.
function openExport(): void {
  promptTemplates.closeEditor();
  glossaries.closeEditor();
  settings.close();
  projects.closeArchive();
  settings.openExport();
}

export function ExportButton() {
  const { t } = useTranslation('tooltips');
  const [currentBulkJob, isBusy] = useAppSelectors(ai.selectCurrentBulkJob, ai.selectIsBusy);
  return (
    <Slot>
      <Tooltip
        label={
          <TooltipComplex title={t('editorControls.export')}>
            <TooltipKeystrokeHint keys={['Ctrl', 'E']} />
          </TooltipComplex>
        }
      >
        <Button
          variant={TButtonVariant.PRIMARY}
          color={ThemeColors.ACCENT1}
          size={TButtonSize.REGULAR}
          icon={TIcon.EXPORT}
          disabled={currentBulkJob != null || isBusy}
          onClick={openExport}
        >
          {t('editorControls.export')}
        </Button>
      </Tooltip>
    </Slot>
  );
}
