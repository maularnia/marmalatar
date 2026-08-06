import { TConfirmationWindowProps } from '@providers/ConfirmationProvider/types';
import { TEntryCleanupOptions } from '@src/utils/data/entryCleanup';
import Select, { TOptionSelect } from '@ui-toolkit/Select/Select';
import Span from '@ui-toolkit/Span';
import Toggle from '@ui-toolkit/Toggle';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogBodyStandard, DialogContent, DialogTitle, DialogTitleContent } from '../partials';

export type TCleanupTargetColumn = 'source' | 'output';

export type TCleanupFormValues = {
  targetColumn: TCleanupTargetColumn;
} & Required<TEntryCleanupOptions>;

type CleanupDialogProps = TConfirmationWindowProps & {
  isEditMode: boolean;
  onValuesChange?: (values: TCleanupFormValues) => void;
};

export function CleanupDialog({ isEditMode, onValuesChange }: CleanupDialogProps) {
  const { t } = useTranslation('dialogs');
  const [targetColumn, setTargetColumn] = useState<TCleanupTargetColumn>(
    isEditMode ? 'source' : 'output'
  );
  const [cleanHtmlTags, setCleanHtmlTags] = useState(true);
  const [cleanAssStyling, setCleanAssStyling] = useState(true);
  const [cleanAudioCues, setCleanAudioCues] = useState(true);
  const [fixShortDashes, setFixShortDashes] = useState(true);

  const onValuesChangeRef = useRef(onValuesChange);
  onValuesChangeRef.current = onValuesChange;

  useEffect(() => {
    onValuesChangeRef.current?.({
      targetColumn: isEditMode ? 'source' : targetColumn,
      cleanHtmlTags,
      cleanAssStyling,
      cleanAudioCues,
      fixShortDashes,
    });
  }, [isEditMode, targetColumn, cleanHtmlTags, cleanAssStyling, cleanAudioCues, fixShortDashes]);

  const columnOptions: TOptionSelect[] = [
    { value: 'output', label: t('cleanup.columnOutput') },
    { value: 'source', label: t('cleanup.columnSource') },
  ];

  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('cleanup.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        {!isEditMode && (
          <Select
            options={columnOptions}
            value={targetColumn}
            onChange={([value]) => setTargetColumn(value as TCleanupTargetColumn)}
          />
        )}
        <Toggle checked={cleanHtmlTags} onChange={(e) => setCleanHtmlTags(e.currentTarget.checked)}>
          <Span>{t('cleanup.cleanHtmlTags')}</Span>
        </Toggle>
        <Toggle
          checked={cleanAssStyling}
          onChange={(e) => setCleanAssStyling(e.currentTarget.checked)}
        >
          <Span>{t('cleanup.cleanAssStyling')}</Span>
        </Toggle>
        <Toggle
          checked={cleanAudioCues}
          onChange={(e) => setCleanAudioCues(e.currentTarget.checked)}
        >
          <Span>{t('cleanup.cleanAudioCues')}</Span>
        </Toggle>
        <Toggle
          checked={fixShortDashes}
          onChange={(e) => setFixShortDashes(e.currentTarget.checked)}
        >
          <Span>{t('cleanup.fixShortDashes')}</Span>
        </Toggle>
      </DialogContent>
    </DialogBodyStandard>
  );
}
