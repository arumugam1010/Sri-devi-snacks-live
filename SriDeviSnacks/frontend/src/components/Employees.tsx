import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  CalendarCheck,
  IndianRupee,
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Coffee,
  Save,
  CreditCard,
  History,
  X,
  Eye,
  Camera,
  Briefcase,
  Heart,
  MapPin
} from 'lucide-react';
import { employeesAPI } from '../services/api';

interface Employee {
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
}

interface AttendanceRecord {
  employee_id: number;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  remarks: string;
}

interface SalarySummaryItem {
  employee_id: number;
  employee_code?: string;
  name: string;
  contact: string;
  joining_date: string;
  status: 'active' | 'inactive';
  salary_type: 'monthly' | 'daily';
  base_salary: number;
  days_in_month?: number;
  daily_rate?: number;
  deductions?: number;
  current_month_salary: number;
  previous_pending: number;
  total_owed: number;
  current_month_paid: number;
  net_pending: number;
  attendance_summary: {
    present: number;
    absent: number;
    half_day: number;
    leave: number;
  };
}

interface Payment {
  id: number;
  employee_id: number;
  amount: number;
  payment_date: string;
  month: string;
  remarks: string;
  created_at: string;
}

interface CheckInLog {
  id: number;
  name: string;
  time: string;
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

// Helper to always format and guarantee employee code in format SDS-YY-MM-XXX
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

const Employees: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance' | 'salaries'>('directory');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAdjustSalaryModalOpen, setIsAdjustSalaryModalOpen] = useState(false);

