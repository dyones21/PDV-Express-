'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Seller } from '@/types';
import { subscribeSellers, ensureDefaultBusinessData, addSeller as addSellerDb } from '@/lib/db';
import { verifyPin } from '@/lib/security';
import { DEFAULT_BUSINESS_ID } from '@/lib/firebase';

interface SellerAuthContextType {
  sellers: Seller[];
  activeSeller: Seller | null;
  isLoading: boolean;
  loginWithPin: (sellerId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  quickSelectSeller: (seller: Seller) => void;
  logout: () => void;
  createSeller: (name: string, role: 'owner' | 'seller', pin: string) => Promise<string>;
}

const SellerAuthContext = createContext<SellerAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'vendas_queijo_active_seller_id';

export function SellerAuthProvider({ children }: { children: React.ReactNode }) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [activeSeller, setActiveSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Initialize default data if needed
    ensureDefaultBusinessData().catch((err) => console.warn('Init data warning:', err));

    // 2. Subscribe to sellers
    const unsubscribe = subscribeSellers(DEFAULT_BUSINESS_ID, (list) => {
      setSellers(list);

      // Check stored seller ID
      const storedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (storedId) {
        const found = list.find((s) => s.id === storedId);
        if (found) {
          setActiveSeller(found);
        } else if (list.length > 0) {
          setActiveSeller(list[0]);
        }
      } else if (list.length > 0) {
        // Auto-select first seller for frictionless start
        setActiveSeller(list[0]);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, list[0].id);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithPin = async (sellerId: string, pin: string) => {
    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller) {
      return { success: false, error: 'Vendedor não encontrado' };
    }

    if (!seller.pinHash || !seller.pinSalt) {
      // Fallback if no pin configured
      setActiveSeller(seller);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, seller.id);
      }
      return { success: true };
    }

    const isValid = await verifyPin(pin, seller.pinSalt, seller.pinHash);
    if (isValid) {
      setActiveSeller(seller);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, seller.id);
      }
      return { success: true };
    }

    return { success: false, error: 'PIN incorreto. Tente novamente.' };
  };

  const quickSelectSeller = (seller: Seller) => {
    setActiveSeller(seller);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, seller.id);
    }
  };

  const logout = () => {
    setActiveSeller(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const createSeller = async (name: string, role: 'owner' | 'seller', pin: string) => {
    const newId = await addSellerDb(DEFAULT_BUSINESS_ID, { name, role, pin });
    return newId;
  };

  return (
    <SellerAuthContext.Provider
      value={{
        sellers,
        activeSeller,
        isLoading,
        loginWithPin,
        quickSelectSeller,
        logout,
        createSeller,
      }}
    >
      {children}
    </SellerAuthContext.Provider>
  );
}

export function useSellerAuth() {
  const ctx = useContext(SellerAuthContext);
  if (!ctx) {
    throw new Error('useSellerAuth must be used within a SellerAuthProvider');
  }
  return ctx;
}
