import { IconSize, TIconSize, TIcon } from './icons';
import { FunctionComponent, HTMLProps, SVGProps, useEffect, useId, useRef } from 'react';
import iconTick from '@src/assets/icons/icon-tick.svg?react';
import iconArrowLeft from '@src/assets/icons/icon-arrow-left.svg?react';
import iconArrowRight from '@src/assets/icons/icon-arrow-right.svg?react';
import iconAi from '@src/assets/icons/icon-ai.svg?react';
import iconVideo from '@src/assets/icons/icon-video.svg?react';
import iconBin from '@src/assets/icons/icon-bin.svg?react';
import iconSync from '@src/assets/icons/icon-sync.svg?react';
import iconPerson from '@src/assets/icons/icon-person.svg?react';
import iconWave from '@src/assets/icons/icon-wave.svg?react';
import iconArrowStart from '@src/assets/icons/icon-arrow-start.svg?react';
import iconArrowEnd from '@src/assets/icons/icon-arrow-end.svg?react';
import iconScript from '@src/assets/icons/icon-script.svg?react';
import iconChatLeft from '@src/assets/icons/icon-chat-left.svg?react';
import iconChatRight from '@src/assets/icons/icon-chat-right.svg?react';
import iconMergeUp from '@src/assets/icons/icon-merge-up.svg?react';
import iconMergeDown from '@src/assets/icons/icon-merge-down.svg?react';
import iconForward from '@src/assets/icons/icon-forward.svg?react';
import iconBackward from '@src/assets/icons/icon-backward.svg?react';
import iconAddFile from '@src/assets/icons/icon-add-file.svg?react';
import iconUpload from '@src/assets/icons/icon-upload.svg?react';
import iconCC from '@src/assets/icons/icon-cc.svg?react';
import iconWWW from '@src/assets/icons/icon-www.svg?react';
import iconArrowCopyRight from '@src/assets/icons/icon-arrow-copy-right.svg?react';
import iconLoaderRunner from '@src/assets/icons/icon-loader-runner.svg?react';
import iconPanel from '@src/assets/icons/icon-panel.svg?react';
import iconHistoryBack from '@src/assets/icons/icon-history-back.svg?react';
import iconHistoryForward from '@src/assets/icons/icon-history-forward.svg?react';
import iconSettings from '@src/assets/icons/icon-settings.svg?react';
import iconExport from '@src/assets/icons/icon-export.svg?react';
import iconMerge from '@src/assets/icons/icon-merge.svg?react';
import iconRazor from '@src/assets/icons/icon-razor.svg?react';
import iconContext from '@src/assets/icons/icon-context.svg?react';
import iconSave from '@src/assets/icons/icon-save.svg?react';
import iconGlossary from '@src/assets/icons/icon-glossary.svg?react';
import iconInput from '@src/assets/icons/icon-input.svg?react';
import iconOutput from '@src/assets/icons/icon-output.svg?react';
import iconCross from '@src/assets/icons/icon-cross.svg?react';
import iconSettingsAi from '@src/assets/icons/icon-settings-ai.svg?react';
import iconThemeAuto from '@src/assets/icons/icon-theme-auto.svg?react';
import iconMoon from '@src/assets/icons/icon-moon.svg?react';
import iconSun from '@src/assets/icons/icon-sun.svg?react';
import iconPlus from '@src/assets/icons/icon-plus.svg?react';
import iconFile from '@src/assets/icons/icon-file.svg?react';
import iconBrush from '@src/assets/icons/icon-brush.svg?react';
import iconEdit from '@src/assets/icons/icon-edit.svg?react';
import iconTranslate from '@src/assets/icons/icon-translate.svg?react';
import iconLogo from '@src/assets/icons/icon-logo.svg?react';
import iconStep from '@src/assets/icons/icon-step.svg?react';
import iconSpacing from '@src/assets/icons/icon-spacing.svg?react';
import iconArrowToggleDown from '@src/assets/icons/icon-arrow-toggle-down.svg?react';
import iconArrowToggleUp from '@src/assets/icons/icon-arrow-toggle-up.svg?react';
import iconLanguage from '@src/assets/icons/icon-language.svg?react';
import iconUx from '@src/assets/icons/icon-ux.svg?react';
import iconColumns from '@src/assets/icons/icon-columns.svg?react';
import iconFolderFavorite from '@src/assets/icons/icon-folder-favorite.svg?react';
import iconRobot from '@src/assets/icons/icon-robot.svg?react';
import iconLineOut from '@src/assets/icons/icon-line-out.svg?react';
import iconAiFile from '@src/assets/icons/icon-ai-file.svg?react';
import iconAiEdit from '@src/assets/icons/icon-ai-edit.svg?react';
import iconTimeConfig from '@src/assets/icons/icon-time-config.svg?react';
import iconFormatCsv from '@src/assets/icons/icon-format-csv.svg?react';
import iconFormatJson from '@src/assets/icons/icon-format-json.svg?react';
import iconFormatSubtitle from '@src/assets/icons/icon-format-subtitle.svg?react';
import iconInsertBefore from '@src/assets/icons/icon-insert-before.svg?react';
import iconInsertAfter from '@src/assets/icons/icon-insert-after.svg?react';
import iconGauge from '@src/assets/icons/icon-gauge.svg?react';
import iconRefresh from '@src/assets/icons/icon-refresh.svg?react';
import iconStop from '@src/assets/icons/icon-stop.svg?react';
import iconColumns2 from '@src/assets/icons/icon-columns-2.svg?react';
import iconColumns3 from '@src/assets/icons/icon-columns-3.svg?react';
import iconLabel from '@src/assets/icons/icon-label.svg?react';
import iconVideoAbsent from '@src/assets/icons/icon-video-absent.svg?react';
import iconLanguageInterface from '@src/assets/icons/icon-language-interface.svg?react';
import iconPrompt from '@src/assets/icons/icon-prompt.svg?react';
import iconTerminal from '@src/assets/icons/icon-terminal.svg?react';
import iconCleanup from '@src/assets/icons/icon-cleanup.svg?react';
import iconDoubleRight from '@src/assets/icons/icon-double-right.svg?react';
import iconDoubleTick from '@src/assets/icons/icon-double-tick.svg?react';
import styled from 'styled-components';
import classNames from 'classnames';
import { createSpecialIconGradientFilter } from './utility';
import { TColorAccent, TColorCustom, TShade } from '@src/theme/definitions';
import { CSSColor } from '@src/theme/utils';

