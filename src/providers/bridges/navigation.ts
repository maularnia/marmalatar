import { bridgeNotMounted } from './bridgeNotMounted';

type TNavigate = (to: string) => void;

let navigateTo: TNavigate | null = null;

/** Called by `NavigationBridge` (inside the router) on mount; the returned function unregisters
 * it. */
export function registerNavigationBridge(value: TNavigate): () => void {
  navigateTo = value;
  return () => {
    if (navigateTo === value) navigateTo = null;
  };
}

/** `useNavigate()` for code outside React (services). */
export function navigate(to: string): void {
  (navigateTo ?? bridgeNotMounted('navigation'))(to);
}
