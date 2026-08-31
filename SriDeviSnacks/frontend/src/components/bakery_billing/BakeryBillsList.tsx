import React, { useState, useEffect } from 'react';
import { bakeryBillsAPI } from '../../services/api';
import { Receipt, Calendar, User, Phone, CheckCircle, Clock, ArrowLeft } from 'lucide-react';

export default function BakeryBillsList() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    fetchBills();
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
