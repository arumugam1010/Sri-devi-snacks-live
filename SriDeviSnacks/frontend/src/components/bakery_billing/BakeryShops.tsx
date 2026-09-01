import React, { useState, useEffect } from 'react';
import { Store, Plus, Save, X, Edit, Trash2, MapPin } from 'lucide-react';
import { bakeryShopsAPI } from '../../services/api';
import { useAppContext } from '../../context/AppContext';

interface BakeryShop {
  id: number;
  name: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

const BakeryShops: React.FC = () => {
  const [shops, setShops] = useState<BakeryShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null
  });
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const { userRole } = useAppContext();

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const res = await bakeryShopsAPI.getShops();
      setShops(res.data || []);
    } catch (err) {
      console.error('Error fetching bakery shops:', err);
      setError('Failed to load bakery shops');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    
    setGettingLocation(true);
    setError('');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setGettingLocation(false);
        setSuccess('Location captured successfully!');
        setTimeout(() => setSuccess(''), 3000);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setGettingLocation(false);
        setError('Failed to get location. Please ensure location services are enabled.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Shop Name is required');
      return;
    }

    try {
      setError('');
      if (editingId) {
        await bakeryShopsAPI.updateShop(editingId, formData);
        setSuccess('Bakery Shop updated successfully');
      } else {
        await bakeryShopsAPI.createShop(formData);
        setSuccess('Bakery Shop added successfully');
      }
      
      resetForm();
      fetchShops();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving shop:', err);
      setError('Failed to save shop. Please try again.');
    }
  };

  const handleEdit = (shop: BakeryShop) => {
    setFormData({
      name: shop.name,
      phone: shop.phone || '',
      address: shop.address || '',
      latitude: shop.latitude,
      longitude: shop.longitude
    });
    setEditingId(shop.id);
    setShowForm(true);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this shop?')) return;
    
    try {
      await bakeryShopsAPI.deleteShop(id);
      setSuccess('Shop deleted successfully');
      fetchShops();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting shop:', err);
      setError('Failed to delete shop');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '', latitude: null, longitude: null });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  if (loading && shops.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Store className="h-6 w-6 mr-2 text-orange-600" />
            Bakery Shops
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage bakery customers and shop locations.</p>
        </div>
        {!showForm && userRole !== 'ACCOUNTS' && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center shadow-sm"
          >
            <Plus className="h-5 w-5 mr-1" />
            Add Shop
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex justify-between items-center border border-red-100">
          <p>{error}</p>
          <button onClick={() => setError('')}><X className="h-5 w-5" /></button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex justify-between items-center border border-green-100">
          <p>{success}</p>
          <button onClick={() => setSuccess('')}><X className="h-5 w-5" /></button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Bakery Shop' : 'Add New Bakery Shop'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address / Area</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                ></textarea>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-orange-600" /> Location (GPS)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.latitude && formData.longitude 
                      ? `Lat: ${formData.latitude.toFixed(6)}, Lng: ${formData.longitude.toFixed(6)}`
                      : 'No location captured yet.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureLocation}
                  disabled={gettingLocation}
                  className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 flex items-center whitespace-nowrap"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {gettingLocation ? 'Capturing...' : 'Capture Current Location'}
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Shop' : 'Save Shop'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shop List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {shops.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No bakery shops found. Click "Add Shop" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  {userRole !== 'ACCOUNTS' && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {shop.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {shop.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {shop.address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {shop.latitude && shop.longitude ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <MapPin className="w-3 h-3 mr-1" />
                          Set
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Not Set
                        </span>
                      )}
                    </td>
                    {userRole !== 'ACCOUNTS' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(shop)}
                          className="text-orange-600 hover:text-orange-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(shop.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BakeryShops;
