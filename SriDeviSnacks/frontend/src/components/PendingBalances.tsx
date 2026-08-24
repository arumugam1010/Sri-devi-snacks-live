import React, { useState, useMemo } from 'react';
import { Download, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { billsAPI } from '../services/api';
import GPayQRCode from './GPayQRCode';

const PendingBalances: React.FC = () => {
  const { bills, refreshData } = useAppContext();
  const [selectedGPayBill, setSelectedGPayBill] = useState<any>(null);
  const [selectedCashBill, setSelectedCashBill] = useState<any>(null);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [isCashSubmitting, setIsCashSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const pendingShopsReport = useMemo(() => {
    const shopStats = bills.reduce((acc, bill) => {
      if (!acc[bill.shop_id]) {
        acc[bill.shop_id] = {
          shop_id: bill.shop_id,
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
          pendingAmount: bill.pending_amount,
          receivedAmount: bill.received_amount
        });
      }
      return acc;
    }, {} as Record<number, { shop_id: number; shop_name: string; bills: number; total_amount: number; last_order: string; total_pending: number; pending_bills: any[] }>);

    const processed = Object.values(shopStats).map(shop => ({
      ...shop,
      pending_bills: shop.pending_bills.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })).filter(shop => shop.total_pending > 0).sort((a, b) => b.total_pending - a.total_pending);

    if (searchQuery.trim()) {
      return processed.filter(shop =>
        shop.shop_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return processed;
  }, [bills, searchQuery]);

  const totalOverallPending = useMemo(() => {
    return pendingShopsReport.reduce((sum, shop) => sum + shop.total_pending, 0);
  }, [pendingShopsReport]);

  const totalPendingBillsCount = useMemo(() => {
    return pendingShopsReport.reduce((sum, shop) => sum + shop.pending_bills.length, 0);
  }, [pendingShopsReport]);

  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Shop Name,Total Sales,Total Pending Balance,Last Order,Pending Bills Details\n";
    pendingShopsReport.forEach(shop => {
      const pendingBillsText = shop.pending_bills.map(b => `Bill #${b.billNumber} (Pending: Rs.${b.pendingAmount})`).join('; ');
      csvContent += `"${shop.shop_name}","${shop.total_amount}","${shop.total_pending}","${new Date(shop.last_order).toLocaleDateString()}","${pendingBillsText}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pending-shops-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCashBill || !cashAmount || parseFloat(cashAmount) <= 0) return;
    
    const amountToCollect = parseFloat(cashAmount);
    if (amountToCollect > selectedCashBill.amount) {
      alert("Collected amount cannot be greater than pending amount!");
      return;
    }

    setIsCashSubmitting(true);
    try {
      const newReceivedAmount = selectedCashBill.receivedAmount + amountToCollect;
      
      const response = await billsAPI.updateBill(selectedCashBill.billId, {
        receivedAmount: newReceivedAmount,
        paymentMode: 'CASH'
      });

      if (response.success) {
        alert("Cash collected successfully!");
        setSelectedCashBill(null);
        setCashAmount('');
        // Refresh data to update pending balances and dashboard stats
        await refreshData();
      } else {
        alert("Failed to collect cash: " + (response.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error collecting cash:", error);
      alert("Failed to collect cash");
    } finally {
      setIsCashSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shops with Pending Balances</h2>
          <div className="flex space-x-3 mt-2">
            <span className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full shadow-sm">
              Total Pending: ₹{totalOverallPending.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full shadow-sm">
              Total Bills: {totalPendingBillsCount}
            </span>
          </div>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto mt-2 sm:mt-0">
          <div className="relative flex-grow sm:flex-grow-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
            />
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition whitespace-nowrap"
          >
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
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
                  Pending Bills & Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingShopsReport.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500 font-sans">
                    No shops have pending balances!
                  </td>
                </tr>
              ) : (
                pendingShopsReport.map((shop) => (
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
                    <td className="px-6 py-4 text-sm text-gray-900 align-top">
                      <div className="flex flex-col space-y-3">
                        {shop.pending_bills.map((b: any) => (
                          <div key={b.billNumber} className="flex flex-col xl:flex-row xl:justify-between xl:items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0 gap-3">
                            <div>
                              <div><span className="font-semibold text-gray-700">Bill #{b.billNumber}</span> ({new Date(b.date).toLocaleDateString()})</div>
                              <div>Purchase: ₹{b.totalAmount.toLocaleString()} | Pending: <span className="font-bold text-red-600">₹{b.pendingAmount.toLocaleString()}</span></div>
                            </div>
                            <div className="flex gap-2 self-start xl:self-auto flex-wrap">
                              <button
                                onClick={() => {
                                  setSelectedCashBill({
                                    billId: b.billNumber,
                                    shopId: shop.shop_id,
                                    shopName: shop.shop_name,
                                    amount: b.pendingAmount,
                                    receivedAmount: b.receivedAmount
                                  });
                                  setCashAmount(b.pendingAmount.toString());
                                }}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold text-xs shadow-sm whitespace-nowrap"
                              >
                                Pay with Cash
                              </button>
                              <button
                                onClick={() => setSelectedGPayBill({
                                  billId: b.billNumber,
                                  shopId: shop.shop_id,
                                  shopName: shop.shop_name,
                                  amount: b.pendingAmount,
                                  receivedAmount: b.receivedAmount
                                })}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold text-xs shadow-sm whitespace-nowrap"
                              >
                                Pay with GPay (Bill #{b.billNumber})
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedGPayBill && (
        <GPayQRCode
          billId={selectedGPayBill.billId}
          shopId={selectedGPayBill.shopId}
          shopName={selectedGPayBill.shopName}
          amount={selectedGPayBill.amount}
          upiId="santhanamvlr@okicici"
          onClose={() => setSelectedGPayBill(null)}
          onPaymentSuccess={async (txId, paidAmount) => {
            try {
              const newReceivedAmount = (selectedGPayBill.receivedAmount || 0) + paidAmount;
              const response = await billsAPI.updateBill(selectedGPayBill.billId, {
                receivedAmount: newReceivedAmount,
                paymentMode: 'GPAY'
              });

              if (response.success) {
                alert(`Payment of ₹${paidAmount} recorded successfully for Bill #${selectedGPayBill.billId}.`);
                window.location.reload();
              } else {
                alert('Payment successful in UI, but failed to update bill in Database: ' + response.message);
              }
            } catch (error) {
              console.error('Failed to update bill payment:', error);
              alert('An error occurred while updating the bill in the database.');
            }
          }}
        />
      )}
      {selectedCashBill && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-auto relative overflow-hidden">
            <div className="bg-green-600 p-4 text-center">
              <h3 className="text-xl font-bold text-white">Cash Collection</h3>
              <p className="text-green-100 text-sm mt-1">Bill #{selectedCashBill.billId}</p>
            </div>
            
            <form onSubmit={handleCashPayment} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                  <div className="text-gray-900 font-medium bg-gray-50 p-2 rounded border border-gray-200">
                    {selectedCashBill.shopName}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Pending</label>
                  <div className="text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">
                    ₹{selectedCashBill.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <label htmlFor="cashAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Collected (₹)
                  </label>
                  <input
                    type="number"
                    id="cashAmount"
                    min="1"
                    max={selectedCashBill.amount}
                    step="0.01"
                    required
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium text-lg"
                    autoFocus
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCashBill(null);
                    setCashAmount('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                  disabled={isCashSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCashSubmitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  {isCashSubmitting ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingBalances;
