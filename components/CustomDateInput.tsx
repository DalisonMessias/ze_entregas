
import React, { useState, useEffect, forwardRef } from 'react';
import { format, parse, isValid, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, X as XIcon } from 'lucide-react';

// Formata a data para o formato ISO (YYYY-MM-DD)
const formatDateToISO = (date: Date): string => format(date, 'yyyy-MM-dd');

// Faz o parsing da string de data no formato ISO
const parseISOString = (isoString: string): Date => parseISO(isoString);

// Formata a data para o formato brasileiro (DD/MM/AAAA)
const formatDateToBrazilian = (date: Date): string => format(date, 'dd/MM/yyyy');

// Faz o parsing da string de data no formato brasileiro
const parseBrazilianDateString = (dateString: string): Date => parse(dateString, 'dd/MM/yyyy', new Date());

interface CustomDateInputProps {
  value: string | Date | null;
  onChange: (date: string | null) => void;
  label?: string;
  placeholder?: string;
  min?: string | Date;
  max?: string | Date;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  name?: string;
  id?: string;
  className?: string;
  showCalendarIcon?: boolean;
  allowClear?: boolean;
}

const CustomDateInput = forwardRef<HTMLInputElement, CustomDateInputProps>(
  (
    {
      value,
      onChange,
      label,
      placeholder = 'DD/MM/AAAA',
      min,
      max,
      disabled = false,
      required = false,
      error = false,
      helperText,
      name,
      id,
      className = '',
      showCalendarIcon = true,
      allowClear = true,
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState('');
    const [internalError, setInternalError] = useState<string | null>(null);

    const getFormattedDate = (date: string | Date | null): Date | null => {
      if (!date) return null;
      const parsedDate = typeof date === 'string' ? parseISOString(date) : date;
      return isValid(parsedDate) ? parsedDate : null;
    };

    const minDate = getFormattedDate(min);
    const maxDate = getFormattedDate(max);

    useEffect(() => {
      const initialDate = getFormattedDate(value);
      if (initialDate) {
        setDisplayValue(formatDateToBrazilian(initialDate));
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const validate = (date: Date | null): string | null => {
      if (required && !date) return 'Campo obrigatório.';
      if (date && minDate && date < minDate) return `A data não pode ser anterior a ${formatDateToBrazilian(minDate)}.`;
      if (date && maxDate && date > maxDate) return `A data não pode ser posterior a ${formatDateToBrazilian(maxDate)}.`;
      return null;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value.replace(/[^0-9]/g, '');
      let formatted = '';

      if (inputValue.length > 0) {
        formatted = inputValue.slice(0, 2);
        if (inputValue.length > 2) formatted += '/' + inputValue.slice(2, 4);
        if (inputValue.length > 4) formatted += '/' + inputValue.slice(4, 8);
      }

      setDisplayValue(formatted);

      if (formatted.length === 10) {
        const parsedDate = parseBrazilianDateString(formatted);
        if (isValid(parsedDate)) {
          const validationError = validate(parsedDate);
          if (validationError) {
            setInternalError(validationError);
            onChange(null);
          } else {
            setInternalError(null);
            onChange(formatDateToISO(parsedDate));
          }
        } else {
          setInternalError('Data inválida.');
          onChange(null);
        }
      } else {
        setInternalError(null);
        onChange(null);
      }
    };

    const handleClear = () => {
      setDisplayValue('');
      setInternalError(null);
      onChange(null);
    };

    const finalHelperText = internalError || helperText;
    const hasError = error || !!internalError;

    return (
      <div className={`flex flex-col ${className}`}>
        {label && (
          <label htmlFor={id} className="mb-1 text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {showCalendarIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <input
            ref={ref}
            type="text"
            id={id}
            name={name}
            value={displayValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            inputMode="numeric"
            pattern="\d{2}/\d{2}/\d{4}"
            className={`
              w-full rounded-md border 
              ${showCalendarIcon ? 'pl-10' : 'pl-3'} 
              ${allowClear ? 'pr-10' : 'pr-3'} 
              py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 
              focus:ring-2 focus:ring-inset focus:ring-indigo-600 
              ${hasError ? 'border-red-500 ring-red-500' : 'border-gray-300'}
              ${disabled ? 'cursor-not-allowed bg-gray-50' : ''}
            `}
            aria-invalid={hasError}
            aria-describedby={finalHelperText ? `${id}-helper` : undefined}
          />
          {allowClear && displayValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              aria-label="Limpar data"
            >
              <XIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        {finalHelperText && (
          <p id={`${id}-helper`} className={`mt-1 text-xs ${hasError ? 'text-red-600' : 'text-gray-500'}`}>
            {finalHelperText}
          </p>
        )}
      </div>
    );
  }
);

CustomDateInput.displayName = 'CustomDateInput';

export default CustomDateInput;
