import {
  TThemeStaticOpacitiesChapter,
  TThemeStaticBlurChapter,
  TThemeStaticControlPanelTypeChapter,
  TThemeStaticEmojiPickerChapter,
  TThemeStaticFontsChapter,
  TThemeStaticFormsChapter,
  TThemeStaticInputsChapter,
  TThemeStaticListItemChapter,
  TThemeStaticMarkChapter,
  TThemeStaticMessageChapter,
  TThemeStaticScreenChapter,
  TThemeStaticSizesChapter,
  TThemeStaticTableChapter,
  TThemeStaticTablesChapter,
  TThemeStaticTagsChapter,
  TThemeStaticTextChapter,
  TThemeStaticTooltipChapter,
  TThemeStaticVideoPlayerTypeChapter,
  TThemeStaticWaveformsChapter,
  TThemeStaticWeightsChapter,
  TThemeStaticWindowsChapter,
  TThemeStaticVars,
} from './types/static';
import { TOpacity } from './definitions';
import { CSSVar } from './utils';
import { ThemeVariable } from './ThemeVariable';

export const allOpacities: TOpacity[] = [
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
];
const getOpacityVars: () => TThemeStaticOpacitiesChapter = () =>
  allOpacities.reduce(
    (acc, opacity) => ({
      ...acc,
      ...new ThemeVariable(`opacity-${opacity}` as `opacity-${TOpacity}`, opacity / 100).register(),
    }),
    {}
  ) as unknown as TThemeStaticOpacitiesChapter;
const opacities = getOpacityVars();

const sizeValues = {
  size1: '1px',
  size2: '2px',
  size4: '4px',
  size6: '6px',
  size10: '10px',
  size12: '12px',
  size14: '14px',
  size16: '16px',
  size18: '18px',
  size24: '24px',
  size34: '34px',
  size56: '56px',
  size92: '92px',
};

const weightValues = {
  black: 900,
  bold: 700,
  light: 300,
  extralight: 100,
  regular: 400,
  semibold: 600,
};

// Prepended to every font stack below -- scoped via unicode-range (see fonts.css) to emoji/flag
// code points only, so it never affects normal text rendering, just fills in flag glyphs that
// Windows' default emoji font doesn't ship. "Belarus Flag Override" goes first: it only defines a
// ligature for the BY flag sequence, so it overrides just that one flag before Twemoji Mozilla
// handles everything else.
const emojiFontFallback = `"Belarus Flag Override", "Twemoji Mozilla", `;

const fonts: TThemeStaticFontsChapter = {
  ...new ThemeVariable(
    'fontHeadingSansSerif',
    `${emojiFontFallback}"Sofia Sans", "Arial", sans-serif`
  ).register(),
  ...new ThemeVariable(
    'fontHeadingSerif',
    `${emojiFontFallback}"Source Serif 4", "Times New Roman", serif`
  ).register(),
  ...new ThemeVariable(
    'fontTextSansSerif',
    `${emojiFontFallback}"Noto Sans", "Arial", sans-serif`
  ).register(),
  ...new ThemeVariable(
    'fontTextSerif',
    `${emojiFontFallback}"Source Serif 4", "Times New Roman", serif`
  ).register(),
  ...new ThemeVariable(
    'fontMonospace',
    `${emojiFontFallback}"Noto Sans Mono", monospace`
  ).register(),
};

const sizes: TThemeStaticSizesChapter = {
  ...new ThemeVariable('size1', sizeValues.size1).register(),
  ...new ThemeVariable('size2', sizeValues.size2).register(),
  ...new ThemeVariable('size4', sizeValues.size4).register(),
  ...new ThemeVariable('size6', sizeValues.size6).register(),
  ...new ThemeVariable('size10', sizeValues.size10).register(),
  ...new ThemeVariable('size12', sizeValues.size12).register(),
  ...new ThemeVariable('size14', sizeValues.size14).register(),
  ...new ThemeVariable('size16', sizeValues.size14).register(),
  ...new ThemeVariable('size18', sizeValues.size18).register(),
  ...new ThemeVariable('size24', sizeValues.size24).register(),
  ...new ThemeVariable('size34', sizeValues.size34).register(),
  ...new ThemeVariable('size56', sizeValues.size56).register(),
  ...new ThemeVariable('size92', sizeValues.size92).register(),
};

