import React, { useState, useEffect } from 'react';
import { TourProvider } from './Tour/TourContext';
import * as cloud from '../services/cloud';
import * as logger from '../services/logger';
import { useDialog } from '../utils/dialogService';
import { App } from './App';
import { UserRole } from '../types';
import { Ban, CheckCircle, Eye, EyeOff, ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { Button } from './Button';
import { LandingPage } from './LandingPage';
import { CitySelector } from './CitySelector';
import { formatPhoneNumber, formatCpf, formatCnpjCpf } from '../utils/mapHelpers';
import { Logo } from './Logo';
import { CustomInput } from './CustomInput';
import { CollaboratorModule } from './CollaboratorModule';

type AuthView = 'landing' | 'login' | 'signup_city' | 'signup_form' | 'forgot_password';

export const AuthWrapper: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('delivery_person');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isRetryingProfile, setIsRetryingProfile] = useState(false);
  const [collaboratorSession, setCollaboratorSession] = useState<any | null>(null);

  const [view, setView] = useState<AuthView>('landing');
  const [signupType, setSignupType] = useState<'STORE_PARTNER' | 'DELIVERY_PARTNER' | null>(null);

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Store-specific fields
  const [storeName, setStoreName] = useState('');
  const [storeDocument, setStoreDocument] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressZip, setAddressZip] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const { alert } = useDialog();

  const defaultTabByRole: Record<UserRole, import('./App').ActiveTab> = {
    admin: 'admin_dashboard',
    store_partner: 'wallet',
    delivery_partner: 'partner',
    delivery_person: 'daily_panel',
    collaborator: 'shop'
  };

  const redirectToRoleHome = (role: UserRole) => {
    try {
      const tab = defaultTabByRole[role] || 'shop';
      logger.info('ROLE_REDIRECT', { role, tab });
      window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab } }));
    } catch { }
  };

  const getErrorMessage = (error: any) => {
    const msg = error?.message || '';
    if (msg.includes("Invalid login credentials")) return "Credenciais inválidas. Verifique e-mail e senha.";
    if (msg.includes("User not found")) return "Usuário não encontrado no sistema.";
    if (msg.includes("User already registered")) return "Este usuário já está cadastrado.";
    if (msg.includes("Password should be at least")) return "A senha deve ter pelo menos 6 caracteres.";
    if (msg.includes("Database error")) return "Erro ao salvar usuário. Verifique se o e-mail ou telefone já estão em uso.";
    if (msg.includes("refresh_token")) return "Sessão expirada. Faça login novamente.";
    if (msg.includes("rate limit")) return "Muitas tentativas. Aguarde alguns instantes.";
    if (msg.includes("network") || msg.includes("fetch")) return "Erro de conexão. Verifique sua internet.";
    return "Ocorreu um erro inesperado. Tente novamente.";
  };

  const handleLogoutAndRedirect = (message: string) => {
    console.log('[HANDLE_LOGOUT_AND_REDIRECT] called', { message });
    cloud.signOut();
    setSession(null);
    setUserId(null);
    setUserRole('delivery_person');
    setView('login');
    setAuthMessage({ type: 'error', text: message });
    logger.warn('USER_NOT_FOUND_SIGNOUT', {});
  };

  // Retry logic to prevent infinite loops
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    let mounted = true;

    // Timeout de segurança global para parar loading infinito
    const globalTimeoutId = setTimeout(() => {
      if (mounted && isCheckingSession) {
        logger.warn('SESSION_CHECK_TIMEOUT_GLOBAL', {});
        setIsCheckingSession(false);
        setAuthMessage({ type: 'error', text: 'Demorou muito para conectar. Verifique sua internet.' });
      }
    }, 15000);

    let authSubscriptionUnsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      if (retryCount >= MAX_RETRIES) {
        logger.error('AUTH_MAX_RETRIES_REACHED', { retryCount });
        setIsCheckingSession(false);
        setAuthMessage({ type: 'error', text: 'Falha recorrente na autenticação. Tente recarregar a página.' });
        return;
      }

      const supabase = cloud.initSupabase();

      if (!supabase) {
        if (mounted) setIsCheckingSession(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (initialSession) {
          try {
            const { status, role } = await cloud.getInitialUserData();
            console.log('[AUTH_INIT] getInitialUserData result', { userId: initialSession.user.id, status, role });
            if (!mounted) return;

            if (status === ('error' as any)) {
              setAuthMessage({ type: 'error', text: 'Não foi possível carregar seu perfil. O sistema continuará tentando.' });
              setSession(initialSession);
              setUserId(initialSession.user.id);
              setUserRole('delivery_person' as any); // Fallback role
              setIsCheckingSession(false);
              return;
            }

            if (status === 'banned') {
              await supabase.auth.signOut();
              setAuthMessage({ type: 'error', text: 'Sua conta foi suspensa.' });
              setSession(null);
              setUserId(null);
              setUserRole('delivery_person');
              logger.warn('LOGIN_BLOCKED_BANNED', { userId: initialSession.user.id });
            } else if (status === 'not_found') {
              // Em vez de logout imediato, verificamos se é um erro temporário ou se realmente o perfil sumiu
              // Se sumiu, talvez precise ser recriado ou redirecionado para onboarding.
              // Por segurança e conforme pedido, vamos evitar expulsa-lo se puder ser erro de banco.
              setAuthMessage({ type: 'error', text: 'Perfil não encontrado. Tente novamente mais tarde.' });
              setSession(initialSession);
              setUserId(initialSession.user.id);
              setIsCheckingSession(false);
              logger.warn('AUTH_INIT_USER_NOT_FOUND', { userId: initialSession.user.id });
            } else {
              setSession(initialSession);
              setUserId(initialSession.user.id);
              setUserRole((role || 'delivery_person'));
              logger.info('AUTH_INIT_ROLE', { userId: initialSession.user.id, role: (role || 'delivery_person') });
              redirectToRoleHome(role || 'delivery_person');
            }
          } catch (profileError) {
            console.error('[AUTH_INIT] profile fetch error', profileError);
            if (!mounted) return;
            setSession(initialSession);
            setUserId(initialSession.user.id);
            setAuthMessage({ type: 'error', text: 'Erro ao carregar dados do perfil. Tente atualizar a página.' });
          }
        }
      } catch (err: any) {
        logger.error('AUTH_INIT_ERROR', { message: err?.message || String(err) });
        const errorMessage = err?.message || JSON.stringify(err);

        // Incrementa retry count
        setRetryCount(prev => prev + 1);

        if (errorMessage.includes("Refresh Token") || errorMessage.includes("Invalid Refresh Token")) {
          await cloud.signOut();
          if (mounted) {
            setSession(null);
            setUserId(null);
            setUserRole('delivery_person');
            logger.warn('AUTH_REFRESH_INVALID', {});
          }
        }
      } finally {
        if (mounted) {
          // Apenas para de carregar se tiver sucesso ou se atingir max retries (tratado no topo)
          // Mas garantimos que o spinner saia eventualmente
          setTimeout(() => setIsCheckingSession(false), 500);
        }
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, currentSession: any) => {
        if (!mounted) return;

        // Se já atingiu limite de retries, ignora eventos automáticos para evitar loop
        if (retryCount >= MAX_RETRIES) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUserId(null);
          setUserRole('delivery_person');
          setView('login');
          logger.info('AUTH_EVENT_SIGNED_OUT', {});
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession) {
            try {
              const { status, role } = await cloud.getInitialUserData();
              console.log('[AUTH_EVENT] getInitialUserData result', { event, userId: currentSession.user.id, status, role });
              if (status === 'banned') {
                await supabase.auth.signOut();
                setAuthMessage({ type: 'error', text: 'Sua conta está suspensa.' });
                logger.warn('AUTH_EVENT_BANNED', { userId: currentSession.user.id });
              } else if (status === 'not_found') {
                handleLogoutAndRedirect("Usuário não encontrado no sistema.");
                logger.warn('AUTH_EVENT_USER_NOT_FOUND', { userId: currentSession.user.id });
              } else {
                setSession(currentSession);
                setUserId(currentSession.user.id);
                setUserRole((role || 'delivery_person'));
                logger.info('AUTH_EVENT_SIGNED_IN', { userId: currentSession.user.id, role: (role || 'delivery_person') });
                redirectToRoleHome(role || 'delivery_person');
              }
            } catch (e: any) {
              if (mounted) {
                setRetryCount(prev => prev + 1);
                console.log('[AUTH_EVENT] getInitialUserData threw', { event, userId: currentSession?.user?.id, error: e?.message || String(e) });
                handleLogoutAndRedirect("Usuário não encontrado no sistema.");
                logger.error('AUTH_EVENT_USER_DELETED', { userId: currentSession?.user?.id, error: e.message });
              }
            }
          }
        }
      });
      authSubscriptionUnsubscribe = () => {
        try { subscription.unsubscribe(); } catch (e) { console.warn('Failed to unsubscribe auth listener', e); }
      };
    };

    void initializeAuth();

    return () => {
      mounted = false;
      try { authSubscriptionUnsubscribe?.(); } catch { }
      clearTimeout(globalTimeoutId);
    };
  }, [retryCount]);


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
        (payload: any) => {
          if (payload.new.status === 'banned') {
            supabase.auth.signOut();
            void alert({ title: 'Conta', message: 'Sua conta foi suspensa.' });
            logger.warn('ROLE_DB_UPDATE_BANNED', { userId });
            return;
          }
          if (payload.new.status === 'deleted') {
            handleLogoutAndRedirect("Usuário não encontrado no sistema.");
            logger.warn('ROLE_DB_UPDATE_DELETED', { userId });
            return;
          }
          if (payload.new.role) {
            const r = String(payload.new.role).toLowerCase() as UserRole;
            setUserRole(r);
            logger.info('ROLE_DB_UPDATE', { userId, role: r });
            redirectToRoleHome(r);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleLogin = async () => {
    const emailInput = emailOrPhone.trim().toLowerCase();

    if (!emailInput || !password) {
      setAuthMessage({ type: 'error', text: 'Preencha todos os campos.' });
      return;
    }

    // Colaborador Login
    if (!emailInput.includes('@')) {
      setAuthLoading(true);
      setAuthMessage(null);
      try {
        const collab = await cloud.loginCollaborator(emailInput, password);
        if (collab) {
          setCollaboratorSession(collab);
          return;
        } else {
          setAuthMessage({ type: 'error', text: 'Colaborador não encontrado ou senha incorreta.' });
        }
      } catch (e) {
        console.error(e);
        setAuthMessage({ type: 'error', text: 'Erro ao conectar.' });
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    logger.info('AUTH_LOGIN_SUBMIT', {
      email: emailInput,
    });

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const supabase = cloud.getClient();
      if (!supabase) throw new Error("Erro de conexão.");

      const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password });
      if (error) throw error;

    } catch (error: any) {
      logger.error('AUTH_LOGIN_ERROR', {
        email: emailInput,
        errorMessage: error?.message || String(error),
        errorCode: (error as any)?.code,
        errorName: (error as any)?.name,
      });
      const errorMessage = getErrorMessage(error);
      if (errorMessage.includes("Usuário não encontrado")) {
        handleLogoutAndRedirect(errorMessage);
      } else {
        setAuthMessage({ type: 'error', text: errorMessage });
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
      setAuthMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedCpf = cpf.trim();

    if (!signupType) {
      setAuthMessage({ type: 'error', text: 'Selecione se é Lojista ou Entregador.' });
      return;
    }

    const commonFieldsMissing = !trimmedName || !trimmedEmail || !password || !trimmedPhone;
    const storeFieldsMissing = signupType === 'STORE_PARTNER' && (!storeName || !storeDocument || !addressStreet || !addressNumber || !addressNeighborhood);
    if (commonFieldsMissing || storeFieldsMissing) {
      setAuthMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    if (!selectedCity) {
      setAuthMessage({ type: 'error', text: 'Selecione a cidade de atuação.' });
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setAuthMessage({ type: 'error', text: 'Informe um e-mail válido.' });
      return;
    }

    if (password.length < 6) {
      setAuthMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    const phoneDigits = trimmedPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setAuthMessage({ type: 'error', text: 'Informe um telefone válido com DDD.' });
      return;
    }

    const cpfDigits = trimmedCpf.replace(/\D/g, '');
    const storeDocumentDigits = storeDocument.replace(/\D/g, '');
    const zipDigits = addressZip.replace(/\D/g, '');

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const [city, state] = selectedCity.split(' - ');

      const roleToSend: UserRole = signupType === 'STORE_PARTNER' ? 'store_partner' : 'delivery_partner';

      logger.info('AUTH_SIGNUP_SUBMIT', {
        type: signupType,
        email: trimmedEmail,
        city,
        state,
      });

      const userData: any = {
        name: trimmedName,
        phone_number: phoneDigits,
        city,
        state,
        role: roleToSend,
      };

      if (cpfDigits) {
        userData.cpf = cpfDigits;
      }

      if (signupType === 'STORE_PARTNER') {
        userData.store_name = storeName;
        userData.store_document = storeDocumentDigits;
        userData.address_street = addressStreet;
        userData.address_number = addressNumber;
        userData.address_district = addressNeighborhood;
        userData.address_zip = zipDigits;
        userData.address_state = state;
      }

      const res = await cloud.registerUserWithType(
        trimmedEmail,
        password,
        trimmedName,
        phoneDigits,
        cpfDigits || '',
        roleToSend,
        city
      );
      logger.info('AUTH_SIGNUP_SUCCESS', {
        type: signupType,
        email,
        userId: (res as any)?.user?.id ?? null,
      });
      setAuthMessage({ type: 'success', text: 'Conta criada com sucesso! Verifique seu e-mail.' });
      try {
        const supabase = cloud.getClient();
        const { data: { session } } = await supabase!.auth.getSession();
        if (session) {
          redirectToRoleHome(roleToSend);
        }
      } catch { }
    } catch (e: any) {
      setAuthMessage({ type: 'error', text: getErrorMessage(e) });
    } finally {
      setAuthLoading(false);
    }
  };

  // Loading: show only the branded logo screen (remove pulse circle loader)
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 animate-in fade-in">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-16 w-auto text-brand-600" mode="icon" />
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      </div>
    );
  }

  if (collaboratorSession) {
    return <CollaboratorModule collaborator={collaboratorSession} onLogout={() => setCollaboratorSession(null)} />;
  }

  if (session && userId) {
    return (
      <TourProvider>
        <App userId={userId} userRole={userRole} />
      </TourProvider>
    );
  }

  if (view === 'landing') {
    return (
      <LandingPage
        onLoginClick={() => setView('login')}
        onSignupClick={(type: 'STORE_PARTNER' | 'DELIVERY_PARTNER') => {
          setSignupType(type);
          setView('signup_city');
        }}
      />
    );
  }

  const renderBack = () => (
    <button
      onClick={() => setView(view === 'signup_form' ? 'signup_city' : 'landing')}
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
            {authMessage.type === 'error' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {authMessage.text}
          </div>
        )}

        {view === 'login' && (
          <div className="space-y-4">
            <CustomInput
              label="Email"
              type="email"
              value={emailOrPhone}
              onChange={e => setEmailOrPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="seu@email.com"
              autoComplete="email"
              autoFocus
            />
            <div className="relative">
              <CustomInput
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="pr-10" // Keep padding right for the eye icon
                placeholder="******"
                autoComplete="current-password"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-right mt-2">
              <button onClick={() => setView('forgot_password')} className="text-xs font-bold text-brand-600 hover:underline">Esqueci minha senha</button>
            </div>
            <Button fullWidth onClick={handleLogin} disabled={authLoading} className="py-4 text-lg shadow-xl shadow-brand-500/20">
              {authLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Entrar'}
            </Button>
          </div>
        )}

        {view === 'forgot_password' && (
          <div className="space-y-4">
            <CustomInput
              label="Email"
              type="email"
              value={emailOrPhone}
              onChange={e => setEmailOrPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
              placeholder="seu@email.com"
              autoComplete="email"
              autoFocus
            />
            <Button fullWidth onClick={handleForgotPassword} disabled={authLoading} className="py-4">
              {authLoading ? <Loader2 className="animate-spin" /> : 'Enviar Link'}
            </Button>
            <button onClick={() => setView('login')} className="w-full text-center text-sm font-bold text-gray-500 hover:text-brand-600 mt-4">
              Voltar para Login
            </button>
          </div>
        )}

        {view === 'signup_city' && (
          <div className="space-y-4">
            <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${signupType === 'STORE_PARTNER' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300'}`}>
              {signupType === 'STORE_PARTNER' ? 'Cadastro Lojista' : 'Cadastro Entregador'}
            </div>
            <CitySelector
              onSelect={(cityName: string, state: string) => {
                setSelectedCity(`${cityName} - ${state}`);
                setView('signup_form');
              }}
              selectedCity={selectedCity}
            />
            <div className="mt-4 text-center">
              <button onClick={() => setView('landing')} className="text-sm text-gray-500">Cancelar</button>
            </div>
          </div>
        )}

        {view === 'signup_form' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              <MapPin className="w-4 h-4" /> Cidade: <strong>{selectedCity}</strong>
              <button onClick={() => setView('signup_city')} className="ml-auto text-xs font-bold text-blue-800 dark:text-blue-200 hover:underline">
                (Mudar)
              </button>
            </div>

            <CustomInput
              type="text"
              placeholder="Nome Completo"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
            <CustomInput
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            <CustomInput
              type="tel"
              placeholder="Telefone (WhatsApp)"
              value={phone}
              onChange={e => setPhone(formatPhoneNumber(e.target.value))}
              maxLength={15}
              autoComplete="tel"
              inputMode="tel"
            />
            <CustomInput
              type="text"
              placeholder="CPF (Opcional)"
              value={cpf}
              onChange={e => setCpf(formatCpf(e.target.value))}
              autoComplete="off"
              inputMode="numeric"
              maxLength={14}
            />

            {signupType === 'STORE_PARTNER' && (
              <>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 pt-4">Dados da Loja</p>
                <CustomInput type="text" placeholder="Nome da Loja" value={storeName} onChange={e => setStoreName(e.target.value)} />
                <CustomInput type="text" placeholder="CPF/CNPJ da Loja" value={storeDocument} onChange={e => setStoreDocument(formatCnpjCpf(e.target.value))} maxLength={18} />
                <CustomInput type="text" placeholder="CEP (Opcional)" value={addressZip} onChange={e => setAddressZip(e.target.value)} />
                <div className="grid grid-cols-3 gap-4">
                  <CustomInput type="text" placeholder="Rua" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} className="col-span-2" />
                  <CustomInput type="text" placeholder="Nº" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} className="col-span-1" />
                </div>
                <CustomInput type="text" placeholder="Bairro" value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} />
              </>
            )}

            <div className="relative">
              <CustomInput
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha (mín. 6 caracteres)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button fullWidth onClick={handleSignup} disabled={authLoading} className="py-4 text-lg">
              {authLoading ? <Loader2 className="animate-spin" /> : 'Finalizar Cadastro'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
