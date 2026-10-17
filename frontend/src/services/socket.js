import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'https://resqmesh-ai-2.onrender.com';

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

export default socket;