export enum TIconType {
  DEFAULT = 'default',
  SPECIAL = 'special',
}

type IconProps = {
  icon: TIcon;
  type?: TIconType;
  size?: TIconSize;
} & Omit<HTMLProps<HTMLDivElement>, 'size'>;

const ICON_COMPONENTS: {
  [key in TIcon]: FunctionComponent<
    SVGProps<SVGSVGElement> & {
      title?: string | undefined;
      titleId?: string | undefined;
      desc?: string | undefined;
      descId?: string | undefined;
    }
  >;
} = {
  [TIcon.TICK]: iconTick,
  [TIcon.AI]: iconAi,
  [TIcon.ARROW_END]: iconArrowEnd,
  [TIcon.ARROW_START]: iconArrowStart,
  [TIcon.BIN]: iconBin,
  [TIcon.PERSON]: iconPerson,
  [TIcon.SYNC]: iconSync,
  [TIcon.WAVE]: iconWave,
  [TIcon.ARROW_LEFT]: iconArrowLeft,
  [TIcon.ARROW_RIGHT]: iconArrowRight,
  [TIcon.SCRIPT]: iconScript,
  [TIcon.VIDEO]: iconVideo,
  [TIcon.CHAT_LEFT]: iconChatLeft,
  [TIcon.CHAT_RIGHT]: iconChatRight,
  [TIcon.MERGE_UP]: iconMergeUp,
  [TIcon.MERGE_DOWN]: iconMergeDown,
  [TIcon.FORWARD]: iconForward,
  [TIcon.BACKWARD]: iconBackward,
  [TIcon.ADD_FILE]: iconAddFile,
  [TIcon.UPLOAD]: iconUpload,
  [TIcon.CC]: iconCC,
  [TIcon.WWW]: iconWWW,
  [TIcon.ARROW_COPY_RIGHT]: iconArrowCopyRight,
  [TIcon.LOADER_RUNNER]: iconLoaderRunner,
  [TIcon.PANEL]: iconPanel,
  [TIcon.HISTORY_BACK]: iconHistoryBack,
  [TIcon.HISTORY_FORWARD]: iconHistoryForward,
  [TIcon.SETTINGS]: iconSettings,
  [TIcon.EXPORT]: iconExport,
  [TIcon.MERGE]: iconMerge,
  [TIcon.RAZOR]: iconRazor,
  [TIcon.CONTEXT]: iconContext,
  [TIcon.SAVE]: iconSave,
  [TIcon.GLOSSARY]: iconGlossary,
  [TIcon.INPUT]: iconInput,
  [TIcon.OUTPUT]: iconOutput,
  [TIcon.CROSS]: iconCross,
  [TIcon.SETTINGS_AI]: iconSettingsAi,
  [TIcon.THEME_AUTO]: iconThemeAuto,
  [TIcon.MOON]: iconMoon,
  [TIcon.SUN]: iconSun,
  [TIcon.PLUS]: iconPlus,
  [TIcon.FILE]: iconFile,
  [TIcon.BRUSH]: iconBrush,
  [TIcon.EDIT]: iconEdit,
  [TIcon.TRANSLATE]: iconTranslate,
  [TIcon.LOGO]: iconLogo,
  [TIcon.STEP]: iconStep,
  [TIcon.SPACING]: iconSpacing,
  [TIcon.ARROW_TOGGLE_DOWN]: iconArrowToggleDown,
  [TIcon.ARROW_TOGGLE_UP]: iconArrowToggleUp,
  [TIcon.LANGUAGE]: iconLanguage,
  [TIcon.UX]: iconUx,
  [TIcon.COLUMNS]: iconColumns,
  [TIcon.FOLDER_FAVORITE]: iconFolderFavorite,
  [TIcon.ROBOT]: iconRobot,
  [TIcon.LINE_OUT]: iconLineOut,
  [TIcon.AI_FILE]: iconAiFile,
  [TIcon.AI_EDIT]: iconAiEdit,
  [TIcon.TIME_CONFIG]: iconTimeConfig,
  [TIcon.FORMAT_CSV]: iconFormatCsv,
  [TIcon.FORMAT_JSON]: iconFormatJson,
  [TIcon.FORMAT_SUBTITLE]: iconFormatSubtitle,
  [TIcon.INSERT_BEFORE]: iconInsertBefore,
  [TIcon.INSERT_AFTER]: iconInsertAfter,
  [TIcon.GAUGE]: iconGauge,
  [TIcon.REFRESH]: iconRefresh,
  [TIcon.STOP]: iconStop,
  [TIcon.COLUMNS_2]: iconColumns2,
  [TIcon.COLUMNS_3]: iconColumns3,
  [TIcon.LABEL]: iconLabel,
  [TIcon.VIDEO_ABSENT]: iconVideoAbsent,
  [TIcon.LANGUAGE_INTERFACE]: iconLanguageInterface,
  [TIcon.PROMPT]: iconPrompt,
  [TIcon.TERMINAL]: iconTerminal,
  [TIcon.CLEANUP]: iconCleanup,
  [TIcon.DOUBLE_RIGHT]: iconDoubleRight,
  [TIcon.DOUBLE_TICK]: iconDoubleTick,
};

