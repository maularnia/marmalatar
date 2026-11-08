import { CSSVar } from '@src/theme/utils';
import { CyclingMessage } from '@ui-toolkit/CyclingMessage';
import P, { TPVariant } from '@ui-toolkit/P';
import styled from 'styled-components';
import { Loader } from './Loader';
import { DialogBodySmall } from '../partials';

// Root's fixed width and MessageArea's fixed height: messages differ in length, and the window must
// not resize on each one.
const Root = styled(DialogBodySmall)`
  width: 320px;
  gap: ${CSSVar('windowSpacingInnerY')};
  padding: ${CSSVar('windowSpacingY')} ${CSSVar('windowSpacingX')};
`;

const MessageArea = styled.div`
  min-height: 2lh;
  text-align: center;
`;

const renderMessage = (message: string) => <P variant={TPVariant.TERTIARY}>{message}</P>;

type TLoaderDialogProps = {
  messages: string[];
  messageLifetime: number;
};

export function LoaderDialog({ messages, messageLifetime }: TLoaderDialogProps) {
  return (
    <Root>
      <Loader />
      <MessageArea>
        {messages.length > 0 && (
          <CyclingMessage
            messages={messages}
            messageLifetime={messageLifetime}
            renderMessage={renderMessage}
          />
        )}
      </MessageArea>
    </Root>
  );
}
