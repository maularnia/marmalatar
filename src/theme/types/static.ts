import { TOpacity } from '@src/theme/definitions';
import { TThemeVarsChapter } from '@src/theme/types';

export type TThemeStaticFontsChapter = TThemeVarsChapter<{
  fontHeadingSansSerif: string;
  fontHeadingSerif: string;
  fontTextSansSerif: string;
  fontTextSerif: string;
  fontMonospace: string;
}>;

export type TThemeStaticSizesChapter = TThemeVarsChapter<{
  size1: string;
  size2: string;
  size4: string;
  size6: string;
  size10: string;
  size12: string;
  size14: string;
  size18: string;
  size24: string;
  size34: string;
  size56: string;
  size92: string;
}>;

export type TThemeStaticWeightsChapter = TThemeVarsChapter<{
  extralight: number;
  light: number;
  regular: number;
  semibold: number;
  bold: number;
  black: number;
}>;

export type TThemeStaticTextChapter = TThemeVarsChapter<{
  sizeH1: string;
  weightH1: number;
  sizeH2: string;
  weightH2: number;
  sizeH3: string;
  weightH3: number;
  sizeH4: string;
  weightH4: number;
  sizeH5: string;
  weightH5: number;
  sizeH6: string;
  weightH6: number;
  sizeTextNano: string;
  weightTextNano: number;
  sizeTextSmall: string;
  weightTextSmall: number;
  sizeTextRegular: string;
  weightTextRegular: number;
  sizeTextLarge: string;
  weightTextLarge: number;
}>;

export type TThemeStaticBlurChapter = TThemeVarsChapter<{
  blurExtreme: string;
  blurHeavy: string;
  blurRegular: string;
  blurLight: string;
}>;

export type TThemeStaticScreenChapter = TThemeVarsChapter<{
  appScreenHorizontalSpacing: string;
  appScreenWidth: string;
  appScrollbarWidth: string;
  appScrollbarBorderRadius: string;
}>;

export type TThemeStaticWindowsChapter = TThemeVarsChapter<{
  windowBorderWidth: string;
  windowBorderRadius: string;
  windowSpacingX: string;
  windowSpacingY: string;
  windowSpacingInnerX: string;
  windowSpacingInnerY: string;
}>;

export type TThemeStaticTagsChapter = TThemeVarsChapter<{
  tagSpacingNanoX: string;
  tagSpacingNanoY: string;
  tagSpacingSmallX: string;
  tagSpacingSmallY: string;
  tagSpacingRegularX: string;
  tagSpacingRegularY: string;
  tagSpacingLargeX: string;
  tagSpacingLargeY: string;
  tagTextSizeNano: string;
  tagTextSizeSmall: string;
  tagTextSizeRegular: string;
  tagTextSizeLarge: string;
  tagBorderRadiusNano: string;
  tagBorderRadiusSmall: string;
  tagBorderRadiusRegular: string;
  tagBorderRadiusLarge: string;
}>;

export type TThemeStaticMessageChapter = TThemeVarsChapter<{
  messageBorderWidthPrimary: string;
  messageBorderWidthSecondary: string;
  messageBorderRadiusNano: string;
  messageBorderRadiusSmall: string;
  messageBorderRadiusRegular: string;
  messageBorderRadiusLarge: string;
  messageTextSizeNano: string;
  messageTextSizeSmall: string;
  messageTextSizeRegular: string;
  messageTextSizeLarge: string;
  messageSpacingNanoX: string;
  messageSpacingNanoY: string;
  messageSpacingSmallX: string;
  messageSpacingSmallY: string;
  messageSpacingRegularX: string;
  messageSpacingRegularY: string;
  messageSpacingLargeX: string;
  messageSpacingLargeY: string;
}>;

