import { PropsWithChildren } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';

export default function AppErrorBoundary({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => console.error(error, info.componentStack)}
    >
      {children}
    </ErrorBoundary>
  );
}
