// main.ts passes each service's handler names to preload in this command-line argument, so preload
// can build window.electronAPI without listing the handlers itself. Lives apart from both files:
// importing a value from preload.ts would pull its side effects into the main bundle.
export const IPC_HANDLERS_ARGUMENT = '--ipc-handlers=';
