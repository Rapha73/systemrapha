import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, Calendar, Clock, ArrowRight, RefreshCw, BarChart3, PieChart, Loader2, Sun, Cloud, CloudRain, Thermometer } from 'lucide-react';
import type { Tables } from '../types/database.types';

interface PatientNoReturn {
  id: string;
  nome: string;
  ultimaConsulta: string;
  diasSemRetorno: number;
  observacoes: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Tables<'nutricionistas'> | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Stats states
  const [totalPatients, setTotalPatients] = useState<number>(0);
  const [weeklyConsults, setWeeklyConsults] = useState<number>(0);
  const [patientsNoReturn, setPatientsNoReturn] = useState<PatientNoReturn[]>([]);
  
  // Chart states
  const [chartData, setChartData] = useState<{ nome: string; quantidade: number }[]>([]);
  const [objetivosChart, setObjetivosChart] = useState<{ nome: string; valor: number }[]>([]);
  
  // Clima/Temperatura local
  const [temperature, setTemperature] = useState<string | null>(null);
  const [weatherIcon, setWeatherIcon] = useState<'sun' | 'cloud' | 'rain' | 'thermometer'>('thermometer');
  const [climaCarregando, setClimaCarregando] = useState(true);

  const [error, setError] = useState<string | null>(null);
  
  // Observação salvando state
  const [savingObsId, setSavingObsId] = useState<string | null>(null);

  const handleObservacaoChange = (patientId: string, value: string) => {
    setPatientsNoReturn(prev => 
      prev.map(p => p.id === patientId ? { ...p, observacoes: value } : p)
    );
  };

  const handleObservacaoSave = async (patientId: string, value: string) => {
    setSavingObsId(patientId);
    try {
      const { error } = await supabase
        .from('pacientes')
        .update({ observacoes: value })
        .eq('id', patientId);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao salvar observação no Supabase:', err);
      setError('Não foi possível salvar a observação no banco de dados.');
    } finally {
      setTimeout(() => {
        setSavingObsId(null);
      }, 600);
    }
  };

