import { GlossaryPairColumnType, useGlossaryRefs } from '@providers/GlossaryRefsProvider';
import { TLanguage } from '@src/types';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  EGlossaryBackdrop,
  EGlossaryTableCell,
  EGlossaryTableEditable,
  EGlossaryTableLine,
} from './partials';

type GlossaryTableLineProps = {
  pairIndex: number;
  original: string;
  panel: ReactNode;
  translation: string;
  sourceLanguage: TLanguage;
  targetLanguage: TLanguage;
  onOriginalChange: (value: string) => void;
  onTranslationChange: (value: string) => void;
  onFocus: (column: GlossaryPairColumnType) => void;
};

export default function GlossaryTableLine({
  pairIndex,
  original,
  panel,
  translation,
  sourceLanguage,
  targetLanguage,
  onOriginalChange,
  onTranslationChange,
  onFocus,
}: GlossaryTableLineProps) {
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
      {isFocused ? panel : null}
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
