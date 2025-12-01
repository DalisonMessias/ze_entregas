import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  size = 'md',
  className = '', 
  ...props 
}) => {
  // iFood Style: Rounded Full, Flat colors, No harsh borders
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-transform duration-100 active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    // Primary Orange (like iFood Red but Orange)
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm border-none",
    
    // Secondary Blue
    secondary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm border-none",
    
    // Danger Red
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm border-none",
    
    // Success Green
    success: "bg-green-600 text-white hover:bg-green-700 shadow-sm border-none",
    
    // Outline (Gray border)
    outline: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700",
    
    // Ghost (Text only)
    ghost: "bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
  };

  const sizes = {
    sm: "py-2 px-4 text-sm rounded-full",
    md: "py-3.5 px-6 text-base rounded-full",
    lg: "py-4 px-8 text-lg rounded-full"
  };

  const widthClass = fullWidth ? "w-full" : "";
  const sizeClass = sizes[size]; 

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${sizeClass} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};