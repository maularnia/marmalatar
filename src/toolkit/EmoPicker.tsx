import {
  cloneElement,
  HTMLAttributes,
  ReactElement,
  RefAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';
import { Picker } from 'emoji-picker-element';
import type { EmojiClickEvent } from 'emoji-picker-element/shared';
import { useTranslation } from 'react-i18next';
import Tooltip, { TooltipSimple } from '@ui-toolkit/Tooltip';
import { CSSVar } from '@src/theme/utils';

type EmoPickerSide = 'top' | 'right' | 'bottom' | 'left';

// Whatever EmoPicker wraps must be a single element that accepts an `onClick` and a `ref` to its
// underlying DOM node -- that's what lets EmoPicker attach its own behavior directly to it (no
// wrapping element, so no layout side effects) and is also what Tooltip/Radix need to anchor the
// popper correctly. React's handler/ref types are bivariant against their element type parameter
// (see RefCallback/EventHandler's `bivarianceHack` in @types/react), so this is satisfied by ordinary
// element-specific components (e.g. Button's `Ref<HTMLButtonElement>`) without any casts.
type EmoPickerTriggerProps = HTMLAttributes<HTMLElement> & RefAttributes<HTMLElement>;

type EmoPickerProps = {
  children: ReactElement<EmoPickerTriggerProps>;
  side?: EmoPickerSide;
  onEmojiSelect: (emoji: string) => void;
  closeOnSelect?: boolean;
};

const PickerHost = styled.div`
  width: ${CSSVar('emojiPickerWidth')};
  height: ${CSSVar('emojiPickerHeight')};
`;

// emoji-picker-element reads these as CSS custom properties scoped to its own shadow root, so they're
// injected as a <style> inside picker.shadowRoot rather than relying on cross-boundary inheritance.
// (--total-emoji-size is intentionally omitted: the library recomputes it internally from
// --emoji-size/--emoji-padding via its own `.picker{}` rule, so a :host override here is a no-op.)
const EMOJI_PICKER_SHADOW_VARS: Record<string, string> = {
  // The library renders emoji glyphs via this var, not the inherited `font-family` -- it sets its
  // own default on :host internally (see picker.js's EXTRA_STYLES), so it must be overridden here
  // rather than via `picker.style.fontFamily`, which only affects non-emoji text (search input etc).
  '--emoji-font-family': CSSVar('emojiPickerFontFamily'),
  '--background': CSSVar('emojiPickerBg'),
  '--border-color': CSSVar('emojiPickerBorderColor'),
  '--border-radius': CSSVar('emojiPickerBorderRadius'),
  '--border-size': CSSVar('emojiPickerBorderSize'),
  '--button-hover-background': CSSVar('emojiPickerButtonHoverBg'),
  '--button-active-background': CSSVar('emojiPickerButtonActiveBg'),
  '--category-font-color': CSSVar('emojiPickerCategoryFontColor'),
  '--category-font-size': CSSVar('emojiPickerCategoryFontSize'),
  '--emoji-padding': CSSVar('emojiPickerEmojiPadding'),
  '--emoji-size': CSSVar('emojiPickerEmojiSize'),
  '--indicator-color': CSSVar('emojiPickerIndicatorColor'),
  '--indicator-height': CSSVar('emojiPickerIndicatorHeight'),
  '--input-border-color': CSSVar('emojiPickerInputBorderColor'),
  '--input-border-radius': CSSVar('emojiPickerInputBorderRadius'),
  '--input-border-size': CSSVar('emojiPickerInputBorderSize'),
  '--input-font-color': CSSVar('emojiPickerInputFontColor'),
  '--input-font-size': CSSVar('emojiPickerInputFontSize'),
  '--input-line-height': CSSVar('emojiPickerInputLineHeight'),
  '--input-padding': CSSVar('emojiPickerInputPadding'),
  '--input-placeholder-color': CSSVar('emojiPickerInputPlaceholderColor'),
  '--num-columns': CSSVar('emojiPickerNumColumns'),
  '--outline-color': CSSVar('emojiPickerOutlineColor'),
  '--outline-size': CSSVar('emojiPickerOutlineSize'),
  '--skintone-border-radius': CSSVar('emojiPickerSkintoneBorderRadius'),
};

const EmojiShadowCSS = `
  .picker {
    border: none;
  }
  .search-row {
    gap: ${CSSVar('size10')}
  }
  .nav {
    padding-bottom: ${CSSVar('size4')}
  }
  .tabpanel::-webkit-scrollbar {
    width: ${CSSVar('appScrollbarWidth')};
  }
  .tabpanel::-webkit-scrollbar-track {
    background: ${CSSVar('appScrollbarTrackColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
  .tabpanel::-webkit-scrollbar-thumb {
    width: calc(${CSSVar('appScrollbarWidth')} * 2);
    background: ${CSSVar('appScrollbarThumbColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
  .favorites {
    border-top: none;
    padding-top: ${CSSVar('size4')};
    overflow: visible;
  }
`;

const EmojiPickerShadowStyles = `:host{${Object.entries(EMOJI_PICKER_SHADOW_VARS)
  .map(([name, value]) => `${name}:${value}`)
  .join(';')}}${EmojiShadowCSS}`;

// A single <emoji-picker> instance shared by every EmoPicker in the app, created once and never
// destroyed. Radix Tooltip's hover/grace-area state changes can re-render the content tree, and a
// per-instance mount/unmount approach was getting torn down and recreated by that churn (losing
// scroll position/search text). Opening an EmoPicker re-parents this single instance into its own
// content container and force-closes whichever EmoPicker previously owned it.
let sharedPicker: Picker | null = null;
let activeOnSelect: ((emoji: string) => void) | null = null;

function getSharedPicker(): Picker {
  if (sharedPicker) return sharedPicker;

  const picker = new Picker({ locale: 'en' });
  picker.style.width = '100%';
  picker.style.height = '100%';
  picker.style.fontFamily = CSSVar('emojiPickerFontFamily');

  const style = document.createElement('style');
  style.textContent = EmojiPickerShadowStyles;
  picker.shadowRoot?.appendChild(style);

  picker.addEventListener('emoji-click', (event: EmojiClickEvent) => {
    const { unicode } = event.detail;
    if (unicode) activeOnSelect?.(unicode);
  });

  sharedPicker = picker;
  return picker;
}

type PickerOwner = {
  token: object;
  close: () => void;
};

let currentOwner: PickerOwner | null = null;

function claimSharedPicker(
  owner: PickerOwner,
  container: HTMLElement,
  onSelect: (emoji: string) => void
): void {
  if (currentOwner && currentOwner.token !== owner.token) {
    currentOwner.close();
  }
  currentOwner = owner;
  activeOnSelect = onSelect;
  container.appendChild(getSharedPicker());
}

function releaseSharedPicker(token: object): void {
  if (currentOwner?.token !== token) return;
  currentOwner = null;
  activeOnSelect = null;
  sharedPicker?.remove();
}

export default function EmoPicker({
  children,
  side = 'bottom',
  onEmojiSelect,
  closeOnSelect = true,
}: EmoPickerProps) {
  const { t } = useTranslation('tooltips');
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentNodeRef = useRef<HTMLDivElement | null>(null);
  const ownerTokenRef = useRef({});

  const onEmojiSelectRef = useRef(onEmojiSelect);
  onEmojiSelectRef.current = onEmojiSelect;
  const closeOnSelectRef = useRef(closeOnSelect);
  closeOnSelectRef.current = closeOnSelect;

  // A ref callback (not a [open]-keyed effect) so claiming happens exactly when Radix's Presence
  // actually attaches this node to the DOM -- that can take an extra render pass after `open` flips
  // true, and an effect keyed on `open` alone would fire too early, find nothing to claim into, and
  // never get a chance to retry.
  const setContentNode = useCallback((node: HTMLDivElement | null) => {
    contentNodeRef.current = node;
    if (!node) return;

    const token = ownerTokenRef.current;
    claimSharedPicker({ token, close: () => setOpen(false) }, node, (emoji) => {
      onEmojiSelectRef.current(emoji);
      if (closeOnSelectRef.current) setOpen(false);
    });

    return () => releaseSharedPicker(token);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || contentNodeRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const trigger = cloneElement(children, {
    ref: triggerRef,
    onClick: (event) => {
      children.props.onClick?.(event);
      setOpen((isOpen) => !isOpen);
    },
  });

  return (
    <Tooltip
      side={side}
      forceOpen={open}
      ariaLabel={t('emoPicker.ariaLabel')}
      label={
        <TooltipSimple>
          <PickerHost ref={setContentNode} />
        </TooltipSimple>
      }
    >
      {trigger}
    </Tooltip>
  );
}
