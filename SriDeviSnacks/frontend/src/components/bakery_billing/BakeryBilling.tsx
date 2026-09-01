import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Printer, Save, Image as ImageIcon, MapPin, Mic, MicOff } from 'lucide-react';
import { bakeryProductsAPI, bakeryBillsAPI, bakeryShopsAPI } from '../../services/api';
import html2canvas from 'html2canvas';

// Live location is fetched via Geolocation API

interface BakeryProduct {
  id: number;
  name: string;
  price: number;
  image: string | null;
  stock: number;
}

interface BakeryShop {
  id: number;
  name: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface BillItem {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  total: number;
}

export default function BakeryBilling() {
  const [products, setProducts] = useState<BakeryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<string>('Main Branch');
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [nearbyShops, setNearbyShops] = useState<(BakeryShop & { distance: number })[]>([]);
  const [showNearbyModal, setShowNearbyModal] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [qtyModalProduct, setQtyModalProduct] = useState<BakeryProduct | null>(null);
  const [qtyInput, setQtyInput] = useState('1');

  useEffect(() => {
    fetchProducts();
    detectLocation();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const selectShop = (shop: BakeryShop) => {
    setSelectedShopId(shop.id);
    setCustomerName(shop.name);
    setCustomerPhone(shop.phone || '');
    setShowNearbyModal(false);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          setLocationStatus('Fetching area name...');
          const [res, shopsRes] = await Promise.all([
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`),
            bakeryShopsAPI.getShops().catch(() => ({ data: [] }))
          ]);
          
          const data = await res.json();
          const place = data.locality || data.city || data.principalSubdivision || 'Unknown Location';
          setCurrentLocation(place);
          setLocationStatus(`Live Location Fetched`);

          const shops = shopsRes?.data || [];
          if (shops.length > 0) {
            const shopsWithDist = shops
              .filter((s: BakeryShop) => s.latitude && s.longitude)
              .map((s: BakeryShop) => ({
                ...s,
                distance: calculateDistance(latitude, longitude, s.latitude as number, s.longitude as number)
              }))
              .filter((s: any) => s.distance <= 5000) // within 5km
              .sort((a: any, b: any) => a.distance - b.distance);
              
            if (shopsWithDist.length === 1 || (shopsWithDist.length > 1 && shopsWithDist[0].distance <= 50)) {
              selectShop(shopsWithDist[0]);
            } else if (shopsWithDist.length > 1) {
              setNearbyShops(shopsWithDist);
              setShowNearbyModal(true);
            }
          }
        } catch (err) {
          setLocationStatus('Failed to fetch location name');
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setLocationStatus('GPS failed or denied. Using default.');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await bakeryProductsAPI.getProducts();
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = billItems.reduce((sum, item) => sum + item.total, 0);

  const handleProductClick = (product: BakeryProduct) => {
    setQtyModalProduct(product);
    setQtyInput("1");
  };

  const confirmQuantity = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qtyModalProduct) return;
    
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      setQtyModalProduct(null);
      return;
    }

    setBillItems(prev => {
      const existing = prev.find(i => i.product_id === qtyModalProduct.id);
      if (existing) {
        return prev.map(i => i.product_id === qtyModalProduct.id ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.price } : i);
      } else {
        return [...prev, {
          product_id: qtyModalProduct.id,
          product_name: qtyModalProduct.name,
          price: qtyModalProduct.price,
          quantity: qty,
          total: qtyModalProduct.price * qty
        }];
      }
    });
    
    setQtyModalProduct(null);
  };

  const removeBillItem = (productId: number) => {
    setBillItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ta-IN'; // Set to Tamil since product names are in Tamil
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceFeedback('Listening...');
    };

    recognition.onresult = (event: any) => {
      let transcript = event.results[0][0].transcript.toLowerCase();
      
      // Fix common voice recognition typos
      const aliases: {[key: string]: string} = {
        'பிரெட்': 'பிரட்',
        'சாம்பன்': 'ஜாம்பன்',
        'கிரிம்': 'கிரீம்'
      };
      for (const [typo, correct] of Object.entries(aliases)) {
        transcript = transcript.replace(new RegExp(typo, 'g'), correct);
      }
      
      // Try to find a matching product
      let matchedProduct = products.find(p => p.stock > 0 && transcript.includes(p.name.toLowerCase()));
      
      if (!matchedProduct) {
        // Try partial match (e.g. product is "Veg Puff", user says "Puff")
        const words = transcript.split(' ').filter((w: string) => w.length >= 2 && isNaN(Number(w)));
        matchedProduct = products.find(p => {
          if (p.stock <= 0) return false;
          const pName = p.name.toLowerCase();
          return words.some((w: string) => pName.includes(w));
        });
      }

      if (!matchedProduct) {
        // Try fuzzy match using Levenshtein distance for typos (e.g. ஜாம்பன் vs சாம்பன்)
        const levenshtein = (a: string, b: string) => {
          const matrix = [];
          for (let i = 0; i <= b.length; i++) matrix[i] = [i];
          for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
          for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
              if (b.charAt(i-1) === a.charAt(j-1)) {
                matrix[i][j] = matrix[i-1][j-1];
              } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
              }
            }
          }
          return matrix[b.length][a.length];
        };

        let cleanTranscript = transcript.replace(/\d+/g, '');
        const numberWords = ['ஒன்று', 'ஒன்னு', 'இரண்டு', 'ரெண்டு', 'மூன்று', 'மூணு', 'நான்கு', 'நாலு', 'ஐந்து', 'அஞ்சு', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது', 'பத்து'];
        for (const w of numberWords) {
          cleanTranscript = cleanTranscript.replace(new RegExp(w, 'g'), '');
        }
        cleanTranscript = cleanTranscript.replace(/\s+/g, '');

        if (cleanTranscript.length > 0) {
          let bestMatch = null;
          let minDistance = 999;
          
          for (const p of products) {
            if (p.stock <= 0) continue;
            const cleanProductName = p.name.toLowerCase().replace(/\s+/g, '');
            const dist = levenshtein(cleanTranscript, cleanProductName);
            if (dist < minDistance && dist <= 3) {
              minDistance = dist;
              bestMatch = p;
            }
          }
          
          if (bestMatch) {
            matchedProduct = bestMatch;
          }
        }
      }
      
      if (matchedProduct) {
        // Extract quantity from transcript
        let qty = 1;
        const remainingText = transcript.replace(matchedProduct.name.toLowerCase(), '');
        const numberMatch = remainingText.match(/\d+/);
        
        if (numberMatch) {
          qty = parseInt(numberMatch[0], 10);
        } else {
          // Fallback to word parsing
          const wordToNum: {[key: string]: number} = {
            'ஒன்று': 1, 'ஒன்னு': 1, 'இரண்டு': 2, 'ரெண்டு': 2,
            'மூன்று': 3, 'மூணு': 3, 'நான்கு': 4, 'நாலு': 4,
            'ஐந்து': 5, 'அஞ்சு': 5, 'ஆறு': 6,
            'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10,
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'onnu': 1, 'rendu': 2, 'moonu': 3, 'naalu': 4, 'anju': 5,
            'aaru': 6, 'yelu': 7, 'ettu': 8, 'ombodu': 9, 'pathu': 10
          };
          for (const [word, num] of Object.entries(wordToNum)) {
            if (remainingText.includes(word)) {
              qty = num;
              break;
            }
          }
        }

        if (qty <= 0) qty = 1;

        // Directly add to bill bypassing the prompt
        setBillItems(prev => {
          const existing = prev.find(i => i.product_id === matchedProduct.id);
          if (existing) {
            return prev.map(i => i.product_id === matchedProduct.id ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.price } : i);
          } else {
            return [...prev, {
              product_id: matchedProduct.id,
              product_name: matchedProduct.name,
              price: matchedProduct.price,
              quantity: qty,
              total: matchedProduct.price * qty
            }];
          }
        });

        setVoiceFeedback(`Added ${qty} ${matchedProduct.name}`);
        setTimeout(() => setVoiceFeedback(''), 3000);
      } else {
        setVoiceFeedback(`Not found: "${transcript}"`);
        setTimeout(() => setVoiceFeedback(''), 3000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
      setVoiceFeedback('Error listening.');
      setTimeout(() => setVoiceFeedback(''), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSaveAndPrint = async () => {
    if (billItems.length === 0) return;
    
    const paid = parseFloat(paidAmount) || 0;
    
    try {
      setSubmitting(true);
      const payload = {
        items: billItems,
        total_amount: totalAmount,
        paid_amount: paid,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_name: currentLocation,
        shop_id: selectedShopId || undefined
      };
      
      const res = await bakeryBillsAPI.createBill(payload);
      
      const billData = {
        id: res.data.id,
        ...payload,
        pending_amount: totalAmount - paid,
        date: new Date().toLocaleString()
      };
      
      setIsPaymentModalOpen(false);
      setBillItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaidAmount('');
      fetchProducts(); // Refresh stock
      
      handlePrint(billData);

    } catch (err: any) {
      alert(err.message || "Failed to save bill");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAsPending = async () => {
    if (billItems.length === 0) return;
    
    try {
      setSubmitting(true);
      const payload = {
        items: billItems,
        total_amount: totalAmount,
        paid_amount: 0,
        customer_name: customerName,
        customer_phone: customerPhone,
        location_name: currentLocation,
        shop_id: selectedShopId || undefined
      };
      
      await bakeryBillsAPI.createBill(payload);
      
      setIsPaymentModalOpen(false);
      setBillItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaidAmount('');
      fetchProducts(); // Refresh stock

    } catch (err: any) {
      alert(err.message || "Failed to save bill as pending");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = async (billData: any) => {
    const isMobileOrTablet = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent.toLowerCase());
    };

    const isMobile = isMobileOrTablet();
    
    const printContent = `
      <div class="print-receipt px-2">
        <div class="text-center mb-2">
          <div class="font-bold text-base sm:text-lg">SRI DEVI SNACKS</div>
          <div class="text-sm">Bakery Bill</div>
          <div>Date: ${billData.date}</div>
          <div>Bill No: ${billData.id}</div>
        </div>
        
        ${(billData.customer_name || billData.customer_phone) ? `
          <div class="my-2 border-t border-b py-1">
            ${billData.customer_name ? `<div>Name: ${billData.customer_name}</div>` : ''}
            ${billData.customer_phone ? `<div>Ph: ${billData.customer_phone}</div>` : ''}
          </div>
        ` : ''}

        <div class="my-2 border-t py-1">
          <table>
            <thead>
              <tr class="border-b">
                <th>Item</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${billData.items.map((item: any) => `
                <tr>
                  <td>${item.product_name.substring(0, 12)}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${item.price.toFixed(2)}</td>
                  <td class="text-right">${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="border-t py-1">
          <div class="flex justify-between font-bold">
            <span>Total:</span>
            <span>${billData.total_amount.toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span>Paid:</span>
            <span>${billData.paid_amount.toFixed(2)}</span>
          </div>
          ${billData.pending_amount > 0 ? `
            <div class="flex justify-between font-bold text-lg">
              <span>Pending:</span>
              <span>${billData.pending_amount.toFixed(2)}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="text-center mt-4 border-t py-2">
          <div>Thank You!</div>
        </div>
      </div>
    `;
    
    const fullHtml = `
      <html>
        <head>
          <title>Print Bakery Bill</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .text-lg { font-size: 16px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .border-t { border-top: 1px dashed #000; }
            .border-b { border-bottom: 1px dashed #000; }
            .py-1 { padding: 4px 0; }
            .my-2 { margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 4px 0; }
            th.text-right, td.text-right { text-align: right; }
            th.text-center, td.text-center { text-align: center; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `;

    const fallbackPrint = (html: string) => {
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
        
        const optimizedHtml = html
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

    const savedRawBT = localStorage.getItem('useRawBT');
    const useRawBT = savedRawBT !== null ? savedRawBT === 'true' : isMobile;

    if (isMobile && useRawBT) {
      try {
        const optimizedHtml = printContent
            .replace(/width:\s*(72mm|80mm)/gi, 'width: 100%')
            .replace(/width:\s*(72mm|80mm)\s*!important/gi, 'width: 100% !important')
            .replace(/₹/g, '<span class="rupee">₹</span>');
            
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
                  font-family: 'Arial Black', Arial, Helvetica, sans-serif !important;
                  font-weight: 900 !important;
                  color: #000 !important;
                  -webkit-text-stroke: 0.5px black !important;
                  text-stroke: 0.5px black !important;
                }
                body {
                  width: 100% !important;
                  max-width: 100% !important;
                  padding: 0px !important;
                  margin: 0 !important;
                  box-sizing: border-box !important;
                }
                .print-receipt {
                  width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                body, div, p, td, th, span {
                  font-size: 38px !important;
                  line-height: 1.4 !important;
                }
                .font-bold {
                  font-weight: bold !important;
                }
                .text-lg, .text-base { 
                  font-size: 64px !important; 
                  margin: 15px 0 !important; 
                }
                .mb-2 { margin-bottom: 8px !important; }
                .mb-4 { margin-bottom: 16px !important; }
                .flex { display: flex !important; }
                .justify-between { justify-content: space-between !important; }
                .text-center { text-align: center !important; }
                table {
                  width: 100% !important;
                  table-layout: fixed !important;
                  border-collapse: collapse !important;
                }
                th {
                  font-size: 26px !important;
                  padding: 10px 2px !important;
                  border: 2px solid #888 !important;
                  word-wrap: break-word !important;
                  white-space: normal !important;
                }
                td { 
                  font-size: 30px !important; 
                  padding: 10px 2px !important; 
                  border: 2px solid #888 !important;
                  word-wrap: break-word !important;
                  white-space: normal !important;
                }
                th.text-right, td.text-right { text-align: right !important; }
                th.text-center, td.text-center { text-align: center !important; }
                .border-t {
                  border-top: 4px solid #000 !important;
                  margin: 15px 0 !important;
                }
                .border-b {
                  border-bottom: 4px solid #000 !important;
                  margin: 15px 0 !important;
                }
                .py-1, .py-2 { padding: 15px 0 !important; }
                .my-2 { margin: 15px 0 !important; }
                .mt-4 { margin-top: 25px !important; }
                .rupee {
                  color: #000 !important;
                  font-weight: 900 !important;
                }
          </style>
        `;
        document.body.appendChild(container);

        await new Promise(resolve => setTimeout(resolve, 600));

        const canvas = await html2canvas(container, {
          scale: 1.0, // Optimized scale to prevent URL length limits in mobile browsers
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        document.body.removeChild(container);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        window.location.href = `rawbt:data:image/jpeg;base64,` + base64Image;
      } catch (e) {
        console.error('RawBT print failed:', e);
        fallbackPrint(fullHtml);
      }
    } else {
      fallbackPrint(fullHtml);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)] bg-gray-50 -m-4 sm:-m-6 overflow-hidden">
      
      {/* Products Grid */}
      <div className="flex-1 p-4 lg:p-6 overflow-y-auto flex flex-col min-h-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Bakery Products</h2>
          
          {/* Location Selector */}
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center w-full sm:w-auto">
            <MapPin className="w-5 h-5 text-blue-500 mr-2" />
            <div className="flex flex-col">
              <input 
                type="text"
                value={currentLocation}
                onChange={(e) => {
                  setCurrentLocation(e.target.value);
                  setLocationStatus('Manually edited');
                }}
                className="text-sm font-bold text-gray-900 border-none bg-transparent focus:ring-0 p-0 w-32 sm:w-40"
                placeholder="Enter location"
              />
              <span className="text-[10px] text-gray-400 mt-0.5">{locationStatus}</span>
            </div>
          </div>

          {/* Voice Recognition Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={startVoiceRecognition}
              disabled={isListening}
              className={`flex items-center justify-center p-3 rounded-full shadow-md transition-all ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              title="Add product by voice"
            >
              {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            {voiceFeedback && (
              <span className={`text-sm font-medium ${isListening ? 'text-red-500' : 'text-blue-600'}`}>
                {voiceFeedback}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 pb-4">
          {products.filter(p => p.stock > 0).map(product => (
            <div 
              key={product.id} 
              onClick={() => handleProductClick(product)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden flex flex-col"
            >
              <div className="h-40 bg-gray-50 flex items-center justify-center relative">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-12 w-12 text-gray-300" />
                )}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-sm font-bold text-gray-800 shadow-sm">
                  ₹{product.price.toFixed(2)}
                </div>
              </div>
              <div className="p-4 text-center">
                <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
              </div>
            </div>
          ))}
          {products.filter(p => p.stock > 0).length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-10">
              No products with stock available. Update stock in the Bakery Stock tab.
            </div>
          )}
        </div>
      </div>

      {/* Bill Cart */}
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] lg:shadow-xl z-10 h-[45vh] lg:h-auto shrink-0">
        <div className="p-4 bg-gray-800 text-white flex items-center justify-between">
          <div className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-bold">Current Bill</h2>
          </div>
          <span className="bg-gray-700 px-2 py-1 rounded text-sm">{billItems.length} items</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {billItems.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Cart is empty</p>
              <p className="text-sm">Click on products to add</p>
            </div>
          ) : (
            billItems.map(item => (
              <div key={item.product_id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{item.product_name}</h4>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.quantity} x ₹{item.price.toFixed(2)}
                  </div>
                </div>
                <div className="font-bold text-gray-900 mr-4">
                  ₹{item.total.toFixed(2)}
                </div>
                <button 
                  onClick={() => removeBillItem(item.product_id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary & Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-4 text-lg font-bold text-gray-900">
            <span>Total Amount</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
          
          <button
            disabled={billItems.length === 0}
            onClick={() => {
              setPaidAmount(totalAmount.toString());
              setIsPaymentModalOpen(true);
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Printer className="mr-2 h-5 w-5" />
            Print Bill
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-800 bg-opacity-75 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)}></div>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-100">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Complete Payment</h3>
              </div>
              <div className="px-6 py-6">
                
                <div className="bg-blue-50 text-blue-900 p-4 rounded-lg mb-6 flex justify-between items-center border border-blue-100">
                  <span className="font-medium text-lg">Total Bill:</span>
                  <span className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      autoFocus
                      className="w-full border-gray-300 rounded-md shadow-sm text-lg py-3 px-4 focus:ring-blue-500 focus:border-blue-500"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                    />
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Pending Amount:</span>
                    <span className={`font-bold ${(totalAmount - (parseFloat(paidAmount) || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{Math.max(0, totalAmount - (parseFloat(paidAmount) || 0)).toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Customer Details (Optional)</p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Customer Name"
                        className="w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Phone Number"
                        className="w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsPending}
                  disabled={submitting}
                  className="px-4 py-2 bg-yellow-500 text-white font-bold rounded-md hover:bg-yellow-600 flex items-center transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save as Pending'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndPrint}
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 flex items-center transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save & Print'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Removed Print Section because HTML is generated dynamically in handlePrint */}

      {/* Quantity Modal */}
      {qtyModalProduct && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-800 bg-opacity-75 backdrop-blur-sm" onClick={() => setQtyModalProduct(null)}></div>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full">
              <form onSubmit={confirmQuantity}>
                <div className="bg-white px-6 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">
                      Enter quantity for {qtyModalProduct.name}
                    </h3>
                    <div className="mt-2">
                      <input
                        type="number"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        autoFocus
                        className="w-full text-center text-3xl font-bold border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 py-4"
                        value={qtyInput}
                        onChange={(e) => setQtyInput(e.target.value)}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse space-x-reverse space-x-3 gap-3 sm:gap-0">
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setQtyModalProduct(null)}
                    className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Nearby Shops Modal */}
      {showNearbyModal && nearbyShops.length > 0 && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-800 bg-opacity-75 backdrop-blur-sm" onClick={() => setShowNearbyModal(false)}></div>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
              <div className="bg-white px-6 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">
                    Nearby Bakery Shops Detected
                  </h3>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-500 mb-4">Select the shop you are currently at:</p>
                    {nearbyShops.map(shop => (
                      <div
                        key={shop.id}
                        onClick={() => selectShop(shop)}
                        className="flex justify-between items-center p-3 border rounded-lg cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{shop.name}</div>
                          <div className="text-xs text-gray-500">{shop.phone || 'No phone'}</div>
                        </div>
                        <div className="text-sm font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                          {shop.distance < 1000 ? `${Math.round(shop.distance)}m` : `${(shop.distance/1000).toFixed(1)}km`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse space-x-reverse space-x-3 gap-3 sm:gap-0">
                <button
                  type="button"
                  onClick={() => setShowNearbyModal(false)}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                >
                  Cancel / Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
