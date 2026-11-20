import { memo, useLayoutEffect, useRef } from 'react';
import styled from 'styled-components';

type TWaveformTileProps = {
  left: number;
  width: number;
  peaks: number[];
  barWidth: number;
  color: string;
};

const PEAK_HEIGHT_COEFFICIENT = 0.9;

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  display: block;
  height: 100%;
`;

function WaveformTile({ left, width, peaks, barWidth, color }: TWaveformTileProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Layout effect so a freshly mounted tile is drawn before it's painted empty
  useLayoutEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    // Sync canvas resolution to its rendered pixel size
    canvas.width = width;
    canvas.height = canvas.clientHeight || 80;

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;

    const midY = canvas.height / 2;
    // Rounded outwards so a bar crossing a tile boundary is drawn in both tiles
    const firstIndex = Math.floor(left / barWidth);
    const lastIndex = Math.min(peaks.length, Math.ceil((left + width) / barWidth));

    for (let index = firstIndex; index < lastIndex; index++) {
      const barHeight = Math.max(1, peaks[index] * (canvas.height * PEAK_HEIGHT_COEFFICIENT));
      const x = index * barWidth - left;
      const y = midY - barHeight / 2;

      context.fillRect(x, y, Math.max(1, barWidth), barHeight);
    }
  }, [left, width, peaks, barWidth, color]);

  return <Canvas ref={canvasRef} width={width} style={{ left: `${left}px` }} />;
}

export default memo(WaveformTile);
