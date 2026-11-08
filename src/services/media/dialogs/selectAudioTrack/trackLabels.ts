import type { TAudioTrack } from '@bridge/definitions/audioTrack';
import i18n from '@src/i18n';

const t = i18n.getFixedT(null, 'dialogs');

// Called at render or dialog-open time, so the label is in the current locale
const trackTitle = (title: string | null): string => title || t('selectAudioTrack.unnamed');

/** The track as listed in the select: id, language when known, and title */
export function getTrackOptionLabel({ language, title }: TAudioTrack): string {
  return [language, trackTitle(title)].filter(Boolean).join(' : ');
}

/** The track as named in messages: id and title */
export function getTrackShortLabel({ id, title }: TAudioTrack): string {
  return `${id}:${trackTitle(title)}`;
}
