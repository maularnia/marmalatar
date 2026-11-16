import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import classNames from 'classnames';
import { motion } from 'motion/react';
import { ComponentProps, ReactNode } from 'react';
import styled from 'styled-components';
import H, { HProps } from './H';
import Icon from './Icon/Icon';
import { IconSize, TIcon, TIconSize } from './Icon/icons';
import P, { TPVariant } from './P';
import { formAnimation } from './motion/transitions';

type RowAttrs = {
  $columns?: number;
  $templateColumns?: string;
};

const FormsContentRoot = styled.div.attrs<RowAttrs>(({ $columns = 1, $templateColumns }) => ({
  style: {
    gridTemplateColumns: $templateColumns ? $templateColumns : `repeat(${$columns}, 1fr)`,
  },
}))`
  display: grid;
  gap: ${CSSVar('formSpacingInnerY')};
  & & {
    padding: 0;
  }
`;

const FormTitleElement = styled(H)`
  padding: ${CSSVar('formSpacingY')}
    calc(
      ${CSSVar('formSpacingX')} + ${CSSVar('formRowSpacingX')} + ${CSSVar('formSectionSpacingX')}
    );
  text-align: center;
`;

export const FormRoot = styled.form`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding-top: ${CSSVar('formSpacingY')};
  ${FormsContentRoot} + ${FormsContentRoot} {
    padding-top: ${CSSVar('formSpacingY')};
  }
  &:has(${FormTitleElement}:first-child) {
    padding-top: 0;
  }
`;
export const FormTitle = ({ level = 4, ...rest }: HProps) => {
  return <FormTitleElement level={level} {...rest} />;
};
const FormsRowRoot = styled.div.attrs<RowAttrs>(({ $columns = 1, $templateColumns }) => ({
  style: {
    gridTemplateColumns: $templateColumns ? $templateColumns : `repeat(${$columns}, 1fr)`,
  },
}))`
  display: grid;
  padding: 0 ${CSSVar('formSpacingX')};
  gap: ${CSSVar('formRowSpacingInner')};
`;

export const FormFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 ${CSSVar('formSpacingX')} 0;
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
  gap: ${CSSVar('formSectionSpacingInnerY')};
  flex-direction: column;
`;
const SectionTitleRoot = styled.div`
  padding: ${CSSVar('size10')} 0 0;
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

const FormsSectionRoot = styled.div`
  flex-basis: 100%;
  background-color: ${CSSVar('formSectionBg')};
  border: ${CSSVar('formSectionBorderWidth')} solid ${CSSVar('formSectionBorderColor')};
  border-radius: ${CSSVar('formSectionBorderRadius')};
  padding: 0 ${CSSVar('formSectionSpacingX')} ${CSSVar('formSectionSpacingY')};
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 80)};
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  gap: ${CSSVar('formSectionSpacingInnerY')};
  ${FormsSectionContent} + ${FormsSectionContent} {
    border-top: ${CSSVar('formSectionBorderWidth')} solid ${CSSVar('formSectionBorderColor')};
    padding: 0;
  }
`;

export const FormSectionEntry = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('formSectionEntrySpacingInner')};
`;

// ── Animation ────────────────────────────────────────────────────────────────
// FormsContent, FormsRow and FormsSection render plain divs by default. With `animated` they render
// motion divs instead and appear in a cascade (timing in formAnimation, motion/transitions.ts):
// an animated content staggers the animated rows below it -- wherever they're rendered, partials
// included -- and each animated row staggers its animated sections. An animated row or section
// outside an animated content just renders, unanimated. Every other prop goes to the div as is.

type TFormsAnimation = {
  /** Render a motion div that takes part in the form's appearance cascade */
  animated?: boolean;
  /** Seconds before this element starts its children's cascade (content and rows) */
  delay?: number;
};

const MotionFormsContent = motion.create(FormsContentRoot);
const MotionFormsRow = motion.create(FormsRowRoot);
const MotionFormsSection = motion.create(FormsSectionRoot);

export const FormsContent = ({
  animated,
  delay,
  ...props
}: ComponentProps<typeof FormsContentRoot> & TFormsAnimation) =>
  animated ? (
    <MotionFormsContent
      {...formAnimation.content(delay)}
      {...(props as ComponentProps<typeof MotionFormsContent>)}
    />
  ) : (
    <FormsContentRoot {...props} />
  );

export const FormsRow = ({
  animated,
  delay,
  ...props
}: ComponentProps<typeof FormsRowRoot> & TFormsAnimation) =>
  animated ? (
    <MotionFormsRow
      variants={formAnimation.row(delay)}
      {...(props as ComponentProps<typeof MotionFormsRow>)}
    />
  ) : (
    <FormsRowRoot {...props} />
  );

export const FormsSection = ({
  animated,
  ...props
}: ComponentProps<typeof FormsSectionRoot> & Pick<TFormsAnimation, 'animated'>) =>
  animated ? (
    <MotionFormsSection
      variants={formAnimation.section}
      {...(props as ComponentProps<typeof MotionFormsSection>)}
    />
  ) : (
    <FormsSectionRoot {...props} />
  );
