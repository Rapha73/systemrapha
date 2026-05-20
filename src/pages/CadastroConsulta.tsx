import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, AlertCircle, Loader2 } from 'lucide-react';
import type { Tables } from '../types/database.types';

const CadastroConsulta: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Tables<'pacientes'> | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos do formulário
  const [dataConsulta, setDataConsulta] = useState('');
  const [peso, setPeso] = useState('');
  const [percentualGordura, setPercentualGordura] = useState('');
  const [cintura, setCintura] = useState('');
  const [quadril, setQuadril] = useState('');
  const [proximoRetorno, setProximoRetorno] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    // Definir data de hoje como padrão (formato YYYY-MM-DD no fuso local)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setDataConsulta(`${year}-${month}-${day}`);

    async function loadPatient() {
      if (!id) return;
      try {
        const { data, error: dbError } = await supabase
          .from('pacientes')
          .select('*')
          .eq('id', id)
          .single();

        if (dbError) throw dbError;
        setPatient(data);
      } catch (err) {
        console.error('Erro ao carregar dados do paciente para consulta:', err);
        setError('Não foi possível encontrar o paciente especificado.');
      } finally {
        setLoadingPatient(false);
      }
    }

    loadPatient();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!dataConsulta) {
      setError('A data da consulta é obrigatória.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        paciente_id: id,
        data_consulta: dataConsulta,
        peso: peso ? parseFloat(peso) : null,
        percentual_gordura: percentualGordura ? parseFloat(percentualGordura) : null,
        cintura: cintura ? parseFloat(cintura) : null,
        quadril: quadril ? parseFloat(quadril) : null,
        proximo_retorno: proximoRetorno || null,
        observacoes: observacoes || null
      };

      const { error: dbError } = await supabase
        .from('consultas')
        .insert([payload]);

      if (dbError) throw dbError;

      // Redireciona de volta para os detalhes do paciente, ativando a aba "consultas"
      navigate(`/pacientes/${id}`, { state: { tab: 'consultas' } });

    } catch (err: any) {
      console.error('Erro ao registrar consulta:', err);
      setError(err.message || 'Erro ao registrar a consulta no banco de dados.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingPatient) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" color="var(--primary-color)" size={40} />
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div className="error-box" style={{ justifyContent: 'center', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
          <span>{error}</span>
        </div>
        <button onClick={() => navigate('/pacientes')} className="btn-secondary">
          Voltar para Lista
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }} className="animate-fade-in">
      
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <button 
          onClick={() => navigate(`/pacientes/${id}`, { state: { tab: 'consultas' } })} 
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
          Voltar para Perfil
        </button>
        <h1 style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em', fontWeight: 800, fontSize: '2rem' }}>
          Registrar Consulta
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Paciente: <strong style={{ color: 'var(--primary-color)' }}>{patient?.nome}</strong>
        </p>
      </header>

      {error && (
        <div className="error-box" style={{ marginBottom: '24px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '36px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
        
        <div className="form-grid">
          
          <div className="form-group col-6">
            <label htmlFor="data_consulta">Data da Consulta *</label>
            <input
              id="data_consulta"
              type="date"
              value={dataConsulta}
              onChange={(e) => setDataConsulta(e.target.value)}
              required
            />
          </div>

          <div className="form-group col-6">
            <label htmlFor="retorno">Próximo Retorno (Sugerido)</label>
            <input
              id="retorno"
              type="date"
              value={proximoRetorno}
              onChange={(e) => setProximoRetorno(e.target.value)}
            />
          </div>

          <div className="form-group col-3">
            <label htmlFor="peso">Peso (kg)</label>
            <input
              id="peso"
              type="number"
              step="0.1"
              placeholder="Ex: 68.4"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
            />
          </div>

          <div className="form-group col-3">
            <label htmlFor="gordura">% de Gordura</label>
            <input
              id="gordura"
              type="number"
              step="0.1"
              placeholder="Ex: 22.5"
              value={percentualGordura}
              onChange={(e) => setPercentualGordura(e.target.value)}
            />
          </div>

          <div className="form-group col-3">
            <label htmlFor="cintura">Cintura (cm)</label>
            <input
              id="cintura"
              type="number"
              step="0.1"
              placeholder="Ex: 78.0"
              value={cintura}
              onChange={(e) => setCintura(e.target.value)}
            />
          </div>

          <div className="form-group col-3">
            <label htmlFor="quadril">Quadril (cm)</label>
            <input
              id="quadril"
              type="number"
              step="0.1"
              placeholder="Ex: 96.5"
              value={quadril}
              onChange={(e) => setQuadril(e.target.value)}
            />
          </div>

          <div className="form-group col-12">
            <label htmlFor="obs">Evolução Clínica & Anotações de Acompanhamento</label>
            <textarea
              id="obs"
              placeholder="Descreva a evolução do paciente nesta consulta, queixas, adaptação à dieta anterior, etc..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              style={{
                width: '100%',
                minHeight: '160px',
                padding: '14px',
                fontSize: '0.95rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                resize: 'vertical',
                fontFamily: 'inherit',
                outline: 'none',
                backgroundColor: '#fcfcfc',
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

        {/* Linha de Ações */}
        <div className="form-actions-row" style={{ marginTop: '32px' }}>
          <button 
            type="button" 
            onClick={() => navigate(`/pacientes/${id}`, { state: { tab: 'consultas' } })} 
            className="btn-secondary"
          >
            Cancelar
          </button>
          
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Registrando...
              </>
            ) : (
              <>
                <Save size={18} />
                Registrar Consulta
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CadastroConsulta;
