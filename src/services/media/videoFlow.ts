import type { TAudioTrack } from '@bridge/definitions/audioTrack';
import i18n from '@src/i18n';
import { IPC } from '@src/services/ipc/IPC';
import { modal } from '@src/services/modal';
import { toast } from '@src/services/toast';
import { checkAudioPlayability, checkVideoDecodable } from '@src/utils/checkVideoPlayability';
import {
  confirmAudioDataFailed,
  confirmWaveformFailed,
} from './dialogs/flowFailed/confirmFlowFailed';
import { selectAudioTrack } from './dialogs/selectAudioTrack/selectAudioTrack';
import { getTrackShortLabel } from './dialogs/selectAudioTrack/trackLabels';
import { selectVideoFile } from './dialogs/videoSelect/selectVideoFile';
import { makeAudioTracksListFailedMessage } from './toasts';

// Picking a video and its audio track, as a chain of popups. Nothing here touches the store: every
// step returns plain data, and only a complete result is handed back for the caller to persist and
// apply (media.applyVideo / applyAudioTrack), so a failure or cancel at any step changes nothing.

const tDialogs = i18n.getFixedT(null, 'dialogs');
const tMessages = i18n.getFixedT(null, 'messages');

export type TVideoMetadata = {
  thumbnail: string;
  /** Displayed width / height */
  aspectRatio: number;
};

export type TVideoFile = TVideoMetadata & { videoPath: string };

export type TAudioTrackData = {
  audioTrack: TAudioTrack;
  /** The track converted to a playable file, in the media cache */
  audioPath: string;
  waveformPeaks: number[];
};

export type TVideoSelection = TVideoFile &
  TAudioTrackData & {
    /** How many audio tracks the video has, so the player offers a choice only when there is one */
    audioTrackCount: number;
  };

// ── Steps ────────────────────────────────────────────────────────────────────

/** The video's thumbnail and aspect ratio. Missing either means something is wrong with the file,
 * so it's treated as a failure (null), like a video Chromium can't decode. */
async function readVideoMetadata(videoPath: string): Promise<TVideoMetadata | null> {
  try {
    await checkVideoDecodable(videoPath);
    const { thumbnail, aspectRatio } = await IPC.media.getVideoMetadata(videoPath);
    return thumbnail && aspectRatio ? { thumbnail, aspectRatio } : null;
  } catch {
    return null;
  }
}

// Rejects when ffprobe can't list them
function listTracksWithLoader(videoPath: string): Promise<TAudioTrack[]> {
  return modal.load(
    { messages: [tMessages('audioTracksLoader.extracting')] },
    IPC.media.listAudioTracks(videoPath)
  );
}

/** Converts the track's audio, checks the result plays, and extracts its waveform; null on any
 * failure. The original audio isn't pre-checked for native playability: codecs Chromium can't
 * play (e.g. EAC-3) are exactly what the conversion fixes. */
async function extractTrackData(
  videoPath: string,
  audioTrack: TAudioTrack
): Promise<TAudioTrackData | null> {
  try {
    const audioPath = await IPC.media.extractAudio(videoPath, audioTrack.id);
    await checkAudioPlayability(audioPath);
    const waveformPeaks = await IPC.media.extractWaveformPeaks(videoPath, audioTrack.id);
    return { audioTrack, audioPath, waveformPeaks };
  } catch {
    return null;
  }
}

// Translated on each call, so they're in the current locale
const waveformLoaderMessages = () => [
  tMessages('projectLoader.loadingVideo'),
  tMessages('projectLoader.blamingProcessor'),
  tMessages('projectLoader.reevaluatingExpectations'),
  tMessages('projectLoader.computingWaveforms'),
  tMessages('projectLoader.surfingWaveforms'),
  tMessages('projectLoader.demandingRam'),
];

const RESELECT_VIDEO = Symbol('reselectVideo');

/** Asks for one of the tracks (skipped when there's only one) and extracts it, asking again when
 * that fails. Resolves the track's data, null when given up, or RESELECT_VIDEO when the only track
 * failed and the user wants another video. */
