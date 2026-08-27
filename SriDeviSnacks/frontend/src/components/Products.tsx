

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, Tag, DollarSign, ArrowLeft, Store } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { productsAPI, shopsAPI } from '../services/api';
import { Pagination } from './Pagination';

interface Product {
  id: number;
  product_name: string;
  unit: string;
  status: 'active' | 'inactive';
  created_date: string;
  gst: number; // Added gst property
  quantity: number;
  rate: number;
  hsn_code: string; // Added hsn_code property
  price: number; // Added price property
  stockId: number | null;
  image?: string | null;
}

interface ShopProduct {
  id: number;
  shop_id: number;
  product_id: number;
  price: number;
  shop_name: string;
  product_name: string;
  unit: string;
  gst: number;
  hsn_code: string;
}

const Products: React.FC = () => {
  const { weeklySchedule, shopProducts, setShopProducts, products, setProducts, userRole, refreshData } = useAppContext();

  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedProducts, setPaginatedProducts] = useState<Product[]>([]);
  const [pricingPage, setPricingPage] = useState(1);

  const [activeTab, setActiveTab] = useState<'products' | 'pricing'>('products');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShop, setSelectedShop] = useState<number | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [priceEditValue, setPriceEditValue] = useState<string>('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Load product images from localStorage
  useEffect(() => {
    const images: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('product_image_')) {
        const prodIdOrName = key.replace('product_image_', '');
        const value = localStorage.getItem(key);
        if (value) {
          images[prodIdOrName] = value;
        }
      }
    }
    setProductImages(images);
  }, []);

  // Reset pricing page when search or shop changes
  useEffect(() => {
    setPricingPage(1);
  }, [searchTerm, selectedShop]);

  const compressImage = (base64Str: string, maxWidth = 128, maxHeight = 128): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const compressed = await compressImage(base64);
          setPreviewImage(compressed);
        } catch (err) {
          setPreviewImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    const fileInput = document.getElementById('product-image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };


  // Fetch paginated products
  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await productsAPI.getProducts({ page: 1, limit: 1000, search: searchTerm });
        if (response.success) {
          const fetchedProducts: Product[] = response.data.map((product: any) => ({
            id: product.id,
            product_name: product.productName,
            unit: product.unit,
            status: 'active',
            created_date: new Date(product.createdAt).toISOString().split('T')[0],
            gst: product.gst,
            quantity: 0,
            rate: product.price || 0,
            hsn_code: product.hsnCode,
            price: product.price || 0,
            stockId: null,
            image: product.image,
          }));
          setPaginatedProducts(fetchedProducts);
          setTotalPages(response.pagination.totalPages);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, searchTerm]);

  // New useEffect to preload shopProducts for all shops in weeklySchedule in a single call
  React.useEffect(() => {
    const fetchAllShopProducts = async () => {
      try {
        const response = await shopsAPI.getAllShopProducts();
        if (response.success) {
          const fetchedShopProducts: ShopProduct[] = response.data.map((sp: any) => ({
            id: sp.id,
            shop_id: sp.shopId,
            product_id: sp.productId,
            price: sp.price,
            shop_name: sp.shop?.shopName || '',
            product_name: sp.product?.productName || '',
            unit: sp.product?.unit || '',
            gst: sp.product?.gst || 0,
            hsn_code: sp.product?.hsnCode || ''
          }));
          setShopProducts(fetchedShopProducts);
        }
      } catch (error) {
        console.error('Error preloading shop products:', error);
      }
    };

    if (weeklySchedule.length > 0) {
      fetchAllShopProducts();
    }
  }, [weeklySchedule]);




  const [productForm, setProductForm] = useState({
    product_name: '',
    unit: 'kg',
    gst: '', // default gst value as string
    hsn_code: '', // HSN code field
    price: '', // Product price field as string
    mrp: '' // MRP field as string
  });

  const filteredProducts = paginatedProducts.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProduct) {
        // Update existing product via API
        const updatedProductResponse = await productsAPI.updateProduct(editingProduct.id, {
          productName: productForm.product_name,
          unit: productForm.unit,
          gst: parseInt(productForm.gst) || 0,
          hsnCode: productForm.hsn_code,
          price: parseFloat(productForm.price) || 0,
          image: previewImage,
        });

        if (updatedProductResponse.success) {
          if (previewImage) {
            localStorage.setItem(`product_image_${editingProduct.id}`, previewImage);
            setProductImages(prev => ({ ...prev, [editingProduct.id]: previewImage }));
          } else {
            localStorage.removeItem(`product_image_${editingProduct.id}`);
            localStorage.removeItem(`product_image_${editingProduct.product_name}`);
            setProductImages(prev => {
              const copy = { ...prev };
              delete copy[editingProduct.id];
              delete copy[editingProduct.product_name];
              return copy;
            });
          }
          setPaginatedProducts(paginatedProducts.map(product =>
            product.id === editingProduct.id
              ? { ...product, ...productForm, gst: parseInt(productForm.gst) || 0, price: parseFloat(productForm.price) || 0, image: previewImage }
              : product
          ));
          refreshData();
          resetProductForm();
        } else {
          alert(updatedProductResponse.message || 'Failed to update product');
        }
      } else {
        // Call API to create product
        // Transform form data to API expected format
        const apiProductData = {
          productName: productForm.product_name,
          unit: productForm.unit,
          gst: parseInt(productForm.gst) || 0,
          hsnCode: productForm.hsn_code,
          price: parseFloat(productForm.price) || 0,
          image: previewImage,
        };

        // Import productsAPI at top: import { productsAPI } from '../services/api';
        const response = await productsAPI.createProduct(apiProductData);

        if (response.success) {
          const createdProduct = response.data;
          if (previewImage) {
            localStorage.setItem(`product_image_${createdProduct.id}`, previewImage);
            setProductImages(prev => ({ ...prev, [createdProduct.id]: previewImage }));
          }
          const newProduct: Product = {
            id: createdProduct.id,
            product_name: createdProduct.productName,
            unit: createdProduct.unit,
            status: 'active',
            created_date: new Date(createdProduct.createdAt).toISOString().split('T')[0],
            gst: createdProduct.gst,
            quantity: 0,
            rate: createdProduct.price || 0,
            hsn_code: createdProduct.hsnCode,
            price: createdProduct.price || 0,
            stockId: null,
            image: createdProduct.image,
          };
          setPaginatedProducts([...paginatedProducts, newProduct]);
          refreshData();
          resetProductForm();
        } else {
          alert(response.message || 'Failed to create product');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error creating product');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      product_name: '',
      unit: 'kg',
      gst: '', // default gst value as string
      hsn_code: '', // HSN code field
      price: '', // Product price field as string
      mrp: '' // MRP field as string
    });
    setPreviewImage(null);
    setEditingProduct(null);
    setShowModal(false);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    
    // Calculate MRP based on base price and GST
    const gstPercent = product.gst || 0;
    const basePrice = product.price || 0;
    const mrp = basePrice + (basePrice * (gstPercent / 100));

    setProductForm({
      product_name: product.product_name,
      unit: product.unit,
      gst: product.gst.toString(),
      hsn_code: product.hsn_code,
      price: product.price.toString(),
      mrp: mrp > 0 ? mrp.toFixed(2) : ''
    });
    const storedImage = product.image || productImages[product.id] || productImages[product.product_name] || null;
    setPreviewImage(storedImage);
    setShowModal(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await productsAPI.deleteProduct(id);
        if (response.success) {
          localStorage.removeItem(`product_image_${id}`);
          setProductImages(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
          });
          setPaginatedProducts(paginatedProducts.filter(product => product.id !== id));
          setShopProducts(shopProducts.filter(sp => sp.product_id !== id));
          refreshData();
        } else {
          alert(response.message || 'Failed to delete product');
        }
      } catch (err: any) {
        alert(err.message || 'Error deleting product');
      }
    }
  };



  const allShops = React.useMemo((): Array<any> => {
    const shopSet = new Set<number>();
    const uniqueShops: Array<any> = [];
    weeklySchedule.forEach(day => {
      day.shops.forEach(shop => {
        if (!shopSet.has(shop.id)) {
          shopSet.add(shop.id);
          uniqueShops.push(shop);
        }
      });
    });
    return uniqueShops;
  }, [weeklySchedule]);

  const handleShopSelect = async (shopId: number) => {
    setSelectedShop(shopId);

    try {
      // Fetch existing shop products from backend
      const response = await shopsAPI.getShopProducts(shopId);
      if (response.success) {
        const fetchedShopProducts: ShopProduct[] = response.data.map((sp: any) => ({
          id: sp.id,
          shop_id: sp.shopId,
          product_id: sp.productId,
          price: sp.price,
          shop_name: sp.shop?.shopName || '',
          product_name: sp.product?.productName || '',
          unit: sp.product?.unit || '',
          gst: sp.product?.gst || 0,
          hsn_code: sp.product?.hsnCode || ''
        }));

        // Merge fetched shop products with existing shopProducts state
        const updatedShopProducts = [...shopProducts.filter(sp => sp.shop_id !== shopId), ...fetchedShopProducts];
        setShopProducts(updatedShopProducts);
      } else {
        // If no shop products exist, initialize with all products at default prices
        const shop = allShops.find(s => s.id === shopId);
        if (!shop) return;

        const newShopProducts: ShopProduct[] = [];
        let maxId = Math.max(...shopProducts.map(sp => sp.id), 0);

        products.forEach(product => {
          const newShopProduct: ShopProduct = {
            id: ++maxId,
            shop_id: shopId,
            product_id: product.id,
            price: product.price || 0,
            shop_name: shop.shop_name,
            product_name: product.product_name,
            unit: product.unit,
            gst: product.gst,
            hsn_code: product.hsn_code
          };
          newShopProducts.push(newShopProduct);
        });

        setShopProducts([...shopProducts.filter(sp => sp.shop_id !== shopId), ...newShopProducts]);
      }
    } catch (error) {
      console.error('Error fetching shop products:', error);
      alert('Failed to load shop products');
    }
  };

  const handleBackToShops = () => {
    setSelectedShop(null);
    setEditingPriceId(null);
  };

  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
  };

  const handleBackToDays = () => {
    setSelectedDay(null);
  };

  // Get products that are not assigned to the selected shop
  const getAvailableProducts = (shopId: number) => {
    return products.filter(product =>
      !shopProducts.some(sp => sp.shop_id === shopId && sp.product_id === product.id)
    );
  };

  const assignProductToShop = async (productId: number, shopId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const shop = allShops.find(s => s.id === shopId);
    if (!shop) return;

    try {
      const response = await productsAPI.createShopProduct({
        shopId: shopId,
        productId: productId,
        price: product.price || 0
      });

      if (response.success) {
        const newShopProduct: ShopProduct = {
          id: response.data.id,
          shop_id: shopId,
          product_id: productId,
          price: product.price || 0,
          shop_name: shop.shop_name,
          product_name: product.product_name,
          unit: product.unit,
          gst: product.gst,
          hsn_code: product.hsn_code
        };
        setShopProducts([...shopProducts, newShopProduct]);
        setShowProductSelector(false);
      } else {
        alert(response.message || 'Failed to add product pricing');
      }
    } catch (error) {
      console.error('Error adding product pricing:', error);
      alert('Failed to add product pricing');
    }
  };

  const removeProductFromShop = async (shopProductId: number) => {
    if (confirm('Are you sure you want to remove this product pricing?')) {
      try {
        const response = await productsAPI.deleteShopProduct(shopProductId);
        if (response.success) {
          setShopProducts(shopProducts.filter(sp => sp.id !== shopProductId));
        } else {
          alert(response.message || 'Failed to remove product pricing');
        }
      } catch (error) {
        console.error('Error removing product pricing:', error);
        alert('Failed to remove product pricing');
      }
    }
  };

  const handlePriceEdit = (shopProduct: ShopProduct) => {
    setEditingPriceId(shopProduct.id);
    setPriceEditValue(shopProduct.price.toString());
  };

  const handlePriceSave = async (shopProductId: number, newPrice?: number) => {
    const price = newPrice !== undefined ? newPrice : parseFloat(priceEditValue);
    if (!isNaN(price)) {
      try {
        const response = await productsAPI.updateShopProduct(shopProductId, { price });
        if (response.success) {
          setShopProducts(shopProducts.map(sp =>
            sp.id === shopProductId
              ? { ...sp, price: price }
              : sp
          ));
        } else {
          alert(response.message || 'Failed to update price');
        }
      } catch (error) {
        console.error('Error updating price:', error);
        alert('Failed to update price');
      }
    }
    setEditingPriceId(null);
  };

  const handlePriceCancel = () => {
    setEditingPriceId(null);
  };

  const handleAddPricing = async (productId: number) => {
    if (!selectedShop) return;

    const productPrice = products.find(p => p.id === productId)?.price || 0;

    try {
      const response = await productsAPI.createShopProduct({
        shopId: selectedShop,
        productId: productId,
        price: productPrice
      });

      if (response.success) {
        // Refresh shop products
        const shopProductsResponse = await shopsAPI.getShopProducts(selectedShop);
        if (shopProductsResponse.success) {
          const fetchedShopProducts: ShopProduct[] = shopProductsResponse.data.map((sp: any) => ({
            id: sp.id,
            shop_id: sp.shopId,
            product_id: sp.productId,
            price: sp.price,
            shop_name: sp.shop?.shopName || '',
            product_name: sp.product?.productName || '',
            unit: sp.product?.unit || '',
            gst: sp.product?.gst || 0,
            hsn_code: sp.product?.hsnCode || ''
          }));
          setShopProducts([
            ...shopProducts.filter(sp => sp.shop_id !== selectedShop),
            ...fetchedShopProducts
          ]);
        }
        setEditingPriceId(response.data.id);
        setPriceEditValue(productPrice.toString());
      } else {
        alert(response.message || 'Failed to add pricing');
      }
    } catch (error) {
      console.error('Error adding pricing:', error);
      alert('Failed to add pricing');
    }
  };

  const handleDeletePricing = async (id: number) => {
    if (confirm('Are you sure you want to delete this pricing?')) {
      try {
        const response = await productsAPI.deleteShopProduct(id);
        if (response.success) {
          setShopProducts(shopProducts.filter(sp => sp.id !== id));
        } else {
          alert(response.message || 'Failed to delete pricing');
        }
      } catch (error) {
        console.error('Error deleting pricing:', error);
        alert('Failed to delete pricing');
      }
    }
  };

  // Get products for selected shop
  const getShopProducts = () => {
    if (!selectedShop) return [];

    const filtered = products.filter(product =>
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.unit.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.map(product => {
      const existingPricing = shopProducts.find(sp =>
        sp.shop_id === selectedShop && sp.product_id === product.id
      );

      return {
        product,
        pricing: existingPricing
      };
    });
  };

  const shopProductsList = getShopProducts();
  const pricingItemsPerPage = 5;
  const totalPricingPages = Math.ceil(shopProductsList.length / pricingItemsPerPage) || 1;
  const paginatedShopProductsList = shopProductsList;
  const selectedShopData = allShops.find((s: any) => s.id === selectedShop);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
          <p className="text-gray-600 mt-1">Manage products and shop-specific pricing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'products'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pricing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shop Pricing
          </button>
        </nav>
      </div>

      {/* Search and Add Button */}
      <div className="flex justify-between items-center">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {activeTab === 'products' && userRole !== 'STAFF' && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </button>
        )}
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
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
                    HSN Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price (₹)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  {userRole !== 'STAFF' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {product.image || productImages[product.id] || productImages[product.product_name] ? (
                            <img
                              src={product.image || productImages[product.id] || productImages[product.product_name]}
                              alt={product.product_name}
                              className="h-10 w-10 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <Package className="h-6 w-6 text-green-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {product.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.hsn_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.gst}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{product.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(product.created_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {userRole !== 'STAFF' && (
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded transition"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {userRole !== 'STAFF' && (
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Day Selection View */}
          {!selectedDay && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select a Day to Manage Shop Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weeklySchedule.map((daySchedule) => {
                  const dayShops = daySchedule.shops;
                  return (
                    <div
                      key={daySchedule.day}
                      onClick={() => handleDaySelect(daySchedule.day)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition"
                    >
                      <h4 className="font-medium text-gray-900 mb-4">{daySchedule.day}</h4>
                      {dayShops.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <Store className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>No shops assigned</p>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <Store className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">{dayShops.length} shops assigned</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shop Selection View for Selected Day */}
          {selectedDay && !selectedShop && (
            <div>
              {/* Header with Back Button */}
              <div className="flex items-center mb-6">
                <button
                  onClick={handleBackToDays}
                  className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
                >
                  <ArrowLeft className="h-5 w-5 mr-1" />
                  Back to Days
                </button>
                <div>
                  <h3 className="text-xl font-medium text-gray-900">
                    Shops for {selectedDay}
                  </h3>
                  <p className="text-gray-600">Select a shop to manage pricing</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weeklySchedule.find(ds => ds.day === selectedDay)?.shops.map((shop) => {
                  const productCount = shopProducts.filter(sp => sp.shop_id === shop.id).length;
                  return (
                    <div
                      key={shop.id}
                      onClick={() => handleShopSelect(shop.id)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center mb-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <Store className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{shop.shop_name}</h4>
                          <p className="text-sm text-gray-500">{productCount} products priced</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Click to manage pricing</span>
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product Pricing View */}
          {selectedShop && (
            <div>
              {/* Header with Back Button */}
              <div className="flex items-center mb-6">
                <button
                  onClick={handleBackToShops}
                  className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
                >
                  <ArrowLeft className="h-5 w-5 mr-1" />
                  Back to Shops
                </button>
                <div>
                  <h3 className="text-xl font-medium text-gray-900">
                    Pricing for {selectedShopData?.shop_name}
                  </h3>
                  <p className="text-gray-600">Manage product prices for this shop</p>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
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
                          Price (₹)
                        </th>
                        {userRole !== 'STAFF' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedShopProductsList.map(({ product, pricing }) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                  <Package className="h-4 w-4 text-green-600" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              {product.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {pricing && editingPriceId === pricing.id ? (
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={priceEditValue}
                                onChange={(e) => setPriceEditValue(e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                autoFocus
                              />
                                <button
                                  onClick={() => handlePriceSave(pricing.id)}
                                  className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handlePriceCancel}
                                  className="ml-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                {userRole !== 'STAFF' && (
                                  <button
                                    onClick={() => {
                                      if (pricing) {
                                        const newPrice = pricing.price + 1;
                                        handlePriceSave(pricing.id, newPrice);
                                      }
                                    }}
                                    className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
                                    title="Increase Price"
                                  >
                                    +
                                  </button>
                                )}
                                  <span className="text-sm font-medium text-gray-900">
                                    {pricing ? `₹${pricing.price}` : `₹${product.price || 0}`}
                                  </span>
                                {userRole !== 'STAFF' && (
                                  <button
                                    onClick={() => {
                                      if (pricing && pricing.price > 0) {
                                        const newPrice = pricing.price - 1;
                                        handlePriceSave(pricing.id, newPrice);
                                      }
                                    }}
                                    className="bg-red-600 text-white p-1 rounded hover:bg-red-700"
                                    title="Decrease Price"
                                  >
                                    -
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          {userRole !== 'STAFF' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                {pricing ? (
                                  <>
                                    <button
                                      onClick={() => handlePriceEdit(pricing)}
                                      className="text-blue-600 hover:text-blue-900 p-1 rounded transition"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePricing(pricing.id)}
                                      className="text-red-600 hover:text-red-900 p-1 rounded transition"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleAddPricing(product.id)}
                                    className="text-green-600 hover:text-green-900 p-1 rounded transition"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.product_name}
                    onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gm">Gram (gm)</option>
                    <option value="ltr">Liter (ltr)</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {/* Status field removed as per update */}
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HSN Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.hsn_code}
                    onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter HSN code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST (%)
                  </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={productForm.gst}
                      onChange={(e) => {
                        const newGst = e.target.value;
                        const mrpVal = parseFloat(productForm.mrp) || 0;
                        const gstVal = parseFloat(newGst) || 0;
                        let newBasePrice = productForm.price;
                        if (mrpVal > 0) {
                          newBasePrice = (mrpVal / (1 + (gstVal / 100))).toFixed(2);
                        }
                        setProductForm({ ...productForm, gst: newGst, price: newBasePrice });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MRP (Inclusive of GST)
                  </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={productForm.mrp}
                      onChange={(e) => {
                        const newMrp = e.target.value;
                        const mrpVal = parseFloat(newMrp) || 0;
                        const gstVal = parseFloat(productForm.gst) || 0;
                        let newBasePrice = '';
                        if (mrpVal > 0) {
                          newBasePrice = (mrpVal / (1 + (gstVal / 100))).toFixed(2);
                        }
                        setProductForm({ ...productForm, mrp: newMrp, price: newBasePrice });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price (₹) (Auto-calculated)
                  </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={productForm.price}
                      onChange={(e) => {
                        const newBasePrice = e.target.value;
                        const basePriceVal = parseFloat(newBasePrice) || 0;
                        const gstVal = parseFloat(productForm.gst) || 0;
                        let newMrp = '';
                        if (basePriceVal > 0) {
                          newMrp = (basePriceVal + (basePriceVal * (gstVal / 100))).toFixed(2);
                        }
                        setProductForm({ ...productForm, price: newBasePrice, mrp: newMrp });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Image
                  </label>
                  <div className="flex items-center space-x-3 mt-1">
                    <div className="h-12 w-12 rounded-lg border border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {previewImage ? (
                        <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex flex-col space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="product-image-upload"
                      />
                      <div className="flex space-x-2">
                        <label
                          htmlFor="product-image-upload"
                          className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                        >
                          Choose Image
                        </label>
                        {previewImage && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    {editingProduct ? 'Update' : 'Add'} Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
