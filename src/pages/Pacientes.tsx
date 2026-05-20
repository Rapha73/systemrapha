import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Search, Plus, UserPlus, Phone, Loader2 } from 'lucide-react';
import type { Tables } from '../types/database.types';

interface PacienteComConsultas extends Tables<'pacientes'> {
  consultas: { data_consulta: string }[];
}

const Pacientes: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [patients, setPatients] = useState<PacienteComConsultas[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);

        // 1. Obter perfil da nutricionista
        const { data: profileData, error: profileError } = await supabase
          .from('nutricionistas')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        // 2. Buscar pacientes associados com data de suas consultas
        const { data: patientsData, error: patientsError } = await supabase
          .from('pacientes')
          .select('*, consultas(data_consulta)')
          .eq('nutricionista_id', profileData.id)
          .order('nome', { ascending: true });

        if (patientsError) throw patientsError;
        setPatients((patientsData as any) || []);

      } catch (err: any) {
        console.error('Erro ao buscar pacientes:', err);
        setError('Não foi possível carregar a lista de pacientes.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Função para formatar data (AAAA-MM-DD -> DD/MM/AAAA)
  const formatarData = (dataStr: string | null) => {
    if (!dataStr) return null;
    try {
      const [year, month, day] = dataStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return null;
    }
  };

  // Função para obter a data da última consulta
  const obterUltimaConsulta = (consultas: { data_consulta: string }[] | null) => {
    if (!consultas || consultas.length === 0) return null;
    const ordenadas = [...consultas].sort((a, b) => b.data_consulta.localeCompare(a.data_consulta));
    return ordenadas[0].data_consulta;
  };

  // Função para calcular a idade
  const calcularIdade = (dataNascStr: string | null) => {
    if (!dataNascStr) return null;
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
      return null;
    }
  };

  // Formatar link para o WhatsApp
  const linkWhatsApp = (whatsStr: string | null) => {
    if (!whatsStr) return '#';
    const apenasNumeros = whatsStr.replace(/\D/g, '');
    const prefixo = apenasNumeros.startsWith('55') ? '' : '55';
    return `https://wa.me/${prefixo}${apenasNumeros}`;
  };

  // Filtrar pacientes com base na busca do input
  const filteredPatients = patients.filter(pac => 
    pac.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pac.email && pac.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" color="var(--primary-color)" size={40} />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      
      {/* Header */}
      <div className="list-header">
        <div>
          <h1 style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em', fontWeight: 800, fontSize: '2rem' }}>
            Pacientes
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Gerencie os cadastros e acesse as anamneses e fichas clínicas.
          </p>
        </div>
        <button 
          onClick={() => navigate('/pacientes/cadastro')} 
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} />
          Novo Paciente
        </button>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: '24px' }}>
          <span>{error}</span>
        </div>
      )}

      {patients.length > 0 ? (
        <>
          {/* Campo de Busca */}
          <div style={{ marginBottom: '32px' }}>
            <div className="search-bar-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredPatients.length > 0 ? (
            <div className="patients-grid">
              {filteredPatients.map(pac => {
                const iniciais = pac.nome
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                
                const idade = calcularIdade(pac.data_nascimento);

                return (
                  <div 
                    key={pac.id} 
                    className="patient-card"
                    onClick={() => navigate(`/pacientes/${pac.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="patient-card-header">
                      <div className="patient-card-avatar">
                        {iniciais}
                      </div>
                      <div className="patient-card-info">
                        <span className="patient-card-name" title={pac.nome}>{pac.nome}</span>
                        <span className="patient-card-detail">
                          {idade ? `${idade} • ` : ''}{pac.sexo || 'Sexo não informado'}
                        </span>
                        {pac.whatsapp && (
                          <a 
                            href={linkWhatsApp(pac.whatsapp)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="patient-card-contact"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={14} color="var(--primary-color)" />
                            {pac.whatsapp}
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong>Objetivo:</strong> {pac.objetivos && pac.objetivos.length > 0 ? pac.objetivos.join(', ') : 'Não informado'}
                      </div>
                      <div>
                        <strong>Última Consulta:</strong> {formatarData(obterUltimaConsulta(pac.consultas)) || 'Nenhuma registrada'}
                      </div>
                    </div>

                    {/* Exibir chips de objetivos e a tag de atividade física como secundários */}
                    <div className="patient-card-tags" style={{ marginTop: '12px' }}>
                      {pac.atividade_fisica && (
                        <span className="tag-badge primary">Ativo</span>
                      )}
                      {pac.objetivos && (pac.objetivos as string[]).slice(0, 1).map(obj => (
                        <span key={obj} className="tag-badge">{obj}</span>
                      ))}
                      {pac.objetivos && (pac.objetivos as string[]).length > 1 && (
                        <span className="tag-badge">+{ (pac.objetivos as string[]).length - 1 }</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ 
              background: 'white', 
              padding: '60px', 
              borderRadius: '16px', 
              boxShadow: 'var(--shadow-premium)',
              textAlign: 'center',
              border: '1px solid var(--border-color)'
            }}>
              <Search size={40} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Nenhum paciente encontrado</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Nenhum resultado corresponde à busca "{searchQuery}".</p>
            </div>
          )}
        </>
      ) : (
        /* Estado Vazio */
        <div style={{ 
          background: 'white', 
          padding: '80px 40px', 
          borderRadius: '16px', 
          boxShadow: 'var(--shadow-premium)',
          textAlign: 'center',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            backgroundColor: 'var(--primary-light)', 
            color: 'var(--primary-color)', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px auto'
          }}>
            <UserPlus size={40} />
          </div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Nenhum paciente cadastrado ainda
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 32px auto' }}>
            Você ainda não tem pacientes cadastrados no sistema. Comece agora adicionando a primeira anamnese clínica.
          </p>
          <button 
            onClick={() => navigate('/pacientes/cadastro')} 
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px' }}
          >
            <Plus size={18} />
            Cadastrar Primeiro Paciente
          </button>
        </div>
      )}
    </div>
  );
};

export default Pacientes;
