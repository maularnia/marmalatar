import {
  CREATE_GLOSSARY_KEY,
  CREATE_PROJECT_KEY,
  CREATE_PROMPT_TEMPLATE_KEY,
  useMenuActions,
} from '@providers/MenuActionsProvider';
import { toGlossaryFileName, toProjectFileName, toPromptTemplateFileName } from '@bridge/fileNames';
import { useMenuRefs } from '@providers/MenuRefsProvider';
import i18n from '@src/i18n';
import { settings } from '@src/store/slices/settings';
import { projects } from '@src/store/slices/project';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelector } from '@store/hooks';
import { promptTemplates } from '@src/services/prompt';
import { glossaries } from '@store/slices/glossary';
import { ai } from '@src/services/ai';
import { workingFolder } from '@store/slices/workingFolder';
import H from '@ui-toolkit/H';
import Hr, { THrVariant } from '@ui-toolkit/Hr/Hr';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { ListItem } from '@ui-toolkit/ListItem';
import classNames from 'classnames';
import { AnimatePresence } from 'motion/react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { MainMenuListItem } from './MainMenuListItem';
import { useMenuState } from '../../providers/MenuStateProvider';

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

const ListHeader = styled(H)`
  padding: ${CSSVar('size6')} ${CSSVar('size6')} 0;
`;

