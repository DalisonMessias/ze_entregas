
import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Lock, LogIn, UploadCloud, DownloadCloud, AlertCircle, CheckCircle, LogOut, Eye, EyeOff } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { formatPhoneNumber } from '../utils/mapHelpers';

export const CloudSync: React.FC = () => {
  const [auth, setAuth] = useState({ email: '', password: '', name: '', phone: '' });
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info', text: string } | null>(null);
  const [initialized, setInitialized] = useState(false);
  // NOVO: Estado para alternar entre login e cadastro
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login'); 
  const [showPassword, setShowPassword] = useState(false);

  // Ref para verificar se o componente ainda está montado antes de atualizar o estado em callbacks assíncronos
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true; // Componente montado
    let isMounted = true; // Flag local para este efeito

    const client = cloud.initSupabase();
    if (!client) {
      if (isMounted) {
        setMessage({ type: 'error', text: 'Falha ao iniciar o serviço de nuvem.' });
        setInitialized(true);
      }
      return;
    }

    const checkSession = async () => {
      try {
        const { data } = await (client.auth as any).getSession();
        if (isMounted) {
          setUser(data.session?.user ?? null);
        }
      } catch (err) {
        console.error("Erro ao verificar sessão:", err);
      } finally {
        if (isMounted) {
           setInitialized(true);
        }
      }
    };
    
    checkSession();

    const { data: authListener } = client.auth.onAuthStateChange(async (_event, session) => {
      if (isMountedRef.current) { // Usar isMountedRef para verificar montagem
        setUser(session?.user ?? null);
        setLoading(false);
        if (!initialized) setInitialized(true);
        
        if (_event === 'SIGNED_IN') {
          setMessage({ type: 'success', text: 'Conectado com sucesso!' });
        }
      }
    });

    return () => {
      isMountedRef.current = false; // Componente desmontado
      isMounted = false; // Cleanup local flag
      if (authListener?.subscription && typeof authListener.subscription.unsubscribe === 'function') {
        try {
          authListener.subscription.unsubscribe();
        } catch (e) {
          console.warn("Erro ao remover listener de auth:", e);
        }
      }
    };
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    setMessage(null);
    const client = cloud.getClient();
    if (!client) {
      setLoading(false);
      setMessage({ type: 'error', text: 'Erro de conexão com servidor.' });
      return;
    }

    // Validação para campos de email e senha (comuns a login e cadastro)
    if (!auth.email || !auth.password) {
      setMessage({ type: 'error', text: 'Preencha e-mail e senha.' });
      setLoading(false);
      return;
    }

    if (auth.password.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      setLoading(false);
      return;
    }

    // Validação adicional para cadastro (campos obrigatórios)
    if (authMode === 'signup') {
        if (!auth.name.trim()) {
            setMessage({ type: 'error', text: 'Por favor, preencha seu nome completo.' });
            setLoading(false);
            return;
        }
        if (!auth.phone.trim()) {
            setMessage({ type: 'error', text: 'Por favor, preencha seu telefone.' });
            setLoading(false);
            return;
        }
    }

    try {
      const { error } = authMode === 'signup' 
        ? await (client.auth as any).signUp({ 
            email: auth.email, 
            password: auth.password,
            options: {
                data: {
                    name: auth.name,
                    phone: auth.phone
                }
            }
          })
        : await (client.auth as any).signInWithPassword({ email: auth.email, password: auth.password });

      if (error) throw error;
      
      if (authMode === 'signup') {
        setMessage({ type: 'success', text: 'Conta criada e conectada!' });
      }

    } catch (e: any) {
      console.error(e);
      let errorMsg = e.message || 'Erro na autenticação';
      
      if (errorMsg.includes('Invalid login credentials')) {
         setMessage({ type: 'info', text: 'Conta não encontrada ou senha incorreta. Verifique seus dados.' });
      } else if (errorMsg.includes('Anonymous')) {
         errorMsg = 'Erro de configuração. Verifique se o provedor de E-mail está ativo no Supabase.';
         setMessage({ type: 'error', text: errorMsg });
      } else if (errorMsg.includes('User already registered')) {
         setMessage({ type: 'info', text: 'Este e-mail já está cadastrado. Tente entrar.' });
         setAuthMode('login'); // Sugerir login se já cadastrado
      } else if (errorMsg.includes('rate limit')) {
         setMessage({ type: 'error', text: 'Muitas tentativas. Aguarde um pouco.' });
      } else {
          setMessage({ type: 'error', text: errorMsg });
      }
    } finally {
      if (isMountedRef.current) { // Verificar se o componente ainda está montado
        setLoading(false);
      }
    }
  };
  
  const handleUpload = async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);
    try {
      await cloud.uploadBackup(user.id);
      setMessage({ type: 'success', text: 'Dados salvos na nuvem com sucesso!' });
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Erro ao enviar: ' + e.message });
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);
    try {
      const success = await cloud.downloadBackup(user.id);
      if (success) {
        alert("Backup restaurado! O app será recarregado.");
        window.location.reload();
      } else {
        throw new Error("Falha ao restaurar dados locais");
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Erro ao baixar: ' + e.message });
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleLogout = async () => {
    await cloud.signOut();
    setMessage(null);
    setAuth({ email: '', password: '', name: '', phone: '' });
  };

  const getMessageStyles = (type: 'error' | 'success' | 'info') => {
      switch(type) {
          case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
          case 'success': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
          case 'info': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

  if (!initialized) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 animate-in fade-in">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-300">
           Crie uma conta ou entre para sincronizar seus dados na nuvem e nunca perder seu histórico.
        </div>
        
        {/* Toggle between Login and Create Account */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl mb-4">
            <button 
                onClick={() => { setAuthMode('login'); setMessage(null); }} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${authMode === 'login' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-600' : 'text-gray-500'}`}
            >
                Entrar
            </button>
            <button 
                onClick={() => { setAuthMode('signup'); setMessage(null); }} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${authMode === 'signup' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-600' : 'text-gray-500'}`}
            >
                Criar Conta
            </button>
        </div>

        {message && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${getMessageStyles(message.type)}`}>
                {message.type === 'info' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {message.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {message.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                {message.text}
            </div>
        )}

        {authMode === 'login' && (
          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={auth.email} 
                    onChange={e => setAuth({...auth, email: e.target.value})} 
                    className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" 
                    placeholder="seu@email.com" 
                    required
                    autoFocus
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Senha</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={auth.password} 
                      onChange={e => setAuth({...auth, password: e.target.value})} 
                      className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none pr-10" 
                      placeholder="******" 
                      required
                    />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
              </div>
              <Button fullWidth onClick={handleAuth} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
          </div>
        )}

        {authMode === 'signup' && (
          <div className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={auth.name} 
                    onChange={e => setAuth({...auth, name: e.target.value})} 
                    className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" 
                    placeholder="Seu nome completo" 
                    required
                    autoFocus
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Telefone</label>
                  <input 
                    type="tel" 
                    inputMode="tel"
                    value={auth.phone} 
                    onChange={e => setAuth({...auth, phone: formatPhoneNumber(e.target.value)})} 
                    maxLength={15}
                    className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" 
                    placeholder="(XX) XXXXX-XXXX" 
                    required
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={auth.email} 
                    onChange={e => setAuth({...auth, email: e.target.value})} 
                    className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none" 
                    placeholder="seu@email.com" 
                    required
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Senha (min. 6 dígitos)</label>
                   <div className="relative">
                    <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={auth.password} 
                        onChange={e => setAuth({...auth, password: e.target.value})} 
                        className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none pr-10" 
                        placeholder="******" 
                        required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
              </div>
              <Button fullWidth onClick={handleAuth} disabled={loading}>
                {loading ? 'Criando Conta...' : 'Criar Conta'}
              </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
       <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full text-green-600 dark:text-green-300">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">Conectado</div>
            <div className="text-xs text-gray-500">{user?.email}</div>
          </div>
       </div>

       <div className="grid grid-cols-1 gap-4">
          <button onClick={handleUpload} disabled={loading} className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
             <div className="flex items-center gap-3">
                <UploadCloud className="w-6 h-6 text-blue-500" />
                <div className="text-left">
                   <div className="font-bold dark:text-white">Enviar Backup</div>
                   <div className="text-xs text-gray-400">Salvar histórico, endereços e dados bancários</div>
                </div>
             </div>
          </button>

          <button onClick={handleDownload} disabled={loading} className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
             <div className="flex items-center gap-3">
                <DownloadCloud className="w-6 h-6 text-orange-500" />
                <div className="text-left">
                   <div className="font-bold dark:text-white">Baixar Backup</div>
                   <div className="text-xs text-gray-400">Restaurar dados da nuvem</div>
                </div>
             </div>
          </button>
       </div>

       {message && (
            <div className={`p-3 rounded-lg text-sm text-center ${getMessageStyles(message.type)}`}>
                {message.text}
            </div>
       )}

       <button onClick={handleLogout} className="w-full py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center justify-center gap-2">
         <LogOut className="w-4 h-4" /> Sair da Nuvem
       </button>
    </div>
  );
};