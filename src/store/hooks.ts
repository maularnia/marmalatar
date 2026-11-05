import { shallowEqual, useSelector } from 'react-redux';
import type { RootState } from './root';

// No dispatch hook: facade actions and thunks dispatch themselves (see createApi.ts)
export const useAppSelector = useSelector.withTypes<RootState>();

type TAppSelector = (state: RootState) => unknown;

/**
 * Several selectors in one subscription, returning their results as a typed tuple:
 *
 *   const [folderPath, projectList, isBusy] = useAppSelectors(
 *     folder.selectPath,
 *     projects.selectList,
 *     ai.selectIsBusy
 *   );
 *
 * The component re-renders only when one of the results changes (compared one by one, like
 * `shallowEqual`), not whenever the tuple is rebuilt.
 */
export function useAppSelectors<const TSelectors extends readonly TAppSelector[]>(
  ...selectors: TSelectors
): { [K in keyof TSelectors]: ReturnType<TSelectors[K]> } {
  return useSelector(
    (state: RootState) => selectors.map((selector) => selector(state)),
    shallowEqual
  ) as { [K in keyof TSelectors]: ReturnType<TSelectors[K]> };
}
