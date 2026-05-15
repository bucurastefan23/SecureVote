import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Vote, BarChart, LogIn, LogOut } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const [token, setToken] = React.useState(localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = React.useState(localStorage.getItem('role') === 'ADMIN');
  const [isCreator, setIsCreator] = React.useState(localStorage.getItem('isCreator') === 'true');
  const [email, setEmail] = React.useState(localStorage.getItem('email'));

  React.useEffect(() => {
    const handleStorage = () => {
      setToken(localStorage.getItem('token'));
      setIsAdmin(localStorage.getItem('role') === 'ADMIN');
      setIsCreator(localStorage.getItem('isCreator') === 'true');
      setEmail(localStorage.getItem('email'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('isCreator');
    localStorage.removeItem('email');
    handleStorage(); // force update locally
    navigate('/login');
  };

  // Helper to sync state before navigating
  const handleStorage = () => {
      setToken(null);
      setIsAdmin(false);
      setIsCreator(false);
      setEmail(null);
  };

  return (
    <nav className="glass-panel" style={{ margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Vote size={28} color="var(--primary)" />
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>SecureVote</span>
      </Link>
      
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>Alegeri</Link>
        {(isAdmin || isCreator) && (
          <>
            <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#c084fc', textDecoration: 'none', fontWeight: 500 }}>
              Panou Control
            </Link>
            <Link to="/ai-insights" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#c084fc', textDecoration: 'none', fontWeight: 500 }}>
              <BarChart size={18} /> AI Analiză
            </Link>
          </>
        )}
        {!token ? (
          <Link to="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            <LogIn size={18} /> Autentificare
          </Link>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{email}</span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              <LogOut size={18} /> Ieșire
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
