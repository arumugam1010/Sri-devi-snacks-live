import React, { useState, useEffect } from 'react';
import { uploadAPI, landingCmsAPI } from '../services/api';
import { Upload, CheckCircle, AlertCircle, Image as ImageIcon, Save, Plus, Trash2, Edit2 } from 'lucide-react';

const AdminLandingSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'images' | 'text' | 'products'>('products');
  
  // Images Tab State
  const [uploading, setUploading] = useState<string | null>(null);
  
  // Text Tab State
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Products Tab State
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productForm, setProductForm] = useState({ id: null, name: '', image: '', price: '', description: '', display_order: 0 });

  useEffect(() => {
    fetchSettings();
    fetchProducts();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await landingCmsAPI.getSettings();
      setSettings(data.settings);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await landingCmsAPI.getProducts();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // === IMAGES TAB LOGIC ===
  const heroBanners = [
    { id: 'hero_banner', name: 'Hero Banner 1', filename: 'hero_banner.jpg', current: '/assets/hero_banner.jpg' },
    { id: 'banner_2', name: 'Hero Banner 2', filename: 'banner_2.jpg', current: '/assets/banner_2.jpg' },
    { id: 'banner_3', name: 'Hero Banner 3', filename: 'banner_3.jpg', current: '/assets/banner_3.jpg' },
    { id: 'banner_4', name: 'Hero Banner 4', filename: 'banner_4.jpg', current: '/assets/banner_4.jpg' },
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, filename: string, id: string) => {
    const targetInput = e.target;
    if (!targetInput.files || targetInput.files.length === 0) return;
    const file = targetInput.files[0];
    const formData = new FormData();
    formData.append('image', file);
    formData.append('filename', filename);

    setUploading(id);
    try {
      await uploadAPI.uploadImage(formData);
      window.alert("Successfully updated image!");
    } catch (err: any) {
      window.alert("Error: " + err.message);
    } finally {
      setUploading(null);
      targetInput.value = ''; // Safely reset file input
    }
  };

  // === TEXT TAB LOGIC ===
  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveTextSettings = async () => {
    setSavingSettings(true);
    try {
      await landingCmsAPI.saveSettings(settings);
      window.alert("Text settings saved successfully!");
    } catch (err: any) {
      window.alert("Error: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // === PRODUCTS TAB LOGIC ===
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await landingCmsAPI.saveProduct(productForm);
      window.alert("Product saved successfully!");
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      window.alert("Error: " + err.message);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await landingCmsAPI.deleteProduct(id);
      fetchProducts();
    } catch (err: any) {
      window.alert("Error: " + err.message);
    }
  };

  const openProductForm = (product?: any) => {
    if (product) {
      setProductForm({ ...product });
    } else {
      setProductForm({ id: null, name: '', image: '/assets/', price: '', description: '', display_order: products.length });
    }
    setEditingProduct(true);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetInput = e.target;
    if (!targetInput.files || targetInput.files.length === 0) return;
    const file = targetInput.files[0];
    const filename = `prod_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-]/g, '')}`;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('filename', filename);

    setUploading('product_image');
    try {
      await uploadAPI.uploadImage(formData);
      setProductForm(prev => ({ ...prev, image: `/assets/${filename}` }));
      window.alert("Image uploaded successfully!");
    } catch (err: any) {
      window.alert("Error: " + err.message);
    } finally {
      setUploading(null);
      targetInput.value = '';
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Landing Page CMS</h2>

      {/* TABS */}
      <div className="flex border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('products')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'products' ? 'border-[#8B0000] text-[#8B0000]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Products
        </button>
        <button 
          onClick={() => setActiveTab('text')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'text' ? 'border-[#8B0000] text-[#8B0000]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Text Content
        </button>
        <button 
          onClick={() => setActiveTab('images')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'images' ? 'border-[#8B0000] text-[#8B0000]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Hero Banners
        </button>
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div>
          {editingProduct ? (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold mb-4">{productForm.id ? 'Edit Product' : 'Add New Product'}</h3>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input required type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Text (e.g. ₹60 / Pack)</label>
                  <input required type="text" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea required value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md rows-3" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <div className="flex gap-2">
                    <input type="text" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} className="flex-1 p-2 border border-gray-300 rounded-md" />
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md border border-gray-300 flex items-center">
                      {uploading === 'product_image' ? <Upload className="w-4 h-4 mr-2 animate-bounce" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                      Upload Image
                      <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleProductImageUpload} disabled={uploading === 'product_image'} />
                    </label>
                  </div>
                  {productForm.image && (
                    <img src={productForm.image} alt="Preview" className="mt-2 h-24 object-contain border border-gray-200 rounded-md" />
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-[#8B0000] hover:bg-[#600000] rounded-md flex items-center">
                    <Save className="w-4 h-4 mr-2" /> Save Product
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600">Manage products displayed on the landing page.</p>
                <button onClick={() => openProductForm()} className="px-4 py-2 bg-[#8B0000] text-white rounded-md flex items-center hover:bg-[#600000]">
                  <Plus className="w-4 h-4 mr-2" /> Add Product
                </button>
              </div>
              
              {loadingProducts ? <p>Loading...</p> : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-4 text-sm font-semibold text-gray-600">Image</th>
                        <th className="p-4 text-sm font-semibold text-gray-600">Name</th>
                        <th className="p-4 text-sm font-semibold text-gray-600">Price</th>
                        <th className="p-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4"><img src={p.image} className="w-12 h-12 rounded object-cover" /></td>
                          <td className="p-4 font-medium text-gray-800">{p.name}</td>
                          <td className="p-4 text-gray-600">{p.price}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => openProductForm(p)} className="text-blue-600 hover:text-blue-800 mr-3"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TEXT TAB */}
      {activeTab === 'text' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-2xl">
          <p className="text-gray-600 mb-6">Update the text content shown on the public landing page.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title (Tamil Slogan)</label>
              <input type="text" value={settings['hero_title'] || 'நம்ம ஊரு... நம்ம சுவை... 100% வள்ளியூர் பாரம்பரியம்!'} onChange={e => handleSettingChange('hero_title', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
              <textarea value={settings['hero_subtitle'] || 'Premium, handcrafted South Indian snacks & sweets delivered to your doorstep.'} onChange={e => handleSettingChange('hero_subtitle', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md rows-3" />
            </div>
            
            <button 
              onClick={saveTextSettings}
              disabled={savingSettings}
              className="mt-4 px-6 py-2 bg-[#8B0000] text-white rounded-md flex items-center hover:bg-[#600000] disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Text</>}
            </button>
          </div>
        </div>
      )}

      {/* IMAGES TAB */}
      {activeTab === 'images' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {heroBanners.map((img) => (
            <div key={img.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col items-center">
              <h3 className="font-semibold text-gray-800 mb-2">{img.name}</h3>
              <p className="text-xs text-gray-500 mb-4 font-mono">{img.filename}</p>
              
              <div className="w-full aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden border border-gray-200 flex items-center justify-center">
                <img 
                  src={`${img.current}?v=${Date.now()}`} 
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="w-full relative">
                <label className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg cursor-pointer transition-colors ${uploading === img.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Upload className={`w-4 h-4 ${uploading === img.id ? 'animate-bounce text-[#8B0000]' : 'text-gray-600'}`} />
                  <span className="text-sm font-medium text-gray-700">
                    {uploading === img.id ? 'Uploading...' : 'Upload New Image'}
                  </span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/jpeg, image/png"
                    onChange={(e) => handleFileChange(e, img.filename, img.id)}
                    disabled={uploading !== null}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default AdminLandingSettings;
