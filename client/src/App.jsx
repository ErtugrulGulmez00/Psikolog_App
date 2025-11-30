import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Layouts
import MainLayout from './components/layouts/MainLayout'
import DashboardLayout from './components/layouts/DashboardLayout'

// Public Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import PsychologistList from './pages/PsychologistList'
import PsychologistDetail from './pages/PsychologistDetail'
import BlogList from './pages/BlogList'
import BlogDetail from './pages/BlogDetail'

// Protected Pages
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Appointments from './pages/Appointments'
import Messages from './pages/Messages'
import VideoCall from './pages/VideoCall'
import Notes from './pages/Notes'
import BlogEditor from './pages/BlogEditor'
import Payments from './pages/Payments'

// Components
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#3d8b72',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <Routes>
        {/* Public Routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/psychologists" element={<PsychologistList />} />
          <Route path="/psychologist/:id" element={<PsychologistDetail />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:conversationId" element={<Messages />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/blog/new" element={<BlogEditor />} />
          <Route path="/blog/edit/:id" element={<BlogEditor />} />
          <Route path="/payments" element={<Payments />} />
        </Route>

        {/* Video Call - Full Screen */}
        <Route 
          path="/call/:roomId" 
          element={
            <ProtectedRoute>
              <VideoCall />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </>
  )
}

export default App



