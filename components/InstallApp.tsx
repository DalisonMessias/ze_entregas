import React, { useEffect, useState } from 'react';
import { Smartphone, Download, Info, Apple, Chrome, MonitorSmartphone, CheckCircle, AlertTriangle } from 'lucide-react';

interface InstallAppProps {
  onBack?: () => void;
}

export const InstallApp: React.FC<InstallAppProps> = ({ onBack }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<'android_chrome' | 'ios_safari' | 'desktop_chrome' | 'unknown'>('unknown');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const ua = navigator.userAgent || '';
      const vendor = (navigator as any).vendor || '';
      const isIOS = /iPhone|iPad|iPod/i.test(ua);
      const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua) && /Apple/i.test(vendor);
      const isAndroid = /Android/i.test(ua);
      const isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua) && !/OPR/i.test(ua);
      const isDesktop = !isIOS && !isAndroid;

      if (isIOS && isSafari) setPlatform('ios_safari');
      else if (isAndroid && isChrome) setPlatform('android_chrome');
      else if (isDesktop && isChrome) setPlatform('desktop_chrome');
      else setPlatform('unknown');

      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setCanInstall(true);
      };
      const onInstalled = () => setInstalled(true);
      window.addEventListener('beforeinstallprompt', handler as EventListener);
      window.addEventListener('appinstalled', onInstalled as EventListener);

      const checkInstalled = async () => {
        try {
          const inStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
          if (inStandalone) { setInstalled(true); return; }

          if ('getInstalledRelatedApps' in navigator) {
            const getRel = (navigator as any).getInstalledRelatedApps.bind(navigator);
            const related = await getRel();
            if (Array.isArray(related) && related.length > 0) { setInstalled(true); return; }
          }
        } catch (err: any) {
          console.warn('Check installed failed (likely insecure context or unsupported):', err);
          // Don't show error to user for a failed background check
        }
      };

      void checkInstalled();

      const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.zeentregas';
      const DESKTOP_HELP_URL = 'https://support.google.com/chrome/answer/9658361?hl=pt-BR';
      const IOS_HELP_URL = 'https://support.apple.com/pt-br/HT208982';

      if (isAndroid && isChrome) setDownloadUrl(PLAY_STORE_URL);
      else if (isDesktop && isChrome) setDownloadUrl(DESKTOP_HELP_URL);
      else if (isIOS && isSafari) setDownloadUrl(IOS_HELP_URL);
      else setDownloadUrl(null);

      return () => {
        window.removeEventListener('beforeinstallprompt', handler as EventListener);
        window.removeEventListener('appinstalled', onInstalled as EventListener);
      };
    } catch (err: any) {
      setError('Erro ao detectar plataforma');
    }
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice && choice.outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  return (
    <div className="animate-in fade-in space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs">Voltar</button>
        )}
      </div>

      <div className="text-center">
        <Smartphone className="w-10 h-10 text-brand-500 mx-auto mb-2" />
        <h3 className="text-lg font-black text-gray-900 dark:text-white">Instalar App</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Adicione o Zé Entregas à tela inicial para uma experiência completa.</p>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Android / Chrome Section */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-2">
            <Chrome className="w-5 h-5 text-brand-600" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Android / Google Chrome</h4>
          </div>
          {installed ? (
            <div className="mt-2 p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> App instalado neste dispositivo.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Para instalar no Android:
                <br />• Abra o menu do Chrome (três pontos no canto superior direito).
                <br />• Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
              </p>
              {downloadUrl && platform === 'android_chrome' && (
                <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-block text-xs text-brand-700 underline font-medium">Saiba mais na Play Store</a>
              )}
            </div>
          )}
        </div>

        {/* Desktop / Chrome Section */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-2">
            <MonitorSmartphone className="w-5 h-5 text-brand-600" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Computador / Google Chrome</h4>
          </div>
          {installed ? (
            <div className="mt-2 p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> App instalado neste computador.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Para instalar no computador:
                <br />• Clique no ícone de <strong>Instalar</strong> na barra de endereços (ao lado da estrela de favoritos).
                <br />• Ou abra o menu (três pontos) e vá em <strong>"Salvar e Compartilhar"</strong> → <strong>"Instalar Zé Entregas"</strong>.
              </p>
              {downloadUrl && platform === 'desktop_chrome' && (
                <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-block text-xs text-brand-700 underline font-medium">Guia de instalação Desktop</a>
              )}
            </div>
          )}
        </div>

        {/* iOS Section */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-2">
            <Apple className="w-5 h-5 text-brand-600" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">iPhone / iPad (Safari)</h4>
          </div>
          {installed ? (
            <div className="mt-2 p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> App instalado neste dispositivo.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Para instalar no iOS:
                <br />• Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra inferior.
                <br />• Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.
              </p>
              {downloadUrl && platform === 'ios_safari' && (
                <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-block text-xs text-brand-700 underline font-medium">Guia de instalação iOS</a>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-brand-50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-brand-600" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Dicas Úteis</h4>
          </div>
          <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5 list-disc list-inside">
            <li>Ative notificações para receber alertas de novos pedidos.</li>
            <li>O app instalado economiza dados e carrega mais rápido.</li>
            <li>Use sempre o navegador oficial (Chrome para Android/PC, Safari para iOS).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
