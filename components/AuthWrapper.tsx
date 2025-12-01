
import React, { useState, useEffect } from 'react';
import App from '../App';
import * as cloud from '../services/cloud';
import { UserRole } from '../types';
import { Ban, CheckCircle, Eye, EyeOff, ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { Button } from './Button';
import { LandingPage } from './LandingPage';
import { CitySelector } from './CitySelector';
import { formatPhoneNumber } from '../utils/mapHelpers';
import { Logo } from './Logo';
import { Skeleton } from './Skeleton';

type AuthView = 'landing' | 'login' | 'signup_city' | 'signup_form' | 'forgot_password';

export const AuthWrapper: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('user');
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
              setUserRole('user');
            } else {
              setSession(initialSession);
              setUserId(initialSession.user.id);
              setUserRole(role || 'user');
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
                setUserRole('user');
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
          setUserRole('user');
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
                 setUserRole(role || 'user');
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
      if (error.message.includes("Invalid login credentials")) {
          setAuthMessage({ type: 'error', text: 'Credenciais inválidas.' });
      } else {
          setAuthMessage({ type: 'error', text: error.message || 'Erro ao entrar.' });
      }
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
      setAuthMessage({ type: 'error', text: error.message || 'Erro ao enviar e-mail.' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !name || !phone || !selectedCity || !cpf) {
      setAuthMessage({ type: 'error', text: 'Preencha todos os campos.' });
      return;
    }

    if (password.length < 6) {
        setAuthMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
        return;
    }
    
    if (cpf.replace(/\D/g, '').length !== 11) {
        setAuthMessage({ type: 'error', text: 'CPF inválido.' });
        return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      let roleToRegister = 'USER';
      if (signupType === 'STORE_PARTNER') {
          roleToRegister = 'STORE_PARTNER';
      } else if (signupType === 'DELIVERY_PARTNER') {
          roleToRegister = 'DELIVERY_PARTNER';
      }
      
      const result = await cloud.registerUserWithType(email, password, name, phone, cpf, roleToRegister, selectedCity);
      
      let activeSession = result?.session;
      let activeUser = result?.user;

      if (!activeSession && activeUser) {
          const supabase = cloud.getClient();
          if (supabase) {
              const { data: loginData } = await supabase.auth.signInWithPassword({ 
                  email: email, 
                  password: password 
              });
              if (loginData.session) {
                  activeSession = loginData.session;
                  activeUser = loginData.user;
              }
          }
      }

      if (activeSession && activeUser) {
          setSession(activeSession);
          setUserId(activeUser.id);
          setUserRole(roleToRegister.toLowerCase() as UserRole);
      } else {
          setAuthMessage({ type: 'success', text: 'Conta criada! Faça login para entrar.' });
          setView('login');
          setPassword('');
      }

    } catch (error: any) {
      console.error(error);
      let errorMessage = 'Erro ao criar conta.';
      if (error.message?.includes('already registered')) errorMessage = 'E-mail ou CPF já cadastrado.';
      setAuthMessage({ type: 'error', text: errorMessage });
    } finally {
      setAuthLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col gap-6 items-center justify-center p-4">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="space-y-3 w-full max-w-xs">
                <Skeleton className="h-4 w-3/4 mx-auto rounded-full" />
                <Skeleton className="h-4 w-1/2 mx-auto rounded-full" />
            </div>
        </div>
    );
  }

  if (session && userId) {
    return <App key={userId} userId={userId} userRole={userRole} />;
  }

  if (view === 'landing') {
      return (
          <LandingPage 
              onLoginClick={() => { setView('login'); setAuthMessage(null); }}
              onSignupClick={(type) => { 
                  setSignupType(type);
                  setView('signup_city');
                  setAuthMessage(null);
                  setName(''); setEmail(''); setPhone(''); setCpf(''); setPassword('');
              }}
          />
      );
  }

  const renderBack = () => (
      <button 
        onClick={() => {
            if(view === 'signup_form') setView('signup_city');
            else if(view === 'signup_city' || view === 'login' || view === 'forgot_password') setView('landing');
            setAuthMessage(null);
        }}
        className="absolute top-6 left-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors z-20"
      >
          <ArrowLeft className="w-6 h-6" />
      </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 relative">
        {renderBack()}
        
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl p-8 relative animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex justify-center mb-8">
                <Logo className="h-12 w-auto text-brand-600" />
            </div>

            {authMessage && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${authMessage.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                    {authMessage.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <Ban className="w-5 h-5"/>}
                    {authMessage.text}
                </div>
            )}

            {view === 'login' && (
                <div className="space-y-5">
                    <h2 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-2">Bem-vindo de volta!</h2>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail, CPF ou Telefone</label>
                        <input 
                            type="text" 
                            value={emailOrPhone} 
                            onChange={e => setEmailOrPhone(e.target.value)} 
                            className="ifood-input w-full p-4" 
                            placeholder="Digite seu login"
                            autoFocus
                            autoComplete="username"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="ifood-input w-full p-4 pr-12" 
                                placeholder="Sua senha"
                                autoComplete="current-password"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <div className="text-right mt-2">
                            <button onClick={() => setView('forgot_password')} className="text-xs font-bold text-brand-600 hover:underline">Esqueci minha senha</button>
                        </div>
                    </div>

                    <Button onClick={handleLogin} disabled={authLoading} fullWidth className="py-4 text-lg shadow-lg shadow-brand-500/20">
                        {authLoading ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Entrar'}
                    </Button>
                </div>
            )}

            {view === 'forgot_password' && (
                <div className="space-y-5">
                    <h2 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-2">Recuperar Senha</h2>
                    <p className="text-center text-gray-500 text-sm mb-6">Informe seu e-mail para receber as instruções de recuperação.</p>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                        <input 
                            type="email" 
                            value={emailOrPhone} 
                            onChange={e => setEmailOrPhone(e.target.value)} 
                            className="ifood-input w-full p-4" 
                            placeholder="seu@email.com"
                            autoFocus
                            autoComplete="email"
                        />
                    </div>

                    <Button onClick={handleForgotPassword} disabled={authLoading} fullWidth className="py-4 text-lg">
                        {authLoading ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Enviar E-mail'}
                    </Button>
                </div>
            )}

            {view === 'signup_city' && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-center text-gray-900 dark:text-white">Onde você atua?</h2>
                    <p className="text-center text-gray-500 text-sm -mt-4 mb-4">Selecione sua cidade para continuar o cadastro.</p>
                    
                    <CitySelector 
                        onSelect={(city, state) => {
                            setSelectedCity(`${city} - ${state}`);
                            setView('signup_form');
                        }}
                    />
                </div>
            )}

            {view === 'signup_form' && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-2">
                        Crie sua conta
                    </h2>
                    
                    <div className="text-center mb-4">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 tracking-wide">
                            {signupType === 'STORE_PARTNER' ? 'Otimize sua Logística 🚀' : 'Sua Renda, Suas Regras 🏍️'}
                        </span>
                    </div>
                    
                    {selectedCity && (
                        <div className="flex items-center justify-center gap-2 mb-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                            <MapPin className="w-4 h-4 text-brand-600"/>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{selectedCity}</span>
                            <button onClick={() => setView('signup_city')} className="text-xs text-blue-500 underline ml-2">Alterar</button>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="ifood-input w-full p-3" 
                            placeholder="Seu nome"
                            autoComplete="name"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                            <input 
                                type="tel" 
                                value={phone} 
                                onChange={e => setPhone(formatPhoneNumber(e.target.value))} 
                                className="ifood-input w-full p-3" 
                                placeholder="(XX) XXXXX-XXXX"
                                maxLength={15}
                                autoComplete="tel"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF</label>
                            <input 
                                type="tel" 
                                value={cpf} 
                                onChange={e => setCpf(e.target.value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"))} 
                                className="ifood-input w-full p-3" 
                                placeholder="000.000.000-00"
                                maxLength={14}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="ifood-input w-full p-3" 
                            placeholder="seu@email.com"
                            autoComplete="email"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="ifood-input w-full p-3 pr-10" 
                                placeholder="Mínimo 6 caracteres"
                                autoComplete="new-password"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <Button onClick={handleSignup} disabled={authLoading} fullWidth className="py-4 text-lg shadow-lg shadow-brand-500/20 mt-2">
                        {authLoading ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Finalizar Cadastro'}
                    </Button>
                </div>
            )}
        </div>
    </div>
  );
};
