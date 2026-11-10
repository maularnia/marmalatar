import { projects } from '@src/services/project';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { FormRoot, FormsContent, FormsRow } from '@ui-toolkit/forms';
import P, { TPVariant } from '@ui-toolkit/P';
import { useAppSelector } from '@store/hooks';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import Overlay from '../Overlay';
import { ArchiveItem } from './ArchiveItem';

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('projectListSpacingInnerY')};
`;

/** The archived (hidden) projects, alphabetically, to restore or delete. Owned by the project
 * service: open while projects.selectIsArchiveOpen. */
export default function ArchiveOverlay() {
  const { t } = useTranslation('menu');
  const archivedProjects = useAppSelector(projects.selectArchivedList);
  return (
    <Overlay title={t('archive.overlayTitle')} onClose={() => projects.closeArchive()}>
      <FormRoot onSubmit={(e) => e.preventDefault()}>
        <FormsContent>
          <FormsRow>
            {archivedProjects.length ? (
              <List>
                {archivedProjects.map((project) => (
                  <ArchiveItem key={project.projectId} project={project} />
                ))}
              </List>
            ) : (
              <P color={ThemeColors.TEXT} variant={TPVariant.TERTIARY}>
                {t('archive.empty')}
              </P>
            )}
          </FormsRow>
        </FormsContent>
      </FormRoot>
    </Overlay>
  );
}
