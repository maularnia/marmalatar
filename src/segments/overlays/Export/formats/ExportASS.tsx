import { selectProjectName } from '@src/store/slices/project';
import { exportAsAss } from '@src/utils/data/parsers/ass';
import { useAppSelector } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import { FormFooter } from '@ui-toolkit/forms';
import { useTranslation } from 'react-i18next';
import { ExporterProps, ExportFormats } from '../types';
import { createExportFileName } from '../utils/createExportFileName';
import { handleDownload } from '../utils/handleDownload';

export function ExportASS({
  sourceFPS,
  targetFPS,
  characters,
  lines,
  targetLanguage,
}: ExporterProps) {
  const { t } = useTranslation('export');
  const showName = useAppSelector(selectProjectName) ?? '';
  return (
    <FormFooter>
      <Button
        variant={TButtonVariant.SPECIAL}
        style={{ justifySelf: 'flex-start' }}
        onClick={() => {
          const result: string = exportAsAss(lines, parseFloat(sourceFPS), parseFloat(targetFPS));
          handleDownload({
            format: ExportFormats.JSON,
            suggestedFileName: `${createExportFileName(showName, characters)}`,
            exportText: result,
            targetLanguage: targetLanguage,
          });
        }}
      >
        {t('ass.exportButton')}
      </Button>
    </FormFooter>
  );
}
