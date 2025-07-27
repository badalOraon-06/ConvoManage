import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  VideoCameraIcon, 
  MicrophoneIcon, 
  ShareIcon,
  PhoneXMarkIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { 
  VideoCameraSlashIcon, 
  MicrophoneSlashIcon 
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const VideoConference = ({ sessionId, meetingLink, isVisible = true, isSpeaker = false }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerConnections, setPeerConnections] = useState({});
  const [isInMeeting, setIsInMeeting] = useState(false);

  const configuration = {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ]
  };

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Join video conference room
    socket.emit('join-video-room', sessionId);

    // Listen for participants updates
    socket.on('participants-updated', (participantsList) => {
      setParticipants(participantsList);
    });

    // Listen for video call events
    socket.on('user-joined-video', handleUserJoined);
    socket.on('user-left-video', handleUserLeft);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      socket.off('participants-updated');
      socket.off('user-joined-video');
      socket.off('user-left-video');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.emit('leave-video-room', sessionId);
      
      // Clean up streams and connections
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnections).forEach(pc => pc.close());
    };
  }, [socket, sessionId]);

  const handleUserJoined = async (userData) => {
    if (userData.userId === user.id) return;

    const peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [userData.userId]: event.streams[0]
      }));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: userData.userId,
          sessionId
        });
      }
    };

    setPeerConnections(prev => ({
      ...prev,
      [userData.userId]: peerConnection
    }));

    // Create offer if we're the initiator
    if (userData.initiator) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      socket.emit('offer', {
        offer,
        to: userData.userId,
        sessionId
      });
    }
  };

  const handleUserLeft = (userData) => {
    if (peerConnections[userData.userId]) {
      peerConnections[userData.userId].close();
      setPeerConnections(prev => {
        const updated = { ...prev };
        delete updated[userData.userId];
        return updated;
      });
    }

    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[userData.userId];
      return updated;
    });
  };

  const handleOffer = async (data) => {
    const peerConnection = peerConnections[data.from] || new RTCPeerConnection(configuration);
    
    if (!peerConnections[data.from]) {
      // Set up new peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      }

      peerConnection.ontrack = (event) => {
        setRemoteStreams(prev => ({
          ...prev,
          [data.from]: event.streams[0]
        }));
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            to: data.from,
            sessionId
          });
        }
      };

      setPeerConnections(prev => ({
        ...prev,
        [data.from]: peerConnection
      }));
    }

    await peerConnection.setRemoteDescription(data.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('answer', {
      answer,
      to: data.from,
      sessionId
    });
  };

  const handleAnswer = async (data) => {
    const peerConnection = peerConnections[data.from];
    if (peerConnection) {
      await peerConnection.setRemoteDescription(data.answer);
    }
  };

  const handleIceCandidate = async (data) => {
    const peerConnection = peerConnections[data.from];
    if (peerConnection) {
      await peerConnection.addIceCandidate(data.candidate);
    }
  };

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoOn,
        audio: isAudioOn
      });
      
      setLocalStream(stream);
      
      // Update existing peer connections with new stream
      Object.values(peerConnections).forEach(pc => {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      });

      return stream;
    } catch (error) {
      toast.error('Could not access camera/microphone');
      console.error('Error accessing media devices:', error);
      return null;
    }
  };

  const joinMeeting = async () => {
    const stream = await startLocalVideo();
    if (stream) {
      setIsInMeeting(true);
      socket.emit('join-video-call', {
        sessionId,
        userData: {
          id: user.id,
          name: user.name,
          role: user.role
        }
      });
    }
  };

  const leaveMeeting = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    Object.values(peerConnections).forEach(pc => pc.close());
    setPeerConnections({});
    setRemoteStreams({});
    setIsInMeeting(false);

    socket.emit('leave-video-call', {
      sessionId,
      userId: user.id
    });
  };

  const toggleVideo = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  const toggleAudio = async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn;
        setIsAudioOn(!isAudioOn);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Replace video track in all peer connections
      Object.values(peerConnections).forEach(pc => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
      });

      setIsScreenSharing(true);

      // Handle screen share ending
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      toast.error('Could not start screen sharing');
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = async () => {
    if (localStream) {
      // Switch back to camera
      Object.values(peerConnections).forEach(pc => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender && localStream.getVideoTracks()[0]) {
          sender.replaceTrack(localStream.getVideoTracks()[0]);
        }
      });
    }
    setIsScreenSharing(false);
  };

  const VideoPlayer = ({ stream, muted = false, userName = 'You' }) => {
    const videoRef = React.useRef();

    React.useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    return (
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted={muted}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
          {userName}
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Video Conference Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
              <VideoCameraIcon className="h-5 w-5 mr-2" />
              Video Conference
            </h3>
            <p className="text-xs text-gray-600">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {meetingLink && !isInMeeting && (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Open External Meeting
            </a>
          )}
        </div>
      </div>

      {!isInMeeting ? (
        /* Join Meeting Section */
        <div className="p-6 text-center">
          <VideoCameraIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium text-gray-800 mb-2">Join Video Conference</h4>
          <p className="text-gray-600 mb-4">
            Connect with other participants in this session
          </p>
          <button
            onClick={joinMeeting}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Join Meeting
          </button>
        </div>
      ) : (
        /* Video Conference Interface */
        <div className="p-4">
          {/* Local Video */}
          <div className="mb-4">
            <VideoPlayer 
              stream={localStream} 
              muted={true} 
              userName="You" 
            />
          </div>

          {/* Remote Videos */}
          {Object.keys(remoteStreams).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {Object.entries(remoteStreams).map(([userId, stream]) => {
                const participant = participants.find(p => p.id === userId);
                return (
                  <VideoPlayer
                    key={userId}
                    stream={stream}
                    userName={participant?.name || 'Participant'}
                  />
                );
              })}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex justify-center space-x-3">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${
                isVideoOn 
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {isVideoOn ? (
                <VideoCameraIcon className="h-5 w-5" />
              ) : (
                <VideoCameraSlashIcon className="h-5 w-5" />
              )}
            </button>

            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-colors ${
                isAudioOn 
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {isAudioOn ? (
                <MicrophoneIcon className="h-5 w-5" />
              ) : (
                <MicrophoneSlashIcon className="h-5 w-5" />
              )}
            </button>

            {isSpeaker && (
              <button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                className={`p-3 rounded-full transition-colors ${
                  isScreenSharing
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ShareIcon className="h-5 w-5" />
              </button>
            )}

            <button
              onClick={leaveMeeting}
              className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <PhoneXMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Participants List */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-2">
              <UserGroupIcon className="h-4 w-4 mr-2 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">
                Participants ({participants.length})
              </span>
            </div>
            <div className="space-y-1">
              {participants.map(participant => (
                <div key={participant.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    {participant.name} {participant.id === user.id && '(You)'}
                  </span>
                  <span className="text-xs text-gray-500 px-2 py-1 bg-gray-200 rounded">
                    {participant.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoConference;
