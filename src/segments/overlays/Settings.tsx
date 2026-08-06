import AiSettings from '@src/partials/AiSettings';
import SelectFolder from '@src/partials/SelectFolder';
import SelectLanguage from '@src/partials/SelectLanguage';
import Settings from '@src/partials/Settings';
import { useAppDispatch } from '@store/hooks';
import { closeOverlays } from '@store/slices/overlays';
import { FormRoot, FormsContent, FormsRow } from '@ui-toolkit/forms';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import Overlay from './Overlay';

export default function SettingsOverlay() {
  const dispatch = useAppDispatch();

  return (
    <Overlay onClose={() => dispatch(closeOverlays())}>
      <FormRoot>
        <FormsContent>
          <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
          <Settings />
          <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
          <AiSettings />
          <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
          <FormsRow $columns={2}>
            <SelectFolder />
            <SelectLanguage />
          </FormsRow>
        </FormsContent>
      </FormRoot>
    </Overlay>
  );
}
