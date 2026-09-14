import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Save, X, Trash2, Image as ImageIcon, Calendar, Printer, Download, ZoomIn, ZoomOut, Camera, Upload } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { getBaseUrl } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { convertPdfToImage, renderPdfUrlToDataUrl } from '../utils/pdfToImage';
import BillScannerModal from './BillScannerModal';

interface SupplierItem {
  id?: number;
  item_name: string;
  default_price: number;
  gst_rate: number;
}

interface Supplier {
  id: number;
  name: string;
  items: SupplierItem[];
}

interface BillItem {
  item_name: string;
  quantity: number | string;
  price: number | string;
  gst_percentage: number | string;
  total: number;
}

interface PurchaseBill {
  id: number;
  supplier_name: string;
  supplier_address?: string;
  supplier_gst?: string;
  bill_number: string;
  total_amount: number;
  taxable_amount?: number | string;
  gst_amount?: number | string;
  bill_date: string;
  image_path: string | null;
  is_gst: number;
  items?: BillItem[];
}

const PdfBillImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}> = ({ src, alt, className, onClick }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(src.endsWith('.pdf'));

  useEffect(() => {
    if (src.endsWith('.pdf')) {
      let isMounted = true;
      setLoading(true);
      renderPdfUrlToDataUrl(src)
        .then((url) => {
          if (isMounted) {
            setDataUrl(url);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error rendering PDF to image:", err);
          if (isMounted) setLoading(false);
        });
      return () => { isMounted = false; };
    } else {
      setDataUrl(src);
      setLoading(false);
    }
  }, [src]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 ${className || 'w-full h-full'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mb-2" />
        <span className="text-xs text-gray-500 font-medium">Loading Bill...</span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 ${className || 'w-full h-full'}`}>
        <ImageIcon className="w-10 h-10 mb-1 opacity-50" />
        <span className="text-xs">No preview</span>
      </div>
    );
  }

  return (
    <img 
      src={dataUrl} 
      alt={alt} 
      className={className} 
      onClick={onClick} 
    />
  );
};

const PurchaseBills: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAppContext();
  
  // Tabs: 'all_list', 'gst_list', 'nongst_list', 'form', 'images'
  const [activeTab, setActiveTab] = useState<'all_list' | 'gst_list' | 'nongst_list' | 'form' | 'images'>('all_list');
  
  // Form State
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<BillItem[]>([
    { item_name: '', quantity: 1, price: '', gst_percentage: 0, total: 0 }
  ]);
  const [isGst, setIsGst] = useState<number>(1);
  const [billImage, setBillImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [convertProgress, setConvertProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [updatingImage, setUpdatingImage] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const updateFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'new' | 'update'>('new');

  const openScanner = (target: 'new' | 'update' = 'new') => {
    setScannerTarget(target);
    setScannerOpen(true);
  };
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Grouped bills for images view
  const [groupedBills, setGroupedBills] = useState<Record<string, Record<string, PurchaseBill[]>>>({});
  const [expandedFY, setExpandedFY] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<{fy: string, month: string} | null>(null);
  const [selectedBillForView, setSelectedBillForView] = useState<PurchaseBill | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scannerOpen) {
          setScannerOpen(false);
        } else if (lightboxImage) {
          setLightboxImage(null);
        } else if (selectedBillForView) {
          setSelectedBillForView(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannerOpen, lightboxImage, selectedBillForView]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.openCurrentMonth && Object.keys(groupedBills).length > 0) {
      const today = new Date();
      const monthName = today.toLocaleString('default', { month: 'long' });
      const year = today.getFullYear();
      const fy = today.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      
      if (groupedBills[fy] && groupedBills[fy][monthName]) {
        setSelectedMonth({ fy, month: monthName });
        setExpandedFY(fy);
      }
      
      if (location.state.tab) {
        if (location.state.tab === 'non_gst_list') {
          setActiveTab('nongst_list');
        } else {
          setActiveTab(location.state.tab);
        }
      }
    }
  }, [location.state, groupedBills]);

  const handleViewBill = async (billId: number) => {
    setViewLoading(true);
    try {
      const res = await api.get(`/purchase-bills/${billId}`);
      if (res.data.success) {
        setSelectedBillForView(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch bill details");
    } finally {
      setViewLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [suppliersRes, billsRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/purchase-bills')
      ]);
      
      if (suppliersRes.data.success) setSuppliers(suppliersRes.data.data);
      if (billsRes.data.success) {
        setBills(billsRes.data.data);
        groupBills(billsRes.data.data);
      }
    } catch (err: any) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAllBills = () => {
    if (!selectedMonth) return;
    const billsToPrint = groupedBills[selectedMonth.fy][selectedMonth.month];
    
    // Create a hidden iframe to print without opening a new tab
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    let content = `
      <html>
        <head>
          <title>Print Bills - ${selectedMonth.month} ${selectedMonth.fy}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            .page { 
              page-break-after: always;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 90vh; /* Adjust height to fit within A4 */
              box-sizing: border-box;
            }
            .page:last-child {
              page-break-after: auto;
            }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 10px; text-align: center; }
            img { max-width: 100%; max-height: 80vh; object-fit: contain; }
          </style>
        </head>
        <body>
    `;

    let hasImages = false;
    billsToPrint.forEach(bill => {
      if (bill.image_path && !bill.image_path.endsWith('.pdf')) {
        hasImages = true;
        content += `
          <div class="page">
            <div class="title">Supplier: ${bill.supplier_name} | Bill No: ${bill.bill_number} | Date: ${new Date(bill.bill_date).toLocaleDateString()}</div>
            <img src="${getBaseUrl()}/${bill.image_path}" />
          </div>
        `;
      }
    });

    if (!hasImages) {
      content += `<p style="text-align: center; margin-top: 50px;">No printable images found for this month.</p>`;
    }

    content += `
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(content);
      doc.close();

      // Wait a moment for images to start loading, then trigger print
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        // Remove iframe after a generous delay so print dialog doesn't break
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 120000); // 2 minutes
      }, 1000);
    } else {
      document.body.removeChild(iframe);
      alert("Failed to initialize printing.");
    }
  };

  const getFinancialYear = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    // Assuming FY starts April 1st
    if (month >= 3) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  };

  const groupBills = (billsData: PurchaseBill[]) => {
    const grouped: Record<string, Record<string, PurchaseBill[]>> = {};
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    billsData.forEach(bill => {
      const fy = getFinancialYear(bill.bill_date);
      const monthIdx = new Date(bill.bill_date).getMonth();
      const monthName = monthNames[monthIdx];

      if (!grouped[fy]) grouped[fy] = {};
      if (!grouped[fy][monthName]) grouped[fy][monthName] = [];
      
      grouped[fy][monthName].push(bill);
    });

    setGroupedBills(grouped);
    
    // Set default expanded FY
    const fys = Object.keys(grouped).sort().reverse();
    if (fys.length > 0) {
      setExpandedFY(fys[0]);
    }
  };

  // Form Handlers
  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    setSupplierId(id || '');
    
    // Auto-detect GST type based on supplier items
    const supplier = suppliers.find(s => s.id === id);
    if (supplier && supplier.items && supplier.items.length > 0) {
      const hasGst = supplier.items.some(item => (item.gst_rate || 0) > 0);
      setIsGst(hasGst ? 1 : 0);
    } else {
      setIsGst(1); // Default to GST if no items
    }

    // Reset items if supplier changes
    setItems([{ item_name: '', quantity: 1, price: '', gst_percentage: 0, total: 0 }]);
  };

  const handleAddItem = () => {
    setItems([...items, { item_name: '', quantity: 1, price: '', gst_percentage: isGst === 0 ? 0 : '', total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const calculateTotal = (qty: number | string, price: number | string, gst: number | string) => {
    const q = typeof qty === 'number' ? qty : (parseFloat(qty.toString()) || 0);
    const p = typeof price === 'number' ? price : (parseFloat(price.toString()) || 0);
    const g = typeof gst === 'number' ? gst : (parseFloat(gst.toString()) || 0);
    const base = q * p;
    const tax = base * (g / 100);
    return parseFloat((base + tax).toFixed(2));
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto fill defaults if item is selected from supplier's list
    if (field === 'item_name') {
      const selectedSupplier = suppliers.find(s => s.id === supplierId);
      if (selectedSupplier) {
        const itemDef = selectedSupplier.items.find(i => i.item_name === value);
        if (itemDef) {
          newItems[index].price = itemDef.default_price;
          newItems[index].gst_percentage = itemDef.gst_rate;
        }
      }
    }

    // Recalculate row total
    if (['quantity', 'price', 'gst_percentage', 'item_name'].includes(field)) {
      newItems[index].total = calculateTotal(
        newItems[index].quantity, 
        newItems[index].price, 
        newItems[index].gst_percentage
      );
    }

    setItems(newItems);
  };

  const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

  const resetForm = () => {
    setSupplierId('');
    setBillNumber('');
    setBillDate(new Date().toISOString().split('T')[0]);
    setIsGst(1);
    setItems([{ item_name: '', quantity: 1, price: '', gst_percentage: 0, total: 0 }]);
    setBillImage(null);
    setImagePreview(null);
    setConvertProgress(null);
    setPdfPageCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        try {
          setConvertingPdf(true);
          setConvertProgress(null);
          setPdfPageCount(null);
          setError('');
          const convertedImage = await convertPdfToImage(file, {
            scale: 2,
            onProgress: (current, total) => {
              setConvertProgress({ current, total });
            }
          });
          setBillImage(convertedImage);
          setPdfPageCount(convertedImage.pageCount || 1);
          const previewUrl = URL.createObjectURL(convertedImage);
          setImagePreview(previewUrl);
        } catch (err: any) {
          console.error("PDF conversion error:", err);
          setError('Failed to convert PDF to image. Please try another file or upload an image directly.');
        } finally {
          setConvertingPdf(false);
        }
      } else {
        setBillImage(file);
        setPdfPageCount(null);
        setConvertProgress(null);
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !billNumber) {
      setError('Supplier and Bill Number are required');
      return;
    }

    const validItems = items
      .filter(i => i.item_name.trim() !== '' && (parseFloat(i.quantity.toString()) || 0) > 0)
      .map(i => ({
        item_name: i.item_name.trim(),
        quantity: parseFloat(i.quantity.toString()) || 0,
        price: parseFloat(i.price.toString()) || 0,
        gst_percentage: parseFloat(i.gst_percentage.toString()) || 0,
        total: i.total
      }));
    
    const formData = new FormData();
    formData.append('supplier_id', supplierId.toString());
    formData.append('bill_number', billNumber);
    formData.append('bill_date', billDate);
    formData.append('total_amount', grandTotal.toString());
    formData.append('is_gst', isGst.toString());
    formData.append('items', JSON.stringify(validItems));
    
    if (billImage) {
      formData.append('bill_image', billImage);
    }

    try {
      setSubmitting(true);
      const response = await api.post('/purchase-bills', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSuccess('Purchase bill added successfully');
        resetForm();
        fetchData();
        setActiveTab(isGst === 1 ? 'gst_list' : 'nongst_list');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save bill');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadBillImageFile = async (file: File) => {
    if (!selectedBillForView) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    try {
      setUpdatingImage(true);
      setUpdateMessage('Processing file...');
      
      let fileToSend: File = file;
      if (isPdf) {
        setUpdateMessage('Converting all PDF pages to image...');
        fileToSend = await convertPdfToImage(file, {
          scale: 2,
          onProgress: (cur, tot) => setUpdateMessage(`Converting PDF: Page ${cur} of ${tot}...`)
        });
      }

      setUpdateMessage('Uploading new bill image...');
      const formData = new FormData();
      formData.append('bill_image', fileToSend);

      const res = await api.post(`/purchase-bills/${selectedBillForView.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        const newImagePath = res.data.data.image_path;
        setSelectedBillForView(prev => prev ? { ...prev, image_path: newImagePath } : null);
        setUpdateMessage('✓ Bill image updated with all pages!');
        fetchData();
        setTimeout(() => setUpdateMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to update bill image:', err);
      alert(err.response?.data?.message || 'Failed to update bill image. Please try again.');
      setUpdateMessage(null);
    } finally {
      setUpdatingImage(false);
      if (updateFileInputRef.current) updateFileInputRef.current.value = '';
    }
  };

  const handleUpdateBillImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBillForView || !e.target.files || !e.target.files[0]) return;
    await uploadBillImageFile(e.target.files[0]);
  };

  const handleScannerCaptureOk = (file: File) => {
    if (scannerTarget === 'new') {
      setBillImage(file);
      setPdfPageCount(null);
      setConvertProgress(null);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else if (scannerTarget === 'update' && selectedBillForView) {
      uploadBillImageFile(file);
    }
  };

  const handleDeleteBill = async (billId: number) => {
    if (!window.confirm('Are you sure you want to delete this purchase bill? This will also remove the bill image.')) {
      return;
    }
    try {
      const res = await api.delete(`/purchase-bills/${billId}`);
      if (res.data.success) {
        setSelectedBillForView(null);
        fetchData();
        setSuccess('Purchase bill deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete purchase bill');
    }
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const filteredBills = selectedMonth && groupedBills[selectedMonth.fy] && groupedBills[selectedMonth.fy][selectedMonth.month] 
    ? groupedBills[selectedMonth.fy][selectedMonth.month]
    : [];
  
  const thisMonthGstTotal = filteredBills.filter(b => b.is_gst === 1).reduce((sum, b) => sum + parseFloat(b.total_amount.toString()), 0);
  const thisMonthNonGstTotal = filteredBills.filter(b => b.is_gst === 0).reduce((sum, b) => sum + parseFloat(b.total_amount.toString()), 0);

  const getCurrentMonthDetails = () => {
    const today = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const month = monthNames[today.getMonth()];
    const year = today.getFullYear();
    const fy = today.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    return { month, fy, year };
  };

  const exportBillsToExcel = (billsToExport: PurchaseBill[], fileName: string) => {
    if (!billsToExport || billsToExport.length === 0) {
      alert('No purchase bills found to export.');
      return;
    }

    const dataForExcel: Array<Record<string, any>> = billsToExport.map((bill, index) => {
      const tot = parseFloat(bill.total_amount.toString()) || 0;
      let taxable = bill.taxable_amount !== undefined ? parseFloat(bill.taxable_amount.toString()) : 0;
      let totalGst = bill.gst_amount !== undefined ? parseFloat(bill.gst_amount.toString()) : 0;

      if (bill.items && bill.items.length > 0) {
        const itemTaxable = bill.items.reduce((s, it) => {
          const q = parseFloat(it.quantity.toString()) || 0;
          const p = parseFloat(it.price.toString()) || 0;
          return s + (q * p);
        }, 0);
        const itemGst = bill.items.reduce((s, it) => {
          const q = parseFloat(it.quantity.toString()) || 0;
          const p = parseFloat(it.price.toString()) || 0;
          const g = parseFloat(it.gst_percentage.toString()) || 0;
          return s + (q * p * (g / 100));
        }, 0);
        taxable = bill.is_gst === 1 ? itemTaxable : tot;
        totalGst = bill.is_gst === 1 ? itemGst : 0;
      } else if (bill.is_gst === 0) {
        taxable = tot;
        totalGst = 0;
      } else if (bill.taxable_amount === undefined && bill.gst_amount === undefined) {
        taxable = tot;
        totalGst = 0;
      }

      const cgst = totalGst > 0 ? totalGst / 2 : 0;
      const sgst = totalGst > 0 ? totalGst / 2 : 0;

      return {
        'S.No': index + 1,
        'Bill Date': new Date(bill.bill_date).toLocaleDateString('en-GB'),
        'Supplier Name': bill.supplier_name,
        'Supplier GSTIN': bill.supplier_gst || '-',
        'Bill Number': bill.bill_number,
        'Bill Type': bill.is_gst === 1 ? 'GST' : 'Zero-Rated GST',
        'Taxable Amount (₹)': parseFloat(taxable.toFixed(2)),
        'CGST (₹)': parseFloat(cgst.toFixed(2)),
        'SGST (₹)': parseFloat(sgst.toFixed(2)),
        'Total GST (₹)': parseFloat(totalGst.toFixed(2)),
        'Total Amount (₹)': parseFloat(tot.toFixed(2))
      };
    });

    const totalTaxable = dataForExcel.reduce((sum, b) => sum + (Number(b['Taxable Amount (₹)']) || 0), 0);
    const totalCgst = dataForExcel.reduce((sum, b) => sum + (Number(b['CGST (₹)']) || 0), 0);
    const totalSgst = dataForExcel.reduce((sum, b) => sum + (Number(b['SGST (₹)']) || 0), 0);
    const grandTotalGst = dataForExcel.reduce((sum, b) => sum + (Number(b['Total GST (₹)']) || 0), 0);
    const totalAmount = dataForExcel.reduce((sum, b) => sum + (Number(b['Total Amount (₹)']) || 0), 0);
    const gstCount = billsToExport.filter(b => b.is_gst === 1).length;
    const nonGstCount = billsToExport.filter(b => b.is_gst === 0).length;

    // Summary row
    dataForExcel.push({
      'S.No': '',
      'Bill Date': '',
      'Supplier Name': 'TOTAL',
      'Supplier GSTIN': `GST: ${gstCount} | Zero-Rated GST: ${nonGstCount}`,
      'Bill Number': `Total: ${billsToExport.length} bills`,
      'Bill Type': '',
      'Taxable Amount (₹)': parseFloat(totalTaxable.toFixed(2)),
      'CGST (₹)': parseFloat(totalCgst.toFixed(2)),
      'SGST (₹)': parseFloat(totalSgst.toFixed(2)),
      'Total GST (₹)': parseFloat(grandTotalGst.toFixed(2)),
      'Total Amount (₹)': parseFloat(totalAmount.toFixed(2))
    });

    try {
      const worksheet = utils.json_to_sheet(dataForExcel);
      worksheet['!cols'] = [
        { wch: 8 },  // S.No
        { wch: 14 }, // Bill Date
        { wch: 30 }, // Supplier Name
        { wch: 22 }, // Supplier GSTIN
        { wch: 18 }, // Bill Number
        { wch: 16 }, // Bill Type
        { wch: 18 }, // Taxable Amount (₹)
        { wch: 12 }, // CGST (₹)
        { wch: 12 }, // SGST (₹)
        { wch: 14 }, // Total GST (₹)
        { wch: 18 }  // Total Amount (₹)
      ];
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Purchase Bills');
      writeFile(workbook, `${fileName}.xlsx`);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Failed to export Excel. " + (error as Error).message);
    }
  };

  const handleExportMonthBills = (fy: string, month: string) => {
    const monthBills = groupedBills[fy]?.[month] || [];
    const billsToExport = activeTab === 'all_list'
      ? monthBills
      : monthBills.filter(b => b.is_gst === (activeTab === 'gst_list' ? 1 : 0));

    if (billsToExport.length === 0) {
      alert(`No bills found to export for ${month} ${fy}.`);
      return;
    }

    const typePrefix = activeTab === 'all_list' ? 'All_Purchase_Bills' : activeTab === 'gst_list' ? 'GST_Purchase_Bills' : 'Zero_Rated_GST_Purchase_Bills';
    exportBillsToExcel(billsToExport, `${typePrefix}_${month}_${fy}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-indigo-600" />
            Purchase Bills
          </h1>
          <p className="text-gray-500 mt-1">Manage purchase bills and upload bill images.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-gray-100 p-1 rounded-lg flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('all_list')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'all_list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              All Bills
            </button>
            <button
              onClick={() => setActiveTab('gst_list')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'gst_list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              GST Bills
            </button>
            <button
              onClick={() => setActiveTab('nongst_list')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'nongst_list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Zero-Rated GST Bills
            </button>
            {userRole !== 'ACCOUNTS' && (
              <button
                onClick={() => { setActiveTab('form'); setSelectedMonth(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'form' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Add New Bill
              </button>
            )}
            <button
              onClick={() => { setActiveTab('images'); setSelectedMonth(null); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'images' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Bill Images
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center">
          <X className="h-5 w-5 mr-2 cursor-pointer" onClick={() => setError('')} />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* FORM TAB */}
      {activeTab === 'form' && userRole !== 'ACCOUNTS' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select
                  required
                  value={supplierId}
                  onChange={handleSupplierChange}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number *</label>
                <input
                  type="text"
                  required
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
                  placeholder="INV-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date *</label>
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Type *</label>
                <div className="flex space-x-4 mt-2">
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      className="form-radio text-indigo-600 focus:ring-indigo-500" 
                      name="isGst" 
                      value="1" 
                      checked={isGst === 1} 
                      onChange={() => setIsGst(1)} 
                    />
                    <span className="ml-2 text-sm text-gray-700 font-medium">GST</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      className="form-radio text-indigo-600 focus:ring-indigo-500" 
                      name="isGst" 
                      value="0" 
                      checked={isGst === 0} 
                      onChange={() => {
                        setIsGst(0);
                        setItems(items.map(item => ({
                          ...item,
                          gst_percentage: 0,
                          total: calculateTotal(item.quantity, item.price, 0)
                        })));
                      }} 
                    />
                    <span className="ml-2 text-sm text-gray-700 font-medium">Zero-Rated GST</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Items</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center bg-indigo-50 px-3 py-1.5 rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Row
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-600 uppercase pb-3 w-1/3">Item Name</th>
                      <th className="text-center text-xs font-semibold text-gray-600 uppercase pb-3 w-1/6">Qty</th>
                      <th className="text-right text-xs font-semibold text-gray-600 uppercase pb-3 w-1/6">Price (₹)</th>
                      <th className="text-center text-xs font-semibold text-gray-600 uppercase pb-3 w-1/6">GST (%)</th>
                      <th className="text-right text-xs font-semibold text-gray-600 uppercase pb-3 w-1/6">Total</th>
                      <th className="pb-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="py-2.5 pr-2">
                          <input
                            type="text"
                            list={`supplier-items-${supplierId}`}
                            value={item.item_name}
                            onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
                            placeholder="Item name"
                            required
                          />
                          {selectedSupplier && (
                            <datalist id={`supplier-items-${supplierId}`}>
                              {selectedSupplier.items.map((si, idx) => (
                                <option key={idx} value={si.item_name} />
                              ))}
                            </datalist>
                          )}
                        </td>
                        <td className="py-2.5 pr-2">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                            placeholder="1"
                            required
                          />
                        </td>
                        <td className="py-2.5 pr-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.price}
                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right"
                            placeholder="0.00"
                            required
                          />
                        </td>
                        <td className="py-2.5 pr-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={isGst === 0 ? 0 : item.gst_percentage}
                            onChange={(e) => handleItemChange(index, 'gst_percentage', e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center ${
                              isGst === 0 
                                ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed' 
                                : 'bg-white border border-gray-300 text-gray-900'
                            }`}
                            placeholder="0"
                            disabled={isGst === 0}
                          />
                        </td>
                        <td className="py-2.5 pr-2">
                          <div className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-900 shadow-sm text-right">
                            ₹{(item.total || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                            disabled={items.length === 1}
                            title="Remove Row"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-right py-4 pr-4 font-bold text-gray-700">Grand Total:</td>
                      <td className="py-4">
                        <div className="text-lg font-bold text-indigo-700">₹{grandTotal.toFixed(2)}</div>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Original Bill Image (PDF or Image)
              </label>
              <div className="mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-indigo-500 transition-colors bg-gray-50 min-h-[160px]">
                {convertingPdf ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-3" />
                    <p className="text-sm font-bold text-indigo-700">
                      {convertProgress && convertProgress.total > 1
                        ? `Converting PDF: Page ${convertProgress.current} of ${convertProgress.total}...`
                        : 'Converting PDF to Image...'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {convertProgress && convertProgress.total > 1
                        ? `Rendering all ${convertProgress.total} pages into one clear bill image`
                        : 'Please wait a moment while we render your bill'}
                    </p>
                  </div>
                ) : imagePreview ? (
                  <div className="flex flex-col items-center py-2 w-full max-w-md">
                    <div className="relative group mb-3 w-full flex flex-col items-center">
                      <div className="max-h-72 w-full overflow-y-auto rounded-lg border border-gray-300 bg-gray-100 shadow-inner p-2 flex justify-center">
                        <img 
                          src={imagePreview} 
                          alt="Bill Preview" 
                          className="w-auto max-w-full h-auto object-contain rounded shadow bg-white cursor-zoom-in hover:opacity-95" 
                          onClick={() => {
                            setZoomLevel(1);
                            setLightboxImage({
                              src: imagePreview,
                              title: billImage?.name || 'Bill Preview'
                            });
                          }}
                          title="Click to view full preview in this page"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBillImage(null);
                          setImagePreview(null);
                          setPdfPageCount(null);
                          setConvertProgress(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-md hover:bg-red-700 transition"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <div className="flex items-center text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                        <span>
                          {pdfPageCount && pdfPageCount > 1
                            ? `✓ All ${pdfPageCount} Pages Converted: ${billImage?.name}`
                            : `✓ Image Ready: ${billImage?.name}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setZoomLevel(1);
                          setLightboxImage({
                            src: imagePreview,
                            title: billImage?.name || 'Bill Preview'
                          });
                        }}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 transition-colors"
                      >
                        🔍 Preview Full Image
                      </button>
                    </div>
                    {pdfPageCount && pdfPageCount > 1 && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        Tip: Scroll inside preview or click "Preview Full Image" to check all {pdfPageCount} pages.
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                      <label
                        htmlFor="file-upload"
                        className="font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
                      >
                        Change file
                      </label>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => openScanner('new')}
                        className="font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer underline flex items-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Scan new bill
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-center py-4">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-lg font-semibold text-indigo-600 hover:text-indigo-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-4 py-2.5 border border-indigo-200 shadow-sm hover:shadow inline-flex items-center gap-2 text-sm transition"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Select File to Upload</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => openScanner('new')}
                        className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow inline-flex items-center gap-2 text-sm transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Scan to Upload</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                    <p className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">
                      📄 PDFs will be automatically converted to crisp images
                    </p>
                  </div>
                )}
                <input 
                  id="file-upload" 
                  name="file-upload" 
                  type="file" 
                  className="sr-only" 
                  accept="image/*,.pdf"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg flex items-center ${submitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all'}`}
              >
                <Save className="w-5 h-5 mr-2" />
                {submitting ? 'Saving...' : 'Save Purchase Bill'}
              </button>
            </div>
          </form>
        </div>
      )}



      {/* LIST TABS */}
      {(activeTab === 'all_list' || activeTab === 'gst_list' || activeTab === 'nongst_list') && (
        <div className="space-y-6">
          {!selectedMonth ? (
            Object.keys(groupedBills).length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                No purchase bills added yet.
              </div>
            ) : (
              Object.keys(groupedBills).sort().reverse().map(fy => (
                <div key={fy} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div 
                    className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedFY(expandedFY === fy ? null : fy)}
                  >
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                      Financial Year {fy}
                    </h2>
                  </div>
                  
                  {expandedFY === fy && (
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Object.keys(groupedBills[fy]).map(month => {
                          const monthBills = activeTab === 'all_list'
                            ? groupedBills[fy][month]
                            : groupedBills[fy][month].filter(b => b.is_gst === (activeTab === 'gst_list' ? 1 : 0));
                          if (monthBills.length === 0) return null;
                          
                          const totalAmount = monthBills.reduce((sum, b) => sum + parseFloat(b.total_amount.toString()), 0);
                          const gstCount = monthBills.filter(b => b.is_gst === 1).length;
                          const nonGstCount = monthBills.filter(b => b.is_gst === 0).length;

                          return (
                            <div 
                              key={month} 
                              className="border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group bg-gray-50 border-gray-100 flex flex-col justify-between"
                              onClick={() => setSelectedMonth({fy, month})}
                            >
                              <div>
                                <div className="flex justify-between items-start mb-3">
                                  <h3 className="text-xl font-bold text-gray-900">{month}</h3>
                                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {monthBills.length} bills
                                  </span>
                                </div>
                                
                                {activeTab === 'all_list' && (
                                  <div className="flex gap-2 mb-3 text-xs">
                                    <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                                      {gstCount} GST
                                    </span>
                                    <span className="bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded">
                                      {nonGstCount} Zero-Rated GST
                                    </span>
                                  </div>
                                )}

                                <div className="space-y-1 text-sm">
                                  <p className="text-gray-500">Total Purchase:</p>
                                  <p className="font-bold text-gray-900 text-lg">₹{totalAmount.toFixed(2)}</p>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                                <span className="text-sm text-indigo-600 font-medium group-hover:underline">
                                  View bills →
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportMonthBills(fy, month);
                                  }}
                                  className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md border border-emerald-200 transition-colors"
                                  title={`Export ${month} in Excel`}
                                >
                                  <Download className="w-3.5 h-3.5 mr-1" /> Excel
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            <>
              <div className="mb-4">
                <button 
                  onClick={() => setSelectedMonth(null)}
                  className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  ← Back to Financial Years
                </button>
              </div>

              {/* Summary Cards */}
              <div className={`grid grid-cols-1 ${activeTab === 'all_list' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                {activeTab === 'all_list' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between border-l-4 border-l-green-500">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Purchase (All Bills)</p>
                      <p className="text-2xl font-bold text-gray-900">₹{(thisMonthGstTotal + thisMonthNonGstTotal).toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">{filteredBills.length} Total Bills</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-full">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between border-l-4 border-l-indigo-500">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Selected Month GST</p>
                    <p className="text-2xl font-bold text-gray-900">₹{thisMonthGstTotal.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{filteredBills.filter(b => b.is_gst === 1).length} GST Bills</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-full">
                    <FileText className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between border-l-4 border-l-amber-500">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Selected Month Zero-Rated GST</p>
                    <p className="text-2xl font-bold text-gray-900">₹{thisMonthNonGstTotal.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">{filteredBills.filter(b => b.is_gst === 0).length} Zero-Rated GST Bills</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-full">
                    <FileText className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
              </div>

              {/* List Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                      {activeTab === 'all_list' ? 'All Bills (GST & Zero-Rated GST)' : activeTab === 'gst_list' ? 'GST Bills' : 'Zero-Rated GST Bills'} - {selectedMonth.month} {selectedMonth.fy}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Showing {activeTab === 'all_list' ? filteredBills.length : filteredBills.filter(b => b.is_gst === (activeTab === 'gst_list' ? 1 : 0)).length} bills
                    </p>
                  </div>
                  <button 
                    onClick={() => handleExportMonthBills(selectedMonth.fy, selectedMonth.month)}
                    className="inline-flex items-center text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all"
                  >
                    <Download className="w-4 h-4 mr-2" /> Export This Month in Excel
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Image</th>
                    </tr>
                  </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBills.filter(b => activeTab === 'all_list' ? true : b.is_gst === (activeTab === 'gst_list' ? 1 : 0)).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            No purchase bills found in this category.
                          </td>
                        </tr>
                      ) : (
                        filteredBills.filter(b => activeTab === 'all_list' ? true : b.is_gst === (activeTab === 'gst_list' ? 1 : 0)).map((bill) => (
                          <tr key={bill.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(bill.bill_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{bill.supplier_name}</div>
                            {bill.supplier_gst && (
                              <div className="text-xs text-gray-500">GST: {bill.supplier_gst}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                            {bill.bill_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              bill.is_gst === 1 
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {bill.is_gst === 1 ? 'GST' : 'Zero-Rated GST'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            ₹{parseFloat(bill.total_amount.toString()).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                            {bill.image_path ? (
                              <button 
                                onClick={() => handleViewBill(bill.id)}
                                className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full cursor-pointer transition-colors"
                              >
                                <ImageIcon className="w-4 h-4 mr-1" /> View
                              </button>
                            ) : (
                              <span className="text-gray-400 italic">No image</span>
                            )}
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* IMAGES GALLERY TAB */}
      {activeTab === 'images' && (
        <div className="space-y-8">
          {Object.keys(groupedBills).filter(fy => Object.values(groupedBills[fy]).flat().some(b => b.image_path)).length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              No bill images uploaded yet.
            </div>
          ) : (
            Object.keys(groupedBills).filter(fy => Object.values(groupedBills[fy]).flat().some(b => b.image_path)).sort().reverse().map(fy => (
              <div key={fy} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div 
                  className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                  onClick={() => setExpandedFY(expandedFY === fy ? null : fy)}
                >
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                    Financial Year {fy}
                  </h2>
                </div>
                
                {expandedFY === fy && (
                  <div className="p-6">
                    {selectedMonth && selectedMonth.fy === fy ? (
                      <div>
                        <div className="flex justify-between items-center mb-6">
                          <button 
                            onClick={() => setSelectedMonth(null)}
                            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            ← Back to Months
                          </button>
                          
                          <button 
                            onClick={handlePrintAllBills}
                            className="inline-flex items-center text-sm font-medium text-white hover:bg-indigo-700 bg-indigo-600 px-4 py-2 rounded-lg shadow-sm transition-colors"
                          >
                            <Printer className="w-4 h-4 mr-2" />
                            Print All Bills
                          </button>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">
                          Purchase Bills - {selectedMonth.month}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {groupedBills[selectedMonth.fy][selectedMonth.month].filter(b => b.image_path).map(bill => (
                            <div key={bill.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
                              <div 
                                className="h-48 bg-gray-200 relative cursor-pointer"
                                onClick={() => {
                                  setZoomLevel(1);
                                  setLightboxImage({
                                    src: `${getBaseUrl()}/${bill.image_path}`,
                                    title: `Purchase Bill: ${bill.bill_number} (${bill.supplier_name})`
                                  });
                                }}
                              >
                                <PdfBillImage 
                                  src={`${getBaseUrl()}/${bill.image_path}`} 
                                  alt={`Bill ${bill.bill_number}`} 
                                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                />
                              </div>
                              <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="text-xs text-gray-500 font-medium">{new Date(bill.bill_date).toLocaleDateString()}</p>
                                    <h4 className="font-bold text-gray-900">{bill.supplier_name}</h4>
                                  </div>
                                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                                    ₹{parseFloat(bill.total_amount.toString()).toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">Bill No: <span className="font-medium text-gray-900">{bill.bill_number}</span></p>
                                
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setZoomLevel(1);
                                    setLightboxImage({
                                      src: `${getBaseUrl()}/${bill.image_path}`,
                                      title: `Purchase Bill: ${bill.bill_number} (${bill.supplier_name})`
                                    });
                                  }}
                                  className="block w-full text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-sm py-2 rounded-lg border border-indigo-100 transition-colors cursor-pointer"
                                >
                                  View Full Image
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Object.keys(groupedBills[fy]).filter(m => groupedBills[fy][m].some(b => b.image_path)).map(month => {
                          const monthBills = groupedBills[fy][month].filter(b => b.image_path);
                          const totalAmount = monthBills.reduce((sum, b) => sum + parseFloat(b.total_amount.toString()), 0);
                          
                          return (
                            <div 
                              key={month} 
                              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
                              onClick={() => setSelectedMonth({fy, month})}
                            >
                              <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-bl-lg">
                                {monthBills.length} bills
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 mb-4">{month}</h3>
                              <div className="space-y-1 text-sm">
                                <p className="text-gray-500">Total Purchase:</p>
                                <p className="font-bold text-gray-900 text-lg">₹{totalAmount.toFixed(2)}</p>
                              </div>
                              <div className="mt-4 text-sm text-indigo-600 font-medium group-hover:underline">
                                Click to view all bills
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}


      {/* VIEW BILL DETAILS MODAL */}
      {(selectedBillForView || viewLoading) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-indigo-600" />
                {viewLoading ? 'Loading Bill Details...' : `Purchase Bill: ${selectedBillForView?.bill_number}`}
              </h2>
              <div className="flex items-center space-x-2">
                {!viewLoading && selectedBillForView && userRole !== 'ACCOUNTS' && (
                  <button 
                    type="button"
                    onClick={() => handleDeleteBill(selectedBillForView.id)}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors mr-2 cursor-pointer"
                    title="Delete Purchase Bill"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete Bill
                  </button>
                )}
                <button 
                  onClick={() => setSelectedBillForView(null)}
                  className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 border border-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {!viewLoading && selectedBillForView && (
              <div className="p-0 overflow-y-auto flex-grow bg-gray-100 flex flex-col md:flex-row">
                {/* Left side: Bill Details */}
                <div className="w-full md:w-1/2 p-6 bg-white border-r border-gray-200 overflow-y-auto">
                  <div className="mb-6 flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Supplier</p>
                      <h3 className="text-lg font-bold text-gray-900">{selectedBillForView.supplier_name}</h3>
                      {selectedBillForView.supplier_address && (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap mt-1">
                          {selectedBillForView.supplier_address}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 font-medium">Date</p>
                      <p className="font-bold text-gray-900">{new Date(selectedBillForView.bill_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <h4 className="font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2">Items Purchased</h4>
                  
                  {selectedBillForView.items && selectedBillForView.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">GST %</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedBillForView.items.map((item, idx) => (
                            <tr key={idx} className="text-sm text-gray-700">
                              <td className="px-2 py-2">{item.item_name}</td>
                              <td className="px-2 py-2 text-right">{item.quantity}</td>
                              <td className="px-2 py-2 text-right">₹{parseFloat(item.price.toString()).toFixed(2)}</td>
                              <td className="px-2 py-2 text-right">{item.gst_percentage}%</td>
                              <td className="px-2 py-2 text-right font-medium text-gray-900">₹{parseFloat(item.total.toString()).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={4} className="px-2 py-3 text-right font-bold text-gray-700">Grand Total:</td>
                            <td className="px-2 py-3 text-right font-bold text-indigo-700 text-lg">
                              ₹{parseFloat(selectedBillForView.total_amount.toString()).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No items found for this bill.</p>
                  )}
                </div>
                
                {/* Right side: Image */}
                <div className="w-full md:w-1/2 bg-gray-100 p-6 flex flex-col items-center justify-center min-h-[400px]">
                  {updatingImage ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-3" />
                      <p className="text-sm font-bold text-indigo-700">{updateMessage || 'Updating bill image...'}</p>
                      <p className="text-xs text-gray-500 mt-1">Please wait while we render all pages</p>
                    </div>
                  ) : selectedBillForView.image_path ? (
                    <div className="w-full h-full flex flex-col">
                      <div 
                        className="flex-grow flex items-center justify-center overflow-y-auto max-h-[60vh] rounded-lg border border-gray-300 bg-gray-200 p-2 cursor-pointer group relative"
                        onClick={() => {
                          setZoomLevel(1);
                          setLightboxImage({
                            src: `${getBaseUrl()}/${selectedBillForView.image_path}`,
                            title: `Purchase Bill: ${selectedBillForView.bill_number} (${selectedBillForView.supplier_name})`
                          });
                        }}
                        title="Click to view full image in this page"
                      >
                        <PdfBillImage 
                          src={`${getBaseUrl()}/${selectedBillForView.image_path}`} 
                          alt="Original Bill" 
                          className="max-w-full h-auto object-contain group-hover:opacity-90 rounded shadow transition-opacity"
                        />
                      </div>

                      {updateMessage && (
                        <div className="mt-2 text-center text-xs font-semibold text-green-700 bg-green-50 py-1.5 px-3 rounded-lg border border-green-200">
                          {updateMessage}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                        <button 
                          type="button"
                          onClick={() => {
                            setZoomLevel(1);
                            setLightboxImage({
                              src: `${getBaseUrl()}/${selectedBillForView.image_path}`,
                              title: `Purchase Bill: ${selectedBillForView.bill_number} (${selectedBillForView.supplier_name})`
                            });
                          }}
                          className="w-full text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2.5 px-3 rounded-xl border border-indigo-200 shadow-sm transition-colors flex items-center justify-center cursor-pointer text-xs md:text-sm"
                        >
                          <ImageIcon className="w-4 h-4 mr-1.5" />
                          View Full Image
                        </button>

                        <button 
                          type="button"
                          onClick={() => openScanner('update')}
                          className="w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-3 rounded-xl shadow-sm transition-colors flex items-center justify-center cursor-pointer text-xs md:text-sm"
                          title="Open scanner / camera to update this bill"
                        >
                          <Camera className="w-4 h-4 mr-1.5" />
                          Scan to Update
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => updateFileInputRef.current?.click()}
                          className="w-full text-center bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-3 rounded-xl border border-gray-300 shadow-sm transition-colors flex items-center justify-center cursor-pointer text-xs md:text-sm"
                          title="Upload multi-page PDF or image to update this bill"
                        >
                          <Upload className="w-4 h-4 mr-1.5" />
                          Upload File
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                      <p className="mb-4">No image was uploaded for this bill.</p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => openScanner('update')}
                          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-colors cursor-pointer"
                        >
                          <Camera className="w-4 h-4 mr-1.5" />
                          Scan Bill Image
                        </button>
                        <button
                          type="button"
                          onClick={() => updateFileInputRef.current?.click()}
                          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                        >
                          <Upload className="w-4 h-4 mr-1.5" />
                          Upload File (PDF or Image)
                        </button>
                      </div>
                    </div>
                  )}

                  <input 
                    type="file"
                    ref={updateFileInputRef}
                    accept="image/*,.pdf"
                    className="sr-only"
                    onChange={handleUpdateBillImage}
                  />
                </div>
              </div>
            )}
            
            {viewLoading && (
              <div className="p-12 text-center flex-grow bg-gray-100 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                <span className="ml-3 text-lg text-gray-600 font-medium">Loading details...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IN-PAGE FULL IMAGE LIGHTBOX MODAL */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex flex-col justify-between backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          {/* Top Bar */}
          <div 
            className="flex justify-between items-center px-4 md:px-6 py-3 bg-black/70 border-b border-gray-800 text-white z-10 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-2 md:space-x-3 overflow-hidden mr-2">
              <ImageIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <h3 className="font-semibold text-sm md:text-base text-gray-100 truncate">
                {lightboxImage.title}
              </h3>
            </div>
            
            {/* Zoom controls & close */}
            <div className="flex items-center space-x-1.5 md:space-x-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.5, parseFloat((prev - 0.25).toFixed(2))))}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5 mr-1" />
                Zoom Out
              </button>
              <span className="text-xs text-gray-300 font-mono min-w-[45px] text-center font-bold bg-gray-900/80 px-2 py-1 rounded">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(3, parseFloat((prev + 0.25).toFixed(2))))}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5 mr-1" />
                Zoom In
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-medium transition"
                title="Reset Zoom"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="ml-2 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white transition shadow-lg cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main scrollable body */}
          <div 
            className="flex-grow overflow-auto p-4 md:p-6 flex justify-center items-start cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          >
            <div 
              className="transition-all duration-150 flex justify-center origin-top"
              style={{ width: `${Math.round(zoomLevel * 100)}%`, maxWidth: zoomLevel <= 1 ? '900px' : 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              <PdfBillImage 
                src={lightboxImage.src} 
                alt={lightboxImage.title} 
                className="w-full h-auto object-contain rounded-lg shadow-2xl bg-white border border-gray-700 cursor-default" 
              />
            </div>
          </div>

          {/* Bottom hint bar */}
          <div 
            className="py-2 bg-black/70 text-center text-xs text-gray-400 border-t border-gray-800 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Tip: Use Zoom buttons or mouse scroll to inspect all pages • Press ESC or click (X) to close</span>
          </div>
        </div>
      )}

      {/* SCANNER MODAL */}
      <BillScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCaptureOk={handleScannerCaptureOk}
        title={scannerTarget === 'new' ? 'Scan Purchase Bill' : `Scan Bill: ${selectedBillForView?.bill_number || ''}`}
      />

    </div>
  );
};

export default PurchaseBills;
