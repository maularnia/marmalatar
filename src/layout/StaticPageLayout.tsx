import { CSSVar } from '@src/theme/utils';
import styled from 'styled-components';
import { motion } from 'motion/react';
import { staticPageAppear } from '@src/toolkit/motion/transitions';
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
`;
const PageContentContainer = styled.div`
  position: relative;
`;
const PageContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${CSSVar('size34')};
  border-radius: ${CSSVar('size12')};
  padding-bottom: ${CSSVar('size12')};
`;
export const StaticPageLayout = () => {
  return (
    <Root>
      <PageContentContainer>
        <AppTitle />
        <PageContent {...staticPageAppear}>
          <Outlet />
        </PageContent>
      </PageContentContainer>
    </Root>
  );
};