async function pickAndExtractTrack(
  videoPath: string,
  tracks: TAudioTrack[],
  initialTrackId: number,
  dismissLabel: string
): Promise<TAudioTrackData | typeof RESELECT_VIDEO | null> {
  const isSingleTrack = tracks.length === 1;
  let selectedId = initialTrackId;
  for (;;) {
    const trackId = isSingleTrack
      ? tracks[0].id
      : await selectAudioTrack(tracks, selectedId, dismissLabel);
    if (trackId === null) return null;
    selectedId = trackId;
    const track = tracks.find(({ id }) => id === trackId) ?? tracks[0];

    const data = await modal.load(
      { messages: waveformLoaderMessages() },
      extractTrackData(videoPath, track)
    );
    if (data) return data;

    const retry = await confirmWaveformFailed(getTrackShortLabel(track), {
      retryLabel: isSingleTrack
        ? tDialogs('audioDataFailed.selectAnotherVideoButton')
        : tDialogs('waveformFailed.selectOtherTrackButton'),
      dismissLabel,
    });
    if (!retry) return null;
    if (isSingleTrack) return RESELECT_VIDEO;
  }
}

// ── Flows ────────────────────────────────────────────────────────────────────

type TPickVideoOptions = {
  /** Shown above the file picker, e.g. why the saved video can't be used */
  banner?: string | null;
  /** The video popup's dismiss label; Cancel by default */
  dismissLabel?: string;
};

/** The whole chain: video file (metadata) → its audio tracks → the track to use → its audio and
 * waveform. Resolves everything the player needs, or null when the user gave up at any step. */
export async function pickVideo({
  banner,
  dismissLabel,
}: TPickVideoOptions = {}): Promise<TVideoSelection | null> {
  const continueWithoutVideo = tDialogs('videoSelect.continueWithoutVideoButton');
  for (;;) {
    const file = await selectVideoFile(readVideoMetadata, { banner, dismissLabel });
    if (!file) return null;

    const tracks = await listTracksWithLoader(file.videoPath).catch((): TAudioTrack[] => []);
    if (!tracks.length) {
      if (await confirmAudioDataFailed()) continue;
      return null;
    }

    const track = await pickAndExtractTrack(
      file.videoPath,
      tracks,
      tracks[0].id,
      continueWithoutVideo
    );
    if (track === RESELECT_VIDEO) continue;
    if (!track) return null;
    return { ...file, ...track, audioTrackCount: tracks.length };
  }
}

/** Another audio track for the open video. Offered only when the video has more than one, so it
 * resolves null without asking otherwise, and on Cancel at any step. */
export async function pickVideoAudioTrack(
  videoPath: string,
  currentTrackId: number | null
): Promise<TAudioTrackData | null> {
  let tracks: TAudioTrack[];
  try {
    tracks = await listTracksWithLoader(videoPath);
  } catch {
    toast.push(makeAudioTracksListFailedMessage());
    return null;
  }
  if (tracks.length < 2) return null;

  const initialTrackId = tracks.some(({ id }) => id === currentTrackId)
    ? currentTrackId!
    : tracks[0].id;
  const track = await pickAndExtractTrack(
    videoPath,
    tracks,
    initialTrackId,
    tDialogs('shared.cancel')
  );
  return track === RESELECT_VIDEO ? null : track;
}

/** A project's saved video with its saved track (the first one when none is saved, or it's gone),
 * behind one loader and without asking anything. Null when any step fails, for the caller to fall
 * back to pickVideo. */
export function loadSavedVideo(
  videoPath: string,
  audioTrackId: number | null
): Promise<TVideoSelection | null> {
  const load = async (): Promise<TVideoSelection | null> => {
    const metadata = await readVideoMetadata(videoPath);
    if (!metadata) return null;
    const tracks = await IPC.media.listAudioTracks(videoPath).catch((): TAudioTrack[] => []);
    const track = tracks.find(({ id }) => id === audioTrackId) ?? tracks[0];
    if (!track) return null;
    const data = await extractTrackData(videoPath, track);
    if (!data) return null;
    return { videoPath, ...metadata, ...data, audioTrackCount: tracks.length };
  };
  return modal.load({ messages: waveformLoaderMessages() }, load());
}
