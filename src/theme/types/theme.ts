import { TColor, TOpacity, TShade } from '@src/theme/definitions';
import { TThemeVarsChapter } from '@src/theme/types';

export type TThemeAppChapter = TThemeVarsChapter<{
  appScrollbarThumbColor: string;
  appScrollbarTrackColor: string;
  appBgGradientStartColor: string;
  appBgGradientEndColor: string;
  appBgOpacity: string;
  appBgFilter: string;
  appBgOverlay: string;
}>;

export type TThemeAppWindowsChapter = TThemeVarsChapter<{
  windowBorderColor: string;
  windowBackdropFilter: string;
  windowBoxShadow: string;
  windowBackdropBg: string;
  windowBg: string;
  windowShadow: string;
  windowColor: string;
}>;

export type TThemeAppInputsChapter = TThemeVarsChapter<{
  inputBevelBackdropFilter: string;
  inputEmbossBackdropFilter: string;
  inputDropdownBg: string;
  inputBgDefault: [TColor, false];
  inputBgOpacity: [TOpacity, false];
  inputBgOpacityHover: [TOpacity, false];
  inputBgOpacityFocus: [TOpacity, false];
  inputBgOpacityDisabled: [TOpacity, false];
  inputBgShade: [TShade, false];
  inputBgShadeHover: [TShade, false];
  inputBgShadeFocus: [TShade, false];
  inputBgShadeDisabled: [TShade, false];
  inputColorOpacity: [TOpacity, false];
  inputColorOpacityHover: [TOpacity, false];
  inputColorOpacityFocus: [TOpacity, false];
  inputColorOpacityDisabled: [TOpacity, false];
  inputColorShade: [TShade, false];
  inputColorShadeHover: [TShade, false];
  inputColorShadeFocus: [TShade, false];
  inputColorShadeDisabled: [TShade, false];
  inputBorderColorShade: [TShade, false];
  inputBorderColorShadeHover: [TShade, false];
  inputBorderColorShadeFocus: [TShade, false];
  inputBorderColorShadeDisabled: [TShade, false];
  inputBorderColorOpacity: [TOpacity, false];
  inputBorderColorOpacityHover: [TOpacity, false];
  inputBorderColorOpacityFocus: [TOpacity, false];
  inputBorderColorOpacityDisabled: [TOpacity, false];

  inputTextWeightLarge: string;
  inputTextWeightRegular: string;
  inputTextWeightSmall: string;
  inputTextWeightNano: string;
  inputOptionBg: string;
  inputOptionBgFocused: string;
  inputOptionBgSelected: string;
  inputOptionBgDisabled: string;
  inputOptionColor: string;
  inputOptionColorFocused: string;
  inputOptionColorSelected: string;
  inputOptionColorDisabled: string;
  inputShadow: string;
  inputShadowFocus: string;
  inputShadowHover: string;
  inputShadowDisabled: string;
  // Select body
  selectBodyBgDefault: [TColor, false];
  selectBodyBgOpacity: [TOpacity, false];
  selectBodyBgOpacityHover: [TOpacity, false];
  selectBodyBgOpacityFocus: [TOpacity, false];
  selectBodyBgOpacityDisabled: [TOpacity, false];
  selectBodyBgShade: [TShade, false];
  selectBodyBgShadeHover: [TShade, false];
  selectBodyBgShadeFocus: [TShade, false];
  selectBodyBgShadeDisabled: [TShade, false];
  selectBodyColorOpacity: [TOpacity, false];
  selectBodyColorOpacityHover: [TOpacity, false];
  selectBodyColorOpacityFocus: [TOpacity, false];
  selectBodyColorOpacityDisabled: [TOpacity, false];
  selectBodyColorShade: [TShade, false];
  selectBodyColorShadeHover: [TShade, false];
  selectBodyColorShadeFocus: [TShade, false];
  selectBodyColorShadeDisabled: [TShade, false];
  selectBodyShadow: string;
  selectBodyShadowHover: string;
  selectBodyShadowFocus: string;
  selectBodyShadowDisabled: string;
  inputDropdownShadow: string;
  inputDropdownBackdropFilter: string;
  buttonShadow: string;
  buttonShadowFocus: string;
  buttonShadowHover: string;
  buttonShadowDisabled: string;
  buttonBgDefault: [TColor, false];
  buttonSpecialBg1: [TColor, false];
  buttonSpecialBg2: [TColor, false];
  buttonSpecialColor: [TColor, false];
  buttonColorOpacity: [TOpacity, false];
  buttonColorOpacityHover: [TOpacity, false];
  buttonColorOpacityFocus: [TOpacity, false];
  buttonColorOpacityDisabled: [TOpacity, false];
  buttonColorShade: [TShade, false];
  buttonColorShadeHover: [TShade, false];
  buttonColorShadeFocus: [TShade, false];
  buttonColorShadeDisabled: [TShade, false];
  buttonBgOpacity: [TOpacity, false];
  buttonBgOpacityHover: [TOpacity, false];
  buttonBgOpacityFocus: [TOpacity, false];
  buttonBgOpacityDisabled: [TOpacity, false];
  buttonBgShade: [TShade, false];
  buttonBgShadeHover: [TShade, false];
  buttonBgShadeFocus: [TShade, false];
  buttonBgShadeDisabled: [TShade, false];
  // Toggle
  toggleBgShade: [TShade, false];
  toggleBgOpacity: [TOpacity, false];
  toggleBgOpacityFocus: [TOpacity, false];
  toggleBgOpacityDisabled: [TOpacity, false];
  toggleEnabledBgShade: [TShade, false];
  toggleEnabledBgOpacity: [TOpacity, false];
  toggleEnabledBgOpacityFocus: [TOpacity, false];
  toggleEnabledBgOpacityDisabled: [TOpacity, false];
  toggleColorShade: [TShade, false];
  toggleColorOpacity: [TOpacity, false];
  toggleEnabledColorShade: [TShade, false];
  toggleEnabledColorOpacity: [TOpacity, false];
}>;

