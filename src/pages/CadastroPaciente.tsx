import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ArrowRight, Save, AlertCircle, Loader2, Check, Plus } from 'lucide-react';
import type { Tables } from '../types/database.types';

type TabType = 'pessoais' | 'clinico' | 'habitos';

const OBJETIVOS_OPCOES = [
  'Emagrecer',
  'Ganhar massa',
  'Controlar diabetes',
  'Saúde geral',
  'Performance esportiva',
  'Reeducação alimentar'
];

const NIVEL_ATIVIDADE_OPCOES = [
  'Sedentário',
  'Levemente ativo',
  'Moderadamente ativo',
  'Muito ativo',
  'Extremamente ativo'
];

const PATOLOGIAS_OPCOES = [
  'Nenhum',
  'Diabetes',
  'Hipertensão',
  'Hipotireoidismo',
  'Hipertireoidismo',
  'Síndrome do ovário policístico',
  'Doença celíaca',
  'Colesterol alto'
];

const RESTRICOES_OPCOES = [
  'Nenhum',
  'Lactose',
  'Glúten',
  'Açúcar',
  'Carne vermelha',
  'Frutos do mar'
];

const ALERGIAS_OPCOES = [
  'Nenhum',
  'Amendoim',
  'Leite',
  'Ovo',
  'Soja',
  'Trigo',
  'Frutos do mar'
];

