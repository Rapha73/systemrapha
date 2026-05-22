import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, ArrowLeft, Save, Check, Trash2 } from 'lucide-react';

// ── Tipagem ──────────────────────────────────────────────────────────
type RefeicaoKey = 'cafe_manha' | 'lanche_manha' | 'almoco' | 'lanche_tarde' | 'jantar';
type DiaKey = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

interface DiaRefeicoes {
  cafe_manha: string[];
  lanche_manha: string[];
  almoco: string[];
  lanche_tarde: string[];
  jantar: string[];
}

interface PlanoConteudo {
  dias: Record<DiaKey, DiaRefeicoes>;
}

interface PlanoAlimentarRow {
  id: string;
  paciente_id: string | null;
  conteudo: PlanoConteudo;
  created_at: string | null;
}

interface PlanoAlimentarProps {
  pacienteId: string;
}

// ── Constantes ───────────────────────────────────────────────────────
const DIAS_SEMANA: { key: DiaKey; label: string; emoji: string }[] = [
  { key: 'segunda', label: 'Segunda', emoji: '📅' },
  { key: 'terca', label: 'Terça', emoji: '📅' },
  { key: 'quarta', label: 'Quarta', emoji: '📅' },
  { key: 'quinta', label: 'Quinta', emoji: '📅' },
  { key: 'sexta', label: 'Sexta', emoji: '📅' },
  { key: 'sabado', label: 'Sábado', emoji: '📅' },
  { key: 'domingo', label: 'Domingo', emoji: '📅' },
];

const REFEICOES: { key: RefeicaoKey; label: string; emoji: string }[] = [
  { key: 'cafe_manha', label: 'Café da Manhã', emoji: '☀️' },
  { key: 'lanche_manha', label: 'Lanche da Manhã', emoji: '🥤' },
  { key: 'almoco', label: 'Almoço', emoji: '🍲' },
  { key: 'lanche_tarde', label: 'Lanche da Tarde', emoji: '🍎' },
  { key: 'jantar', label: 'Jantar', emoji: '🌙' },
];

const QTD_LINHAS = 5;

// ── Helpers ──────────────────────────────────────────────────────────
function criarConteudoVazio(): PlanoConteudo {
  const dias: Record<string, DiaRefeicoes> = {};
  for (const dia of DIAS_SEMANA) {
    dias[dia.key] = {
      cafe_manha: Array(QTD_LINHAS).fill(''),
      lanche_manha: Array(QTD_LINHAS).fill(''),
      almoco: Array(QTD_LINHAS).fill(''),
      lanche_tarde: Array(QTD_LINHAS).fill(''),
      jantar: Array(QTD_LINHAS).fill(''),
    };
  }
  return { dias } as PlanoConteudo;
}

