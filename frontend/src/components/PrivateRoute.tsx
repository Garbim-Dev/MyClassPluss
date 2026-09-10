import React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  // ⚡ Busca a chave unificada correta do MyClassPluss e fallbacks antigos
  const token =
    localStorage.getItem('@MyClassPluss:token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('@OffClass:token');

  const userStr = localStorage.getItem('user');

  // Se não houver token ou dados de usuário, redireciona para a home
  if (!token || !userStr) {
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    // Opcional: valida se é professor
    if (user.role && user.role !== 'PROFESSOR') {
      return <Navigate to="/" replace />;
    }
  } catch (e) {
    // Se o JSON estiver corrompido, limpa e manda para o login
    localStorage.clear();
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;