import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  // Premium Style: Rounded 2xl, Soft shadows, Modern gradients/flats
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed gap-2 ring-offset-2 focus:ring-2 select-none";

  const variants = {
    // Primary Brand
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-500/20 border-none ring-brand-500",

    // Secondary Blue
    secondary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 border-none ring-blue-500",

    // Danger Red
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20 border-none ring-red-500",

    // Success Green
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20 border-none ring-emerald-500",

    // Outline
    outline: "bg-transparent border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 ring-gray-400",

    // Ghost
    ghost: "bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
  };

  const sizes = {
    sm: "py-2 px-4 text-sm rounded-xl",
    md: "py-3 px-6 text-base rounded-2xl",
    lg: "py-4.5 px-8 text-lg rounded-3xl"
  };

  const widthClass = fullWidth ? "w-full" : "";
  const sizeClass = sizes[size];

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${sizeClass} ${className}`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};