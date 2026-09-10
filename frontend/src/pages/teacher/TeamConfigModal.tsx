import React, { useState } from 'react';
import { Users, X, Shuffle, ShieldCheck } from 'lucide-react';

export interface TeamItem {
  id: string;
  name: string;
  color: string;
}

export interface TeamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTeams: (isTeamMode: boolean, teams: TeamItem[], autoAssign: boolean) => void;
  studentCount: number;
}

const DEFAULT_TEAMS: TeamItem[] = [
  { id: 'alpha', name: 'Equipe Alpha', color: '#3b82f6' },
  { id: 'bravo', name: 'Equipe Bravo', color: '#10b981' },
  { id: 'charlie', name: 'Equipe Charlie', color: '#f59e0b' },
  { id: 'delta', name: 'Equipe Delta', color: '#ef4444' },
];

export const TeamConfigModal: React.FC<TeamConfigModalProps> = ({
  isOpen,
  onClose,
  onApplyTeams,
  studentCount,
}) => {
  const [isTeamMode, setIsTeamMode] = useState(true);
  const [teamCount, setTeamCount] = useState(2);
  const [teams, setTeams] = useState(DEFAULT_TEAMS);

  if (!isOpen) return null;

  const activeTeams = teams.slice(0, teamCount);

  const handleConfirm = (autoAssign: boolean) => {
    onApplyTeams(isTeamMode, activeTeams, autoAssign);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600/20 text-purple-400 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Modo Desafio em Equipes</h2>
              <p className="text-xs text-slate-400">Divida a turma em grupos para cooperarem nas respostas</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setIsTeamMode(false)}
              className={
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ' +
                (!isTeamMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white')
              }
            >
              Individual (Cada um por si)
            </button>
            <button
              type="button"
              onClick={() => setIsTeamMode(true)}
              className={
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ' +
                (isTeamMode ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white')
              }
            >
              Em Equipes (Grupos em Sala)
            </button>
          </div>

          {isTeamMode && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Quantidade de Equipes:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTeamCount(num)}
                      className={
                        'py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ' +
                        (teamCount === num
                          ? 'bg-purple-600/30 border-purple-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400')
                      }
                    >
                      {num} Times
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-400 block">Times Configurados:</span>
                <div className="grid grid-cols-2 gap-2">
                  {activeTeams.map((team, idx) => (
                    <div
                      key={team.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                      <input
                        value={team.name}
                        onChange={(e) => {
                          const updated = [...teams];
                          updated[idx].name = e.target.value;
                          setTeams(updated);
                        }}
                        className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
                <span>Alunos Conectados: <strong className="text-white">{studentCount}</strong></span>
                <span>Média ~{studentCount > 0 ? Math.ceil(studentCount / teamCount) : 0} por time</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {isTeamMode ? (
            <>
              <button
                type="button"
                onClick={() => handleConfirm(true)}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Shuffle className="w-4 h-4" />
                <span>Dividir Alunos Automaticamente</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirm(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-3 rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Salvar Times
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleConfirm(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 inline mr-1.5" />
              <span>Manter Modo Individual</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamConfigModal;