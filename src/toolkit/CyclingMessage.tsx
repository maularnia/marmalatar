import { AnimatePresence, motion, Variants } from 'motion/react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { animateEaseIn } from './motion/transitions';

const messageVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', bounce: 0.3, duration: 0.3 },
  },
  gone: {
    y: '-100%',
    opacity: 0,
    transition: animateEaseIn.default,
  },
} satisfies Variants;

type TCyclingMessageProps = {
  messages: string[];
  messageLifetime: number;
  renderMessage: (message: string) => ReactNode;
};

export function CyclingMessage({ messages, messageLifetime, renderMessage }: TCyclingMessageProps) {
  const [index, setIndex] = useState(0);
  const lifetimeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(lifetimeTimeoutRef.current), []);

  // The lifetime starts only once the message has finished appearing, and it's what triggers the
  // exit, so neither animation eats into the time a message is readable.
  const handleAnimationComplete = (definition: unknown) => {
    if (definition !== 'visible' || messages.length < 2) return;
    lifetimeTimeoutRef.current = setTimeout(
      () => setIndex((prev) => (prev + 1) % messages.length),
      messageLifetime
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        exit="gone"
        onAnimationComplete={handleAnimationComplete}
      >
        {renderMessage(messages[index])}
      </motion.div>
    </AnimatePresence>
  );
}
