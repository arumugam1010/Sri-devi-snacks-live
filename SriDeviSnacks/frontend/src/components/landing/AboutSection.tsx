import React from 'react';
import { ShieldCheck, Leaf, Heart, History, Users } from 'lucide-react';
const Logo = '/Logo.png';

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-orange-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
            The Story of Sri Devi Snacks
          </h2>
          <div className="w-24 h-1 bg-orange-500 mx-auto rounded-full mb-8"></div>
          <p className="text-xl text-gray-600 leading-relaxed">
            Rooted in Vallioor, driven by a passion for authentic Tamil Nadu flavors.
          </p>
        </div>

        {/* Story Section */}
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-24">
          <div className="lg:w-1/2">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-200 rounded-3xl transform translate-x-4 translate-y-4"></div>
              <img
                src={Logo}
                alt="Sri Devi Snacks Journey"
                className="relative rounded-3xl shadow-xl w-full h-auto object-cover bg-white p-8 border border-orange-100"
              />
            </div>
          </div>
          <div className="lg:w-1/2 space-y-6">
            <h3 className="text-3xl font-bold text-gray-900 flex items-center">
              <History className="h-8 w-8 text-orange-500 mr-3" />
              Our Humble Beginnings
            </h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              Founded in <strong>May 2020</strong> by <strong>A. Santhanam</strong>, Sri Devi Snacks began as a small, humble unit in Vallioor. Through dedication and a commitment to quality, we have gradually grown into a trusted name in the snack industry. 
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              To ensure perfect consistency and ultimate hygiene, <strong>all our regular products are manufactured using advanced machinery</strong>. What started by supplying to a few small local shops has now expanded massively. Today, we proudly supply our premium snacks to <strong>over 500+ shops and wholesale suppliers</strong>.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              While we embrace technology for scale, we also honor tradition. For marriages and special occasions, we exclusively handcraft our famous <strong>Kai Suthu Murukku</strong> and traditional <strong>Laddu</strong>. Our reach has grown far beyond Vallioor, with our beloved snacks now being shipped to <strong>Chennai, Coimbatore, Hosur, and Mumbai</strong>.
            </p>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="bg-white rounded-3xl shadow-xl p-12 mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Sri Devi Snacks?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="h-10 w-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Precision Machine Made</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                All our products are manufactured using advanced machinery, ensuring perfect consistency, strict hygiene, and premium quality in every bite.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Trusted by 500+ Shops</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                From a small local unit to a major distributor, our snacks are now the trusted choice for over 500 retail shops and wholesale suppliers.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-10 w-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Special for Marriages</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                We take special orders for marriages, exclusively handcrafting traditional Kai Suthu Murukku and Laddu. Now shipping to Chennai, Coimbatore, Hosur, and Mumbai.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutSection;
