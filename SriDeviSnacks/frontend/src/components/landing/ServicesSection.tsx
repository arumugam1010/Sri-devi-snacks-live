import React from 'react';
import { PackageSearch, Truck, CalendarHeart, Gift } from 'lucide-react';

const ServicesSection: React.FC = () => {
  const services = [
    {
      icon: <PackageSearch className="h-10 w-10 text-[#8B0000] group-hover:text-[#FFD700] transition-colors duration-300" />,
      title: 'Wholesale & B2B Distribution',
      description: 'We are the trusted manufacturing partner for over 500+ retail shops and wholesale distributors. Our automated machinery ensures massive production capacity, flawless consistency, and strict adherence to food safety standards for all bulk orders.',
    },
    {
      icon: <CalendarHeart className="h-10 w-10 text-[#8B0000] group-hover:text-[#FFD700] transition-colors duration-300" />,
      title: 'Special Event Handcrafting',
      description: 'While we use machines for scale, we preserve tradition for special occasions. We take exclusive orders for weddings and festivals, offering handcrafted Kai Suthu Murukku and traditional Laddu made by expert artisans.',
    },
    {
      icon: <Truck className="h-10 w-10 text-[#8B0000] group-hover:text-[#FFD700] transition-colors duration-300" />,
      title: 'Statewide Delivery & Logistics',
      description: 'Our robust logistics network ensures safe and timely delivery across Tamil Nadu and beyond. From our facility in Vallioor, we successfully ship bulk orders to major cities including Chennai, Coimbatore, Hosur, and Mumbai without compromising freshness.',
    },
    {
      icon: <Gift className="h-10 w-10 text-[#8B0000] group-hover:text-[#FFD700] transition-colors duration-300" />,
      title: 'Premium Bulk Packaging',
      description: 'To ensure our snacks remain intact and crunchy during transit, we use high-grade, moisture-proof bulk packaging materials. Every batch is sealed immediately after cooling to lock in the authentic aroma and taste.',
    }
  ];

  return (
    <section id="services" className="py-24 bg-[#fffdf8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-[#8B0000] tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
            <span className="w-8 h-0.5 bg-[#8B0000]"></span> What We Offer <span className="w-8 h-0.5 bg-[#8B0000]"></span>
          </h2>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">Our Services</h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Beyond just making great snacks, we offer comprehensive services to meet your personal, retail, and event needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white rounded-3xl p-10 shadow-lg border border-gray-100 hover:shadow-2xl transition-shadow duration-300 group relative overflow-hidden"
            >
              {/* Decorative background element on hover */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-full -z-10 group-hover:bg-[#8B0000]/5 transition-colors duration-300"></div>
              
              <div className="bg-[#8B0000]/10 w-20 h-20 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#8B0000] transition-colors duration-300 group-hover:rotate-6 transform">
                {service.icon}
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-4">{service.title}</h3>
              <p className="text-gray-600 text-lg leading-relaxed font-medium">
                {service.description}
              </p>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
};

export default ServicesSection;
