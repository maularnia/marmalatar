// Bridges hand provider APIs to code outside React. All their providers mount at app start, above
// every page, so reaching one before that is a programming error, not a state to recover from.
export function bridgeNotMounted(bridge: string): never {
  throw new Error(`${bridge} bridge: provider not mounted`);
}
