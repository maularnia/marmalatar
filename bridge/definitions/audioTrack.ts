// One audio stream of a media file, as reported by ffprobe. Fields the file doesn't carry are null.
export type TAudioTrack = {
  // ffprobe's absolute stream index -- what `-map 0:{id}` selects
  id: number;
  codec: string | null;
  channels: number | null;
  channelLayout: string | null;
  sampleRate: number | null;
  bitRate: number | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  isCommentary: boolean;
};
