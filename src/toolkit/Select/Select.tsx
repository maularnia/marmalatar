import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData } from '@store/slices/app';
import { usePopperPortal } from '@providers/PopperPortalProvider';
import { TColor } from '@src/theme/definitions';
import { ThemeColors, CSSVar } from '@src/theme/utils';
import {
  buildReactSelectComponents,
  FloatingLabel,
  ThemedDropdownPortalStyle,
  ThemedSelectWrapper,
} from '@ui-toolkit/Select/partials';
import { TIcon } from '@ui-toolkit/Icon/icons';
import classNames from 'classnames';
import { ReactNode, useMemo, useState } from 'react';
import styled from 'styled-components';
import ReactSelectLib from 'react-select';
import CreatableSelect from 'react-select/creatable';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';

export type TOptionSelect = {
  value: string;
  label: string | null;
  color?: TColor;
  isDisabled?: boolean;
  icon?: TIcon;
  emoji?: ReactNode;
};

type SelectProps<T extends TOptionSelect = TOptionSelect> = {
  options: T[];
  value: T['value'] | T['value'][];
  onChange: (value: T['value'][]) => void;
  placeholder?: string;
  multiple?: boolean;
  clearable?: boolean;
  allowCustomValues?: boolean;
  containerClassName?: string;
  selectClassName?: string;
  dataRole?: string;
  dataLineNo?: number;
  onFocus?: () => void;
  color?: TColor;
  disabled?: boolean;
  errors?: ReactNode[];
};

const Errors = styled.span`
  display: inline-flex;
  flex-direction: column;
  gap: ${CSSVar('inputSpacingYRegular')};
`;

export default function Select<T extends TOptionSelect = TOptionSelect>({
  options,
  value,
  onChange,
  placeholder,
  clearable = false,
  multiple = false,
  allowCustomValues = false,
  containerClassName,
  selectClassName,
  dataRole,
  dataLineNo,
  onFocus,
  color,
  disabled = false,
  errors,
}: SelectProps<T>) {
  const theme = useAppSelector(selectCurrentThemeData);
  const hasErrors = Boolean(errors?.length);
  const effectiveColor = hasErrors
    ? ThemeColors.RED
    : (color ?? theme.variables.selectBodyBgDefault.value);
  const portal = usePopperPortal();

  const [isFocused, setIsFocused] = useState(false);
  const [customOptions, setCustomOptions] = useState<T[]>([]);
  const mergedOptions = useMemo(() => [...options, ...customOptions], [options, customOptions]);

  const normalizedValue = useMemo(() => {
    const values = Array.isArray(value) ? value : [value];
    return values.map((v) => mergedOptions.find((o) => o.value === v)).filter(Boolean) as T[];
  }, [value, mergedOptions]);

  const selectComponents = useMemo(() => buildReactSelectComponents<T>(), []);

  const handleChange = (selected: T | T[] | null) => {
    if (!selected) {
      onChange([]);
      return;
    }
    const arr = Array.isArray(selected) ? selected : [selected];
    onChange(arr.map((item) => item.value));
  };

  const commonProps = {
    className: selectClassName,
    classNamePrefix: 'rselect',
    options: mergedOptions,
    isMulti: multiple,
    isClearable: clearable,
    isSearchable: true,
    isDisabled: disabled,
    placeholder: null,
    menuPortalTarget: portal,
    menuPosition: 'fixed' as const,
    styles: { menuPortal: (base: object) => ({ ...base, zIndex: 9999 }) },
    getOptionLabel: (o: T) => o.label ?? '',
    getOptionValue: (o: T) => o.value,
    components: selectComponents,
    onMenuOpen: () => {
      setIsFocused(true);
      onFocus?.();
    },
    onMenuClose: () => setIsFocused(false),
    onChange: handleChange as never,
  };

  return (
    <>
      <ThemedDropdownPortalStyle $theme={theme} />
      <ThemedSelectWrapper
        $theme={theme}
        $color={effectiveColor}
        className={classNames(containerClassName, {
          hasPlaceholder: !!placeholder,
          isFocused,
          disabled,
          hasValue: !!normalizedValue.length,
        })}
        data-role={dataRole}
        data-line-no={dataLineNo != null ? String(dataLineNo) : undefined}
      >
        {allowCustomValues ? (
          <CreatableSelect<T, typeof multiple>
            {...commonProps}
            value={multiple ? normalizedValue : (normalizedValue[0] ?? null)}
            onCreateOption={(inputValue) => {
              const newOption = { value: inputValue, label: inputValue } as T;
              setCustomOptions((prev) =>
                prev.some((o) => o.value === inputValue) ? prev : [...prev, newOption]
              );
              onChange([...(Array.isArray(value) ? value : [value]), inputValue]);
            }}
          />
        ) : (
          <ReactSelectLib<T, typeof multiple>
            {...commonProps}
            value={multiple ? normalizedValue : (normalizedValue[0] ?? null)}
          />
        )}
        {placeholder && (
          <FloatingLabel
            $color={ThemeColors.TEXT}
            $theme={theme}
            className={classNames({ hasValue: normalizedValue.length > 0, isFocused })}
          >
            {placeholder}
          </FloatingLabel>
        )}
      </ThemedSelectWrapper>
      {hasErrors ? (
        <Errors>
          {errors?.map((error, index) => (
            <Message
              key={`select-error-${index}`}
              type={TMessageVariant.TERTIARY}
              size={TMessageSize.XS}
              color={ThemeColors.RED}
            >
              {error}
            </Message>
          ))}
        </Errors>
      ) : null}
    </>
  );
}
