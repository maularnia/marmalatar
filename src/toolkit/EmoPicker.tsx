import {
  cloneElement,
  HTMLAttributes,
  ReactElement,
  RefAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';
import EmojiPicker, {
  Categories,
  type CategoryIcons,
  type EmojiClickData,
} from 'emoji-picker-react';
import { useTranslation } from 'react-i18next';
import Tooltip, { TooltipSimple } from '@ui-toolkit/Tooltip';
import { staticVars } from '@src/theme/static';
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

const CategoryIcon = styled.span`
  font-family: ${CSSVar('emojiPickerFontFamily')};
  font-size: ${CSSVar('emojiPickerNavIconSize')};
  line-height: 1;
`;

// Emoji glyphs instead of the library's line icons, as the tabs looked before
const CATEGORY_ICONS: CategoryIcons = {
  [Categories.SUGGESTED]: <CategoryIcon>🕘</CategoryIcon>,
  [Categories.SMILEYS_PEOPLE]: <CategoryIcon>😀</CategoryIcon>,
  [Categories.ANIMALS_NATURE]: <CategoryIcon>🐱</CategoryIcon>,
  [Categories.FOOD_DRINK]: <CategoryIcon>🍎</CategoryIcon>,
  [Categories.TRAVEL_PLACES]: <CategoryIcon>🏠</CategoryIcon>,
  [Categories.ACTIVITIES]: <CategoryIcon>⚽</CategoryIcon>,
  [Categories.OBJECTS]: <CategoryIcon>📝</CategoryIcon>,
  [Categories.SYMBOLS]: <CategoryIcon>⛔</CategoryIcon>,
  [Categories.FLAGS]: <CategoryIcon>🏁</CategoryIcon>,
};

const PREVIEW_CONFIG = { showPreview: false };

// The picker's look comes from its --epr-* tokens, every one linked to the emojiPicker theme chapter.
// Its token defaults sit at zero specificity, but its part rules (borders, label typography) are
// plain classes injected at runtime, so overrides use `&&` to win regardless of injection order.
// No borders or separators: space (the spacing tokens) is what separates the search row, the tabs
// and the grid.
const Picker = styled(EmojiPicker)`
  && {
    --epr-font-family: ${CSSVar('emojiPickerFontFamily')};
    --epr-emoji-font-family: ${CSSVar('emojiPickerFontFamily')};
    --epr-bg-color: ${CSSVar('emojiPickerBg')};
    --epr-text-color: ${CSSVar('emojiPickerCategoryFontColor')};
    --epr-highlight-color: ${CSSVar('emojiPickerAccentColor')};
    --epr-hover-bg-color: ${CSSVar('emojiPickerButtonHoverBg')};
    --epr-hover-bg-color-reduced-opacity: ${CSSVar('emojiPickerButtonHoverBg')};
    --epr-focus-bg-color: ${CSSVar('emojiPickerButtonActiveBg')};
    --epr-picker-border-radius: ${CSSVar('emojiPickerBorderRadius')};
    /* The variation menu's border, which the picker can't drop, blends in */
    --epr-picker-border-color: ${CSSVar('emojiPickerBg')};

    --epr-horizontal-padding: ${CSSVar('emojiPickerSpacingX')};
    --epr-header-padding: 0 ${CSSVar('emojiPickerSpacingX')} ${CSSVar('emojiPickerSpacingY')};
    --epr-emoji-size: ${CSSVar('emojiPickerEmojiSize')};
    --epr-emoji-padding: ${CSSVar('emojiPickerEmojiPadding')};

    --epr-search-input-height: ${CSSVar('emojiPickerInputHeight')};
    --epr-search-input-border-radius: ${CSSVar('emojiPickerInputBorderRadius')};
    --epr-search-input-bg-color: ${CSSVar('emojiPickerBg')};
    --epr-search-input-bg-color-active: ${CSSVar('emojiPickerBg')};
    --epr-search-input-text-color: ${CSSVar('emojiPickerInputFontColor')};
    --epr-search-input-placeholder-color: ${CSSVar('emojiPickerInputPlaceholderColor')};
    --epr-search-icon-color: ${CSSVar('emojiPickerInputPlaceholderColor')};

    --epr-category-navigation-button-size: ${CSSVar('emojiPickerNavButtonSize')};
    --epr-category-icon-active-color: ${CSSVar('emojiPickerAccentColor')};
    --epr-category-icon-inactive-color: ${CSSVar('emojiPickerCategoryFontColor')};
    --epr-category-label-height: ${CSSVar('emojiPickerCategoryLabelHeight')};
    --epr-category-label-bg-color: ${CSSVar('emojiPickerBg')};
    --epr-category-label-text-color: ${CSSVar('emojiPickerCategoryFontColor')};

    --epr-emoji-variation-picker-bg-color: ${CSSVar('emojiPickerBg')};
    --epr-emoji-variation-indicator-color: ${CSSVar('emojiPickerInputPlaceholderColor')};
    --epr-emoji-variation-indicator-color-hover: ${CSSVar('emojiPickerCategoryFontColor')};

    border: none;
  }

  && [data-epr-part='search-input'],
  && [data-epr-part='search-input']:focus {
    border: none;
    font-size: ${CSSVar('emojiPickerInputFontSize')};
  }

  && [data-epr-part='category-tab'] {
    border-radius: ${CSSVar('emojiPickerBorderRadius')};
  }
  && [data-epr-part='category-tab']:hover {
    background: ${CSSVar('emojiPickerButtonHoverBg')};
  }
  /* The active tab and keyboard focus are a background, not the library's ring */
  && [data-epr-part='category-tab'][aria-selected='true'],
  && [data-epr-part='category-tab']:focus-visible {
    background: ${CSSVar('emojiPickerButtonActiveBg')};
  }
  && [data-epr-part='category-tab']:focus::before {
    display: none;
  }

  && [data-epr-part='category-label'] {
    font-size: ${CSSVar('emojiPickerCategoryFontSize')};
    font-weight: ${CSSVar('emojiPickerCategoryFontWeight')};
  }

  && [data-epr-part='viewport']::-webkit-scrollbar {
    width: ${CSSVar('appScrollbarWidth')};
  }
  && [data-epr-part='viewport']::-webkit-scrollbar-track {
    background: ${CSSVar('appScrollbarTrackColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
  && [data-epr-part='viewport']::-webkit-scrollbar-thumb {
    background: ${CSSVar('appScrollbarThumbColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
`;

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

  const handleEmojiClick = ({ emoji }: EmojiClickData) => {
    onEmojiSelect(emoji);
    if (closeOnSelect) setOpen(false);
  };

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
          {/* React events bubble through the portal to the React parent, not the DOM one: without
              this, a click in the picker reaches whatever wraps the trigger (a menu item opens its
              project). The picker reserves its own event props, hence the wrapper. */}
          <div ref={contentNodeRef} onClick={(e) => e.stopPropagation()}>
            {/* Mounted while open only: the dataset is in memory, so there's nothing to keep alive,
                and each open starts with an empty search. No autofocus: opening a picker doesn't
                take focus away from where it was, as before. */}
            <Picker
              height={CSSVar('emojiPickerHeight')}
              columns={staticVars.emojiPickerNumColumns.value}
              previewConfig={PREVIEW_CONFIG}
              categoryIcons={CATEGORY_ICONS}
              autoFocusSearch={false}
              skinTonesDisabled
              onEmojiClick={handleEmojiClick}
            />
          </div>
        </TooltipSimple>
      }
    >
      {trigger}
    </Tooltip>
  );
}
