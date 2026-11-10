import { projects } from '@src/services/project';
import { media } from '@src/services/media';
import GeneralSettings from '@src/partials/Settings';
import { SpellcheckSettings } from '@src/partials/SpellcheckSettings';
import { editor } from '@src/services/project';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import {
  FormRoot,
  FormSectionEntry,
  FormsRow,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import Hr, { THrVariant } from '@ui-toolkit/Hr/Hr';
import { TIcon } from '@ui-toolkit/Icon/icons';
import P, { TPVariant } from '@ui-toolkit/P';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import VideoPlayer from '../../components/VideoPlayer/VideoPlayer';
import Waveform from '../../components/Waveform/Waveform';
import AiTranslationStatusPanel from './components/AiTranslationStatusPanel';

const Aside = styled.div`
  z-index: 20;
  max-width: ${CSSVar('appScreenWidth')};
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('size10')};
  overflow-y: scroll;
  overflow-x: hidden;
  &::-webkit-scrollbar {
    width: ${CSSVar('appScrollbarWidth')};
  }

  &::-webkit-scrollbar-track {
    background: ${CSSVar('appScrollbarTrackColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }

  &::-webkit-scrollbar-thumb {
    background: ${CSSVar('appScrollbarThumbColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
`;

const AsideVideoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('size6')};
`;
const AsideVideoWrapper = styled.div``;

export default function EditorAside() {
  const { t } = useTranslation(['editorAside', 'app']);
  const [
    isEditMode,
    videoDurationMs,
    waveformPeaks,
    videoFilePath,
    translationLines,
    activeLineIndex,
    focusedLineIndex,
  ] = useAppSelectors(
    editor.selectIsEditMode,
    media.selectVideoDurationMs,
    media.selectWaveformPeaks,
    media.selectVideoFilePath,
    editor.selectLines,
    media.selectActiveLineIndex,
    editor.selectFocusedLineIndex
  );
  return (
    <Aside tabIndex={1}>
      {videoFilePath && (
        <AsideVideoContainer>
          <AsideVideoWrapper>
            <VideoPlayer />
          </AsideVideoWrapper>
          <Waveform
            peaks={waveformPeaks}
            videoDurationMs={videoDurationMs}
            activeLineIndex={activeLineIndex}
            focusedLineIndex={focusedLineIndex}
            translationLines={translationLines}
            onLineTimingChange={(lineIndex, startTime, endTime) => {
              editor.updateLineTiming({ lineIndex, startTime, endTime });
            }}
          />
        </AsideVideoContainer>
      )}
      {!videoFilePath && (
        <FormRoot>
          <FormsRow>
            <FormsSection>
              <FormsSectionTitle icon={TIcon.VIDEO} subtext={t('video.subtext')}>
                {t('video.title')}
              </FormsSectionTitle>
              <FormsSectionContent>
                <FormSectionEntry>
                  <Button
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => void projects.changeVideo()}
                  >
                    {t('video.pickVideoButton')}
                  </Button>
                </FormSectionEntry>
                <FormSectionEntry>
                  <P color={ThemeColors.TEXT} variant={TPVariant.TERTIARY}>
                    {t('app:video.supportedFormats')}
                  </P>
                  <P color={ThemeColors.TEXT} variant={TPVariant.TERTIARY}>
                    {t('app:video.supportedCodecs')}
                  </P>
                </FormSectionEntry>
              </FormsSectionContent>
            </FormsSection>
          </FormsRow>
        </FormRoot>
      )}
      <Hr variant={THrVariant.DIMMED} />
      {!isEditMode && <AiTranslationStatusPanel />}
      <GeneralSettings />
      {/* Was part of the UI/UX section until the settings overlay got a Spellchecker tab */}
      <SpellcheckSettings />
    </Aside>
  );
}