const weights: TThemeStaticWeightsChapter = {
  ...new ThemeVariable('black', weightValues.black).register(),
  ...new ThemeVariable('bold', weightValues.bold).register(),
  ...new ThemeVariable('light', weightValues.light).register(),
  ...new ThemeVariable('extralight', weightValues.extralight).register(),
  ...new ThemeVariable('regular', weightValues.regular).register(),
  ...new ThemeVariable('semibold', weightValues.semibold).register(),
};

const text: TThemeStaticTextChapter = {
  ...new ThemeVariable('sizeH1', sizeValues.size92).register(),
  ...new ThemeVariable('weightH1', weightValues.black).register(),
  ...new ThemeVariable('sizeH2', sizeValues.size56).register(),
  ...new ThemeVariable('weightH2', weightValues.black).register(),
  ...new ThemeVariable('sizeH3', sizeValues.size34).register(),
  ...new ThemeVariable('weightH3', weightValues.regular).register(),
  ...new ThemeVariable('sizeH4', sizeValues.size18).register(),
  ...new ThemeVariable('weightH4', weightValues.regular).register(),
  ...new ThemeVariable('sizeH5', sizeValues.size16).register(),
  ...new ThemeVariable('weightH5', weightValues.semibold).register(),
  ...new ThemeVariable('sizeH6', sizeValues.size14).register(),
  ...new ThemeVariable('weightH6', weightValues.semibold).register(),
  ...new ThemeVariable('sizeTextLarge', sizeValues.size18).register(),
  ...new ThemeVariable('weightTextLarge', weightValues.regular).register(),
  ...new ThemeVariable('sizeTextNano', sizeValues.size10).register(),
  ...new ThemeVariable('weightTextNano', weightValues.light).register(),
  ...new ThemeVariable('sizeTextRegular', sizeValues.size14).register(),
  ...new ThemeVariable('weightTextRegular', weightValues.light).register(),
  ...new ThemeVariable('sizeTextSmall', sizeValues.size12).register(),
  ...new ThemeVariable('weightTextSmall', weightValues.semibold).register(),
};

const blur: TThemeStaticBlurChapter = {
  ...new ThemeVariable('blurExtreme', sizeValues.size24).register(),
  ...new ThemeVariable('blurHeavy', sizeValues.size18).register(),
  ...new ThemeVariable('blurLight', sizeValues.size10).register(),
  ...new ThemeVariable('blurRegular', sizeValues.size4).register(),
};

const screen: TThemeStaticScreenChapter = {
  ...new ThemeVariable('appScreenHorizontalSpacing', CSSVar('size2')).register(),
  ...new ThemeVariable('appScreenWidth', `920px`).register(),
  ...new ThemeVariable('appScrollbarWidth', CSSVar('size2')).register(),
  ...new ThemeVariable('appScrollbarBorderRadius', CSSVar('inputBorderRadius')).register(),
};

