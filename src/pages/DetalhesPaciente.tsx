import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PlanoAlimentar from '../components/PlanoAlimentar';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Clock, 
  Plus, 
  Loader2, 
  Sparkles,
  TrendingDown,
  TrendingUp,
  Save,
  Check,
  X
} from 'lucide-react';
import type { Tables } from '../types/database.types';

type DetailTabType = 'clinico' | 'consultas' | 'plano' | 'ia';
type SubTabType = 'pessoal' | 'clinico' | 'habitos';

const OBJETIVOS_OPCOES = ['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance esportiva', 'Reeducação alimentar'];
const NIVEL_ATIVIDADE_OPCOES = ['Sedentário', 'Levemente ativo', 'Moderadamente ativo', 'Muito ativo', 'Extremamente ativo'];
const PATOLOGIAS_OPCOES = ['Nenhum', 'Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'];
const RESTRICOES_OPCOES = ['Nenhum', 'Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'];
const ALERGIAS_OPCOES = ['Nenhum', 'Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'];

const DetalhesPaciente: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initialTab = (location.state as { tab?: DetailTabType })?.tab || 'clinico';

  const [patient, setPatient] = useState<Tables<'pacientes'> | null>(null);
  const [consultas, setConsultas] = useState<Tables<'consultas'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTabType>(initialTab);
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('pessoal');

  // Estados para Edição Inline (Ficha Clínica)
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [pesoInicial, setPesoInicial] = useState('');
  const [altura, setAltura] = useState(''); // cm no input
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [objetivoTexto, setObjetivoTexto] = useState('');
  const [nivelAtividade, setNivelAtividade] = useState('');
  const [patologias, setPatologias] = useState<string[]>([]);
  const [restricoesAlimentares, setRestricoesAlimentares] = useState<string[]>([]);
  const [alergias, setAlergias] = useState<string[]>([]);
  const [medicamentos, setMedicamentos] = useState('');
  const [suplementos, setSuplementos] = useState('');
  const [refeicoesPorDia, setRefeicoesPorDia] = useState('');
  const [horarioAcorda, setHorarioAcorda] = useState('');
  const [horarioDorme, setHorarioDorme] = useState('');
  const [litrosAgua, setLitrosAgua] = useState('');
  const [atividadeFisica, setAtividadeFisica] = useState(false);
  const [atividadeFisicaDescricao, setAtividadeFisicaDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [salvandoDados, setSalvandoDados] = useState(false);
  const [sucessoDados, setSucessoDados] = useState(false);

  // Estados para o Modal de Nova Consulta
  const [showModalConsulta, setShowModalConsulta] = useState(false);
  const [dataConsulta, setDataConsulta] = useState(() => new Date().toISOString().split('T')[0]);
  const [pesoConsulta, setPesoConsulta] = useState('');
  const [cinturaConsulta, setCinturaConsulta] = useState('');
  const [quadrilConsulta, setQuadrilConsulta] = useState('');
  const [gorduraConsulta, setGorduraConsulta] = useState('');
  const [obsConsulta, setObsConsulta] = useState('');
  const [retornoConsulta, setRetornoConsulta] = useState('');
  const [salvandoConsulta, setSalvandoConsulta] = useState(false);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);

  // Estados do Assistente de IA
  const [diagnosis, setDiagnosis] = useState<string | null>(() => localStorage.getItem(`diagnosis_${id}`) || null);
  const [generating, setGenerating] = useState(false);
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  const [tempKey, setTempKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');

  async function loadPatientDetails() {
    if (!id || !user) return;
    try {
      setLoading(true);
      setError(null);

      const { data: profileData, error: profileError } = await supabase
        .from('nutricionistas')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

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
      
      if (patientData) {
        setNome(patientData.nome || '');
        setDataNascimento(patientData.data_nascimento || '');
        setSexo(patientData.sexo || '');
        setTelefone(patientData.telefone || '');
        setWhatsapp(patientData.whatsapp || '');
        setEmail(patientData.email || '');
        setPesoInicial(patientData.peso_inicial ? String(patientData.peso_inicial) : '');
        setAltura(patientData.altura ? String(Math.round(patientData.altura * 100)) : '');
        setObjetivos(patientData.objetivos as string[] || []);
        setObjetivoTexto(patientData.objetivo_texto || '');
        setNivelAtividade(patientData.nivel_atividade || '');
        setPatologias(patientData.patologias as string[] || []);
        setRestricoesAlimentares(patientData.restricoes_alimentares as string[] || []);
        setAlergias(patientData.alergias as string[] || []);
        setMedicamentos(patientData.medicamentos || '');
        setSuplementos(patientData.suplementos || '');
        setRefeicoesPorDia(patientData.refeicoes_por_dia ? String(patientData.refeicoes_por_dia) : '4');
        setHorarioAcorda(patientData.horario_acorda || '');
        setHorarioDorme(patientData.horario_dorme || '');
        setLitrosAgua(patientData.litros_agua ? String(patientData.litros_agua) : '');
        setAtividadeFisica(patientData.atividade_fisica || false);
        setAtividadeFisicaDescricao(patientData.atividade_fisica_descricao || '');
        setObservacoes(patientData.observacoes || '');
      }

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

  useEffect(() => {
    loadPatientDetails();
  }, [id, user]);

  const handleSalvarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !patient) return;
    try {
      setSalvandoDados(true);
      setError(null);

      const alturaMetros = altura ? parseFloat(altura) / 100 : null;

      const payload = {
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

      const { error: dbError } = await supabase
        .from('pacientes')
        .update(payload)
        .eq('id', id);

      if (dbError) throw dbError;

      setSucessoDados(true);
      setTimeout(() => setSucessoDados(false), 3000);
      loadPatientDetails();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao salvar alterações na ficha do paciente.');
    } finally {
      setSalvandoDados(false);
    }
  };

  const handleSalvarConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !patient) return;
    if (!pesoConsulta) {
      setErroConsulta('O peso é obrigatório.');
      return;
    }

    try {
      setSalvandoConsulta(true);
      setErroConsulta(null);

      const payload = {
        paciente_id: id,
        data_consulta: dataConsulta,
        peso: parseFloat(pesoConsulta),
        cintura: cinturaConsulta ? parseFloat(cinturaConsulta) : null,
        quadril: quadrilConsulta ? parseFloat(quadrilConsulta) : null,
        percentual_gordura: gorduraConsulta ? parseFloat(gorduraConsulta) : null,
        observacoes: obsConsulta || null,
        proximo_retorno: retornoConsulta || null
      };

      const { error: dbError } = await supabase
        .from('consultas')
        .insert(payload);

      if (dbError) throw dbError;

      setShowModalConsulta(false);
      // Reset formulário
      setPesoConsulta('');
      setCinturaConsulta('');
      setQuadrilConsulta('');
      setGorduraConsulta('');
      setObsConsulta('');
      setRetornoConsulta('');
      setDataConsulta(new Date().toISOString().split('T')[0]);

      loadPatientDetails();
    } catch (err: any) {
      console.error(err);
      setErroConsulta('Erro ao registrar consulta no banco de dados.');
    } finally {
      setSalvandoConsulta(false);
    }
  };

  const toggleSelection = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (item === 'Nenhum') {
      setList(list.includes('Nenhum') ? [] : ['Nenhum']);
    } else {
      let newList = list.filter(i => i !== 'Nenhum');
      newList = newList.includes(item) ? newList.filter(i => i !== item) : [...newList, item];
      setList(newList);
    }
  };

  const primeiraConsulta = consultas.length > 0 ? consultas[consultas.length - 1] : null;
  const ultimaConsulta = consultas.length > 0 ? consultas[0] : null;

  const variacaoGeral = () => {
    if (!patient) return { peso: 0, gordura: 0, cintura: 0 };
    const pesoIni = patient.peso_inicial || primeiraConsulta?.peso || 0;
    const pesoAtu = ultimaConsulta?.peso || pesoIni;
    const gorduraIni = primeiraConsulta?.percentual_gordura || 0;
    const gorduraAtu = ultimaConsulta?.percentual_gordura || 0;
    const cinturaIni = primeiraConsulta?.cintura || 0;
    const cinturaAtu = ultimaConsulta?.cintura || 0;

    return {
      peso: pesoIni && pesoAtu ? pesoAtu - pesoIni : 0,
      gordura: gorduraIni && gorduraAtu ? gorduraAtu - gorduraIni : 0,
      cintura: cinturaIni && cinturaAtu ? cinturaAtu - cinturaIni : 0
    };
  };

  const obterVariacaoMedida = (valorAtual: number | null, valorAnterior: number | null, unidade: string) => {
    if (valorAtual === null || valorAnterior === null) return null;
    const diferenca = valorAtual - valorAnterior;
    if (diferenca === 0) return <span className="growth-badge neutral">0.0</span>;
    const isReducao = diferenca < 0;
    return (
      <span className={`growth-badge ${isReducao ? 'good' : 'bad'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        {isReducao ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
        {diferenca > 0 ? '+' : ''}{diferenca.toFixed(1)}{unidade}
      </span>
    );
  };

  const renderGraficoSVG = () => {
    if (!patient) return null;
    
    // Une peso inicial e consultas
    const pontos: { data: string; peso: number }[] = [];
    if (patient.peso_inicial) {
      pontos.push({
        data: formatarDataBR(patient.created_at ? patient.created_at.split('T')[0] : null),
        peso: patient.peso_inicial
      });
    }

    const consultasComPeso = [...consultas]
      .filter(c => c.peso !== null)
      .reverse(); // cronológico

    consultasComPeso.forEach(c => {
      pontos.push({
        data: formatarDataBR(c.data_consulta),
        peso: c.peso as number
      });
    });

    if (pontos.length < 2) {
      return (
        <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)' }}>
          <Clock size={28} style={{ marginBottom: '8px', color: 'var(--text-muted)' }} />
          <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>Nenhuma evolução registrada ainda</p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adicione mais de uma consulta para visualizar a curva de peso.</span>
        </div>
      );
    }

    const pesos = pontos.map(p => p.peso);
    const minPeso = Math.min(...pesos) - 2;
    const maxPeso = Math.max(...pesos) + 2;
    const rangePeso = maxPeso - minPeso || 1;

    const width = 500;
    const height = 150;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Converte ponto para coordenadas SVG
    const getCoords = (index: number, peso: number) => {
      const x = paddingLeft + (index / (pontos.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((peso - minPeso) / rangePeso) * chartHeight;
      return { x, y };
    };

    let pathD = '';
    let areaD = `M ${paddingLeft} ${height - paddingBottom}`;

    pontos.forEach((p, index) => {
      const { x, y } = getCoords(index, p.peso);
      if (index === 0) {
        pathD += `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }
      areaD += ` L ${x} ${y}`;
    });

    areaD += ` L ${getCoords(pontos.length - 1, pontos[pontos.length - 1].peso).x} ${height - paddingBottom} Z`;

    return (
      <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
        <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
          <TrendingDown size={18} color="var(--primary-color)" />
          Curva de Evolução de Peso
        </h4>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas de Grade Horizontal */}
            {[0, 0.5, 1].map((ratio, i) => {
              const y = paddingTop + ratio * chartHeight;
              const pesoVal = maxPeso - ratio * rangePeso;
              return (
                <g key={i}>
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3,3" />
                  <text x={paddingLeft - 8} y={y + 4} fill="var(--text-secondary)" fontSize="9" fontWeight="600" textAnchor="end">
                    {pesoVal.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Área Gradiente */}
            <path d={areaD} fill="url(#chartGrad)" />

            {/* Linha Principal */}
            <path d={pathD} fill="none" stroke="var(--primary-color)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Pontos */}
            {pontos.map((p, index) => {
              const { x, y } = getCoords(index, p.peso);
              return (
                <g key={index} className="chart-point-group">
                  <circle cx={x} cy={y} r="5" fill="white" stroke="var(--primary-color)" strokeWidth="3" />
                  <text x={x} y={y - 10} fill="var(--text-primary)" fontSize="9" fontWeight="bold" textAnchor="middle">
                    {p.peso} kg
                  </text>
                  <text x={x} y={height - 4} fill="var(--text-secondary)" fontSize="8" textAnchor="middle" fontWeight="500">
                    {p.data.split('/')[0]}/{p.data.split('/')[1]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

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
      alert('Diagnóstico copiado!');
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (trimmed === '') return null;
      if (trimmed.startsWith('## ')) {
        return <h2 key={index} style={{ color: 'var(--text-primary)', marginTop: '24px', fontSize: '1.25rem', fontWeight: 800 }}>{trimmed.replace('## ', '')}</h2>;
      }
      if (trimmed.startsWith('### ')) {
        return <h3 key={index} style={{ color: 'var(--text-primary)', marginTop: '16px', fontSize: '1.05rem', fontWeight: 700 }}>{trimmed.replace('### ', '')}</h3>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <ul key={index} style={{ margin: '0 0 8px 16px', color: 'var(--text-secondary)' }}>
            <li>{trimmed.substring(2)}</li>
          </ul>
        );
      }
      return <p key={index} style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.92rem', marginBottom: '8px' }}>{trimmed}</p>;
    });
  };

  const gerarDiagnostico = async () => {
    if (!patient || !apiKey) return;
    try {
      setGenerating(true);
      setErrorIa(null);

      const idadeVal = calcularIdade(patient.data_nascimento);
      const restricoesStr = restricoesAlimentares.join(', ') || 'Nenhuma';
      const patologiasStr = patologias.join(', ') || 'Nenhuma';
      const alergiasStr = alergias.join(', ') || 'Nenhuma';

      const prompt = `Você é um assistente de nutrição experiente. Analise os dados e elabore um diagnóstico nutricional estruturado em PT-BR:
      Paciente: ${patient.nome} | Idade: ${idadeVal} | Sexo: ${patient.sexo} | Altura: ${patient.altura} m
      Hábitos: Refeições/dia: ${refeicoesPorDia} | Água: ${litrosAgua} L/dia | Atividade física: ${atividadeFisica ? 'Sim' : 'Não'} (${atividadeFisicaDescricao})
      Clínico: Patologias: ${patologiasStr} | Restrições: ${restricoesStr} | Alergias: ${alergiasStr} | Medicamentos: ${medicamentos} | Suplementos: ${suplementos}
      Histórico de Peso: Inicial ${patient.peso_inicial} kg.
      
      Gere com os tópicos:
      ## Resumo Clínico do Paciente
      ## Análise de Composição & Evolução Corporal
      ## Alertas e Mapeamento de Riscos
      ## Diretrizes Alimentares Recomendadas
      ## Plano de Ação Sugerido`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error('Falha ao comunicar com API Gemini.');
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Resposta vazia da IA.');

      setDiagnosis(text);
      localStorage.setItem(`diagnosis_${id}`, text);
    } catch (err: any) {
      console.error(err);
      setErrorIa(err.message || 'Erro ao gerar análise.');
    } finally {
      setGenerating(false);
    }
  };

  const calcularIdade = (dataNascStr: string | null) => {
    if (!dataNascStr) return 'Não informada';
    const [year, month, day] = dataNascStr.split('-').map(Number);
    const nasc = new Date(year, month - 1, day);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return `${idade} anos`;
  };

  const formatarDataBR = (dateStr: string | null) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
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
      <div className="page-container" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <div className="error-box" style={{ padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
          <span>{error || 'Não foi possível carregar os dados.'}</span>
        </div>
        <button onClick={() => navigate('/pacientes')} className="btn-secondary">Voltar para Lista</button>
      </div>
    );
  }

  const iniciais = patient.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="page-container animate-fade-in">
      {/* Botão Voltar */}
      <button 
        onClick={() => navigate('/pacientes')} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', padding: 0, marginBottom: '24px' }}
      >
        <ArrowLeft size={16} />
        Voltar para Pacientes
      </button>

      {/* Grid Principal */}
      <div className="patient-details-grid">
        {/* Painel Esquerdo */}
        <aside className="patient-sidebar-card">
          <div className="patient-large-avatar">{iniciais}</div>
          <h2 className="patient-sidebar-name">{patient.nome}</h2>
          <p className="patient-sidebar-subtext">Paciente desde {formatarDataBR(patient.created_at ? patient.created_at.split('T')[0] : null)}</p>

          <div className="sidebar-stats-row">
            <div className="sidebar-stat-item">
              <span className="sidebar-stat-label">Peso Inicial</span>
              <span className="sidebar-stat-value">{patient.peso_inicial ? `${patient.peso_inicial} kg` : '--'}</span>
            </div>
            <div className="sidebar-stat-item">
              <span className="sidebar-stat-label">Altura</span>
              <span className="sidebar-stat-value">{patient.altura ? `${Math.round(patient.altura * 100)} cm` : '--'}</span>
            </div>
          </div>

          <div className="patient-contact-list">
            {patient.whatsapp && (
              <a href={`https://wa.me/${patient.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="contact-item">
                <Phone size={16} color="var(--primary-color)" />
                <span>{patient.whatsapp}</span>
              </a>
            )}
            {patient.email && (
              <a href={`mailto:${patient.email}`} className="contact-item">
                <Mail size={16} color="var(--primary-color)" />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{patient.email}</span>
              </a>
            )}
          </div>
        </aside>

        {/* Painel Direito */}
        <main>
          <div className="details-tabs-header">
            <button onClick={() => setActiveTab('clinico')} className={`details-tab-btn ${activeTab === 'clinico' ? 'active' : ''}`}>Dados do Paciente</button>
            <button onClick={() => setActiveTab('consultas')} className={`details-tab-btn ${activeTab === 'consultas' ? 'active' : ''}`}>Consultas & Evolução</button>
            <button onClick={() => setActiveTab('plano')} className={`details-tab-btn ${activeTab === 'plano' ? 'active' : ''}`}>Plano Alimentar</button>
            <button onClick={() => setActiveTab('ia')} className={`details-tab-btn ${activeTab === 'ia' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} /> Assistente de IA
            </button>
          </div>

          {/* ABA 1: DADOS DO PACIENTE (EDITÁVEL INLINE) */}
          {activeTab === 'clinico' && (
            <form onSubmit={handleSalvarPaciente} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sucessoDados && (
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                  <Check size={18} /> Alterações salvas com sucesso no Supabase!
                </div>
              )}

              {/* Sub-abas de Edição */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                {(['pessoal', 'clinico', 'habitos'] as SubTabType[]).map(tab => (
                  <button 
                    key={tab} 
                    type="button" 
                    onClick={() => setActiveSubTab(tab)} 
                    style={{ background: activeSubTab === tab ? 'var(--primary-color)' : 'none', color: activeSubTab === tab ? 'white' : 'var(--text-secondary)', border: 'none', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    {tab === 'pessoal' ? 'Pessoal' : tab === 'clinico' ? 'Clínico' : 'Hábitos'}
                  </button>
                ))}
              </div>

              <div className="info-block-card" style={{ padding: '24px' }}>
                {activeSubTab === 'pessoal' && (
                  <div className="form-grid">
                    <div className="form-group col-12">
                      <label>Nome Completo</label>
                      <input type="text" value={nome} onChange={e => setNome(e.target.value)} required />
                    </div>
                    <div className="form-group col-6">
                      <label>Data de Nascimento</label>
                      <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
                    </div>
                    <div className="form-group col-6">
                      <label>Sexo</label>
                      <select value={sexo} onChange={e => setSexo(e.target.value)}>
                        <option value="">Selecione...</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="form-group col-6">
                      <label>Telefone</label>
                      <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} />
                    </div>
                    <div className="form-group col-6">
                      <label>WhatsApp</label>
                      <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                    </div>
                    <div className="form-group col-12">
                      <label>E-mail</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>
                )}

                {activeSubTab === 'clinico' && (
                  <div className="form-grid">
                    <div className="form-group col-6">
                      <label>Peso Inicial (kg)</label>
                      <input type="number" step="0.1" value={pesoInicial} onChange={e => setPesoInicial(e.target.value)} />
                    </div>
                    <div className="form-group col-6">
                      <label>Altura (cm)</label>
                      <input type="number" value={altura} onChange={e => setAltura(e.target.value)} />
                    </div>
                    <div className="form-group col-12">
                      <label>Objetivos (Múltipla escolha)</label>
                      <div className="chips-container">
                        {OBJETIVOS_OPCOES.map(op => (
                          <div key={op} onClick={() => toggleSelection(op, objetivos, setObjetivos)} className={`chip-item ${objetivos.includes(op) ? 'selected' : ''}`}>{op}</div>
                        ))}
                      </div>
                    </div>
                    <div className="form-group col-12">
                      <label>Detalhamento do Objetivo</label>
                      <textarea value={objetivoTexto} onChange={e => setObjetivoTexto(e.target.value)} style={{ width: '100%', minHeight: '80px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                    </div>
                    <div className="form-group col-12">
                      <label>Nível de Atividade</label>
                      <select value={nivelAtividade} onChange={e => setNivelAtividade(e.target.value)}>
                        <option value="">Selecione...</option>
                        {NIVEL_ATIVIDADE_OPCOES.map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                    </div>
                    <div className="form-group col-12">
                      <label>Patologias</label>
                      <div className="chips-container">
                        {PATOLOGIAS_OPCOES.map(op => (
                          <div key={op} onClick={() => toggleSelection(op, patologias, setPatologias)} className={`chip-item ${patologias.includes(op) ? 'selected' : ''}`}>{op}</div>
                        ))}
                      </div>
                    </div>
                    <div className="form-group col-12">
                      <label>Restrições Alimentares</label>
                      <div className="chips-container">
                        {RESTRICOES_OPCOES.map(op => (
                          <div key={op} onClick={() => toggleSelection(op, restricoesAlimentares, setRestricoesAlimentares)} className={`chip-item ${restricoesAlimentares.includes(op) ? 'selected' : ''}`}>{op}</div>
                        ))}
                      </div>
                    </div>
                    <div className="form-group col-12">
                      <label>Alergias</label>
                      <div className="chips-container">
                        {ALERGIAS_OPCOES.map(op => (
                          <div key={op} onClick={() => toggleSelection(op, alergias, setAlergias)} className={`chip-item ${alergias.includes(op) ? 'selected' : ''}`}>{op}</div>
                        ))}
                      </div>
                    </div>
                    <div className="form-group col-6">
                      <label>Medicamentos</label>
                      <input type="text" value={medicamentos} onChange={e => setMedicamentos(e.target.value)} />
                    </div>
                    <div className="form-group col-6">
                      <label>Suplementos</label>
                      <input type="text" value={suplementos} onChange={e => setSuplementos(e.target.value)} />
                    </div>
                  </div>
                )}

                {activeSubTab === 'habitos' && (
                  <div className="form-grid">
                    <div className="form-group col-4">
                      <label>Refeições por dia</label>
                      <input type="number" value={refeicoesPorDia} onChange={e => setRefeicoesPorDia(e.target.value)} />
                    </div>
                    <div className="form-group col-4">
                      <label>Acorda às</label>
                      <input type="text" value={horarioAcorda} onChange={e => setHorarioAcorda(e.target.value)} />
                    </div>
                    <div className="form-group col-4">
                      <label>Dorme às</label>
                      <input type="text" value={horarioDorme} onChange={e => setHorarioDorme(e.target.value)} />
                    </div>
                    <div className="form-group col-6">
                      <label>Água por dia (Litros)</label>
                      <input type="number" step="0.1" value={litrosAgua} onChange={e => setLitrosAgua(e.target.value)} />
                    </div>
                    <div className="form-group col-6">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '30px', fontWeight: 600, cursor: 'pointer' }}>
                        <input type="checkbox" checked={atividadeFisica} onChange={e => setAtividadeFisica(e.target.checked)} />
                        Pratica Atividade Física
                      </label>
                    </div>
                    {atividadeFisica && (
                      <div className="form-group col-12">
                        <label>Quais atividades?</label>
                        <input type="text" value={atividadeFisicaDescricao} onChange={e => setAtividadeFisicaDescricao(e.target.value)} />
                      </div>
                    )}
                    <div className="form-group col-12">
                      <label>Anotações Clínicas / Observações</label>
                      <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} style={{ width: '100%', minHeight: '100px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={salvandoDados} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-end' }}>
                {salvandoDados ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Salvar Alterações
              </button>
            </form>
          )}

          {/* ABA 2: CONSULTAS & EVOLUÇÃO */}
          {activeTab === 'consultas' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>Consultas & Evolução Física</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Evolução de peso e histórico completo de avaliações clínicas.</p>
                </div>
                <button onClick={() => setShowModalConsulta(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} /> Nova Consulta
                </button>
              </div>

              {/* Gráfico de Evolução de Peso */}
              {renderGraficoSVG()}

              {consultas.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Cards de Resumo */}
                  <div className="progress-cards-row">
                    <div className="progress-summary-card">
                      <span className="progress-summary-label">Variação Total</span>
                      <span className="progress-summary-value" style={{ color: variacaoGeral().peso < 0 ? 'var(--primary-color)' : variacaoGeral().peso > 0 ? 'var(--error-color)' : 'var(--text-primary)' }}>
                        {variacaoGeral().peso === 0 ? '0.0 kg' : `${variacaoGeral().peso > 0 ? '+' : ''}${variacaoGeral().peso.toFixed(1)} kg`}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Desde o peso inicial cadastrado</span>
                    </div>
                    <div className="progress-summary-card">
                      <span className="progress-summary-label">Variação de Cintura</span>
                      <span className="progress-summary-value" style={{ color: variacaoGeral().cintura < 0 ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                        {variacaoGeral().cintura === 0 ? '0.0 cm' : `${variacaoGeral().cintura > 0 ? '+' : ''}${variacaoGeral().cintura.toFixed(1)} cm`}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Entre a primeira e última consulta</span>
                    </div>
                  </div>

                  {/* Tabela de Consultas */}
                  <div className="info-block-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="evolution-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Peso (kg)</th>
                            <th>Cintura (cm)</th>
                            <th>Quadril (cm)</th>
                            <th>% Gordura</th>
                            <th>Observações</th>
                            <th>Próximo Retorno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consultas.map((c, index) => {
                            const anterior = index < consultas.length - 1 ? consultas[index + 1] : null;
                            const pesoAnt = anterior ? anterior.peso : patient.peso_inicial;
                            const cintAnt = anterior ? anterior.cintura : null;
                            const quadAnt = anterior ? anterior.quadril : null;
                            const gorAnt = anterior ? anterior.percentual_gordura : null;

                            return (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{formatarDataBR(c.data_consulta)}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{c.peso || '--'}</span>
                                    {obterVariacaoMedida(c.peso, pesoAnt, 'kg')}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{c.cintura || '--'}</span>
                                    {obterVariacaoMedida(c.cintura, cintAnt, 'cm')}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{c.quadril || '--'}</span>
                                    {obterVariacaoMedida(c.quadril, quadAnt, 'cm')}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{c.percentual_gordura ? `${c.percentual_gordura}%` : '--'}</span>
                                    {obterVariacaoMedida(c.percentual_gordura, gorAnt, '%')}
                                  </div>
                                </td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.observacoes || '--'}</td>
                                <td style={{ fontWeight: 500 }}>{formatarDataBR(c.proximo_retorno)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 500 }}>Nenhuma consulta registrada ainda</p>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: PLANOS ALIMENTARES */}
          {activeTab === 'plano' && id && (
            <PlanoAlimentar pacienteId={id} />
          )}

          {/* ABA 4: ASSISTENTE DE IA */}
          {activeTab === 'ia' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="ia-assistant-card">
                <div className="ia-title-section">
                  <div className="ia-glow-icon"><Sparkles size={22} /></div>
                  <h3>Assistente de Diagnóstico Clínico</h3>
                </div>
                <p className="ia-card-description">Nossa Inteligência Artificial analisa anamnese, dados clínicos e evolução para criar diretrizes alimentares de suporte profissional.</p>

                {!import.meta.env.VITE_GEMINI_API_KEY && (
                  <div className="ia-api-key-container">
                    <h4 className="ia-api-key-header">Chave de API do Gemini</h4>
                    <form onSubmit={salvarApiKey} className="ia-input-wrapper">
                      <input type="password" placeholder={apiKey ? "Chave configurada..." : "Chave de API do Gemini..."} value={tempKey} onChange={e => setTempKey(e.target.value)} className="ia-input-key" />
                      <button type="submit" className="ia-btn-key-save" disabled={!tempKey}>Salvar</button>
                      {apiKey && <button type="button" onClick={removerApiKey} className="ia-btn-key-remove">Remover</button>}
                    </form>
                  </div>
                )}

                {apiKey ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <button onClick={gerarDiagnostico} className="btn-primary" disabled={generating} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
                      {generating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      {diagnosis ? 'Refazer Diagnóstico com IA' : 'Gerar Diagnóstico Clínico'}
                    </button>
                    {errorIa && <div className="error-box"><span>{errorIa}</span></div>}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure a sua chave de API para habilitar o assistente de IA.</p>
                )}

                {generating && (
                  <div className="ia-loading-container animate-fade-in">
                    <Sparkles size={32} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
                    <div className="ia-loading-text">Analisando Prontuários...</div>
                  </div>
                )}

                {!generating && diagnosis && (
                  <div className="ia-response-card animate-fade-in">
                    <button onClick={copiarDiagnostico} className="btn-secondary" style={{ alignSelf: 'flex-end', marginBottom: '12px' }}>Copiar Diagnóstico</button>
                    <div className="diagnosis-markdown">{renderMarkdown(diagnosis)}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE NOVA CONSULTA */}
      {showModalConsulta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} className="animate-fade-in">
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="var(--primary-color)" /> Registrar Nova Consulta
              </h3>
              <button onClick={() => setShowModalConsulta(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Form Modal */}
            <form onSubmit={handleSalvarConsulta} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {erroConsulta && <div className="error-box"><span>{erroConsulta}</span></div>}

              <div className="form-grid">
                <div className="form-group col-6">
                  <label>Data da Consulta *</label>
                  <input type="date" value={dataConsulta} onChange={e => setDataConsulta(e.target.value)} required />
                </div>
                <div className="form-group col-6">
                  <label>Peso Atual (kg) *</label>
                  <input type="number" step="0.1" value={pesoConsulta} placeholder="Ex: 72.5" onChange={e => setPesoConsulta(e.target.value)} required />
                </div>
                <div className="form-group col-4">
                  <label>Cintura (cm) - Opcional</label>
                  <input type="number" step="0.1" value={cinturaConsulta} placeholder="Ex: 80" onChange={e => setCinturaConsulta(e.target.value)} />
                </div>
                <div className="form-group col-4">
                  <label>Quadril (cm) - Opcional</label>
                  <input type="number" step="0.1" value={quadrilConsulta} placeholder="Ex: 95" onChange={e => setQuadrilConsulta(e.target.value)} />
                </div>
                <div className="form-group col-4">
                  <label>% de Gordura - Opcional</label>
                  <input type="number" step="0.1" value={gorduraConsulta} placeholder="Ex: 18.5" onChange={e => setGorduraConsulta(e.target.value)} />
                </div>
                <div className="form-group col-12">
                  <label>Próximo Retorno - Opcional</label>
                  <input type="date" value={retornoConsulta} onChange={e => setRetornoConsulta(e.target.value)} />
                </div>
                <div className="form-group col-12">
                  <label>Observações Clínicas</label>
                  <textarea value={obsConsulta} placeholder="Notas adicionais sobre a consulta, evolução do paciente, etc." onChange={e => setObsConsulta(e.target.value)} style={{ width: '100%', minHeight: '80px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowModalConsulta(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancelar</button>
                <button type="submit" disabled={salvandoConsulta} className="btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {salvandoConsulta ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Salvar Consulta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalhesPaciente;
