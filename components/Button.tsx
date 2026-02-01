import React from 'react';
import { Loading } from './Loading';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const [isRestricted, setIsRestricted] = React.useState(false);

  React.useEffect(() => {
    // Escuta evento global de modo restrito
    const handleRestricted = () => setIsRestricted(true);
    const handleUnrestricted = () => setIsRestricted(false);

    window.addEventListener('restricted_mode_active', handleRestricted);
    window.addEventListener('restricted_mode_inactive', handleUnrestricted);

    return () => {
      window.removeEventListener('restricted_mode_active', handleRestricted);
      window.removeEventListener('restricted_mode_inactive', handleUnrestricted);
    };
  }, []);

  // Premium Style: Rounded 2xl, Soft shadows, Modern gradients/flats
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed gap-2 select-none";

  const variants = {
    // Primary Brand - Vibrant Gold/Amber
    primary: "bg-brand-600 text-white hover:bg-brand-700 border border-black/5 dark:border-white/10 dark:bg-brand-500 dark:hover:bg-brand-400",

    // Secondary Blue - Sleek
    secondary: "bg-blue-600 text-white hover:bg-blue-700 border border-black/5 dark:border-white/10 ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400",

    // Danger Red - Critical
    danger: "bg-red-500 text-white hover:bg-red-600 border border-black/5 dark:border-white/10 ring-red-500 dark:bg-red-600 dark:hover:bg-red-500",

    // Success Green - Positive
    success: "bg-emerald-600 text-white hover:bg-emerald-700 border border-black/5 dark:border-white/10 ring-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400",

    // Outline
    outline: "bg-transparent border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 ring-gray-400",

    // Ghost
    ghost: "bg-transparent border border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
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
      disabled={disabled || isRestricted || loading}
      {...props}
    >
      {loading ? (
        <Loading variant="inline" size="sm" className="text-current" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};