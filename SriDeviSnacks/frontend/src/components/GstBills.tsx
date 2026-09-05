import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Receipt, Download, Eye, X, ArrowLeft, ShoppingCart } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

const GstBills: React.FC = () => {
  const { bills, shops } = useAppContext();
  const [selectedMonth, setSelectedMonth] = useState<{ financialYear: string; monthName: string } | null>(null);
  const [selectedBillForView, setSelectedBillForView] = useState<any>(null);

  // Configuration for shops that recently got a GST number
  // Format: 'Shop Name': 'YYYY-MM-DD' (Bills before this date will be hidden from GST bills)
  const SHOP_GST_CUTOFF_DATES: Record<string, string> = {
    'நிலா பேக்கரி': '2026-09-05',
  };

  // All GST bills
  const allGstBills = useMemo(() => {
    return bills.filter(bill => {
      const shop = shops.find(s => s.id === bill.shop_id);
      const hasGstNumber = shop && shop.gst && shop.gst.trim() !== '';
      
      // Only include bills where GST was actually applied
      const hasGstApplied = bill.items && bill.items.some((item: any) => (item.sgst || 0) > 0 || (item.cgst || 0) > 0);
      
      let isAfterCutoff = true;
      if (shop && shop.shop_name && SHOP_GST_CUTOFF_DATES[shop.shop_name]) {
        const cutoffDate = new Date(SHOP_GST_CUTOFF_DATES[shop.shop_name]);
        cutoffDate.setHours(0, 0, 0, 0);
        const billDate = new Date(bill.bill_date);
        if (billDate < cutoffDate) {
          isAfterCutoff = false;
        }
      }
      
      return hasGstNumber && hasGstApplied && isAfterCutoff;
    }).sort((a, b) => new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime());
  }, [bills, shops]);

  // Group bills by financial year and month
  const groupedBills = useMemo(() => {
    const groups: { [financialYear: string]: { [month: string]: any[] } } = {};

    allGstBills.forEach(bill => {
      if (!bill.bill_date) return;
      const date = new Date(bill.bill_date);
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      
      const financialYear = date.getMonth() >= 3 
        ? `${year}-${year + 1}` 
        : `${year - 1}-${year}`;

      if (!groups[financialYear]) groups[financialYear] = {};
      if (!groups[financialYear][month]) groups[financialYear][month] = [];
      
      groups[financialYear][month].push(bill);
    });

    return groups;
  }, [allGstBills]);

  const sortedFinancialYears = useMemo(() => {
    return Object.keys(groupedBills).sort((a, b) => {
      const [aStart] = a.split('-').map(Number);
      const [bStart] = b.split('-').map(Number);
      return bStart - aStart;
    });
  }, [groupedBills]);

  const currentMonthBills = useMemo(() => {
    if (!selectedMonth) return [];
    return groupedBills[selectedMonth.financialYear]?.[selectedMonth.monthName] || [];
  }, [selectedMonth, groupedBills]);

  const totalGstBillAmount = useMemo(() => {
    return currentMonthBills.reduce((sum, bill) => sum + bill.total_amount, 0);
  }, [currentMonthBills]);

  const totalGstTaxAmount = useMemo(() => {
    return currentMonthBills.reduce((sum, bill) => {
      return sum + (bill.items ? bill.items.reduce((itemSum: number, item: any) => itemSum + (item.sgst || 0) + (item.cgst || 0), 0) : 0);
    }, 0);
  }, [currentMonthBills]);

  const handleExport = () => {
    const exportData = currentMonthBills.map(bill => {
      const shop = shops.find(s => s.id === bill.shop_id);
      const tax = bill.items ? bill.items.reduce((sum: number, item: any) => sum + (item.sgst || 0) + (item.cgst || 0), 0) : 0;
      return {
        Date: new Date(bill.bill_date).toLocaleDateString(),
        'Shop Name': bill.shop_name,
        'Shop GST': shop?.gst || '-',
        'Bill No': bill.bill_number || bill.billNumber || bill.id,
        'Total Amount': bill.total_amount,
        'Tax (SGST+CGST)': tax
      };
    });

    const ws = utils.json_to_sheet(exportData);
    
    utils.sheet_add_json(ws, [{
      Date: '',
      'Shop Name': '',
      'Shop GST': '',
      'Bill No': 'Total',
      'Total Amount': totalGstBillAmount,
      'Tax (SGST+CGST)': totalGstTaxAmount
    }], { skipHeader: true, origin: -1 });

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "GST_Bills");
    const fileName = selectedMonth 
      ? `GST_Bills_${selectedMonth.monthName}_${selectedMonth.financialYear}.xlsx`
      : `GST_Bills_All.xlsx`;
    writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Receipt className="h-6 w-6 mr-2 text-indigo-600" />
          GST Bills
        </h1>
        {selectedMonth && (
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedMonth(null)}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Months
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </button>
          </div>
        )}
      </div>

      {!selectedMonth ? (
        <div className="space-y-8">
          {sortedFinancialYears.map(financialYear => (
            <div key={financialYear} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Year {financialYear}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(groupedBills[financialYear])
                  .sort(([aMonth], [bMonth]) => {
                    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
                    return months.indexOf(bMonth) - months.indexOf(aMonth);
                  })
                  .map(([monthName, monthBills]) => {
                    const totalAmt = monthBills.reduce((sum, bill) => sum + bill.total_amount, 0);
                    const pendingAmt = monthBills.reduce((sum, bill) => sum + bill.pending_amount, 0);
                    
                    return (
                      <div
                        key={monthName}
                        className="rounded-lg p-4 cursor-pointer hover:opacity-90 transition-colors bg-gray-50"
                        onClick={() => setSelectedMonth({ financialYear, monthName })}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-semibold text-gray-800">{monthName}</h5>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            {monthBills.length} bill{monthBills.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>GST Bill Amount:</span>
                            <span className="font-medium text-gray-900">₹{totalAmt.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pending Amount:</span>
                            <span className="font-medium text-red-600">₹{pendingAmt.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="mt-4 text-xs text-gray-500 hover:text-gray-700 font-medium">
                          Click to view all bills
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
          {sortedFinancialYears.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No GST Bills Found</h4>
              <p className="text-gray-500">There are no GST bills available to display.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              GST Bills for {selectedMonth.monthName} {selectedMonth.financialYear}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop GST</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax (SGST+CGST)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentMonthBills.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">No GST bills found for this month.</td></tr>
                ) : (
                  currentMonthBills.map((bill) => {
                     const shop = shops.find(s => s.id === bill.shop_id);
                     const tax = bill.items ? bill.items.reduce((sum: number, item: any) => sum + (item.sgst || 0) + (item.cgst || 0), 0) : 0;
                     return (
                       <tr key={bill.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(bill.bill_date).toLocaleDateString()}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bill.shop_name}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{shop?.gst || '-'}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{bill.bill_number || bill.billNumber || bill.id}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">₹{bill.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">₹{tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                           <button
                             onClick={() => setSelectedBillForView(bill)}
                             className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                           >
                             <Eye className="h-4 w-4 mr-1" />
                             View
                           </button>
                         </td>
                       </tr>
                     )
                  })
                )}
              </tbody>
              {currentMonthBills.length > 0 && (
                <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right">Total:</td>
                    <td className="px-6 py-4 text-left text-blue-700">₹{totalGstBillAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-6 py-4 text-left text-red-700">₹{totalGstTaxAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* View Bill Modal */}
      {selectedBillForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">Bill Details - {selectedBillForView.bill_number || selectedBillForView.billNumber || selectedBillForView.id}</h2>
              <button onClick={() => setSelectedBillForView(null)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="text-gray-500">Shop Name:</span>
                  <div className="font-semibold text-gray-900">{selectedBillForView.shop_name}</div>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <div className="font-semibold text-gray-900">{new Date(selectedBillForView.bill_date).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-gray-500">Shop GST:</span>
                  <div className="font-semibold text-gray-900">{shops.find(s => s.id === selectedBillForView.shop_id)?.gst || '-'}</div>
                </div>
                <div>
                  <span className="text-gray-500">Payment Status:</span>
                  <div className={`font-semibold ${selectedBillForView.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {selectedBillForView.status}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Tax</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedBillForView.items && selectedBillForView.items.map((item: any, idx: number) => {
                      const itemTax = (item.sgst || 0) + (item.cgst || 0);
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">{item.quantity} {item.unit}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{item.price.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-red-600 text-right">₹{itemTax.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">₹{(item.amount + itemTax).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-900">Grand Total:</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700 text-lg">₹{selectedBillForView.total_amount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GstBills;
