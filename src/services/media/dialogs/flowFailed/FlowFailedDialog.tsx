import type { TModalContentProps } from '@src/services/modal';
import { ThemeColors } from '@src/theme/utils';
import { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import {
  DialogBodyStandard,
  DialogContent,
  DialogTitle,
  DialogTitleContent,
  DialogWarningMessage,
} from '@src/services/modal';

type TFlowFailedDialogProps = TModalContentProps & {
  title: string;
  message: string;
};

// A failed step of the video selection: what went wrong, with the way back or out on its buttons
export function FlowFailedDialog({ title, message }: TFlowFailedDialogProps) {
  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{title}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <DialogWarningMessage
          type={TMessageVariant.SECONDARY}
          size={TMessageSize.S}
          color={ThemeColors.RED}
        >
          {message}
        </DialogWarningMessage>
      </DialogContent>
    </DialogBodyStandard>
  );
}
