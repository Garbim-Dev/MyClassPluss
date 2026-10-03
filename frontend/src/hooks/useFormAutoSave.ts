import { useEffect, useRef } from 'react';

/**
 * Hook universal que salva e restaura rascunhos de qualquer formulário automaticamente,
 * prevenindo perdas por tela de bloqueio do Windows, fechamento acidental ou reload.
 *
 * @param formKey Identificador único do formulário (ex: '@draft:quiz', '@draft:formal_exam')
 * @param state Objeto contendo os dados do formulário
 * @param onRestore Callback disparado ao carregar para repor os dados salvos
 * @param isEditing Se estiver editando algo consolidado do banco, desativa o autosave
 */
export function useFormAutoSave<T extends Record<string, any>>(
  formKey: string,
  state: T,
  onRestore: (savedData: T) => void,
  isEditing: boolean = false
) {
  const isRestoredRef = useRef(false);

  // 1. Restauração automática ao montar o componente
  useEffect(() => {
    if (isEditing || isRestoredRef.current) return;

    try {
      const raw = localStorage.getItem(formKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          onRestore(parsed);
        }
      }
    } catch (e) {
      console.warn(`[AutoSave] Falha ao restaurar rascunho de ${formKey}:`, e);
    } finally {
      isRestoredRef.current = true;
    }
  }, [formKey, isEditing]);

  // 2. Gravação em tempo real (Debounced de 400ms para performance)
  useEffect(() => {
    if (isEditing || !isRestoredRef.current) return;

    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(formKey, JSON.stringify(state));
      } catch (e) {
        console.warn(`[AutoSave] Erro ao gravar rascunho de ${formKey}:`, e);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [formKey, state, isEditing]);

  // Função utilitária para limpar o rascunho quando salvar ou cancelar
  const clearDraft = () => {
    try {
      localStorage.removeItem(formKey);
    } catch (e) {}
  };

  return { clearDraft };
}