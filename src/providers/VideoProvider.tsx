import { emitAudioExtractionFailedMessage, emitVideoPlaybackErrorMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { selectActiveLineIndex, selectLines, setActiveLineIndex } from '@src/store/slices/editor';
import {
  resetProject,
  selectVideoFilePath,
  setVideoFilePath as setVideoFilePathAction,
} from '@src/store/slices/project';
import { providerNoop } from '@src/utils/noop';
import { toErrorMessage } from '@src/utils/toErrorMessage';
import { pathToFileUrl } from '@utils/checkVideoPlayability';
import { useAppDispatch } from '@store/hooks';
import { fromCurrentStore } from '@store/store';
import {
  createContext,
  PropsWithChildren,
  RefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

type VideoContextType = {
  videoDurationMs: number | null;
  thumbnail: string | null;
  waveformPeaks: number[];
  setVideoFilePath: (path: string | null, audioPath?: string) => void;
  setVideoData: (thumbnail: string | null, waveformPeaks: number[]) => void;
  videoElementRef: RefObject<HTMLVideoElement | null>;
  registerVideoElementRef: (e: HTMLVideoElement | null) => void;
  audioElementRef: RefObject<HTMLAudioElement | null>;
  registerAudioElementRef: (e: HTMLAudioElement | null) => void;
  currentTimeRef: RefObject<number>;
  setCurrentTimeMs: (ms: number) => void;
  seekVideoToMs: (ms: number) => void;
  resetCurrentTime: () => void;
  handlePlay: () => void;
  handlePause: () => void;
  handlePlayPause: () => void;
  seekToLine: (lineIndex: number) => void;
  reportVideoUnplayable: () => void;
};

const noop = providerNoop('VideoContext');

const VideoContext = createContext<VideoContextType>({
  videoDurationMs: null,
  thumbnail: null,
  waveformPeaks: [],
  setVideoFilePath: noop,
  setVideoData: noop,
  videoElementRef: { current: null },
  registerVideoElementRef: noop,
  audioElementRef: { current: null },
  registerAudioElementRef: noop,
  currentTimeRef: { current: 0 },
  setCurrentTimeMs: noop,
  seekVideoToMs: noop,
  resetCurrentTime: noop,
  handlePlay: noop,
  handlePause: noop,
  handlePlayPause: noop,
  seekToLine: noop,
  reportVideoUnplayable: noop,
});

export function useVideo(): VideoContextType {
  return useContext(VideoContext);
}

function loadVideoDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.src = url;
    el.onloadedmetadata = () => {
      resolve(Math.round(el.duration * 1000));
      el.src = '';
    };
    el.onerror = reject;
  });
}

