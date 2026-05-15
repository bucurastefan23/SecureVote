import React, { useState, useEffect } from 'react';
import api from '../api';
import { Cpu, ChevronRight, Activity } from 'lucide-react';


const AIInsights = () => {
    const [elections, setElections] = useState([]);
    const [selectedElection, setSelectedElection] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchElections = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await api.get('/api/vote/admin/elections', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setElections(res.data);
            } catch (e) {
                console.error("Nu s-au putut încărca alegerile");
            }
        };
        fetchElections();
    }, []);

    const handleAnalyze = async (electionId) => {
        setSelectedElection(electionId);
        setAnalysis(null);
        setError(null);
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/api/ai/analyze/${electionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalysis(res.data.analysis);
        } catch (err) {
            setError(err.response?.data?.error || "Eroare la contactarea AI-ului.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu color="#c084fc" /> AI Insights (Google Gemini)
            </h1>
            <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
                Modul Supervizare Electorală folosind Inteligența Artificială. Evaluează în timp real rezultatele și verifică gradul de suspiciune de fraudă.
            </p>

            {/* Select Election */}
            <h3 style={{ marginBottom: '1rem', color: 'white' }}>📋 Alege sondajul de analizat:</h3>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2rem' }}>
                {elections.map(e => (
                    <div key={e.id} onClick={() => handleAnalyze(e.id)} className="glass-panel" style={{ cursor: 'pointer', border: selectedElection === e.id ? '2px solid #c084fc' : '1px solid transparent', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, color: 'white' }}>{e.title}</h4>
                            <ChevronRight size={20} color="#c084fc" />
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Status: {e.isActive ? 'Active' : 'Închise'} | Total Voturi: {e.totalVotes}</p>
                    </div>
                ))}
            </div>

            {/* Display Analysis */}
            {selectedElection && (
                <div className="glass-panel animate-fade-in" style={{ borderLeft: '4px solid #c084fc', padding: '2rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: 'white' }}>
                        <Activity size={28} color="#c084fc" />
                        {loading ? 'AI Procesează Statistici...' : 'Raport Generat:'}
                    </h2>

                    {loading && (
                        <div style={{ color: '#cbd5e1', fontStyle: 'italic', padding: '1rem' }}>
                            Se trimit datele securizat către API-ul global Google Gemini 2.5 Flash... Așteaptă evaluarea.
                        </div>
                    )}

                    {error && (
                        <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                            <p style={{ margin: 0 }}>🚨 {error}</p>
                        </div>
                    )}

                    {!loading && analysis && (
                        <div style={{ color: '#e2e8f0', lineHeight: '1.6', fontSize: '1rem' }}>
                            {/* Rendering simple markdown/HTML safely for demo purposes */}
                            <div dangerouslySetInnerHTML={{ 
                                __html: analysis
                                    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #c084fc;">$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                    .replace(/\n/g, '<br/>') 
                            }} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIInsights;
