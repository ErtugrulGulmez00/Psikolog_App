import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { appointmentsAPI } from '../services/api'
import { toast } from 'react-hot-toast'
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, MonitorOff, Maximize, Minimize,
  MessageSquare, Users
} from 'lucide-react'
import Avatar from '../components/common/Avatar'
import LoadingSpinner from '../components/common/LoadingSpinner'

// Lazy load SimplePeer to avoid module externalization issues
let SimplePeer = null
const loadSimplePeer = async () => {
  if (!SimplePeer) {
    try {
      const module = await import('simple-peer')
      SimplePeer = module.default || module
    } catch (error) {
      console.error('Failed to load SimplePeer:', error)
      throw new Error('Video call module could not be loaded')
    }
  }
  return SimplePeer
}

const VideoCall = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()

  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [callStatus, setCallStatus] = useState('connecting') // connecting, connected, ended
  const [remoteUser, setRemoteUser] = useState(null)
  const [remotePeerId, setRemotePeerId] = useState(null)
  const [isRemoteMuted, setIsRemoteMuted] = useState(true) // Start muted for autoplay

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerRef = useRef(null)
  const screenStreamRef = useRef(null)
  const isInitiator = useRef(false)
  const peerCreated = useRef(false)

  useEffect(() => {
    fetchAppointment()
    initializeMedia()

    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (socket && localStream && isConnected) {
      setupSocketListeners()
      socket.emit('join-room', { roomId, peerId: user?.id || user?._id })
    }

    return () => {
      if (socket) {
        socket.off('user-joined')
        socket.off('offer')
        socket.off('answer')
        socket.off('ice-candidate')
        socket.off('user-left')
        socket.off('call-ended')
      }
    }
  }, [socket, localStream, isConnected])

  // Handle local stream changes
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('Setting local stream to video element')
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch(console.log)
    }
  }, [localStream])

  // Handle remote stream changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('Setting remote stream to video element, tracks:', remoteStream.getTracks().length)
      
      // Check if stream has video track
      const hasVideo = remoteStream.getVideoTracks().length > 0
      const hasAudio = remoteStream.getAudioTracks().length > 0
      console.log('Stream has video:', hasVideo, 'audio:', hasAudio)
      
      // Set stream to video element
      remoteVideoRef.current.srcObject = remoteStream
      
      // Try to play
      const playPromise = remoteVideoRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Remote video playing successfully')
            // If muted initially, unmute after successful play
            if (isRemoteMuted && hasAudio) {
              setTimeout(() => {
                setIsRemoteMuted(false)
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.muted = false
                }
              }, 500)
            }
          })
          .catch(e => {
            console.log('⚠️ Remote video autoplay prevented:', e)
            setIsRemoteMuted(true) // Show unmute button
          })
      }
    } else if (remoteVideoRef.current && !remoteStream) {
      // Clear video element when stream is removed
      remoteVideoRef.current.srcObject = null
    }
  }, [remoteStream, isRemoteMuted])

  const fetchAppointment = async () => {
    try {
      // Find appointment by roomId
      const res = await appointmentsAPI.getAll({ limit: 100 })
      const apt = res.data.appointments.find(a => a.roomId === roomId)
      
      if (apt) {
        setAppointment(apt)
        const other = user?.role === 'psychologist' ? apt.patient : apt.psychologist
        setRemoteUser(other)
      }
    } catch (error) {
      console.error('Fetch appointment error:', error)
    } finally {
      setLoading(false)
    }
  }

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      
      // Log stream tracks
      const videoTracks = stream.getVideoTracks()
      const audioTracks = stream.getAudioTracks()
      console.log('📹 Local stream initialized:', {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoEnabled: videoTracks[0]?.enabled,
        audioEnabled: audioTracks[0]?.enabled
      })
      
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Media access error:', error)
      toast.error('Kamera veya mikrofon erişimi sağlanamadı')
      
      // Try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        })
        setLocalStream(audioStream)
        setIsVideoEnabled(false)
      } catch (audioError) {
        toast.error('Ses erişimi de sağlanamadı')
      }
    }
  }

  const setupSocketListeners = () => {
    socket.on('user-joined', handleUserJoined)
    socket.on('offer', handleOffer)
    socket.on('answer', handleAnswer)
    socket.on('ice-candidate', handleIceCandidate)
    socket.on('user-left', handleUserLeft)
    socket.on('call-ended', handleCallEnded)
    socket.on('user-toggle-video', handleRemoteToggleVideo)
    socket.on('user-toggle-audio', handleRemoteToggleAudio)
  }

  const createPeer = async (initiator, stream, targetPeerId) => {
    try {
      const Peer = await loadSimplePeer()
      
      // Verify stream has video and audio tracks
      const videoTracks = stream.getVideoTracks()
      const audioTracks = stream.getAudioTracks()
      console.log('🔍 Creating peer with stream:', {
        initiator,
        target: targetPeerId,
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoTrackId: videoTracks[0]?.id,
        audioTrackId: audioTracks[0]?.id
      })
      
      if (videoTracks.length === 0) {
        console.warn('⚠️ No video tracks in stream!')
      }
      if (audioTracks.length === 0) {
        console.warn('⚠️ No audio tracks in stream!')
      }
      
      // ICE servers with TURN for NAT traversal
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        // Free TURN servers from Open Relay Project
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
      
      const config = {
        initiator,
        trickle: true,
        stream, // Pass the stream with all tracks
        config: {
          iceServers,
          iceCandidatePoolSize: 10
        }
      }
      
      console.log('Creating peer, initiator:', initiator, 'target:', targetPeerId)
      const peer = new Peer(config)
      
      // Verify and ensure video track is added to peer connection
      setTimeout(() => {
        if (peer._pc && stream) {
          const transceivers = peer._pc.getTransceivers()
          const videoTracks = stream.getVideoTracks()
          const audioTracks = stream.getAudioTracks()
          
          console.log('📡 RTCPeerConnection transceivers:', transceivers.length)
          console.log('📹 Stream tracks - video:', videoTracks.length, 'audio:', audioTracks.length)
          
          // Check if video transceiver exists
          const hasVideoTransceiver = transceivers.some(t => 
            t.sender.track?.kind === 'video' || t.receiver.track?.kind === 'video'
          )
          
          // If we have video track but no video transceiver, add it
          if (videoTracks.length > 0 && !hasVideoTransceiver) {
            console.log('⚠️ Video track exists but no video transceiver found, adding...')
            const videoTrack = videoTracks[0]
            const sender = peer._pc.addTrack(videoTrack, stream)
            console.log('✅ Video track added to peer connection')
          }
          
          transceivers.forEach((transceiver, index) => {
            console.log(`Transceiver ${index}:`, {
              kind: transceiver.receiver.track?.kind || transceiver.sender.track?.kind,
              direction: transceiver.direction,
              currentDirection: transceiver.currentDirection,
              trackId: transceiver.receiver.track?.id || transceiver.sender.track?.id
            })
          })
        }
      }, 500)

      peer.on('signal', (signal) => {
        const to = targetPeerId || remotePeerId
        console.log('📤 Sending signal to:', to, 'type:', signal.type || signal.transceiverRequest || 'ice-candidate')
        
        if (signal.type === 'offer') {
          socket.emit('offer', { roomId, offer: signal, to })
        } else if (signal.type === 'answer') {
          socket.emit('answer', { roomId, answer: signal, to })
        } else if (signal.transceiverRequest) {
          // Handle transceiver request - add video track if needed
          console.log('📹 Transceiver request received, ensuring video track is added')
          socket.emit('transceiver-request', { roomId, request: signal, to })
        } else if (signal.candidate) {
          socket.emit('ice-candidate', { roomId, candidate: signal, to })
        }
      })

      peer.on('stream', (remoteMediaStream) => {
        console.log('🎥 Received remote stream with tracks:', remoteMediaStream.getTracks().length)
        remoteMediaStream.getTracks().forEach(track => {
          console.log('Track:', track.kind, 'enabled:', track.enabled, 'readyState:', track.readyState)
        })
        
        setRemoteStream(remoteMediaStream)
        setCallStatus('connected')
      })

      peer.on('track', (track, stream) => {
        console.log('🎵 Received track:', track.kind, 'from stream with', stream.getTracks().length, 'tracks')
        
        // Update remote stream state
        setRemoteStream(stream)
        
        // Also directly set to video element for immediate display
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
          // Force play
          remoteVideoRef.current.play().catch(e => {
            console.log('Video play error:', e)
            // If autoplay fails, try again after user interaction
            setIsRemoteMuted(true) // Show unmute button
          })
        }
      })

      peer.on('connect', () => {
        console.log('✅ Peer connected!')
        setCallStatus('connected')
      })

      peer.on('error', (error) => {
        console.error('❌ Peer error:', error)
        toast.error('Bağlantı hatası: ' + error.message)
      })

      peer.on('close', () => {
        console.log('🔴 Peer connection closed')
        setCallStatus('ended')
      })

      peer.on('iceStateChange', (state) => {
        console.log('🧊 ICE state:', state)
      })

      return peer
    } catch (error) {
      console.error('Failed to create peer:', error)
      toast.error('Video bağlantısı kurulamadı')
      return null
    }
  }

  const handleUserJoined = async ({ peerId, userId, userName }) => {
    console.log('User joined:', userName, 'userId:', userId)
    toast.success(`${userName} görüşmeye katıldı`)
    
    // Save remote peer ID
    setRemotePeerId(userId)
    
    // Prevent multiple peer creation
    if (localStream && !peerCreated.current) {
      peerCreated.current = true
      isInitiator.current = true
      console.log('Creating peer as initiator, target:', userId)
      peerRef.current = await createPeer(true, localStream, userId)
    }
  }

  const handleOffer = async ({ offer, from }) => {
    // Prevent duplicate offer handling if we're the initiator
    if (isInitiator.current && peerCreated.current) {
      console.log('Ignoring offer - we are the initiator')
      return
    }
    
    console.log('Received offer from:', from)
    setRemotePeerId(from)
    
    if (localStream && !peerCreated.current) {
      peerCreated.current = true
      isInitiator.current = false
      console.log('Creating peer as receiver, from:', from)
      peerRef.current = await createPeer(false, localStream, from)
      
      // Small delay to ensure peer is ready
      setTimeout(() => {
        if (peerRef.current && !peerRef.current.destroyed) {
          console.log('Signaling offer to peer')
          peerRef.current.signal(offer)
        }
      }, 100)
    } else if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.signal(offer)
    }
  }

  const handleAnswer = ({ answer, from }) => {
    console.log('Received answer from:', from)
    if (peerRef.current && !peerRef.current.destroyed) {
      try {
        peerRef.current.signal(answer)
      } catch (e) {
        console.log('Answer signal error (ignored):', e.message)
      }
    }
  }

  const handleIceCandidate = ({ candidate, from }) => {
    if (peerRef.current && !peerRef.current.destroyed && candidate) {
      try {
        peerRef.current.signal(candidate)
      } catch (e) {
        console.log('ICE signal error (ignored):', e.message)
      }
    }
  }

  const handleUserLeft = ({ userId }) => {
    toast.info('Diğer kullanıcı görüşmeden ayrıldı')
    setCallStatus('ended')
  }

  const handleCallEnded = () => {
    toast.info('Görüşme sonlandırıldı')
    setCallStatus('ended')
  }

  const handleRemoteToggleVideo = ({ userId, enabled }) => {
    // Handle remote user video toggle
  }

  const handleRemoteToggleAudio = ({ userId, enabled }) => {
    // Handle remote user audio toggle
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
        socket?.emit('toggle-video', { roomId, enabled: videoTrack.enabled })
      }
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
        socket?.emit('toggle-audio', { roomId, enabled: audioTrack.enabled })
      }
    }
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop())
      }
      
      // Replace with camera stream
      if (peerRef.current && localStream) {
        const videoTrack = localStream.getVideoTracks()[0]
        const sender = peerRef.current._pc?.getSenders()
          .find(s => s.track?.kind === 'video')
        
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack)
        }
      }
      
      setIsScreenSharing(false)
      socket?.emit('screen-share-stopped', { roomId })
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        })
        
        screenStreamRef.current = screenStream
        
        // Replace video track
        if (peerRef.current) {
          const screenTrack = screenStream.getVideoTracks()[0]
          const sender = peerRef.current._pc?.getSenders()
            .find(s => s.track?.kind === 'video')
          
          if (sender && screenTrack) {
            sender.replaceTrack(screenTrack)
          }
          
          screenTrack.onended = () => {
            toggleScreenShare()
          }
        }
        
        setIsScreenSharing(true)
        socket?.emit('screen-share-started', { roomId })
      } catch (error) {
        console.error('Screen share error:', error)
        toast.error('Ekran paylaşımı başlatılamadı')
      }
    }
  }

  const endCall = () => {
    socket?.emit('end-call', { roomId })
    cleanup()
    navigate('/appointments')
  }

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    peerCreated.current = false
    isInitiator.current = false
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video (Main) */}
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
          {/* Always render video element - muted initially for autoplay */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={isRemoteMuted}
            className="w-full h-full object-cover"
            style={{ display: remoteStream ? 'block' : 'none' }}
          />
          
          {/* Unmute button overlay */}
          {remoteStream && isRemoteMuted && (
            <button
              onClick={() => {
                setIsRemoteMuted(false)
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.muted = false
                  remoteVideoRef.current.play().catch(console.log)
                }
              }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg"
            >
              🔊 Sesi Aç
            </button>
          )}
          
          {/* Show placeholder when no stream */}
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <Avatar
                src={remoteUser?.avatar}
                firstName={remoteUser?.firstName}
                lastName={remoteUser?.lastName}
                size="xl"
                className="mb-4"
              />
              <p className="text-xl font-medium mb-2">
                {remoteUser?.firstName} {remoteUser?.lastName}
              </p>
              <p className="text-neutral-400">
                {callStatus === 'connecting' ? 'Bağlanıyor...' : 'Bağlantı bekleniyor...'}
              </p>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="video-local">
          {isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
              <Avatar
                src={user?.avatar}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size="md"
              />
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${
            callStatus === 'connected' ? 'bg-green-500' : 
            callStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
            'bg-red-500'
          }`} />
          <span className="text-white text-sm">
            {callStatus === 'connected' ? 'Bağlı' :
             callStatus === 'connecting' ? 'Bağlanıyor' :
             'Bağlantı Kesildi'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-neutral-800/90 backdrop-blur-lg p-6">
        <div className="flex items-center justify-center gap-4">
          {/* Mic Toggle */}
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isAudioEnabled 
                ? 'bg-neutral-700 hover:bg-neutral-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isVideoEnabled 
                ? 'bg-neutral-700 hover:bg-neutral-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isScreenSharing 
                ? 'bg-primary-500 hover:bg-primary-600 text-white' 
                : 'bg-neutral-700 hover:bg-neutral-600 text-white'
            }`}
          >
            {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
          </button>

          {/* End Call */}
          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
          >
            <PhoneOff size={24} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-14 h-14 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white flex items-center justify-center transition-colors"
          >
            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoCall


