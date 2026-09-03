'use client';

import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth, setUserBusinessMap, DEFAULT_BUSINESS_ID } from '@/lib/firebase';
import { ShoppingBag, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface DeviceLoginScreenProps {
  onLoginSuccess?: () => void;
}

export function DeviceLoginScreen({ onLoginSuccess }: DeviceLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [businessNameInput, setBusinessNameInput] = useState('Queijaria Artesanal da Serra');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegisterMode) {
        // Create new account
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        // Link automatically to default business for easy onboarding
        await setUserBusinessMap(
          cred.user.uid,
          DEFAULT_BUSINESS_ID,
          businessNameInput.trim() || 'Meu Negócio MEI',
          'owner'
        );
      } else {
        // Standard device sign-in requested
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: unknown) {
      console.warn('Erro na autenticação do dispositivo:', err);
      const errCode = (err as { code?: string })?.code || '';

      if (errCode === 'auth/invalid-credential' || errCode === 'auth/wrong-password' || errCode === 'auth/user-not-found') {
        setErrorMessage('E-mail ou senha incorretos. Verifique suas credenciais.');
      } else if (errCode === 'auth/invalid-email') {
        setErrorMessage('Formato de e-mail inválido. Digite um e-mail válido.');
      } else if (errCode === 'auth/network-request-failed') {
        setErrorMessage('Sem conexão com a internet. O primeiro acesso deste aparelho precisa de conexão.');
      } else if (errCode === 'auth/email-already-in-use') {
        setErrorMessage('Este e-mail já está cadastrado. Mude para a aba "Entrar".');
      } else if (errCode === 'auth/weak-password') {
        setErrorMessage('A senha é muito fraca. Use no mínimo 6 caracteres.');
      } else {
        setErrorMessage('Não foi possível entrar. Tente novamente ou verifique os dados.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/60 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-700 text-amber-100 shadow-md border border-amber-600 mb-3">
            <ShoppingBag className="w-8 h-8 text-amber-200" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 flex items-center justify-center gap-2">
            PDV Express
            <span className="text-xs uppercase font-bold tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
              MEI
            </span>
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Controle de Vendas, Estoque e Fiado
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200/80">
          <div className="border-b border-neutral-100 pb-4 mb-5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Acesso do Dispositivo</span>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mt-1">
              {isRegisterMode ? 'Cadastrar Conta do Dono' : 'Conectar este Aparelho'}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              {isRegisterMode
                ? 'Crie a conta do dono para gerenciar seu negócio e vendedores.'
                : 'Faça login com a conta do negócio para autorizar este celular.'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5" htmlFor="device-business-name">
                  Nome do Negócio
                </label>
                <input
                  id="device-business-name"
                  type="text"
                  value={businessNameInput}
                  onChange={(e) => setBusinessNameInput(e.target.value)}
                  placeholder="Ex: Queijaria Artesanal da Serra"
                  className="w-full px-3.5 py-3 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5" htmlFor="device-login-email">
                E-mail do Proprietário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="device-login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu-email@exemplo.com"
                  className="w-full pl-10 pr-3.5 py-3 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5" htmlFor="device-login-password">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="device-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  id="btn-toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-device-submit-login"
              disabled={isLoading}
              className="w-full mt-2 min-h-[48px] bg-amber-700 hover:bg-amber-800 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Conectando...</span>
                </div>
              ) : (
                <>
                  <span>{isRegisterMode ? 'Criar Conta e Conectar' : 'Entrar'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-5 pt-4 border-t border-neutral-100 text-center">
            <button
              type="button"
              id="btn-toggle-register-mode"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrorMessage(null);
              }}
              className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline transition"
            >
              {isRegisterMode
                ? 'Já possui uma conta cadastrada? Clique para Entrar'
                : 'Primeiro acesso neste aparelho? Clique para Criar Conta'}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-neutral-500">
          <p>O login permanece salvo neste celular.</p>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            Depois de logado, os vendedores acessam apenas usando o PIN.
          </p>
        </div>
      </div>
    </div>
  );
}
