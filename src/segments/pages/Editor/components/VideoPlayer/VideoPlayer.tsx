import { useVideo } from '@providers/VideoProvider';
import { selectIsSmallScreen } from '@src/store/slices/app';
import {
  selectActiveLineIndex,
  selectCharacterPool,
  selectIsVideoCollapsed,
  selectLines,
  setVideoCollapsed,
} from '@src/store/slices/editor';
import { selectVideoFilePath } from '@src/store/slices/project';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { TCharacter } from '@src/types';
import { msToHunanTime } from '@src/utils/time';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import classNames from 'classnames';
import { Fragment, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useVideoFileSwap } from './useVideoFileSwap';
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

const VideoStage = styled.div`
  position: relative;

  &.isCollapsed {
    background: ${CSSColor(ThemeColors.BLACK, TShade.DEFAULT, 100)};
  }
`;

const VideoPlayerShell = styled.div<{ $hidden?: boolean }>`
  height: 100%;
  position: relative;
  display: ${({ $hidden }) => ($hidden ? 'none' : 'flex')};
  flex-direction: column;
  margin: 0 auto;
  aspect-ratio: 16 / 9;
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

type VideoPlayerProps = {
  onPlaybackResume?: () => void;
  onPlaybackPause?: () => void;
};

export default function VideoPlayer({ onPlaybackPause, onPlaybackResume }: VideoPlayerProps) {
  const { t } = useTranslation('editor');
  const dispatch = useAppDispatch();
  const { videoElementRef, registerVideoElementRef, setCurrentTimeMs, reportVideoUnplayable } =
    useVideo();
  const lines = useAppSelector(selectLines);
  const activeLineIndex = useAppSelector(selectActiveLineIndex);
  const videoFilePath = useAppSelector(selectVideoFilePath);
  const { swapVideo } = useVideoFileSwap();
  const characterPool = useAppSelector(selectCharacterPool);
  const isSmallScreen = useAppSelector(selectIsSmallScreen);
  const isVideoCollapsed = useAppSelector(selectIsVideoCollapsed);
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
    const video = videoElementRef.current;
    const emitCurrentTime = () => (video ? setCurrentTimeMs(video.currentTime * 1000) : void 0);

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

    if (!video.paused) {
      startUpdates();
    }

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      stopUpdates();
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [setCurrentTimeMs, videoElementRef, onPlaybackPause, onPlaybackResume, reportVideoUnplayable]);

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
          <TopBarBlurWrapper>
            <Button
              variant={TButtonVariant.PRIMARY}
              color={ThemeColors.TEXT}
              size={TButtonSize.SMALL}
              icon={TIcon.VIDEO}
              onClick={swapVideo}
            />
          </TopBarBlurWrapper>
          {isSmallScreen && (
            <TopBarBlurWrapper>
              <Button
                color={ThemeColors.BG}
                variant={TButtonVariant.PRIMARY}
                size={TButtonSize.SMALL}
                icon={isVideoCollapsed ? TIcon.ARROW_TOGGLE_DOWN : TIcon.ARROW_TOGGLE_UP}
                onClick={() => dispatch(setVideoCollapsed(!isVideoCollapsed))}
              />
            </TopBarBlurWrapper>
          )}
        </TopBarPanel>
      </TopBar>
      {videoFilePath ? (
        <VideoPlayerShell $hidden={effectiveCollapsed}>
          <Video ref={registerVideoElementRef} playsInline />
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
