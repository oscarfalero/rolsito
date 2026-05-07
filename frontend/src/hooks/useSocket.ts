import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';
import { GameMessage } from '../types';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  messages: GameMessage[];
  currentTurn: { userId: string; username: string; displayName?: string } | null;
  isMyTurn: boolean;
  isDmTyping: boolean;
  typingUsers: string[];
  players: any[];
  sendAction: (content: string, characterId?: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
}

export function useSocket(campaignId: string): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState<any>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isDmTyping, setIsDmTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io('http://localhost:4000/game', {
      auth: { token },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('campaign:join', { campaignId });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('campaign:joined', (data) => {
      setPlayers(data.players || []);
      setCurrentTurn(data.currentTurn);
      setIsMyTurn(data.isYourTurn);
    });

    newSocket.on('player:joined', (data) => {
      setPlayers((prev) => [...prev, data]);
    });

    newSocket.on('player:left', (data) => {
      setPlayers((prev) => prev.filter((p) => p.userId !== data.userId));
    });

    newSocket.on('action:received', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          senderType: 'player',
          senderId: data.senderId,
          characterId: data.characterId,
          characterName: data.characterName,
          content: data.content,
          createdAt: data.createdAt,
        },
      ]);
      setIsDmTyping(false);
    });

    newSocket.on('dm:typing', () => {
      setIsDmTyping(true);
    });

    newSocket.on('dm:response', (data) => {
      setIsDmTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          senderType: 'dm',
          content: data.content,
          createdAt: data.createdAt,
        },
      ]);
    });

    newSocket.on('turn:changed', (data) => {
      setCurrentTurn(data);
      setIsMyTurn(data.userId === user?.id);
    });

    newSocket.on('typing:update', (data) => {
      setTypingUsers(data.usernames || []);
    });

    newSocket.on('error', (data) => {
      console.error('Socket error:', data);
      alert(`Error: ${data.message}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('campaign:leave', { campaignId });
      newSocket.close();
    };
  }, [campaignId, user?.id]);

  const sendAction = useCallback(
    (content: string, characterId?: string) => {
      if (socket && isConnected) {
        socket.emit('action:submit', {
          campaignId,
          content,
          characterId,
        });
      }
    },
    [socket, isConnected, campaignId],
  );

  const startTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing:start', { campaignId });
    }
  }, [socket, isConnected, campaignId]);

  const stopTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing:stop', { campaignId });
    }
  }, [socket, isConnected, campaignId]);

  return {
    socket,
    isConnected,
    messages,
    currentTurn,
    isMyTurn,
    isDmTyping,
    typingUsers,
    players,
    sendAction,
    startTyping,
    stopTyping,
  };
}
