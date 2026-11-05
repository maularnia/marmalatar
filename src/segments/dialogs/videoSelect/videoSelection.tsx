import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import VideoSelectDialog, { VideoSelectDialogProps, VideoSelectResult } from './VideoSelectDialog';

const t = i18n.getFixedT(null, 'dialogs');

const videoSelectWindow = createConfirm(VideoSelectDialog, {
  confirmButton: { children: t('shared.continue') },
  dismissButton: { children: t('shared.cancel') },
});

/** Asks for a video file (validated and converted by the dialog itself); resolves `null` when
 * dismissed. `dismissLabel` renames the dismiss button, e.g. "Continue without video". */
export async function selectVideo(
  errorMessage?: string | null,
  dismissLabel?: string
): Promise<VideoSelectResult | null> {
  let result: VideoSelectResult | null = null;
  let isValid = false;
  const confirmed = await videoSelectWindow.confirm(
    {
      onValidChange: (valid: boolean) => (isValid = valid),
      onResultReady: (next: VideoSelectResult) => (result = next),
      errorMessage: errorMessage ?? null,
    } satisfies VideoSelectDialogProps,
    () => isValid,
    dismissLabel ? { dismissButton: { children: dismissLabel } } : undefined
  );
  return confirmed ? result : null;
}
