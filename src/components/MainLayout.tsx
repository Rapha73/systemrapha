import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Leaf, LayoutDashboard, Users, LogOut, User as UserIcon } from 'lucide-react';
import type { Tables } from '../types/database.types';

const MainLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Tables<'nutricionistas'> | null>(null);
  const [loading, setLoading] = useState(true);

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
        console.error('Erro ao carregar perfil na sidebar:', err);
      } finally {
        setLoading(false);
      }
    }
    getProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  return (
    <div className="app-container">
      {/* Header Mobile (Fixo no Topo) */}
      <header className="mobile-header">
        <div className="sidebar-logo" style={{ marginBottom: 0, paddingLeft: 0 }}>
          <div className="logo-icon-wrapper">
            <Leaf size={18} color="var(--primary-color)" />
          </div>
          <span className="brand-name" style={{ fontSize: '1.15rem' }}>System Rapha</span>
        </div>
        <div className="user-profile-summary" style={{ paddingLeft: 0 }}>
          <div className="user-avatar" style={{ width: '32px', height: '32px' }} title={profile?.nome || 'Nutricionista'}>
            <UserIcon size={14} color="var(--text-secondary)" />
          </div>
        </div>
      </header>

      {/* Sidebar Fixa (Desktop) */}
      <aside className="sidebar">
        <div>
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="logo-icon-wrapper">
              <Leaf size={22} color="var(--primary-color)" />
            </div>
            <span className="brand-name" style={{ fontSize: '1.25rem' }}>System Rapha</span>
          </div>

          {/* Navegação */}
          <nav className="sidebar-nav">
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink 
              to="/pacientes" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={20} />
              <span>Pacientes</span>
            </NavLink>
          </nav>
        </div>

        {/* Prancha Alaia decorativa no espaço em branco */}
        <div className="sidebar-decor">
          <img 
            src="/alaia_board.png" 
            alt="Prancha Alaia" 
            style={{ 
              height: '230px', 
              width: 'auto', 
              transform: 'rotate(-8deg)', 
              filter: 'drop-shadow(3px 6px 12px rgba(0,0,0,0.15))'
            }}
          />
        </div>

        {/* Rodapé da Sidebar - Usuário */}
        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <div className="user-avatar">
              <UserIcon size={18} color="var(--text-secondary)" />
            </div>
            <div className="user-info-text">
              <span className="user-name">
                {loading ? 'Carregando...' : (profile?.nome || 'Nutricionista')}
              </span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Sair do sistema">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Navegação Mobile (Barra Inferior Fixa) */}
      <nav className="mobile-bottom-nav">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink 
          to="/pacientes" 
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Pacientes</span>
        </NavLink>
        <button onClick={handleLogout} className="mobile-nav-item-btn" title="Sair">
          <LogOut size={20} color="var(--error-color)" />
          <span style={{ color: 'var(--error-color)' }}>Sair</span>
        </button>
      </nav>

      {/* Conteúdo Principal */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
