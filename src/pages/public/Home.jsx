import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Phone, Mail, MapPin, Clock, Instagram, Utensils, BedDouble, Camera, 
  Flower2, PartyPopper, QrCode, X, ChevronLeft, ChevronRight, Eye, Sparkles 
} from 'lucide-react';

const PHONE = '94093 22022';
const TEL = 'tel:+919409322022';
const EMAIL = 'thesparkling2018@gmail.com';
const ADDRESS = 'Rasana Mota, Palanpur Highway, Deesa - 385535';
const MAPS = 'https://www.google.com/maps/search/?api=1&query=The+Sparkling+Garden+Restaurant+Rasana+Mota+Deesa';

const services = [
  { icon: PartyPopper, title: 'Party Plot', text: 'Open-air lawns and a banquet hall for 50 to 500 guests — weddings, receptions and celebrations.' },
  { icon: BedDouble, title: 'Rooms', text: 'Comfortable rooms right on the Palanpur Highway for guests and wedding parties.' },
  { icon: Utensils, title: 'Garden Restaurant', text: 'Pure vegetarian dining among lush gardens, from tandoor and Punjabi to Chinese and sizzlers.' },
  { icon: Camera, title: 'Photoshoot', text: 'A lit-up palace façade, floral mandaps and green gardens: a ready backdrop for shoots.' },
  { icon: Flower2, title: 'Nursery', text: 'Plants and greenery grown on the property.' },
];

const categories = [
  ['Starters', 'from ₹230'], ['Paneer Dishes', 'from ₹220'], ['Tandoor', 'from ₹20'], ['Sizzlers', 'from ₹380'],
  ['Chinese', 'from ₹170'], ['Biriyani & Pulao', 'from ₹140'], ['Pizza', 'from ₹220'], ['Shakes & Drinks', 'from ₹20'],
];

const popular = [
  ['Sp. Veg. Sparkling', 250, 'House special curry'], ['Paneer Butter Masala', 240, 'Rich, creamy and mild'],
  ['Sparkling Sp. Sizzler', 395, 'Served sizzling · 700g'], ['Sp. Sparkling Biriyani', 230, 'Signature dum biriyani'],
  ['Dal Bati Platter', 349, 'Dal, 4 bati, chutney, pulao, buttermilk'], ['Super Deluxe Lunch', 250, 'Soup to sweet, roti ×3'],
];

const venueGallery = [
  {
    id: 1,
    src: '/images/entrance.png',
    title: 'Grand Entrance & Welcome Gate',
    category: 'Stay & Architecture',
    tag: 'Entrance',
    desc: 'Lush green driveway and majestic archway welcoming guests off the Palanpur Highway.',
  },
  {
    id: 2,
    src: '/images/garden1.png',
    title: 'Garden Dining Lawns',
    category: 'Garden & Dining',
    tag: 'Garden Restaurant',
    desc: 'Open-air pure veg dining amidst manicured flora, palm trees, and fresh evening air.',
  },
  {
    id: 3,
    src: '/images/wedding.png',
    title: 'Party Plot & Wedding Mandap',
    category: 'Weddings & Party Plot',
    tag: 'Wedding Venue',
    desc: 'Sprawling outdoor venue for grand weddings, floral mandaps, and receptions up to 500 guests.',
  },
  {
    id: 4,
    src: '/images/hall1.png',
    title: 'Grand Banquet Hall',
    category: 'Banquet Hall',
    tag: 'Banquet Hall',
    desc: 'Elegantly lit indoor hall tailored for engagements, sangeet, anniversaries, and family celebrations.',
  },
  {
    id: 5,
    src: '/images/garden2.png',
    title: 'Evening Garden Gazebos',
    category: 'Garden & Dining',
    tag: 'Lawn Seating',
    desc: 'Warm ambient garden lighting and comfortable seating for relaxed family lunches and dinners.',
  },
  {
    id: 6,
    src: '/images/sparkling-banner.jpg',
    title: 'Illuminated Palace Façade',
    category: 'Stay & Architecture',
    tag: 'Night View',
    desc: 'Fairytale royal lighting covering the grand palace façade — a signature photoshoot setting.',
  },
  {
    id: 7,
    src: '/images/event.png',
    title: 'Celebration Grounds & Event Stage',
    category: 'Weddings & Party Plot',
    tag: 'Party Plot',
    desc: 'Spacious stage setups with dynamic lighting, ideal for musical nights and festival gatherings.',
  },
  {
    id: 8,
    src: '/images/hall2.png',
    title: 'Indoor Celebration Hall',
    category: 'Banquet Hall',
    tag: 'Indoor Dining',
    desc: 'Air-conditioned dining and gathering hall accommodating intimate to large banquets.',
  },
  {
    id: 9,
    src: '/images/building.png',
    title: 'Resort Architecture & Stay Rooms',
    category: 'Stay & Architecture',
    tag: 'Rooms & Stay',
    desc: 'Well-appointed, air-conditioned rooms for wedding guests, families, and highway travelers.',
  },
  {
    id: 10,
    src: '/images/sunset.png',
    title: 'Golden Hour at The Lawns',
    category: 'Garden & Dining',
    tag: 'Sunset View',
    desc: 'Breathtaking golden-hour skies over the expansive lawns and flowering nursery shrubs.',
  },
];

