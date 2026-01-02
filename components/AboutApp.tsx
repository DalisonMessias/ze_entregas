import React, { useEffect, useState } from 'react';
import * as cloud from '../services/cloud';
import { InstitutionalContent } from '../types';
import { Play, Plus, Calculator, TrendingDown, Trophy, Share2, MapPin, BarChart3, Wrench, Cloud, Download, ShieldAlert, Info, Mic } from 'lucide-react';

const FeatureItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-brand-600 dark:text-brand-400">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{title}</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  </div>
);

export const AboutApp: React.FC = () => {
  const [items, setItems] = useState<InstitutionalContent[]>([]);
  useEffect(() => {
    const load = () => cloud.getInstitutionalPublic('about').then(setItems).catch(() => setItems([]));
    load();
    const ch = cloud.subscribeInstitutionalChanges('about', load);
    return () => { try { ch?.unsubscribe(); } catch {} };
  }, []);
  const hasDynamic = items.length > 0;
  return (
    <div className="animate-in fade-in space-y-6">
      <div className="text-center">
        <Info className="w-10 h-10 text-brand-500 mx-auto mb-2" />
        <h3 className="text-lg font-black text-gray-900 dark:text-white">Sobre o Zé Entregas</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Seu assistente de entregas completo.</p>
      </div>

      {hasDynamic ? (
        <div className="space-y-4">
          {items.map(i => (
            <div key={i.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-brand-600 dark:text-brand-400">
                <Info size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{i.title}</h4>
                {i.description && <p className="text-xs text-gray-500 dark:text-gray-400">{i.description}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-xs uppercase text-gray-400 mb-2">Controle Diário</h4>
            <div className="space-y-2">
              <FeatureItem icon={<Play size={20}/>} title="Início e Fim de Dia" description="Comece sua jornada de trabalho e encerre para salvar um resumo detalhado no seu histórico." />
              <FeatureItem icon={<Plus size={20}/>} title="Entrega Rápida" description="Adicione entregas padrão com apenas um clique, usando o valor que você definiu." />
              <FeatureItem icon={<Calculator size={20}/>} title="Entregas Extras" description="Registre corridas com valor fixo, por KM ou uma combinação dos dois." />
              <FeatureItem icon={<TrendingDown size={20}/>} title="Registro de Gastos" description="Anote despesas como combustível e alimentação para um balanço financeiro preciso." />
              <FeatureItem icon={<Trophy size={20}/>} title="Meta Diária" description="Defina um objetivo de lucro para o dia e acompanhe seu progresso em tempo real." />
            </div>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase text-gray-400 mb-2">Ferramentas e Relatórios</h4>
            <div className="space-y-2">
              <FeatureItem icon={<Mic size={20}/>} title="Busca por Voz" description="Pesquise endereços na sua agenda de forma rápida usando sua voz." />
              <FeatureItem icon={<Share2 size={20}/>} title="Resumo do Dia" description="Compartilhe uma imagem estilizada do seu faturamento diário nas redes sociais." />
              <FeatureItem icon={<MapPin size={20}/>} title="Agenda de Endereços" description="Salve endereços frequentes para agilizar o início de novas rotas." />
              <FeatureItem icon={<BarChart3 size={20}/>} title="Relatórios de Desempenho" description="Analise seus ganhos, quantidade de entregas e gastos em gráficos semanais ou mensais." />
              <FeatureItem icon={<Wrench size={20}/>} title="Controle de Manutenção" description="Monitore a vida útil de itens como óleo e pneus com base na quilometragem." />
            </div>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase text-gray-400 mb-2">Segurança e Privacidade</h4>
            <div className="space-y-2">
              <FeatureItem icon={<Cloud size={20}/>} title="Backup na Nuvem (Opcional)" description="Crie uma conta para salvar seus dados com segurança e restaurá-los em qualquer dispositivo." />
              <FeatureItem icon={<Download size={20}/>} title="Backup Local" description="Exporte e importe um arquivo de backup local a qualquer momento, sem precisar de conta." />
              <FeatureItem icon={<ShieldAlert size={20}/>} title="Modo Híbrido" description="Funcionalidades essenciais disponíveis via cache. Sincronize seus dados assim que estiver online." />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
