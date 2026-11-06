import type { TAudioTrack } from '@bridge/definitions/audioTrack';
import type { TModalContentProps } from '@src/services/modal';
import { IPC } from '@src/services/ipc/IPC';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { LogoLoader } from '@ui-toolkit/LogoLoader';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import Select from '@ui-toolkit/Select/Select';
import type { TOptionSelect } from '@ui-toolkit/Select/types';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  DialogBodyStandard,
  DialogContent,
  DialogTitle,
  DialogTitleContent,
} from '@src/services/modal';

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${CSSVar('size10')};
`;

const StatusMessage = styled(Message)`
  flex-grow: 1;
`;

// Value of the always-present "nothing selected" option
const NO_TRACK = '';

enum TListingStatus {
  LOADING = 'loading',
  READY = 'ready',
  NO_TRACKS = 'noTracks',
  FAILED = 'failed',
}

type TSelectAudioTrackDialogProps = TModalContentProps & {
  videoPath: string;
  onTrackChange: (trackId: number | null) => void;
};

function getTrackLabel({ id, language, title }: TAudioTrack): string {
  return [id, language, title].filter((part) => part !== null && part !== '').join(' : ');
}

export function SelectAudioTrackDialog({
  videoPath,
  onValidChange,
  onTrackChange,
}: TSelectAudioTrackDialogProps) {
  const { t } = useTranslation('dialogs');
  const [status, setStatus] = useState(TListingStatus.LOADING);
  const [tracks, setTracks] = useState<TAudioTrack[]>([]);
  const [selectedValue, setSelectedValue] = useState(NO_TRACK);

  const callbacksRef = useRef({ onValidChange, onTrackChange });
  callbacksRef.current = { onValidChange, onTrackChange };

  // Layout effect: the Select button is enabled until told otherwise, and this has to land before
  // the dialog's first paint so it never shows as clickable.
  useLayoutEffect(() => {
    const trackId = selectedValue === NO_TRACK ? null : Number(selectedValue);
    callbacksRef.current.onTrackChange(trackId);
    callbacksRef.current.onValidChange?.(trackId !== null);
  }, [selectedValue]);

  useEffect(() => {
    let isCancelled = false;
    IPC.media
      .listAudioTracks(videoPath)
      .then((nextTracks) => {
        if (isCancelled) return;
        setTracks(nextTracks);
        setStatus(nextTracks.length ? TListingStatus.READY : TListingStatus.NO_TRACKS);
        if (nextTracks.length === 1) setSelectedValue(String(nextTracks[0].id));
      })
      .catch(() => {
        if (!isCancelled) setStatus(TListingStatus.FAILED);
      });
    return () => {
      isCancelled = true;
    };
  }, [videoPath]);

  const options: TOptionSelect[] = [
    { value: NO_TRACK, label: '' },
    ...tracks.map((track) => ({ value: String(track.id), label: getTrackLabel(track) })),
  ];

  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('selectAudioTrack.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        {status === TListingStatus.LOADING && (
          <StatusRow>
            <LogoLoader size={24} />
            <StatusMessage
              color={ThemeColors.GOLD}
              type={TMessageVariant.SECONDARY}
              size={TMessageSize.S}
            >
              {t('selectAudioTrack.listing')}
            </StatusMessage>
          </StatusRow>
        )}
        {(status === TListingStatus.FAILED || status === TListingStatus.NO_TRACKS) && (
          <StatusMessage
            color={ThemeColors.RED}
            type={TMessageVariant.SECONDARY}
            size={TMessageSize.S}
          >
            {status === TListingStatus.FAILED
              ? t('selectAudioTrack.listingFailed')
              : t('selectAudioTrack.noTracks')}
          </StatusMessage>
        )}
        <Select
          options={options}
          value={selectedValue}
          placeholder={t('selectAudioTrack.placeholder')}
          disabled={tracks.length < 2}
          onChange={([value]) => setSelectedValue(value ?? NO_TRACK)}
        />
      </DialogContent>
    </DialogBodyStandard>
  );
}