export type TThemeStaticTableChapter = TThemeVarsChapter<{
  mainTableWidth: string;
  mainTableTextSize: string;
  mainTableLineBackdropRadius: string;
  mainTableLineCellSpacingX: string;
  mainTableLineCellSpacingY: string;
  mainTableLineBackdropBorderWidth: string;
  mainTableLineBackdropSpacingX: string;
  mainTableLineBackdropSpacingY: string;
  mainTableLineCellSpacingInnerX: string;
  mainTableLineCellBorderWidth: string;
  mainTableLineCellBorderWidthCompleted: string;
  mainTableLineCellBorderWidthHover: string;
  mainTableLineCellBorderWidthFocus: string;
  mainTableLineCellBorderWidthActive: string;
  mainTableLineCellBorderWidthMergeCandidate: string;
  mainTableCharacterSelectorSpacingX: string;
  mainTableCharacterSelectorSpacingY: string;
  mainTableCharacterSelectorSpacingInnerY: string;
  mainTableCharacterSelectorSpacingInnerX: string;
  mainTableCharacterSelectorScrollbarWidth: string;
  mainTableCharacterSelectorScrollbarBorderRadius: string;
}>;

export type TThemeStaticWaveformsChapter = TThemeVarsChapter<{
  waveformHeight: string;
  waveformSpacingY: string;
  waveformSpacingX: string;
}>;

export type TThemeStaticInputsChapter = TThemeVarsChapter<{
  inputOpacityDisabled: string;
  inputOpacity: string;
  inputHeightNano: string;
  inputHeightSmall: string;
  inputHeightRegular: string;
  inputHeightLarge: string;
  inputBorderRadius: string;
  inputSpacingXLargeIconic: string;
  inputSpacingXLarge: string;
  inputSpacingYLarge: string;
  inputSpacingXRegularIconic: string;
  inputSpacingXRegular: string;
  inputSpacingYRegular: string;
  inputSpacingXSmallIconic: string;
  inputSpacingXSmall: string;
  inputSpacingYSmall: string;
  inputSpacingXNanoIconic: string;
  inputSpacingXNano: string;
  inputSpacingYNano: string;
  inputTextSizeLarge: string;
  inputTextSizeRegular: string;
  inputTextSizeSmall: string;
  inputTextSizeNano: string;
  inputBorderWidth: string;
  inputBorderWidthFocus: string;
  inputBorderWidthHover: string;
  inputBorderWidthDisabled: string;
  inputOptionBorderRadius: string;
  inputOptionSpacingX: string;
  inputOptionSpacingY: string;
  inputOptionTextSize: string;
  inputOptionHeight: string;
  inputDropdownBorderRadius: string;
  inputDropdownSpacingInner: string;
  buttonHeightLarge: string;
  buttonHeightRegular: string;
  buttonHeightSmall: string;
  buttonHeightNano: string;
  inputSpacingXInnerLarge: string;
  inputSpacingYInnerLarge: string;
  inputSpacingXInnerRegular: string;
  inputSpacingYInnerRegular: string;
  inputSpacingXInnerSmall: string;
  inputSpacingYInnerSmall: string;
  inputSpacingXInnerNano: string;
  inputSpacingYInnerNano: string;
  toggleTrackWidth: string;
  toggleTrackHeight: string;
  toggleKnobInset: string;
  toggleScaleEmphasis: string;
}>;

export type TThemeStaticVideoPlayerTypeChapter = TThemeVarsChapter<{
  videoPlayerSpacingX: string;
  videoPlayerSpacingY: string;
  videoPlayerSpacingInnerX: string;
  videoPlayerSpacingInnerY: string;
  videoPlayerBorderRadius: string;
  videoPlayerSubtitleMaxHeight: string;
  videoPlayerSubtitlesSpacingX: string;
  videoPlayerSubtitlesSpacingY: string;
  videoPlayerSubtitlesBorderRadius: string;
  videoPlayerSubtitlesTextSize: string;
}>;

export type TThemeStaticControlPanelTypeChapter = TThemeVarsChapter<{
  controlPanelOffset: string;
  controlPanelSpacingX: string;
  controlPanelSpacingY: string;
  controlPanelBorderRadius: string;
  controlPanelBorderWidth: string;
}>;

