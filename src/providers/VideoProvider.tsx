import { emitVideoPlaybackErrorMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { selectActiveLineIndex, selectLines, setActiveLineIndex } from '@src/store/slices/editor';
import {
  resetProject,
  selectVideoFilePath,
  setVideoFilePath as setVideoFilePathAction,
} from '@src/store/slices/project';
import { providerNoop } from '@src/utils/noop';
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
  setVideoFilePath: (path: string | null) => void;
  setVideoData: (thumbnail: string | null, waveformPeaks: number[]) => void;
  videoElementRef: RefObject<HTMLVideoElement | null>;
  registerVideoElementRef: (e: HTMLVideoElement | null) => void;
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
  const currentTimeRef = useRef(0);

  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  const setVideoFilePath = useCallback(
    (path: string | null) => {
      dispatch(setVideoFilePathAction(path));
      setVideoDurationMs(null);
      setThumbnail(null);
      setWaveformPeaks([]);
      const url = path ? pathToFileUrl(path) : '';
      if (videoElementRef.current) videoElementRef.current.src = url;
      if (!path) return;

      loadVideoDuration(url)
        .then((ms) => setVideoDurationMs(ms))
        .catch(() => setVideoDurationMs(null));
    },
    [dispatch]
  );

  const registerVideoElementRef = useCallback((e: HTMLVideoElement | null) => {
    videoElementRef.current = e;
    const videoFilePath = fromCurrentStore(selectVideoFilePath);
    if (e && videoFilePath) {
      e.src = pathToFileUrl(videoFilePath);
    }
  }, []);

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
      const video = videoElementRef.current;
      if (video) video.currentTime = ms / 1000;
    },
    [setCurrentTimeMs]
  );

  const resetCurrentTime = useCallback(() => {
    currentTimeRef.current = 0;
    const video = videoElementRef.current;
    if (video) video.currentTime = 0;
  }, []);

  const handlePlay = useCallback(() => {
    if (videoElementRef.current) videoElementRef.current.play();
  }, []);

  const handlePause = useCallback(() => {
    if (videoElementRef.current) videoElementRef.current.pause();
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!videoElementRef.current) return;
    videoElementRef.current[videoElementRef.current.paused ? 'play' : 'pause']();
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
