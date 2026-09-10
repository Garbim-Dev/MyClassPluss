import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  KeyRound,
  X,
  Send,
  GraduationCap,
  Building2,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados do Modal de Esqueci Minha Senha
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await api.post('/auth/register-teacher', { name, email, password });
      }

      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;

      localStorage.setItem('@MyClassPluss:token', token);
      localStorage.setItem('user', JSON.stringify(user));

      if (user.role === 'PROFESSOR') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/student/portal', { replace: true });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response?.data?.message.join(', ')
          : 'Erro na autenticação. Verifique os dados informados.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotMessage(
        res.data?.message || 'Se o e-mail estiver cadastrado, você receberá um link de redefinição.'
      );
    } catch (err: any) {
      setForgotError(
        err.response?.data?.message || 'E-mail não encontrado ou erro de comunicação.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      {/* HEADER / TOPO */}
      <header className="max-w-7xl mx-auto w-full p-6 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center overflow-hidden">
            <img
              src="/icone.png"
              alt="MyClassPluss Ícone"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white block">MyClassPluss</span>
            <span className="text-[10px] tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
              Gestão Acadêmica Pessoal
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
          Plataforma Integrada v2.0
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (HERO + LOGIN) */}
      <main className="max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto">
        {/* COLUNA ESQUERDA: APRESENTAÇÃO */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Controle total de Instituições, Cursos, Chamadas e Notas</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none text-white">
            Gestão acadêmica <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              sem complicação.
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
            O <strong>MyClassPluss</strong> centraliza o planejamento do instrutor: cadastre suas instituições, gerencie turmas, faça diários de chamada rápidos e conduza aulas interativas cujos resultados alimentam automaticamente o boletim oficial.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl space-y-1">
              <Building2 className="w-5 h-5 text-blue-400 mb-2" />
              <h3 className="font-bold text-white text-xs">Instituições & Cursos</h3>
              <p className="text-[11px] text-slate-400">Organize toda a sua grade curricular por polo ou escola.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl space-y-1">
              <BookOpen className="w-5 h-5 text-purple-400 mb-2" />
              <h3 className="font-bold text-white text-xs">Diário & Notas</h3>
              <p className="text-[11px] text-slate-400">Chamada ágil e pontuação sincronizada em tempo real.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl space-y-1">
              <GraduationCap className="w-5 h-5 text-emerald-400 mb-2" />
              <h3 className="font-bold text-white text-xs">Dossiê Completo</h3>
              <p className="text-[11px] text-slate-400">Relatórios oficiais de desempenho prontos para exportar.</p>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CAIXA DE AUTENTICAÇÃO */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-white">
              {isRegistering ? 'Criar Conta de Instrutor' : 'Acessar o MyClassPluss'}
            </h2>
            <p className="text-xs text-slate-400">
              {isRegistering
                ? 'Preencha os dados abaixo para iniciar sua gestão'
                : 'Entre com suas credenciais para gerenciar suas turmas'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-400">Senha de Acesso</label>
                {!isRegistering && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotError('');
                      setForgotMessage('');
                      setIsForgotModalOpen(true);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isRegistering ? 'Concluir Cadastro' : 'Entrar na Plataforma'}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {isRegistering ? 'Já possui cadastro? Faça login' : 'Novo instrutor? Crie sua conta aqui'}
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto w-full p-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        MyClassPluss • Todos os direitos reservados.
      </footer>

      {/* MODAL DE RECUPERAÇÃO DE SENHA */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="p-3.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl inline-block mx-auto">
                <KeyRound className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Recuperar Senha</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Informe o seu e-mail cadastrado. Enviaremos um link seguro para você redefinir a sua senha.
              </p>
            </div>

            {forgotError && (
              <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotMessage ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-emerald-300">{forgotMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer border border-slate-700"
                >
                  Voltar para o Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">E-mail Cadastrado</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer border border-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;