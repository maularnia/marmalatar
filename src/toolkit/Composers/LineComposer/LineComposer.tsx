import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { arrayMove, horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { CSSVar } from '@src/theme/utils';
import { Fragment } from 'react';
import Tag, { TTagSize, TTagVariant } from '../../Tag';
import { OptionsRow, Root, ValueRow } from '../partials';
import { Separator, SortableTag } from './partials';
import { LineComposerProps } from './types';

export default function LineComposer({
  options,
  value,
  separator,
  onChange,
  allowDuplicates = true,
}: LineComposerProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const optionByValue = new Map(options.map((option) => [option.value, option]));
  const items = value.map((item, index) => `${item}::${index}`);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const visibleOptions = allowDuplicates
    ? options
    : options.filter((option) => !value.includes(option.value));

  return (
    <Root>
      <OptionsRow>
        {visibleOptions.map((option) => {
          const isUsed = value.includes(option.value);
          return (
            <Tag
              key={option.value}
              size={TTagSize.SMALL}
              color={option.color}
              variant={isUsed ? TTagVariant.SECONDARY : TTagVariant.PRIMARY}
              style={{ cursor: 'pointer', opacity: isUsed ? CSSVar('opacity-50') : undefined }}
              onClick={() => onChange([...value, option.value])}
            >
              {option.label}
            </Tag>
          );
        })}
      </OptionsRow>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={horizontalListSortingStrategy}>
          <ValueRow>
            {value.map((item, index) => {
              const option = optionByValue.get(item);
              return (
                <Fragment key={items[index]}>
                  {index > 0 && <Separator>{separator}</Separator>}
                  <SortableTag
                    id={items[index]}
                    color={option?.color}
                    onRemove={() => onChange(value.filter((_, i) => i !== index))}
                  >
                    {option?.label ?? item}
                  </SortableTag>
                </Fragment>
              );
            })}
          </ValueRow>
        </SortableContext>
      </DndContext>
    </Root>
  );
}
