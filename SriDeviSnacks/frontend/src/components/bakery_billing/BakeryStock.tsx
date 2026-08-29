import React, { useState, useEffect } from 'react';
import { Package, Save, CheckCircle2 } from 'lucide-react';
import { bakeryProductsAPI } from '../../services/api';

interface BakeryProduct {
  id: number;
  name: string;
  price: number;
  image: string | null;
  stock: number;
}

export default function BakeryStock() {
  const [products, setProducts] = useState<BakeryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track updating state for individual rows
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await bakeryProductsAPI.getProducts();
      setProducts(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleStockChange = (id: number, newStock: string) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, stock: parseInt(newStock) || 0 } : p
    ));
  };

  const saveStock = async (product: BakeryProduct) => {
    try {
      setUpdatingId(product.id);
      setSuccessId(null);
      
      await bakeryProductsAPI.updateProduct(product.id, {
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.stock
      });
      
      setSuccessId(product.id);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to update stock');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Package className="w-6 h-6 mr-2 text-blue-600" />
          Bakery Stock Management
        </h2>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    No bakery products found. Add them in the Bakery Products tab first.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {product.image ? (
                          <img className="h-10 w-10 rounded-md object-cover mr-3 border border-gray-200" src={product.image} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center mr-3 border border-gray-200">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₹{product.price.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          value={product.stock}
                          onChange={(e) => handleStockChange(product.id, e.target.value)}
                          className="w-24 border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        <span className="text-xs text-gray-500">items</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => saveStock(product)}
                        disabled={updatingId === product.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {updatingId === product.id ? (
                          'Saving...'
                        ) : successId === product.id ? (
                          <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Saved</>
                        ) : (
                          <><Save className="w-3.5 h-3.5 mr-1" /> Update</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
