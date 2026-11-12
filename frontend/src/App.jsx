import React from 'react';
import AppRoutes from './routes';
import { AuthProvider } from './modules/auth';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-canvas-main text-text-primary">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}

export default App;
