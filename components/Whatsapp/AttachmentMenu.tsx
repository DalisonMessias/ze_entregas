import React, { useRef, useEffect } from 'react';
import {
    FileText,
    Image as ImageIcon,
    Camera,
    User,
    BarChart2,
    Sticker,
    Wallet
} from 'lucide-react';

interface AttachmentMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'document' | 'image' | 'camera' | 'contact' | 'poll' | 'sticker' | 'pix') => void;
}

const AttachmentMenu: React.FC<AttachmentMenuProps> = ({ isOpen, onClose, onSelect }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const menuItems = [
        { type: 'document', label: 'Documento', icon: <FileText size={20} />, color: 'bg-[#7f66ff]' },
        { type: 'image', label: 'Fotos e vídeos', icon: <ImageIcon size={20} />, color: 'bg-[#007bfc]' },
        { type: 'camera', label: 'Câmera', icon: <Camera size={20} />, color: 'bg-[#ff2e74]' },
        { type: 'pix', label: 'Chave PIX', icon: <Wallet size={20} />, color: 'bg-[#00a884]' },
        { type: 'contact', label: 'Contato', icon: <User size={20} />, color: 'bg-[#009de2]' },
        { type: 'poll', label: 'Enquete', icon: <BarChart2 size={20} />, color: 'bg-[#ffbc38]' },
        { type: 'sticker', label: 'Nova figurinha', icon: <Sticker size={20} />, color: 'bg-[#02a698]' },
    ];

    return (
        <div
            ref={menuRef}
            className="absolute bottom-16 left-4 bg-[#233138] rounded-2xl shadow-[0_4px_20px_0_rgba(0,0,0,0.5)] py-2 z-50 w-64 animate-in slide-in-from-bottom-5 fade-in duration-200 border border-[#303d45]"
        >
            <ul className="flex flex-col">
                {menuItems.map((item) => (
                    <li key={item.type}>
                        <button
                            onClick={() => {
                                onSelect(item.type as any);
                                onClose();
                            }}
                            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#182229] transition-colors text-left"
                        >
                            <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-white shadow-sm`}>
                                {item.icon}
                            </div>
                            <span className="text-[#e9edef] text-[16px] font-normal">
                                {item.label}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AttachmentMenu;
