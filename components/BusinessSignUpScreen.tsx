'use client';

import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { ensureDefaultBusinessData } from '@/lib/db';
import { ShoppingBag, Lock, Mail, Building2, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

interface BusinessSignUpScreenProps {
  onNavigateToLogin?: () => void;
  onSignUpSuccess?: () => void;
}

export function BusinessSignUpScreen({
  onNavigateToLogin,
  onSignUpSuccess,
}: BusinessSignUpScreenProps) {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanBusinessName = businessName.trim();
    const cleanEmail = email.trim();

    if (!cleanBusinessName) {
      setErrorMessage('Por favor, informe o nome do seu negócio.');
      return;
    }

    if (!cleanEmail) {
      setErrorMessage('Por favor, informe o e-mail do responsável.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Cria o usuário no Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const uid = cred.user.uid;

      // 2. Gera um novo businessId único do Firestore
      const newBusinessId = doc(collection(db, 'businesses')).id;

      // 3. Cria documento userBusinessMap/{uid}
      await setDoc(doc(db, 'userBusinessMap', uid), {
        businessId: newBusinessId,
        businessName: cleanBusinessName,
        role: 'owner',
        updatedAt: new Date().toISOString(),
      });

      // 4. Cria documento businesses/{newBusinessId}
      await setDoc(doc(db, 'businesses', newBusinessId), {
        id: newBusinessId,
        name: cleanBusinessName,
        ownerEmail: cleanEmail,
        createdAt: new Date().toISOString(),
        active: true,
      });

      // 5. Inicializa dados padrão do negócio (vendedor principal PIN 1234, produtos exemplo)
      await ensureDefaultBusinessData(newBusinessId, cleanBusinessName);

      if (onSignUpSuccess) {
        onSignUpSuccess();
      }
    } catch (err: unknown) {
      console.error('Erro ao cadastrar novo negócio:', err);
      const errCode = (err as { code?: string })?.code || '';

      if (errCode === 'auth/email-already-in-use') {
        setErrorMessage('Este e-mail já está cadastrado. Faça login ou use outro e-mail.');
      } else if (errCode === 'auth/weak-password') {
        setErrorMessage('A senha é muito fraca. Digite no mínimo 6 caracteres.');
      } else if (errCode === 'auth/invalid-email') {
        setErrorMessage('Formato de e-mail inválido. Verifique o endereço digitado.');
      } else if (errCode === 'auth/network-request-failed') {
        setErrorMessage('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      } else {
        setErrorMessage('Não foi possível concluir o cadastro. Verifique os dados e tente novamente.');
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
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Novo Cadastro</span>
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mt-1">
              Cadastrar Meu Negócio
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Crie a conta do seu negócio para gerenciar rotas, vendedores e cobranças.
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
            {/* Business Name Field */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5" htmlFor="signup-business-name">
                Nome do Negócio
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  id="signup-business-name"
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex: Queijaria da Serra, Mercearia Silva"
                  className="w-full pl-10 pr-3.5 py-3 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5" htmlFor="signup-email">
                E-mail do Responsável
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="signup-email"
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
              <label className="block text-xs font-bold text-neutral-700 mb-1.5" htmlFor="signup-password">
                Senha (mínimo 6 caracteres)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie uma senha segura"
                  className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  id="btn-toggle-signup-password"
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
              id="btn-submit-signup"
              disabled={isLoading}
              className="w-full mt-2 min-h-[48px] bg-amber-700 hover:bg-amber-800 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Criando negócio...</span>
                </div>
              ) : (
                <>
                  <span>Criar Conta e Começar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Link back to login */}
          <div className="mt-5 pt-4 border-t border-neutral-100 text-center">
            <button
              type="button"
              id="btn-go-to-login"
              onClick={onNavigateToLogin}
              className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline transition"
            >
              Já tenho conta cadastrada? Clique para Entrar
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-neutral-500">
          <p>Seu negócio será configurado com PIN inicial de vendedor: <strong>1234</strong></p>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            Você poderá alterar o PIN e criar outros vendedores a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
}
