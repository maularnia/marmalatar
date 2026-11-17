import { CSSVar } from '@src/theme/utils';
import styled from 'styled-components';
import { Outlet } from 'react-router-dom';
import MainMenu from '../segments/menu';
import Overlays from '../segments/overlays/Overlays';
import { menu } from '@src/services/menu';
import { useAppSelector } from '@store/hooks';
import classNames from 'classnames';

const Root = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: grid;
  grid-template-columns: ${CSSVar('appMenuExpandedWidth')} minmax(0, 1fr);
  position: relative;
  &.dynamic {
    grid-template-columns: ${CSSVar('appMenuCollapsedWidth')} minmax(0, 1fr);
    /* The collapsed sidebar's column is narrower than the expanded sidebar an overlay keeps open
       over the content, so overlays (positioned in the content column) move right by the rest */
    --menu-overlap: calc(${CSSVar('appMenuExpandedWidth')} - ${CSSVar('appMenuCollapsedWidth')});
  }
`;

const RootMenu = styled.div`
  overflow: hidden;
`;

const RootContent = styled.div`
  overflow-y: auto;
  position: relative;
  &::-webkit-scrollbar {
    width: ${CSSVar('appScrollbarWidth')};
  }

  &::-webkit-scrollbar-track {
    background: ${CSSVar('appScrollbarTrackColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }

  &::-webkit-scrollbar-thumb {
    width: calc(${CSSVar('appScrollbarWidth')} * 2);
    background: ${CSSVar('appScrollbarThumbColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
  &.isSmallScreen {
    max-width: ${CSSVar('appScreenWidth')};
  }
`;

export default function GeneralLayout() {
  const dynamic = useAppSelector(menu.selectIsDynamic);
  return (
    <Root className={classNames({ dynamic })}>
      <RootMenu
        onMouseEnter={() => menu.setPointerOutside(false)}
        onMouseLeave={() => menu.setPointerOutside(true)}
      >
        <MainMenu />
      </RootMenu>
      <RootContent>
        <Outlet />
        <Overlays />
      </RootContent>
    </Root>
  );
}
