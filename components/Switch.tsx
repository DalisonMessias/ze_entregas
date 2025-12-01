import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false, label, className = '' }) => {
  return (
    <label className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <div 
          className={`block w-12 h-7 rounded-full transition-colors duration-200 ease-in-out ${
            checked ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-600'
          }`}
        ></div>
        <div 
          className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-200 ease-in-out shadow-sm ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        ></div>
      </div>
      {label && (
        <span className="ml-3 text-sm font-bold text-gray-700 dark:text-gray-200 select-none">
          {label}
        </span>
      )}
    </label>
  );
};