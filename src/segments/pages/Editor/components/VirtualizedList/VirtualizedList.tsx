import {
  ReactElement,
  Ref,
  RefObject,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';
import { useResizeWatch } from '@src/segments/pages/Editor/components/VirtualizedList/useResizeWatch';

type VirtualizedItem = {
  line_no: number;
};

type VisiblePortion<T> = {
  item: T;
  key: string | number;
  fingerprint: string | number;
  index: number;
  top: number;
};

export type VirtualizedListHandle = {
  containerRef: RefObject<HTMLDivElement | null>;
  scrollToIndex: (index: number, options?: { offset?: number; animate?: boolean }) => void;
  getListOffsetTop: () => number;
  getElementPositionByIndex: (index: number) => number;
  isRenderedByIndex: (index: number) => boolean;
  forceRerender: () => void;
};

type VirtualizedListProps<T extends VirtualizedItem> = {
  ref?: Ref<VirtualizedListHandle>;
  items: T[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  getItemFingerprint?: (item: T) => string | number;
  overscanPx?: number;
  estimatedRowHeight?: number;
  /** Indices that must stay mounted regardless of scroll position -- e.g. the currently-focused
   * line, so it never gets thrown out (and loses focus) when scrolled off-screen. */
  pinnedIndices?: number[];
  renderEpoch?: number;
  onRenderEpochEnded?: () => void;
  renderItem: (params: { item: T; onMeasure: (height: number) => void }) => ReactElement;
};

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const Slot = styled.div`
  position: absolute;
  left: 0;
  width: 100%;
  transition:
    transform 300ms cubic-bezier(0.37, 0, 0.63, 1),
    opacity 300ms linear;
`;

export default function VirtualizedList<T extends VirtualizedItem>({
  ref,
  items,
  scrollContainerRef,
  getItemFingerprint,
  overscanPx = 300,
  estimatedRowHeight = 50,
  pinnedIndices,
  renderEpoch = 0,
  onRenderEpochEnded,
  renderItem,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedIndexSet = useMemo(() => new Set(pinnedIndices ?? []), [pinnedIndices]);
  const slotNodesRef = useRef<Map<string | number, HTMLDivElement>>(new Map());
  const rowHeightEstimate = useRef<number>(estimatedRowHeight);
  const visibleKeyRef = useRef('');
  const itemHeightsRef = useRef<Map<string | number, number>>(new Map());
  const [visiblePortion, setVisiblePortion] = useState<Array<VisiblePortion<T>>>([]);
  const visiblePortionRef = useRef<Array<VisiblePortion<T>>>([]);
  visiblePortionRef.current = visiblePortion;

  const getItemKey = (item: T) => item.line_no;
  const getListOffsetTop = () => containerRef.current?.offsetTop ?? 0;

  useEffect(() => {
    const validItemKeys = new Set<string | number>(items.map((item) => getItemKey(item)));
    for (const key of itemHeightsRef.current.keys()) {
      if (!validItemKeys.has(key)) {
        itemHeightsRef.current.delete(key);
      }
    }
  }, [items]);

  const recalculateRef = useRef<() => boolean>(() => false);

  const recalculateVisiblePortion = () => {
    if (!scrollContainerRef.current || !containerRef.current) return false;

    const scrollContainer = scrollContainerRef.current;
    const viewportHeight = scrollContainer.offsetHeight;
    const scrollTop = scrollContainer.scrollTop;
    const listOffsetTop = getListOffsetTop();

    const topLimit = Math.max(scrollTop - listOffsetTop - overscanPx, 0);
    const bottomLimit = topLimit + viewportHeight + overscanPx;

    let acc = 0;
    const nextVisible: Array<VisiblePortion<T>> = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const key = getItemKey(item);
      const fingerprint = getItemFingerprint ? getItemFingerprint(item) : '';
      const height = itemHeightsRef.current.get(key) ?? rowHeightEstimate.current;
      const itemTop = acc;
      const itemBottom = itemTop + height;
      if ((itemTop < bottomLimit && itemBottom > topLimit) || pinnedIndexSet.has(index)) {
        nextVisible.push({ item, key, fingerprint, index, top: itemTop });
      }
      acc += height;
    }

    rowHeightEstimate.current = items.length ? acc / items.length : rowHeightEstimate.current;
    containerRef.current.style.height = `${acc}px`;

    const nextVisibleKey = nextVisible
      .map((portion) => `${portion.key}:${portion.top}:${portion.fingerprint}`)
      .join('|');
    if (nextVisibleKey === visibleKeyRef.current) {
      return true;
    }

    visibleKeyRef.current = nextVisibleKey;
    setVisiblePortion(nextVisible);
    return true;
  };

  recalculateRef.current = recalculateVisiblePortion;

  const getElementPositionByIndexImpl = (index: number): number => {
    let acc = 0;
    for (let i = 0; i < index && i < items.length; i++) {
      const key = getItemKey(items[i]);
      acc += itemHeightsRef.current.get(key) ?? rowHeightEstimate.current;
    }
    return acc;
  };
  const getElementPositionByIndexRef = useRef(getElementPositionByIndexImpl);
  getElementPositionByIndexRef.current = getElementPositionByIndexImpl;

  useImperativeHandle(
    ref,
    () => ({
      containerRef,
      scrollToIndex: (index, options) => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;
        const position = getElementPositionByIndexRef.current(index);
        const target = getListOffsetTop() + position + (options?.offset ?? 0);
        scrollContainer.scrollTo({
          top: target,
          behavior: options?.animate ? 'smooth' : 'instant',
        });
      },
      getListOffsetTop,
      getElementPositionByIndex: (index) => getElementPositionByIndexRef.current(index),
      isRenderedByIndex: (index) =>
        visiblePortionRef.current.some((portion) => portion.index === index),
      forceRerender: () => {
        visibleKeyRef.current = '';
        recalculateRef.current();
      },
    }),
    []
  );

  useEffect(() => {
    let to: ReturnType<typeof setTimeout>;
    const measure = () => {
      const done = recalculateVisiblePortion();
      if (!done) {
        to = setTimeout(measure, 20);
      }
    };
    measure();
    return () => clearTimeout(to);
  }, [items, overscanPx, scrollContainerRef, pinnedIndexSet]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      recalculateRef.current();
    };

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef]);

  // Whatever currently has focus inside the list should never drift out of view -- typing,
  // navigating, or any other keystroke while focus is on a pinned-but-scrolled-away row snaps the
  // viewport back to it, the same way `handleChangeFocusedColumn` already does when focus first
  // lands there.
  // Lands it a third of the way down the container (rather than flush against an edge, which is
  // all `scrollIntoView`'s `block` options offer) so there's more context visible below the cursor
  // -- only actually scrolls when the element isn't already fully in view.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = () => {
      const active = document.activeElement;
      const scrollContainer = scrollContainerRef.current;
      if (!(active instanceof HTMLElement) || !scrollContainer || !container.contains(active))
        return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const isOutOfView =
        activeRect.top < containerRect.top || activeRect.bottom > containerRect.bottom;
      if (!isOutOfView) return;

      const targetTop = containerRect.top + containerRect.height / 3;
      scrollContainer.scrollBy({ top: activeRect.top - targetTop, behavior: 'auto' });
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [scrollContainerRef]);

  // Row height is fundamentally width-dependent (text reflows), so any resize of the scroll
  // container invalidates every cached measurement -- not just on window resize, but on any cause
  // (sidebar toggle, column collapse, etc.). The resize is always a deliberate user action, so
  // bumping `resizeEpoch` to remount the currently-visible rows is fine here; the remount re-runs
  // each row's own measurement effect, which reports back through the existing `onMeasure` path.
  useResizeWatch(scrollContainerRef, 100, () => {
    itemHeightsRef.current.clear();
    onRenderEpochEnded?.();
    visibleKeyRef.current = '';
    recalculateRef.current();
  });

  const onMeasureByKey = (key: string | number, height: number) => {
    if (height < 0) return;
    const currentHeight = itemHeightsRef.current.get(key);
    if (!currentHeight || currentHeight !== height) {
      itemHeightsRef.current.set(key, height);
      recalculateVisiblePortion();
    }
  };

  // Always look up items from the current `items` prop, not from visiblePortion.
  // visiblePortion is updated via an effect (one render behind) so its item references
  // can be stale. Using the latest items ensures renderItem always gets fresh data.
  const itemsByKey = useMemo(() => new Map(items.map((item) => [getItemKey(item), item])), [items]);

  const renderedVisibleItems = visiblePortion.map(({ key, top }) => {
    const item = itemsByKey.get(Number(key));
    if (!item) return null;
    return (
      <Slot
        key={`virtualized-slot-${key}-${renderEpoch}`}
        style={{ top }}
        ref={(node) => {
          if (node) {
            slotNodesRef.current.set(key, node);
          } else {
            slotNodesRef.current.delete(key);
          }
        }}
      >
        {renderItem({
          item,
          onMeasure: (height) => onMeasureByKey(key, height),
        })}
      </Slot>
    );
  });

  return <Container ref={containerRef}>{renderedVisibleItems}</Container>;
}
