import i18n from '@src/i18n';
import { modal } from '@src/services/modal';
import type { TVideoFile, TVideoMetadata } from '../../videoFlow';
import { VideoSelectDialog } from './VideoSelectDialog';

const t = i18n.getFixedT(null, 'dialogs');

/** Asks for a video file whose metadata could be read; resolves null when dismissed.
 * `dismissLabel` renames the dismiss button, e.g. "Continue without video". */
export async function selectVideoFile(
  readMetadata: (videoPath: string) => Promise<TVideoMetadata | null>,
  { banner, dismissLabel }: { banner?: string | null; dismissLabel?: string } = {}
): Promise<TVideoFile | null> {
  let file: TVideoFile | null = null;
  const confirmed = await modal.confirm(
    VideoSelectDialog,
    {
      readMetadata,
      banner,
      onFileChange: (next: TVideoFile | null) => {
        file = next;
      },
    },
    {
      confirmButton: { children: t('shared.continue') },
      dismissButton: { children: dismissLabel ?? t('shared.cancel') },
      validate: () => file !== null,
    }
  );
  return confirmed ? file : null;
}