function formatarDataBR(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Componente Principal ─────────────────────────────────────────────
const PlanoAlimentar: React.FC<PlanoAlimentarProps> = ({ pacienteId }) => {
  // Estado da listagem
  const [planos, setPlanos] = useState<PlanoAlimentarRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Estado do formulário
  const [modo, setModo] = useState<'lista' | 'novo' | 'editar'>('lista');
  const [conteudo, setConteudo] = useState<PlanoConteudo>(criarConteudoVazio());
  const [planoEditandoId, setPlanoEditandoId] = useState<string | null>(null);
  const [diaAtivo, setDiaAtivo] = useState<DiaKey>('segunda');

  // Feedback
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // ── Carregar histórico ──────────────────────────
  async function carregarPlanos() {
    try {
      setLoadingList(true);
      const { data, error } = await supabase
        .from('planos_alimentares')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlanos((data as unknown as PlanoAlimentarRow[]) || []);
    } catch (err: any) {
      console.error('Erro ao carregar planos:', err);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    carregarPlanos();
  }, [pacienteId]);

  // ── Limpar mensagem após 4s ──────────────────────
  useEffect(() => {
    if (mensagem) {
      const t = setTimeout(() => setMensagem(null), 4000);
      return () => clearTimeout(t);
    }
  }, [mensagem]);

  // ── Handlers ────────────────────────────────────
  function handleNovo() {
    setConteudo(criarConteudoVazio());
    setPlanoEditandoId(null);
    setDiaAtivo('segunda');
    setModo('novo');
  }

  function handleEditar(plano: PlanoAlimentarRow) {
    // Normalizar conteúdo que pode vir parcialmente
    const base = criarConteudoVazio();
    const conteudoPlano = plano.conteudo as PlanoConteudo;
    if (conteudoPlano?.dias) {
      for (const dia of DIAS_SEMANA) {
        if (conteudoPlano.dias[dia.key]) {
          for (const ref of REFEICOES) {
            const arr = conteudoPlano.dias[dia.key][ref.key];
            if (Array.isArray(arr)) {
              // Garantir que sempre tenha 5 linhas
              base.dias[dia.key][ref.key] = [
                ...arr.slice(0, QTD_LINHAS),
                ...Array(Math.max(0, QTD_LINHAS - arr.length)).fill(''),
              ];
            }
          }
        }
      }
    }
    setConteudo(base);
    setPlanoEditandoId(plano.id);
    setDiaAtivo('segunda');
    setModo('editar');
  }

  function handleCancelar() {
    setModo('lista');
    setPlanoEditandoId(null);
    setMensagem(null);
  }

  function handleInputChange(dia: DiaKey, refeicao: RefeicaoKey, index: number, valor: string) {
    setConteudo(prev => {
      const novoConteudo = JSON.parse(JSON.stringify(prev)) as PlanoConteudo;
      novoConteudo.dias[dia][refeicao][index] = valor;
      return novoConteudo;
    });
  }

  async function handleSalvar() {
    if (!pacienteId) {
      setMensagem({ tipo: 'erro', texto: 'Erro: paciente_id ausente. Não é possível salvar.' });
      return;
    }

    try {
      setSalvando(true);
      setMensagem(null);

      if (modo === 'novo') {
        const { error } = await supabase
          .from('planos_alimentares')
          .insert({ paciente_id: pacienteId, conteudo: conteudo as any });

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Plano alimentar salvo com sucesso!' });
      } else if (modo === 'editar' && planoEditandoId) {
        const { error } = await supabase
          .from('planos_alimentares')
          .update({ conteudo: conteudo as any })
          .eq('id', planoEditandoId);

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Plano alimentar atualizado com sucesso!' });
      }

      await carregarPlanos();
      setModo('lista');
      setPlanoEditandoId(null);
    } catch (err: any) {
      console.error('Erro ao salvar plano:', err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar o plano alimentar. Tente novamente.' });
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(planoId: string) {
    if (!confirm('Tem certeza que deseja excluir este plano alimentar?')) return;
    try {
      const { error } = await supabase
        .from('planos_alimentares')
        .delete()
        .eq('id', planoId);

      if (error) throw error;
      setMensagem({ tipo: 'sucesso', texto: 'Plano excluído com sucesso.' });
      await carregarPlanos();
    } catch (err: any) {
      console.error('Erro ao excluir plano:', err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir o plano.' });
    }
  }

  // ── Render: Lista de Histórico ─────────────────
  if (modo === 'lista') {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>Histórico de Planos Alimentares</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Crie e gerencie planos alimentares personalizados para o paciente.
            </p>
          </div>
          <button onClick={handleNovo} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Novo Plano Alimentar
          </button>
        </div>

        {mensagem && (
          <div
            style={{
              backgroundColor: mensagem.tipo === 'sucesso' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${mensagem.tipo === 'sucesso' ? '#a7f3d0' : '#fee2e2'}`,
              color: mensagem.tipo === 'sucesso' ? '#065f46' : '#dc2626',
              padding: '12px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            {mensagem.tipo === 'sucesso' ? <Check size={18} /> : null}
            {mensagem.texto}
          </div>
        )}

        {loadingList ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin" color="var(--primary-color)" size={32} />
          </div>
        ) : planos.length === 0 ? (
          <div className="pa-empty-state">
            <div className="pa-empty-icon">🍽️</div>
            <h4>Nenhum plano alimentar criado ainda</h4>
            <p>Clique em "Novo Plano Alimentar" para criar o primeiro plano personalizado deste paciente.</p>
          </div>
        ) : (
          <div className="pa-historico-grid">
            {planos.map((plano) => (
              <div key={plano.id} className="pa-historico-card">
                <div className="pa-historico-card-header">
                  <div className="pa-historico-icon">📋</div>
                  <div>
                    <span className="pa-historico-label">Plano Alimentar</span>
                    <span className="pa-historico-date">{formatarDataBR(plano.created_at)}</span>
                  </div>
                </div>
                <div className="pa-historico-actions">
                  <button onClick={() => handleEditar(plano)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Visualizar / Editar
                  </button>
                  <button onClick={() => handleExcluir(plano.id)} className="pa-btn-delete" title="Excluir plano">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render: Formulário (Novo / Editar) ─────────
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleCancelar} className="pa-btn-back" title="Voltar">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>
              {modo === 'novo' ? '➕ Novo Plano Alimentar' : '✏️ Editar Plano Alimentar'}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Preencha as refeições para cada dia da semana.
            </p>
          </div>
        </div>
      </div>

      {mensagem && (
        <div
          style={{
            backgroundColor: mensagem.tipo === 'sucesso' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${mensagem.tipo === 'sucesso' ? '#a7f3d0' : '#fee2e2'}`,
            color: mensagem.tipo === 'sucesso' ? '#065f46' : '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {mensagem.tipo === 'sucesso' ? <Check size={18} /> : null}
          {mensagem.texto}
        </div>
      )}

      {/* Abas dos Dias da Semana */}
      <div className="pa-dias-tabs">
        {DIAS_SEMANA.map((dia) => (
          <button
            key={dia.key}
            type="button"
            onClick={() => setDiaAtivo(dia.key)}
            className={`pa-dia-tab ${diaAtivo === dia.key ? 'active' : ''}`}
          >
            <span className="pa-dia-tab-emoji">{dia.emoji}</span>
            <span className="pa-dia-tab-label">{dia.label}</span>
          </button>
        ))}
      </div>

      {/* Refeições do Dia Selecionado */}
      <div className="pa-refeicoes-container">
        {REFEICOES.map((refeicao) => (
          <div key={refeicao.key} className="pa-refeicao-card">
            <div className="pa-refeicao-header">
              <span className="pa-refeicao-emoji">{refeicao.emoji}</span>
              <span className="pa-refeicao-titulo">{refeicao.label}</span>
            </div>
            <div className="pa-refeicao-inputs">
              {conteudo.dias[diaAtivo][refeicao.key].map((valor, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Opção ${index + 1}`}
                  value={valor}
                  onChange={(e) => handleInputChange(diaAtivo, refeicao.key, index, e.target.value)}
                  className="pa-input"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Botões de Ação */}
      <div className="pa-form-actions">
        <button type="button" onClick={handleCancelar} className="btn-secondary" style={{ padding: '12px 24px' }}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="btn-primary"
          style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {salvando ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {modo === 'novo' ? 'Salvar Plano' : 'Atualizar Plano'}
        </button>
      </div>
    </div>
  );
};

export default PlanoAlimentar;
