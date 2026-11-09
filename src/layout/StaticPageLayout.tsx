import { CSSVar } from '@src/theme/utils';
import styled from 'styled-components';
import { Outlet } from 'react-router-dom';
import { AppTitle } from './components/AppTitle';
const Root = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  max-width: 640px;
  margin: 0 auto;
  padding: ${CSSVar('size92')} 0;
`;
const PageContent = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${CSSVar('size34')};
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
