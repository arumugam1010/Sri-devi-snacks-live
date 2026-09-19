import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Printer, Save, Image as ImageIcon, MapPin, Mic, MicOff, Search, Clock } from 'lucide-react';
import { bakeryProductsAPI, bakeryBillsAPI, bakeryShopsAPI } from '../../services/api';
import { printBakeryBill } from '../../utils/bakeryPrint';

const Logo = '/Logo.png';

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
  const [allShops, setAllShops] = useState<BakeryShop[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [billItems, setBillItems] = useState<BillItem[]>(() => {
    try {
      const saved = localStorage.getItem('bakery_current_bill');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load saved bakery bill items', e);
      return [];
    }
  });
  const [customerName, setCustomerName] = useState<string>(() => {
    return localStorage.getItem('bakery_customer_name') || '';
  });
  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    return localStorage.getItem('bakery_customer_phone') || '';
  });
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<string>('Main Branch');
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');
  const [selectedShopId, setSelectedShopId] = useState<number | null>(() => {
    const saved = localStorage.getItem('bakery_selected_shop_id');
    return saved ? Number(saved) : null;
  });
  const [nearbyShops, setNearbyShops] = useState<(BakeryShop & { distance: number })[]>([]);
  const [showNearbyModal, setShowNearbyModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [qtyModalProduct, setQtyModalProduct] = useState<BakeryProduct | null>(null);
  const [qtyInput, setQtyInput] = useState('1');

  const [useRawBT, setUseRawBT] = useState<boolean>(() => {
    const saved = localStorage.getItem('useRawBT');
    if (saved !== null) return saved === 'true';
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent.toLowerCase());
  });

  const [logoBase64String, setLogoBase64String] = useState<string>('');

  const handleToggleRawBT = (checked: boolean) => {
    setUseRawBT(checked);
    localStorage.setItem('useRawBT', String(checked));
  };

  useEffect(() => {
    fetchProducts();
    fetchShopsAndDetectLocation();

    if (Logo) {
      fetch(Logo)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setLogoBase64String(reader.result as string);
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => console.error('Failed to convert logo to base64:', err));
    }
  }, []);

  // Auto-persist draft bill items to localStorage so refreshing won't lose items
  useEffect(() => {
    try {
      if (billItems && billItems.length > 0) {
        localStorage.setItem('bakery_current_bill', JSON.stringify(billItems));
      } else {
        localStorage.removeItem('bakery_current_bill');
      }
    } catch (e) {
      console.error('Failed to save bakery bill items to localStorage', e);
    }
  }, [billItems]);

  useEffect(() => {
    if (customerName) {
      localStorage.setItem('bakery_customer_name', customerName);
    } else {
      localStorage.removeItem('bakery_customer_name');
    }
  }, [customerName]);

  useEffect(() => {
    if (customerPhone) {
      localStorage.setItem('bakery_customer_phone', customerPhone);
    } else {
      localStorage.removeItem('bakery_customer_phone');
    }
  }, [customerPhone]);

  useEffect(() => {
    if (selectedShopId !== null && selectedShopId !== undefined) {
      localStorage.setItem('bakery_selected_shop_id', String(selectedShopId));
    } else {
      localStorage.removeItem('bakery_selected_shop_id');
    }
  }, [selectedShopId]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const selectShop = (shop: BakeryShop) => {
    setSelectedShopId(shop.id);
    setCustomerName(shop.name);
    setCustomerPhone(shop.phone || '');
    setShowNearbyModal(false);
  };

  const fetchShopsAndDetectLocation = async () => {
    let loadedShops: BakeryShop[] = [];
    try {
      const shopsRes = await bakeryShopsAPI.getShops();
      loadedShops = shopsRes.data || [];
      setAllShops(loadedShops);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }

    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          setLocationStatus('Fetching area name...');
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const data = await res.json();
          const place = data.locality || data.city || data.principalSubdivision || 'Unknown Location';
          setCurrentLocation(place);
          setLocationStatus('Live Location Fetched');
        } catch (err) {
          setLocationStatus('Failed to fetch location name');
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setLocationStatus('GPS denied or unavailable');
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
  const selectedShop = allShops.find(s => s.id === selectedShopId);

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

  const updateItemQuantity = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      removeBillItem(productId);
      return;
    }
    setBillItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: newQty, total: newQty * i.price } : i));
  };

  const removeBillItem = (productId: number) => {
    setBillItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const clearBill = () => {
    if (billItems.length === 0) return;
    if (confirm('Clear current bill?')) {
      setBillItems([]);
      setPaidAmount('');
      setCustomerName('');
      setCustomerPhone('');
      setSelectedShopId(null);
      localStorage.removeItem('bakery_current_bill');
      localStorage.removeItem('bakery_customer_name');
      localStorage.removeItem('bakery_customer_phone');
      localStorage.removeItem('bakery_selected_shop_id');
    }
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ta-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceFeedback('Listening in Tamil...');
    };

    recognition.onresult = (event: any) => {
      let transcript = event.results[0][0].transcript.toLowerCase();
      
      const aliases: {[key: string]: string} = {
        'பிரெட்': 'பிரட்',
        'சாம்பன்': 'ஜாம்பன்',
        'கிரிம்': 'கிரீம்'
      };
      for (const [typo, correct] of Object.entries(aliases)) {
        transcript = transcript.replace(new RegExp(typo, 'g'), correct);
      }
      
      let matchedProduct = products.find(p => p.stock > 0 && transcript.includes(p.name.toLowerCase()));
      
      if (!matchedProduct) {
        const words = transcript.split(' ').filter((w: string) => w.length >= 2 && isNaN(Number(w)));
        matchedProduct = products.find(p => {
          if (p.stock <= 0) return false;
          const pName = p.name.toLowerCase();
          return words.some((w: string) => pName.includes(w));
        });
      }

      if (!matchedProduct) {
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
        let qty = 1;
        const remainingText = transcript.replace(matchedProduct.name.toLowerCase(), '');
        const numberMatch = remainingText.match(/\d+/);
        
        if (numberMatch) {
          qty = parseInt(numberMatch[0], 10);
        } else {
          const wordToNum: {[key: string]: number} = {
            'ஒன்று': 1, 'ஒன்னு': 1, 'இரண்டு': 2, 'ரெண்டு': 2,
            'மூன்று': 3, 'மூணு': 3, 'நான்கு': 4, 'நாலு': 4,
            'ஐந்து': 5, 'அஞ்சு': 5, 'ஆறு': 6,
            'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10,
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
          };
          for (const [word, num] of Object.entries(wordToNum)) {
            if (remainingText.includes(word)) {
              qty = num;
              break;
            }
          }
        }

        if (qty <= 0) qty = 1;

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
      setVoiceFeedback('Error listening');
      setTimeout(() => setVoiceFeedback(''), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSaveBill = async (andPrint: boolean = false) => {
    if (billItems.length === 0) return;
    
    const paid = parseFloat(paidAmount) || totalAmount;
    
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
        pending_amount: Math.max(0, totalAmount - paid),
        date: new Date().toLocaleString()
      };
      
      setIsPaymentModalOpen(false);
      setBillItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedShopId(null);
      setPaidAmount('');
      localStorage.removeItem('bakery_current_bill');
      localStorage.removeItem('bakery_customer_name');
      localStorage.removeItem('bakery_customer_phone');
      localStorage.removeItem('bakery_selected_shop_id');
      fetchProducts();
      
      if (andPrint) {
        handlePrint(billData);
      } else {
        alert("Bill saved successfully!");
      }

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
        customer_name: customerName || (selectedShop ? selectedShop.name : 'Pending Customer'),
        customer_phone: customerPhone || (selectedShop ? selectedShop.phone : ''),
        location_name: currentLocation,
        shop_id: selectedShopId || undefined
      };
      
      await bakeryBillsAPI.createBill(payload);
      
      setIsPaymentModalOpen(false);
      setBillItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedShopId(null);
      setPaidAmount('');
      localStorage.removeItem('bakery_current_bill');
      localStorage.removeItem('bakery_customer_name');
      localStorage.removeItem('bakery_customer_phone');
      localStorage.removeItem('bakery_selected_shop_id');
      fetchProducts();
      alert("Bill saved as pending successfully!");

    } catch (err: any) {
      alert(err.message || "Failed to save bill as pending");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = async (billData: any) => {
    await printBakeryBill(billData, useRawBT, logoBase64String || Logo);
  };

  const handlePrintCurrentBill = () => {
    if (billItems.length === 0) {
      alert("No items in bill to print");
      return;
    }
    const paid = parseFloat(paidAmount) || totalAmount;
    const billData = {
      id: 'DRAFT',
      customer_name: customerName || (selectedShop ? selectedShop.name : ''),
      customer_phone: customerPhone || (selectedShop ? selectedShop.phone : ''),
      location_name: currentLocation,
      items: billItems,
      total_amount: totalAmount,
      paid_amount: paid,
      pending_amount: Math.max(0, totalAmount - paid),
      date: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    handlePrint(billData);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 font-medium">Loading bakery products...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header Bar with Title and RawBT Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bakery Billing</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            <p className="text-gray-600 text-sm">Create bills and manage bakery orders</p>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <label className="inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useRawBT}
                onChange={(e) => handleToggleRawBT(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ms-2 text-xs font-semibold text-gray-700">Use RawBT Printer</span>
            </label>
          </div>
        </div>

        {/* Live Location Chip */}
        <div className="bg-gray-50 px-3.5 py-2 rounded-lg border border-gray-200 flex items-center w-full sm:w-auto">
          <MapPin className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-gray-500">Location:</span>
              <input
                type="text"
                value={currentLocation}
                onChange={(e) => {
                  setCurrentLocation(e.target.value);
                  setLocationStatus('Manually edited');
                }}
                className="text-xs font-bold text-gray-900 border-none bg-transparent focus:ring-0 p-0 truncate w-28 sm:w-36"
                placeholder="Location"
              />
            </div>
            <span className="text-[10px] text-gray-400 leading-tight">{locationStatus}</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout (Responsive: Stacks on mobile, 2 columns on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column / Top Sections: Shop Selection & Products */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          
          {/* Bakery Products Grid (Full height, natural scrolling, no fixed cutoff) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Bakery Products</h3>
                <p className="text-xs text-gray-500">Tap a product to enter quantity and add to bill</p>
              </div>

              {/* Voice recognition & search header controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="button"
                  onClick={startVoiceRecognition}
                  disabled={isListening}
                  className={`flex items-center justify-center p-2 rounded-lg shadow-sm transition ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  title="Speak in Tamil to add product"
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Voice Feedback Banner */}
            {voiceFeedback && (
              <div className={`text-xs px-3 py-1.5 rounded-md font-medium ${
                isListening ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {voiceFeedback}
              </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 pt-2">
              {filteredProducts.filter(p => p.stock > 0).map(product => {
                const inBill = billItems.find(i => i.product_id === product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer overflow-hidden flex flex-col hover:shadow-md active:scale-98 ${
                      inBill ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="h-32 sm:h-36 bg-gray-50 flex items-center justify-center relative overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-gray-300" />
                      )}
                      
                      {/* Price Badge */}
                      <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs font-bold text-gray-900 shadow-sm border border-gray-100">
                        ₹{product.price.toFixed(2)}
                      </div>

                      {/* In Bill Quantity Badge */}
                      {inBill && (
                        <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                          {inBill.quantity} in bill
                        </div>
                      )}
                    </div>

                    <div className="p-3 text-center flex-1 flex flex-col justify-between">
                      <h4 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2">{product.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-1">Stock: {product.stock}</p>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.filter(p => p.stock > 0).length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-sm font-medium">No products found matching your search</p>
                  <p className="text-xs text-gray-400 mt-1">Ensure stock is available in the Bakery Stock tab</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column (Desktop) / Below All Products (Mobile): Current Bill Card */}
        <div className="lg:col-span-5 xl:col-span-5">
          <div id="current-bill-card" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden lg:sticky lg:top-6">
            
            {/* Bill Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Current Bill</h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {billItems.length} {billItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              
              {billItems.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handlePrintCurrentBill}
                    className="inline-flex items-center px-2.5 py-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-semibold hover:bg-blue-50 border border-blue-200 rounded-lg transition"
                    title="Print Current Bill"
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Print Bill
                  </button>
                  <button
                    type="button"
                    onClick={clearBill}
                    className="inline-flex items-center px-2.5 py-1 text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium hover:bg-red-50 rounded transition"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Bill Content */}
            {billItems.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-gray-400">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-25" />
                <p className="font-semibold text-gray-600 text-base">No items in bill</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Tap products above to add them to this bill</p>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-4">
                
                {/* Visual Bill Preview (Exact design of Image 1) */}
                <div id="current-bill-to-print" className="border border-dashed border-gray-300 rounded-xl p-4 bg-white shadow-inner">
                  {/* Top Dedication */}
                  <div className="text-center font-bold text-[11px] text-gray-800 mb-1.5">
                    "ஸ்ரீ தேவி சந்தன மாரியம்மன் துணை"
                  </div>

                  {/* GST & Mobile */}
                  <div className="flex justify-between items-center text-[11px] font-semibold text-gray-800 mb-2">
                    <span>GST No: 33BAPPS2831B2ZU</span>
                    <span>Mobile: 8807810021</span>
                  </div>

                  {/* Logo */}
                  <div className="text-center my-2">
                    <img src={Logo} alt="Sri Devi Snacks Logo" className="mx-auto h-12 w-auto object-contain" />
                  </div>

                  {/* Company Name & Address */}
                  <div className="text-center">
                    <h1 className="text-xl font-black tracking-wide text-gray-900">Sri Devi Snacks</h1>
                    <p className="text-xs text-gray-700">128 C Santhanamari Amman Kovil Street</p>
                    <p className="text-xs text-gray-700">Vallioor, Tirunelveli-627117</p>
                  </div>

                  {/* Customer & Date */}
                  <div className="mt-3 pt-2.5 border-t border-gray-200 text-xs space-y-0.5">
                    {(customerName || customerPhone) && (
                      <div>
                        {customerName && (
                          <p className="text-gray-800">
                            <span className="font-bold">Customer:</span> {customerName}
                          </p>
                        )}
                        {customerPhone && (
                          <p className="text-gray-600">
                            <span className="font-bold">Phone:</span> {customerPhone}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-gray-600">
                      <span className="font-bold">Location:</span> {currentLocation}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-bold">Date:</span> {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Dashed Line */}
                  <div className="border-b-2 border-dashed border-gray-300 my-3"></div>

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 font-bold border-y border-gray-300 text-gray-800">
                          <th className="p-1.5 text-left">Product Name</th>
                          <th className="p-1.5 text-center">QTY</th>
                          <th className="p-1.5 text-right">Price</th>
                          <th className="p-1.5 text-right">Total</th>
                          <th className="p-1.5 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {billItems.map(item => (
                          <tr key={item.product_id} className="hover:bg-gray-50">
                            <td className="p-1.5 font-medium text-gray-900">{item.product_name}</td>
                            <td className="p-1.5 text-center">
                              <div className="inline-flex items-center border border-gray-300 rounded bg-white shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)}
                                  className="px-1.5 py-0.5 text-gray-600 hover:bg-gray-100 font-bold"
                                >
                                  -
                                </button>
                                <span className="px-2 font-bold text-gray-900">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
                                  className="px-1.5 py-0.5 text-gray-600 hover:bg-gray-100 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-1.5 text-right text-gray-700">₹{item.price.toFixed(2)}</td>
                            <td className="p-1.5 text-right font-bold text-gray-900">₹{item.total.toFixed(2)}</td>
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeBillItem(item.product_id)}
                                className="text-red-500 hover:text-red-700 p-1 transition"
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Dashed Line */}
                  <div className="border-b-2 border-dashed border-gray-300 my-3"></div>

                  {/* Totals Breakdown */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-700">
                      <span>Item Total ({billItems.reduce((acc, i) => acc + i.quantity, 0)} items):</span>
                      <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-800">
                      <span>Today Total Amount (இன்றைய பில்):</span>
                      <span>₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-dashed border-gray-300 my-2 pt-1"></div>
                    <div className="flex justify-between text-base sm:text-lg font-black text-gray-900">
                      <span>Final Total:</span>
                      <span className="text-blue-700 font-black">₹{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Thank you note */}
                  <div className="border-t-2 border-dashed border-gray-300 my-3 pt-2 text-center text-xs font-bold text-gray-800 tracking-wide">
                    Thank you – Visit Again!
                  </div>
                </div>

                {/* Bottom Bill Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPaidAmount(totalAmount.toString());
                      setIsPaymentModalOpen(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow transition flex items-center justify-center text-base"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    Save Bill (₹{totalAmount.toFixed(2)})
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAsPending}
                    disabled={submitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl transition flex items-center justify-center text-xs sm:text-sm"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save as Pending
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>



      {/* Payment Confirmation Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-800 bg-opacity-75 backdrop-blur-sm" onClick={() => setIsPaymentModalOpen(false)}></div>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-100">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Complete Payment</h3>
              </div>
              <div className="px-6 py-6 space-y-4">
                
                <div className="bg-blue-50 text-blue-900 p-4 rounded-lg flex justify-between items-center border border-blue-100">
                  <span className="font-medium text-lg">Total Bill:</span>
                  <span className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg shadow-sm text-lg py-3 px-4 focus:ring-blue-500 focus:border-blue-500"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Pending Amount:</span>
                  <span className={`font-bold ${(totalAmount - (parseFloat(paidAmount) || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Math.max(0, totalAmount - (parseFloat(paidAmount) || 0)).toFixed(2)}
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Customer Details</p>
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      placeholder="Customer Name"
                      className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>

              </div>
              <div className="bg-gray-50 px-6 py-4 flex flex-wrap justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsPending}
                  disabled={submitting}
                  className="px-4 py-2 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 flex items-center transition disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Saving...' : 'Save as Pending'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBill(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center transition disabled:opacity-50 text-sm"
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  {submitting ? 'Saving...' : 'Save Only'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBill(true)}
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 flex items-center transition disabled:opacity-50 text-sm shadow-md"
                >
                  <Printer className="mr-1.5 h-4 w-4" />
                  {submitting ? 'Saving & Printing...' : 'Save & Print'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Modal */}
      {qtyModalProduct && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-800 bg-opacity-75 backdrop-blur-sm" onClick={() => setQtyModalProduct(null)}></div>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full">
              <form onSubmit={confirmQuantity}>
                <div className="bg-white px-6 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <h3 className="text-lg leading-6 font-bold text-gray-900 mb-1">
                      {qtyModalProduct.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">Price: ₹{qtyModalProduct.price.toFixed(2)} | Stock: {qtyModalProduct.stock}</p>
                    <div className="mt-2">
                      <input
                        type="number"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        autoFocus
                        className="w-full text-center text-3xl font-bold border-2 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 py-3"
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
                    className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none"
                  >
                    Add to Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setQtyModalProduct(null)}
                    className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-5 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
