import type { TAudioTrack } from '@bridge/definitions/audioTrack';
import type { TModalContentProps } from '@src/services/modal';
import Select from '@ui-toolkit/Select/Select';
import type { TOptionSelect } from '@ui-toolkit/Select/types';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DialogBodyStandard,
  DialogContent,
  DialogTitle,
  DialogTitleContent,
} from '@src/services/modal';
import { getTrackOptionLabel } from './trackLabels';
import {
  FormRoot,
  FormsContent,
  FormsRow,
  FormsSection,
  FormsSectionContent,
} from '@src/toolkit/forms';
import styled from 'styled-components';

type TSelectAudioTrackDialogProps = TModalContentProps & {
  tracks: TAudioTrack[];
  initialTrackId: number;
  onTrackChange: (trackId: number) => void;
};

const AudioDialogContent = styled(DialogContent)`
  align-self: stretch;
`;

// Only lists the tracks it's given: nothing is extracted until the user clicks Select
export function SelectAudioTrackDialog({
  tracks,
  initialTrackId,
  onTrackChange,
}: TSelectAudioTrackDialogProps) {
  const { t } = useTranslation('dialogs');
  const [selectedValue, setSelectedValue] = useState(String(initialTrackId));

  const onTrackChangeRef = useRef(onTrackChange);
  onTrackChangeRef.current = onTrackChange;

  // Layout effect: the choice has to be known before the Select button can be clicked
  useLayoutEffect(() => {
    onTrackChangeRef.current(Number(selectedValue));
  }, [selectedValue]);

  const options: TOptionSelect[] = tracks.map((track) => ({
    value: String(track.id),
    label: getTrackOptionLabel(track),
  }));

  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('selectAudioTrack.title')}</DialogTitleContent>
      </DialogTitle>
      <AudioDialogContent>
        <FormRoot>
          <FormsContent>
            <FormsRow>
              <FormsSection>
                <FormsSectionContent>
                  <Select
                    options={options}
                    value={selectedValue}
                    placeholder={t('selectAudioTrack.placeholder')}
                    onChange={([value]) => {
                      if (value) setSelectedValue(value);
                    }}
                  />
                </FormsSectionContent>
              </FormsSection>
            </FormsRow>
          </FormsContent>
        </FormRoot>
      </AudioDialogContent>
    </DialogBodyStandard>
  );
}
