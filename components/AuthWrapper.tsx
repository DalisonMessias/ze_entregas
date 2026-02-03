import React, { useState, useEffect } from 'react';
import { TourProvider } from './Tour/TourContext';
import * as cloud from '../services/cloud';
import * as logger from '../services/logger';
import { useDialog } from '../utils/dialogService';
import { App } from './App';
import { UserRole, UserStatus } from '../types';
import { Ban, CheckCircle, Eye, EyeOff, ArrowLeft, MapPin, Mail, Lock, User, Phone, FileText, Store as StoreIcon, Home, Truck, RefreshCw } from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import { LandingPage } from './LandingPage';
import { CitySearchSelect } from './CitySearchSelect';
import { StreetSearchSelect } from './StreetSearchSelect';
import { NotFound } from '../src/pages/NotFound';
import { StreetAutocomplete } from './StreetAutocomplete';
import { Logo } from './Logo';
import { CustomInput } from './CustomInput';
import { CollaboratorModule } from './CollaboratorModule';
import { formatPhoneNumber, formatCpf, formatCnpjCpf } from '../utils/mapHelpers';
import { getTabFromUrl } from '../utils/routeMap';

type AuthView = 'landing' | 'login' | 'signup_city' | 'signup_form' | 'forgot_password' | 'signup_type_selection';

// Helper simples para navegar e atualizar URL sem reload (apenas auth flows que não estão no App.tsx router principal)
import { DigitalMenu } from './DigitalMenu/DigitalMenu';
import { StoreChatPage } from './DigitalMenu/StoreChatPage';
import { PublicSupportPage } from './PublicSupportPage';
import { CitiesList } from './CitiesList';
import { CityStoresList } from './CityStoresList';

const updateAuthUrl = (view: AuthView) => {
  // Se estivermos em uma rota interna válida do App, não forçamos a URL para a landing de auth
  const isAppRoute = getTabFromUrl(window.location.pathname) !== null;
  const authRoutes = ['/login', '/cadastro', '/recuperar-senha', '/'];

  // Se for uma rota de autenticação, forçamos o path correto
  let path = window.location.pathname;
  if (view === 'login') path = '/login';
  else if (view === 'signup_type_selection' || view === 'signup_city' || view === 'signup_form') path = '/cadastro';
  else if (view === 'forgot_password') path = '/recuperar-senha';
  else if (view === 'landing' && !isAppRoute) {
    if (window.location.pathname === '/cidades') path = '/cidades';
    else if (window.location.pathname === '/' || window.location.pathname === '/home') path = '/';
    else return; // Don't redirect URL for unknown paths (let App handle 404)
  }

  if (window.location.pathname !== path && authRoutes.includes(path)) {
    window.history.pushState({ authView: view }, '', path);
  }
};

const getAuthViewFromUrl = (): AuthView => {
  const path = window.location.pathname;
  if (path === '/login') return 'login';
  if (path === '/cadastro') return 'signup_type_selection';
  if (path === '/recuperar-senha') return 'forgot_password';
  if (path === '/' || path === '/home') return 'landing';
  return 'landing';
};