const CadastroPaciente: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Tables<'nutricionistas'> | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controle do Wizard (Etapas)
  const [activeTab, setActiveTab] = useState<TabType>('pessoais');

  // Estado do formulário - Aba 1: Pessoal
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // Estado do formulário - Aba 2: Clínico
  const [pesoInicial, setPesoInicial] = useState(''); // Peso Atual
  const [altura, setAltura] = useState(''); // Altura em cm
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [objetivoTexto, setObjetivoTexto] = useState('');
  const [nivelAtividade, setNivelAtividade] = useState('');
  
  const [patologias, setPatologias] = useState<string[]>([]);
  const [patologiaLivre, setPatologiaLivre] = useState('');

  const [restricoesAlimentares, setRestricoesAlimentares] = useState<string[]>([]);
  const [restricaoLivre, setRestricaoLivre] = useState('');

  const [alergias, setAlergias] = useState<string[]>([]);
  const [alergiaLivre, setAlergiaLivre] = useState('');

  const [medicamentos, setMedicamentos] = useState('');
  const [suplementos, setSuplementos] = useState('');

  // Estado do formulário - Aba 3: Hábitos
  const [refeicoesPorDia, setRefeicoesPorDia] = useState('4');
  const [horarioAcorda, setHorarioAcorda] = useState('');
  const [horarioDorme, setHorarioDorme] = useState('');
  const [litrosAgua, setLitrosAgua] = useState('');
  const [atividadeFisica, setAtividadeFisica] = useState<boolean>(false);
  const [atividadeFisicaDescricao, setAtividadeFisicaDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    async function getProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('nutricionistas')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Erro ao carregar perfil para cadastro de paciente:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
    getProfile();
  }, [user]);

  // Função para converter número digitado em string de hora (ex: 6 -> 06:00, 630 -> 06:30, 2230 -> 22:30)
  const converterNumeroParaHora = (numStr: string) => {
    if (!numStr) return '';
    const digitos = numStr.replace(/\D/g, '');
    if (!digitos) return '';
    
    let horas = 0;
    let minutos = 0;
    
    if (digitos.length <= 2) {
      horas = parseInt(digitos);
    } else if (digitos.length === 3) {
      horas = parseInt(digitos.slice(0, 1));
      minutos = parseInt(digitos.slice(1));
    } else {
      horas = parseInt(digitos.slice(0, 2));
      minutos = parseInt(digitos.slice(2, 4));
    }
    
    horas = Math.min(23, Math.max(0, horas));
    minutos = Math.min(59, Math.max(0, minutos));
    
    const hStr = String(horas).padStart(2, '0');
    const mStr = String(minutos).padStart(2, '0');
    return `${hStr}:${mStr}`;
  };

  const handleHoraBlur = (valor: string, setValor: React.Dispatch<React.SetStateAction<string>>) => {
    if (!valor) return;
    const horaFormatada = converterNumeroParaHora(valor);
    setValor(horaFormatada);
  };

  // Cálculo de idade em tempo real
  const calcularIdade = (dataNascStr: string) => {
    if (!dataNascStr) return '';
    try {
      const [year, month, day] = dataNascStr.split('-').map(Number);
      const nasc = new Date(year, month - 1, day);
      const hoje = new Date();
      let idade = hoje.getFullYear() - nasc.getFullYear();
      const m = hoje.getMonth() - nasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
        idade--;
      }
      return `${idade} anos`;
    } catch {
      return '';
    }
  };

  // Cálculo de IMC em tempo real
  const calcularIMC = () => {
    const p = parseFloat(pesoInicial);
    const a = parseFloat(altura); // em cm
    if (p && a) {
      const aMetros = a / 100;
      return (p / (aMetros * aMetros)).toFixed(1);
    }
    return '--';
  };

  // Manipulação de Chips (Multi-seleção) com regra especial de "Nenhum"
  const toggleSelection = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (item === 'Nenhum') {
      if (list.includes('Nenhum')) {
        setList([]);
      } else {
        setList(['Nenhum']);
      }
    } else {
      let newList = list.filter(i => i !== 'Nenhum');
      if (newList.includes(item)) {
        newList = newList.filter(i => i !== item);
      } else {
        newList.push(item);
      }
      setList(newList);
    }
  };

  // Funções para adicionar itens personalizados livres
  const adicionarPatologiaLivre = () => {
    if (patologiaLivre.trim()) {
      const valor = patologiaLivre.trim();
      if (!patologias.includes(valor)) {
        setPatologias(patologias.filter(i => i !== 'Nenhum').concat(valor));
      }
      setPatologiaLivre('');
    }
  };

  const adicionarRestricaoLivre = () => {
    if (restricaoLivre.trim()) {
      const valor = restricaoLivre.trim();
      if (!restricoesAlimentares.includes(valor)) {
        setRestricoesAlimentares(restricoesAlimentares.filter(i => i !== 'Nenhum').concat(valor));
      }
      setRestricaoLivre('');
    }
  };

  const adicionarAlergiaLivre = () => {
    if (alergiaLivre.trim()) {
      const valor = alergiaLivre.trim();
      if (!alergias.includes(valor)) {
        setAlergias(alergias.filter(i => i !== 'Nenhum').concat(valor));
      }
      setAlergiaLivre('');
    }
  };

  const handleNextTab = (current: TabType) => {
    if (current === 'pessoais') {
      if (!nome) {
        setError('O campo Nome Completo é obrigatório.');
        return;
      }
      setError(null);
      setActiveTab('clinico');
    } else if (current === 'clinico') {
      setActiveTab('habitos');
    }
  };

  const handlePrevTab = (current: TabType) => {
    setError(null);
    if (current === 'habitos') {
      setActiveTab('clinico');
    } else if (current === 'clinico') {
      setActiveTab('pessoais');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!nome) {
      setError('O campo Nome Completo é obrigatório.');
      setActiveTab('pessoais');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Salva altura convertendo de centímetros para metros no banco
      const alturaMetros = altura ? parseFloat(altura) / 100 : null;

      const payload = {
        nutricionista_id: profile.id,
        nome,
        data_nascimento: dataNascimento || null,
        sexo: sexo || null,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        peso_inicial: pesoInicial ? parseFloat(pesoInicial) : null,
        altura: alturaMetros,
        objetivos: objetivos.length > 0 ? objetivos : null,
        objetivo_texto: objetivoTexto || null,
        nivel_atividade: nivelAtividade || null,
        patologias: patologias.length > 0 ? patologias : null,
        restricoes_alimentares: restricoesAlimentares.length > 0 ? restricoesAlimentares : null,
        alergias: alergias.length > 0 ? alergias : null,
        medicamentos: medicamentos || null,
        suplementos: suplementos || null,
        refeicoes_por_dia: refeicoesPorDia ? parseInt(refeicoesPorDia) : null,
        horario_acorda: horarioAcorda || null,
        horario_dorme: horarioDorme || null,
        litros_agua: litrosAgua ? parseFloat(litrosAgua) : null,
        atividade_fisica: atividadeFisica,
        atividade_fisica_descricao: atividadeFisica ? atividadeFisicaDescricao : null,
        observacoes: observacoes || null
      };

      const { data, error: dbError } = await supabase
        .from('pacientes')
        .insert([payload])
        .select('id')
        .single();

      if (dbError) throw dbError;

      setSuccess(true);
      setTimeout(() => {
        navigate(`/pacientes/${data.id}`);
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao cadastrar paciente:', err);
      setError(err.message || 'Erro ao salvar paciente no banco de dados.');
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" color="var(--primary-color)" size={40} />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <button 
          onClick={() => navigate('/pacientes')} 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            padding: 0,
            marginBottom: '16px'
          }}
        >
          <ArrowLeft size={16} />
          Voltar para Lista
        </button>
        <h1 style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em', fontWeight: 800, fontSize: '2rem' }}>
          Cadastrar Novo Paciente
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Preencha a ficha de anamnese para iniciar o acompanhamento.</p>
      </header>

      {error && (
        <div className="error-box" style={{ marginBottom: '24px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-box" style={{ 
          marginBottom: '24px', 
          backgroundColor: '#ecfdf5', 
          border: '1px solid #d1fae5', 
          color: 'var(--primary-color)', 
          padding: '16px', 
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600
        }}>
          <Check size={18} />
          <span>Paciente cadastrado com sucesso! Redirecionando para o perfil...</span>
        </div>
      )}

      {/* Tabs / Wizard Navigation */}
      <div className="wizard-tabs">
        <button 
          type="button"
          onClick={() => nome && setActiveTab('pessoais')}
          className={`wizard-tab-btn ${activeTab === 'pessoais' ? 'active' : ''}`}
        >
          <span className="wizard-tab-number">1</span>
          Pessoal
        </button>
        <button 
          type="button"
          onClick={() => {
            if (nome) {
              setActiveTab('clinico');
            } else {
              setError('Nome Completo é obrigatório antes de prosseguir.');
            }
          }}
          className={`wizard-tab-btn ${activeTab === 'clinico' ? 'active' : ''} ${!nome ? 'disabled' : ''}`}
        >
          <span className="wizard-tab-number">2</span>
          Clínico
        </button>
        <button 
          type="button"
          onClick={() => {
            if (nome) {
              setActiveTab('habitos');
            } else {
              setError('Nome Completo é obrigatório antes de prosseguir.');
            }
          }}
          className={`wizard-tab-btn ${activeTab === 'habitos' ? 'active' : ''} ${!nome ? 'disabled' : ''}`}
        >
          <span className="wizard-tab-number">3</span>
          Hábitos
        </button>
      </div>

      {/* Formulário Principal */}
      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '36px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
        
        {/* ABA 1: Pessoal */}
        {activeTab === 'pessoais' && (
          <div className="form-grid">
            <div className="form-group col-12">
              <label htmlFor="nome">Nome Completo *</label>
              <input
                id="nome"
                type="text"
                placeholder="Nome do paciente"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="form-group col-6">
              <label htmlFor="nascimento">Data de Nascimento</label>
              <input
                id="nascimento"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
              {dataNascimento && (
                <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                  Idade calculada: {calcularIdade(dataNascimento)}
                </span>
              )}
            </div>

            <div className="form-group col-6">
              <label htmlFor="sexo">Sexo</label>
              <select id="sexo" value={sexo} onChange={(e) => setSexo(e.target.value)}>
                <option value="">Selecione...</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="form-group col-6">
              <label htmlFor="telefone">Telefone</label>
              <input
                id="telefone"
                type="tel"
                placeholder="Ex: 1199999999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                maxLength={13}
              />
            </div>

            <div className="form-group col-6">
              <label htmlFor="whatsapp">WhatsApp</label>
              <input
                id="whatsapp"
                type="tel"
                placeholder="Ex: 11999999999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 13))}
                maxLength={13}
              />
            </div>

            <div className="form-group col-12">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                placeholder="paciente@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ABA 2: Clínico */}
        {activeTab === 'clinico' && (
          <div className="form-grid">
            <div className="form-group col-4">
              <label htmlFor="peso">Peso Atual (kg)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="peso"
                  type="number"
                  step="0.1"
                  placeholder="70.5"
                  value={pesoInicial}
                  onChange={(e) => setPesoInicial(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <span style={{ position: 'absolute', right: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none', fontWeight: 600 }}>kg</span>
              </div>
            </div>

            <div className="form-group col-4">
              <label htmlFor="altura">Altura (cm)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="altura"
                  type="number"
                  step="1"
                  placeholder="172"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <span style={{ position: 'absolute', right: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none', fontWeight: 600 }}>cm</span>
              </div>
            </div>

            <div className="form-group col-4">
              <label>IMC Calculado</label>
              <div style={{
                padding: '12px 16px',
                background: '#f3f4f6',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                minHeight: '45px',
                display: 'flex',
                alignItems: 'center'
              }}>
                {calcularIMC()}
              </div>
            </div>

            <div className="form-group col-12">
              <label>Objetivo do Paciente (Selecione quantos desejar)</label>
              <div className="chips-container">
                {OBJETIVOS_OPCOES.map(item => (
                  <div
                    key={item}
                    onClick={() => toggleSelection(item, objetivos, setObjetivos)}
                    className={`chip-item ${objetivos.includes(item) ? 'selected' : ''}`}
                  >
                    {objetivos.includes(item) && <Check size={12} style={{ marginRight: '4px', display: 'inline' }} />}
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group col-12">
              <label htmlFor="objetivo_texto">Objetivo — Detalhes Adicionais</label>
              <textarea
                id="objetivo_texto"
                placeholder="Descreva detalhes específicos do objetivo..."
                value={objetivoTexto}
                onChange={(e) => setObjetivoTexto(e.target.value)}
                style={{ width: '100%', minHeight: '80px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '12px', resize: 'vertical' }}
              />
            </div>

            <div className="form-group col-12">
              <label htmlFor="nivel_atividade">Nível de Atividade Física</label>
              <select id="nivel_atividade" value={nivelAtividade} onChange={(e) => setNivelAtividade(e.target.value)}>
                <option value="">Selecione...</option>
                {NIVEL_ATIVIDADE_OPCOES.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>

            {/* Patologias */}
            <div className="form-group col-12" style={{ marginTop: '8px' }}>
              <label>Patologias ou Condições de Saúde</label>
              <div className="chips-container">
                {PATOLOGIAS_OPCOES.map(item => (
                  <div
                    key={item}
                    onClick={() => toggleSelection(item, patologias, setPatologias)}
                    className={`chip-item ${patologias.includes(item) ? 'selected' : ''}`}
                  >
                    {patologias.includes(item) && <Check size={12} style={{ marginRight: '4px', display: 'inline' }} />}
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input
                  type="text"
                  placeholder="Adicionar patologia personalizada..."
                  value={patologiaLivre}
                  onChange={(e) => setPatologiaLivre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      adicionarPatologiaLivre();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={adicionarPatologiaLivre}
                  style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}
                >
                  <Plus size={16} style={{ marginRight: '4px' }} /> Adicionar
                </button>
              </div>
            </div>

            {/* Restrições Alimentares */}
            <div className="form-group col-12" style={{ marginTop: '16px' }}>
              <label>Restrições Alimentares</label>
              <div className="chips-container">
                {RESTRICOES_OPCOES.map(item => (
                  <div
                    key={item}
                    onClick={() => toggleSelection(item, restricoesAlimentares, setRestricoesAlimentares)}
                    className={`chip-item ${restricoesAlimentares.includes(item) ? 'selected' : ''}`}
                  >
                    {restricoesAlimentares.includes(item) && <Check size={12} style={{ marginRight: '4px', display: 'inline' }} />}
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input
                  type="text"
                  placeholder="Adicionar restrição personalizada..."
                  value={restricaoLivre}
                  onChange={(e) => setRestricaoLivre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      adicionarRestricaoLivre();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={adicionarRestricaoLivre}
                  style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}
                >
                  <Plus size={16} style={{ marginRight: '4px' }} /> Adicionar
                </button>
              </div>
            </div>

            {/* Alergias Alimentares */}
            <div className="form-group col-12" style={{ marginTop: '16px' }}>
              <label>Alergias Alimentares</label>
              <div className="chips-container">
                {ALERGIAS_OPCOES.map(item => (
                  <div
                    key={item}
                    onClick={() => toggleSelection(item, alergias, setAlergias)}
                    className={`chip-item ${alergias.includes(item) ? 'selected' : ''}`}
                  >
                    {alergias.includes(item) && <Check size={12} style={{ marginRight: '4px', display: 'inline' }} />}
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input
                  type="text"
                  placeholder="Adicionar alergia personalizada..."
                  value={alergiaLivre}
                  onChange={(e) => setAlergiaLivre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      adicionarAlergiaLivre();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={adicionarAlergiaLivre}
                  style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}
                >
                  <Plus size={16} style={{ marginRight: '4px' }} /> Adicionar
                </button>
              </div>
            </div>

            <div className="form-group col-6" style={{ marginTop: '8px' }}>
              <label htmlFor="medicamentos">Medicamentos de Uso Contínuo</label>
              <input
                id="medicamentos"
                type="text"
                placeholder="Medicamentos contínuos..."
                value={medicamentos}
                onChange={(e) => setMedicamentos(e.target.value)}
              />
            </div>

            <div className="form-group col-6" style={{ marginTop: '8px' }}>
              <label htmlFor="suplementos">Suplementos em Uso</label>
              <input
                id="suplementos"
                type="text"
                placeholder="Suplementos utilizados..."
                value={suplementos}
                onChange={(e) => setSuplementos(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ABA 3: Hábitos */}
        {activeTab === 'habitos' && (
          <div className="form-grid">
            <div className="form-group col-4">
              <label htmlFor="refeicoes">Refeições ao Dia</label>
              <input
                id="refeicoes"
                type="number"
                placeholder="4"
                value={refeicoesPorDia}
                onChange={(e) => setRefeicoesPorDia(e.target.value)}
              />
            </div>

            <div className="form-group col-4">
              <label htmlFor="acorda">Horário que Costuma Acordar</label>
              <input
                id="acorda"
                type="text"
                placeholder="Ex: 6 ou 630"
                value={horarioAcorda}
                onChange={(e) => setHorarioAcorda(e.target.value)}
                onBlur={() => handleHoraBlur(horarioAcorda, setHorarioAcorda)}
              />
            </div>

            <div className="form-group col-4">
              <label htmlFor="dorme">Horário que Costuma Dormir</label>
              <input
                id="dorme"
                type="text"
                placeholder="Ex: 23 ou 2230"
                value={horarioDorme}
                onChange={(e) => setHorarioDorme(e.target.value)}
                onBlur={() => handleHoraBlur(horarioDorme, setHorarioDorme)}
              />
            </div>

            <div className="form-group col-6">
              <label htmlFor="agua">Quantidade de Água Diária</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="agua"
                  type="number"
                  step="0.1"
                  placeholder="2.5"
                  value={litrosAgua}
                  onChange={(e) => setLitrosAgua(e.target.value)}
                  style={{ paddingRight: '60px' }}
                />
                <span style={{ position: 'absolute', right: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none', fontWeight: 600 }}>litros</span>
              </div>
            </div>

            <div className="form-group col-6">
              <label htmlFor="atividade">Pratica Atividade Física?</label>
              <select 
                id="atividade" 
                value={atividadeFisica ? 'Sim' : 'Não'} 
                onChange={(e) => setAtividadeFisica(e.target.value === 'Sim')}
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>

            {atividadeFisica && (
              <div className="form-group col-12 animate-fade-in">
                <label htmlFor="atividade_desc">Qual atividade e frequência semanal?</label>
                <input
                  id="atividade_desc"
                  type="text"
                  placeholder="Ex: Musculação 4x na semana, Corrida aos sábados"
                  value={atividadeFisicaDescricao}
                  onChange={(e) => setAtividadeFisicaDescricao(e.target.value)}
                />
              </div>
            )}

            <div className="form-group col-12">
              <label htmlFor="observacoes">Observações Gerais</label>
              <textarea
                id="observacoes"
                placeholder="Escreva anotações gerais..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                style={{ width: '100%', minHeight: '100px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '12px', resize: 'vertical' }}
              />
            </div>
          </div>
        )}

        {/* Linha de Ações de Navegação */}
        <div className="form-actions-row">
          <div>
            {activeTab !== 'pessoais' && (
              <button 
                type="button" 
                onClick={() => handlePrevTab(activeTab)} 
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
            )}
          </div>
          <div>
            {activeTab !== 'habitos' ? (
              <button 
                type="button" 
                onClick={() => handleNextTab(activeTab)} 
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Próximo
                <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={saving || success}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar Paciente
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </form>
    </div>
  );
};

export default CadastroPaciente;
