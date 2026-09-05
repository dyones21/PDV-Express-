'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  ShoppingBag, 
  Clock, 
  Package, 
  Users, 
  Settings, 
  WifiOff,
  HelpCircle
} from 'lucide-react';

interface HelpItem {
  question: string;
  answer: string;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  items: HelpItem[];
}

const HELP_DATA: HelpSection[] = [
  {
    id: 'primeiros-passos',
    title: 'Primeiros Passos',
    icon: BookOpen,
    description: 'Login, PIN e acesso inicial no aparelho',
    items: [
      {
        question: 'Como faço login?',
        answer:
          'Use o e-mail e senha da sua empresa. Esse login só precisa ser feito uma vez por aparelho — depois disso, o sistema lembra de você.',
      },
      {
        question: 'O que é o PIN?',
        answer:
          'Depois do login da empresa, cada vendedor escolhe o próprio nome e digita um PIN de 4 dígitos pra começar a usar — isso identifica quem fez cada venda. Trocar de vendedor no mesmo aparelho é rápido, não precisa fazer login de novo.',
      },
      {
        question: 'Esqueci meu PIN.',
        answer:
          'Peça para o dono da empresa criar um vendedor novo ou reativar seu acesso em Configurações.',
      },
    ],
  },
  {
    id: 'como-vender',
    title: 'Como Vender',
    icon: ShoppingBag,
    description: 'Registro de vendas, pagamentos e localização',
    items: [
      {
        question: 'Cliente Avulso ou Cadastrado?',
        answer:
          'Use "Cliente Avulso" para venda rápida sem guardar dados de quem comprou — mas atenção: venda avulsa só pode ser paga na hora (não é possível deixar fiado sem um cliente cadastrado, porque não teria como cobrar depois).',
      },
      {
        question: 'Formas de pagamento.',
        answer:
          'Pago à Vista, Fiado Total ou Fiado Parcial (paga uma parte, o resto fica em aberto).',
      },
      {
        question: 'Busca de produto.',
        answer:
          'Use o campo de busca no topo da lista de produtos pra achar rápido, mesmo com o catálogo grande.',
      },
      {
        question: 'Localização da venda.',
        answer:
          'O sistema salva automaticamente onde a venda foi feita (usando o GPS do celular), só pra referência — mesmo sem internet, isso continua funcionando.',
      },
    ],
  },
  {
    id: 'fiado-a-receber',
    title: 'Fiado / A Receber',
    icon: Clock,
    description: 'Cobranças, baixa de valores e histórico',
    items: [
      {
        question: 'Como cobrar um cliente?',
        answer:
          'Na aba "A Receber", toque em "Cobrar no WhatsApp" — ele já abre uma mensagem pronta com o valor em aberto.',
      },
      {
        question: 'Como dar baixa (registrar pagamento)?',
        answer:
          'Toque em "Dar Baixa / Receber" no card do cliente, informe o valor pago — o sistema já aplica automaticamente nas vendas mais antigas em aberto primeiro.',
      },
      {
        question: 'Por que uma venda avulsa não aparece aqui?',
        answer:
          'Porque não tem cliente vinculado — veja a explicação em "Como Vender" acima.',
      },
    ],
  },
  {
    id: 'produtos-estoque',
    title: 'Produtos e Estoque',
    icon: Package,
    description: 'Cadastro fracionado, reposições e alertas',
    items: [
      {
        question: 'Comprei por peso mas vendo por unidade, como cadastro?',
        answer:
          'No cadastro do produto, ative "Comprei por peso (kg), mas vendo por unidade" — informe peso total, valor pago e quantas unidades rendeu, e o sistema calcula o custo por unidade sozinho.',
      },
      {
        question: 'Como faço reposição de estoque?',
        answer:
          'Na aba Produtos, toque em "+ Entrada de Estoque" no produto — dá pra atualizar o custo e até o preço de venda nesse mesmo passo.',
      },
      {
        question: 'Estoque baixo.',
        answer:
          'Produtos com pouca quantidade aparecem destacados na listagem.',
      },
    ],
  },
  {
    id: 'clientes',
    title: 'Clientes',
    icon: Users,
    description: 'Organização, inativação e lembretes',
    items: [
      {
        question: 'Como inativar um cliente?',
        answer:
          'Na aba Clientes, toque no botão de inativar — ele some da seleção de vendas, mas o histórico e dívidas em aberto continuam visíveis normalmente.',
      },
      {
        question: 'Lembrete de visita.',
        answer:
          'Ao final de uma venda pra cliente cadastrado, o sistema pergunta quando você pretende voltar — isso aparece destacado na tela "Hoje" quando chegar a data.',
      },
    ],
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    icon: Settings,
    description: 'Gestão de equipe, backup e troca de aparelho',
    items: [
      {
        question: 'Gerenciar vendedores.',
        answer:
          'Adicionar ou inativar vendedores fica em Configurações, disponível só pro Dono do negócio.',
      },
      {
        question: 'Fazer backup.',
        answer:
          'Use o botão de Exportar CSV periodicamente — é uma cópia de segurança dos seus dados fora do sistema.',
      },
      {
        question: 'Sair do sistema.',
        answer:
          'Use "Sair do Sistema" só se quiser desconectar o aparelho de verdade (vai pedir login com e-mail/senha de novo); pra só trocar de vendedor, use "Trocar / Novo Vendedor".',
      },
    ],
  },
  {
    id: 'funciona-sem-internet',
    title: 'Funciona Sem Internet?',
    icon: WifiOff,
    description: 'Funcionamento offline e sincronização automática',
    items: [
      {
        question: 'Funciona Sem Internet?',
        answer:
          'Sim. Você pode vender, dar baixa em fiado e repor estoque mesmo sem sinal — tudo fica guardado no aparelho e sincroniza sozinho assim que a internet voltar. Um aviso na tela mostra quando você está offline.\n\nImportante: cada aparelho novo precisa abrir o sistema com internet pelo menos uma vez antes de ser usado offline pela primeira vez.',
      },
    ],
  },
];

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function AjudaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'primeiros-passos': true,
    'como-vender': true,
  });

  const queryClean = searchTerm.trim();

  // Filtragem estática client-side por texto
  const filteredSections = useMemo(() => {
    if (!queryClean) return HELP_DATA;

    const queryNorm = normalizeText(queryClean);

    return HELP_DATA.map((section) => {
      const sectionTitleMatch = normalizeText(section.title).includes(queryNorm);
      const matchingItems = section.items.filter(
        (item) =>
          normalizeText(item.question).includes(queryNorm) ||
          normalizeText(item.answer).includes(queryNorm)
      );

      // Se o título da seção bate, mantém todos os itens da seção; senão, mantém apenas os itens que batem
      if (sectionTitleMatch) {
        return section;
      }

      if (matchingItems.length > 0) {
        return {
          ...section,
          items: matchingItems,
        };
      }

      return null;
    }).filter(Boolean) as HelpSection[];
  }, [queryClean]);

  const totalMatchingItems = useMemo(() => {
    return filteredSections.reduce((acc, sec) => acc + sec.items.length, 0);
  }, [filteredSections]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    HELP_DATA.forEach((s) => {
      all[s.id] = true;
    });
    setExpandedSections(all);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  return (
    <div className="min-h-full bg-amber-50/40 text-neutral-900 pb-16">
      {/* Top Header com Botão Voltar */}
      <header className="sticky top-0 z-30 bg-amber-700 text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            id="btn-back-to-app"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-800/80 hover:bg-amber-800 text-amber-100 hover:text-white border border-amber-600/60 text-xs font-bold transition active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao App</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-300/30 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-amber-200" />
            </div>
            <div className="text-right sm:text-left">
              <h1 className="text-sm sm:text-base font-bold text-amber-50 leading-tight">
                Central de Ajuda
              </h1>
              <p className="text-[11px] text-amber-200/90 font-medium">
                Guia prático do sistema
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Campo de Busca */}
        <div className="bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-sm space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-help"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar dúvida (ex: PIN, fiado, estoque, offline)..."
              className="w-full pl-9 pr-9 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium transition"
            />
            {searchTerm && (
              <button
                type="button"
                id="btn-clear-search-help"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 px-0.5">
            <span>
              {queryClean
                ? `${totalMatchingItems} ${
                    totalMatchingItems === 1 ? 'tópico encontrado' : 'tópicos encontrados'
                  }`
                : 'Clique nas seções abaixo para ver as explicações'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-expand-all"
                onClick={expandAll}
                className="font-medium text-amber-700 hover:text-amber-800 hover:underline"
              >
                Abrir todos
              </button>
              <span className="text-neutral-300">•</span>
              <button
                type="button"
                id="btn-collapse-all"
                onClick={collapseAll}
                className="font-medium text-neutral-500 hover:text-neutral-700 hover:underline"
              >
                Recolher
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Seções / Acordeão */}
        {filteredSections.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-neutral-200 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-800">
                Nenhum tópico encontrado
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Não encontramos respostas para &quot;{searchTerm}&quot;. Tente pesquisar por termos como login, PIN, fiado, estoque ou offline.
              </p>
            </div>
            <button
              type="button"
              id="btn-reset-search-empty"
              onClick={() => setSearchTerm('')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition active:scale-95 shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar Busca</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              // Quando há busca ativa, mantemos as seções que batem expandidas
              const isExpanded = queryClean ? true : Boolean(expandedSections[section.id]);

              return (
                <div
                  key={section.id}
                  id={`section-${section.id}`}
                  className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm overflow-hidden transition"
                >
                  {/* Cabeçalho da Seção (Clicável) */}
                  <button
                    type="button"
                    id={`btn-toggle-section-${section.id}`}
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-amber-50/50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-100/70 border border-amber-200/80 flex items-center justify-center flex-shrink-0 text-amber-800">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-neutral-900 leading-snug truncate">
                          {section.title}
                        </h2>
                        {section.description && (
                          <p className="text-[11px] text-neutral-500 font-medium truncate">
                            {section.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                        {section.items.length}{' '}
                        {section.items.length === 1 ? 'dúvida' : 'dúvidas'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </button>

                  {/* Conteúdo Expandido */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 divide-y divide-neutral-100 border-t border-neutral-100">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="py-3 first:pt-2 last:pb-0 space-y-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-amber-950 flex items-start gap-1.5">
                            <span className="text-amber-600 font-extrabold">•</span>
                            <span>{item.question}</span>
                          </h3>
                          <div className="text-xs text-neutral-600 leading-relaxed pl-3 font-normal whitespace-pre-line">
                            {item.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé Informativo */}
        <div className="pt-2 text-center">
          <div className="p-3 bg-amber-100/50 rounded-xl border border-amber-200/60 inline-block text-[11px] text-amber-900 font-medium">
            💡 Dica: Todas essas regras funcionam automaticamente no seu celular, mesmo sem internet.
          </div>
        </div>
      </main>
    </div>
  );
}
