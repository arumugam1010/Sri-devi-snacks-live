import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  IndianRupee,
  Plus,
  Edit,
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
  Fingerprint,
  Smartphone
} from 'lucide-react';
import { employeesAPI } from '../services/api';

interface Employee {
  id: number;
  name: string;
  contact: string;
  monthly_salary: number;
  joining_date: string;
  status: 'active' | 'inactive';
  is_biometric_registered: boolean;
  created_at?: string;
}

interface AttendanceRecord {
  employee_id: number;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  remarks: string;
}

interface SalarySummaryItem {
  employee_id: number;
  name: string;
  contact: string;
  joining_date: string;
  status: 'active' | 'inactive';
  base_salary: number;
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

// Biometric Byte Utility Helpers
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToBytes = (base64: string): Uint8Array => {
  const cleaned = base64.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (cleaned.length % 4)) % 4);
  const binary = window.atob(cleaned + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const Employees: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance' | 'salaries' | 'biometric-gate'>('directory');
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
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    contact: '',
    monthly_salary: '',
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

  // Salary summary states
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [salarySummary, setSalarySummary] = useState<SalarySummaryItem[]>([]);
  const [selectedEmployeePayments, setSelectedEmployeePayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Biometric Gate states
  const [gateEmployees, setGateEmployees] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedGateEmpId, setSelectedGateEmpId] = useState<number | ''>('');
  const [gateScanning, setGateScanning] = useState(false);
  const [gateSuccess, setGateSuccess] = useState<{ name: string; time: string } | null>(null);
  const [todayCheckIns, setTodayCheckIns] = useState<CheckInLog[]>([]);
  const [loadingGate, setLoadingGate] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    } else if (activeTab === 'salaries') {
      fetchSalarySummary();
    } else if (activeTab === 'biometric-gate') {
      fetchGateData();
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

  const fetchGateData = async () => {
    setLoadingGate(true);
    setError(null);
    try {
      // 1. Fetch active employees with biometrics registered
      const res = await employeesAPI.getPublicActiveEmployees();
      if (res.success) {
        setGateEmployees(res.data || []);
      }

      // 2. Fetch today's check-ins from attendance log
      const todayStr = new Date().toISOString().split('T')[0];
      const attRes = await employeesAPI.getAttendance(todayStr);
      if (attRes.success) {
        const attendanceMap = attRes.data.attendance || {};
        const logs: CheckInLog[] = [];

        // Query all active employees to map names
        const empRes = await employeesAPI.getEmployees({ status: 'active' });
        const allActiveEmps: Employee[] = empRes.success ? empRes.data : [];

        allActiveEmps.forEach(emp => {
          const rec = attendanceMap[emp.id];
          if (rec && rec.status === 'present' && rec.remarks === 'Biometric Check-In') {
            logs.push({
              id: emp.id,
              name: emp.name,
              time: 'Checked In'
            });
          }
        });

        setTodayCheckIns(logs);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load biometric gate data');
    } finally {
      setLoadingGate(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // WebAuthn Biometric Registration Handler
  const handleRegisterBiometrics = async (emp: Employee) => {
    setError(null);
    if (!window.PublicKeyCredential) {
      setError('Biometric authentication is not supported by your browser or system.');
      return;
    }

    try {
      showNotification(`Preparing registry for ${emp.name}...`);
      
      // 1. Get registration challenge from server
      const res = await employeesAPI.getRegisterChallenge(emp.id);
      if (!res.success) throw new Error(res.message);
      
      const hexChallenge = res.data.challenge;
      const challengeBuffer = hexToBytes(hexChallenge);
      
      // Generate a user ID buffer
      const userIdBuffer = new TextEncoder().encode(`SDS-EMP-${emp.id}`);

      // 2. Configure WebAuthn creation options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challengeBuffer as any,
        rp: {
          name: "Sri Devi Snacks Portal",
          id: window.location.hostname
        },
        user: {
          id: userIdBuffer as any,
          name: emp.name,
          displayName: emp.name
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },  // ES256
          { type: "public-key", alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000
      };

      // 3. Request credential creation (prompts fingerprint dialog)
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Registry cancelled or failed.");
      }

      // 4. Extract public key and credential id
      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
      const publicKeyDer = attestationResponse.getPublicKey();
      if (!publicKeyDer) throw new Error("Could not retrieve public key from fingerprint hardware");
      const publicKeyBase64 = bytesToBase64(new Uint8Array(publicKeyDer));
      const credentialId = credential.id;

      // 5. Send key to server
      const regRes = await employeesAPI.registerBiometrics({
        employee_id: emp.id,
        credential_id: credentialId,
        public_key: publicKeyBase64,
        device_name: `${navigator.platform} (${navigator.userAgent.substring(0, 30)})`
      });

      if (regRes.success) {
        showNotification(`Successfully registered fingerprint for ${emp.name}!`);
        fetchEmployees();
      } else {
        throw new Error(regRes.message);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fingerprint registration failed. Make sure biometrics are set up on your device.');
    }
  };

  // WebAuthn Biometric Verification Check-in
  const handleBiometricGateCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGateSuccess(null);

    if (!selectedGateEmpId) {
      setError('Please select your name first.');
      return;
    }

    if (!window.PublicKeyCredential) {
      setError('Biometric authentication is not supported by your browser or system.');
      return;
    }

    setGateScanning(true);
    try {
      // 1. Fetch challenge & credential ID from server
      const res = await employeesAPI.getVerifyChallenge(selectedGateEmpId);
      if (!res.success) throw new Error(res.message);

      const { challenge, credential_id } = res.data;
      const challengeBuffer = hexToBytes(challenge);
      const credentialIdBuffer = base64ToBytes(credential_id);

      // 2. Configure request parameters
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challengeBuffer as any,
        allowCredentials: [{
          id: credentialIdBuffer as any,
          type: 'public-key'
        }],
        userVerification: 'required',
        timeout: 60000
      };

      // 3. Scan finger
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error("Biometric scan cancelled.");
      }

      // 4. Encode assertion components as hex
      const assertionResponse = assertion.response as AuthenticatorAssertionResponse;
      const authDataHex = bytesToHex(new Uint8Array(assertionResponse.authenticatorData));
      const signatureHex = bytesToHex(new Uint8Array(assertionResponse.signature));
      const clientDataStr = new TextDecoder().decode(assertionResponse.clientDataJSON);

      // 5. Send response to server to sign/mark present
      const verifyRes = await employeesAPI.verifyBiometrics({
        employee_id: selectedGateEmpId,
        authenticator_data: authDataHex,
        client_data_json: clientDataStr,
        signature: signatureHex
      });

      if (verifyRes.success) {
        const matchedEmp = gateEmployees.find(e => e.id === selectedGateEmpId);
        setGateSuccess({
          name: matchedEmp ? matchedEmp.name : 'Employee',
          time: verifyRes.data.time
        });
        setSelectedGateEmpId('');
        fetchGateData();
      } else {
        throw new Error(verifyRes.message);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification failed. Please scan your registered finger.');
    } finally {
      setGateScanning(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const salary = parseFloat(employeeForm.monthly_salary);
      if (isNaN(salary) || salary <= 0) {
        throw new Error('Please enter a valid monthly salary');
      }

      const res = await employeesAPI.createEmployee({
        name: employeeForm.name,
        contact: employeeForm.contact,
        monthly_salary: salary,
        joining_date: employeeForm.joining_date
      });

      if (res.success) {
        showNotification('Employee added successfully');
        setIsAddModalOpen(false);
        setEmployeeForm({
          name: '',
          contact: '',
          monthly_salary: '',
          joining_date: new Date().toISOString().split('T')[0],
          status: 'active'
        });
        fetchEmployees();
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
        throw new Error('Please enter a valid monthly salary');
      }

      const res = await employeesAPI.updateEmployee(selectedEmployee.id, {
        name: employeeForm.name,
        contact: employeeForm.contact,
        monthly_salary: salary,
        joining_date: employeeForm.joining_date,
        status: employeeForm.status
      });

      if (res.success) {
        showNotification('Employee updated successfully');
        setIsEditModalOpen(false);
        setSelectedEmployee(null);
        fetchEmployees();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update employee');
    }
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEmployeeForm({
      name: emp.name,
      contact: emp.contact,
      monthly_salary: emp.monthly_salary.toString(),
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
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save attendance');
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

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.contact.includes(searchTerm)
  );

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
            <UserCheck className="h-4 w-4 mr-2" />
            Daily Attendance
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
          <button
            onClick={() => setActiveTab('biometric-gate')}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'biometric-gate'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50'
            }`}
          >
            <Fingerprint className="h-4 w-4 mr-2 animate-pulse" />
            Biometric Gate
          </button>
        </div>

        {activeTab === 'directory' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
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
                placeholder="Search employees by name or contact..."
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
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Contact</th>
                    <th className="py-4 px-6">Joining Date</th>
                    <th className="py-4 px-6">Base Salary</th>
                    <th className="py-4 px-6">Biometrics</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-gray-900">{emp.name}</td>
                      <td className="py-4 px-6">{emp.contact}</td>
                      <td className="py-4 px-6">{new Date(emp.joining_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      <td className="py-4 px-6 font-medium text-gray-900">₹{emp.monthly_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            emp.is_biometric_registered
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {emp.is_biometric_registered ? 'Registered' : 'Not Setup'}
                          </span>
                          <button
                            onClick={() => handleRegisterBiometrics(emp)}
                            className="inline-flex items-center text-xs text-emerald-600 hover:text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition border border-emerald-200"
                            title="Register Fingerprint on this device"
                          >
                            <Fingerprint className="h-3.5 w-3.5 mr-1" />
                            Setup
                          </button>
                        </div>
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
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <Edit className="h-4 w-4 mr-1.5" />
                          Edit
                        </button>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const d = new Date(attendanceDate);
                  d.setDate(d.getDate() - 1);
                  setAttendanceDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="relative">
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-semibold text-gray-700 bg-white"
                />
              </div>
              <button
                onClick={() => {
                  const d = new Date(attendanceDate);
                  d.setDate(d.getDate() + 1);
                  setAttendanceDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Mark employee attendance for the selected date.
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mr-3" />
              <span className="text-gray-500 font-medium">Loading attendance records...</span>
            </div>
          ) : Object.keys(attendanceMap).length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No active employees to track attendance for.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                      <th className="py-4 px-6">Employee Name</th>
                      <th className="py-4 px-6">Attendance Status</th>
                      <th className="py-4 px-6">Remarks / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {Object.values(attendanceMap).map(record => {
                      const emp = employees.find(e => e.id === record.employee_id);
                      if (!emp) return null;
                      return (
                        <tr key={record.employee_id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 font-semibold text-gray-900">
                            <div>{emp.name}</div>
                            {record.remarks === 'Biometric Check-In' && (
                              <div className="text-xs text-emerald-600 font-medium flex items-center mt-0.5">
                                <Fingerprint className="h-3 w-3 mr-0.5" />
                                Checked in via fingerprint
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(record.employee_id, 'present')}
                                className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                                  record.status === 'present'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-transparent'
                                }`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(record.employee_id, 'half_day')}
                                className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                                  record.status === 'half_day'
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-transparent'
                                }`}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Half Day
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(record.employee_id, 'absent')}
                                className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                                  record.status === 'absent'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-transparent'
                                }`}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(record.employee_id, 'leave')}
                                className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                                  record.status === 'leave'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-transparent'
                                }`}
                              >
                                <Coffee className="h-3 w-3 mr-1" />
                                Leave
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <input
                              type="text"
                              value={record.remarks}
                              onChange={e => handleRemarksChange(record.employee_id, e.target.value)}
                              placeholder="e.g. sick leave, late arrival..."
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={handleSaveAttendance}
                  className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Attendance
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Salaries & Payments Tab */}
      {activeTab === 'salaries' && (
        <div className="space-y-6">
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
                      <th className="py-4 px-4">Employee</th>
                      <th className="py-4 px-4 text-center">Attendance (P/HD/A/L)</th>
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
                    {salarySummary.map(item => (
                      <tr key={item.employee_id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4 font-semibold text-gray-900">
                          <div>{item.name}</div>
                          <div className="text-xs font-normal text-gray-500">{item.contact}</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex space-x-1 text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium" title="Present">{item.attendance_summary.present}P</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-medium" title="Half-day">{item.attendance_summary.half_day}H</span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 font-medium" title="Absent">{item.attendance_summary.absent}A</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-medium" title="Leave">{item.attendance_summary.leave}L</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-500">₹{item.base_salary.toLocaleString('en-IN')}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-gray-900">₹{item.current_month_salary.toLocaleString('en-IN')}</span>
                            <button
                              onClick={() => openAdjustSalaryModal(item)}
                              className="text-gray-400 hover:text-blue-600 transition"
                              title="Override Salary Due for this month"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
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
                              className="inline-flex items-center px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-md font-semibold text-xs transition"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pay
                            </button>
                            <button
                              onClick={() => openHistoryModal(item.employee_id, item.name)}
                              className="inline-flex items-center px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-md font-semibold text-xs transition"
                            >
                              <History className="h-3 w-3 mr-1" />
                              History
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
        </div>
      )}

      {/* Biometric Gate Tab */}
      {activeTab === 'biometric-gate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Scanning Terminal */}
          <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-between min-h-[480px]">
            <div className="text-center w-full">
              <h3 className="text-xl font-bold text-gray-800">Biometric Attendance Terminal</h3>
              <p className="text-sm text-gray-500 mt-1">Select your name, then tap scan to register present status.</p>
              <div className="text-2xl font-semibold text-gray-900 mt-4 tracking-wide font-mono">
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div className="text-sm font-medium text-gray-500">{new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</div>
            </div>

            <form onSubmit={handleBiometricGateCheckIn} className="w-full max-w-sm space-y-6 my-8">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">Select Employee Name</label>
                {loadingGate ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                ) : gateEmployees.length === 0 ? (
                  <p className="text-center text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
                    No employees have fingerprint biometrics registered yet. Please setup biometrics in the "Employees List" tab first.
                  </p>
                ) : (
                  <select
                    value={selectedGateEmpId}
                    onChange={e => {
                      setSelectedGateEmpId(e.target.value ? parseInt(e.target.value) : '');
                      setGateSuccess(null);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg shadow-sm"
                  >
                    <option value="">-- Choose Your Name --</option>
                    {gateEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col items-center justify-center">
                <button
                  type="submit"
                  disabled={!selectedGateEmpId || gateScanning}
                  className={`w-36 h-36 rounded-full flex flex-col items-center justify-center border-4 transition shadow-lg ${
                    gateScanning
                      ? 'bg-blue-50 border-blue-600 text-blue-600 scale-95 shadow-inner cursor-wait animate-pulse'
                      : selectedGateEmpId
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600 hover:bg-emerald-100 hover:scale-105 active:scale-95 cursor-pointer'
                        : 'bg-gray-50 border-gray-300 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <Fingerprint className={`w-16 h-16 ${gateScanning ? 'animate-pulse' : ''}`} />
                  <span className="text-xs font-bold mt-2 uppercase tracking-wider">
                    {gateScanning ? 'Scanning...' : 'Scan Finger'}
                  </span>
                </button>
              </div>
            </form>

            {/* Success visual banner */}
            <div className="w-full min-h-[60px] flex items-center justify-center">
              {gateSuccess && (
                <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-6 py-3 rounded-2xl flex items-center space-x-3 w-full max-w-md shadow-sm animate-in fade-in zoom-in-95">
                  <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm">Check-in Success!</div>
                    <div className="text-xs">{gateSuccess.name} marked Present at {gateSuccess.time}.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Logs of today's check-ins */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col min-h-[480px]">
            <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center">
              <Smartphone className="h-4 w-4 mr-1.5 text-blue-600" />
              Today's Biometric Logs
            </h4>
            <div className="flex-1 overflow-y-auto max-h-[360px] divide-y divide-gray-100">
              {loadingGate ? (
                <div className="py-12 flex flex-col items-center text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 mb-2 text-blue-600" />
                  <span className="text-xs">Loading logs...</span>
                </div>
              ) : todayCheckIns.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  No biometric check-ins recorded yet today.
                </div>
              ) : (
                todayCheckIns.map(log => (
                  <div key={log.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full">
                        <Fingerprint className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-gray-800 text-sm">{log.name}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Checked In</span>
                  </div>
                ))
              )}
            </div>
            <div className="text-xs text-gray-400 text-center border-t border-gray-100 pt-3 mt-3">
              Employees unchecked remain registered as "Absent/Leave" by default in salary summaries.
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Add New Employee</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Employee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saravanan K"
                  value={employeeForm.name}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9943206339"
                  value={employeeForm.contact}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, contact: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Base Monthly Salary (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 15000"
                  value={employeeForm.monthly_salary}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, monthly_salary: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Joining Date</label>
                <input
                  type="date"
                  required
                  value={employeeForm.joining_date}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, joining_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm text-sm font-semibold"
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
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Edit Employee Details</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditEmployee} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Employee Name</label>
                <input
                  type="text"
                  required
                  value={employeeForm.name}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Number</label>
                <input
                  type="tel"
                  required
                  value={employeeForm.contact}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, contact: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Base Monthly Salary (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={employeeForm.monthly_salary}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, monthly_salary: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Joining Date</label>
                <input
                  type="date"
                  required
                  value={employeeForm.joining_date}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, joining_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={employeeForm.status}
                  onChange={e => setEmployeeForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm text-sm font-semibold"
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
