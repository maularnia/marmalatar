import type { PromptTemplateFileDataType } from '@src/utils/data/schemas';
import { useAppSelectors } from '@store/hooks';
import { promptTemplates } from '@src/services/prompt';
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
import { useLoader } from '../dialogs/loader/useLoader';
import Overlay from './Overlay';

const emptyFormData: PromptTemplateFileDataType = {
  version: 1,
  title: '',
  emoji: FALLBACK_EMOJI,
  promptTemplate: '',
};

export default function PromptOverlay() {
  const { t } = useTranslation(['prompt', 'messages']);
  const [currentPromptTemplate, promptTemplateData] = useAppSelectors(
    promptTemplates.selectCurrent,
    promptTemplates.selectData
  );
  const { load } = useLoader();

  const formData = promptTemplateData ?? emptyFormData;

  const handleChange = (field: keyof PromptTemplateFileDataType, value: string) => {
    promptTemplates.setData({ ...formData, [field]: value });
  };

  const handleClose = async () => {
    await load(
      { messages: [t('messages:promptTemplate.savingLabel', { title: formData.title || '...' })] },
      promptTemplates.save()
    );
    promptTemplates.closeEditor();
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
