import { TSubtitleLine } from '@src/types';
import i18n from '@src/i18n';
import { convertTimeByFps } from '@utils/time';

const t = i18n.getFixedT(null, 'errors');

type JsonExportEntry = [fieldName: string, sourceField: string];
export type JsonExportStructure = JsonExportEntry[];

export function exportAsJson(
  lines: TSubtitleLine[],
  sourceFps: number,
  targetFps: number,
  structure: JsonExportStructure
): string {
  const payload = lines.map((line) => {
    const result: Record<string, unknown> = {};
    for (const [fieldName, sourceField] of structure) {
      switch (sourceField) {
        case 'start_time':
          result[fieldName] = convertTimeByFps(line.start_time, sourceFps, targetFps);
          break;
        case 'end_time':
          result[fieldName] = convertTimeByFps(line.end_time, sourceFps, targetFps);
          break;
        default:
          result[fieldName] = line[sourceField as keyof TSubtitleLine];
      }
    }
    return result;
  });

  return JSON.stringify(payload, null, 2);
}

export function validateJsonStructure(structure: JsonExportStructure): string[] {
  const errors: string[] = [];
  const fieldNames = structure.map(([fieldName]) => fieldName);

  if (fieldNames.includes('')) {
    errors.push(t('json.fieldNamesEmpty'));
  }

  const duplicates = new Set(
    fieldNames.filter(
      (fieldName, index) => fieldName !== '' && fieldNames.indexOf(fieldName) !== index
    )
  );
  duplicates.forEach((fieldName) => errors.push(t('json.duplicateFieldName', { fieldName })));

  return errors;
}
