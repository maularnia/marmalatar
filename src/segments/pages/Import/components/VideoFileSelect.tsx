import { VideoFileProcessingStatusToMessage, VideoFilesProcessingStatusToColor } from '@src/consts';
import { emitAudioExtractionFailedMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { useVideo } from '@src/providers/VideoProvider';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TWaveformStatus } from '@src/types';
import { toErrorMessage } from '@src/utils/toErrorMessage';
import FileSelectButton from '@ui-toolkit/FileSelectButton/FileSelectButton';
import {
  FormSectionEntry,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import P, { TPVariant } from '@ui-toolkit/P';
import Toggle from '@ui-toolkit/Toggle';
import { checkAudioPlayability, checkVideoDecodable } from '@utils/checkVideoPlayability';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const MessageFullWidth = styled(Message)`
  align-self: stretch;
`;

type VideoFileSelectProps = {
  name?: string;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  value: File | null;
  onChange: (file: File | null) => void;
  onBlur?: () => void;
  onError: (message: string | null) => void;
};

export default function VideoFileSelect({
  name,
  enabled,
  onToggleEnabled,
  value,
  onChange,
  onBlur,
  onError,
}: VideoFileSelectProps) {
  const { t } = useTranslation('errors');
  const { t: tImport } = useTranslation(['import', 'app']);
  const { setVideoData, setVideoFilePath } = useVideo();
  const { pushMessage } = useMessageHelmet();
  const [waveformStatus, setWaveformStatus] = useState<TWaveformStatus>(TWaveformStatus.IDLE);
  useEffect(() => {
    if (!enabled && value) {
      onChange(null);
    }
  }, [enabled, value]);

  useEffect(() => {
    let isCancelled = false;

    if (!enabled) {
      setWaveformStatus(TWaveformStatus.IDLE);
      setVideoFilePath(null);
      onError(null);
      return;
    }

    if (!value) {
      setWaveformStatus(TWaveformStatus.IDLE);
      setVideoFilePath(null);
      onError(t('videoFileSelect.fileRequired'));
      return;
    }

    const videoPath = window.electronAPI.getPathForFile(value);
    if (!videoPath) {
      setWaveformStatus(TWaveformStatus.ERROR);
      onError(t('videoFileSelect.pathUnresolved'));
      return;
    }

    setWaveformStatus(TWaveformStatus.LOADING);
    onError(t('videoFileSelect.stillProcessing'));

    void (async () => {
      // Step 1: video container/codec decodable
      try {
        await checkVideoDecodable(videoPath);
      } catch {
        if (isCancelled) return;
        setWaveformStatus(TWaveformStatus.UNSUPPORTED_VIDEO);
        setVideoFilePath(null);
        onError(t('videoFileSelect.unsupportedVideoCodec'));
        return;
      }
      if (isCancelled) return;

      // Step 2: thumbnail (best-effort, non-fatal on failure)
      const previewImage = await window.electronAPI.generateThumbnail(videoPath).catch(() => null);
      if (isCancelled) return;

      // Step 3: extract/convert audio to AAC. The original file's audio is intentionally not
      // pre-checked for native playability here -- codecs Chromium can't play (e.g. EAC-3) are
      // exactly what this conversion step exists to fix, so a native-playability check here
      // would hard-stop before conversion ever got a chance to run. Step 4 (below) verifies the
      // *converted* file is actually playable, which is what's played back.
      setWaveformStatus(TWaveformStatus.EXTRACTING_AUDIO);
      let audioPath: string;
      try {
        audioPath = await window.electronAPI.extractOrConvertAudio(videoPath);
      } catch (error) {
        if (isCancelled) return;
        setWaveformStatus(TWaveformStatus.AUDIO_EXTRACTION_FAILED);
        setVideoFilePath(null);
        onError(t('videoFileSelect.audioExtractionFailed'));
        emitAudioExtractionFailedMessage(pushMessage, toErrorMessage(error));
        return;
      }
      if (isCancelled) return;

      // Step 4: converted audio playable
      try {
        await checkAudioPlayability(audioPath);
      } catch {
        if (isCancelled) return;
        setWaveformStatus(TWaveformStatus.UNPLAYABLE_CONVERTED_AUDIO);
        setVideoFilePath(null);
        onError(t('videoFileSelect.unplayableConvertedAudio'));
        return;
      }
      if (isCancelled) return;

      try {
        const waveformPeaks = await window.electronAPI.extractWaveformPeaks(audioPath);
        if (isCancelled) return;
        setVideoFilePath(videoPath, audioPath);
        setVideoData(previewImage ?? null, waveformPeaks);
        setWaveformStatus(TWaveformStatus.SUCCESS);
        onError(null);
      } catch (error) {
        if (isCancelled) return;
        setWaveformStatus(TWaveformStatus.ERROR);
        setVideoFilePath(null);
        onError(t('videoFileSelect.processingFailed'));
        emitAudioExtractionFailedMessage(pushMessage, toErrorMessage(error));
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [enabled, value]);

  return (
    <FormsSection>
      <FormsSectionTitle
        icon={TIcon.VIDEO}
        after={
          <Toggle
            checked={enabled}
            onChange={(event) => onToggleEnabled(event.currentTarget.checked)}
          />
        }
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: CSSVar('formSectionSpacingInner') }}
        >
          {tImport('video.sectionTitle')}
        </div>
      </FormsSectionTitle>

      {enabled && (
        <FormsSectionContent>
          <FormSectionEntry>
            <FileSelectButton
              name={name}
              color={ThemeColors.ACCENT2}
              label={value?.name ?? tImport('shared.noFileSelected')}
              accept=".mp4,.m4v,.mkv,.webm,.mov,.avi,.wmv,.flv,.mpg,.mpeg,.m2ts,.mts,.ts,.3gp,.3g2,.ogv,.asf"
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
          {waveformStatus !== TWaveformStatus.IDLE && (
            <FormSectionEntry>
              <MessageFullWidth
                color={VideoFilesProcessingStatusToColor[waveformStatus]}
                type={TMessageVariant.SECONDARY}
                size={TMessageSize.S}
              >
                {VideoFileProcessingStatusToMessage[waveformStatus]}
              </MessageFullWidth>
            </FormSectionEntry>
          )}
          <FormSectionEntry>
            <P color={ThemeColors.TEXT} variant={TPVariant.TERTIARY}>
              {tImport('app:video.supportedFormats')}
            </P>
            <P color={ThemeColors.TEXT} variant={TPVariant.TERTIARY}>
              {tImport('app:video.supportedCodecs')}
            </P>
          </FormSectionEntry>
        </FormsSectionContent>
      )}
    </FormsSection>
  );
}
