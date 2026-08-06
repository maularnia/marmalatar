import GlossaryStateProvider from '@providers/GlossaryStateProvider';
import { useAppSelector } from '@store/hooks';
import { selectCurrentOverlay } from '@store/slices/overlays';
import { AnimatePresence } from 'motion/react';
import ExportOverlay from './Export/Export';
import GlossaryOverlay from './Glossary/Glossary';
import PromptOverlay from './Prompt';
import SettingsOverlay from './Settings';

export default function Overlays() {
  const currentOverlay = useAppSelector(selectCurrentOverlay);
  return (
    <AnimatePresence mode="wait">
      {currentOverlay === 'promptTemplate' && <PromptOverlay />}
      {currentOverlay === 'glossary' && (
        <GlossaryStateProvider>
          <GlossaryOverlay />
        </GlossaryStateProvider>
      )}
      {currentOverlay === 'settings' && <SettingsOverlay />}
      {currentOverlay === 'export' && <ExportOverlay />}
    </AnimatePresence>
  );
}
