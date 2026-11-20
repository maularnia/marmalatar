import type { TProjectEntry } from '@src/services/project';
import { projects } from '@src/services/project';
import { ThemeColors } from '@src/theme/utils';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import Emoji from '@ui-toolkit/Emoji';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { ListItem } from '@ui-toolkit/ListItem';
import Tooltip, { TooltipSimple } from '@ui-toolkit/Tooltip';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

// An archived project can't be opened from here, so the row isn't clickable
const ArchiveListItem = styled(ListItem)`
  cursor: default;
`;

type TArchiveItemProps = {
  project: TProjectEntry;
};

/** One archived project: its emoji and name, with Restore and Delete always shown */
export function ArchiveItem({ project }: TArchiveItemProps) {
  const { t } = useTranslation('menu');
  return (
    <ArchiveListItem
      emoji={<Emoji>{project.emoji}</Emoji>}
      staticPanel
      panel={
        <>
          <Tooltip label={<TooltipSimple>{t('archive.restoreButton')}</TooltipSimple>}>
            <Button
              type="button"
              variant={TButtonVariant.TRANSPARENT}
              size={TButtonSize.NANO}
              color={ThemeColors.TEXT}
              icon={TIcon.RESTORE}
              onClick={() => void projects.restore(project.projectId)}
            />
          </Tooltip>
          <Tooltip label={<TooltipSimple>{t('archive.deleteButton')}</TooltipSimple>}>
            <Button
              type="button"
              variant={TButtonVariant.TRANSPARENT}
              size={TButtonSize.NANO}
              color={ThemeColors.TEXT}
              icon={TIcon.BIN}
              onClick={() => void projects.delete(project.projectId, project.projectName)}
            />
          </Tooltip>
        </>
      }
    >
      {project.projectName}
    </ArchiveListItem>
  );
}
