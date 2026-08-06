import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { productsAPI, billsAPI, schedulesAPI, shopsAPI, stocksAPI, settingsAPI } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

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
  image?: string | null;
  soldToday?: number;
  morningStock?: number;
}

interface ShopProduct {
  id: number;
  shop_id: number;
  product_id: number;
  price: number;
  shop_name: string;
  product_name: string;
  unit: string;
  gst: number;
  hsn_code: string;
}

interface Bill {
  id: string;
  bill_number?: string;
  shop_id: number;
  shop_name: string;
  bill_date: string;
  total_amount: number;
  received_amount: number;
  pending_amount: number;
  status: 'PENDING' | 'COMPLETED';
  items: any[];
  updated_at?: string;
  created_at?: string;
  user_name?: string;
  payment_mode?: string;
  cash_amount?: number;
  gpay_amount?: number;
}

interface Shop {
  id: number;
  shop_name: string;
  address: string;
  contact: string;
  email?: string;
  gst?: string;
  status: 'active' | 'inactive';
  created_date: string;
}

export interface DaySchedule {
  day: string;
  shops: Shop[];
}

interface AppContextType {
  products: Product[];
  setProducts: (products: Product[]) => void;
  shopProducts: ShopProduct[];
  setShopProducts: (shopProducts: ShopProduct[]) => void;
  shops: Shop[];
  setShops: (shops: Shop[]) => void;
  bills: Bill[];
  setBills: (bills: Bill[]) => void;
  weeklySchedule: DaySchedule[];
  setWeeklySchedule: (schedule: DaySchedule[]) => void;
  updateProductStock: (productId: number, quantity: number) => void;
  addBill: (bill: Bill) => Promise<any>;
  updateBill: (id: string, updateData: { receivedAmount?: number; notes?: string; paymentMode?: string }) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  userRole: string | null;
  setUserRole: (role: string | null) => void;
  vehicleNumber: string;
  routeDay: string;
  todayRoute: string;
  whatsappEnabled: string;
  whatsappPhone: string;
  whatsappProvider: string;
  whatsappToken: string;
  whatsappInstanceId: string;
  lowStockThreshold: number;
  smsEnabled: string;
  smsPhone: string;
  smsApiKey: string;
  updateAppSetting: (key: string, value: string) => Promise<void>;
  updateAppSettingsBulk: (settings: Array<{ key: string; value: string }>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
  user: any;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => ({ day, shops: [] }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState<string>('TN72DX4338');
  const [whatsappEnabled, setWhatsappEnabled] = useState<string>('false');
  const [whatsappPhone, setWhatsappPhone] = useState<string>('9943206339');
  const [whatsappProvider, setWhatsappProvider] = useState<string>('ultramsg');
  const [whatsappToken, setWhatsappToken] = useState<string>('');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState<string>('');
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(20);
  const [smsEnabled, setSmsEnabled] = useState<string>('false');
  const [smsPhone, setSmsPhone] = useState<string>('9943206339');
  const [smsApiKey, setSmsApiKey] = useState<string>('');
  
  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const DEFAULT_ROUTES: Record<string, string> = {
    Monday: 'Vallioor-Kavalkinaru-Chettikulam-Kudankulam-Idinthakarai-Navaladi-Rathapuram-Kallikulam',
    Tuesday: 'Vallioor-Kavalkinaru-Anjigramam-Nagercoil-Poothapandi-Aralvaimozhli',
    Wednesday: 'Vallioor-Kavalkinaru-Anjigramam-Kannankulam-Kanyakumari-Kottaram-Kavalkinaru',
    Thursday: 'Vallioor-Kavalkinaru-Palavoor-Vadakankulam-Rathapuram-Kallikulam-Vallioor',
    Friday: 'Vallioor-Tirunelveli-Kovilpatti-Sathur-Viruthunagar-Tirunelveli-Vallioor',
    Saturday: 'Vallioor-Eavadi-Kalakad-Kankanakulam-Kalakad-Nanguneri-Vallioor',
    Sunday: 'Custom Route',
  };
  const [routeDay, setRouteDay] = useState<string>(currentDayName);
  const [todayRoute, setTodayRoute] = useState<string>(DEFAULT_ROUTES[currentDayName] || 'Custom Route');

  // Fetch initial data from backend
  const refreshData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch products
        const productsResponse = await productsAPI.getProducts({ limit: 1000 });
        let productsData: any[] = [];
        if (productsResponse.success) {
          productsData = productsResponse.data.map((p: any) => ({
            id: p.id,
            product_name: p.productName,
            unit: p.unit,
            status: p.status,
            created_date: p.createdAt,
            gst: p.gst,
            quantity: p.stocks?.[0]?.quantity || 0,
            rate: p.price || 0,  // Use price from products as rate
            hsn_code: p.hsnCode,
            price: p.price || 0,
            stockId: p.stocks?.[0]?.id || null,
            image: p.image,
          }));
        }

      // Fetch stocks and merge with products
      const stocksResponse = await stocksAPI.getStocks();
      if (stocksResponse.success) {
        const stocksData = stocksResponse.data;
        productsData = productsData.map(product => {
          const stock = stocksData.find((s: any) => s.productId === product.id);
          if (stock) {
            return {
              ...product,
              quantity: stock.quantity,
              stockId: stock.id,
              soldToday: stock.soldToday || 0,
              morningStock: stock.morningStock,
            };
          }
          return product;
        });
      }

      setProducts(productsData);

      // Fetch shops first
      const shopsResponse = await shopsAPI.getShops({ limit: 1000 });
      let fetchedShops: any[] = [];
      if (shopsResponse.success) {
        fetchedShops = shopsResponse.data.map((shop: any) => ({
          id: shop.id,
          shop_name: shop.shopName,
          address: shop.address,
          contact: shop.contact,
          email: shop.email,
          gst: shop.gstNumber,
          status: shop.status.toLowerCase(),
          created_date: new Date(shop.createdAt).toISOString().split('T')[0],
        }));
        setShops(fetchedShops);
      }

      // Fetch schedules and populate with shop data
      const schedulesResponse = await schedulesAPI.getSchedules();
      if (schedulesResponse.success) {
        const scheduleData = schedulesResponse.data;
        
        const mapScheduleShop = (s: any) => {
          const shop = fetchedShops.find((shop: any) => shop.id === s.shop?.id);
          if (shop) return shop;
          if (s.shop) {
            return {
              id: s.shop.id,
              shop_name: s.shop.shopName || s.shop.shop_name,
              address: s.shop.address,
              contact: s.shop.contact,
              email: s.shop.email,
              gst: s.shop.gstNumber || s.shop.gst,
              status: s.shop.status?.toLowerCase(),
              created_date: s.shop.createdAt ? new Date(s.shop.createdAt).toISOString().split('T')[0] : (s.shop.created_date || ''),
            };
          }
          return null;
        };

        const weeklyScheduleData: DaySchedule[] = [
          { day: 'Monday', shops: scheduleData.MONDAY?.map(mapScheduleShop).filter(Boolean) || [] },
          { day: 'Tuesday', shops: scheduleData.TUESDAY?.map(mapScheduleShop).filter(Boolean) || [] },
          { day: 'Wednesday', shops: scheduleData.WEDNESDAY?.map(mapScheduleShop).filter(Boolean) || [] },
          { day: 'Thursday', shops: scheduleData.THURSDAY?.map(mapScheduleShop).filter(Boolean) || [] },
          { day: 'Friday', shops: scheduleData.FRIDAY?.map(mapScheduleShop).filter(Boolean) || [] },
          { day: 'Saturday', shops: scheduleData.SATURDAY?.map(mapScheduleShop).filter(Boolean) || [] },
        ];
        setWeeklySchedule(weeklyScheduleData);
      }

      // Fetch bills
      const billsResponse = await billsAPI.getBills({ limit: 1000 });
      if (billsResponse.success) {
        setBills(billsResponse.data.map((b: any) => ({
          id: b.id.toString(),
          bill_number: b.billNumber,
          shop_id: b.shopId,
          shop_name: b.shop.shopName,
          bill_date: b.billDate,
          total_amount: b.totalAmount,
          received_amount: b.receivedAmount,
          pending_amount: b.pendingAmount,
          status: b.status,
          payment_mode: b.payment_mode,
          cash_amount: b.cash_amount,
          gpay_amount: b.gpay_amount,
          updated_at: b.updatedAt,
          created_at: b.createdAt,
          user_name: b.user?.name,
          items: b.billItems.map((item: any) => ({
            product_id: item.productId,
            product_name: item.product.productName,
            quantity: item.quantity,
            price: item.rate,
            rate: item.rate,
            amount: item.amount,
            sgst: item.sgst,
            cgst: item.cgst,
            hsnCode: item.hsnCode,
          })),
        })));
      }

      // Fetch shop products in a single call to ensure shopPricing is preloaded on all pages (like Billing)
      try {
        const response = await shopsAPI.getAllShopProducts();
        if (response.success) {
          const fetchedShopProducts: ShopProduct[] = response.data.map((sp: any) => ({
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
          setShopProducts(fetchedShopProducts);
        }
      } catch (shopProductsErr) {
        console.error('Failed to fetch shop products:', shopProductsErr);
      }

      // Fetch settings
      try {
        const settingsResponse = await settingsAPI.getSettings();
        if (settingsResponse.success && settingsResponse.data) {
          if (settingsResponse.data.vehicle_number !== undefined) {
            setVehicleNumber(settingsResponse.data.vehicle_number);
          }
          if (settingsResponse.data.whatsapp_enabled !== undefined) {
            setWhatsappEnabled(settingsResponse.data.whatsapp_enabled);
          }
          if (settingsResponse.data.whatsapp_phone !== undefined) {
            setWhatsappPhone(settingsResponse.data.whatsapp_phone);
          }
          if (settingsResponse.data.whatsapp_provider !== undefined) {
            setWhatsappProvider(settingsResponse.data.whatsapp_provider);
          }
          if (settingsResponse.data.whatsapp_api_token !== undefined) {
            setWhatsappToken(settingsResponse.data.whatsapp_api_token);
          }
          if (settingsResponse.data.whatsapp_instance_id !== undefined) {
            setWhatsappInstanceId(settingsResponse.data.whatsapp_instance_id);
          }
          if (settingsResponse.data.low_stock_threshold !== undefined) {
            setLowStockThreshold(Number(settingsResponse.data.low_stock_threshold));
          }
          if (settingsResponse.data.sms_enabled !== undefined) {
            setSmsEnabled(settingsResponse.data.sms_enabled);
          }
          if (settingsResponse.data.sms_phone !== undefined) {
            setSmsPhone(settingsResponse.data.sms_phone);
          }
          if (settingsResponse.data.sms_api_key !== undefined) {
            setSmsApiKey(settingsResponse.data.sms_api_key);
          }
          
          
          const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
          if (settingsResponse.data.route_save_date === todayStr) {
            if (settingsResponse.data.route_day) {
              setRouteDay(settingsResponse.data.route_day);
            }
            if (settingsResponse.data.today_route) {
              setTodayRoute(settingsResponse.data.today_route);
            }
          }
        }
      } catch (settingsErr) {
        console.error('Failed to fetch settings:', settingsErr);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Synchronize user role and data with the logged-in user state
  useEffect(() => {
    if (user && user.role) {
      setUserRole(user.role);
      refreshData();
    } else {
      setUserRole(null);
      setProducts([]);
      setShopProducts([]);
      setShops([]);
      setBills([]);
    }
  }, [user]);

  const updateProductStock = (productId: number, quantity: number) => {
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product.id === productId
          ? { ...product, quantity: Math.max(0, product.quantity - quantity) }
          : product
      )
    );
  };

  const addBill = async (bill: Bill) => {
    try {
      // Transform bill data for API
      const apiBillData = {
        shopId: bill.shop_id,
        billDate: bill.bill_date,
        receivedAmount: bill.received_amount,
        cashAmount: bill.cash_amount,
        gpayAmount: bill.gpay_amount,
        notes: '',
        paymentMode: bill.payment_mode,
        items: bill.items.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          rate: item.price,
          sgst: item.sgst !== undefined ? item.sgst : 0,
          cgst: item.cgst !== undefined ? item.cgst : 0,
          hsnCode: item.hsnCode,
        })),
      };

      const response = await billsAPI.createBill(apiBillData);

      if (response.success) {
        // Add the created bill to local state
        const createdBill = response.data;
        const newBill: Bill = {
          id: createdBill.id.toString(),
          bill_number: createdBill.billNumber,
          shop_id: createdBill.shopId,
          shop_name: createdBill.shop?.shopName || bill.shop_name,
          bill_date: createdBill.billDate,
          total_amount: createdBill.totalAmount,
          received_amount: createdBill.receivedAmount,
          pending_amount: createdBill.pendingAmount,
          status: createdBill.status,
          payment_mode: createdBill.payment_mode,
          cash_amount: createdBill.cash_amount,
          gpay_amount: createdBill.gpay_amount,
          updated_at: createdBill.updatedAt,
          created_at: createdBill.createdAt,
          user_name: createdBill.user?.name || bill.user_name,
          items: createdBill.billItems ? createdBill.billItems.map((item: any) => ({
            product_id: item.productId,
            product_name: item.product?.productName || '',
            quantity: item.quantity,
            price: item.rate,
            rate: item.rate,
            amount: item.amount,
            sgst: item.sgst,
            cgst: item.cgst,
            hsnCode: item.hsnCode,
          })) : bill.items,
        };
        setBills(prevBills => [...prevBills, newBill]);

        // Update stock for sold items
        bill.items
          .filter(item => item.quantity > 0)
          .forEach(item => {
            updateProductStock(item.product_id, item.quantity);
          });
        return newBill;
      } else {
        throw new Error(response.message || 'Failed to create bill');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add bill');
      throw err;
    }
  };

  const updateBill = async (id: string, updateData: { receivedAmount?: number; notes?: string; paymentMode?: string }) => {
    try {
      const response = await billsAPI.updateBill(parseInt(id), updateData);
      if (response.success) {
        // Use the full updated bill from backend response which includes recalculated pending_amount and status
        const updatedBill = response.data;
        setBills(prevBills =>
          prevBills.map(bill =>
            bill.id === id ? {
              ...bill,
              received_amount: updatedBill.receivedAmount,
              pending_amount: updatedBill.pendingAmount,
              status: updatedBill.status,
              payment_mode: updatedBill.payment_mode,
              cash_amount: updatedBill.cash_amount,
              gpay_amount: updatedBill.gpay_amount,
              ...updateData // in case there are other fields like notes
            } : bill
          )
        );
      } else {
        throw new Error(response.message || 'Failed to update bill');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update bill');
      throw err;
    }
  };

  const deleteBill = async (id: string) => {
    try {
      const response = await billsAPI.deleteBill(parseInt(id));
      if (response.success) {
        setBills(prevBills => prevBills.filter(bill => bill.id !== id));
      } else {
        throw new Error(response.message || 'Failed to delete bill');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete bill');
      throw err;
    }
  };

  const updateAppSetting = async (key: string, value: string) => {
    try {
      const response = await settingsAPI.updateSetting(key, value);
      if (response.success) {
        if (key === 'vehicle_number') setVehicleNumber(value);
        if (key === 'route_day') setRouteDay(value);
        if (key === 'today_route') setTodayRoute(value);
        if (key === 'whatsapp_enabled') setWhatsappEnabled(value);
        if (key === 'whatsapp_phone') setWhatsappPhone(value);
        if (key === 'whatsapp_provider') setWhatsappProvider(value);
        if (key === 'whatsapp_api_token') setWhatsappToken(value);
        if (key === 'whatsapp_instance_id') setWhatsappInstanceId(value);
        if (key === 'low_stock_threshold') setLowStockThreshold(Number(value));
        if (key === 'sms_enabled') setSmsEnabled(value);
        if (key === 'sms_phone') setSmsPhone(value);
        if (key === 'sms_api_key') setSmsApiKey(value);
      } else {
        throw new Error(response.message || `Failed to update setting ${key}`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to update setting ${key}`);
      throw err;
    }
  };

  const updateAppSettingsBulk = async (settings: Array<{ key: string; value: string }>) => {
    try {
      const response = await settingsAPI.updateSettingsBulk(settings);
      if (response.success) {
        settings.forEach(({ key, value }) => {
          if (key === 'vehicle_number') setVehicleNumber(value);
          if (key === 'route_day') setRouteDay(value);
          if (key === 'today_route') setTodayRoute(value);
          if (key === 'whatsapp_enabled') setWhatsappEnabled(value);
          if (key === 'whatsapp_phone') setWhatsappPhone(value);
          if (key === 'whatsapp_provider') setWhatsappProvider(value);
          if (key === 'whatsapp_api_token') setWhatsappToken(value);
          if (key === 'whatsapp_instance_id') setWhatsappInstanceId(value);
          if (key === 'low_stock_threshold') setLowStockThreshold(Number(value));
          if (key === 'sms_enabled') setSmsEnabled(value);
          if (key === 'sms_phone') setSmsPhone(value);
          if (key === 'sms_api_key') setSmsApiKey(value);
        });
      } else {
        throw new Error(response.message || 'Failed to update settings bulk');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update settings bulk');
      throw err;
    }
  };

  const value: AppContextType = {
    products,
    setProducts,
    shopProducts,
    setShopProducts,
    shops,
    setShops,
    bills,
    setBills,
    weeklySchedule,
    setWeeklySchedule,
    updateProductStock,
    addBill,
    updateBill,
    deleteBill,
    loading,
    error,
    refreshData,
    userRole,
    setUserRole,
    vehicleNumber,
    routeDay,
    todayRoute,
    whatsappEnabled,
    whatsappPhone,
    whatsappProvider,
    whatsappToken,
    whatsappInstanceId,
    lowStockThreshold,
    smsEnabled,
    smsPhone,
    smsApiKey,
    updateAppSetting,
    updateAppSettingsBulk,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
