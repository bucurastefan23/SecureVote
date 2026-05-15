import React, { useState, useEffect } from 'react';
import api from '../api';
import { ShieldCheck, BarChart2, StopCircle } from 'lucide-react';

const AdminPanel = () => {
    const [title, setTitle] = useState('');
    const [candidatesInput, setCandidatesInput] = useState('');
    const [durationHours, setDurationHours] = useState('24');
    const [status, setStatus] = useState('');
    const [elections, setElections] = useState([]);

    const fetchElections = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/vote/admin/elections',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setElections(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchElections();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setStatus('Se procesează...');
        const token = localStorage.getItem('token');

        try {
            const candidates = candidatesInput.split(',').map(s => s.trim()).filter(s => s.length > 0);

            await api.post('/api/vote/admin/create-election',
                { title, candidates, durationHours: parseFloat(durationHours) || 24 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStatus('Alegerea a fost lansată cu succes!');
            setTitle('');
            setCandidatesInput('');
            fetchElections();
        } catch (err) {
            setStatus(err.response?.data?.error || 'A apărut o eroare la publicare.');
        }
    };

    const handleStop = async (id) => {
        const token = localStorage.getItem('token');
        try {
            await api.put(`/api/vote/admin/elections/${id}/stop`, {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchElections();
        } catch (err) {
            alert(err.response?.data?.error || "Eroare la oprire");
        }
    };

    const handleHide = async (id) => {
        const token = localStorage.getItem('token');
        try {
            await api.put(`/api/vote/admin/elections/${id}/hide`, {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchElections();
        } catch (err) {
            alert(err.response?.data?.error || "Eroare la ascundere");
        }
    };

    return (
        <div style={{ paddingBottom: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem', marginBottom: '3rem' }}>
                <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '600px', borderTop: '4px solid #c084fc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <ShieldCheck size={32} color="#c084fc" />
                        <h2 style={{ color: 'white', margin: 0 }}>Panou de Control (Admin)</h2>
                    </div>

                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        De aici poți lansa noi sondaje pentru familia/grupul tău (sau globale dacă ești super admin).
                    </p>

                    {status && (
                        <div style={{ padding: '1rem', marginBottom: '1.5rem', background: status.includes('Alegerea') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: status.includes('Alegerea') ? '#10B981' : '#fca5a5', borderRadius: '8px' }}>
                            {status}
                        </div>
                    )}

                    <form onSubmit={handleCreate}>
                        <div className="input-group">
                            <label>Titlul Alegerii (Ex: Șef de Echipă Grupa X)</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                        </div>

                        <div className="input-group">
                            <label>Candidați (despărțiți prin virgulă)</label>
                            <input
                                type="text"
                                placeholder="Ex: Dan, Ana, Mihai..."
                                value={candidatesInput}
                                onChange={e => setCandidatesInput(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0' }}>Durata sondajului (ore):</label>
                            <input
                                type="number"
                                placeholder="ex: 24"
                                value={durationHours}
                                onChange={(e) => setDurationHours(e.target.value)}
                                className="input-field"
                                style={{ width: '100%' }}
                                min="0.1"
                                step="0.1"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}>
                            Lansează Sondajul Securizat
                        </button>
                    </form>
                </div>
            </div>

            <div style={{ margin: '0 auto', maxWidth: '800px' }}>
                <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Situația Alegerilor & Rezultate live</h2>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {elections.map(e => (
                        <div key={e.id} className="glass-panel" style={{ borderLeft: e.isActive ? '4px solid #10B981' : '4px solid #EF4444' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3>
                                    {e.title}
                                    {e.isGlobal && <span style={{ fontSize: '0.75rem', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', marginLeft: '10px' }}>GLOBAL</span>}
                                    {e.isHidden && <span style={{ fontSize: '0.75rem', background: '#64748b', color: 'white', padding: '2px 8px', borderRadius: '12px', marginLeft: '10px' }}>ASCUNSĂ</span>}
                                </h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {e.isActive ? (
                                        <button onClick={() => handleStop(e.id)} className="btn btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444', padding: '0.25rem 0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                            <StopCircle size={16} /> Oprește Votul
                                        </button>
                                    ) : (
                                        <span style={{ color: '#ef4444', fontWeight: 'bold', alignSelf: 'center', marginRight: '0.5rem' }}>ÎNCHISĂ</span>
                                    )}
                                    {!e.isHidden && (
                                        <button onClick={() => handleHide(e.id)} className="btn btn-secondary" style={{ color: '#64748b', borderColor: '#64748b', padding: '0.25rem 0.75rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                            Ascunde
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p style={{ margin: '1rem 0' }}>Total Voturi: <strong>{e.totalVotes}</strong></p>

                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#cbd5e1' }}>
                                    <BarChart2 size={18} /> Clasament Scoruri
                                </div>
                                {e.candidatesCount.sort((a, b) => b.votes - a.votes).map((c, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span>{i + 1}. {c.name}</span>
                                        <strong>{c.votes} vot(uri) {i === 0 && e.totalVotes > 0 && e.isActive === false && '🏆'}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {elections.length === 0 && <p style={{ color: 'gray' }}>Nu există nicio alegere publicată.</p>}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
