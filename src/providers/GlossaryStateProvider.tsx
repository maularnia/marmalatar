import { PropsWithChildren } from 'react';
import { GlossaryRefsProvider } from '@providers/GlossaryRefsProvider';
import { GlossaryActionsProvider } from '@providers/GlossaryActionsProvider';

export function GlossaryStateProvider({ children }: PropsWithChildren) {
  return (
    <GlossaryRefsProvider>
      <GlossaryActionsProvider>{children}</GlossaryActionsProvider>
    </GlossaryRefsProvider>
  );
}
