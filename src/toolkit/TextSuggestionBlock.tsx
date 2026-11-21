import { usePopperPortal } from '@providers/PopperPortalProvider';
import { CSSVar } from '@src/theme/utils';
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

// Where the block sits relative to its anchor:
// - above: its bottom on the anchor's top
// - below: its top on the anchor's bottom
// - left-top / left-bottom: to the anchor's left, tops / bottoms level
export type TSuggestionPlacement = 'above' | 'below' | 'left-top' | 'left-bottom';

/** Viewport coordinates of what the block belongs to: it is fixed and portaled */
export type TSuggestionAnchor = { top: number; bottom: number; left: number };

type TTextSuggestionBlockProps = {
  anchor: TSuggestionAnchor;
  /** In order of preference: the first one that fits the viewport wins, the last one is used when
   * none fits */
  placements: readonly TSuggestionPlacement[];
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

const Panel = styled.div`
  position: fixed;
  z-index: 1000;
  min-width: 120px;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('tooltipFontSize')};
  border-radius: ${CSSVar('size12')};
  background: ${CSSVar('tooltipBg')};
  backdrop-filter: ${CSSVar('tooltipBackdropFilter')};
  color: ${CSSVar('tooltipColor')};
  padding: ${CSSVar('tooltipSpacingY')} ${CSSVar('tooltipSpacingX')};
`;

export const TextSuggestionList = styled.ul`
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
`;

// Gap between the anchor and the block when it opens to the side
const SIDE_GAP = 4;

function fits(
  placement: TSuggestionPlacement,
  { top, bottom, left }: TSuggestionAnchor,
  width: number,
  height: number
): boolean {
  switch (placement) {
    case 'above':
      return top - height >= 0;
    case 'below':
      return bottom + height <= window.innerHeight;
    case 'left-top':
      return left - SIDE_GAP - width >= 0;
    case 'left-bottom':
      return left - SIDE_GAP - width >= 0 && bottom - height >= 0;
  }
}

function getPlacementStyle(
  placement: TSuggestionPlacement | null,
  { top, bottom, left }: TSuggestionAnchor
): CSSProperties {
  switch (placement) {
    case 'above':
      return { top, left, transform: 'translateY(-100%)' };
    case 'below':
      return { top: bottom, left };
    case 'left-top':
      return { top, left: left - SIDE_GAP, transform: 'translateX(-100%)' };
    case 'left-bottom':
      return { top: bottom, left: left - SIDE_GAP, transform: 'translate(-100%, -100%)' };
    default:
      // Laid out for measuring, but not shown yet
      return { top, left, visibility: 'hidden' };
  }
}

// A floating panel next to a piece of text: the spelling suggestions, the character selector's
// options. It owns the look, the placement and the portal; content and keys are the caller's.
export function TextSuggestionBlock({
  anchor,
  placements,
  children,
  className,
  ref,
}: TTextSuggestionBlockProps) {
  const popperPortal = usePopperPortal();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // The panel's size follows its content (a loader, then suggestions; a filtered list), so it's
  // observed rather than re-measured on a list of dependencies. The first measure runs before
  // paint, so the panel never flashes in the wrong place; transforms don't affect offsetWidth/Height.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => setSize({ width: panel.offsetWidth, height: panel.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [popperPortal]);

  const placement = size
    ? (placements.find((candidate) => fits(candidate, anchor, size.width, size.height)) ??
      placements[placements.length - 1] ??
      null)
    : null;

  const setRefs = (node: HTMLDivElement | null) => {
    panelRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  if (!popperPortal) return null;
  // Portaled into the app's overlay layer: next to its text it would be trapped in that text's
  // stacking context (e.g. the focused editor row's z-index), under anything layered above it --
  // like the focused line's panel.
  return createPortal(
    <Panel ref={setRefs} className={className} style={getPlacementStyle(placement, anchor)}>
      {children}
    </Panel>,
    popperPortal
  );
}