export type TThemeStaticTablesChapter = TThemeVarsChapter<{
  tableBorderRadius: string;
  tableBorderWidth: string;
  tableCellBorderRadius: string;
  tableCellBorderWidth: string;
  tableCellSpacingX: string;
  tableCellSpacingY: string;
}>;

export type TThemeStaticFormsChapter = TThemeVarsChapter<{
  formSpacingX: string;
  formSpacingY: string;
  fromBorderRadius: string;
  formSpacingInnerX: string;
  formSpacingInnerY: string;
  formRowSpacingX: string;
  fromRowBorderWidth: string;
  formRowSpacingY: string;
  formRowSpacingInner: string;
  fromRowBorderRadius: string;
  formSectionSpacingX: string;
  formSectionBorderWidth: string;
  formSectionSpacingY: string;
  formSectionSpacingInner: string;
  formSectionBorderRadius: string;
  formSectionEntrySpacingX: string;
  formSectionEntrySpacingY: string;
  formSectionEntrySpacingInner: string;
}>;

export type TThemeStaticTooltipChapter = TThemeVarsChapter<{
  tooltipSpacingX: string;
  tooltipSpacingY: string;
  tooltipSpacingInnerX: string;
  tooltipSpacingInnerY: string;
  tooltipBorderRadius: string;
  tooltipFontSize: string;
  tooltipTitleFontSize: string;
}>;

export type TThemeStaticEmojiPickerChapter = TThemeVarsChapter<{
  emojiPickerWidth: string;
  emojiPickerHeight: string;
  emojiPickerFontFamily: string;
  emojiPickerBorderRadius: string;
  emojiPickerBorderSize: string;
  emojiPickerCategoryFontSize: string;
  emojiPickerEmojiSize: string;
  emojiPickerTotalEmojiSize: string;
  emojiPickerEmojiPadding: string;
  emojiPickerIndicatorHeight: string;
  emojiPickerInputBorderRadius: string;
  emojiPickerInputBorderSize: string;
  emojiPickerInputFontSize: string;
  emojiPickerInputLineHeight: string;
  emojiPickerInputPadding: string;
  emojiPickerNumColumns: number;
  emojiPickerOutlineSize: string;
  emojiPickerSkintoneBorderRadius: string;
}>;

export type TThemeStaticMarkChapter = TThemeVarsChapter<{
  markBorderRadius: string;
  markUnderlineWidth: string;
}>;

export type TThemeStaticOpacitiesChapter = TThemeVarsChapter<{
  [key in `opacity-${TOpacity}`]: number;
}>;

export type TThemeStaticListItemChapter = TThemeVarsChapter<{
  listItemHeight: string;
  listItemBorderRadius: string;
  listItemSpacingX: string;
  listItemSpacingY: string;
  listItemSpacingInnerX: string;
  listItemTextSize: string;
  projectListSpacingX: string;
  projectListSpacingY: string;
  projectListSpacingInnerY: string;
}>;

export type TThemeStaticVars = TThemeStaticFontsChapter &
  TThemeStaticSizesChapter &
  TThemeStaticWeightsChapter &
  TThemeStaticOpacitiesChapter &
  TThemeStaticBlurChapter &
  TThemeStaticTextChapter &
  TThemeStaticScreenChapter &
  TThemeStaticMessageChapter &
  TThemeStaticTableChapter &
  TThemeStaticTagsChapter &
  TThemeStaticInputsChapter &
  TThemeStaticWaveformsChapter &
  TThemeStaticWindowsChapter &
  TThemeStaticVideoPlayerTypeChapter &
  TThemeStaticControlPanelTypeChapter &
  TThemeStaticTablesChapter &
  TThemeStaticFormsChapter &
  TThemeStaticTooltipChapter &
  TThemeStaticEmojiPickerChapter &
  TThemeStaticListItemChapter &
  TThemeStaticMarkChapter;
