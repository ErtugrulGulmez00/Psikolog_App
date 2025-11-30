import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Menu, X, ChevronDown } from 'lucide-react'

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated, user, isPsychologist } = useAuth()

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-neutral-100">
      <nav className="container-custom">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="font-display font-semibold text-xl text-primary-800">
              PsikoConnect
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink 
              to="/psychologists"
              className={({ isActive }) => 
                `text-sm font-medium transition-colors ${isActive ? 'text-primary-600' : 'text-neutral-600 hover:text-primary-600'}`
              }
            >
              Psikolog Bul
            </NavLink>
            <NavLink 
              to="/blog"
              className={({ isActive }) => 
                `text-sm font-medium transition-colors ${isActive ? 'text-primary-600' : 'text-neutral-600 hover:text-primary-600'}`
              }
            >
              Blog
            </NavLink>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <Link 
                to="/dashboard"
                className="btn-primary"
              >
                {isPsychologist ? 'Panelim' : 'Hesabım'}
              </Link>
            ) : (
              <>
                <Link 
                  to="/login"
                  className="btn-ghost"
                >
                  Giriş Yap
                </Link>
                <Link 
                  to="/register"
                  className="btn-primary"
                >
                  Ücretsiz Başla
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-neutral-100 rounded-lg"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-100 animate-slide-down">
            <div className="flex flex-col gap-2">
              <NavLink 
                to="/psychologists"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-neutral-600 hover:bg-neutral-50 rounded-lg"
              >
                Psikolog Bul
              </NavLink>
              <NavLink 
                to="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-neutral-600 hover:bg-neutral-50 rounded-lg"
              >
                Blog
              </NavLink>
              
              <div className="border-t border-neutral-100 my-2" />
              
              {isAuthenticated ? (
                <Link 
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary mx-4"
                >
                  {isPsychologist ? 'Panelim' : 'Hesabım'}
                </Link>
              ) : (
                <div className="flex flex-col gap-2 px-4">
                  <Link 
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-secondary"
                  >
                    Giriş Yap
                  </Link>
                  <Link 
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary"
                  >
                    Ücretsiz Başla
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Navbar


