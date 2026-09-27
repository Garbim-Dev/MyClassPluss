import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    // Usa o IP e a porta de onde o front está rodando
    const host = window.location.hostname;
    socket = io(`http://${host}:3000`, {
      transports: ['websocket', 'polling'], // Fallback para polling se websocket oscilar
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      timeout: 10000,
    });
  }
  return socket;
};