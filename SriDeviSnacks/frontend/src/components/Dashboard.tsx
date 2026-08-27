import React, { useState, useEffect } from 'react';
import { Store, Package, Receipt, TrendingUp, DollarSign, Users, ShoppingCart, ArrowUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import api, { dashboardAPI } from '../services/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { products, bills, shops, weeklySchedule, lowStockThreshold, loading: contextLoading, userRole } = useAppContext();
  const lowStockProducts = products.filter(p => p.quantity <= (lowStockThreshold || 20));

  // State for dashboard stats from backend
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseBillsStats, setPurchaseBillsStats] = useState({ gst: 0, nonGst: 0, total: 0 });

  // Calculate stats from context data (for other stats not from backend)
  const totalProducts = products.length;
  const pendingBills = bills.filter(bill => bill.status === 'PENDING').length;
  
  const thisMonthSalesBillsCount = React.useMemo(() => {
    const today = new Date();
    return bills.filter(bill => {
      if (!bill.bill_date) return false;
      const bDate = new Date(bill.bill_date);
      return bDate.getMonth() === today.getMonth() && bDate.getFullYear() === today.getFullYear();
    }).length;
  }, [bills]);

  const [stats, setStats] = useState({
    totalShops: shops.filter(shop => shop.status === 'active').length,
    totalProducts,
    todaysBills: 0,
    todaysRevenue: 0,
    pendingReturns: 0,
    // activeOrders: pendingBills
  });

  const { gstFilings } = useAppContext();
  
  const currentMonthYearStr = React.useMemo(() => {
    const today = new Date();
    const month = today.toLocaleString('default', { month: 'long' });
    const year = today.getMonth() >= 3 ? `${today.getFullYear()}-${today.getFullYear()+1}` : `${today.getFullYear()-1}-${today.getFullYear()}`;
    return `${month} ${year}`;
  }, []);
  
  const isCurrentMonthGstFiled = React.useMemo(() => {
    return gstFilings?.some(f => f.month_year === currentMonthYearStr) || false;
  }, [gstFilings, currentMonthYearStr]);

  // Fetch dashboard stats from backend
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        if (userRole === 'ACCOUNTS') {
          const pbResponse = await api.get('/purchase-bills');
          if (pbResponse.data.success) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            let gstCount = 0;
            let nonGstCount = 0;
            pbResponse.data.data.forEach((bill: any) => {
               const billDate = new Date(bill.bill_date);
               if (billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear) {
                 if (bill.is_gst === 1) gstCount++;
                 else nonGstCount++;
               }
            });
            setPurchaseBillsStats({ gst: gstCount, nonGst: nonGstCount, total: gstCount + nonGstCount });
          }
        } else {
          const response = await dashboardAPI.getDashboard();
          if (response.success) {
            setDashboardStats(response.data);
          }
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
      pendingReturns: bills.filter(bill => bill.pending_amount > 0).length,
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

  const totalFuelToday = React.useMemo(() => {
    return dashboardStats?.collections?.today_fuel_expense || 0;
  }, [dashboardStats]);

  const totalMakroonToday = React.useMemo(() => {
    return dashboardStats?.collections?.today_makroon_expense || 0;
  }, [dashboardStats]);

  const totalCollectedToday = React.useMemo(() => {
    const rawTotal = todayCollections.reduce((sum: number, item: any) => sum + item.paidAmount, 0);
    return rawTotal - totalFuelToday - totalMakroonToday;
  }, [todayCollections, totalFuelToday, totalMakroonToday]);

  const totalTablePaidAmount = React.useMemo(() => {
    return todayCollections.reduce((sum: number, item: any) => {
      const val = typeof item.paidAmount === 'string' ? parseFloat(item.paidAmount) : item.paidAmount;
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
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

  const [activeView, setActiveView] = useState<'received' | 'pending_issued' | 'returns' | 'gst_bills'>('received');
  const [gstStartDate, setGstStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [gstEndDate, setGstEndDate] = useState(new Date().toISOString().split('T')[0]);

  const gstBillsList = React.useMemo(() => {
    return bills.filter(bill => {
      const shop = shops.find(s => s.id === bill.shop_id);
      const shopHasGst = shop && shop.gst && shop.gst.trim() !== '';
      
      if (!shopHasGst) return false;
      
      const bDate = new Date(bill.bill_date);
      if (gstStartDate) {
        const sDate = new Date(gstStartDate);
        sDate.setHours(0,0,0,0);
        if (bDate < sDate) return false;
      }
      if (gstEndDate) {
        const eDate = new Date(gstEndDate);
        eDate.setHours(23,59,59,999);
        if (bDate > eDate) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime());
  }, [bills, shops, gstStartDate, gstEndDate]);

  const totalGstBillAmount = React.useMemo(() => {
    return gstBillsList.reduce((sum, bill) => sum + bill.total_amount, 0);
  }, [gstBillsList]);

  const totalGstTaxAmount = React.useMemo(() => {
    return gstBillsList.reduce((sum, bill) => {
      return sum + (bill.items ? bill.items.reduce((itemSum: number, item: any) => itemSum + (item.sgst || 0) + (item.cgst || 0), 0) : 0);
    }, 0);
  }, [gstBillsList]);

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

  const todaysRevenue = React.useMemo(() => {
    return totalTablePaidAmount + totalPendingIssuedToday;
  }, [totalTablePaidAmount, totalPendingIssuedToday]);


  const StatCard = ({ title, value, icon: Icon, change, color = 'blue', children, onClick }: any) => (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col h-full ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-full bg-${color}-100 flex-shrink-0`}>
          <Icon className={`h-5 w-5 text-${color}-600`} />
        </div>
      </div>
      {children && (
        <div className="mt-auto pt-3 text-sm">
          {children}
        </div>
      )}
    </div>
  );

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 animate-pulse font-medium text-lg">Loading dashboard data...</div>
      </div>
    );
  }

  if (userRole === 'ACCOUNTS') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="This Month GST Purchase Bills"
            value={purchaseBillsStats.gst}
            icon={Receipt}
            color="indigo"
          />
          <StatCard
            title="This Month Non-GST Purchase Bills"
            value={purchaseBillsStats.nonGst}
            icon={Receipt}
            color="yellow"
          />
          <StatCard
            title="This Month Total Purchase Bills"
            value={purchaseBillsStats.total}
            icon={Receipt}
            color="green"
          />
          <StatCard
            title="This Month Sales Bills"
            value={thisMonthSalesBillsCount}
            icon={Receipt}
            color="blue"
          >
            {isCurrentMonthGstFiled && (
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                  GST Filed for {currentMonthYearStr}
                </span>
              </div>
            )}
          </StatCard>
          <StatCard
            title="GST Bills"
            value={gstBillsList.length}
            icon={Receipt}
            color="indigo"
            onClick={() => setActiveView('gst_bills')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
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
        {userRole !== 'SUPER_ADMIN' && (
          <StatCard
            title="This Month Bills"
            value={thisMonthSalesBillsCount}
            icon={Receipt}
            color="indigo"
          >
            {isCurrentMonthGstFiled && (
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                  GST Filed for {currentMonthYearStr}
                </span>
              </div>
            )}
          </StatCard>
        )}
        {userRole !== 'STAFF' && (
          <StatCard
            title="Today's Revenue"
            value={`₹${todaysRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
          onClick={() => navigate('/pending-balances')}
        />
        <StatCard
          title="GST Bills"
          value={gstBillsList.length}
          icon={Receipt}
          color="indigo"
          onClick={() => setActiveView('gst_bills')}
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
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">CNG/Petrol:</span>
                <span className="text-red-700 font-bold">-₹{totalFuelToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Makroon:</span>
                <span className="text-pink-700 font-bold">-₹{totalMakroonToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">CNG/Petrol: -₹{totalFuelToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-xs font-semibold text-pink-700 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded">Makroon: -₹{totalMakroonToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                  className={`relative inline-flex items-center px-4 py-2 border-t border-r border-b border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    activeView === 'pending_issued'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Today Pending Given Shop ({todayPendingIssued.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('gst_bills')}
                  className={`relative inline-flex items-center px-4 py-2 rounded-r-md border-t border-r border-b border-gray-300 text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    activeView === 'gst_bills'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  GST Bills ({gstBillsList.length})
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
                        ₹{totalTablePaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-bold text-left">
                        ₹{totalPendingBalanceToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : activeView === 'gst_bills' ? (
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                    <input type="date" value={gstStartDate} onChange={(e) => setGstStartDate(e.target.value)} className="border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                    <input type="date" value={gstEndDate} onChange={(e) => setGstEndDate(e.target.value)} className="border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop GST</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax (SGST+CGST)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {gstBillsList.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">No GST bills found for this date range.</td></tr>
                    ) : (
                      gstBillsList.map((bill, idx) => {
                         const shop = shops.find(s => s.id === bill.shop_id);
                         const tax = bill.items ? bill.items.reduce((sum, item) => sum + (item.sgst || 0) + (item.cgst || 0), 0) : 0;
                         return (
                           <tr key={bill.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(bill.bill_date).toLocaleDateString()}</td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bill.shop_name}</td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{shop?.gst || '-'}</td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{bill.id}</td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">₹{bill.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">₹{tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                           </tr>
                         )
                      })
                    )}
                  </tbody>
                  {gstBillsList.length > 0 && (
                    <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-right">Total:</td>
                        <td className="px-6 py-4 text-left text-blue-700">₹{totalGstBillAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="px-6 py-4 text-left text-red-700">₹{totalGstTaxAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
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
