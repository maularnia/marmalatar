import { useInfoWindow } from '@providers/ConfirmationProvider/ConfirmationProvider';
import { useMenuRefs } from '@providers/MenuRefsProvider';
import { useDeleteContextConfirmation } from '@src/segments/dialogs/deleteContext/useDeleteContextConfirmation';
import { useDeleteGlossaryConfirmation } from '@src/segments/dialogs/deleteGlossary/useDeleteGlossaryConfirmation';
import { useDeleteProjectConfirmation } from '@src/segments/dialogs/deleteProject/useDeleteProjectConfirmation';
import { Loader } from '@src/segments/dialogs/Loader';
import { selectIntegrationIsConfigured } from '@src/store/slices/app';
import { providerNoop } from '@src/utils/noop';
import { useProjectLoader } from '@src/segments/menu/hooks/useProjectLoader';
import { useAppDispatch } from '@store/hooks';
import { fromCurrentStore } from '@store/store';
import {
  resetAiPromptEditor,
  selectCurrentGlossary,
  selectCurrentPromptTemplate,
} from '@store/slices/aiPromptEditor';
import { selectTranslationIsBusy } from '@store/slices/aiTranslation';
import {
  selectDiscIsBusy,
  selectGlossaryItems,
  selectProjects,
  selectPromptTemplateItems,
} from '@store/slices/disc';
import { closeOverlays, selectCurrentOverlay } from '@store/slices/overlays';
import { selectProjectId } from '@store/slices/project';
import {
  openAIGlossaryEditor,
  openPromptTemplateEditor,
  openSettingsOverlay,
  saveGlossary,
  savePromptTemplate,
  startNewProject,
} from '@store/thunks';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

type MenuItemKind =
  | 'project'
  | 'promptTemplate'
  | 'glossary'
  | 'createProject'
  | 'createPromptTemplate'
  | 'createGlossary'
  | 'settings';

// Stable keys for the "+"/Create buttons -- these participate in the same combined focus/
// navigation tracking as real rows (see MainMenu keyboard navigation), so FileList.tsx registers
// them with these exact keys.
export const CREATE_PROJECT_KEY = '##create-project##';
export const CREATE_PROMPT_TEMPLATE_KEY = '##create-prompt-template##';
export const CREATE_GLOSSARY_KEY = '##create-glossary##';
// Same idea, for the Settings button in MenuLogo.tsx -- sits outside FileList's rows but still
// participates in the same combined focus/navigation tracking.
export const SETTINGS_KEY = '##settings##';

type MenuItemRef = { key: string; kind: MenuItemKind };

type MenuActionsContextType = {
  renamingKey: string | null;
  isCreatingPromptTemplate: boolean;
  isCreatingGlossary: boolean;
  setIsCreatingPromptTemplate: (value: boolean) => void;
  setIsCreatingGlossary: (value: boolean) => void;
  handleCancelCreatingPromptTemplate: () => void;
  handleCancelCreatingGlossary: () => void;
  handleFocusMenuItem: (key: string) => void;
  handleMoveMenuFocus: (direction: 'up' | 'down') => void;
  handleStartRenaming: (key: string) => void;
  handleRenameFocusedItem: () => void;
  handleStopRenaming: (key: string) => void;
  handleOpenProject: (project: TProjectEntry, isActive: boolean) => Promise<void>;
  handleOpenPromptTemplate: (fileName: string, title: string) => Promise<void>;
  handleOpenGlossary: (fileName: string, title: string) => Promise<void>;
  handleStartNewProject: () => void;
  handleOpenFocusedItem: () => void;
  handleDeleteProject: (filePath: string, title: string, projectId: string) => Promise<void>;
  handleDeletePromptTemplate: (fileName: string, title: string) => Promise<void>;
  handleDeleteGlossary: (fileName: string, title: string) => Promise<void>;
  handleDeleteFocusedItem: () => void;
};

type TProjectEntry = ReturnType<typeof selectProjects>[number];

const noop = providerNoop('MenuActionsContext');

