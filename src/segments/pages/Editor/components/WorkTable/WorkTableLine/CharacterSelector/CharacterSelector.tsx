import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { TCharacter } from '@src/types';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { noop } from '@utils/noop';
import classNames from 'classnames';
import {
  KeyboardEventHandler,
  Ref,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
} from 'react';
import styled, { css } from 'styled-components';

const Container = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  flex: 1 1 auto;
`;
const CharacterList = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: ${CSSVar('mainTableCharacterSelectorSpacingInnerX')};
  padding: ${CSSVar('mainTableLineCellSpacingY')} ${CSSVar('mainTableLineCellSpacingX')};
  color: ${CSSVar('mainTableLineColorFocus')};
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('mainTableTextSize')};
  border-radius: ${CSSVar('inputBorderRadius')};

  &:hover {
    background: ${CSSVar('mainTableLineCellBgHover')};
  }

  &:focus-within {
    background: ${CSSVar('mainTableLineCellBgFocus')};
  }

  &.suggested {
    &,
    &:hover,
    &:focus-within {
      background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 20)};
      backdrop-filter: ${CSSVar('inputDropdownBackdropFilter')};
      border-radius: ${CSSVar('inputBorderRadius')} ${CSSVar('inputBorderRadius')} 0 0;
    }
  }
`;

const CharacterInput = styled.div`
  background: transparent;
  display: inline-flex;
  white-space: nowrap;
  outline: none;
  line-height: ${CSSVar('tagTextSizeRegular')};
  font-size: ${CSSVar('tagTextSizeRegular')};
  padding: ${CSSVar('tagSpacingRegularY')} ${CSSVar('tagSpacingRegularY')};
  &[type='text'] {
    min-height: 0;
    max-width: 100%;
    height: ${CSSVar('inputHeightSmall')};
  }
`;

const SuggestionList = styled.div`
  position: absolute;
  top: 100%;
  display: flex;
  flex-direction: column;
  z-index: 3;
  min-width: 100%;
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 20)};
  box-shadow: ${CSSVar('inputDropdownShadow')};
  backdrop-filter: ${CSSVar('inputDropdownBackdropFilter')};
  max-height: 100px;
  overflow-y: auto;
  padding: 0 ${CSSVar('inputDropdownSpacingInner')} ${CSSVar('inputDropdownSpacingInner')};
  border-radius: 0 0 ${CSSVar('inputBorderRadius')} ${CSSVar('inputBorderRadius')};

  &::-webkit-scrollbar {
    width: ${CSSVar('mainTableCharacterSelectorScrollbarWidth')};
  }

  &::-webkit-scrollbar-track {
    background: ${CSSVar('mainTableCharacterSelectorScrollbarTrackColor')};
    border-radius: ${CSSVar('mainTableCharacterSelectorScrollbarBorderRadius')};
  }

  &::-webkit-scrollbar-thumb {
    background: ${CSSVar('mainTableCharacterSelectorScrollbarThumbColor')};
    border-radius: ${CSSVar('mainTableCharacterSelectorScrollbarBorderRadius')};
  }
`;

const CharacterOption = styled.div<{ $focused?: boolean }>`
  display: flex;
  padding: ${CSSVar('mainTableCharacterSelectorSpacingInnerY')}
    ${CSSVar('mainTableCharacterSelectorSpacingInnerX')};
  background-color: ${CSSVar('inputOptionBg')};
  color: ${CSSVar('inputOptionColor')};
  border-radius: ${CSSVar('inputBorderRadius')};
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 100%;
  transition: background-color 0.1s ease;
  cursor: pointer;

  &:hover {
    background-color: ${CSSVar('inputOptionBgFocused')};
    color: ${CSSVar('inputOptionColorFocused')};
  }

  ${({ $focused }) =>
    $focused &&
    css`
      background-color: ${CSSVar('inputOptionBgFocused')};
      color: ${CSSVar('inputOptionColorFocused')};
    `}
`;

export type CharacterSelectorHandle = {
  inputRef: HTMLDivElement | null;
};

type CharacterSelectorProps = {
  ref?: Ref<CharacterSelectorHandle>;
  line_no: number;
  characters: TCharacter[];
  value: string[];
  onChange: (value: string[]) => void;
  onFocus?: () => void;
  disabled?: boolean;
};

type SelectorState = {
  value: string[];
  options: TCharacter[];
  focusedOptionIndex: number;
  filterFocused: boolean;
  filterValue: string;
  suggestions: TCharacter[];
};

const getSelectorDefaultState = (value: string[], options: TCharacter[]): SelectorState => ({
  value: [...value],
  options: [...options],
  filterFocused: false,
  filterValue: '',
  focusedOptionIndex: 0,
  suggestions: [],
});

type Actions =
  | { type: 'SET_VALUE'; payload: string[] }
  | { type: 'SET_OPTIONS'; payload: TCharacter[] }
  | { type: 'SET_FILTER_FOCUSED'; payload: boolean }
  | { type: 'SET_FOCUSED_OPTION_INDEX'; payload: number }
  | { type: 'SET_FILTER_VALUE'; payload: string };

