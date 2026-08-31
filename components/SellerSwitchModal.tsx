'use client';

import React, { useState } from 'react';
import { useSellerAuth } from '@/hooks/use-seller-auth';
import { Seller } from '@/types';
import { User, KeyRound, ShieldCheck, Plus, Check, X, Lock } from 'lucide-react';

interface SellerSwitchModalProps {
  onClose: () => void;
  isMandatory?: boolean;
}

export function SellerSwitchModal({ onClose, isMandatory }: SellerSwitchModalProps) {
  const { sellers, activeSeller, loginWithPin, quickSelectSeller, createSeller } = useSellerAuth();
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(activeSeller);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewSellerForm, setShowNewSellerForm] = useState(false);

  // New Seller state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'owner' | 'seller'>('seller');
  const [newPin, setNewPin] = useState('');

  const canClose = !isMandatory && Boolean(activeSeller);

  const handleDigitClick = (digit: string) => {
    if (pinInput.length < 6) {
      setPinInput((prev) => prev + digit);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleLogin = async () => {
    if (!selectedSeller) {
      setErrorMsg('Selecione um vendedor na lista acima.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    // If seller has no pin or pin is empty
    if (!selectedSeller.pinHash) {
      quickSelectSeller(selectedSeller);
      setIsSubmitting(false);
      onClose();
      return;
    }

    if (!pinInput) {
      setErrorMsg('Digite o PIN numérico do vendedor.');
      setIsSubmitting(false);
      return;
    }

    const res = await loginWithPin(selectedSeller.id, pinInput);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'PIN incorreto. Tente novamente.');
      setPinInput('');
    }
  };

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPin.trim()) {
      setErrorMsg('Preencha o nome e o PIN');
      return;
    }

    try {
      setIsSubmitting(true);
      await createSeller(newName.trim(), newRole, newPin.trim());
      setShowNewSellerForm(false);
      setNewName('');
      setNewPin('');
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg('Erro ao cadastrar: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-amber-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-amber-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <h2 className="text-base font-bold">
              {isMandatory || !activeSeller ? 'Identificação Obrigatória' : 'Trocar Vendedor'}
            </h2>
          </div>
          {canClose && (
            <button
              id="btn-close-seller-modal"
              onClick={onClose}
              className="p-1 rounded-full text-amber-200 hover:text-white hover:bg-amber-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5 max-h-[85vh] overflow-y-auto">
          {!showNewSellerForm ? (
            <>
              <p className="text-xs text-neutral-600 mb-3 font-medium">
                Selecione quem está operando o aplicativo nesta rota:
              </p>

              {/* Sellers List */}
              <div className="space-y-2 mb-4">
                {sellers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl">
                    Carregando vendedores...
                  </div>
                ) : (
                  sellers.map((s) => {
                    const isSelected = selectedSeller?.id === s.id;
                    const hasPin = Boolean(s.pinHash);
                    return (
                      <button
                        key={s.id}
                        id={`btn-select-seller-${s.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedSeller(s);
                          setPinInput('');
                          setErrorMsg('');
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/80 shadow-sm ring-2 ring-amber-500/20'
                            : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                              isSelected
                                ? 'bg-amber-600 text-white'
                                : 'bg-neutral-200 text-neutral-700'
                            }`}
                          >
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-neutral-900">{s.name}</div>
                            <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                              <span>{s.role === 'owner' ? 'Dono / Titular' : 'Ajudante / Vendedor'}</span>
                              {hasPin ? (
                                <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-medium">
                                  PIN
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] text-neutral-500 bg-neutral-200 px-1.5 py-0.2 rounded font-medium">
                                  Sem PIN
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-amber-700" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* PIN Keypad or Direct Selection Info */}
              {selectedSeller && (
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  {selectedSeller.pinHash ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          Digite o PIN de {selectedSeller.name.split(' ')[0]}:
                        </label>
                        <span className="text-[11px] text-neutral-400">
                          (4 a 6 dígitos)
                        </span>
                      </div>

                      {/* PIN Display Bubbles */}
                      <div className="flex justify-center items-center gap-3 py-2.5 mb-3 bg-neutral-50 rounded-xl border border-neutral-200">
                        {[0, 1, 2, 3].map((idx) => (
                          <div
                            key={idx}
                            className={`w-3.5 h-3.5 rounded-full transition-all ${
                              pinInput.length > idx
                                ? 'bg-amber-700 scale-110 shadow-sm'
                                : 'bg-neutral-300'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Number Pad for comfortable mobile tapping */}
                      <div className="grid grid-cols-3 gap-2">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                          <button
                            key={digit}
                            type="button"
                            onClick={() => handleDigitClick(digit)}
                            className="py-3 rounded-xl bg-neutral-100 hover:bg-amber-100 active:bg-amber-200 text-neutral-800 font-bold text-lg border border-neutral-200 active:scale-95 transition"
                          >
                            {digit}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPinInput('')}
                          className="py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-semibold border border-neutral-200 active:scale-95 transition"
                        >
                          Limpar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDigitClick('0')}
                          className="py-3 rounded-xl bg-neutral-100 hover:bg-amber-100 active:bg-amber-200 text-neutral-800 font-bold text-lg border border-neutral-200 active:scale-95 transition"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={handleBackspace}
                          className="py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold border border-neutral-200 active:scale-95 transition flex items-center justify-center"
                        >
                          ←
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 text-center font-medium">
                      Este vendedor não possui PIN cadastrado. Toque no botão abaixo para confirmar.
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center">
                  {errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <button
                  id="btn-confirm-seller-login"
                  type="button"
                  disabled={isSubmitting || !selectedSeller}
                  onClick={handleLogin}
                  className="w-full py-3.5 px-4 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition active:scale-[0.98] text-sm"
                >
                  {isSubmitting ? 'Verificando...' : 'Confirmar Vendedor'}
                </button>

                <button
                  id="btn-show-add-seller"
                  type="button"
                  onClick={() => setShowNewSellerForm(true)}
                  className="w-full py-2.5 text-xs text-amber-800 font-semibold hover:bg-amber-50 rounded-xl transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar Novo Vendedor / Ajudante
                </button>
              </div>
            </>
          ) : (
            /* New Seller Form */
            <form onSubmit={handleCreateSeller} className="space-y-3">
              <h3 className="text-sm font-bold text-neutral-900 mb-1">Novo Vendedor / Ajudante</h3>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome do Vendedor
                </label>
                <input
                  id="input-new-seller-name"
                  type="text"
                  required
                  placeholder="Ex: Carlos (Ajudante)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Função</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('seller')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                      newRole === 'seller'
                        ? 'bg-amber-100 border-amber-600 text-amber-900'
                        : 'border-neutral-300 text-neutral-700'
                    }`}
                  >
                    Ajudante / Vendedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('owner')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border ${
                      newRole === 'owner'
                        ? 'bg-amber-100 border-amber-600 text-amber-900'
                        : 'border-neutral-300 text-neutral-700'
                    }`}
                  >
                    Dono / MEI
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  PIN Numérico (4 a 6 dígitos)
                </label>
                <input
                  id="input-new-seller-pin"
                  type="password"
                  maxLength={6}
                  required
                  placeholder="Ex: 9988"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm tracking-widest"
                />
              </div>

              {errorMsg && (
                <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewSellerForm(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 rounded-xl hover:bg-neutral-200"
                >
                  Voltar
                </button>
                <button
                  id="btn-save-new-seller"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-700 rounded-xl hover:bg-amber-800 shadow-md"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Vendedor'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
