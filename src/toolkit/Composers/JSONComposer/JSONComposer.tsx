import { ThemeColors, CSSVar } from '@src/theme/utils';
import Button from '../../Button/Button';
import { TButtonSize, TButtonVariant } from '../../Button/types';
import { TIcon } from '../../Icon/icons';
import Message, { TMessageSize, TMessageVariant } from '../../Message';
import Tag, { TTagSize, TTagVariant } from '../../Tag';
import { OptionsRow, Root } from '../partials';
import { Brace, Colon, EntryRow, Errors, FieldNameInput, JsonValueRow } from './partials';
import { TOptionJSONComposer, JSONComposerProps } from './types';

export default function JSONComposer({ value, options, onChange, errors }: JSONComposerProps) {
  const optionByValue = new Map(options.map((option) => [option.value, option]));
  const usedValues = new Set(value.map(([, optionValue]) => optionValue));
  const hasErrors = Boolean(errors?.length);

  const handleAppend = (option: TOptionJSONComposer) => {
    onChange([...value, [option.value, option.value]]);
  };

  const handleFieldNameChange = (index: number, fieldName: string) => {
    if (fieldName !== '' && !/^[A-Za-z_]/.test(fieldName)) return;
    onChange(value.map((entry, i) => (i === index ? [fieldName, entry[1]] : entry)));
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <Root>
      <OptionsRow>
        {options.map((option) => {
          const isUsed = usedValues.has(option.value);
          return (
            <Tag
              key={option.value}
              size={TTagSize.SMALL}
              color={option.color}
              variant={isUsed ? TTagVariant.SECONDARY : TTagVariant.PRIMARY}
              style={{
                cursor: isUsed ? 'default' : 'pointer',
                opacity: isUsed ? CSSVar('opacity-50') : undefined,
              }}
              onClick={isUsed ? undefined : () => handleAppend(option)}
            >
              {option.label}
            </Tag>
          );
        })}
      </OptionsRow>
      <JsonValueRow $hasErrors={hasErrors}>
        <Brace>{'{'}</Brace>
        {value.map(([fieldName, optionValue], index) => {
          const option = optionByValue.get(optionValue);
          return (
            <EntryRow key={index}>
              <FieldNameInput
                value={fieldName}
                onChange={(e) => handleFieldNameChange(index, e.target.value)}
              />
              <Colon>:</Colon>
              <Tag size={TTagSize.SMALL} color={option?.color}>
                {option?.label ?? optionValue}
              </Tag>
              <Button
                icon={TIcon.CROSS}
                variant={TButtonVariant.TRANSPARENT}
                size={TButtonSize.SMALL}
                onClick={() => handleRemove(index)}
              />
            </EntryRow>
          );
        })}
        <Brace>{'}'}</Brace>
      </JsonValueRow>
      {hasErrors && (
        <Errors>
          {errors!.map((error, i) => (
            <Message
              key={i}
              type={TMessageVariant.TERTIARY}
              size={TMessageSize.XS}
              color={ThemeColors.RED}
            >
              {error}
            </Message>
          ))}
        </Errors>
      )}
    </Root>
  );
}
