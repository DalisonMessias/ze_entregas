
import React, { useState, useEffect } from 'react';
import App from '../App';
import * as cloud from '../services/cloud';
import { UserRole } from '../types';
import { Ban, CheckCircle, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
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

  const [emailOrPhone, setEmailOrPhone] = useState(''); // Changed from email
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(''); // Used for signup
  const [cpf, setCpf] = useState(''); // Used for signup
  const [selectedCity, setSelectedCity] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const supabase = cloud.initSupabase();
      
      if (!supabase) {
        console.error("Supabase não inicializado.");
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
              setAuthMessage({ type: 'error', text: 'Sua conta foi suspensa ou está na lista negra.' });
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
        console.error("Erro ao verificar sessão inicial:", err);
        // FIX: Handle Invalid Refresh Token error by clearing session
        const errorMessage = err?.message || JSON.stringify(err);
        if (errorMessage.includes("Refresh Token") || errorMessage.includes("Invalid Refresh Token")) {
            console.log("Token inválido detectado. Limpando sessão local...");
            await cloud.signOut(); // This clears local storage tokens
            if (mounted) {
                setSession(null);
                setUserId(null);
                setUserRole('user');
            }
        }
      } finally {
        if (mounted) {
          // Pequeno delay artificial para evitar flash muito rápido e mostrar o loading bonito
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

  // --- REALTIME ROLE LISTENER ---
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
          const newRole = payload.new.role;
          const newStatus = payload.new.status;
          
          if (newStatus === 'banned') {
              supabase.auth.signOut();
              alert("Sua conta foi suspensa.");
              return;
          }

          if (newRole) {
            setUserRole(newRole.toLowerCase() as UserRole);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const formatCpf = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      setAuthMessage({ type: 'error', text: 'Preencha todos os campos.' });
      return;
    }
    
    setAuthLoading(true);
    setAuthMessage(null);
    
    try {
      const supabase = cloud.getClient();
      if (!supabase) {
          throw new Error("Erro de conexão (Cliente Supabase não inicializado).");
      }

      // Step 1: Resolve identifier (Email, Phone, CPF) to Email
      const resolvedEmail = await cloud.resolveEmailFromIdentifier(emailOrPhone);
      
      if (!resolvedEmail) {
          throw new Error("Usuário não encontrado. Verifique seus dados.");
      }

      // Step 2: Sign in with resolved email
      const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
      if (error) throw error;

    } catch (error: any) {
      // Check for specific error messages or return generic
      if (error.message.includes("Invalid login credentials")) {
          setAuthMessage({ type: 'error', text: 'Senha incorreta.' });
      } else {
          setAuthMessage({ type: 'error', text: error.message || 'Erro ao entrar.' });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailOrPhone) {
      setAuthMessage({ type: 'error', text: 'Informe seu e-mail para recuperar a senha.' });
      return;
    }
    
    if (!emailOrPhone.includes('@')) {
        setAuthMessage({ type: 'error', text: 'Por favor, informe um e-mail válido para recuperação.' });
        return;
    }

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const exists = await cloud.checkEmailExists(emailOrPhone);
      if (!exists) {
          throw new Error("Este e-mail não está cadastrado em nosso sistema.");
      }

      await cloud.sendPasswordResetEmail(emailOrPhone);
      setAuthMessage({ type: 'success', text: 'E-mail de recuperação enviado! Verifique sua caixa de entrada.' });
    } catch (error: any) {
      setAuthMessage({ type: 'error', text: error.message || 'Erro ao enviar e-mail de recuperação.' });
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
      const type = signupType || 'USER';
      // Register returns data now
      const result = await cloud.registerUserWithType(email, password, name, phone, cpf, type, selectedCity);
      
      // Force Login State Update if Session is Present (Auto-Login)
      if (result && result.session && result.user) {
          setSession(result.session);
          setUserId(result.user.id);
          setUserRole(type.toLowerCase() as UserRole);
          // This state update will trigger re-render and switch to <App /> because of the check at start of component
      } else {
          // If no session returned (e.g. Email Confirm Required), guide user
          setAuthMessage({ type: 'success', text: 'Conta criada! Se necessário, verifique seu e-mail para ativar.' });
          if (!result?.session) setView('login');
      }

    } catch (error: any) {
      setAuthMessage({ type: 'error', text: error.message || 'Erro ao criar conta.' });
    } finally {
      setAuthLoading(false);
    }
  };

  // --- RENDER ---

  if (isCheckingSession) {
    // Skeleton da tela inicial (Simula o App Shell)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col animate-in fade-in">
        {/* Header Skeleton */}
        <div className="h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 flex items-center justify-between sticky top-0 z-20">
           <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="h-10 w-10 bg-gray-200 dark:bg-gray-800" />
              <Skeleton className="h-6 w-32 bg-gray-200 dark:bg-gray-800" />
           </div>
           <Skeleton variant="circular" className="h-10 w-10 bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 p-4 max-w-7xl mx-auto w-full space-y-6 pt-6">
           {/* Simulate a Hero Card (Summary) */}
           <Skeleton className="h-44 w-full rounded-[32px] bg-gray-200 dark:bg-gray-800" />

           {/* Simulate Grid Buttons */}
           <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-14 rounded-full bg-gray-200 dark:bg-gray-800" />
              <Skeleton className="h-14 rounded-full bg-gray-200 dark:bg-gray-800" />
              <Skeleton className="h-14 rounded-full bg-gray-200 dark:bg-gray-800" />
              <Skeleton className="h-14 rounded-full bg-gray-200 dark:bg-gray-800" />
           </div>

           {/* Simulate List / Feed */}
           <div className="space-y-4 pt-2">
              <Skeleton className="h-24 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
              <Skeleton className="h-24 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
              <Skeleton className="h-24 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
           </div>
        </div>
      </div>
    );
  }

  // LOGGED IN VIEW
  if (session && userId) {
    return <App userId={userId} userRole={userRole} />;
  }

  // LANDING PAGE VIEW
  if (view === 'landing') {
    return (
        <LandingPage 
            onLoginClick={() => setView('login')} 
            onSignupClick={(type) => {
                setSignupType(type);
                setView('signup_city');
            }} 
        />
    );
  }

  // AUTH FORMS VIEW
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button 
            onClick={() => {
                setAuthMessage(null);
                if (view === 'signup_form') setView('signup_city');
                else if (view === 'forgot_password') setView('login');
                else setView('landing');
            }} 
            className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 font-bold text-sm transition-colors"
        >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </button>

        <div className="w-full bg-white dark:bg-gray-800 p-8 rounded-[32px] shadow-xl animate-in fade-in slide-in-from-bottom-8 border border-gray-100 dark:border-gray-700">
            {/* Header with Logo */}
            <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                    <Logo className="h-16 w-auto" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                    {view === 'login' ? 'Bem-vindo de volta!' : view === 'signup_city' ? 'Onde você atua?' : view === 'forgot_password' ? 'Recuperar Senha' : 'Criar Conta'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                    {view === 'login' ? 'Acesse sua conta para continuar.' : view === 'signup_city' ? 'Escolha sua cidade para começarmos.' : view === 'forgot_password' ? 'Informe seu e-mail para receber as instruções.' : 'Preencha seus dados para finalizar.'}
                </p>
            </div>

            {/* Error/Success Messages */}
            {authMessage && (
                <div className={`p-4 rounded-2xl mb-6 text-sm flex items-start gap-3 ${authMessage.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}>
                    {authMessage.type === 'error' ? <Ban className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                    <span>{authMessage.text}</span>
                </div>
            )}

            {/* LOGIN FORM */}
            {view === 'login' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">Email, CPF ou Telefone</label>
                        <input 
                            type="text" 
                            value={emailOrPhone} 
                            onChange={e => setEmailOrPhone(e.target.value)} 
                            className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all border border-transparent focus:border-brand-500"
                            placeholder="Digite seu acesso"
                            autoComplete="username"
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">Senha</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all border border-transparent focus:border-brand-500 pr-12"
                                placeholder="******"
                                autoComplete="current-password"
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex justify-end">
                        <button onClick={() => { setAuthMessage(null); setView('forgot_password'); }} className="text-xs font-bold text-brand-600 hover:underline">
                            Esqueceu a senha?
                        </button>
                    </div>

                    <Button onClick={handleLogin} disabled={authLoading} fullWidth className="py-4 text-lg mt-2 shadow-lg shadow-brand-500/20">
                        {authLoading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : 'Entrar'}
                    </Button>
                    
                    <p className="text-center text-sm text-gray-500 mt-6">
                        Ainda não tem conta? <button onClick={() => setView('signup_city')} className="text-brand-600 font-bold hover:underline">Cadastre-se</button>
                    </p>
                </div>
            )}

            {/* FORGOT PASSWORD FORM */}
            {view === 'forgot_password' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">Email Cadastrado</label>
                        <div className="relative">
                            <input 
                                type="email" 
                                value={emailOrPhone} 
                                onChange={e => setEmailOrPhone(e.target.value)} 
                                className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all border border-transparent focus:border-brand-500"
                                placeholder="seu@email.com"
                                autoComplete="email"
                                onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                            />
                        </div>
                    </div>

                    <Button onClick={handleForgotPassword} disabled={authLoading} fullWidth className="py-4 text-lg mt-4 shadow-lg shadow-brand-500/20">
                        {authLoading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : 'Recuperar Senha'}
                    </Button>
                </div>
            )}

            {/* SIGNUP STEP 1: CITY */}
            {view === 'signup_city' && (
                <div className="space-y-6">
                    <CitySelector 
                        onSelect={(city, state) => {
                            setSelectedCity(`${city} - ${state}`);
                            setView('signup_form');
                        }}
                        selectedCity={selectedCity}
                        userEmail={email} 
                    />
                    <div className="text-center">
                         <button onClick={() => setView('login')} className="text-sm text-gray-500">
                            Já tem conta? <span className="text-brand-600 font-bold hover:underline">Entrar</span>
                        </button>
                    </div>
                </div>
            )}

            {/* SIGNUP STEP 2: FORM */}
            {view === 'signup_form' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Cidade: {selectedCity}</span>
                        <button onClick={() => setView('signup_city')} className="ml-auto text-xs underline text-blue-600">Alterar</button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">Nome Completo</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Seu nome"
                            autoComplete="name"
                            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">CPF (Obrigatório)</label>
                        <input 
                            type="tel" 
                            value={cpf} 
                            onChange={e => setCpf(formatCpf(e.target.value))} 
                            maxLength={14}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="000.000.000-00"
                            autoComplete="off"
                            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">Telefone / WhatsApp</label>
                        <input 
                            type="tel" 
                            value={phone} 
                            onChange={e => setPhone(formatPhoneNumber(e.target.value))} 
                            maxLength={15}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="(00) 00000-0000"
                            autoComplete="tel"
                            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">Email</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="seu@email.com"
                            autoComplete="email"
                            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">Senha</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 pr-10"
                                placeholder="******"
                                autoComplete="new-password"
                                onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                            />
                             <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <Button onClick={handleSignup} disabled={authLoading} fullWidth className="py-4 text-lg mt-2">
                        {authLoading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : 'Finalizar Cadastro'}
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
