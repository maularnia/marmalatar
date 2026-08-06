import styled from 'styled-components';
import classNames from 'classnames';
import { HTMLAttributes } from 'react';
import { TColor, TColorSystem, TOpacity, TShade } from '@src/theme/definitions';
import { CSSColor } from '@src/theme/utils';

export enum THrVariant {
  DEFAULT = 'default',
  PROMINENT = 'prominent',
  DIMMED = 'dimmed',
}

export enum THrOrient {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

type HrProps = {
  color?: TColor;
  orientation?: THrOrient;
  variant?: THrVariant;
} & HTMLAttributes<HTMLDivElement>;

const VariantToOpacity: Record<THrVariant, TOpacity> = {
  [THrVariant.DEFAULT]: 20,
  [THrVariant.PROMINENT]: 30,
  [THrVariant.DIMMED]: 5,
};

const HrElement = styled.div.attrs<{
  $color: TColor;
  $variant: THrVariant;
}>(({ $color, $variant }) => {
  return {
    style: {
      background: CSSColor($color, TShade.DEFAULT, VariantToOpacity[$variant]),
    },
  };
})`
  display: block;
  flex-shrink: 0;
  &.horizontal {
    height: 1px;
  }

  &.vertical {
    width: 1px;
  }
`;

export default function Hr({
  orientation = THrOrient.HORIZONTAL,
  color = TColorSystem.TEXT,
  variant = THrVariant.DEFAULT,
  ...props
}: HrProps) {
  return (
    <HrElement
      $color={color}
      $variant={variant}
      {...props}
      className={classNames(props.className, { [orientation]: true })}
    />
  );
}
