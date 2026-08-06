import { TColor, TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar } from '@src/theme/utils';
import { css } from 'styled-components';

export type SpellCheckMark = {
  id: string;
  start: number;
  end: number;
  word: string;
  suggestions: string[];
};

export const getMarkCss = (color: TColor) => css`
  background: ${CSSColor(color, TShade.DEFAULT, 5)};
  color: inherit;
  border-radius: ${CSSVar('markBorderRadius')};
  box-shadow: 0 0 0 ${CSSVar('markUnderlineWidth')} ${CSSColor(color, TShade.DEFAULT, 20)};
`;
