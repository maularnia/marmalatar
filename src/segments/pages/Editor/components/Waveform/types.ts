// Which part of an entry a pointer drag grabbed. Shared by the waveform and its entries, so the
// entry doesn't import the waveform that renders it.
export type DragMode = 'move' | 'resize-left' | 'resize-right';
