import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '') 
  : 'http://localhost:4000';

export const socket = io(URL, {
  autoConnect: true,
  transports: ['websocket'],
});
