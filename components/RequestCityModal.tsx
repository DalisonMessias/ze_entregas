import React, { useState } from 'react';
import { MapPin, Mail, Send, CheckCircle2 } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

interface RequestCityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RequestCityModal: React.FC<RequestCityModalProps> = ({ isOpen, onClose }) => {
    const [cityName, setCityName] = useState('');
    const [state, setState] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { alert } = useDialog();

    const states = [
        { value: 'AC', label: 'Acre' },
        { value: 'AL', label: 'Alagoas' },
        { value: 'AP', label: 'Amapá' },
        { value: 'AM', label: 'Amazonas' },
        { value: 'BA', label: 'Bahia' },
        { value: 'CE', label: 'Ceará' },
        { value: 'DF', label: 'Distrito Federal' },
        { value: 'ES', label: 'Espírito Santo' },
        { value: 'GO', label: 'Goiás' },
        { value: 'MA', label: 'Maranhão' },
        { value: 'MT', label: 'Mato Grosso' },
        { value: 'MS', label: 'Mato Grosso do Sul' },
        { value: 'MG', label: 'Minas Gerais' },
        { value: 'PA', label: 'Pará' },
        { value: 'PB', label: 'Paraíba' },
        { value: 'PR', label: 'Paraná' },
        { value: 'PE', label: 'Pernambuco' },
        { value: 'PI', label: 'Piauí' },
        { value: 'RJ', label: 'Rio de Janeiro' },
        { value: 'RN', label: 'Rio Grande do Norte' },
        { value: 'RS', label: 'Rio Grande do Sul' },
        { value: 'RO', label: 'Rondônia' },
        { value: 'RR', label: 'Roraima' },
        { value: 'SC', label: 'Santa Catarina' },
        { value: 'SP', label: 'São Paulo' },
        { value: 'SE', label: 'Sergipe' },
        { value: 'TO', label: 'Tocantins' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cityName || !state) {
            await alert({ title: 'Atenção', message: 'Por favor, preencha o nome da cidade e o estado.' });
            return;
        }

        setLoading(true);
        try {
            await cloud.requestNewCity(cityName, state, email);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setCityName('');
                setState('');
                setEmail('');
                onClose();
            }, 3000);
        } catch (error) {
            console.error('Error requesting city:', error);
            await alert({ title: 'Erro', message: 'Não foi possível enviar sua solicitação agora. Tente novamente mais tarde.' });
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <BaseModal isOpen={isOpen} onClose={onClose} title="Solicitação Enviada!">
                <div className="py-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Obrigado pelo seu pedido!</h4>
                    <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto font-medium">
                        Recebemos sua solicitação para <span className="text-brand-600 font-bold">{cityName} - {state}</span>.
                        Vamos analisar e avisar quando o Zé chegar por lá!
                    </p>
                </div>
            </BaseModal>
        );
    }

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Solicitar Minha Cidade"
            icon={<MapPin className="w-6 h-6 text-brand-600" />}
        >
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-brand-50/50 dark:bg-brand-900/10 p-4 rounded-2xl border border-brand-100 dark:border-brand-900/20">
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium text-center italic">
                        "Ainda não entregamos na sua região? Peça para o Zé chegar aí e seja avisado assim que expandirmos!"
                    </p>
                </div>

                <div className="space-y-5">
                    <CustomInput
                        label="Nome da Cidade"
                        placeholder="Ex: Belo Horizonte"
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                        required
                        icon={MapPin}
                    />

                    <CustomSelect
                        label="Estado"
                        value={state}
                        onChange={(val) => setState(val)}
                        options={states}
                        className="w-full"
                    />

                    <CustomInput
                        label="Seu Melhor Email"
                        type="email"
                        placeholder="para avisarmos quando chegarmos"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={Mail}
                        helperText="Prometemos não enviar spam, apenas boas notícias!"
                    />
                </div>

                <div className="pt-4">
                    <Button
                        fullWidth
                        type="submit"
                        disabled={loading}
                        className="py-5 text-lg font-black bg-brand-600 shadow-xl shadow-brand-600/20 hover:scale-[1.02] transition-transform active:scale-95"
                    >
                        {loading ? 'Enviando sua vontade...' : (
                            <div className="flex items-center justify-center gap-3">
                                <Send className="w-6 h-6" />
                                <span>Solicitar Agora</span>
                            </div>
                        )}
                    </Button>
                </div>
            </form>
        </BaseModal>
    );
};
