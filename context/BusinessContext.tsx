'use client';

import React, { createContext, useContext } from 'react';
import { DEFAULT_BUSINESS_ID, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export interface BusinessContextType {
  businessId: string;
  businessName: string;
  userEmail: string | null;
  userId: string | null;
  logoutDevice: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType>({
  businessId: DEFAULT_BUSINESS_ID,
  businessName: 'Queijaria Artesanal da Serra',
  userEmail: null,
  userId: null,
  logoutDevice: async () => {},
});

export function BusinessProvider({
  children,
  businessId,
  businessName,
  userEmail,
  userId,
}: {
  children: React.ReactNode;
  businessId: string;
  businessName: string;
  userEmail: string | null;
  userId: string | null;
}) {
  const logoutDevice = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Erro ao sair do dispositivo:', err);
    }
  };

  return (
    <BusinessContext.Provider
      value={{
        businessId: businessId || DEFAULT_BUSINESS_ID,
        businessName: businessName || 'Meu Negócio',
        userEmail,
        userId,
        logoutDevice,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusiness deve ser usado dentro de um BusinessProvider');
  }
  return ctx;
}
