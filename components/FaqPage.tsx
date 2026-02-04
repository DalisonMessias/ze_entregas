import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, HelpCircle, Home, MessageCircle, Search, UserCircle2 } from 'lucide-react';
import * as cloud from '../services/cloud';
import { InstitutionalContent } from '../types';
import { Button } from './Button';
import { Logo } from './Logo';

export const FaqPage: React.FC = () => {
  const [items, setItems] = useState<InstitutionalContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return items;
    return items.filter((item) => {
      const title = item.title?.toLowerCase() || '';
      const description = item.description?.toLowerCase() || '';
      return title.includes(trimmed) || description.includes(trimmed);
    });
  }, [items, query]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    cloud.listInstitutionalPublic('faq')
      .then((data) => {
        if (mounted) setItems(data);
      })
      .catch(() => {
        if (mounted) setItems([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const sb = cloud.getClient();
    if (!sb) {
      setCheckingSession(false);
      return;
    }
    sb.auth.getSession()
      .then(({ data }) => {
        if (mounted) setHasSession(!!data.session);
      })
      .finally(() => {
        if (mounted) setCheckingSession(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const showPublicHeader = !checkingSession;
  const primaryCtaLabel = hasSession ? 'Meu painel' : 'Entrar';
  const primaryCtaLink = hasSession ? '/home' : '/login';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {showPublicHeader && (
        <header className="sticky top-0 z-40 bg-brand-600 text-white backdrop-blur border-b border-brand-700/60">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-3 text-left"
            >
              <Logo className="h-8 w-auto" mode="icon" variant="full-white" />
              <div>
                <p className="text-xs uppercase tracking-widest text-white/80 font-black">Central de Ajuda</p>
                <p className="text-sm font-black text-white">Perguntas Frequentes</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => window.location.href = primaryCtaLink}
                variant="outline"
                className="font-black text-sm !text-white !border-white/40 hover:!bg-brand-700 hover:!border-white/60"
              >
                {primaryCtaLabel}
              </Button>
              {!hasSession && (
                <Button
                  onClick={() => window.location.href = '/cadastro'}
                  className="font-black text-sm !bg-white/15 !text-white !border-white/20 hover:!bg-brand-700"
                >
                  Criar conta
                </Button>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-8 md:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-black uppercase tracking-widest mb-6">
                <HelpCircle className="w-4 h-4" />
                Ajuda rapida
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Encontre respostas para as duvidas mais comuns.
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mt-4 max-w-xl">
                Pesquise por assunto ou explore as perguntas abaixo. Tudo direto e sem complicar.
              </p>

              <div className="mt-6 relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Busque por pagamento, entrega, cadastro..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-gray-400">
                {['Entrega', 'Pagamento', 'Cadastro', 'Conta', 'Suporte'].map((label) => (
                  <span key={label} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Precisa de ajuda?</h3>
                  <MessageCircle className="w-5 h-5 text-brand-600" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Nosso suporte responde rapido pelo app e WhatsApp.
                </p>
                <Button
                  onClick={() => window.location.href = '/suporte'}
                  className="w-full font-black"
                >
                  Falar com suporte
                </Button>
              </div>

              <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Voltar para a home</h3>
                  <Home className="w-5 h-5 text-brand-600" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Veja lojas disponiveis e acompanhe seu pedido.
                </p>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full font-black"
                >
                  Ir para a home
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Perguntas</h2>
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                {filteredItems.length} resultados
              </span>
            </div>

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse border border-gray-100 dark:border-gray-700" />
                ))}
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-7 h-7 text-brand-600" />
                </div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2">Ainda nao ha perguntas publicadas</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Assim que novas respostas forem publicadas, elas aparecerao aqui.
                </p>
                <Button
                  onClick={() => window.location.href = '/suporte'}
                  className="px-6 py-3 rounded-xl font-black"
                >
                  Falar com suporte
                </Button>
              </div>
            )}

            {!loading && items.length > 0 && filteredItems.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
                <h3 className="text-base font-black text-gray-900 dark:text-white mb-2">Nenhum resultado encontrado</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tente outro termo ou limpe a busca para ver todas as perguntas.
                </p>
              </div>
            )}

            {!loading && filteredItems.length > 0 && (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <details key={item.id} className="group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                    <summary className="font-black text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between">
                      <span>{item.title}</span>
                      <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
                    </summary>
                    {item.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
                        {item.description}
                      </p>
                    )}
                  </details>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-black text-gray-900 dark:text-white mb-3">Links rapidos</h3>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.href = '/suporte'}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Suporte
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => window.location.href = '/login'}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Entrar
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => window.location.href = '/cadastro'}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Criar conta
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <UserCircle2 className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-black">Conta</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">Acesse seu historico</p>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = primaryCtaLink}
                variant="outline"
                className="w-full font-black"
              >
                {primaryCtaLabel}
              </Button>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default FaqPage;
