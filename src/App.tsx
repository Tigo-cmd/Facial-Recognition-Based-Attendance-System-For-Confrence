import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConferenceProvider } from './context/ConferenceContext';
import { useFaceAPI } from './hooks/useFaceAPI';
import { Layout } from './components/Layout';
import { Registration } from './pages/Registration';
import { Attendance } from './pages/Attendance';
import { Dashboard } from './pages/Dashboard';
import { AlertCircle, Loader } from 'lucide-react';

function AppContent() {
  const { isLoaded, error } = useFaceAPI();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading face recognition models...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment on first load</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Setup Required</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please ensure the face-api.js models are available in the public/models directory
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ConferenceProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/register" replace />} />
            <Route path="/register" element={<Registration />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Layout>
      </ConferenceProvider>
    </Router>
  );
}

function App() {
  return <AppContent />;
}

export default App;