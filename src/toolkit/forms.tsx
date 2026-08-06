import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import classNames from 'classnames';
import { motion } from 'motion/react';
import { ReactNode } from 'react';
import styled from 'styled-components';
import H, { HProps } from './H';
import Icon from './Icon/Icon';
import { IconSize, TIcon, TIconSize } from './Icon/icons';
import P, { TPVariant } from './P';

type RowAttrs = {
  $columns?: number;
  $templateColumns?: string;
};

export const FormsContent = styled(motion.div).attrs<RowAttrs>(
  ({ $columns = 1, $templateColumns }) => ({
    style: {
      gridTemplateColumns: $templateColumns ? $templateColumns : `repeat(${$columns}, 1fr)`,
    },
  })
)`
  display: grid;
  gap: ${CSSVar('formSpacingInnerY')};
  & & {
    padding: 0;
  }
`;

export const FormRoot = styled.form`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  ${FormsContent} + ${FormsContent} {
    padding-top: ${CSSVar('formSpacingY')};
  }
`;
export const FormsRow = styled(motion.div).attrs<RowAttrs>(
  ({ $columns = 1, $templateColumns }) => ({
    style: {
      gridTemplateColumns: $templateColumns ? $templateColumns : `repeat(${$columns}, 1fr)`,
    },
  })
)`
  display: grid;
  padding: 0 ${CSSVar('formSpacingX')};
  gap: ${CSSVar('formRowSpacingInner')};
`;

export const FormFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${CSSVar('formSpacingY')} ${CSSVar('formSpacingX')} 0;
  gap: ${CSSVar('formRowSpacingInner')};
`;

const SectionTitleH = styled(H)`
  display: flex;
  align-items: center;
  gap: ${CSSVar('formSpacingInnerX')};
`;
const SectionTitleContent = styled.div`
  white-space: nowrap;
  text-overflow: ellipsis;
  flex-grow: 1;
  flex-shrink: 1;
`;
const SectionTitleIcon = styled(Icon)`
  flex-grow: 0;
  flex-shrink: 0;
`;
const SectionTitleSubtext = styled(P)`
  white-space: pre-line;
  &.iconic {
    margin-left: calc(${CSSVar('formSpacingInnerX')} + ${IconSize.L}px);
  }
`;
export const FormsSectionContent = styled.div.attrs<RowAttrs>(
  ({ $columns = 1, $templateColumns }) => ({
    style: {
      gridTemplateColumns: $templateColumns ? $templateColumns : `repeat(${$columns}, 1fr)`,
    },
  })
)`
  display: grid;
  align-items: flex-end;
  gap: ${CSSVar('formSectionSpacingInner')};
  flex-direction: column;
`;
const SectionTitleRoot = styled.div`
  padding: ${CSSVar('size6')} 0;
  &.iconic ~ ${FormsSectionContent} {
    margin-left: calc(${CSSVar('formSpacingInnerX')} + ${IconSize.L}px);
  }
`;
const AfterContainer = styled.div`
  align-self: center;
  line-height: 0;
`;
type FormsSectionTitleProps = HProps & {
  icon?: TIcon;
  subtext?: ReactNode;
  after?: ReactNode;
};

export const FormsSectionTitle = ({
  children,
  icon,
  subtext,
  after,
  ...rest
}: FormsSectionTitleProps) => (
  <SectionTitleRoot className={classNames({ iconic: !!icon })}>
    <SectionTitleH {...rest} level={5}>
      {icon ? <SectionTitleIcon icon={icon} size={TIconSize.L} /> : null}
      <SectionTitleContent>{children}</SectionTitleContent>
      {after && <AfterContainer>{after}</AfterContainer>}
    </SectionTitleH>
    {subtext && (
      <SectionTitleSubtext className={classNames({ iconic: !!icon })} variant={TPVariant.TERTIARY}>
        {subtext}
      </SectionTitleSubtext>
    )}
  </SectionTitleRoot>
);

export const FormsSection = styled.div`
  flex-basis: 100%;
  background-color: ${CSSVar('formSectionBg')};
  border: ${CSSVar('formSectionBorderWidth')} solid ${CSSVar('formSectionBorderColor')};
  border-radius: ${CSSVar('formSectionBorderRadius')};
  padding: ${CSSVar('formSectionSpacingY')} ${CSSVar('formSectionSpacingX')};
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 80)};
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  gap: ${CSSVar('formSectionSpacingInner')};
  ${FormsSectionContent} + ${FormsSectionContent} {
    border-top: ${CSSVar('formSectionBorderWidth')} solid ${CSSVar('formSectionBorderColor')};
    padding: ${CSSVar('formSectionSpacingInner')} 0;
  }
`;

export const FormSectionEntry = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('formSectionEntrySpacingInner')};
`;
