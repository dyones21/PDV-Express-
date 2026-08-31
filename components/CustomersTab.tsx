'use client';

import React, { useState } from 'react';
import { Customer, Sale } from '@/types';
import { formatCurrency, formatDateBr, getTodayDateString } from '@/lib/format';
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
  Clock,
  Calendar,
  CalendarClock,
  AlertTriangle,
  UserCheck,
  UserX,
  Power
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
  const [nextVisitReminder, setNextVisitReminder] = useState('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = getTodayDateString();

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
    setNextVisitReminder('');
    setActive(true);
    setIsNewModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setReferencePoint(customer.referencePoint || '');
    setNextVisitReminder(customer.nextVisitReminder || '');
    setActive(customer.active !== false);
  };

  const handleToggleCustomerActive = async (customer: Customer) => {
    const nextState = customer.active === false ? true : false;
    const confirmMessage = nextState
      ? `Deseja reativar o cliente "${customer.name}"? Ele voltará a aparecer na lista de novas vendas.`
      : `Deseja inativar o cliente "${customer.name}"? Ele não aparecerá mais na lista de novas vendas (o histórico e fiados serão mantidos).`;
    
    if (confirm(confirmMessage)) {
      try {
        await updateCustomer(undefined, customer.id, {
          active: nextState,
        });
      } catch (err: any) {
        alert('Erro ao atualizar status do cliente: ' + err.message);
      }
    }
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
          nextVisitReminder: nextVisitReminder.trim() || undefined,
          active,
        });
        setEditingCustomer(null);
      } else {
        await addCustomer(undefined, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          referencePoint: referencePoint.trim() || undefined,
          nextVisitReminder: nextVisitReminder.trim() || undefined,
          active: true,
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
            const isInactive = customer.active === false;

            // Visit Reminder calculation
            const reminderDate = customer.nextVisitReminder;
            const isVisitToday = reminderDate && reminderDate === todayStr;
            const isVisitOverdue = reminderDate && reminderDate < todayStr;
            const isVisitUpcoming = reminderDate && reminderDate > todayStr;

            return (
              <div
                key={customer.id}
                id={`customer-card-${customer.id}`}
                className={`rounded-2xl border p-3.5 shadow-sm transition ${
                  isInactive
                    ? 'bg-neutral-50/80 border-neutral-200 opacity-80'
                    : 'bg-white border-neutral-200/80 hover:border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className={`font-bold text-sm truncate ${isInactive ? 'text-neutral-600 line-through' : 'text-neutral-900'}`}>
                        {customer.name}
                      </h3>

                      {isInactive && (
                        <span className="text-[10px] font-bold text-neutral-600 bg-neutral-200/80 px-2 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}

                      {hasDebt && (
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Deve {formatCurrency(customer.totalDebt)}
                        </span>
                      )}
                    </div>

                    {/* Visit Reminder Tag */}
                    {reminderDate && (
                      <div className="mt-1 flex items-center">
                        {isVisitToday && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg animate-pulse">
                            <CalendarClock className="w-3 h-3 text-amber-700" />
                            <span>🔔 Visitar hoje!</span>
                          </span>
                        )}
                        {isVisitOverdue && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span>Visita atrasada ({formatDateBr(reminderDate)})</span>
                          </span>
                        )}
                        {isVisitUpcoming && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg">
                            <Calendar className="w-3 h-3 text-sky-600" />
                            <span>Visita: {formatDateBr(reminderDate)}</span>
                          </span>
                        )}
                      </div>
                    )}

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

                  {/* Actions (Edit & Toggle Active) */}
                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-toggle-active-${customer.id}`}
                      type="button"
                      onClick={() => handleToggleCustomerActive(customer)}
                      className={`p-1.5 rounded-lg transition text-xs font-semibold ${
                        isInactive
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-neutral-400 hover:text-red-700 hover:bg-red-50'
                      }`}
                      title={isInactive ? 'Reativar cliente' : 'Inativar cliente'}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      id={`btn-edit-customer-${customer.id}`}
                      type="button"
                      onClick={() => handleOpenEdit(customer)}
                      className="p-1.5 text-neutral-400 hover:text-amber-800 hover:bg-neutral-50 rounded-lg transition"
                      title="Editar dados"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
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

                  <div className="flex items-center gap-1.5">
                    {isInactive && (
                      <button
                        type="button"
                        onClick={() => handleToggleCustomerActive(customer)}
                        className="py-1 px-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                      >
                        Reativar
                      </button>
                    )}

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

              {/* Lembrete de Próxima Visita */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Lembrete de Próxima Visita (Opcional)
                  </label>
                  {nextVisitReminder && (
                    <button
                      type="button"
                      onClick={() => setNextVisitReminder('')}
                      className="text-[10px] text-red-600 hover:underline font-semibold"
                    >
                      Limpar data
                    </button>
                  )}
                </div>
                <input
                  id="input-customer-visit-reminder"
                  type="date"
                  value={nextVisitReminder}
                  onChange={(e) => setNextVisitReminder(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-neutral-800"
                />
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setNextVisitReminder(todayStr)}
                    className="py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-semibold border border-amber-200"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      setNextVisitReminder(`${y}-${m}-${day}`);
                    }}
                    className="py-1 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[10px] font-semibold border border-neutral-200"
                  >
                    +7 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 14);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      setNextVisitReminder(`${y}-${m}-${day}`);
                    }}
                    className="py-1 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[10px] font-semibold border border-neutral-200"
                  >
                    +14 dias
                  </button>
                </div>
              </div>

              {/* Status Ativo / Inativo (No modo de edição) */}
              {editingCustomer && (
                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-800 block">Status do Cliente</span>
                    <span className="text-[10px] text-neutral-500">
                      {active ? 'Ativo na rota de vendas' : 'Inativo (oculto no PDV)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className={`py-1.5 px-3 rounded-xl font-bold text-xs transition ${
                      active
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                    }`}
                  >
                    {active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              )}

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
                              s.isCancelled
                                ? 'text-red-600 line-through'
                                : s.paymentStatus === 'paid'
                                ? 'text-emerald-700'
                                : 'text-amber-800'
                            }`}
                          >
                            {s.isCancelled
                              ? 'Cancelada'
                              : s.paymentStatus === 'paid'
                              ? 'Pago'
                              : 'Fiado'}
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