const ListHeaderText = styled.div`
  line-height: ${CSSVar('buttonHeightNano')};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const t = i18n.getFixedT(null, 'errors');

export default function FileList() {
  const { t: tMenu } = useTranslation('menu');
  const folder = useAppSelector(workingFolder.selectFolder);
  const projectList = useAppSelector(projects.selectList);
  const promptTemplateItems = useAppSelector(promptTemplates.selectItems);
  const glossaryItems = useAppSelector(glossaries.selectItems);
  const workingFolderIsBusy = useAppSelector(workingFolder.selectIsBusy);
  const translationIsBusy = useAppSelector(ai.selectIsBusy);
  const listIsDisabled = workingFolderIsBusy || translationIsBusy;
  const currentPromptTemplate = useAppSelector(promptTemplates.selectCurrent);
  const currentGlossary = useAppSelector(glossaries.selectCurrent);
  const { compact, dynamic } = useMenuState();
  const currentProjectId = useAppSelector(projects.selectId);
  const integrationIsConfigured = useAppSelector(settings.selectIntegrationIsConfigured);

  const {
    isCreatingPromptTemplate,
    handleSetIsCreatingPromptTemplate,
    isCreatingGlossary,
    handleSetIsCreatingGlossary,
    handleOpenProject,
    handleOpenPromptTemplate,
    handleOpenGlossary,
    handleStartNewProject,
    handleDeleteProject,
    handleDeletePromptTemplate,
    handleDeleteGlossary,
    handleCancelCreatingPromptTemplate,
    handleCancelCreatingGlossary,
  } = useMenuActions();
  const { registerMenuItemRef } = useMenuRefs();

  const setCreateProjectRef = useCallback(
    (el: HTMLDivElement | null) => registerMenuItemRef(CREATE_PROJECT_KEY, el),
    [registerMenuItemRef]
  );
  const setCreatePromptTemplateRef = useCallback(
    (el: HTMLDivElement | null) => registerMenuItemRef(CREATE_PROMPT_TEMPLATE_KEY, el),
    [registerMenuItemRef]
  );
  const setCreateGlossaryRef = useCallback(
    (el: HTMLDivElement | null) => registerMenuItemRef(CREATE_GLOSSARY_KEY, el),
    [registerMenuItemRef]
  );

  const projectFileNames = useMemo(() => projectList.map((p) => p.fileName), [projectList]);
  const promptTemplateFileNames = useMemo(
    () => promptTemplateItems.map((c) => c.fileName),
    [promptTemplateItems]
  );
  const glossaryFileNames = useMemo(() => glossaryItems.map((g) => g.fileName), [glossaryItems]);

  const handleCommitProject = async (fileName: string | null, newTitle: string) => {
    const project = projectList.find((p) => p.fileName === fileName);
    if (!project) throw new Error(t('fileList.projectNotFound'));
    await projects.rename(project.projectId, newTitle);
  };

  const handleCommitPromptTemplate = async (fileName: string | null, newTitle: string) => {
    if (fileName) {
      await promptTemplates.rename(fileName, newTitle);
    } else {
      await promptTemplates.create(newTitle);
      handleSetIsCreatingPromptTemplate(false);
    }
  };

  const handleCommitGlossary = async (fileName: string | null, newTitle: string) => {
    if (fileName) {
      await glossaries.rename(fileName, newTitle);
    } else {
      await glossaries.create(newTitle);
      handleSetIsCreatingGlossary(false);
    }
  };

  if (
    !folder ||
    (projectList.length === 0 && promptTemplateItems.length === 0 && glossaryItems.length === 0)
  )
    return null;
  return (
    <>
      {projectList.length > 0 && (
        <>
          <Section>
            {!dynamic && (
              <ListHeader className={classNames({ compact })} level={6}>
                <ListHeaderText>{tMenu('fileList.projectsHeader')}</ListHeaderText>
              </ListHeader>
            )}
            <List>
              {projectList.length
                ? projectList.map((project) => {
                    const isActive = project.projectId === currentProjectId;
                    return (
                      <MainMenuListItem
                        key={project.filePath}
                        itemKey={project.filePath}
                        fileName={project.fileName}
                        title={project.projectName}
                        isActive={isActive}
                        isDisabled={listIsDisabled}
                        compact={compact}
                        color={isActive ? ThemeColors.ACCENT1 : ThemeColors.TEXT}
                        progress={project.translationProgress}
                        toFileName={toProjectFileName}
                        existingFileNames={projectFileNames}
                        emoji={project.emoji}
                        onEmojiSelect={(emoji) =>
                          void projects.updateEmoji(project.projectId, emoji)
                        }
                        onClick={() => void handleOpenProject(project, isActive)}
                        onCommit={handleCommitProject}
                        onDelete={() =>
                          handleDeleteProject(
                            project.filePath,
                            project.projectName,
                            project.projectId
                          )
                        }
                      />
                    );
                  })
                : null}
              <ListItem
                ref={setCreateProjectRef}
                icon={TIcon.PLUS}
                compact={compact}
                color={ThemeColors.ACCENT1}
                onClick={handleStartNewProject}
              >
                {tMenu('fileList.createButton')}
              </ListItem>
            </List>
          </Section>
          <Hr variant={THrVariant.DIMMED} />
        </>
      )}

      {integrationIsConfigured && (
        <>
          <Section>
            {!dynamic && (
              <ListHeader className={classNames({ compact })} level={6}>
                <ListHeaderText>{tMenu('fileList.promptTemplatesHeader')}</ListHeaderText>
              </ListHeader>
            )}
            <List>
              {promptTemplateItems.length
                ? promptTemplateItems.map(({ fileName, title, emoji }) => {
                    const isActive = fileName === currentPromptTemplate;
                    return (
                      <MainMenuListItem
                        key={fileName}
                        itemKey={fileName}
                        fileName={fileName}
                        title={title}
                        isActive={isActive}
                        compact={compact}
                        isDisabled={listIsDisabled}
                        color={isActive ? ThemeColors.ACCENT1 : ThemeColors.TEXT}
                        toFileName={toPromptTemplateFileName}
                        existingFileNames={promptTemplateFileNames}
                        emoji={emoji}
                        onEmojiSelect={(newEmoji) =>
                          void promptTemplates.updateEmoji(fileName, newEmoji)
                        }
                        onClick={() => void handleOpenPromptTemplate(fileName, title)}
                        onCommit={handleCommitPromptTemplate}
                        onDelete={() => handleDeletePromptTemplate(fileName, title)}
                      />
                    );
                  })
                : null}
              {isCreatingPromptTemplate && (
                <MainMenuListItem
                  key="##new-prompt-template##"
                  itemKey="##new-prompt-template##"
                  fileName={null}
                  title=""
                  toFileName={toPromptTemplateFileName}
                  existingFileNames={promptTemplateFileNames}
                  onCommit={handleCommitPromptTemplate}
                  onDiscard={handleCancelCreatingPromptTemplate}
                />
              )}
              {!isCreatingPromptTemplate && (
                <ListItem
                  ref={setCreatePromptTemplateRef}
                  icon={TIcon.PLUS}
                  color={ThemeColors.ACCENT2}
                  compact={compact}
                  onClick={() => handleSetIsCreatingPromptTemplate(true)}
                >
                  {tMenu('fileList.createButton')}
                </ListItem>
              )}
            </List>
          </Section>

          <Hr variant={THrVariant.DIMMED} />

          <Section>
            {!dynamic && (
              <ListHeader className={classNames({ compact })} level={6}>
                <ListHeaderText>{tMenu('fileList.glossariesHeader')}</ListHeaderText>
              </ListHeader>
            )}
            <List>
              <AnimatePresence>
                {glossaryItems.length
                  ? glossaryItems.map(({ fileName, title, emoji }) => {
                      const isActive = fileName === currentGlossary;
                      return (
                        <MainMenuListItem
                          key={fileName}
                          itemKey={fileName}
                          fileName={fileName}
                          title={title}
                          compact={compact}
                          isActive={isActive}
                          isDisabled={listIsDisabled}
                          color={isActive ? ThemeColors.ACCENT1 : ThemeColors.TEXT}
                          toFileName={toGlossaryFileName}
                          existingFileNames={glossaryFileNames}
                          emoji={emoji}
                          onEmojiSelect={(newEmoji) =>
                            void glossaries.updateEmoji(fileName, newEmoji)
                          }
                          onClick={() => void handleOpenGlossary(fileName, title)}
                          onCommit={handleCommitGlossary}
                          onDelete={() => handleDeleteGlossary(fileName, title)}
                        />
                      );
                    })
                  : null}
              </AnimatePresence>
              {isCreatingGlossary && (
                <MainMenuListItem
                  key="##new-glossary##"
                  itemKey="##new-glossary##"
                  fileName={null}
                  title=""
                  toFileName={toGlossaryFileName}
                  existingFileNames={glossaryFileNames}
                  onCommit={handleCommitGlossary}
                  onDiscard={handleCancelCreatingGlossary}
                />
              )}
              {!isCreatingGlossary && (
                <ListItem
                  ref={setCreateGlossaryRef}
                  onClick={() => handleSetIsCreatingGlossary(true)}
                  color={ThemeColors.ACCENT2}
                  icon={TIcon.PLUS}
                  compact={compact}
                >
                  {tMenu('fileList.createButton')}
                </ListItem>
              )}
            </List>
          </Section>
        </>
      )}
    </>
  );
}
