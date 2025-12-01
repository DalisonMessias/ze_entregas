
import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

interface CustomDateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const CustomDateInput: React.FC<CustomDateInputProps> = ({ value, onChange, label, className = '' }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    if (inputRef.current) {
      try {
        inputRef.current.showPicker();
      } catch (e) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
      <div 
        className="relative w-full flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden cursor-pointer focus-within:ring-2 focus-within:ring-brand-500 transition-all"
        onClick={handleContainerClick}
      >
        <div className="pl-3 text-gray-400 dark:text-gray-300">
          <Calendar className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent p-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 outline-none border-none appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full"
        />
      </div>
    </div>
  );
};
