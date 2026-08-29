import React, { useState, useEffect } from 'react';
import { bakeryBillsAPI } from '../../services/api';
import { Receipt, Calendar, User, Phone, CheckCircle, Clock } from 'lucide-react';

export default function BakeryBillsList() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Group bills by month and year
  const groupedBills = bills.reduce((acc, bill) => {
    const date = new Date(bill.created_at);
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(bill);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading && bills.length === 0) return <div className="p-4">Loading bills...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-8">
      {Object.keys(groupedBills).length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Bills Found</h3>
          <p className="text-gray-500 mt-1">Start by creating a bill in the Bakery Billing tab.</p>
        </div>
      )}

      {(Object.entries(groupedBills) as [string, any[]][]).map(([monthYear, monthBills]) => {
        const totalAmount = monthBills.reduce((sum: number, b: any) => sum + b.total_amount, 0);
        const totalPending = monthBills.reduce((sum: number, b: any) => sum + b.pending_amount, 0);

        return (
          <div key={monthYear} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-lg font-bold text-gray-900">{monthYear}</h3>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pending (₹)</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {monthBills.map((bill: any) => (
                    <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        #{bill.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(bill.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {bill.customer_name ? (
                          <div className="flex flex-col">
                            <span className="flex items-center text-gray-900 font-medium"><User className="h-3 w-3 mr-1"/> {bill.customer_name}</span>
                            {bill.customer_phone && <span className="flex items-center text-xs mt-0.5"><Phone className="h-3 w-3 mr-1"/> {bill.customer_phone}</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Walk-in</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {bill.items?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {bill.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {bill.pending_amount > 0 ? (
                          <span className="text-red-600">{bill.pending_amount.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {bill.pending_amount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" /> Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
