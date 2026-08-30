'use client';

import React, { useState } from 'react';
import { Customer, Sale } from '@/types';
import { formatCurrency, formatDateBr } from '@/lib/format';
import { addCustomer, updateCustomer } from '@/lib/db';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  MessageCircle, 
  Edit3, 
  X, 
  Check,
  ShoppingBag,
  Clock
} from 'lucide-react';

interface CustomersTabProps {
  customers: Customer[];
  sales: Sale[];
  onOpenSaleDetails: (sale: Sale) => void;
}

export function CustomersTab({ customers, sales, onOpenSaleDetails }: CustomersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = customers.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term)) ||
      (c.referencePoint && c.referencePoint.toLowerCase().includes(term))
    );
  });

  const handleOpenNew = () => {
    setName('');
    setPhone('');
    setAddress('');
    setReferencePoint('');
    setIsNewModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setReferencePoint(customer.referencePoint || '');
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingCustomer) {
        await updateCustomer(undefined, editingCustomer.id, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          referencePoint: referencePoint.trim() || undefined,
        });
        setEditingCustomer(null);
      } else {
        await addCustomer(undefined, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          referencePoint: referencePoint.trim() || undefined,
        });
        setIsNewModalOpen(false);
      }
    } catch (err: any) {
      alert('Erro ao salvar cliente: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = (customer: Customer) => {
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
    if (!cleanPhone) return;
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá, ${customer.name}! Passando na rota de vendas hoje.`)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-24 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 leading-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-700" />
            <span>Clientes da Rota</span>
          </h2>
          <p className="text-xs text-neutral-500 font-medium">
            {customers.length} {customers.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
          </p>
        </div>

        <button
          id="btn-add-customer-main"
          type="button"
          onClick={handleOpenNew}
          className="py-2 px-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow transition active:scale-95 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
        <input
          id="input-search-customers"
          type="text"
          placeholder="Buscar por nome, rua ou ponto de referência..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white shadow-sm text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      {/* Customer List */}
      <div className="space-y-2.5">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-neutral-200/80 text-center shadow-sm">
            <p className="text-xs text-neutral-400">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const customerSalesCount = sales.filter((s) => s.customerId === customer.id).length;
            const hasDebt = (customer.totalDebt || 0) > 0;

            return (
              <div
                key={customer.id}
                id={`customer-card-${customer.id}`}
                className="bg-white rounded-2xl border border-neutral-200/80 p-3.5 shadow-sm hover:border-amber-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-neutral-900 truncate">
                        {customer.name}
                      </h3>
                      {hasDebt && (
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Deve {formatCurrency(customer.totalDebt)}
                        </span>
                      )}
                    </div>

                    {(customer.referencePoint || customer.address) && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                        <span className="truncate font-medium">
                          {customer.referencePoint || customer.address}
                        </span>
                      </div>
                    )}

                    {customer.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                        <Phone className="w-3 h-3 text-neutral-400" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Edit button */}
                  <button
                    id={`btn-edit-customer-${customer.id}`}
                    type="button"
                    onClick={() => handleOpenEdit(customer)}
                    className="p-2 text-neutral-400 hover:text-amber-800 hover:bg-neutral-50 rounded-lg transition"
                    title="Editar dados"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom bar with action buttons */}
                <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryCustomer(customer)}
                    className="text-[11px] font-semibold text-neutral-600 hover:text-amber-800 flex items-center gap-1"
                  >
                    <ShoppingBag className="w-3 h-3 text-amber-600" />
                    <span>{customerSalesCount} {customerSalesCount === 1 ? 'compra' : 'compras'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {customer.phone && (
                      <button
                        type="button"
                        onClick={() => handleWhatsApp(customer)}
                        className="py-1 px-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition active:scale-95"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT CUSTOMER MODAL */}
      {(isNewModalOpen || editingCustomer) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95">
            <div className="bg-amber-700 px-4 py-3 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingCustomer ? 'Editar Cliente' : 'Novo Cliente da Rota'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewModalOpen(false);
                  setEditingCustomer(null);
                }}
                className="p-1 text-amber-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  id="input-customer-name"
                  type="text"
                  required
                  placeholder="Ex: Dona Laura (Sobrado Verde)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Ponto de Referência da Rota (Muito Importante!)
                </label>
                <input
                  id="input-customer-ref"
                  type="text"
                  placeholder="Ex: Em frente ao bar do Zé / Portão preto alto"
                  value={referencePoint}
                  onChange={(e) => setReferencePoint(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Endereço / Rua
                </label>
                <input
                  id="input-customer-address"
                  type="text"
                  placeholder="Ex: Rua das Flores, 142"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Telefone / WhatsApp (opcional)
                </label>
                <input
                  id="input-customer-phone"
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewModalOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="flex-1 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 rounded-xl hover:bg-neutral-200"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-customer-dialog"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow flex items-center justify-center gap-1"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER PURCHASES HISTORY MODAL */}
      {selectedHistoryCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-amber-700 px-4 py-3 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{selectedHistoryCustomer.name}</h3>
                <div className="text-[11px] text-amber-200">Histórico de Compras</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryCustomer(null)}
                className="p-1 text-amber-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {/* Summary Card */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 grid grid-cols-2 gap-2 text-center text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Total já comprado:</span>
                  <span className="font-extrabold text-neutral-900">
                    {formatCurrency(selectedHistoryCustomer.totalPurchased || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Saldo devedor atual:</span>
                  <span className="font-extrabold text-amber-900">
                    {formatCurrency(selectedHistoryCustomer.totalDebt || 0)}
                  </span>
                </div>
              </div>

              {/* List of Sales */}
              <div className="space-y-2">
                {sales.filter((s) => s.customerId === selectedHistoryCustomer.id).length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-4">Nenhuma compra registrada.</p>
                ) : (
                  sales
                    .filter((s) => s.customerId === selectedHistoryCustomer.id)
                    .map((s) => (
                      <div
                        key={s.id}
                        onClick={() => onOpenSaleDetails(s)}
                        className="p-2.5 bg-white rounded-xl border border-neutral-200 hover:border-amber-400 cursor-pointer transition text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold text-neutral-900">
                            {formatDateBr(s.saleDate)} • {s.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">
                            Por: {s.sellerName?.split(' ')[0]}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-neutral-900">
                            {formatCurrency(s.totalAmount)}
                          </div>
                          <div
                            className={`text-[10px] font-bold ${
                              s.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-800'
                            }`}
                          >
                            {s.paymentStatus === 'paid' ? 'Pago' : 'Fiado'}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
