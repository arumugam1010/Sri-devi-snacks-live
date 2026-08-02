  import React, { useState } from 'react';
  import { Search, Plus, Trash2, Receipt, RotateCcw, Calculator, ShoppingCart, Eye, CreditCard, Loader, Package } from 'lucide-react';
  import { useAppContext } from '../context/AppContext';
  import { billsAPI, shopsAPI } from '../services/api';
  import GPayQRCode from './GPayQRCode';
  import { Pagination } from './Pagination';
  import html2canvas from 'html2canvas';
  import Logo from '../assets/Logo.png';




  interface BillItem {
    id: number;
    product_id: number;
    product_name: string;
    price: number;
    quantity: number;
    amount: number;
    unit: string;
    return_quantity?: number;
    gst?: number;
    sgst?: number;
    cgst?: number;
    hsnCode: string;
    isReturn?: boolean;
  }

  interface Bill {
    id: string;
    shop_id: number;
    shop_name: string;
    bill_date: string;
    total_amount: number;
    received_amount: number;
    pending_amount: number;
    status: 'PENDING' | 'COMPLETED';
    items: BillItem[];
    payment_mode?: string;
    transaction_id?: string;
    payment_date?: string;
    signature?: string;
  }

  interface ReturnItem extends BillItem {
    return_quantity: number;
    return_amount: number;
    bill_id: string;
  }

  const convertHtmlToPlainText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    let text = '';
    
    const formatNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent?.trim();
        if (content) {
          text += content + ' ';
        }
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;

        if (['STYLE', 'SCRIPT', 'HEAD', 'META', 'TITLE'].includes(el.tagName)) {
          return;
        }

        if (el.classList.contains('dashed-line')) {
          text += '\n--------------------------------\n';
          return;
        }

        if (el.tagName === 'TR') {
          const cells = Array.from(el.querySelectorAll('th, td'));
          if (cells.length > 0) {
            let rowText = '';
            if (cells.length === 5) {
              const item = cells[0].textContent?.trim() || '';
              const qty = cells[2].textContent?.trim() || '';
              const price = cells[3].textContent?.trim() || '';
              const total = cells[4].textContent?.trim() || '';

              // Item (12) | Qty (3) | Price (8) | Total (9)
              const fItem = item.substring(0, 11).padEnd(12, ' ');
              const fQty = qty.padStart(3, ' ');
              const fPrice = price.padStart(8, ' ');
              const fTotal = total.padStart(9, ' ');
              rowText = `${fItem}${fQty}${fPrice}${fTotal}`;
            } else if (cells.length === 2) {
              const label = cells[0].textContent?.trim() || '';
              const val = cells[1].textContent?.trim() || '';
              rowText = `${label.padEnd(20, ' ')}${val.padStart(12, ' ')}`;
            } else {
              rowText = cells.map(c => c.textContent?.trim() || '').join(' ');
            }
            text += '\n' + rowText;
          }
          return;
        }

        if (el.classList.contains('total-row')) {
          const divs = Array.from(el.querySelectorAll(':scope > div'));
          if (divs.length === 2) {
            const label = divs[0].textContent?.trim() || '';
            const val = divs[1].textContent?.trim() || '';
            text += '\n' + `${label.padEnd(20, ' ')}${val.padStart(12, ' ')}`;
            return;
          }
        }

        const isBlock = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'THEAD', 'TBODY', 'TR'].includes(el.tagName);
        if (isBlock) {
          text += '\n';
        }

        if (el.tagName === 'H1' || el.classList.contains('company-name')) {
          text += '\n\n*** ';
          el.childNodes.forEach(formatNode);
          text += ' ***\n';
          return;
        }

        el.childNodes.forEach(formatNode);

        if (isBlock) {
          text += '\n';
        }
      }
    };

    formatNode(tempDiv);

    return text
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
      .join('\n')
      .replace(/₹/g, 'Rs.');
  };


  let logoBase64String = '';

  const Billing: React.FC = () => {
    const { products, addBill, shopProducts, setShopProducts, updateBill, refreshData, deleteBill, userRole, shops: allShops } = useAppContext();

    const formatDateWithDay = (dateInput: any) => {
      if (!dateInput) return '';
      const d = new Date(dateInput);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const dayOfWeek = dayNames[d.getDay()];
      
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const timeStr = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
      
      return `${day}/${month}/${year} (${dayOfWeek}) ${timeStr}`;
    };

    const [printUrl, setPrintUrl] = React.useState('');
    const [showPrintModal, setShowPrintModal] = React.useState(false);

    const printStandard = (htmlContent: string, onPrintComplete?: () => void) => {
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
        
        // Optimize for standard computer printing (A4/Letter) by removing thermal printer size restrictions
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
            if (onPrintComplete) onPrintComplete();
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

    const [useRawBT, setUseRawBT] = useState<boolean>(() => {
      const saved = localStorage.getItem('useRawBT');
      if (saved !== null) {
        return saved === 'true';
      }
      // Default to true for all devices to ensure RawBT is used by default
      return true;
    });

    React.useEffect(() => {
      localStorage.setItem('useRawBT', String(useRawBT));
    }, [useRawBT]);

    const printHtml = async (htmlContent: string, onPrintComplete?: () => void) => {
      if (useRawBT) {
        try {
          // Replace absolute millimeter widths with 100% to fill the 800px container
          const optimizedHtml = htmlContent
            .replace(/width:\s*(72mm|80mm)/gi, 'width: 100%')
            .replace(/width:\s*(72mm|80mm)\s*!important/gi, 'width: 100% !important')
            .replace(/₹/g, '<span class="rupee">₹</span>');

          // Create a temporary container to render the HTML content
          const container = document.createElement('div');
          container.style.position = 'absolute';
          container.style.left = '-9999px';
          container.style.width = '800px'; // Increased to 800px to fully match 8cm paper width
          container.style.background = 'white';
          container.style.padding = '0px';
          container.style.boxSizing = 'border-box';
          container.innerHTML = optimizedHtml + `
            <style>
              * {
                font-family: Arial, Helvetica, sans-serif !important;
                font-weight: bold !important;
              }
              body {
                width: 100% !important;
                max-width: 100% !important;
                padding: 0px !important;
                margin: 0 !important;
                box-sizing: border-box !important;
              }
              .single-bill {
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              body, div, p, td, th, span {
                font-size: 38px !important;
                line-height: 1.4 !important;
              }
              .bill-header div { 
                font-size: 40px !important; 
              }
              .header-row div { 
                font-size: 34px !important; 
              }
              .company-name { 
                font-size: 64px !important; 
                font-weight: bold !important;
                margin: 15px 0 !important;
              }
              .company-address, .company-city { 
                font-size: 34px !important; 
              }
              .shop-info, .shop-gst, .bill-no, .bill-date { 
                font-size: 38px !important; 
                margin-bottom: 8px !important;
              }
              .bill-items {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
              }
              .bill-items th {
                font-size: 26px !important;
                padding: 10px 2px !important;
                border: 2px solid #888 !important;
                word-wrap: break-word !important;
                white-space: normal !important;
              }
              .bill-items td { 
                font-size: 30px !important; 
                padding: 10px 2px !important; 
                border: 2px solid #888 !important;
                word-wrap: break-word !important;
                white-space: normal !important;
              }
              .product-name-cell {
                font-size: 36px !important;
                font-weight: bold !important;
              }
              .total-row { 
                font-size: 32px !important; 
                padding: 8px 0 !important; 
              }
              .total-row div { 
                font-size: 32px !important; 
              }
              .final-total-row {
                font-size: 64px !important;
                padding: 15px 0 !important;
              }
              .final-total-row div {
                font-size: 64px !important;
              }
              .qty-col {
                border-right: 2px solid #000 !important;
                padding-right: 12px !important;
              }
              .price-col {
                border-right: 2px solid #000 !important;
                padding-right: 12px !important;
                padding-left: 12px !important;
              }
              .rupee {
                color: #777 !important;
                font-weight: normal !important;
              }
              .thank-you { 
                font-size: 34px !important; 
                margin-top: 25px !important;
              }
              .double-dark-line {
                border-top: 6px double #000 !important;
                margin: 15px 0 !important;
              }
              .dark-line {
                border-top: 4px solid #000 !important;
                margin: 15px 0 !important;
              }
              img {
                width: 320px !important;
                height: auto !important;
              }
              .hsn-col {
                display: none !important;
              }
            </style>
          `;
          document.body.appendChild(container);

          // Wait for fonts and logo image to load
          await new Promise(resolve => setTimeout(resolve, 600));

          const canvas = await html2canvas(container, {
            scale: 1.0, // Optimized scale to prevent URL length limits in mobile browsers
            useCORS: true,
            backgroundColor: '#ffffff'
          });

          document.body.removeChild(container);

          const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          window.location.href = `rawbt:data:image/jpeg;base64,` + base64Image;

          if (onPrintComplete) {
            onPrintComplete();
          }
        } catch (e) {
          console.error('RawBT image print failed, falling back to standard print:', e);
          printStandard(htmlContent, onPrintComplete);
        }
      } else {
        printStandard(htmlContent, onPrintComplete);
      }
    };

    React.useEffect(() => {
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

    // Mock data
    const { weeklySchedule } = useAppContext();

    const [currentPage, setCurrentPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalBills, setTotalBills] = React.useState(0);
    const [paginatedBills, setPaginatedBills] = React.useState<Bill[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Pagination for month-wise bills
    const [monthCurrentPage, setMonthCurrentPage] = React.useState(1);
    const [monthTotalPages, setMonthTotalPages] = React.useState(1);
    const monthItemsPerPage = 5;

    // Fetch bills with pagination
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);

    React.useEffect(() => {
      const fetchBills = async () => {
        setLoading(true);
        try {
          const response = await billsAPI.getBills({
            page: currentPage,
            limit: 5, // Show 5 bills per page
          });
          if (response.success) {
            setPaginatedBills(response.data);
            setTotalPages(response.pagination.totalPages);
            setTotalBills(response.pagination.total);

            // Load signatures from bills
            const signatures: { [key: string]: string } = {};
            response.data.forEach((bill: Bill) => {
              if (bill.signature) {
                signatures[bill.id] = bill.signature;
              }
            });
            setSignatureData(prev => ({ ...prev, ...signatures }));
          }
        } catch (error) {
          console.error('Failed to fetch bills:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchBills();
    }, [currentPage, refreshTrigger]);

    // Refresh all products, shops, and schedules on mount
    React.useEffect(() => {
      refreshData();
    }, []);

    // State for selected day to filter shops
    const [selectedDay, setSelectedDay] = React.useState<string | null>(() => {
      const draftBill = localStorage.getItem('draft_currentBill');
      const hasDraftBill = draftBill ? JSON.parse(draftBill).length > 0 : false;
      if (hasDraftBill) {
        return localStorage.getItem('draft_selectedDay') || null;
      }
      return null;
    });

    // Shops filtered by selected day
    const shops = React.useMemo(() => {
      if (!selectedDay) return [];
      const daySchedule = weeklySchedule.find(day => day.day === selectedDay);
      return daySchedule ? daySchedule.shops : [];
    }, [selectedDay, weeklySchedule]);

    // Group shops by address
    const groupedShops = React.useMemo(() => {
      const groups: { [key: string]: typeof shops } = {};
      shops.forEach(shop => {
        const addr = (shop.address || '').trim() || 'No Address';
        if (!groups[addr]) {
          groups[addr] = [];
        }
        groups[addr].push(shop);
      });
      return groups;
    }, [shops]);


    // Days of week for dropdown
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];



    const [selectedShop, setSelectedShop] = useState<number | null>(() => {
      const draftBill = localStorage.getItem('draft_currentBill');
      const hasDraftBill = draftBill ? JSON.parse(draftBill).length > 0 : false;
      if (hasDraftBill) {
        const val = localStorage.getItem('draft_selectedShop');
        return val ? parseInt(val, 10) : null;
      }
      return null;
    });
    const [currentBill, setCurrentBill] = useState<BillItem[]>(() => {
      const val = localStorage.getItem('draft_currentBill');
      return val ? JSON.parse(val) : [];
    });
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
    // Removed local savedBills state to use context bills instead
    // const [savedBills, setSavedBills] = useState<Bill[]>([]);
    const { bills, setBills } = useAppContext();

    // Helper function to convert backend status to frontend status
    const convertStatusToFrontend = (status: 'PENDING' | 'COMPLETED'): 'pending' | 'completed' => {
      return status.toLowerCase() as 'pending' | 'completed';
    };

    // Helper function to convert frontend status to backend status
    const convertStatusToBackend = (status: 'pending' | 'completed'): 'PENDING' | 'COMPLETED' => {
      return status.toUpperCase() as 'PENDING' | 'COMPLETED';
    };
    const [returnQuantities, setReturnQuantities] = useState<{ [key: number]: string }>({});
    const [selectedBillForView, setSelectedBillForView] = useState<Bill | null>(null);
    const [showBillingInterface, setShowBillingInterface] = useState<boolean>(() => {
      const draftBill = localStorage.getItem('draft_currentBill');
      const hasDraftBill = draftBill ? JSON.parse(draftBill).length > 0 : false;
      return hasDraftBill;
    });
    const [receivedAmount, setReceivedAmount] = useState<string>(() => {
      const draftBill = localStorage.getItem('draft_currentBill');
      const hasDraftBill = draftBill ? JSON.parse(draftBill).length > 0 : false;
      if (hasDraftBill) {
        return localStorage.getItem('draft_receivedAmount') || "";
      }
      return "";
    });
    const [showPendingBillAlert, setShowPendingBillAlert] = useState(false);
    const [pendingBills, setPendingBills] = useState<Bill[]>([]);
    const [isPayPendingMode, setIsPayPendingMode] = useState(false);
    const [pendingPaymentAmount, setPendingPaymentAmount] = useState<number>(0);
    const [showGPayQR, setShowGPayQR] = useState(false);
    const [currentBillForPayment, setCurrentBillForPayment] = useState<Bill | null>(null);
    const [hasPrinted, setHasPrinted] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<{ financialYear: string; monthName: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);

    // Sync draft state to localStorage only if there are items in the bill
    React.useEffect(() => {
      if (currentBill.length > 0) {
        localStorage.setItem('draft_currentBill', JSON.stringify(currentBill));
        if (selectedDay) {
          localStorage.setItem('draft_selectedDay', selectedDay);
        } else {
          localStorage.removeItem('draft_selectedDay');
        }
        if (selectedShop !== null) {
          localStorage.setItem('draft_selectedShop', selectedShop.toString());
        } else {
          localStorage.removeItem('draft_selectedShop');
        }
        localStorage.setItem('draft_receivedAmount', receivedAmount);
      } else {
        localStorage.removeItem('draft_currentBill');
        localStorage.removeItem('draft_selectedDay');
        localStorage.removeItem('draft_selectedShop');
        localStorage.removeItem('draft_receivedAmount');
      }
    }, [currentBill, selectedDay, selectedShop, receivedAmount]);

    // Recalculate pending bills automatically when shop or global bills list updates
    React.useEffect(() => {
      if (selectedShop !== null && bills.length > 0) {
        const shopPendingBills = bills.filter(bill =>
          bill.shop_id === selectedShop && bill.status === 'PENDING'
        );
        if (shopPendingBills.length > 0) {
          const sortedPendingBills = [...shopPendingBills].sort((a, b) =>
            new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime()
          );
          setPendingBills(sortedPendingBills);
          setShowPendingBillAlert(true);
        } else {
          setPendingBills([]);
          setShowPendingBillAlert(false);
        }
      } else if (selectedShop === null) {
        setPendingBills([]);
        setShowPendingBillAlert(false);
      }
    }, [selectedShop, bills]);

    // Reset month pagination when month changes
    React.useEffect(() => {
      setMonthCurrentPage(1);
      setSelectedBillIds([]);
    }, [selectedMonth]);

    // State for selected bill for returns
    const [selectedBillForReturn, setSelectedBillForReturn] = useState<Bill | null>(null);

    // State for payment mode
    const [paymentMode, setPaymentMode] = useState<string>('CASH');

    // State for payment bill mode
    const [isPaymentBillMode, setIsPaymentBillMode] = useState(false);
    const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
    const [paymentBillData, setPaymentBillData] = useState<{
      shopId: number;
      receivedAmount: number;
      applyToPending: boolean;
    } | null>(null);
    const [paymentCompleted, setPaymentCompleted] = useState(false);

    // Signature state
    const [showSaveOptionsModal, setShowSaveOptionsModal] = useState(false);
    const [gpayFromModal, setGpayFromModal] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signatureTargetBillId, setSignatureTargetBillId] = useState<string | null>(null);
    const [signatureData, setSignatureData] = useState<{ [billId: string]: string }>({});

    // Draft state
    const [drafts, setDrafts] = useState<Record<number, any>>(() => {
      const saved = localStorage.getItem('billing_drafts');
      return saved ? JSON.parse(saved) : {};
    });
    const [showDraftsModal, setShowDraftsModal] = useState(false);

    const handleSaveDraft = () => {
      if (!selectedShop) {
        alert('Please select a shop first');
        return;
      }
      if (currentBill.length === 0) {
        alert('Cannot save empty bill as draft');
        return;
      }

      const updatedDrafts = { ...drafts };
      updatedDrafts[selectedShop] = {
        shopId: selectedShop,
        shopName: currentShop?.shop_name || '',
        day: selectedDay || '',
        items: currentBill,
        receivedAmount: receivedAmount,
        date: new Date().toISOString()
      };

      setDrafts(updatedDrafts);
      localStorage.setItem('billing_drafts', JSON.stringify(updatedDrafts));

      setCurrentBill([]);
      setReceivedAmount("0");
      setSelectedShop(null);
      setShowBillingInterface(false);
      setShowSaveOptionsModal(false);
      alert('Bill saved to drafts successfully!');
    };
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const daySelectRef = React.useRef<HTMLSelectElement>(null);
    const quantityInputRef = React.useRef<HTMLInputElement>(null);

    // Auto-focus day select dropdown removed to allow automatically selecting today's day and opening shop dropdown.
    const [isDrawing, setIsDrawing] = useState(false);

    const [productForm, setProductForm] = useState({
      product_id: '',
      quantity: ''
    });

    const [productImages, setProductImages] = useState<Record<string, string>>({});
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
    const [dropdownSearch, setDropdownSearch] = useState('');

    // Load product images from localStorage
    React.useEffect(() => {
      const images: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('product_image_')) {
          const prodIdOrName = key.replace('product_image_', '');
          const value = localStorage.getItem(key);
          if (value) {
            images[prodIdOrName] = value;
          }
        }
      }
      setProductImages(images);
    }, []);

    // Fetch latest shop products when a shop is selected to make sure prices are fresh
    React.useEffect(() => {
      const fetchLatestShopProducts = async () => {
        if (!selectedShop) return;
        try {
          const response = await shopsAPI.getShopProducts(selectedShop);
          if (response.success) {
            const fetchedShopProducts = response.data.map((sp: any) => ({
              id: sp.id,
              shop_id: sp.shopId,
              product_id: sp.productId,
              price: sp.price,
              shop_name: sp.shop?.shopName || '',
              product_name: sp.product?.productName || '',
              unit: sp.product?.unit || '',
              gst: sp.product?.gst || 0,
              hsn_code: sp.product?.hsnCode || ''
            }));
            
            setShopProducts([
              ...shopProducts.filter(sp => sp.shop_id !== selectedShop),
              ...fetchedShopProducts
            ]);
          }
        } catch (error) {
          console.error('Error fetching latest shop products:', error);
        }
      };
      
      fetchLatestShopProducts();
    }, [selectedShop]);

    // Keep currentBill prices in sync with latest shopProducts/products pricing
    React.useEffect(() => {
      if (selectedShop && currentBill.length > 0) {
        let changed = false;
        const updatedBill = currentBill.map(item => {
          // Find the latest price for this product in this shop
          const shopPricing = shopProducts.find(sp =>
            Number(sp.shop_id) === Number(selectedShop) && Number(sp.product_id) === Number(item.product_id)
          );
          const baseProduct = products.find(p => Number(p.id) === Number(item.product_id));
          const latestPrice = shopPricing ? shopPricing.price : (baseProduct ? baseProduct.price : item.price);
          
          if (latestPrice !== item.price && !item.isReturn) {
            changed = true;
            const newAmount = item.quantity * latestPrice;
            let newSgst = 0;
            let newCgst = 0;
            const gstPercent = item.gst !== undefined ? item.gst : (baseProduct ? baseProduct.gst : 0);
            if (gstPercent && item.quantity > 0) {
              const gstAmount = (newAmount * gstPercent) / 100;
              newSgst = gstAmount / 2;
              newCgst = gstAmount / 2;
            }
            return {
              ...item,
              price: latestPrice,
              amount: newAmount,
              sgst: newSgst,
              cgst: newCgst
            };
          }
          return item;
        });

        if (changed) {
          setCurrentBill(updatedBill);
        }
      }
    }, [shopProducts, products, selectedShop]);

    // Get all products for the selected shop, or all products if none are priced for the shop
    const selectedShopProducts = selectedShop
      ? shopProducts.filter(sp => Number(sp.shop_id) === Number(selectedShop))
      : [];

    // Get all available products for dropdown (only products with stock > 0)
    const allProductsForShop = selectedShop
      ? products
        .filter(product => product.quantity > 0) // Only show products with stock
        .map(product => {
          const shopPricing = shopProducts.find(sp =>
            Number(sp.shop_id) === Number(selectedShop) && Number(sp.product_id) === Number(product.id)
          );
          const productData = {
            id: Date.now() + product.id, // temporary ID
            shop_id: selectedShop,
            product_id: product.id,
            product_name: product.product_name,
            price: shopPricing ? shopPricing.price : product.price, // Use shop-specific price if available, otherwise use product price
            unit: product.unit,
            gst: product.gst, // inherit gst from base product
            stock_quantity: product.quantity, // include stock quantity
            hsn_code: product.hsn_code, // inherit hsn_code from base product
            image: product.image // inherit image from base product
          };
          return productData;
        })
      : [];
    const selectedProductDetails = productForm.product_id
      ? allProductsForShop.find(p => Number(p.product_id) === Number(productForm.product_id))
      : null;
    const filteredProductsForDropdown = allProductsForShop.filter(p =>
      p.product_name.toLowerCase().includes(dropdownSearch.toLowerCase())
    );
    const currentShop = shops.find(shop => Number(shop.id) === Number(selectedShop));
    const totalAmount = currentBill.reduce((sum, item) => sum + item.amount, 0);

    const handleDaySelect = (day: string | null) => {
      setSelectedDay(day);
      setSelectedShop(null); // Reset shop selection when day changes
      setCurrentBill([]); // Clear current bill when day changes
      setPendingBills([]);
      setIsPayPendingMode(false);
      setPendingPaymentAmount(0);
      setProductForm({ product_id: '', quantity: '' });
      setPaymentCompleted(false);
      if (day) {
        setIsShopDropdownOpen(true);
      }
    };

    const handleShopSelect = (shopId: number | null) => {
      if (currentBill.length > 0 && shopId !== null) {
        alert('You cannot change the shop while there are items in the current bill.');
        return;
      }
      if (shopId === null) {
        setSelectedShop(null);
        setProductForm({ product_id: '', quantity: '' });
        setPendingBills([]);
        setIsPayPendingMode(false);
        setPendingPaymentAmount(0);
        setPaymentCompleted(false);
        return;
      }

      if (currentBill.length > 0) {
        if (confirm('Changing shop will clear current bill. Continue?')) {
          setCurrentBill([]);
          setSelectedShop(shopId);
        }
      } else {
        setSelectedShop(shopId);
      }

      // Check for pending bills for this shop
      const shopPendingBills = bills.filter(bill =>
        bill.shop_id === shopId && bill.status === 'PENDING'
      );

      if (shopPendingBills.length > 0) {
        // Sort pending bills by date (oldest first for payment allocation)
        const sortedPendingBills = [...shopPendingBills].sort((a, b) =>
          new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime()
        );
        setPendingBills(sortedPendingBills);
        setShowPendingBillAlert(true);
        // Reset payment mode when selecting a new shop
        setIsPayPendingMode(false);
        setPendingPaymentAmount(0);
      } else {
        setPendingBills([]);
        setShowPendingBillAlert(false);
        setIsPayPendingMode(false);
      }

      setProductForm({ product_id: '', quantity: '' });
      setIsDropdownOpen(true);
    };

    const handleAddProduct = (e: React.FormEvent) => {
      e.preventDefault();

      const productId = parseInt(productForm.product_id);
      const quantity = parseInt(productForm.quantity) || 1;

      // Validate quantity
      if (quantity < 1) {
        alert('Quantity must be at least 1');
        return;
      }

      const product = allProductsForShop.find(p => p.product_id === productId);

      if (!product) return;

      // Check if product has a price set
      if (product.price === 0) {
        alert('Please set a price for this product before adding it to the bill.');
        return;
      }

      // Check stock availability
      const baseProduct = products.find(p => p.id === product.product_id);
      if (!baseProduct) return;

      const totalRequestedQuantity = quantity +
        (currentBill.find(item => item.product_id === product.product_id)?.quantity || 0);

      if (totalRequestedQuantity > baseProduct.quantity) {
        alert(`Not enough stock available! Available: ${baseProduct.quantity}, Requested: ${totalRequestedQuantity}`);
        return;
      }

      const existingItemIndex = currentBill.findIndex(item => item.product_id === product.product_id && !item.isReturn);

      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedBill = [...currentBill];
        updatedBill[existingItemIndex].quantity += quantity;
        updatedBill[existingItemIndex].amount = updatedBill[existingItemIndex].quantity * updatedBill[existingItemIndex].price;
        // Recalculate SGST and CGST only for positive quantity items (sales) if shop has GST
        if (product.gst && updatedBill[existingItemIndex].quantity > 0) {
          const gstAmount = (updatedBill[existingItemIndex].amount * product.gst) / 100;
          updatedBill[existingItemIndex].sgst = gstAmount / 2;
          updatedBill[existingItemIndex].cgst = gstAmount / 2;
        } else {
          // For return items, or if shop has no GST, set SGST and CGST to 0
          updatedBill[existingItemIndex].sgst = 0;
          updatedBill[existingItemIndex].cgst = 0;
        }
        setCurrentBill(updatedBill);
      } else {
        // Add new item
        const amount = product.price * quantity;
        const newItem: BillItem = {
          id: Date.now(),
          product_id: product.product_id,
          product_name: product.product_name,
          price: product.price,
          quantity: quantity,
          amount: amount,
          unit: product.unit,
          hsnCode: product.hsn_code,
          isReturn: false
        };

        // Calculate SGST and CGST only for positive quantity items (sales) if shop has GST
        if (product.gst && quantity > 0) {
          const gstAmount = (amount * product.gst) / 100;
          newItem.sgst = gstAmount / 2;
          newItem.cgst = gstAmount / 2;
        } else {
          // For return items, or if shop has no GST, set SGST and CGST to 0
          newItem.sgst = 0;
          newItem.cgst = 0;
        }

        setCurrentBill([...currentBill, newItem]);
        setHasPrinted(false); // Reset print status when items are added
      }

      setProductForm({ product_id: '', quantity: '' });
    };

    const handleRemoveItem = (itemId: number) => {
      setCurrentBill(currentBill.filter(item => item.id !== itemId));
      setHasPrinted(false); // Reset print status when items are modified
    };

    const handleQuantityChange = (itemId: number, newQuantity: number) => {
      // Allow 0 for editing purposes, but not negative numbers
      if (newQuantity < 0) return;

      const item = currentBill.find(item => item.id === itemId);
      if (!item) return;

      const product = products.find(p => p.id === item.product_id);
      if (!product) return;

      // Calculate total quantity for this product in current bill
      const currentTotalQuantity = currentBill
        .filter(billItem => billItem.product_id === item.product_id)
        .reduce((sum, billItem) => sum + billItem.quantity, 0);

      const newTotalQuantity = currentTotalQuantity - item.quantity + newQuantity;

      if (newTotalQuantity > product.quantity) {
        alert(`Not enough stock available! Available: ${product.quantity}, Requested: ${newTotalQuantity}`);
        return;
      }

      // Update the item with new quantity, amount, and GST
      const newAmount = newQuantity * item.price;
      let newSgst = 0;
      let newCgst = 0;

      if (product.gst && newQuantity > 0) {
        const gstAmount = (newAmount * product.gst) / 100;
        newSgst = gstAmount / 2;
        newCgst = gstAmount / 2;
      }

      setCurrentBill(currentBill.map(billItem =>
        billItem.id === itemId
          ? { ...billItem, quantity: newQuantity, amount: newAmount, sgst: newSgst, cgst: newCgst }
          : billItem
      ));
      setHasPrinted(false); // Reset print status when quantities are changed
    };

    const handleReturnItemQuantityChange = (itemId: number, newQuantity: number) => {
      // Allow 0 for editing purposes, but not negative numbers
      if (newQuantity < 0) return;

      const item = currentBill.find(item => item.id === itemId);
      if (!item) return;

      const product = products.find(p => p.id === item.product_id);

      // For return items, quantity should be negative
      const negativeQuantity = -newQuantity;
      const newAmount = negativeQuantity * item.price;

      let newSgst = 0;
      let newCgst = 0;
      if (product && product.gst) {
        const gstAmount = (newAmount * product.gst) / 100;
        newSgst = gstAmount / 2;
        newCgst = gstAmount / 2;
      }

      // Update the return item with new quantity, amount and calculated negative GST
      setCurrentBill(currentBill.map(billItem =>
        billItem.id === itemId
          ? { ...billItem, quantity: negativeQuantity, amount: newAmount, sgst: newSgst, cgst: newCgst }
          : billItem
      ));
      setHasPrinted(false); // Reset print status when quantities are changed
    };

    const handlePayPending = async () => {
      if (pendingBills.length === 0 || !selectedShop || pendingPaymentAmount <= 0) {
        return; // No validation messages, just silently return
      }

      try {
        let remainingPayment = pendingPaymentAmount;

        // Apply payment to bills in order (oldest first)
        for (let i = 0; i < pendingBills.length && remainingPayment > 0; i++) {
          const bill = pendingBills[i];
          let paymentAmount = Math.min(remainingPayment, bill.pending_amount);
          
          // If remaining pending amount is less than 1.00 Rupee, clear it completely
          if (bill.pending_amount - paymentAmount < 1.00) {
            paymentAmount = bill.pending_amount;
          }

          const newReceivedAmount = bill.received_amount + paymentAmount;

          // Update the bill via backend API (this will update global bills state with correct pending_amount and status)
          await updateBill(bill.id, {
            receivedAmount: newReceivedAmount,
            paymentMode: paymentMode,
          });

          remainingPayment -= paymentAmount;
        }

        // Refresh pending bills from updated global bills state
        const shopPendingBills = bills.filter(bill =>
          bill.shop_id === selectedShop && bill.status === 'PENDING'
        ).sort((a, b) => new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime());

        setPendingBills(shopPendingBills);

        // Reset payment amount but keep the mode
        setPendingPaymentAmount(0);

        // Show success message
        const totalPaid = pendingPaymentAmount - remainingPayment;
        if (totalPaid > 0) {
          const remainingBalance = shopPendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0);
          alert(`Payment of ₹${totalPaid} applied to pending bills. `);
          setPaymentCompleted(true);
          setShowBillingInterface(false);
          setSelectedMonth(null); // Reset to show financial year overview
          setRefreshTrigger(prev => prev + 1); // Trigger bills list refresh
          setShowPendingBillAlert(false); // Hide pending alert after payment
        }
      } catch (error) {
        console.error('Failed to update pending payments:', error);
        alert('Failed to update pending payments. Please try again.');
      }
    };

    const handleSaveBill = async (forcePending: boolean = false, signatureDataUrl?: string) => {
      if (!selectedShop) {
        alert('Please select a shop first');
        return;
      }

      // Handle payment bill mode (no items, only payment)
      if (isPaymentBillMode) {
        const paymentAmount = parseFloat(receivedAmount || "0");
        if (paymentAmount <= 0) {
          alert('Please enter a payment amount');
          return;
        }

        // Show confirmation dialog for payment bills
        setPaymentBillData({
          shopId: selectedShop,
          receivedAmount: paymentAmount,
          applyToPending: true // Always apply to pending for payment bills
        });
        setShowPaymentConfirmation(true);
        return;
      }

      // Handle normal bill with items
      if (currentBill.length === 0) {
        alert('Please add items to the bill');
        return;
      }

      // Check for invalid quantities (0)
      const hasInvalidQuantity = currentBill.some(item => item.quantity === 0);
      if (hasInvalidQuantity) {
        alert('Please enter a valid quantity for all items before saving.');
        return;
      }

      // Calculate final total including returns and taxes
      const returnAmount = currentBill
        .filter(item => item.quantity < 0)
        .reduce((sum, item) => sum + item.amount + (item.sgst || 0) + (item.cgst || 0), 0);

      const billingAmount = currentBill
        .filter(item => item.quantity > 0)
        .reduce((sum, item) => sum + item.amount + (item.sgst || 0) + (item.cgst || 0), 0);

      let finalTotal = Math.round(billingAmount + returnAmount); // returnAmount is negative

      let currentReceived = parseFloat(receivedAmount || "0");
      if (forcePending && currentReceived >= finalTotal) {
        currentReceived = 0; // Reset received to 0 since it is fully pending
      }

      // Calculate pending amount including taxes
      let pendingAmount = forcePending ? finalTotal - currentReceived : Math.max(0, finalTotal - currentReceived);
      
      // If remaining pending amount is less than 1.00 Rupee, clear it completely
      if (pendingAmount > 0 && pendingAmount < 1.00) {
        currentReceived = finalTotal;
        pendingAmount = 0;
      }
      
      const billStatus = forcePending ? 'PENDING' : (pendingAmount > 0 ? 'PENDING' : 'COMPLETED');

      // Generate bill ID based on financial year
      const billDate = new Date();
      const billYear = billDate.getFullYear();
      const billMonth = billDate.getMonth() + 1;

      // Determine financial year (April to March)
      const financialYear = billMonth >= 4 ? `${billYear}-${billYear + 1}` : `${billYear - 1}-${billYear}`;

      // Count bills in the current financial year
      const billsInFinancialYear = bills.filter(bill => {
        const billFinancialYear = getFinancialYear(bill.bill_date);
        return billFinancialYear === financialYear;
      });

      const nextBillNumber = billsInFinancialYear.length + 1;

      const newBill: Bill = {
        id: `B${String(nextBillNumber).padStart(3, '0')}`,
        shop_id: selectedShop,
        shop_name: currentShop?.shop_name || '',
        bill_date: new Date().toISOString(),
        total_amount: finalTotal,
        received_amount: currentReceived,
        pending_amount: pendingAmount,
        status: billStatus,
        payment_mode: paymentMode,
        items: currentBill.map(item => ({
          ...item,
          rate: item.price,
          sgst: item.sgst || 0,
          cgst: item.cgst || 0,
          hsnCode: item.hsnCode
        }))
      };

      setSaving(true);
      try {
        // Use the context's addBill method which automatically handles stock updates
        const savedBill = await addBill(newBill);
        const savedBillId = savedBill?.id;

        if (signatureDataUrl && savedBillId) {
          try {
            await billsAPI.updateSignature(parseInt(savedBillId), signatureDataUrl);
            setSignatureData(prev => ({
              ...prev,
              [savedBillId]: signatureDataUrl
            }));
          } catch (sigError) {
            console.error('Failed to save signature during bill creation:', sigError);
          }
        }

        // If there was excess payment that might have been applied to pending bills, refresh data
        if (currentReceived > finalTotal) {
          await refreshData();
        }

        // Refresh pending bills from updated global bills state if shop is selected
        if (selectedShop) {
          const shopPendingBills = bills.filter(bill =>
            bill.shop_id === selectedShop && bill.status === 'PENDING'
          ).sort((a, b) => new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime());

          setPendingBills(shopPendingBills);
          setShowPendingBillAlert(shopPendingBills.length > 0);
        }

        // Clean up draft if one exists for this shop
        if (selectedShop) {
          const updatedDrafts = { ...drafts };
          if (updatedDrafts[selectedShop]) {
            delete updatedDrafts[selectedShop];
            setDrafts(updatedDrafts);
            localStorage.setItem('billing_drafts', JSON.stringify(updatedDrafts));
          }
        }

        setCurrentBill([]);
        setReturnItems([]);
        setReceivedAmount("0");
        setPendingBills([]);
        setShowPendingBillAlert(false);
        setSelectedShop(null);
        setReturnQuantities({});
        setShowBillingInterface(false);
        setIsPayPendingMode(false);
        setPendingPaymentAmount(0);
        setHasPrinted(false); // Reset print status when bill is saved
        setSelectedMonth(null); // Reset to show financial year overview
        setPaymentMode('CASH'); // Reset payment mode
        alert(`Bill ${newBill.id} saved successfully!\nFinal Amount: ₹${finalTotal.toFixed(2)}\nStatus: ${billStatus}`);
      } catch (error: any) {
        console.error('Failed to save bill:', error);
        alert(`Failed to save bill: ${error.message || 'Unknown error occurred'}`);
        // Don't reset the form on error so user can try again
      } finally {
        setSaving(false);
      }
    };

    // Handle payment bill confirmation
    const handlePaymentBillConfirm = async () => {
      if (!paymentBillData) return;

      setSaving(true);
      try {
        // Create payment bill with applyToPending flag
        const billData = {
          shopId: paymentBillData.shopId,
          receivedAmount: paymentBillData.receivedAmount,
          applyToPending: paymentBillData.applyToPending,
          items: [], // Empty items array for payment bill
          sgst: 0,
          cgst: 0
        };

        const response = await billsAPI.createBill(billData);

        if (response.success) {
          // Refresh bills data to see updated pending amounts and statuses
          await refreshData();
          setRefreshTrigger(prev => prev + 1); // Trigger bills list refresh
          alert(`Payment of ₹${paymentBillData.receivedAmount} applied successfully to pending bills!`);
          setPaymentCompleted(true);
          setShowBillingInterface(false);
          setSelectedMonth(null); // Reset to show financial year overview
          setShowPendingBillAlert(false); // Hide pending alert after payment
        } else {
          throw new Error(response.message || 'Failed to process payment');
        }
      } catch (error) {
        console.error('Payment bill creation error:', error);
        alert('Failed to process payment. Please try again.');
      } finally {
        setSaving(false);
        setShowPaymentConfirmation(false);
        setPaymentBillData(null);
        setReceivedAmount("0");
        setIsPaymentBillMode(false);
      }
    };

    // Handle payment bill cancellation
    const handlePaymentBillCancel = () => {
      setShowPaymentConfirmation(false);
      setPaymentBillData(null);
    };

    const handleShowReturns = () => {
      if (!selectedShop) {
        alert('Please select a shop first');
        return;
      }

      // Initialize return quantities for all products as empty string for empty input
      const initialReturnQuantities: { [key: number]: string } = {};
      products.forEach(product => {
        initialReturnQuantities[product.id] = '';
      });

      setReturnQuantities(initialReturnQuantities);
      setShowReturnModal(true);
    };

    const handleReturnQuantityChange = (productId: number, returnQuantity: string) => {
      setReturnQuantities({
        ...returnQuantities,
        [productId]: returnQuantity
      });
    };

    const handleProcessReturns = () => {
      // Validate no negative quantities
      for (const [productId, quantityStr] of Object.entries(returnQuantities)) {
        const quantity = parseInt(quantityStr);
        if (!isNaN(quantity) && quantity < 0) {
          alert('Return quantity cannot be less than 0');
          return;
        }
      }

      // Get products with return quantities greater than 0
      const productsToReturn = Object.entries(returnQuantities)
        .filter(([_, quantityStr]) => {
          const quantity = parseInt(quantityStr);
          return !isNaN(quantity) && quantity > 0;
        })
        .map(([productId, quantityStr]) => {
          const baseProduct = products.find(p => Number(p.id) === Number(productId));
          if (!baseProduct) {
            return { product: null, quantity: 0 };
          }
          const shopPricing = shopProducts.find(sp =>
            Number(sp.shop_id) === Number(selectedShop) && Number(sp.product_id) === Number(baseProduct.id)
          );
          const product = {
            id: Date.now() + baseProduct.id,
            shop_id: selectedShop,
            product_id: baseProduct.id,
            product_name: baseProduct.product_name,
            price: shopPricing ? shopPricing.price : baseProduct.price,
            unit: baseProduct.unit,
            gst: baseProduct.gst,
            stock_quantity: baseProduct.quantity,
            hsn_code: baseProduct.hsn_code,
            image: baseProduct.image
          };
          return {
            product,
            quantity: parseInt(quantityStr)
          };
        })
        .filter(item => item.product !== null) as { product: any, quantity: number }[];

      if (productsToReturn.length === 0) {
        alert('Please select items to return');
        return;
      }

      // Process returns by updating the current bill
      let updatedBill = [...currentBill];

      productsToReturn.forEach(({ product, quantity }) => {
        if (!product) return;

        // Check if return item already exists in the bill
        const existingReturnItemIndex = updatedBill.findIndex(item =>
          item.product_id === product.product_id && item.isReturn
        );

        if (existingReturnItemIndex >= 0) {
          // If return item already exists, increase its negative quantity
          const existingReturnItem = updatedBill[existingReturnItemIndex];
          const newQuantity = existingReturnItem.quantity - quantity; // Subtract to make more negative
          const newAmount = newQuantity * product.price;
          updatedBill[existingReturnItemIndex] = {
            ...existingReturnItem,
            quantity: newQuantity,
            amount: newAmount
          };

          // For return items, calculate negative SGST and CGST
          if (product.gst) {
            const gstAmount = (newAmount * product.gst) / 100;
            updatedBill[existingReturnItemIndex].sgst = gstAmount / 2;
            updatedBill[existingReturnItemIndex].cgst = gstAmount / 2;
          } else {
            updatedBill[existingReturnItemIndex].sgst = 0;
            updatedBill[existingReturnItemIndex].cgst = 0;
          }
        } else {
          // Add return item with negative values
          const amount = -quantity * product.price; // Negative amount for return items
          const returnItem: BillItem = {
            id: Date.now() + product.product_id + Math.random(),
            product_id: product.product_id,
            product_name: product.product_name,
            price: product.price,
            quantity: -quantity, // Negative quantity for return items
            amount: amount,
            unit: product.unit,
            hsnCode: product.hsn_code,
            isReturn: true
          };

          // For return items, calculate negative SGST and CGST
          if (product.gst) {
            const gstAmount = (amount * product.gst) / 100;
            returnItem.sgst = gstAmount / 2;
            returnItem.cgst = gstAmount / 2;
          } else {
            returnItem.sgst = 0;
            returnItem.cgst = 0;
          }

          updatedBill.push(returnItem);
        }
      });

      setCurrentBill(updatedBill);
      alert('Return processed successfully!');

      setShowReturnModal(false);
      setReturnQuantities({});
    };

    const handleGPayPayment = async () => {
      if (!selectedShop) {
        alert('Please select a shop first');
        return;
      }

      try {
        // Calculate final total including returns and taxes
        const returnAmount = currentBill
          .filter(item => item.quantity < 0)
          .reduce((sum, item) => sum + item.amount + (item.sgst || 0) + (item.cgst || 0), 0);

        const billingAmount = currentBill
          .filter(item => item.quantity > 0)
          .reduce((sum, item) => sum + item.amount + (item.sgst || 0) + (item.cgst || 0), 0);

        let finalTotal = billingAmount + returnAmount; // returnAmount is negative

        // Add total pending amount from all pending bills
        const totalPendingAmount = pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0);
        finalTotal = Math.round(finalTotal + totalPendingAmount);

        // Calculate pending amount including taxes
        const pendingAmount = Math.max(0, finalTotal - parseFloat(receivedAmount || "0"));

        // Generate next bill ID based on financial year
        const billDate = new Date();
        const billYear = billDate.getFullYear();
        const billMonth = billDate.getMonth() + 1;
        const financialYear = billMonth >= 4 ? `${billYear}-${billYear + 1}` : `${billYear - 1}-${billYear}`;
        const billsInFinancialYear = bills.filter(bill => {
          const billFinancialYear = getFinancialYear(bill.bill_date);
          return billFinancialYear === financialYear;
        });
        const nextBillNumber = billsInFinancialYear.length + 1;

        const billForPayment: Bill = {
          id: `B${String(nextBillNumber).padStart(3, '0')}`,
          shop_id: selectedShop,
          shop_name: currentShop?.shop_name || '',
          bill_date: new Date().toISOString(),
          total_amount: finalTotal,
          received_amount: parseFloat(receivedAmount || "0"),
          pending_amount: pendingAmount,
          status: pendingAmount > 0 ? 'PENDING' : 'COMPLETED',
          items: currentBill.map(item => ({
            ...item,
            rate: item.price,
            sgst: item.sgst || 0,
            cgst: item.cgst || 0,
            hsnCode: item.hsnCode
          }))
        };

        setCurrentBillForPayment(billForPayment);
        setShowGPayQR(true);
      } catch (error) {
        console.error('Failed to prepare bill for payment:', error);
        alert('Failed to prepare bill for payment. Please try again.');
      }
    };

    const handlePaymentSuccess = async (transactionId: string, paidAmount: number) => {
      if (!currentBillForPayment) return;

      const wasFromModal = gpayFromModal;
      setGpayFromModal(false);

      setSaving(true);
      try {
        const newReceivedAmount = currentBillForPayment.received_amount + paidAmount;
        const pendingAmount = Math.max(0, currentBillForPayment.total_amount - newReceivedAmount);
        const billStatus = pendingAmount > 0 ? 'PENDING' : 'COMPLETED';

        if (wasFromModal) {
          // If triggered from the after-print options modal, save the new bill to backend
          const finalBill: Bill = {
            ...currentBillForPayment,
            received_amount: newReceivedAmount,
            pending_amount: pendingAmount,
            status: billStatus,
            payment_mode: 'GPAY',
            transaction_id: transactionId,
            payment_date: new Date().toISOString()
          };
          await addBill(finalBill);
          alert(`Payment of ₹${paidAmount} processed successfully via GPay!\nTransaction ID: ${transactionId}\nBill ${finalBill.id} saved as ${billStatus} status.`);
        } else {
          // If triggered from the saved bills list, update the existing bill via backend API
          await updateBill(currentBillForPayment.id, {
            receivedAmount: newReceivedAmount,
            paymentMode: 'GPAY',
          });
          
          // Get the updated bill status
          const updatedBill = bills.find(b => b.id === currentBillForPayment.id);
          const statusMessage = updatedBill && updatedBill.pending_amount === 0 ? 'Completed' : 'Partially Paid';
          alert(`Payment of ₹${paidAmount} processed successfully via GPay!\nTransaction ID: ${transactionId}\nBill ${currentBillForPayment.id} updated to ${statusMessage} status.`);
        }

        // Refresh pending bills from updated global bills state if shop is selected
        if (selectedShop) {
          const shopPendingBills = bills.filter(bill =>
            bill.shop_id === selectedShop && bill.status === 'PENDING'
          ).sort((a, b) => new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime());

          setPendingBills(shopPendingBills);
          setShowPendingBillAlert(shopPendingBills.length > 0);
        }

        // Clean up draft if one exists for this shop
        if (selectedShop) {
          const updatedDrafts = { ...drafts };
          if (updatedDrafts[selectedShop]) {
            delete updatedDrafts[selectedShop];
            setDrafts(updatedDrafts);
            localStorage.setItem('billing_drafts', JSON.stringify(updatedDrafts));
          }
        }

        // Reset states
        setCurrentBill([]);
        setReceivedAmount("0");
        setSelectedShop(null);
        setShowBillingInterface(false);
        setIsPayPendingMode(false);
        setPendingPaymentAmount(0);
        setCurrentBillForPayment(null);
        setShowSaveOptionsModal(false);
      } catch (error: any) {
        console.error('Failed to process bill payment:', error);
        alert(`Failed to process bill payment: ${error.message || 'Unknown error occurred'}`);
      } finally {
        setSaving(false);
      }
    };

    // Helper function to get financial year from date
    const getFinancialYear = (dateString: string): string => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12

      // Financial year: April to March (April = 4, March = 3)
      if (month >= 4) {
        return `${year}-${year + 1}`;
      } else {
        return `${year - 1}-${year}`;
      }
    };

    // Helper function to get month name from date
    const getMonthName = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleString('default', { month: 'long' });
    };

    const handlePrintMultiple = (billIds: string[]) => {
      const selectedBills = bills.filter(b => billIds.includes(b.id));
      if (selectedBills.length === 0) return;

      let htmlContent = '';
      const win = {
        document: {
          write: (content: string) => {
            htmlContent += content;
          },
          close: () => {}
        },
        focus: () => {},
        print: () => {
          printHtml(htmlContent);
        },
        close: () => {}
      };

      win.document.write(`
        <html>
        <head>
          <title>Print Monthly Bills</title>
          <style>
            * {
              font-weight: bold !important;
            }
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 0;
              line-height: 1.3;
              font-size: 17px;
            }
            .single-bill {
              width: 80mm;
              padding: 2mm 0mm;
              box-sizing: border-box;
              page-break-after: always;
            }
            .single-bill:last-child {
              page-break-after: avoid;
            }
            .bill-header {
              margin-bottom: 10px;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              font-size: 15px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 5px;
            }
            .company-address, .company-city {
              text-align: center;
              font-size: 15px;
              margin-bottom: 3px;
            }
            .shop-info, .shop-gst {
              margin-bottom: 5px;
              font-size: 15px;
            }
            .bill-items {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .bill-items th {
              font-size: 15px !important;
              padding: 5px 3px;
              text-align: left;
              border: 1px solid #ccc;
              background-color: #f8f9fa;
              font-weight: bold;
            }
            .bill-items td {
              font-size: 17px !important;
              padding: 5px 3px;
              text-align: left;
              border: 1px solid #ccc;
            }
            .product-name-cell {
              font-size: 20px !important;
              font-weight: bold !important;
            }
            .bill-totals {
              width: 100%;
              margin-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              font-size: 15px;
            }
            .final-total-row {
              font-size: 28px !important;
              font-weight: bold !important;
              padding: 5px 0;
            }
            .final-total-row div {
              font-size: 28px !important;
              font-weight: bold !important;
            }
            .qty-col {
              border-right: 1px solid #000 !important;
              padding-right: 8px !important;
            }
            .price-col {
              border-right: 1px solid #000 !important;
              padding-right: 8px !important;
              padding-left: 8px !important;
            }
            .rupee {
              color: #666 !important;
              font-weight: normal !important;
            }
            .dashed-line {
              border-bottom: 1px dashed #000;
              margin: 8px 0;
            }
            .double-dark-line {
              border-top: 3px double #000;
              margin: 8px 0;
            }
            .dark-line {
              border-top: 2px solid #000;
              margin: 8px 0;
            }
            .thank-you {
              text-align: center;
              margin-top: 15px;
              font-weight: bold;
              font-size: 17px;
            }
            .payment-details {
              margin-top: 10px;
              padding-top: 5px;
              border-top: 1px dashed #ccc;
            }
            .status-completed { color: #16a34a; }
            .status-pending { color: #ca8a04; }
            @media print {
              .single-bill {
                padding: 4mm 2mm;
                width: 72mm;
              }
            }
          </style>
        </head>
        <body>
      `);

      selectedBills.forEach(bill => {
        const itemTotal = bill.items.reduce((sum: number, item: any) => sum + item.amount, 0);
        const sgst = bill.items.reduce((sum: number, item: any) => sum + (item.sgst || 0), 0);
        const cgst = bill.items.reduce((sum: number, item: any) => sum + (item.cgst || 0), 0);
        const currentBillTotal = Math.floor(itemTotal + sgst + cgst);
        
        const rawTotal = bill.total_amount;
        const finalTotal = Math.floor(rawTotal);
        const discount = rawTotal - finalTotal;
        const previousPending = finalTotal - currentBillTotal;

        const viewShop = allShops.find(s => s.id === bill.shop_id);
        const hasGst = true;
        const shopGstNo = viewShop?.gst || '';

        win.document.write(`
          <div class="single-bill">
            <div class="bill-header" style="text-align:center; margin-bottom:5px;">
              <div style="font-size:18px; font-weight:bold;">
                "ஸ்ரீ தேவி சந்தன மாரியம்மன் துணை"
              </div>
            </div>

            <div class="header-row">
              <div>GST No: 33BAPPS2831B2ZU</div>
              <div>Mobile: 8807810021</div>
            </div>

            <div style="text-align:center; margin-bottom:5px;">
              <img src="${logoBase64String || Logo}" alt="Sri Devi Snacks Logo" style="width: 180px; height: auto; margin: 0 auto;" />
            </div>

            <div class="company-name">Sri Devi Snacks</div>
            <div class="company-address">128 C Santhanamari Amman Kovil Street</div>
            <div class="company-city">Vallioor, Tirunelveli-627117</div>
            <div class="bill-no"><strong>Bill No:</strong> ${bill.id}</div>
            <div class="shop-info"><strong>Shop:</strong> ${bill.shop_name}</div>
            <div class="shop-gst"><strong>Shop GST No:</strong> ${shopGstNo || 'N/A'}</div>
            <div class="bill-date"><strong>Date:</strong> ${formatDateWithDay(bill.bill_date)}</div>
            <div class="dashed-line"></div>

            <table class="bill-items">
              <thead>
                <tr>
                  <th style="text-align: left; width: 26%;">Product Name</th>
                  <th style="text-align: right; width: 9%;">QTY</th>
                  <th style="text-align: right; width: 13%;">Price</th>
                  <th style="text-align: right; width: 11%;">SGST</th>
                  <th style="text-align: right; width: 11%;">CGST</th>
                  <th style="text-align: right; width: 16%;">Price+GST</th>
                  <th style="text-align: right; width: 14%;">Total</th>
                </tr>
              </thead>
              <tbody>
        `);

        // Regular items
        bill.items.filter((item: any) => item.quantity > 0).forEach((item: any) => {
          const qty = item.quantity;
          const sgstVal = item.sgst || 0;
          const cgstVal = item.cgst || 0;
          const unitPriceInclGst = qty > 0 ? (item.price + (sgstVal + cgstVal) / qty) : item.price;
          const totalInclGst = item.amount + sgstVal + cgstVal;
          win.document.write(`
            <tr>
              <td class="product-name-cell" style="text-align: left;">${item.product_name}</td>
              <td style="text-align: right;">${qty}</td>
              <td style="text-align: right;">${item.price.toFixed(2)}</td>
              <td style="text-align: right;">${sgstVal.toFixed(2)}</td>
              <td style="text-align: right;">${cgstVal.toFixed(2)}</td>
              <td style="text-align: right;">${unitPriceInclGst.toFixed(2)}</td>
              <td style="text-align: right;">${totalInclGst.toFixed(2)}</td>
            </tr>
          `);
        });

        // Return items
        const returnItems = bill.items.filter((item: any) => item.quantity < 0);
        if (returnItems.length > 0) {
          win.document.write(`
            <tr style="font-weight: bold; background-color: #f8f9fa;">
              <td colspan="7">Return Items</td>
            </tr>
          `);
          returnItems.forEach((item: any) => {
            const qty = Math.abs(item.quantity);
            const sgstVal = item.sgst || 0;
            const cgstVal = item.cgst || 0;
            const unitPriceInclGst = qty > 0 ? (item.price + Math.abs(sgstVal + cgstVal) / qty) : item.price;
            const totalInclGst = Math.abs(item.amount + sgstVal + cgstVal);
            win.document.write(`
              <tr style="color: #dc2626;">
                <td class="product-name-cell" style="text-align: left;">${item.product_name} (Return)</td>
                <td style="text-align: right;">-${qty}</td>
                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                <td style="text-align: right;">-${Math.abs(sgstVal).toFixed(2)}</td>
                <td style="text-align: right;">-${Math.abs(cgstVal).toFixed(2)}</td>
                <td style="text-align: right;">${unitPriceInclGst.toFixed(2)}</td>
                <td style="text-align: right;">-${totalInclGst.toFixed(2)}</td>
              </tr>
            `);
          });
        }

        // Calculate table totals
        const totalQty = bill.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const totalSgst = bill.items.reduce((sum: number, item: any) => sum + (item.sgst || 0), 0);
        const totalCgst = bill.items.reduce((sum: number, item: any) => sum + (item.cgst || 0), 0);

        win.document.write(`
              <tr style="border: none !important;">
                <td colspan="7" style="border: none !important; height: 8px; padding: 0;"></td>
              </tr>
              <tr style="font-weight: bold; background-color: #f8f9fa;">
                <td class="product-name-cell" style="text-align: left;">Total</td>
                <td style="text-align: right;">${totalQty}</td>
                <td style="text-align: right;"></td>
                <td style="text-align: right;">${totalSgst.toFixed(2)}</td>
                <td style="text-align: right;">${totalCgst.toFixed(2)}</td>
                <td style="text-align: right;"></td>
                <td style="text-align: right;"></td>
              </tr>
              </tbody>
            </table>

            <div class="bill-totals">
              <div class="double-dark-line"></div>
              <div class="total-row">
                <div>Item Total (Without GST):</div>
                <div>${itemTotal.toFixed(2)}</div>
              </div>
              <div class="total-row">
                <div>GST:</div>
                <div>${(sgst + cgst).toFixed(2)}</div>
              </div>
              <div class="total-row">
                <div>Today Total Amount:</div>
                <div>${(itemTotal + sgst + cgst).toFixed(2)}</div>
              </div>
        `);

        if (previousPending > 0) {
          win.document.write(`
            <div class="total-row">
              <div>Previous Pending:</div>
              <div>${previousPending.toFixed(2)}</div>
            </div>
          `);
        }

        win.document.write(`
              <div class="total-row">
                <div>Discount:</div>
                <div>${discount.toFixed(2)}</div>
              </div>
              <div class="dark-line"></div>
              <div class="total-row final-total-row">
                <div>Final Total:</div>
                <div>${finalTotal.toFixed(2)}</div>
              </div>
              
              <div class="payment-details">
                <div class="total-row">
                  <div>Received Amount:</div>
                  <div>${bill.received_amount.toFixed(2)}</div>
                </div>
                <div class="total-row">
                  <div>Pending Amount:</div>
                  <div class="${bill.pending_amount > 0 ? 'status-pending' : ''}">${bill.pending_amount.toFixed(2)}</div>
                </div>
                <div class="total-row">
                  <div>Status:</div>
                  <div class="${bill.status === 'COMPLETED' ? 'status-completed' : 'status-pending'}" style="font-weight: bold;">
                    ${bill.status}
                  </div>
                </div>
              </div>
        `);

        if (signatureData[bill.id]) {
          win.document.write(`
            <div style="margin-top: 15px; text-align: right;">
              <div style="font-size: 12px; margin-bottom: 5px; color: #666;">Customer Signature:</div>
              <img src="${signatureData[bill.id]}" style="max-height: 50px; border-bottom: 1px solid #ccc;" />
            </div>
          `);
        }

        win.document.write(`
              <div class="thank-you">
                <div class="dashed-line"></div>
                <div>Thank you – Visit Again!</div>
                <div class="dashed-line"></div>
              </div>
            </div>
          </div>
        `);
      });

      win.document.write(`
        </body>
        </html>
      `);

      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 500);
    };

    // Group bills by financial year and month
    const groupedBills = React.useMemo(() => {
      const grouped: { [key: string]: { [key: string]: Bill[] } } = {};

      bills.forEach(bill => {
        const financialYear = getFinancialYear(bill.bill_date);
        const monthName = getMonthName(bill.bill_date);

        if (!grouped[financialYear]) {
          grouped[financialYear] = {};
        }

        if (!grouped[financialYear][monthName]) {
          grouped[financialYear][monthName] = [];
        }

        grouped[financialYear][monthName].push(bill);
      });

      return grouped;
    }, [bills]);

    // Calculate month pagination data
    const monthPaginationData = React.useMemo(() => {
      if (!selectedMonth) return null;

      const { financialYear, monthName } = selectedMonth;
      const monthBills = groupedBills[financialYear]?.[monthName] || [];

      // Sort bills by date (most recent first)
      const sortedMonthBills = monthBills
        .slice()
        .sort((a, b) => {
          return new Date(b.bill_date).getTime() - new Date(a.bill_date).getTime();
        });

      const monthTotalItems = sortedMonthBills.length;
      const monthStartIndex = (monthCurrentPage - 1) * monthItemsPerPage;
      const monthEndIndex = monthStartIndex + monthItemsPerPage;
      const paginatedMonthBills = sortedMonthBills.slice(monthStartIndex, monthEndIndex);

      // Calculate total bills in the financial year
      const financialYearBills = Object.values(groupedBills[financialYear] || {}).flat();
      const financialYearBillCount = financialYearBills.length;

      return {
        sortedMonthBills,
        paginatedMonthBills,
        monthTotalItems,
        financialYearBillCount
      };
    }, [selectedMonth, groupedBills, monthCurrentPage, monthItemsPerPage]);

    // Update month total pages when month pagination data changes
    React.useEffect(() => {
      if (monthPaginationData) {
        const newMonthTotalPages = Math.ceil(monthPaginationData.monthTotalItems / monthItemsPerPage);
        setMonthTotalPages(newMonthTotalPages);
        // Reset to first page if current page exceeds total pages
        if (monthCurrentPage > newMonthTotalPages && newMonthTotalPages > 0) {
          setMonthCurrentPage(1);
        }
      }
    }, [monthPaginationData?.monthTotalItems, monthCurrentPage, monthItemsPerPage]);

    const handlePageChange = (page: number) => {
      setCurrentPage(page);
    };

    const handleMonthPageChange = (page: number) => {
      setMonthCurrentPage(page);
    };

    // Signature functions
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    const clearSignature = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const saveSignature = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dataURL = canvas.toDataURL('image/png');

      if (signatureTargetBillId === 'NEW_PENDING') {
        setShowSignatureModal(false);
        setSignatureTargetBillId(null);
        await handleSaveBill(true, dataURL);
      } else {
        const targetId = signatureTargetBillId || (selectedBillForView ? selectedBillForView.id : null);

        if (targetId) {
          try {
            // Save to database
            await billsAPI.updateSignature(parseInt(targetId), dataURL);

            // Update local state
            setSignatureData(prev => ({
              ...prev,
              [targetId]: dataURL
            }));

            console.log('Signature saved for bill:', targetId);
          } catch (error) {
            console.error('Failed to save signature:', error);
            alert('Failed to save signature. Please try again.');
          }
        }

        setShowSignatureModal(false);
        setSignatureTargetBillId(null);
      }
    };

    // Initialize canvas when modal opens and manage background scrolling
    React.useEffect(() => {
      if (showSignatureModal) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }

      if (showSignatureModal && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }

        // Prevent scrolling when drawing on touch devices
        const preventDefault = (e: TouchEvent) => {
          if (e.target === canvas) {
            e.preventDefault();
          }
        };

        canvas.addEventListener('touchstart', preventDefault, { passive: false });
        canvas.addEventListener('touchmove', preventDefault, { passive: false });
        canvas.addEventListener('touchend', preventDefault, { passive: false });

        return () => {
          document.body.style.overflow = '';
          canvas.removeEventListener('touchstart', preventDefault);
          canvas.removeEventListener('touchmove', preventDefault);
          canvas.removeEventListener('touchend', preventDefault);
        };
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [showSignatureModal]);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Billing System</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <p className="text-gray-600 text-sm">Create bills and process returns for shops</p>
              {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                <>
                  <span className="text-gray-300 hidden sm:inline">|</span>
                  <label className="inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useRawBT}
                      onChange={(e) => setUseRawBT(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ms-2 text-xs font-semibold text-gray-700">Use RawBT Printer</span>
                  </label>
                </>
              )}
            </div>
          </div>
          <div className="flex space-x-3">

            {/* Create Bill Button */}
            {!showBillingInterface && (
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                    const defaultDay = daysOfWeek.includes(todayDay) ? todayDay : 'Monday';
                    setSelectedDay(defaultDay);
                    setIsShopDropdownOpen(true);
                    
                    setShowBillingInterface(true);
                    setIsPayPendingMode(false);
                    setPendingPaymentAmount(0);
                    setIsPaymentBillMode(false);
                    setPaymentCompleted(false);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  Create Bill
                </button>

                {/* <button
              onClick={() => {
                setShowBillingInterface(true);
                setIsPayPendingMode(false);
                setPendingPaymentAmount(0);
                setIsPaymentBillMode(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Only
            </button> */}
              </div>
            )}
            <button
              onClick={handleShowReturns}
              disabled={!selectedShop || isPayPendingMode}
              className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Returns
            </button>
            <button
              onClick={() => setShowDraftsModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Drafts ({Object.keys(drafts).length})
            </button>
            { /* Remove Pay with GPay button here as per feedback */}


          </div>
        </div>


        {/* Saved Bills List - Month-wise Cards */}
        {!showBillingInterface && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Saved Bills</h3>
                {selectedMonth && (
                  <button
                    onClick={() => setSelectedMonth(null)}
                    className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    ← Back to Months
                  </button>
                )}
              </div>
            </div>

            {(() => {
              // Sort financial years in descending order
              const sortedFinancialYears = Object.keys(groupedBills).sort((a, b) => {
                const [aStart] = a.split('-').map(Number);
                const [bStart] = b.split('-').map(Number);
                return bStart - aStart;
              });

              // If a specific month is selected, show bills for that month
              if (selectedMonth && monthPaginationData) {
                const { financialYear, monthName } = selectedMonth;
                const { paginatedMonthBills, sortedMonthBills } = monthPaginationData;

                return (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {monthName} {financialYear}
                      </h4>

                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={paginatedMonthBills.length > 0 && paginatedMonthBills.every(b => selectedBillIds.includes(b.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newSelections = paginatedMonthBills.map(b => b.id);
                                setSelectedBillIds(prev => Array.from(new Set([...prev, ...newSelections])));
                              } else {
                                const visibleIds = paginatedMonthBills.map(b => b.id);
                                setSelectedBillIds(prev => prev.filter(id => !visibleIds.includes(id)));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700">Select All on Page</span>
                        </div>

                        <div className="flex space-x-2">
                          {sortedMonthBills.length > 0 && (
                            <button
                              onClick={() => handlePrintMultiple(sortedMonthBills.map(b => b.id))}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
                            >
                              <Receipt className="h-3.5 w-3.5 mr-1" />
                              Print Whole Month ({sortedMonthBills.length})
                            </button>
                          )}
                          {selectedBillIds.length > 0 && (
                            <button
                              onClick={() => handlePrintMultiple(selectedBillIds)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition"
                            >
                              <Receipt className="h-3.5 w-3.5 mr-1" />
                              Print Selected ({selectedBillIds.length})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {paginatedMonthBills.map((bill) => (
                        <div key={bill.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex items-start">
                          <div className="pt-1 pr-3">
                            <input
                              type="checkbox"
                              checked={selectedBillIds.includes(bill.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBillIds(prev => [...prev, bill.id]);
                                } else {
                                  setSelectedBillIds(prev => prev.filter(id => id !== bill.id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-medium text-sm text-gray-900">{bill.id}</p>
                                <p className="text-sm font-semibold text-gray-900">{bill.shop_name}</p>
                                <p className="text-xs text-gray-500">{new Date(bill.bill_date).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm">₹{bill.pending_amount.toFixed(2)}</p>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${bill.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                                  }`}>
                                  {bill.status}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between text-xs text-gray-600 mb-3">
                              <span>Received: ₹{bill.received_amount.toFixed(2)}</span>
                              <span>Pending: ₹{bill.pending_amount.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between space-x-3">
                              <button
                                onClick={() => setSelectedBillForView(bill)}
                                className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </button>
                              {bill.status !== 'COMPLETED' && (
                                <button
                                  onClick={() => {
                                    setCurrentBillForPayment(bill);
                                    setShowGPayQR(true);
                                  }}
                                  className="inline-flex items-center px-3 py-1 text-sm text-purple-600 hover:text-purple-800"
                                >
                                  Pay with GPay
                                </button>
                              )}
                              {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete Bill ${bill.id}? This will restore the product stock.`)) {
                                      try {
                                        await deleteBill(bill.id);
                                        alert('Bill deleted successfully');
                                        setRefreshTrigger(prev => prev + 1);
                                      } catch (err: any) {
                                        alert(`Failed to delete bill: ${err.message || 'Unknown error'}`);
                                      }
                                    }
                                  }}
                                  className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 font-semibold"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {sortedMonthBills.length === 0 && (
                        <div className="text-center py-8">
                          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-sm text-gray-500">No bills found for {monthName} {financialYear}</p>
                        </div>
                      )}
                    </div>

                    {/* Pagination for month bills */}
                    {monthPaginationData?.financialYearBillCount > 5 && (
                      <div className="mt-6">
                        <Pagination
                          currentPage={monthCurrentPage}
                          totalPages={monthTotalPages}
                          onPageChange={handleMonthPageChange}
                        />
                      </div>
                    )}
                  </div>
                );
              }

              // Show month cards overview
              return (
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
                          .map(([monthName, monthBills]) => (
                            <div
                              key={monthName}
                              className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => setSelectedMonth({ financialYear, monthName })}
                            >
                              <div className="flex justify-between items-center mb-3">
                                <h5 className="font-semibold text-gray-800">{monthName}</h5>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                                  {monthBills.length} bill{monthBills.length !== 1 ? 's' : ''}
                                </span>
                              </div>

                              {userRole !== 'STAFF' && (
                                <div className="text-sm text-gray-600">
                                  <p>Total: ₹{monthBills.reduce((sum, bill) => sum + bill.total_amount, 0).toFixed(2)}</p>
                                  <p>Pending: ₹{monthBills.reduce((sum, bill) => sum + bill.pending_amount, 0).toFixed(2)}</p>
                                </div>
                              )}

                              <div className="mt-3 text-xs text-gray-500">
                                Click to view all bills
                              </div>
                            </div>
                          ))
                        }
                      </div>

                      {Object.keys(groupedBills[financialYear]).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-8">No bills for financial year {financialYear}</p>
                      )}
                    </div>
                  ))}

                  {sortedFinancialYears.length === 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                      <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Saved Bills</h4>
                      <p className="text-gray-500">Create bills to see them organized here by month and financial year</p>
                    </div>
                  )}
                </div>
              );
            })()}


          </div>
        )}

        {/* Enhanced Pending Bill Alert */}
        {showPendingBillAlert && pendingBills.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-yellow-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-red-800">
                    Outstanding Balance Alert
                  </h3>
                  <button
                    onClick={() => setShowPendingBillAlert(false)}
                    className="ml-4 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">{currentShop?.shop_name}</span> has{' '}
                    <span className="font-semibold">{pendingBills.length} pending bill{pendingBills.length > 1 ? 's' : ''}</span>{' '}
                    with a total outstanding balance of{' '}
                    <span className="font-bold text-lg">₹{pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showBillingInterface && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Day and Shop Selection */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isPaymentBillMode ? 'Payment Bill Setup' : 'Select Day & Shop'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowBillingInterface(false);
                      setIsPaymentBillMode(false);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Back to Bills
                  </button>
                </div>
                <div className="space-y-4">
                  {/* Day Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose Day (கிழமைகள்)
                    </label>
                    <select
                      ref={daySelectRef}
                      value={selectedDay || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleDaySelect(value || null);
                      }}
                      className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a day...</option>
                      {daysOfWeek.map(day => {
                        const dayLabels: { [key: string]: string } = {
                          'Monday': 'திங்கள் (Monday)',
                          'Tuesday': 'செவ்வாய் (Tuesday)',
                          'Wednesday': 'புதன் (Wednesday)',
                          'Thursday': 'வியாழன் (Thursday)',
                          'Friday': 'வெள்ளி (Friday)',
                          'Saturday': 'சனி (Saturday)',
                        };
                        return (
                          <option key={day} value={day}>
                            {dayLabels[day] || day}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Shop Selection */}
                  {selectedDay && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Choose Shop (கடையைத் தேர்ந்தெடுக்கவும்) ({selectedDay})
                      </label>
                      <div className="relative">
                        {isShopDropdownOpen && (
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsShopDropdownOpen(false)}
                          />
                        )}

                        <button
                          type="button"
                          disabled={!selectedDay}
                          onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                          className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-900 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left relative z-10 text-lg md:text-sm disabled:opacity-50"
                        >
                          <span className={currentShop ? "text-gray-900 font-medium" : "text-gray-500"}>
                            {currentShop ? currentShop.shop_name : "Select a shop..."}
                          </span>
                          <span className="ml-2 text-gray-500 text-xs">▼</span>
                        </button>

                        {isShopDropdownOpen && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-[350px] overflow-y-auto">
                            <div className="divide-y divide-gray-100">
                              {Object.entries(groupedShops).map(([address, shopList]) => (
                                <div key={address} className="bg-gray-50">
                                  {/* Group header - Blue and Bold on all views */}
                                  <div className="px-4 py-2 text-lg md:text-sm font-bold text-blue-700 bg-blue-50 border-y border-blue-100">
                                    {address}
                                  </div>
                                  <div className="bg-white divide-y divide-gray-100">
                                    {shopList.map(shop => (
                                      <button
                                        key={shop.id}
                                        type="button"
                                        onClick={() => {
                                          handleShopSelect(shop.id);
                                          setIsShopDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center px-4 py-3 md:py-2.5 hover:bg-blue-50 transition text-left text-base md:text-sm text-gray-800 font-normal"
                                      >
                                        {shop.shop_name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {shops.length === 0 && selectedDay && (
                        <p className="text-sm text-red-600 mt-1">
                          No shops assigned to {selectedDay}. Please assign shops in Schedule.
                        </p>
                      )}
                    </div>
                  )}

                  {selectedShop && (
                    <div className={`p-4 rounded-lg ${isPaymentBillMode ? 'bg-green-50' : 'bg-blue-50'}`}>
                      <h4 className={`font-medium ${isPaymentBillMode ? 'text-green-900' : 'text-blue-900'}`}>
                        {isPaymentBillMode ? 'Payment Setup' : 'Selected Shop'}
                      </h4>
                      <p className={`${isPaymentBillMode ? 'text-green-700' : 'text-blue-700'}`}>
                        {currentShop?.shop_name}
                      </p>

                      {isPaymentBillMode ? (
                        <>
                          {pendingBills.length > 0 ? (
                            <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                              <p className="text-yellow-800 text-sm font-medium">
                                Total Pending Balance: ₹{pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0).toFixed(2)}
                              </p>
                              <p className="text-yellow-700 text-xs">
                                {pendingBills.length} pending bill{pendingBills.length > 1 ? 's' : ''} (oldest: {pendingBills[0].id})
                              </p>
                            </div>
                          ) : (
                            <div className="mt-3 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                              <p className="text-gray-800 text-sm font-medium">
                                No Pending Bills
                              </p>
                              <p className="text-gray-700 text-xs">
                                This shop has no outstanding balances to pay.
                              </p>
                            </div>
                          )}

                          {/* Payment Amount Input */}
                          <div className="mt-4">
                            <label htmlFor="receivedAmount" className="block text-sm font-medium text-gray-700 mb-1">
                              Payment Amount
                            </label>
                            <input
                              type="number"
                              id="receivedAmount"
                              min="0"
                              max={pendingBills.length > 0 ? pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0) : undefined}
                              value={receivedAmount}
                              placeholder="0"
                              onChange={(e) => setReceivedAmount(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              disabled={pendingBills.length === 0}
                            />
                            {pendingBills.length === 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                No pending bills to pay
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {pendingBills.length > 0 && !isPayPendingMode && (
                            <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                              <p className="text-yellow-800 text-sm font-medium">
                                Total Pending Balance: ₹{pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0).toFixed(2)}
                              </p>
                              <p className="text-yellow-700 text-xs">
                                {pendingBills.length} pending bill{pendingBills.length > 1 ? 's' : ''} (oldest: {pendingBills[0].id})
                              </p>
                            </div>
                          )}

                          {!isPayPendingMode && (
                            <>
                              <p className="text-blue-600 text-sm mt-2">Total Items: {currentBill.length}</p>
                              <p className="text-blue-600 text-sm">Total Amount: ₹{
                                (
                                  currentBill.reduce((sum, item) => sum + item.amount + (item.sgst || 0) + (item.cgst || 0), 0) +
                                  pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0)
                                ).toFixed(2)
                              }</p>
                            </>
                          )}
                        </>
                      )}

                      {isPayPendingMode && pendingBills.length > 0 && (
                        <>
                          <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                            <p className="text-orange-800 text-sm font-medium">
                              Paying Pending Balance
                            </p>
                            <p className="text-orange-700 text-xs">
                              {pendingBills.length} pending bill{pendingBills.length > 1 ? 's' : ''} - Total ₹{pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0)} due
                            </p>
                          </div>

                          {/* Pending Payment Amount Input */}
                          <div className="mt-4">
                            <label htmlFor="pendingPaymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                              Payment Amount
                            </label>
                            <input
                              type="number"
                              id="pendingPaymentAmount"
                              min="0"
                              max={pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0)}
                              value={pendingPaymentAmount.toString()}
                              onChange={(e) => setPendingPaymentAmount(parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter payment amount"
                            />
                          </div>

                          <button
                            onClick={handlePayPending}
                            disabled={pendingPaymentAmount <= 0}
                            className="w-full mt-3 inline-flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition"
                          >
                            Pay Pending ₹{pendingPaymentAmount > 0 ? pendingPaymentAmount.toFixed(2) : pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0).toFixed(2)}
                          </button>

                          <button
                            onClick={() => setIsPayPendingMode(false)}
                            className="w-full mt-2 inline-flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition"
                          >
                            Cancel Payment
                          </button>
                        </>
                      )}

                      {pendingBills.length > 0 && !isPayPendingMode && currentBill.length === 0 && (
                        <button
                          onClick={() => setIsPayPendingMode(true)}
                          className="w-full mt-3 inline-flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition"
                        >
                          Pay Pending ₹{pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0).toFixed(2)}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Product Form - Only show in normal bill mode */}
              {selectedShop && !isPayPendingMode && !isPaymentBillMode && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Product</h3>
                  <form onSubmit={handleAddProduct} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product (பொருள்)
                      </label>
                      {/* Custom Searchable Dropdown with Images */}
                      <div className="relative">
                        {isDropdownOpen && (
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => {
                              setIsDropdownOpen(false);
                              setDropdownSearch('');
                            }}
                          />
                        )}
                        
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full flex items-center justify-between px-6 py-5 md:px-3 md:py-2 border-2 border-gray-900 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left relative z-10 text-xl md:text-sm"
                        >
                          <div className="flex items-center space-x-3">
                            {selectedProductDetails ? (
                              <>
                                <div className="h-12 w-12 md:h-6 md:w-6 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {selectedProductDetails.image || productImages[selectedProductDetails.product_id] || productImages[selectedProductDetails.product_name] ? (
                                    <img
                                      src={selectedProductDetails.image || productImages[selectedProductDetails.product_id] || productImages[selectedProductDetails.product_name]}
                                      alt={selectedProductDetails.product_name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <Package className="h-8 w-8 md:h-4 md:w-4 text-gray-400" />
                                  )}
                                </div>
                                <span className="text-gray-900 font-bold md:font-medium text-xl md:text-sm">{selectedProductDetails.product_name}</span>
                              </>
                            ) : (
                              <span className="text-gray-500 text-xl md:text-sm">Select a product...</span>
                            )}
                          </div>
                          <span className="ml-2 text-gray-500 text-xs">▼</span>
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute z-50 bottom-full mb-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-[60vh] md:max-h-[450px] overflow-y-auto">
                            <div className="divide-y divide-gray-100">
                              {filteredProductsForDropdown.length === 0 ? (
                                <div className="p-3 text-sm text-gray-500 text-center">No products found</div>
                              ) : (
                                filteredProductsForDropdown.map(product => (
                                  <button
                                    key={product.product_id}
                                    type="button"
                                    onClick={() => {
                                      setProductForm({ ...productForm, product_id: product.product_id.toString() });
                                      setIsDropdownOpen(false);
                                      setDropdownSearch('');
                                      setTimeout(() => {
                                        quantityInputRef.current?.focus();
                                        quantityInputRef.current?.select();
                                      }, 50);
                                    }}
                                    className="w-full flex items-center px-6 py-5.5 md:px-3 md:py-2 hover:bg-blue-50 transition text-left"
                                  >
                                    <div className="h-20 w-20 md:h-8 md:w-8 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 mr-4">
                                      {product.image || productImages[product.product_id] || productImages[product.product_name] ? (
                                        <img
                                          src={product.image || productImages[product.product_id] || productImages[product.product_name]}
                                          alt={product.product_name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <Package className="h-12 w-12 md:h-5 md:w-5 text-gray-400" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-2xl md:text-sm font-bold md:font-medium text-gray-900 truncate">{product.product_name}</p>
                                      <p className="text-lg md:text-xs text-gray-500 truncate mt-1">
                                        ₹{product.price} / {product.unit} • Stock: {product.stock_quantity}
                                      </p>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity (எண்ணிக்கை)
                      </label>
                      <input
                        ref={quantityInputRef}
                        type="number"
                        min="1"
                        placeholder="1"
                        value={productForm.quantity}
                        onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add to Bill
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Current Bill / Payment Bill */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isPaymentBillMode ? 'Payment Bill' : isPayPendingMode ? 'Pending Payment' : 'Current Bill'}
                    </h3>
                    {currentBill.length > 0 && !isPayPendingMode && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            if (confirm('Clear current bill?')) {
                              setCurrentBill([]);
                              setSelectedShop(null);
                              setReceivedAmount("0");
                              setHasPrinted(false); // Reset print status when bill is cleared
                            }
                          }}
                          className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear All
                        </button>
                        <button
                          onClick={() => {
                            const printContent = document.getElementById('current-bill-to-print');
                            if (printContent) {
                              let htmlContent = '';
                              const win = {
                                document: {
                                  write: (content: string) => {
                                    htmlContent += content;
                                  },
                                  close: () => {}
                                },
                                print: (callback?: () => void) => {
                                  printHtml(htmlContent, callback);
                                },
                                close: () => {}
                              };
                              if (win) {
                                const shopName = currentShop?.shop_name || 'Shop';
                                const billDate = new Date().toLocaleDateString();

                                win.document.write(`
                                    <html>
                                    <head>
                                      <title>Bill - ${shopName}</title>
                                      <style>
                                        * {
                                          font-weight: bold !important;
                                        }
                                        @page {
                                          size: 80mm auto;
                                          margin: 0;
                                        }
                                        body {
                                          font-family: Arial, Helvetica, sans-serif;
                                          margin: 0;
                                          padding: 2mm 0mm;
                                          width: 80mm;
                                          box-sizing: border-box;
                                          line-height: 1.3;
                                          font-size: 17px;
                                        }
                                        .hsn-col { display: none; }
                                        .qty-col {
                                          border-right: 1px solid #000 !important;
                                          padding-right: 8px !important;
                                        }
                                        .price-col {
                                          border-right: 1px solid #000 !important;
                                          padding-right: 8px !important;
                                          padding-left: 8px !important;
                                        }
                                        .rupee {
                                          color: #666 !important;
                                          font-weight: normal !important;
                                        }
                                        .bill-header {
                                          margin-bottom: 10px;
                                        }
                                        .header-row {
                                          display: flex;
                                          justify-content: space-between;
                                          margin-bottom: 10px;
                                          font-size: 15px;
                                        }
                                        .company-name {
                                          font-size: 28px;
                                          font-weight: bold;
                                          text-align: center;
                                          margin-bottom: 5px;
                                        }
                                        .company-address {
                                          text-align: center;
                                          font-size: 15px;
                                          margin-bottom: 3px;
                                        }
                                        .company-city {
                                          text-align: center;
                                          font-size: 15px;
                                          margin-bottom: 10px;
                                        }
                                        .shop-info, .shop-gst, .bill-no, .bill-date {
                                          margin-bottom: 5px;
                                          font-size: 15px;
                                        }
                                        .bill-items {
                                          width: 100%;
                                          table-layout: fixed;
                                          border-collapse: collapse;
                                          margin-bottom: 15px;
                                        }
                                        .bill-items th {
                                          font-size: 13px !important;
                                          padding: 4px 1px;
                                          text-align: left;
                                          border: 1px solid #ccc;
                                          background-color: #f8f9fa;
                                          font-weight: bold;
                                          word-wrap: break-word;
                                          overflow-wrap: break-word;
                                          white-space: normal;
                                        }
                                        .bill-items td {
                                          font-size: 15px !important;
                                          padding: 4px 1px;
                                          text-align: left;
                                          border: 1px solid #ccc;
                                          word-wrap: break-word;
                                          overflow-wrap: break-word;
                                          white-space: normal;
                                        }
                                        .product-name-cell {
                                          font-size: 18px !important;
                                          font-weight: bold !important;
                                        }
                                        .bill-totals {
                                          width: 100%;
                                          margin-top: 10px;
                                        }
                                        .total-row {
                                          display: flex;
                                          justify-content: space-between;
                                          padding: 3px 0;
                                          font-size: 15px;
                                        }
                                        .final-total-row {
                                          font-size: 28px !important;
                                          font-weight: bold !important;
                                          padding: 5px 0;
                                        }
                                        .final-total-row div {
                                          font-size: 28px !important;
                                          font-weight: bold !important;
                                        }
                                        .dashed-line {
                                          border-bottom: 1px dashed #000;
                                          margin: 8px 0;
                                        }
                                        .double-dark-line {
                                          border-top: 3px double #000;
                                          margin: 8px 0;
                                        }
                                        .dark-line {
                                          border-top: 2px solid #000;
                                          margin: 8px 0;
                                        }
                                        .thank-you {
                                          text-align: center;
                                          margin-top: 15px;
                                          font-weight: bold;
                                          font-size: 17px;
                                        }
                                        @media print {
                                          body { margin: 0; padding: 2mm 0mm; width: 80mm; }
                                          .bill-header { margin-bottom: 10px; }
                                          .company-name { font-size: 28px; }
                                        }
                                      </style>
                                    </head>
                                    <body>
                                    <div class="bill-header" style="text-align:center; margin-bottom:5px;">
    <div style="font-size:18px; font-weight:bold;">
      "ஸ்ரீ தேவி சந்தன மாரியம்மன் துணை"
    </div>
  </div>

                                        <div class="header-row">
                                          <div>GST No: 33BAPPS2831B2ZU</div>
                                          <div>Mobile: 8807810021</div>
                                        </div>

                                        <div style="text-align:center; margin-bottom:5px;">
                                          <img src="${logoBase64String || Logo}" alt="Sri Devi Snacks Logo" style="width: 180px; height: auto; margin: 0 auto;" />
                                        </div>

                                        <div class="company-name">Sri Devi Snacks</div>
                                        <div class="company-address">128 C Santhanamari Amman Kovil Street</div>
                                        <div class="company-city">Vallioor, Tirunelveli-627117</div>
                                        <div class="bill-no"><strong>Bill No:</strong> ${`B${String(bills.length + 1).padStart(3, '0')}`}</div>
                                        <div class="shop-info"><strong>Shop:</strong> ${shopName}</div>
                                        <div class="shop-gst"><strong>Shop GST No:</strong> ${currentShop?.gst || ''}</div>
                                        <div class="bill-date"><strong>Date:</strong> ${formatDateWithDay(new Date())}</div>
                                        <div class="dashed-line"></div>
                                      </div>
                                  `);

                                // Add bill items
                                win.document.write(`
                                    <table class="bill-items">
                                      <thead>
                                        <tr>
                                          <th style="text-align: left; width: 26%;">Product Name</th>
                                          <th style="text-align: right; width: 9%;">QTY</th>
                                          <th style="text-align: right; width: 13%;">Price</th>
                                          <th style="text-align: right; width: 11%;">SGST</th>
                                          <th style="text-align: right; width: 11%;">CGST</th>
                                          <th style="text-align: right; width: 16%;">Price+GST</th>
                                          <th style="text-align: right; width: 14%;">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                  `);

                                // Regular items
                                currentBill.filter(item => item.quantity > 0).forEach(item => {
                                  const qty = item.quantity;
                                  const sgstVal = item.sgst || 0;
                                  const cgstVal = item.cgst || 0;
                                  const unitPriceInclGst = qty > 0 ? (item.price + (sgstVal + cgstVal) / qty) : item.price;
                                  const totalInclGst = item.amount + sgstVal + cgstVal;
                                  win.document.write(`
                                      <tr>
                                        <td class="product-name-cell" style="text-align: left;">${item.product_name}</td>
                                        <td style="text-align: right;">${qty}</td>
                                        <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                        <td style="text-align: right;">${sgstVal.toFixed(2)}</td>
                                        <td style="text-align: right;">${cgstVal.toFixed(2)}</td>
                                        <td style="text-align: right;">${unitPriceInclGst.toFixed(2)}</td>
                                        <td style="text-align: right;">${totalInclGst.toFixed(2)}</td>
                                      </tr>
                                    `);
                                });

                                // Return items
                                if (currentBill.filter(item => item.quantity < 0).length > 0) {
                                  win.document.write(`
                              <tr><td colspan="7" style="padding-top: 15px; font-weight: bold;">Return Items</td></tr>
                            `);
                                  currentBill.filter(item => item.quantity < 0).forEach(item => {
                                    const qty = Math.abs(item.quantity);
                                    const sgstVal = item.sgst || 0;
                                    const cgstVal = item.cgst || 0;
                                    const unitPriceInclGst = qty > 0 ? (item.price + Math.abs(sgstVal + cgstVal) / qty) : item.price;
                                    const totalInclGst = Math.abs(item.amount + sgstVal + cgstVal);
                                    win.document.write(`
                                <tr>
                                  <td class="product-name-cell" style="text-align: left;">${item.product_name}</td>
                                  <td style="text-align: right;">-${qty}</td>
                                  <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                  <td style="text-align: right;">-${Math.abs(sgstVal).toFixed(2)}</td>
                                  <td style="text-align: right;">-${Math.abs(cgstVal).toFixed(2)}</td>
                                  <td style="text-align: right;">${unitPriceInclGst.toFixed(2)}</td>
                                  <td style="text-align: right;">-${totalInclGst.toFixed(2)}</td>
                                </tr>
                              `);
                                  });
                                }

                                // Calculate table totals
                                const totalQty = currentBill.reduce((sum, item) => sum + item.quantity, 0);
                                const totalSgst = currentBill.reduce((sum, item) => sum + (item.sgst || 0), 0);
                                const totalCgst = currentBill.reduce((sum, item) => sum + (item.cgst || 0), 0);

                                win.document.write(`
                                  <tr style="border: none !important;">
                                    <td colspan="7" style="border: none !important; height: 8px; padding: 0;"></td>
                                  </tr>
                                  <tr style="font-weight: bold; background-color: #f8f9fa;">
                                    <td class="product-name-cell" style="text-align: left;">Total</td>
                                    <td style="text-align: right;">${totalQty}</td>
                                    <td style="text-align: right;"></td>
                                    <td style="text-align: right;">${totalSgst.toFixed(2)}</td>
                                    <td style="text-align: right;">${totalCgst.toFixed(2)}</td>
                                    <td style="text-align: right;"></td>
                                    <td style="text-align: right;"></td>
                                  </tr>
                                `);

                                win.document.write('</tbody></table>');

                                // Add calculations
                                const itemTotal = currentBill.reduce((sum, item) => sum + item.amount, 0);
                                const sgst = currentBill.reduce((sum, item) => sum + (item.sgst || 0), 0);
                                const cgst = currentBill.reduce((sum, item) => sum + (item.cgst || 0), 0);
                                const pendingAmount = pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0);
                                
                                const rawTotal = itemTotal + sgst + cgst + pendingAmount;
                                const finalTotal = Math.floor(rawTotal);
                                const discount = rawTotal - finalTotal;

                                const gstTotal = sgst + cgst;
                                win.document.write(`
                                    <div class="bill-totals">
                                      <div class="double-dark-line"></div>
                                      <div class="total-row">
                                        <div>Item Total (Without GST):</div>
                                        <div>${itemTotal.toFixed(2)}</div>
                                      </div>
                                      <div class="total-row">
                                        <div>GST:</div>
                                        <div>${gstTotal.toFixed(2)}</div>
                                      </div>
                                      <div class="total-row">
                                        <div>Today Total Amount:</div>
                                        <div>${(itemTotal + gstTotal).toFixed(2)}</div>
                                      </div>
                                  `);

                                if (pendingAmount > 0) {
                                  win.document.write(`
                                      <div class="total-row">
                                        <div>Previous Pending:</div>
                                        <div>${pendingAmount.toFixed(2)}</div>
                                      </div>
                                    `);
                                }

                                win.document.write(`
                                      <div class="total-row">
                                        <div>Discount:</div>
                                        <div>${discount.toFixed(2)}</div>
                                      </div>
                                      <div class="dark-line"></div>
                                      <div class="total-row final-total-row">
                                        <div>Final Total:</div>
                                        <div>${finalTotal.toFixed(2)}</div>
                                      </div>
                                    </div>
                                    
                                    <div class="thank-you">
                                      <div class="dashed-line"></div>
                                      <div>Thank you – Visit Again!</div>
                                      <div class="dashed-line"></div>
                                    </div>
                                  </body>
                                  </html>
                                  `);

                                win.document.close();
                                setTimeout(() => {
                                  win.print(() => {
                                    setHasPrinted(true); // Mark that bill has been printed
                                    setShowSaveOptionsModal(true); // Open Save Options Modal
                                  });
                                }, 100);
                              }
                            }
                          }}
                          disabled={currentBill.length === 0}
                          className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold"
                        >
                          Print Bill
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isPaymentBillMode ? (
                  <div className="p-12 text-center">
                    <CreditCard className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Payment Bill</h3>
                    <p className="text-gray-500 mb-6">
                      {pendingBills.length > 0 ?
                        `Apply payment to ${pendingBills.length} pending bill${pendingBills.length > 1 ? 's' : ''} (₹${pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0)})` :
                        'No pending bills available for payment'
                      }
                    </p>

                    {pendingBills.length > 0 && (
                      <div className="max-w-md mx-auto">
                        <div className="bg-green-50 p-4 rounded-lg mb-4">
                          <h4 className="font-medium text-green-800 mb-2">Payment Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-green-700">Total Pending:</span>
                              <span className="font-semibold text-green-800">₹{pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-700">Payment Amount:</span>
                              <span className="font-semibold text-green-800">₹{parseFloat(receivedAmount || "0")}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-700">Remaining:</span>
                              <span className="font-semibold text-green-800">
                                ₹{Math.max(0, pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0) - parseFloat(receivedAmount || "0"))}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <h4 className="font-medium text-yellow-800 mb-2">Payment Instructions</h4>
                          <p className="text-sm text-yellow-700">
                            This will create a payment bill and automatically apply the payment to outstanding bills in order (oldest first).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : isPayPendingMode ? (
                  <div className="p-12 text-center">
                    <Receipt className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Paying Pending Balance</h3>
                    <p className="text-gray-500">
                      {pendingBills.length > 0 ?
                        `Processing payment for ${pendingBills.length} pending bill${pendingBills.length > 1 ? 's' : ''} (₹${pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0)})` :
                        'No pending bills selected'
                      }
                    </p>
                    <div className="mt-6 bg-orange-50 p-4 rounded-lg max-w-md mx-auto">
                      <h4 className="font-medium text-orange-800 mb-2">Payment Instructions</h4>
                      <p className="text-sm text-orange-700">
                        Enter the payment amount and click "Pay Pending" to apply the payment to the outstanding balance.
                        This will not create a new bill.
                      </p>
                    </div>
                  </div>
                ) : currentBill.length === 0 ? (
                  <div className="p-12 text-center">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No items in bill</h3>
                    <p className="text-gray-500">Add products to create a bill</p>
                  </div>
                ) : (
                  <div className="p-6">
                    {/* Professional Bill Header */}
                    <div id="current-bill-to-print" className="mb-6">
                      <div className="text-center text-lg font-semibold" style={{ fontSize: '10px' }}>"ஸ்ரீ தேவி சந்தன மாரியம்மன் துணை"</div>

                      {/* Top row with GST and Mobile */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="text-left">
                          <p className="text-sm font-medium">GST No: 33BAPPS2831B2ZU</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Mobile: 8807810021</p>
                        </div>
                      </div>

                      {/* Logo */}
                      <div className="text-center mb-1">
                        <img src={Logo} alt="Sri Devi Snacks Logo" className="mx-auto" style={{ width: '100px', height: 'auto' }} />
                      </div>

                      {/* Company Name */}
                      <div className="text-center mb-2">
                        <h1 className="text-2xl font-bold text-gray-900">Sri Devi Snacks</h1>
                      </div>

                      {/* Company Address */}
                      <div className="text-center mb-1">
                        <p className="text-sm text-gray-700">128 C Santhanamari Amman Kovil Street</p>
                      </div>

                      {/* Company City and PIN */}
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-700">Vallioor, Tirunelveli-627117</p>
                      </div>

                      {/* Selected Shop Details */}
                      {currentShop && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-700">
                            <span className="font-bold">Shop:</span>{" "}
                            <span className="font-bold">{currentShop.shop_name}</span>
                            {currentShop.address && (
                              <span className="font-bold"> - {currentShop.address}</span>
                            )}
                          </p>

                          <p className="text-sm text-gray-700">
                            <span className="font-bold">Shop GST No:</span>{" "}
                            <span className="font-bold">{currentShop.gst || "N/A"}</span>
                          </p>

                          <p className="text-sm text-gray-700">
                            <span className="font-bold">Date:</span> <span className="font-bold">{formatDateWithDay(new Date())}</span>
                          </p>
                        </div>
                      )}

                      <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
                    </div>

                    {/* Bill Items */}
                    <div className="mb-6 overflow-x-auto">
                      <table className="w-full text-sm border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100 font-bold border-b border-gray-300">
                            <th className="p-2 text-left border-r border-gray-300">Product Name</th>
                            <th className="p-2 text-right border-r border-gray-300">QTY</th>
                            <th className="p-2 text-right border-r border-gray-300">Price</th>
                            <th className="p-2 text-right border-r border-gray-300">SGST</th>
                            <th className="p-2 text-right border-r border-gray-300">CGST</th>
                            <th className="p-2 text-right border-r border-gray-300">Price+GST</th>
                            <th className="p-2 text-right border-r border-gray-300">Total</th>
                            <th className="p-2 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Regular Items */}
                          {currentBill.filter(item => !item.isReturn).map((item) => {
                            const sgstVal = item.sgst || 0;
                            const cgstVal = item.cgst || 0;
                            const unitPriceInclGst = item.quantity > 0 ? (item.price + (sgstVal + cgstVal) / item.quantity) : item.price;
                            const totalInclGst = item.amount + sgstVal + cgstVal;

                            return (
                              <tr key={`item-${item.id}`} className="border-b border-gray-300 hover:bg-gray-50">
                                <td className="p-2 text-left border-r border-gray-300">{item.product_name}</td>
                                <td className="p-2 text-right border-r border-gray-300">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity === 0 ? '' : item.quantity}
                                    onChange={(e) => handleQuantityChange(item.id, e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                    disabled={isPayPendingMode}
                                  />
                                </td>
                                <td className="p-2 text-right border-r border-gray-300">{item.price.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-gray-300">{sgstVal.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-gray-300">{cgstVal.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-gray-300">{unitPriceInclGst.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-gray-300">{totalInclGst.toFixed(2)}</td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Remove item"
                                    disabled={isPayPendingMode}
                                  >
                                    <Trash2 className="h-4 w-4 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Return Items Section Separator */}
                          {currentBill.filter(item => item.isReturn).length > 0 && (
                            <tr className="bg-gray-50 font-bold border-b border-gray-300">
                              <td colSpan={8} className="p-2 text-left text-red-600">Return Items</td>
                            </tr>
                          )}

                          {/* Return Items */}
                          {currentBill.filter(item => item.isReturn).map((item) => {
                            const qty = Math.abs(item.quantity);
                            const sgstVal = item.sgst || 0;
                            const cgstVal = item.cgst || 0;
                            const unitPriceInclGst = qty > 0 ? (item.price + Math.abs(sgstVal + cgstVal) / qty) : item.price;
                            const totalInclGst = Math.abs(item.amount + sgstVal + cgstVal);

                            return (
                              <tr key={`return-${item.id}`} className="border-b border-gray-300 hover:bg-gray-50 text-red-600">
                                <td className="p-2 text-left border-r border-gray-300">{item.product_name}</td>
                                <td className="p-2 text-right border-r border-gray-300">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity === 0 ? '' : Math.abs(item.quantity)}
                                    onChange={(e) => handleReturnItemQuantityChange(item.id, e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right text-red-600"
                                    disabled={isPayPendingMode}
                                  />
                                </td>
                                <td className="p-2 text-right border-r border-gray-300">{item.price.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-gray-300">-{Math.abs(sgstVal).toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-gray-300">-{Math.abs(cgstVal).toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-gray-300">{unitPriceInclGst.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-gray-300">-{totalInclGst.toFixed(2)}</td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Remove return item"
                                    disabled={isPayPendingMode}
                                  >
                                    <Trash2 className="h-4 w-4 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Table Totals Row inside table */}
                          {(() => {
                            const totalQty = currentBill.reduce((sum, item) => sum + item.quantity, 0);
                            const totalSgst = currentBill.reduce((sum, item) => sum + (item.sgst || 0), 0);
                            const totalCgst = currentBill.reduce((sum, item) => sum + (item.cgst || 0), 0);

                            return (
                              <>
                                <tr style={{ border: 'none' }}>
                                  <td colSpan={8} style={{ border: 'none', height: '8px', padding: 0 }}></td>
                                </tr>
                                <tr className="font-bold bg-gray-100 border-t border-b border-gray-300">
                                  <td className="p-2 text-left border-r border-gray-300">Total</td>
                                  <td className="p-2 text-right border-r border-gray-300">{totalQty}</td>
                                  <td className="p-2 text-right border-r border-gray-300"></td>
                                  <td className="p-2 text-right border-r border-gray-300">{totalSgst.toFixed(2)}</td>
                                  <td className="p-2 text-right border-r border-gray-300">{totalCgst.toFixed(2)}</td>
                                  <td className="p-2 text-right border-r border-gray-300"></td>
                                  <td className="p-2 text-right border-r border-gray-300"></td>
                                  <td className="p-2 border-l border-gray-300"></td>
                                </tr>
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Calculations */}
                    <div className="ml-auto w-64">
                      {(() => {
                        const itemTotal = currentBill.reduce((sum, item) => sum + item.amount, 0);
                        const sgst = currentBill.reduce((sum, item) => sum + (item.sgst || 0), 0);
                        const cgst = currentBill.reduce((sum, item) => sum + (item.cgst || 0), 0);
                        const gstTotal = sgst + cgst;
                        const todayTotalAmount = itemTotal + gstTotal;
                        const pendingAmount = pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0);
                        
                        const rawTotal = todayTotalAmount + pendingAmount;
                        const finalTotal = Math.floor(rawTotal);
                        const discount = rawTotal - finalTotal;

                        return (
                          <>
                            <div className="flex justify-between py-1">
                              <div>Item Total (Without GST):</div>
                              <div>{itemTotal.toFixed(2)}</div>
                            </div>

                            <div className="flex justify-between py-1">
                              <div>GST:</div>
                              <div>{gstTotal.toFixed(2)}</div>
                            </div>

                            <div className="flex justify-between py-1 font-semibold">
                              <div>Today Total Amount:</div>
                              <div>{todayTotalAmount.toFixed(2)}</div>
                            </div>

                            {/* Previous Pending Amount */}
                            {pendingAmount > 0 && (
                              <>
                                <div className="flex justify-between py-1">
                                  <div>Previous Pending:</div>
                                  <div>{pendingAmount.toFixed(2)}</div>
                                </div>
                                <div className="flex justify-between py-1 text-xs text-gray-500">
                                  <div>({pendingBills.length} pending bill{pendingBills.length > 1 ? 's' : ''})</div>
                                  <div></div>
                                </div>
                              </>
                            )}

                            <div className="flex justify-between py-1">
                              <div>Discount:</div>
                              <div>{discount.toFixed(2)}</div>
                            </div>

                            <div className="border-b-2 border-dashed border-gray-300 my-2"></div>

                            <div className="flex justify-between py-1 font-bold text-lg">
                              <div>Final Total:</div>
                              <div>{finalTotal.toFixed(2)}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Thank You Message */}
                    <div className="text-center mt-8">
                      <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
                      <div className="font-bold">Thank you – Visit Again!</div>
                      <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Return Modal */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-lg bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Process Returns</h3>
                  <button
                    onClick={() => setShowReturnModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    ×
                  </button>
                </div>
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Process Returns for {currentShop?.shop_name}</h4>
                </div>

                <div className="border-b-2 border-dashed border-gray-300 my-2"></div>

                {/* Return Items Input */}
                <div className="mb-4">
                  <div className="font-bold mb-2">Return Items</div>
                  <div className="border-b-2 border-dashed border-gray-300 my-2"></div>

                  {products.map((product) => {
                    const shopPricing = shopProducts.find(sp =>
                      sp.shop_id === selectedShop && sp.product_id === product.id
                    );
                    const price = shopPricing ? shopPricing.price : product.price;
                    const returnQuantity = returnQuantities[product.id] || '';
                    const returnQuantityNumber = parseInt(returnQuantity) || 0;
                    const returnAmount = returnQuantityNumber * price;

                    return (
                      <div key={`return-input-${product.id}`} className="grid grid-cols-4 gap-4 py-2 items-center">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {product.image || productImages[product.id] || productImages[product.product_name] ? (
                              <img
                                src={product.image || productImages[product.id] || productImages[product.product_name]}
                                alt={product.product_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900 truncate">{product.product_name}</span>
                        </div>
                        <div className="text-right">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={returnQuantity}
                            onChange={(e) => handleReturnQuantityChange(product.id, e.target.value)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          />
                        </div>
                        <div className="text-right">₹{price}</div>
                        <div className="text-right text-red-600">₹{returnAmount > 0 ? `-${returnAmount}` : '0'}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-b-2 border-dashed border-gray-300 my-2"></div>

                {/* Return Calculations */}
                <div className="ml-auto w-64">
                  <div className="flex justify-between py-1">
                    <div>Return Amount:</div>
                    <div className="text-red-600">₹-{
                      products.reduce((sum, product) => {
                        const shopPricing = shopProducts.find(sp =>
                          sp.shop_id === selectedShop && sp.product_id === product.id
                        );
                        const price = shopPricing ? shopPricing.price : product.price;
                        const returnQuantity = parseInt(returnQuantities[product.id] || '0') || 0;
                        return sum + (returnQuantity * price);
                      }, 0)
                    }</div>
                  </div>

                  <div className="border-b-2 border-dashed border-gray-300 my-2"></div>

                  <div className="flex justify-between py-1 font-bold">
                    <div>Total Return Value:</div>
                    <div className="text-red-600">₹-{
                      products.reduce((sum, product) => {
                        const shopPricing = shopProducts.find(sp =>
                          sp.shop_id === selectedShop && sp.product_id === product.id
                        );
                        const price = shopPricing ? shopPricing.price : product.price;
                        const returnQuantity = parseInt(returnQuantities[product.id] || '0') || 0;
                        return sum + (returnQuantity * price);
                      }, 0)
                    }</div>
                  </div>
                </div>



                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowReturnModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessReturns}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition"
                  >
                    Process Returns
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Bill Modal */}
        {selectedBillForView && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-lg bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Bill Details</h3>
                  <button
                    onClick={() => setSelectedBillForView(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    ×
                  </button>
                </div>

                {/* Bill Content for Printing */}
                <div id="bill-to-print" className="p-6">
                  {/* Professional Bill Header */}
                  <div className="mb-6">
                    <div className="text-center text-lg font-semibold" style={{ fontSize: '10px' }}>"ஸ்ரீ தேவி சந்தன மாரியம்மன் துணை"</div>

                    {/* Top row with GST and Mobile */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-left">
                        <p className="text-sm font-medium">GST No: 33BAPPS2831B2ZU</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Mobile: 8807810021</p>
                      </div>
                    </div>

                    {/* Logo */}
                    <div className="text-center mb-1">
                      <img src={Logo} alt="Sri Devi Snacks Logo" className="mx-auto" style={{ width: '100px', height: 'auto' }} />
                    </div>

                    {/* Company Name */}
                    <div className="text-center mb-2">
                      <h1 className="text-2xl font-bold text-gray-900">Sri Devi Snacks</h1>
                    </div>

                    {/* Company Address */}
                    <div className="text-center mb-1">
                      <p className="text-sm text-gray-700">128 C Santhanamari Amman Kovil Street</p>
                    </div>

                    {/* Company City and PIN */}
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-700">Vallioor, Tirunelveli-627117</p>
                    </div>

                    {/* Selected Shop Details */}
                    {currentShop && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-700">
                          <span className="font-bold">Shop:</span> <span className="font-bold">{currentShop.shop_name}</span>
                          {currentShop.address && ` - ${currentShop.address}`}
                          {currentShop.gst && (
                            <>
                              <span className="mx-4">|</span>
                              <span className="font-bold">Shop GST No:</span> <span className="font-bold">{currentShop.gst}</span>
                            </>
                          )}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-bold">Date:</span> <span className="font-bold">{selectedBillForView ? formatDateWithDay(selectedBillForView.bill_date) : formatDateWithDay(new Date())}</span>
                        </p>
                      </div>
                    )}

                    <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
                  </div>

                  {/* Bill Info */}
                  <div className="mb-4">
                    <div className="flex justify-between">
                      <div>Bill ID: {selectedBillForView.id}</div>
                      <div>Date: {formatDateWithDay(selectedBillForView.bill_date)}</div>
                    </div>
                    <div className="flex justify-between">
                      <div>Shop: {selectedBillForView.shop_name}</div>
                    </div>
                  </div>

                  {/* Bill Items */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full text-sm border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100 font-bold border-b border-gray-300">
                          <th className="p-2 text-left border-r border-gray-300">Product Name</th>
                          <th className="p-2 text-right border-r border-gray-300">QTY</th>
                          <th className="p-2 text-right border-r border-gray-300">Price</th>
                          <th className="p-2 text-right border-r border-gray-300">SGST</th>
                          <th className="p-2 text-right border-r border-gray-300">CGST</th>
                          <th className="p-2 text-right border-r border-gray-300">Price+GST</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Regular Items */}
                        {selectedBillForView.items.filter(item => item.quantity > 0).map((item) => {
                          const qty = item.quantity;
                          const sgstVal = item.sgst || 0;
                          const cgstVal = item.cgst || 0;
                          const unitPriceInclGst = qty > 0 ? (item.price + (sgstVal + cgstVal) / qty) : item.price;
                          const totalInclGst = item.amount + sgstVal + cgstVal;

                          return (
                            <tr key={`item-${item.id}`} className="border-b border-gray-300 hover:bg-gray-50">
                              <td className="p-2 text-left border-r border-gray-300">{item.product_name}</td>
                              <td className="p-2 text-right border-r border-gray-300">{qty}</td>
                              <td className="p-2 text-right border-r border-gray-300">{item.price.toFixed(2)}</td>
                              <td className="p-2 text-right border-r border-gray-300">{sgstVal.toFixed(2)}</td>
                              <td className="p-2 text-right border-r border-gray-300">{cgstVal.toFixed(2)}</td>
                              <td className="p-2 text-right border-r border-gray-300">{unitPriceInclGst.toFixed(2)}</td>
                              <td className="p-2 text-right">{totalInclGst.toFixed(2)}</td>
                            </tr>
                          );
                        })}

                        {/* Return Items Section Separator */}
                        {selectedBillForView.items.filter(item => item.quantity < 0).length > 0 && (
                          <tr className="bg-gray-50 font-bold border-b border-gray-300">
                            <td colSpan={7} className="p-2 text-left text-red-600">Return Items</td>
                          </tr>
                        )}

                        {/* Return Items */}
                        {selectedBillForView.items.filter(item => item.quantity < 0).map((item) => {
                          const qty = Math.abs(item.quantity);
                          const sgstVal = item.sgst || 0;
                          const cgstVal = item.cgst || 0;
                          const unitPriceInclGst = qty > 0 ? (item.price + Math.abs(sgstVal + cgstVal) / qty) : item.price;
                          const totalInclGst = Math.abs(item.amount + sgstVal + cgstVal);

                          return (
                            <tr key={`return-${item.id}`} className="border-b border-gray-300 hover:bg-gray-50 text-red-600">
                              <td className="p-2 text-left border-r border-gray-300">{item.product_name}</td>
                              <td className="p-2 text-right border-r border-gray-300">-{qty}</td>
                              <td className="p-2 text-right border-r border-gray-300">{item.price.toFixed(2)}</td>
                              <td className="p-2 text-right border-r border-gray-300">-{Math.abs(sgstVal).toFixed(2)}</td>
                              <td className="p-2 text-right border-r border-gray-300">-{Math.abs(cgstVal).toFixed(2)}</td>
                              <td className="p-2 text-right border-r border-gray-300">{unitPriceInclGst.toFixed(2)}</td>
                              <td className="p-2 text-right">-{totalInclGst.toFixed(2)}</td>
                            </tr>
                          );
                        })}

                        {/* Table Totals Row inside table */}
                        {(() => {
                          const totalQty = selectedBillForView.items.reduce((sum, item) => sum + item.quantity, 0);
                          const totalSgst = selectedBillForView.items.reduce((sum, item) => sum + (item.sgst || 0), 0);
                          const totalCgst = selectedBillForView.items.reduce((sum, item) => sum + (item.cgst || 0), 0);

                          return (
                            <>
                              <tr style={{ border: 'none' }}>
                                <td colSpan={7} style={{ border: 'none', height: '8px', padding: 0 }}></td>
                              </tr>
                              <tr className="font-bold bg-gray-100 border-t border-b border-gray-300">
                                <td className="p-2 text-left border-r border-gray-300">Total</td>
                                <td className="p-2 text-right border-r border-gray-300">{totalQty}</td>
                                <td className="p-2 text-right border-r border-gray-300"></td>
                                <td className="p-2 text-right border-r border-gray-300">{totalSgst.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-gray-300">{totalCgst.toFixed(2)}</td>
                                <td className="p-2 text-right border-r border-gray-300"></td>
                                <td className="p-2 text-right"></td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations */}
                  <div className="w-64 ml-auto">
                    {(() => {
                      const itemTotal = selectedBillForView.items.reduce((sum, item) => sum + item.amount, 0);
                      const sgst = selectedBillForView.items.reduce((sum, item) => sum + (item.sgst || 0), 0);
                      const cgst = selectedBillForView.items.reduce((sum, item) => sum + (item.cgst || 0), 0);
                      const currentBillTotal = Math.floor(itemTotal + sgst + cgst);

                      const rawTotal = selectedBillForView.total_amount;
                      const finalTotal = Math.floor(rawTotal);
                      const discount = rawTotal - finalTotal;
                      const previousPending = finalTotal - currentBillTotal;
                      const gstTotal = sgst + cgst;

                      return (
                        <>
                          <div className="flex justify-between py-1">
                            <div>Item Total (Without GST):</div>
                            <div>{itemTotal.toFixed(2)}</div>
                          </div>

                          <div className="flex justify-between py-1">
                            <div>GST:</div>
                            <div>{gstTotal.toFixed(2)}</div>
                          </div>

                          <div className="flex justify-between py-1 font-semibold">
                            <div>Today Total Amount:</div>
                            <div>{(itemTotal + gstTotal).toFixed(2)}</div>
                          </div>

                          {previousPending > 0 && (
                            <>
                              <div className="flex justify-between py-1">
                                <div>Previous Pending:</div>
                                <div>{previousPending.toFixed(2)}</div>
                              </div>
                              <div className="flex justify-between py-1 text-xs text-gray-500">
                                <div>(From previous bill)</div>
                                <div></div>
                              </div>
                            </>
                          )}

                          <div className="flex justify-between py-1">
                            <div>Discount:</div>
                            <div>{discount.toFixed(2)}</div>
                          </div>

                          <div className="border-b-2 border-dashed border-gray-300 my-2"></div>

                          <div className="flex justify-between py-1 font-bold text-lg">
                            <div>Final Total:</div>
                            <div>{finalTotal.toFixed(2)}</div>
                          </div>

                          {/* Payment Details */}
                          <div className="border-b-2 border-dashed border-gray-300 my-2"></div>

                          <div className="flex justify-between py-1">
                            <div>Received Amount:</div>
                            <div>{selectedBillForView.received_amount.toFixed(2)}</div>
                          </div>

                          <div className="flex justify-between py-1">
                            <div>Pending Amount:</div>
                            <div className={selectedBillForView.pending_amount > 0 ? "text-red-600 font-medium" : ""}>
                              {selectedBillForView.pending_amount.toFixed(2)}
                            </div>
                          </div>

                          <div className="flex justify-between py-1">
                            <div>Status:</div>
                            <div className={selectedBillForView.status === 'COMPLETED' ? "text-green-600 font-bold" : "text-yellow-600 font-bold"}>
                              {selectedBillForView.status.toUpperCase()}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Signature Display - Below Status */}
                  {signatureData[selectedBillForView.id] && (
                    <div className="mt-4 flex justify-end">
                      <div className="w-48 flex flex-col items-end">
                        <p className="text-xs font-bold text-gray-900 mb-2">Signature</p>
                        <img
                          src={signatureData[selectedBillForView.id]}
                          alt="Customer Signature"
                          style={{
                            maxHeight: '60px',
                            maxWidth: '150px',
                            filter: 'contrast(1.8) brightness(0.8)',
                            WebkitFilter: 'contrast(1.8) brightness(0.8)'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Thank You Message */}
                  <div className="text-center mt-8">
                    <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
                    <div className="font-bold">Thank you – Visit Again!</div>
                    <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
                  </div>
                </div>

                {/* Print Button */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedBillForView(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const printContent = document.getElementById('bill-to-print');
                      if (printContent && selectedBillForView) {
                        let htmlContent = '';
                        const win = {
                          document: {
                            write: (content: string) => {
                              htmlContent += content;
                            },
                            close: () => {}
                          },
                          print: () => {
                            printHtml(htmlContent);
                          },
                          close: () => {}
                        };
                        if (win) {
                          const shopName = selectedBillForView.shop_name;
                          const billDate = selectedBillForView.bill_date;
                          const billId = selectedBillForView.id;

                          win.document.write(`
                            <html>
                            <head>
                              <title>Bill - ${shopName}</title>
                              <style>
                                * {
                                  font-weight: bold !important;
                                }
                                @page {
                                  size: 80mm auto;
                                  margin: 0;
                                }
                                body {
                                  font-family: Arial, Helvetica, sans-serif;
                                  margin: 0;
                                  padding: 2mm 0mm;
                                  width: 80mm;
                                  box-sizing: border-box;
                                  line-height: 1.3;
                                  font-size: 17px;
                                }
                                .hsn-col { display: none; }
                                .bill-header {
                                  margin-bottom: 10px;
                                }
                                .header-row {
                                  display: flex;
                                  justify-content: space-between;
                                  margin-bottom: 10px;
                                  font-size: 15px;
                                }
                                .company-name {
                                  font-size: 28px;
                                  font-weight: bold;
                                  text-align: center;
                                  margin-bottom: 5px;
                                }
                                .company-address {
                                  text-align: center;
                                  font-size: 15px;
                                  margin-bottom: 3px;
                                }
                                .company-city {
                                  text-align: center;
                                  font-size: 15px;
                                  margin-bottom: 10px;
                                }
                                .shop-info, .shop-gst, .bill-no, .bill-date {
                                  margin-bottom: 5px;
                                  font-size: 15px;
                                }
                                .bill-items {
                                  width: 100%;
                                  border-collapse: collapse;
                                  margin-bottom: 15px;
                                }
                                .bill-items th {
                                  font-size: 15px !important;
                                  padding: 5px 3px;
                                  text-align: left;
                                  border: 1px solid #ccc;
                                  background-color: #f8f9fa;
                                  font-weight: bold;
                                }
                                .bill-items td {
                                  font-size: 17px !important;
                                  padding: 5px 3px;
                                  text-align: left;
                                  border: 1px solid #ccc;
                                }
                                .product-name-cell {
                                  font-size: 20px !important;
                                  font-weight: bold !important;
                                }
                                .bill-totals {
                                  width: 100%;
                                  margin-top: 10px;
                                }
                                .total-row {
                                  display: flex;
                                  justify-content: space-between;
                                  padding: 3px 0;
                                  font-size: 15px;
                                }
                                .final-total-row {
                                  font-size: 28px !important;
                                  font-weight: bold !important;
                                  padding: 5px 0;
                                }
                                .final-total-row div {
                                  font-size: 28px !important;
                                  font-weight: bold !important;
                                }
                                .dashed-line {
                                  border-bottom: 1px dashed #000;
                                  margin: 8px 0;
                                }
                                .double-dark-line {
                                  border-top: 3px double #000;
                                  margin: 8px 0;
                                }
                                .dark-line {
                                  border-top: 2px solid #000;
                                  margin: 8px 0;
                                }
                                .thank-you {
                                  text-align: center;
                                  margin-top: 15px;
                                  font-weight: bold;
                                  font-size: 17px;
                                }
                                .payment-details {
                                  margin-top: 10px;
                                  padding-top: 5px;
                                  border-top: 1px dashed #ccc;
                                }
                                .status-completed { color: #16a34a; }
                                .status-pending { color: #ca8a04; }
                                @media print {
                                  body { margin: 0; padding: 2mm 0mm; width: 80mm; }
                                  .bill-header { margin-bottom: 10px; }
                                  .company-name { font-size: 28px; }
                                }
                              </style>
                            </head>
                            <body>
                                  <div class="bill-header" style="text-align:center; margin-bottom:5px;">
    <div style="font-size:18px; font-weight:bold;">
      "ஸ்ரீ தேவி சந்தன மாரியம்மன் துணை"
    </div>
  </div>

                                <div class="header-row">
                                  <div>GST No: 33BAPPS2831B2ZU</div>
                                  <div>Mobile: 8807810021</div>
                                </div>

                                <div style="text-align:center; margin-bottom:5px;">
                                  <img src="${logoBase64String || Logo}" alt="Sri Devi Snacks Logo" style="width: 180px; height: auto; margin: 0 auto;" />
                                </div>

                                <div class="company-name">Sri Devi Snacks</div>
                                <div class="company-address">128 C Santhanamari Amman Kovil Street</div>
                                <div class="company-city">Vallioor, Tirunelveli-627117</div>
                                <div class="bill-no"><strong>Bill No:</strong> ${billId}</div>
                                <div class="shop-info"><strong>Shop:</strong> ${shopName}</div>
                                <div class="shop-gst"><strong>Shop GST No:</strong> ${selectedBillForView.shop_id === 1 ? '33BBBBB5678B2Y6' : selectedBillForView.shop_id === 2 ? '33CCCCC9012C3Z7' : selectedBillForView.shop_id === 3 ? '33DDDDD3456D4A8' : ''}</div>
                                <div class="bill-date"><strong>Date:</strong> ${selectedBillForView ? formatDateWithDay(selectedBillForView.bill_date) : formatDateWithDay(new Date())}</div>
                                <div class="dashed-line"></div>
                              </div>
                          `);

                          // Add bill items
                          win.document.write(`
                            <table class="bill-items">
                              <thead>
                                <tr>
                                  <th style="text-align: left; width: 26%;">Product Name</th>
                                  <th style="text-align: right; width: 9%;">QTY</th>
                                  <th style="text-align: right; width: 13%;">Price</th>
                                  <th style="text-align: right; width: 11%;">SGST</th>
                                  <th style="text-align: right; width: 11%;">CGST</th>
                                  <th style="text-align: right; width: 16%;">Price+GST</th>
                                  <th style="text-align: right; width: 14%;">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                          `);

                          // Regular items
                          selectedBillForView.items.filter(item => item.quantity > 0).forEach(item => {
                            const qty = item.quantity;
                            const sgstVal = item.sgst || 0;
                            const cgstVal = item.cgst || 0;
                            const unitPriceInclGst = qty > 0 ? (item.price + (sgstVal + cgstVal) / qty) : item.price;
                            const totalInclGst = item.amount + sgstVal + cgstVal;
                            win.document.write(`
                              <tr>
                                <td class="product-name-cell" style="text-align: left;">${item.product_name}</td>
                                <td style="text-align: right;">${qty}</td>
                                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                <td style="text-align: right;">${sgstVal.toFixed(2)}</td>
                                <td style="text-align: right;">${cgstVal.toFixed(2)}</td>
                                <td style="text-align: right;">${unitPriceInclGst.toFixed(2)}</td>
                                <td style="text-align: right;">${totalInclGst.toFixed(2)}</td>
                              </tr>
                            `);
                          });

                          // Return items
                          if (selectedBillForView.items.filter(item => item.quantity < 0).length > 0) {
                            win.document.write(`
                              <tr><td colspan="7" style="padding-top: 15px; font-weight: bold;">Return Items</td></tr>
                            `);
                            selectedBillForView.items.filter(item => item.quantity < 0).forEach(item => {
                              const qty = Math.abs(item.quantity);
                              const sgstVal = item.sgst || 0;
                              const cgstVal = item.cgst || 0;
                              const unitPriceInclGst = qty > 0 ? (item.price + Math.abs(sgstVal + cgstVal) / qty) : item.price;
                              const totalInclGst = Math.abs(item.amount + sgstVal + cgstVal);
                              win.document.write(`
                                <tr>
                                  <td class="product-name-cell" style="text-align: left;">${item.product_name}</td>
                                  <td style="text-align: right;">-${qty}</td>
                                  <td style="text-align: right;">${item.price.toFixed(2)}</td>
                                  <td style="text-align: right;">-${Math.abs(sgstVal).toFixed(2)}</td>
                                  <td style="text-align: right;">-${Math.abs(cgstVal).toFixed(2)}</td>
                                  <td style="text-align: right;">${unitPriceInclGst.toFixed(2)}</td>
                                  <td style="text-align: right;">-${totalInclGst.toFixed(2)}</td>
                                </tr>
                              `);
                            });
                          }

                          // Calculate table totals
                          const totalQty = selectedBillForView.items.reduce((sum, item) => sum + item.quantity, 0);
                          const totalSgst = selectedBillForView.items.reduce((sum, item) => sum + (item.sgst || 0), 0);
                          const totalCgst = selectedBillForView.items.reduce((sum, item) => sum + (item.cgst || 0), 0);

                          win.document.write(`
                            <tr style="border: none !important;">
                              <td colspan="7" style="border: none !important; height: 8px; padding: 0;"></td>
                            </tr>
                            <tr style="font-weight: bold; background-color: #f8f9fa;">
                              <td class="product-name-cell" style="text-align: left;">Total</td>
                              <td style="text-align: right;">${totalQty}</td>
                              <td style="text-align: right;"></td>
                              <td style="text-align: right;">${totalSgst.toFixed(2)}</td>
                              <td style="text-align: right;">${totalCgst.toFixed(2)}</td>
                              <td style="text-align: right;"></td>
                              <td style="text-align: right;"></td>
                            </tr>
                          `);

                          win.document.write('</tbody></table>');

                          // Add calculations
                          const itemTotal = selectedBillForView.items.reduce((sum, item) => sum + item.amount, 0);
                          const sgst = selectedBillForView.items.reduce((sum, item) => sum + (item.sgst || 0), 0);
                          const cgst = selectedBillForView.items.reduce((sum, item) => sum + (item.cgst || 0), 0);
                          const currentBillTotal = Math.floor(itemTotal + sgst + cgst);
                          
                          const rawTotal = selectedBillForView.total_amount;
                          const finalTotal = Math.floor(rawTotal);
                          const discount = rawTotal - finalTotal;
                          const previousPending = finalTotal - currentBillTotal;

                          win.document.write(`
                            <div class="bill-totals">
                                <div class="double-dark-line"></div>
                                <div class="total-row">
                                  <div>Item Total (Without GST):</div>
                                  <div>${itemTotal.toFixed(2)}</div>
                                </div>
                                <div class="total-row">
                                  <div>GST:</div>
                                  <div>${(sgst + cgst).toFixed(2)}</div>
                                </div>
                                <div class="total-row">
                                  <div>Today Total Amount:</div>
                                  <div>${(itemTotal + sgst + cgst).toFixed(2)}</div>
                                </div>
                          `);

                          if (previousPending > 0) {
                            win.document.write(`
                              <div class="total-row">
                                <div>Previous Pending:</div>
                                <div>${previousPending.toFixed(2)}</div>
                              </div>
                            `);
                          }

                          win.document.write(`
                              <div class="total-row">
                                <div>Discount:</div>
                                <div>${discount.toFixed(2)}</div>
                              </div>
                              <div class="dark-line"></div>
                              <div class="total-row final-total-row">
                                <div>Final Total:</div>
                                <div>${finalTotal.toFixed(2)}</div>
                              </div>
                            
                              <div class="payment-details">
                                <div class="total-row">
                                  <div>Received Amount:</div>
                                  <div>${selectedBillForView.received_amount}</div>
                                </div>
                                <div class="total-row">
                                  <div>Pending Amount:</div>
                                  <div class="${selectedBillForView.pending_amount > 0 ? 'status-pending' : ''}">${selectedBillForView.pending_amount}</div>
                                </div>
                                <div class="dashed-line"></div>
                                <div class="total-row" style="font-weight: bold;">
                                  <div>Status:</div>
                                  <div class="${selectedBillForView.status === 'COMPLETED' ? 'status-completed' : 'status-pending'}">
                                    ${selectedBillForView.status.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <!-- Signature Below Status -->
                            ${signatureData[selectedBillForView.id] ? `
                            <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                              <div style="width: 150px; display: flex; flex-direction: column; align-items: flex-end;">
                                <p style="font-size: 11px; font-weight: bold; margin-bottom: 5px; color: #111827;">Signature</p>
                                <img src="${signatureData[selectedBillForView.id]}" alt="Customer Signature" style="max-height: 60px; max-width: 150px; filter: contrast(1.8) brightness(0.8);" />
                              </div>
                            </div>
                            ` : ''}
                            
                            <div class="thank-you">
                              <div class="dashed-line"></div>
                              <div>Thank you – Visit Again!</div>
                              <div class="dashed-line"></div>
                            </div>
                          </body>
                          </html>
                          `);

                          win.document.close();
                          setTimeout(() => {
                            win.print();
                            win.close();
                          }, 100);
                        }
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    Print Bill
                  </button>
                  {selectedBillForView.status === 'PENDING' && (
                    <button
                      onClick={() => setShowSignatureModal(true)}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition flex items-center ${signatureData[selectedBillForView.id]
                        ? 'bg-green-700 hover:bg-green-800'
                        : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                      {signatureData[selectedBillForView.id] ? (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Signature Saved
                        </>
                      ) : (
                        'Signature'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Confirmation Dialog */}
        {showPaymentConfirmation && paymentBillData && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-lg bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Confirm Payment</h3>
                  <button
                    onClick={handlePaymentBillCancel}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    ×
                  </button>
                </div>

                <div className="mb-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-yellow-800">Payment Confirmation</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          This will create a payment bill and apply the amount to outstanding pending bills for {currentShop?.shop_name}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Shop:</span>
                      <span className="text-sm text-gray-900">{currentShop?.shop_name}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Payment Amount:</span>
                      <span className="text-sm font-semibold text-green-600">₹{paymentBillData.receivedAmount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Apply to Pending:</span>
                      <span className="text-sm text-blue-600">{paymentBillData.applyToPending ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handlePaymentBillCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePaymentBillConfirm}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GPay QR Code Modal */}
        {showGPayQR && currentBillForPayment && (
          <GPayQRCode
            billId={currentBillForPayment.id}
            shopId={currentBillForPayment.shop_id}
            shopName={currentBillForPayment.shop_name}
            amount={currentBillForPayment.pending_amount}
            upiId="santhanamvlr@okicici" // Replace with actual shop UPI ID
            onClose={() => {
              setShowGPayQR(false);
              if (gpayFromModal) {
                setShowSaveOptionsModal(true); // Open Save Options Modal again only if triggered from modal
                setGpayFromModal(false);
              }
            }}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}

        {/* Saving Loader Overlay */}
        {saving && showBillingInterface && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-lg font-medium text-gray-900">Saving Bill...</p>
              <p className="text-sm text-gray-500 mt-2">Please wait while we process your bill. Do not refresh or navigate away.</p>
            </div>
          </div>
        )}

        {/* Signature Modal */}
        {showSignatureModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-lg bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Digital Signature</h3>
                  <button
                    onClick={() => {
                      setShowSignatureModal(false);
                      setSignatureTargetBillId(null);
                      clearSignature();
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    ×
                  </button>
                </div>

                <div className="mb-6">
                  {signatureData[selectedBillForView?.id || ''] ? (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">Signature already exists for this bill.</p>
                      <p className="text-xs text-green-600 mt-1">Draw a new signature to replace it.</p>
                    </div>
                  ) : null}
                  <p className="text-sm text-gray-600 mb-4">Please sign below:</p>
                  <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
                    <canvas
                      ref={canvasRef}
                      width={700}
                      height={300}
                      className="w-full border border-gray-200 rounded cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={clearSignature}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={saveSignature}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                  >
                    Save Signature
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* After-Print Save Options Modal */}
        {showSaveOptionsModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-6 border w-11/12 max-w-md shadow-2xl rounded-2xl bg-white animate-fade-in-up">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Receipt className="h-6 w-6 mr-2 text-blue-600" />
                    Bill Options (பில் விருப்பங்கள்)
                  </h3>
                  <button
                    onClick={() => setShowSaveOptionsModal(false)}
                    className="text-gray-800 hover:text-black hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold transition"
                  >
                    &times;
                  </button>
                </div>

                <div className="mb-6 space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex justify-between text-sm mb-2 text-gray-600">
                      <span>Shop Name:</span>
                      <span className="font-semibold text-gray-900">{currentShop?.shop_name}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2 text-gray-600">
                      <span>Total Amount:</span>
                      <span className="font-semibold text-gray-900">
                        ₹{Math.round(
                          currentBill.reduce((sum, item) => sum + item.amount + (item.sgst || 0) + (item.cgst || 0), 0) +
                          pendingBills.reduce((sum, bill) => sum + bill.pending_amount, 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Received Amount Input */}
                  <div>
                    <label htmlFor="modalReceivedAmount" className="block text-sm font-semibold text-gray-700 mb-1">
                      Received Amount (வரவு)
                    </label>
                    <input
                      type="number"
                      id="modalReceivedAmount"
                      min="0"
                      value={receivedAmount}
                      placeholder="0"
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold text-center"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Save Bill Button */}
                  <button
                    onClick={async () => {
                      setShowSaveOptionsModal(false);
                      await handleSaveBill(false);
                    }}
                    disabled={!receivedAmount || parseFloat(receivedAmount) <= 0}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow transition"
                  >
                    Save Bill (பில் சேமிக்க)
                  </button>

                  {/* Pending Button */}
                  <button
                    onClick={() => {
                      setShowSaveOptionsModal(false);
                      setSignatureTargetBillId('NEW_PENDING');
                      setShowSignatureModal(true);
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow transition"
                  >
                    Pending (நிலுவை பில்)
                  </button>

                  {/* Pay with GPay Button */}
                  <button
                    onClick={async () => {
                      setShowSaveOptionsModal(false);
                      setGpayFromModal(true);
                      await handleGPayPayment();
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow transition"
                  >
                    Pay with GPay (GPay மூலம் செலுத்த)
                  </button>

                  {/* Draft Button */}
                  <button
                    onClick={handleSaveDraft}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl shadow transition"
                  >
                    Draft (வரைவு பில்)
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={() => setShowSaveOptionsModal(false)}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Drafts Modal */}
        {showDraftsModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-6 border w-11/12 max-w-lg shadow-2xl rounded-2xl bg-white animate-fade-in-up">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <ShoppingCart className="h-6 w-6 mr-2 text-blue-600" />
                    Draft Bills (வரைவு பில்கள்)
                  </h3>
                  <button
                    onClick={() => setShowDraftsModal(false)}
                    className="text-gray-800 hover:text-black hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold transition"
                  >
                    &times;
                  </button>
                </div>

                <div className="mb-6 max-h-[60vh] overflow-y-auto space-y-3">
                  {Object.keys(drafts).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No draft bills found.
                    </div>
                  ) : (
                    Object.values(drafts).map((draft: any) => {
                      const draftTotal = draft.items.reduce((sum: number, item: any) => sum + item.amount + (item.sgst || 0) + (item.cgst || 0), 0);
                      return (
                        <div key={draft.shopId} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center hover:bg-gray-100 transition">
                          <div className="flex-1 cursor-pointer" onClick={() => {
                            setSelectedDay(draft.day);
                            setSelectedShop(draft.shopId);
                            setCurrentBill(draft.items);
                            setReceivedAmount(draft.receivedAmount || "0");
                            setShowBillingInterface(true);
                            setShowDraftsModal(false);
                            setShowSaveOptionsModal(true);
                          }}>
                            <h4 className="font-bold text-gray-900">{draft.shopName}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              Day: {draft.day} • Items: {draft.items.length} • Total: ₹{Math.round(draftTotal).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Saved on: {new Date(draft.date).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the draft for ${draft.shopName}?`)) {
                                const updatedDrafts = { ...drafts };
                                delete updatedDrafts[draft.shopId];
                                setDrafts(updatedDrafts);
                                localStorage.setItem('billing_drafts', JSON.stringify(updatedDrafts));
                              }
                            }}
                            className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowDraftsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
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

  export default Billing;
