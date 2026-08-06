import { CSSVar } from '@src/theme/utils';
import styled from 'styled-components';
import { Outlet } from 'react-router-dom';
import { AppTitle } from './components/AppTitle';
const Root = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${CSSVar('size34')};
  width: 640px;
  margin: 0 auto;
  padding: ${CSSVar('size92')} 0;
`;
export const StaticPageLayout = () => {
  return (
    <Root>
      <AppTitle />
      <Outlet />
    </Root>
  );
};
