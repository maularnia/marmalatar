import { media } from '@src/services/media';
import { settings } from '@src/services/settings';
import { editor } from '@src/services/project';
import { projects } from '@src/services/project';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { TCharacter } from '@src/types';
import { msToHunanTime } from '@src/utils/time';
import { useAppSelectors } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import classNames from 'classnames';
import { Fragment, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import VideoProgressBar from './VideoProgressBar';

const TopBar = styled.div`
  position: absolute;
  z-index: 2;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-content: stretch;
  align-items: stretch;
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 100)};

  &.isCollapsed {
    position: relative;
  }
`;

const TopBarCharacterBar = styled.div`
  position: absolute;
  height: 0;
  left: 50%;
  top: 0;
  transform: translate3d(-50%, 0, 0);
  z-index: 3;
  &.isCollapsed {
    position: relative;
  }
`;

const TopBarPanel = styled.div`
  display: flex;
  gap: ${CSSVar('videoPlayerSpacingInnerX')};
  align-items: center;
  padding: ${CSSVar('size4')};
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 80)};
`;

const TopBarTag = styled(Tag)``;
const TopBarBlurWrapper = styled.div``;

const DEFAULT_ASPECT_RATIO = 16 / 9;

const VideoStage = styled.div`
  position: relative;

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
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 100)};
  transition: transform 0.1s ease-in-out;
  transform-origin: left top;
  border-radius: ${CSSVar('videoPlayerBorderRadius')} ${CSSVar('videoPlayerBorderRadius')} 0 0;
`;

const Video = styled.video`
  width: 100%;
  height: auto;
  display: block;
  flex: 1 1 auto;
  object-fit: contain;
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 100)};
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
    characterPool,
    isSmallScreen,
    isVideoCollapsed,
  ] = useAppSelectors(
    editor.selectLines,
    media.selectActiveLineIndex,
    media.selectVideoFilePath,
    media.selectAspectRatio,
    editor.selectCharacterPool,
    settings.selectIsSmallScreen,
    editor.selectIsVideoCollapsed
  );
  // 16:9 until the video's own ratio is known (or when it couldn't be read)
  const aspectRatio = videoAspectRatio ?? DEFAULT_ASPECT_RATIO;
  const effectiveCollapsed = isVideoCollapsed && isSmallScreen;

  const activeLine = activeLineIndex != null ? lines[activeLineIndex] : null;
  const activeLineWordArray = (
    (activeLine?.output?.trim() || activeLine?.input?.trim()) ??
    ''
  ).split('\n');
  const activeLineCharacters =
    activeLineIndex !== null && lines[activeLineIndex] && lines[activeLineIndex].character
      ? (lines[activeLineIndex].character
          .split(',')
          .map((character) => characterPool.find(({ name }) => name === character))
          .filter(Boolean) as TCharacter[])
      : [];
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
      startUpdates();
      onPlaybackResume?.();
    };

    const handlePause = () => {
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

  return (
    <VideoStage className={classNames({ isCollapsed: effectiveCollapsed })} tabIndex={1}>
      {!effectiveCollapsed && (
        <TopBarCharacterBar className={classNames({ isCollapsed: effectiveCollapsed })}>
          <TopBarPanel>
            {activeLineCharacters && activeLineCharacters.length ? (
              activeLineCharacters.map(({ name, color }) => (
                <TopBarTag
                  key={name}
                  variant={TTagVariant.PRIMARY}
                  color={color}
                  size={TTagSize.SMALL}
                >
                  {name}
                </TopBarTag>
              ))
            ) : activeLine ? (
              <TopBarTag
                variant={TTagVariant.PRIMARY}
                color={ThemeColors.TEXT}
                size={TTagSize.SMALL}
              >
                {t('videoPlayer.noCharacter')}
              </TopBarTag>
            ) : null}
          </TopBarPanel>
        </TopBarCharacterBar>
      )}
      <TopBar className={classNames({ isCollapsed: effectiveCollapsed })}>
        <TopBarPanel>
          {activeLine ? (
            <>
              <TopBarTag
                variant={TTagVariant.PRIMARY}
                color={ThemeColors.TEXT}
                size={TTagSize.SMALL}
              >
                {msToHunanTime(activeLine.start_time)}
              </TopBarTag>
              <TopBarTag
                variant={TTagVariant.PRIMARY}
                color={ThemeColors.TEXT}
                size={TTagSize.SMALL}
                icon={TIcon.ARROW_RIGHT}
              />
              <TopBarTag
                variant={TTagVariant.PRIMARY}
                color={ThemeColors.TEXT}
                size={TTagSize.SMALL}
              >
                {msToHunanTime(activeLine.end_time)}
              </TopBarTag>
            </>
          ) : null}
        </TopBarPanel>
        <TopBarPanel>
          {videoFilePath && (
            <TopBarBlurWrapper>
              <Button
                variant={TButtonVariant.PRIMARY}
                color={ThemeColors.TEXT}
                size={TButtonSize.SMALL}
                icon={TIcon.AUDIO_TRACK}
                // Not wired yet: the chosen track isn't applied
                onClick={() => void media.pickAudioTrack()}
              />
            </TopBarBlurWrapper>
          )}
          <TopBarBlurWrapper>
            <Button
              variant={TButtonVariant.PRIMARY}
              color={ThemeColors.TEXT}
              size={TButtonSize.SMALL}
              icon={TIcon.VIDEO}
              onClick={() => void projects.changeVideo()}
            />
          </TopBarBlurWrapper>
          {isSmallScreen && (
            <TopBarBlurWrapper>
              <Button
                color={ThemeColors.BG}
                variant={TButtonVariant.PRIMARY}
                size={TButtonSize.SMALL}
                icon={isVideoCollapsed ? TIcon.ARROW_TOGGLE_DOWN : TIcon.ARROW_TOGGLE_UP}
                onClick={() => editor.setVideoCollapsed(!isVideoCollapsed)}
              />
            </TopBarBlurWrapper>
          )}
        </TopBarPanel>
      </TopBar>
      {videoFilePath ? (
        <VideoPlayerShell $hidden={effectiveCollapsed} style={{ aspectRatio }}>
          <Video ref={media.registerVideoElement} style={{ aspectRatio }} playsInline muted />
          <Audio ref={media.registerAudioElement} />
          <BottomPanel>
            <VideoProgressBar />
          </BottomPanel>

          {activeLine ? (
            <VideoSubtitleOverlay>
              <VideoSubtitleText>
                <span>
                  {activeLineWordArray.map((line, lineIndex) => (
                    <Fragment key={lineIndex}>
                      {lineIndex > 0 && <br />}
                      {line
                        .split(' ')
                        .filter(Boolean)
                        .map((word, index) => (
                          <Word key={index + word}>{word}</Word>
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
