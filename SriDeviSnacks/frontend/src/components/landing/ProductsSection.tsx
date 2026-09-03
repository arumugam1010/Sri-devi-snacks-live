import React, { useState, useEffect } from 'react';
import { ShoppingBag, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { landingCmsAPI } from '../../services/api';

const ProductsSection: React.FC = () => {
  const navigate = useNavigate();
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await landingCmsAPI.getProducts();
        setProductsList(data.products || []);
      } catch (err) {
        console.error("Failed to load products", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <section className="py-24 md:py-32 bg-[#faf2e7] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-sm font-bold text-[#8b0000] tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
            <span className="w-8 h-0.5 bg-[#8b0000]"></span> Shop <span className="w-8 h-0.5 bg-[#8b0000]"></span>
          </h2>
          <h3 className="text-4xl md:text-6xl text-[#160f0f] mb-6 font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Our Collection</h3>
          <p className="text-lg text-[#766c69] max-w-3xl mx-auto leading-relaxed font-medium">
            From our state-of-the-art facility to your home. Our savories are precision-extruded and fried in fresh, 100% refined oil for unmatched crunchiness, while our specialty sweets are crafted by expert hands. Explore Vallioor's finest selection.
          </p>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center py-20 text-[#ab8c52] font-bold">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {productsList.map((product) => (
              <div 
                key={product.id} 
                className="group cursor-pointer flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-[#e6ddcb]"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="relative overflow-hidden w-full pt-[125%] border-b border-[#e6ddcb]"> {/* 4:5 aspect ratio */}
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
                  />
                  
                  {/* Overlay View button */}
                  <div className="absolute inset-0 bg-[#8b0000]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button className="bg-[#fdfbf7] text-[#8b0000] border border-[#ab8c52] px-6 py-3 rounded text-xs font-bold uppercase tracking-widest shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2 hover:bg-[#8b0000] hover:text-[#ffd700]">
                      <Eye className="w-4 h-4" /> View Details
                    </button>
                  </div>
                </div>
                
                <div className="p-6 text-center flex-grow flex flex-col justify-between bg-[#fffdf8]">
                  <div>
                    <h4 className="text-xl text-[#160f0f] mb-2 font-bold tracking-wide group-hover:text-[#8b0000] transition-colors font-['Playfair_Display']">{product.name}</h4>
                  </div>
                  <p className="text-[#ab8c52] font-bold text-lg mt-2">{product.price}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
      </div>
    </section>
  );
};

export default ProductsSection;
