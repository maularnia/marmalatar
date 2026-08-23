import { emitProjectCreationAbortedMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { useInfoWindow } from '@src/providers/ConfirmationProvider/ConfirmationProvider';
import { Loader } from '@src/segments/dialogs/Loader';
import { useAppDispatch, useAppSelector } from '@src/store/hooks';
import { selectFolder } from '@src/store/slices/disc';
import { createNewProject } from '@src/store/thunks';
import { TLanguage, TSubtitleLine } from '@src/types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type SubmitNewProjectParams = {
  lines: TSubtitleLine[];
  projectName: string;
  sourceLanguage: TLanguage;
  targetLanguage: TLanguage;
};

export function useSubmitNewProject() {
  const { t } = useTranslation('messages');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const folder = useAppSelector(selectFolder);
  const { show: showInfo } = useInfoWindow(Loader);
  const { pushMessage } = useMessageHelmet();

  const submitNewProject = useCallback(
    async (params: SubmitNewProjectParams) => {
      if (!folder) return;

      const sanitizedName = params.projectName.trim().replace(/[^\w.-]+/g, '_') || 'project';
      const sanitizedFileName = `${sanitizedName}.mrml`;
      const filePath = `${folder}/${sanitizedFileName}`;

      try {
        await showInfo(
          { message: t('submitNewProject.creatingProject'), animate: false },
          dispatch(createNewProject({ ...params, filePath }))
        );
        navigate('/workspace');
      } catch (error) {
        emitProjectCreationAbortedMessage(
          pushMessage,
          error instanceof Error ? error.message : undefined
        );
      }
    },
    [folder, dispatch, navigate, showInfo, t, pushMessage]
  );

  return { submitNewProject };
}
