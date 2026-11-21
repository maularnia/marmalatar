import { media } from '@src/services/media';
import CharacterPoolSettings from '@src/partials/CharacterPoolSettings';
import { SpellcheckSettings } from '@src/partials/SpellcheckSettings';
import TempoSettings from '@src/partials/TempoSettings';
import { editor } from '@src/services/project';
import { CSSVar } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import Hr, { THrVariant } from '@ui-toolkit/Hr/Hr';
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
  const [
    isEditMode,
    timelineDurationMs,
    waveformPeaks,
    translationLines,
    activeLineIndex,
    focusedLineIndex,
  ] = useAppSelectors(
    editor.selectIsEditMode,
    editor.selectTimelineDurationMs,
    media.selectWaveformPeaks,
    editor.selectLines,
    media.selectActiveLineIndex,
    editor.selectFocusedLineIndex
  );
  return (
    <Aside tabIndex={1}>
      {/* Always there: an empty black player and a flat waveform until a video is picked */}
      <AsideVideoContainer>
        <AsideVideoWrapper>
          <VideoPlayer />
        </AsideVideoWrapper>
        <Waveform
          peaks={waveformPeaks}
          videoDurationMs={timelineDurationMs}
          activeLineIndex={activeLineIndex}
          focusedLineIndex={focusedLineIndex}
          translationLines={translationLines}
          onLineTimingChange={(lineIndex, startTime, endTime) => {
            editor.updateLineTiming({ lineIndex, startTime, endTime });
          }}
        />
      </AsideVideoContainer>
      <Hr variant={THrVariant.TRANSPARENT} />
      {!isEditMode && <AiTranslationStatusPanel />}
      {/* The same tempo (subtitle limits) section as the Settings overlay's Project tab */}
      <TempoSettings />
      {/* The same characters section as the Settings overlay's Project tab */}
      <CharacterPoolSettings />
      {/* The same spellcheck switch and dictionaries as the Settings overlay's Spellchecker tab */}
      <SpellcheckSettings />
    </Aside>
  );
}