const message: TThemeStaticMessageChapter = {
  ...new ThemeVariable('messageSpacingNanoX', CSSVar('size6')).register(),
  ...new ThemeVariable('messageSpacingNanoY', CSSVar('size4')).register(),
  ...new ThemeVariable('messageSpacingSmallX', CSSVar('size12')).register(),
  ...new ThemeVariable('messageSpacingSmallY', CSSVar('size6')).register(),
  ...new ThemeVariable('messageSpacingRegularX', CSSVar('size14')).register(),
  ...new ThemeVariable('messageSpacingRegularY', CSSVar('size12')).register(),
  ...new ThemeVariable('messageSpacingLargeX', CSSVar('size18')).register(),
  ...new ThemeVariable('messageSpacingLargeY', CSSVar('size14')).register(),
  ...new ThemeVariable('messageBorderRadiusLarge', CSSVar('size4')).register(),
  ...new ThemeVariable('messageBorderRadiusRegular', CSSVar('size4')).register(),
  ...new ThemeVariable('messageBorderRadiusSmall', CSSVar('size4')).register(),
  ...new ThemeVariable('messageBorderRadiusNano', CSSVar('size2')).register(),
  ...new ThemeVariable('messageBorderWidthPrimary', CSSVar('size1')).register(),
  ...new ThemeVariable('messageBorderWidthSecondary', CSSVar('size1')).register(),
  ...new ThemeVariable('messageTextSizeLarge', CSSVar('sizeTextLarge')).register(),
  ...new ThemeVariable('messageTextSizeRegular', CSSVar('sizeTextRegular')).register(),
  ...new ThemeVariable('messageTextSizeSmall', CSSVar('sizeTextSmall')).register(),
  ...new ThemeVariable('messageTextSizeNano', CSSVar('sizeTextNano')).register(),
};

const waveforms: TThemeStaticWaveformsChapter = {
  ...new ThemeVariable('waveformHeight', sizeValues.size56).register(),
  ...new ThemeVariable('waveformSpacingY', CSSVar('size4')).register(),
  ...new ThemeVariable('waveformSpacingX', CSSVar('size4')).register(),
};

const windows: TThemeStaticWindowsChapter = {
  ...new ThemeVariable('windowBorderRadius', CSSVar('size12')).register(),
  ...new ThemeVariable('windowBorderWidth', CSSVar('size1')).register(),
  ...new ThemeVariable('windowSpacingX', CSSVar('size2')).register(),
  ...new ThemeVariable('windowSpacingY', CSSVar('size2')).register(),
  ...new ThemeVariable('windowSpacingInnerX', CSSVar('size14')).register(),
  ...new ThemeVariable('windowSpacingInnerY', CSSVar('size12')).register(),
};

