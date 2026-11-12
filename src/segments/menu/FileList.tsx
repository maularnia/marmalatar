import {
  CREATE_GLOSSARY_KEY,
  CREATE_PROJECT_KEY,
  CREATE_PROMPT_TEMPLATE_KEY,
  menu,
} from '@src/services/menu';
import { toGlossaryFileName, toProjectFileName, toPromptTemplateFileName } from '@bridge/fileNames';
import { settings } from '@src/services/settings';
import { projects } from '@src/services/project';
import type { TColor } from '@src/theme/definitions';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import { promptTemplates } from '@src/services/prompt';
import { glossaries } from '@src/services/glossary';
import { ai } from '@src/services/ai';
import { folder } from '@src/services/folder';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import Hr, { THrVariant } from '@ui-toolkit/Hr/Hr';
import { TIcon } from '@ui-toolkit/Icon/icons';
import classNames from 'classnames';
import { AnimatePresence } from 'motion/react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import Tooltip, { TooltipSimple } from '@ui-toolkit/Tooltip';
import { ListHeader } from './ListHeader';
import { MainMenuListItem } from './MainMenuListItem';
import { makeNameValidator, useMenuRename } from './useMenuRename';

// Keys of the rows where a new prompt template's / glossary's name is typed
const NEW_PROMPT_TEMPLATE_KEY = '##new-prompt-template##';
const NEW_GLOSSARY_KEY = '##new-glossary##';

type TMenuFileKind = 'project' | 'promptTemplate' | 'glossary';

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('projectListSpacingY')};
  width: 100%;
  padding: ${CSSVar('projectListSpacingY')} ${CSSVar('projectListSpacingX')};
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('projectListSpacingInnerY')};
  width: 100%;
