import React, { useState, useEffect } from 'react';
import { Store, Package, Receipt, TrendingUp, DollarSign, Users, ShoppingCart, ArrowUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { dashboardAPI } from '../services/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { products, bills, shops, weeklySchedule, lowStockThreshold, loading: contextLoading, userRole } = useAppContext();
  const lowStockProducts = products.filter(p => p.quantity <= (lowStockThreshold || 20));

  // State for dashboard stats from backend
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Calculate stats from context data (for other stats not from backend)
  const totalProducts = products.length;
  const pendingBills = bills.filter(bill => bill.status === 'PENDING').length;

  const [stats, setStats] = useState({
    totalShops: shops.filter(shop => shop.status === 'active').length,
    totalProducts,
    todaysBills: 0,
    todaysRevenue: 0,
    pendingReturns: 0,
    // activeOrders: pendingBills
  });

  // Fetch dashboard stats from backend
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getDashboard();
        if (response.success) {
          setDashboardStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  // Update stats when context data or dashboard stats change
  useEffect(() => {
    setStats({
      totalShops: shops.filter(shop => shop.status === 'active').length,
      totalProducts: products.length,
      todaysBills: dashboardStats?.bills?.today || 0,
      todaysRevenue: dashboardStats?.revenue?.today || 0,
      pendingReturns: dashboardStats?.bills?.pending || 0,
      // activeOrders: bills.filter(bill => bill.status === 'PENDING').length
    });
  }, [products, bills, shops, dashboardStats]);

  // Get recent bills with proper time formatting
  const recentBills = bills
    .sort((a, b) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime())
    .slice(0, 4)
    .map(bill => {
      const billDate = new Date(bill.bill_date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let time = 'Today';
      if (billDate.toDateString() === yesterday.toDateString()) {
        time = 'Yesterday';
      } else if (billDate < yesterday) {
        time = billDate.toLocaleDateString();
      }

      return {
        id: bill.id,
        shop: bill.shop_name,
        amount: bill.total_amount,
        time,
        status: bill.status
      };
    });

  // Calculate top shops based on real data
  const shopStats = shops.map(shop => {
    const shopBills = bills.filter(bill => bill.shop_id === shop.id);
    return {
      name: shop.shop_name,
      orders: shopBills.length,
      revenue: shopBills.reduce((sum, bill) => sum + bill.total_amount, 0)
    };
  });

  const topShops = shopStats
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  // Use collections from backend which accurately reflects today's received payments
  const todayCollections = React.useMemo(() => {
    return dashboardStats?.collections?.today_list || [];
  }, [dashboardStats]);

  const totalCollectedToday = React.useMemo(() => {
    return todayCollections.reduce((sum: number, item: any) => sum + item.paidAmount, 0);
  }, [todayCollections]);

  const totalGPayToday = React.useMemo(() => {
    return todayCollections
      .filter((item: any) => item.paymentType === 'GPAY')
      .reduce((sum: number, item: any) => {
        const val = typeof item.paidAmount === 'string' ? parseFloat(item.paidAmount) : item.paidAmount;
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
  }, [todayCollections]);

  const totalOldPendingToday = React.useMemo(() => {
    return todayCollections
      .filter((item: any) => item.paymentType === 'Pending Collection')
      .reduce((sum: number, item: any) => {
        const val = typeof item.paidAmount === 'string' ? parseFloat(item.paidAmount) : item.paidAmount;
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
  }, [todayCollections]);

  const totalBillSaveToday = React.useMemo(() => {
    return todayCollections
      .filter((item: any) => item.paymentType === 'Bill Payment')
      .reduce((sum: number, item: any) => {
        const val = typeof item.paidAmount === 'string' ? parseFloat(item.paidAmount) : item.paidAmount;
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
  }, [todayCollections]);

  const totalPendingBalanceToday = React.useMemo(() => {
    return todayCollections.reduce((sum: number, item: any) => {
      if (item.remainingPending === '-') return sum;
      const num = parseFloat(item.remainingPending.replace(/[^0-9.]/g, ''));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [todayCollections]);

  const [activeView, setActiveView] = useState<'received' | 'pending_issued' | 'returns'>('received');

  const todayReturns = React.useMemo(() => {
    const returns: any[] = [];
    bills.filter(bill => bill.bill_date && isToday(bill.bill_date)).forEach(bill => {
      if (bill.items && bill.items.length > 0) {
        bill.items.filter((item: any) => item.quantity < 0).forEach((item: any) => {
          returns.push({
            shopName: bill.shop_name,
            billNumber: bill.id,
            productName: item.product_name,
            quantity: Math.abs(item.quantity),
            rate: item.price,
            totalAmount: Math.abs(item.amount) + Math.abs(item.sgst || 0) + Math.abs(item.cgst || 0),
            unit: item.unit
          });
        });
      }
    });
    return returns;
  }, [bills]);

  // Filter for bills created today that have a pending balance (pending_amount > 0)
  const todayPendingIssued = React.useMemo(() => {
    return bills
      .filter(bill => bill.bill_date && isToday(bill.bill_date) && bill.pending_amount > 0 && bill.total_amount > 0)
      .map(bill => {
        return {
          shopName: bill.shop_name,
          billNumber: bill.id,
          totalAmount: bill.total_amount,
          paidAmount: bill.received_amount,
          pendingAmount: bill.pending_amount,
          issuedBy: bill.user_name || 'System',
        };
      })
      .sort((a, b) => parseInt(b.billNumber) - parseInt(a.billNumber));
  }, [bills]);

  const totalPendingIssuedToday = React.useMemo(() => {
    return todayPendingIssued.reduce((sum, item) => sum + item.pendingAmount, 0);
  }, [todayPendingIssued]);

  const totalBillAmountIssuedToday = React.useMemo(() => {
    return todayPendingIssued.reduce((sum, item) => sum + item.totalAmount, 0);
  }, [todayPendingIssued]);

  const totalPaidAmountIssuedToday = React.useMemo(() => {
    return todayPendingIssued.reduce((sum, item) => sum + item.paidAmount, 0);
  }, [todayPendingIssued]);

  const StatCard = ({ title, value, icon: Icon, change, color = 'blue', children }: any) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {children}
          {/* {change && (
            <div className="flex items-center mt-2">
              <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+{change}%</span>
              <span className="text-sm text-gray-500 ml-1">from yesterday</span> 
            </div>
          )} */}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Shops"
          value={stats.totalShops}
          icon={Store}
          change={5.2}
          color="blue"
        />
        <StatCard
          title="Products"
          value={stats.totalProducts}
          icon={Package}
          change={2.1}
          color="green"
        />
        <StatCard
          title="Today's Bills"
          value={stats.todaysBills}
          icon={Receipt}
          change={12.5}
          color="purple"
        />
        {userRole !== 'STAFF' && (
          <StatCard
            title="Today's Revenue"
            value={`₹${stats.todaysRevenue.toLocaleString()}`}
            icon={DollarSign}
            change={8.3}
            color="yellow"
          />
        )}
        <StatCard
          title="Pending Returns"
          value={stats.pendingReturns}
          icon={TrendingUp}
          color="red"
        />
        {userRole !== 'STAFF' && (
          <StatCard
            title="Today's Collected Amount"
            value={`₹${totalCollectedToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="indigo"
          >
            <div className="mt-3 pt-2 border-t border-gray-100 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Bill Save (Cash):</span>
                <span className="text-green-700 font-bold">₹{totalBillSaveToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">GPay:</span>
                <span className="text-indigo-700 font-bold">₹{totalGPayToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Old Pending Collected:</span>
                <span className="text-orange-700 font-bold">₹{totalOldPendingToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </StatCard>
        )}
        {/* <StatCard
          title="Active Orders"
          value={stats.activeOrders}
          icon={ShoppingCart}
          change={15.2}
          color="indigo"
        /> */}
      </div>

      {/* Low Stock Warning Card */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
            </div>
            <div className="ml-3 w-full">
              <h3 className="text-md font-bold text-red-800">
                Low Stock Alert ({lowStockProducts.length} Items)
              </h3>
              <p className="text-sm text-red-700 mt-1">
                The following products have stock levels below or equal to the threshold ({lowStockThreshold}):
              </p>
              
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {lowStockProducts.map(product => (
                  <div key={product.id} className="bg-white border border-red-100 rounded-md p-3 flex justify-between items-center shadow-sm">
                    <span className="text-sm font-semibold text-gray-900">{product.product_name}</span>
                    <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                      {product.quantity} {product.unit}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <button
                  onClick={() => navigate('/stock')}
                  className="text-sm font-semibold text-red-800 hover:text-red-950 underline transition"
                >
                  Manage Stock &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Payments & Collections Summary */}
      {userRole !== 'STAFF' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="sm:flex sm:items-center sm:justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 font-semibold">
                {activeView === 'received' ? "Today's Received Payments" : activeView === 'pending_issued' ? "Today's Pending Bills Issued" : "Today's Return Packets"}
              </h3>
              <p className="mt-1 text-sm font-bold text-gray-500">
                {activeView === 'received' ? (
                  <span className="text-green-700 flex flex-wrap items-center gap-x-2">
                    <span>Total Collected Today: ₹{totalCollectedToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-gray-300 font-normal">|</span>
                    <span className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">Bill Save (Cash): ₹{totalBillSaveToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">GPay: ₹{totalGPayToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded">Old Pending Collected: ₹{totalOldPendingToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </span>
                ) : activeView === 'pending_issued' ? (
                  <span className="text-red-700">Total Pending Given Today: ₹{totalPendingIssuedToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                ) : (
                  <span className="text-red-700">Total Return Value Today: ₹{todayReturns.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                )}
              </p>
            </div>
            <div className="mt-3 sm:mt-0 sm:ml-4">
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveView('received')}
                  className={`relative inline-flex items-center px-4 py-2 rounded-l-md border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    activeView === 'received'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Payments Received ({todayCollections.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('returns')}
                  className={`relative inline-flex items-center px-4 py-2 border-t border-b border-r border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    activeView === 'returns'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Return Packets ({todayReturns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('pending_issued')}
                  className={`relative inline-flex items-center px-4 py-2 rounded-r-md border-t border-r border-b border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    activeView === 'pending_issued'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Today Pending Given Shop ({todayPendingIssued.length})
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            {activeView === 'received' ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid Amount Today
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill Pending Balance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Collected By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayCollections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500 font-sans">
                        No payments received today.
                      </td>
                    </tr>
                  ) : (
                    todayCollections.map((item: any, idx: number) => (
                      <tr key={`${item.billNumber}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.shopName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {item.bill_id || item.billNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.paymentType === 'GPAY'
                              ? 'bg-indigo-100 text-indigo-800'
                              : item.paymentType === 'Pending Collection'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.paymentType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-green-600">
                          ₹{item.paidAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-red-600">
                          {item.remainingPending}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium font-sans">
                          {item.collectedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {todayCollections.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                        Total
                      </td>
                      <td colSpan={2} className="px-6 py-4"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-bold text-left">
                        ₹{totalCollectedToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-bold text-left">
                        ₹{totalPendingBalanceToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : activeView === 'pending_issued' ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Bill Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid Amount Today
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pending Given Today
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issued By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayPendingIssued.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                        No pending bills issued today.
                      </td>
                    </tr>
                  ) : (
                    todayPendingIssued.map((item, idx) => (
                      <tr key={`${item.billNumber}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.shopName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {item.billNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-blue-600">
                          ₹{item.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-green-600">
                          ₹{item.paidAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-red-600">
                          ₹{item.pendingAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium font-sans">
                          {item.issuedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {todayPendingIssued.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                        Total
                      </td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-bold text-left">
                        ₹{totalBillAmountIssuedToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-bold text-left">
                        ₹{totalPaidAmountIssuedToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-bold text-left">
                        ₹{totalPendingIssuedToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Return Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayReturns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500 font-sans">
                        No return packets today.
                      </td>
                    </tr>
                  ) : (
                    todayReturns.map((item, idx) => (
                      <tr key={`${item.billNumber}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.shopName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{item.billNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.productName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">{item.quantity} {item.unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{item.rate.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">₹{item.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {todayReturns.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">Total</td>
                      <td colSpan={4} className="px-6 py-4"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-bold text-left">
                        ₹{todayReturns.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
