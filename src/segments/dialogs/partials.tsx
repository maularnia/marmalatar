import { CSSVar } from '@src/theme/utils';
import Message from '@src/toolkit/Message';
import H from '@ui-toolkit/H';
import { IconSize, TIconSize } from '@ui-toolkit/Icon/icons';
import Span from '@ui-toolkit/Span';
import styled from 'styled-components';

export const DialogTitle = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  position: relative;
  text-transform: uppercase;
  gap: ${CSSVar('windowSpacingInnerX')};
  padding: ${CSSVar('windowSpacingY')} ${CSSVar('windowSpacingX')} ${CSSVar('windowSpacingInnerY')}
    ${CSSVar('windowSpacingX')};
`;
export const DialogTitleContent = styled(H).attrs({ level: 3 })`
  line-height: calc(${IconSize[TIconSize.XL]}px - ${CSSVar('size1')});
  margin-top: ${CSSVar('size1')};
`;
export const DialogContent = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 ${CSSVar('windowSpacingX')} ${CSSVar('windowSpacingY')};
  gap: ${CSSVar('windowSpacingInnerY')};
`;

const DialogBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const DialogBodyStandard = styled(DialogBody)`
  max-width: 480px;
  min-width: 280px;
`;

export const DialogBodySmall = styled(DialogBody)`
  min-width: 280px;
  max-width: 320px;
`;

export const DialogNameSpan = styled(Span)`
  display: inline-block;
  vertical-align: bottom;
  max-width: 180px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;
export const DialogWarningMessage = styled(Message)`
  justify-content: center;
`;
