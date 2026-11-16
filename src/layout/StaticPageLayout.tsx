import { CSSColor, CSSVar } from '@src/theme/utils';
import styled from 'styled-components';
import { Outlet } from 'react-router-dom';
import { AppTitle } from './components/AppTitle';
import { TColorSystem, TShade } from '@src/theme/definitions';
const Root = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  max-width: 640px;
  margin: 0 auto;
`;
const PageContent = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${CSSVar('size34')};
  background: ${CSSColor(TColorSystem.TEXT, TShade.DEFAULT, 5)};
  border-radius: ${CSSVar('size12')};
  padding-bottom: ${CSSVar('size12')};
`;
export const StaticPageLayout = () => {
  return (
    <Root>
      <PageContent>
        <AppTitle />
        <Outlet />
      </PageContent>
    </Root>
  );
};
