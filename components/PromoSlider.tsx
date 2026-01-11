import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import * as cloud from '../services/cloud';
import { AppSlide } from '../types';

interface PromoSliderProps {
    audience: 'drivers' | 'merchants';
}

export const PromoSlider: React.FC<PromoSliderProps> = ({ audience }) => {
    const [slides, setSlides] = useState<AppSlide[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        const loadSlides = async () => {
            try {
                const data = await cloud.getSlides(audience);
                console.log(`[PromoSlider] Fetched ${data.length} slides for audience: ${audience}`, data);
                setSlides(data);
            } catch (error) {
                console.error('[PromoSlider] Error loading promo slides:', error);
            } finally {
                setLoading(false);
            }
        };
        loadSlides();
    }, [audience]);

    useEffect(() => {
        if (slides.length <= 1) return;

        const timer = setInterval(() => {
            handleNext();
        }, 6000);

        return () => clearInterval(timer);
    }, [slides, currentIndex]);

    const handleNext = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(prev => (prev + 1) % slides.length);
            setIsTransitioning(false);
        }, 300);
    };

    const handlePrev = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
            setIsTransitioning(false);
        }, 300);
    };

    const handleSlideClick = (slide: AppSlide) => {
        if (!slide.link) return;

        if (slide.link.startsWith('http')) {
            window.open(slide.link, '_blank');
        } else {
            // Internal route
            const event = new CustomEvent('navigateToTab', { detail: { tab: slide.link.replace('/', '') } });
            window.dispatchEvent(event);
        }
    };

    if (loading || slides.length === 0) return null;

    return (
        <div className="relative w-full overflow-hidden rounded-[24px] md:rounded-[32px] bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 group">
            <div className="aspect-[16/4] w-full relative">
                <div
                    className={`absolute inset-0 cursor-pointer transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                    onClick={() => handleSlideClick(slides[currentIndex])}
                >
                    <img
                        src={slides[currentIndex].image_url}
                        alt={slides[currentIndex].name}
                        className="w-full h-full object-cover"
                    />

                    {/* Overlay Gradient for Text Readability - Minimal */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                    {/* Indicator tag if it has link */}
                    {slides[currentIndex].link && (
                        <div className="absolute bottom-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {/* Navigation Arrows */}
                {slides.length > 1 && (
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

                        {/* Dot Indicators */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 bg-black/10 backdrop-blur-sm rounded-full">
                            {slides.map((_, idx) => (
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
