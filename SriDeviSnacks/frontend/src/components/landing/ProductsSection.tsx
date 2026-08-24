import React from 'react';
import { ShoppingBag } from 'lucide-react';

const productsList = [
  { id: 1, name: 'Achi Murukku', image: '/assets/achi_murukku.jpeg', price: '₹60 / Pack' },
  { id: 2, name: 'Andhra Murukku', image: '/assets/andhra_murukku.jpeg', price: '₹60 / 200g' },
  { id: 3, name: 'Bombay Mixture', image: '/assets/bombay_mixture.jpeg', price: '₹60 / 200g' },
  { id: 5, name: 'Coconut Milk Murukku', image: '/assets/coconut_milk_murukku.jpeg', price: '₹50 / 150g' },
  { id: 6, name: 'Garlic Chilli Murukku', image: '/assets/garlic_chilli_murukku.jpeg', price: '₹50 / 150g' },
  { id: 7, name: 'Garlic Murukku', image: '/assets/garlic_murukku.jpeg', price: '₹50 / 150g' },
  { id: 8, name: 'Ghee Murukku', image: '/assets/ghee_murukku.jpeg', price: '₹50 / 150g' },
  { id: 10, name: 'Kadalai Muttai', image: '/assets/kadalai_muttai.jpeg', price: '₹70 / 200g' },
  { id: 11, name: 'Kai Murukku', image: '/assets/kai_murukku.jpeg', price: '₹60 / 200g' },
  { id: 12, name: 'Kuchi Chips', image: '/assets/kuchi_chips.jpeg', price: '₹40 / 150g' },
  { id: 13, name: 'Special Mixture', image: '/assets/mixture.jpeg', price: '₹60 / 200g' },
  { id: 14, name: 'Nei Chilli', image: '/assets/nei_chilli.jpeg', price: '₹50 / 150g' },
  { id: 15, name: 'Omapodi', image: '/assets/omapodi.jpeg', price: '₹60 / 200g' },
  { id: 16, name: 'Pori Mixture', image: '/assets/pori_mixture.jpeg', price: '₹60 / 200g' },
  { id: 17, name: 'Savu (Sev)', image: '/assets/savu.jpeg', price: '₹60 / 200g' },
  { id: 18, name: 'Seeval', image: '/assets/seeval.jpeg', price: '₹60 / 200g' },
  { id: 19, name: 'Thattai', image: '/assets/thattai.jpeg', price: '₹50 / 150g' },
  { id: 20, name: 'Theankulal Chilli', image: '/assets/theankulal_chilli.jpeg', price: '₹50 / 150g' },
  { id: 21, name: 'Theankulal Murukku', image: '/assets/WhatsApp_Image_2026-07-09_at_10.16.55_PM.jpeg', price: '₹50 / 150g' },
];

const ProductsSection: React.FC = () => {
  return (
    <section className="py-24 md:py-32 bg-[#faf2e7] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-xs font-bold text-[#ab8c52] tracking-[0.2em] uppercase mb-4">Shop</h2>
          <h3 className="text-5xl md:text-6xl text-[#160f0f] mb-6">Our Collection</h3>
          <div className="w-16 h-[1px] bg-[#160f0f] mx-auto mb-6"></div>
          <p className="text-lg text-[#766c69] max-w-2xl mx-auto font-light leading-relaxed">
            Authentic, handcrafted South Indian snacks made fresh daily with premium ingredients and time-honored recipes.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {productsList.map((product) => (
            <div 
              key={product.id} 
              className="group cursor-pointer flex flex-col"
            >
              <div className="relative overflow-hidden bg-white mb-6 w-full pt-[125%]"> {/* 4:5 aspect ratio */}
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
                />
                
                {/* Overlay Add to Cart button */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                  <button className="bg-white text-[#160f0f] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2 hover:bg-[#160f0f] hover:text-white">
                    <ShoppingBag className="w-4 h-4" /> Quick Add
                  </button>
                </div>
              </div>
              
              <div className="text-center flex-grow flex flex-col justify-between">
                <div>
                  <h4 className="text-lg text-[#160f0f] mb-2 font-medium tracking-wide">{product.name}</h4>
                </div>
                <p className="text-[#766c69] font-light mt-2">{product.price}</p>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
};

export default ProductsSection;
