import { useGlobalKeystrokeRegistry } from '@providers/GlobalKeystroke/GlobalKeystrokeDispatcher';
import { TKeystrokeSlot } from '@providers/GlobalKeystroke/types';
import { ScopedKeyHubProvider } from '@providers/ScopedKeyHubProvider';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import Tooltip, { TooltipComplex } from '@ui-toolkit/Tooltip';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useShortcutPause } from 'react-keyhub';
import styled, { css } from 'styled-components';
import { KeystrokeZoneContextType, KeystrokeZoneProps } from './types';
import { useIsCtrlHeld } from './useIsCtrlHeld';

const ZoneRoot = styled.div<{ $fit: 'fill' | 'content' }>`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  ${({ $fit }) =>
    $fit === 'fill'
      ? css`
          width: 100%;
          height: 100%;
        `
      : css`
          width: min-content;
          height: min-content;
        `}
`;

// Shown only while Ctrl is held (the moment its Ctrl+number shortcut is in reach). Otherwise it's
// fully transparent and click-through, so it never covers the zone's real content. While shown,
// only the badge itself is interactive (for its explanatory tooltip on hover); everything around
// it stays click-through, since it's an absolutely-positioned overlay on top of the zone.
const HintBadge = styled.div`
  position: absolute;
  top: ${CSSVar('size4')};
  left: ${CSSVar('size4')};
  display: flex;
  align-items: center;
  gap: ${CSSVar('size1')};
  cursor: help;
  z-index: 99;
  opacity: 0;
  pointer-events: none;
  transition: opacity 100ms ease-in-out;
  &.isVisible {
    opacity: 1;
    pointer-events: auto;
  }
`;

// Radix renders popper content (tooltips, the emoji picker) into a portal wrapped in this element
const POPPER_WRAPPER_SELECTOR = '[data-radix-popper-content-wrapper]';

export const KeystrokeZoneContext = createContext<KeystrokeZoneContextType>({
  zoneRef: { current: null },
  setFocusOverride: () => {},
});

// Must render inside ScopedKeyHubProvider's own KeyHubProvider (useShortcutPause reads the
// nearest one via useKeyHub()).
function ShortcutPauseBridge({ paused, children }: PropsWithChildren<{ paused: boolean }>) {
  useShortcutPause(paused);
  return <>{children}</>;
}

export default function KeystrokeZone({
  shortcuts,
  shortcutOptions,
  ignoreEditableElements,
  hint,
  onFocusWithinChange,
  fit = 'fill',
  children,
}: KeystrokeZoneProps) {
  const { t } = useTranslation('tooltips');
  const containerRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLElement | null>(null);
  const focusOverrideRef = useRef<(() => void) | undefined>(undefined);
  const { registerZone, unregisterZone } = useGlobalKeystrokeRegistry();
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [slot, setSlot] = useState<TKeystrokeSlot | null>(null);
  const isCtrlHeld = useIsCtrlHeld();

  const setFocusOverride = useCallback((fn: (() => void) | undefined) => {
    focusOverrideRef.current = fn;
  }, []);

  // Stable identity across renders (only the first call's closure is ever kept) -- registered once
  // with the global registry, but always reads the latest override/ref/container at call time, so
  // it never goes stale and the registration effect below never needs to churn.
  const focusZoneActionRef = useRef(() => {
    if (focusOverrideRef.current) {
      focusOverrideRef.current();
      return;
    }
    (zoneRef.current ?? containerRef.current)?.focus();
  });

  const hasHint = Boolean(hint);
  useEffect(() => {
    if (!hasHint) return;
    const assigned = registerZone(focusZoneActionRef.current);
    setSlot(assigned);
    return () => unregisterZone(assigned);
  }, [hasHint, registerZone, unregisterZone]);

  const onFocusWithinChangeRef = useRef(onFocusWithinChange);
  onFocusWithinChangeRef.current = onFocusWithinChange;

  // Whether focus is inside the zone, by where it really is on the page (native events and
  // `contains`), not by React's component tree: React's onFocus/onBlur count a portal rendered from
  // inside the zone as inside it, and an element removed while focused (an emoji picked in the
  // picker, which then closes) fires no blur at all -- either left the zone believing it still had
  // focus. Focus inside a popper (a tooltip, the emoji picker) changes nothing: it belongs to
  // whichever zone opened it. A pointerdown re-checks after the browser has moved focus, which also
  // catches focus that silently dropped to the page body.
  useEffect(() => {
    let isWithin = false;
    const sync = (target: EventTarget | null) => {
      if (target instanceof Element && target.closest(POPPER_WRAPPER_SELECTOR)) return;
      const next = target instanceof Node && Boolean(containerRef.current?.contains(target));
      if (next && target instanceof HTMLElement) zoneRef.current = target;
      if (next === isWithin) return;
      isWithin = next;
      setIsFocusWithin(next);
      onFocusWithinChangeRef.current?.(next);
    };
    const handleFocusIn = (event: globalThis.FocusEvent) => sync(event.target);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const handlePointerDown = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => sync(document.activeElement));
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, []);

  const contextValue = useMemo<KeystrokeZoneContextType>(
    () => ({ zoneRef, setFocusOverride }),
    [setFocusOverride]
  );

  return (
    <ZoneRoot ref={containerRef} tabIndex={0} $fit={fit}>
      <KeystrokeZoneContext value={contextValue}>
        {shortcuts ? (
          <ScopedKeyHubProvider
            shortcuts={shortcuts}
            options={shortcutOptions}
            ignoreEditableElements={ignoreEditableElements}
          >
            <ShortcutPauseBridge paused={!isFocusWithin}>{children}</ShortcutPauseBridge>
          </ScopedKeyHubProvider>
        ) : (
          children
        )}
      </KeystrokeZoneContext>
      {hint && slot !== null && (
        <Tooltip
          label={
            <TooltipComplex title={t('keystrokeZone.areaTitle', { slot })}>
              {t('keystrokeZone.hintPrefix')}{' '}
              <Tag variant={TTagVariant.SECONDARY} size={TTagSize.NANO} color={ThemeColors.TEXT}>
                Ctrl
              </Tag>
              {'+'}
              <Tag variant={TTagVariant.SECONDARY} size={TTagSize.NANO} color={ThemeColors.TEXT}>
                {slot}
              </Tag>
              <br />
              {t('keystrokeZone.hintSuffix')}
            </TooltipComplex>
          }
          side="bottom"
        >
          <HintBadge className={classNames({ isVisible: isCtrlHeld })}>
            <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
              {String(slot)}
            </Tag>
          </HintBadge>
        </Tooltip>
      )}
    </ZoneRoot>
  );
}
