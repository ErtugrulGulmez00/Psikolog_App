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

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerRef = useRef(null)
  const screenStreamRef = useRef(null)

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
        video: true,
        audio: true
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

  const createPeer = async (initiator, stream) => {
    try {
      const Peer = await loadSimplePeer()
      const peer = new Peer({
        initiator,
        trickle: true,
        stream
      })

      peer.on('signal', (signal) => {
        if (signal.type === 'offer') {
          socket.emit('offer', { roomId, offer: signal, to: remoteUser?.id || remoteUser?._id })
        } else if (signal.type === 'answer') {
          socket.emit('answer', { roomId, answer: signal, to: remoteUser?.id || remoteUser?._id })
        } else if (signal.candidate) {
          socket.emit('ice-candidate', { roomId, candidate: signal, to: remoteUser?.id || remoteUser?._id })
        }
      })

      peer.on('stream', (stream) => {
        setRemoteStream(stream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
        setCallStatus('connected')
      })

      peer.on('error', (error) => {
        console.error('Peer error:', error)
        toast.error('Bağlantı hatası oluştu')
      })

      peer.on('close', () => {
        setCallStatus('ended')
      })

      return peer
    } catch (error) {
      console.error('Failed to create peer:', error)
      toast.error('Video bağlantısı kurulamadı')
      return null
    }
  }

  const handleUserJoined = async ({ peerId, userId, userName }) => {
    console.log('User joined:', userName)
    toast.success(`${userName} görüşmeye katıldı`)
    
    if (localStream) {
      peerRef.current = await createPeer(true, localStream)
    }
  }

  const handleOffer = async ({ offer, from }) => {
    if (localStream) {
      peerRef.current = await createPeer(false, localStream)
      if (peerRef.current) {
        peerRef.current.signal(offer)
      }
    }
  }

  const handleAnswer = ({ answer }) => {
    if (peerRef.current) {
      peerRef.current.signal(answer)
    }
  }

  const handleIceCandidate = ({ candidate }) => {
    if (peerRef.current) {
      peerRef.current.signal(candidate)
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
    }
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
        <div className="absolute inset-0 flex items-center justify-center">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
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


