import i18n from '@src/i18n';
import { modal } from '@src/services/modal';
import { toast } from '@src/services/toast';
import { makeFileProcessingFailedMessage } from '@src/services/menu/toasts';
import { confirmDeletePromptTemplate } from './dialogs/deleteContext/deletePromptTemplateConfirmation';
import { confirmDeleteGlossary } from './dialogs/deleteGlossary/deleteGlossaryConfirmation';
import { ai } from '@src/services/ai';
import { projects, type TProjectEntry } from '@src/services/project';
import { promptTemplates } from '@src/services/prompt';
import { Service } from '@src/services/Service';
import { glossaries } from '@src/services/glossary';
import { settings } from '@src/services/settings';
import { folder } from '@src/services/folder';
import { toErrorMessage } from '@src/utils/toErrorMessage';
import {
  menuRenamingStopped,
  selectIsCreatingGlossary,
  selectIsCreatingPromptTemplate,
  selectMenuRenamingKey,
  setIsCreatingGlossary,
  setIsCreatingPromptTemplate,
  setMenuRenamingKey,
} from './slice';

// The menu service's operations: keyboard navigation across all menu items, rename, and opening,
// creating and deleting projects, prompt templates and glossaries from the menu. They read their
// own state with Service.select(localSelector), not the facade: index.ts builds the facade from this file,
// so importing it here would be a cycle.

const t = i18n.getFixedT(null, 'messages');
const tErrors = i18n.getFixedT(null, 'errors');

// Stable keys for the "+"/Create buttons -- these participate in the same combined focus/
// navigation tracking as real rows (see MainMenu keyboard navigation), so FileList.tsx registers
// them with these exact keys.
export const CREATE_PROJECT_KEY = '##create-project##';
export const CREATE_PROMPT_TEMPLATE_KEY = '##create-prompt-template##';
export const CREATE_GLOSSARY_KEY = '##create-glossary##';
// Same idea, for the Settings button in MenuLogo.tsx -- sits outside FileList's rows but still
// participates in the same combined focus/navigation tracking.
export const SETTINGS_KEY = '##settings##';

type TMenuItemKind =
  | 'project'
  | 'promptTemplate'
  | 'glossary'
  | 'createProject'
  | 'createPromptTemplate'
  | 'createGlossary'
  | 'settings';

type TMenuItemRef = { key: string; kind: TMenuItemKind };

const isBusy = (): boolean => folder.get.isBusy() || ai.get.isBusy();

// ── Items and focus ──────────────────────────────────────────────────────────

// The menu item elements by key. DOM elements aren't store state, so they live here, next to the
// operations that focus them. `el === null` removes the item.
const itemElements = new Map<string, HTMLElement>();

export function registerMenuItem(key: string, el: HTMLElement | null): void {
  if (el === null) itemElements.delete(key);
  else itemElements.set(key, el);
}

// The navigable items in display order. Cheap to recompute from the store on every call, so it
// isn't kept as state. Each section's Create button sits in its header, so it comes before the
// section's items.
function getCombinedItems(): TMenuItemRef[] {
  const items: TMenuItemRef[] = [{ key: SETTINGS_KEY, kind: 'settings' }];
  // Archived projects aren't listed, but the section (and its Create button) stays while any
  // project exists, so the archive remains reachable
  if (projects.get.list().length > 0) {
    items.push({ key: CREATE_PROJECT_KEY, kind: 'createProject' });
  }
  items.push(
    ...projects.get.visibleList().map((p) => ({ key: p.filePath, kind: 'project' as const }))
  );
  if (settings.get.integrationIsConfigured()) {
    if (!Service.select(selectIsCreatingPromptTemplate)) {
      items.push({ key: CREATE_PROMPT_TEMPLATE_KEY, kind: 'createPromptTemplate' });
    }
    items.push(
      ...promptTemplates.get.items().map((c) => ({
        key: c.fileName,
        kind: 'promptTemplate' as const,
      }))
    );
    if (!Service.select(selectIsCreatingGlossary)) {
      items.push({ key: CREATE_GLOSSARY_KEY, kind: 'createGlossary' });
    }
    items.push(
      ...glossaries.get.items().map((g) => ({ key: g.fileName, kind: 'glossary' as const }))
    );
  }
  return items;
}

export function focusMenuItem(key: string): void {
  const el = itemElements.get(key);
  if (!el) return;
  el.focus();
  el.scrollIntoView({ block: 'nearest' });
}

// Resolved live from document.activeElement rather than tracked as state -- correct at the moment
// it's called regardless of *how* focus got to a menu item.
function getFocusedItem(): TMenuItemRef | null {
  const active = document.activeElement;
  if (!active) return null;
  return getCombinedItems().find((item) => itemElements.get(item.key) === active) ?? null;
}

