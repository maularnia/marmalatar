import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CSSVar } from '@src/theme/utils';
import { ReactNode } from 'react';
import styled from 'styled-components';
import Span from '../../Span';
import Tag, { TagProps, TTagSize } from '../../Tag';

export const Separator = styled(Span)`
  white-space: pre;
  opacity: ${CSSVar('opacity-50')};
  font-size: ${CSSVar('tagTextSizeSmall')};
`;

type SortableTagProps = {
  id: string;
  color?: TagProps['color'];
  onRemove: TagProps['onRemove'];
  children: ReactNode;
};

export function SortableTag({ id, color, onRemove, children }: SortableTagProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <Tag
      elementRef={(node) => setNodeRef(node)}
      size={TTagSize.SMALL}
      color={color}
      onRemove={onRemove}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </Tag>
  );
}
