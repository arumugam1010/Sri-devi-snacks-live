<?php
/**
 * Fuel Expenses Controller
 */

function handleFuelExpensesRoute($parts, $method) {
    getAuthenticatedUser();

    $action = $parts[1] ?? '';

    if ($method === 'GET') {
        if ($action === 'today') {
            getTodayFuelExpenses();
        } else {
            getFilteredFuelExpenses();
        }
    } elseif ($method === 'POST') {
        logFuelExpense();
    } else {
        sendResponse(false, 'Method not allowed', null, 405);
    }
}

function getTodayFuelExpenses() {
    $db = getDatabaseConnection();
    try {
        $today = date('Y-m-d');
        $stmt = $db->prepare("SELECT * FROM fuel_expenses WHERE expense_date = :today ORDER BY id DESC");
        $stmt->execute(['today' => $today]);
        $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalAmount = 0.0;
        foreach ($expenses as &$exp) {
            $exp['id'] = (int)$exp['id'];
            $exp['amount'] = (float)$exp['amount'];
            $totalAmount += $exp['amount'];
        }

        sendResponse(true, '', [
            'expenses' => $expenses,
            'total_amount' => $totalAmount
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

function getFilteredFuelExpenses() {
    $db = getDatabaseConnection();
    try {
        $from = $_GET['from'] ?? '';
        $to = $_GET['to'] ?? '';
        $type = $_GET['type'] ?? '';

        $query = "SELECT * FROM fuel_expenses WHERE 1=1";
        $params = [];

        if (!empty($from)) {
            $query .= " AND expense_date >= :from";
            $params['from'] = $from;
        }
        if (!empty($to)) {
            $query .= " AND expense_date <= :to";
            $params['to'] = $to;
        }
        if (!empty($type)) {
            $query .= " AND type = :type";
            $params['type'] = $type;
        }

        $query .= " ORDER BY expense_date DESC, id DESC";
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalAmount = 0.0;
        foreach ($expenses as &$exp) {
            $exp['id'] = (int)$exp['id'];
            $exp['amount'] = (float)$exp['amount'];
            $totalAmount += $exp['amount'];
        }

        sendResponse(true, '', [
            'expenses' => $expenses,
            'total_amount' => $totalAmount
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

function logFuelExpense() {
    $input = getJsonInput();
    
    if (!isset($input['amount']) || !isset($input['type'])) {
        sendResponse(false, 'Amount and type are required', null, 400);
    }

    $amount = (float)$input['amount'];
    $type = $input['type']; // 'PETROL', 'CNG', or 'CNG+PETROL'
    $date = $input['date'] ?? date('Y-m-d');

    if ($amount <= 0) {
        sendResponse(false, 'Amount must be greater than 0', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("INSERT INTO fuel_expenses (amount, type, expense_date) VALUES (:amount, :type, :date)");
        $stmt->execute([
            'amount' => $amount,
            'type' => $type,
            'date' => $date
        ]);
        
        $expenseId = (int)$db->lastInsertId();

        sendResponse(true, 'Fuel expense logged successfully', [
            'id' => $expenseId,
            'amount' => $amount,
            'type' => $type,
            'expense_date' => $date
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
