import { selectIsLargeScreen } from '@src/store/slices/app';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import Tooltip, { TooltipComplex } from '@ui-toolkit/Tooltip';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

const LinePanel = styled.div`
  display: flex;
  flex-direction: row;
  position: relative;
  justify-self: flex-end;
  align-items: center;
  overflow: hidden;
  gap: ${CSSVar('mainTableLineCellSpacingInnerX')};
  padding: ${CSSVar('size2')};
  bottom: 0;
  &.isLargeScreen {
    flex-direction: column;
  }
  > * {
    flex-shrink: 0;
    flex-grow: 0;
  }
`;

const LineMetaSection = styled.div`
  display: flex;
  gap: ${CSSVar('mainTableLineCellSpacingInnerX')};
  align-items: center;
  color: ${CSSVar('mainTableLineColorFocus')};
`;

type EditorTableLinePanelProps = {
  isCompleted: boolean;
  isCompletedToggleHidden: boolean;
  onRemove: () => void;
  onToggleCompleted: () => void;
};

export function EditorTableLinePanel({
  isCompleted,
  isCompletedToggleHidden,
  onRemove,
  onToggleCompleted,
}: EditorTableLinePanelProps) {
  const { t } = useTranslation('tooltips');
  const isLargeScreen = useSelector(selectIsLargeScreen);
  return (
    <LinePanel className={classNames({ isLargeScreen })}>
      <LineMetaSection className={'editorControls'}>
        {!isCompletedToggleHidden && (
          <Tooltip
            label={
              <TooltipComplex
                style={{ textAlign: 'center' }}
                title={t('workTableLine.markLineComplete')}
              >
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  ↵
                </Tag>
              </TooltipComplex>
            }
          >
            <Button
              tabIndex={-1}
              variant={TButtonVariant.TRANSPARENT}
              size={TButtonSize.SMALL}
              color={ThemeColors.TEXT}
              icon={isCompleted ? TIcon.CROSS : TIcon.TICK}
              onClick={onToggleCompleted}
            />
          </Tooltip>
        )}
        <Tooltip
          label={
            <TooltipComplex style={{ textAlign: 'center' }} title={t('workTableLine.deleteLine')}>
              <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                Alt
              </Tag>
              {' + '}
              <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                Del / ⌫
              </Tag>
            </TooltipComplex>
          }
        >
          <Button
            variant={TButtonVariant.TRANSPARENT}
            tabIndex={-1}
            size={TButtonSize.SMALL}
            color={ThemeColors.RED}
            onClick={onRemove}
            icon={TIcon.BIN}
          />
        </Tooltip>
      </LineMetaSection>
    </LinePanel>
  );
}
