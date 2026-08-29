import React, { useState, useEffect } from 'react';
import { bakeryBillsAPI, bakeryProductsAPI } from '../../services/api';
import { Receipt, Package, IndianRupee, Clock, Wallet } from 'lucide-react';

export default function BakeryDashboard() {
  const [stats, setStats] = useState({
    todaysBills: 0,
    totalProducts: 0,
    todaysRevenue: 0,
    pendingAmount: 0,
    todaysCollection: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [billsRes, productsRes] = await Promise.all([
        bakeryBillsAPI.getBills(),
        bakeryProductsAPI.getProducts()
      ]);

      const bills = billsRes.data || [];
      const products = productsRes.data || [];

      // Calculate today's date string (YYYY-MM-DD format to match DB created_at loosely)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // "2024-05-24"

      let todaysBillsCount = 0;
      let todaysRevenue = 0;
      let todaysCollection = 0;
      let totalPending = 0;

      bills.forEach((bill: any) => {
        // created_at is likely "YYYY-MM-DD HH:mm:ss"
        const isToday = bill.created_at.startsWith(todayStr);
        
        if (isToday) {
          todaysBillsCount++;
          todaysRevenue += Number(bill.total_amount);
          todaysCollection += Number(bill.paid_amount);
        }
        
        // Let's assume pending is overall pending, or today's pending. User said "Pending". 
        // We'll calculate overall pending as that's more useful for business owners to track dues.
        totalPending += Number(bill.pending_amount);
      });

      setStats({
        todaysBills: todaysBillsCount,
        totalProducts: products.length,
        todaysRevenue: todaysRevenue,
        pendingAmount: totalPending,
        todaysCollection: todaysCollection,
      });

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  }

  const statCards = [
    { name: "Today's Bills", value: stats.todaysBills, icon: Receipt, color: "bg-blue-500" },
    { name: "Total Products", value: stats.totalProducts, icon: Package, color: "bg-purple-500" },
    { name: "Today's Revenue", value: `₹${stats.todaysRevenue.toFixed(2)}`, icon: IndianRupee, color: "bg-green-500" },
    { name: "Today's Collection", value: `₹${stats.todaysCollection.toFixed(2)}`, icon: Wallet, color: "bg-teal-500" },
    { name: "Overall Pending", value: `₹${stats.pendingAmount.toFixed(2)}`, icon: Clock, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-full text-white mb-4 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>
      
    </div>
  );
}