export type TThemeTagsChapter = TThemeVarsChapter<{
  tagBackdropFilter: string;
  tagBackdropFilterHover: string;
  tagShadowNano: string;
  tagShadowNanoHover: string;
  tagShadowSmall: string;
  tagShadowSmallHover: string;
  tagShadowRegular: string;
  tagShadowRegularHover: string;
  tagShadowLarge: string;
  tagShadowLargeHover: string;
  tagTextWeightNano: string;
  tagTextWeightSmall: string;
  tagTextWeightRegular: string;
  tagTextWeightLarge: string;
}>;

export type TThemeMessageChapter = TThemeVarsChapter<{
  messageBackdropFilterPrimary: string;
  messageBackdropFilterSecondary: string;
  messageTextWeightNano: string;
  messageTextWeightSmall: string;
  messageTextWeightRegular: string;
  messageTextWeightLarge: string;
}>;

export type TThemeTableChapter = TThemeVarsChapter<{
  mainTableBackdrop: string;
  mainTableBgColor: string;
  mainTableHeaderBackdrop: string;
  mainTableHeaderBg: string;
  mainTableHeaderColor: string;
  mainTableLineOpacity: string;
  mainTableLineOpacityCompleted: string;
  mainTableLineOpacityFrozen: string;
  mainTableLineOpacityHover: string;
  mainTableLineOpacityFocus: string;
  mainTableLineOpacityActive: string;
  mainTableLineOpacityMergeCandidate: string;
  mainTableLineBackdropFilter: string;
  mainTableLineBackdropFilterFrozen: string;
  mainTableLineBackdropFilterCompleted: string;
  mainTableLineBackdropFilterHover: string;
  mainTableLineBackdropFilterFocus: string;
  mainTableLineBackdropFilterActive: string;
  mainTableLineBackdropFilterMergeCandidate: string;
  mainTableLineBackdropOpacity: string;
  mainTableLineBackdropOpacityFrozen: string;
  mainTableLineBackdropOpacityCompleted: string;
  mainTableLineBackdropOpacityHover: string;
  mainTableLineBackdropOpacityFocus: string;
  mainTableLineBackdropOpacityActive: string;
  mainTableLineBackdropOpacityMergeCandidate: string;
  mainTableLineBackdropBg: string;
  mainTableLineBackdropBgFrozen: string;
  mainTableLineBackdropBgCompleted: string;
  mainTableLineBackdropBgHover: string;
  mainTableLineBackdropBgFocus: string;
  mainTableLineBackdropBgActive: string;
  mainTableLineBackdropBgMergeCandidate: string;
  mainTableLineBackdropBorderColor: string;
  mainTableLineBackdropBorderColorFrozen: string;
  mainTableLineBackdropBorderColorCompleted: string;
  mainTableLineBackdropBorderColorHover: string;
  mainTableLineBackdropBorderColorFocus: string;
  mainTableLineBackdropBorderColorActive: string;
  mainTableLineBackdropBorderColorMergeCandidate: string;
  mainTableLineColor: string;
  mainTableLineColorFrozen: string;
  mainTableLineColorCompleted: string;
  mainTableLineColorHover: string;
  mainTableLineColorFocus: string;
  mainTableLineColorActive: string;
  mainTableLineColorMergeCandidate: string;
  mainTableLineCellBg: string;
  mainTableLineCellBgHover: string;
  mainTableLineCellBgFocus: string;
  mainTableLineCellBorderStyle: string;
  mainTableLineCellBorderColor: string;
  mainTableLineCellBorderColorCompleted: string;
  mainTableLineCellBorderColorFrozen: string;
  mainTableLineCellBorderColorHover: string;
  mainTableLineCellBorderColorFocus: string;
  mainTableLineCellBorderColorActive: string;
  mainTableLineCellBorderColorMergeCandidate: string;
  mainTableCharacterSelectorBg: string;
  mainTableCharacterSelectorBgHover: string;
  mainTableCharacterSelectorBgFocus: string;
  mainTableCharacterSelectorOptionBg: string;
  mainTableCharacterSelectorOptionColor: string;
  mainTableCharacterSelectorOptionBgActive: string;
  mainTableCharacterSelectorOptionColorActive: string;
  mainTableCharacterSelectorScrollbarThumbColor: string;
  mainTableCharacterSelectorScrollbarTrackColor: string;
}>;

