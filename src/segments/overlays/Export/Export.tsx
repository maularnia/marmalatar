import { exporterList } from './formats/list';
import { ExportFormatlabels, ExportFormats, FrameRate } from './types';
import Overlay from '@src/segments/overlays/Overlay';
import { selectCharacterPool, selectLines } from '@src/store/slices/editor';
import { closeOverlays } from '@src/store/slices/overlays';
import { selectIsEditMode, selectProjectTargetLanguage } from '@src/store/slices/project';
import { ThemeColors } from '@src/theme/utils';
import { LANGUAGE_LABELS, TCharacter } from '@src/types';
import { useAppDispatch, useAppSelector } from '@store/hooks';
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
import Select, { TOptionSelect } from '@ui-toolkit/Select/Select';
import { parseCharacterList } from '@utils/characters';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

enum SpecialCharacterOptions {
  'ALL' = 'All',
}

interface CharacterOption extends TOptionSelect {
  value: TCharacter['name'] | SpecialCharacterOptions;
  label: TCharacter['name'] | SpecialCharacterOptions;
  color: TCharacter['color'];
}

export default function Export() {
  const { t } = useTranslation('export');
  const dispatch = useAppDispatch();
  const translationLines = useAppSelector(selectLines);
  const characterPool = useAppSelector(selectCharacterPool);
  const targetLanguage = useAppSelector(selectProjectTargetLanguage);
  const isEditMode = useAppSelector(selectIsEditMode);

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

  const exportLines = useMemo(
    () => (isEditMode ? filteredLines.map((l) => ({ ...l, output: l.input })) : filteredLines),
    [filteredLines, isEditMode]
  );

  const effectiveSourceFps = applyTimeCorrection ? sourceFps : FrameRate.FPS23P976;
  const effectiveResultFps = applyTimeCorrection ? resultFps : FrameRate.FPS23P976;
  return (
    <Overlay onClose={() => dispatch(closeOverlays())}>
      <FormRoot>
        <FormsContent>
          <FormsRow>
            <FormsSection>
              <FormsSectionTitle icon={TIcon.PERSON} subtext={t('characterFilter.subtext')}>
                {t('characterFilter.title')}
              </FormsSectionTitle>
              <FormsSectionContent>
                <Toggle
                  checked={applyCharacterFilter}
                  onChange={(e) => {
                    setApplyCharacterFilter(e.currentTarget.checked);
                    if (!e.currentTarget.checked) {
                      setCharacterFilter([]);
                    }
                  }}
                >
                  {t('characterFilter.checkboxLabel')}
                </Toggle>
              </FormsSectionContent>
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
              <FormsSectionTitle icon={TIcon.TIME_CONFIG} subtext={t('fpsCorrection.subtext')}>
                {t('fpsCorrection.title')}
              </FormsSectionTitle>
              <FormsSectionContent>
                <Toggle
                  checked={applyTimeCorrection}
                  onChange={(e) => {
                    setApplyTimeCorrection(e.currentTarget.checked);
                    if (!e.currentTarget.checked) {
                      setSourceFps(FrameRate.FPS23P976);
                      setResultFps(FrameRate.FPS23P976);
                    }
                  }}
                >
                  {t('fpsCorrection.checkboxLabel')}
                </Toggle>
              </FormsSectionContent>
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
