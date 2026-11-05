import { media } from '@src/services/media';
import { settings } from '@src/store/slices/settings';
import { editor } from '@src/services/editor';
import { TScreenSize } from '@src/theme/types';
import { useAppSelector } from '@store/hooks';
import { RefObject, useEffect, useRef } from 'react';
import styled from 'styled-components';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import type { VirtualizedListHandle } from '../VirtualizedList/VirtualizedList';
import Waveform from '../Waveform/Waveform';
import { EditorTableHeader } from '../WorkTable/EditorTableHeader';

const VideoBlock = styled.div`
  position: sticky;
  z-index: 3;
  display: flex;
  flex-direction: column;
  top: 0;
  width: 100%;
  overflow: hidden;
`;

const OverflowContainer = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const estimatedRowHeight = 100;

type FloatingVideoBlockProps = {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  virtualizedListRef: RefObject<VirtualizedListHandle | null>;
  focusedItemIndex: number;
};

export default function FloatingVideoBlock({
  scrollContainerRef,
  virtualizedListRef,
  focusedItemIndex,
}: FloatingVideoBlockProps) {
  const isSmallScreen = useAppSelector(settings.selectIsSmallScreen);
  const videoFilePath = useAppSelector(media.selectVideoFilePath);
  const activeLineIndex = useAppSelector(media.selectActiveLineIndex);
  const translationLines = useAppSelector(editor.selectLines);
  const screenSize = useAppSelector(settings.selectScreenSize);
  const isVideoCollapsed = useAppSelector(editor.selectIsVideoCollapsed);
  const videoDurationMs = useAppSelector(media.selectVideoDurationMs);
  const waveformPeaks = useAppSelector(media.selectWaveformPeaks);
  const isLargeScreen = screenSize !== TScreenSize.SMALL;

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const videoContainerShiftRef = useRef<number>(0);
  const maxVideoShift = useRef<number>(1);
  const currentAnchor = useRef(0);
  const focusedItemIndexRef = useRef(focusedItemIndex);
  focusedItemIndexRef.current = focusedItemIndex;
  const scrollBeforePlayRef = useRef<number | null>(null);

  const handlePlaybackResume = () => {
    if (!scrollContainerRef.current) return;
    scrollBeforePlayRef.current = scrollContainerRef.current.scrollTop;
    if (settings.get.scrollVideoIntoViewOnPlay())
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollTop - videoContainerShiftRef.current,
        behavior: 'smooth',
      });
  };

  const handlePlaybackPause = () => {
    if (scrollBeforePlayRef.current != null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: scrollBeforePlayRef.current, behavior: 'smooth' });
      scrollBeforePlayRef.current = null;
    }
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = (event: Event) => {
      const videoElement = media.getVideoElement();
      if (isLargeScreen || isVideoCollapsed || !videoContainerRef.current || !videoElement) return;
      const scrollTop = (event.currentTarget as HTMLElement).scrollTop;
      const videoHeight = videoElement.clientHeight;
      const maxShift = videoHeight * maxVideoShift.current;

      const focusedIndex = focusedItemIndexRef.current;
      if (focusedIndex >= 0 && virtualizedListRef.current) {
        const listOffsetTop = virtualizedListRef.current.getListOffsetTop();
        const focusedLineTop =
          listOffsetTop + virtualizedListRef.current.getElementPositionByIndex(focusedIndex);
        const focusedLineScreenTop = focusedLineTop - scrollTop;
        const videoBottomAfterMaxShift = videoContainerRef.current.offsetHeight - maxShift;
        if (focusedLineScreenTop < videoBottomAfterMaxShift) {
          videoContainerShiftRef.current = maxShift;
          videoContainerRef.current.style.transform = `translateY(-${maxShift}px)`;
          currentAnchor.current = scrollTop - videoContainerRef.current.offsetHeight - maxShift;
          return;
        }
      }

      const relativeScroll = scrollTop - videoContainerRef.current.offsetHeight;
      const distance = relativeScroll - currentAnchor.current;

      if (distance >= maxShift) currentAnchor.current = relativeScroll - maxShift;
      if (distance <= 0) currentAnchor.current = relativeScroll;

      videoContainerShiftRef.current =
        distance < maxShift ? (distance < 0 ? 0 : distance) : maxShift;
      videoContainerRef.current.style.transform = `translateY(-${videoContainerShiftRef.current}px)`;
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef, virtualizedListRef, isLargeScreen, isVideoCollapsed]);

  useEffect(() => {
    if (focusedItemIndex < 0) return;
    requestAnimationFrame(() => {
      if (
        !virtualizedListRef.current ||
        !scrollContainerRef.current ||
        !videoContainerRef.current ||
        !media.getVideoElement()
      )
        return;
      const listOffsetTop = virtualizedListRef.current.getListOffsetTop();
      const focusedLineTop =
        listOffsetTop + virtualizedListRef.current.getElementPositionByIndex(focusedItemIndex);
      const scrollTop = scrollContainerRef.current.scrollTop;
      const focusedLineScreenTop = focusedLineTop - scrollTop;
      const videoVisibleBottom =
        videoContainerRef.current.offsetHeight - videoContainerShiftRef.current;
      const viewportHeight = scrollContainerRef.current.clientHeight;
      const bottomMargin = estimatedRowHeight;

      if (focusedLineScreenTop < videoVisibleBottom) {
        scrollContainerRef.current.scrollTo({
          top: focusedLineTop - videoContainerRef.current.offsetHeight,
          behavior: 'smooth',
        });
      } else if (focusedLineScreenTop > viewportHeight - bottomMargin) {
        scrollContainerRef.current.scrollTo({
          top: focusedLineTop - (viewportHeight - bottomMargin),
          behavior: 'smooth',
        });
      }
    });
  }, [focusedItemIndex, scrollContainerRef, virtualizedListRef]);

  useEffect(() => {
    videoContainerShiftRef.current = 0;
    currentAnchor.current = 0;
    if (videoContainerRef.current) {
      videoContainerRef.current.style.transform = '';
    }
  }, [screenSize]);

  // Collapsing freezes the shift at zero (the scroll handler's guard keeps it there).
  // Expanding re-anchors to the current scroll position instead of just zeroing it out,
  // so the video is immediately fully displayed and further scrolling resumes the
  // shrink-on-scroll behavior naturally from here rather than snapping back to a stale anchor.
  useEffect(() => {
    videoContainerShiftRef.current = 0;
    if (videoContainerRef.current) {
      videoContainerRef.current.style.transform = '';
    }
    if (!isVideoCollapsed && scrollContainerRef.current && videoContainerRef.current) {
      currentAnchor.current =
        scrollContainerRef.current.scrollTop - videoContainerRef.current.offsetHeight;
    } else {
      currentAnchor.current = 0;
    }
  }, [isVideoCollapsed, scrollContainerRef]);

  return (
    <VideoBlock ref={videoContainerRef}>
      {isSmallScreen && videoFilePath && (
        <>
          <VideoPlayer
            onPlaybackResume={handlePlaybackResume}
            onPlaybackPause={handlePlaybackPause}
          />
          <Waveform
            peaks={waveformPeaks}
            videoDurationMs={videoDurationMs}
            activeLineIndex={activeLineIndex}
            focusedLineIndex={focusedItemIndex >= 0 ? focusedItemIndex : null}
            translationLines={translationLines}
            onLineTimingChange={(lineIndex, startTime, endTime) => {
              editor.updateLineTiming({ lineIndex, startTime, endTime });
            }}
          />
        </>
      )}
      <OverflowContainer>
        <EditorTableHeader />
      </OverflowContainer>
    </VideoBlock>
  );
}
