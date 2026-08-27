import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsList } from '../../data/products';
import { ArrowLeft, Phone, Info } from 'lucide-react';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [orderStatus, setOrderStatus] = useState<'idle' | 'coming_soon'>('idle');

  const product = productsList.find((p) => p.id === parseInt(id || '0', 10));

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf2e7]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#160f0f] mb-4">Product not found</h2>
          <button onClick={() => navigate('/our-products')} className="text-[#ab8c52] hover:underline">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="py-24 md:py-32 bg-[#faf2e7] min-h-screen pt-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate('/our-products')}
          className="flex items-center text-[#766c69] hover:text-[#ab8c52] mb-12 transition-colors font-medium tracking-wider uppercase text-sm"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Collection
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-[#e6ddcb]">
          <div className="flex flex-col md:flex-row">
            {/* Product Image */}
            <div className="md:w-1/2 bg-gray-50 flex items-center justify-center p-8 lg:p-16 border-b md:border-b-0 md:border-r border-[#e6ddcb]">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-auto max-h-[500px] object-contain rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Product Info */}
            <div className="md:w-1/2 p-8 lg:p-16 flex flex-col justify-center">
              <h1 className="text-4xl md:text-5xl text-[#160f0f] mb-4 font-bold">{product.name}</h1>
              <p className="text-2xl text-[#ab8c52] mb-8 font-medium">{product.price}</p>
              
              <div className="mb-8">
                <h3 className="text-sm uppercase tracking-widest text-[#766c69] mb-3 font-bold">Description</h3>
                <p className="text-[#160f0f] text-lg leading-relaxed font-light">
                  {product.description || `Experience the authentic taste of Vallioor with our premium ${product.name}. Made fresh daily with the finest ingredients and time-honored traditional recipes.`}
                </p>
              </div>

              <div className="mb-8">
                <h3 className="text-sm uppercase tracking-widest text-[#766c69] mb-4 font-bold">Why You'll Love It</h3>
                <ul className="space-y-3">
                  <li className="flex items-center text-[#160f0f]">
                    <span className="w-2 h-2 bg-[#ab8c52] rounded-full mr-3"></span>
                    Authentic Vallioor Recipe
                  </li>
                  <li className="flex items-center text-[#160f0f]">
                    <span className="w-2 h-2 bg-[#ab8c52] rounded-full mr-3"></span>
                    100% Vegetarian & Freshly Made
                  </li>
                  <li className="flex items-center text-[#160f0f]">
                    <span className="w-2 h-2 bg-[#ab8c52] rounded-full mr-3"></span>
                    No Artificial Preservatives
                  </li>
                  <li className="flex items-center text-[#160f0f]">
                    <span className="w-2 h-2 bg-[#ab8c52] rounded-full mr-3"></span>
                    Crispy, Crunchy & Delicious
                  </li>
                </ul>
              </div>

              <div className="mb-10 grid grid-cols-2 gap-4">
                <div className="bg-[#faf2e7] p-4 rounded-xl border border-[#e6ddcb]">
                  <h4 className="text-sm font-bold text-[#160f0f] mb-1">Shelf Life</h4>
                  <p className="text-sm text-[#766c69]">30 Days</p>
                </div>
                <div className="bg-[#faf2e7] p-4 rounded-xl border border-[#e6ddcb]">
                  <h4 className="text-sm font-bold text-[#160f0f] mb-1">Storage</h4>
                  <p className="text-sm text-[#766c69]">Cool & Dry Place</p>
                </div>
              </div>

              {/* Order Section */}
              <div className="space-y-4 pt-4 border-t border-[#e6ddcb]">
                {orderStatus === 'idle' ? (
                  <button 
                    onClick={() => setOrderStatus('coming_soon')}
                    className="w-full bg-[#ab8c52] hover:bg-[#9a7e4a] text-white py-5 px-8 rounded-xl font-bold tracking-widest uppercase transition-all duration-300 shadow-md hover:shadow-xl text-sm"
                  >
                    Place Order
                  </button>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center animate-fade-in">
                    <div className="flex justify-center mb-3">
                      <Info className="w-8 h-8 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Online Ordering Coming Soon!</h3>
                    <p className="text-gray-700 mb-4">To place an order right now, please call us directly:</p>
                    <div className="flex flex-col items-center gap-2">
                      <a href="tel:+918807810021" className="flex items-center text-lg font-bold text-orange-600 hover:text-orange-700 transition-colors">
                        <Phone className="w-5 h-5 mr-2" /> +91 88078 10021
                      </a>
                      <a href="tel:+919943206339" className="flex items-center text-lg font-bold text-orange-600 hover:text-orange-700 transition-colors">
                        <Phone className="w-5 h-5 mr-2" /> +91 99432 06339
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductDetail;
