import { settings } from '@src/services/settings';
import { TTheme } from '@src/theme/types';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelector } from '@store/hooks';
import H from '@ui-toolkit/H';
import Hr, { THrVariant } from '@ui-toolkit/Hr/Hr';
import Span from '@ui-toolkit/Span';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { useMemo } from 'react';
import styled from 'styled-components';

type TAlphaTagListProps = {
  dictionary: string[];
  tagSize?: TTagSize;
  onRemove: (word: string) => void;
  /** The list's height in px; longer lists scroll */
  height?: number;
  label: string;
  /** The words' locale (be, en, ...): sorting and the letters follow its alphabet. The app's
   * default locale when omitted. */
  locale?: string;
};

const Root = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

// Looks like a TextInput's label once the input has a value: always shown above the field
const Label = styled(Span)<{ $theme: TTheme }>`
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('inputTextSizeRegular')};
  line-height: 1.28;
  padding: ${CSSVar('inputSpacingXNano')} 0;
  color: ${({ $theme }) =>
    CSSColor(
      ThemeColors.TEXT,
      $theme.variables.inputColorShade.value,
      $theme.variables.inputColorOpacity.value
    )};
`;

// The input chapter's border, background and spacing, so it sits among the form's fields
const Box = styled.div<{ $theme: TTheme }>`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('inputSpacingYInnerRegular')};
  overflow-y: auto;
  padding: ${CSSVar('inputSpacingYInnerRegular')} ${CSSVar('inputSpacingXRegular')};
  border-radius: ${CSSVar('inputBorderRadius')};
  box-shadow: ${CSSVar('inputShadow')};
  background: ${({ $theme }) =>
    CSSColor(
      ThemeColors.TEXT,
      $theme.variables.inputBgShade.value,
      $theme.variables.inputBgOpacity.value
    )};
  border: ${CSSVar('inputBorderWidth')} solid
    ${({ $theme }) =>
      CSSColor(
        ThemeColors.TEXT,
        $theme.variables.inputBorderColorShade.value,
        $theme.variables.inputBorderColorOpacity.value
      )};

  &::-webkit-scrollbar {
    width: ${CSSVar('appScrollbarWidth')};
  }
  &::-webkit-scrollbar-track {
    background: ${CSSVar('appScrollbarTrackColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
  &::-webkit-scrollbar-thumb {
    background: ${CSSVar('appScrollbarThumbColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('inputSpacingXInnerRegular')};
`;

// The letter, then the separator filling the rest of the line
const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${CSSVar('inputSpacingXInnerRegular')};
`;

const GroupRule = styled(Hr)`
  flex: 1 1 auto;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${CSSVar('inputSpacingXInnerRegular')};
`;

type TLetterGroup = { letter: string; words: string[] };

// The words sorted in their alphabet (letter case ignored, numbers by value), under their first
// letter. Only letters that have words get a group.
function groupByLetter(words: readonly string[], locale?: string): TLetterGroup[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  const groups: TLetterGroup[] = [];
  for (const word of [...words].sort(collator.compare)) {
    // The first character, not half of a surrogate pair
    const letter = (Array.from(word)[0] ?? '').toLocaleUpperCase(locale);
    const last = groups[groups.length - 1];
    if (last && collator.compare(last.letter, letter) === 0) last.words.push(word);
    else groups.push({ letter, words: [word] });
  }
  return groups;
}

/** A labeled, scrollable list of words grouped under their first letter, each removable */
export function AlphaTagList({
  dictionary,
  tagSize = TTagSize.SMALL,
  onRemove,
  height = 400,
  label,
  locale,
}: TAlphaTagListProps) {
  const theme = useAppSelector(settings.selectCurrentThemeData);
  const groups = useMemo(() => groupByLetter(dictionary, locale), [dictionary, locale]);

  return (
    <Root>
      <Label $theme={theme}>{label}</Label>
      <Box $theme={theme} style={{ maxHeight: height }}>
        {groups.map(({ letter, words }) => (
          <Group key={letter}>
            <GroupHeader>
              <H level={5}>{letter}</H>
              <GroupRule variant={THrVariant.DIMMED} />
            </GroupHeader>
            <Tags>
              {words.map((word) => (
                <Tag
                  key={word}
                  variant={TTagVariant.SECONDARY}
                  size={tagSize}
                  color={ThemeColors.TEXT}
                  onRemove={() => onRemove(word)}
                >
                  {word}
                </Tag>
              ))}
            </Tags>
          </Group>
        ))}
      </Box>
    </Root>
  );
}
