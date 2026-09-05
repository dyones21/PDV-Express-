'use client';

import React, { useState } from 'react';
import { Seller, Sale, Customer } from '@/types';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { useNetworkSync } from '@/hooks/use-network-sync';
import { exportSalesCsv, exportDebtorsCsv } from '@/lib/export-csv';
import { updateSeller } from '@/lib/db';
import { ConfirmDialog } from './ConfirmDialog';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  Settings, 
  Users, 
  Wifi, 
  WifiOff, 
  Check, 
  ShieldCheck, 
  HardDrive,
  UserCheck,
  UserX,
  Smartphone,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Power,
  X,
  KeyRound,
  ShieldAlert,
  LogOut
} from 'lucide-react';
import { SellerSwitchModal } from './SellerSwitchModal';

interface SettingsTabProps {
  sellers: Seller[];
  sales?: Sale[];
  customers?: Customer[];
  onOpenNewSale?: () => void;
}

export function SettingsTab({ sellers, sales = [], customers = [] }: SettingsTabProps) {
  const { activeSeller, isOwner, createSeller } = useSellerAuth();
  const { isOnline, canInstallPwa, promptInstall } = useNetworkSync();
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');

  // New Seller Form Modal State
  const [isAddSellerOpen, setIsAddSellerOpen] = useState(false);
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerRole, setNewSellerRole] = useState<'owner' | 'seller'>('seller');
  const [newSellerPin, setNewSellerPin] = useState('');
  const [sellerFormError, setSellerFormError] = useState('');
  const [isSubmittingSeller, setIsSubmittingSeller] = useState(false);
  const [sellerToToggle, setSellerToToggle] = useState<{ seller: Seller; nextActive: boolean } | null>(null);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleConfirmSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut(auth);
    } catch (err: any) {
      console.error('Erro ao desconectar:', err);
      alert('Erro ao desconectar dispositivo: ' + (err?.message || 'Tente novamente.'));
      setIsSigningOut(false);
      setIsSignOutDialogOpen(false);
    }
  };

  const handleExportSales = () => {
    exportSalesCsv(sales, exportStartDate || undefined, exportEndDate || undefined);
    setExportSuccessMsg('Arquivo de vendas exportado com sucesso!');
    setTimeout(() => setExportSuccessMsg(''), 4000);
  };

  const handleExportDebtors = () => {
    exportDebtorsCsv(customers, sales);
    setExportSuccessMsg('Arquivo de clientes e fiados exportado com sucesso!');
    setTimeout(() => setExportSuccessMsg(''), 4000);
  };

  const handleCreateNewSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerName.trim()) {
      setSellerFormError('Digite o nome do vendedor.');
      return;
    }
    const cleanPin = newSellerPin.trim();
    if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setSellerFormError('O PIN deve conter exatamente 4 dígitos numéricos.');
      return;
    }

    try {
      setIsSubmittingSeller(true);
      setSellerFormError('');
      await createSeller(newSellerName.trim(), newSellerRole, cleanPin);
      setIsAddSellerOpen(false);
      setNewSellerName('');
      setNewSellerPin('');
      setNewSellerRole('seller');
    } catch (err: any) {
      setSellerFormError('Erro ao cadastrar vendedor: ' + err.message);
    } finally {
      setIsSubmittingSeller(false);
    }
  };

  const handleToggleSellerActive = (seller: Seller) => {
    const isCurrentlyActive = seller.active !== false;
    const nextActive = !isCurrentlyActive;

    // Regra 1: Não permitir inativar o próprio vendedor logado no momento
    if (isCurrentlyActive && activeSeller?.id === seller.id) {
      alert('Você não pode inativar o vendedor atualmente em operação. Troque de vendedor antes de inativá-lo.');
      return;
    }

    // Regra 2: Não permitir inativar o último vendedor com papel "owner" ativo
    if (isCurrentlyActive && seller.role === 'owner') {
      const activeOwners = sellers.filter((s) => s.role === 'owner' && s.active !== false);
      if (activeOwners.length <= 1) {
        alert('Não é possível inativar este vendedor. O sistema precisa manter pelo menos 1 Dono (proprietário) ativo.');
        return;
      }
    }

    setSellerToToggle({ seller, nextActive });
  };

  const handleConfirmToggleSeller = async () => {
    if (!sellerToToggle) return;
    const { seller, nextActive } = sellerToToggle;
    try {
      await updateSeller(undefined, seller.id, { active: nextActive });
      setSellerToToggle(null);
    } catch (err: any) {
      alert('Erro ao alterar status do vendedor: ' + err.message);
    }
  };

  return (
    <div className="space-y-5 pb-24 pt-2">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-lg font-bold text-neutral-900 leading-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-700" />
          <span>Configurações do Sistema</span>
        </h2>
        <p className="text-xs text-neutral-500 font-medium">
          Vendedores da rota, proteção por PIN e status offline
        </p>
      </div>

      {/* Vendedor Atual & Troca */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-bold text-neutral-900">Vendedor em Operação</h3>
          </div>
          <button
            id="btn-switch-seller-settings"
            type="button"
            onClick={() => setIsSwitchModalOpen(true)}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200"
          >
            Trocar Vendedor
          </button>
        </div>

        <div className="flex items-center justify-between p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-amber-700 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
              {activeSeller ? activeSeller.name.charAt(0).toUpperCase() : 'V'}
            </div>
            <div>
              <div className="font-bold text-sm text-neutral-900">
                {activeSeller ? activeSeller.name : 'Nenhum vendedor selecionado'}
              </div>
              <div className="text-xs text-neutral-600 font-medium">
                {activeSeller?.role === 'owner' ? '👑 Dono do Negócio (MEI)' : '🚚 Ajudante de Rota'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-4 h-4" />
            <span>Ativo</span>
          </div>
        </div>

        {/* Lista de Vendedores Cadastrados */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Vendedores Habilitados ({sellers.length})
            </div>
            {isOwner && (
              <button
                id="btn-add-seller-settings"
                type="button"
                onClick={() => {
                  setSellerFormError('');
                  setNewSellerName('');
                  setNewSellerPin('');
                  setNewSellerRole('seller');
                  setIsAddSellerOpen(true);
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Vendedor</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {sellers.map((s) => {
              const isInactive = s.active === false;
              const isCurrent = activeSeller?.id === s.id;
              return (
                <div
                  key={s.id}
                  id={`seller-row-${s.id}`}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                    isInactive
                      ? 'bg-neutral-50 border-neutral-200 opacity-60'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isInactive
                          ? 'bg-neutral-200 text-neutral-500'
                          : s.role === 'owner'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-semibold text-xs truncate ${isInactive ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                          {s.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.2 rounded">
                            Atual
                          </span>
                        )}
                        {isInactive && (
                          <span className="text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.2 rounded">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-medium mt-0.5">
                        {s.role === 'owner' ? '👑 Dono / Administrador' : '🚚 Ajudante / Vendedor'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                      {s.role === 'owner' ? 'Dono' : 'Ajudante'}
                    </span>

                    {/* Ativar/Inativar Button */}
                    <button
                      id={`btn-toggle-seller-${s.id}`}
                      type="button"
                      onClick={() => handleToggleSellerActive(s)}
                      className={`p-1.5 rounded-lg transition text-xs font-semibold ${
                        isInactive
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : isCurrent
                          ? 'text-neutral-300 cursor-not-allowed'
                          : 'text-neutral-400 hover:text-red-700 hover:bg-red-50'
                      }`}
                      title={
                        isInactive
                          ? 'Reativar vendedor'
                          : isCurrent
                          ? 'Vendedor em uso (troque de vendedor antes de inativar)'
                          : 'Inativar vendedor'
                      }
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Backup & Exportação de Dados */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-amber-700" />
          <h3 className="text-sm font-bold text-neutral-900">Exportação & Backup de Dados</h3>
        </div>

        <p className="text-xs text-neutral-600">
          Baixe cópias em planilha (CSV/Excel) das suas vendas e clientes para conferência ou segurança no computador.
        </p>

        {exportSuccessMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
        )}

        {/* Filtro Opcional de Período para Vendas */}
        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
          <div className="text-xs font-bold text-neutral-800">
            1. Relatório de Vendas
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Data Início (opcional):</label>
              <input
                id="input-export-start-date"
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-300 text-neutral-800 text-xs focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Data Fim (opcional):</label>
              <input
                id="input-export-end-date"
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-neutral-300 text-neutral-800 text-xs focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            id="btn-export-sales-csv"
            type="button"
            onClick={handleExportSales}
            className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Vendas (.CSV / Excel)</span>
          </button>
        </div>

        {/* Exportar Clientes e Fiados */}
        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
          <div className="text-xs font-bold text-neutral-800">
            2. Relatório de Clientes com Fiado em Aberto
          </div>
          <p className="text-[11px] text-neutral-500">
            Gera a lista completa com nome, telefone, endereço, ponto de referência e valor a receber de cada cliente.
          </p>
          <button
            id="btn-export-debtors-csv"
            type="button"
            onClick={handleExportDebtors}
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 transition active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Clientes com Saldo Devedor (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Offline & App Diagnostics */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-700" />
          <h3 className="text-sm font-bold text-neutral-900">Status Offline & Sincronização</h3>
        </div>

        <div className="p-3 bg-neutral-50 rounded-xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 font-medium">Conexão Atual:</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                isOnline ? 'text-emerald-700' : 'text-amber-800'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? 'Internet Conectada' : 'Sem Conexão (Modo Offline Ativo)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-600 font-medium">Persistência Firestore:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              IndexedDB Multi-Tab Habilitado
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-600 font-medium">PWA Instalável no Celular:</span>
            <span className="font-bold text-amber-900 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" />
              {canInstallPwa ? 'Disponível para Instalar' : 'Configurado (Manifest + SW)'}
            </span>
          </div>

          {canInstallPwa && (
            <button
              id="btn-install-pwa-settings"
              type="button"
              onClick={promptInstall}
              className="w-full mt-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Smartphone className="w-4 h-4" />
              <span>Instalar Aplicativo no Smartphone</span>
            </button>
          )}
        </div>
      </div>

      {/* Sair do Sistema (Logout Completo do Dispositivo) */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-bold text-neutral-900">Sair do Sistema</h3>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Desconecta este celular do sistema. Para voltar a usar, será necessário entrar com e-mail e senha.
          </p>
        </div>

        <button
          id="btn-sign-out-device"
          type="button"
          onClick={() => setIsSignOutDialogOpen(true)}
          className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 font-bold text-xs transition active:scale-98 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4 text-neutral-500" />
          <span>Sair do Sistema</span>
        </button>
      </div>

      {isSwitchModalOpen && (
        <SellerSwitchModal onClose={() => setIsSwitchModalOpen(false)} />
      )}

      {/* Modal: Adicionar Novo Vendedor */}
      {isAddSellerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-amber-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-bold">Adicionar Vendedor</h3>
              </div>
              <button
                id="btn-close-add-seller"
                type="button"
                onClick={() => setIsAddSellerOpen(false)}
                className="p-1 rounded-full text-amber-200 hover:text-white hover:bg-amber-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewSeller} className="p-5 space-y-4">
              {sellerFormError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{sellerFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nome do Vendedor *
                </label>
                <input
                  id="input-new-seller-name"
                  type="text"
                  placeholder="Ex: Carlos (Ajudante)"
                  value={newSellerName}
                  onChange={(e) => setNewSellerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-neutral-50/50 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Papel no Sistema *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSellerRole('seller')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-0.5 ${
                      newSellerRole === 'seller'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <span>🚚 Ajudante</span>
                    <span className="text-[10px] font-normal text-neutral-500">Vendas e cobranças</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSellerRole('owner')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-0.5 ${
                      newSellerRole === 'owner'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <span>👑 Dono (MEI)</span>
                    <span className="text-[10px] font-normal text-neutral-500">Acesso total</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  PIN de Acesso (4 dígitos numéricos) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    id="input-new-seller-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="Ex: 1234"
                    value={newSellerPin}
                    onChange={(e) => setNewSellerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full pl-9 pr-3 py-2 text-sm tracking-widest rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-neutral-50/50 font-bold"
                    required
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Código de 4 números usado para entrar no aplicativo.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSellerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-50 transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-add-seller"
                  type="submit"
                  disabled={isSubmittingSeller}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold shadow transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingSeller ? 'Salvando...' : 'Salvar Vendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Ativar/Inativar Vendedor */}
      <ConfirmDialog
        isOpen={Boolean(sellerToToggle)}
        title={sellerToToggle?.nextActive ? 'Reativar Vendedor' : 'Inativar Vendedor'}
        message={
          sellerToToggle?.nextActive
            ? `Deseja reativar o vendedor "${sellerToToggle.seller.name}"? Ele voltará a ter acesso para login no aplicativo.`
            : `Deseja inativar o vendedor "${sellerToToggle?.seller.name}"? Ele não poderá mais fazer login, mas seu histórico de vendas será preservado.`
        }
        confirmLabel={sellerToToggle?.nextActive ? 'Reativar' : 'Inativar'}
        variant={sellerToToggle?.nextActive ? 'primary' : 'warning'}
        onConfirm={handleConfirmToggleSeller}
        onCancel={() => setSellerToToggle(null)}
      />

      {/* Modal de Confirmação: Sair do Sistema (Logout Completo do Dispositivo) */}
      <ConfirmDialog
        isOpen={isSignOutDialogOpen}
        title="Sair do Sistema"
        message="Isso vai desconectar este dispositivo. Será necessário fazer login novamente com e-mail e senha para voltar a usar o sistema. Deseja continuar?"
        confirmLabel={isSigningOut ? 'Saindo...' : 'Sair do Sistema'}
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmSignOut}
        onCancel={() => {
          if (!isSigningOut) {
            setIsSignOutDialogOpen(false);
          }
        }}
      />
    </div>
  );
}
