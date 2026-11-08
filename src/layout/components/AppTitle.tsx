import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import H from '@src/toolkit/H';
import P from '@src/toolkit/P';
import { Logo } from '@ui-toolkit/Logo/Logo';
import { useTranslation } from 'react-i18next';
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
  display: inline-flex;
  align-self: center;
  align-items: center;
  gap: ${CSSVar('size10')};
  color: ${CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 100)};
  padding-bottom: ${CSSVar('size24')};
`;

const LogoText = styled(H)`
  line-height: 80% !important;
`;
export const AppTitle = () => {
  const { t } = useTranslation('app');
  return (
    <AppTitleContainer>
      <Content>
        <LogoWrapper>
          <Logo size={92} />
          <div>
            <LogoText level={2}>MARMALATAR</LogoText>
            <P>{t('appTitle.tagline')}</P>
          </div>
        </LogoWrapper>
      </Content>
    </AppTitleContainer>
  );
};
