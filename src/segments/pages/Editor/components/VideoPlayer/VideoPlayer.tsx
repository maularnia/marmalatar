import { media } from '@src/services/media';
import { settings } from '@src/services/settings';
import { editor } from '@src/services/project';
import { projects } from '@src/services/project';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint } from '@ui-toolkit/Tooltip';
import classNames from 'classnames';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import VideoProgressBar from './VideoProgressBar';
import { truncateText } from '@src/utils/truncateText';

// The audio button sits in the player's top bar, next to the line's timing: long track titles
// would push it over the video
const AUDIO_TRACK_LABEL_MAX_LENGTH = 15;

// Covers the top third of the player, controls along its top edge. Its black-to-clear gradient is
// a layer of its own: a gradient can't transition, but the layer's opacity can.
const TopBar = styled.div`
  position: absolute;
  z-index: 2;
  width: 100%;
  height: 33%;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  /* Barely there over the video until the player is pointed at (or the bar tabbed into) */
  opacity: 0.1;
  transition: opacity 150ms ease-in-out;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: ${CSSVar('videoPlayerPanelBg')};
    opacity: 0;
    transition: opacity 150ms ease-in-out;
    pointer-events: none;
  }

  &:hover,
  &:focus-within {
    opacity: 1;
    &::before {
      opacity: 1;
    }
  }

  /* Collapsed, the bar is all that's left of the player, so it stays fully visible */
  &.isCollapsed {
    position: relative;
    height: auto;
    opacity: 1;
  }
`;

const TopBarPanel = styled.div`
  display: flex;
  gap: ${CSSVar('videoPlayerSpacingInnerX')};
  align-items: center;
  padding: ${CSSVar('size4')};
`;

const TopBarBlurWrapper = styled.div``;

const DEFAULT_ASPECT_RATIO = 16 / 9;

// The play/stop button in the middle of the video: shown only while the player is pointed at (see
// VideoStage), and does what Ctrl+Enter does -- plays from the focused line, or stops and goes
// back to its beginning
const CenterPlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease-in-out;
`;

const VideoStage = styled.div`
  position: relative;

  /* The faded top bar comes back whenever the player itself is pointed at */
  &:hover ${TopBar} {
    opacity: 1;
    &::before {
      opacity: 1;
    }
  }

  &:hover ${CenterPlay} {
    opacity: 1;
    pointer-events: auto;
  }

  &.isLargeScreen {
    padding-top: ${CSSVar('size4')};
  }

  &.isCollapsed {
    background: ${CSSColor(ThemeColors.BLACK, TShade.DEFAULT, 100)};
  }
`;

// The shell sizes the player box (height: 100% plus the video's aspect ratio, set inline from the
// store); the progress bar and subtitles are positioned inside it. The height is capped at a third
// of the screen so a tall (e.g. 9:21) video can't push the editor off it -- the width follows from
// the capped height, so the box keeps the video's shape.
const VideoPlayerShell = styled.div<{ $hidden?: boolean }>`
  height: 100%;
  max-height: 50vh;
  position: relative;
  display: ${({ $hidden }) => ($hidden ? 'none' : 'flex')};
  flex-direction: column;
  margin: 0 auto;
  overflow: hidden;
  background: ${CSSVar('videoPlayerBg')};
  transition: transform 0.1s ease-in-out;
  transform-origin: left top;
  border-radius: ${CSSVar('videoPlayerBorderRadius')};
  /* Small screens run the player edge to edge, so its corners stay square */
  &.isSmallScreen {
    border-radius: 0;
  }
`;

const Video = styled.video`
  width: 100%;
  height: auto;
  display: block;
  flex: 1 1 auto;
  object-fit: contain;
  background: ${CSSVar('videoPlayerBg')};
`;

const Audio = styled.audio`
  display: none;
`;

const BottomPanel = styled.div`
  width: 100%;
  position: absolute;
  bottom: 0;
`;
const VideoSubtitleOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(${CSSVar('videoPlayerSubtitlesSpacingY')} + ${CSSVar('size10')});
  display: flex;
  justify-content: center;
  pointer-events: none;
`;

const VideoSubtitleText = styled.div`
  max-width: ${CSSVar('videoPlayerSubtitleMaxHeight')};
  padding: ${CSSVar('videoPlayerSubtitlesSpacingY')} ${CSSVar('videoPlayerSubtitlesSpacingX')};
  text-align: center;
  line-height: 1.2;
`;