const Wrapper = styled.div`
  position: relative;
  display: inline-block;
  font-size: 0;
  line-height: 0;

  &.special {
    color: ${CSSColor(TColorCustom.ALICEBLUE, TShade.DEFAULT, 100)};
  }

  & > svg {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
`;

export default function Icon({
  icon,
  type = TIconType.DEFAULT,
  size = TIconSize.M,
  className,
  style,
  ...props
}: IconProps) {
  const Component = ICON_COMPONENTS[icon];
  const svgRef = useRef<SVGSVGElement>(null);
  const filterDefinitionsRef = useRef<SVGDefsElement | null>(null);
  const filterIdSuffix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const filterId = `icon-special-gradient-filter-${filterIdSuffix}`;
  const gradientId = `icon-special-gradient-${filterIdSuffix}`;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const shouldRenderSpecialFilter = type === TIconType.SPECIAL;
    const startColor = CSSColor(TColorAccent.ACCENT1, TShade.DEFAULT, 100);
    const endColor = CSSColor(TColorAccent.ACCENT2, TShade.DEFAULT, 100);

    if (filterDefinitionsRef.current && filterDefinitionsRef.current.parentNode === svg) {
      svg.removeChild(filterDefinitionsRef.current);
      filterDefinitionsRef.current = null;
    }

    if (!shouldRenderSpecialFilter) {
      svg.style.filter = '';
      return;
    }

    const defs = createSpecialIconGradientFilter({
      filterId,
      gradientId,
      startColor,
      endColor,
    });
    svg.appendChild(defs);

    filterDefinitionsRef.current = defs;
    svg.style.filter = `url(#${filterId})`;

    return () => {
      if (filterDefinitionsRef.current && filterDefinitionsRef.current.parentNode === svg) {
        svg.removeChild(filterDefinitionsRef.current);
      }
      filterDefinitionsRef.current = null;
      svg.style.filter = '';
    };
  }, [filterId, gradientId, type]);
  return (
    <Wrapper
      className={classNames({ [type]: type }, className)}
      style={{ ...style, width: IconSize[size], height: IconSize[size] }}
      {...props}
    >
      <Component ref={svgRef} width={IconSize[size] - 2} height={IconSize[size] - 2} />
    </Wrapper>
  );
}
