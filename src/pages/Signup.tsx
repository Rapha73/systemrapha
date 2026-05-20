import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AuthLayout from '../components/AuthLayout';
import { AlertCircle, Loader2, Sparkles, User, Mail, Shield, Phone, Lock, Calendar, Heart } from 'lucide-react';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [tipoCadastro, setTipoCadastro] = useState<'nutricionista' | 'paciente'>('nutricionista');
  
  // Nutricionista & Paciente Shared States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [telefone, setTelefone] = useState('');
  
  // Nutricionista Specific States
  const [crn, setCrn] = useState('');

  // Paciente Specific States
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [objetivos, setObjetivos] = useState<string[]>([]);

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const objetivosOptions = [
    'Emagrecer',
    'Ganhar massa',
    'Reeducação alimentar',
    'Saúde geral',
    'Controlar diabetes',
    'Performance esportiva'
  ];

  const handleTelefoneChange = (value: string) => {
    const numbersOnly = value.replace(/\D/g, '');
    if (numbersOnly.length <= 13) {
      setTelefone(numbersOnly);
    }
  };

  const handleObjetivoToggle = (option: string) => {
    setObjetivos(prev => 
      prev.includes(option) 
        ? prev.filter(item => item !== option) 
        : [...prev, option]
    );
  };

  // Calcula idade para exibir no feedback visual do paciente
  const calculateAge = (birthDateStr: string) => {
    if (!birthDateStr) return null;
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validations
    if (fullName.trim().length < 3) {
      setError('Por favor, digite seu nome completo.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      // 1. Criar o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        if (tipoCadastro === 'nutricionista') {
          // 2. Inserir na tabela nutricionistas
          const { error: dbError } = await supabase
            .from('nutricionistas')
            .insert([
              { 
                nome: fullName, 
                email: email,
                crn: crn.trim() || null,
                telefone: telefone.trim() || null,
                user_id: authData.user.id
              }
            ]);

          if (dbError) throw dbError;
        } else {
          // 3. Inserir na tabela pacientes
          // Tentar associar à nutricionista de teste ou à primeira cadastrada
          let nutriId: string | null = null;
          try {
            const { data: nutriData } = await supabase
              .from('nutricionistas')
              .select('id')
              .limit(5);
            
            if (nutriData && nutriData.length > 0) {
              const testNutri = nutriData.find(n => n.id === '1b9b2c34-8dbb-4a7f-a06f-d90082c03953');
              nutriId = testNutri ? testNutri.id : nutriData[0].id;
            }
          } catch (e) {
            console.error('Erro ao buscar nutricionista para vincular paciente:', e);
          }

          const { error: dbError } = await supabase
            .from('pacientes')
            .insert([
              {
                nome: fullName,
                email: email,
                telefone: telefone.trim() || null,
                data_nascimento: dataNascimento || null,
                sexo: sexo || null,
                objetivos: objetivos.length > 0 ? objetivos : null,
                nutricionista_id: nutriId,
                observacoes: 'Cadastrado de forma autônoma pelo portal público.'
              }
            ]);

          if (dbError) throw dbError;
        }
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center', padding: '16px 8px' }} className="animate-fade-in">
          <div style={{ display: 'inline-flex', padding: '16px', backgroundColor: 'var(--primary-light)', borderRadius: '50%', color: 'var(--primary-color)', marginBottom: '24px' }}>
            <Sparkles size={40} />
          </div>
          <h2 style={{ color: 'var(--primary-color)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Cadastro Concluído!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '28px' }}>
            Seu cadastro como <strong>{tipoCadastro === 'paciente' ? 'Paciente' : 'Nutricionista'}</strong> foi realizado com sucesso no System Rapha. 
            {tipoCadastro === 'paciente' 
              ? ' Suas informações de saúde já foram enviadas e vinculadas ao painel da sua nutricionista para acompanhamento!' 
              : ' Seu perfil profissional foi criado e você já pode acessar seu painel e cadastrar seus pacientes.'}
          </p>
          <button 
            onClick={() => {
              // Garante o encerramento de qualquer sessão automática do Auth para login limpo
              supabase.auth.signOut().then(() => {
                navigate('/login');
              });
            }} 
            className="btn-submit"
            style={{ width: '100%' }}
          >
            Fazer Login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--primary-color)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>
          Criar Conta
        </h2>
        <p className="subtitle" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Selecione seu perfil para iniciar o cadastro no sistema.
        </p>
      </div>

      {/* Seletor de Perfil de Cadastro */}
      <div style={{
        display: 'flex',
        backgroundColor: '#f3f4f6',
        padding: '4px',
        borderRadius: '10px',
        marginBottom: '24px',
        gap: '4px'
      }}>
        <button
          type="button"
          onClick={() => {
            setTipoCadastro('nutricionista');
            setError(null);
          }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: tipoCadastro === 'nutricionista' ? '#ffffff' : 'transparent',
            color: tipoCadastro === 'nutricionista' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: tipoCadastro === 'nutricionista' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
            transition: 'var(--transition)'
          }}
        >
          <Sparkles size={16} />
          Nutricionista
        </button>
        <button
          type="button"
          onClick={() => {
            setTipoCadastro('paciente');
            setError(null);
          }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: tipoCadastro === 'paciente' ? '#ffffff' : 'transparent',
            color: tipoCadastro === 'paciente' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: tipoCadastro === 'paciente' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
            transition: 'var(--transition)'
          }}
        >
          <User size={16} />
          Paciente
        </button>
      </div>
      
      {error && (
        <div className="error-box" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Nome Completo */}
        <div className="form-group">
          <label htmlFor="fullName" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} /> Nome Completo
          </label>
          <input
            id="fullName"
            type="text"
            placeholder={tipoCadastro === 'nutricionista' ? 'Nome completo da nutricionista' : 'Nome completo do paciente'}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        {/* E-mail */}
        <div className="form-group">
          <label htmlFor="email" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={14} /> E-mail
          </label>
          <input
            id="email"
            type="email"
            placeholder="exemplo@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        {/* Campos Condicionais para Nutricionista */}
        {tipoCadastro === 'nutricionista' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="crn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} /> Registro CRN
              </label>
              <input
                id="crn"
                type="text"
                placeholder="CRN-3 12345"
                value={crn}
                onChange={(e) => setCrn(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefone" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} /> Telefone
              </label>
              <input
                id="telefone"
                type="text"
                placeholder="Apenas números (máx 13)"
                value={telefone}
                onChange={(e) => handleTelefoneChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Campos Condicionais para Paciente */}
        {tipoCadastro === 'paciente' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="dataNascimento" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} /> Nascimento
                </label>
                <input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
                {dataNascimento && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                    Idade: {calculateAge(dataNascimento)} anos
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="sexo" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> Sexo
                </label>
                <select
                  id="sexo"
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="">Selecione...</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="telefone" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} /> Telefone / WhatsApp
              </label>
              <input
                id="telefone"
                type="text"
                placeholder="Apenas números (máx 13)"
                value={telefone}
                onChange={(e) => handleTelefoneChange(e.target.value)}
              />
            </div>

            {/* Objetivos do Paciente (Chips de multi-seleção) */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Heart size={14} /> Seus Principais Objetivos
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {objetivosOptions.map(option => {
                  const active = objetivos.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleObjetivoToggle(option)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '20px',
                        border: active ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                        backgroundColor: active ? 'var(--primary-light)' : '#ffffff',
                        color: active ? 'var(--primary-color)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Senha e Confirmar Senha */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="password" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} /> Senha
            </label>
            <input
              id="password"
              type="password"
              placeholder="Mín. 6 dígitos"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} /> Confirmar
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <button type="submit" className="btn-submit" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Loader2 className="animate-spin" size={20} />
              <span>Criando conta...</span>
            </div>
          ) : 'Finalizar Cadastro'}
        </button>
      </form>

      <div className="auth-footer" style={{ marginTop: '24px', textAlign: 'center' }}>
        Já possui uma conta? <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>Fazer login</Link>
      </div>
    </AuthLayout>
  );
};

export default Signup;
