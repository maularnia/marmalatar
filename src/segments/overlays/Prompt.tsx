import { useInfoWindow } from '@providers/ConfirmationProvider/ConfirmationProvider';
import type { PromptTemplateFileDataType } from '@src/utils/data/schemas';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  selectCurrentPromptTemplate,
  selectPromptTemplateData,
  setPromptTemplateData,
} from '@store/slices/aiPromptEditor';
import { closeOverlays } from '@store/slices/overlays';
import { savePromptTemplate } from '@store/thunks';
import {
  FormsContent,
  FormsRow,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import TextArea from '@ui-toolkit/TextArea';
import { FALLBACK_EMOJI } from '@utils/emoji';
import { useTranslation } from 'react-i18next';
import { Loader } from '../dialogs/Loader';
import Overlay from './Overlay';

const emptyFormData: PromptTemplateFileDataType = {
  version: 1,
  title: '',
  emoji: FALLBACK_EMOJI,
  promptTemplate: '',
};

export default function PromptOverlay() {
  const { t } = useTranslation(['prompt', 'messages']);
  const dispatch = useAppDispatch();
  const currentPromptTemplate = useAppSelector(selectCurrentPromptTemplate);
  const promptTemplateData = useAppSelector(selectPromptTemplateData);
  const { show: showLoading } = useInfoWindow(Loader);

  const formData = promptTemplateData ?? emptyFormData;

  const handleChange = (field: keyof PromptTemplateFileDataType, value: string) => {
    dispatch(setPromptTemplateData({ ...formData, [field]: value }));
  };

  const handleClose = async () => {
    await showLoading(
      {
        message: t('messages:promptTemplate.savingLabel', { title: formData.title || '...' }),
        animate: false,
      },
      dispatch(savePromptTemplate()) as Promise<unknown>
    );
    dispatch(closeOverlays());
  };

  if (!currentPromptTemplate) return null;

  return (
    <Overlay onClose={() => void handleClose()}>
      <FormsContent>
        <FormsRow>
          <FormsSection>
            <FormsSectionTitle icon={TIcon.AI_FILE} subtext={t('subtext')}>
              {t('title')}
            </FormsSectionTitle>
            <FormsSectionContent>
              <TextArea
                minWidth="100%"
                maxWidth="100%"
                minHeight="500px"
                style={{ fontFamily: 'var(--font-monospace)' }}
                value={formData.promptTemplate ?? ''}
                onChange={(e) => handleChange('promptTemplate', e.currentTarget.value)}
              >
                {t('title')}
              </TextArea>
            </FormsSectionContent>
          </FormsSection>
        </FormsRow>
      </FormsContent>
    </Overlay>
  );
}
