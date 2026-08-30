'use client';

import React, { useState } from 'react';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { useNetworkSync } from '@/hooks/use-network-sync';
import { Wifi, WifiOff, RefreshCw, UserCheck, Download, ShoppingBag, ShieldCheck } from 'lucide-react';
import { SellerSwitchModal } from './SellerSwitchModal';

interface HeaderProps {
  hasPendingWrites?: boolean;
}

export function Header({ hasPendingWrites }: HeaderProps) {
  const { activeSeller } = useSellerAuth();
  const { isOnline, canInstallPwa, promptInstall } = useNetworkSync();
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-amber-700 text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-300/30 flex items-center justify-center shadow-inner">
              <ShoppingBag className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight flex items-center gap-1.5 text-amber-50">
                PDV Express
                <span className="text-[10px] uppercase font-semibold tracking-wider bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-200">
                  MEI
                </span>
              </h1>
              <p className="text-xs text-amber-200/90 font-medium">Controle de Vendas & Fiado</p>
            </div>
          </div>

          {/* Right Status Actions */}
          <div className="flex items-center gap-2">
            {/* Install PWA Button */}
            {canInstallPwa && (
              <button
                id="btn-install-pwa"
                onClick={promptInstall}
                className="flex items-center gap-1 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1.5 rounded-lg transition active:scale-95 shadow-sm"
                title="Instalar aplicativo no celular"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Instalar</span>
              </button>
            )}

            {/* Offline / Online Status Badge */}
            <div
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                !isOnline
                  ? 'bg-red-500/90 text-white animate-pulse'
                  : hasPendingWrites
                  ? 'bg-amber-500 text-amber-950 font-semibold'
                  : 'bg-emerald-600/90 text-white'
              }`}
              title={
                !isOnline
                  ? 'Você está offline. As vendas serão salvas no aparelho e sincronizadas automaticamente.'
                  : hasPendingWrites
                  ? 'Sincronizando dados com o servidor...'
                  : 'Conectado e 100% sincronizado'
              }
            >
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Offline</span>
                </>
              ) : hasPendingWrites ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[11px]">Sincronizando</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden xs:inline">Online</span>
                </>
              )}
            </div>

            {/* Current Seller Button */}
            <button
              id="btn-switch-seller-header"
              onClick={() => setIsSwitchModalOpen(true)}
              className="flex items-center gap-1.5 bg-amber-900/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-100 px-2.5 py-1.5 rounded-lg text-xs font-medium transition active:scale-95"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-300" />
              <span className="max-w-[85px] truncate font-semibold">
                {activeSeller ? activeSeller.name.split(' ')[0] : 'Vendedor'}
              </span>
            </button>
          </div>
        </div>

        {/* Offline Warning Banner when offline */}
        {!isOnline && (
          <div className="bg-amber-900 text-amber-100 text-xs px-4 py-1.5 text-center font-medium border-t border-amber-800 flex items-center justify-center gap-1.5 shadow-inner">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Modo Rua (Sem internet): Pode registrar vendas e baixas normalmente!
          </div>
        )}
      </header>

      {isSwitchModalOpen && (
        <SellerSwitchModal onClose={() => setIsSwitchModalOpen(false)} />
      )}
    </>
  );
}
