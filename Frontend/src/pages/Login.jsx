import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const response = await api.post(endpoint, { email, password });

      if (!isRegistering) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.role);
        localStorage.setItem('email', response.data.email);
        navigate('/'); // Redirect to dashboard
      } else {
        setIsRegistering(false);
        setError("Cont creat cu succes! Te poți autentifica acum."); // Reusing error state for generic message
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("O eroare neașteptată a avut loc la conectarea la server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', color: 'white' }}>{isRegistering ? 'Creare Cont Nou' : 'Autentificare'}</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem' }}>Folosește adresa ta de email</p>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderLeft: '4px solid #ef4444', marginBottom: '1.5rem', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Adresa de Email</label>
            <input
              type="email"
              placeholder="exemplu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Parola</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Se procesează...' : (isRegistering ? 'Creare Cont' : 'Logare')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          {isRegistering ? 'Ai deja cont? ' : 'Nu ai cont? '}
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
          >
            {isRegistering ? 'Loghează-te' : 'Înregistrează-te'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
