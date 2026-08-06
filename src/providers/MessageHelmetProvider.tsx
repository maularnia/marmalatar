import { MessageTypeToTimeout } from '@src/consts';
import { TColor, TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { TMessageType } from '@src/types';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import P, { TPVariant } from '@ui-toolkit/P';
import Span from '@ui-toolkit/Span';

type MessageItem = {
  id: number;
  type: TMessageType;
  message: ReactNode;
  title: string;
};

export type PushMessageParams = {
  type: TMessageType;
  title: string;
  message?: ReactNode;
};

type MessageHelmetContextType = {
  pushMessage: (params: PushMessageParams) => void;
};

const MessageHelmetContext = createContext<MessageHelmetContextType | null>(null);

export function useMessageHelmet(): MessageHelmetContextType {
  const ctx = useContext(MessageHelmetContext);
  if (!ctx) throw new Error('MessageHelmet provider is missing');
  return ctx;
}

const MessageTypeToColor: { [key in TMessageType]: TColor } = {
  [TMessageType.ERROR]: ThemeColors.RED,
  [TMessageType.MESSAGE]: ThemeColors.BG,
  [TMessageType.WARNING]: ThemeColors.ORANGE,
};

const Overlay = styled.div`
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  z-index: 999;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-start;
  pointer-events: none;
  gap: ${CSSVar('size10')};
`;

const Toast = styled(motion.div)<{ $type: TMessageType }>`
  padding-top: ${CSSVar('size4')};
  pointer-events: auto;
`;
const ToastBody = styled.div`
  width: 220px;
  border-radius: ${CSSVar('size4')};
  backdrop-filter: blur(${CSSVar('blurHeavy')});
  padding: ${CSSVar('size10')} ${CSSVar('size14')} ${CSSVar('size12')};
  ${Object.values(ThemeColors).map((color) => {
    return css`
      &.${color} {
        background-color: ${CSSColor(color, TShade.DEFAULT, 10)};
      }
    `;
  })}
`;
const ToastTitle = styled(P)`
  line-height: 1.48;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;
const ToasContent = styled(P)`
  white-space: pre-line;
`;
const CloseButton = styled.div`
  position: absolute;
  right: 0;
  top: 0;
`;

export default function MessageHelmet({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const pushMessage = useCallback(
    ({ type, title, message }: PushMessageParams) => {
      const id = nextId.current++;
      setMessages((prev) => [...prev, { id, type, message, title }]);
      const timeout = MessageTypeToTimeout[type];
      if (Number.isFinite(timeout)) {
        window.setTimeout(() => dismiss(id), timeout);
      }
    },
    [dismiss]
  );

  return (
    <MessageHelmetContext.Provider value={{ pushMessage }}>
      <Overlay>
        <AnimatePresence>
          {messages.map((item) => (
            <Toast
              key={item.id}
              $type={item.type}
              initial={{ y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <ToastBody className={classNames({ [MessageTypeToColor[item.type]]: true })}>
                <CloseButton>
                  <Button
                    color={ThemeColors.TEXT}
                    size={TButtonSize.SMALL}
                    variant={TButtonVariant.TRANSPARENT}
                    icon={TIcon.CROSS}
                    onClick={() => dismiss(item.id)}
                  />
                </CloseButton>
                <ToastTitle>
                  <Span bold>{item.title}</Span>
                </ToastTitle>
                <ToasContent variant={TPVariant.SECONDARY}>{item.message}</ToasContent>
              </ToastBody>
            </Toast>
          ))}
        </AnimatePresence>
      </Overlay>
      {children}
    </MessageHelmetContext.Provider>
  );
}
