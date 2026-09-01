import React, { useState, useEffect } from 'react';
import { Truck, Plus, Save, X, Edit, Trash2, Box } from 'lucide-react';
import api from '../services/api';
import { useAppContext } from '../context/AppContext';

interface SupplierItem {
  item_name: string;
  default_price: number;
  gst_rate: number;
}

interface Supplier {
  id: number;
  name: string;
  contact_info: string;
  address?: string;
  gst_number?: string;
  items: SupplierItem[];
}

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { userRole } = useAppContext();
  
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [items, setItems] = useState<SupplierItem[]>([
    { item_name: '', default_price: 0, gst_rate: 0 }
  ]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/suppliers');
      if (response.data.success) {
        setSuppliers(response.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch suppliers:", err);
      setError(err.response?.data?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { item_name: '', default_price: 0, gst_rate: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof SupplierItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const resetForm = () => {
    setName('');
    setContactInfo('');
    setAddress('');
    setGstNumber('');
    setItems([{ item_name: '', default_price: 0, gst_rate: 0 }]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setName(supplier.name);
    setContactInfo(supplier.contact_info || '');
    setAddress(supplier.address || '');
    setGstNumber(supplier.gst_number || '');
    setItems(supplier.items.length > 0 ? [...supplier.items] : [{ item_name: '', default_price: 0, gst_rate: 0 }]);
    setEditingId(supplier.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      const response = await api.delete(`/suppliers/${id}`);
      if (response.data.success) {
        setSuccess('Supplier deleted successfully');
        fetchSuppliers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete supplier');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Supplier name is required');
      return;
    }

    const validItems = items.filter(i => i.item_name.trim() !== '');

    try {
      const payload = {
        name,
        contact_info: contactInfo,
        address: address,
        gst_number: gstNumber,
        items: validItems
      };

      let response;
      if (editingId) {
        response = await api.put(`/suppliers/${editingId}`, payload);
      } else {
        response = await api.post('/suppliers', payload);
      }

      if (response.data.success) {
        setSuccess(`Supplier ${editingId ? 'updated' : 'added'} successfully`);
        resetForm();
        fetchSuppliers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save supplier');
    }
  };

  if (loading && suppliers.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading suppliers...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Truck className="h-6 w-6 mr-2 text-indigo-600" />
            Suppliers Management
          </h1>
          <p className="text-gray-500 mt-1">Manage suppliers and the raw materials they provide.</p>
        </div>
        {!showForm && userRole !== 'ACCOUNTS' && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-1" />
            Add Supplier
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center">
          <X className="h-5 w-5 mr-2 cursor-pointer" onClick={() => setError('')} />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editingId ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="E.g., ABC Traders"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Info (Optional)</label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Phone or Email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number (Optional)</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 uppercase"
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Supplier Address"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-semibold text-gray-800 flex items-center">
                  <Box className="h-5 w-5 mr-2 text-gray-500" />
                  Items Provided by Supplier
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-12 gap-4 mb-2 px-2">
                  <div className="col-span-5 text-sm font-medium text-gray-700">Item Name</div>
                  <div className="col-span-3 text-sm font-medium text-gray-700">Default Price (₹)</div>
                  <div className="col-span-3 text-sm font-medium text-gray-700">GST Rate (%)</div>
                  <div className="col-span-1"></div>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 mb-3 items-center">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                        className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="E.g., Maida, Oil"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.default_price}
                        onChange={(e) => handleItemChange(index, 'default_price', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.gst_rate}
                        onChange={(e) => handleItemChange(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700"
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
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
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update Supplier' : 'Save Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {suppliers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No suppliers added yet. Click "Add Supplier" to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Supplied</th>
                  {userRole !== 'ACCOUNTS' && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {supplier.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {supplier.contact_info || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 max-w-xs truncate" title={supplier.address || ''}>
                      {supplier.address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                      {supplier.gst_number || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {supplier.items && supplier.items.length > 0 ? (
                          supplier.items.map((item, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {item.item_name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">No items</span>
                        )}
                      </div>
                    </td>
                    {userRole !== 'ACCOUNTS' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
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

export default Suppliers;
