'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Product, Sale, Payment, Seller } from '@/types';
import { 
  subscribeCustomers, 
  subscribeProducts, 
  subscribeSales, 
  subscribePayments, 
  subscribeSellers 
} from '@/lib/db';
import { SellerAuthProvider } from '@/hooks/use-seller-auth';
import { Header } from '@/components/Header';
import { BottomNav, TabType } from '@/components/BottomNav';
import { TodaySummaryTab } from '@/components/TodaySummaryTab';
import { NewSaleTab } from '@/components/NewSaleTab';
import { DebtorsTab } from '@/components/DebtorsTab';
import { HistoryTab } from '@/components/HistoryTab';
import { CustomersTab } from '@/components/CustomersTab';
import { ProductsTab } from '@/components/ProductsTab';
import { SettingsTab } from '@/components/SettingsTab';
import { ReportsTab } from '@/components/ReportsTab';
import { SaleDetailsModal } from '@/components/SaleDetailsModal';
import { SellerSwitchModal } from '@/components/SellerSwitchModal';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { DeviceLoginScreen } from '@/components/DeviceLoginScreen';
import { BusinessSignUpScreen } from '@/components/BusinessSignUpScreen';
import { BusinessProvider, useBusiness } from '@/context/BusinessContext';
import { 
  auth, 
  resolveBusinessId, 
  resolveUserBusiness, 
  getBusinessActiveStatus,
  DEFAULT_BUSINESS_ID as FALLBACK_BUSINESS_ID 
} from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';

