import { glossaries } from '@src/services/glossary';
import { promptTemplates } from '@src/services/prompt';
import { settings } from '@src/services/settings';
import { useAppSelectors } from '@store/hooks';
import { AnimatePresence } from 'motion/react';
import ExportOverlay from './Export/Export';
import GlossaryOverlay from './Glossary/Glossary';
import PromptOverlay from './Prompt';
import SettingsOverlay from './Settings';

// Each overlay's open state belongs to its owner: the prompt and glossary services own their
// editors, the settings service owns settings and export. Callers close the others before opening
// one, so only one is open today; if several ever were, later ones here render on top.
export default function Overlays() {
  const [isPromptOpen, isGlossaryOpen, isExportOpen, isSettingsOpen] = useAppSelectors(
    promptTemplates.selectIsEditorOpen,
    glossaries.selectIsEditorOpen,
    settings.selectIsExportOpen,
    settings.selectIsOpen
  );
  return (
    <AnimatePresence>
      {isPromptOpen && <PromptOverlay key="promptTemplate" />}
      {isGlossaryOpen && <GlossaryOverlay key="glossary" />}
      {isExportOpen && <ExportOverlay key="export" />}
      {isSettingsOpen && <SettingsOverlay key="settings" />}
    </AnimatePresence>
  );
}