const MenuActionsContext = createContext<MenuActionsContextType>({
  renamingKey: null,
  isCreatingPromptTemplate: false,
  isCreatingGlossary: false,
  setIsCreatingPromptTemplate: noop,
  setIsCreatingGlossary: noop,
  handleCancelCreatingPromptTemplate: noop,
  handleCancelCreatingGlossary: noop,
  handleFocusMenuItem: noop,
  handleMoveMenuFocus: noop,
  handleStartRenaming: noop,
  handleRenameFocusedItem: noop,
  handleStopRenaming: noop,
  handleOpenProject: noop,
  handleOpenPromptTemplate: noop,
  handleOpenGlossary: noop,
  handleStartNewProject: noop,
  handleOpenFocusedItem: noop,
  handleDeleteProject: noop,
  handleDeletePromptTemplate: noop,
  handleDeleteGlossary: noop,
  handleDeleteFocusedItem: noop,
});

export function useMenuActions(): MenuActionsContextType {
  return useContext(MenuActionsContext);
}

export default function MenuActionsProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { itemRefs } = useMenuRefs();

  const { show: showLoading } = useInfoWindow(Loader);
  const { loadProject } = useProjectLoader();
  const { confirmDeleteContext } = useDeleteContextConfirmation();
  const { confirmDeleteGlossary } = useDeleteGlossaryConfirmation();
  const { confirmDeleteProject } = useDeleteProjectConfirmation();

  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [isCreatingPromptTemplate, setIsCreatingPromptTemplate] = useState(false);
  const [isCreatingGlossary, setIsCreatingGlossary] = useState(false);

  // Not exposed via context -- only feeds keyboard-navigation bookkeeping below, so it's cheap to
  // recompute fresh from the store on every call rather than keep it reactive. Only the two local
  // "creating" flags actually need to be closure deps -- they change which literal entries get
  // added, everything else is read fresh via fromCurrentStore() each time this runs.
  const getCombinedItems = useCallback((): MenuItemRef[] => {
    const projects = fromCurrentStore(selectProjects);
    const promptTemplateItems = fromCurrentStore(selectPromptTemplateItems);
    const glossaryItems = fromCurrentStore(selectGlossaryItems);
    const integrationIsConfigured = fromCurrentStore(selectIntegrationIsConfigured);
    const items: MenuItemRef[] = [
      { key: SETTINGS_KEY, kind: 'settings' },
      ...projects.map((p) => ({ key: p.filePath, kind: 'project' as const })),
    ];
    if (projects.length > 0) {
      items.push({ key: CREATE_PROJECT_KEY, kind: 'createProject' });
    }
    if (integrationIsConfigured) {
      items.push(
        ...promptTemplateItems.map((c) => ({ key: c.fileName, kind: 'promptTemplate' as const }))
      );
      if (!isCreatingPromptTemplate) {
        items.push({ key: CREATE_PROMPT_TEMPLATE_KEY, kind: 'createPromptTemplate' });
      }
      items.push(...glossaryItems.map((g) => ({ key: g.fileName, kind: 'glossary' as const })));
      if (!isCreatingGlossary) {
        items.push({ key: CREATE_GLOSSARY_KEY, kind: 'createGlossary' });
      }
    }
    return items;
  }, [isCreatingPromptTemplate, isCreatingGlossary]);

  const handleFocusMenuItem = useCallback(
    (key: string) => {
      const el = itemRefs.current.get(key);
      if (!el) return;
      el.focus();
      el.scrollIntoView({ block: 'nearest' });
    },
    [itemRefs]
  );

  // Live-resolved from document.activeElement (see the type comment) rather than tracked as
  // state -- correct at the moment it's called regardless of *how* focus got to a menu item.
  const getFocusedItem = useCallback((): MenuItemRef | null => {
    const active = document.activeElement;
    if (!active) return null;
    for (const item of getCombinedItems()) {
      if (itemRefs.current.get(item.key) === active) return item;
    }
    return null;
  }, [getCombinedItems, itemRefs]);

  const handleMoveMenuFocus = useCallback(
    (direction: 'up' | 'down') => {
      const combinedItems = getCombinedItems();
      if (combinedItems.length === 0) return;
      const focused = getFocusedItem();
      if (focused == null) {
        handleFocusMenuItem(combinedItems[0].key);
        return;
      }
      const currentIndex = combinedItems.findIndex((item) => item.key === focused.key);
      if (currentIndex === -1) return;
      const lastIndex = combinedItems.length - 1;
      // Cyclic: up from the first item wraps to the last, down from the last wraps to the first.
      const targetIndex =
        direction === 'up'
          ? currentIndex === 0
            ? lastIndex
            : currentIndex - 1
          : currentIndex === lastIndex
            ? 0
            : currentIndex + 1;
      handleFocusMenuItem(combinedItems[targetIndex].key);
    },
    [getCombinedItems, getFocusedItem, handleFocusMenuItem]
  );

  const handleCancelCreatingPromptTemplate = useCallback(() => {
    setIsCreatingPromptTemplate(false);
    // The Create button remounts (it's conditionally rendered) once isCreatingPromptTemplate
    // flips false, so wait a frame before it can actually receive focus.
    requestAnimationFrame(() => handleFocusMenuItem(CREATE_PROMPT_TEMPLATE_KEY));
  }, [handleFocusMenuItem]);

  const handleCancelCreatingGlossary = useCallback(() => {
    setIsCreatingGlossary(false);
    requestAnimationFrame(() => handleFocusMenuItem(CREATE_GLOSSARY_KEY));
  }, [handleFocusMenuItem]);

  // Which key should receive focus if `key` is removed from the combined list -- the next item,
  // falling back to the previous one, or null if `key` was the only item left.
  const getNeighborKey = useCallback(
    (key: string): string | null => {
      const combinedItems = getCombinedItems();
      const index = combinedItems.findIndex((item) => item.key === key);
      if (index === -1) return null;
      const hasNext = index + 1 < combinedItems.length;
      const hasPrev = index > 0;
      return hasNext ? combinedItems[index + 1].key : hasPrev ? combinedItems[index - 1].key : null;
    },
    [getCombinedItems]
  );

  const handleStartRenaming = useCallback((key: string) => {
    setRenamingKey(key);
  }, []);

  const handleRenameFocusedItem = useCallback(() => {
    const focused = getFocusedItem();
    if (focused == null || renamingKey === focused.key) return;
    // "Create" buttons and Settings have nothing to rename.
    if (
      focused.kind === 'createProject' ||
      focused.kind === 'createPromptTemplate' ||
      focused.kind === 'createGlossary' ||
      focused.kind === 'settings'
    )
      return;
    handleStartRenaming(focused.key);
  }, [getFocusedItem, renamingKey, handleStartRenaming]);

  const handleStopRenaming = useCallback((key: string) => {
    setRenamingKey((prev) => (prev === key ? null : prev));
  }, []);

  const saveCurrentIfNeeded = useCallback(async () => {
    const currentOverlay = fromCurrentStore(selectCurrentOverlay);
    const currentPromptTemplate = fromCurrentStore(selectCurrentPromptTemplate);
    const currentGlossary = fromCurrentStore(selectCurrentGlossary);
    if (currentOverlay === 'promptTemplate' && currentPromptTemplate) {
      const title =
        fromCurrentStore(selectPromptTemplateItems).find(
          (c) => c.fileName === currentPromptTemplate
        )?.title ?? '...';
      await showLoading(
        { message: `Saving prompt template ${title}...`, animate: false },
        dispatch(savePromptTemplate()) as Promise<unknown>
      );
    } else if (currentOverlay === 'glossary' && currentGlossary) {
      const title =
        fromCurrentStore(selectGlossaryItems).find((g) => g.fileName === currentGlossary)?.title ??
        '...';
      await showLoading(
        { message: `Saving glossary ${title}...`, animate: false },
        dispatch(saveGlossary()) as Promise<unknown>
      );
    }
  }, [showLoading, dispatch]);

  const handleOpenProject = useCallback(
    async (project: TProjectEntry, isActive: boolean) => {
      const isBusy =
        fromCurrentStore(selectDiscIsBusy) || fromCurrentStore(selectTranslationIsBusy);
      if (isActive || isBusy) return;
      await saveCurrentIfNeeded();
      dispatch(closeOverlays());
      dispatch(resetAiPromptEditor());
      void loadProject(project);
    },
    [saveCurrentIfNeeded, dispatch, loadProject]
  );

  const handleOpenPromptTemplate = useCallback(
    async (fileName: string, title: string) => {
      const isBusy =
        fromCurrentStore(selectDiscIsBusy) || fromCurrentStore(selectTranslationIsBusy);
      if (isBusy) return;
      if (
        fromCurrentStore(selectCurrentOverlay) === 'promptTemplate' &&
        fromCurrentStore(selectCurrentPromptTemplate) === fileName
      )
        return;
      await saveCurrentIfNeeded();
      await showLoading(
        { message: `Loading prompt template ${title}...` },
        dispatch(openPromptTemplateEditor(fileName)) as Promise<unknown>
      );
    },
    [saveCurrentIfNeeded, showLoading, dispatch]
  );

  const handleOpenGlossary = useCallback(
    async (fileName: string, title: string) => {
      const isBusy =
        fromCurrentStore(selectDiscIsBusy) || fromCurrentStore(selectTranslationIsBusy);
      if (isBusy) return;
      if (
        fromCurrentStore(selectCurrentOverlay) === 'glossary' &&
        fromCurrentStore(selectCurrentGlossary) === fileName
      )
        return;
      await saveCurrentIfNeeded();
      await showLoading(
        { message: `Loading glossary ${title}...` },
        dispatch(openAIGlossaryEditor(fileName)) as Promise<unknown>
      );
    },
    [saveCurrentIfNeeded, showLoading, dispatch]
  );

  const handleStartNewProject = useCallback(() => {
    if (fromCurrentStore(selectProjectId)) {
      // No confirmation -- the current project is saved to disk first, so this is non-destructive.
      // Editor refs (line-index-keyed input map, split cursor) are reset by EditorRefsProvider
      // itself, reacting to the projectId change this dispatch causes.
      void (async () => {
        await dispatch(startNewProject());
        navigate('/intro/import');
      })();
    } else {
      navigate('/intro/import');
    }
  }, [dispatch, navigate]);

  const handleOpenFocusedItem = useCallback(() => {
    // Enter/Space while a row's rename input has focus must only commit the rename (via
    // ListItem's own onKeyDown), not also open the item.
    if (renamingKey != null) return;
    const focusedItem = getFocusedItem();
    const isBusy = fromCurrentStore(selectDiscIsBusy) || fromCurrentStore(selectTranslationIsBusy);
    if (isBusy || !focusedItem) return;
    const { key, kind } = focusedItem;
    switch (kind) {
      case 'settings':
        dispatch(openSettingsOverlay());
        break;
      case 'createProject':
        handleStartNewProject();
        break;
      case 'createPromptTemplate':
        setIsCreatingPromptTemplate(true);
        break;
      case 'createGlossary':
        setIsCreatingGlossary(true);
        break;
      case 'project': {
        const project = fromCurrentStore(selectProjects).find((p) => p.filePath === key);
        if (!project) return;
        void handleOpenProject(
          project,
          project.project.projectId === fromCurrentStore(selectProjectId)
        );
        break;
      }
      case 'promptTemplate': {
        const item = fromCurrentStore(selectPromptTemplateItems).find((c) => c.fileName === key);
        if (!item) return;
        void handleOpenPromptTemplate(item.fileName, item.title);
        break;
      }
      case 'glossary': {
        const item = fromCurrentStore(selectGlossaryItems).find((g) => g.fileName === key);
        if (!item) return;
        void handleOpenGlossary(item.fileName, item.title);
        break;
      }
    }
  }, [
    renamingKey,
    getFocusedItem,
    dispatch,
    handleStartNewProject,
    handleOpenProject,
    handleOpenPromptTemplate,
    handleOpenGlossary,
  ]);

  const handleDeleteProject = useCallback(
    async (filePath: string, title: string, projectId: string) => {
      if (!(await confirmDeleteProject(filePath, title, projectId))) {
        // Dismissed -- focus goes back to the item that was under consideration.
        requestAnimationFrame(() => handleFocusMenuItem(filePath));
        return;
      }
      const neighborKey = getNeighborKey(filePath);
      if (neighborKey != null) {
        requestAnimationFrame(() => handleFocusMenuItem(neighborKey));
      }
    },
    [confirmDeleteProject, getNeighborKey, handleFocusMenuItem]
  );

  const handleDeletePromptTemplate = useCallback(
    async (fileName: string, title: string) => {
      if (!(await confirmDeleteContext(fileName, title))) {
        requestAnimationFrame(() => handleFocusMenuItem(fileName));
        return;
      }
      const neighborKey = getNeighborKey(fileName);
      if (neighborKey != null) {
        requestAnimationFrame(() => handleFocusMenuItem(neighborKey));
      }
    },
    [confirmDeleteContext, getNeighborKey, handleFocusMenuItem]
  );

  const handleDeleteGlossary = useCallback(
    async (fileName: string, title: string) => {
      if (!(await confirmDeleteGlossary(fileName, title))) {
        requestAnimationFrame(() => handleFocusMenuItem(fileName));
        return;
      }
      const neighborKey = getNeighborKey(fileName);
      if (neighborKey != null) {
        requestAnimationFrame(() => handleFocusMenuItem(neighborKey));
      }
    },
    [confirmDeleteGlossary, getNeighborKey, handleFocusMenuItem]
  );

  const handleDeleteFocusedItem = useCallback(() => {
    const focusedItem = getFocusedItem();
    const isBusy = fromCurrentStore(selectDiscIsBusy) || fromCurrentStore(selectTranslationIsBusy);
    if (isBusy || !focusedItem) return;
    const { key, kind } = focusedItem;
    if (kind === 'project') {
      const project = fromCurrentStore(selectProjects).find((p) => p.filePath === key);
      if (!project) return;
      void handleDeleteProject(
        project.filePath,
        project.project.projectName,
        project.project.projectId
      );
    } else if (kind === 'promptTemplate') {
      const item = fromCurrentStore(selectPromptTemplateItems).find((c) => c.fileName === key);
      if (!item) return;
      void handleDeletePromptTemplate(item.fileName, item.title);
    } else if (kind === 'glossary') {
      const item = fromCurrentStore(selectGlossaryItems).find((g) => g.fileName === key);
      if (!item) return;
      void handleDeleteGlossary(item.fileName, item.title);
    }
    // create* kinds: nothing to delete, no-op.
  }, [getFocusedItem, handleDeleteProject, handleDeletePromptTemplate, handleDeleteGlossary]);

  const value = useMemo<MenuActionsContextType>(
    () => ({
      renamingKey,
      isCreatingPromptTemplate,
      isCreatingGlossary,
      setIsCreatingPromptTemplate,
      setIsCreatingGlossary,
      handleCancelCreatingPromptTemplate,
      handleCancelCreatingGlossary,
      handleFocusMenuItem,
      handleMoveMenuFocus,
      handleStartRenaming,
      handleRenameFocusedItem,
      handleStopRenaming,
      handleOpenProject,
      handleOpenPromptTemplate,
      handleOpenGlossary,
      handleStartNewProject,
      handleOpenFocusedItem,
      handleDeleteProject,
      handleDeletePromptTemplate,
      handleDeleteGlossary,
      handleDeleteFocusedItem,
    }),
    [
      renamingKey,
      isCreatingPromptTemplate,
      isCreatingGlossary,
      handleCancelCreatingPromptTemplate,
      handleCancelCreatingGlossary,
      handleFocusMenuItem,
      handleMoveMenuFocus,
      handleStartRenaming,
      handleRenameFocusedItem,
      handleStopRenaming,
      handleOpenProject,
      handleOpenPromptTemplate,
      handleOpenGlossary,
      handleStartNewProject,
      handleOpenFocusedItem,
      handleDeleteProject,
      handleDeletePromptTemplate,
      handleDeleteGlossary,
      handleDeleteFocusedItem,
    ]
  );

  return <MenuActionsContext.Provider value={value}>{children}</MenuActionsContext.Provider>;
}
