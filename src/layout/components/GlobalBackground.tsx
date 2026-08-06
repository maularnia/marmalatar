import styled from 'styled-components';
import { CSSVar } from '@src/theme/utils';
import { useVideo } from '@providers/VideoProvider';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;
const BackdropOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${CSSVar('appBgOverlay')};
  opacity: ${CSSVar('appBgOpacity')};
`;
const BackdropImage = styled.div.attrs<{ $image: string | null }>(({ $image }) => ({
  style: { backgroundImage: $image ? `url(${$image})` : 'none' },
}))`
  position: absolute;
  filter: ${CSSVar('appBgFilter')};
  inset: 0;
  background-size: cover;
`;

export default function GlobalBackground() {
  const { thumbnail: imageUrl } = useVideo();
  const hasImage = Boolean(imageUrl);

  return (
    <Backdrop>
      {hasImage && <BackdropImage $image={imageUrl} />}
      <BackdropOverlay className={hasImage ? 'widthImage' : ''} />
    </Backdrop>
  );
}
