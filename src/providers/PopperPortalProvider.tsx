import { createContext, PropsWithChildren, useContext, useState } from 'react';
import styled from 'styled-components';

const OverlaysRoot = styled.div`
  position: absolute;
  width: 100%;
  left: 0;
  top: 0;
  z-index: 1001;

  .rselect__menu {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
  }
`;

type TPopperPortalContext = HTMLDivElement | undefined;

// Undefined until the overlays root has mounted -- consumers wait for it before portaling.
const PopperPortalContext = createContext<TPopperPortalContext>(undefined);

export function usePopperPortal(): TPopperPortalContext {
  return useContext(PopperPortalContext);
}

export function PopperPortalProvider({ children }: PropsWithChildren) {
  const [value, setValue] = useState<HTMLDivElement>();
  return (
    <>
      <OverlaysRoot
        className={'app-global-overlays'}
        ref={(instance) => {
          setValue(instance ?? undefined);
        }}
      />
      <PopperPortalContext.Provider value={value}>{children}</PopperPortalContext.Provider>
    </>
  );
}
