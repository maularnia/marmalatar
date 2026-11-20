type WaveformEntryFingerprintProps = {
  lineNo: number;
  left: number;
  width: number;
  isActive: boolean;
  isFocused: boolean;
  isDragging: boolean;
  /** The line's characters as `name:color`, so a recolored or reassigned role re-renders it */
  characterKey: string;
  isShort: boolean;
};

export function getWaveformEntryFingerprint(props: WaveformEntryFingerprintProps): string {
  return [
    props.lineNo,
    props.left,
    props.width,
    props.isActive ? 1 : 0,
    props.isFocused ? 1 : 0,
    props.isDragging ? 1 : 0,
    props.characterKey,
    props.isShort ? 1 : 0,
  ].join('::');
}
