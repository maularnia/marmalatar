import { z } from 'zod';
import { VersionedSchema } from './shared';

// Wire shape for the app-wide settings blob. `themeSelection`/`uiLocale` are plain strings here —
// the FE narrows them to its own enums (TThemeSelection / SUPPORTED_UI_LOCALES) via `.extend()` in
// src/utils/appSettingsFile.ts, since those enums (and every field's fallback default) are FE-only
// concerns that must not be imported into this neutral folder. The renderer always sends a
// fully-formed, already-validated object here, so this contract has no `.catch()` fallbacks —
// those live on the FE schema that reads potentially-stale data back out of electron-store.
export const AppSettingsContractV1Schema = VersionedSchema.extend({
  version: z.literal(1).default(1),
  selectedIntegrationId: z.string().nullable(),
  AIintegrationEnabled: z.boolean(),
  askBeforeMerge: z.boolean(),
  askBeforeDelete: z.boolean(),
  askBeforeAITranslate: z.boolean(),
  askBeforeSplit: z.boolean(),
  autoMergeThreshold: z.number(),
  scrollVideoIntoViewOnPlay: z.boolean(),
  autoMarkLinesCompleted: z.boolean(),
  timeAdjustmentStep: z.number(),
  themeSelection: z.string(),
  checkGrammar: z.boolean(),
  uiLocale: z.string(),
});
export type AppSettingsContract = z.infer<typeof AppSettingsContractV1Schema>;

// Version config (defineVersionedContract) and the reader built from it live in
// contracts.ts, alongside every other contract's.
