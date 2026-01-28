import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
    audioUrl: string;
    isFromMe?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, isFromMe = false }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`flex items-center gap-3 min-w-[200px] max-w-[280px] py-1`}>
            <button
                onClick={togglePlay}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isFromMe
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
            >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
                <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className={`absolute inset-y-0 left-0 ${isFromMe ? 'bg-white/60' : 'bg-green-400'} transition-all`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className={`text-[10px] ${isFromMe ? 'text-white/80' : 'text-gray-600'} font-medium`}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>

            <audio ref={audioRef} src={audioUrl} preload="metadata" />
        </div>
    );
};
