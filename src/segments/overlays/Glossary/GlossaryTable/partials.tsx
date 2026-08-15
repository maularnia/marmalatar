import { CSSVar } from '@src/theme/utils';
import TinyDivEditor from '@ui-toolkit/TinyDivEditor';
import styled from 'styled-components';

export const EGlossaryTable = styled.div`
  display: flex;
  flex-direction: column;
`;
export const EGlossaryTableCell = styled.div`
  color: ${CSSVar('tableCellColor')};
  position: relative;
  border-left: ${CSSVar('mainTableLineCellBorderWidth')} solid
    ${CSSVar('mainTableLineCellBorderColor')};
  &:last-child {
    border-right: ${CSSVar('mainTableLineCellBorderWidth')} solid
      ${CSSVar('mainTableLineCellBorderColor')};
  }
  border-bottom: ${CSSVar('mainTableLineCellBorderWidth')} solid
    ${CSSVar('mainTableLineCellBorderColor')};
`;

export const EGlossaryTableHeaderCell = styled(EGlossaryTableCell)`
  font-weight: ${CSSVar('bold')};
  padding: ${CSSVar('mainTableLineCellSpacingY')} ${CSSVar('mainTableLineCellSpacingX')};
  border-top: ${CSSVar('mainTableLineCellBorderWidth')} solid
    ${CSSVar('mainTableLineCellBorderColor')};
`;

export const EGlossaryBackdrop = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: ${CSSVar('mainTableLineBackdropOpacity')};
  border: ${CSSVar('mainTableLineBackdropBorderWidth')} solid transparent;
  will-change: background-color, opacity;
`;

export const EGlossaryPanel = styled.div`
  position: absolute;
  right: 0;
  z-index: 5;
  padding: 0 ${CSSVar('size10')}${CSSVar('size18')};
  transform: translate3d(
    ${CSSVar('inputHeightSmall')},
    calc(${CSSVar('inputHeightSmall')} * -0.8),
    0
  );
`;

const EGlossaryInsertSlot = styled.div`
  position: absolute;
  left: 50%;
  z-index: 5;
  backdrop-filter: blur(${CSSVar('blurHeavy')});
`;

export const EGlossaryInsertSlotTop = styled(EGlossaryInsertSlot)`
  top: 0;
  transform: translate3d(-50%, calc(${CSSVar('inputHeightSmall')} * -1), 0);
`;

export const EGlossaryInsertSlotBottom = styled(EGlossaryInsertSlot)`
  bottom: 0;
  transform: translate3d(-50%, calc(${CSSVar('inputHeightSmall')} * 1), 0);
`;

export const EGlossaryTableLine = styled.div`
  display: grid;
  position: relative;
  grid-template-columns: 1fr 1fr;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('mainTableTextSize')};
  font-weight: ${CSSVar('regular')};
  &:focus-within {
    position: relative;
    z-index: 2;
    ${EGlossaryTableCell} {
      z-index: 3;
      border-left-color: transparent;
      border-right-color: transparent;
      border-top-color: transparent;
      border-bottom-color: transparent;
    }
    ${EGlossaryBackdrop} {
      opacity: ${CSSVar('mainTableLineBackdropOpacityFocus')};
      z-index: 2;
      background: radial-gradient(
        circle at center bottom,
        ${CSSVar('mainTableLineBackdropBgFocus')} 0%,
        transparent 99%
      );
      backdrop-filter: ${CSSVar('mainTableLineBackdropFilterFocus')};
      height: calc(100% + (${CSSVar('mainTableLineBackdropSpacingY')} * 2));
      width: calc(100% + (${CSSVar('mainTableLineBackdropSpacingX')} * 2));
      top: calc(${CSSVar('mainTableLineBackdropSpacingY')} * -1);
      left: calc(${CSSVar('mainTableLineBackdropSpacingX')} * -1);
      transition:
        top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      border-radius: ${CSSVar('mainTableLineBackdropRadius')};
      border-color: ${CSSVar('mainTableLineBackdropBorderColorFocus')};
    }
  }
`;

export const EGlossaryTableHeaderLine = styled(EGlossaryTableLine)`
  position: sticky;
  top: 0;
  z-index: 2;
  background: ${CSSVar('mainTableHeaderBg')};
  backdrop-filter: ${CSSVar('mainTableHeaderBackdrop')};
  opacity: 1;
  font-weight: ${CSSVar('bold')};
`;

export const EGlossaryTableEditable = styled(TinyDivEditor)`
  padding: ${CSSVar('mainTableLineCellSpacingY')} ${CSSVar('mainTableLineCellSpacingX')};
  &:hover {
    background: ${CSSVar('mainTableLineCellBgHover')};
    color: ${CSSVar('mainTableLineColorHover')};
    border-color: ${CSSVar('mainTableLineCellBorderColorHover')};
  }
  &:focus {
    background: ${CSSVar('mainTableLineCellBgFocus')};
    border-color: ${CSSVar('mainTableLineCellBorderColorFocus')};
    color: ${CSSVar('mainTableLineColorFocus')};
  }
`;
