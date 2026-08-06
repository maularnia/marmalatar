import { HTMLProps } from 'react';
import styled from 'styled-components';

type EmojiProps = Omit<HTMLProps<HTMLDivElement>, 'children'> & {
  children: string;
};

const EmojiRoot = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

export default function Emoji({ children, ...props }: EmojiProps) {
  return <EmojiRoot {...props}>{children}</EmojiRoot>;
}