const inputs: TThemeStaticInputsChapter = {
  ...new ThemeVariable('inputHeightLarge', CSSVar('size56')).register(),
  ...new ThemeVariable('inputHeightRegular', CSSVar('size34')).register(),
  ...new ThemeVariable('inputHeightSmall', CSSVar('size18')).register(),
  ...new ThemeVariable('inputHeightNano', CSSVar('size14')).register(),
  ...new ThemeVariable('inputTextSizeLarge', CSSVar('sizeTextLarge')).register(),
  ...new ThemeVariable('inputTextSizeRegular', CSSVar('sizeTextRegular')).register(),
  ...new ThemeVariable('inputTextSizeSmall', CSSVar('sizeTextSmall')).register(),
  ...new ThemeVariable('inputTextSizeNano', CSSVar('sizeTextNano')).register(),

  ...new ThemeVariable('inputSpacingXLarge', CSSVar('size14')).register(),
  ...new ThemeVariable('inputSpacingXInnerLarge', CSSVar('size12')).register(),
  ...new ThemeVariable('inputSpacingXLargeIconic', CSSVar('size10')).register(),
  ...new ThemeVariable('inputSpacingYLarge', '0').register(),
  ...new ThemeVariable('inputSpacingYInnerLarge', CSSVar('size12')).register(),

  ...new ThemeVariable('inputSpacingXRegular', CSSVar('size10')).register(),
  ...new ThemeVariable('inputSpacingXInnerRegular', CSSVar('size6')).register(),
  ...new ThemeVariable('inputSpacingXRegularIconic', CSSVar('size6')).register(),
  ...new ThemeVariable('inputSpacingYRegular', '0').register(),
  ...new ThemeVariable('inputSpacingYInnerRegular', CSSVar('size10')).register(),

  ...new ThemeVariable('inputSpacingXSmall', CSSVar('size12')).register(),
  ...new ThemeVariable('inputSpacingXInnerSmall', CSSVar('size4')).register(),
  ...new ThemeVariable('inputSpacingXSmallIconic', CSSVar('size4')).register(),
  ...new ThemeVariable('inputSpacingYSmall', '0').register(),
  ...new ThemeVariable('inputSpacingYInnerSmall', CSSVar('size4')).register(),

  ...new ThemeVariable('inputSpacingXNano', CSSVar('size4')).register(),
  ...new ThemeVariable('inputSpacingXInnerNano', CSSVar('size2')).register(),
  ...new ThemeVariable('inputSpacingXNanoIconic', CSSVar('size2')).register(),
  ...new ThemeVariable('inputSpacingYNano', '0').register(),
  ...new ThemeVariable('inputSpacingYInnerNano', CSSVar('size2')).register(),

  ...new ThemeVariable('inputBorderWidth', CSSVar('size1')).register(),
  ...new ThemeVariable('inputBorderWidthFocus', CSSVar('size1')).register(),
  ...new ThemeVariable('inputBorderWidthHover', CSSVar('size1')).register(),
  ...new ThemeVariable('inputBorderWidthDisabled', CSSVar('size1')).register(),
  ...new ThemeVariable('inputBorderRadius', CSSVar('size4')).register(),
  ...new ThemeVariable('inputOptionBorderRadius', CSSVar('inputBorderRadius')).register(),
  ...new ThemeVariable('inputOptionSpacingX', CSSVar('inputSpacingXRegular')).register(),
  ...new ThemeVariable('inputOptionSpacingY', CSSVar('inputSpacingYRegular')).register(),
  ...new ThemeVariable('inputOptionTextSize', CSSVar('inputTextSizeRegular')).register(),
  ...new ThemeVariable('inputOptionHeight', CSSVar('size6')).register(),
  ...new ThemeVariable('inputDropdownBorderRadius', CSSVar('inputBorderRadius')).register(),
  ...new ThemeVariable('inputDropdownSpacingInner', CSSVar('size4')).register(),
  ...new ThemeVariable('inputOpacity', CSSVar('opacity-100')).register(),
  ...new ThemeVariable('inputOpacityDisabled', CSSVar('opacity-20')).register(),
  ...new ThemeVariable('inputBorderWidthFocus', CSSVar('size1')),

  ...new ThemeVariable('buttonHeightLarge', CSSVar('size56')).register(),
  ...new ThemeVariable('buttonHeightRegular', CSSVar('size34')).register(),
  ...new ThemeVariable('buttonHeightSmall', CSSVar('size24')).register(),
  ...new ThemeVariable('buttonHeightNano', CSSVar('size18')).register(),

  ...new ThemeVariable('toggleTrackWidth', CSSVar('size34')).register(),
  ...new ThemeVariable('toggleTrackHeight', CSSVar('inputHeightSmall')).register(),
  ...new ThemeVariable('toggleKnobInset', CSSVar('size4')).register(),
  ...new ThemeVariable('toggleScaleEmphasis', '1.08').register(),
};

