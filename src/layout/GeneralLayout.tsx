import { TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import styled from 'styled-components';
import { Outlet } from 'react-router-dom';
import MainMenu from '../segments/menu';
import Overlays from '../segments/overlays/Overlays';
import { menu } from '@src/services/menu';
import { useAppSelector } from '@store/hooks';
import classNames from 'classnames';
import { MENU_EXPANDED_WIDTH } from '@src/toolkit/motion/menu';

const Root = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: grid;
  grid-template-columns: ${MENU_EXPANDED_WIDTH}px 1px auto;
  position: relative;
  &.dynamic {
    grid-template-columns: 34px 1px auto;
  }
`;

const RootMenu = styled.div`
  overflow: hidden;
  background-color: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 10)};
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
      <Hr variant={THrVariant.DIMMED} orientation={THrOrient.VERTICAL} />
      <RootContent>
        <Outlet />
        <Overlays />
      </RootContent>
    </Root>
  );
}
