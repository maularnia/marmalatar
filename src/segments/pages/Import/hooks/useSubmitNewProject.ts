import { emitProjectCreationAbortedMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { useLoader } from '@src/segments/dialogs/loader/useLoader';
import { useAppDispatch, useAppSelector } from '@src/store/hooks';
import { selectFolder } from '@src/store/slices/workingFolder';
import { createNewProject } from '@store/slices/project';
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
  const { load } = useLoader();
  const { pushMessage } = useMessageHelmet();

  const submitNewProject = useCallback(
    async (params: SubmitNewProjectParams) => {
      if (!folder) return;

      try {
        await load(
          {
            messages: [
              t('submitNewProject.creatingProject'),
              'Counting subtitle entries',
              'Blamin processor for slow performance',
              'Re-evaluating expectations',
              'Computing waveforms',
              'Surfing on waveforms',
              'Demanding more RAM',
            ],
          },
          dispatch(createNewProject(params))
        );
        navigate('/workspace');
      } catch (error) {
        emitProjectCreationAbortedMessage(
          pushMessage,
          error instanceof Error ? error.message : undefined
        );
      }
    },
    [folder, dispatch, navigate, load, t, pushMessage]
  );

  return { submitNewProject };
}
