import { selectProjectName } from '@src/store/slices/project';
import { exportAsSrt } from '@src/utils/data/parsers/srt';
import { useAppSelector } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import { FormFooter } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { useTranslation } from 'react-i18next';
import { ExporterProps, ExportFormats } from '../types';
import { createExportFileName } from '../utils/createExportFileName';
import { handleDownload } from '../utils/handleDownload';

export const ExportSRT = ({
  lines,
  targetFPS,
  sourceFPS,
  characters,
  targetLanguage,
}: ExporterProps) => {
  const { t } = useTranslation('export');
  const showName = useAppSelector(selectProjectName) ?? '';
  return (
    <FormFooter>
      <Button
        icon={TIcon.FORMAT_SUBTITLE}
        variant={TButtonVariant.SPECIAL}
        style={{ justifySelf: 'flex-start' }}
        onClick={() => {
          const result: string = exportAsSrt(lines, parseFloat(sourceFPS), parseFloat(targetFPS));
          handleDownload({
            format: ExportFormats.SRT,
            suggestedFileName: `${createExportFileName(showName, characters)}`,
            exportText: result,
            targetLanguage,
          });
        }}
      >
        {t('srt.exportButton')}
      </Button>
    </FormFooter>
  );
};
