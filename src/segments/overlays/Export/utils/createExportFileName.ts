import { formatToFileName } from '@utils/string';

export const createExportFileName = (name: string, characters: string[]) => {
  return `${formatToFileName(name)}[${characters.map((c) => formatToFileName(c)).join(',')}]`;
};
