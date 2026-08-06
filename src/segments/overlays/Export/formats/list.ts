import { ComponentType } from 'react';
import { ExporterProps, ExportFormats } from '../types';
import { ExportASS } from './ExportASS';
import { ExportCSV } from './ExportCSV';
import { ExportJSON } from './ExportJSON';
import { ExportSRT } from './ExportSRT';

export const exporterList: { [key in ExportFormats]: ComponentType<ExporterProps> } = {
  [ExportFormats.CSV]: ExportCSV,
  [ExportFormats.JSON]: ExportJSON,
  [ExportFormats.ASS]: ExportASS,
  [ExportFormats.SRT]: ExportSRT,
};
