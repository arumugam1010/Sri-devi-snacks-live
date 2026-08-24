import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Clock, Truck, Award, Star, 
  ChevronDown, ChevronUp, CheckCircle, Quote,
  ArrowRight, ShoppingBag
} from 'lucide-react';

const Logo = '/Logo.png';
const SnacksBg = '/snacks.png';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const topProducts = [
    { id: 1, name: 'Seeval', image: '/assets/seeval.jpeg', price: '₹60 / 200g' },
    { id: 2, name: 'Bombay Mixture', image: '/assets/bombay_mixture.jpeg', price: '₹60 / 200g' },
    { id: 3, name: 'Omapodi', image: '/assets/omapodi.jpeg', price: '₹60 / 200g' },
    { id: 4, name: 'Ghee Murukku', image: '/assets/ghee_murukku.jpeg', price: '₹50 / 150g' },
  ];

  const faqs = [
    { q: 'How long do the snacks stay fresh?', a: 'Our savories typically have a shelf life of 3-4 weeks when stored in an airtight container. Sweets are best consumed within 7-10 days.' },
    { q: 'Do you offer bulk orders for events?', a: 'Yes! We cater for weddings, corporate events, and festivals. Please contact us at least 1 week in advance for large orders.' },
    { q: 'Do you deliver outside Vallioor?', a: 'Yes, we partner with reliable courier services to deliver across Tamil Nadu. Shipping charges apply based on distance.' },
    { q: 'Are your snacks made with pure oil?', a: 'Absolutely. We strictly use premium quality, fresh oil for all our preparations. We never reuse oil.' },
  ];

  return (
    <div className="bg-[#faf2e7]">
      {/* 1. HERO BANNER */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20 pb-20 border-b border-[#e6ddcb]">
        <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${SnacksBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
        <div className="absolute inset-0 z-10 bg-black/60"></div>

        <div className="relative z-20 max-w-4xl mx-auto px-4 text-center mt-8">
          <div className="mb-12">
            <h1 className="text-6xl md:text-8xl text-white mb-6 leading-tight drop-shadow-lg">Authentic Taste, <br/><span className="italic text-[#f4e4cf]">Uncompromising Quality.</span></h1>
            <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed font-light tracking-wide drop-shadow">
              Discover Vallioor's finest traditional snacks, crafted with love, pure ingredients, and time-honored recipes passed down through generations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button onClick={() => navigate('/our-products')} className="bg-[#ab8c52] hover:bg-[#9a7e4a] text-white py-4 px-10 rounded-full transition duration-300 text-sm tracking-widest uppercase font-medium shadow-xl hover:shadow-2xl flex items-center justify-center gap-3">
               Shop Now <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => navigate('/about')} className="bg-transparent text-white hover:text-[#f4e4cf] border border-white hover:border-[#f4e4cf] py-4 px-10 rounded-full transition duration-300 text-sm tracking-widest uppercase font-medium backdrop-blur-sm bg-black/10">
              Our Heritage
            </button>
          </div>
        </div>
      </section>

      {/* 2. FEATURES BAR */}
      <section className="py-8 border-b border-[#e6ddcb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center"><ShieldCheck className="h-6 w-6 mb-3 text-[#ab8c52]"/> <span className="text-xs uppercase tracking-widest text-[#766c69]">100% Authentic</span></div>
            <div className="flex flex-col items-center"><Award className="h-6 w-6 mb-3 text-[#ab8c52]"/> <span className="text-xs uppercase tracking-widest text-[#766c69]">Premium Quality</span></div>
            <div className="flex flex-col items-center"><Clock className="h-6 w-6 mb-3 text-[#ab8c52]"/> <span className="text-xs uppercase tracking-widest text-[#766c69]">Made Fresh Daily</span></div>
            <div className="flex flex-col items-center"><Truck className="h-6 w-6 mb-3 text-[#ab8c52]"/> <span className="text-xs uppercase tracking-widest text-[#766c69]">Fast Delivery</span></div>
          </div>
        </div>
      </section>

      {/* 3. STORY SNEAK PEEK */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2">
            <h2 className="text-xs font-bold text-[#ab8c52] tracking-[0.2em] uppercase mb-4">Our Roots</h2>
            <h3 className="text-5xl text-[#160f0f] mb-8 leading-tight">Born in Vallioor <br/>in May 2020</h3>
            <p className="text-[#766c69] mb-8 leading-relaxed font-light text-lg">
              Started by A. Santhanam as a small unit, Sri Devi Snacks has grown gradually to supply over 500+ shops and wholesale suppliers. While all our regular snacks are precisely crafted using advanced machinery for ultimate hygiene and scale, we exclusively handcraft special Kai Suthu Murukku and Laddu for weddings. Today, our reach extends to Chennai, Coimbatore, Hosur, and Mumbai.
            </p>
            <button onClick={() => navigate('/about')} className="text-[#160f0f] border-b border-[#160f0f] pb-1 font-medium hover:text-[#ab8c52] hover:border-[#ab8c52] transition-colors uppercase tracking-widest text-xs">
              Read the full story
            </button>
          </div>
          <div className="md:w-1/2 w-full">
             <div className="relative">
               <div className="absolute inset-0 bg-[#f4e4cf] transform translate-x-4 translate-y-4"></div>
               <img src={Logo} alt="Sri Devi Snacks" className="relative z-10 w-full h-auto bg-white p-16 mix-blend-multiply border border-[#e6ddcb]" />
             </div>
          </div>
        </div>
      </section>

      {/* 4. TOP SELLING PRODUCTS */}
      <section className="py-24 md:py-32 bg-[#F7F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="text-xs font-bold text-[#ab8c52] tracking-[0.2em] uppercase mb-4">Our Bestsellers</h2>
              <h3 className="text-5xl text-[#160f0f]">Customer Favorites</h3>
            </div>
            <button onClick={() => navigate('/our-products')} className="text-[#160f0f] border-b border-[#160f0f] pb-1 font-medium hover:text-[#ab8c52] hover:border-[#ab8c52] transition-colors uppercase tracking-widest text-xs hidden md:inline-block">
              View All Products
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {topProducts.map((product) => (
              <div key={product.id} className="group cursor-pointer" onClick={() => navigate('/our-products')}>
                <div className="relative overflow-hidden bg-white mb-6">
                  <img src={product.image} alt={product.name} className="w-full h-[400px] object-cover transform group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
                <div className="text-center">
                  <h4 className="text-xl text-[#160f0f] mb-2 font-medium">{product.name}</h4>
                  <p className="text-[#766c69] font-light">{product.price}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12 md:hidden">
            <button onClick={() => navigate('/our-products')} className="text-[#160f0f] border-b border-[#160f0f] pb-1 font-medium hover:text-[#ab8c52] hover:border-[#ab8c52] transition-colors uppercase tracking-widest text-xs">
               View All Products
            </button>
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE US GRID */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl text-[#160f0f] mb-6">The Sri Devi Promise</h2>
            <p className="text-[#766c69] font-light text-lg">We don't compromise on quality. Every bite is a testament to our dedication.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            <div className="flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-[#ab8c52] mb-6" strokeWidth={1} />
              <h4 className="text-xl text-[#160f0f] mb-3">No Preservatives</h4>
              <p className="text-[#766c69] font-light text-sm leading-relaxed">We never use artificial colors or chemical preservatives. Just pure, natural ingredients.</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-[#ab8c52] mb-6" strokeWidth={1} />
              <h4 className="text-xl text-[#160f0f] mb-3">Refined Oil Only</h4>
              <p className="text-[#766c69] font-light text-sm leading-relaxed">We fry our snacks in 100% fresh, high-quality refined oil. No reusing, no rancidity.</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-[#ab8c52] mb-6" strokeWidth={1} />
              <h4 className="text-xl text-[#160f0f] mb-3">Precision Machine Made</h4>
              <p className="text-[#766c69] font-light text-sm leading-relaxed">All our regular snacks are prepared using advanced machinery to ensure perfect consistency and ultimate hygiene.</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-[#ab8c52] mb-6" strokeWidth={1} />
              <h4 className="text-xl text-[#160f0f] mb-3">Hygienic Environment</h4>
              <p className="text-[#766c69] font-light text-sm leading-relaxed">Prepared in a strictly sanitized kitchen adhering to top food safety standards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SPECIAL OFFERS / BULK BANNER */}
      <section className="py-32 bg-[#3e3333] text-[#f4e4cf] text-center px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl mb-8">Planning a Wedding <br/>or Festival?</h2>
          <p className="text-lg text-[#f4e4cf]/70 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            We provide wholesale bulk ordering and custom sweet boxes for all your special occasions. Impress your guests with Vallioor's finest.
          </p>
          <button onClick={() => navigate('/contact')} className="bg-[#ab8c52] hover:bg-[#9a7e4a] text-white py-4 px-12 rounded-full transition duration-300 text-sm tracking-widest uppercase font-medium shadow-xl">
            Get a Custom Quote
          </button>
        </div>
      </section>

      {/* 7. CUSTOMER TESTIMONIALS */}
      <section className="py-24 md:py-32 bg-[#F7F9FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl text-[#160f0f] mb-4">What Our Customers Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { text: "The Achi Murukku is exactly like how my grandmother used to make it. Incredibly fresh and crunchy!", name: "Rajesh K.", loc: "Chennai" },
              { text: "Ordered 50 boxes of assorted sweets and mixtures for my son's wedding. Excellent packaging and unmatched taste.", name: "Meenakshi S.", loc: "Tirunelveli" },
              { text: "Sri Devi Snacks has become our permanent fix for evening tea. The Garlic Murukku is highly recommended!", name: "Arun T.", loc: "Madurai" },
            ].map((review, i) => (
              <div key={i} className="text-center flex flex-col items-center">
                <div className="flex text-[#ab8c52] mb-6">
                  <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-[#160f0f] text-lg italic mb-8 flex-grow leading-relaxed">"{review.text}"</p>
                <div>
                  <h5 className="font-medium text-[#160f0f] uppercase tracking-widest text-xs mb-1">{review.name}</h5>
                  <span className="text-xs text-[#766c69]">{review.loc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. OUR PROCESS */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl text-[#160f0f] mb-20">How We Make Magic</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {[
              { step: "01", title: "Sourcing", desc: "Selecting the finest, freshest raw ingredients." },
              { step: "02", title: "Prep", desc: "Hand-kneading dough with traditional spices." },
              { step: "03", title: "Frying", desc: "Cooking perfectly in fresh, refined oil." },
              { step: "04", title: "Packing", desc: "Sealing instantly to lock in crunch and flavor." },
            ].map((p, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-light text-[#ab8c52]/20 mb-6 font-['Playfair_Display']">{p.step}</div>
                <h4 className="text-xl text-[#160f0f] mb-3">{p.title}</h4>
                <p className="text-[#766c69] font-light text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ SECTION */}
      <section className="py-24 md:py-32 bg-[#F7F9FA]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl text-[#160f0f] mb-16 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-[#e6ddcb]">
                <button 
                  onClick={() => toggleFaq(index)} 
                  className="w-full flex justify-between items-center py-6 text-left"
                >
                  <span className="font-medium text-[#160f0f] text-lg">{faq.q}</span>
                  {openFaq === index ? <ChevronUp className="w-5 h-5 text-[#ab8c52]" /> : <ChevronDown className="w-5 h-5 text-[#766c69]" />}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === index ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="text-[#766c69] font-light leading-relaxed">
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
