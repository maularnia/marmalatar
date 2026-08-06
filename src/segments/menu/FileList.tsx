import {
  CREATE_GLOSSARY_KEY,
  CREATE_PROJECT_KEY,
  CREATE_PROMPT_TEMPLATE_KEY,
  useMenuActions,
} from '@providers/MenuActionsProvider';
import { useMenuRefs } from '@providers/MenuRefsProvider';
import i18n from '@src/i18n';
import { selectIntegrationIsConfigured } from '@src/store/slices/app';
import { selectProjectId } from '@src/store/slices/project';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { selectCurrentGlossary, selectCurrentPromptTemplate } from '@store/slices/aiPromptEditor';
import { selectTranslationIsBusy } from '@store/slices/aiTranslation';
import {
  renameProjectFile,
  selectDiscIsBusy,
  selectFolder,
  selectGlossaryItems,
  selectProjects,
  selectPromptTemplateItems,
  updateProjectEmoji,
} from '@store/slices/disc';
import {
  createGlossaryFile,
  createPromptTemplateFile,
  renameGlossaryFile,
  renamePromptTemplateFile,
  updateGlossaryEmoji,
  updatePromptTemplateEmoji,
} from '@store/thunks';
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
import { useMainMenuState } from '../../providers/MenuStateProvider';

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
  const dispatch = useAppDispatch();
  const folder = useAppSelector(selectFolder);
  const projects = useAppSelector(selectProjects);
  const promptTemplateItems = useAppSelector(selectPromptTemplateItems);
  const glossaryItems = useAppSelector(selectGlossaryItems);
  const discIsBusy = useAppSelector(selectDiscIsBusy);
  const translationIsBusy = useAppSelector(selectTranslationIsBusy);
  const listIsDisabled = discIsBusy || translationIsBusy;
  const currentPromptTemplate = useAppSelector(selectCurrentPromptTemplate);
  const currentGlossary = useAppSelector(selectCurrentGlossary);
  const { compact, dynamic } = useMainMenuState();
  const currentProjectId = useAppSelector(selectProjectId);
  const integrationIsConfigured = useAppSelector(selectIntegrationIsConfigured);

  const {
    isCreatingPromptTemplate,
    setIsCreatingPromptTemplate,
    isCreatingGlossary,
    setIsCreatingGlossary,
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

  const projectFileNames = useMemo(() => projects.map((p) => p.fileName), [projects]);
  const promptTemplateFileNames = useMemo(
    () => promptTemplateItems.map((c) => c.fileName),
    [promptTemplateItems]
  );
  const glossaryFileNames = useMemo(() => glossaryItems.map((g) => g.fileName), [glossaryItems]);

  const handleCommitProject = async (fileName: string | null, newTitle: string) => {
    const project = projects.find((p) => p.fileName === fileName);
    if (!project) throw new Error(t('fileList.projectNotFound'));
    await dispatch(renameProjectFile(project.filePath, newTitle));
  };

  const handleCommitPromptTemplate = async (fileName: string | null, newTitle: string) => {
    if (fileName) {
      await dispatch(renamePromptTemplateFile(fileName, newTitle));
    } else {
      await dispatch(createPromptTemplateFile(newTitle));
      setIsCreatingPromptTemplate(false);
    }
  };

  const handleCommitGlossary = async (fileName: string | null, newTitle: string) => {
    if (fileName) {
      await dispatch(renameGlossaryFile(fileName, newTitle));
    } else {
      await dispatch(createGlossaryFile(newTitle));
      setIsCreatingGlossary(false);
    }
  };

  if (
    !folder ||
    (projects.length === 0 && promptTemplateItems.length === 0 && glossaryItems.length === 0)
  )
    return null;
  return (
    <>
      {projects.length > 0 && (
        <>
          <Section>
            {!dynamic && (
              <ListHeader className={classNames({ compact })} level={6}>
                <ListHeaderText>{tMenu('fileList.projectsHeader')}</ListHeaderText>
              </ListHeader>
            )}
            <List>
              {projects.length
                ? projects.map((project) => {
                    const isActive = project.project.projectId === currentProjectId;
                    return (
                      <MainMenuListItem
                        key={project.filePath}
                        itemKey={project.filePath}
                        fileName={project.fileName}
                        title={project.project.projectName}
                        isActive={isActive}
                        isDisabled={listIsDisabled}
                        compact={compact}
                        color={isActive ? ThemeColors.ACCENT1 : ThemeColors.TEXT}
                        progress={project.translationProgress}
                        fileExtension=".mrml"
                        slugFallback="project"
                        existingFileNames={projectFileNames}
                        emoji={project.project.emoji}
                        onEmojiSelect={(emoji) =>
                          void dispatch(updateProjectEmoji(project.filePath, emoji))
                        }
                        onClick={() => void handleOpenProject(project, isActive)}
                        onCommit={handleCommitProject}
                        onDelete={() =>
                          handleDeleteProject(
                            project.filePath,
                            project.project.projectName,
                            project.project.projectId
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
                        fileExtension=".mrmlpt"
                        slugFallback="prompt-template"
                        existingFileNames={promptTemplateFileNames}
                        emoji={emoji}
                        onEmojiSelect={(newEmoji) =>
                          void dispatch(updatePromptTemplateEmoji(fileName, newEmoji))
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
                  fileExtension=".mrmlpt"
                  slugFallback="prompt-template"
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
                  onClick={() => setIsCreatingPromptTemplate(true)}
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
                          fileExtension=".mrmlg"
                          slugFallback="glossary"
                          existingFileNames={glossaryFileNames}
                          emoji={emoji}
                          onEmojiSelect={(newEmoji) =>
                            void dispatch(updateGlossaryEmoji(fileName, newEmoji))
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
                  fileExtension=".mrmlg"
                  slugFallback="glossary"
                  existingFileNames={glossaryFileNames}
                  onCommit={handleCommitGlossary}
                  onDiscard={handleCancelCreatingGlossary}
                />
              )}
              {!isCreatingGlossary && (
                <ListItem
                  ref={setCreateGlossaryRef}
                  onClick={() => setIsCreatingGlossary(true)}
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
