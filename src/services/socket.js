import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:8000';

// Create a single shared socket instance
const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
    console.log('[Socket.IO] Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
    console.log('[Socket.IO] Disconnected:', reason);
});

socket.on('connect_error', (err) => {
    console.warn('[Socket.IO] Connection error:', err.message);
});

export default socket;
