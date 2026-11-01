import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { Logo } from '@ui-toolkit/Logo/Logo';
import styled from 'styled-components';

const AppTitleContainer = styled.div`
  display: flex;
  align-items: stretch;
  align-self: center;
  justify-self: center;
  flex-direction: column;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
`;

const LogoWrapper = styled.div`
  display: inline-block;
  align-self: center;
  color: ${CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 100)};
  padding-bottom: ${CSSVar('size24')};
`;

export const AppTitle = () => {
  return (
    <AppTitleContainer>
      <Content>
        <LogoWrapper>
          <Logo size={192} />
        </LogoWrapper>
      </Content>
    </AppTitleContainer>
  );
};
