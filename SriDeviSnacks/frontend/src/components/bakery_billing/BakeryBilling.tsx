import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Printer, Save, Image as ImageIcon, MapPin } from 'lucide-react';
import { bakeryProductsAPI, bakeryBillsAPI } from '../../services/api';

// Predefined branches with dummy coordinates (needs actual lat/lng)
const BRANCHES = [
  { name: 'Main Branch', lat: 13.0827, lng: 80.2707 },
  { name: 'Tambaram Branch', lat: 12.9229, lng: 80.1275 },
  { name: 'Thoraipakkam Outlet', lat: 12.9349, lng: 80.2334 },
];

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c * 1000; // Distance in meters
  return d;
}

interface BakeryProduct {
  id: number;
  name: string;
  price: number;
  image: string | null;
}

interface BillItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  total: number;
}

export default function BakeryBilling() {
  const [products, setProducts] = useState<BakeryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const [printBillData, setPrintBillData] = useState<any>(null);

  const [currentLocation, setCurrentLocation] = useState<string>('Main Branch');
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');

  useEffect(() => {
    fetchProducts();
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let closestBranch = BRANCHES[0].name;
        let minDistance = Infinity;

        BRANCHES.forEach(branch => {
          const distance = getDistanceFromLatLonInMeters(latitude, longitude, branch.lat, branch.lng);
          if (distance < minDistance) {
            minDistance = distance;
            closestBranch = branch.name;
          }
        });

        // If closest branch is within 500 meters, auto-select it. Otherwise just set it anyway as best guess.
        setCurrentLocation(closestBranch);
        setLocationStatus(`GPS Auto-selected (${Math.round(minDistance)}m away)`);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setLocationStatus('GPS failed or denied. Using default.');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await bakeryProductsAPI.getProducts();
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = billItems.reduce((sum, item) => sum + item.total, 0);

  const handleProductClick = (product: BakeryProduct) => {
    const qtyStr = window.prompt(`Enter quantity for ${product.name}:`, "1");
    if (!qtyStr) return;
    const qty = parseInt(qtyStr, 10);
    if (isNaN(qty) || qty <= 0) return;

    setBillItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.price } : i);
      } else {
        return [...prev, {
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity: qty,
          total: product.price * qty
        }];
      }
    });
  };

  const removeBillItem = (productId: number) => {
    setBillItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const handleSaveAndPrint = async () => {
    if (billItems.length === 0) return;
    
    const paid = parseFloat(paidAmount) || 0;
    
    try {
      setSubmitting(true);
      const payload = {
        items: billItems,
        total_amount: totalAmount,
        paid_amount: paid,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_name: currentLocation
      };
      
      const res = await bakeryBillsAPI.createBill(payload);
      
      // Setup for printing
      setPrintBillData({
        id: res.data.id,
        ...payload,
        date: new Date().toLocaleString()
      });
      
      setIsPaymentModalOpen(false);
      setBillItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaidAmount('');
      
      // Delay to allow React to render the print section before calling print()
      setTimeout(() => {
        handlePrint();
      }, 500);

    } catch (err: any) {
      alert(err.message || "Failed to save bill");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Bakery Bill</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .text-lg { font-size: 16px; }
              .mb-2 { margin-bottom: 8px; }
              .mb-4 { margin-bottom: 16px; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .border-t { border-top: 1px dashed #000; }
              .border-b { border-bottom: 1px dashed #000; }
              .py-1 { padding: 4px 0; }
              .my-2 { margin: 8px 0; }
              table { width: 100%; border-collapse: collapse; }
              th, td { text-align: left; padding: 4px 0; }
              th.text-right, td.text-right { text-align: right; }
              th.text-center, td.text-center { text-align: center; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setPrintBillData(null);
      }, 500);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)] bg-gray-50 -m-4 sm:-m-6 overflow-hidden">
      
      {/* Products Grid */}
      <div className="flex-1 p-4 lg:p-6 overflow-y-auto flex flex-col min-h-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Bakery Products</h2>
          
          {/* Location Selector */}
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center w-full sm:w-auto">
            <MapPin className="w-5 h-5 text-blue-500 mr-2" />
            <div className="flex flex-col">
              <select 
                value={currentLocation}
                onChange={(e) => {
                  setCurrentLocation(e.target.value);
                  setLocationStatus('Manually selected');
                }}
                className="text-sm font-bold text-gray-900 border-none bg-transparent focus:ring-0 cursor-pointer p-0 pr-4"
              >
                {BRANCHES.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400 mt-0.5">{locationStatus}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 pb-4">
          {products.map(product => (
            <div 
              key={product.id} 
              onClick={() => handleProductClick(product)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden flex flex-col"
            >
              <div className="h-40 bg-gray-50 flex items-center justify-center relative">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-12 w-12 text-gray-300" />
                )}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-sm font-bold text-gray-800 shadow-sm">
                  ₹{product.price.toFixed(2)}
                </div>
              </div>
              <div className="p-4 text-center">
                <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-10">
              No products available. Add some in the Products tab.
            </div>
          )}
        </div>
      </div>

      {/* Bill Cart */}
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] lg:shadow-xl z-10 h-[45vh] lg:h-auto shrink-0">
        <div className="p-4 bg-gray-800 text-white flex items-center justify-between">
          <div className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-bold">Current Bill</h2>
          </div>
          <span className="bg-gray-700 px-2 py-1 rounded text-sm">{billItems.length} items</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {billItems.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Cart is empty</p>
              <p className="text-sm">Click on products to add</p>
            </div>
          ) : (
            billItems.map(item => (
              <div key={item.product_id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{item.product_name}</h4>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.quantity} x ₹{item.price.toFixed(2)}
                  </div>
                </div>
                <div className="font-bold text-gray-900 mr-4">
                  ₹{item.total.toFixed(2)}
                </div>
                <button 
                  onClick={() => removeBillItem(item.product_id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary & Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-4 text-lg font-bold text-gray-900">
            <span>Total Amount</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
          
          <button
            disabled={billItems.length === 0}
            onClick={() => {
              setPaidAmount(totalAmount.toString());
              setIsPaymentModalOpen(true);
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Printer className="mr-2 h-5 w-5" />
            Print Bill
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-800 bg-opacity-75 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)}></div>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-100">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Complete Payment</h3>
              </div>
              <div className="px-6 py-6">
                
                <div className="bg-blue-50 text-blue-900 p-4 rounded-lg mb-6 flex justify-between items-center border border-blue-100">
                  <span className="font-medium text-lg">Total Bill:</span>
                  <span className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      autoFocus
                      className="w-full border-gray-300 rounded-md shadow-sm text-lg py-3 px-4 focus:ring-blue-500 focus:border-blue-500"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                    />
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Pending Amount:</span>
                    <span className={`font-bold ${(totalAmount - (parseFloat(paidAmount) || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{Math.max(0, totalAmount - (parseFloat(paidAmount) || 0)).toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Customer Details (Optional)</p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Customer Name"
                        className="w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Phone Number"
                        className="w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndPrint}
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 flex items-center transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save & Print'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Section */}
      <div className="hidden">
        <div ref={printRef}>
          {printBillData && (
            <div>
              <div className="text-center mb-2">
                <div className="font-bold text-lg">SRI DEVI SNACKS</div>
                <div>Bakery Bill</div>
                <div>Date: {printBillData.date}</div>
                <div>Bill No: {printBillData.id}</div>
              </div>
              
              {(printBillData.customer_name || printBillData.customer_phone) && (
                <div className="my-2 border-t border-b py-1">
                  {printBillData.customer_name && <div>Name: {printBillData.customer_name}</div>}
                  {printBillData.customer_phone && <div>Ph: {printBillData.customer_phone}</div>}
                </div>
              )}

              <div className="my-2 border-t py-1">
                <table>
                  <thead>
                    <tr className="border-b">
                      <th>Item</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printBillData.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>{item.product_name.substring(0, 12)}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{item.price.toFixed(2)}</td>
                        <td className="text-right">{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="border-t py-1">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{printBillData.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span>{printBillData.paid_amount.toFixed(2)}</span>
                </div>
                {printBillData.pending_amount > 0 && (
                  <div className="flex justify-between font-bold text-lg">
                    <span>Pending:</span>
                    <span>{printBillData.pending_amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <div className="text-center mt-4 border-t py-2">
                <div>Thank You!</div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