`;

type TFileListProps = {
  /** Whether the sidebar is collapsed. MainMenu derives it from the menu's compact state:
   * collapsing is immediate, expanding waits for the backdrop's animation, so full titles and
   * actions don't spill out of a sidebar that's still narrow. Everything here follows this prop,
   * never the store's compact state. */
  compact: boolean;
};

export default function FileList({ compact }: TFileListProps) {
  const { t: tMenu } = useTranslation('menu');
  const [
    folderPath,
    projectList,
    visibleProjectList,
    hasArchivedProjects,
    currentProjectId,
    promptTemplateItems,
    currentPromptTemplate,
    glossaryItems,
    currentGlossary,
    workingFolderIsBusy,
    translationIsBusy,
    integrationIsConfigured,
    isCreatingPromptTemplate,
    isCreatingGlossary,
    renamingKey,
  ] = useAppSelectors(
    folder.selectPath,
    projects.selectList,
    projects.selectVisibleList,
    projects.selectHasArchived,
    projects.selectId,
    promptTemplates.selectItems,
    promptTemplates.selectCurrent,
    glossaries.selectItems,
    glossaries.selectCurrent,
    folder.selectIsBusy,
    ai.selectIsBusy,
    settings.selectIntegrationIsConfigured,
    menu.selectIsCreatingPromptTemplate,
    menu.selectIsCreatingGlossary,
    menu.selectRenamingKey
  );
  const listIsDisabled = workingFolderIsBusy || translationIsBusy;

  const setCreateProjectRef = useCallback(
    (el: HTMLButtonElement | null) => menu.registerItem(CREATE_PROJECT_KEY, el),
    []
  );
  const setCreatePromptTemplateRef = useCallback(
    (el: HTMLButtonElement | null) => menu.registerItem(CREATE_PROMPT_TEMPLATE_KEY, el),
    []
  );
  const setCreateGlossaryRef = useCallback(
    (el: HTMLButtonElement | null) => menu.registerItem(CREATE_GLOSSARY_KEY, el),
    []
  );

  // A section's "+" in its header: icon only, with the label as tooltip
  const renderCreateButton = (
    ref: (el: HTMLButtonElement | null) => void,
    color: TColor,
    onClick: () => void
  ) => (
    <Tooltip label={<TooltipSimple>{tMenu('fileList.createButton')}</TooltipSimple>}>
      <Button
        ref={ref}
        type="button"
        size={TButtonSize.SMALL}
        variant={TButtonVariant.TRANSPARENT}
        color={color}
        icon={TIcon.PLUS}
        onClick={onClick}
      />
    </Tooltip>
  );

  const projectFileNames = useMemo(() => projectList.map((p) => p.fileName), [projectList]);
  const promptTemplateFileNames = useMemo(
    () => promptTemplateItems.map((c) => c.fileName),
    [promptTemplateItems]
  );
  const glossaryFileNames = useMemo(() => glossaryItems.map((g) => g.fileName), [glossaryItems]);

  // The rows in edit mode: the one being renamed, and a new file's row while its name is typed
  const editingKeys = [
    ...(renamingKey != null ? [renamingKey] : []),
    ...(isCreatingPromptTemplate ? [NEW_PROMPT_TEMPLATE_KEY] : []),
    ...(isCreatingGlossary ? [NEW_GLOSSARY_KEY] : []),
  ];
  const rename = useMenuRename(editingKeys);

  // A row's edit-mode props: whether it's edited, its typed name's validity, and committing it as
  // a rename (or, for a new file's row with `fileName` null, as the new file's title)
  const editing = ({
    kind,
    itemKey,
    fileName,
    title,
    existingFileNames,
    toFileName,
    cancel = () => menu.stopRenaming(itemKey),
  }: {
    kind: TMenuFileKind;
    itemKey: string;
    fileName: string | null;
    title: string;
    existingFileNames: string[];
    toFileName: (title: string) => string;
    cancel?: () => void;
  }) => ({
    isEditing: editingKeys.includes(itemKey),
    ...rename.row({
      itemKey,
      title,
      isValidName: makeNameValidator(fileName, existingFileNames, toFileName),
      commit: (name) => menu.commitItemTitle(kind, fileName, name),
      cancel,
    }),
  });

  if (
    !folderPath ||
    (projectList.length === 0 && promptTemplateItems.length === 0 && glossaryItems.length === 0)
  )
    return null;
  return (
    <>
      {projectList.length > 0 && (
        <>
          <Section>
            <ListHeader
              compact={compact}
              actionBar={
                <>
                  {/* Only while there's something archived */}
                  {hasArchivedProjects && (
                    <Tooltip label={<TooltipSimple>{tMenu('archive.openButton')}</TooltipSimple>}>
                      <Button
                        type="button"
                        size={TButtonSize.SMALL}
                        variant={TButtonVariant.TRANSPARENT}
                        icon={TIcon.ARCHIVE}
                        onClick={() => void menu.openArchive()}
                      />
                    </Tooltip>
                  )}
                  {renderCreateButton(
                    setCreateProjectRef,
                    ThemeColors.ACCENT1,
                    menu.startNewProject
                  )}
                </>
              }
            >
              {tMenu('fileList.projectsHeader')}
            </ListHeader>
            <List>
              {visibleProjectList.length
                ? visibleProjectList.map((project) => {
                    const isActive = project.projectId === currentProjectId;
                    return (
                      <MainMenuListItem
                        key={project.filePath}
                        itemKey={project.filePath}
                        title={project.projectName}
                        {...editing({
                          kind: 'project',
                          itemKey: project.filePath,
                          fileName: project.fileName,
                          title: project.projectName,
                          existingFileNames: projectFileNames,
                          toFileName: toProjectFileName,
                        })}
                        isActive={isActive}
                        isDisabled={listIsDisabled}
                        compact={compact}
                        color={isActive ? ThemeColors.ACCENT1 : ThemeColors.TEXT}
                        progress={project.translationProgress}
                        onArchive={() => void menu.archiveProject(project)}
                        emoji={project.emoji}
                        onEmojiSelect={(emoji) =>
                          void projects.updateEmoji(project.projectId, emoji)
                        }
                        onClick={() => void menu.openProject(project)}
                        onDelete={() => menu.deleteProject(project)}
                      />
                    );
                  })
                : null}
            </List>
          </Section>
          <Hr variant={THrVariant.DIMMED} />
        </>
      )}

      {integrationIsConfigured && (
        <>
          <Section>
            <ListHeader
              className={classNames({ compact })}
              compact={compact}
              actionBar={
                // Hidden while the new item's name is being typed
                !isCreatingPromptTemplate &&
                renderCreateButton(setCreatePromptTemplateRef, ThemeColors.ACCENT2, () =>
                  menu.setIsCreatingPromptTemplate(true)
                )
              }
            >
              {tMenu('fileList.promptTemplatesHeader')}
            </ListHeader>
            <List>
              {promptTemplateItems.length
                ? promptTemplateItems.map(({ fileName, title, emoji }) => {
                    const isActive = fileName === currentPromptTemplate;
                    return (
                      <MainMenuListItem
                        key={fileName}
                        itemKey={fileName}
                        title={title}
                        {...editing({
                          kind: 'promptTemplate',
                          itemKey: fileName,
                          fileName,
                          title,
                          existingFileNames: promptTemplateFileNames,
                          toFileName: toPromptTemplateFileName,
                        })}
                        isActive={isActive}
                        compact={compact}
                        isDisabled={listIsDisabled}
                        color={isActive ? ThemeColors.ACCENT1 : ThemeColors.TEXT}
                        emoji={emoji}
                        onEmojiSelect={(newEmoji) =>
                          void promptTemplates.updateEmoji(fileName, newEmoji)
                        }
                        onClick={() => void menu.openPromptTemplate(fileName, title)}
                        onDelete={() => menu.deletePromptTemplate(fileName, title)}
                      />
                    );
                  })
                : null}
              {isCreatingPromptTemplate && (
                <MainMenuListItem
                  key={NEW_PROMPT_TEMPLATE_KEY}
                  itemKey={NEW_PROMPT_TEMPLATE_KEY}
                  title=""
                  {...editing({
                    kind: 'promptTemplate',
                    itemKey: NEW_PROMPT_TEMPLATE_KEY,
                    fileName: null,
                    title: '',
                    existingFileNames: promptTemplateFileNames,
                    toFileName: toPromptTemplateFileName,
                    cancel: menu.cancelCreatingPromptTemplate,
                  })}
                />
              )}
            </List>
          </Section>

          <Hr variant={THrVariant.DIMMED} />

          <Section>
            <ListHeader
              className={classNames({ compact })}
              compact={compact}
              actionBar={
                // Hidden while the new item's name is being typed
                !isCreatingGlossary &&
                renderCreateButton(setCreateGlossaryRef, ThemeColors.ACCENT2, () =>
                  menu.setIsCreatingGlossary(true)
                )
              }
            >
              {tMenu('fileList.glossariesHeader')}
            </ListHeader>
            <List>
              <AnimatePresence>
                {glossaryItems.length
                  ? glossaryItems.map(({ fileName, title, emoji }) => {
                      const isActive = fileName === currentGlossary;
                      return (
                        <MainMenuListItem
                          key={fileName}
                          itemKey={fileName}
                          title={title}
                          {...editing({
                            kind: 'glossary',
                            itemKey: fileName,
                            fileName,
                            title,
                            existingFileNames: glossaryFileNames,
                            toFileName: toGlossaryFileName,
                          })}
                          compact={compact}
                          isActive={isActive}
                          isDisabled={listIsDisabled}
                          color={isActive ? ThemeColors.ACCENT1 : ThemeColors.TEXT}
                          emoji={emoji}
                          onEmojiSelect={(newEmoji) =>
                            void glossaries.updateEmoji(fileName, newEmoji)
                          }
                          onClick={() => void menu.openGlossary(fileName, title)}
                          onDelete={() => menu.deleteGlossary(fileName, title)}
                        />
                      );
                    })
                  : null}
              </AnimatePresence>
              {isCreatingGlossary && (
                <MainMenuListItem
                  key={NEW_GLOSSARY_KEY}
                  itemKey={NEW_GLOSSARY_KEY}
                  title=""
                  {...editing({
                    kind: 'glossary',
                    itemKey: NEW_GLOSSARY_KEY,
                    fileName: null,
                    title: '',
                    existingFileNames: glossaryFileNames,
                    toFileName: toGlossaryFileName,
                    cancel: menu.cancelCreatingGlossary,
                  })}
                />
              )}
            </List>
          </Section>
        </>
      )}
    </>
  );
}
