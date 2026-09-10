import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Ou de onde você puxa o estado de login

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles?: ('TEACHER' | 'STUDENT')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  // Se não estiver logado, manda para a tela inicial de login, mas SALVA onde ele estava no state
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Se houver restrição de perfil (Ex: Aluno tentando entrar na área do Professor)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redireciona para a rota padrão baseada no cargo dele, sem quebrar o histórico
    return <Navigate to={user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard'} replace />;
  }

  return children;
};