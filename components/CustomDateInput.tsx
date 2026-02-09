
import React, { useState, useEffect, forwardRef, useRef } from 'react';
import { format, parse, isValid, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, X as XIcon, ChevronLeft, ChevronRight } from 'lucide-react';

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

export const CustomDateInput = forwardRef<HTMLInputElement, CustomDateInputProps>(
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
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);

    // Gerar ID único se não fornecido
    const componentId = useRef(id || `date-input-${Math.random().toString(36).substr(2, 9)}`);

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
        setCurrentMonth(initialDate);
      } else {
        setDisplayValue('');
      }
    }, [value]);

    // Fechar calendário ao clicar fora
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
          setIsCalendarOpen(false);
        }
      };

      if (isCalendarOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isCalendarOpen]);

    // Fechar este calendário quando outro abre
    useEffect(() => {
      const handleCloseOthers = (event: CustomEvent) => {
        if (event.detail.id !== componentId.current) {
          setIsCalendarOpen(false);
        }
      };

      window.addEventListener('datePickerOpened', handleCloseOthers as EventListener);

      return () => {
        window.removeEventListener('datePickerOpened', handleCloseOthers as EventListener);
      };
    }, []);

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
      setIsCalendarOpen(false);
    };

    const handleCalendarClick = () => {
      if (!disabled) {
        const newState = !isCalendarOpen;
        setIsCalendarOpen(newState);

        // Notificar outros calendários para fechar
        if (newState) {
          window.dispatchEvent(new CustomEvent('datePickerOpened', { detail: { id: componentId.current } }));
        }
      }
    };

    const handleDateSelect = (date: Date) => {
      const validationError = validate(date);
      if (validationError) {
        setInternalError(validationError);
        onChange(null);
      } else {
        setInternalError(null);
        onChange(formatDateToISO(date));
        setIsCalendarOpen(false);
      }
    };

    const finalHelperText = internalError || helperText;
    const hasError = error || !!internalError;

    // Gerar dias do mês
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Adicionar dias vazios no início para alinhar com o dia da semana
    const startDayOfWeek = monthStart.getDay();
    const emptyDays = Array(startDayOfWeek).fill(null);


    const selectedDate = getFormattedDate(value);

    return (
      <div className={`flex flex-col ${className}`} ref={calendarRef}>
        {label && (
          <label htmlFor={id} className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {showCalendarIcon && (
            <button
              type="button"
              onClick={handleCalendarClick}
              disabled={disabled}
              className="absolute inset-y-0 left-0 flex items-center pl-4 z-10 cursor-pointer disabled:cursor-not-allowed"
            >
              <CalendarIcon className={`h-5 w-5 transition-colors ${disabled ? 'text-gray-300' : 'text-gray-400 hover:text-brand-600 dark:hover:text-brand-400'}`} />
            </button>
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
              w-full rounded-xl border-none outline-none
              ${showCalendarIcon ? 'pl-12' : 'pl-4'} 
              ${allowClear && displayValue ? 'pr-12' : 'pr-4'} 
              py-3.5 text-base
              bg-white/90 dark:bg-gray-900/40
              text-gray-900 dark:text-white
              placeholder:text-gray-400
              shadow-sm
              ring-1 ring-inset
              ${hasError
                ? 'ring-red-500 focus:ring-red-500'
                : 'ring-gray-200/90 dark:ring-gray-700/80 focus:ring-brand-500 hover:ring-brand-600 dark:hover:ring-brand-500'
              }
              focus:ring-2 focus:ring-brand-500/25
              transition-all
              ${disabled ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800 opacity-60' : ''}
            `}
            aria-invalid={hasError}
            aria-describedby={finalHelperText ? `${id}-helper` : undefined}
          />
          {allowClear && displayValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
              aria-label="Limpar data"
            >
              <XIcon className="h-5 w-5" />
            </button>
          )}

          {/* Calendário Dropdown */}
          {isCalendarOpen && (
            <>
              {/* Backdrop - fundo escuro transparente em mobile */}
              <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsCalendarOpen(false)}
              />

              {/* Calendário */}
              <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:absolute md:left-0 md:right-auto md:bottom-full md:top-auto md:translate-x-0 md:translate-y-0 md:mb-2 z-50 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-[90vw] max-w-sm md:w-80 animate-in fade-in zoom-in-95">
                {/* Cabeçalho */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Dias da semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                    <div key={day} className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Dias do mês */}
                <div className="grid grid-cols-7 gap-1">
                  {emptyDays.map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ))}
                  {daysInMonth.map((day) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const isDisabled = (minDate && day < minDate) || (maxDate && day > maxDate);

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => !isDisabled && handleDateSelect(day)}
                        disabled={isDisabled}
                        className={`
                          aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                          ${isSelected
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                            : isToday
                              ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }
                          ${isDisabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'}
                        `}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>

                {/* Botão Hoje */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => handleDateSelect(new Date())}
                    className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-gray-700 dark:text-gray-300 hover:text-brand-700 dark:hover:text-brand-300 rounded-lg font-medium text-sm transition-colors"
                  >
                    Hoje
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        {finalHelperText && (
          <p id={`${id}-helper`} className={`mt-2 text-xs font-medium ${hasError ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {finalHelperText}
          </p>
        )}
      </div>
    );
  }
);

CustomDateInput.displayName = 'CustomDateInput';


