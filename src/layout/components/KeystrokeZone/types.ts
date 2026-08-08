import { EventBusOptions, ShortcutSettings } from 'react-keyhub';
import { PropsWithChildren, RefObject } from 'react';

export type KeystrokeZoneHintCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type KeystrokeZoneHint = {
  corner?: KeystrokeZoneHintCorner;
};

export type KeystrokeZoneProps = PropsWithChildren<{
  shortcuts?: ShortcutSettings;
  shortcutOptions?: Omit<EventBusOptions, 'target'>;
  ignoreEditableElements?: boolean;
  /** Opts into the global ctrl+1..0 registry + auto-numbered corner hint. Omit for zones that
   * aren't meant to be jumped to directly (e.g. Glossary, nested inside the Overlays region). */
  hint?: KeystrokeZoneHint;
  /** Forwarded alongside the zone's own isFocusWithin state -- for callers with unrelated needs
   * that also depend on "is focus currently inside this zone" (Menu's collapsible-sidebar logic). */
  onFocusWithinChange?: (isWithin: boolean) => void;
  fit?: 'fill' | 'content';
}>;

export type KeystrokeZoneContextType = {
  /** The zone's current "focus me" target -- read by the registered global focus action, written
   * naturally by the zone's own onFocus handler, and seedable by any descendant that wants to
   * register itself as the zone's fallback default (e.g. a first row, a Settings button). */
  zoneRef: RefObject<HTMLElement | null>;
  /** Overrides the zone's default focus behavior (a bare zoneRef.current?.focus()) with custom
   * logic -- e.g. Editor prefers handleChangeFocusedColumn's richer treatment over a plain
   * .focus() call. */
  setFocusOverride: (fn: (() => void) | undefined) => void;
};
