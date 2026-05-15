import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AIInsights from './pages/AIInsights';
import AdminPanel from './pages/AdminPanel';

const App = () => {
  return (
    <>
      <Navbar />
      <div className="container animate-fade-in">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </>
  );
};

export default App;
