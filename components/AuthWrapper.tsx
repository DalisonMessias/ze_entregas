
import React, { useState, useEffect } from 'react';
import { App } from '../App';
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

  const handle