export function moveMenuFocus(direction: 'up' | 'down'): void {
  const combinedItems = getCombinedItems();
  if (combinedItems.length === 0) return;
  const focused = getFocusedItem();
  if (focused == null) {
    focusMenuItem(combinedItems[0].key);
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
  focusMenuItem(combinedItems[targetIndex].key);
}

// Which key should receive focus if `key` is removed from the combined list -- the next item,
// falling back to the previous one, or null if `key` was the only item left.
function getNeighborKey(key: string): string | null {
  const combinedItems = getCombinedItems();
  const index = combinedItems.findIndex((item) => item.key === key);
  if (index === -1) return null;
  if (index + 1 < combinedItems.length) return combinedItems[index + 1].key;
  return index > 0 ? combinedItems[index - 1].key : null;
}

// After a delete: the neighbour when the item went, or the item itself when it was kept. A frame
// later, once the list has re-rendered. The neighbour is looked up before deleting, while the item
// is still listed.
async function deleteAndRefocus(key: string, remove: () => Promise<boolean>): Promise<void> {
  const neighborKey = getNeighborKey(key);
  const deleted = await remove();
  const target = deleted ? neighborKey : key;
  if (target != null) requestAnimationFrame(() => focusMenuItem(target));
}

// ── Rename and create ────────────────────────────────────────────────────────

export function startRenaming(key: string): void {
  Service.dispatch(setMenuRenamingKey(key));
}

export function stopRenaming(key: string): void {
  Service.dispatch(menuRenamingStopped(key));
}

export function renameFocusedItem(): void {
  const focused = getFocusedItem();
  if (focused == null || Service.select(selectMenuRenamingKey) === focused.key) return;
  // "Create" buttons and Settings have nothing to rename.
  if (
    focused.kind === 'createProject' ||
    focused.kind === 'createPromptTemplate' ||
    focused.kind === 'createGlossary' ||
    focused.kind === 'settings'
  )
    return;
  startRenaming(focused.key);
}

export function cancelCreatingPromptTemplate(): void {
  Service.dispatch(setIsCreatingPromptTemplate(false));
  // The Create button remounts (it's conditionally rendered) once the flag flips false, so wait a
  // frame before it can actually receive focus.
  requestAnimationFrame(() => focusMenuItem(CREATE_PROMPT_TEMPLATE_KEY));
}

export function cancelCreatingGlossary(): void {
  Service.dispatch(setIsCreatingGlossary(false));
  requestAnimationFrame(() => focusMenuItem(CREATE_GLOSSARY_KEY));
}

// ── Open ─────────────────────────────────────────────────────────────────────

type TOverlayKind = 'promptTemplate' | 'glossary' | 'settings' | 'export' | 'archive';

// Overlays are exclusive: each owner keeps its own open state, and the menu, as the caller, closes
// the others before opening one.
function closeOverlays(except?: TOverlayKind): void {
  if (except !== 'promptTemplate') promptTemplates.closeEditor();
  if (except !== 'glossary') glossaries.closeEditor();
  if (except !== 'settings') settings.close();
  if (except !== 'export') settings.closeExport();
  if (except !== 'archive') projects.closeArchive();
}

// Saves whichever editor is open. Runs right before opening something, so no minimum lifetime
// here: it would be added on top of the opening loader's own one.
async function saveOpenEditors(): Promise<void> {
  await promptTemplates.saveAndClose({ minLifeTime: 0 });
  await glossaries.saveAndClose({ minLifeTime: 0 });
}

export async function openProject(project: TProjectEntry): Promise<void> {
  if (project.projectId === projects.get.id() || isBusy()) return;
  await saveOpenEditors();
  closeOverlays();
  await projects.open(project);
}

/** Opens the Archive overlay, closing the others like any overlay */
export async function openArchive(): Promise<void> {
  if (isBusy()) return;
  await saveOpenEditors();
  closeOverlays('archive');
  projects.openArchive();
}

export async function openPromptTemplate(fileName: string, title: string): Promise<void> {
  if (isBusy()) return;
  if (promptTemplates.get.current() === fileName) return;
  await saveOpenEditors();
  closeOverlays('promptTemplate');
  await modal.load(
    { messages: [t('promptTemplate.loadingLabel', { title })] },
    promptTemplates.openEditor(fileName) as Promise<unknown>
  );
}

export async function openGlossary(fileName: string, title: string): Promise<void> {
  if (isBusy()) return;
  if (glossaries.get.current() === fileName) return;
  await saveOpenEditors();
  closeOverlays('glossary');
  await modal.load(
    { messages: [t('glossary.loadingLabel', { title })] },
    glossaries.openEditor(fileName) as Promise<unknown>
  );
}

// ── Rename and create ────────────────────────────────────────────────────────

type TMenuFileKind = 'project' | 'promptTemplate' | 'glossary';

async function commitTitle(kind: TMenuFileKind, fileName: string | null, title: string) {
  if (kind === 'project') {
    const project = projects.get.list().find((p) => p.fileName === fileName);
    if (!project) throw new Error(tErrors('fileList.projectNotFound'));
    await projects.rename(project.projectId, title);
  } else if (kind === 'promptTemplate') {
    if (fileName) {
      await promptTemplates.rename(fileName, title);
    } else {
      await promptTemplates.create(title);
      Service.dispatch(setIsCreatingPromptTemplate(false));
    }
  } else if (fileName) {
    await glossaries.rename(fileName, title);
  } else {
    await glossaries.create(title);
    Service.dispatch(setIsCreatingGlossary(false));
  }
}

/** Renames a menu item's file, or creates one when `fileName` is null (prompt templates and
 * glossaries), behind a loader. A failure is reported with a toast and rethrown, so the item can
 * show it inline. */
export async function commitMenuItemTitle(
  kind: TMenuFileKind,
  fileName: string | null,
  title: string
): Promise<void> {
  const label =
    fileName === null ? t('mainMenuListItem.creatingNewFile') : t('mainMenuListItem.renamingFile');
  try {
    await modal.load({ messages: [label] }, commitTitle(kind, fileName, title));
  } catch (e) {
    toast.push(
      makeFileProcessingFailedMessage(
        e instanceof Error ? e.message : tErrors('mainMenuListItem.unreachableCommitError')
      )
    );
    throw e;
  }
}

export function startNewProject(): void {
  void projects.startNew();
}

export function openFocusedItem(): void {
  // Enter/Space while a row's rename input has focus must only commit the rename (via ListItem's
  // own onKeyDown), not also open the item.
  if (Service.select(selectMenuRenamingKey) != null) return;
  const focusedItem = getFocusedItem();
  if (isBusy() || !focusedItem) return;
  const { key, kind } = focusedItem;
  switch (kind) {
    case 'settings':
      closeOverlays('settings');
      settings.open();
      break;
    case 'createProject':
      startNewProject();
      break;
    case 'createPromptTemplate':
      Service.dispatch(setIsCreatingPromptTemplate(true));
      break;
    case 'createGlossary':
      Service.dispatch(setIsCreatingGlossary(true));
      break;
    case 'project': {
      const project = projects.get.list().find((p) => p.filePath === key);
      if (project) void openProject(project);
      break;
    }
    case 'promptTemplate': {
      const item = promptTemplates.get.items().find((c) => c.fileName === key);
      if (item) void openPromptTemplate(item.fileName, item.title);
      break;
    }
    case 'glossary': {
      const item = glossaries.get.items().find((g) => g.fileName === key);
      if (item) void openGlossary(item.fileName, item.title);
      break;
    }
  }
}

// ── Delete ───────────────────────────────────────────────────────────────────

export function deleteProject(project: TProjectEntry): Promise<void> {
  return deleteAndRefocus(project.filePath, () =>
    projects.delete(project.projectId, project.projectName)
  );
}

/** Moves a project to the archive, then focuses its neighbour, as deleting does. A failure is
 * reported with a toast. */
export function archiveProject(project: TProjectEntry): Promise<void> {
  return deleteAndRefocus(project.filePath, async () => {
    try {
      await projects.archive(project.projectId);
      return true;
    } catch (e) {
      toast.push(makeFileProcessingFailedMessage(toErrorMessage(e)));
      return false;
    }
  });
}

export function deletePromptTemplate(fileName: string, title: string): Promise<void> {
  return deleteAndRefocus(fileName, async () => {
    if (!(await confirmDeletePromptTemplate(title))) return false;
    closeOverlays();
    await promptTemplates.delete(fileName);
    return true;
  });
}

export function deleteGlossary(fileName: string, title: string): Promise<void> {
  return deleteAndRefocus(fileName, async () => {
    if (!(await confirmDeleteGlossary(title))) return false;
    closeOverlays();
    await glossaries.delete(fileName);
    return true;
  });
}

export function deleteFocusedItem(): void {
  const focusedItem = getFocusedItem();
  if (isBusy() || !focusedItem) return;
  const { key, kind } = focusedItem;
  if (kind === 'project') {
    const project = projects.get.list().find((p) => p.filePath === key);
    if (project) void deleteProject(project);
  } else if (kind === 'promptTemplate') {
    const item = promptTemplates.get.items().find((c) => c.fileName === key);
    if (item) void deletePromptTemplate(item.fileName, item.title);
  } else if (kind === 'glossary') {
    const item = glossaries.get.items().find((g) => g.fileName === key);
    if (item) void deleteGlossary(item.fileName, item.title);
  }
  // create* kinds and Settings: nothing to delete.
}
