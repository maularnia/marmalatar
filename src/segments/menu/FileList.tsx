import {
  CREATE_GLOSSARY_KEY,
  CREATE_PROJECT_KEY,
  CREATE_PROMPT_TEMPLATE_KEY,
  menu,
} from '@src/services/menu';
import { toGlossaryFileName, toProjectFileName, toPromptTemplateFileName } from '@bridge/fileNames';
import i18n from '@src/i18n';
import { settings } from '@src/services/settings';
import { projects } from '@src/services/project';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import { promptTemplates } from '@src/services/prompt';
import { glossaries } from '@src/services/glossary';
import { ai } from '@src/services/ai';
import { folder } from '@src/services/folder';
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
  const [
    folderPath,
    projectList,
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
    compact,
    dynamic,
  ] = useAppSelectors(
    folder.selectPath,
    projects.selectList,
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
    menu.selectIsCompact,
    menu.selectIsDynamic
  );
  const listIsDisabled = workingFolderIsBusy || translationIsBusy;

  const setCreateProjectRef = useCallback(
    (el: HTMLDivElement | null) => menu.registerItem(CREATE_PROJECT_KEY, el),
    []
  );
  const setCreatePromptTemplateRef = useCallback(
    (el: HTMLDivElement | null) => menu.registerItem(CREATE_PROMPT_TEMPLATE_KEY, el),
    []
  );
  const setCreateGlossaryRef = useCallback(
    (el: HTMLDivElement | null) => menu.registerItem(CREATE_GLOSSARY_KEY, el),
    []
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
      menu.setIsCreatingPromptTemplate(false);
    }
  };

  const handleCommitGlossary = async (fileName: string | null, newTitle: string) => {
    if (fileName) {
      await glossaries.rename(fileName, newTitle);
    } else {
      await glossaries.create(newTitle);
      menu.setIsCreatingGlossary(false);
    }
  };

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
                        onClick={() => void menu.openProject(project)}
                        onCommit={handleCommitProject}
                        onDelete={() => menu.deleteProject(project)}
                      />
                    );
                  })
                : null}
              <ListItem
                ref={setCreateProjectRef}
                icon={TIcon.PLUS}
                compact={compact}
                color={ThemeColors.ACCENT1}
                onClick={menu.startNewProject}
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
                        onClick={() => void menu.openPromptTemplate(fileName, title)}
                        onCommit={handleCommitPromptTemplate}
                        onDelete={() => menu.deletePromptTemplate(fileName, title)}
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
                  onDiscard={menu.cancelCreatingPromptTemplate}
                />
              )}
              {!isCreatingPromptTemplate && (
                <ListItem
                  ref={setCreatePromptTemplateRef}
                  icon={TIcon.PLUS}
                  color={ThemeColors.ACCENT2}
                  compact={compact}
                  onClick={() => menu.setIsCreatingPromptTemplate(true)}
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
                          onClick={() => void menu.openGlossary(fileName, title)}
                          onCommit={handleCommitGlossary}
                          onDelete={() => menu.deleteGlossary(fileName, title)}
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
                  onDiscard={menu.cancelCreatingGlossary}
                />
              )}
              {!isCreatingGlossary && (
                <ListItem
                  ref={setCreateGlossaryRef}
                  onClick={() => menu.setIsCreatingGlossary(true)}
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
