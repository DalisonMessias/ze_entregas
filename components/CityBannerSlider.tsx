import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import * as cloud from '../services/cloud';
import { CityStoreBanner } from '../types';

interface CityBannerSliderProps {
    citySlug: string;
}

const isWithinSchedule = (banner: CityStoreBanner) => {
    const now = new Date();
    if (banner.starts_at) {
        const start = new Date(banner.starts_at);
        if (start > now) return false;
    }
    if (banner.ends_at) {
        const end = new Date(banner.ends_at);
        if (end <= now) return false;
    }
    return true;
};

export const CityBannerSlider: React.FC<CityBannerSliderProps> = ({ citySlug }) => {
    const [banners, setBanners] = useState<CityStoreBanner[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        const loadBanners = async () => {
            if (!citySlug) {
                setBanners([]);
                setLoading(false);
                return;
            }
            try {
                const data = await cloud.getCityStoreBanners(citySlug);
                const filtered = (data || []).filter(b => b.is_active && isWithinSchedule(b));
                setBanners(filtered);
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        loadBanners();
    }, [citySlug]);

    useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(() => handleNext(), 6000);
        return () => clearInterval(timer);
    }, [banners, currentIndex]);

    const handleNext = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % banners.length);
            setIsTransitioning(false);
        }, 300);
    };

    const handlePrev = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
            setIsTransitioning(false);
        }, 300);
    };

    const handleBannerClick = (banner: CityStoreBanner) => {
        if (!banner.link) return;
        if (banner.link.startsWith('http')) {
            window.open(banner.link, '_blank');
            return;
        }
        const targetPath = banner.link.startsWith('/') ? banner.link : `/${banner.link}`;
        window.history.pushState({}, '', targetPath);
        window.dispatchEvent(new CustomEvent('popstate'));
        window.dispatchEvent(new CustomEvent('pushstate_changed'));
    };

    if (loading || banners.length === 0) return null;

    return (
        <div className="relative w-full overflow-hidden rounded-[24px] md:rounded-[32px] bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 group">
            <div className="aspect-[16/4] w-full relative">
                <div
                    className={`absolute inset-0 cursor-pointer transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                    onClick={() => handleBannerClick(banners[currentIndex])}
                >
                    <img
                        src={banners[currentIndex].image_url}
                        alt={banners[currentIndex].name}
                        className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                    {banners[currentIndex].link && (
                        <div className="absolute bottom-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {banners.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-md hover:bg-white/30 rounded-full text-white transition-all opacity-0 group-hover:opacity-100 hidden md:block"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 backdrop-blur-md hover:bg-white/30 rounded-full text-white transition-all opacity-0 group-hover:opacity-100 hidden md:block"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>

                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 bg-black/10 backdrop-blur-sm rounded-full">
                            {banners.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
