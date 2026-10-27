import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom React Hook to connect to the Contest Socket.IO namespace,
 * authenticate with the user's JWT, and join the contest room.
 */
export function useContestSocket(contestId) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [standings, setStandings] = useState(null);
  const [stats, setStats] = useState(null);
  const [contestStatus, setContestStatus] = useState(null);
  const [latestVerdict, setLatestVerdict] = useState(null);

  useEffect(() => {
    if (!contestId) return;

    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const socketHost = apiUrl.replace(/\/api\/?$/, '');

    const socket = io(socketHost, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('contest:join', { contestId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('standings:update', (data) => {
      if (data.contestId === contestId || data.contestId?.toString() === contestId?.toString()) {
        setStandings(data);
      }
    });

    socket.on('stats:update', (data) => {
      if (data.contestId === contestId || data.contestId?.toString() === contestId?.toString()) {
        setStats(data.stats);
      }
    });

    socket.on('contest:started', (data) => {
      if (data.contestId === contestId || data.contestId?.toString() === contestId?.toString()) {
        setContestStatus('running');
      }
    });

    socket.on('contest:ended', (data) => {
      if (data.contestId === contestId || data.contestId?.toString() === contestId?.toString()) {
        setContestStatus('ended');
      }
    });

    socket.on('submission:update', (data) => {
      if (data.contestId === contestId || data.contestId?.toString() === contestId?.toString()) {
        setLatestVerdict(data);
      }
    });

    return () => {
      if (socket.connected) {
        socket.emit('contest:leave', { contestId });
      }
      socket.disconnect();
    };
  }, [contestId]);

  return {
    socket: socketRef.current,
    isConnected,
    standings,
    stats,
    contestStatus,
    latestVerdict,
  };
}
