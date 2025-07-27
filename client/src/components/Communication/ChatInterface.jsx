import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { PaperAirplaneIcon, PhotoIcon, MicrophoneIcon, FaceSmileIcon } from '@heroicons/react/24/outline';
import { HeartIcon, HandThumbUpIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const ChatInterface = ({ sessionId, isVisible = true }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Join session chat room
    socket.emit('join-session-chat', sessionId);

    // Listen for new messages
    socket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    // Listen for typing indicators
    socket.on('user-typing', (data) => {
      if (data.userId !== user.id) {
        setTypingUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }, 3000);
      }
    });

    // Listen for message reactions
    socket.on('message-reaction', (data) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
    });

    return () => {
      socket.off('new-message');
      socket.off('user-typing');
      socket.off('message-reaction');
      socket.emit('leave-session-chat', sessionId);
    };
  }, [socket, sessionId, user.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    try {
      const messageData = {
        sessionId,
        message: newMessage,
        type: 'text',
        file: selectedFile,
        timestamp: new Date().toISOString()
      };

      if (selectedFile) {
        // Handle file upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('sessionId', sessionId);
        formData.append('message', newMessage);

        // Upload file and send message
        const response = await fetch('/api/chat/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          messageData.fileUrl = result.fileUrl;
          messageData.fileName = selectedFile.name;
          messageData.fileType = selectedFile.type;
        }
      }

      socket.emit('send-message', messageData);
      setNewMessage('');
      setSelectedFile(null);
      setIsTyping(false);
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing-start', { sessionId, userName: user.name });
    }

    // Clear typing indicator after 1 second of no typing
    clearTimeout(window.typingTimer);
    window.typingTimer = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing-stop', { sessionId });
    }, 1000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setSelectedFile(new File([audioBlob], 'voice-message.wav', { type: 'audio/wav' }));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Could not access microphone');
      console.error('Error starting recording:', error);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const addReaction = (messageId, reaction) => {
    socket.emit('add-reaction', {
      messageId,
      reaction,
      sessionId
    });
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.user.id === user.id;
    
    return (
      <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwnMessage 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-800'
        }`}>
          {!isOwnMessage && (
            <div className="text-xs font-semibold mb-1 opacity-75">
              {message.user.name}
              <span className="ml-2 px-2 py-1 bg-opacity-20 bg-white rounded text-xs">
                {message.user.role}
              </span>
            </div>
          )}
          
          {message.type === 'text' && (
            <div className="break-words">{message.message}</div>
          )}
          
          {message.type === 'file' && (
            <div className="space-y-2">
              {message.message && <div className="break-words">{message.message}</div>}
              <div className="flex items-center space-x-2 bg-opacity-20 bg-white rounded p-2">
                <PhotoIcon className="h-5 w-5" />
                <a 
                  href={message.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm underline hover:no-underline"
                >
                  {message.fileName}
                </a>
              </div>
            </div>
          )}
          
          {message.type === 'voice' && (
            <div className="space-y-2">
              <audio controls className="w-full">
                <source src={message.fileUrl} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs opacity-75">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
            
            <div className="flex space-x-1">
              <button
                onClick={() => addReaction(message.id, 'like')}
                className="hover:scale-110 transition-transform"
              >
                <HandThumbUpIcon className="h-4 w-4" />
                {message.reactions?.like > 0 && (
                  <span className="text-xs ml-1">{message.reactions.like}</span>
                )}
              </button>
              <button
                onClick={() => addReaction(message.id, 'heart')}
                className="hover:scale-110 transition-transform"
              >
                <HeartIcon className="h-4 w-4" />
                {message.reactions?.heart > 0 && (
                  <span className="text-xs ml-1">{message.reactions.heart}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-96 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="text-sm font-semibold text-gray-800">Session Chat</h3>
        <p className="text-xs text-gray-600">{messages.length} messages</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(renderMessage)}
        
        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="text-xs text-gray-500 italic">
            {typingUsers.map(u => u.userName).join(', ')} 
            {typingUsers.length === 1 ? ' is' : ' are'} typing...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PhotoIcon className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">{selectedFile.name}</span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <PhotoIcon className="h-5 w-5" />
          </button>
          
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            className={`p-2 transition-colors ${
              isRecording 
                ? 'text-red-500 hover:text-red-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MicrophoneIcon className="h-5 w-5" />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <button
            type="submit"
            disabled={!newMessage.trim() && !selectedFile}
            className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        className="hidden"
      />
    </div>
  );
};

export default ChatInterface;
