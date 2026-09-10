import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const host = window.location.hostname || 'localhost';
    socket = io(`http://${host}:3000`, {
      transports: ['websocket'], // ⚡ Força conexão WebSocket direta e instantânea (sem polling)
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      timeout: 5000,
    });
  }
  return socket;
};