const table: TThemeStaticTableChapter = {
  ...new ThemeVariable('mainTableWidth', '986px').register(),
  ...new ThemeVariable('mainTableTextSize', CSSVar('sizeTextRegular')).register(),
  ...new ThemeVariable('mainTableLineBackdropRadius', CSSVar('size4')).register(),
  ...new ThemeVariable('mainTableLineCellSpacingX', CSSVar('size14')).register(),
  ...new ThemeVariable('mainTableLineCellSpacingY', CSSVar('size14')).register(),
  ...new ThemeVariable('mainTableLineBackdropSpacingX', CSSVar('size4')).register(),
  ...new ThemeVariable('mainTableLineBackdropSpacingY', CSSVar('size4')).register(),
  ...new ThemeVariable('mainTableLineBackdropBorderWidth', CSSVar('size1')).register(),
  ...new ThemeVariable('mainTableLineCellSpacingInnerX', CSSVar('size1')).register(),
  ...new ThemeVariable('mainTableLineCellBorderWidth', CSSVar('size1')).register(),
  ...new ThemeVariable(
    'mainTableLineCellBorderWidthCompleted',
    CSSVar('mainTableLineCellBorderWidth')
  ).register(),
  ...new ThemeVariable(
    'mainTableLineCellBorderWidthHover',
    CSSVar('mainTableLineCellBorderWidth')
  ).register(),
  ...new ThemeVariable(
    'mainTableLineCellBorderWidthFocus',
    CSSVar('mainTableLineCellBorderWidth')
  ).register(),
  ...new ThemeVariable(
    'mainTableLineCellBorderWidthActive',
    CSSVar('mainTableLineCellBorderWidth')
  ).register(),
  ...new ThemeVariable(
    'mainTableLineCellBorderWidthMergeCandidate',
    CSSVar('mainTableLineCellBorderWidth')
  ).register(),
  ...new ThemeVariable('mainTableCharacterSelectorSpacingInnerX', CSSVar('size4')).register(),
  ...new ThemeVariable('mainTableCharacterSelectorSpacingInnerY', CSSVar('size4')).register(),
  ...new ThemeVariable('mainTableCharacterSelectorSpacingX', '0').register(),
  ...new ThemeVariable(
    'mainTableCharacterSelectorSpacingY',
    CSSVar('mainTableLineCellSpacingY')
  ).register(),
  ...new ThemeVariable('mainTableCharacterSelectorScrollbarWidth', CSSVar('size2')).register(),
  ...new ThemeVariable(
    'mainTableCharacterSelectorScrollbarBorderRadius',
    CSSVar('inputBorderRadius')
  ).register(),
};

const tags: TThemeStaticTagsChapter = {
  ...new ThemeVariable('tagBorderRadiusRegular', CSSVar('size4')).register(),
  ...new ThemeVariable('tagBorderRadiusLarge', CSSVar('tagBorderRadiusRegular')).register(),
  ...new ThemeVariable('tagBorderRadiusNano', CSSVar('tagBorderRadiusRegular')).register(),
  ...new ThemeVariable('tagBorderRadiusSmall', CSSVar('tagBorderRadiusRegular')).register(),
  ...new ThemeVariable('tagSpacingLargeX', CSSVar('size12')).register(),
  ...new ThemeVariable('tagSpacingLargeY', CSSVar('size10')).register(),
  ...new ThemeVariable('tagSpacingRegularX', CSSVar('size10')).register(),
  ...new ThemeVariable('tagSpacingRegularY', CSSVar('size4')).register(),
  ...new ThemeVariable('tagSpacingSmallX', CSSVar('size4')).register(),
  ...new ThemeVariable('tagSpacingSmallY', CSSVar('size4')).register(),
  ...new ThemeVariable('tagSpacingNanoX', CSSVar('size2')).register(),
  ...new ThemeVariable('tagSpacingNanoY', CSSVar('size1')).register(),
  ...new ThemeVariable('tagTextSizeLarge', CSSVar('sizeTextLarge')).register(),
  ...new ThemeVariable('tagTextSizeRegular', CSSVar('sizeTextRegular')).register(),
  ...new ThemeVariable('tagTextSizeSmall', CSSVar('sizeTextSmall')).register(),
  ...new ThemeVariable('tagTextSizeNano', CSSVar('sizeTextNano')).register(),
};

