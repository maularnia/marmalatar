import { VideoFileProcessingStatusToMessage, VideoFilesProcessingStatusToColor } from '@src/consts';
import { emitAudioExtractionFailedMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { CSSVar } from '@src/theme/utils';
import { TWaveformStatus } from '@src/types';
import { toErrorMessage } from '@src/utils/toErrorMessage';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import FileSelectButton from '@ui-toolkit/FileSelectButton/FileSelectButton';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import { checkAudioPlayability, checkVideoDecodable } from '@utils/checkVideoPlayability';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DialogBodyStandard, DialogContent, DialogTitle, DialogTitleContent } from '../partials';

export type VideoSelectResult = {
  videoPath: string;
  audioPath: string;
  fileName: string;
  waveformPeaks: number[];
  previewImage: string | null;
};

export type VideoSelectDialogProps = {
  onValidChange: (isValid: boolean) => void;
  onResultReady: (result: VideoSelectResult) => void;
  errorMessage?: string | null;
};

type FormValues = {
  videoFile: File | null;
};

const MessageFullWidth = styled(Message)`
  align-self: stretch;
`;

const ErrorBanner = styled.div`
  color: ${CSSVar('windowColor')};
  font-size: ${CSSVar('sizeTextSmall')};
  background: ${CSSVar('windowBg')};
  border-radius: ${CSSVar('windowBorderRadius')};
  padding: ${CSSVar('size10')} ${CSSVar('size12')};
  text-align: center;
`;

export default function VideoSelectDialog({
  onValidChange,
  onResultReady,
  errorMessage,
}: VideoSelectDialogProps) {
  const { t } = useTranslation(['errors', 'dialogs']);
  const { pushMessage } = useMessageHelmet();
  const [waveformStatus, setWaveformStatus] = useState<TWaveformStatus>(TWaveformStatus.IDLE);

  const {
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { videoFile: null },
    mode: 'onChange',
  });

  const videoFile = useWatch({ control, name: 'videoFile' });

  useEffect(() => {
    let cancelled = false;

    if (!videoFile) {
      setWaveformStatus(TWaveformStatus.IDLE);
      onValidChange(false);
      return;
    }

    const videoPath = window.electronAPI.getPathForFile(videoFile);
    if (!videoPath) {
      setWaveformStatus(TWaveformStatus.ERROR);
      onValidChange(false);
      return;
    }

    setWaveformStatus(TWaveformStatus.LOADING);
    onValidChange(false);

    void (async () => {
      // Step 1: video container/codec decodable
      try {
        await checkVideoDecodable(videoPath);
      } catch {
        if (cancelled) return;
        setWaveformStatus(TWaveformStatus.UNSUPPORTED_VIDEO);
        onValidChange(false);
        return;
      }
      if (cancelled) return;

      // Step 2: thumbnail (best-effort, non-fatal on failure)
      const previewImage = await window.electronAPI.generateThumbnail(videoPath).catch(() => null);
      if (cancelled) return;

      // Step 3: extract/convert audio to AAC.
      setWaveformStatus(TWaveformStatus.EXTRACTING_AUDIO);
      let audioPath: string;
      try {
        audioPath = await window.electronAPI.extractOrConvertAudio(videoPath);
      } catch (error) {
        if (cancelled) return;
        setWaveformStatus(TWaveformStatus.AUDIO_EXTRACTION_FAILED);
        onValidChange(false);
        emitAudioExtractionFailedMessage(pushMessage, toErrorMessage(error));
        return;
      }
      if (cancelled) return;

      // Step 4: converted audio playable
      try {
        await checkAudioPlayability(audioPath);
      } catch {
        if (cancelled) return;
        setWaveformStatus(TWaveformStatus.UNPLAYABLE_CONVERTED_AUDIO);
        onValidChange(false);
        return;
      }
      if (cancelled) return;

      try {
        const waveformPeaks = await window.electronAPI.extractWaveformPeaks(audioPath);
        if (cancelled) return;
        setWaveformStatus(TWaveformStatus.SUCCESS);
        onValidChange(true);
        onResultReady({
          videoPath,
          audioPath,
          fileName: videoFile.name,
          waveformPeaks,
          previewImage,
        });
      } catch (error) {
        if (cancelled) return;
        setWaveformStatus(TWaveformStatus.ERROR);
        onValidChange(false);
        emitAudioExtractionFailedMessage(pushMessage, toErrorMessage(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoFile]);
  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('dialogs:videoSelect.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        {errorMessage && <ErrorBanner>{errorMessage}</ErrorBanner>}
        <Controller
          control={control}
          name="videoFile"
          rules={{ required: t('videoSelect.fileRequired') }}
          render={({ field }) => (
            <FileSelectButton
              name={field.name}
              variant={TButtonVariant.SPECIAL}
              label={field.value?.name ?? t('dialogs:videoSelect.filePlaceholder')}
              icon={TIcon.VIDEO}
              accept=".mp4,.mkv,.webm,.mov,.avi"
              errors={errors.videoFile?.message ? [errors.videoFile.message] : undefined}
              onBlur={field.onBlur}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                field.onChange(file);
                event.currentTarget.value = '';
              }}
            >
              {t('dialogs:videoSelect.selectVideoButton')}
            </FileSelectButton>
          )}
        />
        {waveformStatus !== TWaveformStatus.IDLE && (
          <MessageFullWidth
            icon={TIcon.WAVE}
            color={VideoFilesProcessingStatusToColor[waveformStatus]}
            type={TMessageVariant.SECONDARY}
            size={TMessageSize.S}
          >
            {VideoFileProcessingStatusToMessage[waveformStatus]}
          </MessageFullWidth>
        )}
      </DialogContent>
    </DialogBodyStandard>
  );
}
