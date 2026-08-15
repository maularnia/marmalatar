import { GlossaryPairColumnType, useGlossaryRefs } from '@providers/GlossaryRefsProvider';
import { ThemeColors } from '@src/theme/utils';
import { TLanguage } from '@src/types';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint } from '@ui-toolkit/Tooltip';
import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EGlossaryBackdrop,
  EGlossaryInsertSlotBottom,
  EGlossaryInsertSlotTop,
  EGlossaryPanel,
  EGlossaryTableCell,
  EGlossaryTableEditable,
  EGlossaryTableLine,
} from './partials';

const preventBlur = (event: MouseEvent) => event.preventDefault();

type GlossaryTableLineProps = {
  pairIndex: number;
  original: string;
  translation: string;
  sourceLanguage: TLanguage;
  targetLanguage: TLanguage;
  onOriginalChange: (value: string) => void;
  onTranslationChange: (value: string) => void;
  onFocus: (column: GlossaryPairColumnType) => void;
  onDelete: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
};

export default function GlossaryTableLine({
  pairIndex,
  original,
  translation,
  sourceLanguage,
  targetLanguage,
  onOriginalChange,
  onTranslationChange,
  onFocus,
  onDelete,
  onInsertBefore,
  onInsertAfter,
}: GlossaryTableLineProps) {
  const { t } = useTranslation('tooltips');
  const { registerGlossaryPairInputRef } = useGlossaryRefs();
  const originalInputRef = useRef<HTMLDivElement>(null);
  const translationInputRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState<boolean>();

  const onInputFocus = useCallback(
    (column: GlossaryPairColumnType) => {
      onFocus(column);
      setIsFocused(true);
    },
    [onFocus]
  );

  useEffect(() => {
    registerGlossaryPairInputRef(pairIndex, 'original', originalInputRef.current);
    registerGlossaryPairInputRef(pairIndex, 'translation', translationInputRef.current);
    return () => {
      registerGlossaryPairInputRef(pairIndex, 'original', null);
      registerGlossaryPairInputRef(pairIndex, 'translation', null);
    };
  }, [pairIndex, registerGlossaryPairInputRef]);

  return (
    <EGlossaryTableLine>
      <EGlossaryBackdrop />
      {isFocused && (
        <EGlossaryInsertSlotTop>
          <Tooltip
            label={
              <TooltipComplex title={t('glossary.insertBefore')}>
                <TooltipKeystrokeHint keys={['Alt', ',']} />
              </TooltipComplex>
            }
            side="top"
          >
            <Button
              color={ThemeColors.TEXT}
              variant={TButtonVariant.TRANSPARENT}
              tabIndex={-1}
              size={TButtonSize.SMALL}
              icon={TIcon.INSERT_BEFORE}
              onMouseDown={preventBlur}
              onClick={onInsertBefore}
            />
          </Tooltip>
        </EGlossaryInsertSlotTop>
      )}
      {isFocused && (
        <EGlossaryInsertSlotBottom>
          <Tooltip
            label={
              <TooltipComplex title={t('glossary.insertAfter')}>
                <TooltipKeystrokeHint keys={['Alt', '.']} />
              </TooltipComplex>
            }
            side="bottom"
          >
            <Button
              color={ThemeColors.TEXT}
              variant={TButtonVariant.TRANSPARENT}
              tabIndex={-1}
              size={TButtonSize.SMALL}
              icon={TIcon.INSERT_AFTER}
              onMouseDown={preventBlur}
              onClick={onInsertAfter}
            />
          </Tooltip>
        </EGlossaryInsertSlotBottom>
      )}
      {isFocused && (
        <EGlossaryPanel>
          <Tooltip
            label={
              <TooltipComplex title={t('glossary.delete')}>
                <TooltipKeystrokeHint keys={['Alt', 'Del / ⌫']} />
              </TooltipComplex>
            }
            side="right"
          >
            <Button
              color={ThemeColors.RED}
              variant={TButtonVariant.TRANSPARENT}
              tabIndex={-1}
              size={TButtonSize.SMALL}
              icon={TIcon.BIN}
              onMouseDown={preventBlur}
              onClick={onDelete}
            />
          </Tooltip>
        </EGlossaryPanel>
      )}
      <EGlossaryTableCell>
        <EGlossaryTableEditable
          ref={originalInputRef}
          value={original}
          language={sourceLanguage}
          checkSpelling={false}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => onInputFocus('original')}
          onBlur={() => setIsFocused(false)}
          onInput={onOriginalChange}
        />
      </EGlossaryTableCell>
      <EGlossaryTableCell>
        <EGlossaryTableEditable
          ref={translationInputRef}
          value={translation}
          language={targetLanguage}
          checkSpelling={false}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => onInputFocus('translation')}
          onBlur={() => setIsFocused(false)}
          onInput={onTranslationChange}
        />
      </EGlossaryTableCell>
    </EGlossaryTableLine>
  );
}