const player: TThemeStaticVideoPlayerTypeChapter = {
  ...new ThemeVariable('videoPlayerSubtitleMaxHeight', `min(90%, 420px)`).register(),
  ...new ThemeVariable('videoPlayerSpacingX', CSSVar('size10')).register(),
  ...new ThemeVariable('videoPlayerSpacingY', CSSVar('size10')).register(),
  ...new ThemeVariable('videoPlayerSpacingInnerX', CSSVar('size4')).register(),
  ...new ThemeVariable('videoPlayerSpacingInnerY', CSSVar('size4')).register(),
  ...new ThemeVariable('videoPlayerBorderRadius', '0').register(),
  ...new ThemeVariable('videoPlayerSubtitlesSpacingX', CSSVar('size4')).register(),
  ...new ThemeVariable('videoPlayerSubtitlesSpacingY', CSSVar('size4')).register(),
  ...new ThemeVariable('videoPlayerSubtitlesBorderRadius', CSSVar('size4')).register(),
  ...new ThemeVariable('videoPlayerSubtitlesTextSize', CSSVar('sizeTextRegular')).register(),
};

const controlPanel: TThemeStaticControlPanelTypeChapter = {
  ...new ThemeVariable('controlPanelOffset', CSSVar('size10')).register(),
  ...new ThemeVariable('controlPanelBorderWidth', '0').register(),
  ...new ThemeVariable('controlPanelBorderRadius', CSSVar('size4')).register(),
  ...new ThemeVariable('controlPanelSpacingX', CSSVar('size2')).register(),
  ...new ThemeVariable('controlPanelSpacingY', CSSVar('size2')).register(),
};

const tables: TThemeStaticTablesChapter = {
  ...new ThemeVariable('tableBorderRadius', CSSVar('size4')).register(),
  ...new ThemeVariable('tableBorderWidth', CSSVar('size1')).register(),
  ...new ThemeVariable('tableCellBorderRadius', CSSVar('size2')).register(),
  ...new ThemeVariable('tableCellBorderWidth', CSSVar('size1')).register(),
  ...new ThemeVariable('tableCellSpacingX', CSSVar('size2')).register(),
  ...new ThemeVariable('tableCellSpacingY', CSSVar('size2')).register(),
};

const forms: TThemeStaticFormsChapter = {
  ...new ThemeVariable('formSpacingX', CSSVar('size12')).register(),
  ...new ThemeVariable('formSpacingY', CSSVar('size12')).register(),
  ...new ThemeVariable('formSpacingInnerX', CSSVar('size10')).register(),
  ...new ThemeVariable('formSpacingInnerY', CSSVar('size18')).register(),
  ...new ThemeVariable('formRowSpacingX', '0').register(),
  ...new ThemeVariable('formRowSpacingY', '0').register(),
  ...new ThemeVariable('formRowSpacingInner', CSSVar('size4')).register(),
  ...new ThemeVariable('formSectionSpacingX', '0').register(),
  ...new ThemeVariable('formSectionSpacingY', '0').register(),
  ...new ThemeVariable('formSectionSpacingInner', CSSVar('size6')).register(),
  ...new ThemeVariable('formSectionBorderWidth', CSSVar('size1')).register(),
  ...new ThemeVariable('fromRowBorderWidth', '0').register(),
  ...new ThemeVariable('fromBorderRadius', '0').register(),
  ...new ThemeVariable('fromRowBorderRadius', '0').register(),
  ...new ThemeVariable('formSectionBorderRadius', CSSVar('size4')).register(),
  ...new ThemeVariable('formSectionEntrySpacingX', CSSVar('size6')).register(),
  ...new ThemeVariable('formSectionEntrySpacingY', CSSVar('size6')).register(),
  ...new ThemeVariable('formSectionEntrySpacingInner', CSSVar('size6')).register(),
};

