import { media } from '@src/services/media';
import { VideoFileProcessingStatusToMessage, VideoFilesProcessingStatusToColor } from '@src/consts';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { LogoLoader } from '@src/toolkit/LogoLoader';
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
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { IPC } from '@src/services/ipc/IPC';

// The inline error for each way processing can fail
const FAILURE_MESSAGE_KEYS: Partial<Record<TWaveformStatus, string>> = {
  [TWaveformStatus.UNSUPPORTED_VIDEO]: 'videoFileSelect.unsupportedVideoCodec',
  [TWaveformStatus.AUDIO_EXTRACTION_FAILED]: 'videoFileSelect.audioExtractionFailed',
  [TWaveformStatus.UNPLAYABLE_CONVERTED_AUDIO]: 'videoFileSelect.unplayableConvertedAudio',
  [TWaveformStatus.ERROR]: 'videoFileSelect.processingFailed',
};

const FileFormSectionEntry = styled(FormSectionEntry)`
  flex-direction: row;
  align-items: center;
`;

const FileFormMessage = styled(Message)`
  flex-grow: 1;
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
      media.loadVideo(null);
      onError(null);
      return;
    }

    if (!value) {
      setWaveformStatus(TWaveformStatus.IDLE);
      media.loadVideo(null);
      onError(t('videoFileSelect.fileRequired'));
      return;
    }

    const videoPath = IPC.files.getPathFile(value);
    if (!videoPath) {
      setWaveformStatus(TWaveformStatus.ERROR);
      onError(t('videoFileSelect.pathUnresolved'));
      return;
    }

    onError(t('videoFileSelect.stillProcessing'));
    let status = TWaveformStatus.LOADING;
    void media
      .processVideo(videoPath, {
        onStatus: (next) => {
          status = next;
          setWaveformStatus(next);
        },
        isCancelled: () => isCancelled,
      })
      .then((result) => {
        if (isCancelled) return;
        if (!result) {
          media.loadVideo(null);
          onError(t(FAILURE_MESSAGE_KEYS[status] ?? 'videoFileSelect.processingFailed'));
          return;
        }
        media.loadVideo(videoPath, result.audioPath);
        media.setVideoData({ thumbnail: result.previewImage, waveformPeaks: result.waveformPeaks });
        onError(null);
      });

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
            <FileFormSectionEntry>
              {waveformStatus === TWaveformStatus.EXTRACTING_AUDIO && <LogoLoader size={24} />}
              <FileFormMessage
                color={VideoFilesProcessingStatusToColor[waveformStatus]}
                type={TMessageVariant.SECONDARY}
                size={TMessageSize.S}
              >
                {VideoFileProcessingStatusToMessage[waveformStatus]}
              </FileFormMessage>
            </FileFormSectionEntry>
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
