import { useSelector } from 'react-redux';
import type { RootState } from './root';

// No dispatch hook: facade actions and thunks dispatch themselves (see createApi.ts)
export const useAppSelector = useSelector.withTypes<RootState>();
