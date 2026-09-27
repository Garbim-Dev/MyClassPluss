import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { Home } from './pages/public/Home';
import ResetPassword from './pages/auth/ResetPassword';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { StudentJoin } from './pages/student/StudentJoin';
import { StudentPortal } from './pages/student/StudentPortal';
import { PrivateRoute } from './components/PrivateRoute';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Tela Inicial com Login e Acesso Rápido */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Home />} />

          {/* Rota Pública para Redefinição de Senha */}
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Rota Protegida do Instrutor */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <TeacherDashboard />
              </PrivateRoute>
            }
          />

          {/* Entrada do Aluno via QR Code */}
          <Route path="/join" element={<StudentJoin />} />
          <Route path="/student/join" element={<StudentJoin />} />

          {/* ⚡ Portal de Notas / Boletim do Aluno (com suporte às duas rotas) */}
          <Route path="/portal-aluno" element={<StudentPortal />} />
          <Route path="/student/portal" element={<StudentPortal />} />

          {/* Redirecionamento padrão */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;