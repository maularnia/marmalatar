import EditorKeystrokeProvider from '@providers/EditorKeystrokeProvider';
import { EditorControls } from '@src/segments/pages/Editor/segments/EditorControls';
import EditorAside from '@src/segments/pages/Editor/segments/EditorAside/EditorAside';
import { selectScreenSize } from '@src/store/slices/app';
import { TScreenSize } from '@src/theme/types';
import { CSSVar } from '@src/theme/utils';
import { useAppSelector } from '@store/hooks';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

const LARGE_COLUMN_TEMPLATE = `min-content minmax(0, min(50%, ${CSSVar('appScreenWidth')})) 1px 1fr`;
const SMALL_COLUMN_TEMPLATE = `min-content auto`;

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
  const screenSize = useAppSelector(selectScreenSize);
  const isLargeScreen = screenSize !== TScreenSize.SMALL;

  return (
    <EditorKeystrokeProvider>
      <Screen
        tabIndex={1}
        style={{
          gridTemplateColumns: isLargeScreen ? LARGE_COLUMN_TEMPLATE : SMALL_COLUMN_TEMPLATE,
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
