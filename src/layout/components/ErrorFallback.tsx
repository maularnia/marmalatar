import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { appearUpSpring, appearUpSpringSlow } from '@ui-toolkit/motion/transitions';
import H from '@ui-toolkit/H';
import { Logo, TLogoVariant } from '@ui-toolkit/Logo';
import P, { TPVariant } from '@ui-toolkit/P';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { FallbackProps, getErrorMessage } from 'react-error-boundary';
import styled from 'styled-components';

const Root = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${CSSVar('size10')};
`;

const LogoWrapper = styled(motion.div)`
  display: inline-block;
  color: ${CSSColor(ThemeColors.RED, TShade.DEFAULT, 100)};
  padding-bottom: ${CSSVar('size24')};
`;

const Message = styled(P).attrs({ variant: TPVariant.SECONDARY })`
  max-width: 420px;
`;

const ErrorDetails = styled.pre`
  max-width: 640px;
  max-height: 200px;
  overflow: auto;
  white-space: pre-line;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('sizeTextRegular')};
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 60)};
`;

// Plain, store-independent button: the ErrorBoundary sits above the redux Provider,
// so a caught error unmounts it too -- the toolkit Button (useAppSelector for theming) would crash.
const RestartButton = styled.button`
  margin-top: ${CSSVar('size14')};
  height: ${CSSVar('buttonHeightRegular')};
  padding: ${CSSVar('inputSpacingYRegular')} ${CSSVar('inputSpacingXRegular')};
  border: ${CSSVar('inputBorderWidth')} solid ${CSSColor(ThemeColors.RED, TShade.DEFAULT, 100)};
  border-radius: ${CSSVar('inputBorderRadius')};
  background: transparent;
  color: ${CSSColor(ThemeColors.RED, TShade.DEFAULT, 100)};
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('inputTextSizeRegular')};
  font-weight: ${CSSVar('inputTextWeightRegular')};
  cursor: pointer;

  &:hover {
    background: ${CSSColor(ThemeColors.RED, TShade.DEFAULT, 10)};
  }
`;

export function ErrorFallback({ error }: FallbackProps) {
  const { t } = useTranslation('app');
  const errorMessage = getErrorMessage(error);

  return (
    <Root>
      <Content as={motion.div} {...appearUpSpringSlow}>
        <LogoWrapper {...appearUpSpring}>
          <Logo size={128} variant={TLogoVariant.ERROR} />
        </LogoWrapper>
        <H level={3}>{t('errorBoundary.title')}</H>
        <Message>{t('errorBoundary.message')}</Message>
        {errorMessage && <ErrorDetails>{errorMessage}</ErrorDetails>}
        <RestartButton type="button" onClick={() => window.location.reload()}>
          {t('errorBoundary.restartButton')}
        </RestartButton>
      </Content>
    </Root>
  );
}
