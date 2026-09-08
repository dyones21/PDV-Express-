'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Seller } from '@/types';
import { subscribeSellers, addSeller as addSellerDb } from '@/lib/db';
import { verifyPin } from '@/lib/security';
import { useBusiness } from '@/context/BusinessContext';

interface SellerAuthContextType {
  sellers: Seller[];
  activeSeller: Seller | null;
  isOwner: boolean;
  isLoading: boolean;
  loginWithPin: (sellerId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  quickSelectSeller: (seller: Seller) => void;
  logout: () => void;
  createSeller: (name: string, role: 'owner' | 'seller', pin: string) => Promise<string>;
}

const SellerAuthContext = createContext<SellerAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'pdv_active_seller_id';
const LEGACY_STORAGE_KEY = 'vendas_queijo_active_seller_id';

interface PinAttemptsData {
  count: number;
  lockedUntil: number | null;
}

function getPinAttempts(sellerId: string): PinAttemptsData {
  if (typeof window === 'undefined') return { count: 0, lockedUntil: null };
  try {
    const raw = localStorage.getItem(`pdv_pin_attempts_${sellerId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        count: typeof parsed.count === 'number' ? parsed.count : 0,
        lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : null,
      };
    }
  } catch {}
  return { count: 0, lockedUntil: null };
}

function savePinAttempts(sellerId: string, data: PinAttemptsData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`pdv_pin_attempts_${sellerId}`, JSON.stringify(data));
  } catch {}
}

export function SellerAuthProvider({ children }: { children: React.ReactNode }) {
  const { businessId } = useBusiness();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [activeSeller, setActiveSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    // Subscribe to sellers
    const unsubscribe = subscribeSellers(businessId, (list) => {
      setSellers(list);

      // Check stored seller ID
      const storedId = typeof window !== 'undefined'
        ? localStorage.getItem(`${STORAGE_KEY}_${businessId}`) || localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
        : null;
      if (storedId) {
        const found = list.find((s) => s.id === storedId);
        if (found && found.active !== false) {
          setActiveSeller(found);
        } else {
          setActiveSeller(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`${STORAGE_KEY}_${businessId}`);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
          }
        }
      } else {
        // No stored seller: require explicit login/selection
        setActiveSeller(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [businessId]);

  const loginWithPin = async (sellerId: string, pin: string) => {
    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller || seller.active === false) {
      return { success: false, error: 'Vendedor não encontrado ou inativo.' };
    }

    if (!seller.pinHash || !seller.pinSalt) {
      // Fallback if no pin configured
      setActiveSeller(seller);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_KEY}_${businessId}`, seller.id);
        localStorage.setItem(STORAGE_KEY, seller.id);
      }
      return { success: true };
    }

    // Checar tentativas de PIN no localStorage
    const attempts = getPinAttempts(sellerId);
    const now = Date.now();

    if (attempts.lockedUntil && attempts.lockedUntil > now) {
      const remainingSeconds = Math.max(1, Math.ceil((attempts.lockedUntil - now) / 1000));
      return {
        success: false,
        error: `Muitas tentativas erradas. Tente novamente em ${remainingSeconds} segundos.`,
      };
    }

    // Se o bloqueio anterior já expirou, reseta o contador
    if (attempts.lockedUntil && attempts.lockedUntil <= now) {
      attempts.count = 0;
      attempts.lockedUntil = null;
      savePinAttempts(sellerId, attempts);
    }

    const isValid = await verifyPin(pin, seller.pinSalt, seller.pinHash);
    if (isValid) {
      savePinAttempts(sellerId, { count: 0, lockedUntil: null });
      setActiveSeller(seller);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_KEY}_${businessId}`, seller.id);
        localStorage.setItem(STORAGE_KEY, seller.id);
      }
      return { success: true };
    }

    const newCount = (attempts.count || 0) + 1;
    if (newCount >= 5) {
      const lockedUntil = now + 60000;
      savePinAttempts(sellerId, { count: newCount, lockedUntil });
      return {
        success: false,
        error: 'Muitas tentativas erradas. Tente novamente em 60 segundos.',
      };
    } else {
      savePinAttempts(sellerId, { count: newCount, lockedUntil: null });
      return { success: false, error: 'PIN incorreto. Tente novamente.' };
    }
  };

  const quickSelectSeller = (seller: Seller) => {
    if (seller.active === false) return;
    setActiveSeller(seller);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY}_${businessId}`, seller.id);
      localStorage.setItem(STORAGE_KEY, seller.id);
    }
  };

  const logout = () => {
    setActiveSeller(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEY}_${businessId}`);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const createSeller = async (name: string, role: 'owner' | 'seller', pin: string) => {
    const newId = await addSellerDb(businessId, { name, role, pin });
    return newId;
  };

  return (
    <SellerAuthContext.Provider
      value={{
        sellers,
        activeSeller,
        isOwner: activeSeller?.role === 'owner',
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
