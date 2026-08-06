import { useVideo } from '@providers/VideoProvider';
import GeneralSettings from '@src/partials/Settings';
import { selectActiveLineIndex, selectLines, updateLineTiming } from '@src/store/slices/editor';
import { selectIsEditMode, selectVideoFilePath } from '@src/store/slices/project';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppDispatch, useAppSelector } from '@store/hooks';
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
import { shallowEqual } from 'react-redux';
import styled from 'styled-components';
import { useVideoFileSwap } from '../../components/VideoPlayer/useVideoFileSwap';
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

const AsideVideoContainer = styled.div``;
const AsideVideoWrapper = styled.div`
  margin-bottom: calc(${CSSVar('waveformSpacingY')} * -1);
`;

export default function EditorAside() {
  const { t } = useTranslation(['editorAside', 'app']);
  const dispatch = useAppDispatch();
  const isEditMode = useAppSelector(selectIsEditMode);
  const { translationLines, activeLineIndex } = useAppSelector(
    (state) => ({
      translationLines: selectLines(state),
      activeLineIndex: selectActiveLineIndex(state),
    }),
    shallowEqual
  );
  const { videoDurationMs, waveformPeaks } = useVideo();
  const videoFilePath = useAppSelector(selectVideoFilePath);
  const { swapVideo } = useVideoFileSwap();
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
            translationLines={translationLines}
            onLineTimingChange={(lineIndex, startTime, endTime) => {
              dispatch(updateLineTiming({ lineIndex, startTime, endTime }));
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
                  <Button style={{ alignSelf: 'flex-start' }} onClick={swapVideo}>
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
    </Aside>
  );
}
