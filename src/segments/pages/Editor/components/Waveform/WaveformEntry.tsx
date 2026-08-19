import { CSSVar, ThemeColors } from '@src/theme/utils';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint } from '@src/toolkit/Tooltip';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DragMode } from './Waveform';

const EDGE_HITBOX_PX = 10;

export type WaveformEntryProps = {
  lineIndex: number;
  lineNo: number;
  left: number;
  width: number;
  isActive: boolean;
  isFocused: boolean;
  isDragging: boolean;
  onEntryPointerDown: (lineIndex: number, mode: DragMode, clientX: number) => void;
};

const EntryBorderHandle = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  height: 100%;
  z-index: 2;
  cursor: ew-resize;
  filter: brightness(200%);
  border-radius: ${CSSVar('size10')};
  &.left {
    left: -2px;
    border-left: 2px solid ${CSSVar('waveformBlockHandleColor')};
  }

  &.right {
    right: -2px;
    border-right: 2px solid ${CSSVar('waveformBlockHandleColor')};
  }
`;

const EntryBlock = styled.div`
  --inner-spacing: calc(${CSSVar('waveformSpacingY')} * 0.5);
  position: absolute;
  top: 0;
  border-radius: ${CSSVar('waveformSpacingY')};
  height: ${CSSVar('waveformHeight')};
  border: 1px solid ${CSSVar('waveformBlockBorderColor')};
  background-color: ${CSSVar('waveformBlockBg')};
  background: radial-gradient(
    circle at center bottom,
    ${CSSVar('waveformBlockBg')} 0%,
    transparent 90%
  );
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition:
    background-color 0.3s ease-in-out,
    border-color 0.3s ease-in-out,
    top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  ${EntryBorderHandle} {
    border-color: ${CSSVar('waveformBlockBorderColor')};
  }
  &:hover {
    border-color: ${CSSVar('waveformBlockBorderColorHover')};
    background: radial-gradient(
      circle at center bottom,
      ${CSSVar('waveformBlockBgHover')} 0%,
      transparent 90%
    );
    ${EntryBorderHandle} {
      border-color: ${CSSVar('waveformBlockBorderColorHover')};
    }
  }

  /* Active (currently playing under the video playhead): color-only, no size change, so it can't
     be confused with the focused (selected-for-editing) block below. */
  &.isActive {
    border-color: ${CSSVar('waveformBlockBorderColorActive')};
    background: radial-gradient(
      circle at center bottom,
      ${CSSVar('waveformBlockBgActive')} 0%,
      transparent 90%
    );
    ${EntryBorderHandle} {
      border-color: ${CSSVar('waveformBlockBorderColorActive')};
    }
    &:hover {
      border-color: ${CSSVar('waveformBlockBorderColorActiveHover')};
      background: radial-gradient(
        circle at center bottom,
        ${CSSVar('waveformBlockBgActiveHover')} 0%,
        transparent 90%
      );
      ${EntryBorderHandle} {
        border-color: ${CSSVar('waveformBlockBorderColorActiveHover')};
      }
    }
  }

  /* Focused (selected for editing): the prominent, expanded treatment -- takes precedence over
     .isActive above when a line is both playing and focused, since same-specificity rules cascade
     by source order. */
  &.isFocused {
    height: calc(${CSSVar('waveformHeight')} + (${CSSVar('waveformSpacingY')} * 2));
    border-color: ${CSSVar('waveformBlockBorderColorFocused')};
    background: radial-gradient(
      circle at center bottom,
      ${CSSVar('waveformBlockBgFocused')} 0%,
      transparent 90%
    );
    top: calc(${CSSVar('waveformSpacingY')} * -1);
    ${EntryBorderHandle} {
      border-color: ${CSSVar('waveformBlockBorderColorFocused')};
    }
    &:hover {
      border-color: ${CSSVar('waveformBlockBorderColorFocusedHover')};
      background: radial-gradient(
        circle at center bottom,
        ${CSSVar('waveformBlockBgFocusedHover')} 0%,
        transparent 90%
      );
      ${EntryBorderHandle} {
        border-color: ${CSSVar('waveformBlockBorderColorFocusedHover')};
      }
    }
  }
`;

const EntryNumber = styled.div`
  position: absolute;
  left: ${CSSVar('size4')};
  top: ${CSSVar('size2')};
`;

const startTimeKeystrokeHint = <TooltipKeystrokeHint keys={['Alt', 'Q / E']} />;
const endTimeKeystrokeHint = <TooltipKeystrokeHint keys={['Alt', 'A / D']} />;

export default function WaveformEntry({
  lineIndex,
  lineNo,
  left,
  width,
  isActive,
  isFocused,
  isDragging,
  onEntryPointerDown,
}: WaveformEntryProps) {
  const { t } = useTranslation('tooltips');

  return (
    <EntryBlock
      className={classNames({
        isActive: isActive,
        isFocused: isFocused,
        isDragging: isDragging,
      })}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;

        let mode: DragMode = 'move';
        if (offsetX <= EDGE_HITBOX_PX) mode = 'resize-left';
        else if (offsetX >= rect.width - EDGE_HITBOX_PX) mode = 'resize-right';

        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        onEntryPointerDown(lineIndex, mode, event.clientX);
      }}
    >
      <Tooltip
        delay={400}
        label={
          <TooltipComplex title={t('waveform.startTime')}>
            {isFocused ? startTimeKeystrokeHint : null}
          </TooltipComplex>
        }
      >
        <EntryBorderHandle className="left" />
      </Tooltip>
      <EntryNumber>
        <Tag variant={TTagVariant.SECONDARY} size={TTagSize.NANO} color={ThemeColors.TEXT}>
          {lineNo}
        </Tag>
      </EntryNumber>
      <Tooltip
        delay={400}
        label={
          <TooltipComplex title={t('waveform.endTime')}>
            {isFocused ? endTimeKeystrokeHint : null}
          </TooltipComplex>
        }
      >
        <EntryBorderHandle className="right" />
      </Tooltip>
    </EntryBlock>
  );
}
