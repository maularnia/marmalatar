import { menu } from '@src/services/menu';
import { useRef, useState } from 'react';

const MAX_NAME_LENGTH = 64;

/** Whether a name can be committed for the file `fileName` (null for a new one): not empty, not
 * too long, and not the name of another file in the same list once turned into a file name */
export function makeNameValidator(
  fileName: string | null,
  existingFileNames: readonly string[],
  toFileName: (title: string) => string
): (name: string) => boolean {
  return (name) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > MAX_NAME_LENGTH) return false;
    const newFileName = toFileName(trimmed);
    return newFileName === fileName || !existingFileNames.includes(newFileName);
  };
}

// A name being typed in a row. `failed`: the last commit with it was refused (the service reported
// why with a toast); the row shows the error state until the name is edited again.
type TDraft = { name: string; failed: boolean };

type TRowOptions = {
  itemKey: string;
  /** What the editor starts with, and what's committed if nothing was typed */
  title: string;
  isValidName: (name: string) => boolean;
  /** Writes the name; throws when it couldn't be (the row stays in edit mode, invalid) */
  commit: (name: string) => Promise<void>;
  /** Leaves edit mode without writing */
  cancel: () => void;
};

type TRowProps = {
  isValid: boolean;
  onChange: (name: string) => void;
  onCommit: () => void;
  onDiscard: () => void;
};

/** The names being typed in the menu's rows, and committing or discarding them. `editingKeys`:
 * the rows currently in edit mode -- one being renamed, plus any new file's row. */
export function useMenuRename(editingKeys: readonly string[]) {
  const [drafts, setDrafts] = useState<Record<string, TDraft>>({});
  // Enter commits behind a loader, which takes focus; the blur that follows would discard
  const committingRef = useRef(false);

  // A row that left edit mode (here or from outside, e.g. Alt+R on another row) drops its name,
  // so editing it again starts from its title. Adjusted during render rather than in an effect.
  const staleKeys = Object.keys(drafts).filter((key) => !editingKeys.includes(key));
  if (staleKeys.length) {
    setDrafts((current) => {
      const next = { ...current };
      staleKeys.forEach((key) => delete next[key]);
      return next;
    });
  }

  const drop = (itemKey: string) => setDrafts(({ [itemKey]: _, ...others }) => others);

  return {
    row({ itemKey, title, isValidName, commit, cancel }: TRowOptions): TRowProps {
      const draft = drafts[itemKey];
      const name = draft?.name ?? title;
      return {
        isValid: isValidName(name) && !draft?.failed,
        onChange: (next) =>
          setDrafts((current) => ({ ...current, [itemKey]: { name: next, failed: false } })),
        onCommit: () => {
          if (!isValidName(name) || draft?.failed) return;
          committingRef.current = true;
          commit(name)
            .then(() => {
              drop(itemKey);
              menu.stopRenaming(itemKey);
            })
            .catch(() =>
              setDrafts((current) => ({ ...current, [itemKey]: { name, failed: true } }))
            )
            .finally(() => {
              committingRef.current = false;
            });
        },
        onDiscard: () => {
          if (committingRef.current) return;
          drop(itemKey);
          cancel();
        },
      };
    },
  };
}
