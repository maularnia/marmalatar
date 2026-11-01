import { MessageTypeToTimeout } from '@src/consts';
import { TColor, TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { TMessageType } from '@src/types';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { providerNoop } from '@src/utils/noop';
import { useMemoizedObject } from '@src/utils/useMemoizedObject';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'motion/react';
import {
  createContext,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import styled, { css } from 'styled-components';
import P, { TPVariant } from '@ui-toolkit/P';
import Span from '@ui-toolkit/Span';

type TMessageItem = {
  id: number;
  type: TMessageType;
  message: ReactNode;
  title: string;
};

export type TPushMessageParams = {
  type: TMessageType;
  title: string;
  message?: ReactNode;
};

type TMessageHelmetContext = {
  pushMessage: (params: TPushMessageParams) => void;
};

const noop = providerNoop('MessageHelmetContext');

const MessageHelmetContext = createContext<TMessageHelmetContext>({
  pushMessage: noop,
});

export function useMessageHelmet(): TMessageHelmetContext {
  return useContext(MessageHelmetContext);
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

export function MessageHelmetProvider({ children }: PropsWithChildren) {
  const [messages, setMessages] = useState<TMessageItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const pushMessage = useCallback(
    ({ type, title, message }: TPushMessageParams) => {
      const id = nextId.current++;
      setMessages((prev) => [...prev, { id, type, message, title }]);
      const timeout = MessageTypeToTimeout[type];
      if (Number.isFinite(timeout)) {
        window.setTimeout(() => dismiss(id), timeout);
      }
    },
    [dismiss]
  );

  const value = useMemoizedObject<TMessageHelmetContext>({ pushMessage });

  return (
    <MessageHelmetContext.Provider value={value}>
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
