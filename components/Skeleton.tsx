
import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "", variant = 'rectangular' }) => {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-700";
  
  let roundedClass = "rounded-xl";
  if (variant === 'circular') roundedClass = "rounded-full";
  if (variant === 'text') roundedClass = "rounded";

  return (
    <div className={`${baseClasses} ${roundedClass} ${className}`} />
  );
};
