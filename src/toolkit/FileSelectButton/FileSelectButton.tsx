import { TColorCustom } from '@src/theme/definitions';
import { ThemeColors, CSSVar } from '@src/theme/utils';
import Button from '@ui-toolkit/Button/Button';
import { TButtonProps } from '@ui-toolkit/Button/types';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import P, { TPStyle, TPVariant } from '@ui-toolkit/P';
import { HTMLProps, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';

type InputSwapProps = 'onChange' | 'onBlur' | 'accept';
type FileInputProps = Omit<HTMLProps<HTMLInputElement>, InputSwapProps | 'children'>;
type FileButtonProps = Omit<TButtonProps, 'onChange' | 'onBlur' | 'accept'> &
  Pick<HTMLProps<HTMLInputElement>, 'onChange' | 'onBlur' | 'accept'>;

interface FileSelectButtonProps extends FileButtonProps {
  label?: string;
  errors?: ReactNode[];
  valid?: boolean;
  inputProps?: FileInputProps;
}

const HiddenFileInput = styled.input`
  position: fixed;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;

const FileInputButton = styled.div`
  display: inline-flex;
  flex-direction: column;
  vertical-align: middle;
  gap: ${CSSVar('inputSpacingYRegular')};
`;

const FileInputWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${CSSVar('inputSpacingXRegular')};
`;

const Errors = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: ${CSSVar('inputSpacingYRegular')};
  padding: ${CSSVar('size4')} 0 0;
`;

const FileInputLabel = styled(P)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export default function FileSelectButton({
  color,
  label,
  errors,
  valid = false,
  children,
  accept,
  onChange,
  onBlur,
  onClick,
  inputProps,
  ...buttonProps
}: FileSelectButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasErrors = Boolean(errors?.length);
  const resolvedColor = hasErrors ? TColorCustom.RED : valid ? TColorCustom.GREEN : color;
  const [autoWidth, setAutoWidth] = useState<number>(0);

  useLayoutEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const getWidth = () => {
      const width = rootRef.current?.offsetWidth;
      if (width && !autoWidth) {
        setAutoWidth(width ?? 0);
      }
      if (!width) {
        interval = setInterval(getWidth, 100);
      }
    };
    if (!autoWidth) getWidth();
    return () => clearInterval(interval);
  }, []);

  return (
    <FileInputButton ref={rootRef} style={{ maxWidth: autoWidth ? autoWidth : 'none' }}>
      <FileInputWrapper>
        <Button
          {...buttonProps}
          forceIconic={!children}
          color={resolvedColor}
          onClick={(event) => {
            if (buttonProps.disabled) return;
            inputRef.current?.click();
            onClick?.(event);
          }}
        >
          <HiddenFileInput
            {...inputProps}
            ref={inputRef}
            onChange={onChange}
            onBlur={onBlur}
            accept={accept}
            type="file"
            disabled={buttonProps.disabled}
            tabIndex={-1}
          />
          {children}
        </Button>
        {label && (
          <FileInputLabel
            variant={TPVariant.TERTIARY}
            type={TPStyle.DEFAULT}
            color={ThemeColors.TEXT}
          >
            {label}
          </FileInputLabel>
        )}
      </FileInputWrapper>
      {hasErrors ? (
        <Errors>
          {errors?.map((error, index) => (
            <Message
              key={`file-select-error-${index}`}
              type={TMessageVariant.SECONDARY}
              size={TMessageSize.XS}
              color={ThemeColors.RED}
            >
              {error}
            </Message>
          ))}
        </Errors>
      ) : null}
    </FileInputButton>
  );
}
