import { PropsWithChildren } from 'react';
import EditorRefsProvider from '@providers/EditorRefsProvider';
import EditorActionsProvider from '@providers/EditorActionsProvider';
import EditorAIActionsProvider from '@providers/EditorAIActionsProvider';

export default function EditorStateProvider({ children }: PropsWithChildren) {
  return (
    <EditorRefsProvider>
      <EditorActionsProvider>
        <EditorAIActionsProvider>{children}</EditorAIActionsProvider>
      </EditorActionsProvider>
    </EditorRefsProvider>
  );
}