const reducer = (state: SelectorState, action: Actions): SelectorState => {
  switch (action.type) {
    case 'SET_VALUE':
      return {
        ...state,
        value: [...action.payload],
        filterValue: '',
        focusedOptionIndex: 0,
        suggestions: [],
      };
    case 'SET_OPTIONS':
      return {
        ...state,
        value: [...state.value.filter((v) => action.payload.some((item) => item.name === v))],
        options: [...action.payload],
        filterValue: '',
        focusedOptionIndex: 0,
        suggestions: action.payload.filter((option) => !state.value.includes(option.name)),
      };
    case 'SET_FILTER_FOCUSED':
      return {
        ...state,
        filterFocused: action.payload,
        focusedOptionIndex: 0,
      };
    case 'SET_FILTER_VALUE':
      return {
        ...state,
        filterValue: action.payload,
        focusedOptionIndex: 0,
        suggestions: state.options.filter(
          (option) =>
            !state.value.includes(option.name) &&
            option.name.toLowerCase().includes(action.payload.toLowerCase())
        ),
      };
    case 'SET_FOCUSED_OPTION_INDEX':
      return {
        ...state,
        focusedOptionIndex: action.payload
          ? action.payload > 0 // when > 0, cycle through options
            ? state.suggestions[action.payload - 1]
              ? action.payload
              : state.suggestions.length - 1
            : state.value[state.value.length + action.payload] // when < 0, cycle through values
              ? action.payload
              : -state.value.length
          : action.payload, // when zero, just apply te value
      };
    default:
      return state;
  }
};

export function CharacterSelector({
  ref,
  line_no,
  characters,
  value,
  onChange,
  onFocus,
  disabled = false,
}: CharacterSelectorProps) {
  const [state, dispatch] = useReducer(reducer, getSelectorDefaultState(value, characters));
  const colorByName = new Map(state.options.map((item) => [item.name, item.color]));
  const inputDiv = useRef<HTMLDivElement>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({ inputRef: inputDiv.current }), []);
  useEffect(() => {
    dispatch({ type: 'SET_VALUE', payload: value });
    if (inputDiv.current) inputDiv.current.textContent = '';
  }, [value]);
  useEffect(() => {
    dispatch({ type: 'SET_OPTIONS', payload: characters });
    if (inputDiv.current) inputDiv.current.textContent = '';
  }, [characters]);

  const deleteOptionByIndex = (index: number) => {
    state.value.splice(index >= 0 ? index : value.length + index, 1);
  };

  const deleteFocusedOption: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (state.focusedOptionIndex > 0) {
      event.preventDefault();
      onChange([...value, state.suggestions[state.focusedOptionIndex - 1].name]);
    }
    if (state.focusedOptionIndex < 0) {
      deleteOptionByIndex(state.focusedOptionIndex);
      onChange([...state.value]);
      event.preventDefault();
    }
  };
  const suggestionListVisible = Boolean(
    state.filterFocused && state.filterValue && state.suggestions.length
  );

  useEffect(() => {
    if (!suggestionListRef.current || state.focusedOptionIndex <= 0) return;
    const focused = suggestionListRef.current.children[state.focusedOptionIndex - 1] as
      | HTMLElement
      | undefined;
    focused?.scrollIntoView({ block: 'nearest' });
  }, [state.focusedOptionIndex]);
  return (
    <Container tabIndex={1} onFocus={() => inputDiv.current?.focus()}>
      <CharacterList className={classNames({ suggested: suggestionListVisible })}>
        {state.value.map((item, index) => (
          <Tag
            onClick={() => {
              if (disabled) return;
              if (!state.filterFocused) {
                inputDiv.current?.focus();
                return;
              }
              onChange(state.value.filter((v) => v !== item));
            }}
            color={colorByName.get(item) ?? ThemeColors.ACCENT1}
            variant={TTagVariant.PRIMARY}
            onRemove={state.value.length + state.focusedOptionIndex == index ? noop : undefined}
            size={TTagSize.SMALL}
            key={item}
          >
            {item}
          </Tag>
        ))}
        <CharacterInput
          ref={inputDiv}
          contentEditable={!disabled}
          onKeyDown={(event) => {
            if (disabled || !inputDiv.current) return;
            switch (event.key) {
              case 'ArrowUp': {
                event.preventDefault();
                return dispatch({
                  type: 'SET_FOCUSED_OPTION_INDEX',
                  payload: state.focusedOptionIndex - 1,
                });
              }
              case 'ArrowDown': {
                event.preventDefault();
                return dispatch({
                  type: 'SET_FOCUSED_OPTION_INDEX',
                  payload: state.focusedOptionIndex + 1,
                });
              }
              case 'Enter': {
                event.preventDefault();
                return state.focusedOptionIndex === 0
                  ? onChange([...state.value, inputDiv.current.textContent])
                  : void deleteFocusedOption(event);
              }
              case 'Delete': {
                event.preventDefault();
                if (state.focusedOptionIndex !== 0) return;
                return void deleteFocusedOption(event);
              }
              case 'Backspace': {
                if (state.focusedOptionIndex !== 0) return;
                if (!inputDiv.current.textContent) {
                  deleteOptionByIndex(-1);
                  onChange([...state.value]);
                } else {
                  deleteFocusedOption(event);
                }
              }
            }
          }}
          onInput={(event) => {
            if (disabled) return;
            dispatch({
              type: 'SET_FILTER_VALUE',
              payload: (event.target as HTMLDivElement).textContent,
            });
          }}
          data-line-characterinput={line_no}
          onBlur={() => {
            dispatch({ type: 'SET_FILTER_FOCUSED', payload: false });
          }}
          onFocus={() => {
            if (disabled) return;
            dispatch({ type: 'SET_FILTER_FOCUSED', payload: true });
            onFocus?.();
          }}
        />
      </CharacterList>
      {suggestionListVisible ? (
        <SuggestionList ref={suggestionListRef}>
          {state.suggestions.map((character, index) => (
            <CharacterOption
              key={character.name}
              $focused={state.focusedOptionIndex === index + 1}
              onClick={() => {
                if (disabled) return;
                onChange([...value, character.name]);
              }}
            >
              <Tag color={character.color} variant={TTagVariant.PRIMARY} size={TTagSize.SMALL}>
                {character.name}
              </Tag>
            </CharacterOption>
          ))}
        </SuggestionList>
      ) : null}
    </Container>
  );
}
