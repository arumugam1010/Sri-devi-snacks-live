import React from 'react';
import { ShieldCheck, Leaf, Heart, History, Users, Factory, Sparkles, Settings } from 'lucide-react';
const Logo = '/Logo.png';
const FactoryImg = '/assets/factory-placeholder.jpg'; // We can use a placeholder or existing image

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-[#fffdf8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-[#8B0000] tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
            <span className="w-8 h-0.5 bg-[#8B0000]"></span> Our Heritage <span className="w-8 h-0.5 bg-[#8B0000]"></span>
          </h2>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
            The Story of Sri Devi Snacks
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Rooted in Vallioor, driven by a passion for authentic Tamil Nadu flavors, and powered by modern manufacturing.
          </p>
        </div>

        {/* Story Section */}
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-24">
          <div className="lg:w-1/2">
            <div className="relative p-6">
              <div className="absolute inset-0 border-4 border-[#FFD700] rounded-tl-3xl rounded-br-3xl transform -translate-x-4 -translate-y-4"></div>
              <div className="absolute inset-0 bg-[#8B0000] rounded-tl-3xl rounded-br-3xl transform translate-x-4 translate-y-4"></div>
              <img
                src={Logo}
                alt="Sri Devi Snacks Journey"
                className="relative z-10 w-full h-auto object-cover bg-white p-12 shadow-2xl rounded-tl-3xl rounded-br-3xl"
              />
            </div>
          </div>
          <div className="lg:w-1/2 space-y-6">
            <h3 className="text-3xl font-bold text-gray-900 flex items-center">
              <History className="h-8 w-8 text-[#8B0000] mr-3" />
              Our Humble Beginnings
            </h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              Founded in <strong>May 2020</strong> by <strong>A. Santhanam</strong>, Sri Devi Snacks began as a small, humble unit in Vallioor with a simple mission: to bring the authentic, nostalgic taste of homemade snacks to every household. 
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              What started by supplying a few local shops has now expanded into a massive operation. Through unwavering dedication and a strict commitment to quality, we have grown into a trusted wholesale manufacturer. Today, we proudly supply our premium snacks to <strong>over 500+ retail shops and wholesale distributors</strong> across Chennai, Coimbatore, Hosur, and Mumbai.
            </p>
          </div>
        </div>

        {/* Production & Manufacturing Deep Dive */}
        <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-12 border border-gray-100 mb-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#8B0000]/5 rounded-bl-full -z-10"></div>
          
          <div className="text-center mb-12">
            <h2 className="text-sm font-bold text-[#8B0000] tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
              <span className="w-8 h-0.5 bg-[#8B0000]"></span> Behind the Scenes <span className="w-8 h-0.5 bg-[#8B0000]"></span>
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Our State-of-the-Art Production</h3>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We blend the strict hygiene and scale of modern machinery with the soul and recipes of traditional Tamil cooking.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              
              <div className="flex gap-4">
                <div className="bg-[#8B0000]/10 w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center">
                  <Factory className="w-8 h-8 text-[#8B0000]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Advanced Automated Machinery</h4>
                  <p className="text-gray-600 leading-relaxed">
                    To meet the massive demand of our 500+ retail partners without compromising on quality, all our regular products are manufactured using advanced, heavy-duty food processing machinery. This ensures <strong>100% human-touch-free production</strong>, perfect shape consistency, and ultimate hygiene.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-[#8B0000]/10 w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#8B0000]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Premium Ingredients & Fresh Oil</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Great taste starts with great ingredients. We source the finest rice flour, gram flour, and aromatic spices. Most importantly, we fry all our snacks in <strong>100% fresh, highly refined oil</strong>. We strictly adhere to a "No-Reuse" policy for our oil, guaranteeing a crisp, non-greasy, and healthy snack every time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-[#8B0000]/10 w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-[#8B0000]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">The Art of Handcrafting</h4>
                  <p className="text-gray-600 leading-relaxed">
                    While we embrace technology for scale, we never forget our roots. For marriages and premium special occasions, we exclusively <strong>handcraft our famous Kai Suthu Murukku and traditional Laddu</strong>. Our expert artisans meticulously twist each murukku by hand, bringing an irreplaceable traditional touch to your celebrations.
                  </p>
                </div>
              </div>

            </div>

            {/* Decorative Stats/Highlights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
                <span className="block text-4xl font-extrabold text-[#8B0000] mb-2">500+</span>
                <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Retail Shops</span>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
                <span className="block text-4xl font-extrabold text-[#FFD700] mb-2">100%</span>
                <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Refined Oil</span>
              </div>
              <div className="bg-[#8B0000] rounded-2xl p-6 border border-[#8B0000] text-center col-span-2 shadow-lg">
                <ShieldCheck className="w-10 h-10 text-[#FFD700] mx-auto mb-3" />
                <span className="block text-xl font-extrabold text-white mb-1">Zero Preservatives</span>
                <span className="text-sm font-medium text-gray-200">No Artificial Colors or Chemicals Added</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutSection;