const tooltip: TThemeStaticTooltipChapter = {
  ...new ThemeVariable('tooltipSpacingX', CSSVar('size4')).register(),
  ...new ThemeVariable('tooltipSpacingY', CSSVar('size4')).register(),
  ...new ThemeVariable('tooltipSpacingInnerX', CSSVar('size4')).register(),
  ...new ThemeVariable('tooltipSpacingInnerY', CSSVar('size4')).register(),
  ...new ThemeVariable('tooltipBorderRadius', CSSVar('size4')).register(),
  ...new ThemeVariable('tooltipFontSize', CSSVar('inputTextSizeSmall')).register(),
  ...new ThemeVariable('tooltipTitleFontSize', CSSVar('inputTextSizeSmall')).register(),
};

const emojiPicker: TThemeStaticEmojiPickerChapter = {
  ...new ThemeVariable('emojiPickerWidth', '320px').register(),
  ...new ThemeVariable('emojiPickerHeight', '400px').register(),
  ...new ThemeVariable('emojiPickerFontFamily', CSSVar('fontTextSansSerif')).register(),
  ...new ThemeVariable('emojiPickerBorderRadius', CSSVar('size4')).register(),
  ...new ThemeVariable('emojiPickerBorderSize', CSSVar('size1')).register(),
  ...new ThemeVariable('emojiPickerCategoryFontSize', CSSVar('sizeTextSmall')).register(),
  ...new ThemeVariable('emojiPickerEmojiSize', CSSVar('size18')).register(),
  ...new ThemeVariable('emojiPickerTotalEmojiSize', CSSVar('size24')).register(),
  ...new ThemeVariable('emojiPickerEmojiPadding', CSSVar('size4')).register(),
  ...new ThemeVariable('emojiPickerIndicatorHeight', CSSVar('size1')).register(),
  ...new ThemeVariable('emojiPickerInputBorderRadius', '0').register(),
  ...new ThemeVariable('emojiPickerInputBorderSize', '0').register(),
  ...new ThemeVariable('emojiPickerInputFontSize', CSSVar('sizeTextSmall')).register(),
  ...new ThemeVariable('emojiPickerInputLineHeight', '1.5').register(),
  ...new ThemeVariable('emojiPickerInputPadding', CSSVar('size6')).register(),
  ...new ThemeVariable('emojiPickerNumColumns', 9).register(),
  ...new ThemeVariable('emojiPickerOutlineSize', '0').register(),
  ...new ThemeVariable('emojiPickerSkintoneBorderRadius', CSSVar('size18')).register(),
};

const mark: TThemeStaticMarkChapter = {
  ...new ThemeVariable('markBorderRadius', CSSVar('size2')).register(),
  ...new ThemeVariable('markUnderlineWidth', CSSVar('size2')).register(),
};

const listItem: TThemeStaticListItemChapter = {
  ...new ThemeVariable('listItemHeight', 'auto').register(),
  ...new ThemeVariable('listItemBorderRadius', CSSVar('size2')).register(),
  ...new ThemeVariable('listItemSpacingX', CSSVar('size2')).register(),
  ...new ThemeVariable('listItemSpacingY', CSSVar('size2')).register(),
  ...new ThemeVariable('listItemSpacingInnerX', CSSVar('size4')).register(),
  ...new ThemeVariable('listItemTextSize', CSSVar('sizeTextRegular')).register(),
  ...new ThemeVariable('projectListSpacingX', CSSVar('size4')).register(),
  ...new ThemeVariable('projectListSpacingY', CSSVar('size4')).register(),
  ...new ThemeVariable('projectListSpacingInnerY', sizeValues.size2).register(),
};

export const staticVars: TThemeStaticVars = {
  ...opacities,
  ...sizes,
  ...weights,
  ...blur,
  ...fonts,
  ...text,
  ...screen,
  ...message,
  ...waveforms,
  ...windows,
  ...inputs,
  ...table,
  ...tags,
  ...player,
  ...controlPanel,
  ...tables,
  ...forms,
  ...tooltip,
  ...emojiPicker,
  ...listItem,
  ...mark,
};
