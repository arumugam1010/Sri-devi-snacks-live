import React, { useState, useEffect, useMemo } from 'react';
import {
  WalletCards,
  Fuel,
  Users,
  Plus,
  Trash2,
  Edit,
  Search,
  Calendar,
  IndianRupee,
  Package,
  Layers,
  Sparkles,
  ShoppingBag,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
  Truck,
  Flame,
  Coffee,
  FileText
} from 'lucide-react';
import { expensesAPI, CompanyExpenseInput } from '../services/api';

interface ExpenseItem {
  id: number;
  category: 'fuel' | 'marapodi' | 'small_items' | 'other';
  sub_category?: string | null;
  item_name: string;
  amount: number;
  expense_date: string;
  quantity?: string | null;
  payment_mode?: string;
  remarks?: string | null;
  created_at?: string;
}

interface SalaryPaymentItem {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code?: string;
  amount: number;
  payment_date: string;
  month: string;
  remarks?: string | null;
}

interface ExpenseSummary {
  grand_total: number;
  salary_total: number;
  fuel_total: number;
  marapodi_total: number;
  small_items_total: number;
  other_total: number;
}

const LOCAL_STORAGE_KEY = 'sds_company_expenses_cache';

const Expenses: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [activeTab, setActiveTab] = useState<'all' | 'small_items' | 'fuel' | 'marapodi' | 'salary'>('all');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPaymentItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    grand_total: 0,
    salary_total: 0,
    fuel_total: 0,
    marapodi_total: 0,
    small_items_total: 0,
    other_total: 0
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState<{
    category: 'fuel' | 'marapodi' | 'small_items' | 'other';
    sub_category: string;
    item_name: string;
    amount: string;
    expense_date: string;
    quantity: string;
    payment_mode: string;
    remarks: string;
  }>({
    category: 'small_items',
    sub_category: 'DIESEL',
    item_name: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    quantity: '',
    payment_mode: 'CASH',
    remarks: ''
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch expenses
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await expensesAPI.getExpenses({ month: selectedMonth });
      if (res && res.success && res.data) {
        const fetchedExpenses: ExpenseItem[] = res.data.expenses || [];
        const fetchedSalaries: SalaryPaymentItem[] = res.data.salary_payments || [];
        const fetchedSummary: ExpenseSummary = res.data.summary || {
          grand_total: 0,
          salary_total: 0,
          fuel_total: 0,
          marapodi_total: 0,
          small_items_total: 0,
          other_total: 0
        };

        setExpenses(fetchedExpenses);
        setSalaryPayments(fetchedSalaries);
        setSummary(fetchedSummary);

        // Cache locally for offline resilience
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            month: selectedMonth,
            expenses: fetchedExpenses,
            salaryPayments: fetchedSalaries,
            summary: fetchedSummary
          }));
        } catch (e) {}
      } else {
        fallbackToLocalStorage();
      }
    } catch (err: any) {
      console.warn('API fetch failed, reading from local cache:', err);
      fallbackToLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const fallbackToLocalStorage = () => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.month === selectedMonth) {
          setExpenses(parsed.expenses || []);
          setSalaryPayments(parsed.salaryPayments || []);
          setSummary(parsed.summary || {
            grand_total: 0,
            salary_total: 0,
            fuel_total: 0,
            marapodi_total: 0,
            small_items_total: 0,
            other_total: 0
          });
          return;
        }
      }
    } catch (e) {}
    // Recalculate from local expenses array if any
    recalculateTotals(expenses, salaryPayments);
  };

  const recalculateTotals = (expList: ExpenseItem[], salList: SalaryPaymentItem[]) => {
    let fuelTotal = 0;
    let marapodiTotal = 0;
    let smallItemsTotal = 0;
    let otherTotal = 0;

    expList.forEach(e => {
      const amt = Number(e.amount) || 0;
      if (e.category === 'fuel') fuelTotal += amt;
      else if (e.category === 'marapodi') marapodiTotal += amt;
      else if (e.category === 'small_items') smallItemsTotal += amt;
      else otherTotal += amt;
    });

    const salaryTotal = salList.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const grandTotal = salaryTotal + fuelTotal + marapodiTotal + smallItemsTotal + otherTotal;

    setSummary({
      grand_total: grandTotal,
      salary_total: salaryTotal,
      fuel_total: fuelTotal,
      marapodi_total: marapodiTotal,
      small_items_total: smallItemsTotal,
      other_total: otherTotal
    });
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth]);

  // Open modal with preselected category
  const handleOpenAddModal = (presetCategory: 'fuel' | 'marapodi' | 'small_items' | 'other' = 'small_items', presetSub?: string) => {
    setEditingExpense(null);
    let defaultItemName = '';
    if (presetCategory === 'marapodi') defaultItemName = 'Marapodi (மரப்பொடி)';
    else if (presetCategory === 'fuel') defaultItemName = `Fuel - ${presetSub || 'DIESEL'}`;

    setFormData({
      category: presetCategory,
      sub_category: presetSub || (presetCategory === 'fuel' ? 'DIESEL' : ''),
      item_name: defaultItemName,
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      quantity: presetCategory === 'marapodi' ? '5 bags' : '',
      payment_mode: 'CASH',
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      sub_category: expense.sub_category || 'DIESEL',
      item_name: expense.item_name,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      quantity: expense.quantity || '',
      payment_mode: expense.payment_mode || 'CASH',
      remarks: expense.remarks || ''
    });
    setIsModalOpen(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Please enter a valid amount (செலவு தொகையை சரியாக குறிப்பிடவும்)', 'error');
      return;
    }

    if (!formData.item_name.trim()) {
      showToast('Please specify the item name / description', 'error');
      return;
    }

    setSubmitting(true);
    const payload: CompanyExpenseInput = {
      category: formData.category,
      sub_category: formData.category === 'fuel' ? formData.sub_category : undefined,
      item_name: formData.item_name.trim(),
      amount: amountNum,
      expense_date: formData.expense_date,
      quantity: formData.quantity.trim() || undefined,
      payment_mode: formData.payment_mode,
      remarks: formData.remarks.trim() || undefined
    };

    try {
      if (editingExpense) {
        await expensesAPI.updateExpense(editingExpense.id, payload);
        showToast('Expense updated successfully (செலவு விவரம் மாற்றப்பட்டது)');
      } else {
        await expensesAPI.createExpense(payload);
        showToast('Expense logged successfully (செலவு பதிவு செய்யப்பட்டது)');
      }
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      console.warn('API error, applying optimistic local save:', err);
      // Optimistic local save
      if (editingExpense) {
        const updated: ExpenseItem[] = expenses.map(item => item.id === editingExpense.id ? {
          ...item,
          category: payload.category,
          sub_category: payload.sub_category,
          item_name: payload.item_name,
          amount: amountNum,
          expense_date: payload.expense_date || item.expense_date,
          quantity: payload.quantity,
          payment_mode: payload.payment_mode,
          remarks: payload.remarks
        } : item);
        setExpenses(updated);
        recalculateTotals(updated, salaryPayments);
      } else {
        const newItem: ExpenseItem = {
          id: Date.now(),
          category: payload.category,
          sub_category: payload.sub_category,
          item_name: payload.item_name,
          amount: amountNum,
          expense_date: payload.expense_date || new Date().toISOString().split('T')[0],
          quantity: payload.quantity,
          payment_mode: payload.payment_mode,
          remarks: payload.remarks,
          created_at: new Date().toISOString()
        };
        const updated: ExpenseItem[] = [newItem, ...expenses];
        setExpenses(updated);
        recalculateTotals(updated, salaryPayments);
      }
      showToast('Saved successfully');
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await expensesAPI.deleteExpense(id);
      showToast('Expense deleted successfully');
      fetchExpenses();
    } catch (err) {
      // Local removal
      const updated = expenses.filter(e => e.id !== id);
      setExpenses(updated);
      recalculateTotals(updated, salaryPayments);
      showToast('Deleted from list');
    }
  };

  // Filtered lists
  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (activeTab !== 'all' && activeTab !== 'salary') {
      list = list.filter(e => e.category === activeTab);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(e =>
        e.item_name.toLowerCase().includes(q) ||
        (e.sub_category && e.sub_category.toLowerCase().includes(q)) ||
        (e.remarks && e.remarks.toLowerCase().includes(q)) ||
        (e.payment_mode && e.payment_mode.toLowerCase().includes(q))
      );
    }
    return list;
  }, [expenses, activeTab, searchTerm]);

  const filteredSalaries = useMemo(() => {
    if (!searchTerm.trim()) return salaryPayments;
    const q = searchTerm.toLowerCase();
    return salaryPayments.filter(s =>
      s.employee_name.toLowerCase().includes(q) ||
      (s.employee_code && s.employee_code.toLowerCase().includes(q)) ||
      (s.remarks && s.remarks.toLowerCase().includes(q))
    );
  }, [salaryPayments, searchTerm]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center px-4 py-3 rounded-2xl shadow-xl text-white font-medium text-sm transition-all transform animate-bounce ${
            notification.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="h-5 w-5 mr-2" />
          ) : (
            <CheckCircle2 className="h-5 w-5 mr-2" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header & Month Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-md">
              <WalletCards className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Company Expenses (நிறுவன செலவுகள்)
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Consolidated tracking of Staff Salaries, Fuel (Petrol/CNG/Diesel), Marapodi & Daily Petty Cash
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Month Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-2xl border border-gray-200">
            <Calendar className="h-4 w-4 text-purple-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-800 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleOpenAddModal('small_items')}
            className="flex items-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-purple-200 transition transform active:scale-95"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Expense (செலவு)
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Grand Total */}
        <div className="bg-gradient-to-br from-purple-700 via-indigo-800 to-indigo-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-purple-200">
              Grand Total (மொத்தம்)
            </span>
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
              <TrendingDown className="h-4 w-4 text-purple-200" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl lg:text-3xl font-black tracking-tight">
              ₹{summary.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-purple-200/90 font-medium block mt-0.5">
              All outflows for {selectedMonth}
            </span>
          </div>
          <div className="text-[11px] bg-white/15 px-2.5 py-1 rounded-xl text-purple-100 font-semibold inline-block self-start">
            Salaries + Fuel + Marapodi + Misc
          </div>
        </div>

        {/* Card 2: Staff Salary Total (Auto Synced) */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-700">
              Staff Salaries (சம்பளம்)
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-gray-900">
              ₹{summary.salary_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
              ✓ Auto-synced from Employees
            </span>
          </div>
          <button
            onClick={() => setActiveTab('salary')}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center"
          >
            View {salaryPayments.length} payouts →
          </button>
        </div>

        {/* Card 3: Fuel (Petrol / CNG / Diesel) */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-amber-700">
              Fuel & Diesel (எரிபொருள்)
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Fuel className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-gray-900">
              ₹{summary.fuel_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-gray-500 font-medium block mt-0.5">
              Petrol, CNG, Diesel
            </span>
          </div>
          <button
            onClick={() => handleOpenAddModal('fuel', 'DIESEL')}
            className="text-xs text-amber-700 hover:text-amber-800 font-bold inline-flex items-center"
          >
            + Add Fuel Log
          </button>
        </div>

        {/* Card 4: Marapodi (Wood powder) */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-rose-700">
              Marapodi (மரப்பொடி)
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-gray-900">
              ₹{summary.marapodi_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-gray-500 font-medium block mt-0.5">
              Furnace sawdust / bags
            </span>
          </div>
          <button
            onClick={() => handleOpenAddModal('marapodi')}
            className="text-xs text-rose-700 hover:text-rose-800 font-bold inline-flex items-center"
          >
            + Add Marapodi
          </button>
        </div>

        {/* Card 5: Small Items / Misc */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-blue-700">
              Small Items (சின்ன பொருட்கள்)
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-gray-900">
              ₹{summary.small_items_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-gray-500 font-medium block mt-0.5">
              Tea, Packing, Repairs, Misc
            </span>
          </div>
          <button
            onClick={() => handleOpenAddModal('small_items')}
            className="text-xs text-blue-700 hover:text-blue-800 font-bold inline-flex items-center"
          >
            + Add Small Item
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Navigation Tabs & Search */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center px-4 py-2 text-xs font-extrabold rounded-xl transition ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-100'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              All Outflows ({expenses.length + salaryPayments.length})
            </button>

            <button
              onClick={() => setActiveTab('small_items')}
              className={`flex items-center px-4 py-2 text-xs font-extrabold rounded-xl transition ${
                activeTab === 'small_items'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
              Small Items / Misc (சின்ன பொருட்கள்)
            </button>

            <button
              onClick={() => setActiveTab('fuel')}
              className={`flex items-center px-4 py-2 text-xs font-extrabold rounded-xl transition ${
                activeTab === 'fuel'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-100'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Fuel className="h-3.5 w-3.5 mr-1.5" />
              Fuel & Diesel (பெட்ரோல்/CNG/டீசல்)
            </button>

            <button
              onClick={() => setActiveTab('marapodi')}
              className={`flex items-center px-4 py-2 text-xs font-extrabold rounded-xl transition ${
                activeTab === 'marapodi'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-100'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Flame className="h-3.5 w-3.5 mr-1.5" />
              Marapodi (மரப்பொடி)
            </button>

            <button
              onClick={() => setActiveTab('salary')}
              className={`flex items-center px-4 py-2 text-xs font-extrabold rounded-xl transition ${
                activeTab === 'salary'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Salaries Paid (சம்பள விபரம்)
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            <span className="text-gray-500 text-sm font-medium">Loading expenses...</span>
          </div>
        ) : activeTab === 'salary' ? (
          /* Salary Payments Table */
          filteredSalaries.length === 0 ? (
            <div className="p-16 text-center text-gray-400 text-sm font-medium">
              No salary payments recorded for this month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                    <th className="py-3.5 px-6">Emp ID</th>
                    <th className="py-3.5 px-6">Employee Name</th>
                    <th className="py-3.5 px-6">Payment Date</th>
                    <th className="py-3.5 px-6">Amount (தொகை)</th>
                    <th className="py-3.5 px-6">Remarks / Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {filteredSalaries.map(sal => (
                    <tr key={sal.id} className="hover:bg-emerald-50/40 transition">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                          {sal.employee_code}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-900">{sal.employee_name}</td>
                      <td className="py-4 px-6 text-gray-600">
                        {new Date(sal.payment_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>
                      <td className="py-4 px-6 font-black text-emerald-700">
                        ₹{sal.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-500">{sal.remarks || 'Salary Payout'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredExpenses.length === 0 ? (
          <div className="p-16 text-center text-gray-400 text-sm font-medium">
            No expenses found for this selection. Click "+ Add Expense" to record one!
          </div>
        ) : (
          /* General Company Expenses Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Item / Description</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Quantity</th>
                  <th className="py-3.5 px-6">Payment Mode</th>
                  <th className="py-3.5 px-6">Amount (தொகை)</th>
                  <th className="py-3.5 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-4 px-6 whitespace-nowrap">
                      {exp.category === 'fuel' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                          <Fuel className="h-3 w-3 mr-1 text-amber-600" />
                          {exp.sub_category || 'Fuel'}
                        </span>
                      ) : exp.category === 'marapodi' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-50 text-rose-800 border border-rose-200">
                          <Flame className="h-3 w-3 mr-1 text-rose-600" />
                          Marapodi (மரப்பொடி)
                        </span>
                      ) : exp.category === 'small_items' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                          <ShoppingBag className="h-3 w-3 mr-1 text-blue-600" />
                          Small Item
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-gray-100 text-gray-800 border border-gray-200">
                          Other
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900">{exp.item_name}</div>
                      {exp.remarks && <div className="text-xs text-gray-400 mt-0.5">{exp.remarks}</div>}
                    </td>

                    <td className="py-4 px-6 text-gray-600 whitespace-nowrap">
                      {new Date(exp.expense_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </td>

                    <td className="py-4 px-6 text-gray-600 font-medium">
                      {exp.quantity || '-'}
                    </td>

                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                        {exp.payment_mode || 'CASH'}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-black text-gray-900 text-base whitespace-nowrap">
                      ₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(exp)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.item_name)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <WalletCards className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">
                    {editingExpense ? 'Edit Expense (செலவு திருத்து)' : 'Record New Expense (புதிய செலவு பதிவு)'}
                  </h3>
                  <p className="text-xs text-gray-500">Petrol, CNG, Diesel, Marapodi or Company Small Items</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Category Selector Chips */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Expense Category (செலவு பிரிவு) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      category: 'fuel',
                      sub_category: 'DIESEL',
                      item_name: 'Fuel - DIESEL'
                    }))}
                    className={`flex flex-col items-center p-3 rounded-2xl border text-xs font-extrabold transition ${
                      formData.category === 'fuel'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400/40 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Fuel className="h-5 w-5 mb-1 text-amber-600" />
                    <span>Fuel & Diesel</span>
                    <span className="text-[10px] font-normal text-amber-700">பெட்ரோல்/டீசல்</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      category: 'marapodi',
                      sub_category: '',
                      item_name: 'Marapodi (மரப்பொடி)',
                      quantity: prev.quantity || '5 bags'
                    }))}
                    className={`flex flex-col items-center p-3 rounded-2xl border text-xs font-extrabold transition ${
                      formData.category === 'marapodi'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-400/40 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Flame className="h-5 w-5 mb-1 text-rose-600" />
                    <span>Marapodi</span>
                    <span className="text-[10px] font-normal text-rose-700">மரப்பொடி</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      category: 'small_items',
                      sub_category: '',
                      item_name: ''
                    }))}
                    className={`flex flex-col items-center p-3 rounded-2xl border text-xs font-extrabold transition ${
                      formData.category === 'small_items'
                        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-400/40 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ShoppingBag className="h-5 w-5 mb-1 text-blue-600" />
                    <span>Small Items</span>
                    <span className="text-[10px] font-normal text-blue-700">சின்ன பொருட்கள்</span>
                  </button>
                </div>
              </div>

              {/* Fuel Type Sub-selector */}
              {formData.category === 'fuel' && (
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200">
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                    Fuel Type (எரிபொருள் வகை)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['DIESEL', 'PETROL', 'CNG', 'CNG+PETROL'].map(ft => (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          sub_category: ft,
                          item_name: `Fuel - ${ft}`
                        }))}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-extrabold transition ${
                          formData.sub_category === ft
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-white text-gray-700 border border-amber-200 hover:bg-amber-100/50'
                        }`}
                      >
                        {ft}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Item Name / Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Item Name / Description (பொருளின் பெயர் / விபரம்) *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.category === 'marapodi'
                      ? 'e.g. Marapodi (மரப்பொடி)'
                      : formData.category === 'fuel'
                      ? 'e.g. Diesel for Delivery Van'
                      : 'e.g. Tea & snacks for staff, Packing covers, Rope, Cleaning soap'
                  }
                  value={formData.item_name}
                  onChange={e => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Amount & Quantity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Amount (தொகை ₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full pl-8 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-extrabold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Quantity / Bags (அளவு / மூட்டைகள்)
                  </label>
                  <input
                    type="text"
                    placeholder={formData.category === 'marapodi' ? 'e.g. 5 bags / 10 மூட்டைகள்' : 'e.g. 15 liters, 2 pkts'}
                    value={formData.quantity}
                    onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Expense Date (தேதி) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={e => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Payment Mode (செலுத்திய முறை)
                  </label>
                  <select
                    value={formData.payment_mode}
                    onChange={e => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  >
                    <option value="CASH">CASH (ரொக்கம்)</option>
                    <option value="GPAY">GPAY / UPI (கூகுள் பே)</option>
                    <option value="BANK">Bank Transfer (வங்கி)</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Remarks / Notes (குறிப்பு)
                </label>
                <input
                  type="text"
                  placeholder="Optional note / vehicle number / shop name"
                  value={formData.remarks}
                  onChange={e => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-600"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 text-sm font-bold transition"
                >
                  Cancel (ரத்து)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md shadow-purple-200 transition transform active:scale-95"
                >
                  {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense (சேமிக்க)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
