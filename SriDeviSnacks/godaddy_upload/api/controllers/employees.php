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

    // Route: GET or POST /employees/attendance
    if ($action === 'attendance') {
        if ($method === 'GET') {
            getAttendanceRecords();
        } elseif ($method === 'POST') {
            saveAttendanceRecords();
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

    // Route: GET /employees/:id or PUT /employees/:id
    if (is_numeric($action)) {
        $employeeId = (int)$action;
        if ($method === 'GET') {
            getEmployeeById($employeeId);
        } elseif ($method === 'PUT') {
            updateEmployee($employeeId);
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    sendResponse(false, 'Action not found in employees', null, 404);
}

/**
 * GET /api/employees
 */
function getEmployeesList() {
    $db = getDatabaseConnection();
    $status = $_GET['status'] ?? '';

    try {
        $query = "SELECT e.id, e.name, e.contact, e.monthly_salary, e.joining_date, e.status, e.created_at, e.updated_at, 
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
            $emp['monthly_salary'] = (float)$emp['monthly_salary'];
            $emp['is_biometric_registered'] = (bool)$emp['is_biometric_registered'];
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
        $stmt = $db->prepare("SELECT id, name, contact, monthly_salary, joining_date, status, created_at FROM employees WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$employee) {
            sendResponse(false, 'Employee not found', null, 404);
        }

        $employee['id'] = (int)$employee['id'];
        $employee['monthly_salary'] = (float)$employee['monthly_salary'];

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
    $joiningDate = trim($data['joining_date'] ?? '');

    if ($name === '' || $contact === '' || $monthlySalary <= 0 || $joiningDate === '') {
        sendResponse(false, 'Invalid input. All fields (name, contact, monthly_salary, joining_date) are required.', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("INSERT INTO employees (name, contact, monthly_salary, joining_date, status) VALUES (:name, :contact, :monthly_salary, :joining_date, 'active')");
        $stmt->execute([
            'name' => $name,
            'contact' => $contact,
            'monthly_salary' => $monthlySalary,
            'joining_date' => $joiningDate
        ]);

        $newId = (int)$db->lastInsertId();
        sendResponse(true, 'Employee added successfully', ['id' => $newId], 201);
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
    $joiningDate = trim($data['joining_date'] ?? '');
    $status = trim($data['status'] ?? 'active');

    if ($name === '' || $contact === '' || $monthlySalary <= 0 || $joiningDate === '') {
        sendResponse(false, 'Invalid input. All fields (name, contact, monthly_salary, joining_date) are required.', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("UPDATE employees SET name = :name, contact = :contact, monthly_salary = :monthly_salary, joining_date = :joining_date, status = :status WHERE id = :id");
        $stmt->execute([
            'name' => $name,
            'contact' => $contact,
            'monthly_salary' => $monthlySalary,
            'joining_date' => $joiningDate,
            'status' => $status,
            'id' => $id
        ]);

        sendResponse(true, 'Employee updated successfully');
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

        sendResponse(true, '', [
            'date' => $date,
            'attendance' => $attendanceMap
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
        $stmt = $db->prepare("SELECT id, name, contact, monthly_salary, joining_date, status FROM employees WHERE joining_date <= :end_date AND (status = 'active' OR (status = 'inactive' AND updated_at >= :start_date)) ORDER BY name ASC");
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

    // Parse selected month
    $selectedTime = strtotime($selectedMonth . "-01");
    $selectedYearMonth = date('Y-m', $selectedTime);

    // Parse joining month
    $joiningTime = strtotime(date('Y-m-01', strtotime($joiningDate)));
    $joiningYearMonth = date('Y-m', $joiningTime);

    // 1. Get current month's actual salary record if exists
    $stmt = $db->prepare("SELECT salary_amount FROM employee_salaries WHERE employee_id = :emp_id AND month = :month");
    $stmt->execute(['emp_id' => $empId, 'month' => $selectedYearMonth]);
    $salaryRecord = $stmt->fetch(PDO::FETCH_ASSOC);
    $currentMonthSalary = $salaryRecord ? (float)$salaryRecord['salary_amount'] : $baseSalary;

    // 2. Get current month's payments
    $stmt = $db->prepare("SELECT SUM(amount) FROM employee_payments WHERE employee_id = :emp_id AND month = :month");
    $stmt->execute(['emp_id' => $empId, 'month' => $selectedYearMonth]);
    $currentMonthPaid = (float)$stmt->fetchColumn() ?: 0.0;

    // 3. Get previous pending
    // Loop through all months starting from joining month up to the month before selected month
    $previousPending = 0.0;
    $currentTime = $joiningTime;

    while ($currentTime < $selectedTime) {
        $prevMonth = date('Y-m', $currentTime);

        // Get salary due for this prevMonth
        $stmt = $db->prepare("SELECT salary_amount FROM employee_salaries WHERE employee_id = :emp_id AND month = :month");
        $stmt->execute(['emp_id' => $empId, 'month' => $prevMonth]);
        $prevSalaryRecord = $stmt->fetch(PDO::FETCH_ASSOC);
        $prevSalaryDue = $prevSalaryRecord ? (float)$prevSalaryRecord['salary_amount'] : $baseSalary;

        // Get paid amount for this prevMonth
        $stmt = $db->prepare("SELECT SUM(amount) FROM employee_payments WHERE employee_id = :emp_id AND month = :month");
        $stmt->execute(['emp_id' => $empId, 'month' => $prevMonth]);
        $prevPaid = (float)$stmt->fetchColumn() ?: 0.0;

        $previousPending += ($prevSalaryDue - $prevPaid);

        // Advance to next month
        $currentTime = strtotime("+1 month", $currentTime);
    }

    $totalOwed = $previousPending + $currentMonthSalary;
    $netPending = $totalOwed - $currentMonthPaid;

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

    return [
        'employee_id' => $empId,
        'name' => $employee['name'],
        'contact' => $employee['contact'],
        'joining_date' => $joiningDate,
        'status' => $employee['status'],
        'base_salary' => $baseSalary,
        'current_month_salary' => $currentMonthSalary,
        'previous_pending' => $previousPending,
        'total_owed' => $totalOwed,
        'current_month_paid' => $currentMonthPaid,
        'net_pending' => $netPending,
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
        $stmt = $db->query("SELECT id, name FROM employees WHERE status = 'active' ORDER BY name ASC");
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
