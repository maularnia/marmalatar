export function providerNoop(contextName: string): () => never {
  return () => {
    throw new Error(`Context ${contextName} was not provided`);
  };
}
export const noop = () => {};