const galleryCategories = [
  'All',
  'Garden & Dining',
  'Weddings & Party Plot',
  'Banquet Hall',
  'Stay & Architecture',
];

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6 } };

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const filteredGallery = activeCategory === 'All'
    ? venueGallery
    : venueGallery.filter(item => item.category === activeCategory);

  const nextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filteredGallery.length);
    }
  };

  const prevImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + filteredGallery.length) % filteredGallery.length);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredGallery.length]);

  return (
    <div className="bg-[#F4F6F0] text-[#222222] min-h-screen">
      <header className="sticky top-0 z-30 glass">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2 py-1">
            <img src="/images/sparkling-logo-dark.png" alt="The Sparkling Garden Restaurant" className="h-11 md:h-12 w-auto object-contain" />
          </a>
          <nav className="hidden md:flex gap-6 text-sm font-semibold text-[#818181]">
            {['About', 'Services', 'Menu', 'Gallery', 'Contact'].map(n => <a key={n} href={`#${n.toLowerCase()}`} className="hover:text-[#5A724A]">{n}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/table" className="border border-[#5A724A] text-[#5A724A] hover:bg-[#5A724A] hover:text-white text-xs font-bold px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-xs">
              <QrCode size={14} />
              <span>Table Menu</span>
            </Link>
            <a href="#contact" className="bg-[#5A724A] hover:bg-[#485D3B] text-white text-xs font-bold px-4 py-2 rounded-full transition-colors">Book a Table</a>
          </div>
        </div>
      </header>

      <section id="top" className="relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#BCE2A3]/30 rounded-full blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center relative">
          <motion.div {...fade} className="space-y-6">
            <span className="inline-flex items-center gap-2 bg-white border border-[#EBEBEB] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-[#5A724A]"><span className="w-2 h-2 rounded-full bg-[#5A724A]" />Pure Veg · Garden Restaurant · Deesa</span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">Dine under the lights at <span className="text-[#5A724A]">The Sparkling.</span></h1>
            <p className="text-lg text-[#818181] max-w-lg">Snacks, lunch and dinner in a garden setting, plus a party plot, rooms and banquet hall on the Palanpur Highway.</p>
            <div className="flex flex-wrap gap-3">
              <a href={TEL} className="inline-flex items-center gap-2 bg-[#5A724A] hover:bg-[#485D3B] text-white font-bold px-6 py-3 rounded-full"><Phone size={16} />Call {PHONE}</a>
              <Link to="/table" className="inline-flex items-center gap-2 bg-white border border-[#EBEBEB] hover:bg-[#BCE2A3]/40 font-bold px-6 py-3 rounded-full text-[#222222]">
                <QrCode size={16} className="text-[#5A724A]" />
                Digital QR Menu
              </Link>
            </div>
          </motion.div>
          <motion.div {...fade} className="relative">
            <img src="/images/sparkling-banner.jpg" alt="The Sparkling lit up at night" className="rounded-[2rem] shadow-[0_20px_50px_rgba(90,114,74,0.25)] w-full object-cover" />
          </motion.div>
        </div>
      </section>

      <section id="about" className="max-w-6xl mx-auto px-4 py-14 grid md:grid-cols-3 gap-4">
        {[['Lunch', '11:00 AM – 3:30 PM', Clock], ['Dinner', '7:00 PM – 11:00 PM', Clock], ['Banquet Hall', '50 to 500 persons', PartyPopper]].map(([t, v, I]) => (
          <motion.div key={t} {...fade} className="bg-white border border-[#EBEBEB] rounded-3xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#BCE2A3]/50 flex items-center justify-center text-[#5A724A]"><I size={22} /></div>
            <div><p className="text-xs uppercase tracking-wider text-[#818181] font-bold">{t}</p><p className="font-extrabold text-lg">{v}</p></div>
          </motion.div>
        ))}
      </section>

      <section id="services" className="max-w-6xl mx-auto px-4 py-10">
        <motion.h2 {...fade} className="text-3xl md:text-4xl font-extrabold mb-8">Everything in one place</motion.h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {services.map(({ icon: I, title, text }) => (
            <motion.div key={title} {...fade} className="bg-white border border-[#EBEBEB] rounded-3xl p-5 hover:shadow-[0_10px_30px_rgba(90,114,74,0.12)] transition-shadow">
              <I className="text-[#5A724A] mb-3" size={24} /><h3 className="font-bold text-lg mb-1">{title}</h3><p className="text-sm text-[#818181] leading-relaxed">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="menu" className="max-w-6xl mx-auto px-4 py-14">
        <motion.h2 {...fade} className="text-3xl md:text-4xl font-extrabold mb-2">From our menu</motion.h2>
        <p className="text-[#818181] mb-8">100% vegetarian. Taxes as applicable. Please allow 20–25 minutes after ordering.</p>
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(([c, p]) => <span key={c} className="bg-white border border-[#EBEBEB] rounded-full px-4 py-2 text-sm font-semibold">{c} <span className="text-[#5A724A]">{p}</span></span>)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popular.map(([n, p, d]) => (
            <motion.div key={n} {...fade} className="bg-white border border-[#EBEBEB] rounded-3xl p-5 flex justify-between gap-4">
              <div><h3 className="font-bold">{n}</h3><p className="text-sm text-[#818181] mt-1">{d}</p></div>
              <span className="font-extrabold text-[#5A724A]">₹{p}</span>
            </motion.div>
          ))}
        </div>
        <motion.div {...fade} className="mt-10 bg-white border border-[#EBEBEB] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_8px_30px_rgba(90,114,74,0.06)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#BCE2A3]/40 border border-[#BCE2A3] flex items-center justify-center text-[#5A724A] shrink-0">
              <QrCode size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-[#222222]">Dine-In Digital Ordering</h3>
              <p className="text-sm text-[#818181] mt-1 max-w-xl">
                Visiting our garden restaurant? Simply scan the QR code located on your dining table with your phone to view the live menu, customize dishes, and place your order directly.
              </p>
            </div>
          </div>
          <Link to="/table" className="inline-flex items-center gap-2 bg-[#5A724A] hover:bg-[#485D3B] text-white text-sm font-bold px-6 py-3 rounded-full whitespace-nowrap transition-colors shadow-xs">
            Open Table Menu →
          </Link>
        </motion.div>
      </section>

      {/* The Venue Gallery Section */}
      <section id="gallery" className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5A724A] mb-2">
              <Sparkles size={14} /> Photo Gallery
            </span>
            <motion.h2 {...fade} className="text-3xl md:text-5xl font-extrabold tracking-tight">
              The Venue
            </motion.h2>
            <p className="text-[#818181] mt-2 max-w-xl text-sm md:text-base">
              Explore our lush garden pavilions, royal palace lighting, grand banquet hall, and wedding lawns on the Palanpur Highway.
            </p>
          </div>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 bg-white border border-[#EBEBEB] hover:bg-[#BCE2A3]/30 text-[#222222] font-bold text-xs px-5 py-2.5 rounded-full self-start md:self-auto transition-colors shadow-xs"
          >
            Enquire for Events
          </a>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {galleryCategories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#5A724A] text-white shadow-xs'
                  : 'bg-white border border-[#EBEBEB] text-[#818181] hover:text-[#222222] hover:bg-white/80'
              }`}
            >
              {cat}
              <span className={`ml-1.5 text-[10px] py-0.5 px-1.5 rounded-full ${
                activeCategory === cat ? 'bg-white/20 text-white' : 'bg-[#F4F6F0] text-[#5A724A]'
              }`}>
                {cat === 'All' ? venueGallery.length : venueGallery.filter(v => v.category === cat).length}
              </span>
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGallery.map((item, index) => (
            <motion.div
              key={item.id}
              {...fade}
              onClick={() => setLightboxIndex(index)}
              className="bg-white border border-[#EBEBEB] rounded-3xl overflow-hidden shadow-xs hover:shadow-[0_16px_36px_rgba(90,114,74,0.16)] transition-all duration-300 group cursor-pointer flex flex-col"
            >
              <div className="relative aspect-4/3 overflow-hidden bg-[#ECEFE6]">
                <img
                  src={item.src}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-[#425934] text-[11px] font-bold px-3 py-1 rounded-full shadow-xs">
                  {item.tag}
                </span>
                <div className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-white/95 backdrop-blur-md text-[#222222] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-md">
                  <Eye size={17} />
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-[#222222] group-hover:text-[#5A724A] transition-colors">{item.title}</h3>
                  <p className="text-xs text-[#818181] mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-[#F0F0F0] flex items-center justify-between text-[11px] text-[#5A724A] font-bold">
                  <span>View Full Photo</span>
                  <span>→</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredGallery[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute -top-12 right-0 sm:top-4 sm:right-4 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close image"
              >
                <X size={20} />
              </button>

              {/* Prev / Next controls */}
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight size={24} />
              </button>

              {/* Main Image */}
              <div className="overflow-hidden rounded-3xl bg-black max-h-[72vh] flex items-center justify-center shadow-2xl">
                <img
                  src={filteredGallery[lightboxIndex].src}
                  alt={filteredGallery[lightboxIndex].title}
                  className="max-h-[72vh] w-auto max-w-full object-contain rounded-2xl"
                />
              </div>

              {/* Caption & Details */}
              <div className="w-full mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-white px-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#BCE2A3]">
                      {filteredGallery[lightboxIndex].tag}
                    </span>
                    <span className="text-xs text-white/50">•</span>
                    <span className="text-xs text-white/60">
                      {lightboxIndex + 1} of {filteredGallery.length}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold">{filteredGallery[lightboxIndex].title}</h4>
                  <p className="text-xs text-white/70 max-w-2xl mt-0.5">{filteredGallery[lightboxIndex].desc}</p>
                </div>
                <a
                  href="#contact"
                  onClick={() => setLightboxIndex(null)}
                  className="px-5 py-2.5 bg-[#5A724A] hover:bg-[#485D3B] text-white text-xs font-bold rounded-full transition-colors whitespace-nowrap shrink-0 shadow-xs"
                >
                  Book for Event
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section id="contact" className="max-w-6xl mx-auto px-4 py-14">
        <div className="sage-gradient text-white rounded-[2rem] p-8 md:p-12 grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3 !text-white">Book a table or an event</h2>
            <p className="text-white/80">Call us for banquet, party plot and room enquiries.</p>
          </div>
          <div className="space-y-3 text-sm">
            <a href={TEL} className="flex items-center gap-3 font-bold text-lg"><Phone size={18} />{PHONE}</a>
            <a href={`mailto:${EMAIL}`} className="flex items-center gap-3"><Mail size={18} />{EMAIL}</a>
            <a href={MAPS} target="_blank" rel="noreferrer" className="flex items-center gap-3"><MapPin size={18} />{ADDRESS}</a>
            <a href="https://instagram.com/sparkling_resorts" target="_blank" rel="noreferrer" className="flex items-center gap-3"><Instagram size={18} />@sparkling_resorts</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#EBEBEB] py-10 text-center text-xs text-[#818181] bg-white">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-5">
          <img src="/images/sparkling-logo-dark.png" alt="The Sparkling Garden Restaurant" className="h-10 w-auto object-contain opacity-90" />
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs">
            <span className="font-bold text-[#222222] uppercase tracking-wider text-[11px]">Staff Access:</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link to="/admin/login" className="px-3 py-1 bg-[#F4F6F0] hover:bg-[#5A724A] hover:text-white rounded-full font-bold text-[#5A724A] transition-colors">Admin Login</Link>
              <Link to="/waiter/login" className="px-3 py-1 bg-[#F4F6F0] hover:bg-[#5A724A] hover:text-white rounded-full font-bold text-[#5A724A] transition-colors">Waiter Login</Link>
              <Link to="/kitchen/login" className="px-3 py-1 bg-[#F4F6F0] hover:bg-[#5A724A] hover:text-white rounded-full font-bold text-[#5A724A] transition-colors">Kitchen Login</Link>
              <Link to="/portal" className="px-3 py-1 bg-[#F4F6F0] hover:bg-[#222222] hover:text-white rounded-full font-semibold text-[#818181] transition-colors">Portal Overview</Link>
            </div>
          </div>

          <p className="text-[11px] text-[#818181]">© {new Date().getFullYear()} The Sparkling Garden Restaurant · Rasana Mota, Palanpur Highway, Deesa - 385535</p>
        </div>
      </footer>
    </div>
  );
}
