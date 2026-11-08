import type { TModalContentProps } from '@src/services/modal';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { LogoLoader } from '@ui-toolkit/LogoLoader';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import FileSelectButton from '@ui-toolkit/FileSelectButton/FileSelectButton';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  DialogBodyStandard,
  DialogContent,
  DialogTitle,
  DialogTitleContent,
} from '@src/services/modal';
import { IPC } from '@src/services/ipc/IPC';
import type { TVideoFile, TVideoMetadata } from '../../videoFlow';

type TVideoSelectDialogProps = TModalContentProps & {
  /** Reads the picked file's metadata; null when the video can't be used */
  readMetadata: (videoPath: string) => Promise<TVideoMetadata | null>;
  onFileChange: (file: TVideoFile | null) => void;
  banner?: string | null;
};

enum TReadStatus {
  IDLE = 'idle',
  READING = 'reading',
  READY = 'ready',
  FAILED = 'failed',
}

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${CSSVar('size10')};
`;

const StatusMessage = styled(Message)`
  flex-grow: 1;
`;

export function VideoSelectDialog({
  readMetadata,
  onFileChange,
  onValidChange,
  banner,
}: TVideoSelectDialogProps) {
  const { t } = useTranslation('dialogs');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState(TReadStatus.IDLE);

  const callbacksRef = useRef({ readMetadata, onFileChange, onValidChange });
  callbacksRef.current = { readMetadata, onFileChange, onValidChange };

  // Layout effect: Continue is enabled until told otherwise, and this has to land before the
  // dialog's first paint so it never shows as clickable.
  useLayoutEffect(() => {
    callbacksRef.current.onValidChange?.(status === TReadStatus.READY);
  }, [status]);

  useEffect(() => {
    let isCancelled = false;
    callbacksRef.current.onFileChange(null);
    if (!file) {
      setStatus(TReadStatus.IDLE);
      return;
    }
    const videoPath = IPC.files.getPathFile(file);
    if (!videoPath) {
      setStatus(TReadStatus.FAILED);
      return;
    }
    setStatus(TReadStatus.READING);
    void callbacksRef.current.readMetadata(videoPath).then((metadata) => {
      if (isCancelled) return;
      if (!metadata) {
        setStatus(TReadStatus.FAILED);
        return;
      }
      callbacksRef.current.onFileChange({ videoPath, ...metadata });
      setStatus(TReadStatus.READY);
    });
    return () => {
      isCancelled = true;
    };
  }, [file]);

  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('videoSelect.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        {banner && (
          <StatusMessage
            color={ThemeColors.RED}
            type={TMessageVariant.SECONDARY}
            size={TMessageSize.S}
          >
            {banner}
          </StatusMessage>
        )}
        <FileSelectButton
          variant={TButtonVariant.SPECIAL}
          label={file?.name ?? t('videoSelect.filePlaceholder')}
          icon={TIcon.VIDEO}
          accept=".mp4,.mkv,.webm,.mov,.avi"
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0] ?? null);
            event.currentTarget.value = '';
          }}
        >
          {t('videoSelect.selectVideoButton')}
        </FileSelectButton>
        {status === TReadStatus.READING && (
          <StatusRow>
            <LogoLoader size={24} />
            <StatusMessage
              color={ThemeColors.GOLD}
              type={TMessageVariant.SECONDARY}
              size={TMessageSize.S}
            >
              {t('videoSelect.readingMetadata')}
            </StatusMessage>
          </StatusRow>
        )}
        {status === TReadStatus.FAILED && (
          <StatusMessage
            icon={TIcon.VIDEO}
            color={ThemeColors.RED}
            type={TMessageVariant.SECONDARY}
            size={TMessageSize.S}
          >
            {t('videoSelect.metadataFailed')}
          </StatusMessage>
        )}
      </DialogContent>
    </DialogBodyStandard>
  );
}
