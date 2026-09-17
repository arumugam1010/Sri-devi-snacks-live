<?php
/**
 * Employees Controller
 */

function handleEmployeesRoute($parts, $method) {
    $action = $parts[1] ?? '';

    // Allow public access to biometric verify/list endpoints (no token required)
    if ($action === 'biometric') {
        $subAction = $parts[2] ?? '';
        if ($subAction === 'verify-challenge' && $method === 'POST') {
            getVerifyChallenge();
            return;
        }
        if ($subAction === 'verify' && $method === 'POST') {
            verifyBiometrics();
            return;
        }
        if ($subAction === 'list-active' && $method === 'GET') {
            getPublicActiveEmployees();
            return;
        }
    }

    // Authenticate and require SUPER_ADMIN role for other routes
    $user = requireAdminUser();
    if ($user['role'] !== 'SUPER_ADMIN') {
        sendResponse(false, 'Forbidden: Super Admin access required', null, 403);
    }

    // Admin biometric routes
    if ($action === 'biometric') {
        $subAction = $parts[2] ?? '';
        if ($subAction === 'check' && $method === 'GET') {
            checkBiometricsRegistered();
            return;
        }
        if ($subAction === 'register-challenge' && $method === 'POST') {
            getRegisterChallenge();
            return;
        }
        if ($subAction === 'register' && $method === 'POST') {
            registerBiometrics();
            return;
        }
    }

    // Route: GET /employees/salary-summary
    if ($action === 'salary-summary' && $method === 'GET') {
        getSalarySummary();
        return;
    }

    // Route: POST /employees/salary
    if ($action === 'salary' && $method === 'POST') {
        saveMonthlySalary();
        return;
    }

    // Route: GET, POST or DELETE /employees/attendance
    if ($action === 'attendance') {
        $subAction = $parts[2] ?? '';
        if ($subAction === 'clear-demo' && in_array($method, ['POST', 'DELETE'])) {
            clearDemoAttendance();
            return;
        }
        if ($method === 'GET') {
            getAttendanceRecords();
        } elseif ($method === 'POST') {
            saveAttendanceRecords();
        } elseif ($method === 'DELETE') {
            clearDemoAttendance();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    // Route: GET or POST /employees/payments
    if ($action === 'payments') {
        if ($method === 'GET') {
            getPaymentsList();
        } elseif ($method === 'POST') {
            addPayment();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    // Route: GET /employees/next-code
    if ($action === 'next-code' && $method === 'GET') {
        getNextCodeAction();
        return;
    }

    // Route: GET /employees or POST /employees
    if (empty($action)) {
        if ($method === 'GET') {
            getEmployeesList();
        } elseif ($method === 'POST') {
            createEmployee();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    // Route: GET /employees/:id, PUT /employees/:id, or DELETE /employees/:id
    if (is_numeric($action)) {
        $employeeId = (int)$action;
        if ($method === 'GET') {
            getEmployeeById($employeeId);
        } elseif ($method === 'PUT') {
            updateEmployee($employeeId);
        } elseif ($method === 'DELETE') {
            deleteEmployee($employeeId);
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    sendResponse(false, 'Action not found in employees', null, 404);
}

/**
 * Helper to generate next employee code in format SDS-YY-MM-XXX
 * e.g. SDS-26-09-001
 */
function generateNextEmployeeCode($db, $targetDate = null) {
    $time = $targetDate ? (strtotime($targetDate) ?: time()) : time();
    $year = date('y', $time);
    $month = date('m', $time);
    $prefix = "SDS-{$year}-{$month}-";

    $stmt = $db->prepare("SELECT employee_code FROM employees WHERE employee_code LIKE :prefix ORDER BY employee_code DESC LIMIT 1");
    $stmt->execute(['prefix' => $prefix . '%']);
    $lastCode = $stmt->fetchColumn();

    $nextNum = 1;
    if ($lastCode) {
        $parts = explode('-', $lastCode);
        $lastNum = (int)end($parts);
        $nextNum = $lastNum + 1;
    }

    return $prefix . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
}

/**
 * GET /api/employees/next-code
 */
function getNextCodeAction() {
    $db = getDatabaseConnection();
    try {
        $targetDate = $_GET['joining_date'] ?? date('Y-m-d');
        $code = generateNextEmployeeCode($db, $targetDate);
        sendResponse(true, '', ['employee_code' => $code]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * GET /api/employees
 */
function getEmployeesList() {
    $db = getDatabaseConnection();
    $status = $_GET['status'] ?? '';

    try {
        $query = "SELECT e.id, e.employee_code, e.name, e.contact, e.monthly_salary, e.salary_type, e.joining_date, e.status, e.image, e.role, e.blood_group, e.address, e.created_at, e.updated_at, 
                  (SELECT COUNT(*) FROM employee_biometrics b WHERE b.employee_id = e.id) > 0 AS is_biometric_registered 
                  FROM employees e";
        $params = [];

        if ($status !== '') {
            $query .= " WHERE e.status = :status";
            $params['status'] = $status;
        }

        $query .= " ORDER BY e.name ASC";
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Cast values appropriately
        foreach ($employees as &$emp) {
            $emp['id'] = (int)$emp['id'];
            $emp['employee_code'] = $emp['employee_code'] ?? '';
            $emp['monthly_salary'] = (float)$emp['monthly_salary'];
            $emp['salary_type'] = $emp['salary_type'] ?? 'monthly';
            $emp['is_biometric_registered'] = (bool)$emp['is_biometric_registered'];
            $emp['image'] = $emp['image'] ?? null;
            $emp['role'] = $emp['role'] ?? '';
            $emp['blood_group'] = $emp['blood_group'] ?? '';
            $emp['address'] = $emp['address'] ?? '';
        }

        sendResponse(true, '', $employees);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * GET /api/employees/:id
 */
function getEmployeeById($id) {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT e.id, e.employee_code, e.name, e.contact, e.monthly_salary, e.salary_type, e.joining_date, e.status, e.image, e.role, e.blood_group, e.address, e.created_at, e.updated_at,
                              (SELECT COUNT(*) FROM employee_biometrics b WHERE b.employee_id = e.id) > 0 AS is_biometric_registered
                              FROM employees e WHERE e.id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$employee) {
            sendResponse(false, 'Employee not found', null, 404);
        }

        $employee['id'] = (int)$employee['id'];
        $employee['employee_code'] = $employee['employee_code'] ?? '';
        $employee['monthly_salary'] = (float)$employee['monthly_salary'];
        $employee['salary_type'] = $employee['salary_type'] ?? 'monthly';
        $employee['is_biometric_registered'] = (bool)$employee['is_biometric_registered'];
        $employee['image'] = $employee['image'] ?? null;
        $employee['role'] = $employee['role'] ?? '';
        $employee['blood_group'] = $employee['blood_group'] ?? '';
        $employee['address'] = $employee['address'] ?? '';

        // Fetch recent payments for this employee
        $pStmt = $db->prepare("SELECT id, amount, payment_date, month, remarks, created_at FROM employee_payments WHERE employee_id = :id ORDER BY payment_date DESC, id DESC LIMIT 50");
        $pStmt->execute(['id' => $id]);
        $payments = $pStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($payments as &$p) {
            $p['id'] = (int)$p['id'];
            $p['amount'] = (float)$p['amount'];
        }
        $employee['payments'] = $payments;

        // Current month attendance summary
        $currentMonth = date('Y-m');
        $liveStartMonth = '2026-10';
        $attStmt = $db->prepare("SELECT date, status, remarks FROM employee_attendance WHERE employee_id = :id AND date LIKE :month ORDER BY date DESC");
        $attStmt->execute(['id' => $id, 'month' => $currentMonth . '-%']);
        $attendance = $attStmt->fetchAll(PDO::FETCH_ASSOC);

        $counts = ['present' => 0, 'absent' => 0, 'half_day' => 0, 'leave' => 0];
        foreach ($attendance as $a) {
            $st = $a['status'];
            if (isset($counts[$st])) {
                $counts[$st]++;
            }
        }

        // Live calculation from 2026-10 onwards (default present minus recorded leaves/absences)
        if ($currentMonth >= $liveStartMonth && ($employee['status'] ?? 'active') === 'active') {
            $joiningDay = (int)date('j', strtotime($employee['joining_date']));
            $joiningMonthStr = date('Y-m', strtotime($employee['joining_date']));
            $startDay = ($joiningMonthStr === $currentMonth) ? max(1, $joiningDay) : 1;
            $elapsedDays = max(0, (int)date('j') - $startDay + 1);
            $totalAbsentDays = $counts['absent'] + $counts['leave'] + ($counts['half_day'] * 0.5);
            $counts['present'] = max(0, (int)round($elapsedDays - $totalAbsentDays));
        }

        $employee['current_month_attendance'] = [
            'month' => $currentMonth,
            'counts' => $counts,
            'records' => $attendance
        ];

        sendResponse(true, '', $employee);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * POST /api/employees
 */
function createEmployee() {
    $data = getJsonInput();
    $name = trim($data['name'] ?? '');
    $contact = trim($data['contact'] ?? '');
    $monthlySalary = isset($data['monthly_salary']) ? (float)$data['monthly_salary'] : 0.0;
    $salaryType = trim($data['salary_type'] ?? 'monthly');
    $joiningDate = trim($data['joining_date'] ?? '');
    $image = $data['image'] ?? null;
    $role = trim($data['role'] ?? '');
    $bloodGroup = trim($data['blood_group'] ?? '');
    $address = trim($data['address'] ?? '');
    $employeeCode = trim($data['employee_code'] ?? '');

    if ($name === '' || $contact === '' || $monthlySalary <= 0 || $joiningDate === '') {
        sendResponse(false, 'Invalid input. All required fields (name, contact, monthly_salary, joining_date) must be filled.', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        if ($employeeCode === '') {
            $employeeCode = generateNextEmployeeCode($db, $joiningDate);
        } else {
            $stmtCheck = $db->prepare("SELECT id FROM employees WHERE employee_code = :code LIMIT 1");
            $stmtCheck->execute(['code' => $employeeCode]);
            if ($stmtCheck->fetch()) {
                $employeeCode = generateNextEmployeeCode($db, $joiningDate);
            }
        }

        $stmt = $db->prepare("INSERT INTO employees (employee_code, name, contact, monthly_salary, salary_type, joining_date, status, image, role, blood_group, address) VALUES (:employee_code, :name, :contact, :monthly_salary, :salary_type, :joining_date, 'active', :image, :role, :blood_group, :address)");
        $stmt->execute([
            'employee_code' => $employeeCode,
            'name' => $name,
            'contact' => $contact,
            'monthly_salary' => $monthlySalary,
            'salary_type' => $salaryType,
            'joining_date' => $joiningDate,
            'image' => $image,
            'role' => $role,
            'blood_group' => $bloodGroup,
            'address' => $address
        ]);

        $newId = (int)$db->lastInsertId();
        sendResponse(true, 'Employee added successfully', ['id' => $newId, 'employee_code' => $employeeCode], 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * PUT /api/employees/:id
 */
function updateEmployee($id) {
    $data = getJsonInput();
    $name = trim($data['name'] ?? '');
    $contact = trim($data['contact'] ?? '');
    $monthlySalary = isset($data['monthly_salary']) ? (float)$data['monthly_salary'] : 0.0;
    $salaryType = trim($data['salary_type'] ?? 'monthly');
    $joiningDate = trim($data['joining_date'] ?? '');
    $status = trim($data['status'] ?? 'active');
    $role = trim($data['role'] ?? '');
    $bloodGroup = trim($data['blood_group'] ?? '');
    $address = trim($data['address'] ?? '');
    $employeeCode = trim($data['employee_code'] ?? '');

    if ($name === '' || $contact === '' || $monthlySalary <= 0 || $joiningDate === '') {
        sendResponse(false, 'Invalid input. All required fields (name, contact, monthly_salary, joining_date) must be filled.', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        if ($employeeCode !== '') {
            $chk = $db->prepare("SELECT id FROM employees WHERE employee_code = :code AND id != :id LIMIT 1");
            $chk->execute(['code' => $employeeCode, 'id' => $id]);
            if ($chk->fetch()) {
                sendResponse(false, 'Employee ID is already taken by another employee', null, 400);
            }
        }

        if (array_key_exists('image', $data)) {
            $image = $data['image'];
            if ($employeeCode !== '') {
                $stmt = $db->prepare("UPDATE employees SET employee_code = :employee_code, name = :name, contact = :contact, monthly_salary = :monthly_salary, salary_type = :salary_type, joining_date = :joining_date, status = :status, image = :image, role = :role, blood_group = :blood_group, address = :address WHERE id = :id");
                $params = [
                    'employee_code' => $employeeCode,
                    'name' => $name,
                    'contact' => $contact,
                    'monthly_salary' => $monthlySalary,
                    'salary_type' => $salaryType,
                    'joining_date' => $joiningDate,
                    'status' => $status,
                    'image' => $image,
                    'role' => $role,
                    'blood_group' => $bloodGroup,
                    'address' => $address,
                    'id' => $id
                ];
            } else {
                $stmt = $db->prepare("UPDATE employees SET name = :name, contact = :contact, monthly_salary = :monthly_salary, salary_type = :salary_type, joining_date = :joining_date, status = :status, image = :image, role = :role, blood_group = :blood_group, address = :address WHERE id = :id");
                $params = [
                    'name' => $name,
                    'contact' => $contact,
                    'monthly_salary' => $monthlySalary,
                    'salary_type' => $salaryType,
                    'joining_date' => $joiningDate,
                    'status' => $status,
                    'image' => $image,
                    'role' => $role,
                    'blood_group' => $bloodGroup,
                    'address' => $address,
                    'id' => $id
                ];
            }
            $stmt->execute($params);
        } else {
            if ($employeeCode !== '') {
                $stmt = $db->prepare("UPDATE employees SET employee_code = :employee_code, name = :name, contact = :contact, monthly_salary = :monthly_salary, salary_type = :salary_type, joining_date = :joining_date, status = :status, role = :role, blood_group = :blood_group, address = :address WHERE id = :id");
                $params = [
                    'employee_code' => $employeeCode,
                    'name' => $name,
                    'contact' => $contact,
                    'monthly_salary' => $monthlySalary,
                    'salary_type' => $salaryType,
                    'joining_date' => $joiningDate,
                    'status' => $status,
                    'role' => $role,
                    'blood_group' => $bloodGroup,
                    'address' => $address,
                    'id' => $id
                ];
            } else {
                $stmt = $db->prepare("UPDATE employees SET name = :name, contact = :contact, monthly_salary = :monthly_salary, salary_type = :salary_type, joining_date = :joining_date, status = :status, role = :role, blood_group = :blood_group, address = :address WHERE id = :id");
                $params = [
                    'name' => $name,
                    'contact' => $contact,
                    'monthly_salary' => $monthlySalary,
                    'salary_type' => $salaryType,
                    'joining_date' => $joiningDate,
                    'status' => $status,
                    'role' => $role,
                    'blood_group' => $bloodGroup,
                    'address' => $address,
                    'id' => $id
                ];
            }
            $stmt->execute($params);
        }

        sendResponse(true, 'Employee updated successfully');
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * DELETE /api/employees/:id
 */
function deleteEmployee($id) {
    $db = getDatabaseConnection();
    try {
        $db->beginTransaction();

        // 1. Delete biometric registration if exists
        $stmt = $db->prepare("DELETE FROM employee_biometrics WHERE employee_id = :id");
        $stmt->execute(['id' => $id]);

        // 2. Delete attendance records
        $stmt = $db->prepare("DELETE FROM employee_attendance WHERE employee_id = :id");
        $stmt->execute(['id' => $id]);

        // 3. Delete salary records
        $stmt = $db->prepare("DELETE FROM employee_salaries WHERE employee_id = :id");
        $stmt->execute(['id' => $id]);

        // 4. Delete payments
        $stmt = $db->prepare("DELETE FROM employee_payments WHERE employee_id = :id");
        $stmt->execute(['id' => $id]);

        // 5. Delete employee
        $stmt = $db->prepare("DELETE FROM employees WHERE id = :id");
        $stmt->execute(['id' => $id]);

        $db->commit();
        sendResponse(true, 'Employee deleted successfully');
    } catch (PDOException $e) {
        $db->rollBack();
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * POST /api/employees/attendance/clear-demo or DELETE /api/employees/attendance
 * Clears all demo attendance records prior to 2026-10-01
 */
function clearDemoAttendance() {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("DELETE FROM employee_attendance WHERE date < '2026-10-01'");
        $stmt->execute();
        $count = $stmt->rowCount();

        sendResponse(true, "Deleted {$count} demo attendance record(s) up to now (prior to 01/10/2026).", [
            'deleted_count' => $count
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * GET /api/employees/attendance
 */
function getAttendanceRecords() {
    $db = getDatabaseConnection();
    $date = $_GET['date'] ?? date('Y-m-d');
    $month = date('Y-m', strtotime($date));
    $liveStartMonth = '2026-10';
    $liveStartDate = '2026-10-01';
    $isLivePeriod = ($month >= $liveStartMonth);

    try {
        $stmt = $db->prepare("SELECT id, employee_id, date, status, remarks FROM employee_attendance WHERE date = :date");
        $stmt->execute(['date' => $date]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Map records by employee_id
        $attendanceMap = [];
        foreach ($records as $rec) {
            $attendanceMap[(int)$rec['employee_id']] = [
                'status' => $rec['status'],
                'remarks' => $rec['remarks']
            ];
        }

        // Get monthly attendance counts
        $startDate = $month . "-01";
        $endDate = date("Y-m-t", strtotime($date));

        $stmtStats = $db->prepare("
            SELECT employee_id, status, COUNT(*) as count 
            FROM employee_attendance 
            WHERE date BETWEEN :start AND :end 
            GROUP BY employee_id, status
        ");
        $stmtStats->execute(['start' => $startDate, 'end' => $endDate]);
        $statsRecords = $stmtStats->fetchAll(PDO::FETCH_ASSOC);

        $explicitStats = [];
        foreach ($statsRecords as $stat) {
            $empId = (int)$stat['employee_id'];
            if (!isset($explicitStats[$empId])) {
                $explicitStats[$empId] = [
                    'present' => 0,
                    'absent' => 0,
                    'half_day' => 0,
                    'leave' => 0
                ];
            }
            $statusKey = strtolower($stat['status']);
            if (isset($explicitStats[$empId][$statusKey])) {
                $explicitStats[$empId][$statusKey] = (int)$stat['count'];
            }
        }

        $statsMap = [];
        if (!$isLivePeriod) {
            // DEMO PERIOD (< 2026-10): Only explicit records counted
            $statsMap = $explicitStats;
        } else {
            // LIVE PERIOD (>= 2026-10): Auto-present for all active employees
            $empStmt = $db->query("SELECT id, joining_date FROM employees WHERE status = 'active'");
            $activeEmps = $empStmt->fetchAll(PDO::FETCH_ASSOC);

            $daysInMonth = (int)date('t', strtotime($date));
            $todayMonth = date('Y-m');

            foreach ($activeEmps as $emp) {
                $empId = (int)$emp['id'];
                $joiningDate = $emp['joining_date'];
                $joiningDay = (int)date('j', strtotime($joiningDate));
                $joiningMonthStr = date('Y-m', strtotime($joiningDate));
                $startDay = ($joiningMonthStr === $month) ? max(1, $joiningDay) : 1;
                $eligibleDays = max(0, $daysInMonth - $startDay + 1);

                $absent = $explicitStats[$empId]['absent'] ?? 0;
                $leave = $explicitStats[$empId]['leave'] ?? 0;
                $halfDay = $explicitStats[$empId]['half_day'] ?? 0;
                $totalAbsentDays = $absent + $leave + ($halfDay * 0.5);

                if ($month === $todayMonth) {
                    $elapsedDays = max(0, (int)date('j') - $startDay + 1);
                    $present = max(0, (int)round($elapsedDays - $totalAbsentDays));
                } elseif ($month < $todayMonth) {
                    $present = max(0, (int)round($eligibleDays - $totalAbsentDays));
                } else {
                    $present = 0;
                }

                $statsMap[$empId] = [
                    'present' => $present,
                    'absent' => $absent,
                    'half_day' => $halfDay,
                    'leave' => $leave
                ];

                // Default daily attendance to present if not set for live period
                if ($date >= $liveStartDate && !isset($attendanceMap[$empId])) {
                    $attendanceMap[$empId] = [
                        'status' => 'present',
                        'remarks' => ''
                    ];
                }
            }
        }

        sendResponse(true, '', [
            'date' => $date,
            'attendance' => $attendanceMap,
            'monthly_stats' => $statsMap,
            'is_live_period' => $isLivePeriod,
            'live_start_date' => $liveStartDate
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * POST /api/employees/attendance
 */
function saveAttendanceRecords() {
    $data = getJsonInput();
    $date = trim($data['date'] ?? '');
    $attendanceList = $data['attendance'] ?? [];

    if ($date === '' || !is_array($attendanceList)) {
        sendResponse(false, 'Invalid input. Date and attendance list are required.', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $db->beginTransaction();

        $stmt = $db->prepare("
            INSERT INTO employee_attendance (employee_id, date, status, remarks) 
            VALUES (:employee_id, :date, :status, :remarks)
            ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)
        ");

        foreach ($attendanceList as $item) {
            $empId = (int)($item['employee_id'] ?? 0);
            $status = trim($item['status'] ?? 'present');
            $remarks = isset($item['remarks']) ? trim($item['remarks']) : null;

            if ($empId > 0) {
                $stmt->execute([
                    'employee_id' => $empId,
                    'date' => $date,
                    'status' => $status,
                    'remarks' => $remarks
                ]);
            }
        }

        $db->commit();
        sendResponse(true, 'Attendance updated successfully');
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * GET /api/employees/salary-summary
 */
function getSalarySummary() {
    $db = getDatabaseConnection();
    $month = $_GET['month'] ?? date('Y-m');

    // Parse month to get range
    $time = strtotime($month . "-01");
    if (!$time) {
        $month = date('Y-m');
        $time = strtotime($month . "-01");
    }
    $endOfMonth = date('Y-m-t', $time);

    try {
        // Only fetch employees who joined on or before the end of the selected month
        $stmt = $db->prepare("SELECT id, employee_code, name, contact, monthly_salary, salary_type, joining_date, status FROM employees WHERE joining_date <= :end_date AND (status = 'active' OR (status = 'inactive' AND updated_at >= :start_date)) ORDER BY name ASC");
        $stmt->execute([
            'end_date' => $endOfMonth,
            'start_date' => $month . "-01"
        ]);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $summary = [];
        foreach ($employees as $employee) {
            $summary[] = calculateEmployeeSalaryDetails($db, $employee, $month);
        }

        sendResponse(true, '', [
            'month' => $month,
            'summary' => $summary
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Helper to compute previous pending, monthly salary, payments and net balance
 */
function calculateEmployeeSalaryDetails($db, $employee, $selectedMonth) {
    $empId = (int)$employee['id'];
    $joiningDate = $employee['joining_date'];
    $baseSalary = (float)$employee['monthly_salary'];
    $salaryType = $employee['salary_type'] ?? 'monthly';

    // Parse selected month
    $selectedTime = strtotime($selectedMonth . "-01");
    $selectedYearMonth = date('Y-m', $selectedTime);

    // Parse joining month
    $joiningTime = strtotime(date('Y-m-01', strtotime($joiningDate)));

    $liveStartMonth = '2026-10';
    $liveStartDate = '2026-10-01';
    $isLivePeriod = ($selectedYearMonth >= $liveStartMonth);

    // Fetch attendance stats for this month
    $startDate = $selectedYearMonth . "-01";
    $endDate = date("Y-m-t", $selectedTime);
    $stmt = $db->prepare("SELECT status, COUNT(*) as count FROM employee_attendance WHERE employee_id = :emp_id AND date BETWEEN :start AND :end GROUP BY status");
    $stmt->execute(['emp_id' => $empId, 'start' => $startDate, 'end' => $endDate]);
    $attStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $attendance = [
        'present' => 0,
        'absent' => 0,
        'half_day' => 0,
        'leave' => 0
    ];
    foreach ($attStats as $stat) {
        $statusKey = strtolower($stat['status']);
        if (isset($attendance[$statusKey])) {
            $attendance[$statusKey] = (int)$stat['count'];
        }
    }

    $daysInMonth = (int)date('t', $selectedTime);
    $dailyRate = $salaryType === 'daily' ? $baseSalary : ($baseSalary / $daysInMonth);

    if (!$isLivePeriod) {
        // DEMO PERIOD (< 2026-10):
        // Up to now is demo only. No auto-present, no previous pending accumulation.
        $presentDays = (int)$attendance['present'] + ((int)$attendance['half_day'] * 0.5);
        if ($salaryType === 'daily') {
            $calculatedSalary = round($presentDays * $baseSalary, 2);
            $deductions = 0.0;
        } else {
            $calculatedSalary = round($presentDays * $dailyRate, 2);
            $absentDays = (int)$attendance['absent'] + (int)$attendance['leave'];
            $deductions = round($absentDays * $dailyRate, 2);
        }
        $previousPending = 0.0;
    } else {
        // LIVE PERIOD (>= 2026-10):
        // Auto-present active. Employees are present by default unless absent/leave recorded.
        $joiningDay = (int)date('j', strtotime($joiningDate));
        $joiningMonthStr = date('Y-m', strtotime($joiningDate));
        $startDay = ($joiningMonthStr === $selectedYearMonth) ? max(1, $joiningDay) : 1;
        $eligibleDaysInMonth = max(0, $daysInMonth - $startDay + 1);

        $absentDays = (int)$attendance['absent'] + (int)$attendance['leave'] + ((int)$attendance['half_day'] * 0.5);

        // Progress of month:
        $todayMonth = date('Y-m');
        if ($selectedYearMonth === $todayMonth) {
            $elapsedDays = max(0, (int)date('j') - $startDay + 1);
            $presentDays = max(0, $elapsedDays - $absentDays);
        } elseif ($selectedYearMonth < $todayMonth) {
            $presentDays = max(0, $eligibleDaysInMonth - $absentDays);
        } else {
            // Future month
            $presentDays = 0;
        }

        // Attendance summary for display:
        $attendance['present'] = (int)$presentDays;

        if ($salaryType === 'daily') {
            $calculatedSalary = round($presentDays * $baseSalary, 2);
            $deductions = round($absentDays * $baseSalary, 2);
        } else {
            // Monthly wage: Base salary minus deductions for recorded absent/leave days
            $deductions = round($absentDays * $dailyRate, 2);
            if ($startDay > 1) {
                // Joined mid-month: pay for eligible days minus absent
                $workedDays = max(0, $eligibleDaysInMonth - $absentDays);
                $calculatedSalary = round($workedDays * $dailyRate, 2);
            } else {
                $calculatedSalary = max(0, round($baseSalary - $deductions, 2));
            }
        }

        // Calculate previous pending from LIVE_START_DATE up to selected month
        $previousPending = 0.0;
        $calcStartTime = max($joiningTime, strtotime($liveStartDate));

        $currentTime = $calcStartTime;
        while ($currentTime < $selectedTime) {
            $prevMonth = date('Y-m', $currentTime);

            // Get salary due for this prevMonth
            $stmtSal = $db->prepare("SELECT salary_amount FROM employee_salaries WHERE employee_id = :emp_id AND month = :month");
            $stmtSal->execute(['emp_id' => $empId, 'month' => $prevMonth]);
            $prevSalaryRecord = $stmtSal->fetch(PDO::FETCH_ASSOC);

            if ($prevSalaryRecord) {
                $prevSalaryDue = (float)$prevSalaryRecord['salary_amount'];
            } else {
                $prevDaysInMonth = (int)date('t', $currentTime);
                $prevDailyRate = $salaryType === 'daily' ? $baseSalary : ($baseSalary / $prevDaysInMonth);

                $prevStartDate = $prevMonth . "-01";
                $prevEndDate = date("Y-m-t", $currentTime);
                $stmtAtt = $db->prepare("SELECT status, COUNT(*) as count FROM employee_attendance WHERE employee_id = :emp_id AND date BETWEEN :start AND :end GROUP BY status");
                $stmtAtt->execute(['emp_id' => $empId, 'start' => $prevStartDate, 'end' => $prevEndDate]);
                $prevAttStats = $stmtAtt->fetchAll(PDO::FETCH_ASSOC);

                $prevAbsent = 0;
                $prevHalfDay = 0;
                $prevLeave = 0;
                foreach ($prevAttStats as $stat) {
                    $sk = strtolower($stat['status']);
                    if ($sk === 'absent') $prevAbsent += (int)$stat['count'];
                    if ($sk === 'leave') $prevLeave += (int)$stat['count'];
                    if ($sk === 'half_day') $prevHalfDay += (int)$stat['count'];
                }

                $prevTotalAbsentDays = $prevAbsent + $prevLeave + ($prevHalfDay * 0.5);
                $prevStartDay = ($joiningMonthStr === $prevMonth) ? max(1, $joiningDay) : 1;
                $prevEligibleDays = max(0, $prevDaysInMonth - $prevStartDay + 1);

                if ($salaryType === 'daily') {
                    $prevWorkedDays = max(0, $prevEligibleDays - $prevTotalAbsentDays);
                    $prevSalaryDue = round($prevWorkedDays * $baseSalary, 2);
                } else {
                    $prevDeductions = round($prevTotalAbsentDays * $prevDailyRate, 2);
                    if ($prevStartDay > 1) {
                        $prevWorkedDays = max(0, $prevEligibleDays - $prevTotalAbsentDays);
                        $prevSalaryDue = round($prevWorkedDays * $prevDailyRate, 2);
                    } else {
                        $prevSalaryDue = max(0, round($baseSalary - $prevDeductions, 2));
                    }
                }
            }

            // Get paid amount for this prevMonth
            $stmtPay = $db->prepare("SELECT SUM(amount) FROM employee_payments WHERE employee_id = :emp_id AND month = :month");
            $stmtPay->execute(['emp_id' => $empId, 'month' => $prevMonth]);
            $prevPaid = (float)$stmtPay->fetchColumn() ?: 0.0;

            $previousPending += ($prevSalaryDue - $prevPaid);

            $currentTime = strtotime("+1 month", $currentTime);
        }
    }

    // 1. Get current month's actual salary record if exists
    $stmt = $db->prepare("SELECT salary_amount FROM employee_salaries WHERE employee_id = :emp_id AND month = :month");
    $stmt->execute(['emp_id' => $empId, 'month' => $selectedYearMonth]);
    $salaryRecord = $stmt->fetch(PDO::FETCH_ASSOC);
    $currentMonthSalary = $salaryRecord ? (float)$salaryRecord['salary_amount'] : $calculatedSalary;

    // 2. Get current month's payments
    $stmt = $db->prepare("SELECT SUM(amount) FROM employee_payments WHERE employee_id = :emp_id AND month = :month");
    $stmt->execute(['emp_id' => $empId, 'month' => $selectedYearMonth]);
    $currentMonthPaid = (float)$stmt->fetchColumn() ?: 0.0;

    $totalOwed = $previousPending + $currentMonthSalary;
    $netPending = $totalOwed - $currentMonthPaid;

    return [
        'employee_id' => $empId,
        'employee_code' => $employee['employee_code'] ?? '',
        'name' => $employee['name'],
        'contact' => $employee['contact'],
        'joining_date' => $joiningDate,
        'status' => $employee['status'],
        'salary_type' => $salaryType,
        'base_salary' => $baseSalary,
        'days_in_month' => $daysInMonth,
        'daily_rate' => round($dailyRate, 2),
        'deductions' => round($deductions, 2),
        'current_month_salary' => $currentMonthSalary,
        'previous_pending' => round($previousPending, 2),
        'total_owed' => round($totalOwed, 2),
        'current_month_paid' => round($currentMonthPaid, 2),
        'net_pending' => round($netPending, 2),
        'attendance_summary' => $attendance
    ];
}

/**
 * POST /api/employees/salary
 */
function saveMonthlySalary() {
    $data = getJsonInput();
    $empId = (int)($data['employee_id'] ?? 0);
    $month = trim($data['month'] ?? '');
    $salaryAmount = isset($data['salary_amount']) ? (float)$data['salary_amount'] : 0.0;

    if ($empId <= 0 || $month === '' || $salaryAmount < 0) {
        sendResponse(false, 'Invalid input. employee_id, month, and salary_amount are required.', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("
            INSERT INTO employee_salaries (employee_id, month, salary_amount) 
            VALUES (:employee_id, :month, :salary_amount)
            ON DUPLICATE KEY UPDATE salary_amount = VALUES(salary_amount)
        ");
        $stmt->execute([
            'employee_id' => $empId,
            'month' => $month,
            'salary_amount' => $salaryAmount
        ]);

        sendResponse(true, 'Monthly salary saved successfully');
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * POST /api/employees/payments
 */
function addPayment() {
    $data = getJsonInput();
    $empId = (int)($data['employee_id'] ?? 0);
    $amount = isset($data['amount']) ? (float)$data['amount'] : 0.0;
    $paymentDate = trim($data['payment_date'] ?? '');
    $month = trim($data['month'] ?? '');
    $remarks = isset($data['remarks']) ? trim($data['remarks']) : null;

    if ($empId <= 0 || $amount <= 0 || $paymentDate === '' || $month === '') {
        sendResponse(false, 'Invalid input. employee_id, amount, payment_date, and month are required.', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("
            INSERT INTO employee_payments (employee_id, amount, payment_date, month, remarks) 
            VALUES (:employee_id, :amount, :payment_date, :month, :remarks)
        ");
        $stmt->execute([
            'employee_id' => $empId,
            'amount' => $amount,
            'payment_date' => $paymentDate,
            'month' => $month,
            'remarks' => $remarks
        ]);

        sendResponse(true, 'Payment recorded successfully', ['id' => (int)$db->lastInsertId()]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * GET /api/employees/payments
 */
function getPaymentsList() {
    $db = getDatabaseConnection();
    $empId = (int)($_GET['employee_id'] ?? 0);
    $month = trim($_GET['month'] ?? '');

    if ($empId <= 0) {
        sendResponse(false, 'Employee ID is required.', null, 400);
    }

    try {
        $query = "SELECT id, employee_id, amount, payment_date, month, remarks, created_at FROM employee_payments WHERE employee_id = :employee_id";
        $params = ['employee_id' => $empId];

        if ($month !== '') {
            $query .= " AND month = :month";
            $params['month'] = $month;
        }

        $query .= " ORDER BY payment_date DESC, id DESC";
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($payments as &$pay) {
            $pay['id'] = (int)$pay['id'];
            $pay['employee_id'] = (int)$pay['employee_id'];
            $pay['amount'] = (float)$pay['amount'];
        }

        sendResponse(true, '', $payments);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * GET /api/employees/biometric/list-active
 */
function getPublicActiveEmployees() {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->query("SELECT id, employee_code, name FROM employees WHERE status = 'active' ORDER BY name ASC");
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($employees as &$emp) {
            $emp['id'] = (int)$emp['id'];
        }
        sendResponse(true, '', $employees);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error', null, 500);
    }
}

/**
 * GET /api/employees/biometric/check
 */
function checkBiometricsRegistered() {
    $empId = (int)($_GET['employee_id'] ?? 0);
    if ($empId <= 0) {
        sendResponse(false, 'Employee ID is required', null, 400);
    }
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT id FROM employee_biometrics WHERE employee_id = :emp_id LIMIT 1");
        $stmt->execute(['emp_id' => $empId]);
        $exists = (bool)$stmt->fetch();
        sendResponse(true, '', ['registered' => $exists]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error', null, 500);
    }
}

/**
 * POST /api/employees/biometric/register-challenge
 */
function getRegisterChallenge() {
    $challenge = bin2hex(random_bytes(32));
    sendResponse(true, '', ['challenge' => $challenge]);
}

/**
 * POST /api/employees/biometric/register
 */
function registerBiometrics() {
    $data = getJsonInput();
    $empId = (int)($data['employee_id'] ?? 0);
    $credId = trim($data['credential_id'] ?? '');
    $pubKey = trim($data['public_key'] ?? '');
    $deviceName = trim($data['device_name'] ?? 'Browser Biometrics');

    if ($empId <= 0 || $credId === '' || $pubKey === '') {
        sendResponse(false, 'Invalid input. employee_id, credential_id, and public_key are required.', null, 400);
    }

    // Format public key to PEM format
    $pemKey = "-----BEGIN PUBLIC KEY-----\n" . 
              chunk_split($pubKey, 64, "\n") . 
              "-----END PUBLIC KEY-----";

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("
            INSERT INTO employee_biometrics (employee_id, credential_id, public_key, device_name)
            VALUES (:employee_id, :credential_id, :public_key, :device_name)
            ON DUPLICATE KEY UPDATE credential_id = VALUES(credential_id), public_key = VALUES(public_key), device_name = VALUES(device_name)
        ");
        $stmt->execute([
            'employee_id' => $empId,
            'credential_id' => $credId,
            'public_key' => $pemKey,
            'device_name' => $deviceName
        ]);

        sendResponse(true, 'Biometrics registered successfully');
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * POST /api/employees/biometric/verify-challenge
 */
function getVerifyChallenge() {
    $data = getJsonInput();
    $empId = (int)($data['employee_id'] ?? 0);

    if ($empId <= 0) {
        sendResponse(false, 'Employee ID is required', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT credential_id FROM employee_biometrics WHERE employee_id = :emp_id LIMIT 1");
        $stmt->execute(['emp_id' => $empId]);
        $bio = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$bio) {
            sendResponse(false, 'No biometrics registered for this employee', null, 404);
        }

        $challenge = bin2hex(random_bytes(32));
        sendResponse(true, '', [
            'challenge' => $challenge,
            'credential_id' => $bio['credential_id']
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error', null, 500);
    }
}

/**
 * POST /api/employees/biometric/verify
 */
function verifyBiometrics() {
    $data = getJsonInput();
    $empId = (int)($data['employee_id'] ?? 0);
    $authDataHex = trim($data['authenticator_data'] ?? '');
    $clientDataJson = trim($data['client_data_json'] ?? '');
    $signatureHex = trim($data['signature'] ?? '');

    if ($empId <= 0 || $authDataHex === '' || $clientDataJson === '' || $signatureHex === '') {
        sendResponse(false, 'Invalid biometric payload', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        // Fetch public key
        $stmt = $db->prepare("SELECT name, public_key FROM employee_biometrics b JOIN employees e ON b.employee_id = e.id WHERE employee_id = :emp_id LIMIT 1");
        $stmt->execute(['emp_id' => $empId]);
        $bio = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$bio) {
            sendResponse(false, 'Biometrics not registered for this employee', null, 404);
        }

        $publicKeyPem = $bio['public_key'];
        $authDataBin = hex2bin($authDataHex);
        $signatureBin = hex2bin($signatureHex);

        // Verify signature
        $clientDataHashBin = hash('sha256', $clientDataJson, true);
        $signedData = $authDataBin . $clientDataHashBin;
        
        $verifyResult = @openssl_verify($signedData, $signatureBin, $publicKeyPem, OPENSSL_ALGO_SHA256);

        if ($verifyResult !== 1) {
            sendResponse(false, 'Biometric verification failed. Fingerprint signature invalid.', null, 401);
        }

        // Verification successful! Record attendance for today
        $today = date('Y-m-d');
        $stmt = $db->prepare("
            INSERT INTO employee_attendance (employee_id, date, status, remarks)
            VALUES (:employee_id, :date, 'present', 'Biometric Check-In')
            ON DUPLICATE KEY UPDATE status = 'present', remarks = 'Biometric Check-In'
        ");
        $stmt->execute([
            'employee_id' => $empId,
            'date' => $today
        ]);

        sendResponse(true, 'Checked in successfully! Marked Present.', [
            'employee_name' => $bio['name'],
            'time' => date('h:i A')
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
