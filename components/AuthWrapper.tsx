import React, { useState, useEffect, useRef } from 'react';
import { App } from './App';
import * as cloud from '../services/cloud';
import { UserRole } from '../types';
import { Ban, CheckCircle, Eye, EyeOff, ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { Button } from './Button';
import { LandingPage } from './LandingPage';
import { CitySelector } from './CitySelector';
import { formatPhoneNumber, formatCpf } from '../utils/mapHelpers'; // Import formatCpf
import { Logo } from './Logo';
import { Skeleton } from './Skeleton';

type AuthView = 'landing' | 'login' | 'signup_city' | 'signup_form' | 'forgot_password';

export const AuthWrapper: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // Fix: Changed initial userRole from 'user' to 'delivery_person'
  const [userRole, setUserRole] = useState<UserRole>('delivery_person');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [view, setView] = useState<AuthView>('landing');
  const [signupType, setSignupType] = useState<'STORE_PARTNER' | 'DELIVERY_PARTNER' | null>(null);

  const [emailOrPhone, setEmailOrPhone] = useState(''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState(''); 
  const [selectedCity, setSelectedCity] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // Helper para tradução de erros do Supabase/Auth
  const getErrorMessage = (error: any) => {
      const msg = error?.message || '';
      if (msg.includes("Invalid login credentials")) return "Credenciais inválidas. Verifique e-mail e senha.";
      if (msg.includes("User already registered")) return "Este usuário já está cadastrado.";
      if (msg.includes("Password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
      if (msg.includes("Database error")) return "Erro ao salvar usuário. Verifique se o e-mail ou telefone já estão em uso."; // Generic but localized
      if (msg.includes("refresh_token")) return "Sessão expirada. Faça login novamente.";
      if (msg.includes("rate limit")) return "Muitas tentativas. Aguarde alguns instantes.";
      if (msg.includes("network") || msg.includes("fetch")) return "Erro de conexão. Verifique sua internet.";
      return "Ocorreu um erro inesperado. Tente novamente.";
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const supabase = cloud.initSupabase();
      
      if (!supabase) {
        if (mounted) setIsCheckingSession(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (initialSession) {
          const [status, role] = await Promise.all([
            cloud.getUserStatus(),
            cloud.getUserRole()
          ]);

          if (mounted) {
            if (status === 'banned') {
              await supabase.auth.signOut();
              setAuthMessage({ type: 'error', text: 'Sua conta foi suspensa.' });
              setSession(null);
              setUserId(null);
              // Fix: Changed 'user' to 'delivery_person'
              setUserRole('delivery_person');
            } else {
              setSession(initialSession);
              setUserId(initialSession.user.id);
              // Fix: Changed 'user' to 'delivery_person'
              setUserRole(role || 'delivery_person');
            }
          }
        }
      } catch (err: any) {
        console.error("Auth Init Error:", err);
        const errorMessage = err?.message || JSON.stringify(err);
        if (errorMessage.includes("Refresh Token") || errorMessage.includes("Invalid Refresh Token")) {
            await cloud.signOut();
            if (mounted) {
                setSession(null);
                setUserId(null);
                // Fix: Changed 'user' to 'delivery_person'
                setUserRole('delivery_person');
            }
        }
      } finally {
        if (mounted) {
          setTimeout(() => setIsCheckingSession(false), 500);
        }
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUserId(null);
          // Fix: Changed 'user' to 'delivery_person'
          setUserRole('delivery_person');
          setView('landing');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession) {
             const status = await cloud.getUserStatus();
             if (status === 'banned') {
                 await supabase.auth.signOut();
                 setAuthMessage({ type: 'error', text: 'Sua conta está suspensa.' });
             } else {
                 const role = await cloud.getUserRole();
                 setSession(currentSession);
                 setUserId(currentSession.user.id);
                 // Fix: Changed 'user' to 'delivery_person'
                 setUserRole(role || 'delivery_person');
             }
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = cloud.getClient();
    if (!supabase) return;

    const channel = supabase
      .channel('public:user_profiles')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.status === 'banned') {
              supabase.auth.signOut();
              alert("Sua conta foi suspensa.");
              return;
          }
          if (payload.new.role) {
            // Fix: Changed 'user' to 'delivery_person' as default/fallback
            setUserRole(payload.new.role.toLowerCase() as UserRole);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      setAuthMessage({ type: 'error', text: 'Preencha todos os campos.' });
      return;
    }
    
    setAuthLoading(true);
    setAuthMessage(null);
    
    try {
      const supabase = cloud.getClient();
      if (!supabase) throw new Error("Erro de conexão.");

      let resolvedEmail = null;
      try {
          resolvedEmail = await cloud.resolveEmailFromIdentifier(emailOrPhone);
      } catch (e) {
          console.log("Resolution failed");
      }
      
      if (!resolvedEmail && emailOrPhone.includes('@')) {
          resolvedEmail = emailOrPhone;
      }
      
      if (!resolvedEmail) {
          throw new Error("Usuário não encontrado.");
      }

      const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
      if (error) throw error;

    } catch (error: any) {
        // Use translation helper
        setAuthMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailOrPhone || !emailOrPhone.includes('@')) {
      setAuthMessage({ type: 'error', text: 'Informe um e-mail válido para recuperação.' });
      return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      await cloud.sendPasswordResetEmail(emailOrPhone);
      setAuthMessage({ type: 'success', text: 'E-mail de recuperação enviado!' });
    } catch (error: any) {
        // Use translation helper
        setAuthMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !password || !phone) {
        setAuthMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
        return;
    }

    if (signupType === 'DELIVERY_PARTNER' && !selectedCity) {
        setAuthMessage({ type: 'error', text: 'Selecione uma cidade de atuação.' });
        return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
        // CORREÇÃO CRÍTICA: Converter role para minúsculo para bater com o ENUM do banco de dados
        // Mapeia o tipo de cadastro para o role correto no DB
        let roleToSend = 'delivery_person';
        if (signupType === 'STORE_PARTNER') roleToSend = 'store_partner';
        if (signupType === 'DELIVERY_PARTNER') roleToSend = 'delivery_partner';
        
        await cloud.registerUserWithType(email, password, name, phone, cpf, roleToSend, selectedCity);
        setAuthMessage({ type: 'success', text: 'Conta criada com sucesso! Verifique seu e-mail.' });
    } catch (e: any) {
        // Use translation helper
        setAuthMessage({ type: 'error', text: getErrorMessage(e) });
    } finally {
        setAuthLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  if (session && userId) {
    return <App userId={userId} userRole={userRole} />;
  }

  if (view === 'landing') {
      return (
        <LandingPage 
            onLoginClick={() => setView('login')} 
            onSignupClick={(type) => {
                setSignupType(type);
                setView(type === 'DELIVERY_PARTNER' ? 'signup_city' : 'signup_form');
            }} 
        />
      );
  }

  const renderBack = () => (
      <button 
        onClick={() => setView('landing')} 
        className="absolute top-6 left-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
      >
          <ArrowLeft className="w-6 h-6" />
      </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        {renderBack()}
        
        <div className="bg-white dark:bg-gray-800 w-full max-w-md p-8 rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="text-center mb-8">
                <Logo className="h-10 w-auto mx-auto mb-4 text-brand-600" mode="icon" />
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                    {view === 'login' && 'Bem-vindo de volta!'}
                    {view === 'forgot_password' && 'Recuperar Senha'}
                    {(view === 'signup_form' || view === 'signup_city') && 'Criar Conta'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {view === 'login' && 'Acesse sua conta para continuar.'}
                    {view === 'forgot_password' && 'Enviaremos um link para seu e-mail.'}
                    {view === 'signup_city' && 'Onde você vai atuar?'}
                    {view === 'signup_form' && (
                        signupType === 'STORE_PARTNER' 
                        ? 'Cadastre sua loja e impulsione suas vendas.' 
                        : signupType === 'DELIVERY_PARTNER' 
                            ? 'Faça seu cadastro e comece a faturar.'
                            : 'Preencha seus dados para continuar.'
                    )}
                </p>
            </div>

            {authMessage && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2 ${authMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {authMessage.type === 'error' ? <Ban className="w-4 h-4"/> : <CheckCircle className="w-4 h-4"/>}
                    {authMessage.text}
                </div>
            )}

            {view === 'login' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email, Telefone ou CPF</label>
                        <input 
                            type="text" 
                            value={emailOrPhone} 
                            onChange={e => setEmailOrPhone(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all dark:text-white"
                            placeholder="Digite aqui..."
                            autoComplete="username"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all dark:text-white pr-10"
                                placeholder="******"
                                autoComplete="current-password"
                            />
                            <button 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                            </button>
                        </div>
                        <div className="text-right mt-2">
                            <button onClick={() => setView('forgot_password')} className="text-xs font-bold text-brand-600 hover:underline">Esqueci minha senha</button>
                        </div>
                    </div>
                    <Button fullWidth onClick={handleLogin} disabled={authLoading} className="py-4 text-lg shadow-xl shadow-brand-500/20">
                        {authLoading ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Entrar'}
                    </Button>
                </div>
            )}

            {view === 'forgot_password' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                        <input 
                            type="email" 
                            value={emailOrPhone} 
                            onChange={e => setEmailOrPhone(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none border-transparent focus:border-brand-500 border dark:text-white"
                            placeholder="seu@email.com"
                            autoComplete="email"
                            autoFocus
                        />
                    </div>
                    <Button fullWidth onClick={handleForgotPassword} disabled={authLoading} className="py-4">
                        {authLoading ? <Loader2 className="animate-spin"/> : 'Enviar Link'}
                    </Button>
                    <button onClick={() => setView('login')} className="w-full text-center text-sm font-bold text-gray-500 hover:text-brand-600 mt-4">
                        Voltar para Login
                    </button>
                </div>
            )}

            {view === 'signup_city' && (
                <div className="space-y-4">
                    <CitySelector 
                        onSelect={(cityName, state) => {
                            setSelectedCity(`${cityName} - ${state}`);
                            setView('signup_form');
                        }}
                    />
                    <div className="mt-4 text-center">
                        <button onClick={() => setView('landing')} className="text-sm text-gray-500">Cancelar</button>
                    </div>
                </div>
            )}

            {view === 'signup_form' && (
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Nome Completo" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border-transparent focus:border-brand-500 border dark:text-white"
                        autoComplete="name"
                        autoFocus
                    />
                    <input 
                        type="email" 
                        placeholder="Email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border-transparent focus:border-brand-500 border dark:text-white"
                        autoComplete="email"
                    />
                    <input 
                        type="tel" 
                        placeholder="Telefone (WhatsApp)" 
                        value={phone} 
                        onChange={e => setPhone(formatPhoneNumber(e.target.value))} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                        maxLength={15}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border-transparent focus:border-brand-500 border dark:text-white"
                        autoComplete="tel"
                        inputMode="tel"
                    />
                    <input 
                        type="text" 
                        placeholder="CPF (Opcional)" 
                        value={cpf} 
                        onChange={e => setCpf(formatCpf(e.target.value))} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border-transparent focus:border-brand-500 border dark:text-white"
                        autoComplete="off"
                        inputMode="numeric"
                        maxLength={14}
                    />
                    <div className="relative">
                        <input 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder="Senha (mín. 6 caracteres)" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border-transparent focus:border-brand-500 border dark:text-white pr-10"
                            autoComplete="new-password"
                        />
                        <button 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                        </button>
                    </div>

                    {signupType === 'DELIVERY_PARTNER' && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                            <MapPin className="w-4 h-4"/> Cidade: <strong>{selectedCity}</strong>
                            <button onClick={() => setView('signup_city')} className="ml-auto text-xs font-bold text-blue-800 dark:text-blue-200 hover:underline">
                                (Mudar)
                            </button>
                        </div>
                    )}

                    <Button fullWidth onClick={handleSignup} disabled={authLoading} className="py-4 text-lg">
                        {authLoading ? <Loader2 className="animate-spin"/> : 'Finalizar Cadastro'}
                    </Button>
                </div>
            )}
        </div>
    );
};