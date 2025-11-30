import { Link } from 'react-router-dom'
import { 
  Video, 
  Shield, 
  Clock, 
  Award, 
  Star,
  ArrowRight,
  CheckCircle,
  Users,
  Calendar,
  MessageSquare
} from 'lucide-react'

const Home = () => {
  const features = [
    {
      icon: Video,
      title: 'Görüntülü Görüşme',
      description: 'Güvenli ve yüksek kaliteli video görüşmeleriyle uzman psikologlarla birebir terapi seansları'
    },
    {
      icon: Shield,
      title: 'Tam Gizlilik',
      description: 'Uçtan uca şifreli iletişim ile görüşmeleriniz ve bilgileriniz tamamen gizli kalır'
    },
    {
      icon: Clock,
      title: 'Esnek Zamanlama',
      description: 'Programınıza uygun randevu saatleri seçin, istediğiniz yerden bağlanın'
    },
    {
      icon: Award,
      title: 'Uzman Psikologlar',
      description: 'Alanında deneyimli, lisanslı ve onaylı psikologlarla çalışın'
    }
  ]

  const stats = [
    { value: '500+', label: 'Uzman Psikolog' },
    { value: '50.000+', label: 'Mutlu Danışan' },
    { value: '100.000+', label: 'Tamamlanan Seans' },
    { value: '4.9/5', label: 'Memnuniyet Puanı' }
  ]

  const testimonials = [
    {
      name: 'Ayşe K.',
      role: 'Danışan',
      content: 'Online terapi sayesinde iş yoğunluğuma rağmen düzenli seanslara katılabiliyorum. Çok memnunum!',
      rating: 5
    },
    {
      name: 'Mehmet Y.',
      role: 'Danışan', 
      content: 'Evimin rahatlığında terapi alabilmek benim için çok değerli. Platform çok kullanışlı.',
      rating: 5
    },
    {
      name: 'Dr. Zeynep A.',
      role: 'Psikolog',
      content: 'Danışanlarıma daha esnek saatlerde ulaşabiliyorum. Sistem güvenilir ve profesyonel.',
      rating: 5
    }
  ]

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary-200 rounded-full blur-3xl" />
        </div>

        <div className="container-custom relative z-10 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="animate-stagger">
              <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                Online Psikolojik Danışmanlık
              </div>
              
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 leading-tight mb-6">
                Ruh Sağlığınız İçin
                <span className="text-gradient block">Profesyonel Destek</span>
              </h1>
              
              <p className="text-lg text-neutral-600 mb-8 max-w-lg">
                Alanında uzman psikologlarla online görüşmeler yapın. 
                Güvenli, gizli ve etkili terapi deneyimi için hemen başlayın.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/psychologists" className="btn-primary">
                  Psikolog Bul
                  <ArrowRight size={18} className="ml-2" />
                </Link>
                <Link to="/register?role=psychologist" className="btn-secondary">
                  Psikolog Olarak Katıl
                </Link>
              </div>

              <div className="flex items-center gap-6 text-sm text-neutral-500">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-primary-500" />
                  <span>Ücretsiz kayıt</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-primary-500" />
                  <span>İlk 15 dakika ücretsiz</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="relative hidden lg:block">
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                {/* Main card */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-3xl shadow-2xl p-8 animate-fade-in">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
                      <Video size={28} className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">Görüntülü Görüşme</h3>
                      <p className="text-sm text-neutral-500">Şimdi başlayın</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 bg-neutral-100 rounded-full w-full" />
                    <div className="h-3 bg-neutral-100 rounded-full w-3/4" />
                    <div className="h-3 bg-primary-100 rounded-full w-1/2" />
                  </div>
                </div>

                {/* Floating cards */}
                <div className="absolute top-10 right-0 bg-white rounded-2xl shadow-lg p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Calendar size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Randevu Onaylandı</p>
                      <p className="text-xs text-neutral-500">Yarın, 14:00</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-10 left-0 bg-white rounded-2xl shadow-lg p-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <MessageSquare size={20} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Yeni Mesaj</p>
                      <p className="text-xs text-neutral-500">Dr. Ayşe'den</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-900 text-white">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-primary-200 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Neden PsikoConnect?
            </h2>
            <p className="text-neutral-600">
              Modern teknoloji ile profesyonel psikolojik destek bir arada
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="card-hover p-8 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-primary-100 rounded-2xl flex items-center justify-center">
                  <feature.icon size={28} className="text-primary-600" />
                </div>
                <h3 className="font-display text-lg font-semibold text-neutral-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-neutral-500 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section bg-neutral-50">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Nasıl Çalışır?
            </h2>
            <p className="text-neutral-600">
              Üç kolay adımda online terapi deneyiminize başlayın
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Psikolog Seçin',
                description: 'Uzmanlık alanları, değerlendirmeler ve müsaitlik durumuna göre size uygun psikoloğu bulun.'
              },
              {
                step: '02',
                title: 'Randevu Alın',
                description: 'Takvimden size uygun gün ve saati seçin, randevunuzu oluşturun.'
              },
              {
                step: '03',
                title: 'Görüşmeye Başlayın',
                description: 'Randevu saatinde güvenli video bağlantısıyla görüşmenize katılın.'
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="card p-8">
                  <div className="text-6xl font-display font-bold text-primary-100 mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-neutral-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-neutral-500">
                    {item.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight size={24} className="text-primary-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Kullanıcılarımız Ne Diyor?
            </h2>
            <p className="text-neutral-600">
              Binlerce mutlu kullanıcımızdan bazı yorumlar
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-neutral-600 mb-6 italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-semibold">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">{testimonial.name}</p>
                    <p className="text-sm text-neutral-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="container-custom text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ruh Sağlığınız İçin İlk Adımı Atın
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Profesyonel psikolojik destek her zamankinden daha erişilebilir. 
            Hemen ücretsiz kayıt olun ve size en uygun psikoloğu bulun.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register" 
              className="btn bg-white text-primary-700 hover:bg-primary-50 shadow-lg"
            >
              Ücretsiz Başla
            </Link>
            <Link 
              to="/psychologists" 
              className="btn border-2 border-white/30 text-white hover:bg-white/10"
            >
              Psikologları İncele
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home


