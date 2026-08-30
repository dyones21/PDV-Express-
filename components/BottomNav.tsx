'use client';

import React from 'react';
import { Home, PlusCircle, HandCoins, History, Users, Settings } from 'lucide-react';

export type TabType = 'hoje' | 'nova-venda' | 'a-receber' | 'historico' | 'clientes' | 'config';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  pendingDebtorsCount?: number;
}

export function BottomNav({ activeTab, onChangeTab, pendingDebtorsCount = 0 }: BottomNavProps) {
  const tabs = [
    { id: 'hoje' as TabType, label: 'Hoje', icon: Home },
    { id: 'nova-venda' as TabType, label: 'Vender', icon: PlusCircle, isPrimary: true },
    { id: 'a-receber' as TabType, label: 'A Receber', icon: HandCoins, badge: pendingDebtorsCount },
    { id: 'historico' as TabType, label: 'Histórico', icon: History },
    { id: 'clientes' as TabType, label: 'Clientes', icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-amber-200/60 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto px-2 flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isPrimary) {
            return (
              <button
                key={tab.id}
                id="tab-btn-nova-venda"
                onClick={() => onChangeTab(tab.id)}
                className="relative -top-4 flex flex-col items-center group focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${
                    isActive
                      ? 'bg-amber-800 ring-4 ring-amber-300 text-white scale-105'
                      : 'bg-amber-600 hover:bg-amber-700 text-white ring-4 ring-amber-100'
                  }`}
                >
                  <PlusCircle className="w-8 h-8 stroke-[2.5]" />
                </div>
                <span
                  className={`text-[11px] font-bold mt-1 ${
                    isActive ? 'text-amber-800' : 'text-neutral-600'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 py-1 flex flex-col items-center justify-center relative transition-colors ${
                isActive ? 'text-amber-800 font-bold' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-amber-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <div className="w-4 h-0.5 bg-amber-700 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
