import React, { useState } from 'react';
import { Share2, X, Package, Gauge, Camera, Image as ImageIcon, Copy, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Logo } from './Logo';

interface ShareCardProps {
  data: {
    value: number;
    count: number;
    km: number;
    date: string;
  };
  onClose: () => void;
}

// Componente Visual do Cartão (Reutilizável para garantir consistência)
const TicketCard = ({ data, className = "" }: { data: any, className?: string }) => {
  const formatValue = (val: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <div className={`bg-white rounded-[24px] overflow-hidden shadow-2xl relative flex flex-col w-[350px] ${className}`}>
      {/* Top Section (Red) */}
      <div className="bg-brand-600 p-8 text-center relative overflow-hidden pb-12">
          <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
          
          <div className="relative z-10">
            <div className="inline-block px-3 py-1 bg-black/20 rounded-full text-[10px] font-bold text-white uppercase tracking-wider mb-2 border border-white/10">
              Resumo do Dia
            </div>
            <div className="text-brand-100 font-medium text-sm mb-6">{data.date}</div>
            
            <div className="flex flex-col items-center">
                <div className="text-brand-100 text-xs font-bold uppercase tracking-widest mb-1">Lucro Líquido</div>
                <div className="flex items-baseline justify-center text-white">
                  <span className="text-2xl font-bold opacity-80 mr-1">R$</span>
                  <span className="text-6xl font-black tracking-tighter">{formatValue(data.value)}</span>
                </div>
            </div>
          </div>
      </div>

      {/* Divider with Cutouts */}
      <div className="relative h-6 bg-white -mt-3">
          {/* Use transparent background for cutouts to work on dark/image backgrounds if needed, but here we assume gray-900 context in preview or white/transparent in export */}
          {/* Note: In the preview modal, the background is gray-900. In export, it might be different. 
              To fix "Exactly Equal", we color the cutouts to match the CONTAINER background. 
              In the preview, it's gray-800 (dark mode) or white. 
              Wait, the card itself is white. The cutouts "bite" into the card. 
              So the cutout color must match the background BEHIND the card.
          */}
          <div className="absolute top-0 left-0 -mt-3 -ml-3 w-6 h-6 bg-[#111827] rounded-full z-20"></div> {/* Matches Modal Backdrop roughly or Dark Bg */}
          <div className="absolute top-0 right-0 -mt-3 -mr-3 w-6 h-6 bg-[#111827] rounded-full z-20"></div>
          <div className="absolute top-1/2 left-4 right-4 border-t-2 border-dashed border-gray-200"></div>
      </div>

      {/* Bottom Section (Details) */}
      <div className="bg-white p-6 pt-2">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex flex-col items-center">
                <div className="bg-blue-100 p-2 rounded-full mb-2">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-2xl font-black text-gray-800">{data.count}</span>
                <span className="text-[10px] uppercase font-bold text-gray-400">Entregas</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex flex-col items-center">
                <div className="bg-orange-100 p-2 rounded-full mb-2">
                  <Gauge className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-2xl font-black text-gray-800">{data.km.toFixed(0)}</span>
                <span className="text-[10px] uppercase font-bold text-gray-400">KM Rodados</span>
            </div>
          </div>

          <div className="flex justify-center items-center gap-2 opacity-50 grayscale">
            <Logo className="h-6 w-auto" />
          </div>
      </div>
    </div>
  );
};

export const ShareCard: React.FC<ShareCardProps> = ({ data, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getShareText = () => {
    return `🚀 *Resumo Zé Entregas* 🚀\n📅 ${data.date}\n\n💰 *Lucro:* ${formatCurrency(data.value)}\n📦 *Entregas:* ${data.count}\n🏍️ *Distância:* ${data.km.toFixed(1)} km\n\n_Gerado pelo app Zé Entregas_`;
  };

  const handleCopyText = async () => {
    const text = getShareText();
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 3000);
    } catch (err) {
      alert('Não foi possível copiar automaticamente.');
    }
  };

  const handleShareNative = async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Resumo de Entregas',
          text: text,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      handleCopyText();
    }
  };

  const handleDownloadImage = async (templateId: string, filename: string) => {
    setIsGenerating(true);
    try {
      const element = document.getElementById(templateId);
      if (!element) return;

      await document.fonts.ready;

      // Use scale option in html2canvas for better resolution of the transform-scaled element
      const canvas = await html2canvas(element, {
        scale: 1, // Capture at 1:1 of the ALREADY SCALED element
        useCORS: true,
        backgroundColor: '#111827', // Gray-900 background for the image
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${filename}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error("Erro ao gerar imagem", err);
      alert("Erro ao gerar a imagem. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col gap-4">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center text-white px-2">
          <h3 className="font-bold text-xl">Compartilhar</h3>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* VISIBLE PREVIEW */}
        <div className="flex justify-center py-4">
           {/* Rendering the component directly for preview */}
           <TicketCard data={data} />
        </div>

        {/* Action Buttons Row 1: Images */}
        <div className="grid grid-cols-2 gap-3">
           <button 
              onClick={() => handleDownloadImage('template-post', 'ze_post')}
              disabled={isGenerating}
              className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
           >
              <ImageIcon className="w-5 h-5 text-pink-500" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Baixar Post</span>
           </button>

           <button 
              onClick={() => handleDownloadImage('template-story', 'ze_story')}
              disabled={isGenerating}
              className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
           >
              <Camera className="w-5 h-5 text-purple-500" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Baixar Story</span>
           </button>
        </div>

        {/* Action Buttons Row 2: Text Actions */}
        <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-lg flex">
          <button 
            onClick={handleCopyText}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${hasCopied ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {hasCopied ? 'Copiado' : 'Copiar Texto'}
          </button>
          <div className="w-px bg-gray-100 dark:bg-gray-700 my-2"></div>
          <button 
            onClick={handleShareNative}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-bold text-sm text-brand-600 dark:text-brand-400"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar
          </button>
        </div>

      </div>

      {/* 
        HIDDEN HIGH-RES TEMPLATES 
        We use CSS transform scale to reuse the EXACT same component markup.
        This ensures 100% visual fidelity with the screen version.
      */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
        
        {/* POST TEMPLATE (1080x1080) */}
        <div id="template-post" style={{ width: '1080px', height: '1080px' }} className="bg-gray-900 flex items-center justify-center relative overflow-hidden">
             {/* Scale 350px card to fit nicely in 1080px (approx 3x) */}
             <div style={{ transform: 'scale(2.5)' }}>
                <TicketCard data={data} />
             </div>
        </div>

        {/* STORY TEMPLATE (1080x1920) */}
        <div id="template-story" style={{ width: '1080px', height: '1920px' }} className="bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden">
             {/* Scale 350px card to fit nicely in 1080px */}
             <div style={{ transform: 'scale(2.5)' }}>
                <TicketCard data={data} />
             </div>
             
             <div className="absolute bottom-20 text-white/50 font-bold text-2xl uppercase tracking-widest">
                Compartilhado via App
             </div>
        </div>

      </div>
    </div>
  );
};