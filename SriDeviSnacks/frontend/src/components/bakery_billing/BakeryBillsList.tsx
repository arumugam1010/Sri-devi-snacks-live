import React, { useState, useEffect } from 'react';
import { bakeryBillsAPI } from '../../services/api';
import { Receipt, Calendar, User, Phone, CheckCircle, Clock, ArrowLeft, Printer, IndianRupee, X } from 'lucide-react';
import { printBakeryBill } from '../../utils/bakeryPrint';

export default function BakeryBillsList() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [logoBase64String, setLogoBase64String] = useState<string>('');

  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const [useRawBT] = useState<boolean>(() => {
    const saved = localStorage.getItem('useRawBT');
    if (saved !== null) return saved === 'true';
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent.toLowerCase());
  });

  useEffect(() => {
    fetchBills();

    fetch('/Logo.png')
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64String(reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => console.error('Failed to convert logo to base64:', err));
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await bakeryBillsAPI.getBills();
      setBills(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError('Please enter a valid amount');
      return;
    }

    if (amount > selectedBillForPayment.pending_amount) {
      setPaymentError(`Amount cannot exceed pending amount of ₹${selectedBillForPayment.pending_amount.toFixed(2)}`);
      return;
    }

    try {
      setSubmittingPayment(true);
      setPaymentError(null);
      await bakeryBillsAPI.collectPayment(selectedBillForPayment.id, amount);
      setPaymentSuccess(`₹${amount.toFixed(2)} collected successfully!`);
      await fetchBills();
      setTimeout(() => {
        setSelectedBillForPayment(null);
        setPaymentAmount('');
        setPaymentSuccess(null);
      }, 700);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to collect payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Helper to determine financial year
  const getFinancialYear = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  // Group bills by Financial Year -> Month
  const groupedByFY = bills.reduce((acc, bill) => {
    const fy = getFinancialYear(bill.created_at);
    const date = new Date(bill.created_at);
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' }); // "August 2026"
    
    if (!acc[fy]) acc[fy] = {};
    if (!acc[fy][monthYear]) acc[fy][monthYear] = [];
    
    acc[fy][monthYear].push(bill);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  if (loading && bills.length === 0) return <div className="p-4">Loading bills...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  // View: Table for a specific month
  if (selectedMonth) {
    // Find bills for the selected month across all FYs (though monthYear is unique like "August 2026")
    let monthBills: any[] = [];
    for (const fy in groupedByFY) {
      if (groupedByFY[fy][selectedMonth]) {
        monthBills = groupedByFY[fy][selectedMonth];
        break;
      }
    }

    const totalAmount = monthBills.reduce((sum: number, b: any) => sum + b.total_amount, 0);
    const totalPending = monthBills.reduce((sum: number, b: any) => sum + b.pending_amount, 0);

    return (
      <div className="space-y-4">
        <button 
          onClick={() => setSelectedMonth(null)}
          className="flex items-center text-blue-600 hover:text-blue-800 font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Months
        </button>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 md:px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-bold text-gray-900">{selectedMonth}</h3>
              <span className="ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {monthBills.length} Bills
              </span>
            </div>
            <div className="flex space-x-6 text-sm">
              <div>
                <span className="text-gray-500">Total:</span>
                <span className="ml-1 font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
              </div>
              {totalPending > 0 && (
                <div>
                  <span className="text-gray-500">Pending:</span>
                  <span className="ml-1 font-bold text-red-600">₹{totalPending.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill ID</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Location</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Items</th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Pending (₹)</th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {monthBills.map((bill: any) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      #{bill.id}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span>{new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        <span className="text-xs text-gray-400">{new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                      {bill.customer_name ? (
                        <div className="flex flex-col">
                          <span className="flex items-center text-gray-900 font-medium"><User className="h-3 w-3 mr-1"/> {bill.customer_name}</span>
                          {bill.customer_phone && <span className="flex items-center text-xs mt-0.5"><Phone className="h-3 w-3 mr-1"/> {bill.customer_phone}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Walk-in</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {bill.location_name ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {bill.location_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 hidden lg:table-cell">
                      {bill.items?.length || 0}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {bill.total_amount.toFixed(2)}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-right font-medium hidden sm:table-cell">
                      {bill.pending_amount > 0 ? (
                        <span className="text-red-600">{bill.pending_amount.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                      {bill.pending_amount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          <Clock className="w-3 h-3 md:mr-1" /> <span className="hidden md:inline">Pending</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 md:mr-1" /> <span className="hidden md:inline">Paid</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {bill.pending_amount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBillForPayment(bill);
                              setPaymentAmount(bill.pending_amount.toString());
                              setPaymentError(null);
                              setPaymentSuccess(null);
                            }}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition shadow-xs"
                            title="Receive Pending Amount"
                          >
                            <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                            Receive
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => printBakeryBill(bill, useRawBT, logoBase64String || '/Logo.png')}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                          title="Print Bill"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Receive Payment Modal */}
        {selectedBillForPayment && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Receive Pending Payment</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Bill #{selectedBillForPayment.id} • {selectedBillForPayment.customer_name || 'Walk-in'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBillForPayment(null);
                    setPaymentError(null);
                    setPaymentSuccess(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {paymentSuccess ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-emerald-700 font-bold">{paymentSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleCollectPayment} className="space-y-4 pt-4">
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
                    <div>
                      <span className="text-[11px] text-gray-500 font-medium">Total Bill</span>
                      <p className="font-bold text-gray-800 text-sm">₹{selectedBillForPayment.total_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-500 font-medium">Already Paid</span>
                      <p className="font-bold text-emerald-600 text-sm">₹{selectedBillForPayment.paid_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-500 font-medium">Pending</span>
                      <p className="font-bold text-red-600 text-sm">₹{selectedBillForPayment.pending_amount.toFixed(2)}</p>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                      {paymentError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Amount Receiving Now (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={selectedBillForPayment.pending_amount}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        required
                        autoFocus
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold text-lg text-gray-900"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(selectedBillForPayment.pending_amount.toString())}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        Fill Full Pending (₹{selectedBillForPayment.pending_amount.toFixed(2)})
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBillForPayment(null);
                        setPaymentError(null);
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPayment}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-50 flex items-center justify-center"
                    >
                      {submittingPayment ? 'Saving...' : 'Confirm & Collect'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // View: Cards by Financial Year
  return (
    <div className="space-y-8">
      {Object.keys(groupedByFY).length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Bills Found</h3>
          <p className="text-gray-500 mt-1">Start by creating a bill in the Bakery Billing tab.</p>
        </div>
      )}

      {(Object.entries(groupedByFY) as [string, Record<string, any[]>][]).sort((a, b) => b[0].localeCompare(a[0])).map(([fy, monthsData]) => (
        <div key={fy} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2">Financial Year {fy}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Object.entries(monthsData) as [string, any[]][]).map(([monthYear, monthBills]) => {
              const totalAmount = monthBills.reduce((sum: number, b: any) => sum + b.total_amount, 0);
              const totalPending = monthBills.reduce((sum: number, b: any) => sum + b.pending_amount, 0);
              const monthName = monthYear.split(' ')[0]; // Extract just the month name e.g. "August"

              return (
                <div 
                  key={monthYear} 
                  onClick={() => setSelectedMonth(monthYear)}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 cursor-pointer hover:shadow-md hover:bg-yellow-100 transition-all flex flex-col"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{monthName}</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                      {monthBills.length} bills
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4 text-sm text-gray-700 flex-1">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">₹{totalPending.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto text-xs text-gray-500">
                    Click to view all bills
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
