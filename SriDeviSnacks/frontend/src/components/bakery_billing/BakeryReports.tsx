import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Calendar as CalendarIcon, Filter, DollarSign, Receipt, PackageOpen } from 'lucide-react';
import { bakeryBillsAPI } from '../../services/api';

interface BillItem {
  product_name: string;
  quantity: number;
  total: number;
}

interface Bill {
  id: number;
  total_amount: number;
  created_at: string;
  items: BillItem[];
}

export default function BakeryReports() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to today
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

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
      setError(err.message || 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFilter = (type: 'today' | '7days' | 'all') => {
    const today = new Date();
    
    if (type === 'today') {
      const formatted = today.toISOString().split('T')[0];
      setStartDate(formatted);
      setEndDate(formatted);
    } else if (type === '7days') {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      setStartDate(lastWeek.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (type === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter bills by selected date range
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      if (!startDate && !endDate) return true;
      
      const billDate = new Date(bill.created_at.replace(' ', 'T'));
      billDate.setHours(0, 0, 0, 0); // Normalize time
      
      let start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      
      let end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (start && billDate < start) return false;
      if (end && billDate > end) return false;
      
      return true;
    });
  }, [bills, startDate, endDate]);

  // Aggregate Data
  const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total_amount, 0);
  const totalBills = filteredBills.length;
  
  const productPerformance = useMemo(() => {
    const perf: Record<string, { quantity: number, revenue: number }> = {};
    
    filteredBills.forEach(bill => {
      bill.items?.forEach(item => {
        if (!perf[item.product_name]) {
          perf[item.product_name] = { quantity: 0, revenue: 0 };
        }
        perf[item.product_name].quantity += item.quantity;
        perf[item.product_name].revenue += item.total;
      });
    });

    return Object.entries(perf)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue); // sort by revenue descending
  }, [filteredBills]);

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
          Bakery Reports
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-700">Filter By Date:</span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto flex-1 justify-center">
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex space-x-2 w-full sm:w-auto justify-end">
          <button onClick={() => handleQuickFilter('today')} className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 font-medium rounded-md hover:bg-blue-100 transition">Today</button>
          <button onClick={() => handleQuickFilter('7days')} className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 font-medium rounded-md hover:bg-gray-100 transition">Last 7 Days</button>
          <button onClick={() => handleQuickFilter('all')} className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 font-medium rounded-md hover:bg-gray-100 transition">All Time</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 font-medium mb-1">Total Sales Revenue</p>
            <h3 className="text-4xl font-bold">₹{totalRevenue.toFixed(2)}</h3>
          </div>
          <DollarSign className="absolute right-[-10px] bottom-[-20px] w-32 h-32 text-blue-400 opacity-30" />
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center">
          <div className="bg-purple-100 p-4 rounded-xl mr-5">
            <Receipt className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <p className="text-gray-500 font-medium mb-1">Total Bills Generated</p>
            <h3 className="text-3xl font-bold text-gray-900">{totalBills} Bills</h3>
          </div>
        </div>
      </div>

      {/* Product Performance Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <PackageOpen className="w-5 h-5 mr-2 text-gray-500" />
            Product Performance
          </h3>
          <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
            {startDate === endDate && startDate === todayStr ? 'Today' : 'Date Range'}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Sold
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue (₹)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {productPerformance.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                    No sales data found for the selected date range.
                  </td>
                </tr>
              ) : (
                productPerformance.map((product, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      {product.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                      ₹{product.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
