import { ExportFormats } from '../types';

type HandlerDownloadParams = {
  format: ExportFormats;
  suggestedFileName: string;
  exportText: string;
  targetLanguage: string;
};
export const handleDownload = ({
  format,
  suggestedFileName,
  exportText,
  targetLanguage,
}: HandlerDownloadParams) => {
  const mimeType = format === ExportFormats.JSON ? 'application/json' : 'text/plain;charset=utf-8';

  const blob = new Blob([exportText], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${suggestedFileName}[${targetLanguage}].${format}`;
  anchor.click();

  URL.revokeObjectURL(url);
};