export type TThemeTablesChapter = TThemeVarsChapter<{
  tableBg: string;
  tableHeaderBg: string;
  tableHeaderColor: string;
  tableBorderColor: string;
  taleCellBg: string;
  tableCellColor: string;
}>;

export type TThemeControlPanelChapter = TThemeVarsChapter<{
  controlPanelBg: string;
  controlPanelBackdrop: string;
  controlPanelBorderStyle: string;
  controlsPanelBorderColor: string;
  controlPanelShadow: string;
}>;

export type TThemeWaveformsChapter = TThemeVarsChapter<{
  waveformBackdropFilter: string;
  waveformBlockBg: string;
  waveformBlockBgHover: string;
  waveformBlockBgActive: string;
  waveformBlockBgActiveHover: string;
  waveformBlockBorderColor: string;
  waveformBlockBorderColorHover: string;
  waveformBlockBorderColorActive: string;
  waveformBlockBorderColorActiveHover: string;
  waveformCursorColor: string;
  waveformColor: [string, false];
}>;

export type TThemeVideoPlayerChapter = TThemeVarsChapter<{
  videoPlayerSubtitleBg: string;
  videoPlayerSubtitleColor: string;
  videoPlayerSubtitleBackdropFilter: string;
  videoPlayerOverlayBg: string;
  videoPlayerOverlayTextBg: string;
  videoPlayerOverlayTextColor: string;
}>;

export type TThemeFormsChapter = TThemeVarsChapter<{
  formRowBg: string;
  formRowBorderColor: string;
  formSectionBg: string;
  formSectionBorderColor: string;
}>;

export type TThemeTooltipChapter = TThemeVarsChapter<{
  tooltipBg: string;
  tooltipBackdropFilter: string;
  tooltipColor: string;
  tooltipArrowColor: string;
}>;

export type TThemeEmojiPickerChapter = TThemeVarsChapter<{
  emojiPickerBg: string;
  emojiPickerBorderColor: string;
  emojiPickerCategoryFontColor: string;
  emojiPickerIndicatorColor: string;
  emojiPickerInputBorderColor: string;
  emojiPickerInputFontColor: string;
  emojiPickerInputPlaceholderColor: string;
  emojiPickerOutlineColor: string;
  emojiPickerButtonHoverBg: string;
  emojiPickerButtonActiveBg: string;
}>;

export type TThemeListItemChapter = TThemeVarsChapter<{
  listItemBgShade: [TShade, false];
  listItemBgOpacity: [TOpacity, false];
  listItemBgShadeHover: [TShade, false];
  listItemBgOpacityHover: [TOpacity, false];
  listItemBgShadeFocus: [TShade, false];
  listItemBgOpacityFocus: [TOpacity, false];
  listItemBgShadeActive: [TShade, false];
  listItemBgOpacityActive: [TOpacity, false];
  listItemBgShadeActiveHover: [TShade, false];
  listItemBgOpacityActiveHover: [TOpacity, false];
  listItemBgShadeFocused: [TShade, false];
  listItemBgOpacityFocused: [TOpacity, false];
  listItemBgShadeDisabled: [TShade, false];
  listItemBgOpacityDisabled: [TOpacity, false];
  listItemColorShade: [TShade, false];
  listItemColorOpacity: [TOpacity, false];
  listItemColorShadeHover: [TShade, false];
  listItemColorOpacityHover: [TOpacity, false];
  listItemColorShadeFocus: [TShade, false];
  listItemColorOpacityFocus: [TOpacity, false];
  listItemColorShadeActive: [TShade, false];
  listItemColorOpacityActive: [TOpacity, false];
  listItemColorShadeActiveHover: [TShade, false];
  listItemColorOpacityActiveHover: [TOpacity, false];
  listItemColorShadeFocused: [TShade, false];
  listItemColorOpacityFocused: [TOpacity, false];
  listItemColorShadeDisabled: [TShade, false];
  listItemColorOpacityDisabled: [TOpacity, false];
}>;

export type TThemeVarsTheme = TThemeAppChapter &
  TThemeAppInputsChapter &
  TThemeAppWindowsChapter &
  TThemeMessageChapter &
  TThemeTableChapter &
  TThemeTagsChapter &
  TThemeWaveformsChapter &
  TThemeVideoPlayerChapter &
  TThemeControlPanelChapter &
  TThemeTablesChapter &
  TThemeFormsChapter &
  TThemeTooltipChapter &
  TThemeEmojiPickerChapter &
  TThemeListItemChapter;