export const AuthWrapper: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('delivery_person');
  const [userStatus, setUserStatus] = useState<UserStatus>('active');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isRetryingProfile, setIsRetryingProfile] = useState(false);
  const [collaboratorSession, setCollaboratorSession] = useState<any | null>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('ze_collaborator_session') : null;
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (collaboratorSession) {
      localStorage.setItem('ze_collaborator_session', JSON.stringify(collaboratorSession));
    } else {
      localStorage.removeItem('ze_collaborator_session');
    }
  }, [collaboratorSession]);

  // Inicializa view baseado na URL
  const [view, setView] = useState<AuthView>(() => getAuthViewFromUrl());
  const [currentPath, setCurrentPath] = useState(typeof window !== 'undefined' ? window.location.pathname : '');

  // Sincroniza URL quando view muda e NÃO temos sessão ativa
  useEffect(() => {
    if (!session && !userId) {
      updateAuthUrl(view);
    }
  }, [view, session, userId]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const newView = getAuthViewFromUrl();
      setView(newView);
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pushstate_changed', handlePopState); // Evento customizado opcional
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pushstate_changed', handlePopState);
    };
  }, []);
  const [signupType, setSignupType] = useState<'STORE_PARTNER' | 'DELIVERY_PARTNER' | 'USER' | null>(null);

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
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success' | 'warning', text: string } | null>(null);

  const { alert } = useDialog();

  const defaultTabByRole: Record<UserRole, import('./App').ActiveTab> = {
    admin: 'admin_dashboard',
    store_partner: 'wallet',
    delivery_partner: 'partner',
    delivery_person: 'daily_panel',
    collaborator: 'collaborator_area',
    user: 'home'
  };

  const redirectToRoleHome = (role: UserRole) => {
    try {
      // Se já estamos em uma rota interna válida (via URL), não redirecionamos para a Home do cargo
      const currentTab = getTabFromUrl(window.location.pathname);
      const authTabs = ['login', 'signup', 'forgot_password'];

      // Se a URL atual mapeia para uma aba que não seja de autenticação, mantemos ela
      if (currentTab && !authTabs.includes(currentTab)) {
        logger.info('REDIRECT_SKIPPED_EXISTING_PATH', { currentTab, path: window.location.pathname });
        return;
      }

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
    // console.log('[HANDLE_LOGOUT_AND_REDIRECT] called', { message });
    cloud.signOut();
    setSession(null);
    setUserId(null);
    setUserRole('delivery_person');
    setView('login');
    setCollaboratorSession(null);
    setAuthMessage({ type: 'error', text: message });
    logger.warn('USER_NOT_FOUND_SIGNOUT', {});
  };

  // Retry logic to prevent infinite loops
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    let mounted = true;
    let authSubscriptionUnsubscribe: (() => void) | null = null;
    let fallbackTimeout: NodeJS.Timeout;

    // Safety Timeout: Força o fim do carregamento após 15 segundos se algo travar
    fallbackTimeout = setTimeout(() => {
      if (mounted && isCheckingSession) {
        logger.warn('AUTH_TIMEOUT_FORCED_UNLOCK', { retryCount });
        setIsCheckingSession(false);
        setAuthMessage({ type: 'warning', text: 'O carregamento demorou mais que o esperado.' });
      }
    }, 15000);

    const initializeAuth = async () => {
      if (retryCount >= MAX_RETRIES) {
        setAuthMessage({ type: 'error', text: 'Falha recorrente na autenticação. Tente recarregar a página.' });
        return;
      }

      // PUBLIC SUPPORT ROUTE
      if (currentPath === '/suporte') {
        return; // Early return logic handled below or if we want to bypass auth entirely:
      }
      // Logic below to actually render it.
      // Wait, AuthWrapper returns helper functions or JSX?
      // Looking at previous read file, it's a component.
      // Let's scroll down to render.
      // I need to see the return statement of AuthWrapper component.


      const supabase = cloud.initSupabase();
      if (!supabase) {
        if (mounted) setIsCheckingSession(false);
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (initialSession) {
          try {
            const { status, role } = await cloud.getInitialUserData();
            if (!mounted) return;

            if (status === ('error' as any)) {
              setAuthMessage({ type: 'error', text: 'Não foi possível carregar seu perfil. O sistema continuará tentando.' });
              setSession(initialSession);
              setUserId(initialSession.user.id);
              setUserRole('delivery_person' as any);
              setIsCheckingSession(false);
              return;
            }

            if (status === 'blocked' || status === 'suspended' || status === 'pending') {
              // Permitir entrada para modo de visualização (restrito)
              setSession(initialSession);
              setUserId(initialSession.user.id);
              setUserRole((role || 'delivery_person'));
              setUserStatus(status);
              setAuthMessage({ type: 'warning', text: 'Conta restrita (Modo Visualização).' });
              redirectToRoleHome(role || 'delivery_person');
            } else if (status === 'banned') {
              // Banido não entra
              await cloud.signOut();
              handleLogoutAndRedirect("Sua conta foi banida permanentemente.");
              return;
            } else if (status === 'not_found') {
              setAuthMessage({ type: 'error', text: 'Perfil não encontrado. Tente novamente mais tarde.' });
              setSession(initialSession);
              setUserId(initialSession.user.id);
              setIsCheckingSession(false);
            } else {
              setSession(initialSession);
              setUserId(initialSession.user.id);
              setUserRole((role || 'delivery_person'));
              redirectToRoleHome(role || 'delivery_person');
            }
          } catch (profileError) {
            if (!mounted) return;
            setSession(initialSession);
            setUserId(initialSession.user.id);
            setAuthMessage({ type: 'error', text: 'Erro ao carregar dados do perfil. Tente atualizar a página.' });
          }
        }
      } catch (err: any) {
        const errorMessage = err?.message || JSON.stringify(err);
        setRetryCount(prev => prev + 1);
        if (errorMessage.includes("Refresh Token") || errorMessage.includes("Invalid Refresh Token")) {
          await cloud.signOut();
          if (mounted) {
            setSession(null);
            setUserId(null);
            setUserRole('delivery_person');
          }
        }
      } finally {
        if (mounted) {
          setIsCheckingSession(false);
          if (fallbackTimeout) clearTimeout(fallbackTimeout);
        }
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, currentSession: any) => {
        if (!mounted) return;
        if (retryCount >= MAX_RETRIES) return;

        // Evitar loops: Se a sessão for idêntica à atual, ignorar
        if (currentSession?.access_token === session?.access_token && event === 'SIGNED_IN') {
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUserId(null);
          setUserRole('delivery_person');
          setView('login');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession) {
            try {
              const { status, role } = await cloud.getInitialUserData();
              if (status === 'blocked' || status === 'suspended' || status === 'pending') {
                setSession(currentSession);
                setUserId(currentSession.user.id);
                setUserRole((role || 'delivery_person'));
                setUserStatus(status);
                setAuthMessage({ type: 'warning', text: 'Conta restrita (Modo Visualização).' });
                redirectToRoleHome(role || 'delivery_person');
              } else if (status === 'banned') {
                await cloud.signOut();
                handleLogoutAndRedirect("Conta banida.");
                return;
              } else if (status === 'not_found') {
                handleLogoutAndRedirect("Usuário não encontrado no sistema.");
              } else {
                setSession(currentSession);
                setUserId(currentSession.user.id);
                setUserRole((role || 'delivery_person'));
                redirectToRoleHome(role || 'delivery_person');
              }
            } catch (e: any) {
              if (mounted) {
                // Não incrementar retryCount aqui para evitar loops infinitos em realtime
                // setRetryCount(prev => prev + 1);
                handleLogoutAndRedirect("Usuário não encontrado no sistema.");
              }
            }
          }
        }
      });

      authSubscriptionUnsubscribe = () => {
        try { subscription.unsubscribe(); } catch (e) { console.warn('Unsubscribe error', e); }
      };
    };

    void initializeAuth();

    return () => {
      mounted = false;
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (authSubscriptionUnsubscribe) authSubscriptionUnsubscribe();
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
            handleLogoutAndRedirect("Sua conta foi banida.");
            return;
          }
          if (payload.new.status === 'blocked' || payload.new.status === 'suspended' || payload.new.status === 'pending') {
            void alert({ title: 'Atenção', message: 'Sua conta entrou em modo restrito de visualização.' });
            logger.warn('USER_STATUS_RESTRICTED', { userId, status: payload.new.status });
            // Forçar reload ou re-check pode ser necessário para atualizar a UI do App.tsx, 
            // mas como o App.tsx escuta userStatus, ele deve atualizar.
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

    setAuthLoading(true);
    setAuthMessage(null);

    try {
      // 1. Tenta login de colaborador se não for e-mail ou se o lojista explicitamente quiser
      // Mas a regra principal é: se incluir @, tenta Supabase primeiro.

      if (!emailInput.includes('@')) {
        const collab = await cloud.loginCollaborator(emailInput, password);
        if (collab) {
          setCollaboratorSession(collab);
          return;
        } else {
          setAuthMessage({ type: 'error', text: 'Colaborador não encontrado ou senha incorreta.' });
          return;
        }
      }

      // 2. Se for e-mail, tenta Supabase Auth
      const supabase = cloud.getClient();
      if (!supabase) throw new Error("Erro de conexão.");

      const { error: authError } = await supabase.auth.signInWithPassword({ email: emailInput, password });

      if (!authError) {
        // Sucesso no login padrão (Lojista/Entregador/Admin)
        return;
      }

      // 3. Se falhar no Supabase e for e-mail, pode ser um colaborador usando e-mail
      const collab = await cloud.loginCollaborator(emailInput, password);
      if (collab) {
        setCollaboratorSession(collab);
        return;
      }

      // Se ambos falharem, reporta o erro do Supabase
      throw authError;

    } catch (error: any) {
      logger.error('AUTH_LOGIN_ERROR', {
        email: emailInput,
        errorMessage: error?.message || String(error),
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
      setAuthMessage({ type: 'error', text: 'Selecione um tipo de conta.' });
      return;
    }

    const commonFieldsMissing = !trimmedName || !trimmedEmail || !password || !trimmedPhone || (signupType !== 'USER' && !trimmedCpf);
    const storeFieldsMissing = signupType === 'STORE_PARTNER' && (!storeName || !storeDocument || !addressStreet || !addressNumber || !addressNeighborhood);

    if (commonFieldsMissing || storeFieldsMissing) {
      setAuthMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    if (signupType !== 'USER' && !selectedCity) {
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

      const roleToSend: UserRole = signupType === 'STORE_PARTNER' ? 'store_partner' :
        signupType === 'DELIVERY_PARTNER' ? 'delivery_person' : 'user';

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
        cpfDigits,
        roleToSend,
        city,
        {
          state,
          store_name: signupType === 'STORE_PARTNER' ? storeName : undefined,
          store_document: signupType === 'STORE_PARTNER' ? storeDocumentDigits : undefined,
          address_street: signupType === 'STORE_PARTNER' ? addressStreet : undefined,
          address_number: signupType === 'STORE_PARTNER' ? addressNumber : undefined,
          address_district: signupType === 'STORE_PARTNER' ? addressNeighborhood : undefined,
          address_zip: signupType === 'STORE_PARTNER' ? zipDigits : undefined,
          address_state: signupType === 'STORE_PARTNER' ? state : undefined,
        }
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
  if (currentPath === '/suporte') {
    return <PublicSupportPage />;
  }

  if (currentPath === '/cidades') {
    return <CitiesList />;
  }

  if (currentPath.startsWith('/cidades/')) {
    const slug = currentPath.split('/cidades/')[1];
    if (slug) return <CityStoresList citySlug={slug} />;
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 animate-in fade-in">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-16 w-auto text-brand-600" mode="icon" onClick={() => window.location.href = '/home'} />
          <Loading variant="inline" size="sm" />
        </div>
      </div>
    );
  }

  if (collaboratorSession) {
    return <CollaboratorModule collaborator={collaboratorSession} onLogout={() => setCollaboratorSession(null)} />;
  }

  // PUBLIC ROUTE CHECK (CARDÁPIO DIGITAL)
  const publicRouteMatch = currentPath.match(/^\/([^\/]+)\/([^\/]+)\/produtos$/);
  const isPublicRoute = !!publicRouteMatch;

  if (isPublicRoute && publicRouteMatch) {
    return <DigitalMenu citySlug={publicRouteMatch[1]} storeSlug={publicRouteMatch[2]} />;
  }

  // PUBLIC CHAT ROUTE
  const publicChatMatch = currentPath.match(/^\/([^\/]+)\/([^\/]+)\/chat$/);
  if (publicChatMatch) {
    return (
      <StoreChatPage
        citySlug={publicChatMatch[1]}
        storeSlug={publicChatMatch[2]}
        onBack={() => {
          window.history.pushState({}, '', `/${publicChatMatch[1]}/${publicChatMatch[2]}/produtos`);
          window.dispatchEvent(new CustomEvent('popstate'));
        }}
      />
    );
  }

  // PUBLIC TRACKING ROUTE
  const isTrackingRoute = currentPath.startsWith('/track/');
  if (isTrackingRoute) {
    return (
      <TourProvider>
        <App
          userId="guest"
          userRole="delivery_person" // Default role for guest viewing tracking
          initialUserStatus="active"
        />
      </TourProvider>
    );
  }

  if (session && userId) {
    return (
      <TourProvider>
        <App
          userId={userId}
          userRole={userRole}
          initialUserStatus={userStatus}
        />
      </TourProvider>
    );
  }

  const cleanPublicPath = currentPath.length > 1 && currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;
  const isPublicFaqRoute = cleanPublicPath === '/faq' || cleanPublicPath === '/loja/faq' || cleanPublicPath === '/entregador/faq';
  if (isPublicFaqRoute) {
    return (
      <TourProvider>
        <App
          userId="guest"
          userRole="delivery_person"
          initialUserStatus="active"
        />
      </TourProvider>
    );
  }

  // PUBLIC PARTNER ROUTES (Permite ver sem estar logado)
  const currentTab = getTabFromUrl(currentPath);
  const isPublicPartnerRoute = currentTab === 'partner_store' || currentTab === 'partner_delivery';
  if (isPublicPartnerRoute) {
    return (
      <TourProvider>
        <App
          userId="guest"
          userRole="delivery_person"
          initialUserStatus="active"
        />
      </TourProvider>
    );
  }

  if (view === 'landing') {

    const isHome = currentPath === '/' || currentPath === '/home' || currentPath === '/cidades';
    const isInternalRoute = getTabFromUrl(currentPath) !== null;

    if (!isHome && !isInternalRoute) {
      return <NotFound />;
    }

    // Se for uma rota interna válida mas não temos sessão, forçamos para login 
    // a menos que seja especificamente a home.
    if (!isHome && isInternalRoute) {
      setView('login');
      return null; // O próximo ciclo de renderização mostrará o login
    }

    return (
      <LandingPage
        isAuthenticated={false}
        onLoginClick={() => setView('login')}
        onSignupClick={(type) => {
          if (type) {
            setSignupType(type);
            setView('signup_city');
          } else {
            setView('signup_type_selection');
          }
        }}
      />
    );
  }

  const renderBack = () => (
    <button
      onClick={() => setView(view === 'signup_form' ? (signupType === 'USER' ? 'signup_type_selection' : 'signup_city') : (view === 'signup_city' ? 'signup_type_selection' : 'landing'))}
      className="absolute top-6 left-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
    >
      <ArrowLeft className="w-6 h-6" />
    </button>
  );

  return (
    <div className="min-h-screen bg-white md:bg-[#f8fafc] dark:bg-gray-950 flex items-center justify-center p-0 md:p-6 relative overflow-x-hidden overflow-y-auto">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-600/10 dark:bg-brand-600/5 rounded-full blur-[120px] pointer-events-none" />

      {renderBack()}

      <div className="w-full max-w-md sm:max-w-xl md:max-w-md relative z-10 transition-all duration-500 animate-in fade-in zoom-in-95 min-h-screen md:min-h-0 flex flex-col justify-center">
        <div className="bg-white md:bg-white/80 dark:bg-gray-900 md:dark:bg-gray-900/80 backdrop-blur-2xl px-6 py-12 md:p-10 md:rounded-[48px] shadow-none md:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border-none md:border border-white/20 dark:border-gray-800/50 h-full md:h-auto flex flex-col justify-center">

          <div className="text-center mb-10">
            <div className="inline-flex p-4 bg-brand-50 dark:bg-brand-900/30 rounded-3xl mb-6 shadow-sm">
              <Logo className="h-10 w-auto text-brand-600" mode="icon" onClick={() => window.location.href = '/'} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {view === 'login' && 'Olá novamente! 👋'}
              {view === 'forgot_password' && 'Recuperar Senha'}
              {view === 'signup_type_selection' && 'Escolha seu perfil'}
              {(view === 'signup_form' || view === 'signup_city') && 'Criar sua conta'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">
              {view === 'login' && 'Acesse sua conta para continuar.'}
              {view === 'forgot_password' && 'Enviaremos um link para seu e-mail.'}
              {view === 'signup_type_selection' && 'Como você deseja utilizar o Zé Entregas?'}
              {view === 'signup_city' && 'Selecione sua cidade de atuação.'}
              {view === 'signup_form' && (
                signupType === 'STORE_PARTNER'
                  ? 'Preencha os dados da sua loja.'
                  : signupType === 'USER'
                    ? 'Complete seu cadastro para começar a comprar.'
                    : 'Preencha seus dados pessoais.'
              )}
            </p>
          </div>

          {authMessage && (
            <div className={`p-4 rounded-2xl mb-8 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${authMessage.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30'
              : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/30'
              }`}>
              <div className={`p-2 rounded-xl ${authMessage.type === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-green-100 dark:bg-green-900/40 text-green-600'}`}>
                {authMessage.type === 'error' ? <Ban className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              </div>
              <span className="text-sm font-bold">{authMessage.text}</span>
            </div>
          )}

          {view === 'login' && (
            <div className="space-y-5">
              <CustomInput
                label="Email"
                type="email"
                icon={Mail}
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="seu@email.com"
                autoComplete="email"
                autoFocus
                error={authMessage?.type === 'error' && authMessage.text.includes('Credenciais') ? true : undefined}
              />
              <div className="relative">
                <CustomInput
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  icon={Lock}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Sua senha secreta"
                  autoComplete="current-password"
                  error={authMessage?.type === 'error' && authMessage.text.includes('Credenciais') ? true : undefined}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[38px] p-2 text-gray-400 hover:text-brand-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setView('forgot_password')}
                  className="text-sm font-bold text-gray-500 hover:text-brand-600 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <Button
                fullWidth
                onClick={handleLogin}
                disabled={authLoading}
                className="py-5 text-lg font-black bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-600 shadow-[0_12px_24px_-8px_rgba(var(--brand-600-rgb),0.4)] transition-all active:scale-[0.98]"
              >
                {authLoading ? <Loading variant="inline" size="sm" className="text-white" /> : 'Entrar no Sistema'}
              </Button>

              <div className="pt-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Não tem uma conta? {' '}
                  <button
                    onClick={() => setView('signup_type_selection')}
                    className="text-brand-600 font-bold hover:underline"
                  >
                    Cadastre-se aqui
                  </button>
                </p>
              </div>
            </div>
          )}

          {view === 'signup_type_selection' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => {
                    setSignupType('STORE_PARTNER');
                    setView('signup_city');
                  }}
                  className="group flex items-center gap-4 p-5 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-blue-100 dark:border-blue-900/30 rounded-[32px] hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left"
                >
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <StoreIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-blue-900 dark:text-blue-100">Sou Lojista</h4>
                    <p className="text-xs text-blue-600/70 font-bold">Quero vender meus produtos</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSignupType('DELIVERY_PARTNER');
                    setView('signup_city');
                  }}
                  className="group flex items-center gap-4 p-5 bg-brand-50/50 dark:bg-brand-900/10 border-2 border-brand-100 dark:border-brand-900/30 rounded-[32px] hover:border-brand-500 dark:hover:border-brand-500 transition-all text-left"
                >
                  <div className="p-3 bg-brand-100 dark:bg-brand-900/40 text-brand-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-900 dark:text-brand-100">Sou Entregador</h4>
                    <p className="text-xs text-brand-600/70 font-bold">Quero realizar entregas</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSignupType('USER');
                    setView('signup_city');
                  }}
                  className="group flex items-center gap-4 p-5 bg-green-50/50 dark:bg-green-900/10 border-2 border-green-100 dark:border-green-900/30 rounded-[32px] hover:border-green-500 dark:hover:border-green-500 transition-all text-left"
                >
                  <div className="p-3 bg-green-100 dark:bg-green-900/40 text-green-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-green-900 dark:text-green-100">Apenas compra</h4>
                    <p className="text-xs text-green-600/70 font-bold">Quero fazer compras nos estabelecimentos</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setView('login')}
                className="w-full text-center text-sm font-bold text-gray-400 hover:text-brand-600 transition-colors pt-2"
              >
                Voltar para o login
              </button>
            </div>
          )}

          {view === 'forgot_password' && (
            <div className="space-y-6">
              <CustomInput
                label="Email"
                type="email"
                icon={Mail}
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                placeholder="seu@email.com"
                autoComplete="email"
                autoFocus
              />
              <Button fullWidth onClick={handleForgotPassword} disabled={authLoading} className="py-5 text-lg font-black shadow-lg">
                {authLoading ? <Loading variant="inline" size="sm" className="text-white" /> : 'Resetar Senha'}
              </Button>
              <button
                onClick={() => setView('login')}
                className="w-full text-center text-sm font-bold text-gray-500 hover:text-brand-600 transition-colors"
              >
                Voltar para o login
              </button>
            </div>
          )}

          {view === 'signup_city' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-2xl border-2 flex items-center gap-3 ${signupType === 'STORE_PARTNER' ? 'bg-blue-50/50 border-blue-100 text-blue-700 dark:bg-blue-900/10 dark:border-blue-900/30' :
                signupType === 'USER' ? 'bg-green-50/50 border-green-100 text-green-700 dark:bg-green-900/10 dark:border-green-900/30' :
                  'bg-brand-50/50 border-brand-100 text-brand-700 dark:bg-brand-900/10 dark:border-brand-900/30'
                }`}>
                <div className={`p-2 rounded-xl ${signupType === 'STORE_PARTNER' ? 'bg-blue-100 text-blue-600' :
                  signupType === 'USER' ? 'bg-green-100 text-green-600' :
                    'bg-brand-100 text-brand-600'
                  }`}>
                  {signupType === 'STORE_PARTNER' ? <StoreIcon className="w-5 h-5" /> :
                    signupType === 'USER' ? <Home className="w-5 h-5" /> :
                      <Truck className="w-5 h-5" />}
                </div>
                <span className="font-bold text-sm">
                  {signupType === 'STORE_PARTNER' ? 'Cadastro Lojista' :
                    signupType === 'USER' ? 'Cadastro de Cliente' :
                      'Cadastro Entregador'}
                </span>
              </div>

              <div className="pt-2">
                <CitySearchSelect
                  value={selectedCity}
                  onSelect={(city) => {
                    setSelectedCity(`${city.name} - ${city.state}`);
                    setView('signup_form');
                  }}
                  placeholder="Selecione sua cidade..."
                />
              </div>
            </div>
          )}

          {view === 'signup_form' && (
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 mb-2">
                <MapPin className="w-5 h-5 text-brand-600" />
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Cidade de atuação</p>
                  <p className="font-bold text-gray-700 dark:text-gray-200">{selectedCity}</p>
                </div>
                <button onClick={() => setView('signup_city')} className="p-2 text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <CustomInput
                type="text"
                placeholder="Nome Completo"
                icon={User}
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                autoFocus
              />
              <CustomInput
                type="email"
                placeholder="Email principal"
                icon={Mail}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomInput
                  type="tel"
                  placeholder="WhatsApp"
                  icon={Phone}
                  value={phone}
                  onChange={e => setPhone(formatPhoneNumber(e.target.value))}
                  maxLength={15}
                  inputMode="tel"
                />
                <CustomInput
                  type="text"
                  placeholder="CPF"
                  icon={FileText}
                  value={cpf}
                  onChange={e => setCpf(formatCpf(e.target.value))}
                  inputMode="numeric"
                  maxLength={14}
                />
              </div>

              {signupType === 'STORE_PARTNER' && (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest pl-1">Informações da Loja</h3>
                  <CustomInput type="text" placeholder="Nome Comercial da Loja" icon={StoreIcon} value={storeName} onChange={e => setStoreName(e.target.value)} />
                  <CustomInput type="text" placeholder="CPF/CNPJ do Negócio" icon={FileText} value={storeDocument} onChange={e => setStoreDocument(formatCnpjCpf(e.target.value))} maxLength={18} />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <CustomInput type="text" placeholder="CEP" icon={MapPin} value={addressZip} onChange={e => setAddressZip(e.target.value)} className="sm:col-span-1" />
                    <div className="sm:col-span-2">
                      <StreetSearchSelect
                        city={selectedCity.split(' - ')[0]}
                        value={addressStreet}
                        onSelect={setAddressStreet}
                        placeholder="Nome da Rua"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <CustomInput type="text" placeholder="Número" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} className="sm:col-span-1" />
                    <CustomInput type="text" placeholder="Bairro" value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} className="sm:col-span-2" />
                  </div>
                </div>
              )}

              <div className="relative pt-2">
                <CustomInput
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha forte (6+ caracteres)"
                  icon={Lock}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                  autoComplete="new-password"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[14px] p-2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="pt-4">
                <Button fullWidth onClick={handleSignup} disabled={authLoading} className="py-5 text-lg font-black bg-brand-600 shadow-xl">
                  {authLoading ? <Loading variant="inline" size="sm" className="mx-auto" /> : 'Finalizar e Começar'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-400 dark:text-gray-600 text-[10px] font-bold uppercase tracking-[2px]">
          &copy; {new Date().getFullYear()} Zé Entregas &bull; Versão 2.0 Premium
        </div>
      </div>
    </div>
  );
};
