import { useTranslation } from 'react-i18next';
import { EGlossaryTableHeaderCell, EGlossaryTableHeaderLine } from './partials';

export default function GlossaryTableHeader() {
  const { t } = useTranslation('glossary');
  return (
    <EGlossaryTableHeaderLine>
      <EGlossaryTableHeaderCell>{t('table.originalHeader')}</EGlossaryTableHeaderCell>
      <EGlossaryTableHeaderCell>{t('table.translationHeader')}</EGlossaryTableHeaderCell>
    </EGlossaryTableHeaderLine>
  );
}