export default function VideoProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pushMessage } = useMessageHelmet();

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const currentTimeRef = useRef(0);

  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  const setVideoFilePath = useCallback(
    (path: string | null, audioPath?: string) => {
      dispatch(setVideoFilePathAction(path));
      setVideoDurationMs(null);
      setThumbnail(null);
      setWaveformPeaks([]);
      const url = path ? pathToFileUrl(path) : '';
      if (videoElementRef.current) {
        videoElementRef.current.src = url;
        videoElementRef.current.muted = true;
      }
      if (audioElementRef.current) {
        audioElementRef.current.src = audioPath ? pathToFileUrl(audioPath) : '';
      }
      if (!path) return;

      loadVideoDuration(url)
        .then((ms) => setVideoDurationMs(ms))
        .catch(() => setVideoDurationMs(null));

      // Audio path wasn't already known (e.g. project reload, only videoPath is persisted) --
      // re-derive it via the same content-addressed cache the import flow already populated.
      if (!audioPath && audioElementRef.current) {
        const audioElement = audioElementRef.current;
        window.electronAPI
          .extractOrConvertAudio(path)
          .then((resolvedAudioPath) => {
            if (audioElementRef.current === audioElement) {
              audioElement.src = pathToFileUrl(resolvedAudioPath);
            }
          })
          .catch((error) => {
            emitAudioExtractionFailedMessage(pushMessage, toErrorMessage(error));
          });
      }
    },
    [dispatch, pushMessage]
  );

  const registerVideoElementRef = useCallback((e: HTMLVideoElement | null) => {
    videoElementRef.current = e;
    const videoFilePath = fromCurrentStore(selectVideoFilePath);
    if (e && videoFilePath) {
      e.src = pathToFileUrl(videoFilePath);
      e.muted = true;
    }
  }, []);

  const registerAudioElementRef = useCallback(
    (e: HTMLAudioElement | null) => {
      audioElementRef.current = e;
      const videoFilePath = fromCurrentStore(selectVideoFilePath);
      if (e && videoFilePath) {
        window.electronAPI
          .extractOrConvertAudio(videoFilePath)
          .then((resolvedAudioPath) => {
            if (audioElementRef.current === e) {
              e.src = pathToFileUrl(resolvedAudioPath);
            }
          })
          .catch((error) => {
            emitAudioExtractionFailedMessage(pushMessage, toErrorMessage(error));
          });
      }
    },
    [pushMessage]
  );

  const setVideoData = useCallback((nextThumbnail: string | null, nextPeaks: number[]) => {
    setThumbnail(nextThumbnail);
    setWaveformPeaks(nextPeaks);
  }, []);

  const setCurrentTimeMs = useCallback(
    (ms: number) => {
      const currentTime = ms < 0 ? 0 : ms;
      const activeIndex = fromCurrentStore(selectLines).findIndex(
        (l) => l.start_time <= currentTime && l.end_time >= currentTime
      );
      const next = activeIndex >= 0 ? activeIndex : null;
      if (next !== fromCurrentStore(selectActiveLineIndex)) {
        dispatch(setActiveLineIndex(next));
      }
      currentTimeRef.current = ms;
    },
    [dispatch]
  );

  const seekVideoToMs = useCallback(
    (ms: number) => {
      setCurrentTimeMs(ms);
      const seconds = ms / 1000;
      if (videoElementRef.current) videoElementRef.current.currentTime = seconds;
      if (audioElementRef.current) audioElementRef.current.currentTime = seconds;
    },
    [setCurrentTimeMs]
  );

  const resetCurrentTime = useCallback(() => {
    currentTimeRef.current = 0;
    if (videoElementRef.current) videoElementRef.current.currentTime = 0;
    if (audioElementRef.current) audioElementRef.current.currentTime = 0;
  }, []);

  const handlePlay = useCallback(() => {
    videoElementRef.current?.play().catch(() => {});
    audioElementRef.current?.play().catch(() => {});
  }, []);

  const handlePause = useCallback(() => {
    videoElementRef.current?.pause();
    audioElementRef.current?.pause();
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!videoElementRef.current) return;
    const action = videoElementRef.current.paused ? 'play' : 'pause';
    if (action === 'play') {
      videoElementRef.current.play().catch(() => {});
      audioElementRef.current?.play().catch(() => {});
    } else {
      videoElementRef.current.pause();
      audioElementRef.current?.pause();
    }
  }, []);

  const seekToLine = useCallback(
    (lineIndex: number | null) => {
      if (lineIndex == null) return;
      const line = fromCurrentStore(selectLines)[lineIndex];
      if (!line) return;
      seekVideoToMs(line.start_time);
    },
    [seekVideoToMs]
  );

  const reportVideoUnplayable = useCallback(() => {
    emitVideoPlaybackErrorMessage(pushMessage);
    dispatch(resetProject());
    navigate('/');
  }, [dispatch, navigate, pushMessage]);

  const value = useMemo<VideoContextType>(
    () => ({
      videoDurationMs,
      thumbnail,
      waveformPeaks,
      setVideoFilePath,
      setVideoData,
      videoElementRef,
      registerVideoElementRef,
      audioElementRef,
      registerAudioElementRef,
      currentTimeRef,
      setCurrentTimeMs,
      seekVideoToMs,
      resetCurrentTime,
      handlePlay,
      handlePause,
      handlePlayPause,
      seekToLine,
      reportVideoUnplayable,
    }),
    [
      videoDurationMs,
      thumbnail,
      waveformPeaks,
      setVideoFilePath,
      setVideoData,
      registerVideoElementRef,
      registerAudioElementRef,
      setCurrentTimeMs,
      seekVideoToMs,
      resetCurrentTime,
      handlePlay,
      handlePause,
      handlePlayPause,
      seekToLine,
      reportVideoUnplayable,
    ]
  );

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
}
