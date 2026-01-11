
import React, { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import * as cloud from '../services/cloud';
import { UserRole } from '../types';

interface TipOfTheDayProps {
    role: UserRole;
    className?: string;
}

export const TipOfTheDay: React.FC<TipOfTheDayProps> = ({ role, className = '' }) => {
    const [tips, setTips] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const fetchTips = async () => {
            try {
                const data = await cloud.getSystemTips(role);
                setTips(data);
            } catch (error) {
                console.error("Failed to load tips", error);
            }
        };
        fetchTips();

        // Refresh tips periodically (every 5 minutes) to catch updates without refresh
        const refreshInterval = setInterval(fetchTips, 5 * 60 * 1000);
        return () => clearInterval(refreshInterval);
    }, [role]);

    useEffect(() => {
        if (tips.length <= 1) return;

        const interval = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % tips.length);
                setVisible(true);
            }, 500); // Wait for fade out
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [tips]);

    if (tips.length === 0) return null;

    const currentTip = tips[currentIndex];

    return (
        <div className={`bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-2xl flex items-start gap-3 shadow-sm ${className}`}>
            <div className="bg-white dark:bg-yellow-900/30 p-2 rounded-full shadow-sm shrink-0">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-500 mb-0.5 tracking-wider">
                    Dica do Dia
                </p>
                <div className={`transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                        {currentTip.message}
                    </p>
                </div>
                {tips.length > 1 && (
                    <div className="flex gap-1 mt-2">
                        {tips.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-yellow-400' : 'w-1 bg-yellow-200 dark:bg-yellow-800'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
