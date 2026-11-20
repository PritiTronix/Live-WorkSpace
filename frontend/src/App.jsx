import React from 'react';
import AppRoutes from './routes';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#141529]">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </div>
  );
}

export default App;
