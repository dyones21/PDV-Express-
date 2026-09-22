'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { useNetworkSync } from '@/hooks/use-network-sync';
import { useBusiness } from '@/context/BusinessContext';
import { subscribeBusinessNotices, markNoticeAsRead } from '@/lib/db';
import { BusinessNotice } from '@/types';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  UserCheck, 
  Download, 
  ShoppingBag, 
  HelpCircle, 
  Bell, 
  X, 
  CreditCard, 
  Sparkles, 
  Check, 
  MessageCircle 
} from 'lucide-react';
import { SellerSwitchModal } from './SellerSwitchModal';

interface HeaderProps {
  hasPendingWrites?: boolean;
}

export function Header({ hasPendingWrites }: HeaderProps) {
  const { activeSeller } = useSellerAuth();
  const { isOnline, canInstallPwa, promptInstall } = useNetworkSync();
  const { businessId } = useBusiness();

  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [notices, setNotices] = useState<BusinessNotice[]>([]);
  const [isNoticesOpen, setIsNoticesOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    const unsub = subscribeBusinessNotices(businessId, (items) => {
      setNotices(items);
    });
    return () => unsub();
  }, [businessId]);

  const unreadCount = notices.filter((n) => !n.read).length;

  const handleMarkAsRead = async (noticeId: string) => {
    if (!businessId) return;
    setMarkingId(noticeId);
    try {
      await markNoticeAsRead(businessId, noticeId);
    } catch (err) {
      console.error('Erro ao marcar aviso como lido:', err);
    } finally {
      setMarkingId(null);
    }
  };

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

            {/* Notification Bell */}
            <button
              type="button"
              id="btn-notices-header"
              onClick={() => setIsNoticesOpen(true)}
              className="relative flex items-center justify-center p-1.5 rounded-lg bg-amber-900/50 hover:bg-amber-900/80 border border-amber-500/30 text-amber-200 hover:text-white transition active:scale-95"
              title="Avisos e Notificações"
              aria-label="Avisos e Notificações"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-amber-700 shadow-sm animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Help / Ajuda */}
            <Link
              href="/ajuda"
              id="btn-help-header"
              className="flex items-center justify-center p-1.5 rounded-lg bg-amber-900/50 hover:bg-amber-900/80 border border-amber-500/30 text-amber-200 hover:text-white transition active:scale-95"
              title="Central de Ajuda"
              aria-label="Central de Ajuda"
            >
              <HelpCircle className="w-4 h-4" />
            </Link>

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

      {/* Seller Switch Modal */}
      {isSwitchModalOpen && (
        <SellerSwitchModal onClose={() => setIsSwitchModalOpen(false)} />
      )}

      {/* Notices & Reminders Modal */}
      {isNoticesOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-amber-700 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-200" />
                <div>
                  <h3 className="text-sm font-bold leading-tight">Avisos do Sistema</h3>
                  <p className="text-[11px] text-amber-200">
                    {unreadCount > 0 ? `${unreadCount} não lido(s)` : 'Nenhum aviso novo'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-notices-modal"
                onClick={() => setIsNoticesOpen(false)}
                className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-amber-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notices List */}
            <div className="p-4 overflow-y-auto space-y-3 divide-y divide-neutral-100 flex-1">
              {notices.length === 0 ? (
                <div className="py-10 text-center text-neutral-400">
                  <Bell className="w-10 h-10 mx-auto text-neutral-300 mb-2 stroke-1" />
                  <p className="text-sm font-semibold text-neutral-600">Nenhum aviso no momento</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Novos comunicados e lembretes aparecerão aqui quando enviados pelo administrador.
                  </p>
                </div>
              ) : (
                notices.map((notice) => {
                  const isUnread = !notice.read;
                  const isMarking = markingId === notice.id;

                  const formattedDate = notice.createdAt
                    ? new Intl.DateTimeFormat('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(
                        typeof (notice.createdAt as any).toDate === 'function'
                          ? (notice.createdAt as any).toDate()
                          : new Date(notice.createdAt as any)
                      )
                    : '';

                  return (
                    <div
                      key={notice.id}
                      className={`pt-3 first:pt-0 ${
                        isUnread ? 'bg-amber-50/60 -mx-4 px-4 py-3 rounded-xl border border-amber-200/70' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {notice.type === 'payment_reminder' ? (
                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                              <CreditCard className="w-4 h-4" />
                            </div>
                          ) : notice.type === 'update' ? (
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                              <Sparkles className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
                              <Bell className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-neutral-900 truncate">
                              {notice.title}
                            </h4>
                            {isUnread && (
                              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-600 text-white">
                                Novo
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-neutral-700 mt-1 leading-relaxed whitespace-pre-wrap">
                            {notice.message}
                          </p>

                          <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                            <span>{formattedDate}</span>

                            <div className="flex items-center gap-1.5">
                              {notice.type === 'payment_reminder' && (
                                <a
                                  href="https://wa.me/5522988542784?text=Ol%C3%A1%2C%20gostaria%20de%20tratar%20do%20pagamento%20do%20meu%20PDV%20Express."
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  id={`btn-whatsapp-notice-${notice.id}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                              )}

                              {isUnread ? (
                                <button
                                  type="button"
                                  id={`btn-mark-read-${notice.id}`}
                                  onClick={() => handleMarkAsRead(notice.id)}
                                  disabled={isMarking}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-neutral-200 hover:bg-neutral-300 text-neutral-800 transition disabled:opacity-50"
                                >
                                  {isMarking ? (
                                    <div className="w-3 h-3 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  <span>Marcar como lido</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-neutral-400" />
                                  Lido
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-neutral-50 px-4 py-2.5 border-t border-neutral-100 flex items-center justify-end">
              <button
                type="button"
                id="btn-close-notices-footer"
                onClick={() => setIsNoticesOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
