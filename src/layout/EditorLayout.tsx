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

// Controls, table, separator, aside, and an empty track that keeps the aside off the screen's
// right edge -- the table and aside widths come from the theme, per screen size. Small screens
// render no separator or aside, so those tracks stay empty (and so does the trailing one: the
// table runs to the edge there).
const ASIDE_END_SPACING = CSSVar('size34');
const COLUMN_TEMPLATES: Record<TScreenSize, string> = {
  [TScreenSize.SMALL]: `min-content ${CSSVar('appTableWidthSmall')} 1px ${CSSVar('appAsideWidthSmall')} 0px`,
  [TScreenSize.MEDIUM]: `min-content ${CSSVar('appTableWidthMedium')} 1px ${CSSVar('appAsideWidthMedium')} ${ASIDE_END_SPACING}`,
  // Large screens let the table grow into the free space: from its usual width up to half the screen
  [TScreenSize.LARGE]: `min-content minmax(${CSSVar('appTableWidthLarge')}, 50%) 1px ${CSSVar('appAsideWidthLarge')} ${ASIDE_END_SPACING}`,
};

const Screen = styled.div`
  position: relative;
  display: grid;
  height: 100vh;
  overflow: hidden;
`;

// Set apart from the menu on its left. The space towards the table on its right is the table
// area's own left padding (Editor's EditorArea), where the line backdrops can spread into it.
const EditorControlsArea = styled.div`
  z-index: 10;
  padding: ${CSSVar('size4')} 0 ${CSSVar('size4')} ${CSSVar('size10')};
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
            <Hr variant={THrVariant.TRANSPARENT} orientation={THrOrient.VERTICAL} />
            <EditorAside />
          </>
        )}
      </Screen>
    </EditorKeystrokeProvider>
  );
}