function MainAppContent() {
  const { businessId } = useBusiness();
  const { activeSeller, isLoading: isSellerAuthLoading } = useSellerAuth();
  const [activeTab, setActiveTab] = useState<TabType>('hoje');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  useEffect(() => {
    if (!businessId) return;

    // 1. Subscribe Customers
    const unsubCust = subscribeCustomers(businessId, (list, meta) => {
      setCustomers(list);
      if (meta.hasPendingWrites) setHasPendingWrites(true);
    });

    // 2. Subscribe Products
    const unsubProd = subscribeProducts(businessId, (list) => {
      setProducts(list);
    });

    // 3. Subscribe Sales
    const unsubSales = subscribeSales(businessId, (list, meta) => {
      setSales(list);
      setHasPendingWrites(meta.hasPendingWrites);
    });

    // 4. Subscribe Payments
    const unsubPay = subscribePayments(businessId, (list, meta) => {
      setPayments(list);
      if (meta.hasPendingWrites) setHasPendingWrites(true);
    });

    // 5. Subscribe Sellers
    const unsubSellers = subscribeSellers(businessId, (list) => {
      setSellers(list);
    });

    return () => {
      unsubCust();
      unsubProd();
      unsubSales();
      unsubPay();
      unsubSellers();
    };
  }, [businessId]);

  const pendingDebtorsCount = customers.filter((c) => (c.totalDebt || 0) > 0).length;

  return (
    <div className="min-h-screen bg-amber-50/40 text-neutral-900 flex flex-col font-sans select-none">
      {/* Header with Connectivity and Operator */}
      <Header hasPendingWrites={hasPendingWrites} />

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-2">
        {activeTab === 'hoje' && (
          <TodaySummaryTab
            sales={sales}
            customers={customers}
            onOpenNewSale={() => setActiveTab('nova-venda')}
            onOpenDebtors={() => setActiveTab('a-receber')}
            onOpenSaleDetails={(sale) => setSelectedSaleForDetails(sale)}
            onOpenSettings={() => setActiveTab('config')}
            onOpenReports={() => setActiveTab('relatorios')}
            onOpenCustomer={(customer) => {
              setCustomerSearchTerm(customer.name);
              setActiveTab('clientes');
            }}
          />
        )}

        {activeTab === 'nova-venda' && (
          <NewSaleTab
            customers={customers}
            products={products}
            onSaleCompleted={() => setActiveTab('hoje')}
            onSearchFocusChange={setIsKeyboardActive}
          />
        )}

        {activeTab === 'a-receber' && (
          <DebtorsTab
            customers={customers}
            sales={sales}
            onOpenSaleDetails={(sale) => setSelectedSaleForDetails(sale)}
          />
        )}

        {activeTab === 'relatorios' && (
          <ReportsTab
            sales={sales}
            payments={payments}
            sellers={sellers}
            customers={customers}
            products={products}
          />
        )}

        {activeTab === 'produtos' && (
          <ProductsTab
            products={products}
            onOpenNewSale={() => setActiveTab('nova-venda')}
          />
        )}

        {activeTab === 'clientes' && (
          <CustomersTab
            customers={customers}
            sales={sales}
            onOpenSaleDetails={(sale) => setSelectedSaleForDetails(sale)}
            initialSearch={customerSearchTerm}
          />
        )}

        {activeTab === 'historico' && (
          <HistoryTab
            sales={sales}
            payments={payments}
            customers={customers}
            onOpenSaleDetails={(sale) => setSelectedSaleForDetails(sale)}
          />
        )}

        {activeTab === 'config' && (
          <SettingsTab
            sellers={sellers}
            sales={sales}
            customers={customers}
            onOpenNewSale={() => setActiveTab('nova-venda')}
          />
        )}
      </main>

      {/* Mandatory Seller Identification Modal */}
      {!isSellerAuthLoading && !activeSeller && (
        <SellerSwitchModal
          isMandatory={true}
          onClose={() => {}}
        />
      )}

      {/* Sale Details Modal */}
      {selectedSaleForDetails && (
        <SaleDetailsModal
          sale={selectedSaleForDetails}
          onClose={() => setSelectedSaleForDetails(null)}
        />
      )}

      {/* Bottom Touch Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        pendingDebtorsCount={pendingDebtorsCount}
        isHidden={isKeyboardActive}
      />
    </div>
  );
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null | undefined>(undefined);
  const [businessName, setBusinessName] = useState<string>('Queijaria Artesanal da Serra');
  const [isBusinessActive, setIsBusinessActive] = useState<boolean>(true);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsResolving(true);
        try {
          const bId = await resolveBusinessId(user.uid);
          if (bId) {
            const bInfo = await resolveUserBusiness(user.uid);
            const activeStatus = await getBusinessActiveStatus(bId);
            setIsBusinessActive(activeStatus);
            setBusinessName(bInfo?.businessName || 'Queijaria Artesanal da Serra');
            setResolvedBusinessId(bId);
          } else {
            setResolvedBusinessId(null);
          }
        } catch (err) {
          console.warn('Erro ao resolver negócio inicial:', err);
          setResolvedBusinessId(null);
        } finally {
          setIsResolving(false);
        }
      } else {
        setResolvedBusinessId(undefined);
      }
    });

    return () => unsubscribe();
  }, []);

  // 1. Verificando autenticação do dispositivo no Firebase Auth
  if (currentUser === undefined || (currentUser && isResolving)) {
    return (
      <div className="min-h-screen bg-amber-50/60 flex flex-col items-center justify-center p-4 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-amber-900">Verificando autorização do dispositivo...</p>
        </div>
      </div>
    );
  }

  // 2. Aparelho sem login real -> Exibir tela de login ou criação de negócio
  if (!currentUser) {
    if (authView === 'signup') {
      return (
        <BusinessSignUpScreen
          onNavigateToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <DeviceLoginScreen
        onNavigateToSignUp={() => setAuthView('signup')}
      />
    );
  }

  // 3. Usuário logado, mas sem registro na coleção userBusinessMap
  if (resolvedBusinessId === null) {
    return (
      <div className="min-h-screen bg-amber-50/60 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm border border-amber-200 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-800">
            <AlertCircle className="w-6 h-6 text-amber-700" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">Acesso Não Vinculado</h2>
          <p className="text-sm text-neutral-700 mt-2">
            Sua conta não está vinculada a nenhum negócio. Fale com o suporte.
          </p>

          <div className="mt-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 break-all text-left">
            <div><strong className="text-neutral-800">Conta:</strong> {currentUser.email}</div>
            <div className="mt-1"><strong className="text-neutral-800">ID de Usuário (UID):</strong> {currentUser.uid}</div>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              id="btn-retry-resolve-business"
              onClick={async () => {
                setIsResolving(true);
                try {
                  const bId = await resolveBusinessId(currentUser.uid);
                  if (bId) {
                    const bInfo = await resolveUserBusiness(currentUser.uid);
                    const activeStatus = await getBusinessActiveStatus(bId);
                    setIsBusinessActive(activeStatus);
                    setBusinessName(bInfo?.businessName || 'Queijaria Artesanal da Serra');
                    setResolvedBusinessId(bId);
                  }
                } finally {
                  setIsResolving(false);
                }
              }}
              className="w-full min-h-[44px] px-3 bg-amber-700 hover:bg-amber-800 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Verificar novamente</span>
            </button>

            <button
              type="button"
              id="btn-device-logout"
              onClick={async () => {
                await signOut(auth);
              }}
              className="w-full min-h-[40px] px-3 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4 text-neutral-500" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Negócio com assinatura/acesso inativo (active === false)
  if (resolvedBusinessId && !isBusinessActive) {
    return (
      <div className="min-h-screen bg-amber-50/60 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm border border-amber-200 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-800">
            <AlertCircle className="w-6 h-6 text-amber-700" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">Acesso ainda não liberado</h2>
          <p className="text-sm text-neutral-700 mt-2">
            Se você acabou de se cadastrar, aguarde a aprovação. Em caso de dúvida, entre em contato com o suporte.
          </p>

          <div className="mt-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 break-all text-left">
            <div><strong className="text-neutral-800">Negócio:</strong> {businessName}</div>
            <div className="mt-1"><strong className="text-neutral-800">ID do Negócio:</strong> {resolvedBusinessId}</div>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              id="btn-retry-inactive-business"
              onClick={async () => {
                setIsResolving(true);
                try {
                  const activeStatus = await getBusinessActiveStatus(resolvedBusinessId);
                  setIsBusinessActive(activeStatus);
                } finally {
                  setIsResolving(false);
                }
              }}
              className="w-full min-h-[44px] px-3 bg-amber-700 hover:bg-amber-800 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Verificar status novamente</span>
            </button>

            <button
              type="button"
              id="btn-inactive-logout"
              onClick={async () => {
                await signOut(auth);
              }}
              className="w-full min-h-[40px] px-3 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4 text-neutral-500" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Usuário autenticado e negócio resolvido e ativo
  return (
    <BusinessProvider
      key={resolvedBusinessId || 'default'}
      businessId={resolvedBusinessId || FALLBACK_BUSINESS_ID}
      businessName={businessName}
      userEmail={currentUser.email}
      userId={currentUser.uid}
    >
      <SellerAuthProvider>
        <MainAppContent />
      </SellerAuthProvider>
    </BusinessProvider>
  );
}
