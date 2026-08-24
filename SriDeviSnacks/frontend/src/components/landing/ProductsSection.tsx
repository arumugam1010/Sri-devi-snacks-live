import React from 'react';

const productsList = [
  { id: 1, name: 'Achi Murukku', image: '/assets/achi_murukku.jpeg', price: '₹60 / Pack' },
  { id: 2, name: 'Andhra Murukku', image: '/assets/andhra_murukku.jpeg', price: '₹60 / 200g' },
  { id: 3, name: 'Bombay Mixture', image: '/assets/bombay_mixture.jpeg', price: '₹60 / 200g' },
  { id: 4, name: 'Potato Chips', image: '/assets/chips.jpeg', price: '₹100 / 200g' },
  { id: 5, name: 'Coconut Milk Murukku', image: '/assets/coconut_milk_murukku.jpeg', price: '₹50 / 150g' },
  { id: 6, name: 'Garlic Chilli Murukku', image: '/assets/garlic_chilli_murukku.jpeg', price: '₹50 / 150g' },
  { id: 7, name: 'Garlic Murukku', image: '/assets/garlic_murukku.jpeg', price: '₹50 / 150g' },
  { id: 8, name: 'Ghee Murukku', image: '/assets/ghee_murukku.jpeg', price: '₹50 / 150g' },
  { id: 9, name: 'Traditional Halwa', image: '/assets/halwa.jpeg', price: '₹45 / 100g' },
  { id: 10, name: 'Kadalai Muttai', image: '/assets/kadalai_muttai.jpeg', price: '₹40 / 200g' },
  { id: 11, name: 'Kai Murukku', image: '/assets/kai_murukku.jpeg', price: '₹60 / 200g' },
  { id: 12, name: 'Kuchi Chips', image: '/assets/kuchi_chips.jpeg', price: '₹40 / 150g' },
  { id: 13, name: 'Special Mixture', image: '/assets/mixture.jpeg', price: '₹60 / 200g' },
  { id: 14, name: 'Nei Chilli', image: '/assets/nei_chilli.jpeg', price: '₹50 / 150g' },
  { id: 15, name: 'Omapodi', image: '/assets/omapodi.jpeg', price: '₹60 / 200g' },
  { id: 16, name: 'Pori Mixture', image: '/assets/pori_mixture.jpeg', price: '₹60 / 200g' },
  { id: 17, name: 'Savu (Sev)', image: '/assets/savu.jpeg', price: '₹60 / 200g' },
  { id: 18, name: 'Seeval', image: '/assets/seeval.jpeg', price: '₹60 / 200g' },
  { id: 19, name: 'Thattai', image: '/assets/thattai.jpeg', price: '₹50 / 150g' },
  { id: 20, name: 'Theankulal Chilli', image: '/assets/theankulal_chilli.jpeg', price: '₹75 / 150g' },
  { id: 21, name: 'Assorted Sweets', image: '/assets/WhatsApp_Image_2026-07-09_at_10.16.55_PM.jpeg', price: '₹200 / Box' },
];

const ProductsSection: React.FC = () => {
  return (
    <section id="products" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 relative inline-block">
            Our Products
            <div className="absolute w-1/2 h-1 bg-orange-600 bottom-0 left-1/4 rounded-full"></div>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mt-4">
            Explore our wide variety of authentic, crunchy, and delicious snacks. Perfect for any time of the day!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {productsList.map((product) => (
            <div 
              key={product.id} 
              className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group"
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="text-white font-semibold bg-orange-600 px-4 py-2 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    View
                  </span>
                </div>
              </div>
              <div className="p-5 text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{product.name}</h3>
                <p className="text-orange-600 font-bold text-xl">{product.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
