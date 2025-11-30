import { Link } from 'react-router-dom'
import { Heart, Mail, Phone, MapPin } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-display font-semibold text-xl text-white">
                PsikoConnect
              </span>
            </Link>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Online psikolojik danışmanlık platformu. Uzman psikologlarla güvenli 
              görüntülü görüşmeler yapın, ruh sağlığınıza yatırım yapın.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Hızlı Erişim</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/psychologists" className="text-sm hover:text-primary-400 transition-colors">
                  Psikolog Bul
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-sm hover:text-primary-400 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/register?role=psychologist" className="text-sm hover:text-primary-400 transition-colors">
                  Psikolog Olarak Katıl
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm hover:text-primary-400 transition-colors">
                  Ücretsiz Kayıt
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Destek</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm hover:text-primary-400 transition-colors">
                  Sıkça Sorulan Sorular
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-primary-400 transition-colors">
                  Gizlilik Politikası
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-primary-400 transition-colors">
                  Kullanım Koşulları
                </a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-primary-400 transition-colors">
                  İletişim
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">İletişim</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-primary-400" />
                <span>destek@psikoconnect.com</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-primary-400" />
                <span>0850 123 45 67</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <MapPin size={16} className="text-primary-400 mt-1" />
                <span>İstanbul, Türkiye</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            © 2024 PsikoConnect. Tüm hakları saklıdır.
          </p>
          <p className="text-sm text-neutral-500 flex items-center gap-1">
            <Heart size={14} className="text-red-400" /> ile yapıldı
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer


