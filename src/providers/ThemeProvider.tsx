import '@src/assets/fonts.css';
import { PropsWithChildren, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { LARGE_SCREEN_THRESHOLD, MEDUIM_SCREEN_THRESHOLD } from '@src/consts';
import { TThemeSelection } from '@src/types';
import {
  selectResolvedThemeName,
  selectThemeSelection,
  setScreenSize,
  setResolvedThemeName,
} from '@store/slices/app';
import { TScreenSize } from '@src/theme/types';

const getCurrentMatcher = (): [MediaQueryList, TScreenSize] => {
  const large = window.matchMedia(`(min-width: ${LARGE_SCREEN_THRESHOLD + 1}px)`);
  const medium = window.matchMedia(
    `(min-width: ${MEDUIM_SCREEN_THRESHOLD}px) and (max-width: ${LARGE_SCREEN_THRESHOLD}px)`
  );
  const small = window.matchMedia(`(max-width: ${MEDUIM_SCREEN_THRESHOLD}px)`);
  if (large.matches) return [large, TScreenSize.LARGE];
  if (medium.matches) return [medium, TScreenSize.MEDIUM];
  return [small, TScreenSize.SMALL];
};

export default function ThemeProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const selection = useAppSelector(selectThemeSelection);
  const resolvedThemeName = useAppSelector(selectResolvedThemeName);
  const matcher = useRef<MediaQueryList>(null);
  useEffect(() => {
    const onMatchChage = () => {
      if (matcher.current) matcher.current.removeEventListener('change', onMatchChage);
      const [mc, size] = getCurrentMatcher();
      matcher.current = mc;
      matcher.current.addEventListener('change', onMatchChage);
      dispatch(setScreenSize(size));
    };
    onMatchChage();
    return () => {
      if (matcher.current) matcher.current.removeEventListener('change', onMatchChage);
    };
  }, [dispatch]);

  useEffect(() => {
    if (selection !== TThemeSelection.SYSTEM) {
      dispatch(setResolvedThemeName(selection === TThemeSelection.DARK ? 'dark' : 'light'));
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    dispatch(setResolvedThemeName(mq.matches ? 'dark' : 'light'));
    const handler = (e: MediaQueryListEvent) =>
      dispatch(setResolvedThemeName(e.matches ? 'dark' : 'light'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [selection, dispatch]);

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${resolvedThemeName}`);
  }, [resolvedThemeName]);

  return children;
}
