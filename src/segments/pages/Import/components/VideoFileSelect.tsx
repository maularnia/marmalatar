import { VideoFileProcessingStatusToMessage, VideoFilesProcessingStatusToColor } from '@src/consts';
import { useVideo } from '@src/providers/VideoProvider';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TWaveformStatus } from '@src/types';
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
import { checkVideoPlayability } from '@utils/checkVideoPlayability';
import { processVideoPath } from '@utils/processVideoPath';
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
      const isPlayable = await checkVideoPlayability(videoPath);
      if (isCancelled) return;
      if (!isPlayable) {
        setWaveformStatus(TWaveformStatus.UNSUPPORTED);
        setVideoFilePath(null);
        onError(t('videoFileSelect.unsupportedPlayback'));
        return;
      }

      setVideoFilePath(videoPath);

      try {
        const { previewImage, waveformPeaks } = await processVideoPath(videoPath);
        if (isCancelled) return;
        setVideoData(previewImage ?? null, waveformPeaks);
        setWaveformStatus(TWaveformStatus.SUCCESS);
        onError(null);
      } catch {
        if (isCancelled) return;
        setWaveformStatus(TWaveformStatus.ERROR);
        onError(t('videoFileSelect.processingFailed'));
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
