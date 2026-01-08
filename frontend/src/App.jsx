import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GroupView from './pages/GroupView';
import JoinGroup from './pages/JoinGroup';
import Profile from './pages/Profile';
import SecureViewer from './pages/SecureViewer';
import Help from './pages/Help';
import ProtectedRoute from './components/ProtectedRoute';


import React from 'react';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/group/:groupId"
              element={
                <ProtectedRoute>
                  <GroupView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/view/:groupId/:pdfId"
              element={
                <ProtectedRoute>
                  <SecureViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/join/:inviteCode"
              element={
                <ProtectedRoute>
                  <JoinGroup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <Help />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
