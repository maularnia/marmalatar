import AiSettings from '@src/partials/AiSettings';
import { FormsContent } from '@ui-toolkit/forms';
import { OVERLAY_APPEAR_DURATION } from '@src/toolkit/motion/transitions';

/** The AI toggle and the integration's configuration */
export function AiTab() {
  return (
    <FormsContent animated delay={OVERLAY_APPEAR_DURATION}>
      <AiSettings />
    </FormsContent>
  );
}
