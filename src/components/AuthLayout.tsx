import React from 'react';
import { Leaf } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-wrapper">
      <div className="auth-card animate-fade-in">
        <div className="brand-logo">
          <div style={{ 
            backgroundColor: 'var(--primary-light)', 
            padding: '8px', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Leaf size={28} color="var(--primary-color)" />
          </div>
          <span className="brand-name">System Rapha</span>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
