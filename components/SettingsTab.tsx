'use client';

import React, { useState } from 'react';
import { Product, Seller } from '@/types';
import { formatCurrency } from '@/lib/format';
import { addProduct, updateProduct } from '@/lib/db';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { useNetworkSync } from '@/hooks/use-network-sync';
import { 
  Settings, 
  Tag, 
  Users, 
  Wifi, 
  WifiOff, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  ShieldCheck, 
  RefreshCw,
  HardDrive,
  Info
} from 'lucide-react';
import { SellerSwitchModal } from './SellerSwitchModal';

interface SettingsTabProps {
  products: Product[];
  sellers: Seller[];
  onOpenNewSale: () => void;
}

export function SettingsTab({ products, sellers, onOpenNewSale }: SettingsTabProps) {
  const { activeSeller } = useSellerAuth();
  const { isOnline, canInstallPwa, promptInstall } = useNetworkSync();
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);

  // Product Add / Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodUnit, setProdUnit] = useState('peça');
  const [prodCategory, setProdCategory] = useState('Queijos');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenNewProduct = () => {
    setProdName('');
    setProdPrice('');
    setProdUnit('peça');
    setProdCategory('Queijos');
    setIsNewProductOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdPrice(prod.price.toString());
    setProdUnit(prod.unit || 'peça');
    setProdCategory(prod.category || 'Queijos');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) return;

    const parsedPrice = parseFloat(prodPrice.replace(',', '.')) || 0;
    if (parsedPrice <= 0) {
      alert('Informe um preço válido');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingProduct) {
        await updateProduct(undefined, editingProduct.id, {
          name: prodName.trim(),
          price: parsedPrice,
          unit: prodUnit,
          category: prodCategory,
        });
        setEditingProduct(null);
      } else {
        await addProduct(undefined, {
          name: prodName.trim(),
          price: parsedPrice,
          unit: prodUnit,
          category: prodCategory,
          active: true,
        });
        setIsNewProductOpen(false);
      }
    } catch (err: any) {
      alert('Erro ao salvar produto: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleProductActive = async (prod: Product) => {
    try {
      await updateProduct(undefined, prod.id, {
        active: !prod.active,
      });
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  return (
    <div className="space-y-5 pb-24 pt-2">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-lg font-bold text-neutral-900 leading-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-700" />
          <span>Configurações & Catálogo</span>
        </h2>
        <p className="text-xs text-neutral-500 font-medium">
          Gerenciamento de produtos, preços e vendedores
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
            className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
          >
            Trocar / Novo Vendedor
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-700 text-white flex items-center justify-center font-bold text-sm">
              {activeSeller ? activeSeller.name.charAt(0).toUpperCase() : 'V'}
            </div>
            <div>
              <div className="font-bold text-sm text-neutral-900">
                {activeSeller ? activeSeller.name : 'Nenhum vendedor selecionado'}
              </div>
              <div className="text-xs text-neutral-500 capitalize">
                {activeSeller?.role === 'owner' ? 'Dono do Negócio (MEI)' : 'Ajudante de Rota'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ativo</span>
          </div>
        </div>
      </div>

      {/* Catálogo de Queijos & Preços */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-bold text-neutral-900">Tabela de Preços dos Queijos</h3>
          </div>
          <button
            id="btn-add-product-settings"
            type="button"
            onClick={handleOpenNewProduct}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Queijo
          </button>
        </div>

        <div className="divide-y divide-neutral-100">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="py-2.5 flex items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-neutral-900 truncate">
                    {prod.name}
                  </span>
                  {!prod.active && (
                    <span className="text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.2 rounded">
                      Inativo
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500">
                  Unidade: {prod.unit || 'peça'} • Categoria: {prod.category || 'Geral'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-amber-950">
                  {formatCurrency(prod.price)}
                </span>
                <button
                  id={`btn-edit-product-${prod.id}`}
                  type="button"
                  onClick={() => handleOpenEditProduct(prod)}
                  className="p-1.5 text-neutral-400 hover:text-amber-800 rounded-lg"
                  title="Editar preço e nome"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Offline & App Diagnostics */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-700" />
          <h3 className="text-sm font-bold text-neutral-900">Status Offline & Sincronização</h3>
        </div>

        <div className="p-3 bg-neutral-50 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Conexão Atual:</span>
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
            <span className="text-neutral-600">Persistência Firestore:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              IndexedDB Multi-Tab Habilitado
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-600">PWA Instalável:</span>
            <span className="font-bold text-amber-900">
              {canInstallPwa ? 'Disponível para Instalar' : 'Configurado (Manifest + SW)'}
            </span>
          </div>

          {canInstallPwa && (
            <button
              onClick={promptInstall}
              className="w-full mt-2 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs"
            >
              Instalar App no Smartphone
            </button>
          )}
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {(isNewProductOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95">
            <div className="bg-amber-700 px-4 py-3 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingProduct ? 'Editar Queijo / Preço' : 'Cadastrar Novo Queijo'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewProductOpen(false);
                  setEditingProduct(null);
                }}
                className="p-1 text-amber-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome do Queijo / Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Queijo Minas Meia Cura"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Preço Padrão de Venda (R$) *
                </label>
                <input
                  type="number"
                  step="0.50"
                  required
                  placeholder="Ex: 38.00"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Unidade
                  </label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-xl border border-neutral-300 bg-white"
                  >
                    <option value="peça">Peça</option>
                    <option value="kg">Kg</option>
                    <option value="barra">Barra</option>
                    <option value="pacote">Pacote</option>
                    <option value="pote">Pote</option>
                    <option value="bandeja">Bandeja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Queijos, Doces..."
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-xl border border-neutral-300"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewProductOpen(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-700 rounded-xl shadow"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSwitchModalOpen && (
        <SellerSwitchModal onClose={() => setIsSwitchModalOpen(false)} />
      )}
    </div>
  );
}
