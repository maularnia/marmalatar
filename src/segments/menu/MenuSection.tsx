import { CSSVar } from '@src/theme/utils';
import styled from 'styled-components';

export const MenuSection = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: ${CSSVar('projectListSpacingY')} ${CSSVar('projectListSpacingX')};
  background: ${CSSVar('projectListSectionBg')};
  border-radius: ${CSSVar('projectListSectionBorderRadius')};
`;
