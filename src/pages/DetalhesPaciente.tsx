import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  User, 
  Heart, 
  Activity, 
  ShieldAlert, 
  Clock, 
  Award, 
  Plus, 
  Loader2, 
  Sparkles,
  Apple,
  TrendingDown,
  TrendingUp,
  Calendar,
  Edit
} from 'lucide-react';
import type { Tables } from '../types/database.types';

type DetailTabType = 'clinico' | 'consultas' | 'plano' | 'ia';

const DetalhesPaciente: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Inicializa a aba com base no state passado pelo redirecionamento
  const initialTab = (location.state as { tab?: DetailTabType })?.tab || 'clinico';

  const [patient, setPatient] = useState<Tables<'pacientes'> | null>(null);
  const [consultas, setConsultas] = useState<Tables<'consultas'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTabType>(initialTab);

  // Estados específicos para o Assistente de IA
  const [diagnosis, setDiagnosis] = useState<string | null>(() => {
    return localStorage.getItem(`diagnosis_${id}`) || null;
  });
  const [generating, setGenerating] = useState(false);
  const [errorIa, setErrorIa] = useState<string | null>(null);

  // Carrega chave API do LocalStorage ou do .env
  const [apiKey, setApiKey] = useState<string>(() => {
    const local = localStorage.getItem('gemini_api_key') || '';
    const env = import.meta.env.VITE_GEMINI_API_KEY || '';
    return local || env;
  });
  const [tempKey, setTempKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');

  const salvarApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gemini_api_key', tempKey);
    setApiKey(tempKey);
    setErrorIa(null);
  };

  const removerApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setTempKey('');
    setApiKey(import.meta.env.VITE_GEMINI_API_KEY || '');
    setErrorIa(null);
  };

  const copiarDiagnostico = () => {
    if (diagnosis) {
      navigator.clipboard.writeText(diagnosis);
      alert('Diagnóstico copiado para a área de transferência!');
    }
  };

  // Helper para interpretar negritos simples (**texto**) dentro do texto
  const parseInlineStyles = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i}>{part}</strong>;
      }
      return part;
    });
  };

  // Conversor simples de Markdown em Elementos React
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    let inList = false;
    const htmlElements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed === '') {
        if (inList) inList = false;
        return;
      }

      // Título H2
      if (trimmed.startsWith('## ')) {
        if (inList) inList = false;
        const cleanText = trimmed.replace('## ', '');
        htmlElements.push(<h2 key={`h2-${index}`}>{parseInlineStyles(cleanText)}</h2>);
        return;
      }

      // Título H3
      if (trimmed.startsWith('### ')) {
        if (inList) inList = false;
        const cleanText = trimmed.replace('### ', '');
        htmlElements.push(<h3 key={`h3-${index}`}>{parseInlineStyles(cleanText)}</h3>);
        return;
      }

      // Listas
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const cleanText = trimmed.substring(2);
        inList = true;
        htmlElements.push(
          <ul key={`ul-${index}`} style={{ margin: '0 0 8px 0' }}>
            <li>{parseInlineStyles(cleanText)}</li>
          </ul>
        );
        return;
      }

      // Citação
      if (trimmed.startsWith('> ')) {
        if (inList) inList = false;
        const cleanText = trimmed.substring(2);
        htmlElements.push(<blockquote key={`quote-${index}`}>{parseInlineStyles(cleanText)}</blockquote>);
        return;
      }

      // Parágrafo padrão
      if (inList) inList = false;
      htmlElements.push(<p key={`p-${index}`}>{parseInlineStyles(trimmed)}</p>);
    });

    return htmlElements;
  };

  const gerarDiagnostico = async () => {
    if (!patient || !apiKey) return;
    try {
      setGenerating(true);
      setErrorIa(null);

      const idade = calcularIdade(patient.data_nascimento);
      const imc = calcularIMC(patient.peso_inicial, patient.altura);
      const patologiasStr = patient.patologias && (patient.patologias as string[]).length > 0 ? (patient.patologias as string[]).join(', ') : 'Nenhuma';
      const restricoesStr = patient.restricoes_alimentares && (patient.restricoes_alimentares as string[]).length > 0 ? (patient.restricoes_alimentares as string[]).join(', ') : 'Nenhuma';
      const alergiasStr = patient.alergias && (patient.alergias as string[]).length > 0 ? (patient.alergias as string[]).join(', ') : 'Nenhuma';
      const objetivosStr = patient.objetivos && (patient.objetivos as string[]).length > 0 ? (patient.objetivos as string[]).join(', ') : 'Não informado';
      const atividadeFisicaStr = patient.atividade_fisica ? `Sim (${patient.atividade_fisica_descricao || 'Sem descrição'})` : 'Sedentário';

      let consultasTexto = 'Histórico de consultas:\n';
      if (consultas.length > 0) {
        consultas.forEach((c) => {
          consultasTexto += `- Data: ${formatarDataBR(c.data_consulta)} | Peso: ${c.peso || '--'} kg | % Gordura: ${c.percentual_gordura || '--'}% | Cintura: ${c.cintura || '--'} cm | Notas: ${c.observacoes || 'Nenhuma'}\n`;
        });
      } else {
        consultasTexto += 'Nenhuma consulta registrada ainda.\n';
      }

      const prompt = `Você é um assistente de inteligência artificial de nutrição altamente qualificado e experiente.
Analise os dados clínicos e antropométricos abaixo e forneça um diagnóstico nutricional estruturado, contendo orientações gerais, identificação de riscos alimentares, sugestões de hábitos e um plano de ação preliminar.

DADOS DO PACIENTE:
- Nome: ${patient.nome}
- Idade: ${idade}
- Sexo: ${patient.sexo || 'Não informado'}
- Peso Inicial: ${patient.peso_inicial || '--'} kg
- Altura: ${patient.altura || '--'} m
- IMC Inicial: ${imc ? `${imc.valor} (${imc.classificacao})` : 'Não calculado'}
- Nível de Atividade Física: ${patient.nivel_atividade || 'Não informado'}
- Hábitos: ${atividadeFisicaStr} | Água/dia: ${patient.litros_agua || '--'} L | Refeições/dia: ${patient.refeicoes_por_dia || '--'} | Horário de sono: ${patient.horario_acorda || '--'} às ${patient.horario_dorme || '--'}
- Objetivos Clínicos: ${objetivosStr}
- Detalhe do Objetivo: ${patient.objetivo_texto || 'Não informado'}
- Patologias/Doenças: ${patologiasStr}
- Restrições Alimentares: ${restricoesStr}
- Alergias: ${alergiasStr}
- Medicamentos de Uso Contínuo: ${patient.medicamentos || 'Nenhum'}
- Suplementos: ${patient.suplementos || 'Nenhum'}
- Observações da Anamnese: ${patient.observacoes || 'Nenhuma'}

${consultasTexto}

Instruções para o diagnóstico:
1. Escreva em Português do Brasil de forma clara, profissional e acolhedora.
2. Divida o text obrigatoriamente usando os seguintes títulos em Markdown:
   - ## Resumo Clínico do Paciente
   - ## Análise de Composição & Evolução Corporal
   - ## Alertas e Mapeamento de Riscos
   - ## Diretrizes Alimentares Recomendadas
   - ## Plano de Ação Sugerido
3. Use tópicos claros e negrito para destacar informações essenciais.
4. Evite prescrever remédios ou dosagens de suplementos, limite-se a orientações nutricionais e de hábitos.
5. Escreva de maneira objetiva e que sirva como um apoio profissional ao nutricionista responsável.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Erro na API do Gemini: Código ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Nenhuma resposta gerada pela IA.');
      }

      setDiagnosis(text);
      localStorage.setItem(`diagnosis_${id}`, text);

    } catch (err: any) {
      console.error('Erro na geração do diagnóstico por IA:', err);
      setErrorIa(err.message || 'Erro inesperado ao gerar análise da IA.');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    async function loadPatientDetails() {
      if (!id || !user) return;
      try {
        setLoading(true);
        setError(null);

        // 1. Puxar nutricionista para segurança complementar
        const { data: profileData, error: profileError } = await supabase
          .from('nutricionistas')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        // 2. Carregar paciente e suas consultas associadas
        const { data: patientData, error: patientError } = await supabase
          .from('pacientes')
          .select('*, consultas(*)')
          .eq('id', id)
          .eq('nutricionista_id', profileData.id)
          .single();

        if (patientError) {
          throw new Error('Paciente não encontrado ou acesso não autorizado.');
        }

        setPatient(patientData);
        
        // Carrega consultas ordenadas por data descendente (mais recentes primeiro)
        if (patientData && patientData.consultas) {
          const sorted = (patientData.consultas as Tables<'consultas'>[]).sort((a, b) => {
            return new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime();
          });
          setConsultas(sorted);
        }
      } catch (err: any) {
        console.error('Erro ao buscar detalhes do paciente:', err);
        setError(err.message || 'Erro ao carregar dados do paciente.');
      } finally {
        setLoading(false);
      }
    }
    loadPatientDetails();
  }, [id, user]);

  // A primeira consulta do paciente no tempo (a última da lista se a lista for decrescente)
  const primeiraConsulta = consultas.length > 0 ? consultas[consultas.length - 1] : null;
  const ultimaConsulta = consultas.length > 0 ? consultas[0] : null;

  const calcularVariacaoGeral = () => {
    if (!patient) return { peso: 0, gordura: 0, cintura: 0 };
    
    // Peso inicial do cadastro ou da primeira consulta registrada
    const pesoInicial = patient.peso_inicial || primeiraConsulta?.peso || 0;
    const pesoAtual = ultimaConsulta?.peso || pesoInicial;
    const varPeso = pesoInicial && pesoAtual ? pesoAtual - pesoInicial : 0;

    // Percentual de gordura
    const gorduraInicial = primeiraConsulta?.percentual_gordura || 0;
    const gorduraAtual = ultimaConsulta?.percentual_gordura || 0;
    const varGordura = gorduraInicial && gorduraAtual ? gorduraAtual - gorduraInicial : 0;

    // Cintura
    const cinturaInicial = primeiraConsulta?.cintura || 0;
    const cinturaAtual = ultimaConsulta?.cintura || 0;
    const varCintura = cinturaInicial && cinturaAtual ? cinturaAtual - cinturaInicial : 0;

    return {
      peso: varPeso,
      gordura: varGordura,
      cintura: varCintura
    };
  };

  const variacaoGeral = calcularVariacaoGeral();

  const obterVariacaoMedida = (valorAtual: number | null, valorAnterior: number | null, unidade: string) => {
    if (valorAtual === null || valorAnterior === null) return null;
    const diferenca = valorAtual - valorAnterior;
    if (diferenca === 0) {
      return <span className="growth-badge neutral">0.0</span>;
    }
    const sinal = diferenca > 0 ? '+' : '';
    // Peso, gordura, cintura, quadril: redução costuma ser positivo (bom = verde) na maioria dos casos
    const isReducao = diferenca < 0;
    return (
      <span className={`growth-badge ${isReducao ? 'good' : 'bad'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        {isReducao ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
        {sinal}{diferenca.toFixed(1)}{unidade}
      </span>
    );
  };

  const calcularIMCPontual = (peso: number | null, altura: number | null) => {
    if (!peso || !altura) return '--';
    return (peso / (altura * altura)).toFixed(1);
  };

  // Função para calcular a idade
  const calcularIdade = (dataNascStr: string | null) => {
    if (!dataNascStr) return 'Não informada';
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
      return 'Não informada';
    }
  };

  // Função para formatar data brasileira (DD/MM/YYYY)
  const formatarDataBR = (dateStr: string | null) => {
    if (!dateStr) return 'Não informada';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Calcular IMC e Classificação
  const calcularIMC = (peso: number | null, altura: number | null) => {
    if (!peso || !altura) return null;
    const imc = peso / (altura * altura);
    
    let classificacao = 'Normal';
    let badgeClass = 'imc-normal';

    if (imc < 18.5) {
      classificacao = 'Abaixo do peso';
      badgeClass = 'imc-alert';
    } else if (imc >= 25 && imc < 30) {
      classificacao = 'Sobrepeso';
      badgeClass = 'imc-alert';
    } else if (imc >= 30) {
      classificacao = 'Obesidade';
      badgeClass = 'imc-danger';
    }

    return {
      valor: imc.toFixed(1),
      classificacao,
      badgeClass
    };
  };

  // Link formatado para WhatsApp Web
  const linkWhatsApp = (whatsStr: string | null) => {
    if (!whatsStr) return '#';
    const apenasNumeros = whatsStr.replace(/\D/g, '');
    const prefixo = apenasNumeros.startsWith('55') ? '' : '55';
    return `https://wa.me/${prefixo}${apenasNumeros}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" color="var(--primary-color)" size={40} />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div className="error-box" style={{ justifyContent: 'center', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
          <span>{error || 'Não foi possível carregar as informações do paciente.'}</span>
        </div>
        <button onClick={() => navigate('/pacientes')} className="btn-secondary">
          Voltar para Lista
        </button>
      </div>
    );
  }

  const imcResult = calcularIMC(patient.peso_inicial, patient.altura);
  const iniciais = patient.nome
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      
      {/* Botão Voltar */}
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
          marginBottom: '24px'
        }}
      >
        <ArrowLeft size={16} />
        Voltar para Pacientes
      </button>

      {/* Grid Principal */}
      <div className="patient-details-grid">
        
        {/* Painel Esquerdo - Sidebar com dados do paciente */}
        <aside className="patient-sidebar-card">
          <div className="patient-large-avatar">
            {iniciais}
          </div>
          <h2 className="patient-sidebar-name">{patient.nome}</h2>
          <p className="patient-sidebar-subtext">
            Paciente desde {formatarDataBR(patient.created_at ? patient.created_at.split('T')[0] : null)}
          </p>

          <div className="sidebar-stats-row">
            <div className="sidebar-stat-item">
              <span className="sidebar-stat-label">Peso Inicial</span>
              <span className="sidebar-stat-value">{patient.peso_inicial ? `${patient.peso_inicial} kg` : '--'}</span>
            </div>
            <div className="sidebar-stat-item">
              <span className="sidebar-stat-label">Altura</span>
              <span className="sidebar-stat-value">{patient.altura ? `${patient.altura} m` : '--'}</span>
            </div>
          </div>

          <div className="patient-contact-list">
            {patient.whatsapp && (
              <a 
                href={linkWhatsApp(patient.whatsapp)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="contact-item"
              >
                <Phone size={16} color="var(--primary-color)" />
                <span>{patient.whatsapp} (WhatsApp)</span>
              </a>
            )}
            {patient.telefone && (
              <div className="contact-item" style={{ color: 'var(--text-secondary)' }}>
                <Phone size={16} color="var(--primary-color)" style={{ opacity: 0.7 }} />
                <span>{patient.telefone} (Telefone)</span>
              </div>
            )}
            {patient.email && (
              <a href={`mailto:${patient.email}`} className="contact-item">
                <Mail size={16} color="var(--primary-color)" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{patient.email}</span>
              </a>
            )}
          </div>

          <button
            onClick={() => navigate(`/pacientes/${id}/editar`)}
            className="btn-secondary"
            style={{ 
              marginTop: '24px', 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              fontSize: '0.9rem',
              padding: '10px'
            }}
          >
            <Edit size={16} />
            Editar Perfil
          </button>
        </aside>

        {/* Painel Direito - Abas de conteúdo */}
        <main>
          <div className="details-tabs-header">
            <button 
              onClick={() => setActiveTab('clinico')}
              className={`details-tab-btn ${activeTab === 'clinico' ? 'active' : ''}`}
            >
              Ficha Clínica & Anamnese
            </button>
            <button 
              onClick={() => setActiveTab('consultas')}
              className={`details-tab-btn ${activeTab === 'consultas' ? 'active' : ''}`}
            >
              Consultas & Evolução
            </button>
            <button 
              onClick={() => setActiveTab('plano')}
              className={`details-tab-btn ${activeTab === 'plano' ? 'active' : ''}`}
            >
              Plano Alimentar
            </button>
            <button 
              onClick={() => setActiveTab('ia')}
              className={`details-tab-btn ${activeTab === 'ia' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={16} />
              Assistente de IA
            </button>
          </div>

          {/* ABA 1: FICHA CLÍNICA & ANAMNESE */}
          {activeTab === 'clinico' && (
            <div className="info-cards-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Card Dados Gerais */}
              <div className="info-block-card">
                <h3 className="info-block-title">
                  <User size={18} color="var(--primary-color)" />
                  Informações Gerais
                </h3>
                <div className="info-data-list">
                  <div className="info-data-item">
                    <span className="info-data-label">Idade</span>
                    <span className="info-data-value">{calcularIdade(patient.data_nascimento)}</span>
                  </div>
                  <div className="info-data-item">
                    <span className="info-data-label">Data de Nascimento</span>
                    <span className="info-data-value">{formatarDataBR(patient.data_nascimento)}</span>
                  </div>
                  <div className="info-data-item">
                    <span className="info-data-label">Sexo</span>
                    <span className="info-data-value">{patient.sexo || 'Não informado'}</span>
                  </div>
                  {imcResult && (
                    <div className="info-data-item" style={{ alignItems: 'center' }}>
                      <span className="info-data-label">IMC Inicial</span>
                      <span className={`imc-badge ${imcResult.badgeClass}`}>
                        {imcResult.valor} ({imcResult.classificacao})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Estilo de Vida */}
              <div className="info-block-card">
                <h3 className="info-block-title">
                  <Activity size={18} color="var(--primary-color)" />
                  Hábitos & Estilo de Vida
                </h3>
                <div className="info-data-list">
                  <div className="info-data-item">
                    <span className="info-data-label">Atividade Física</span>
                    <span className="info-data-value">{patient.atividade_fisica ? 'Pratica' : 'Sedentário'}</span>
                  </div>
                  {patient.atividade_fisica && patient.atividade_fisica_descricao && (
                    <div className="info-data-item" style={{ flexDirection: 'column', gap: '4px' }}>
                      <span className="info-data-label" style={{ textAlign: 'left' }}>Atividades Praticadas</span>
                      <span className="info-data-value" style={{ textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {patient.atividade_fisica_descricao}
                      </span>
                    </div>
                  )}
                  <div className="info-data-item">
                    <span className="info-data-label">Nível de Movimento</span>
                    <span className="info-data-value">{patient.nivel_atividade || 'Não informado'}</span>
                  </div>
                  <div className="info-data-item">
                    <span className="info-data-label">Consumo de Água</span>
                    <span className="info-data-value">{patient.litros_agua ? `${patient.litros_agua}L / dia` : 'Não informado'}</span>
                  </div>
                  <div className="info-data-item">
                    <span className="info-data-label">Refeições / dia</span>
                    <span className="info-data-value">{patient.refeicoes_por_dia || '--'} refeições</span>
                  </div>
                  <div className="info-data-item">
                    <span className="info-data-label">Sono</span>
                    <span className="info-data-value">
                      {patient.horario_acorda || '--'} às {patient.horario_dorme || '--'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Objetivos do Paciente (Ocupa largura total) */}
              <div className="info-block-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="info-block-title">
                  <Award size={18} color="var(--primary-color)" />
                  Objetivos Clínicos & Metas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {patient.objetivos && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(patient.objetivos as string[]).map(obj => (
                        <span key={obj} className="tag-badge primary" style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px' }}>
                          {obj}
                        </span>
                      ))}
                    </div>
                  )}
                  {patient.objetivo_texto ? (
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {patient.objetivo_texto}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum detalhe específico do objetivo informado.</p>
                  )}
                </div>
              </div>

              {/* Card Histórico Clínico */}
              <div className="info-block-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="info-block-title">
                  <Heart size={18} color="var(--primary-color)" />
                  Ficha Médica & Restrições
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Patologias */}
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Patologias e Doenças Diagnósticas
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {patient.patologias && (patient.patologias as string[]).length > 0 ? (
                        (patient.patologias as string[]).map(pat => (
                          <span key={pat} className="tag-badge" style={{ backgroundColor: '#fee2e2', color: 'var(--error-color)', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}>
                            {pat}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhuma patologia relatada.</span>
                      )}
                    </div>
                  </div>

                  {/* Restrições Alimentares */}
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Restrições & Preferências Alimentares
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {patient.restricoes_alimentares && (patient.restricoes_alimentares as string[]).length > 0 ? (
                        (patient.restricoes_alimentares as string[]).map(res => (
                          <span key={res} className="tag-badge" style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}>
                            {res}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhuma restrição alimentar informada.</span>
                      )}
                    </div>
                  </div>

                  {/* Alergias */}
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      Alergias Alimentares
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {patient.alergias && (patient.alergias as string[]).length > 0 ? (
                        (patient.alergias as string[]).map(ale => (
                          <span key={ale} className="tag-badge" style={{ backgroundColor: '#ffedd5', color: '#c2410c', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}>
                            {ale}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhuma alergia alimentar informada.</span>
                      )}
                    </div>
                  </div>

                  {/* Medicamentos e Suplementos */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Medicamentos de Uso Contínuo
                      </span>
                      <p style={{ fontSize: '0.9rem', color: patient.medicamentos ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {patient.medicamentos || 'Nenhum medicamento relatado.'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Suplementação Utilizada
                      </span>
                      <p style={{ fontSize: '0.9rem', color: patient.suplementos ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {patient.suplementos || 'Nenhum suplemento relatado.'}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Card Observações Anamnese */}
              <div className="info-block-card" style={{ gridColumn: 'span 2' }}>
                <h3 className="info-block-title">
                  <ShieldAlert size={18} color="var(--primary-color)" />
                  Notas Finais da Anamnese
                </h3>
                {patient.observacoes ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                    {patient.observacoes}
                  </p>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma anotação adicional registrada.</p>
                )}
              </div>

            </div>
          )}

          {/* ABA 2: CONSULTAS & EVOLUÇÃO */}
          {activeTab === 'consultas' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Header da Aba */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>
                    Acompanhamento & Evolução Física
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                    Histórico de medidas corporais e anotações de evolução do paciente.
                  </p>
                </div>
                <button 
                  onClick={() => navigate(`/pacientes/${id}/consultas/cadastro`)}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} />
                  Registrar Consulta
                </button>
              </div>

              {consultas.length > 0 ? (
                <>
                  {/* Row de Resumo de Progresso Acumulado */}
                  <div className="progress-cards-row">
                    <div className="progress-summary-card">
                      <span className="progress-summary-label">Variação Total de Peso</span>
                      <span className="progress-summary-value" style={{ color: variacaoGeral.peso < 0 ? 'var(--primary-color)' : variacaoGeral.peso > 0 ? 'var(--error-color)' : 'var(--text-primary)' }}>
                        {variacaoGeral.peso === 0 ? '0.0 kg' : `${variacaoGeral.peso > 0 ? '+' : ''}${variacaoGeral.peso.toFixed(1)} kg`}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Comparado ao peso inicial de cadastro
                      </span>
                    </div>

                    <div className="progress-summary-card">
                      <span className="progress-summary-label">Variação de Gordura</span>
                      <span className="progress-summary-value" style={{ color: variacaoGeral.gordura < 0 ? 'var(--primary-color)' : variacaoGeral.gordura > 0 ? 'var(--error-color)' : 'var(--text-primary)' }}>
                        {variacaoGeral.gordura === 0 ? '0.0 %' : `${variacaoGeral.gordura > 0 ? '+' : ''}${variacaoGeral.gordura.toFixed(1)}%`}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Diferença entre primeira e última consulta
                      </span>
                    </div>

                    <div className="progress-summary-card">
                      <span className="progress-summary-label">Variação de Cintura</span>
                      <span className="progress-summary-value" style={{ color: variacaoGeral.cintura < 0 ? 'var(--primary-color)' : variacaoGeral.cintura > 0 ? 'var(--error-color)' : 'var(--text-primary)' }}>
                        {variacaoGeral.cintura === 0 ? '0.0 cm' : `${variacaoGeral.cintura > 0 ? '+' : ''}${variacaoGeral.cintura.toFixed(1)} cm`}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Diferença entre primeira e última consulta
                      </span>
                    </div>
                  </div>

                  {/* Tabela de Evolução */}
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '16px', fontSize: '1.05rem' }}>
                      Tabela Comparativa de Medidas
                    </h4>
                    <div className="evolution-table-wrapper">
                      <table className="evolution-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Peso</th>
                            <th>% Gordura</th>
                            <th>Cintura</th>
                            <th>Quadril</th>
                            <th>IMC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consultas.map((cons, index) => {
                            // Encontrar a consulta cronologicamente anterior no array (index + 1)
                            const consultaAnterior = index < consultas.length - 1 ? consultas[index + 1] : null;
                            
                            // Se for a última (primeira registrada), compara com o cadastro inicial do paciente
                            const pesoAnterior = consultaAnterior ? consultaAnterior.peso : patient.peso_inicial;
                            const gorduraAnterior = consultaAnterior ? consultaAnterior.percentual_gordura : null;
                            const cinturaAnterior = consultaAnterior ? consultaAnterior.cintura : null;
                            const quadrilAnterior = consultaAnterior ? consultaAnterior.quadril : null;

                            return (
                              <tr key={cons.id}>
                                <td style={{ color: 'var(--primary-color)', fontWeight: 700 }}>
                                  {formatarDataBR(cons.data_consulta)}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{cons.peso ? `${cons.peso} kg` : '--'}</span>
                                    {obterVariacaoMedida(cons.peso, pesoAnterior, 'kg')}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{cons.percentual_gordura ? `${cons.percentual_gordura}%` : '--'}</span>
                                    {obterVariacaoMedida(cons.percentual_gordura, gorduraAnterior, '%')}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{cons.cintura ? `${cons.cintura} cm` : '--'}</span>
                                    {obterVariacaoMedida(cons.cintura, cinturaAnterior, 'cm')}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{cons.quadril ? `${cons.quadril} cm` : '--'}</span>
                                    {obterVariacaoMedida(cons.quadril, quadrilAnterior, 'cm')}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 700 }}>
                                    {calcularIMCPontual(cons.peso, patient.altura)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Timeline das Consultas */}
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '20px', fontSize: '1.05rem' }}>
                      Linha do Tempo de Acompanhamento
                    </h4>
                    <div className="timeline-container">
                      {consultas.map((cons) => (
                        <div key={cons.id} className="timeline-item">
                          <div className="timeline-badge">
                            <Calendar size={14} />
                          </div>
                          <div className="timeline-panel">
                            <div className="timeline-header">
                              <span className="timeline-date">{formatarDataBR(cons.data_consulta)}</span>
                              {cons.proximo_retorno && (
                                <span className="timeline-days-badge">
                                  Próximo Retorno: {formatarDataBR(cons.proximo_retorno)}
                                </span>
                              )}
                            </div>
                            <div className="timeline-body">
                              {cons.observacoes ? (
                                <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{cons.observacoes}</p>
                              ) : (
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma observação clínica registrada.</p>
                              )}
                            </div>
                            
                            {/* Resumo das Medidas no Card */}
                            {(cons.peso || cons.percentual_gordura || cons.cintura || cons.quadril) && (
                              <div className="timeline-metrics-summary">
                                {cons.peso && <span className="metric-summary-tag">Peso: {cons.peso} kg</span>}
                                {cons.percentual_gordura && <span className="metric-summary-tag">Gordura: {cons.percentual_gordura}%</span>}
                                {cons.cintura && <span className="metric-summary-tag">Cintura: {cons.cintura} cm</span>}
                                {cons.quadril && <span className="metric-summary-tag">Quadril: {cons.quadril} cm</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Estado Vazio de Consultas */
                <div className="info-block-card" style={{ padding: '60px 40px', textAlign: 'center', backgroundColor: '#f9fafb' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    backgroundColor: 'var(--primary-light)', 
                    color: 'var(--primary-color)', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 20px auto'
                  }}>
                    <Clock size={32} />
                  </div>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Nenhuma consulta registrada</h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 24px auto', fontSize: '0.95rem' }}>
                    Este paciente ainda não possui consultas ou avaliações físicas registradas. Adicione a primeira consulta para iniciar a linha do tempo de evolução física.
                  </p>
                  <button 
                    onClick={() => navigate(`/pacientes/${id}/consultas/cadastro`)}
                    className="btn-primary" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={16} />
                    Registrar Primeira Consulta
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ABA 3: PLANO ALIMENTAR (Placeholder) */}
          {activeTab === 'plano' && (
            <div className="info-block-card animate-fade-in" style={{ padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                backgroundColor: 'var(--primary-light)', 
                color: 'var(--primary-color)', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 20px auto'
              }}>
                <Apple size={32} />
              </div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Plano Alimentar Prescrito</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px auto', fontSize: '0.95rem' }}>
                O módulo de prescrição de dietas e planos alimentares personalizados estará disponível em breve.
              </p>
              <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.6, cursor: 'not-allowed' }} disabled>
                <Sparkles size={16} />
                Montar Plano Alimentar
              </button>
            </div>
          )}

          {/* ABA 4: ASSISTENTE DE IA */}
          {activeTab === 'ia' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="ia-assistant-card">
                <div className="ia-title-section">
                  <div className="ia-glow-icon">
                    <Sparkles size={22} />
                  </div>
                  <h3>Assistente de Diagnóstico Clínico</h3>
                </div>
                
                <p className="ia-card-description">
                  Esta inteligência artificial analisa todos os dados da ficha clínica, anamnese e histórico de evolução do paciente para gerar um diagnóstico preliminar estruturado, avaliar hábitos, mapear riscos de saúde e recomendar diretrizes alimentares de apoio.
                </p>

                {/* Bloco de Chave de API */}
                {!import.meta.env.VITE_GEMINI_API_KEY && (
                  <div className="ia-api-key-container">
                    <h4 className="ia-api-key-header">Chave de API do Gemini</h4>
                    <p className="ia-api-key-help">
                      Para utilizar o assistente de IA, é necessário configurar a sua chave de API do Gemini. 
                      A chave será guardada localmente de forma segura apenas no seu navegador. 
                      Você pode obter uma chave de forma 100% gratuita no{' '}
                      <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">
                        Google AI Studio
                      </a>.
                    </p>
                    
                    <form onSubmit={salvarApiKey} className="ia-input-wrapper">
                      <input 
                        type="password"
                        placeholder={apiKey ? "Chave de API configurada. Cole uma nova chave se quiser alterar..." : "Insira sua API Key do Gemini aqui..."}
                        value={tempKey}
                        onChange={(e) => setTempKey(e.target.value)}
                        className="ia-input-key"
                      />
                      <button type="submit" className="ia-btn-key-save" disabled={!tempKey}>
                        Salvar Chave
                      </button>
                      {apiKey && (
                        <button type="button" onClick={removerApiKey} className="ia-btn-key-remove">
                          Excluir
                        </button>
                      )}
                    </form>
                  </div>
                )}

                {/* Estado sem API Key */}
                {!apiKey && !import.meta.env.VITE_GEMINI_API_KEY ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Por favor, insira e salve sua Chave de API acima para ativar a geração do diagnóstico.
                  </div>
                ) : (
                  /* Estado de API Key configurada */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <button 
                        onClick={gerarDiagnostico} 
                        className="btn-primary" 
                        disabled={generating}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        {generating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        {diagnosis ? 'Refazer Diagnóstico com IA' : 'Gerar Diagnóstico Clínico'}
                      </button>
                      {import.meta.env.VITE_GEMINI_API_KEY && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 600 }}>
                          ✓ Conectado via Configuração do Sistema (.env)
                        </span>
                      )}
                      {!import.meta.env.VITE_GEMINI_API_KEY && apiKey && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 600 }}>
                          ✓ Conectado via Chave Salva no Navegador
                        </span>
                      )}
                    </div>

                    {errorIa && (
                      <div className="error-box" style={{ marginTop: '10px' }}>
                        <span>{errorIa}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Loader durante a geração */}
                {generating && (
                  <div className="ia-loading-container animate-fade-in">
                    <div className="ia-pulse-circle">
                      <Sparkles size={32} className="animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <div className="ia-loading-text">Analisando Anamnese e Prontuários...</div>
                    <div className="ia-loading-subtext">
                      Nosso assistente está cruzando dados corporais, patologias e hábitos para estruturar as diretrizes. Isso pode levar alguns segundos.
                    </div>
                  </div>
                )}

                {/* Exibição da resposta */}
                {!generating && diagnosis && (
                  <div className="ia-response-card animate-fade-in">
                    <div className="ia-response-actions">
                      <button onClick={copiarDiagnostico} className="btn-secondary">
                        Copiar Relatório
                      </button>
                    </div>
                    <div className="diagnosis-markdown">
                      {renderMarkdown(diagnosis)}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </main>

      </div>

    </div>
  );
};

export default DetalhesPaciente;
