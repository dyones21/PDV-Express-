'use client';

import React, { useState } from 'react';
import { Seller } from '@/types';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { useNetworkSync } from '@/hooks/use-network-sync';
import { 
  Settings, 
  Users, 
  Wifi, 
  WifiOff, 
  Check, 
  ShieldCheck, 
  HardDrive,
  UserCheck,
  Smartphone
} from 'lucide-react';
import { SellerSwitchModal } from './SellerSwitchModal';

interface SettingsTabProps {
  sellers: Seller[];
  onOpenNewSale?: () => void;
}

export function SettingsTab({ sellers }: SettingsTabProps) {
  const { activeSeller } = useSellerAuth();
  const { isOnline, canInstallPwa, promptInstall } = useNetworkSync();
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);

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
            Trocar / Novo Vendedor
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
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
            Vendedores Habilitados ({sellers.length})
          </div>
          <div className="space-y-1.5 divide-y divide-neutral-100">
            {sellers.map((s) => (
              <div key={s.id} className="pt-1.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span className="font-semibold text-neutral-800">{s.name}</span>
                </div>
                <span className="text-[10px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {s.role === 'owner' ? 'Dono' : 'Ajudante'}
                </span>
              </div>
            ))}
          </div>
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

      {isSwitchModalOpen && (
        <SellerSwitchModal onClose={() => setIsSwitchModalOpen(false)} />
      )}
    </div>
  );
}
