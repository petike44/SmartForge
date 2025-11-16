<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the raw POST data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        echo json_encode(['success' => false, 'message' => 'Invalid data']);
        exit;
    }

    // Determine action: create (default) or update
    $action = $data['action'] ?? 'create';

    $accountsFile = 'Accounts.json';
    $accounts = [];

    if (file_exists($accountsFile)) {
        $accountsData = file_get_contents($accountsFile);
        $decoded = json_decode($accountsData, true);
        if (is_array($decoded)) {
            $accounts = $decoded;
        }
    }

    if ($action === 'update') {
        // --------------------
        // UPDATE EXISTING ACCOUNT
        // --------------------
        $username = $data['username'] ?? '';

        if (empty($username)) {
            echo json_encode(['success' => false, 'message' => 'Username is required for update']);
            exit;
        }

        // Locate account by current username
        $index = null;
        foreach ($accounts as $i => $account) {
            if (isset($account['username']) && $account['username'] === $username) {
                $index = $i;
                break;
            }
        }

        if ($index === null) {
            echo json_encode(['success' => false, 'message' => 'Account not found']);
            exit;
        }

        // New username (optional)
        $newUsername = $data['newUsername'] ?? '';
        if (!empty($newUsername) && $newUsername !== $accounts[$index]['username']) {
            // Check if new username is already taken
            foreach ($accounts as $i => $account) {
                if ($i !== $index && isset($account['username']) && $account['username'] === $newUsername) {
                    echo json_encode(['success' => false, 'message' => 'New username already in use']);
                    exit;
                }
            }
            $accounts[$index]['username'] = $newUsername;
        }

        // Email update (optional)
        if (isset($data['email']) && $data['email'] !== '') {
            $accounts[$index]['email'] = $data['email'];
        }

        // Password change (optional, requires oldPassword + newPassword)
        if (!empty($data['oldPassword']) || !empty($data['newPassword'])) {
            $oldPassword = $data['oldPassword'] ?? '';
            $newPassword = $data['newPassword'] ?? '';

            if (empty($oldPassword) || empty($newPassword)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Old password and new password are required to change password'
                ]);
                exit;
            }

            if (!isset($accounts[$index]['password']) || $accounts[$index]['password'] !== $oldPassword) {
                echo json_encode(['success' => false, 'message' => 'Old password is incorrect']);
                exit;
            }

            $accounts[$index]['password'] = $newPassword;
        }

        // Limits update (optional)
        if (isset($data['dailySendLimit'])) {
            $accounts[$index]['dailySendLimit'] = floatval($data['dailySendLimit']);
        }
        if (isset($data['singleTxLimit'])) {
            $accounts[$index]['singleTxLimit'] = floatval($data['singleTxLimit']);
        }

        // Global time limit date per account (from Limits tab)
        if (isset($data['timeLimitDate']) && $data['timeLimitDate'] !== '') {
            $accounts[$index]['timeLimitDate'] = $data['timeLimitDate'];
        }

        // Fundraiser-specific time limit date per account (from Fund Raiser flatpickr)
        if (isset($data['fundraiserTimeLimit']) && $data['fundraiserTimeLimit'] !== '') {
            $accounts[$index]['fundraiserTimeLimit'] = $data['fundraiserTimeLimit'];
        }

        // Save updated accounts
        if (file_put_contents($accountsFile, json_encode($accounts, JSON_PRETTY_PRINT))) {
            $updated = $accounts[$index];

            echo json_encode([
                'success' => true,
                'message' => 'Account updated successfully',
                'account' => [
                    'username'             => $updated['username'],
                    'email'                => $updated['email'] ?? '',
                    'walletAddress'        => $updated['walletAddress'] ?? '',
                    'dailySendLimit'       => $updated['dailySendLimit'] ?? null,
                    'singleTxLimit'        => $updated['singleTxLimit'] ?? null,
                    'timeLimitDate'        => $updated['timeLimitDate'] ?? null,
                    'fundraiserTimeLimit'  => $updated['fundraiserTimeLimit'] ?? null
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to save updated account']);
        }

        exit;
    }

    // --------------------
    // CREATE NEW ACCOUNT (default behavior)
    // --------------------
    $username = $data['username'] ?? '';
    $email    = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    // Validate required fields
    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
    
    // Check if username already exists
    foreach ($accounts as $account) {
        if (isset($account['username']) && $account['username'] === $username) {
            echo json_encode(['success' => false, 'message' => 'Username already exists']);
            exit;
        }
    }
    
    // Generate valid Sui wallet address (32 bytes for Sui)
    // Sui addresses are 32 bytes (64 hex characters) starting with 0x
    $walletAddress = '0x' . bin2hex(random_bytes(32));
    
    // Generate private key (32 bytes for Ed25519)
    $privateKey = '0x' . bin2hex(random_bytes(32));
    
    // Generate public key (32 bytes for Ed25519)
    $publicKey = '0x' . bin2hex(random_bytes(32));
    
    // Create new account
    $newAccount = [
        'username'            => $username,
        'email'               => $email,
        'password'            => $password,
        'walletAddress'       => $walletAddress,
        'privateKey'          => $privateKey,
        'publicKey'           => $publicKey,
        'balance'             => 0,
        'transactions'        => [],
        'notifications'       => [],
        'networkNodes'        => [],
        // limits are optional; can be added later from Limits tab
        'dailySendLimit'      => null,
        'singleTxLimit'       => null,
        'timeLimitDate'       => null,
        'fundraiserTimeLimit' => null
    ];
    
    // Add new account to accounts array
    $accounts[] = $newAccount;
    
    // Save updated accounts
    if (file_put_contents($accountsFile, json_encode($accounts, JSON_PRETTY_PRINT))) {
        echo json_encode([
            'success' => true, 
            'message' => 'Account created successfully',
            'walletAddress' => $walletAddress
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save account']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
