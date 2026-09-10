import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Palette } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Tema Atual: ${
        theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Cinza Grafite'
      } (Clique para alternar)`}
      className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800/90 rounded-2xl shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center text-slate-300 hover:text-white active:scale-95"
    >
      {theme === 'dark' && <Moon className="w-4 h-4 text-blue-400" />}
      {theme === 'light' && <Sun className="w-4 h-4 text-amber-400" />}
      {theme === 'zinc' && <Palette className="w-4 h-4 text-purple-400" />}
    </button>
  );
};

export default ThemeToggle;