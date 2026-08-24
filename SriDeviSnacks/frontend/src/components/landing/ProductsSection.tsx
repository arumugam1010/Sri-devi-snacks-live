import React from 'react';
import { ShoppingBag, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productsList } from '../../data/products';

const ProductsSection: React.FC = () => {
  const navigate = useNavigate();
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
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <div className="relative overflow-hidden bg-white mb-6 w-full pt-[125%]"> {/* 4:5 aspect ratio */}
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
                />
                
                {/* Overlay View button */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                  <button className="bg-white text-[#160f0f] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2 hover:bg-[#160f0f] hover:text-white">
                    <Eye className="w-4 h-4" /> View
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
