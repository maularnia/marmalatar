import { z } from 'zod';

// The languages the app works with, shared by the main process and the renderer. The renderer
// re-exports the enum from src/types.ts; its labels and flags stay there (UI only).
export enum TLanguage {
  English = 'EN_en',
  German = 'DE_de',
  Spanish = 'ES_es',
  Italian = 'IT_it',
  Belarusian = 'BE_be',
  Ukrainian = 'UK_uk',
  Polish = 'PL_pl',
}

export const LanguageCodeSchema = z.enum(Object.values(TLanguage) as [TLanguage, ...TLanguage[]]);
