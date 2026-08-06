import { TSubtitleLine } from '@src/types';
import i18n from '@src/i18n';

const t = i18n.getFixedT(null, 'export');

export enum ExportFormats {
  'JSON' = 'json',
  'CSV' = 'csv',
  'ASS' = 'ass',
  'SRT' = 'srt',
}
export const ExportFormatlabels: { [key in ExportFormats]: string } = {
  [ExportFormats.ASS]: t('formats.ass'),
  [ExportFormats.CSV]: t('formats.csv'),
  [ExportFormats.JSON]: t('formats.json'),
  [ExportFormats.SRT]: t('formats.srt'),
};

export enum FrameRate {
  'FPS24' = '24',
  'FPS25' = '25',
  'FPS23P976' = '23.976',
  'FPS23P97' = '23.97',
}

export type ExporterProps = {
  sourceFPS: FrameRate;
  targetFPS: FrameRate;
  lines: TSubtitleLine[];
  targetLanguage: string;
  characters: string[];
};
