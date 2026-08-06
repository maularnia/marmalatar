// Wire-level boundary type for the generic get/set-integration-settings IPC methods
// (bridge/electronAPI.ts), dispatched by a runtime integrationId to one of three concrete,
// versioned per-provider schemas -- see electron/modules/ai/aiIpc.ts's
// integrationSettingsContracts table. Stays a loose flat string map (not a union of the three
// concrete shapes) because a single non-overloaded method can't discriminate its return type by a
// runtime string; each AiClient on the FE narrows this to its own literal key union via an
// unchecked cast, unchanged by this change.
export type IntegrationSettings = Record<string, string>;
