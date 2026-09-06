'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { collection, doc, getDocs, getDocsFromServer, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Business } from '@/types';
import { 
  Building2, 
  ShieldCheck, 
  LogOut, 
  RefreshCw, 
  Power, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Lock, 
  Mail, 
  ArrowRight, 
  Search,
  Check,
  Pencil,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react';
import { deleteBusinessCompletely } from '@/lib/db';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para edição de nome
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [editNameError, setEditNameError] = useState<string | null>(null);

  // Estados para exclusão permanente
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [isDeletingBusiness, setIsDeletingBusiness] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  function parseDate(val: unknown): string {
    if (!val) return new Date().toISOString();
    if (typeof val === 'string') return val;
    if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
      try {
        return (val as { toDate: () => Date }).toDate().toISOString();
      } catch {
        return new Date().toISOString();
      }
    }
    if (typeof (val as { seconds?: number }).seconds === 'number') {
      return new Date((val as { seconds: number }).seconds * 1000).toISOString();
    }
    return new Date().toISOString();
  }

  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    try {
      const colRef = collection(db, 'businesses');
      let snap;
      try {
        // Tenta obter diretamente do servidor para contornar qualquer cache estagnado
        snap = await getDocsFromServer(colRef);
      } catch {
        snap = await getDocs(colRef);
      }
      const list: Business[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || 'Sem nome',
          ownerEmail: data.ownerEmail,
          ownerUid: data.ownerUid,
          createdAt: parseDate(data.createdAt),
          active: data.active !== false,
        };
      });

      // Ordenar por data de criação decrescente com cálculo seguro
      list.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (isNaN(timeA) || isNaN(timeB)) return 0;
        return timeB - timeA;
      });

      setBusinesses(list);
      setIsAdmin(true);
    } catch (err: unknown) {
      console.warn('Erro ao consultar negócios (possível falta de permissão de admin):', err);
      const code = (err as { code?: string })?.code;
      if (code === 'permission-denied') {
        setIsAdmin(false);
      } else {
        setIsAdmin(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        setIsLoading(true);

        // Se o usuário for o administrador mestre, garante o registro na coleção platformAdmins
        if (user.email && user.email.toLowerCase() === 'dyones21@gmail.com') {
          try {
            await setDoc(
              doc(db, 'platformAdmins', user.uid),
              {
                email: user.email.toLowerCase(),
                role: 'superadmin',
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch {
            // Ignora se as regras já autorizarem via e-mail direto
          }
        }

        const colRef = collection(db, 'businesses');
        // Escuta atualizações em tempo real: novos cadastros aparecem instantaneamente no painel
        unsubscribeSnapshot = onSnapshot(
          colRef,
          (snap) => {
            const list: Business[] = snap.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                name: data.name || 'Sem nome',
                ownerEmail: data.ownerEmail,
                ownerUid: data.ownerUid,
                createdAt: parseDate(data.createdAt),
                active: data.active !== false,
              };
            });

            list.sort((a, b) => {
              const timeA = new Date(a.createdAt).getTime();
              const timeB = new Date(b.createdAt).getTime();
              if (isNaN(timeA) || isNaN(timeB)) return 0;
              return timeB - timeA;
            });

            setBusinesses(list);
            setIsAdmin(true);
            setIsLoading(false);
          },
          (err) => {
            console.warn('Erro no listener de negócios do painel admin:', err);
            const code = (err as { code?: string })?.code;
            if (code === 'permission-denied') {
              setIsAdmin(false);
            }
            setIsLoading(false);
          }
        );
      } else {
        setIsAdmin(null);
        setBusinesses([]);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      console.error('Erro no login admin:', err);
      const errCode = (err as { code?: string })?.code || '';
      if (errCode === 'auth/invalid-credential' || errCode === 'auth/user-not-found' || errCode === 'auth/wrong-password') {
        setLoginError('Credenciais inválidas. Verifique seu e-mail e senha.');
      } else {
        setLoginError('Não foi possível entrar. Tente novamente.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleToggleStatus = async (business: Business) => {
    const newStatus = business.active === false ? true : false;
    setTogglingId(business.id);
    setActionSuccessMessage(null);

    try {
      const bRef = doc(db, 'businesses', business.id);
      await updateDoc(bRef, {
        active: newStatus,
      });

      setBusinesses((prev) =>
        prev.map((b) => (b.id === business.id ? { ...b, active: newStatus } : b))
      );

      setActionSuccessMessage(
        `Negócio "${business.name}" foi ${newStatus ? 'ativado' : 'desativado'} com sucesso.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Erro ao alterar status do negócio:', err);
      alert('Falha ao atualizar o status. Verifique se você tem permissões de administrador.');
    } finally {
      setTogglingId(null);
    }
  };

  // 1) EDITAR NOME DO NEGÓCIO
  const handleOpenEditName = (business: Business) => {
    setEditingBusiness(business);
    setNewBusinessName(business.name);
    setEditNameError(null);
  };

  const handleSaveBusinessName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;
    const trimmed = newBusinessName.trim();
    if (!trimmed) {
      setEditNameError('O nome do negócio não pode ficar em branco.');
      return;
    }

    setIsSavingName(true);
    setEditNameError(null);
    try {
      const bRef = doc(db, 'businesses', editingBusiness.id);
      await updateDoc(bRef, { name: trimmed });

      setBusinesses((prev) =>
        prev.map((b) => (b.id === editingBusiness.id ? { ...b, name: trimmed } : b))
      );

      setActionSuccessMessage(`Nome do negócio atualizado para "${trimmed}" com sucesso.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setEditingBusiness(null);
    } catch (err: unknown) {
      console.error('Erro ao atualizar nome do negócio:', err);
      setEditNameError('Falha ao atualizar o nome. Verifique suas permissões de administrador.');
    } finally {
      setIsSavingName(false);
    }
  };

  // 2) EXCLUIR CONTA DE UM NEGÓCIO (PERMANENTE)
  const handleOpenDelete = (business: Business) => {
    setBusinessToDelete(business);
    setConfirmDeleteInput('');
    setDeleteError(null);
  };

  const isDeleteConfirmed =
    Boolean(businessToDelete) &&
    confirmDeleteInput.trim() === businessToDelete?.name.trim();

  const handleConfirmDeleteBusiness = async () => {
    if (!businessToDelete || !isDeleteConfirmed || isDeletingBusiness) return;
    setIsDeletingBusiness(true);
    setDeleteError(null);

    try {
      await deleteBusinessCompletely(businessToDelete.id);

      setBusinesses((prev) => prev.filter((b) => b.id !== businessToDelete.id));
      setActionSuccessMessage(
        `A conta do negócio "${businessToDelete.name}" e todos os seus dados foram excluídos com sucesso.`
      );
      setTimeout(() => setActionSuccessMessage(null), 5000);
      setBusinessToDelete(null);
    } catch (err: unknown) {
      console.error('Erro ao excluir negócio definitivamente:', err);
      const msg = (err as { message?: string })?.message || 'Falha na exclusão do negócio.';
      setDeleteError(`Erro ao excluir: ${msg}`);
    } finally {
      setIsDeletingBusiness(false);
    }
  };

  // 1. Estado inicial de carregamento da sessão
  if (currentUser === undefined || (currentUser && isLoading && isAdmin === null)) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-neutral-300">Verificando autorização administrativa...</p>
        </div>
      </div>
    );
  }

  // 2. Não autenticado -> Formulário simples de login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Administração PDV Express
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Acesso exclusivo para administradores da plataforma
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1" htmlFor="admin-email">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pdvexpress.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1" htmlFor="admin-password">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-admin-submit-login"
              disabled={isLoggingIn}
              className="w-full min-h-[44px] mt-2 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Acessando...</span>
                </div>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Usuário logado mas sem documento em platformAdmins/{uid} -> Bloqueio estrito
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center shadow-xl">
          <div className="w-12 h-12 bg-red-950/60 border border-red-800/80 rounded-full flex items-center justify-center mx-auto mb-3 text-red-400">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">Acesso restrito.</h2>
          <p className="text-xs text-neutral-400 mt-2">
            Esta conta não possui privilégios de administrador da plataforma.
          </p>

          <div className="mt-4 p-2.5 bg-neutral-800/60 rounded-xl border border-neutral-700/50 text-[11px] text-neutral-400 break-all text-left">
            <div><strong className="text-neutral-300">Conta:</strong> {currentUser.email}</div>
            <div className="mt-1"><strong className="text-neutral-300">UID:</strong> {currentUser.uid}</div>
          </div>

          <button
            type="button"
            id="btn-admin-logout-restricted"
            onClick={() => signOut(auth)}
            className="w-full mt-5 min-h-[40px] px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Usuário logado e confirmado como administrador da plataforma
  const filteredBusinesses = businesses.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      (b.ownerEmail && b.ownerEmail.toLowerCase().includes(q)) ||
      b.id.toLowerCase().includes(q)
    );
  });

  const totalCount = businesses.length;
  const activeCount = businesses.filter((b) => b.active !== false).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10 px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">
                Administração PDV Express
              </h1>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Painel de Controle Multi-Tenant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 rounded-lg border border-neutral-700 text-xs text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{currentUser.email}</span>
            </div>

            <button
              type="button"
              id="btn-admin-refresh-list"
              onClick={fetchBusinesses}
              disabled={isLoading}
              title="Recarregar negócios"
              className="p-2 text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              type="button"
              id="btn-admin-logout"
              onClick={() => signOut(auth)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-red-950/60 hover:text-red-300 hover:border-red-800 text-neutral-300 rounded-lg border border-neutral-700 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full p-4 sm:p-6 flex-1">
        {/* Success Alert */}
        {actionSuccessMessage && (
          <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Stats & Search Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-medium">
              Total: <strong className="text-white font-bold">{totalCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Ativos: <strong className="text-white font-bold">{activeCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-300 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Inativos: <strong className="text-white font-bold">{inactiveCount}</strong>
            </span>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              id="admin-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar negócio ou e-mail..."
              className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Businesses List */}
        {isLoading && businesses.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-neutral-400">Carregando lista de negócios...</p>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
            <Building2 className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-300">Nenhum negócio encontrado</p>
            <p className="text-xs text-neutral-500 mt-1">
              {searchQuery ? 'Nenhum resultado para os termos da busca.' : 'Ainda não há negócios cadastrados.'}
            </p>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Negócio</th>
                    <th className="py-3 px-4">E-mail do Responsável</th>
                    <th className="py-3 px-4">Data de Cadastro</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredBusinesses.map((b) => {
                    const isActive = b.active !== false;
                    const isToggling = togglingId === b.id;

                    const formattedDate = b.createdAt
                      ? new Intl.DateTimeFormat('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(b.createdAt))
                      : 'Data não informada';

                    return (
                      <tr key={b.id} className="hover:bg-neutral-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-100 text-sm">{b.name}</div>
                          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                            ID: {b.id}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-300">
                          {b.ownerEmail ? (
                            <span className="font-mono text-xs">{b.ownerEmail}</span>
                          ) : (
                            <span className="text-neutral-500 italic">Não informado</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-400">
                          {formattedDate}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/80">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-950/80 text-red-300 border border-red-700/80">
                              <XCircle className="w-3 h-3 text-red-400" />
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* 1) Editar Nome */}
                            <button
                              type="button"
                              id={`btn-edit-name-${b.id}`}
                              onClick={() => handleOpenEditName(b)}
                              title="Editar nome do negócio"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
                            >
                              <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Editar Nome</span>
                            </button>

                            {/* Ativar / Desativar */}
                            <button
                              type="button"
                              id={`btn-toggle-status-${b.id}`}
                              onClick={() => handleToggleStatus(b)}
                              disabled={isToggling}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                                isActive
                                  ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800/60'
                                  : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/60'
                              } disabled:opacity-50`}
                            >
                              {isToggling ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Power className="w-3.5 h-3.5" />
                              )}
                              <span>{isActive ? 'Desativar' : 'Ativar'}</span>
                            </button>

                            <span className="w-px h-4 bg-neutral-800" />

                            {/* 2) Excluir Conta (Permanente) */}
                            <button
                              type="button"
                              id={`btn-delete-business-${b.id}`}
                              onClick={() => handleOpenDelete(b)}
                              title="Excluir conta permanentemente"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border bg-red-950/40 hover:bg-red-900/70 text-red-300 border-red-800/70"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Excluir Conta</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-neutral-800">
              {filteredBusinesses.map((b) => {
                const isActive = b.active !== false;
                const isToggling = togglingId === b.id;

                const formattedDate = b.createdAt
                  ? new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(b.createdAt))
                  : 'Data não informada';

                return (
                  <div key={b.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white text-sm">{b.name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          ID: {b.id}
                        </div>
                      </div>
                      <div>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/80">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-700/80">
                            <XCircle className="w-2.5 h-2.5 text-red-400" />
                            Inativo
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-neutral-300 space-y-1 bg-neutral-950/50 p-2.5 rounded-xl border border-neutral-800/80">
                      <div>
                        <span className="text-neutral-500">E-mail: </span>
                        <span className="font-mono">{b.ownerEmail || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Cadastro: </span>
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {/* Botões de Ação Mobile */}
                    <div className="pt-2 border-t border-neutral-800/60 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id={`btn-mobile-edit-name-${b.id}`}
                          onClick={() => handleOpenEditName(b)}
                          className="min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
                        >
                          <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Editar Nome</span>
                        </button>

                        <button
                          type="button"
                          id={`btn-mobile-toggle-${b.id}`}
                          onClick={() => handleToggleStatus(b)}
                          disabled={isToggling}
                          className={`min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                            isActive
                              ? 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800/60'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/60'
                          } disabled:opacity-50`}
                        >
                          {isToggling ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
                          <span>{isActive ? 'Desativar' : 'Ativar'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        id={`btn-mobile-delete-${b.id}`}
                        onClick={() => handleOpenDelete(b)}
                        className="w-full min-h-[38px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border bg-red-950/40 hover:bg-red-900/70 text-red-300 border-red-800/70"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Excluir Conta do Negócio</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Editar Nome do Negócio */}
      {editingBusiness && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-neutral-850 px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Pencil className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">Editar Nome do Negócio</h3>
              </div>
              <button
                type="button"
                id="btn-close-edit-name"
                onClick={() => setEditingBusiness(null)}
                disabled={isSavingName}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBusinessName} className="p-5 space-y-4">
              {editNameError && (
                <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{editNameError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1" htmlFor="input-edit-business-name">
                  Novo Nome do Negócio
                </label>
                <input
                  id="input-edit-business-name"
                  type="text"
                  required
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  placeholder="Nome do negócio"
                  disabled={isSavingName}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
                <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                  ID: {editingBusiness.id}
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  id="btn-cancel-edit-name"
                  onClick={() => setEditingBusiness(null)}
                  disabled={isSavingName}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-confirm-save-name"
                  disabled={isSavingName || !newBusinessName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold shadow transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingName ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Nome</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Excluir Conta do Negócio (Permanente) */}
      {businessToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-red-900/60 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-red-950/70 border-b border-red-900/50 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-300">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold">Excluir Conta do Negócio</h3>
              </div>
              <button
                type="button"
                id="btn-close-delete-modal"
                onClick={() => {
                  if (!isDeletingBusiness) setBusinessToDelete(null);
                }}
                disabled={isDeletingBusiness}
                className="p-1 rounded-lg text-red-400 hover:text-white hover:bg-red-900/60 transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {deleteError && (
                <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* Informações da Conta */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 text-xs">
                <div>
                  <span className="text-neutral-500 font-medium">Nome do Negócio: </span>
                  <strong className="text-white font-bold text-sm">{businessToDelete.name}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 font-medium">E-mail do Dono: </span>
                  <span className="font-mono text-neutral-300">{businessToDelete.ownerEmail || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-medium">ID da Empresa: </span>
                  <span className="font-mono text-neutral-400 text-[11px]">{businessToDelete.id}</span>
                </div>
              </div>

              {/* Alerta de Perigo Irreversível */}
              <div className="p-3.5 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-200 leading-relaxed">
                <strong className="block text-red-300 font-bold mb-1">Ação Irreversível:</strong>
                Isso vai apagar PERMANENTEMENTE todos os produtos, clientes, vendas, pagamentos e vendedores deste negócio, além do acesso dele ao sistema. Essa ação não pode ser desfeita.
              </div>

              {/* Campo de confirmação com nome exato */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1" htmlFor="input-confirm-delete-business">
                  Para confirmar, digite exatamente <strong className="text-amber-300 select-all font-mono">&quot;{businessToDelete.name}&quot;</strong> abaixo:
                </label>
                <input
                  id="input-confirm-delete-business"
                  type="text"
                  value={confirmDeleteInput}
                  onChange={(e) => setConfirmDeleteInput(e.target.value)}
                  placeholder={`Digite "${businessToDelete.name}"`}
                  disabled={isDeletingBusiness}
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium disabled:opacity-50"
                  autoComplete="off"
                />
              </div>

              {/* Aviso sobre autenticação */}
              <p className="text-[11px] text-neutral-400 bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/70">
                ⚠️ <strong className="text-neutral-300">Aviso:</strong> O e-mail de login não será liberado para reuso automaticamente.
              </p>

              {/* Botões de Ação */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  id="btn-cancel-delete-business"
                  onClick={() => setBusinessToDelete(null)}
                  disabled={isDeletingBusiness}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-bold transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-business"
                  onClick={handleConfirmDeleteBusiness}
                  disabled={!isDeleteConfirmed || isDeletingBusiness}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold shadow transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isDeletingBusiness ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <span>Excluir Definitivamente</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
