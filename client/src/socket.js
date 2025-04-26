import { io } from 'socket.io-client';

export const socket = io('http://localhost:5000', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});