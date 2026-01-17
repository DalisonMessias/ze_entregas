import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Loader2, Smile, Mic, Plus } from 'lucide-react';
import AttachmentMenu from './AttachmentMenu';

interface MessageInputProps {
  onSend: (text: string) => void;
  onSendMedia?: (file: File) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend, onSendMedia }) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowMenu(false);
    }
  };

  const handleMenuSelect = (type: string) => {
    if (type === 'image') {
      fileInputRef.current?.setAttribute('accept', 'image/*,video/*');
      fileInputRef.current?.click();
    } else if (type === 'document') {
      fileInputRef.current?.setAttribute('accept', '*/*');
      fileInputRef.current?.click();
    } else if (type === 'pix') {
      const pixKey = "00020126580014BR.GOV.BCB.PIX013612345678-1234-1234-1234-1234567890125204000053039865802BR5913LOJAEXEMPLO6008CIDADE62070503***63041234";
      onSend(`Chave PIX da Loja:\n${pixKey}\n\nPor favor, envie o comprovante após o pagamento.`);
      setShowMenu(false);
    } else if (type === 'camera') {
      fileInputRef.current?.setAttribute('accept', 'image/*');
      fileInputRef.current?.setAttribute('capture', 'environment');
      fileInputRef.current?.click();
    }
  };

  const handleSendMedia = async () => {
    if (selectedFile && onSendMedia) {
      setIsUploading(true);
      try {
        await onSendMedia(selectedFile);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Erro ao enviar mídia:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const cancelMedia = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full relative">
      <AttachmentMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        onSelect={handleMenuSelect}
      />

      {/* Preview de Arquivo */}
      {selectedFile && (
        <div className="absolute bottom-full w-full px-4 py-2 bg-[#F0F2F5] border-t border-gray-200 flex items-center justify-between animate-in slide-in-from-bottom-2 z-10">
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
            <div className="bg-gray-100 p-2 rounded">
              <Paperclip size={20} className="text-gray-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelMedia}
              className="p-2 hover:bg-gray-200 rounded-full text-red-500 transition-colors"
              disabled={isUploading}
            >
              <X size={20} />
            </button>
            <button
              onClick={handleSendMedia}
              disabled={isUploading}
              className="p-2 bg-[#00A884] hover:bg-[#008f6f] text-white rounded-full transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* Barra de Input */}
      <div className="relative px-4 py-2 bg-[#F0F2F5] flex items-end gap-2 items-center z-20">
        <input
          ref={fileInputRef}
          className="hidden"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
          type="file"
          onChange={handleFileSelect}
        />

        <div className="flex gap-2 text-[#54656F] mb-1">
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <Smile size={24} />
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-full transition-colors ${showMenu ? 'bg-gray-200 text-[#111B21]' : 'hover:bg-gray-200'}`}
            title="Anexar"
          >
            <Plus size={24} className={`transition-transform duration-200 ${showMenu ? 'rotate-45' : ''}`} />
          </button>
        </div>

        <div className="flex-1 bg-white rounded-lg flex items-center border border-white focus-within:border-white py-1">
          <input
            placeholder="Digite uma mensagem"
            className="flex-1 px-4 py-1.5 bg-transparent focus:outline-none text-[#111B21] placeholder:text-gray-500 text-[15px] h-full"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        </div>

        <div className="mb-1">
          {text.trim() ? (
            <button
              onClick={handleSend}
              className="p-2 text-[#54656F] hover:text-[#111B21] transition-colors"
            >
              <Send size={24} />
            </button>
          ) : (
            <button className="p-2 text-[#54656F] hover:text-[#111B21] transition-colors">
              <Mic size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
