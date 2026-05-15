import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle, X, BarChart2 } from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedElection, setSelectedElection] = useState(null);
  const [voteError, setVoteError] = useState(null);
  const [voteSuccess, setVoteSuccess] = useState(null);
  const [family, setFamily] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [familyMsg, setFamilyMsg] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await api.get('/api/vote', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setElections(res.data || []);

      const famRes = await api.get('/api/family/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (famRes.data.family) {
        setFamily(famRes.data.family);
        setIsCreator(famRes.data.isCreator);
        localStorage.setItem('isCreator', famRes.data.isCreator ? 'true' : '');
      } else {
        setFamily(null);
        setIsCreator(false);
        localStorage.removeItem('isCreator');

        const invRes = await api.get('/api/family/invitations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInvitations(invRes.data);
      }
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error("Eroare fetching: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVote = async (candidateId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setVoteError("Trebuie să te autentifici mai întâi!");
      return;
    }

    try {
      setVoteError(null);
      await api.post('/api/vote/cast',
        { electionId: selectedElection.id, candidateId, tokenUserId: "mocked-user-id-from-token" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVoteSuccess("Votul tău anonim a fost înregistrat cu succes!");
      setTimeout(() => { setVoteSuccess(null); setSelectedElection(null); }, 3000);
    } catch (err) {
      setVoteError(err.response?.data?.error || "Eroare necunoscută la votare");
    }
  };

  const handleCreateFamily = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/api/family/create', { name: newFamilyName }, { headers: { Authorization: `Bearer ${token}` } });
      setFamily(res.data.family);
      setIsCreator(true);
      localStorage.setItem('isCreator', 'true');
      window.dispatchEvent(new Event('storage'));
      setFamilyMsg("Familie creată cu succes!");
    } catch (err) {
      setFamilyMsg(err.response?.data?.error || "Eroare la creare");
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.post('/api/family/invite', { email: inviteEmail }, { headers: { Authorization: `Bearer ${token}` } });
      setFamilyMsg(`Invitație trimisă către ${inviteEmail}!`);
      setInviteEmail('');
    } catch (err) {
      setFamilyMsg(err.response?.data?.error || "Eroare la invitare");
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await api.post('/api/family/remove-member', { userId }, { headers: { Authorization: `Bearer ${token}` } });
      setFamilyMsg("Membru eliminat.");
      fetchData();
    } catch (err) {
      setFamilyMsg(err.response?.data?.error || "Eroare la eliminare membru");
    }
  };

  const handleLeaveFamily = async () => {
    try {
      const token = localStorage.getItem('token');
      await api.post('/api/family/leave', {}, { headers: { Authorization: `Bearer ${token}` } });
      setFamilyMsg("Ai părăsit familia.");
      fetchData();
    } catch (err) {
      setFamilyMsg(err.response?.data?.error || "Eroare la părăsirea familiei");
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/api/family/invitations/${inviteId}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Eroare la acceptare");
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/api/family/invitations/${inviteId}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setInvitations(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (err) {
      alert(err.response?.data?.error || "Eroare la respingere");
    }
  };

  return (
    <>
      <div style={{ marginBottom: '3rem' }}>
        {familyMsg && <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.2)', color: '#10B981', borderRadius: '8px', marginBottom: '1rem' }}>{familyMsg}</div>}

        {!family ? (
          <div style={{ marginTop: '2rem' }}>
            <h3>Nu faci parte din nicio familie</h3>
            <p style={{ color: 'var(--text-muted)' }}>Creează una nouă pentru a invita alți membri și a lansa sondaje private.</p>
            <form onSubmit={handleCreateFamily} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <input type="text" placeholder="Nume Familie (ex: Echipa IT)" required value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} style={{ padding: '0.75rem', borderRadius: '4px', border: 'none', flex: 1 }} />
              <button type="submit" className="btn">Creează</button>
            </form>

            {invitations.length > 0 && (
              <div style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
                <h4>Invitații în așteptare ({invitations.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {invitations.map(inv => (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '6px' }}>
                      <span>Familia: <strong>{inv.family.name}</strong></span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleAcceptInvite(inv.id)} className="btn" style={{ background: '#10B981', padding: '0.4rem 1rem' }}>Acceptă</button>
                        <button onClick={() => handleRejectInvite(inv.id)} className="btn" style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.4rem 1rem' }}>Refuză</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2>Familia: {family.name}</h2>
            <p style={{ color: 'gray', margin: 0 }}>Membri: {family.members?.length || 0}</p>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Lista Membrilor</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {family.members?.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>{m.email} {m.id === family.creatorId && '(Creator)'}</span>
                    {isCreator && m.id !== family.creatorId && (
                      <button onClick={() => handleRemoveMember(m.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>Elimină</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isCreator ? (
              <form onSubmit={handleInvite} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <input type="email" placeholder="Email utilizator existent" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} style={{ padding: '0.75rem', borderRadius: '4px', border: 'none', flex: 1 }} />
                <button type="submit" className="btn">Adaugă Membru</button>
              </form>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <button onClick={handleLeaveFamily} className="btn" style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}>
                  Părăsește Familia
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>Alegeri Globale</h1>
        <p style={{ marginBottom: '2rem' }}>Sondaje și alegeri publice (Platformă Securizată).</p>

        {loading ? <p>Se încarcă alegerile globale...</p> : (
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '3rem' }}>
            {elections.filter(e => e.isGlobal).map((election) => (
              <div key={election.id} className="glass-panel" style={{ transition: 'all 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: 'white', flex: 1 }}>{election.title}</h3>
                  <span style={{
                    background: election.status === 'Activ' || election.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: election.status === 'Activ' || election.isActive ? '#10B981' : '#EF4444',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    marginLeft: '1rem'
                  }}>
                    {election.status === 'Activ' || election.isActive ? 'Activ' : 'Inactiv'}
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Candidați Înscriși: {election.candidates?.length || 0}</p>

                <button
                  className="btn"
                  style={{ width: '100%', opacity: 1, cursor: 'pointer', background: election.isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}
                  onClick={() => setSelectedElection(election)}
                >
                  {election.isActive ? (
                    <>Mergi la Vot <ChevronRight size={18} /></>
                  ) : (
                    <>Vezi Rezultatele <BarChart2 size={18} style={{ marginLeft: '4px' }} /></>
                  )}
                </button>
              </div>
            ))}
            {elections.filter(e => e.isGlobal).length === 0 && <p style={{ color: 'gray' }}>Nu există sondaje globale momentan.</p>}
          </div>
        )}

        <h1 style={{ marginBottom: '0.5rem' }}>Alegerile Familiei</h1>
        <p style={{ marginBottom: '2rem' }}>Sondaje private în cadrul grupului tău.</p>

        {loading ? <p>Se încarcă...</p> : (
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {elections.filter(e => !e.isGlobal).map((election) => (
              <div key={election.id} className="glass-panel" style={{ transition: 'all 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: 'white', flex: 1 }}>{election.title}</h3>
                  <span style={{
                    background: election.status === 'Activ' || election.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: election.status === 'Activ' || election.isActive ? '#10B981' : '#EF4444',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    marginLeft: '1rem'
                  }}>
                    {election.status === 'Activ' || election.isActive ? 'Activ' : 'Inactiv'}
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Candidați Înscriși: {election.candidates?.length || 0}</p>

                <button
                  className="btn"
                  style={{ width: '100%', opacity: 1, cursor: 'pointer', background: election.isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}
                  onClick={() => setSelectedElection(election)}
                >
                  {election.isActive ? (
                    <>Mergi la Vot <ChevronRight size={18} /></>
                  ) : (
                    <>Vezi Rezultatele <BarChart2 size={18} style={{ marginLeft: '4px' }} /></>
                  )}
                </button>
              </div>
            ))}
            {elections.filter(e => !e.isGlobal).length === 0 && <p style={{ color: 'gray' }}>Nu faci parte dintr-o familie cu sondaje active.</p>}
          </div>
        )}
      </div>

      {/* Voting / Results Modal */}
      {selectedElection && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
            <button onClick={() => { setSelectedElection(null); setVoteError(null); }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={24} />
            </button>

            <h2 style={{ color: 'white', marginBottom: '1.5rem', paddingRight: '2rem' }}>{selectedElection.title}</h2>

            {selectedElection.isActive ? (
              // ACTIVE ELECTION: Let them vote
              voteSuccess ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <CheckCircle size={64} color="var(--secondary)" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ color: 'var(--secondary)' }}>{voteSuccess}</h3>
                </div>
              ) : (
                <>
                  {voteError && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{voteError}</p>}
                  <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Alege candidatul dorit. Acest proces este complet anonim.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedElection.candidates?.map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'white', fontWeight: 500 }}>{c.name}</span>
                        <button className="btn" onClick={() => handleVote(c.id)}>Votează</button>
                      </div>
                    ))}
                    {(!selectedElection.candidates || selectedElection.candidates.length === 0) && (
                      <p style={{ color: 'gray', fontStyle: 'italic' }}>Nu există candidați înregistrați momentan.</p>
                    )}
                  </div>
                </>
              )
            ) : (
              // INACTIVE ELECTION: Show Results
              <div>
                <p style={{ marginBottom: '1.5rem', color: '#10B981', fontWeight: 'bold' }}>Sondaj Închis. Iată rezultatele finale:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedElection.candidates?.sort((a, b) => (b.votes || 0) - (a.votes || 0)).map((c, i) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: i === 0 ? '1px solid #c084fc' : '1px solid var(--border-color)' }}>
                      <span style={{ color: 'white', fontWeight: 500 }}>{i + 1}. {c.name} {i === 0 && '🏆'}</span>
                      <span style={{ fontWeight: 'bold', color: 'white' }}>{c.votes || 0} vot(uri)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
