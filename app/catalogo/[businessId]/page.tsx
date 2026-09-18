'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPublicCatalog, getPublicCatalogItems } from '@/lib/db';
import { PublicCatalogItem } from '@/types';
import { formatCurrency } from '@/lib/format';
import { 
  Store, 
  Search, 
  ShoppingBag, 
  Share2, 
  Check, 
  AlertCircle,
  Package,
  RefreshCw,
  Plus,
  Minus,
  MessageSquare
} from 'lucide-react';

export default function PublicCatalogPage() {
  const params = useParams();
  const rawBusinessId = params?.businessId;
  const businessId = Array.isArray(rawBusinessId) ? rawBusinessId[0] : (rawBusinessId as string);

  const [isLoading, setIsLoading] = useState(true);
  const [businessName, setBusinessName] = useState<string>('');
  const [orderWhatsapp, setOrderWhatsapp] = useState<string>('');
  const [isCatalogActive, setIsCatalogActive] = useState(true);
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isNotFound, setIsNotFound] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      if (!businessId) {
        if (isMounted) {
          setIsNotFound(true);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setIsNotFound(false);

      try {
        const catalogInfo = await getPublicCatalog(businessId);

        if (!isMounted) return;

        if (!catalogInfo || !catalogInfo.active) {
          setIsNotFound(true);
        } else {
          setBusinessName(catalogInfo.businessName || 'Catálogo Virtual');
          setOrderWhatsapp(catalogInfo.orderWhatsapp || '');
          setIsCatalogActive(true);

          // Carrega os itens a partir do ID real do negócio
          const catalogItems = await getPublicCatalogItems(catalogInfo.businessId);
          if (!isMounted) return;

          // Filtra produtos com estoque zerado ou inativos (garantia dupla na vitrine)
          const availableItems = catalogItems.filter(
            (item) => item.active !== false && item.inStock !== false
          );

          // Sort alphabetically
          const sorted = [...availableItems].sort((a, b) => 
            (a.name || '').localeCompare(b.name || '', 'pt-BR')
          );
          setItems(sorted);
        }
      } catch (err) {
        console.error('Erro ao carregar vitrine pública:', err);
        if (isMounted) setIsNotFound(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const shareData = {
      title: businessName || 'Catálogo de Produtos',
      text: `Confira nossos produtos no catálogo virtual de ${businessName || 'nossa loja'}!`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Ignorar falha de clipboard
    }
  };

  const hasOrderWhatsapp = Boolean(
    orderWhatsapp && orderWhatsapp.replace(/\D/g, '').length >= 10
  );

  const handleQtyChange = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const cartList = items
    .filter((item) => (cart[item.id] || 0) > 0)
    .map((item) => {
      const qty = cart[item.id] || 0;
      return {
        ...item,
        quantity: qty,
        subtotal: qty * item.price,
      };
    });

  const totalCartItemsCount = cartList.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalCartPrice = cartList.reduce((acc, curr) => acc + curr.subtotal, 0);

  const handleCheckoutWhatsapp = () => {
    if (!hasOrderWhatsapp || cartList.length === 0) return;

    const rawDigits = orderWhatsapp.replace(/\D/g, '');
    const cleanDigits = rawDigits.startsWith('55') && rawDigits.length > 11 ? rawDigits.slice(2) : rawDigits;

    let message = `*Pedido - ${businessName || 'Catálogo Virtual'}*\n\n`;
    cartList.forEach((item) => {
      message += `• ${item.quantity}x ${item.name} — ${formatCurrency(item.price)} = ${formatCurrency(item.subtotal)}\n`;
    });
    message += `\n*Total: ${formatCurrency(totalCartPrice)}*`;

    const url = `https://wa.me/55${cleanDigits}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Lista de categorias distintas presentes em "items" na ordem em que aparecem
  const distinctCategories = Array.from(
    new Set(
      items.map((item) => (item.category && item.category.trim()) ? item.category.trim() : 'Geral')
    )
  );
  const categories = ['Todos', ...distinctCategories];

  const isCategoryFilterActive =
    selectedCategory !== 'Todos' &&
    distinctCategories.some((c) => c.toLowerCase() === selectedCategory.toLowerCase());

  const filteredItems = items.filter((item) => {
    // Filtro por categoria
    if (isCategoryFilterActive) {
      const itemCat = (item.category && item.category.trim()) ? item.category.trim() : 'Geral';
      if (itemCat.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // Filtro por busca de nome
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (item.name || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col selection:bg-amber-100">
      {/* Top Brand Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 py-3 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-neutral-900 truncate leading-tight">
                {businessName || 'Catálogo de Produtos'}
              </h1>
              <p className="text-xs text-amber-800 font-semibold tracking-wide">
                Vitrine Virtual
              </p>
            </div>
          </div>

          <button
            id="btn-share-catalog"
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-800 rounded-xl text-xs font-bold transition flex-shrink-0 border border-neutral-200"
            title="Compartilhar catálogo"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Link copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Compartilhar</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 ${hasOrderWhatsapp && totalCartItemsCount > 0 ? 'pb-24 sm:pb-28' : ''}`}>
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-10 bg-neutral-200/70 rounded-xl animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="bg-white rounded-2xl p-3 border border-neutral-200/80 space-y-2 animate-pulse">
                  <div className="aspect-square bg-neutral-200 rounded-xl" />
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-5 bg-neutral-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : isNotFound || !isCatalogActive ? (
          <div className="py-16 text-center max-w-md mx-auto px-4 space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-neutral-900">
                Catálogo não encontrado
              </h2>
              <p className="text-sm text-neutral-500">
                Este catálogo de produtos não existe ou não está disponível para visualização no momento.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar novamente</span>
            </button>
          </div>
        ) : (
          <>
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-catalog-search"
                type="text"
                placeholder="Buscar produto pelo nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white text-sm text-neutral-900 placeholder-neutral-400 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-600 shadow-2xs font-medium"
              />
            </div>

            {/* Category Chips (só exibe se houver mais de uma categoria distinta) */}
            {distinctCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    id={`filter-cat-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-amber-700 text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat === 'Todos' ? 'Todos os Produtos' : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Product Count / Filter Feedback */}
            <div className="flex items-center justify-between text-xs text-neutral-500 px-1 font-medium">
              <span>
                {filteredItems.length === 1
                  ? '1 produto encontrado'
                  : `${filteredItems.length} produtos disponíveis`}
              </span>
              {(searchTerm || selectedCategory !== 'Todos') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('Todos');
                  }}
                  className="text-amber-700 font-semibold hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Products Grid */}
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-neutral-200/90 p-6 space-y-2">
                <ShoppingBag className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-sm font-bold text-neutral-700">
                  Nenhum produto encontrado
                </p>
                <p className="text-xs text-neutral-400">
                  {searchTerm || selectedCategory !== 'Todos'
                    ? 'Não encontramos produtos com os filtros selecionados.'
                    : 'Ainda não há produtos cadastrados neste catálogo.'}
                </p>
                {(searchTerm || selectedCategory !== 'Todos') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('Todos');
                    }}
                    className="mt-2 text-xs font-bold text-amber-800 hover:text-amber-900 underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {filteredItems.map((item) => {
                  const qty = cart[item.id] || 0;
                  return (
                    <article
                      key={item.id}
                      id={`catalog-card-${item.id}`}
                      className="bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-2xs hover:shadow-sm transition flex flex-col"
                    >
                      {/* Photo Container */}
                      <div className="aspect-square bg-neutral-100 relative overflow-hidden flex items-center justify-center border-b border-neutral-100">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-neutral-300 p-4">
                            <Package className="w-10 h-10 stroke-[1.5]" />
                            <span className="text-[10px] font-semibold text-neutral-400 mt-1">Sem foto</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <h2 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">
                            {item.name}
                          </h2>
                          <span className="text-[11px] font-medium text-neutral-500">
                            {item.unit ? `Por ${item.unit}` : 'Unidade'}
                          </span>
                        </div>

                        <div className="pt-1 border-t border-neutral-100 flex items-center justify-between gap-1">
                          <span className="text-base font-extrabold text-amber-900">
                            {formatCurrency(item.price)}
                          </span>

                          {hasOrderWhatsapp && (
                            <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-xl border border-neutral-200">
                              <button
                                type="button"
                                id={`btn-minus-${item.id}`}
                                disabled={qty === 0}
                                onClick={() => handleQtyChange(item.id, -1)}
                                className="w-6 h-6 rounded-lg bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-800 disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center font-bold text-xs border border-neutral-200 transition active:scale-95 shadow-2xs"
                                aria-label="Diminuir quantidade"
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              <span className="w-4 text-center font-extrabold text-xs text-neutral-900">
                                {qty}
                              </span>

                              <button
                                type="button"
                                id={`btn-plus-${item.id}`}
                                onClick={() => handleQtyChange(item.id, 1)}
                                className="w-6 h-6 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white flex items-center justify-center font-bold text-xs transition active:scale-95 shadow-2xs"
                                aria-label="Aumentar quantidade"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {hasOrderWhatsapp && totalCartItemsCount > 0 && (
        <aside
          id="catalog-cart-bar"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-3 sm:p-4 shadow-xl transition-all"
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
                <ShoppingBag className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>
                  {totalCartItemsCount === 1
                    ? '1 item no pedido'
                    : `${totalCartItemsCount} itens no pedido`}
                </span>
              </div>
              <div className="text-base sm:text-lg font-extrabold text-neutral-900 leading-tight">
                {formatCurrency(totalCartPrice)}
              </div>
            </div>

            <button
              id="btn-checkout-whatsapp"
              type="button"
              onClick={handleCheckoutWhatsapp}
              className="px-4 sm:px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition active:scale-98 flex items-center gap-2 flex-shrink-0"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Finalizar Pedido no WhatsApp</span>
            </button>
          </div>
        </aside>
      )}

      {/* Clean Public Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6 px-4 text-center text-xs text-neutral-400 font-medium">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{businessName || 'Catálogo Virtual'} • Todos os direitos reservados</span>
          <span className="text-neutral-400">Desenvolvido com PDV Express</span>
        </div>
      </footer>
    </div>
  );
}
