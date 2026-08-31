'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Product, Sale, Payment, Seller } from '@/types';
import { 
  subscribeCustomers, 
  subscribeProducts, 
  subscribeSales, 
  subscribePayments, 
  subscribeSellers,
  DEFAULT_BUSINESS_ID 
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

function MainAppContent() {
  const { activeSeller, isLoading: isSellerAuthLoading } = useSellerAuth();
  const [activeTab, setActiveTab] = useState<TabType>('hoje');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);

  useEffect(() => {
    // 1. Subscribe Customers
    const unsubCust = subscribeCustomers(DEFAULT_BUSINESS_ID, (list, meta) => {
      setCustomers(list);
      if (meta.hasPendingWrites) setHasPendingWrites(true);
    });

    // 2. Subscribe Products
    const unsubProd = subscribeProducts(DEFAULT_BUSINESS_ID, (list) => {
      setProducts(list);
    });

    // 3. Subscribe Sales
    const unsubSales = subscribeSales(DEFAULT_BUSINESS_ID, (list, meta) => {
      setSales(list);
      setHasPendingWrites(meta.hasPendingWrites);
    });

    // 4. Subscribe Payments
    const unsubPay = subscribePayments(DEFAULT_BUSINESS_ID, (list, meta) => {
      setPayments(list);
      if (meta.hasPendingWrites) setHasPendingWrites(true);
    });

    // 5. Subscribe Sellers
    const unsubSellers = subscribeSellers(DEFAULT_BUSINESS_ID, (list) => {
      setSellers(list);
    });

    return () => {
      unsubCust();
      unsubProd();
      unsubSales();
      unsubPay();
      unsubSellers();
    };
  }, []);

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
          />
        )}

        {activeTab === 'nova-venda' && (
          <NewSaleTab
            customers={customers}
            products={products}
            onSaleCompleted={() => setActiveTab('hoje')}
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
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <SellerAuthProvider>
      <MainAppContent />
    </SellerAuthProvider>
  );
}
