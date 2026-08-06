import { TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import styled from 'styled-components';
import Span from '../../Span';
import { ValueRow } from '../partials';

export const JsonValueRow = styled(ValueRow)<{ $hasErrors?: boolean }>`
  flex-direction: column;
  align-items: stretch;
  flex-wrap: nowrap;
  font-family: ${CSSVar('fontMonospace')};

  ${({ $hasErrors }) =>
    $hasErrors && `border-color: ${CSSColor(ThemeColors.RED, TShade.DEFAULT, 40)};`}
`;

export const Brace = styled(Span)`
  opacity: ${CSSVar('opacity-50')};
  font-size: ${CSSVar('tagTextSizeSmall')};
`;

export const EntryRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${CSSVar('tagSpacingSmallX')};
  padding-left: ${CSSVar('inputSpacingXRegular')};
`;

export const Colon = styled(Span)`
  opacity: ${CSSVar('opacity-50')};
  font-size: ${CSSVar('tagTextSizeSmall')};
`;

export const FieldNameInput = styled.input`
  all: unset;
  min-width: 30px;
  field-sizing: content;
  font-family: inherit;
  font-size: ${CSSVar('tagTextSizeSmall')};
  border-bottom: ${CSSVar('inputBorderWidth')} dashed
    ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 20)};
`;

export const Errors = styled.span`
  display: inline-flex;
  flex-direction: column;
  gap: ${CSSVar('inputSpacingYRegular')};
`;
