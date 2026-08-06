import { TConfirmationWindowProps } from '@providers/ConfirmationProvider/types';
import Span from '@ui-toolkit/Span';
import Toggle from '@ui-toolkit/Toggle';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogBodySmall, DialogContent, DialogTitle, DialogTitleContent } from '../partials';

type CopyAllSourceToOutputDialogProps = TConfirmationWindowProps & {
  showOverrideToggle: boolean;
  onOverrideChange?: (overrideExisting: boolean) => void;
};

export function CopyAllSourceToOutputDialog({
  showOverrideToggle,
  onOverrideChange,
}: CopyAllSourceToOutputDialogProps) {
  const { t } = useTranslation('dialogs');
  const [overrideExisting, setOverrideExisting] = useState(true);

  const onOverrideChangeRef = useRef(onOverrideChange);
  onOverrideChangeRef.current = onOverrideChange;

  useEffect(() => {
    onOverrideChangeRef.current?.(overrideExisting);
  }, [overrideExisting]);

  return (
    <DialogBodySmall>
      <DialogTitle>
        <DialogTitleContent>{t('copyAllSourceToOutput.title')}</DialogTitleContent>
      </DialogTitle>
      {showOverrideToggle && (
        <DialogContent>
          <Toggle
            checked={overrideExisting}
            onChange={(e) => setOverrideExisting(e.currentTarget.checked)}
          >
            <Span>{t('copyAllSourceToOutput.overrideToggleLabel')}</Span>
          </Toggle>
        </DialogContent>
      )}
    </DialogBodySmall>
  );
}
