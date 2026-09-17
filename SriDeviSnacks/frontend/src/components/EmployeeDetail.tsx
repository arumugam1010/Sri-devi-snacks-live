import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Calendar,
  IndianRupee,
  MapPin,
  Heart,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Plus,
  Loader2,
  History,
  X,
  Camera,
  AlertCircle
} from 'lucide-react';
import { employeesAPI } from '../services/api';

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  remarks: string;
}

interface PaymentRecord {
  id: number;
  amount: number;
  payment_date: string;
  month: string;
  remarks: string;
  created_at: string;
}

interface EmployeeDetailData {
  id: number;
  employee_code?: string;
  name: string;
  contact: string;
  monthly_salary: number;
  salary_type: 'monthly' | 'daily';
  joining_date: string;
  status: 'active' | 'inactive';
  is_biometric_registered: boolean;
  image?: string | null;
  role?: string | null;
  blood_group?: string | null;
  address?: string | null;
  created_at?: string;
  payments?: PaymentRecord[];
  current_month_attendance?: {
    month: string;
    counts: {
      present: number;
      absent: number;
      half_day: number;
      leave: number;
    };
    records: AttendanceRecord[];
  };
}

// Compress image helper
const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      const MAX_HEIGHT = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

// Helper to always guarantee employee code format SDS-YY-MM-XXX
export const getEmployeeCode = (emp?: { id?: number; employee_code?: string; created_at?: string; joining_date?: string } | null): string => {
  if (!emp) return 'SDS-26-09-001';
  if (emp.employee_code && emp.employee_code.trim() !== '' && emp.employee_code.toLowerCase() !== 'not assigned') {
    return emp.employee_code;
  }
  const idNum = emp.id || 1;
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `SDS-${yy}-${mm}-${String(idNum).padStart(3, '0')}`;
};