const Word = styled.div`
  background: ${CSSVar('videoPlayerSubtitleBg')};
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('videoPlayerSubtitlesTextSize')};
  color: ${CSSVar('videoPlayerSubtitleColor')};
  backdrop-filter: ${CSSVar('videoPlayerSubtitleBackdropFilter')};
  display: inline-block;
  padding: ${CSSVar('videoPlayerSubtitlesSpacingY')} ${CSSVar('videoPlayerSubtitlesSpacingX')};
`;

const TIME_UPDATE_INTERVAL_MS = 100;
const AUDIO_VIDEO_DRIFT_THRESHOLD_S = 0.15;

type VideoPlayerProps = {
  onPlaybackResume?: () => void;
  onPlaybackPause?: () => void;
};

export default function VideoPlayer({ onPlaybackPause, onPlaybackResume }: VideoPlayerProps) {
  const { t } = useTranslation('editor');
  const navigate = useNavigate();
  // An unplayable video closes the project: the editor can't be used in sync with it
  const reportVideoUnplayable = useCallback(() => {
    media.reportVideoUnplayable();
    projects.close();
    navigate('/');
  }, [navigate]);
  const [
    lines,
    activeLineIndex,
    videoFilePath,
    videoAspectRatio,
    isSmallScreen,
    isLargeScreen,
    isVideoCollapsed,
    audioTrackCount,
    audioTrack,
    theme,
  ] = useAppSelectors(
    editor.selectLines,
    media.selectActiveLineIndex,
    media.selectVideoFilePath,
    media.selectAspectRatio,
    settings.selectIsSmallScreen,
    settings.selectIsLargeScreen,
    editor.selectIsVideoCollapsed,
    media.selectAudioTrackCount,
    media.selectAudioTrack,
    settings.selectCurrentThemeData
  );
  // The top panel sits over the video, so its text, key hints and buttons take the theme's panel
  // color (white in every theme) rather than its text color
  const panelColor = theme.variables.videoPlayerPanelColor.value;
  // 16:9 until the video's own ratio is known (or when it couldn't be read)
  const aspectRatio = videoAspectRatio ?? DEFAULT_ASPECT_RATIO;
  const effectiveCollapsed = isVideoCollapsed && isSmallScreen;
  // Follows the video element's own play/pause events (see the effect below), starting from its
  // state when the player mounts
  const [isPlaying, setIsPlaying] = useState(() => !(media.getVideoElement()?.paused ?? true));

  const activeLine = activeLineIndex != null ? lines[activeLineIndex] : null;
  const activeLineWordArray = (
    (activeLine?.output?.trim() || activeLine?.input?.trim()) ??
    ''
  ).split('\n');
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const video = media.getVideoElement();
    const emitCurrentTime = () => {
      if (!video) return;
      media.setCurrentTimeMs(video.currentTime * 1000);
      const audio = media.getAudioElement();
      if (
        audio &&
        Math.abs(audio.currentTime - video.currentTime) > AUDIO_VIDEO_DRIFT_THRESHOLD_S
      ) {
        audio.currentTime = video.currentTime;
      }
    };

    if (!video) {
      return;
    }
    const startUpdates = () => {
      if (intervalId != null || !video) {
        return;
      }

      emitCurrentTime();
      intervalId = setInterval(emitCurrentTime, TIME_UPDATE_INTERVAL_MS);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      startUpdates();
      onPlaybackResume?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      stopUpdates();
      emitCurrentTime();
      onPlaybackPause?.();
    };

    const stopUpdates = () => {
      if (intervalId == null) {
        return;
      }

      clearInterval(intervalId);
      intervalId = null;
    };

    const handleError = () => {
      const err = video.error;
      // MEDIA_ERR_ABORTED is expected whenever we deliberately reassign .src
      // (swapping/clearing the video) -- only report genuine failures.
      if (!err || err.code === MediaError.MEDIA_ERR_ABORTED) return;
      if (!video.currentSrc) return;
      reportVideoUnplayable();
    };

    const audio = media.getAudioElement();
    const handleAudioError = () => {
      const err = audio?.error;
      if (!err || err.code === MediaError.MEDIA_ERR_ABORTED) return;
      if (!audio?.currentSrc) return;
      reportVideoUnplayable();
    };

    if (!video.paused) {
      startUpdates();
    }

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);
    video.addEventListener('error', handleError);
    audio?.addEventListener('error', handleAudioError);

    return () => {
      stopUpdates();
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      video.removeEventListener('error', handleError);
      audio?.removeEventListener('error', handleAudioError);
    };
  }, [onPlaybackPause, onPlaybackResume, reportVideoUnplayable]);

  // Over a showing video, the panel lives inside the player box, so the box's rounded corners
  // and overflow clip it. Collapsed or without a video there's no box to sit in: it takes its
  // own place in the stage instead.
  const isTopBarInShell = Boolean(videoFilePath) && !effectiveCollapsed;
  const topBar = (
    <TopBar
      className={classNames({ isCollapsed: effectiveCollapsed })}
      style={{ color: CSSColor(panelColor, TShade.DEFAULT, 100) }}
    >
      <TopBarPanel>
        {videoFilePath && audioTrackCount > 1 && (
          <TopBarBlurWrapper>
            <Button
              variant={TButtonVariant.SECONDARY}
              color={panelColor}
              icon={TIcon.AUDIO_TRACK}
              onClick={() => void projects.changeAudioTrack()}
            >
              {audioTrack &&
                truncateText(media.getAudioTrackLabel(audioTrack), AUDIO_TRACK_LABEL_MAX_LENGTH)}
            </Button>
          </TopBarBlurWrapper>
        )}
        <TopBarBlurWrapper>
          <Button
            variant={TButtonVariant.SECONDARY}
            color={panelColor}
            icon={TIcon.VIDEO}
            onClick={() => void projects.changeVideo()}
          >
            {t('videoPlayer.selectVideo')}
          </Button>
        </TopBarBlurWrapper>
        {isSmallScreen && (
          <TopBarBlurWrapper>
            <Button
              color={panelColor}
              variant={TButtonVariant.SECONDARY}
              icon={isVideoCollapsed ? TIcon.ARROW_TOGGLE_DOWN : TIcon.ARROW_TOGGLE_UP}
              onClick={() => editor.setVideoCollapsed(!isVideoCollapsed)}
            />
          </TopBarBlurWrapper>
        )}
      </TopBarPanel>
    </TopBar>
  );

  return (
    <VideoStage
      className={classNames({ isCollapsed: effectiveCollapsed, isLargeScreen })}
      tabIndex={1}
    >
      {!isTopBarInShell && topBar}
      {videoFilePath ? (
        <VideoPlayerShell
          $hidden={effectiveCollapsed}
          className={classNames({ isSmallScreen })}
          style={{ aspectRatio }}
        >
          <Video ref={media.registerVideoElement} style={{ aspectRatio }} playsInline muted />
          <Audio ref={media.registerAudioElement} />
          {isTopBarInShell && topBar}
          <CenterPlay>
            <Tooltip
              label={
                <TooltipComplex
                  title={t(isPlaying ? 'videoPlayer.stopToLine' : 'videoPlayer.playFromLine')}
                >
                  <TooltipKeystrokeHint keys={['Ctrl', 'Enter']} />
                </TooltipComplex>
              }
            >
              <Button
                variant={TButtonVariant.SECONDARY}
                size={TButtonSize.LARGE}
                color={ThemeColors.ACCENT1}
                icon={isPlaying ? TIcon.PLAYBACK_STOP : TIcon.PLAY}
                // Keeps focus on the line being edited: playing starts from the focused line
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.playFocusedLine()}
              />
            </Tooltip>
          </CenterPlay>
          <BottomPanel>
            <VideoProgressBar />
          </BottomPanel>

          {activeLine ? (
            <VideoSubtitleOverlay>
              <VideoSubtitleText>
                <span>
                  {activeLineWordArray.map((line, lineIndex) => (
                    // eslint-disable-next-line @eslint-react/no-array-index-key -- derived read-only text; a dialogue line can repeat (— Дабрыдзень.\n— Дабрыдзень.)
                    <Fragment key={lineIndex}>
                      {lineIndex > 0 && <br />}
                      {line
                        .split(' ')
                        .filter(Boolean)
                        .map((word, wordIndex) => (
                          // eslint-disable-next-line @eslint-react/no-array-index-key -- derived read-only text; words repeat within a line
                          <Word key={wordIndex}>{word}</Word>
                        ))}
                    </Fragment>
                  ))}
                </span>
              </VideoSubtitleText>
            </VideoSubtitleOverlay>
          ) : null}
        </VideoPlayerShell>
      ) : null}
    </VideoStage>
  );
}
