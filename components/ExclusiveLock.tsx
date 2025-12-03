
import React from 'react';
import { Lock, Crown, ChevronRight } from 'lucide-react';

interface ExclusiveLockProps {
  title: string;
  description: string;
}

export const ExclusiveLock: React.FC<ExclusiveLockProps> = ({ title, description }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center animate-in fade-in">
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-6">
            <Lock className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs leading-relaxed">
            {description}
        </p>
        
    </div>
  );
};
