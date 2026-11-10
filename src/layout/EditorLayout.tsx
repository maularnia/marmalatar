import { EditorKeystrokeProvider } from '@providers/EditorKeystrokeProvider';
import { EditorControls } from '@src/segments/pages/Editor/segments/EditorControls';
import EditorAside from '@src/segments/pages/Editor/segments/EditorAside/EditorAside';
import { settings } from '@src/services/settings';
import { TScreenSize } from '@src/theme/types';
import { CSSVar } from '@src/theme/utils';
import { useAppSelector } from '@store/hooks';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

// Controls, table, separator, aside -- the table and aside widths come from the theme, per screen
// size. Small screens render no separator or aside, so those tracks stay empty.
const COLUMN_TEMPLATES: Record<TScreenSize, string> = {
  [TScreenSize.SMALL]: `min-content ${CSSVar('appTableWidthSmall')} 1px ${CSSVar('appAsideWidthSmall')}`,
  [TScreenSize.MEDIUM]: `min-content ${CSSVar('appTableWidthMedium')} 1px ${CSSVar('appAsideWidthMedium')}`,
  [TScreenSize.LARGE]: `min-content ${CSSVar('appTableWidthLarge')} 1px ${CSSVar('appAsideWidthLarge')}`,
};

const Screen = styled.div`
  position: relative;
  display: grid;
  height: 100vh;
  overflow: hidden;
`;

const EditorControlsArea = styled.div`
  z-index: 10;
`;

export default function EditorLayout() {
  const screenSize = useAppSelector(settings.selectScreenSize);
  const isLargeScreen = screenSize !== TScreenSize.SMALL;

  return (
    <EditorKeystrokeProvider>
      <Screen
        tabIndex={1}
        style={{
          gridTemplateColumns: COLUMN_TEMPLATES[screenSize],
        }}
      >
        <EditorControlsArea>
          <EditorControls />
        </EditorControlsArea>
        <Outlet />

        {isLargeScreen && (
          <>
            <Hr variant={THrVariant.DIMMED} orientation={THrOrient.VERTICAL} />
            <EditorAside />
          </>
        )}
      </Screen>
    </EditorKeystrokeProvider>
  );
}
