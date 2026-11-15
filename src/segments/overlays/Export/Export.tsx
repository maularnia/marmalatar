import { settings } from '@src/services/settings';
import { exporterList } from './formats/list';
import { ExportFormatlabels, ExportFormats, FrameRate } from './types';
import Overlay from '@src/segments/overlays/Overlay';
import { editor } from '@src/services/project';
import { projects } from '@src/services/project';
import { ThemeColors } from '@src/theme/utils';
import { LANGUAGE_LABELS, TCharacter } from '@src/types';
import { useAppSelectors } from '@store/hooks';
import TextInput from '@ui-toolkit/TextInput';
import Toggle from '@ui-toolkit/Toggle';
import {
  FormRoot,
  FormsContent,
  FormsRow,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import Select from '@ui-toolkit/Select/Select';
import type { TOptionSelect } from '@ui-toolkit/Select/types';
import { AUTO_MERGE_THRESHOLD_DEFAULT } from '@src/consts';
import { parseCharacterList } from '@utils/characters';
import { mergeSameCharacterLines } from '@utils/data/mergeSameCharacterLines';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

enum SpecialCharacterOptions {
  ALL = 'All',
}

interface CharacterOption extends TOptionSelect {
  value: TCharacter['name'] | SpecialCharacterOptions;
  label: TCharacter['name'] | SpecialCharacterOptions;
  color: TCharacter['color'];
}

export default function Export() {
  const { t } = useTranslation('export');
  const [translationLines, characterPool, targetLanguage, isEditMode] = useAppSelectors(
    editor.selectLines,
    editor.selectCharacterPool,
    projects.selectTargetLanguage,
    editor.selectIsEditMode
  );

  const formatOptions = Object.values(ExportFormats).map((format) => ({
    value: format,
    label: ExportFormatlabels[format],
  }));
  const characterOptions: CharacterOption[] = characterPool.map((character) => ({
    value: character.name,
    label: character.name,
    color: character.color,
  }));
  const fpsOptions = Object.values(FrameRate).map(
    (fps) =>
      ({
        value: fps,
        label: fps,
      }) as TOptionSelect
  );

  const [format, setFormat] = useState<ExportFormats>(ExportFormats.CSV);
  const Exporter = exporterList[format];
  const [sourceFps, setSourceFps] = useState<FrameRate>(FrameRate.FPS23P976);
  const [resultFps, setResultFps] = useState<FrameRate>(FrameRate.FPS23P976);
  const [characterFilter, setCharacterFilter] = useState<string[]>([]);
  const [applyCharacterFilter, setApplyCharacterFilter] = useState<boolean>(false);
  const [applyTimeCorrection, setApplyTimeCorrection] = useState<boolean>(false);
  const [applyLineMerge, setApplyLineMerge] = useState<boolean>(false);
  // The merge threshold is chosen per export, here, and not kept anywhere. The field holds what's
  // typed; merging uses the last valid value (a whole number of ms, at least 1).
  const [mergeThresholdInput, setMergeThresholdInput] = useState(
    String(AUTO_MERGE_THRESHOLD_DEFAULT)
  );
  const [mergeThreshold, setMergeThreshold] = useState(AUTO_MERGE_THRESHOLD_DEFAULT);
  const mergeThresholdError = (() => {
    if (!mergeThresholdInput.trim()) return t('mergeLines.thresholdRequired');
    const value = Number(mergeThresholdInput);
    return Number.isInteger(value) && value >= 1 ? null : t('mergeLines.thresholdMin');
  })();

  // Gated on the checkbox itself, not just on `characterFilter`/`sourceFps`/`resultFps` being at
  // their reset defaults -- the inputs are also reset when their checkbox is unchecked, but that's
  // a UX nicety, not something export should have to rely on for correctness.
  const filteredLines = useMemo(() => {
    if (
      !applyCharacterFilter ||
      characterFilter.length === 0 ||
      characterFilter.includes(SpecialCharacterOptions.ALL)
    ) {
      return translationLines;
    }

    const selectedCharacters = new Set(characterFilter);

    return translationLines.filter((line) =>
      parseCharacterList(line.character).some((character) => selectedCharacters.has(character))
    );
  }, [applyCharacterFilter, characterFilter, translationLines]);

  // Merging is the last step before the lines reach the exporter, so it works on exactly what's
  // exported: the filtered lines, with the edited column as the output
  const exportLines = useMemo(() => {
    const columnLines = isEditMode
      ? filteredLines.map((l) => ({ ...l, output: l.input }))
      : filteredLines;
    return applyLineMerge ? mergeSameCharacterLines(columnLines, mergeThreshold) : columnLines;
  }, [filteredLines, isEditMode, applyLineMerge, mergeThreshold]);

  const effectiveSourceFps = applyTimeCorrection ? sourceFps : FrameRate.FPS23P976;
  const effectiveResultFps = applyTimeCorrection ? resultFps : FrameRate.FPS23P976;
  return (
    <Overlay title={t('overlayTitle')} onClose={() => settings.closeExport()}>
      <FormRoot>
        <FormsContent>
          <FormsRow>
            <FormsSection>
              <FormsSectionTitle
                icon={TIcon.PERSON}
                subtext={t('characterFilter.subtext')}
                after={
                  <Toggle
                    checked={applyCharacterFilter}
                    onChange={(e) => {
                      setApplyCharacterFilter(e.currentTarget.checked);
                      if (!e.currentTarget.checked) {
                        setCharacterFilter([]);
                      }
                    }}
                  />
                }
              >
                {t('characterFilter.title')}
              </FormsSectionTitle>
              {applyCharacterFilter ? (
                <FormsSectionContent>
                  <Select
                    options={characterOptions}
                    value={characterFilter}
                    multiple={true}
                    placeholder={t('characterFilter.selectPlaceholder')}
                    onChange={(value) => setCharacterFilter(value)}
                  />
                </FormsSectionContent>
              ) : null}
            </FormsSection>
          </FormsRow>
          <FormsRow>
            <FormsSection>
              <FormsSectionTitle
                icon={TIcon.TIME_CONFIG}
                subtext={t('fpsCorrection.subtext')}
                after={
                  <Toggle
                    checked={applyTimeCorrection}
                    onChange={(e) => {
                      setApplyTimeCorrection(e.currentTarget.checked);
                      if (!e.currentTarget.checked) {
                        setSourceFps(FrameRate.FPS23P976);
                        setResultFps(FrameRate.FPS23P976);
                      }
                    }}
                  />
                }
              >
                {t('fpsCorrection.title')}
              </FormsSectionTitle>
              {applyTimeCorrection && (
                <FormsSectionContent $columns={3} $templateColumns={'1fr min-content 1fr'}>
                  <Select
                    multiple={false}
                    options={fpsOptions}
                    value={String(sourceFps)}
                    onChange={(value) => {
                      const normalizedValue = Array.isArray(value) ? value : [value];
                      setSourceFps(normalizedValue[0] as FrameRate);
                    }}
                  />
                  <Icon
                    style={{ alignSelf: 'center' }}
                    icon={TIcon.ARROW_RIGHT}
                    size={TIconSize.S}
                  />
                  <Select
                    multiple={false}
                    options={fpsOptions}
                    value={String(resultFps)}
                    onChange={(value) => {
                      const normalizedValue = Array.isArray(value) ? value : [value];
                      setResultFps(normalizedValue[0] as FrameRate);
                    }}
                  />
                </FormsSectionContent>
              )}
            </FormsSection>
          </FormsRow>
          <FormsRow>
            <FormsSection>
              <FormsSectionTitle
                icon={TIcon.MERGE}
                subtext={t('mergeLines.subtext')}
                after={
                  <Toggle
                    checked={applyLineMerge}
                    onChange={(e) => setApplyLineMerge(e.currentTarget.checked)}
                  />
                }
              >
                {t('mergeLines.title')}
              </FormsSectionTitle>
              {applyLineMerge && (
                <FormsSectionContent $columns={2}>
                  <TextInput
                    icon={TIcon.SPACING}
                    value={mergeThresholdInput}
                    errors={mergeThresholdError ? [mergeThresholdError] : []}
                    onChange={(e) => {
                      const text = e.currentTarget.value;
                      setMergeThresholdInput(text);
                      const value = Number(text);
                      if (text.trim() && Number.isInteger(value) && value >= 1) {
                        setMergeThreshold(value);
                      }
                    }}
                  >
                    {t('mergeLines.thresholdLabel')}
                  </TextInput>
                </FormsSectionContent>
              )}
            </FormsSection>
          </FormsRow>
          <FormsRow>
            <FormsSection>
              <FormsSectionTitle icon={TIcon.FILE}>{t('outputFormat.title')}</FormsSectionTitle>
              <FormsSectionContent $columns={2}>
                <Select
                  options={formatOptions}
                  value={format}
                  onChange={(value) => setFormat(value[0])}
                />
              </FormsSectionContent>
            </FormsSection>
          </FormsRow>
          {isEditMode && (
            <FormsRow>
              <Message
                type={TMessageVariant.SECONDARY}
                size={TMessageSize.S}
                color={ThemeColors.ACCENT2}
              >
                {t('editModeBanner')}
              </Message>
            </FormsRow>
          )}
          <Exporter
            targetFPS={effectiveResultFps}
            sourceFPS={effectiveSourceFps}
            lines={exportLines}
            targetLanguage={targetLanguage ? LANGUAGE_LABELS[targetLanguage] : ''}
            characters={
              !applyCharacterFilter || !characterFilter.length
                ? [SpecialCharacterOptions.ALL]
                : characterFilter
            }
          />
        </FormsContent>
      </FormRoot>
    </Overlay>
  );
}