  // Form states
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedSummaryItem, setSelectedSummaryItem] = useState<SalarySummaryItem | null>(null);
  const [previewAddImage, setPreviewAddImage] = useState<string | null>(null);
  const [previewEditImage, setPreviewEditImage] = useState<string | null>(null);

  const [employeeForm, setEmployeeForm] = useState({
    employee_code: '',
    name: '',
    role: '',
    contact: '',
    blood_group: '',
    address: '',
    monthly_salary: '',
    salary_type: 'monthly' as 'monthly' | 'daily',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive'
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  const [adjustSalaryForm, setAdjustSalaryForm] = useState({
    salary_amount: ''
  });

  // Attendance states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, AttendanceRecord>>({});
  const [monthlyAttendanceStats, setMonthlyAttendanceStats] = useState<Record<number, { present: number; absent: number; half_day: number; leave: number }>>({});

  // Salary summary states
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [salarySummary, setSalarySummary] = useState<SalarySummaryItem[]>([]);
  const [selectedEmployeePayments, setSelectedEmployeePayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);



  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    } else if (activeTab === 'salaries') {
      fetchSalarySummary();

    }
  }, [activeTab, attendanceDate, selectedMonth]);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeesAPI.getEmployees();
      if (res.success) {
        setEmployees(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeesAPI.getAttendance(attendanceDate);
      if (res.success) {
        const activeEmpRes = await employeesAPI.getEmployees({ status: 'active' });
        const activeEmps: Employee[] = activeEmpRes.success ? activeEmpRes.data : [];

        const serverAttendance = res.data.attendance || {};
        const newMap: Record<number, AttendanceRecord> = {};

        activeEmps.forEach(emp => {
          newMap[emp.id] = {
            employee_id: emp.id,
            status: serverAttendance[emp.id]?.status || 'present',
            remarks: serverAttendance[emp.id]?.remarks || ''
          };
        });

        setAttendanceMap(newMap);
        setMonthlyAttendanceStats(res.data.monthly_stats || {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalarySummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeesAPI.getSalarySummary(selectedMonth);
      if (res.success) {
        setSalarySummary(res.data.summary || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch salary summary');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const openAddModal = async () => {
    const today = new Date().toISOString().split('T')[0];
    setPreviewAddImage(null);
    setEmployeeForm({
      employee_code: '',
      name: '',
      role: '',
      contact: '',
      blood_group: '',
      address: '',
      monthly_salary: '',
      salary_type: 'monthly',
      joining_date: today,
      status: 'active'
    });
    setIsAddModalOpen(true);
    try {
      const res = await employeesAPI.getNextEmployeeCode(today);
      if (res.success && res.data?.employee_code) {
        setEmployeeForm(prev => ({ ...prev, employee_code: res.data.employee_code }));
      }
    } catch (e) {
      console.error('Failed to get next employee code', e);
    }
  };

  const handleJoiningDateChange = async (dateVal: string) => {
    setEmployeeForm(prev => ({ ...prev, joining_date: dateVal }));
    try {
      const res = await employeesAPI.getNextEmployeeCode(dateVal);
      if (res.success && res.data?.employee_code) {
        setEmployeeForm(prev => ({ ...prev, employee_code: res.data.employee_code }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const compressed = await compressImage(base64);
          setPreviewAddImage(compressed);
        } catch {
          setPreviewAddImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const compressed = await compressImage(base64);
          setPreviewEditImage(compressed);
        } catch {
          setPreviewEditImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const salary = parseFloat(employeeForm.monthly_salary);
      if (isNaN(salary) || salary <= 0) {
        throw new Error('Please enter a valid salary/wage');
      }

      const res = await employeesAPI.createEmployee({
        employee_code: employeeForm.employee_code,
        name: employeeForm.name,
        role: employeeForm.role,
        contact: employeeForm.contact,
        blood_group: employeeForm.blood_group,
        address: employeeForm.address,
        image: previewAddImage,
        monthly_salary: salary,
        salary_type: employeeForm.salary_type,
        joining_date: employeeForm.joining_date
      });

      if (res.success) {
        showNotification('Employee added successfully');
        setIsAddModalOpen(false);
        setPreviewAddImage(null);
        setEmployeeForm({
          employee_code: '',
          name: '',
          role: '',
          contact: '',
          blood_group: '',
          address: '',
          monthly_salary: '',
          salary_type: 'monthly',
          joining_date: new Date().toISOString().split('T')[0],
          status: 'active'
        });
        fetchEmployees();
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add employee');
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setError(null);
    try {
      const salary = parseFloat(employeeForm.monthly_salary);
      if (isNaN(salary) || salary <= 0) {
        throw new Error('Please enter a valid salary/wage');
      }

      const res = await employeesAPI.updateEmployee(selectedEmployee.id, {
        employee_code: employeeForm.employee_code,
        name: employeeForm.name,
        role: employeeForm.role,
        contact: employeeForm.contact,
        blood_group: employeeForm.blood_group,
        address: employeeForm.address,
        image: previewEditImage,
        monthly_salary: salary,
        salary_type: employeeForm.salary_type,
        joining_date: employeeForm.joining_date,
        status: employeeForm.status
      });

      if (res.success) {
        showNotification('Employee updated successfully');
        setIsEditModalOpen(false);
        setSelectedEmployee(null);
        setPreviewEditImage(null);
        fetchEmployees();
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (empId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This will permanently delete their attendance, salary records, and payments.`)) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await employeesAPI.deleteEmployee(empId);
      if (res.success) {
        showNotification(`${name} deleted successfully`);
        fetchEmployees();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete employee');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setPreviewEditImage(emp.image || null);
    setEmployeeForm({
      employee_code: emp.employee_code || '',
      name: emp.name,
      role: emp.role || '',
      contact: emp.contact,
      blood_group: emp.blood_group || '',
      address: emp.address || '',
      monthly_salary: emp.monthly_salary.toString(),
      salary_type: emp.salary_type || 'monthly',
      joining_date: emp.joining_date,
      status: emp.status
    });
    setIsEditModalOpen(true);
  };

  const handleAttendanceChange = (empId: number, status: 'present' | 'absent' | 'half_day' | 'leave') => {
    setAttendanceMap(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        status
      }
    }));
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    setAttendanceMap(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        const numId = Number(id);
        if (updated[numId]) {
          updated[numId] = {
            ...updated[numId],
            status
          };
        }
      });
      return updated;
    });
  };

  const handleRemarksChange = (empId: number, remarks: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        remarks
      }
    }));
  };

  const handleSaveAttendance = async () => {
    setError(null);
    setLoading(true);
    try {
      const attendanceList = Object.values(attendanceMap);
      const res = await employeesAPI.saveAttendance({
        date: attendanceDate,
        attendance: attendanceList
      });
      if (res.success) {
        showNotification('Attendance saved successfully');
        fetchAttendance();
        fetchSalarySummary();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleClearDemoAttendance = async () => {
    if (!window.confirm("Are you sure you want to delete all demo attendance records before 01/10/2026?\n\n01/10/2026-க்கு முந்தைய அனைத்து டெமோ வருகைப் பதிவுகளையும் நீக்க விரும்புகிறீர்களா?")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await employeesAPI.clearDemoAttendance();
      if (res.success) {
        showNotification(res.message || 'Demo attendance records deleted successfully');
        fetchAttendance();
        fetchSalarySummary();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete demo attendance');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (item: SalarySummaryItem) => {
    setSelectedSummaryItem(item);
    setPaymentForm({
      amount: item.net_pending > 0 ? item.net_pending.toString() : '',
      payment_date: new Date().toISOString().split('T')[0],
      remarks: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSummaryItem) return;
    setError(null);
    try {
      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const res = await employeesAPI.addPayment({
        employee_id: selectedSummaryItem.employee_id,
        amount,
        payment_date: paymentForm.payment_date,
        month: selectedMonth,
        remarks: paymentForm.remarks
      });

      if (res.success) {
        showNotification(`Recorded payment of ₹${amount} for ${selectedSummaryItem.name}`);
        setIsPaymentModalOpen(false);
        setSelectedSummaryItem(null);
        fetchSalarySummary();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    }
  };

  const openHistoryModal = async (empId: number, name: string) => {
    setSelectedEmployee({ id: empId, name } as any);
    setIsHistoryModalOpen(true);
    setLoadingPayments(true);
    try {
      const res = await employeesAPI.getPayments(empId, selectedMonth);
      if (res.success) {
        setSelectedEmployeePayments(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment history');
    } finally {
      setLoadingPayments(false);
    }
  };

  const openAdjustSalaryModal = (item: SalarySummaryItem) => {
    setSelectedSummaryItem(item);
    setAdjustSalaryForm({
      salary_amount: item.current_month_salary.toString()
    });
    setIsAdjustSalaryModalOpen(true);
  };

  const handleAdjustSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSummaryItem) return;
    setError(null);
    try {
      const amount = parseFloat(adjustSalaryForm.salary_amount);
      if (isNaN(amount) || amount < 0) {
        throw new Error('Please enter a valid salary amount');
      }

      const res = await employeesAPI.saveMonthlySalary({
        employee_id: selectedSummaryItem.employee_id,
        month: selectedMonth,
        salary_amount: amount
      });

      if (res.success) {
        showNotification(`Adjusted ${selectedMonth} salary to ₹${amount} for ${selectedSummaryItem.name}`);
        setIsAdjustSalaryModalOpen(false);
        setSelectedSummaryItem(null);
        fetchSalarySummary();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to adjust monthly salary');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const code = getEmployeeCode(emp).toLowerCase();
    const search = searchTerm.toLowerCase();
    return emp.name.toLowerCase().includes(search) ||
      emp.contact.includes(searchTerm) ||
      code.includes(search);
  });

  // Totals calculations for the salary summary tab
  const totalSalaries = salarySummary.reduce((sum, item) => sum + item.current_month_salary, 0);
  const totalPreviousPending = salarySummary.reduce((sum, item) => sum + item.previous_pending, 0);
  const totalOwed = salarySummary.reduce((sum, item) => sum + item.total_owed, 0);
  const totalPaid = salarySummary.reduce((sum, item) => sum + item.current_month_paid, 0);
  const totalPending = salarySummary.reduce((sum, item) => sum + item.net_pending, 0);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-md">
          <div className="flex">
            <XCircle className="h-5 w-5 text-rose-600" />
            <div className="ml-3 text-sm text-rose-800 font-medium">{error}</div>
          </div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex flex-col xl:flex-row xl:justify-between items-start xl:items-center border-b border-gray-200 pb-3 gap-4">
        <div className="flex flex-wrap gap-1 bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'directory'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Employees List
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <CalendarCheck className="h-4 w-4 mr-2" />
            Attendance (வருகைப் பதிவு)
          </button>
          <button
            onClick={() => setActiveTab('salaries')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'salaries'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <IndianRupee className="h-4 w-4 mr-2" />
            Salaries & Payments
          </button>
        </div>

        {activeTab === 'directory' && (
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </button>
        )}
      </div>

      {/* Directory Tab */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search employees by name, ID or contact..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="text-sm text-gray-500">
              Total Employees: <span className="font-semibold text-gray-900">{filteredEmployees.length}</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mr-3" />
              <span className="text-gray-500 font-medium">Loading employees...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {searchTerm ? 'No employees found matching the search criteria.' : 'No employees added yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                    <th className="py-4 px-6">Emp ID</th>
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Contact</th>
                    <th className="py-4 px-6">Joining Date</th>
                    <th className="py-4 px-6">Base Salary</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {filteredEmployees.map(emp => (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-1 rounded-lg shadow-xs inline-block">
                          {getEmployeeCode(emp)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          {emp.image ? (
                            <img
                              src={emp.image}
                              alt={emp.name}
                              className="w-10 h-10 rounded-xl object-cover border border-gray-200 shadow-sm flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-gray-900 group-hover:text-blue-600 transition block">
                                {emp.name}
                              </span>
                              {emp.employee_code && (
                                <span className="text-[11px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md shadow-xs">
                                  {emp.employee_code}
                                </span>
                              )}
                            </div>
                            {emp.role && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-medium inline-block mt-0.5">
                                {emp.role}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium">{emp.contact}</td>
                      <td className="py-4 px-6">{new Date(emp.joining_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      <td className="py-4 px-6 font-medium text-gray-900">
                        ₹{emp.monthly_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span className="text-xs text-gray-500 block">
                          {emp.salary_type === 'daily' ? 'Daily Wage' : 'Monthly Wage'}
                        </span>
                      </td>
                                            <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                          emp.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => navigate(`/employees/${emp.id}`)}
                            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition border border-indigo-200 shadow-sm"
                            title="View Full Profile"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => openEditModal(emp)}
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition border border-blue-200 shadow-sm"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="inline-flex items-center text-xs text-red-600 hover:text-red-800 font-semibold bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition border border-red-200 shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
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
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Informational Banner: Auto-Attendance & Demo Notice */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Controls */}
          <div className="p-5 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-gray-50/60">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Navigation */}
              <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                <button
                  type="button"
                  title="Previous Day"
                  onClick={() => {
                    const d = new Date(attendanceDate);
                    d.setDate(d.getDate() - 1);
                    setAttendanceDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="px-2 py-1 border-none focus:outline-none text-sm font-bold text-gray-800 bg-transparent"
                />
                <button
                  type="button"
                  title="Next Day"
                  onClick={() => {
                    const d = new Date(attendanceDate);
                    d.setDate(d.getDate() + 1);
                    setAttendanceDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Today Button */}
              <button
                type="button"
                onClick={() => setAttendanceDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition shadow-sm"
              >
                Today (இன்று)
              </button>

              {/* Batch Quick Mark Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkAll('present')}
                  className="flex items-center px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition shadow-sm"
                  title="Mark everyone Present for this date"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Mark All Present (அனைவரும் வருகை)
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('absent')}
                  className="flex items-center px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 rounded-xl hover:bg-rose-100 transition shadow-sm"
                  title="Mark everyone Absent for this date"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1 text-rose-600" />
                  Mark All Absent (அனைவரும் விடுப்பு)
                </button>
              </div>
            </div>

            {/* Quick Top Save Button */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 hidden sm:inline">
                Default: <strong className="text-emerald-700">Present (வருகை)</strong>. Click <strong className="text-rose-700">Absent (விடுப்பு)</strong> for missing staff.
              </span>
              <button
                onClick={handleSaveAttendance}
                disabled={loading}
                className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition transform active:scale-95"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Attendance (சேமிக்க)
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mr-3" />
              <span className="text-gray-500 font-medium">Loading attendance records...</span>
            </div>
          ) : Object.keys(attendanceMap).length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No active employees found to track attendance.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                      <th className="py-4 px-6">Employee Details (பணியாளர்)</th>
                      <th className="py-4 px-6 text-center">Attendance (2 Options: Present / Absent)</th>
                      <th className="py-4 px-6">Remarks / Reason (குறிப்பு)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {Object.values(attendanceMap).map(record => {
                      const emp = employees.find(e => e.id === record.employee_id);
                      if (!emp) return null;
                      const isPresent = record.status === 'present';
                      const isAbsent = record.status === 'absent' || record.status === 'leave';
                      const stats = monthlyAttendanceStats[emp.id] || { present: 0, absent: 0, half_day: 0, leave: 0 };
                      const totalAbsentThisMonth = stats.absent + stats.leave;

                      return (
                        <tr key={record.employee_id} className={`transition-colors ${isAbsent ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-gray-50'}`}>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-base">{emp.name}</span>
                              <span className="text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-md shadow-xs">
                                {getEmployeeCode(emp)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                emp.salary_type === 'daily'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}>
                                {emp.salary_type === 'daily' ? `Daily Wage: ₹${emp.monthly_salary}/day` : `Monthly: ₹${emp.monthly_salary}/mo`}
                              </span>
                              <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                Month Total: <strong className="text-emerald-700">{stats.present} Present</strong> / <strong className="text-rose-700">{totalAbsentThisMonth} Absent</strong>
                              </span>
                            </div>

                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="inline-flex rounded-xl p-1 bg-gray-100 border border-gray-200 shadow-inner gap-2">
                              {/* Option 1: Present */}
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(record.employee_id, 'present')}
                                className={`flex items-center px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 scale-[1.03]'
                                    : 'text-gray-600 hover:text-emerald-700 hover:bg-white'
                                }`}
                              >
                                <CheckCircle className={`h-4 w-4 mr-1.5 ${isPresent ? 'text-white' : 'text-emerald-600'}`} />
                                Present (வருகை)
                              </button>

                              {/* Option 2: Absent */}
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(record.employee_id, 'absent')}
                                className={`flex items-center px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
                                  isAbsent
                                    ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400 scale-[1.03]'
                                    : 'text-gray-600 hover:text-rose-700 hover:bg-white'
                                }`}
                              >
                                <XCircle className={`h-4 w-4 mr-1.5 ${isAbsent ? 'text-white' : 'text-rose-600'}`} />
                                Absent (விடுப்பு)
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <input
                              type="text"
                              value={record.remarks}
                              onChange={e => handleRemarksChange(record.employee_id, e.target.value)}
                              placeholder={isAbsent ? "Reason for absent (e.g. sick, function)..." : "Notes / Remarks..."}
                              className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Footer Bar */}
              <div className="p-5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-600">
                  <span>Total Staff: <strong className="text-gray-900">{Object.keys(attendanceMap).length}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                    Present Today: {Object.values(attendanceMap).filter(r => r.status === 'present').length}
                  </span>
                  <span>•</span>
                  <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                    Absent Today: {Object.values(attendanceMap).filter(r => r.status === 'absent' || r.status === 'leave').length}
                  </span>
                </div>
                <button
                  onClick={handleSaveAttendance}
                  disabled={loading}
                  className="flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition transform active:scale-95"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Attendance (வருகைப் பதிவு சேமிக்க)
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Salaries & Payments Tab */}
      {activeTab === 'salaries' && (
        <div className="space-y-6">
          {/* Live Salary Notice */}
      
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Month Salaries</span>
              <span className="text-xl font-bold text-gray-900 mt-2">₹{totalSalaries.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Previous Pending</span>
              <span className="text-xl font-bold text-amber-600 mt-2">₹{totalPreviousPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Owed</span>
              <span className="text-xl font-bold text-gray-900 mt-2">₹{totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Paid</span>
              <span className="text-xl font-bold text-emerald-600 mt-2">₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between bg-blue-50 border-blue-100">
              <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Remaining Balance</span>
              <span className="text-xl font-bold text-blue-900 mt-2">₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-700">Salary Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-semibold text-gray-700"
                />
              </div>
              <div className="text-sm text-gray-500">
                Displays base salaries, attendance summaries, rollover balances and payments.
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center items-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mr-3" />
                <span className="text-gray-500 font-medium">Generating salary sheet...</span>
              </div>
            ) : salarySummary.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No active employee records for this month.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                      <th className="py-4 px-4">Employee (பணியாளர்)</th>
                      <th className="py-4 px-4 text-center">Attendance (வருகை விவரம்)</th>
                      <th className="py-4 px-4">Base Salary</th>
                      <th className="py-4 px-4">Monthly Salary Due</th>
                      <th className="py-4 px-4">Prev. Pending</th>
                      <th className="py-4 px-4">Total Owed</th>
                      <th className="py-4 px-4 text-emerald-700">Paid</th>
                      <th className="py-4 px-4 text-blue-700">Pending Bal</th>
                      <th className="py-4 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {salarySummary.map(item => {
                      const totalAbsent = item.attendance_summary.absent + (item.attendance_summary.leave || 0);
                      const daysInMonth = item.days_in_month || 30;
                      const dailyRate = item.daily_rate || (item.salary_type === 'daily' ? item.base_salary : (item.base_salary / daysInMonth));

                      return (
                        <tr key={item.employee_id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 font-semibold text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{item.name}</span>
                              <span className="text-[11px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded shadow-xs">
                                {getEmployeeCode({ id: item.employee_id, employee_code: item.employee_code })}
                              </span>
                            </div>
                            <div className="text-xs font-normal text-gray-500">{item.contact}</div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="inline-flex items-center space-x-1.5 text-xs">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200" title="Present Days">
                                  {item.attendance_summary.present} Present
                                </span>
                                <span className={`px-2 py-0.5 rounded-md font-bold border ${
                                  totalAbsent > 0
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : 'bg-gray-100 text-gray-400 border-gray-200'
                                }`} title="Absent Days">
                                  {totalAbsent} Absent
                                </span>
                              </div>
                              {item.attendance_summary.half_day > 0 && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                                  {item.attendance_summary.half_day} Half-day
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-gray-800">₹{item.base_salary.toLocaleString('en-IN')}</div>
                            <span className="text-xs text-gray-400 block font-normal">
                              {item.salary_type === 'daily' ? (
                                <span className="inline-block bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-blue-100">
                                  ₹{item.base_salary}/day
                                </span>
                              ) : (
                                <span className="inline-block bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-purple-100">
                                  Monthly (₹{Math.round(dailyRate)}/day)
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-gray-900 text-base">₹{item.current_month_salary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <button
                                onClick={() => openAdjustSalaryModal(item)}
                                className="text-gray-400 hover:text-blue-600 transition p-1 hover:bg-blue-50 rounded"
                                title="Override Salary Due for this month"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {item.salary_type === 'daily' ? (
                                <span className="text-emerald-700 font-medium">
                                  {item.attendance_summary.present} days × ₹{item.base_salary.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium">
                                  {item.attendance_summary.present} days × ₹{Math.round(dailyRate).toLocaleString('en-IN')}/day ({daysInMonth} days month{totalAbsent > 0 ? `, ${totalAbsent} absent` : ''})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-medium text-amber-600">₹{item.previous_pending.toLocaleString('en-IN')}</td>
                          <td className="py-4 px-4 font-semibold text-gray-900">₹{item.total_owed.toLocaleString('en-IN')}</td>
                          <td className="py-4 px-4 font-semibold text-emerald-600">₹{item.current_month_paid.toLocaleString('en-IN')}</td>
                          <td className="py-4 px-4 font-bold text-blue-700">₹{item.net_pending.toLocaleString('en-IN')}</td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex justify-center items-center space-x-2">
                              <button
                                onClick={() => openPaymentModal(item)}
                                className="inline-flex items-center px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg font-semibold text-xs transition"
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Pay
                              </button>
                              <button
                                onClick={() => openHistoryModal(item.employee_id, item.name)}
                                className="inline-flex items-center px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg font-semibold text-xs transition"
                              >
                                <History className="h-3 w-3 mr-1" />
                                History
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">Add New Employee</h3>
                <p className="text-xs text-gray-500 mt-0.5">Enter employee personal, job, and wage details</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Auto-Generated Employee ID */}
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
                    Employee ID (பணியாளர் எண்)
                  </span>
                  <p className="text-xs text-purple-600 mt-0.5">Auto-generated format: SDS-YY-MM-XXX</p>
                </div>
                <div className="flex items-center">
                  <span className="font-mono text-base font-extrabold bg-white text-purple-800 px-3.5 py-1.5 rounded-xl border border-purple-300 shadow-sm">
                    {employeeForm.employee_code || 'SDS-26-09-...'}
                  </span>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Employee Photo</label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 border-2 border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {previewAddImage ? (
                      <img src={previewAddImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-7 w-7 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      type="file"
                      id="add-emp-photo"
                      accept="image/*"
                      onChange={handleAddImageChange}
                      className="hidden"
                    />
                    <div className="flex space-x-2">
                      <label
                        htmlFor="add-emp-photo"
                        className="cursor-pointer px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
                      >
                        Choose Photo
                      </label>
                      {previewAddImage && (
                        <button
                          type="button"
                          onClick={() => setPreviewAddImage(null)}
                          className="px-3 py-1.5 border border-transparent rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 block">Optional image upload</span>
                  </div>
                </div>
              </div>

              {/* Name & Job Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Saravanan K"
                    value={employeeForm.name}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Job Role / Work (வேலை) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Baker, Driver, Helper"
                    value={employeeForm.role}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  />
                </div>
              </div>

              {/* Contact & Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9943206339"
                    value={employeeForm.contact}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, contact: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Blood Group</label>
                  <select
                    value={employeeForm.blood_group}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, blood_group: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium"
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
                  placeholder="Street name, door no, area, city, pincode"
                  value={employeeForm.address}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Salary Structure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Salary Type</label>
                  <div className="flex space-x-3 pt-1.5">
                    <label className="flex items-center space-x-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="add_salary_type"
                        value="monthly"
                        checked={employeeForm.salary_type === 'monthly'}
                        onChange={() => setEmployeeForm(prev => ({ ...prev, salary_type: 'monthly' }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Monthly Wage</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="add_salary_type"
                        value="daily"
                        checked={employeeForm.salary_type === 'daily'}
                        onChange={() => setEmployeeForm(prev => ({ ...prev, salary_type: 'daily' }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Daily Wage</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {employeeForm.salary_type === 'daily' ? 'Daily Wage Rate (₹) *' : 'Base Monthly Salary (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder={employeeForm.salary_type === 'daily' ? "e.g. 500" : "e.g. 15000"}
                    value={employeeForm.monthly_salary}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, monthly_salary: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
                  />
                </div>
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Joining Date *</label>
                <input
                  type="date"
                  required
                  value={employeeForm.joining_date}
                  onChange={e => handleJoiningDateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md text-sm font-semibold transition"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">Edit Employee Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update profile, role, address, or compensation</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Employee ID */}
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
                    Employee ID (பணியாளர் எண்)
                  </span>
                  <p className="text-xs text-purple-600 mt-0.5">Permanent employee identifier</p>
                </div>
                <div className="flex items-center">
                  <span className="font-mono text-base font-extrabold bg-white text-purple-800 px-3.5 py-1.5 rounded-xl border border-purple-300 shadow-sm">
                    {employeeForm.employee_code || 'Not Assigned'}
                  </span>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Employee Photo</label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 border-2 border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {previewEditImage ? (
                      <img src={previewEditImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-7 w-7 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      type="file"
                      id="edit-emp-photo-modal"
                      accept="image/*"
                      onChange={handleEditImageChange}
                      className="hidden"
                    />
                    <div className="flex space-x-2">
                      <label
                        htmlFor="edit-emp-photo-modal"
                        className="cursor-pointer px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
                      >
                        Choose Photo
                      </label>
                      {previewEditImage && (
                        <button
                          type="button"
                          onClick={() => setPreviewEditImage(null)}
                          className="px-3 py-1.5 border border-transparent rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Job Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Employee Name *</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.name}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Job Role / Work (வேலை) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Baker, Driver, Helper"
                    value={employeeForm.role}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  />
                </div>
              </div>

              {/* Contact & Blood Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={employeeForm.contact}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, contact: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Blood Group</label>
                  <select
                    value={employeeForm.blood_group}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, blood_group: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white font-medium"
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
                  placeholder="Street name, door no, area, city, pincode"
                  value={employeeForm.address}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Salary Structure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Salary Type</label>
                  <div className="flex space-x-3 pt-1.5">
                    <label className="flex items-center space-x-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="edit_salary_type"
                        value="monthly"
                        checked={employeeForm.salary_type === 'monthly'}
                        onChange={() => setEmployeeForm(prev => ({ ...prev, salary_type: 'monthly' }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Monthly Wage</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="edit_salary_type"
                        value="daily"
                        checked={employeeForm.salary_type === 'daily'}
                        onChange={() => setEmployeeForm(prev => ({ ...prev, salary_type: 'daily' }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Daily Wage</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {employeeForm.salary_type === 'daily' ? 'Daily Wage Rate (₹) *' : 'Base Monthly Salary (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={employeeForm.monthly_salary}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, monthly_salary: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-gray-900"
                  />
                </div>
              </div>

              {/* Joining Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={employeeForm.joining_date}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, joining_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={employeeForm.status}
                    onChange={e => setEmployeeForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 bg-white font-semibold"
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

      {/* Record Payment Modal */}
      {isPaymentModalOpen && selectedSummaryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Record Salary Payment</h3>
              <button
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedSummaryItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl space-y-1 text-sm border border-blue-100">
                <div className="text-blue-900">Employee: <span className="font-semibold">{selectedSummaryItem.name}</span></div>
                <div className="text-blue-900">Salary Month: <span className="font-semibold">{selectedMonth}</span></div>
                <div className="text-blue-900">Total Owed: <span className="font-semibold">₹{selectedSummaryItem.total_owed.toLocaleString('en-IN')}</span></div>
                <div className="text-blue-900">Paid So Far: <span className="font-semibold">₹{selectedSummaryItem.current_month_paid.toLocaleString('en-IN')}</span></div>
                <div className="text-blue-950 font-bold border-t border-blue-200/60 pt-1.5 mt-1.5">Net Pending: ₹{selectedSummaryItem.net_pending.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={e => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Remarks / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Cash payment, Bank transfer, advance deduction..."
                  value={paymentForm.remarks}
                  onChange={e => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedSummaryItem(null);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm text-sm font-semibold"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Override / Adjust Monthly Salary Modal */}
      {isAdjustSalaryModalOpen && selectedSummaryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Adjust Monthly Salary Due</h3>
              <button
                onClick={() => {
                  setIsAdjustSalaryModalOpen(false);
                  setSelectedSummaryItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAdjustSalary} className="p-5 space-y-4">
              <div className="bg-amber-50 p-4 rounded-xl text-sm border border-amber-100 space-y-1">
                <div className="text-amber-800">Employee: <span className="font-semibold text-gray-900">{selectedSummaryItem.name}</span></div>
                <div className="text-amber-800">Target Month: <span className="font-semibold text-gray-900">{selectedMonth}</span></div>
                <div className="text-amber-800">Base Salary: <span className="font-semibold text-gray-900">₹{selectedSummaryItem.base_salary.toLocaleString('en-IN')}</span></div>
                <p className="text-xs text-amber-700 mt-1 border-t border-amber-200/60 pt-1">
                  Adjusting the salary due for this month will NOT change the employee's base salary setting. It only overrides the amount owed for <strong>{selectedMonth}</strong>.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Monthly Salary Due (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="e.g. 14000"
                  value={adjustSalaryForm.salary_amount}
                  onChange={e => setAdjustSalaryForm(prev => ({ ...prev, salary_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-gray-800"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdjustSalaryModalOpen(false);
                    setSelectedSummaryItem(null);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm text-sm font-semibold"
                >
                  Save Salary Due
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {isHistoryModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">Payment History</h3>
                <p className="text-xs text-gray-500">Payments recorded for <span className="font-semibold text-gray-800">{selectedEmployee.name}</span> in {selectedMonth}</p>
              </div>
              <button
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setSelectedEmployee(null);
                  setSelectedEmployeePayments([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              {loadingPayments ? (
                <div className="py-8 flex justify-center items-center">
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin mr-2" />
                  <span className="text-gray-500 text-sm">Loading payments...</span>
                </div>
              ) : selectedEmployeePayments.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No payments recorded for this employee in {selectedMonth}.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Remarks / Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {selectedEmployeePayments.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">{new Date(payment.payment_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                          <td className="py-3 px-4 font-semibold text-emerald-600">₹{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-4 text-xs text-gray-600">{payment.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    setSelectedEmployee(null);
                    setSelectedEmployeePayments([]);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
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

export default Employees;
