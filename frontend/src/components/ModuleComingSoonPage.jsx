import React from 'react';
import { ShieldAlert, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ModuleComingSoonPage = ({ title, description, icon: Icon = Clock }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6">
        <Icon className="w-12 h-12" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-3">{title}</h1>
      <p className="text-slate-400 max-w-lg mb-8 leading-relaxed">
        {description || 'This module backend endpoints are active and verified. The specialized enterprise UI screens are scheduled for Sprint 2.'}
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/workspace/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <button
          onClick={() => navigate('/workspace/tickets')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors text-sm font-medium"
        >
          View Active Tickets
        </button>
      </div>
    </div>
  );
};

export default ModuleComingSoonPage;
