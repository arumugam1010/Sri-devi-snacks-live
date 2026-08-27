import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Save, X, Trash2, Image as ImageIcon, Calendar, Printer } from 'lucide-react';
import api from '../services/api';
import { getBaseUrl } from '../services/api';
import { useAppContext } from '../context/AppContext';

interface SupplierItem {
  id?: number;
  item_name: string;
  default_price: number;
  gst_rate: number;
}

interface Supplier {
  id: number;
  name: string;
  items: SupplierItem[];
}

interface BillItem {
  item_name: string;
  quantity: number;
  price: number;
  gst_percentage: number;
  total: number;
}

interface PurchaseBill {
  id: number;
  supplier_name: string;
  bill_number: string;
  total_amount: number;
  bill_date: string;
  image_path: string | null;
  is_gst: number;
  items?: BillItem[];
}

const PurchaseBills: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAppContext();
  
  // Tabs: 'form', 'gst_list', 'nongst_list', 'images'
  const [activeTab, setActiveTab] = useState<'form' | 'gst_list' | 'nongst_list' | 'images'>('gst_list');
  
  // Form State
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<BillItem[]>([
    { item_name: '', quantity: 1, price: 0, gst_percentage: 0, total: 0 }
  ]);
  const [isGst, setIsGst] = useState<number>(1);
  const [billImage, setBillImage] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Grouped bills for images view
  const [groupedBills, setGroupedBills] = useState<Record<string, Record<string, PurchaseBill[]>>>({});
  const [expandedFY, setExpandedFY] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<{fy: string, month: string} | null>(null);
  const [selectedBillForView, setSelectedBillForView] = useState<PurchaseBill | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewBill = async (billId: number) => {
    setViewLoading(true);
    try {
      const res = await api.get(`/purchase-bills/${billId}`);
      if (res.data.success) {
        setSelectedBillForView(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch bill details");
    } finally {
      setViewLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [suppliersRes, billsRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/purchase-bills')
      ]);
      
      if (suppliersRes.data.success) setSuppliers(suppliersRes.data.data);
      if (billsRes.data.success) {
        setBills(billsRes.data.data);
        groupBills(billsRes.data.data);
      }
    } catch (err: any) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAllBills = () => {
    if (!selectedMonth) return;
    const billsToPrint = groupedBills[selectedMonth.fy][selectedMonth.month];
    
    // Create a hidden iframe to print without opening a new tab
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    let content = `
      <html>
        <head>
          <title>Print Bills - ${selectedMonth.month} ${selectedMonth.fy}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            .page { 
              page-break-after: always;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 90vh; /* Adjust height to fit within A4 */
              box-sizing: border-box;
            }
            .page:last-child {
              page-break-after: auto;
            }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 10px; text-align: center; }
            img { max-width: 100%; max-height: 80vh; object-fit: contain; }
          </style>
        </head>
        <body>
    `;

    let hasImages = false;
    billsToPrint.forEach(bill => {
      if (bill.image_path && !bill.image_path.endsWith('.pdf')) {
        hasImages = true;
        content += `
          <div class="page">
            <div class="title">Supplier: ${bill.supplier_name} | Bill No: ${bill.bill_number} | Date: ${new Date(bill.bill_date).toLocaleDateString()}</div>
            <img src="${getBaseUrl()}/${bill.image_path}" />
          </div>
        `;
      }
    });

    if (!hasImages) {
      content += `<p style="text-align: center; margin-top: 50px;">No printable images found for this month.</p>`;
    }

    content += `
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(content);
      doc.close();

      // Wait a moment for images to start loading, then trigger print
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        // Remove iframe after a generous delay so print dialog doesn't break
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 120000); // 2 minutes
      }, 1000);
    } else {
      document.body.removeChild(iframe);
      alert("Failed to initialize printing.");
    }
  };

  const getFinancialYear = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    // Assuming FY starts April 1st
    if (month >= 3) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  };

  const groupBills = (billsData: PurchaseBill[]) => {
    const grouped: Record<string, Record<string, PurchaseBill[]>> = {};
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    billsData.forEach(bill => {
      const fy = getFinancialYear(bill.bill_date);
      const monthIdx = new Date(bill.bill_date).getMonth();
      const monthName = monthNames[monthIdx];

      if (!grouped[fy]) grouped[fy] = {};
      if (!grouped[fy][monthName]) grouped[fy][monthName] = [];
      
      grouped[fy][monthName].push(bill);
    });

    setGroupedBills(grouped);
    
    // Set default expanded FY
    const fys = Object.keys(grouped).sort().reverse();
    if (fys.length > 0) {
      setExpandedFY(fys[0]);
    }
  };

  // Form Handlers
  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    setSupplierId(id || '');
    
    // Auto-detect GST type based on supplier items
    const supplier = suppliers.find(s => s.id === id);
    if (supplier && supplier.items && supplier.items.length > 0) {
      const hasGst = supplier.items.some(item => (item.gst_rate || 0) > 0);
      setIsGst(hasGst ? 1 : 0);
    } else {
      setIsGst(1); // Default to GST if no items
    }

    // Reset items if supplier changes
    setItems([{ item_name: '', quantity: 1, price: 0, gst_percentage: 0, total: 0 }]);
  };

  const handleAddItem = () => {
    setItems([...items, { item_name: '', quantity: 1, price: 0, gst_percentage: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const calculateTotal = (qty: number, price: number, gst: number) => {
    const base = qty * price;
    const tax = base * (gst / 100);
    return parseFloat((base + tax).toFixed(2));
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto fill defaults if item is selected from supplier's list
    if (field === 'item_name') {
      const selectedSupplier = suppliers.find(s => s.id === supplierId);
      if (selectedSupplier) {
        const itemDef = selectedSupplier.items.find(i => i.item_name === value);
        if (itemDef) {
          newItems[index].price = itemDef.default_price;
          newItems[index].gst_percentage = itemDef.gst_rate;
        }
      }
    }

    // Recalculate row total
    if (['quantity', 'price', 'gst_percentage', 'item_name'].includes(field)) {
      newItems[index].total = calculateTotal(
        newItems[index].quantity, 
        newItems[index].price, 
        newItems[index].gst_percentage
      );
    }

    setItems(newItems);
  };

  const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

  const resetForm = () => {
    setSupplierId('');
    setBillNumber('');
    setBillDate(new Date().toISOString().split('T')[0]);
    setIsGst(1);
    setItems([{ item_name: '', quantity: 1, price: 0, gst_percentage: 0, total: 0 }]);
    setBillImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !billNumber) {
      setError('Supplier and Bill Number are required');
      return;
    }

    const validItems = items.filter(i => i.item_name.trim() !== '' && i.quantity > 0);
    
    const formData = new FormData();
    formData.append('supplier_id', supplierId.toString());
    formData.append('bill_number', billNumber);
    formData.append('bill_date', billDate);
    formData.append('total_amount', grandTotal.toString());
    formData.append('is_gst', isGst.toString());
    formData.append('items', JSON.stringify(validItems));
    
    if (billImage) {
      formData.append('bill_image', billImage);
    }

    try {
      setSubmitting(true);
      const response = await api.post('/purchase-bills', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSuccess('Purchase bill added successfully');
        resetForm();
        fetchData();
        setActiveTab(isGst === 1 ? 'gst_list' : 'nongst_list');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save bill');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const filteredBills = selectedMonth && groupedBills[selectedMonth.fy] && groupedBills[selectedMonth.fy][selectedMonth.month] 
    ? groupedBills[selectedMonth.fy][selectedMonth.month]
    : [];
  
  const thisMonthGstTotal = filteredBills.filter(b => b.is_gst === 1).reduce((sum, b) => sum + parseFloat(b.total_amount.toString()), 0);
  const thisMonthNonGstTotal = filteredBills.filter(b => b.is_gst === 0).reduce((sum, b) => sum + parseFloat(b.total_amount.toString()), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-indigo-600" />
            Purchase Bills
          </h1>
          <p className="text-gray-500 mt-1">Manage purchase bills and upload bill images.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('gst_list')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'gst_list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            GST Bills
          </button>
          <button
            onClick={() => setActiveTab('nongst_list')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'nongst_list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Non-GST Bills
          </button>
          {userRole !== 'ACCOUNTS' && (
            <button
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'form' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Add New Bill
            </button>
          )}
          <button
            onClick={() => setActiveTab('images')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'images' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Bill Images
          </button>
        </div>
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

      {/* FORM TAB */}
      {activeTab === 'form' && userRole !== 'ACCOUNTS' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select
                  required
                  value={supplierId}
                  onChange={handleSupplierChange}
                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number *</label>
                <input
                  type="text"
                  required
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="INV-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date *</label>
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Type *</label>
                <div className="flex space-x-4 mt-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      className="form-radio text-indigo-600 focus:ring-indigo-500" 
                      name="isGst" 
                      value="1" 
                      checked={isGst === 1} 
                      onChange={() => setIsGst(1)} 
                    />
                    <span className="ml-2 text-sm text-gray-700 font-medium">GST</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      className="form-radio text-indigo-600 focus:ring-indigo-500" 
                      name="isGst" 
                      value="0" 
                      checked={isGst === 0} 
                      onChange={() => {
                        setIsGst(0);
                        setItems(items.map(item => ({
                          ...item,
                          gst_percentage: 0,
                          total: calculateTotal(item.quantity, item.price, 0)
                        })));
                      }} 
                    />
                    <span className="ml-2 text-sm text-gray-700 font-medium">Non-GST</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Items</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center bg-indigo-50 px-3 py-1.5 rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Row
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3 w-1/3">Item Name</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3 w-1/6">Qty</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3 w-1/6">Price (₹)</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3 w-1/6">GST (%)</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3 w-1/6">Total</th>
                      <th className="pb-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="py-2 pr-2">
                          <input
                            type="text"
                            list={`supplier-items-${supplierId}`}
                            value={item.item_name}
                            onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                            className="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="Item name"
                            required
                          />
                          {selectedSupplier && (
                            <datalist id={`supplier-items-${supplierId}`}>
                              {selectedSupplier.items.map((si, idx) => (
                                <option key={idx} value={si.item_name} />
                              ))}
                            </datalist>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity || ''}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                            required
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price || ''}
                            onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                            required
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={isGst === 0 ? 0 : (item.gst_percentage || '')}
                            onChange={(e) => handleItemChange(index, 'gst_percentage', parseFloat(e.target.value) || 0)}
                            className={`w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500 ${isGst === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                            disabled={isGst === 0}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <div className="w-full bg-white px-3 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700">
                            ₹{item.total.toFixed(2)}
                          </div>
                        </td>
                        <td className="py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-400 hover:text-red-600"
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-right py-4 pr-4 font-bold text-gray-700">Grand Total:</td>
                      <td className="py-4">
                        <div className="text-lg font-bold text-indigo-700">₹{grandTotal.toFixed(2)}</div>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Original Bill Image</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors bg-gray-50">
                <div className="space-y-1 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-2 py-1"
                    >
                      <span>Upload a file</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        accept="image/*,.pdf"
                        ref={fileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setBillImage(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                  {billImage && (
                    <p className="text-sm font-medium text-green-600 mt-2">
                      Selected: {billImage.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg flex items-center ${submitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all'}`}
              >
                <Save className="w-5 h-5 mr-2" />
                {submitting ? 'Saving...' : 'Save Purchase Bill'}
              </button>
            </div>
          </form>
        </div>
      )}



      {/* LIST TABS */}
      {(activeTab === 'gst_list' || activeTab === 'nongst_list') && (
        <div className="space-y-6">
          {!selectedMonth ? (
            Object.keys(groupedBills).length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                No purchase bills added yet.
              </div>
            ) : (
              Object.keys(groupedBills).sort().reverse().map(fy => (
                <div key={fy} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div 
                    className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedFY(expandedFY === fy ? null : fy)}
                  >
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                      Financial Year {fy}
                    </h2>
                  </div>
                  
                  {expandedFY === fy && (
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Object.keys(groupedBills[fy]).map(month => {
                          const monthBills = groupedBills[fy][month].filter(b => b.is_gst === (activeTab === 'gst_list' ? 1 : 0));
                          if (monthBills.length === 0) return null;
                          
                          const totalAmount = monthBills.reduce((sum, b) => sum + parseFloat(b.total_amount.toString()), 0);
                          
                          return (
                            <div 
                              key={month} 
                              className={`border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group bg-gray-50 border-gray-100`}
                              onClick={() => setSelectedMonth({fy, month})}
                            >
                              <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-bl-lg">
                                {monthBills.length} bills
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 mb-4">{month}</h3>
                              <div className="space-y-1 text-sm">
                                <p className="text-gray-500">Total Purchase:</p>
                                <p className="font-bold text-gray-900 text-lg">₹{totalAmount.toFixed(2)}</p>
                              </div>
                              <div className="mt-4 text-sm text-indigo-600 font-medium group-hover:underline">
                                Click to view all bills
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            <>
              <div className="mb-4">
                <button 
                  onClick={() => setSelectedMonth(null)}
                  className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  ← Back to Financial Years
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between border-l-4 border-l-indigo-500">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Selected Month GST</p>
                    <p className="text-2xl font-bold text-gray-900">₹{thisMonthGstTotal.toFixed(2)}</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-full">
                    <FileText className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between border-l-4 border-l-gray-400">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Selected Month Non-GST</p>
                    <p className="text-2xl font-bold text-gray-900">₹{thisMonthNonGstTotal.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-full">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* List Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-700">
                    {activeTab === 'gst_list' ? 'GST Bills' : 'Non-GST Bills'} - {selectedMonth.month} {selectedMonth.fy}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Image</th>
                    </tr>
                  </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBills.filter(b => b.is_gst === (activeTab === 'gst_list' ? 1 : 0)).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            No purchase bills found in this category.
                          </td>
                        </tr>
                      ) : (
                        filteredBills.filter(b => b.is_gst === (activeTab === 'gst_list' ? 1 : 0)).map((bill) => (
                          <tr key={bill.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(bill.bill_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                            {bill.supplier_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {bill.bill_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            ₹{parseFloat(bill.total_amount.toString()).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                            {bill.image_path ? (
                              <button 
                                onClick={() => handleViewBill(bill.id)}
                                className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full cursor-pointer"
                              >
                                <ImageIcon className="w-4 h-4 mr-1" /> View
                              </button>
                            ) : (
                              <span className="text-gray-400 italic">No image</span>
                            )}
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* IMAGES GALLERY TAB */}
      {activeTab === 'images' && (
        <div className="space-y-8">
          {Object.keys(groupedBills).filter(fy => Object.values(groupedBills[fy]).flat().some(b => b.image_path)).length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              No bill images uploaded yet.
            </div>
          ) : (
            Object.keys(groupedBills).filter(fy => Object.values(groupedBills[fy]).flat().some(b => b.image_path)).sort().reverse().map(fy => (
              <div key={fy} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div 
                  className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                  onClick={() => setExpandedFY(expandedFY === fy ? null : fy)}
                >
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                    Financial Year {fy}
                  </h2>
                </div>
                
                {expandedFY === fy && (
                  <div className="p-6">
                    {selectedMonth && selectedMonth.fy === fy ? (
                      <div>
                        <div className="flex justify-between items-center mb-6">
                          <button 
                            onClick={() => setSelectedMonth(null)}
                            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            ← Back to Months
                          </button>
                          
                          <button 
                            onClick={handlePrintAllBills}
                            className="inline-flex items-center text-sm font-medium text-white hover:bg-indigo-700 bg-indigo-600 px-4 py-2 rounded-lg shadow-sm transition-colors"
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Print All Bills
                          </button>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">
                          Purchase Bills - {selectedMonth.month}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {groupedBills[selectedMonth.fy][selectedMonth.month].filter(b => b.image_path).map(bill => (
                            <div key={bill.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
                              <div className="h-48 bg-gray-200 relative">
                                {bill.image_path?.endsWith('.pdf') ? (
                                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                    <div className="text-center">
                                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                      <span className="text-sm font-medium text-gray-500">PDF Document</span>
                                    </div>
                                  </div>
                                ) : (
                                  <img 
                                    src={`${getBaseUrl()}/${bill.image_path}`} 
                                    alt={`Bill ${bill.bill_number}`} 
                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(`${getBaseUrl()}/${bill.image_path}`, '_blank')}
                                  />
                                )}
                              </div>
                              <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="text-xs text-gray-500 font-medium">{new Date(bill.bill_date).toLocaleDateString()}</p>
                                    <h4 className="font-bold text-gray-900">{bill.supplier_name}</h4>
                                  </div>
                                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                                    ₹{parseFloat(bill.total_amount.toString()).toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">Bill No: <span className="font-medium text-gray-900">{bill.bill_number}</span></p>
                                
                                <a 
                                  href={`${getBaseUrl()}/${bill.image_path}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block w-full text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-sm py-2 rounded-lg border border-indigo-100 transition-colors"
                                >
                                  Open Full Image
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Object.keys(groupedBills[fy]).filter(m => groupedBills[fy][m].some(b => b.image_path)).map(month => {
                          const monthBills = groupedBills[fy][month].filter(b => b.image_path);
                          const totalAmount = monthBills.reduce((sum, b) => sum + parseFloat(b.total_amount.toString()), 0);
                          
                          return (
                            <div 
                              key={month} 
                              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
                              onClick={() => setSelectedMonth({fy, month})}
                            >
                              <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-bl-lg">
                                {monthBills.length} bills
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 mb-4">{month}</h3>
                              <div className="space-y-1 text-sm">
                                <p className="text-gray-500">Total Purchase:</p>
                                <p className="font-bold text-gray-900 text-lg">₹{totalAmount.toFixed(2)}</p>
                              </div>
                              <div className="mt-4 text-sm text-indigo-600 font-medium group-hover:underline">
                                Click to view all bills
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}


      {/* VIEW BILL DETAILS MODAL */}
      {(selectedBillForView || viewLoading) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-indigo-600" />
                {viewLoading ? 'Loading Bill Details...' : `Purchase Bill: ${selectedBillForView?.bill_number}`}
              </h2>
              <button 
                onClick={() => setSelectedBillForView(null)}
                className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 border border-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {!viewLoading && selectedBillForView && (
              <div className="p-0 overflow-y-auto flex-grow bg-gray-100 flex flex-col md:flex-row">
                {/* Left side: Bill Details */}
                <div className="w-full md:w-1/2 p-6 bg-white border-r border-gray-200 overflow-y-auto">
                  <div className="mb-6 flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Supplier</p>
                      <h3 className="text-lg font-bold text-gray-900">{selectedBillForView.supplier_name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 font-medium">Date</p>
                      <p className="font-bold text-gray-900">{new Date(selectedBillForView.bill_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <h4 className="font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2">Items Purchased</h4>
                  
                  {selectedBillForView.items && selectedBillForView.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">GST %</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedBillForView.items.map((item, idx) => (
                            <tr key={idx} className="text-sm text-gray-700">
                              <td className="px-2 py-2">{item.item_name}</td>
                              <td className="px-2 py-2 text-right">{item.quantity}</td>
                              <td className="px-2 py-2 text-right">₹{parseFloat(item.price.toString()).toFixed(2)}</td>
                              <td className="px-2 py-2 text-right">{item.gst_percentage}%</td>
                              <td className="px-2 py-2 text-right font-medium text-gray-900">₹{parseFloat(item.total.toString()).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={4} className="px-2 py-3 text-right font-bold text-gray-700">Grand Total:</td>
                            <td className="px-2 py-3 text-right font-bold text-indigo-700 text-lg">
                              ₹{parseFloat(selectedBillForView.total_amount.toString()).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No items found for this bill.</p>
                  )}
                </div>
                
                {/* Right side: Image */}
                <div className="w-full md:w-1/2 bg-gray-100 p-6 flex flex-col items-center justify-center min-h-[400px]">
                  {selectedBillForView.image_path ? (
                    <div className="w-full h-full flex flex-col">
                      <div className="flex-grow flex items-center justify-center overflow-hidden rounded-lg border border-gray-300 bg-gray-200">
                        {selectedBillForView.image_path.endsWith('.pdf') ? (
                          <div className="text-center">
                            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                            <span className="text-gray-500 font-medium">PDF Document</span>
                          </div>
                        ) : (
                          <img 
                            src={`${getBaseUrl()}/${selectedBillForView.image_path}`} 
                            alt="Original Bill" 
                            className="max-w-full max-h-[60vh] object-contain cursor-zoom-in hover:opacity-95"
                            onClick={() => window.open(`${getBaseUrl()}/${selectedBillForView.image_path}`, '_blank')}
                          />
                        )}
                      </div>
                      <a 
                        href={`${getBaseUrl()}/${selectedBillForView.image_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 w-full text-center bg-white hover:bg-gray-50 text-indigo-600 font-medium py-3 rounded-xl border border-gray-300 shadow-sm transition-colors"
                      >
                        Open Image in New Tab
                      </a>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                      <p>No image was uploaded for this bill.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {viewLoading && (
              <div className="p-12 text-center flex-grow bg-gray-100 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <span className="ml-3 text-lg text-gray-600 font-medium">Loading details...</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default PurchaseBills;
