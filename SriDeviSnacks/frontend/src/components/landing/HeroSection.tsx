import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Clock, Truck, Award, Star,
  ChevronDown, ChevronUp, CheckCircle, Quote,
  ArrowRight, ShoppingBag
} from 'lucide-react';
import { landingCmsAPI } from '../../services/api';

const Logo = '/Logo.png';
const SnacksBg = '/assets/snacks.png';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loadingCms, setLoadingCms] = useState(true);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  React.useEffect(() => {
    const loadCMS = async () => {
      try {
        const [settingsData, productsData] = await Promise.all([
          landingCmsAPI.getSettings(),
          landingCmsAPI.getProducts()
        ]);
        
        if (settingsData.success) {
          setSettings(settingsData.settings);
        }
        if (productsData.success) {
          setTopProducts((productsData.products || []).slice(0, 4));
        }
      } catch (e) {
        console.error("Failed to load CMS data", e);
      } finally {
        setLoadingCms(false);
      }
    };
    loadCMS();
  }, []);

  const faqs = [
    { q: 'How long do the snacks stay fresh?', a: 'Our savories typically have a shelf life of 3-4 weeks when stored in an airtight container. Sweets are best consumed within 7-10 days.' },
    { q: 'Do you offer bulk orders for events?', a: 'Yes! We cater for weddings, corporate events, and festivals. Please contact us at least 1 week in advance for large orders.' },
    { q: 'Do you deliver outside Vallioor?', a: 'Yes, we partner with reliable courier services to deliver across Tamil Nadu. Shipping charges apply based on distance.' },
    { q: 'Are your snacks made with pure oil?', a: 'Absolutely. We strictly use premium quality, fresh oil for all our preparations. We never reuse oil.' },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  const carouselImages = [
    '/assets/hero_banner.jpg?v=5',
    '/assets/banner_2.jpg?v=5',
    '/assets/banner_3.jpg?v=5',
    '/assets/banner_4.jpg?v=5'
  ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  return (
    <div className="bg-[#faf2e7] font-sans text-[#3e3333]">
      <section className="relative w-full flex flex-col items-center justify-center overflow-hidden bg-[#160f0f]">

        {/* Carousel Images - Using responsive image layout to maintain perfect aspect ratio */}
        <div className="relative w-full">
          {/* Invisible spacer to set the container height based on the first banner's aspect ratio */}
          <img src={carouselImages[0]} alt="Spacer" className="w-full h-auto invisible pointer-events-none" />
          
          {carouselImages.map((img, index) => (
            <img
              key={index}
              src={img}
              alt="Banner"
              className={`absolute top-0 left-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${currentSlide === index ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>

        {/* Absolute Overlay for Content */}
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center px-4">
          <div className="mb-4 md:mb-8 flex flex-col items-center max-w-4xl mx-auto">
            {/* Tamil Slogan */}
            {!loadingCms && (settings['hero_title'] ?? 'நம்ம ஊரு... நம்ம சுவை... 100% வள்ளியூர் பாரம்பரியம்!') !== '' && (
              <h1 className="text-xl sm:text-3xl md:text-5xl mb-2 md:mb-6 font-bold tracking-wide text-center" style={{ fontFamily: "'Playfair Display', serif", color: settings['hero_title_color'] || '#ffd700', fontSize: settings['hero_title_size'], textShadow: '2px 2px 4px rgba(0,0,0,0.9), 0px 0px 15px rgba(0,0,0,0.8)' }}>
                {settings['hero_title'] ?? 'நம்ம ஊரு... நம்ம சுவை... 100% வள்ளியூர் பாரம்பரியம்!'}
              </h1>
            )}

            {!loadingCms && (settings['hero_subtitle'] ?? 'Premium, handcrafted South Indian snacks & sweets delivered to your doorstep.') !== '' && (
              <p className="text-xs sm:text-lg md:text-2xl mb-2 max-w-2xl mx-auto leading-relaxed font-medium tracking-wide text-center" style={{ color: settings['hero_subtitle_color'] || '#fdfbf7', fontSize: settings['hero_subtitle_size'], textShadow: '1px 1px 3px rgba(0,0,0,0.9), 0px 0px 10px rgba(0,0,0,0.7)' }}>
                {settings['hero_subtitle'] ?? 'Premium, handcrafted South Indian snacks & sweets delivered to your doorstep.'}
              </p>
            )}
          </div>

          <div className="flex flex-row justify-center gap-2 md:gap-6 mt-2 md:mt-4">
            <button onClick={() => navigate('/our-products')} className="bg-[#8b0000] hover:bg-[#600000] text-[#ffd700] py-2 px-3 md:py-4 md:px-10 rounded transition duration-300 text-[10px] sm:text-sm md:text-base tracking-widest uppercase font-bold shadow-2xl border border-[#ab8c52] flex items-center justify-center gap-1 md:gap-3">
              Shop All Snacks <ArrowRight className="w-3 h-3 md:w-5 md:h-5" />
            </button>
            <button onClick={() => navigate('/about')} className="bg-black/40 text-[#fdfbf7] hover:text-[#ffd700] border border-[#ab8c52] hover:border-[#ffd700] py-2 px-3 md:py-4 md:px-10 rounded transition duration-300 text-[10px] sm:text-sm md:text-base tracking-widest uppercase font-bold backdrop-blur-sm shadow-2xl">
              Discover Our Story
            </button>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-4 md:bottom-8 left-0 right-0 z-20 flex justify-center gap-2 md:gap-3">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 md:h-3 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-[#ffd700] w-6 md:w-8' : 'bg-white/50 hover:bg-[#ab8c52] w-2 md:w-3'
                }`}
            ></button>
          ))}
        </div>
      </section>

      {/* 2. FEATURES BAR */}
      <section className="py-12 bg-[#faf2e7] border-b border-[#e6ddcb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center p-6 rounded-2xl bg-white border border-[#e6ddcb] shadow-sm hover:shadow-md transition-shadow">
              <ShieldCheck className="h-10 w-10 mb-4 text-[#8b0000]" />
              <span className="text-sm font-bold uppercase tracking-wider text-[#160f0f]">100% Authentic</span>
              <span className="text-xs text-[#766c69] mt-2 font-medium">Traditional Vallioor Recipes</span>
            </div>
            <div className="flex flex-col items-center p-6 rounded-2xl bg-white border border-[#e6ddcb] shadow-sm hover:shadow-md transition-shadow">
              <Award className="h-10 w-10 mb-4 text-[#8b0000]" />
              <span className="text-sm font-bold uppercase tracking-wider text-[#160f0f]">Premium Quality</span>
              <span className="text-xs text-gray-500 mt-2">No Compromise on Ingredients</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl hover:shadow-md transition-shadow bg-white border border-gray-100">
              <Clock className="h-10 w-10 mb-4 text-[#8B0000]" />
              <span className="text-sm font-bold uppercase tracking-wider text-gray-800">Made Fresh Daily</span>
              <span className="text-xs text-gray-500 mt-2">Crispy & Crunchy Guaranteed</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl hover:shadow-md transition-shadow bg-white border border-gray-100">
              <Truck className="h-10 w-10 mb-4 text-[#8B0000]" />
              <span className="text-sm font-bold uppercase tracking-wider text-gray-800">Fast Delivery</span>
              <span className="text-xs text-gray-500 mt-2">Securely Packed & Shipped</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. STORY SNEAK PEEK */}
      <section className="py-24 bg-[#faf2e7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2 w-full order-2 md:order-1">
            <div className="relative p-6">
              <div className="absolute inset-0 border-2 border-[#ab8c52] rounded-tl-3xl rounded-br-3xl transform -translate-x-4 -translate-y-4"></div>
              <div className="absolute inset-0 bg-[#8b0000] rounded-tl-3xl rounded-br-3xl transform translate-x-4 translate-y-4"></div>
              <img src={Logo} alt="Sri Devi Snacks" className="relative z-10 w-full h-auto bg-[#fffdf8] p-12 shadow-2xl rounded-tl-3xl rounded-br-3xl" />
            </div>
          </div>
          <div className="md:w-1/2 order-1 md:order-2">
            <h2 className="text-sm font-bold text-[#8b0000] tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
              <span className="w-10 h-0.5 bg-[#8b0000]"></span> Our Legacy
            </h2>
            <h3 className="text-4xl md:text-5xl text-[#160f0f] mb-8 leading-tight">The Authentic Taste of <br /><span className="text-[#8b0000] italic">Vallioor</span></h3>
            <p className="text-[#3e3333] mb-6 leading-relaxed text-lg font-medium">
              Started by A. Santhanam as a small unit in May 2020, Sri Devi Snacks has grown gradually to supply over 500+ shops and wholesale suppliers.
            </p>
            <p className="text-[#3e3333] mb-8 leading-relaxed text-lg">
              While all our regular snacks are precisely crafted using advanced machinery for ultimate hygiene and scale, we exclusively handcraft special Kai Suthu Murukku and Laddu for weddings. Today, our reach extends to Chennai, Coimbatore, Hosur, and Mumbai.
            </p>
            <button onClick={() => navigate('/about')} className="group flex items-center gap-2 text-[#8b0000] font-bold hover:text-[#600000] transition-colors uppercase tracking-widest text-sm border-b-2 border-[#ab8c52] pb-1">
              Read the full story <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. TOP SELLING PRODUCTS */}
      <section className="py-24 bg-[#fffdf8] border-y border-[#e6ddcb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-[#8b0000] tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
              <span className="w-8 h-0.5 bg-[#8b0000]"></span> Our Bestsellers <span className="w-8 h-0.5 bg-[#8b0000]"></span>
            </h2>
            <h3 className="text-4xl md:text-5xl text-[#160f0f]">Customer Favorites</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {topProducts.map((product) => (
              <div key={product.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-[#e6ddcb] flex flex-col">
                <div className="relative overflow-hidden cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                  <img src={product.image} alt={product.name} className="w-full h-64 object-cover transform group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-[#160f0f] shadow flex items-center gap-1 border border-[#ab8c52]/30">
                    <Star className="w-3 h-3 fill-[#ffd700] text-[#ffd700]" /> 4.9
                  </div>
                  <div className="absolute inset-0 bg-[#8b0000]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xl text-[#160f0f] cursor-pointer hover:text-[#8b0000] transition-colors" onClick={() => navigate(`/product/${product.id}`)}>{product.name}</h4>
                  </div>
                  <p className="text-[#ab8c52] font-bold text-lg mb-4">{product.price}</p>
                  <button
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="mt-auto w-full bg-[#fdfbf7] border border-[#ab8c52] hover:bg-[#8b0000] hover:text-[#ffd700] hover:border-[#8b0000] text-[#8b0000] py-3 rounded font-bold uppercase tracking-wider text-sm transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" /> View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button onClick={() => navigate('/our-products')} className="inline-flex items-center gap-2 text-[#ffd700] bg-[#8b0000] hover:bg-[#600000] py-4 px-10 rounded border border-[#ab8c52] font-bold uppercase tracking-widest text-sm transition-colors shadow-lg">
              View All Collections
            </button>
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE US GRID */}
      {/* 5. WHY CHOOSE US GRID */}
      <section className="py-24 bg-[#faf2e7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-sm font-bold text-[#8b0000] tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
              <span className="w-8 h-0.5 bg-[#8b0000]"></span> Quality First <span className="w-8 h-0.5 bg-[#8b0000]"></span>
            </h2>
            <h3 className="text-4xl text-[#160f0f] mb-6">The Sri Devi Promise</h3>
            <p className="text-[#766c69] text-lg font-medium">We don't compromise on quality. Every bite is a testament to our dedication.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[#fdfbf7] flex items-center justify-center mb-6 border-2 border-[#ab8c52] shadow-sm">
                <CheckCircle className="w-10 h-10 text-[#8b0000]" strokeWidth={2} />
              </div>
              <h4 className="text-xl text-[#160f0f] mb-3 font-bold">No Preservatives</h4>
              <p className="text-[#3e3333] text-sm leading-relaxed">We never use artificial colors or chemical preservatives. Just pure, natural ingredients.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[#fdfbf7] flex items-center justify-center mb-6 border-2 border-[#ab8c52] shadow-sm">
                <CheckCircle className="w-10 h-10 text-[#8b0000]" strokeWidth={2} />
              </div>
              <h4 className="text-xl text-[#160f0f] mb-3 font-bold">Refined Oil Only</h4>
              <p className="text-[#3e3333] text-sm leading-relaxed">We fry our snacks in 100% fresh, high-quality refined oil. No reusing, no rancidity.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[#fdfbf7] flex items-center justify-center mb-6 border-2 border-[#ab8c52] shadow-sm">
                <CheckCircle className="w-10 h-10 text-[#8b0000]" strokeWidth={2} />
              </div>
              <h4 className="text-xl text-[#160f0f] mb-3 font-bold">Precision Machined</h4>
              <p className="text-[#3e3333] text-sm leading-relaxed">Regular snacks are prepared using advanced machinery to ensure perfect consistency and ultimate hygiene.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[#fdfbf7] flex items-center justify-center mb-6 border-2 border-[#ab8c52] shadow-sm">
                <CheckCircle className="w-10 h-10 text-[#8b0000]" strokeWidth={2} />
              </div>
              <h4 className="text-xl text-[#160f0f] mb-3 font-bold">Hygienic Environment</h4>
              <p className="text-[#3e3333] text-sm leading-relaxed">Prepared in a strictly sanitized kitchen adhering to top food safety standards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SPECIAL OFFERS / BULK BANNER */}
      <section className="py-24 bg-[#8b0000] text-[#fdfbf7] text-center px-4 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ab8c52 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

        <div className="max-w-4xl mx-auto relative z-10 p-12 border-2 border-[#ab8c52] rounded-3xl bg-[#8b0000]/80 backdrop-blur-sm">
          <span className="text-[#ffd700] font-bold tracking-[0.3em] uppercase mb-4 block">Special Orders</span>
          <h2 className="text-4xl md:text-6xl mb-8 font-bold text-[#fdfbf7]" style={{ fontFamily: "'Playfair Display', serif" }}>Planning a Wedding <br />or Festival?</h2>
          <p className="text-lg md:text-xl text-[#e6ddcb] mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            We provide wholesale bulk ordering and custom sweet boxes for all your special occasions. Impress your guests with Vallioor's finest handcrafted Kai Suthu Murukku and Laddu.
          </p>
          <button onClick={() => navigate('/contact')} className="bg-[#ffd700] hover:bg-[#fdfbf7] text-[#8b0000] py-4 px-12 rounded transition duration-300 text-sm tracking-widest uppercase font-bold shadow-2xl border border-[#ffd700] inline-flex items-center gap-2">
            Get a Custom Quote <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* 7. CUSTOMER TESTIMONIALS */}
      <section className="py-24 bg-[#faf2e7] border-y border-[#e6ddcb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-[#8b0000] tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
              <span className="w-8 h-0.5 bg-[#8b0000]"></span> Reviews <span className="w-8 h-0.5 bg-[#8b0000]"></span>
            </h2>
            <h3 className="text-4xl text-[#160f0f]">What Our Customers Say</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { text: "The Achi Murukku is exactly like how my grandmother used to make it. Incredibly fresh and crunchy!", name: "Rajesh K.", loc: "Chennai" },
              { text: "Ordered 50 boxes of assorted sweets and mixtures for my son's wedding. Excellent packaging and unmatched taste.", name: "Meenakshi S.", loc: "Tirunelveli" },
              { text: "Sri Devi Snacks has become our permanent fix for evening tea. The Garlic Murukku is highly recommended!", name: "Arun T.", loc: "Madurai" },
            ].map((review, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-[#e6ddcb] flex flex-col items-center text-center relative mt-6">
                <div className="absolute -top-6 bg-[#fdfbf7] w-12 h-12 rounded-full flex items-center justify-center border-2 border-[#ab8c52] shadow-sm">
                  <Quote className="w-5 h-5 text-[#8b0000]" fill="currentColor" />
                </div>
                <div className="flex text-[#ffd700] mb-6 mt-4">
                  <Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" />
                </div>
                <p className="text-[#3e3333] text-lg italic mb-8 flex-grow leading-relaxed font-medium">"{review.text}"</p>
                <div>
                  <h5 className="font-bold text-[#160f0f] uppercase tracking-widest text-sm mb-1">{review.name}</h5>
                  <span className="text-xs text-[#766c69] font-medium">{review.loc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. OUR PROCESS */}
      <section className="py-24 bg-[#fffdf8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-sm font-bold text-[#8b0000] tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
            <span className="w-8 h-0.5 bg-[#8b0000]"></span> Craftsmanship & Scale <span className="w-8 h-0.5 bg-[#8b0000]"></span>
          </h2>
          <h2 className="text-4xl text-[#160f0f] mb-6">How We Make Magic at Scale</h2>
          <p className="text-lg text-[#766c69] max-w-3xl mx-auto mb-20 font-medium">From sourcing the finest ingredients to manufacturing with advanced machinery for 500+ shops, our process ensures unmatched quality and hygiene.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {[
              { step: "01", title: "Premium Sourcing", desc: "Selecting the finest, freshest raw ingredients and pure spices." },
              { step: "02", title: "Automated Mixing", desc: "Hygienic dough preparation using industrial-grade automated mixers." },
              { step: "03", title: "Precision Frying", desc: "Machine-extruded and fried perfectly in 100% fresh, un-reused refined oil." },
              { step: "04", title: "Bulk Packaging", desc: "Sealed instantly in bulk packages to lock in crunchiness for transit to Chennai, Mumbai, etc." },
            ].map((p, i) => (
              <div key={i} className="relative group">
                <div className="w-24 h-24 mx-auto rounded-full bg-white border border-[#ab8c52] flex items-center justify-center mb-6 group-hover:bg-[#8b0000] transition-colors duration-500 shadow-sm">
                  <span className="text-3xl font-bold text-[#ab8c52] group-hover:text-[#ffd700] transition-colors duration-500 font-['Playfair_Display']">{p.step}</span>
                </div>
                <h4 className="text-xl text-[#160f0f] mb-3 font-bold">{p.title}</h4>
                <p className="text-[#3e3333] text-sm leading-relaxed">{p.desc}</p>
                {/* Connector line for desktop */}
                {i < 3 && <div className="hidden md:block absolute top-12 left-1/2 w-full h-px bg-[#ab8c52]/50 -z-10"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ SECTION */}
      <section className="py-24 bg-[#faf2e7] border-t border-[#e6ddcb]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-[#8b0000] tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
              <span className="w-8 h-0.5 bg-[#8b0000]"></span> Support <span className="w-8 h-0.5 bg-[#8b0000]"></span>
            </h2>
            <h2 className="text-4xl text-[#160f0f]">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-[#e6ddcb] overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex justify-between items-center p-6 text-left hover:bg-[#fffdf8] transition-colors"
                >
                  <span className="font-bold text-[#160f0f] text-lg font-['Playfair_Display'] tracking-wide">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${openFaq === index ? 'bg-[#8b0000] text-white border-[#8b0000]' : 'bg-[#fdfbf7] text-[#8b0000] border-[#ab8c52]'}`}>
                    {openFaq === index ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="text-[#3e3333] px-6 pb-6 leading-relaxed font-medium">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
