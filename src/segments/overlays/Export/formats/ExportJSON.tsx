import { selectProjectName } from '@src/store/slices/project';
import { ThemeColors } from '@src/theme/utils';
import { TSubtitleLine } from '@src/types';
import {
  exportAsJson,
  JsonExportStructure,
  validateJsonStructure,
} from '@src/utils/data/parsers/json';
import { useAppSelector } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import JSONComposer from '@ui-toolkit/Composers/JSONComposer/JSONComposer';
import { TOptionJSONComposer } from '@ui-toolkit/Composers/JSONComposer/types';
import {
  FormFooter,
  FormsRow,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import P, { TPVariant } from '@ui-toolkit/P';
import { useState } from 'react';
import i18n from '@src/i18n';
import { ExporterProps, ExportFormats } from '../types';
import { createExportFileName } from '../utils/createExportFileName';
import { handleDownload } from '../utils/handleDownload';

const t = i18n.getFixedT(null, 'export');

type TranslationLineComposerOption = Omit<TOptionJSONComposer, 'value'> & {
  value: keyof TSubtitleLine;
};

const JSON_FIELD_OPTIONS: TranslationLineComposerOption[] = [
  { value: 'line_no', label: t('json.fieldOptions.lineNumber'), color: ThemeColors.BLUE },
  { value: 'start_time', label: t('json.fieldOptions.startTime'), color: ThemeColors.GREEN },
  { value: 'end_time', label: t('json.fieldOptions.endTime'), color: ThemeColors.FOREST },
  { value: 'input', label: t('json.fieldOptions.sourceText'), color: ThemeColors.SKY },
  { value: 'output', label: t('json.fieldOptions.translatedText'), color: ThemeColors.CYAN },
  { value: 'character', label: t('json.fieldOptions.character'), color: ThemeColors.PURPLE },
  { value: 'completed', label: t('json.fieldOptions.completed'), color: ThemeColors.ORANGE },
];

const DEFAULT_JSON_STRUCTURE: JsonExportStructure = JSON_FIELD_OPTIONS.map((option) => [
  option.value,
  option.value,
]);

export const ExportJSON = ({
  characters,
  targetFPS,
  sourceFPS,
  lines,
  targetLanguage,
}: ExporterProps) => {
  const showName = useAppSelector(selectProjectName) ?? '';
  const [structure, setStructure] = useState<JsonExportStructure>(DEFAULT_JSON_STRUCTURE);
  const errors = validateJsonStructure(structure);

  return (
    <>
      <FormsRow>
        <FormsSection>
          <FormsSectionTitle icon={TIcon.FORMAT_JSON}>{t('json.sectionTitle')}</FormsSectionTitle>
          <FormsSectionContent>
            <P variant={TPVariant.SECONDARY}>{t('json.objectStructureLabel')}</P>
            <JSONComposer
              options={JSON_FIELD_OPTIONS}
              value={structure}
              onChange={setStructure}
              errors={errors}
            />
          </FormsSectionContent>
        </FormsSection>
      </FormsRow>
      <FormFooter>
        <Button
          icon={TIcon.FORMAT_JSON}
          variant={TButtonVariant.SPECIAL}
          style={{ justifySelf: 'center' }}
          disabled={errors.length > 0}
          onClick={() => {
            const result = exportAsJson(
              lines,
              parseFloat(sourceFPS),
              parseFloat(targetFPS),
              structure
            );
            handleDownload({
              format: ExportFormats.JSON,
              suggestedFileName: `${createExportFileName(showName, characters)}`,
              exportText: result,
              targetLanguage,
            });
          }}
        >
          {t('json.exportButton')}
        </Button>
      </FormFooter>
    </>
  );
};
