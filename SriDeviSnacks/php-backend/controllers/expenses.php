<?php
/**
 * Company Expenses Controller
 * Manages Salaries (auto-synced), Fuel (Petrol, CNG, Diesel), Marapodi, and Company Small Items
 */

function handleExpensesRoute($parts, $method) {
    $user = getAuthenticatedUser();

    $idOrAction = $parts[1] ?? '';

    if (empty($idOrAction)) {
        if ($method === 'GET') {
            getExpensesList();
        } elseif ($method === 'POST') {
            createExpense();
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    if (is_numeric($idOrAction)) {
        $expenseId = (int)$idOrAction;
        if ($method === 'GET') {
            getExpenseById($expenseId);
        } elseif ($method === 'PUT') {
            updateExpense($expenseId);
        } elseif ($method === 'DELETE') {
            deleteExpense($expenseId);
        } else {
            sendResponse(false, 'Method not allowed', null, 405);
        }
        return;
    }

    sendResponse(false, 'Action not found in expenses', null, 404);
}

/**
 * GET /api/expenses
 */
function getExpensesList() {
    $db = getDatabaseConnection();
    try {
        $month = $_GET['month'] ?? date('Y-m');
        $from = $_GET['from'] ?? '';
        $to = $_GET['to'] ?? '';
        $category = $_GET['category'] ?? '';

        if (!empty($from) && !empty($to)) {
            $startDate = $from;
            $endDate = $to;
        } else {
            $parsedTime = strtotime($month . '-01') ?: time();
            $startDate = date('Y-m-01', $parsedTime);
            $endDate = date('Y-m-t', $parsedTime);
            $month = date('Y-m', $parsedTime);
        }

        // 1. Sync legacy fuel_expenses into company_expenses if not already present
        try {
            $legacyFuels = $db->query("
                SELECT f.amount, f.type, f.expense_date 
                FROM fuel_expenses f
                WHERE NOT EXISTS (
                    SELECT 1 FROM company_expenses c 
                    WHERE c.category = 'fuel' AND c.sub_category = f.type AND c.expense_date = f.expense_date AND c.amount = f.amount
                )
            ")->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($legacyFuels)) {
                $ins = $db->prepare("INSERT INTO company_expenses (category, sub_category, item_name, amount, expense_date, payment_mode) VALUES ('fuel', :type, :name, :amount, :date, 'CASH')");
                foreach ($legacyFuels as $lf) {
                    $ins->execute([
                        'type' => $lf['type'],
                        'name' => 'Fuel - ' . $lf['type'],
                        'amount' => $lf['amount'],
                        'date' => $lf['expense_date']
                    ]);
                }
            }
        } catch (\Exception $e) {}

        // 2. Query company_expenses
        $query = "SELECT id, category, sub_category, item_name, amount, expense_date, quantity, payment_mode, remarks, created_at FROM company_expenses WHERE expense_date BETWEEN :start_date AND :end_date";
        $params = [
            'start_date' => $startDate,
            'end_date' => $endDate
        ];

        if (!empty($category) && $category !== 'all' && $category !== 'salary') {
            $query .= " AND category = :category";
            $params['category'] = $category;
        }

        $query .= " ORDER BY expense_date DESC, id DESC";
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. Query salary payments for the period
        $salQuery = "
            SELECT p.id, p.employee_id, e.name as employee_name, e.employee_code, p.amount, p.payment_date, p.month, p.remarks
            FROM employee_payments p
            LEFT JOIN employees e ON p.employee_id = e.id
            WHERE p.payment_date BETWEEN :start_date AND :end_date
            ORDER BY p.payment_date DESC, p.id DESC
        ";
        $salStmt = $db->prepare($salQuery);
        $salStmt->execute(['start_date' => $startDate, 'end_date' => $endDate]);
        $salaryPayments = $salStmt->fetchAll(PDO::FETCH_ASSOC);

        $salaryTotal = 0.0;
        foreach ($salaryPayments as &$sal) {
            $sal['id'] = (int)$sal['id'];
            $sal['employee_id'] = (int)$sal['employee_id'];
            $sal['amount'] = (float)$sal['amount'];
            $sal['employee_code'] = !empty($sal['employee_code']) ? $sal['employee_code'] : sprintf("SDS-%s-%s-%03d", date('y'), date('m'), $sal['employee_id']);
            $salaryTotal += $sal['amount'];
        }

        // 4. Compute categorized totals
        $fuelTotal = 0.0;
        $marapodiTotal = 0.0;
        $smallItemsTotal = 0.0;
        $otherTotal = 0.0;

        foreach ($expenses as &$exp) {
            $exp['id'] = (int)$exp['id'];
            $exp['amount'] = (float)$exp['amount'];
            $cat = $exp['category'];

            if ($cat === 'fuel') {
                $fuelTotal += $exp['amount'];
            } elseif ($cat === 'marapodi') {
                $marapodiTotal += $exp['amount'];
            } elseif ($cat === 'small_items') {
                $smallItemsTotal += $exp['amount'];
            } else {
                $otherTotal += $exp['amount'];
            }
        }

        $grandTotal = $salaryTotal + $fuelTotal + $marapodiTotal + $smallItemsTotal + $otherTotal;

        sendResponse(true, '', [
            'period' => [
                'month' => $month,
                'start_date' => $startDate,
                'end_date' => $endDate
            ],
            'summary' => [
                'grand_total' => round($grandTotal, 2),
                'salary_total' => round($salaryTotal, 2),
                'fuel_total' => round($fuelTotal, 2),
                'marapodi_total' => round($marapodiTotal, 2),
                'small_items_total' => round($smallItemsTotal, 2),
                'other_total' => round($otherTotal, 2)
            ],
            'expenses' => $expenses,
            'salary_payments' => $salaryPayments
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * GET /api/expenses/:id
 */
function getExpenseById($id) {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("SELECT * FROM company_expenses WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $expense = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$expense) {
            sendResponse(false, 'Expense not found', null, 404);
        }

        $expense['id'] = (int)$expense['id'];
        $expense['amount'] = (float)$expense['amount'];

        sendResponse(true, '', $expense);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * POST /api/expenses
 */
function createExpense() {
    $data = getJsonInput();
    $category = trim($data['category'] ?? 'small_items');
    $subCategory = !empty($data['sub_category']) ? trim($data['sub_category']) : null;
    $itemName = trim($data['item_name'] ?? '');
    $amount = isset($data['amount']) ? (float)$data['amount'] : 0.0;
    $expenseDate = !empty($data['expense_date']) ? trim($data['expense_date']) : date('Y-m-d');
    $quantity = !empty($data['quantity']) ? trim($data['quantity']) : null;
    $paymentMode = !empty($data['payment_mode']) ? trim($data['payment_mode']) : 'CASH';
    $remarks = !empty($data['remarks']) ? trim($data['remarks']) : null;

    if ($amount <= 0 || empty($itemName)) {
        sendResponse(false, 'Valid amount and item name are required.', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("
            INSERT INTO company_expenses 
            (category, sub_category, item_name, amount, expense_date, quantity, payment_mode, remarks) 
            VALUES 
            (:category, :sub_category, :item_name, :amount, :expense_date, :quantity, :payment_mode, :remarks)
        ");
        $stmt->execute([
            'category' => $category,
            'sub_category' => $subCategory,
            'item_name' => $itemName,
            'amount' => $amount,
            'expense_date' => $expenseDate,
            'quantity' => $quantity,
            'payment_mode' => $paymentMode,
            'remarks' => $remarks
        ]);

        $newId = (int)$db->lastInsertId();

        // Also record in fuel_expenses for legacy report compatibility
        if ($category === 'fuel') {
            try {
                $fuelStmt = $db->prepare("INSERT INTO fuel_expenses (amount, type, expense_date) VALUES (:amount, :type, :date)");
                $fuelStmt->execute([
                    'amount' => $amount,
                    'type' => $subCategory ?: 'PETROL',
                    'date' => $expenseDate
                ]);
            } catch (\Exception $e) {}
        }

        sendResponse(true, 'Expense added successfully', [
            'id' => $newId,
            'category' => $category,
            'item_name' => $itemName,
            'amount' => $amount,
            'expense_date' => $expenseDate
        ], 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * PUT /api/expenses/:id
 */
function updateExpense($id) {
    $data = getJsonInput();
    $category = trim($data['category'] ?? 'small_items');
    $subCategory = !empty($data['sub_category']) ? trim($data['sub_category']) : null;
    $itemName = trim($data['item_name'] ?? '');
    $amount = isset($data['amount']) ? (float)$data['amount'] : 0.0;
    $expenseDate = !empty($data['expense_date']) ? trim($data['expense_date']) : date('Y-m-d');
    $quantity = !empty($data['quantity']) ? trim($data['quantity']) : null;
    $paymentMode = !empty($data['payment_mode']) ? trim($data['payment_mode']) : 'CASH';
    $remarks = !empty($data['remarks']) ? trim($data['remarks']) : null;

    if ($amount <= 0 || empty($itemName)) {
        sendResponse(false, 'Valid amount and item name are required.', null, 400);
    }

    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("
            UPDATE company_expenses 
            SET category = :category, sub_category = :sub_category, item_name = :item_name, 
                amount = :amount, expense_date = :expense_date, quantity = :quantity, 
                payment_mode = :payment_mode, remarks = :remarks 
            WHERE id = :id
        ");
        $stmt->execute([
            'category' => $category,
            'sub_category' => $subCategory,
            'item_name' => $itemName,
            'amount' => $amount,
            'expense_date' => $expenseDate,
            'quantity' => $quantity,
            'payment_mode' => $paymentMode,
            'remarks' => $remarks,
            'id' => $id
        ]);

        sendResponse(true, 'Expense updated successfully');
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}

/**
 * DELETE /api/expenses/:id
 */
function deleteExpense($id) {
    $db = getDatabaseConnection();
    try {
        $stmt = $db->prepare("DELETE FROM company_expenses WHERE id = :id");
        $stmt->execute(['id' => $id]);
        sendResponse(true, 'Expense deleted successfully');
    } catch (PDOException $e) {
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    }
}
