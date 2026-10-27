import React, { useState, useEffect } from 'react';
import { Package, Search, Warehouse, IndianRupee, AlertTriangle } from 'lucide-react';
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

  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const lowStockThreshold = 10;

  // Inline editing state matching Snacks Stock model
  const [editingQuantityId, setEditingQuantityId] = useState<number | null>(null);
  const [quantityEditValue, setQuantityEditValue] = useState<string>('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [adjustingId, setAdjustingId] = useState<number | null>(null);

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

  const handleQuantityEdit = (product: BakeryProduct) => {
    setEditingQuantityId(product.id);
    setQuantityEditValue(product.stock.toString());
  };

  const handleQuantityCancel = () => {
    setEditingQuantityId(null);
    setQuantityEditValue('');
  };

  const handleQuantitySave = async (productId: number) => {
    const qty = parseInt(quantityEditValue);
    if (isNaN(qty) || qty < 0) {
      alert('Please enter a valid stock quantity');
      return;
    }
    const product = products.find(p => p.id === productId);
    if (!product) {
      setEditingQuantityId(null);
      return;
    }

    try {
      setSavingId(productId);
      await bakeryProductsAPI.updateProduct(productId, {
        name: product.name,
        price: product.price,
        image: product.image,
        stock: qty
      });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: qty } : p));
      setEditingQuantityId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update stock');
    } finally {
      setSavingId(null);
    }
  };

  const handleQuantityAdjust = async (productId: number, amount: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const oldStock = product.stock;
    const newStock = Math.max(0, oldStock + amount);
    if (newStock === oldStock) return;

    // Optimistic update
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));

    try {
      setAdjustingId(productId);
      await bakeryProductsAPI.updateProduct(productId, {
        name: product.name,
        price: product.price,
        image: product.image,
        stock: newStock
      });
    } catch (err: any) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: oldStock } : p));
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setAdjustingId(null);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (showLowStockOnly) {
      return matchesSearch && product.stock <= lowStockThreshold;
    }
    return matchesSearch;
  });

  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Package className="w-6 h-6 mr-2 text-blue-600" />
            Bakery Stock Management
          </h2>
          <p className="text-gray-600 mt-1">Manage bakery product quantities and stock levels</p>
        </div>
      </div>

      {/* Total Stock Value Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Warehouse className="h-6 w-6 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">Total Stock Value:</span>
          </div>
          <span className="text-xl font-bold text-blue-800">
            ₹{totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border transition ${
              showLowStockOnly
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className={`h-4 w-4 mr-2 ${showLowStockOnly ? 'text-red-600' : 'text-gray-500'}`} />
            Low Stock ({products.filter(p => p.stock <= lowStockThreshold).length})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[650px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate (₹)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value (₹)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No bakery products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const productValue = product.stock * product.price;
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {product.image ? (
                              <img className="h-10 w-10 rounded-full object-cover border border-gray-200" src={product.image} alt={product.name} />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Package className="h-6 w-6 text-green-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          PCS
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {editingQuantityId === product.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              value={quantityEditValue}
                              onChange={(e) => setQuantityEditValue(e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuantitySave(product.id);
                                if (e.key === 'Escape') handleQuantityCancel();
                              }}
                            />
                            <button
                              onClick={() => handleQuantitySave(product.id)}
                              disabled={savingId === product.id}
                              className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {savingId === product.id ? 'Save...' : 'Save'}
                            </button>
                            <button
                              onClick={handleQuantityCancel}
                              className="px-2 py-1 bg-gray-600 text-white text-xs font-medium rounded hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className={product.stock <= lowStockThreshold ? "text-red-600 font-bold flex items-center gap-1.5" : "text-sm font-medium text-gray-900"}>
                              {product.stock}
                              {product.stock <= lowStockThreshold && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                                  Low
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => handleQuantityAdjust(product.id, 1)}
                              disabled={adjustingId === product.id}
                              className="px-1.5 py-0.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 disabled:opacity-50"
                              title="Increase quantity"
                            >
                              +
                            </button>
                            <button
                              onClick={() => handleQuantityAdjust(product.id, -1)}
                              disabled={adjustingId === product.id}
                              className="px-1.5 py-0.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50"
                              title="Decrease quantity"
                            >
                              -
                            </button>
                            <button
                              onClick={() => handleQuantityEdit(product)}
                              className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                              title="Edit quantity"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <IndianRupee className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-sm font-medium text-gray-900">{product.price.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        ₹{productValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
