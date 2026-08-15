import { TColor, TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import classNames from 'classnames';
import { createRef, useEffect } from 'react';
import styled, { css } from 'styled-components';

export enum TProgressBarSize {
  SMALL = 's',
  MEDIUM = 'm',
  LARGE = 'l',
}

type ProgressBarProps = {
  value: number;
  total: number;
  size?: TProgressBarSize;
  color?: TColor;
  precise?: boolean;
  allowTransition?: boolean;
  animateLoading?: boolean;
  backgroundColor?: TColor;
};
const Runner = styled.div`
  position: absolute;
  height: 100%;
  top: 0;
  left: 0;
  width: var(--runner-width);
  background: linear-gradient(
    to right,
    var(--progress-bar-start-color) 0%,
    var(--progress-bar-end-color) 100%
  );
`;

const ProgressBarSizeToHeightMap: { [key in TProgressBarSize]: string } = {
  [TProgressBarSize.LARGE]: CSSVar('size12'),
  [TProgressBarSize.MEDIUM]: CSSVar('size10'),
  [TProgressBarSize.SMALL]: CSSVar('size4'),
};
const Root = styled.div`
  position: relative;
  background: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 5)};
  backdrop-filter: blur(${CSSVar('blurLight')});
  @keyframes progressBarLoadingAnimation {
    from {
      left: 0;
      transform: translateX(-100%);
    }
    to {
      left: 100%;
      transform: translateX(0);
    }
  }

  ${Object.values(TProgressBarSize).map((size) => {
    return css`
      &.size-${size} {
        height: ${ProgressBarSizeToHeightMap[size]};
      }
    `;
  })}
  &.allowTransition {
    ${Runner} {
      transition: width 0.2s ease-in-out;
    }
  }

  &.animateLoading {
    overflow: hidden;

    ${Runner} {
      animation: progressBarLoadingAnimation 1s linear infinite;
    }
  }
`;

export default function ProgressBar({
  value,
  total,
  color = ThemeColors.ACCENT1,
  size = TProgressBarSize.MEDIUM,
  precise = false,
  allowTransition = true,
  animateLoading = false,
}: ProgressBarProps) {
  const runnerRef = createRef<HTMLDivElement>();
  useEffect(() => {
    if (!runnerRef.current) return;
    const precisePercentage = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
    const percentage = precise ? precisePercentage : Math.round(precisePercentage);

    runnerRef.current.style.setProperty('--runner-width', `${percentage}%`);
  }, [value, total, runnerRef]);
  useEffect(() => {
    if (!runnerRef.current) return;
    runnerRef.current.style.setProperty(
      '--progress-bar-start-color',
      CSSColor(color, TShade.DEFAULT, 100)
    );
    runnerRef.current.style.setProperty(
      '--progress-bar-end-color',
      CSSColor(color, TShade.BRIGHT, 100)
    );
  }, [color, runnerRef]);

  return (
    <Root className={classNames({ [`size-${size}`]: true, allowTransition, animateLoading })}>
      <Runner className={classNames({ [color]: true })} ref={runnerRef}></Runner>
    </Root>
  );
}
