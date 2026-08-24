import React from 'react';
import { PackageSearch, Truck, CalendarHeart, Gift } from 'lucide-react';

const ServicesSection: React.FC = () => {
  const services = [
    {
      icon: <PackageSearch className="h-10 w-10 text-orange-600" />,
      title: 'Bulk Orders for Retailers',
      description: 'We supply our premium snacks at competitive wholesale prices to supermarkets, grocery stores, and local vendors. Our bulk packaging ensures maximum freshness and shelf-life, empowering your business with high-quality products your customers will love.',
    },
    {
      icon: <CalendarHeart className="h-10 w-10 text-orange-600" />,
      title: 'Special Event Catering',
      description: 'Make your weddings, festivals, and corporate events memorable with our authentic traditional snacks. We offer customized snack boxes and sweet assortments tailored to your specific event requirements, bringing the taste of Vallioor to your celebrations.',
    },
    {
      icon: <Truck className="h-10 w-10 text-orange-600" />,
      title: 'Reliable Door Delivery',
      description: 'Enjoy the convenience of having fresh, crispy snacks delivered right to your doorstep. We partner with reliable delivery networks to ensure fast, safe, and secure transportation across our service areas, guaranteeing that you receive our products in perfect condition.',
    },
    {
      icon: <Gift className="h-10 w-10 text-orange-600" />,
      title: 'Festive Gift Hampers',
      description: 'Celebrate Diwali, Pongal, and other special occasions with our beautifully packaged festive hampers. Thoughtfully curated with a mix of our best-selling sweets and savories, they make the perfect gift for family, friends, and corporate clients.',
    }
  ];

  return (
    <section id="services" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">Our Services</h2>
          <div className="w-24 h-1 bg-orange-500 mx-auto rounded-full mb-8"></div>
          <p className="text-xl text-gray-600 leading-relaxed">
            Beyond just making great snacks, we offer comprehensive services to meet your personal, retail, and event needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white rounded-3xl p-10 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 group"
            >
              <div className="bg-orange-50 w-20 h-20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                {service.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
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
