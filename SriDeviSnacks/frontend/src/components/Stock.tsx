import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, IndianRupee, Warehouse, FileText, Printer, AlertTriangle, Sun } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { stocksAPI, settingsAPI } from '../services/api';
import Logo from '../assets/Logo.png';
import html2canvas from 'html2canvas';

let logoBase64String = '';

interface Product {
  id: number;
  product_name: string;
  unit: string;
  status: 'active' | 'inactive';
  created_date: string;
  gst: number;
  quantity: number;
  rate: number;
  hsn_code: string;
  price: number;
  stockId: number | null;
}

const Stock: React.FC = () => {
  const { 
    products, 
    setProducts, 
    refreshData, 
    userRole, 
    vehicleNumber, 
    routeDay, 
    todayRoute, 
    updateAppSetting,
    updateAppSettingsBulk,
    whatsappEnabled,
    whatsappPhone,
    whatsappProvider,
    whatsappToken,
    whatsappInstanceId,
    lowStockThreshold,
    smsEnabled,
    smsPhone,
    smsApiKey
  } = useAppContext();
  
  const [tempVehicleNumber, setTempVehicleNumber] = useState(vehicleNumber);
  const [tempRouteDay, setTempRouteDay] = useState(routeDay);
  const [tempTodayRoute, setTempTodayRoute] = useState(todayRoute);
  const [tempWhatsappEnabled, setTempWhatsappEnabled] = useState(whatsappEnabled);
  const [tempWhatsappPhone, setTempWhatsappPhone] = useState(whatsappPhone);
  const [tempWhatsappProvider, setTempWhatsappProvider] = useState(whatsappProvider);
  const [tempWhatsappToken, setTempWhatsappToken] = useState(whatsappToken);
  const [tempWhatsappInstanceId, setTempWhatsappInstanceId] = useState(whatsappInstanceId);
  const [tempLowStockThreshold, setTempLowStockThreshold] = useState(lowStockThreshold);
  const [tempSmsEnabled, setTempSmsEnabled] = useState(smsEnabled);
  const [tempSmsPhone, setTempSmsPhone] = useState(smsPhone);
  const [tempSmsApiKey, setTempSmsApiKey] = useState(smsApiKey);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setTempVehicleNumber(vehicleNumber);
    setTempRouteDay(routeDay);
    setTempTodayRoute(todayRoute);
    setTempWhatsappEnabled(whatsappEnabled);
    setTempWhatsappPhone(whatsappPhone);
    setTempWhatsappProvider(whatsappProvider);
    setTempWhatsappToken(whatsappToken);
    setTempWhatsappInstanceId(whatsappInstanceId);
    setTempLowStockThreshold(lowStockThreshold);
    setTempSmsEnabled(smsEnabled);
    setTempSmsPhone(smsPhone);
    setTempSmsApiKey(smsApiKey);
  }, [vehicleNumber, routeDay, todayRoute, whatsappEnabled, whatsappPhone, whatsappProvider, whatsappToken, whatsappInstanceId, lowStockThreshold, smsEnabled, smsPhone, smsApiKey]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
      await updateAppSettingsBulk([
        { key: 'vehicle_number', value: tempVehicleNumber },
        { key: 'route_day', value: tempRouteDay },
        { key: 'today_route', value: tempTodayRoute },
        { key: 'route_save_date', value: todayStr },
        { key: 'whatsapp_enabled', value: tempWhatsappEnabled },
        { key: 'whatsapp_phone', value: tempWhatsappPhone },
        { key: 'whatsapp_provider', value: tempWhatsappProvider },
        { key: 'whatsapp_api_token', value: tempWhatsappToken },
        { key: 'whatsapp_instance_id', value: tempWhatsappInstanceId },
        { key: 'low_stock_threshold', value: String(tempLowStockThreshold) },
        { key: 'sms_enabled', value: tempSmsEnabled },
        { key: 'sms_phone', value: tempSmsPhone },
        { key: 'sms_api_key', value: tempSmsApiKey }
      ]);
      alert('Settings updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const ROUTES_BY_DAY: Record<string, string> = {
    Monday: 'Vallioor-Kavalkinaru-Chettikulam-Kudankulam-Idinthakarai-Navaladi-Rathapuram-Kallikulam',
    Tuesday: 'Vallioor-Kavalkinaru-Anjigramam-Nagercoil-Poothapandi-Aralvaimozhli',
    Wednesday: 'Vallioor-Kavalkinaru-Anjigramam-Kannankulam-Kanyakumari-Kottaram-Kavalkinaru',
    Thursday: 'Vallioor-Kavalkinaru-Palavoor-Vadakankulam-Rathapuram-Kallikulam-Vallioor',
    Friday: 'Vallioor-Tirunelveli-Kovilpatti-Sathur-Viruthunagar-Tirunelveli-Vallioor',
    Saturday: 'Vallioor-Eavadi-Kalakad-Kankanakulam-Kalakad-Nanguneri-Vallioor',
    Sunday: 'Custom Route',
  };



  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuantityId, setEditingQuantityId] = useState<number | null>(null);
  const [quantityEditValue, setQuantityEditValue] = useState<string>('');
  const [showEStockBill, setShowEStockBill] = useState(false);

  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showMorningStockModal, setShowMorningStockModal] = useState(false);

  const [productForm, setProductForm] = useState({
    product_name: '',
    unit: 'kg',
    status: 'active' as 'active' | 'inactive',
    gst: '5',
    quantity: '',
    rate: '',
    hsn_code: '',
    price: '',
    stockId: null as number | null
  });

  // Refresh data when component mounts
  useEffect(() => {
    refreshData();
  }, []);

  // Fix: Use product rate from products context for display and editing
  const getProductRate = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.rate : 0;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.unit.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showLowStockOnly) {
      return matchesSearch && product.quantity <= lowStockThreshold;
    }
    return matchesSearch;
  });

  // Display all products in a scrollable list
  const paginatedProducts = filteredProducts;

  const totalStockValue = products.reduce((total, product) => {
    return total + (product.quantity * getProductRate(product.id));
  }, 0);

  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const currentRoute = ROUTES_BY_DAY[currentDay] || 'Custom Route';

  const stockItemsForBill = products
    .filter((product) => (product.quantity || 0) > 0)
    .map((product) => ({
      id: product.id,
      product_name: product.product_name,
      unit: product.unit,
      quantity: product.quantity || 0,
      rate: getProductRate(product.id) || 0,
      value: (product.quantity || 0) * (getProductRate(product.id) || 0),
    }));

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const handlePrintEStockBill = () => {
    const win = window.open('', '', 'height=700,width=900');
    if (!win) return;

    win.document.write(`
      <html>
      <head>
        <title>E-Stock Bill</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; color: #111; }
          .header-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
          .company-name { font-size: 22px; font-weight: bold; text-align: center; margin: 6px 0; }
          .company-address, .company-city { text-align: center; font-size: 13px; margin-bottom: 3px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; font-size: 14px; margin: 10px 0 12px; }
          .dashed-line { border-bottom: 2px dashed #ccc; margin: 10px 0; }
          .items { width: 100%; border-collapse: collapse; margin: 8px 0 14px; }
          .items th, .items td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; font-size: 13px; }
          .items th { background: #f8f9fa; font-weight: bold; }
          .totals { margin-left: auto; width: 280px; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
        </style>
      </head>
      <body>
        <div style="text-align:center; margin-bottom:5px;">
          <div style="font-size:10px; font-weight:bold;">"ஸ்ரீ தேவி சந்தன மாரியம்மன் துணை"</div>
        </div>
        <div class="header-row">
          <div>GST No: 33BAPPS2831B2ZU</div>
          <div>Mobile: 8807810021</div>
        </div>
        <div style="text-align:center; margin-bottom:5px;">
          <img src="${Logo}" alt="Sri Devi Snacks Logo" style="width: 100px; height: auto; margin: 0 auto;" />
        </div>
        <div class="company-name">Sri Devi Snacks</div>
        <div class="company-address">128 C Santhanamari Amman Kovil Street</div>
        <div class="company-city">Vallioor, Tirunelveli-627117</div>
        <div class="dashed-line"></div>
        <div style="font-weight:bold; font-size:16px; text-align:center;">E - Stock Bill</div>
        <div class="meta">
          <div><strong>Date:</strong> ${escapeHtml(new Date().toLocaleDateString())}</div>
          <div><strong>Day:</strong> ${escapeHtml(routeDay)}</div>
          <div><strong>Route:</strong> ${escapeHtml(todayRoute)}</div>
          <div><strong>Vehicle No:</strong> ${escapeHtml(vehicleNumber)}</div>
        </div>
        <div class="dashed-line"></div>

        <table class="items">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:right;">Unit</th>
              <th style="text-align:right;">Qty</th>
              <th style="text-align:right;">Rate</th>
              <th style="text-align:right;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${stockItemsForBill.map((item) => `
              <tr>
                <td>${escapeHtml(item.product_name)}</td>
                <td style="text-align:right;">${escapeHtml(item.unit)}</td>
                <td style="text-align:right;">${item.quantity}</td>
                <td style="text-align:right;">₹${Number(item.rate).toFixed(2)}</td>
                <td style="text-align:right;">₹${Number(item.value).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row"><div>Total Items:</div><div>${stockItemsForBill.length}</div></div>
          <div class="dashed-line"></div>
          <div class="total-row" style="font-weight:bold;"><div>Total Stock Value:</div><div>₹${Number(totalStockValue).toFixed(2)}</div></div>
        </div>
      </body>
      </html>
    `);

    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 100);
  };

  // Fix: Ensure rate and value are displayed correctly even if rate is 0 or undefined
  const getProductValue = (product: Product) => {
    const rate = getProductRate(product.id) || 0;
    const quantity = product.quantity || 0;
    return rate * quantity;
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      setProducts(products.map(product =>
        product.id === editingProduct.id
          ? { ...product, ...productForm, gst: parseInt(productForm.gst) || 0, quantity: parseInt(productForm.quantity) || 0, rate: parseFloat(productForm.rate) || 0, price: parseFloat(productForm.price) || 0 }
          : product
      ));
    } else {
      const newProduct: Product = {
        id: Math.max(...products.map(p => p.id)) + 1,
        ...productForm,
        gst: parseInt(productForm.gst) || 0,
        quantity: parseInt(productForm.quantity) || 0,
        rate: parseFloat(productForm.rate) || 0,
        price: parseFloat(productForm.price) || 0,
        created_date: new Date().toISOString().split('T')[0],
        stockId: productForm.stockId
      };
      setProducts([...products, newProduct]);
    }

    resetProductForm();
  };

  const resetProductForm = () => {
    setProductForm({
      product_name: '',
      unit: 'kg',
      status: 'active',
      gst: '',
      quantity: '',
      rate: '',
      hsn_code: '',
      price: '',
      stockId: null
    });
    setEditingProduct(null);
    setShowModal(false);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      product_name: product.product_name,
      unit: product.unit,
      status: product.status,
      gst: product.gst.toString(),
      quantity: product.quantity.toString(),
      rate: product.rate.toString(),
      hsn_code: product.hsn_code,
      price: product.price.toString(),
      stockId: product.stockId
    });
    setShowModal(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Are you sure you want to delete this product from stock?')) {
      // stocksAPI does not have deleteStock, so just update stock quantity to 0 or remove product from products list
      // Assuming backend does not support stock deletion, so we remove product from products list locally
      setProducts(products.filter(product => product.id !== id));
    }
  };

  const handleQuantityEdit = (product: Product) => {
    setEditingQuantityId(product.id);
    setQuantityEditValue(product.quantity.toString());
  };

  const handleQuantitySave = async (productId: number) => {
    const quantity = parseInt(quantityEditValue);
    if (!isNaN(quantity) && quantity >= 0) {
      const product = products.find(p => p.id === productId);
      if (!product) {
        alert('Product not found');
        setEditingQuantityId(null);
        return;
      }
      try {
        if (!product.stockId) {
          // Create stock entry if missing
          const createResponse = await stocksAPI.createStock({
            productId: product.id,
            quantity,
            rate: parseFloat(product.rate.toString()) || 0,
          });
          if (createResponse.success) {
            setProducts(products.map(p =>
              p.id === productId
                ? { ...p, quantity: quantity, stockId: createResponse.data.id, rate: createResponse.data.rate || p.rate }
                : p
            ));
          } else {
            alert(createResponse.message || 'Failed to create stock');
          }
        } else {
          const response = await stocksAPI.updateStock(product.stockId, { quantity });
          if (response.success) {
            setProducts(products.map(product =>
              product.id === productId
                ? { ...product, quantity: quantity, rate: response.data.rate || product.rate }
                : product
            ));
          } else {
            alert(response.message || 'Failed to update stock quantity');
          }
        }
      } catch (err: any) {
        alert(err.message || 'Error updating stock quantity');
      }
    }
    setEditingQuantityId(null);
  };

  const handleQuantityCancel = () => {
    setEditingQuantityId(null);
  };

  const handleQuantityAdjust = async (productId: number, amount: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      alert('Product not found');
      return;
    }
    const newQuantity = product.quantity + amount;
    try {
      if (!product.stockId) {
        // Create stock entry if missing
        const createResponse = await stocksAPI.createStock({
          productId: product.id,
          quantity: newQuantity,
          rate: product.rate,
        });
        if (createResponse.success) {
          setProducts(products.map(p =>
            p.id === productId
              ? { ...p, quantity: newQuantity, stockId: createResponse.data.id, rate: createResponse.data.rate || p.rate }
              : p
          ));
        } else {
          alert(createResponse.message || 'Failed to create stock');
        }
      } else {
        const response = await stocksAPI.updateStock(product.stockId, { quantity: newQuantity });
        if (response.success) {
          setProducts(products.map(product =>
            product.id === productId
              ? { ...product, quantity: newQuantity, rate: response.data.rate || product.rate }
              : product
          ));
        } else {
          alert(response.message || 'Failed to update stock quantity');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error updating stock quantity');
    }
  };

  const isMobileOrTablet = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent.toLowerCase());
  };

  const [useRawBT, setUseRawBT] = useState<boolean>(() => {
    const saved = localStorage.getItem('useRawBT');
    if (saved !== null) {
      return saved === 'true';
    }
    return isMobileOrTablet();
  });

  useEffect(() => {
    localStorage.setItem('useRawBT', String(useRawBT));
  }, [useRawBT]);

  useEffect(() => {
    if (Logo) {
      fetch(Logo)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            logoBase64String = reader.result as string;
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => console.error('Failed to convert logo to base64:', err));
    }
  }, []);

  const printStandard = (htmlContent: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      
      const optimizedHtml = htmlContent
        .replace(/size:\s*80mm\s*auto/gi, 'size: auto')
        .replace(/width:\s*(72mm|80mm)/gi, 'width: 100%')
        .replace(/width:\s*(72mm|80mm)\s*!important/gi, 'width: 100% !important')
        .replace(/padding:\s*2mm\s*0mm/gi, 'padding: 10px')
        .replace(/padding:\s*4mm\s*2mm/gi, 'padding: 10px')
        .replace(/₹/g, '<span class="rupee">₹</span>');

      doc.write(optimizedHtml);
      doc.close();

      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        } else {
          document.body.removeChild(iframe);
        }
      }, 250);
    } else {
      document.body.removeChild(iframe);
    }
  };

  const handlePrintMorningStock = async () => {
    const totalMorningValue = products.reduce((total, p) => total + ((p.morningStock ?? (p.quantity + (p.soldToday || 0))) * getProductRate(p.id)), 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Morning Stock</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { 
            font-family: 'Courier New', Courier, monospace;
            margin: 0; 
            padding: 4mm 2mm; 
            color: #000;
            width: 72mm;
            background: #fff;
          }
          .header { text-align: center; margin-bottom: 5px; }
          .title { font-size: 16px; font-weight: bold; margin: 5px 0; }
          .logo { width: 60px; height: auto; margin-bottom: 5px; }
          .meta { font-size: 12px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }
          th, td { text-align: left; padding: 2px 0; }
          th { border-bottom: 1px dashed #000; padding-bottom: 4px; }
          .right { text-align: right; }
          .total-row { border-top: 1px dashed #000; font-weight: bold; }
          .total-row td { padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size:10px; font-weight:bold;">"ஸ்ரீ தேவி சந்தன மாரியம்மன் துணை"</div>
          <img src="${logoBase64String || Logo}" class="logo" />
          <div class="title">Morning Stock (Opening)</div>
        </div>
        <div class="meta">
          <div>Date: ${new Date().toLocaleDateString()}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="right">Qty</th>
              <th class="right">Val</th>
            </tr>
          </thead>
          <tbody>
            ${products.filter(p => (p.morningStock ?? (p.quantity + (p.soldToday || 0))) > 0).map(p => {
              const morningQty = p.morningStock ?? (p.quantity + (p.soldToday || 0));
              const val = morningQty * getProductRate(p.id);
              return `
                <tr>
                  <td>${p.product_name} (${p.unit})</td>
                  <td class="right">${morningQty}</td>
                  <td class="right">${val.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="2">Total Value:</td>
              <td class="right">₹${totalMorningValue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div style="text-align:center; font-size:10px; margin-top:10px;">
          Generated by Sri Devi Snacks
        </div>
      </body>
      </html>
    `;

    if (isMobileOrTablet() && useRawBT) {
      try {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '800px'; 
        container.style.backgroundColor = '#ffffff';
        container.innerHTML = htmlContent + '<style>body { width: 100% !important; padding: 20px !important; font-size: 18px !important; } table { font-size: 16px !important; } .logo { width: 100px !important; }</style>';
        document.body.appendChild(container);

        await new Promise(resolve => setTimeout(resolve, 600));

        const canvas = await html2canvas(container, {
          scale: 1.0,
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        document.body.removeChild(container);
        const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        window.location.href = `rawbt:data:image/jpeg;base64,` + base64Image;
      } catch (e) {
        console.error('RawBT image print failed:', e);
        printStandard(htmlContent);
      }
    } else {
      printStandard(htmlContent);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stock Management</h2>
          <p className="text-gray-600 mt-1">Manage product quantities and rates</p>
        </div>
    
      </div>

      {/* Total Stock Value */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Warehouse className="h-6 w-6 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">Total Stock Value:</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-blue-800">₹{totalStockValue.toLocaleString()}</span>
            <button
              onClick={() => setShowEStockBill(true)}
              className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              <FileText className="h-4 w-4 mr-2" />
              E-Stock Bill
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowMorningStockModal(true)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border transition bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100`}
          >
            <Sun className={`h-4 w-4 mr-2 text-blue-600`} />
            Today Morning Stock
          </button>
          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border transition ${
              showLowStockOnly 
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className={`h-4 w-4 mr-2 ${showLowStockOnly ? 'text-red-600' : 'text-gray-500'}`} />
            Low Stock ({products.filter(p => p.quantity <= lowStockThreshold).length})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[650px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate (₹)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value (₹)
                </th>
              
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedProducts.map((product) => {
                const productValue = product.quantity * product.rate;
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-green-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {product.unit}
                      </span>
                    </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {editingQuantityId === product.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            value={quantityEditValue}
                            onChange={(e) => setQuantityEditValue(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleQuantitySave(product.id)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleQuantityCancel}
                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className={product.quantity <= lowStockThreshold ? "text-red-600 font-bold flex items-center gap-1.5" : ""}>
                            {product.quantity}
                            {product.quantity <= lowStockThreshold && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                                Low
                              </span>
                            )}
                          </span>
                          {userRole !== 'STAFF' && (
                            <>
                              <button
                                onClick={() => handleQuantityAdjust(product.id, 1)}
                                className="px-1 py-0.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                title="Increase quantity"
                              >
                                +
                              </button>
                              <button
                                onClick={() => handleQuantityAdjust(product.id, -1)}
                                className="px-1 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                title="Decrease quantity"
                              >
                                -
                              </button>
                              <button
                                onClick={() => handleQuantityEdit(product)}
                                className="px-1 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                title="Edit quantity"
                              >
                                Edit
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <IndianRupee className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm font-medium text-gray-900">{getProductRate(product.id)}</span>
                  </div>
                </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      ₹{getProductValue(product).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Edit Product Stock' : 'Add Product to Stock'}
              </h3>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.product_name}
                    onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gm">Gram (gm)</option>
                    <option value="ltr">Liter (ltr)</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.quantity}
                    placeholder="0"
                    onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={productForm.rate}
                    placeholder="0"
                    onChange={(e) => setProductForm({ ...productForm, rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={productForm.status}
                    onChange={(e) => setProductForm({ ...productForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={productForm.gst}
                    placeholder="0"
                    onChange={(e) => setProductForm({ ...productForm, gst: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    {editingProduct ? 'Update' : 'Add'} Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEStockBill && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-lg bg-white">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">E - Stock Bill</h3>
                <p className="text-sm text-gray-600">Date: <span className="font-medium">{new Date().toLocaleDateString()}</span></p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintEStockBill}
                  className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </button>
                <button
                  onClick={() => setShowEStockBill(false)}
                  className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-900 mb-3">Vehicle & Route</div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                      {userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' ? (
                        <input
                          type="text"
                          value={tempVehicleNumber}
                          onChange={(e) => setTempVehicleNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                        />
                      ) : (
                        <input value={vehicleNumber} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700" />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                      {userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' ? (
                        <select
                          value={tempRouteDay}
                          onChange={(e) => {
                            const selectedDay = e.target.value;
                            setTempRouteDay(selectedDay);
                            if (ROUTES_BY_DAY[selectedDay]) {
                              setTempTodayRoute(ROUTES_BY_DAY[selectedDay]);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                        >
                          {Object.keys(ROUTES_BY_DAY).map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      ) : (
                        <input value={routeDay} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700" />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Today Route</label>
                      {userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' ? (
                        <textarea
                          value={tempTodayRoute}
                          onChange={(e) => setTempTodayRoute(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                        />
                      ) : (
                        <textarea value={todayRoute} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700" rows={2} />
                      )}
                    </div>
                    
                    {/* 
                    {userRole === 'SUPER_ADMIN' && (
                      <>
                        <div className="text-sm font-semibold text-gray-900 mt-4 mb-3 pt-3 border-t border-gray-100">WhatsApp & Stock Alerts</div>
                        <div className="space-y-3">
                          <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tempWhatsappEnabled === 'true'}
                                onChange={(e) => setTempWhatsappEnabled(e.target.checked ? 'true' : 'false')}
                                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              Enable WhatsApp Alerts
                            </label>
                          </div>
                          {tempWhatsappEnabled === 'true' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone Number</label>
                                <input
                                  type="text"
                                  value={tempWhatsappPhone}
                                  onChange={(e) => setTempWhatsappPhone(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                                <input
                                  type="number"
                                  value={tempLowStockThreshold}
                                  onChange={(e) => setTempLowStockThreshold(Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Provider</label>
                                <select
                                  value={tempWhatsappProvider}
                                  onChange={(e) => setTempWhatsappProvider(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                >
                                  <option value="ultramsg">UltraMsg</option>
                                  <option value="webhook">Custom Webhook / API</option>
                                </select>
                              </div>
                              {tempWhatsappProvider === 'ultramsg' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">UltraMsg Instance ID</label>
                                    <input
                                      type="text"
                                      value={tempWhatsappInstanceId}
                                      onChange={(e) => setTempWhatsappInstanceId(e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">UltraMsg Token</label>
                                    <input
                                      type="password"
                                      value={tempWhatsappToken}
                                      onChange={(e) => setTempWhatsappToken(e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                    />
                                  </div>
                                </>
                              )}
                              {tempWhatsappProvider === 'webhook' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL / API Endpoint</label>
                                  <input
                                    type="password"
                                    value={tempWhatsappToken}
                                    onChange={(e) => setTempWhatsappToken(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="text-sm font-semibold text-gray-900 mt-4 mb-3 pt-3 border-t border-gray-100">Normal SMS Alerts (Fast2SMS)</div>
                        <div className="space-y-3">
                          <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tempSmsEnabled === 'true'}
                                onChange={(e) => setTempSmsEnabled(e.target.checked ? 'true' : 'false')}
                                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              Enable SMS Alerts
                            </label>
                          </div>
                          {tempSmsEnabled === 'true' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SMS Phone Number</label>
                                <input
                                  type="text"
                                  value={tempSmsPhone}
                                  onChange={(e) => setTempSmsPhone(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fast2SMS API Key</label>
                                <input
                                  type="password"
                                  value={tempSmsApiKey}
                                  onChange={(e) => setTempSmsApiKey(e.target.value)}
                                  placeholder="Enter Fast2SMS Authorization Key"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                    */}
                    
                    {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition disabled:bg-gray-400"
                      >
                        {savingSettings ? 'Saving...' : 'Save Settings'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Total Stock Items</div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Items:</span> {stockItemsForBill.length} &nbsp;|&nbsp;{' '}
                      <span className="font-medium">Value:</span> ₹{totalStockValue.toLocaleString()}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stockItemsForBill.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 text-right">{item.unit}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 text-right">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 text-right">₹{Number(item.rate).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-blue-700 text-right">₹{Number(item.value).toFixed(2)}</td>
                          </tr>
                        ))}
                        {stockItemsForBill.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-600">No stock quantity available.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Morning Stock Modal */}
      {showMorningStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Sun className="h-6 w-6 text-blue-600 mr-2" />
                Today Morning Stock (Opening Stock)
              </h3>
              <button
                onClick={() => setShowMorningStockModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Morning Stock</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (₹)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => {
                    const morningStock = product.morningStock ?? (product.quantity + (product.soldToday || 0));
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                          {morningStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ₹{getProductRate(product.id).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 text-right">
                          ₹{(morningStock * getProductRate(product.id)).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-blue-50 flex justify-between items-center">
              <span className="text-lg font-bold text-blue-800">Total Morning Stock Value:</span>
              <span className="text-2xl font-bold text-blue-800">
                ₹{products.reduce((total, p) => total + ((p.morningStock ?? (p.quantity + (p.soldToday || 0))) * getProductRate(p.id)), 0).toLocaleString()}
              </span>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRawBT}
                    onChange={(e) => setUseRawBT(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Use RawBT (Mobile)</span>
                </label>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handlePrintMorningStock}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </button>
                <button
                  onClick={() => setShowMorningStockModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
