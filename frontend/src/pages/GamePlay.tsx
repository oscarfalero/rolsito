import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { GameMessage } from '../types';

function ChatMessage({ message }: { message: GameMessage }) {
  if (message.senderType === 'dm') {
    return (
      <div className="mb-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            DM
          </div>
          <div className="flex-1">
            <div className="bg-purple-900 border border-purple-700 rounded-lg p-4">
              <p className="text-gray-200 whitespace-pre-wrap">{message.content}</p>
            </div>
            <span className="text-xs text-gray-500 mt-1">
              {new Date(message.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (message.senderType === 'system') {
    return (
      <div className="my-4 text-center">
        <span className="text-sm text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {message.characterName?.[0]?.toUpperCase() || 'P'}
        </div>
        <div className="flex-1">
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-indigo-400 mb-1">
              {message.characterName || 'Player'}
            </div>
            <p className="text-gray-200">{message.content}</p>
          </div>
          <span className="text-xs text-gray-500 mt-1">
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function GamePlay() {
  const { id } = useParams<{ id: string }>();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
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
  } = useSocket(id!);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isDmTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isMyTurn) return;

    sendAction(input.trim());
    setInput('');
    stopTyping();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    startTyping();
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const rollDice = (sides: number) => {
    if (!isMyTurn) return;
    const result = Math.floor(Math.random() * sides) + 1;
    sendAction(`[Rolls a d${sides}: ${result}]`);
  };

  return (
    <div className="h-screen bg-gray-900 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <Link to={`/campaigns/${id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">
            ← Back to Lobby
          </Link>
          <div className="mt-2 text-xs text-gray-500">
            {isConnected ? (
              <span className="text-green-400">● Connected</span>
            ) : (
              <span className="text-red-400">● Disconnected</span>
            )}
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">Players</h3>
          <div className="space-y-2">
            {players.map((player: any) => (
              <div
                key={player.userId}
                className={`flex items-center space-x-2 p-2 rounded ${
                  currentTurn?.userId === player.userId
                    ? 'bg-indigo-900 border border-indigo-700'
                    : 'bg-gray-700'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs">
                  {player.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{player.displayName || player.username}</div>
                  {currentTurn?.userId === player.userId && (
                    <div className="text-xs text-indigo-400">Current Turn</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">Turn Status</h3>
          {isMyTurn ? (
            <div className="text-green-400 text-sm font-medium">It's your turn!</div>
          ) : (
            <div className="text-gray-400 text-sm">
              Waiting for {currentTurn?.displayName || currentTurn?.username || '...'}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-lg mb-2">Welcome to the adventure!</p>
              <p className="text-sm">The DM is ready. Take your turn to begin.</p>
            </div>
          )}

          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}

          {isDmTyping && (
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                DM
              </div>
              <div className="bg-purple-900 border border-purple-700 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {typingUsers.length > 0 && (
            <div className="text-xs text-gray-500 italic">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4">
          {/* Dice shortcuts */}
          <div className="flex space-x-2 mb-3">
            {[4, 6, 8, 10, 12, 20].map((sides) => (
              <button
                key={sides}
                onClick={() => rollDice(sides)}
                disabled={!isMyTurn}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                d{sides}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              disabled={!isMyTurn || !isConnected}
              placeholder={
                !isConnected
                  ? 'Connecting...'
                  : isMyTurn
                  ? "What does your character do?"
                  : "Wait for your turn..."
              }
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isMyTurn || !input.trim() || !isConnected}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
