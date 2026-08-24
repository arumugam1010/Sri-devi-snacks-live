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
              Founded in <strong>May 2021</strong> by <strong>A. Santhanam</strong> (S/O K. Arumugam) in the vibrant town of <strong>Vallioor</strong>, Sri Devi Snacks was born out of a profound love for traditional South Indian culinary heritage. 
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              What started as a modest endeavor to share authentic, homemade-style snacks with the local community quickly blossomed into a beloved brand. A. Santhanam's vision was simple yet powerful: to preserve the timeless recipes passed down through generations and make them accessible to everyone without compromising on quality or taste.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Today, from our headquarters at 128c, Santhanamari Amman Kovil Street, Vallioor, we proudly serve a diverse range of crispy murukkus, flavorful mixtures, and delightful sweets that capture the essence of Tamil Nadu's rich snack culture.
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
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Uncompromising Quality</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                We use only the finest, premium ingredients. Every batch is meticulously crafted to ensure the highest standards of hygiene and taste.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Leaf className="h-10 w-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Authentic Recipes</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Our snacks are made using traditional, time-honored recipes that retain the original, nostalgic flavors of Vallioor.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-10 w-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Made with Love</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Just like a mother's cooking, our snacks are prepared with immense care and passion, ensuring a delightful crunch in every bite.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default AboutSection;
