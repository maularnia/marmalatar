import { selectProjectName } from '@src/store/slices/project';
import { ThemeColors } from '@src/theme/utils';
import {
  DEFAULT_CSV_COLUMN_FORMULA,
  DEFAULT_CSV_TIME_FORMAT,
  exportAsCsv,
} from '@src/utils/data/parsers/csv';
import { useAppSelector } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import LineComposer from '@ui-toolkit/Composers/LineComposer/LineComposer';
import { TOptionLineComposer } from '@ui-toolkit/Composers/LineComposer/types';
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

const CSV_COLUMN_OPTIONS: TOptionLineComposer[] = [
  { value: '{line_number}', label: t('csv.columnOptions.lineNumber'), color: ThemeColors.BLUE },
  { value: '{start_time}', label: t('csv.columnOptions.start'), color: ThemeColors.GREEN },
  { value: '{end_time}', label: t('csv.columnOptions.end'), color: ThemeColors.FOREST },
  { value: '{character}', label: t('csv.columnOptions.character'), color: ThemeColors.PURPLE },
  { value: '{text}', label: t('csv.columnOptions.text'), color: ThemeColors.CYAN },
  { value: '{completed}', label: t('csv.columnOptions.completed'), color: ThemeColors.ORANGE },
];

const CSV_TIME_FORMAT_OPTIONS: TOptionLineComposer[] = [
  { value: '{hh}', label: t('csv.timeFormatOptions.hours'), color: ThemeColors.SKY },
  { value: '{mm}', label: t('csv.timeFormatOptions.minutes'), color: ThemeColors.MINT },
  { value: '{ss}', label: t('csv.timeFormatOptions.seconds'), color: ThemeColors.GOLD },
  { value: '{ff}', label: t('csv.timeFormatOptions.frames'), color: ThemeColors.VIOLET },
  { value: '{mmm}', label: t('csv.timeFormatOptions.milliseconds'), color: ThemeColors.ROSE },
  { value: '{abs_ms}', label: t('csv.timeFormatOptions.absoluteMs'), color: ThemeColors.AQUA },
];

export const ExportCSV = ({
  lines,
  targetFPS,
  sourceFPS,
  characters,
  targetLanguage,
}: ExporterProps) => {
  const [formula, setFormula] = useState<string>(DEFAULT_CSV_COLUMN_FORMULA);
  const [timeFormat, setTimeFormat] = useState<string>(DEFAULT_CSV_TIME_FORMAT);
  const showName = useAppSelector(selectProjectName) ?? '';
  return (
    <>
      <FormsRow>
        <FormsSection>
          <FormsSectionTitle icon={TIcon.FORMAT_CSV}>{t('csv.sectionTitle')}</FormsSectionTitle>
          <FormsSectionContent>
            <P variant={TPVariant.SECONDARY}>{t('csv.rowTemplateLabel')}</P>
            <LineComposer
              options={CSV_COLUMN_OPTIONS}
              separator=","
              allowDuplicates={false}
              value={formula
                .split(',')
                .map((token) => token.trim())
                .filter(Boolean)}
              onChange={(tokens) => setFormula(tokens.join(','))}
            />
          </FormsSectionContent>
          <FormsSectionContent>
            <P variant={TPVariant.SECONDARY}>{t('csv.timeFormatLabel')}</P>
            <LineComposer
              options={CSV_TIME_FORMAT_OPTIONS}
              separator=":"
              allowDuplicates={false}
              value={timeFormat
                .split(':')
                .map((token) => token.trim())
                .filter(Boolean)}
              onChange={(tokens) => setTimeFormat(tokens.join(':'))}
            />
          </FormsSectionContent>
        </FormsSection>
      </FormsRow>
      <FormFooter>
        <Button
          icon={TIcon.FORMAT_CSV}
          variant={TButtonVariant.SPECIAL}
          style={{ justifySelf: 'center' }}
          onClick={() => {
            const result: string = exportAsCsv(
              lines,
              parseFloat(sourceFPS),
              parseFloat(targetFPS),
              formula,
              timeFormat
            );
            handleDownload({
              format: ExportFormats.CSV,
              suggestedFileName: `${createExportFileName(showName, characters)}`,
              exportText: result,
              targetLanguage: targetLanguage,
            });
          }}
        >
          {t('csv.exportButton')}
        </Button>
      </FormFooter>
    </>
  );
};
