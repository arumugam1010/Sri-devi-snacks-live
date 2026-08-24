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
    { id: 1, name: 'Achi Murukku', image: '/assets/achi_murukku.jpeg', price: '₹60 / Pack' },
    { id: 2, name: 'Bombay Mixture', image: '/assets/bombay_mixture.jpeg', price: '₹60 / 200g' },
    { id: 3, name: 'Traditional Halwa', image: '/assets/halwa.jpeg', price: '₹45 / 100g' },
    { id: 4, name: 'Ghee Murukku', image: '/assets/ghee_murukku.jpeg', price: '₹50 / 150g' },
  ];

  const faqs = [
    { q: 'How long do the snacks stay fresh?', a: 'Our savories typically have a shelf life of 3-4 weeks when stored in an airtight container. Sweets are best consumed within 7-10 days.' },
    { q: 'Do you offer bulk orders for events?', a: 'Yes! We cater for weddings, corporate events, and festivals. Please contact us at least 1 week in advance for large orders.' },
    { q: 'Do you deliver outside Vallioor?', a: 'Yes, we partner with reliable courier services to deliver across Tamil Nadu. Shipping charges apply based on distance.' },
    { q: 'Are your snacks made with pure oil?', a: 'Absolutely. We strictly use premium quality, fresh oil for all our preparations. We never reuse oil.' },
  ];

  return (
    <div className="bg-white">
      {/* 1. HERO BANNER */}
      <section className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden pt-10 pb-20">
        <img src={SnacksBg} alt="Snacks Background" className="absolute inset-0 w-full h-full object-cover z-0 opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white/95 z-10"></div>

        <div className="relative z-20 max-w-4xl mx-auto px-4 text-center mt-8">
          <div className="mb-8">
            <img src={Logo} alt="Sri Devi Snacks Logo" className="h-40 w-40 md:h-56 md:w-56 mx-auto mb-6 drop-shadow-2xl transform hover:scale-105 transition-transform duration-500" />
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-4 tracking-tight">Sri Devi Snacks</h1>
            <p className="text-xl md:text-3xl text-orange-600 font-bold mb-6">Authentic Taste, Uncompromising Quality • Since 2021</p>
            <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-2xl mx-auto leading-relaxed">
              Discover Vallioor's finest traditional snacks, crafted with love, pure ingredients, and time-honored recipes passed down through generations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => navigate('/our-products')} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-full transition duration-300 shadow-xl hover:shadow-2xl text-lg flex items-center justify-center gap-2">
              <ShoppingBag className="w-5 h-5" /> Shop Now
            </button>
            <button onClick={() => navigate('/about')} className="bg-white text-orange-600 font-bold py-4 px-8 rounded-full border-2 border-orange-600 transition duration-300 shadow-md hover:bg-orange-50 text-lg">
              Our Story
            </button>
          </div>
        </div>
      </section>

      {/* 2. FEATURES BAR */}
      <section className="bg-orange-600 py-6 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center"><ShieldCheck className="h-8 w-8 mb-2 opacity-80"/> <span className="font-semibold tracking-wide">100% Authentic</span></div>
            <div className="flex flex-col items-center"><Award className="h-8 w-8 mb-2 opacity-80"/> <span className="font-semibold tracking-wide">Premium Quality</span></div>
            <div className="flex flex-col items-center"><Clock className="h-8 w-8 mb-2 opacity-80"/> <span className="font-semibold tracking-wide">Made Fresh Daily</span></div>
            <div className="flex flex-col items-center"><Truck className="h-8 w-8 mb-2 opacity-80"/> <span className="font-semibold tracking-wide">Fast Delivery</span></div>
          </div>
        </div>
      </section>

      {/* 3. STORY SNEAK PEEK */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <h2 className="text-sm font-bold text-orange-600 tracking-widest uppercase mb-2">Our Roots</h2>
            <h3 className="text-4xl font-extrabold text-gray-900 mb-6">Born in Vallioor in 2021</h3>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Started by A. Santhanam (S/O K. Arumugam) with a simple mission: to bring the nostalgic, homemade taste of Tamil Nadu snacks to every household. What began as a small local venture has grown into a beloved brand, known for strict adherence to quality and traditional preparation methods.
            </p>
            <button onClick={() => navigate('/about')} className="text-orange-600 font-bold flex items-center hover:text-orange-800 transition-colors">
              Read the full story <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
          <div className="md:w-1/2 w-full">
             <div className="bg-white p-4 rounded-3xl shadow-xl transform rotate-3">
               <img src={Logo} alt="Sri Devi Snacks" className="w-full h-auto rounded-2xl bg-orange-50 border border-orange-100 p-8" />
             </div>
          </div>
        </div>
      </section>

      {/* 4. TOP SELLING PRODUCTS */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12 border-b border-gray-100 pb-6">
            <div>
              <h2 className="text-sm font-bold text-orange-600 tracking-widest uppercase mb-2">Our Bestsellers</h2>
              <h3 className="text-4xl font-extrabold text-gray-900">Customer Favorites</h3>
            </div>
            <button onClick={() => navigate('/our-products')} className="hidden sm:flex text-gray-600 font-medium hover:text-orange-600 items-center">
              View All Products <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {topProducts.map((product) => (
              <div key={product.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden">
                <div className="relative overflow-hidden h-64 bg-gray-50 flex items-center justify-center p-4">
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h4>
                  <p className="text-orange-600 font-bold text-lg mb-4">{product.price}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/our-products')} className="sm:hidden mt-8 w-full bg-orange-50 text-orange-600 font-bold py-4 rounded-xl flex justify-center items-center">
             View All Products <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </section>

      {/* 5. WHY CHOOSE US GRID */}
      <section className="py-24 bg-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">The Sri Devi Promise</h2>
            <p className="text-lg text-gray-600">We don't compromise on quality. Every bite is a testament to our dedication.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm flex items-start">
              <CheckCircle className="w-10 h-10 text-orange-500 mr-4 flex-shrink-0" />
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">No Preservatives</h4>
                <p className="text-gray-600">We never use artificial colors or chemical preservatives. Just pure, natural ingredients.</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm flex items-start">
              <CheckCircle className="w-10 h-10 text-orange-500 mr-4 flex-shrink-0" />
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Refined Oil Only</h4>
                <p className="text-gray-600">We fry our snacks in 100% fresh, high-quality refined oil. No reusing, no rancidity.</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm flex items-start">
              <CheckCircle className="w-10 h-10 text-orange-500 mr-4 flex-shrink-0" />
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Handcrafted Daily</h4>
                <p className="text-gray-600">Our snacks are made in small batches every single day to guarantee crunch and freshness.</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm flex items-start">
              <CheckCircle className="w-10 h-10 text-orange-500 mr-4 flex-shrink-0" />
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Hygienic Environment</h4>
                <p className="text-gray-600">Prepared in a strictly sanitized kitchen adhering to top food safety standards.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SPECIAL OFFERS / BULK BANNER */}
      <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-orange-600 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-orange-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl font-extrabold mb-6">Planning a Wedding or Festival?</h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            We provide wholesale bulk ordering and custom sweet boxes for all your special occasions. Impress your guests with Vallioor's finest.
          </p>
          <button onClick={() => navigate('/contact')} className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 px-10 rounded-full transition duration-300 shadow-xl text-lg">
            Get a Custom Quote
          </button>
        </div>
      </section>

      {/* 7. CUSTOMER TESTIMONIALS */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">What Our Customers Say</h2>
            <div className="w-16 h-1 bg-orange-500 mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { text: "The Achi Murukku is exactly like how my grandmother used to make it. Incredibly fresh and crunchy!", name: "Rajesh K.", loc: "Chennai" },
              { text: "Ordered 50 boxes of assorted sweets and mixtures for my son's wedding. Excellent packaging and unmatched taste.", name: "Meenakshi S.", loc: "Tirunelveli" },
              { text: "Sri Devi Snacks has become our permanent fix for evening tea. The Garlic Murukku is highly recommended!", name: "Arun T.", loc: "Madurai" },
            ].map((review, i) => (
              <div key={i} className="bg-gray-50 p-8 rounded-3xl relative">
                <Quote className="w-12 h-12 text-orange-200 absolute top-6 left-6" />
                <p className="text-gray-700 italic relative z-10 mb-6 pt-6">"{review.text}"</p>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <div>
                    <h5 className="font-bold text-gray-900">{review.name}</h5>
                    <span className="text-sm text-gray-500">{review.loc}</span>
                  </div>
                  <div className="flex text-yellow-400">
                    <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. OUR PROCESS */}
      <section className="py-24 bg-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-16">How We Make Magic</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Sourcing", desc: "Selecting the finest, freshest raw ingredients." },
              { step: "02", title: "Prep", desc: "Hand-kneading dough with traditional spices." },
              { step: "03", title: "Frying", desc: "Cooking perfectly in fresh, refined oil." },
              { step: "04", title: "Packing", desc: "Sealing instantly to lock in crunch and flavor." },
            ].map((p, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-black text-orange-100 mb-4">{p.step}</div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{p.title}</h4>
                <p className="text-gray-600">{p.desc}</p>
                {i !== 3 && <div className="hidden md:block absolute top-8 right-0 transform translate-x-1/2 text-orange-300"><ArrowRight className="w-8 h-8" /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ SECTION */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-10 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300">
                <button 
                  onClick={() => toggleFaq(index)} 
                  className="w-full flex justify-between items-center p-6 bg-white hover:bg-gray-50 text-left"
                >
                  <span className="font-bold text-gray-900">{faq.q}</span>
                  {openFaq === index ? <ChevronUp className="w-5 h-5 text-orange-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                {openFaq === index && (
                  <div className="p-6 pt-0 bg-white text-gray-600 leading-relaxed border-t border-gray-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <section className="py-24 bg-orange-600 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-extrabold text-white mb-6">Ready to Taste the Best?</h2>
          <p className="text-xl text-orange-100 mb-10">
            Browse our full catalog of Vallioor's famous snacks and sweets.
          </p>
          <button onClick={() => navigate('/our-products')} className="bg-white text-orange-600 hover:bg-gray-100 font-bold py-4 px-12 rounded-full transition duration-300 shadow-xl text-lg inline-block transform hover:scale-105">
            View Full Menu
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;
