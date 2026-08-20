import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Download, TrendingUp, DollarSign, Package, ShoppingCart, BarChart3, Filter, CalendarRange, AlertCircle, Warehouse, Fuel } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

import { billsAPI, stocksAPI, fuelExpensesAPI } from '../services/api';

const Reports: React.FC = () => {
  const { bills, products, shops } = useAppContext();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'shops' | 'returns' | 'products' | 'pending' | 'pending_received' | 'stock_details' | 'fuel_expenses'>('daily');
  const [pageStates, setPageStates] = useState<Record<string, number>>({});
  const [returnsSubTab, setReturnsSubTab] = useState<'today' | 'all'>('today');
  const [productsSubTab, setProductsSubTab] = useState<'today' | 'all'>('today');
  const [pendingReceivedPayments, setPendingReceivedPayments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [appliedDate, setAppliedDate] = useState<string>('');
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [stockFilterDate, setStockFilterDate] = useState<string>('');
  const [stockAppliedDate, setStockAppliedDate] = useState<string>('');
  const [stockDebugError, setStockDebugError] = useState<string>('');
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [shopPayments, setShopPayments] = useState<any[]>([]);

  // Fuel Expenses States
  const [fuelExpenses, setFuelExpenses] = useState<any[]>([]);
  const [fuelSubTab, setFuelSubTab] = useState<'today' | 'all'>('today');
  const [fuelFilterFrom, setFuelFilterFrom] = useState<string>('');
  const [fuelFilterTo, setFuelFilterTo] = useState<string>('');
  const [fuelFilterType, setFuelFilterType] = useState<string>('');
  const [fuelTotalAmount, setFuelTotalAmount] = useState<number>(0);
  const [fuelLoading, setFuelLoading] = useState<boolean>(false);

  const fetchFuelExpenses = () => {
    setFuelLoading(true);
    const params: any = {};
    
    if (fuelSubTab === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      params.from = todayStr;
      params.to = todayStr;
    } else {
      if (fuelFilterFrom) params.from = fuelFilterFrom;
      if (fuelFilterTo) params.to = fuelFilterTo;
    }
    if (fuelFilterType) params.type = fuelFilterType;

    fuelExpensesAPI.getFilteredFuelExpenses(params)
      .then(res => {
        if (res.success) {
          setFuelExpenses(res.data.expenses || []);
          setFuelTotalAmount(res.data.total_amount || 0);
        }
      })
      .catch(err => {
        console.error("Failed to load fuel expenses:", err);
      })
      .finally(() => {
        setFuelLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'fuel_expenses') {
      fetchFuelExpenses();
    }
  }, [activeTab, fuelSubTab, fuelFilterFrom, fuelFilterTo, fuelFilterType]);

  useEffect(() => {
    if (activeTab === 'pending_received') {
      billsAPI.getPendingReceivedPayments().then(res => {
        if (res.success) {
          setPendingReceivedPayments(res.data);
        }
      });
    } else if (activeTab === 'stock_details') {
      stocksAPI.getStockHistory().then(res => {
        if (res.success) {
          setStockHistory(res.data);
          setStockDebugError('');
        } else {
          setStockDebugError(res.message || "Failed to load stock history");
          console.error("API Error:", res.message);
        }
      }).catch(err => {
        setStockDebugError(err.message || "Network/JS error");
        console.error("Network/JS Error:", err);
      });
    }
  }, [activeTab]);

  const handleShopClick = (shop: any) => {
    const shopObj = shops.find(s => s.shop_name === shop.shop_name);
    if (shopObj) {
      setSelectedShop({ ...shop, id: shopObj.id });
      billsAPI.getShopPaymentsHistory(shopObj.id).then(res => {
        if (res.success) {
          setShopPayments(res.data);
        }
      });
    }
  };

  const isToday = (dateString: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  // Helper functions for weekly reports
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getStartOfWeek = (date: Date): Date => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getEndOfWeek = (date: Date): Date => {
    const startOfWeek = getStartOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return endOfWeek;
  };

  // Updated handleExport to support new report types
  const handleExport = (reportType: string) => {
    let dataToExport = [];
    switch(reportType) {
      case 'daily-summary':
        dataToExport = dailyBillingSummary;
        break;
      case 'weekly-summary':
        dataToExport = weeklyBillingSummary;
        break;
      case 'monthly-summary':
        dataToExport = monthlyBillingSummary;
        break;
      case 'shop-performance':
        dataToExport = shopWiseReport.map(shop => ({
          'Shop Name': shop.shop_name,
          'Total Bills': shop.bills,
          'Total Amount': shop.total_amount,
          'Avg Bill Value': shop.avg_bill,
          'Last Order': shop.last_order,
          'Total Pending': shop.total_pending,
          'Pending Bills': shop.pending_bills.map((b: any) => `Bill #${b.billNumber} (${new Date(b.date).toLocaleDateString()}): Total ₹${b.totalAmount}, Pending ₹${b.pendingAmount}`).join('; ')
        }));
        break;
      case 'pending-shops':
        dataToExport = pendingShopsReport.map(shop => ({
          'Shop Name': shop.shop_name,
          'Total Bills': shop.bills,
          'Total Amount': shop.total_amount,
          'Avg Bill Value': shop.avg_bill,
          'Last Order': shop.last_order,
          'Total Pending': shop.total_pending,
          'Pending Bills': shop.pending_bills.map((b: any) => `Bill #${b.billNumber} (${new Date(b.date).toLocaleDateString()}): Total ₹${b.totalAmount}, Pending ₹${b.pendingAmount}`).join('; ')
        }));
        break;
      case 'pending-received-payments':
        dataToExport = pendingReceivedPayments.map(payment => ({
          'Date': new Date(payment.payment_date).toLocaleString(),
          'Shop Name': payment.shop_name,
          'Bill Number': payment.bill_number,
          'Total Bill Amount': payment.total_amount,
          'Remaining Pending': payment.pending_amount,
          'Received Amount': payment.amount,
          'Payment Mode': payment.payment_mode || 'CASH'
        }));
        break;
      case 'returns-history':
        dataToExport = returnsSubTab === 'today' ? todayReturns : returnHistory;
        break;
      case 'product-performance':
        dataToExport = productsSubTab === 'today' ? todayProductPerformance : productPerformance;
        break;
      case 'stock-history':
        dataToExport = filteredStockHistory.map(item => ({
          'Date': new Date(item.date).toLocaleDateString(),
          'Product Name': item.productName,
          'Loaded Quantity': item.morningStock,
          'Unit': item.unit
        }));
        break;
      case 'fuel-expenses':
        dataToExport = fuelExpenses.map(item => ({
          'Date': new Date(item.expense_date).toLocaleDateString(),
          'Expense Type': item.type,
          'Amount (INR)': item.amount,
          'Logged At': new Date(item.created_at).toLocaleString()
        }));
        break;
      default:
        alert('Unknown report type');
        return;
    }
    // Convert dataToExport to CSV and trigger download
    exportToCSV(dataToExport, reportType);
  };

  // Helper function to convert JSON to CSV and trigger download
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const escaped = ('' + row[header]).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const [dateFilter, setDateFilter] = useState({
    from: '2024-01-01',
    to: new Date().toISOString().split('T')[0]
  });


  
  // Generate reports from actual data
  const dailyBillingSummary = useMemo(() => {
    return bills
      .map(bill => ({
        date: bill.bill_date,
        billNumber: bill.id,
        shopName: bill.shop_name,
        totalAmount: bill.total_amount,
        receivedAmount: bill.received_amount,
        pendingAmount: bill.pending_amount,
        status: bill.status
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bills]);

  const shopWiseReport = useMemo(() => {
    const shopStats = bills.reduce((acc, bill) => {
      if (!acc[bill.shop_id]) {
        acc[bill.shop_id] = {
          shop_name: bill.shop_name,
          bills: 0,
          total_amount: 0,
          last_order: bill.bill_date,
          total_pending: 0,
          pending_bills: []
        };
      }
      acc[bill.shop_id].bills += 1;
      acc[bill.shop_id].total_amount += bill.total_amount;
      if (new Date(bill.bill_date) > new Date(acc[bill.shop_id].last_order)) {
        acc[bill.shop_id].last_order = bill.bill_date;
      }
      if (bill.pending_amount > 0) {
        acc[bill.shop_id].total_pending += bill.pending_amount;
        acc[bill.shop_id].pending_bills.push({
          billNumber: bill.id,
          date: bill.bill_date,
          totalAmount: bill.total_amount,
          pendingAmount: bill.pending_amount
        });
      }
      return acc;
    }, {} as Record<number, { shop_name: string; bills: number; total_amount: number; last_order: string; total_pending: number; pending_bills: any[] }>);

    return Object.values(shopStats).map(shop => ({
      ...shop,
      avg_bill: Math.round(shop.total_amount / shop.bills)
    }));
  }, [bills]);

  const pendingShopsReport = useMemo(() => {
    return shopWiseReport.filter(shop => shop.total_pending > 0);
  }, [shopWiseReport]);

  const returnHistory = useMemo(() => {
    return (bills as any[]).flatMap((bill: any) => 
      bill.items
        .filter((item: any) => item.quantity < 0)
        .map((item: any) => ({
          return_date: bill.bill_date,
          shop_name: bill.shop_name,
          product_name: item.product_name,
          quantity: Math.abs(item.quantity),
          amount: Math.abs(item.amount),
          reason: 'Return processed'
        }))
    );
  }, [bills]);

  const todayReturns = useMemo(() => {
    return returnHistory.filter(item => isToday(item.return_date));
  }, [returnHistory]);

  // Weekly report generation
  const weeklyBillingSummary = useMemo(() => {
    const billsByWeek = bills.reduce((acc, bill) => {
      const date = new Date(bill.bill_date);
      const year = date.getFullYear();
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
      
      if (!acc[weekKey]) {
        acc[weekKey] = { 
          week: weekKey, 
          startDate: getStartOfWeek(date),
          endDate: getEndOfWeek(date),
          bills: 0, 
          revenue: 0, 
          received: 0, 
          pending: 0, 
          shops: new Set<number>() 
        };
      }
      acc[weekKey].bills += 1;
      acc[weekKey].revenue += bill.total_amount;
      acc[weekKey].received += bill.received_amount;
      acc[weekKey].pending += bill.pending_amount;
      acc[weekKey].shops.add(bill.shop_id);
      return acc;
    }, {} as Record<string, { week: string; startDate: Date; endDate: Date; bills: number; revenue: number; received: number; pending: number; shops: Set<number> }>);

    return Object.values(billsByWeek)
      .map(item => ({
        week: item.week,
        startDate: item.startDate,
        endDate: item.endDate,
        bills: item.bills,
        revenue: item.revenue,
        received: item.received,
        pending: item.pending,
        shops: item.shops.size
      }))
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [bills]);

  // Monthly report generation
  const monthlyBillingSummary = useMemo(() => {
    const billsByMonth = bills.reduce((acc, bill) => {
      const date = new Date(bill.bill_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { 
          month: monthKey, 
          monthName: date.toLocaleString('default', { month: 'long' }),
          year: year,
          bills: 0, 
          revenue: 0, 
          received: 0, 
          pending: 0, 
          shops: new Set<number>() 
        };
      }
      acc[monthKey].bills += 1;
      acc[monthKey].revenue += bill.total_amount;
      acc[monthKey].received += bill.received_amount;
      acc[monthKey].pending += bill.pending_amount;
      acc[monthKey].shops.add(bill.shop_id);
      return acc;
    }, {} as Record<string, { month: string; monthName: string; year: number; bills: number; revenue: number; received: number; pending: number; shops: Set<number> }>);

    return Object.values(billsByMonth)
      .map(item => ({
        month: item.month,
        monthName: item.monthName,
        year: item.year,
        bills: item.bills,
        revenue: item.revenue,
        received: item.received,
        pending: item.pending,
        shops: item.shops.size
      }))
      .sort((a, b) => new Date(`${b.month}-01`).getTime() - new Date(`${a.month}-01`).getTime());
  }, [bills]);



  const filteredStockHistory = useMemo(() => {
    if (!stockAppliedDate) {
      return stockHistory;
    }
    return stockHistory.filter(item => {
      if (!item.date) return false;
      return item.date.startsWith(stockAppliedDate);
    });
  }, [stockHistory, stockAppliedDate]);

  const productPerformance = useMemo(() => {
    const filteredBills = bills.filter(bill => {
      if (!appliedDate) return true;
      if (!bill.bill_date) return false;
      return bill.bill_date.startsWith(appliedDate);
    });
    const productStats = filteredBills.reduce((acc, bill) => {
      bill.items.forEach(item => {
        if (!acc[item.product_id]) {
          acc[item.product_id] = {
            product_name: item.product_name,
            total_sold: 0,
            revenue: 0,
            returns: 0,
            shops: new Set()
          };
        }
        if (item.quantity > 0) {
          acc[item.product_id].total_sold += item.quantity;
          acc[item.product_id].revenue += item.amount + (item.sgst || 0) + (item.cgst || 0);
        } else {
          acc[item.product_id].returns += Math.abs(item.quantity);
          // For returns, revenue is already negative in item.amount, no need to add taxes
        }
        acc[item.product_id].shops.add(bill.shop_id);
      });
      return acc;
    }, {} as Record<number, { product_name: string; total_sold: number; revenue: number; returns: number; shops: Set<number> }>);

    return Object.values(productStats).map(product => ({
      ...product,
      shops: product.shops.size
    }));
  }, [bills, appliedDate]);

  const todayProductPerformance = useMemo(() => {
    const todayBills = bills.filter(bill => isToday(bill.bill_date));
    const productStats = todayBills.reduce((acc, bill) => {
      bill.items.forEach(item => {
        if (!acc[item.product_id]) {
          acc[item.product_id] = {
            product_name: item.product_name,
            total_sold: 0,
            revenue: 0,
            returns: 0,
            shops: new Set()
          };
        }
        if (item.quantity > 0) {
          acc[item.product_id].total_sold += item.quantity;
          acc[item.product_id].revenue += item.amount + (item.sgst || 0) + (item.cgst || 0);
        } else {
          acc[item.product_id].returns += Math.abs(item.quantity);
        }
        acc[item.product_id].shops.add(bill.shop_id);
      });
      return acc;
    }, {} as Record<number, { product_name: string; total_sold: number; revenue: number; returns: number; shops: Set<number> }>);

    return Object.values(productStats)
      .map(product => ({
        ...product,
        shops: product.shops.size
      }))
      .sort((a, b) => b.total_sold - a.total_sold);
  }, [bills]);

  const topProductToday = useMemo(() => {
    if (todayProductPerformance.length === 0) return null;
    const activeSales = todayProductPerformance.filter(p => p.total_sold > 0);
    if (activeSales.length === 0) return null;
    return activeSales[0];
  }, [todayProductPerformance]);


  const StatCard = ({ title, value, icon: Icon, change, color = 'blue' }: any) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+{change}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const handlePageChange = (tab: string, page: number) => {
    setPageStates(prev => ({ ...prev, [tab]: page }));
  };

  const currentPage = pageStates[activeTab] || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600 mt-1">Track your business performance and insights</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
          title="Total Revenue"
          value={`₹${bills.reduce((sum, bill) => sum + bill.total_amount, 0).toFixed(2)}`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Total Bills"
          value={bills.length.toString()}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Products Sold"
          value={bills.reduce((sum, bill) => sum + bill.items.filter(item => item.quantity > 0).reduce((itemSum, item) => itemSum + item.quantity, 0), 0).toLocaleString()}
          icon={Package}
          color="purple"
        />
        <StatCard
          title="Active Shops"
          value={shops.length.toString()}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="relative border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <nav className="-mb-px flex space-x-8 whitespace-nowrap">
          {[
            { key: 'daily', label: 'Daily Summary', icon: BarChart3 },
            { key: 'weekly', label: 'Weekly Reports', icon: CalendarRange },
            { key: 'monthly', label: 'Monthly Reports', icon: Calendar },
            { key: 'shops', label: 'Shop Reports', icon: ShoppingCart },
            { key: 'pending', label: 'Pending Reports', icon: AlertCircle },
            { key: 'pending_received', label: 'Pending Received', icon: DollarSign },
            { key: 'returns', label: 'Returns', icon: Package },
            { key: 'products', label: 'Product Performance', icon: TrendingUp },
            { key: 'stock_details', label: 'Stock Details', icon: Warehouse },
            { key: 'fuel_expenses', label: 'Petrol/CNG', icon: Fuel },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
        {/* Gradient fade on right to indicate scroll */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white"></div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Daily Summary Tab */}
        {activeTab === 'daily' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Daily Billing Summary</h3>
              <button
                onClick={() => handleExport('daily-summary')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] max-w-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bill Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Received
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pending
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    return dailyBillingSummary.map((bill) => (
                      <tr key={bill.billNumber} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {new Date(bill.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.billNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.shopName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ₹{bill.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          ₹{bill.receivedAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                          ₹{bill.pendingAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            bill.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
          </div>
        )}

        {/* Weekly Reports Tab */}
        {activeTab === 'weekly' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Billing Summary</h3>
              <button
                onClick={() => handleExport('weekly-summary')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Received
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Pending
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shops Served
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg per Bill
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    return weeklyBillingSummary.map((week) => (
                      <tr key={week.week} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {week.week}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {week.startDate.toLocaleDateString()} - {week.endDate.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {week.bills}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ₹{week.revenue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          ₹{week.received.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                          ₹{week.pending.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {week.shops}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{Math.round(week.revenue / week.bills).toLocaleString()}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
          </div>
        )}

        {/* Monthly Reports Tab */}
        {activeTab === 'monthly' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Billing Summary</h3>
              <button
                onClick={() => handleExport('monthly-summary')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Received
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Pending
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shops Served
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg per Bill
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    return monthlyBillingSummary.map((month) => (
                      <tr key={month.month} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {month.monthName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {month.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {month.bills}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ₹{month.revenue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          ₹{month.received.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                          ₹{month.pending.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {month.shops}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{Math.round(month.revenue / month.bills).toLocaleString()}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
          </div>
        )}

        {/* Shop Reports Tab */}
        {activeTab === 'shops' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Shop-wise Performance</h3>
              <button
                onClick={() => handleExport('shop-performance')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Bills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Bill Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pending Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    return shopWiseReport.map((shop) => (
                      <tr
                        key={shop.shop_name}
                        onClick={() => handleShopClick(shop)}
                        className="hover:bg-blue-50 cursor-pointer transition"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{shop.shop_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {shop.bills}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ₹{shop.total_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{shop.avg_bill.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(shop.last_order).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {shop.total_pending > 0 ? (
                            <div>
                              <div className="font-bold text-red-600 font-medium">₹{shop.total_pending.toLocaleString()}</div>
                              <div className="text-xs text-gray-500 mt-1 max-h-24 overflow-y-auto space-y-1">
                                {shop.pending_bills.map((b: any) => (
                                  <div key={b.billNumber} className="border-t border-gray-100 pt-1">
                                    <span className="font-medium text-gray-700">Bill #{b.billNumber}</span> ({new Date(b.date).toLocaleDateString()})
                                    <div>Purchase: ₹{b.totalAmount.toLocaleString()} | Pending: <span className="font-medium text-red-600">₹{b.pendingAmount.toLocaleString()}</span></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-green-600 font-medium">None</span>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
          </div>
        )}

        {/* Pending Reports Tab */}
        {activeTab === 'pending' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Shops with Pending Balances</h3>
              <button
                onClick={() => handleExport('pending-shops')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Pending Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pending Bills Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    if (pendingShopsReport.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 font-sans">
                            No shops have pending balances!
                          </td>
                        </tr>
                      );
                    }
                    return pendingShopsReport.map((shop) => (
                      <tr key={shop.shop_name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{shop.shop_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{shop.total_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                          ₹{shop.total_pending.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(shop.last_order).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="text-xs text-gray-500 max-h-32 overflow-y-auto space-y-1">
                            {shop.pending_bills.map((b: any) => (
                              <div key={b.billNumber} className="border-t border-gray-100 pt-1 first:border-t-0 first:pt-0">
                                <span className="font-semibold text-gray-700">Bill #{b.billNumber}</span> ({new Date(b.date).toLocaleDateString()})
                                <div>Purchase: ₹{b.totalAmount.toLocaleString()} | Pending: <span className="font-bold text-red-600">₹{b.pendingAmount.toLocaleString()}</span></div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
          </div>
        )}

        {/* Pending Received Tab */}
        {activeTab === 'pending_received' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Pending Received Collections</h3>
              <button
                onClick={() => handleExport('pending-received-payments')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    if (pendingReceivedPayments.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 font-sans">
                            No received payments found!
                          </td>
                        </tr>
                      );
                    }
                    return pendingReceivedPayments.map((payment, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{payment.shop_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">Bill #{payment.bill_number}</div>
                          <div className="text-xs text-gray-500">
                            Total: ₹{parseFloat(payment.total_amount).toLocaleString()} | Bal: <span className="text-red-600 font-semibold">₹{parseFloat(payment.pending_amount).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          ₹{parseFloat(payment.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.payment_mode === 'UPI' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.payment_mode || 'CASH'}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
          </div>
        )}

        {/* Returns Tab */}
        {activeTab === 'returns' && (
          <div className="p-6">
            {/* Sub-tabs / Toggle */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => { setReturnsSubTab('today'); handlePageChange('returns-today', 1); }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                    returnsSubTab === 'today'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Today's Returns
                </button>
                <button
                  onClick={() => { setReturnsSubTab('all'); handlePageChange('returns-all', 1); }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                    returnsSubTab === 'all'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All-Time Returns
                </button>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {returnsSubTab === 'today' ? "Today's Returns" : "All-Time Returns"}
                </h3>
                <button
                  onClick={() => handleExport('returns-history')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>

            {/* Today's Returns Summary Cards */}
            {returnsSubTab === 'today' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-red-800">Today's Returned Quantity</p>
                    <p className="text-3xl font-extrabold text-red-900 mt-1">
                      {todayReturns.reduce((sum, item) => sum + item.quantity, 0)} units
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full text-red-600">
                    <Package className="h-6 w-6" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-rose-800">Today's Return Value</p>
                    <p className="text-3xl font-extrabold text-rose-900 mt-1">
                      ₹{todayReturns.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-100 rounded-full text-rose-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Return Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const data = returnsSubTab === 'today' ? todayReturns : returnHistory;
                    if (data.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                            No return records found.
                          </td>
                        </tr>
                      );
                    }

                    return data.map((returnItem: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(returnItem.return_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {returnItem.shop_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {returnItem.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {returnItem.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          -₹{returnItem.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            {returnItem.reason}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Product Performance Tab */}
        {activeTab === 'products' && (
          <div className="p-6">
            {/* Sub-tabs / Toggle */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => { setProductsSubTab('today'); handlePageChange('products-today', 1); }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                    productsSubTab === 'today'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Today's Performance
                </button>
                <button
                  onClick={() => { setProductsSubTab('all'); handlePageChange('products-all', 1); }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                    productsSubTab === 'all'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All-Time Performance
                </button>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {productsSubTab === 'today' ? "Today's Product Performance" : "All-Time Product Performance"}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {productsSubTab === 'all' && (
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 text-xs font-semibold">
                    <span className="text-gray-700">Filter Date:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white font-normal"
                    />
                    <button
                      onClick={() => setAppliedDate(selectedDate)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                    >
                      Apply
                    </button>
                    {appliedDate && (
                      <button
                        onClick={() => { setSelectedDate(''); setAppliedDate(''); }}
                        className="text-blue-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => handleExport('product-performance')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>

            {/* Top Product Highlight Card */}
            {productsSubTab === 'today' && topProductToday && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl p-6 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Top Selling Today 🏆
                  </span>
                  <h4 className="text-xl font-bold text-gray-950 mt-1">{topProductToday.product_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    This product sold the most quantity today.
                  </p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <span className="text-xs text-gray-500 block uppercase font-medium">Quantity Sold</span>
                    <span className="text-2xl font-extrabold text-green-700">{topProductToday.total_sold} units</span>
                  </div>
                  <div className="border-l border-green-100 pl-6">
                    <span className="text-xs text-gray-500 block uppercase font-medium">Revenue</span>
                    <span className="text-2xl font-extrabold text-emerald-700">₹{topProductToday.revenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Sold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Returns
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shops
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const data = productsSubTab === 'today' ? todayProductPerformance : productPerformance;
                    if (data.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                            No product sales recorded for this period.
                          </td>
                        </tr>
                      );
                    }

                    return data.map((product) => {
                      const maxRevenue = productsSubTab === 'today'
                        ? (topProductToday?.revenue || 2000)
                        : 20000;
                      const percentage = Math.round((product.revenue / maxRevenue) * 100);
                      
                      return (
                        <tr key={product.product_name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.total_sold} units
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            ₹{product.revenue.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {product.returns} units
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.shops} shops
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(100, percentage)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Stock Details Tab */}
        {activeTab === 'stock_details' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Stock Loading History</h3>
              <button
                onClick={() => handleExport('stock-history')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>

            {/* Date filter for Stock Loading History */}
            <div className="flex flex-row flex-wrap items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm animate-fadeIn">
              <div className="flex items-center gap-1.5 shrink-0">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-semibold text-gray-800">Filter by Date:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={stockFilterDate}
                  onChange={(e) => setStockFilterDate(e.target.value)}
                  className="px-3 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  onClick={() => setStockAppliedDate(stockFilterDate)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition"
                >
                  Apply
                </button>
              </div>
              {stockAppliedDate && (
                <button
                  onClick={() => { setStockFilterDate(''); setStockAppliedDate(''); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2.5 py-1 hover:bg-blue-50 rounded transition ml-auto"
                >
                  Clear Filter
                </button>
              )}
            </div>


            <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loaded Quantity (Morning Stock)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const data = filteredStockHistory;
                    if (data.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                            No stock loading records found for this period.
                          </td>
                        </tr>
                      );
                    }

                    return data.map((historyItem, idx) => {
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(historyItem.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{historyItem.productName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                            {historyItem.morningStock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {historyItem.unit}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fuel Expenses Tab */}
        {activeTab === 'fuel_expenses' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Petrol / CNG Expense Report</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Total Fuel Expenses for Selected Period: <span className="font-bold text-red-600">₹{fuelTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('fuel-expenses')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              </div>
            </div>

            {/* Sub Tabs: Today / All Time */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setFuelSubTab('today')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  fuelSubTab === 'today'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setFuelSubTab('all')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  fuelSubTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All Time / Custom
              </button>
            </div>

            {/* Filters */}
            {fuelSubTab === 'all' && (
              <div className="flex flex-row flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm animate-fadeIn">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold text-gray-800 font-sans">Filters:</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">From:</span>
                  <input
                    type="date"
                    value={fuelFilterFrom}
                    onChange={(e) => setFuelFilterFrom(e.target.value)}
                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">To:</span>
                  <input
                    type="date"
                    value={fuelFilterTo}
                    onChange={(e) => setFuelFilterTo(e.target.value)}
                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">Type:</span>
                  <select
                    value={fuelFilterType}
                    onChange={(e) => setFuelFilterType(e.target.value)}
                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">All Types</option>
                    <option value="CNG">CNG</option>
                    <option value="PETROL">Petrol</option>
                    <option value="CNG+PETROL">CNG + Petrol</option>
                  </select>
                </div>

                {(fuelFilterFrom || fuelFilterTo || fuelFilterType) && (
                  <button
                    onClick={() => {
                      setFuelFilterFrom('');
                      setFuelFilterTo('');
                      setFuelFilterType('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2.5 py-1 hover:bg-blue-50 rounded transition ml-auto"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg animate-fadeIn">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logged At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fuelLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                        Loading fuel expenses...
                      </td>
                    </tr>
                  ) : fuelExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500 font-sans">
                        No fuel expenses found for this period.
                      </td>
                    </tr>
                  ) : (
                    fuelExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            expense.type === 'CNG' ? 'bg-green-100 text-green-800' :
                            expense.type === 'PETROL' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {expense.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                          ₹{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(expense.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shop Pending Details & Payment History Modal */}
        {selectedShop && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedShop.shop_name}</h3>
                  <p className="text-xs text-gray-500 mt-1">Pending and Payment History Summary</p>
                </div>
                <button
                  onClick={() => { setSelectedShop(null); setShopPayments([]); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <span className="text-xs text-blue-600 font-semibold block uppercase">Total Bills</span>
                    <span className="text-2xl font-extrabold text-blue-800">{selectedShop.bills}</span>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <span className="text-xs text-green-600 font-semibold block uppercase">Total Amount</span>
                    <span className="text-2xl font-extrabold text-green-800 font-bold">₹{selectedShop.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <span className="text-xs text-red-600 font-semibold block uppercase">Total Pending</span>
                    <span className="text-2xl font-extrabold text-red-850 font-bold">₹{selectedShop.total_pending.toLocaleString()}</span>
                  </div>
                </div>

                {/* Pending Bills Section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Pending Bills</h4>
                  {selectedShop.pending_bills && selectedShop.pending_bills.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-150 rounded-xl">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Bill No</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Bill Amount</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Pending Balance</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-150 text-sm">
                          {selectedShop.pending_bills.map((b: any) => (
                            <tr key={b.billNumber}>
                              <td className="px-4 py-3 font-semibold text-blue-600">Bill #{b.billNumber}</td>
                              <td className="px-4 py-3 text-gray-500">{new Date(b.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-right text-gray-900 font-medium">₹{b.totalAmount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-red-600 font-bold">₹{b.pendingAmount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
                      No pending bills for this shop.
                    </div>
                  )}
                </div>

                {/* Payment History Section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Payment History</h4>
                  {shopPayments && shopPayments.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-150 rounded-xl">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Bill No</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Amount Paid</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Mode</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-150 text-sm">
                          {shopPayments.map((p: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-900">
                                {(() => {
                                  const dateVal = p.paymentDate || p.paymentdate || p.PAYMENTDATE || p.payment_date || p.PAYMENT_DATE;
                                  return dateVal ? new Date(dateVal).toLocaleDateString() : 'Invalid Date';
                                })()}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-700">
                                Bill #{p.billNumber || p.billnumber || p.BILLNUMBER || p.bill_number || p.BILL_NUMBER}
                              </td>
                              <td className="px-4 py-3 text-right text-green-600 font-bold">
                                ₹{(() => {
                                  const amtVal = p.amount || p.AMOUNT;
                                  return amtVal && !isNaN(parseFloat(amtVal)) ? parseFloat(amtVal).toLocaleString() : '0';
                                })()}
                              </td>
                              <td className="px-4 py-3">
                                {(() => {
                                  const modeVal = p.paymentMode || p.paymentmode || p.PAYMENTMODE || p.payment_mode || p.PAYMENT_MODE || 'CASH';
                                  return (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                      modeVal === 'GPAY' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {modeVal}
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500">
                      No payments recorded yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-lg">
                <button
                  onClick={() => { setSelectedShop(null); setShopPayments([]); }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg text-sm transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;