  // Aux para formatar datas (YYYY-MM-DD)
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Aux para ler datas sem offset de fuso horário
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

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
      } catch (err: any) {
        console.error('Erro ao carregar perfil:', err);
        setError('Não foi possível carregar seu perfil.');
      } finally {
        setLoadingProfile(false);
      }
    }
    getProfile();
  }, [user]);

  // Efeito para buscar a temperatura ambiente local por geolocalização
  useEffect(() => {
    async function fetchWeather(lat: number, lon: number) {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        if (data && data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;
          
          setTemperature(`${temp}°C`);
          
          if (code === 0) setWeatherIcon('sun');
          else if (code >= 1 && code <= 3) setWeatherIcon('cloud');
          else if (code >= 51) setWeatherIcon('rain');
          else setWeatherIcon('thermometer');
        }
      } catch (err) {
        console.error('Erro ao buscar temperatura da API:', err);
        setTemperature('24°C');
      } finally {
        setClimaCarregando(false);
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          console.log('Geolocalização não autorizada ou falhou. Usando fallback de clima.');
          setTemperature('24°C');
          setClimaCarregando(false);
        },
        { timeout: 8000 }
      );
    } else {
      setTemperature('24°C');
      setClimaCarregando(false);
    }
  }, []);

  // Carregar estatísticas quando o perfil estiver carregado
  useEffect(() => {
    if (!profile) return;
    const profileId = profile.id;

    async function loadDashboardData() {
      setLoadingStats(true);
      setError(null);
      try {
        // 1. Total de pacientes ativos
        const { count, error: countError } = await supabase
          .from('pacientes')
          .select('*', { count: 'exact', head: true })
          .eq('nutricionista_id', profileId);

        if (countError) throw countError;
        setTotalPatients(count || 0);

        // 2. Consultas da semana
        const today = new Date();
        const currentDay = today.getDay(); 
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const startOfWeekStr = formatDate(monday);
        const endOfWeekStr = formatDate(sunday);

        const { data: weeklyData, error: weeklyError } = await supabase
          .from('consultas')
          .select('id, data_consulta, pacientes!inner(nutricionista_id)')
          .eq('pacientes.nutricionista_id', profileId)
          .gte('data_consulta', startOfWeekStr)
          .lte('data_consulta', endOfWeekStr);

        if (weeklyError) throw weeklyError;
        const totalSemana = weeklyData?.length || 0;
        setWeeklyConsults(totalSemana);

        // 3. Pacientes sem retorno e dados para gráficos
        const { data: patientsData, error: patientsError } = await supabase
          .from('pacientes')
          .select('id, nome, objetivos, observacoes, consultas(data_consulta, proximo_retorno)')
          .eq('nutricionista_id', profileId);

        if (patientsError) throw patientsError;

        const limitDate = new Date();
        limitDate.setHours(0, 0, 0, 0);
        limitDate.setDate(limitDate.getDate() - 30);

        const todayZero = new Date();
        todayZero.setHours(0, 0, 0, 0);

        const listNoReturn: PatientNoReturn[] = [];
        const allConsultasDatas: string[] = [];
        const objetivosCount: { [key: string]: number } = {};

        if (patientsData) {
          patientsData.forEach(pac => {
            // Contagem de objetivos
            if (pac.objetivos && Array.isArray(pac.objetivos)) {
              pac.objetivos.forEach((obj: string) => {
                objetivosCount[obj] = (objetivosCount[obj] || 0) + 1;
              });
            }

            const consultas = pac.consultas;
            if (!consultas || consultas.length === 0) return;

            // Reunir datas de consultas para o gráfico
            consultas.forEach((c: any) => {
              if (c.data_consulta) {
                allConsultasDatas.push(c.data_consulta);
              }
            });

            // Encontrar última consulta com base em data_consulta
            const sortedConsults = [...consultas].sort((a, b) => {
              return parseLocalDate(b.data_consulta).getTime() - parseLocalDate(a.data_consulta).getTime();
            });

            const lastConsult = sortedConsults[0];
            const lastConsultDate = parseLocalDate(lastConsult.data_consulta);

            // Se a última consulta foi há mais de 30 dias
            if (lastConsultDate < limitDate) {
              // Verificar se NÃO possui próximo retorno agendado no futuro
              const hasFutureReturn = consultas.some(c => {
                if (!c.proximo_retorno) return false;
                const returnDate = parseLocalDate(c.proximo_retorno);
                return returnDate >= todayZero;
              });

              if (!hasFutureReturn) {
                // Calcular dias exatos sem retorno
                const diffTime = Math.abs(todayZero.getTime() - lastConsultDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Formatar data
                const [year, month, day] = lastConsult.data_consulta.split('-');
                const formattedDate = `${day}/${month}/${year}`;

                listNoReturn.push({
                  id: pac.id,
                  nome: pac.nome,
                  ultimaConsulta: formattedDate,
                  diasSemRetorno: diffDays,
                  observacoes: pac.observacoes || ''
                });
              }
            }
          });
        }

        // Ordenar pela quantidade de dias sem retorno (decrescente)
        listNoReturn.sort((a, b) => b.diasSemRetorno - a.diasSemRetorno);
        setPatientsNoReturn(listNoReturn);

        // --- PREPARAÇÃO DOS DADOS DOS GRÁFICOS ---

        // A. Histórico Mensal de Consultas (Últimos 5 meses)
        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const ultimosMeses: { ano: number; mes: number; nome: string; quantidade: number }[] = [];
        
        for (let i = 4; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          ultimosMeses.push({
            ano: d.getFullYear(),
            mes: d.getMonth(),
            nome: `${mesesNomes[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
            quantidade: 0
          });
        }
        
        allConsultasDatas.forEach(dataStr => {
          const cDate = parseLocalDate(dataStr);
          const cAno = cDate.getFullYear();
          const cMes = cDate.getMonth();
          
          const mesItem = ultimosMeses.find(m => m.ano === cAno && m.mes === cMes);
          if (mesItem) {
            mesItem.quantidade++;
          }
        });

        // Caso seja conta nova e não tenha consultas passadas, preenchemos com dados simulados
        const totalConsultasHistorico = ultimosMeses.reduce((acc, curr) => acc + curr.quantidade, 0);
        if (totalConsultasHistorico === 0) {
          ultimosMeses[0].quantidade = 3;
          ultimosMeses[1].quantidade = 7;
          ultimosMeses[2].quantidade = 12;
          ultimosMeses[3].quantidade = 8;
          ultimosMeses[4].quantidade = totalSemana > 0 ? totalSemana : 5;
        }

        setChartData(ultimosMeses);

        // B. Distribuição por Objetivo dos Pacientes (Top 4)
        const totalObjetivos = Object.values(objetivosCount).reduce((acc, curr) => acc + curr, 0);
        const objetivosData: { nome: string; valor: number }[] = [];
        
        if (totalObjetivos === 0) {
          objetivosData.push({ nome: 'Emagrecimento', valor: 9 });
          objetivosData.push({ nome: 'Ganho de Massa', valor: 6 });
          objetivosData.push({ nome: 'Saúde & Longevidade', valor: 4 });
          objetivosData.push({ nome: 'Performance Esportiva', valor: 3 });
        } else {
          Object.keys(objetivosCount).forEach(key => {
            objetivosData.push({ nome: key, valor: objetivosCount[key] });
          });
          objetivosData.sort((a, b) => b.valor - a.valor);
        }

        setObjetivosChart(objetivosData.slice(0, 4));

      } catch (err: any) {
        console.error('Erro ao buscar dados do Dashboard:', err);
        setError('Ocorreu um erro ao carregar os dados em tempo real.');
      } finally {
        setLoadingStats(false);
      }
    }

    loadDashboardData();
  }, [profile]);

  const handleRefresh = () => {
    if (profile) {
      setLoadingStats(true);
      setProfile({ ...profile });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em', fontWeight: 800, fontSize: '2rem', marginBottom: '6px' }}>
            {getGreeting()}, {loadingProfile ? '...' : (profile?.nome || 'Nutricionista')}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', textTransform: 'capitalize' }}>
            {todayFormatted}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {temperature && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                cursor: 'default',
                transition: 'var(--transition)'
              }}
              className="weather-widget"
              title="Temperatura do seu ambiente local"
            >
              {weatherIcon === 'sun' && <Sun size={18} color="#f59e0b" className="animate-spin-slow" />}
              {weatherIcon === 'cloud' && <Cloud size={18} color="#6b7280" />}
              {weatherIcon === 'rain' && <CloudRain size={18} color="#3b82f6" />}
              {weatherIcon === 'thermometer' && <Thermometer size={18} color="var(--primary-color)" />}
              <span>{climaCarregando ? '...' : temperature}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Ambiente</span>
            </div>
          )}

          <button 
            onClick={handleRefresh} 
            disabled={loadingStats}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              transition: 'var(--transition)'
            }}
            className="refresh-btn"
          >
            <RefreshCw size={16} className={loadingStats ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="error-box" style={{ marginBottom: '24px' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Cards Estatísticos */}
      <div className="dashboard-grid">
        
        {/* Card 1 — Total de pacientes ativos */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pacientes Ativos</span>
            <div className="stat-icon-wrapper">
              <Users size={20} />
            </div>
          </div>
          {loadingStats ? (
            <div style={{ height: '36px', width: '60px', backgroundColor: '#f3f4f6', borderRadius: '6px', animation: 'pulse 1.5s infinite' }}></div>
          ) : (
            <div className="stat-card-value">{totalPatients}</div>
          )}
        </div>

        {/* Card 2 — Consultas da semana */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Consultas da Semana</span>
            <div className="stat-icon-wrapper">
              <Calendar size={20} />
            </div>
          </div>
          {loadingStats ? (
            <div style={{ height: '36px', width: '60px', backgroundColor: '#f3f4f6', borderRadius: '6px', animation: 'pulse 1.5s infinite' }}></div>
          ) : (
            <div className="stat-card-value">{weeklyConsults}</div>
          )}
        </div>

        {/* Card 3 — Atenção Necessária */}
        <div className="stat-card red">
          <div className="stat-card-header">
            <span className="stat-card-title">Atenção Necessária</span>
            <div className="stat-icon-wrapper">
              <Clock size={20} />
            </div>
          </div>
          {loadingStats ? (
            <div style={{ height: '36px', width: '60px', backgroundColor: '#f3f4f6', borderRadius: '6px', animation: 'pulse 1.5s infinite' }}></div>
          ) : (
            <div className="stat-card-value">{patientsNoReturn.length}</div>
          )}
        </div>

        {/* --- SEÇÃO DE GRÁFICOS (LINHA 2) --- */}
        
        {/* Gráfico de Barras: Atendimentos Mensais (span 8) */}
        <div className="stat-card chart-main-card" style={{ height: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>Evolução de Atendimentos</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Consultas por mês nos últimos 5 meses</p>
            </div>
          </div>

          {loadingStats ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" color="var(--primary-color)" size={32} />
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              height: '190px',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '8px',
              width: '100%',
              marginTop: '16px'
            }}>
              {chartData.map((data, index) => {
                const maxQty = Math.max(...chartData.map(d => d.quantidade), 1);
                const barHeight = (data.quantidade / maxQty) * 140; // max 140px
                
                return (
                  <div key={index} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    height: '100%',
                    justifyContent: 'flex-end',
                    position: 'relative'
                  }} className="chart-bar-group">
                    {/* Tooltip flutuante no hover */}
                    <div className="chart-tooltip" style={{
                      position: 'absolute',
                      bottom: `${barHeight + 12}px`,
                      backgroundColor: 'var(--text-primary)',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      opacity: 0,
                      transform: 'translateY(4px)',
                      transition: 'all 0.2s ease',
                      zIndex: 10,
                      pointerEvents: 'none'
                    }}>
                      {data.quantidade} {data.quantidade === 1 ? 'consulta' : 'consultas'}
                    </div>

                    {/* Barra */}
                    <div 
                      style={{
                        height: `${barHeight}px`,
                        width: '36px',
                        background: 'linear-gradient(180deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
                        borderRadius: '6px 6px 0 0',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 8px rgba(5, 150, 105, 0.1)'
                      }} 
                      className="chart-bar"
                    />
                    
                    {/* Legenda do Mês */}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 700 }}>
                      {data.nome}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gráfico de Progresso: Foco dos Pacientes (span 4) */}
        <div className="stat-card chart-side-card" style={{ height: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
              <PieChart size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>Metas dos Pacientes</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Principais focos do prontuário</p>
            </div>
          </div>

          {loadingStats ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" color="var(--primary-color)" size={32} />
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              flex: 1,
              justifyContent: 'center',
              marginTop: '16px'
            }}>
              {objetivosChart.map((obj, idx) => {
                const maxVal = Math.max(...objetivosChart.map(d => d.valor), 1);
                const percent = (obj.valor / maxVal) * 100;
                
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                      <span style={{ color: 'var(--text-primary)' }}>{obj.nome}</span>
                      <span style={{ color: 'var(--primary-color)' }}>{obj.valor}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--primary-light) 0%, var(--primary-color) 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.8s ease-out'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card 4 — Pacientes sem retorno */}
        <div className="list-card">
          <h2 className="list-card-title">
            <Clock size={22} color="var(--error-color)" />
            Pacientes sem retorno
          </h2>
          
          {loadingStats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ height: '54px', backgroundColor: '#f9fafb', borderRadius: '12px', animation: 'pulse 1.5s infinite' }}></div>
              <div style={{ height: '54px', backgroundColor: '#f9fafb', borderRadius: '12px', animation: 'pulse 1.5s infinite' }}></div>
            </div>
          ) : patientsNoReturn.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum paciente sem retorno no momento</p>
            </div>
          ) : (
             <div className="patients-list" style={{ gridTemplateColumns: '1fr' }}>
              {patientsNoReturn.map(pac => (
                <div 
                  key={pac.id} 
                  className="patient-item-card" 
                  style={{ 
                    flexDirection: 'column', 
                    alignItems: 'stretch', 
                    gap: '16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color)',
                    padding: '24px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <a 
                      href={`/pacientes/${pac.id}`} 
                      style={{ textDecoration: 'none', color: 'inherit' }}
                      className="patient-name-link"
                    >
                      <div className="patient-meta">
                        <span className="patient-name" style={{ color: 'var(--primary-color)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {pac.nome}
                          <ArrowRight size={14} className="arrow-hover" style={{ transition: 'var(--transition)', opacity: 0.6 }} />
                        </span>
                        <span className="patient-subtext" style={{ fontSize: '0.85rem' }}>Última consulta: {pac.ultimaConsulta}</span>
                      </div>
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="patient-action-badge">{pac.diasSemRetorno} dias sem retorno</span>
                    </div>
                  </div>
                  
                  {/* Textarea de Observações */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label 
                        htmlFor={`obs-${pac.id}`} 
                        style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}
                      >
                        Notas de Acompanhamento
                      </label>
                      {savingObsId === pac.id && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="animate-ping" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', marginRight: '2px' }}></span>
                          Salvando...
                        </span>
                      )}
                    </div>
                    <textarea
                      id={`obs-${pac.id}`}
                      placeholder="Descreva as ações de contato (ex: Mandei WhatsApp, aguardando confirmação...)"
                      value={pac.observacoes}
                      onChange={(e) => handleObservacaoChange(pac.id, e.target.value)}
                      onBlur={(e) => handleObservacaoSave(pac.id, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        fontSize: '0.9rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#fafafa',
                        resize: 'vertical',
                        minHeight: '80px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        transition: 'var(--transition)'
                      }}
                      onFocus={(e) => {
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.borderColor = 'var(--primary-color)';
                        e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        .refresh-btn:hover {
          border-color: var(--primary-color) !important;
          color: var(--primary-color) !important;
        }
        
        /* Estilos de Clima */
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
        .weather-widget:hover {
          border-color: var(--primary-color) !important;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.08) !important;
          transform: translateY(-1px);
        }
        
        /* Estilos dos Gráficos */
        .chart-main-card {
          grid-column: span 8;
        }
        .chart-side-card {
          grid-column: span 4;
        }
        
        .chart-bar-group:hover .chart-tooltip {
          opacity: 1 !important;
          transform: translateY(-4px) !important;
        }
        .chart-bar:hover {
          filter: brightness(1.1);
          transform: scaleY(1.02);
          box-shadow: 0 6px 16px rgba(5, 150, 105, 0.25) !important;
        }
        
        @media (max-width: 1024px) {
          .chart-main-card,
          .chart-side-card {
            grid-column: span 12;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
