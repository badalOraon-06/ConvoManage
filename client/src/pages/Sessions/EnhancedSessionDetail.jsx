import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import ChatInterface from '../../components/Communication/ChatInterface';
import QAInterface from '../../components/Communication/QAInterface';
import VideoConference from '../../components/Communication/VideoConference';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import {
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const EnhancedSessionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);

  useEffect(() => {
    fetchSessionData();
  }, [id]);

  useEffect(() => {
    if (socket && session) {
      // Join communication rooms
      socket.emit('join-session-chat', id);
      socket.emit('join-qa-room', id);
      socket.emit('join-video-room', id);

      // Listen for participant updates
      socket.on('participants-updated', (participants) => {
        setAttendeeCount(participants.length);
      });

      return () => {
        socket.emit('leave-session-chat', id);
        socket.emit('leave-qa-room', id);
        socket.emit('leave-video-room', id);
        socket.off('participants-updated');
      };
    }
  }, [socket, session, id]);

  const fetchSessionData = async () => {
    try {
      const response = await api.get(`/sessions/${id}`);
      setSession(response.data);
      setAttendeeCount(response.data.attendees?.length || 0);
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async () => {
    try {
      await api.post(`/sessions/${id}/join`);
      toast.success('Successfully joined the session!');
      fetchSessionData();
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error(error.response?.data?.error || 'Failed to join session');
    }
  };

  const handleLeaveSession = async () => {
    try {
      await api.post(`/sessions/${id}/leave`);
      toast.success('Successfully left the session');
      fetchSessionData();
    } catch (error) {
      console.error('Error leaving session:', error);
      toast.error(error.response?.data?.error || 'Failed to leave session');
    }
  };

  const startVideoCall = () => {
    setIsVideoCallActive(true);
    setActiveTab('video');
  };

  const endVideoCall = () => {
    setIsVideoCallActive(false);
    if (activeTab === 'video') {
      setActiveTab('overview');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Session not found</h2>
        <p className="text-gray-600 mt-2">The session you're looking for doesn't exist.</p>
      </div>
    );
  }

  const isRegistered = session.attendees?.some(
    attendee => attendee.user._id === user?.id
  );
  const isSpeaker = session.speaker._id === user?.id;
  const isAdmin = user?.role === 'admin';
  const canAccess = isRegistered || isSpeaker || isAdmin;

  const sessionDate = new Date(session.date);
  const isUpcoming = sessionDate > new Date();
  const isLive = session.status === 'live';

  const tabs = [
    { id: 'overview', name: 'Overview', icon: CalendarIcon },
    { id: 'chat', name: 'Chat', icon: ChatBubbleLeftRightIcon, disabled: !canAccess },
    { id: 'qa', name: 'Q&A', icon: QuestionMarkCircleIcon, disabled: !canAccess },
    { id: 'video', name: 'Video', icon: VideoCameraIcon, disabled: !canAccess || !isLive }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Session Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {session.title}
              </h1>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {sessionDate.toLocaleDateString()} at {sessionDate.toLocaleTimeString()}
                </div>
                <div className="flex items-center">
                  <UsersIcon className="h-4 w-4 mr-1" />
                  {attendeeCount} attendees
                </div>
                {isLive && (
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-red-600 font-medium">LIVE</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isConnected && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md px-3 py-1">
                  <span className="text-yellow-800 text-sm">Connecting...</span>
                </div>
              )}
              
              {canAccess ? (
                <>
                  {isLive && !isVideoCallActive && (
                    <button
                      onClick={startVideoCall}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                    >
                      <VideoCameraIcon className="h-4 w-4 mr-2" />
                      Join Video
                    </button>
                  )}
                  
                  {isRegistered && !isSpeaker && (
                    <button
                      onClick={handleLeaveSession}
                      className="border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Leave Session
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleJoinSession}
                  disabled={!isUpcoming && !isLive}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {isUpcoming ? 'Register' : 'Join Session'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm flex items-center
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : tab.disabled
                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {session.description}
                </p>
                
                {session.agenda && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Agenda</h3>
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap text-gray-700">
                        {session.agenda}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Session Details</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Speaker</dt>
                    <dd className="text-sm text-gray-900">{session.speaker.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Duration</dt>
                    <dd className="text-sm text-gray-900">{session.duration} minutes</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Maximum Attendees</dt>
                    <dd className="text-sm text-gray-900">{session.maxAttendees}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className={`text-sm font-medium ${
                      session.status === 'live' ? 'text-green-600' :
                      session.status === 'upcoming' ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </dd>
                  </div>
                </dl>
                
                {session.resources && session.resources.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Resources</h4>
                    <ul className="space-y-1">
                      {session.resources.map((resource, index) => (
                        <li key={index}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {resource.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && canAccess && (
          <ChatInterface sessionId={id} />
        )}

        {activeTab === 'qa' && canAccess && (
          <QAInterface sessionId={id} />
        )}

        {activeTab === 'video' && canAccess && isLive && (
          <VideoConference 
            sessionId={id} 
            onLeave={endVideoCall}
          />
        )}
      </div>

      {/* Access Denied Message */}
      {(activeTab === 'chat' || activeTab === 'qa' || activeTab === 'video') && !canAccess && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Registration Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You need to register for this session to access the communication features.
                </p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleJoinSession}
                  className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded-md text-sm font-medium"
                >
                  Register Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSessionDetail;
