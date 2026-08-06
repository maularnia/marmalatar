import { VideoFileProcessingStatusToMessage, VideoFilesProcessingStatusToColor } from '@src/consts';
import { CSSVar } from '@src/theme/utils';
import { TWaveformStatus } from '@src/types';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import FileSelectButton from '@ui-toolkit/FileSelectButton/FileSelectButton';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import { checkVideoPlayability } from '@utils/checkVideoPlayability';
import { processVideoPath } from '@utils/processVideoPath';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DialogBodyStandard, DialogContent, DialogTitle, DialogTitleContent } from '../partials';

export type VideoSelectResult = {
  videoPath: string;
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
      const isPlayable = await checkVideoPlayability(videoPath);
      if (cancelled) return;
      if (!isPlayable) {
        setWaveformStatus(TWaveformStatus.UNSUPPORTED);
        onValidChange(false);
        return;
      }

      try {
        const { waveformPeaks, previewImage } = await processVideoPath(videoPath);
        if (cancelled) return;
        setWaveformStatus(TWaveformStatus.SUCCESS);
        onValidChange(true);
        onResultReady({
          videoPath,
          fileName: videoFile.name,
          waveformPeaks,
          previewImage,
        });
      } catch {
        if (cancelled) return;
        setWaveformStatus(TWaveformStatus.ERROR);
        onValidChange(false);
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
