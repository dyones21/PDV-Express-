'use client';

import React, { useState } from 'react';
import { Product } from '@/types';
import { formatCurrency, formatCurrencyInput, parseCurrencyToNumber } from '@/lib/format';
import { addProduct, updateProduct, restockProduct } from '@/lib/db';
import { 
  Package, 
  Plus, 
  Edit2, 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Boxes,
  ArrowUpRight,
  PlusCircle,
  Percent,
  Check,
  ShoppingBag,
  Scale
} from 'lucide-react';

interface ProductsTabProps {
  products: Product[];
  onOpenNewSale: () => void;
}

export function ProductsTab({ products, onOpenNewSale }: ProductsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Modal State for New / Edit Product
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unit, setUnit] = useState('un');
  const [category, setCategory] = useState('Geral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Weight cost mode state for Product Form
  const [isWeightCostMode, setIsWeightCostMode] = useState(false);
  const [weightTotalKg, setWeightTotalKg] = useState('');
  const [weightTotalPaid, setWeightTotalPaid] = useState('');
  const [weightYieldUnits, setWeightYieldUnits] = useState('');
  const [baseStockQty, setBaseStockQty] = useState(0);

  // Modal State for Quick Restock
  const [restockProductTarget, setRestockProductTarget] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  // Weight cost mode state for Quick Restock
  const [isRestockWeightMode, setIsRestockWeightMode] = useState(false);
  const [restockWeightKg, setRestockWeightKg] = useState('');
  const [restockWeightTotalPaid, setRestockWeightTotalPaid] = useState('');
  const [restockWeightYieldUnits, setRestockWeightYieldUnits] = useState('');

  // Categories list
  const categories = ['todos', ...Array.from(new Set(products.map((p) => p.category || 'Geral')))];

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'todos' || (p.category || 'Geral') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Aggregate Metrics
  const totalStockCount = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
  const totalStockCostValue = products.reduce((acc, p) => acc + ((p.costPrice || 0) * (p.stockQuantity || 0)), 0);
  const totalStockSaleValue = products.reduce((acc, p) => acc + (p.price * (p.stockQuantity || 0)), 0);
  const lowStockCount = products.filter((p) => (p.stockQuantity || 0) < 5 && p.active !== false).length;

  const handleOpenNew = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setCostPrice('');
    setIsWeightCostMode(false);
    setWeightTotalKg('');
    setWeightTotalPaid('');
    setWeightYieldUnits('');
    setStockQuantity('0');
    setBaseStockQty(0);
    setUnit('un');
    setCategory('Geral');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setPrice(p.price !== undefined ? formatCurrencyInput(p.price) : '');
    setCostPrice(p.costPrice !== undefined ? formatCurrencyInput(p.costPrice) : '');
    setIsWeightCostMode(false);
    setWeightTotalKg('');
    setWeightTotalPaid('');
    setWeightYieldUnits('');
    const initialStock = p.stockQuantity !== undefined ? p.stockQuantity : 0;
    setStockQuantity(initialStock.toString());
    setBaseStockQty(initialStock);
    setUnit(p.unit || 'un');
    setCategory(p.category || 'Geral');
    setIsFormModalOpen(true);
  };

  const handleToggleWeightMode = (checked: boolean) => {
    setIsWeightCostMode(checked);
    if (checked) {
      const currentBase = parseInt(stockQuantity, 10) || 0;
      setBaseStockQty(currentBase);
      const yieldNum = parseInt(weightYieldUnits, 10) || 0;
      if (yieldNum > 0) {
        setStockQuantity((currentBase + yieldNum).toString());
      }
    }
  };

  const handleWeightYieldChange = (val: string) => {
    setWeightYieldUnits(val);
    if (isWeightCostMode) {
      const yieldNum = parseInt(val, 10) || 0;
      setStockQuantity((baseStockQty + yieldNum).toString());
    }
  };

  // Unit cost calculations for Product Form
  const parsedFormWeightPaid = parseCurrencyToNumber(weightTotalPaid);
  const parsedFormWeightYield = parseInt(weightYieldUnits, 10) || 0;
  const formCalculatedUnitCost =
    isWeightCostMode && parsedFormWeightYield > 0 && parsedFormWeightPaid > 0
      ? parsedFormWeightPaid / parsedFormWeightYield
      : 0;

  const effectiveFormCost = isWeightCostMode
    ? (formCalculatedUnitCost > 0 ? formCalculatedUnitCost : undefined)
    : (costPrice ? parseCurrencyToNumber(costPrice) : undefined);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    const parsedPrice = parseCurrencyToNumber(price);
    const parsedCost = effectiveFormCost;
    const parsedStock = stockQuantity ? parseInt(stockQuantity, 10) || 0 : 0;

    if (parsedPrice <= 0) {
      alert('Informe um preço de venda válido maior que zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingProduct) {
        await updateProduct(undefined, editingProduct.id, {
          name: name.trim(),
          price: parsedPrice,
          costPrice: parsedCost,
          stockQuantity: parsedStock,
          unit,
          category,
        });
      } else {
        await addProduct(undefined, {
          name: name.trim(),
          price: parsedPrice,
          costPrice: parsedCost,
          stockQuantity: parsedStock,
          unit,
          category,
          active: true,
        });
      }
      setIsFormModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      alert('Erro ao salvar produto: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRestock = (p: Product) => {
    setRestockProductTarget(p);
    setRestockQty('');
    setRestockCost(p.costPrice !== undefined ? formatCurrencyInput(p.costPrice) : '');
    setIsRestockWeightMode(false);
    setRestockWeightKg('');
    setRestockWeightTotalPaid('');
    setRestockWeightYieldUnits('');
  };

  // Unit cost calculations for Restock Modal
  const parsedRestockWeightPaid = parseCurrencyToNumber(restockWeightTotalPaid);
  const parsedRestockWeightYield = parseInt(restockWeightYieldUnits, 10) || 0;
  const restockCalculatedUnitCost =
    isRestockWeightMode && parsedRestockWeightYield > 0 && parsedRestockWeightPaid > 0
      ? parsedRestockWeightPaid / parsedRestockWeightYield
      : 0;

  const restockAddedQty = isRestockWeightMode
    ? parsedRestockWeightYield
    : (parseInt(restockQty, 10) || 0);

  const handleSaveRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProductTarget) return;

    const added = isRestockWeightMode
      ? parsedRestockWeightYield
      : (parseInt(restockQty, 10) || 0);

    if (added <= 0) {
      alert(isRestockWeightMode ? 'Informe a quantidade de unidades que a compra rendeu.' : 'Informe uma quantidade válida para reposição.');
      return;
    }

    const newCost = isRestockWeightMode
      ? (restockCalculatedUnitCost > 0 ? restockCalculatedUnitCost : undefined)
      : (restockCost ? parseCurrencyToNumber(restockCost) : undefined);

    try {
      setIsRestocking(true);
      await restockProduct(undefined, restockProductTarget.id, added, newCost);
      setRestockProductTarget(null);
      setRestockQty('');
      setRestockCost('');
      setIsRestockWeightMode(false);
      setRestockWeightKg('');
      setRestockWeightTotalPaid('');
      setRestockWeightYieldUnits('');
    } catch (err: any) {
      alert('Erro ao atualizar estoque: ' + err.message);
    } finally {
      setIsRestocking(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await updateProduct(undefined, p.id, {
        active: !p.active,
      });
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  // Calculation for margin reference in modal
  const calcSalePrice = parseCurrencyToNumber(price);
  const calcCostPrice = effectiveFormCost || 0;
  const calcProfit = calcSalePrice > 0 ? calcSalePrice - calcCostPrice : 0;
  const calcMarginPercent = calcSalePrice > 0 && calcCostPrice > 0 ? Math.round((calcProfit / calcSalePrice) * 100) : 0;

  return (
    <div className="space-y-4 pb-24 pt-2">
      {/* Header & Quick Action */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 leading-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-700" />
            <span>Estoque & Produtos</span>
          </h2>
          <p className="text-xs text-neutral-500 font-medium">
            Preços de venda, custos de compra e quantidade em estoque
          </p>
        </div>

        <button
          id="btn-add-new-product"
          type="button"
          onClick={handleOpenNew}
          className="py-2 px-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Total em Estoque</div>
          <div className="text-base font-extrabold text-neutral-900 mt-0.5 break-words leading-tight">
            {totalStockCount} <span className="text-xs font-semibold text-neutral-500">itens</span>
          </div>
          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
            {products.length} tipos cadastrados
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Valor em Venda</div>
          <div className="text-base font-extrabold text-amber-900 mt-0.5 break-words leading-tight">
            {formatCurrency(totalStockSaleValue)}
          </div>
          <div className="text-[10px] text-neutral-500 font-medium mt-0.5 truncate">
            Custo: {formatCurrency(totalStockCostValue)}
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Atenção Estoque</div>
          <div className="text-lg font-extrabold text-amber-600 mt-0.5 flex items-center gap-1">
            {lowStockCount > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{lowStockCount}</span>
              </>
            ) : (
              <span className="text-emerald-700 text-sm font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Ok
              </span>
            )}
          </div>
          <div className="text-[10px] text-neutral-500 font-medium mt-0.5">
            {lowStockCount > 0 ? 'Itens com < 5 un' : 'Estoque abastecido'}
          </div>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="bg-white rounded-2xl p-3 border border-neutral-200/80 shadow-sm space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
          <input
            id="input-search-products"
            type="text"
            placeholder="Buscar por nome do produto ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-neutral-50/50"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              id={`filter-cat-${cat}`}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat === 'todos' ? 'Todos os Produtos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-neutral-200 text-center space-y-2">
            <Package className="w-10 h-10 text-neutral-300 mx-auto" />
            <div className="text-sm font-bold text-neutral-800">Nenhum produto encontrado</div>
            <p className="text-xs text-neutral-500">
              {searchTerm ? 'Tente buscar com outro termo' : 'Cadastre seu primeiro produto clicando no botão acima'}
            </p>
          </div>
        ) : (
          filteredProducts.map((prod) => {
            const stock = prod.stockQuantity !== undefined ? prod.stockQuantity : 0;
            const cost = prod.costPrice || 0;
            const profit = prod.price - cost;
            const margin = prod.price > 0 && cost > 0 ? Math.round((profit / prod.price) * 100) : null;
            const isLowStock = stock < 5;
            const isOut = stock <= 0;

            return (
              <div
                key={prod.id}
                id={`product-manage-card-${prod.id}`}
                className={`bg-white rounded-2xl p-4 border transition shadow-sm space-y-3 ${
                  !prod.active
                    ? 'border-neutral-200 opacity-60 bg-neutral-50/70'
                    : isOut
                    ? 'border-red-200 bg-red-50/20'
                    : isLowStock
                    ? 'border-amber-300/80 bg-amber-50/30'
                    : 'border-neutral-200/90'
                }`}
              >
                {/* Header Line */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-neutral-900 truncate">
                        {prod.name}
                      </h3>
                      {!prod.active && (
                        <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
                      <span>{prod.category || 'Geral'}</span>
                      <span>•</span>
                      <span>Unidade: {prod.unit || 'un'}</span>
                    </div>
                  </div>

                  {/* Stock Badge */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold border ${
                        isOut
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>{stock} em estoque</span>
                    </div>
                    {isLowStock && !isOut && prod.active && (
                      <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                        ⚠️ Estoque Baixo
                      </div>
                    )}
                    {isOut && prod.active && (
                      <div className="text-[10px] text-red-600 font-bold mt-0.5">
                        ❌ Zerado
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing and Margins Bar */}
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-neutral-500 uppercase font-semibold">Preço de Venda</div>
                    <div className="text-sm font-extrabold text-neutral-900">
                      {formatCurrency(prod.price)}
                    </div>
                  </div>

                  <div className="border-l border-neutral-200 pl-3">
                    <div className="text-[10px] text-neutral-500 uppercase font-semibold">Custo de Compra</div>
                    <div className="text-xs font-bold text-neutral-700">
                      {cost > 0 ? formatCurrency(cost) : 'Não informado'}
                    </div>
                  </div>

                  <div className="border-l border-neutral-200 pl-3 text-right">
                    <div className="text-[10px] text-neutral-500 uppercase font-semibold">Margem de Lucro</div>
                    <div className="text-xs font-extrabold text-emerald-700 flex items-center justify-end gap-0.5">
                      {cost > 0 ? (
                        <>
                          <span>+{formatCurrency(profit)}</span>
                          {margin !== null && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded ml-1">
                              {margin}%
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-neutral-400 font-normal">--</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Line */}
                <div className="flex items-center justify-between pt-1 gap-2 border-t border-neutral-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      id={`btn-toggle-active-${prod.id}`}
                      type="button"
                      onClick={() => handleToggleActive(prod)}
                      className={`text-xs px-2 py-1 rounded-lg font-medium border transition ${
                        prod.active
                          ? 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {prod.active ? 'Desativar' : 'Reativar'}
                    </button>

                    <button
                      id={`btn-edit-prod-${prod.id}`}
                      type="button"
                      onClick={() => handleOpenEdit(prod)}
                      className="text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-lg border border-neutral-200 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  </div>

                  <button
                    id={`btn-restock-${prod.id}`}
                    type="button"
                    onClick={() => handleOpenRestock(prod)}
                    className="text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 px-3 py-1.5 rounded-xl border border-amber-300 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>+ Entrada de Estoque</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="bg-amber-700 px-4 py-3 text-white flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingProduct(null);
                }}
                className="p-1 text-amber-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  id="input-prod-form-name"
                  type="text"
                  required
                  placeholder="Ex: Produto A, Peça 1..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              <div className="space-y-2">
                <div className={`grid ${isWeightCostMode ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Preço de Venda (R$) *
                    </label>
                    <input
                      id="input-prod-form-price"
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="R$ 0,00"
                      value={price}
                      onChange={(e) => setPrice(formatCurrencyInput(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-bold text-amber-950 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {!isWeightCostMode && (
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Custo de Compra (R$)
                      </label>
                      <input
                        id="input-prod-form-cost"
                        type="text"
                        inputMode="numeric"
                        placeholder="R$ 0,00"
                        value={costPrice}
                        onChange={(e) => setCostPrice(formatCurrencyInput(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>

                {/* Toggle Weight Cost Calculation */}
                <div className="pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700 hover:text-neutral-900">
                    <input
                      id="checkbox-prod-weight-mode"
                      type="checkbox"
                      checked={isWeightCostMode}
                      onChange={(e) => handleToggleWeightMode(e.target.checked)}
                      className="w-4 h-4 text-amber-700 rounded border-neutral-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-amber-700" />
                      Comprei por peso (kg), mas vendo por unidade
                    </span>
                  </label>
                </div>

                {/* Expanded Weight Calculation Panel */}
                {isWeightCostMode && (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2.5">
                    <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                      Cálculo do custo por peso (kg)
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 min-h-[28px] leading-tight mb-1">
                          Peso total (kg)
                        </label>
                        <input
                          id="input-prod-weight-kg"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Ex: 5,00"
                          value={weightTotalKg}
                          onChange={(e) => setWeightTotalKg(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 min-h-[28px] leading-tight mb-1">
                          Valor pago (R$)
                        </label>
                        <input
                          id="input-prod-weight-total-paid"
                          type="text"
                          inputMode="numeric"
                          placeholder="R$ 0,00"
                          value={weightTotalPaid}
                          onChange={(e) => setWeightTotalPaid(formatCurrencyInput(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 min-h-[28px] leading-tight mb-1">
                          Unidades rendidas
                        </label>
                        <input
                          id="input-prod-weight-yield"
                          type="number"
                          step="1"
                          min="1"
                          placeholder="Ex: 20"
                          value={weightYieldUnits}
                          onChange={(e) => handleWeightYieldChange(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                      </div>
                    </div>

                    {/* Highlight calculated cost */}
                    <div className="p-2 bg-white rounded-lg border border-amber-300 flex items-center justify-between">
                      <span className="text-xs text-amber-900 font-semibold">
                        Custo por unidade:
                      </span>
                      <span className="text-sm font-extrabold text-amber-950">
                        {formCalculatedUnitCost > 0 ? formatCurrency(formCalculatedUnitCost) : '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Profit & Margin Preview */}
              {calcSalePrice > 0 && calcCostPrice > 0 && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between text-emerald-900 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Lucro Bruto por Unidade:</span>
                  </div>
                  <div>
                    <span className="font-extrabold">{formatCurrency(calcProfit)}</span>
                    <span className="text-[11px] font-bold text-emerald-700 ml-1">
                      ({calcMarginPercent}% margem)
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Quantidade em Estoque
                  </label>
                  <input
                    id="input-prod-form-stock"
                    type="number"
                    placeholder="Ex: 15"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    id="select-prod-form-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-xl border border-neutral-300 bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="peça">Peça</option>
                    <option value="kg">Kg</option>
                    <option value="barra">Barra</option>
                    <option value="pacote">Pacote</option>
                    <option value="pote">Pote</option>
                    <option value="bandeja">Bandeja</option>
                    <option value="un">Unidade (un)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Categoria
                </label>
                <input
                  id="input-prod-form-category"
                  type="text"
                  placeholder="Geral, Alimentos, Bebidas, Roupas..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-product-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK RESTOCK (+ ENTRADA DE ESTOQUE) */}
      {restockProductTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95">
            <div className="bg-amber-700 px-4 py-3 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                <span>Entrada / Reposição de Estoque</span>
              </h3>
              <button
                type="button"
                onClick={() => setRestockProductTarget(null)}
                className="p-1 text-amber-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="p-4 space-y-3">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                <div className="text-[10px] text-amber-800 font-semibold uppercase">Produto Selecionado</div>
                <div className="font-extrabold text-sm text-neutral-900 mt-0.5">
                  {restockProductTarget.name}
                </div>
                <div className="text-xs text-neutral-600 mt-0.5">
                  Estoque atual: <span className="font-bold text-amber-900">{restockProductTarget.stockQuantity || 0} {restockProductTarget.unit || 'peças'}</span>
                </div>
              </div>

              {/* Toggle Weight Restock Calculation */}
              <div className="pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-700 hover:text-neutral-900">
                  <input
                    id="checkbox-restock-weight-mode"
                    type="checkbox"
                    checked={isRestockWeightMode}
                    onChange={(e) => setIsRestockWeightMode(e.target.checked)}
                    className="w-4 h-4 text-amber-700 rounded border-neutral-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-700" />
                    Comprei por peso (kg), mas vendo por unidade
                  </span>
                </label>
              </div>

              {!isRestockWeightMode ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Quantas unidades você está recebendo/adicionando? *
                    </label>
                    <input
                      id="input-restock-qty"
                      type="number"
                      required
                      min="1"
                      placeholder="Ex: 10"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      className="w-full px-3 py-2.5 text-base font-extrabold text-neutral-900 rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Custo Unitário desta Compra (R$) - Opcional
                    </label>
                    <input
                      id="input-restock-cost"
                      type="text"
                      inputMode="numeric"
                      placeholder={restockProductTarget.costPrice ? `Atual: ${formatCurrency(restockProductTarget.costPrice)}` : 'R$ 0,00'}
                      value={restockCost}
                      onChange={(e) => setRestockCost(formatCurrencyInput(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Deixe em branco para manter o custo atual cadastrado.
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                    Cálculo de reposição por peso (kg)
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 min-h-[28px] leading-tight mb-1">
                        Peso total (kg)
                      </label>
                      <input
                        id="input-restock-weight-kg"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 5,00"
                        value={restockWeightKg}
                        onChange={(e) => setRestockWeightKg(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 bg-white"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 min-h-[28px] leading-tight mb-1">
                        Valor pago (R$)
                      </label>
                      <input
                        id="input-restock-weight-total-paid"
                        type="text"
                        inputMode="numeric"
                        placeholder="R$ 0,00"
                        value={restockWeightTotalPaid}
                        onChange={(e) => setRestockWeightTotalPaid(formatCurrencyInput(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 min-h-[28px] leading-tight mb-1">
                        Unidades rendidas *
                      </label>
                      <input
                        id="input-restock-weight-yield"
                        type="number"
                        step="1"
                        min="1"
                        placeholder="Ex: 20"
                        value={restockWeightYieldUnits}
                        onChange={(e) => setRestockWeightYieldUnits(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Highlight calculated cost */}
                  <div className="p-2 bg-white rounded-lg border border-amber-300 flex items-center justify-between">
                    <span className="text-xs text-amber-900 font-semibold">
                      Custo por unidade:
                    </span>
                    <span className="text-sm font-extrabold text-amber-950">
                      {restockCalculatedUnitCost > 0 ? formatCurrency(restockCalculatedUnitCost) : '—'}
                    </span>
                  </div>
                </div>
              )}

              {/* Preview of new stock */}
              {restockAddedQty > 0 && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex justify-between items-center text-emerald-950 font-semibold">
                  <span>Novo Estoque Total:</span>
                  <span className="text-sm font-extrabold text-emerald-800">
                    {(restockProductTarget.stockQuantity || 0) + restockAddedQty} {restockProductTarget.unit || 'peças'}
                  </span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRestockProductTarget(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-restock"
                  type="submit"
                  disabled={isRestocking}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  {isRestocking ? 'Salvando...' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
