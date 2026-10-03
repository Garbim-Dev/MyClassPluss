import React, { useEffect, useRef } from 'react';

/**
 * Mantém a aplicação viva, impede suspensão do sistema operacional
 * durante sessões ativas e restabelece conexões ao retornar da tela de bloqueio.
 */
export const KeepAliveGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      // Alguns navegadores exigem interação do usuário antes de conceder
    }
  };

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Quando o usuário volta do PIN do Windows, reassume o bloqueio de suspensão
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  return <>{children}</>;
};