import React from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
    imageUrl: string;
    onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ imageUrl, onClose }) => {
    return (
        <div
            className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
            >
                <X size={24} className="text-white" />
            </button>

            <img
                src={imageUrl}
                alt="Visualização em tela cheia"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

export default ImageLightbox;
