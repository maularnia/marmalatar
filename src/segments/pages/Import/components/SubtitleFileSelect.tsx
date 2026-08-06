import FileSelectButton from '@ui-toolkit/FileSelectButton/FileSelectButton';
import {
  FormSectionEntry,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Span from '@ui-toolkit/Span';
import Toggle from '@ui-toolkit/Toggle';
import { parseAss } from '@src/utils/data/parsers/ass';
import { parseSrt } from '@src/utils/data/parsers/srt';
import { cleanupEntries } from '@src/utils/data/entryCleanup';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { TSubtitleLine } from '@src/types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const t = i18n.getFixedT(null, 'errors');

type TCleanupOptions = {
  clearHtml: boolean;
  clearExtendedFormatting: boolean;
  clearSquareBrackets: boolean;
  fixShortDashes: boolean;
};

function parseSubtitleFile(file: File, text: string): TSubtitleLine[] {
  const normalizedName = file.name.toLowerCase();
  if (normalizedName.endsWith('.srt')) {
    return parseSrt(text);
  }
  if (normalizedName.endsWith('.ass')) {
    return parseAss(text);
  }
  throw new Error(t('subtitleFileSelect.unsupportedFormat'));
}

function applyCleanup(lines: TSubtitleLine[], options: TCleanupOptions): TSubtitleLine[] {
  const cleaned = cleanupEntries(
    lines,
    {
      cleanHtmlTags: options.clearHtml,
      cleanAssStyling: options.clearExtendedFormatting,
      cleanAudioCues: options.clearSquareBrackets,
      fixShortDashes: options.fixShortDashes,
    },
    (line) => line.input,
    (line, text) => ({ ...line, input: text, output: text })
  );
  return cleaned.map((line, index) => ({ ...line, line_no: index + 1 }));
}

type SubtitleFileSelectProps = {
  name?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  onBlur?: () => void;
  onError: (message: string | null) => void;
  onLinesChange: (lines: TSubtitleLine[]) => void;
};

export default function SubtitleFileSelect({
  name,
  value,
  onChange,
  onBlur,
  onError,
  onLinesChange,
}: SubtitleFileSelectProps) {
  const { t: tImport } = useTranslation('import');
  const [subtitleFileText, setSubtitleFileText] = useState<string>('');
  const [rawParsedLines, setRawParsedLines] = useState<TSubtitleLine[]>([]);
  const [subtitlesParseError, setSubtitlesParseError] = useState<string | null>(null);
  const [clearHtml, setClearHtml] = useState(true);
  const [clearExtendedFormatting, setClearExtendedFormatting] = useState(true);
  const [clearSquareBrackets, setClearSquareBrackets] = useState(true);
  const [fixShortDashes, setFixShortDashes] = useState(true);

  useEffect(() => {
    if (!value) {
      setSubtitleFileText('');
      setRawParsedLines([]);
      setSubtitlesParseError(null);
      return;
    }

    void value
      .text()
      .then((text) => {
        setSubtitleFileText(text);
      })
      .catch((error: unknown) => {
        setRawParsedLines([]);
        setSubtitlesParseError(
          error instanceof Error ? error.message : t('subtitleFileSelect.parseFailedFallback')
        );
      });
  }, [value]);

  useEffect(() => {
    if (!value || !subtitleFileText) {
      return;
    }
    try {
      const parsed = parseSubtitleFile(value, subtitleFileText);
      setRawParsedLines(parsed);
      setSubtitlesParseError(null);
    } catch (error: unknown) {
      setRawParsedLines([]);
      setSubtitlesParseError(
        error instanceof Error ? error.message : t('subtitleFileSelect.parseFailedFallback')
      );
    }
  }, [
    clearExtendedFormatting,
    clearHtml,
    clearSquareBrackets,
    fixShortDashes,
    subtitleFileText,
    value,
  ]);

  const cleanedLines = useMemo(() => {
    return applyCleanup(rawParsedLines, {
      clearHtml,
      clearExtendedFormatting,
      clearSquareBrackets,
      fixShortDashes,
    });
  }, [clearExtendedFormatting, clearHtml, clearSquareBrackets, fixShortDashes, rawParsedLines]);

  useEffect(() => {
    onLinesChange(cleanedLines);
  }, [cleanedLines, onLinesChange]);

  useEffect(() => {
    if (!value) {
      onError(t('subtitleFileSelect.fileRequired'));
      return;
    }
    if (subtitlesParseError) {
      onError(subtitlesParseError);
      return;
    }
    if (!cleanedLines.length) {
      onError(t('subtitleFileSelect.noValidLines'));
      setSubtitlesParseError(t('subtitleFileSelect.noValidLines'));
      return;
    }
    onError(null);
  }, [value, subtitlesParseError, cleanedLines, onError]);

  return (
    <FormsSection>
      <FormsSectionTitle
        icon={TIcon.CC}
        subtext={
          cleanedLines.length
            ? tImport('subtitles.linesToProcessSubtext', { count: cleanedLines.length })
            : tImport('subtitles.supportedFormats')
        }
      >
        {tImport('subtitles.sectionTitle')}
      </FormsSectionTitle>
      <FormsSectionContent>
        <FormSectionEntry>
          <FileSelectButton
            name={name}
            color={ThemeColors.ACCENT2}
            label={value?.name ?? tImport('shared.noFileSelected')}
            accept=".srt,.ass"
            errors={subtitlesParseError ? [subtitlesParseError] : undefined}
            onBlur={onBlur}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              onChange(file);
              event.currentTarget.value = '';
            }}
          >
            {tImport('shared.selectFileButton')}
          </FileSelectButton>
        </FormSectionEntry>
      </FormsSectionContent>
      {value && (
        <FormsSectionContent>
          <FormSectionEntry>
            <Toggle
              checked={clearHtml}
              onChange={(event) => setClearHtml(event.currentTarget.checked)}
            >
              <Span>{tImport('subtitles.dropHtmlTags')}</Span>
            </Toggle>
          </FormSectionEntry>
          <FormSectionEntry>
            <Toggle
              checked={clearExtendedFormatting}
              onChange={(event) => setClearExtendedFormatting(event.currentTarget.checked)}
            >
              <Span>{tImport('subtitles.dropExtendedFormattingPrefix')}</Span>
              <Span color={ThemeColors.ACCENT2}>
                {' '}
                <b>{'{}'}</b> {tImport('subtitles.dropExtendedFormattingSuffix')}
              </Span>
            </Toggle>
          </FormSectionEntry>
          <FormSectionEntry>
            <Toggle
              checked={clearSquareBrackets}
              onChange={(event) => setClearSquareBrackets(event.currentTarget.checked)}
            >
              <Span>{tImport('subtitles.removeAudioCuesPrefix')}</Span>
              <Span color={ThemeColors.ACCENT2}> {tImport('subtitles.removeAudioCuesSuffix')}</Span>
            </Toggle>
          </FormSectionEntry>
          <FormSectionEntry>
            <Toggle
              checked={fixShortDashes}
              onChange={(event) => setFixShortDashes(event.currentTarget.checked)}
            >
              <Span>{tImport('subtitles.fixShortDashes')}</Span>
            </Toggle>
          </FormSectionEntry>
        </FormsSectionContent>
      )}
    </FormsSection>
  );
}