const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<EmployeeDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    employee_code: '',
    name: '',
    role: '',
    contact: '',
    blood_group: '',
    address: '',
    monthly_salary: '',
    salary_type: 'monthly' as 'monthly' | 'daily',
    joining_date: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    remarks: ''
  });

  useEffect(() => {
    if (id) {
      fetchEmployeeDetail(Number(id));
    }
  }, [id]);

  const fetchEmployeeDetail = async (empId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeesAPI.getEmployee(empId);
      if (res.success && res.data) {
        setEmployee(res.data);
      } else {
        setError(res.message || 'Employee not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!employee) return;
    setEditForm({
      employee_code: employee.employee_code || '',
      name: employee.name || '',
      role: employee.role || '',
      contact: employee.contact || '',
      blood_group: employee.blood_group || '',
      address: employee.address || '',
      monthly_salary: employee.monthly_salary.toString(),
      salary_type: employee.salary_type || 'monthly',
      joining_date: employee.joining_date || '',
      status: employee.status || 'active'
    });
    setPreviewImage(employee.image || null);
    setIsEditModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const compressed = await compressImage(base64);
          setPreviewImage(compressed);
        } catch {
          setPreviewImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    try {
      const salary = parseFloat(editForm.monthly_salary);
      if (isNaN(salary) || salary <= 0) {
        throw new Error('Please enter a valid salary amount');
      }

      const res = await employeesAPI.updateEmployee(employee.id, {
        employee_code: editForm.employee_code,
        name: editForm.name,
        contact: editForm.contact,
        role: editForm.role,
        blood_group: editForm.blood_group,
        address: editForm.address,
        image: previewImage,
        monthly_salary: salary,
        salary_type: editForm.salary_type,
        joining_date: editForm.joining_date,
        status: editForm.status
      });

      if (res.success) {
        showNotification('Employee details updated successfully');
        setIsEditModalOpen(false);
        fetchEmployeeDetail(employee.id);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update employee');
    }
  };

  // Add Payment Handler
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    try {
      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid payment amount');
      }

      const res = await employeesAPI.addPayment({
        employee_id: employee.id,
        amount,
        payment_date: paymentForm.payment_date,
        month: paymentForm.month,
        remarks: paymentForm.remarks
      });

      if (res.success) {
        showNotification(`Payment of ₹${amount} recorded successfully`);
        setIsPaymentModalOpen(false);
        setPaymentForm({
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
          remarks: ''
        });
        fetchEmployeeDetail(employee.id);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    }
  };

  // Helper for tenure
  const calculateTenure = (joiningDate: string) => {
    if (!joiningDate) return '';
    const join = new Date(joiningDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - join.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days ago`;
    const months = Math.floor(diffDays / 30.4375);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years} yr${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} mo` : ''}`;
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading employee profile...</p>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-xl space-y-3">
          <div className="flex items-center space-x-3 text-rose-800 font-bold text-lg">
            <AlertCircle className="h-6 w-6 text-rose-600" />
            <span>Employee Profile Error</span>
          </div>
          <p className="text-rose-700 text-sm">{error}</p>
          <button
            onClick={() => navigate('/employees')}
            className="inline-flex items-center px-4 py-2 bg-white border border-rose-200 text-rose-700 font-medium rounded-lg hover:bg-rose-100 transition shadow-sm text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees List
          </button>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  const totalPaid = (employee.payments || []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle className="h-5 w-5" />
          <span className="font-semibold text-sm">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3 text-rose-800 text-sm font-medium">
            <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <button
          onClick={() => navigate('/employees')}
          className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-blue-600 transition group"
        >
          <div className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm mr-2.5 group-hover:border-blue-400 group-hover:bg-blue-50 transition">
            <ArrowLeft className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
          </div>
          <span>Back to Employees List</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Record Payment
          </button>
          <button
            onClick={handleOpenEdit}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Edit className="h-4 w-4 mr-1.5" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* HERO SECTION: Employee Profile Overview */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl text-white shadow-xl overflow-hidden relative">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          {/* Avatar / Photo */}
          <div className="relative group flex-shrink-0">
            {employee.image ? (
              <img
                src={employee.image}
                alt={employee.name}
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border-4 border-white/20 shadow-2xl bg-white/10"
              />
            ) : (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white text-4xl md:text-5xl font-black shadow-2xl border-4 border-white/20">
                {employee.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={handleOpenEdit}
              title="Change Photo"
              className="absolute -bottom-2 -right-2 p-2 bg-white text-blue-800 rounded-xl shadow-lg hover:bg-gray-100 transition border border-gray-200"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          {/* Core Info */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">{employee.name}</h1>
              <span className="font-mono text-sm font-extrabold bg-white/20 backdrop-blur-md text-amber-200 border border-amber-300/40 px-3 py-1 rounded-xl shadow-sm">
                ID: {getEmployeeCode(employee)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                employee.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
              }`}>
                {employee.status}
              </span>
            </div>

            {/* Role / What work they do ("enna vela pakaranga") */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur-md text-white text-sm font-semibold border border-white/20">
                <Briefcase className="h-4 w-4 mr-2 text-blue-200" />
                <span>{employee.role || 'General Staff'}</span>
              </div>

              {employee.blood_group && (
                <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-rose-500/30 backdrop-blur-md text-rose-100 text-sm font-bold border border-rose-300/30">
                  <Heart className="h-4 w-4 mr-1.5 text-rose-300 fill-rose-300" />
                  <span>Blood Group: {employee.blood_group}</span>
                </div>
              )}

              <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white/10 text-white/90 text-sm">
                <Calendar className="h-4 w-4 mr-1.5 text-blue-200" />
                <span>Joined {new Date(employee.joining_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                <span className="ml-1.5 text-xs text-blue-200">({calculateTenure(employee.joining_date)})</span>
              </div>
            </div>

            {/* Quick Contact & Biometric quick status */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2 text-sm">
              <a
                href={`tel:${employee.contact}`}
                className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-100 font-semibold transition border border-emerald-400/30"
              >
                <Phone className="h-4 w-4 mr-2 text-emerald-300" />
                <span>+91 {employee.contact}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL GRID: Personal, Compensation & Attendance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Personal & Role Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center border-b border-gray-100 pb-3">
            <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
            Job Role & Personal Details
          </h3>

          <div className="space-y-3.5 text-sm">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Employee ID (பணியாளர் எண்)</span>
              <span className="text-base font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg inline-block mt-0.5 shadow-xs">
                {getEmployeeCode(employee)}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Designation / Role (வேலை)</span>
              <span className="text-base font-semibold text-gray-800">
                {employee.role || 'Not assigned'}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Blood Group</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-md text-xs font-bold ${
                employee.blood_group ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-gray-500'
              }`}>
                <Heart className="h-3 w-3 mr-1 text-rose-500 fill-rose-500" />
                {employee.blood_group || 'Not recorded'}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Contact Phone</span>
              <a href={`tel:${employee.contact}`} className="text-blue-600 hover:underline font-semibold flex items-center mt-0.5">
                <Phone className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                {employee.contact}
              </a>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Residential Address (முகவரி)</span>
              <div className="mt-1 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{employee.address || 'No address specified on file.'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Compensation & Salary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center border-b border-gray-100 pb-3">
            <IndianRupee className="h-5 w-5 mr-2 text-emerald-600" />
            Wage & Compensation
          </h3>

          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Wage System</span>
              <span className={`inline-flex items-center px-2.5 py-1 mt-1 rounded-lg text-xs font-bold capitalize ${
                employee.salary_type === 'daily'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {employee.salary_type === 'daily' ? 'Daily Wage Rate' : 'Monthly Fixed Salary'}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                {employee.salary_type === 'daily' ? 'Daily Wage Rate' : 'Base Monthly Salary'}
              </span>
              <div className="text-3xl font-extrabold text-gray-900 mt-1">
                ₹{employee.monthly_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                <span className="text-xs font-medium text-gray-500 ml-1">
                  {employee.salary_type === 'daily' ? '/ day' : '/ month'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-gray-500">Total Payments Recorded:</span>
                <span className="font-bold text-gray-900">₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-gray-500">Joining Date:</span>
                <span className="font-semibold text-gray-800">{new Date(employee.joining_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
              </div>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl transition border border-emerald-200 text-sm flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Pay Salary to Employee
            </button>
          </div>
        </div>

        {/* Card 3: Attendance Summary this month */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-indigo-600" />
              <span>Current Month Attendance</span>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {employee.current_month_attendance?.month || new Date().toISOString().substring(0, 7)}
            </span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-emerald-700">
                {employee.current_month_attendance?.counts.present || 0}
              </div>
              <div className="text-xs font-bold text-emerald-600 mt-0.5 uppercase tracking-wider">Present</div>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-rose-700">
                {employee.current_month_attendance?.counts.absent || 0}
              </div>
              <div className="text-xs font-bold text-rose-600 mt-0.5 uppercase tracking-wider">Absent</div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-amber-700">
                {employee.current_month_attendance?.counts.half_day || 0}
              </div>
              <div className="text-xs font-bold text-amber-600 mt-0.5 uppercase tracking-wider">Half Day</div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-blue-700">
                {employee.current_month_attendance?.counts.leave || 0}
              </div>
              <div className="text-xs font-bold text-blue-600 mt-0.5 uppercase tracking-wider">Leave</div>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2">
            Attendance tracked via the "Attendance" tab.
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Payment History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <History className="h-5 w-5 mr-2 text-blue-600" />
              Salary & Payment History
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Records of all payments issued to {employee.name}</p>
          </div>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Payment
          </button>
        </div>

        {(!employee.payments || employee.payments.length === 0) ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No salary payments recorded yet for this employee.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-6">Payment Date</th>
                  <th className="py-3 px-6">Salary Month</th>
                  <th className="py-3 px-6">Amount Paid</th>
                  <th className="py-3 px-6">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {employee.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="py-3.5 px-6 font-medium text-gray-900">
                      {new Date(p.payment_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">
                        {p.month}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-bold text-emerald-600">
                      ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-6 text-gray-500">
                      {p.remarks || 'Salary Payment'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT EMPLOYEE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-extrabold text-gray-900">Edit Employee Details</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Photo Upload Section */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Employee Photo</label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="file"
                      id="edit-emp-photo"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <div className="flex space-x-2">
                      <label
                        htmlFor="edit-emp-photo"
                        className="cursor-pointer px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
                      >
                        Choose Photo
                      </label>
                      {previewImage && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(null)}
                          className="px-3 py-1.5 border border-transparent rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 block">Square photos work best (JPEG or PNG).</span>
                  </div>
                </div>
              </div>

              {/* Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Job Role / Work (வேலை)</label>
                  <input
                    type="text"
                    placeholder="e.g. Master Baker, Driver, Helper"
                    value={editForm.role}
                    onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Contact & Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={editForm.contact}
                    onChange={e => setEditForm(prev => ({ ...prev, contact: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Blood Group</label>
                  <select
                    value={editForm.blood_group}
                    onChange={e => setEditForm(prev => ({ ...prev, blood_group: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium bg-white"
                  >
                    <option value="">-- Select Blood Group --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              {/* Residential Address */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Residential Address (முகவரி)</label>
                <textarea
                  rows={2}
                  placeholder="Street name, door number, area, city, pincode"
                  value={editForm.address}
                  onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Salary Structure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Salary Type</label>
                  <div className="flex space-x-3 pt-1">
                    <label className="flex items-center space-x-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="detail_salary_type"
                        value="monthly"
                        checked={editForm.salary_type === 'monthly'}
                        onChange={() => setEditForm(prev => ({ ...prev, salary_type: 'monthly' }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Monthly Wage</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="detail_salary_type"
                        value="daily"
                        checked={editForm.salary_type === 'daily'}
                        onChange={() => setEditForm(prev => ({ ...prev, salary_type: 'daily' }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Daily Wage</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {editForm.salary_type === 'daily' ? 'Daily Wage Rate (₹)' : 'Base Monthly Salary (₹)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editForm.monthly_salary}
                    onChange={e => setEditForm(prev => ({ ...prev, monthly_salary: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-gray-800"
                  />
                </div>
              </div>

              {/* Joining Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Joining Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.joining_date}
                    onChange={e => setEditForm(prev => ({ ...prev, joining_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Employee Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md text-sm font-semibold transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-extrabold text-gray-900">Record Salary Payment</h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-xs text-blue-900">
                Paying to: <span className="font-bold">{employee.name}</span> ({employee.role || 'Staff'})
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-lg font-black text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Salary Month</label>
                  <input
                    type="month"
                    required
                    value={paymentForm.month}
                    onChange={e => setPaymentForm(prev => ({ ...prev, month: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.payment_date}
                    onChange={e => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Advance, Full salary, Bank Transfer"
                  value={paymentForm.remarks}
                  onChange={e => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md text-sm font-semibold transition"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDetail;
