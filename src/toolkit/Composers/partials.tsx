import { TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('formRowSpacingInner')};
`;

export const OptionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${CSSVar('tagSpacingSmallX')};
`;

export const ValueRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${CSSVar('tagSpacingSmallX')};
  min-height: ${CSSVar('inputHeightRegular')};
  padding: ${CSSVar('inputSpacingYRegular')} ${CSSVar('inputSpacingXRegular')};
  border-radius: ${CSSVar('inputBorderRadius')};
  border: ${CSSVar('inputBorderWidth')} solid ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 10)};
`;
