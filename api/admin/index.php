<?php
/**
 * ════════════════════════════════════════════════════════
 * TPN Admin Panel — Enterprise Edition
 * URL: https://todopalnegocio.com.mx/api/admin/
 * ════════════════════════════════════════════════════════
 */
session_start();

// ─── CONFIGURACIÓN ────────────────────────────────────────
define('ADMIN_PASSWORD', '12345'); // ← CAMBIA ESTO
define('DB_HOST', 'localhost');
define('DB_NAME', 'u992666585_TPN');
define('DB_USER', 'u992666585_TPN_USER');
define('DB_PASS', 'JUANPA9912a');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('UPLOAD_URL', '/api/admin/uploads/');

if (!is_dir(UPLOAD_DIR)) @mkdir(UPLOAD_DIR, 0755, true);

// ─── AUTH ─────────────────────────────────────────────────
if (isset($_POST['admin_password'])) {
    if ($_POST['admin_password'] === ADMIN_PASSWORD) {
        $_SESSION['tpn_admin'] = true;
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    } else {
        $loginError = 'Contraseña incorrecta. Intenta de nuevo.';
    }
}
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
    exit;
}
$isLogged = !empty($_SESSION['tpn_admin']);

// ─── DB ───────────────────────────────────────────────────
$pdo = null; $dbError = null;
if ($isLogged) {
    try {
        $pdo = new PDO(
            "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4",
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    } catch (PDOException $e) { $dbError = $e->getMessage(); }
}

// ─── HELPER: SVG ICONS ────────────────────────────────────
function icon(string $name, int $size = 16, string $class = ''): string {
    $s = $size;
    $c = $class ? " class=\"$class\"" : '';
    $icons = [
        'package'       => '<path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>',
        'tag'           => '<path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z"/>',
        'image'         => '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>',
        'building'      => '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"/>',
        'upload'        => '<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>',
        'users'         => '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>',
        'cart'          => '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>',
        'truck'         => '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>',
        'settings'      => '<path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
        'database'      => '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625v8.625m-16.5-2.625v8.625"/>',
        'plus'          => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>',
        'pencil'        => '<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>',
        'trash'         => '<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>',
        'toggle'        => '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/>',
        'search'        => '<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>',
        'logout'        => '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>',
        'x'             => '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>',
        'user'          => '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>',
        'chart'         => '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>',
        'box'           => '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>',
        'check'         => '<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>',
        'download'      => '<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>',
        'photo'         => '<path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>',
        'filter'        => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"/>',
        'alert'         => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>',
        'info'          => '<path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>',
        'google'        => '<path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 3C7.021 3 2.543 7.477 2.543 12s4.478 9 10.002 9c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" fill="currentColor"/>',
        'email'         => '<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>',
    ];
    $path = $icons[$name] ?? '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>';
    return "<svg{$c} xmlns=\"http://www.w3.org/2000/svg\" width=\"{$s}\" height=\"{$s}\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\">{$path}</svg>";
}

// ─── AJAX ACTIONS ─────────────────────────────────────────
if ($isLogged && $pdo && isset($_GET['action'])) {
    header('Content-Type: application/json; charset=utf-8');
    $action = $_GET['action'];
    $input  = json_decode(file_get_contents('php://input'), true) ?? [];

    switch ($action) {
        case 'list_products':
            $q = '%'.($_GET['q'] ?? '').'%'; $cat = $_GET['cat'] ?? '';
            $sql = "SELECT * FROM products WHERE name LIKE ?"; $params = [$q];
            if ($cat) { $sql .= " AND category = ?"; $params[] = $cat; }
            $sql .= " ORDER BY category, name";
            $stmt = $pdo->prepare($sql); $stmt->execute($params);
            echo json_encode(['data' => $stmt->fetchAll()]); exit;

        case 'create_product':
            $n = array_map('trim', $input);
            if (empty($n['name']) || empty($n['category']) || empty($n['price'])) {
                echo json_encode(['error' => 'Nombre, categoría y precio son requeridos']); exit;
            }
            $extraImgs = (!empty($input['extra_images']) && is_array($input['extra_images']))
                ? json_encode(array_values(array_filter($input['extra_images']))) : null;
            $skuVal = !empty($n['sku']) ? strtoupper($n['sku']) : null;
            try {
                $pdo->prepare("INSERT INTO products (sku,name,category,price,unit,image_url,extra_images,promo,description,stock,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
                    ->execute([$skuVal, strtoupper($n['name']), strtoupper($n['category']), (float)$n['price'],
                        strtoupper($n['unit'] ?? 'KG'), $n['image_url'] ?? '', $extraImgs,
                        $n['promo'] ?? null, $n['description'] ?? null, (int)($n['stock'] ?? 0), (int)($n['active'] ?? 1)]);
                echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId()]);
            } catch (PDOException $e) {
                echo json_encode(['error' => str_contains($e->getMessage(),'sku') ? 'El SKU ya existe' : $e->getMessage()]);
            }
            exit;

        case 'update_product':
            $id = (int)($input['id'] ?? 0);
            if (!$id) { echo json_encode(['error' => 'ID requerido']); exit; }
            $extraImgs = (!empty($input['extra_images']) && is_array($input['extra_images']))
                ? json_encode(array_values(array_filter($input['extra_images']))) : null;
            $skuVal = !empty(trim($input['sku'] ?? '')) ? strtoupper(trim($input['sku'])) : null;
            try {
                $pdo->prepare("UPDATE products SET sku=?,name=?,category=?,price=?,unit=?,image_url=?,extra_images=?,promo=?,description=?,stock=?,active=? WHERE id=?")
                    ->execute([$skuVal, strtoupper(trim($input['name'])), strtoupper(trim($input['category'])),
                        (float)$input['price'], strtoupper(trim($input['unit'] ?? 'KG')), trim($input['image_url'] ?? ''),
                        $extraImgs, $input['promo'] ?: null, $input['description'] ?? null,
                        (int)($input['stock'] ?? 0), (int)($input['active'] ?? 1), $id]);
                echo json_encode(['ok' => true]);
            } catch (PDOException $e) {
                echo json_encode(['error' => str_contains($e->getMessage(),'sku') ? 'El SKU ya existe' : $e->getMessage()]);
            }
            exit;

        case 'delete_product':
            $id = (int)($input['id'] ?? 0);
            if (!$id) { echo json_encode(['error' => 'ID requerido']); exit; }
            $pdo->prepare("DELETE FROM products WHERE id=?")->execute([$id]);
            echo json_encode(['ok' => true]); exit;

        case 'toggle_product':
            $id = (int)($input['id'] ?? 0);
            $pdo->prepare("UPDATE products SET active = 1-active WHERE id=?")->execute([$id]);
            echo json_encode(['ok' => true]); exit;

        case 'import_csv':
            if (empty($_FILES['csv'])) { echo json_encode(['error' => 'No se recibió archivo']); exit; }
            $handle = fopen($_FILES['csv']['tmp_name'], 'r');
            if (!$handle) { echo json_encode(['error' => 'No se pudo leer el archivo']); exit; }
            $header = array_map('strtolower', array_map('trim', fgetcsv($handle)));
            $map = array_flip($header);
            $inserted = 0; $errors = [];
            $stmt = $pdo->prepare("INSERT INTO products (name,category,price,unit,image_url,promo,description,active) VALUES (?,?,?,?,?,?,?,1) ON DUPLICATE KEY UPDATE price=VALUES(price),image_url=VALUES(image_url),promo=VALUES(promo)");
            while (($row = fgetcsv($handle)) !== false) {
                try {
                    $get = fn($k) => isset($map[$k]) ? trim($row[$map[$k]] ?? '') : '';
                    $name  = strtoupper($get('name') ?: $get('nombre'));
                    $cat   = strtoupper($get('category') ?: $get('categoria'));
                    $price = (float) str_replace(['$',','], '', $get('price') ?: $get('precio'));
                    $unit  = strtoupper($get('unit') ?: $get('unidad') ?: 'KG');
                    $img   = $get('image_url') ?: $get('imagen') ?: $get('img');
                    $promo = $get('promo') ?: null;
                    $desc  = $get('description') ?: $get('descripcion') ?: null;
                    if (!$name || !$cat || $price <= 0) { $errors[] = "Fila inválida: ".implode(',',$row); continue; }
                    $stmt->execute([$name,$cat,$price,$unit,$img,$promo?:null,$desc]);
                    $inserted++;
                } catch (Exception $ex) { $errors[] = $ex->getMessage(); }
            }
            fclose($handle);
            echo json_encode(['ok' => true, 'inserted' => $inserted, 'errors' => $errors]); exit;

        case 'upload_image':
        case 'upload_promo_image':
            if (empty($_FILES['image'])) { echo json_encode(['error' => 'No se recibió imagen']); exit; }
            $file = $_FILES['image'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg','jpeg','png','webp','gif'])) {
                echo json_encode(['error' => 'Formato no permitido']); exit;
            }
            if ($file['size'] > 5*1024*1024) { echo json_encode(['error' => 'Máximo 5 MB']); exit; }
            $filename = uniqid('img_').'.'.$ext;
            if (!move_uploaded_file($file['tmp_name'], UPLOAD_DIR.$filename)) {
                echo json_encode(['error' => 'Error al guardar']); exit;
            }
            echo json_encode(['ok' => true, 'url' => 'https://'.$_SERVER['HTTP_HOST'].UPLOAD_URL.$filename]); exit;

        case 'stats':
            echo json_encode([
                'products'       => $pdo->query("SELECT COUNT(*) FROM products WHERE active=1")->fetchColumn(),
                'products_total' => $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn(),
                'users'          => $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(),
                'orders'         => $pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn(),
                'revenue'        => $pdo->query("SELECT COALESCE(SUM(total),0) FROM orders WHERE status!='cancelled'")->fetchColumn(),
            ]); exit;

        case 'list_users':
            try { $stmt = $pdo->query("SELECT id,name,email,role,google_id IS NOT NULL AS is_google,email_verified,created_at FROM users ORDER BY created_at DESC LIMIT 200"); }
            catch (PDOException $e) { $stmt = $pdo->query("SELECT id,name,email,'customer' AS role,google_id IS NOT NULL AS is_google,email_verified,created_at FROM users ORDER BY created_at DESC LIMIT 200"); }
            echo json_encode(['data' => $stmt->fetchAll()]); exit;

        case 'delete_user':
            $id = (int)($input['id'] ?? 0);
            if ($id) $pdo->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
            echo json_encode(['ok' => true]); exit;

        case 'list_cats':
            $stmt = $pdo->query("SELECT * FROM categories ORDER BY sort_order,name");
            echo json_encode(['data' => $stmt->fetchAll()]); exit;

        case 'save_cat':
            $id = (int)($input['id'] ?? 0);
            if (empty($input['name']) || empty($input['label'])) { echo json_encode(['error' => 'Nombre y etiqueta requeridos']); exit; }
            if ($id) {
                $pdo->prepare("UPDATE categories SET name=?,label=?,icon=?,img_url=?,sort_order=?,active=? WHERE id=?")
                    ->execute([strtoupper(trim($input['name'])), trim($input['label']), trim($input['icon'] ?? 'grid-outline'),
                        trim($input['img_url'] ?? ''), (int)($input['sort_order'] ?? 0), (int)($input['active'] ?? 1), $id]);
            } else {
                $pdo->prepare("INSERT INTO categories (name,label,icon,img_url,sort_order,active) VALUES (?,?,?,?,?,?)")
                    ->execute([strtoupper(trim($input['name'])), trim($input['label']), trim($input['icon'] ?? 'grid-outline'),
                        trim($input['img_url'] ?? ''), (int)($input['sort_order'] ?? 0), (int)($input['active'] ?? 1)]);
            }
            echo json_encode(['ok' => true]); exit;

        case 'del_cat':
            $id = (int)($input['id'] ?? 0);
            if ($id) $pdo->prepare("DELETE FROM categories WHERE id=?")->execute([$id]);
            echo json_encode(['ok' => true]); exit;

        case 'toggle_cat':
            $id = (int)($input['id'] ?? 0);
            $pdo->prepare("UPDATE categories SET active=1-active WHERE id=?")->execute([$id]);
            echo json_encode(['ok' => true]); exit;

        case 'list_promos':
            $stmt = $pdo->query("SELECT * FROM promos ORDER BY position,sort_order,id");
            echo json_encode(['data' => $stmt->fetchAll()]); exit;

        case 'create_promo':
            $n = array_map('trim', $input);
            if (empty($n['title']) || empty($n['image_url'])) { echo json_encode(['error' => 'Título e imagen requeridos']); exit; }
            $pdo->prepare("INSERT INTO promos (title,image_url,link_url,position,sort_order,active) VALUES (?,?,?,?,?,?)")
                ->execute([$n['title'], $n['image_url'], $n['link_url'] ?? '', $n['position'] ?? 'both', (int)($n['sort_order'] ?? 0), (int)($n['active'] ?? 1)]);
            echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId()]); exit;

        case 'update_promo':
            $id = (int)($input['id'] ?? 0);
            if (!$id) { echo json_encode(['error' => 'ID requerido']); exit; }
            $pdo->prepare("UPDATE promos SET title=?,image_url=?,link_url=?,position=?,sort_order=?,active=? WHERE id=?")
                ->execute([trim($input['title']), trim($input['image_url']), trim($input['link_url'] ?? ''),
                    $input['position'] ?? 'both', (int)($input['sort_order'] ?? 0), (int)($input['active'] ?? 1), $id]);
            echo json_encode(['ok' => true]); exit;

        case 'delete_promo':
            $id = (int)($input['id'] ?? 0);
            if (!$id) { echo json_encode(['error' => 'ID requerido']); exit; }
            $pdo->prepare("DELETE FROM promos WHERE id=?")->execute([$id]);
            echo json_encode(['ok' => true]); exit;

        case 'toggle_promo':
            $id = (int)($input['id'] ?? 0);
            $pdo->prepare("UPDATE promos SET active=1-active WHERE id=?")->execute([$id]);
            echo json_encode(['ok' => true]); exit;

        case 'list_stores':
            try { $stmt = $pdo->query("SELECT * FROM stores ORDER BY sort_order,name"); echo json_encode(['data' => $stmt->fetchAll()]); }
            catch (PDOException $e) { echo json_encode(['data' => [], 'error' => 'Tabla stores no encontrada']); }
            exit;

        case 'save_store':
            $id = (int)($input['id'] ?? 0); $n = array_map('trim', $input);
            if (empty($n['name']) || empty($n['address']) || empty($n['lat']) || empty($n['lng'])) {
                echo json_encode(['error' => 'Nombre, dirección, lat y lng requeridos']); exit;
            }
            try {
                if ($id) {
                    $pdo->prepare("UPDATE stores SET name=?,city=?,address=?,lat=?,lng=?,phone=?,sort_order=?,active=? WHERE id=?")
                        ->execute([$n['name'], $n['city'] ?? '', $n['address'], (float)$n['lat'], (float)$n['lng'],
                            $n['phone'] ?? null, (int)($n['sort_order'] ?? 0), (int)($n['active'] ?? 1), $id]);
                } else {
                    $pdo->prepare("INSERT INTO stores (name,city,address,lat,lng,phone,sort_order,active) VALUES (?,?,?,?,?,?,?,?)")
                        ->execute([$n['name'], $n['city'] ?? '', $n['address'], (float)$n['lat'], (float)$n['lng'],
                            $n['phone'] ?? null, (int)($n['sort_order'] ?? 0), 1]);
                }
                echo json_encode(['ok' => true, 'id' => $id ?: $pdo->lastInsertId()]);
            } catch (PDOException $e) { echo json_encode(['error' => $e->getMessage()]); }
            exit;

        case 'delete_store':
            $id = (int)($input['id'] ?? 0);
            if ($id) $pdo->prepare("DELETE FROM stores WHERE id=?")->execute([$id]);
            echo json_encode(['ok' => true]); exit;

        case 'toggle_store':
            $id = (int)($input['id'] ?? 0);
            $pdo->prepare("UPDATE stores SET active=1-active WHERE id=?")->execute([$id]);
            echo json_encode(['ok' => true]); exit;

        case 'set_user_role':
            $id = (int)($input['id'] ?? 0); $role = $input['role'] ?? '';
            if (!$id || !in_array($role, ['customer','delivery','admin'])) { echo json_encode(['error' => 'ID o rol inválido']); exit; }
            try { $pdo->prepare("UPDATE users SET role=? WHERE id=?")->execute([$role, $id]); echo json_encode(['ok' => true]); }
            catch (PDOException $e) { echo json_encode(['error' => 'Columna role no encontrada']); }
            exit;

        case 'list_orders':
            $status = $_GET['status'] ?? '';
            try {
                $sql = "SELECT o.*,u.name AS user_name,u.email AS user_email,d.name AS delivery_name
                        FROM orders o LEFT JOIN users u ON u.id=o.user_id LEFT JOIN users d ON d.id=o.delivery_user_id";
                $params = [];
                if ($status) { $sql .= " WHERE o.status=?"; $params[] = $status; }
                $sql .= " ORDER BY o.created_at DESC LIMIT 300";
                $stmt = $pdo->prepare($sql); $stmt->execute($params);
                echo json_encode(['data' => $stmt->fetchAll()]);
            } catch (PDOException $e) { echo json_encode(['data' => [], 'error' => $e->getMessage()]); }
            exit;

        case 'update_order_status':
            $id = (int)($input['id'] ?? 0); $status = $input['status'] ?? '';
            $allowed = ['pending','accepted','picked_up','on_the_way','delivered','cancelled'];
            if (!$id || !in_array($status, $allowed)) { echo json_encode(['error' => 'ID o estado inválido']); exit; }
            try { $pdo->prepare("UPDATE orders SET status=? WHERE id=?")->execute([$status, $id]); echo json_encode(['ok' => true]); }
            catch (PDOException $e) { echo json_encode(['error' => $e->getMessage()]); }
            exit;

        default: echo json_encode(['error' => 'Acción no encontrada']); exit;
    }
}

$categories = ['VEGETALES','LÁCTEOS','ACEITES','CEREALES','BEBIDAS','LIMPIEZA','CARNES','FRUTAS','OTROS'];
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TPN — Panel de Administración</title>
<link rel="stylesheet" href="admin-style.css">
</head>
<body>

<?php if (!$isLogged): ?>
<!-- ═══════════════════════ LOGIN ═══════════════════════ -->
<div class="login-wrap">
  <div class="login-card">
    <div class="login-logo">
      <div class="login-logo-mark">T</div>
      <div class="login-logo-text">
        <h1>TPN Admin</h1>
        <p>Todo Pal Negocio</p>
      </div>
    </div>
    <h2 class="login-heading">Bienvenido de nuevo</h2>
    <p class="login-sub">Ingresa tu contraseña para acceder al panel.</p>

    <?php if (!empty($loginError)): ?>
    <div class="login-error">
      <?= icon('alert', 14) ?>
      <?= htmlspecialchars($loginError) ?>
    </div>
    <?php endif ?>

    <form method="POST">
      <label class="login-field-label">Contraseña de acceso</label>
      <input type="password" name="admin_password" class="login-input" placeholder="••••••••••" autofocus>
      <button type="submit" class="login-btn">Acceder al panel</button>
    </form>
  </div>
</div>

<?php else: ?>
<!-- ═══════════════════════ NAVBAR ═══════════════════════ -->
<nav class="navbar">
  <div class="navbar-brand">
    <div class="navbar-logo">T</div>
    <span class="navbar-name">TPN Admin</span>
  </div>
  <div class="navbar-divider"></div>
  <?php if ($dbError): ?>
    <div class="db-badge err">
      <span class="db-badge-dot"></span>Sin conexión
    </div>
  <?php else: ?>
    <div class="db-badge ok">
      <span class="db-badge-dot"></span>Base de datos activa
    </div>
  <?php endif ?>
  <div class="navbar-spacer"></div>
  <div class="navbar-user-info">
    <div class="navbar-avatar"><?= icon('user', 14) ?></div>
    <span class="navbar-user">Administrador</span>
  </div>
  <div class="navbar-divider"></div>
  <a href="?logout=1" class="navbar-logout">
    <?= icon('logout', 14) ?>
    Salir
  </a>
</nav>

<div class="admin-layout">
  <div class="admin-content">

<?php if ($dbError): ?>
  <div class="db-error-card">
    <h3>Error de conexión a la base de datos</h3>
    <code><?= htmlspecialchars($dbError) ?></code>
    <p>Verifica DB_NAME, DB_USER y DB_PASS en la parte superior del archivo index.php.</p>
  </div>
<?php else: ?>

    <!-- Stats -->
    <div id="stats-row" class="stats-grid"></div>

    <!-- Tabs -->
    <div class="tab-bar" id="tab-bar">
      <button class="tab-btn active" onclick="showTab('products',this)">
        <?= icon('package', 14) ?> Productos
      </button>
      <button class="tab-btn" onclick="showTab('categories',this)">
        <?= icon('tag', 14) ?> Categorías
      </button>
      <button class="tab-btn" onclick="showTab('promos',this)">
        <?= icon('image', 14) ?> Promociones
      </button>
      <button class="tab-btn" onclick="showTab('stores',this)">
        <?= icon('building', 14) ?> Sucursales
      </button>
      <button class="tab-btn" onclick="showTab('import',this)">
        <?= icon('upload', 14) ?> Importar CSV
      </button>
      <button class="tab-btn" onclick="showTab('users',this)">
        <?= icon('users', 14) ?> Usuarios
      </button>
      <button class="tab-btn" onclick="showTab('orders',this)">
        <?= icon('cart', 14) ?> Pedidos
      </button>
      <button class="tab-btn" onclick="showTab('delivery',this)">
        <?= icon('truck', 14) ?> Repartidores
      </button>
      <button class="tab-btn" onclick="showTab('config',this)">
        <?= icon('settings', 14) ?> Configuración
      </button>
    </div>

    <!-- ════════ TAB: PRODUCTOS ════════ -->
    <div id="tab-products" class="tab-panel active">
      <div class="tab-panel-inner">
        <div class="toolbar">
          <div class="input-icon-wrap" style="max-width:260px;flex:1">
            <?= icon('search', 14) ?>
            <input id="search-q" type="text" placeholder="Buscar producto…" oninput="loadProducts()">
          </div>
          <div class="input-icon-wrap" style="max-width:190px;flex:1">
            <?= icon('filter', 14) ?>
            <select id="filter-cat" onchange="loadProducts()" style="padding-left:34px">
              <option value="">Todas las categorías</option>
              <?php foreach ($categories as $c): ?>
              <option value="<?= $c ?>"><?= $c ?></option>
              <?php endforeach ?>
            </select>
          </div>
          <div class="toolbar-spacer"></div>
          <button class="btn btn-primary" onclick="openModal('create')">
            <?= icon('plus', 14) ?>
            Nuevo producto
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Imagen</th><th>Producto</th><th>Categoría</th><th>Precio</th>
              <th>Unidad</th><th>Stock</th><th>Promo</th><th>Activo</th><th>Acciones</th>
            </tr></thead>
            <tbody id="products-tbody">
              <tr><td colspan="9"><div class="empty-state">
                <div class="empty-icon"><?= icon('package', 20) ?></div>
                <div class="empty-label">Cargando productos…</div>
              </div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ════════ TAB: CATEGORÍAS ════════ -->
    <div id="tab-categories" class="tab-panel">
      <div class="tab-panel-inner">
        <div class="toolbar">
          <div>
            <div class="toolbar-section-title">Categorías</div>
            <div class="toolbar-section-sub">Controla qué categorías aparecen en la app</div>
          </div>
          <div class="toolbar-spacer"></div>
          <button class="btn btn-primary" onclick="openCatModal()">
            <?= icon('plus', 14) ?> Nueva categoría
          </button>
        </div>
        <div class="notice notice-warning mb-2">
          <strong>Importante:</strong> El campo <strong>Nombre</strong> debe coincidir exactamente con
          <code>category</code> en productos (mayúsculas). Ej: <code>VEGETALES</code>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Imagen</th><th>Nombre en BD</th><th>Etiqueta App</th><th>Ícono</th><th>Orden</th><th>Activo</th><th>Acciones</th>
            </tr></thead>
            <tbody id="cats-tbody">
              <tr><td colspan="7"><div class="empty-state">
                <div class="empty-icon"><?= icon('tag', 20) ?></div>
                <div class="empty-label">Cargando…</div>
              </div></td></tr>
            </tbody>
          </table>
        </div>
        <div class="notice notice-info mt-2">
          <strong>Íconos disponibles (Ionicons):</strong>
          leaf-outline · nutrition-outline · flask-outline · restaurant-outline · wine-outline · sparkles-outline · fish-outline · pricetag-outline · grid-outline · cart-outline
        </div>
      </div>
    </div>

    <!-- ════════ TAB: PROMOCIONES ════════ -->
    <div id="tab-promos" class="tab-panel">
      <div class="tab-panel-inner">
        <div class="toolbar">
          <div class="toolbar-section-title">Banners y Promociones</div>
          <div class="toolbar-spacer"></div>
          <button class="btn btn-primary" onclick="openPromoModal('create')">
            <?= icon('plus', 14) ?> Nueva promoción
          </button>
        </div>
        <div class="notice notice-info mb-3">
          <strong>Dimensiones recomendadas de imágenes:</strong>
          <div class="dimension-cards">
            <div class="dimension-card">
              <div class="dim-icon"><?= icon('info', 15) ?></div>
              <div class="dim-type">Móvil</div>
              <div class="dim-size">800 × 300 px</div>
              <div class="dim-ratio">Relación 8:3</div>
              <div class="dim-pos">home_mobile</div>
            </div>
            <div class="dimension-card">
              <div class="dim-icon"><?= icon('info', 15) ?></div>
              <div class="dim-type">Escritorio</div>
              <div class="dim-size">1200 × 380 px</div>
              <div class="dim-ratio">Relación ~3:1</div>
              <div class="dim-pos">home_desktop</div>
            </div>
            <div class="dimension-card">
              <div class="dim-icon"><?= icon('info', 15) ?></div>
              <div class="dim-type">Ambos</div>
              <div class="dim-size">1200 × 400 px</div>
              <div class="dim-ratio">Relación 3:1</div>
              <div class="dim-pos">both</div>
            </div>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Imagen</th><th>Título</th><th>Posición</th><th>Orden</th><th>Enlace</th><th>Activo</th><th>Acciones</th>
            </tr></thead>
            <tbody id="promos-tbody">
              <tr><td colspan="7"><div class="empty-state">
                <div class="empty-icon"><?= icon('image', 20) ?></div>
                <div class="empty-label">Cargando…</div>
              </div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ════════ TAB: SUCURSALES ════════ -->
    <div id="tab-stores" class="tab-panel">
      <div class="tab-panel-inner">
        <div class="toolbar">
          <div class="toolbar-section-title">Sucursales</div>
          <div class="toolbar-spacer"></div>
          <button class="btn btn-primary" onclick="openStoreForm(null)">
            <?= icon('plus', 14) ?> Nueva sucursal
          </button>
        </div>

        <div id="storeForm" class="store-form">
          <div class="toolbar-section-title mb-2" id="storeFormTitle">Nueva sucursal</div>
          <input type="hidden" id="storeId">
          <div class="field-row mb-2">
            <div class="field">
              <label class="field-label">Nombre <span>*</span></label>
              <input id="storeName" type="text" placeholder="TPN Centro">
            </div>
            <div class="field">
              <label class="field-label">Ciudad</label>
              <input id="storeCity" type="text" placeholder="Morelia">
            </div>
          </div>
          <div class="field mb-2">
            <label class="field-label">Dirección <span>*</span></label>
            <input id="storeAddress" type="text" placeholder="Calle 20 de Noviembre #825">
          </div>
          <div class="field-row-4 mb-2">
            <div class="field">
              <label class="field-label">Latitud <span>*</span></label>
              <input id="storeLat" type="number" step="0.0000001" placeholder="19.7061">
            </div>
            <div class="field">
              <label class="field-label">Longitud <span>*</span></label>
              <input id="storeLng" type="number" step="0.0000001" placeholder="-101.1950">
            </div>
            <div class="field">
              <label class="field-label">Teléfono</label>
              <input id="storePhone" type="text" placeholder="443-123-4567">
            </div>
            <div class="field">
              <label class="field-label">Orden</label>
              <input id="storeSortOrder" type="number" value="0">
            </div>
          </div>
          <div class="notice notice-info mb-2">
            Coordenadas: abre Google Maps, clic derecho sobre la ubicación y copia las coordenadas.
          </div>
          <div class="flex gap-2">
            <button class="btn btn-primary" onclick="saveStore()"><?= icon('check', 14) ?> Guardar sucursal</button>
            <button class="btn btn-outline" onclick="document.getElementById('storeForm').classList.remove('open')">Cancelar</button>
          </div>
          <p id="storeFormError" class="text-brand text-sm mt-1 hidden"></p>
        </div>

        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Nombre</th><th>Ciudad</th><th>Dirección</th><th>Coordenadas</th><th>Teléfono</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody id="storesTbody">
              <tr><td colspan="7"><div class="empty-state">
                <div class="empty-icon"><?= icon('building', 20) ?></div>
                <div class="empty-label">Cargando…</div>
              </div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ════════ TAB: IMPORTAR CSV ════════ -->
    <div id="tab-import" class="tab-panel">
      <div class="tab-panel-inner">
        <div class="toolbar-section-title mb-3">Importar productos desde CSV</div>
        <div class="notice notice-info mb-3">
          <strong>Formato de columnas:</strong> <code>name, category, price, unit, image_url, promo, description</code><br>
          También en español: <code>nombre, categoria, precio, unidad, imagen, descripcion</code><br>
          Si el producto ya existe, se actualiza precio e imagen.
        </div>
        <a href="data:text/csv;charset=utf-8,name,category,price,unit,image_url,promo,description%0AJITOMATE,VEGETALES,7.90,KG,https://url-imagen.com/foto.jpg,-10%25,Jitomate fresco"
           download="plantilla_productos.csv"
           class="btn btn-secondary mb-3">
          <?= icon('download', 14) ?> Descargar plantilla CSV
        </a>

        <div class="drop-zone" id="drop-zone"
             onclick="document.getElementById('csv-file').click()"
             ondragover="event.preventDefault();this.classList.add('drag-over')"
             ondragleave="this.classList.remove('drag-over')"
             ondrop="handleDrop(event)">
          <div class="drop-zone-icon"><?= icon('upload', 22) ?></div>
          <div class="drop-zone-title">Arrastra tu archivo CSV aquí</div>
          <div class="drop-zone-sub">o haz clic para seleccionar desde tu dispositivo</div>
          <input type="file" id="csv-file" accept=".csv" class="hidden" onchange="previewCSV(this)" onclick="event.stopPropagation()">
          <button class="btn btn-primary" onclick="event.stopPropagation();document.getElementById('csv-file').click()">
            Seleccionar archivo
          </button>
        </div>

        <div id="csv-preview" class="hidden mt-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="font-semi" id="csv-filename"></span>
            <div class="toolbar-spacer"></div>
            <button class="btn btn-primary" onclick="importCSV()">
              <?= icon('check', 14) ?> Importar productos
            </button>
          </div>
          <div class="table-wrap" style="max-height:220px;overflow-y:auto">
            <table id="csv-table">
              <thead id="csv-head"></thead>
              <tbody id="csv-body"></tbody>
            </table>
          </div>
          <p id="csv-count" class="text-faint text-sm mt-1"></p>
        </div>
        <div id="import-result" class="hidden mt-3"></div>
      </div>
    </div>

    <!-- ════════ TAB: USUARIOS ════════ -->
    <div id="tab-users" class="tab-panel">
      <div class="tab-panel-inner">
        <div class="toolbar mb-3">
          <div>
            <div class="toolbar-section-title">Usuarios registrados</div>
            <div class="toolbar-section-sub">Gestiona roles y accesos</div>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>Nombre</th><th>Email</th><th>Rol</th>
              <th>Login</th><th>Verificado</th><th>Registro</th><th></th>
            </tr></thead>
            <tbody id="users-tbody">
              <tr><td colspan="8"><div class="empty-state">
                <div class="empty-icon"><?= icon('users', 20) ?></div>
                <div class="empty-label">Cargando usuarios…</div>
              </div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ════════ TAB: PEDIDOS ════════ -->
    <div id="tab-orders" class="tab-panel">
      <div class="tab-panel-inner">
        <div class="toolbar mb-3">
          <div>
            <div class="toolbar-section-title">Todos los pedidos</div>
          </div>
          <div class="toolbar-spacer"></div>
          <select id="orders-filter-status" style="max-width:200px" onchange="loadOrders()">
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="accepted">Aceptado</option>
            <option value="picked_up">Recogido</option>
            <option value="on_the_way">En camino</option>
            <option value="delivered">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>ID</th><th>Cliente</th><th>Total</th><th>Estado</th>
              <th>Pago</th><th>Repartidor</th><th>Fecha</th><th>Acción</th>
            </tr></thead>
            <tbody id="orders-tbody">
              <tr><td colspan="8"><div class="empty-state">
                <div class="empty-icon"><?= icon('cart', 20) ?></div>
                <div class="empty-label">Cargando pedidos…</div>
              </div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ════════ TAB: REPARTIDORES ════════ -->
    <div id="tab-delivery" class="tab-panel">
      <div class="tab-panel-inner">
        <div class="toolbar-section-title mb-2">Gestión de repartidores</div>
        <div class="notice notice-info mb-3">
          Cuando un usuario tiene rol <strong>Repartidor</strong>, al iniciar sesión verá su
          interfaz de entregas en lugar de la tienda normal.
        </div>
        <div class="section-title">Repartidores activos</div>
        <div class="table-wrap mb-3">
          <table>
            <thead><tr><th>#</th><th>Nombre</th><th>Email</th><th>Login</th><th>Acción</th></tr></thead>
            <tbody id="delivery-tbody">
              <tr><td colspan="5"><div class="empty-state">
                <div class="empty-icon"><?= icon('truck', 20) ?></div>
                <div class="empty-label">Cargando…</div>
              </div></td></tr>
            </tbody>
          </table>
        </div>
        <div class="section-title">Asignar roles a usuarios</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Nombre</th><th>Email</th><th>Rol actual</th><th>Cambiar rol</th></tr></thead>
            <tbody id="all-users-role-tbody">
              <tr><td colspan="5"><div class="empty-state">Cargando…</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ════════ TAB: CONFIG ════════ -->
    <div id="tab-config" class="tab-panel">
      <div class="tab-panel-inner">
        <div class="toolbar-section-title mb-3">Configuración del sistema</div>
        <div class="config-grid">
          <div class="config-card">
            <div class="config-card-title"><?= icon('database', 14) ?> Base de datos</div>
            <div class="config-row"><span class="config-key">Host</span><code class="config-val"><?= DB_HOST ?></code></div>
            <div class="config-row"><span class="config-key">Base de datos</span><code class="config-val"><?= DB_NAME ?></code></div>
            <div class="config-row"><span class="config-key">Usuario</span><code class="config-val"><?= DB_USER ?></code></div>
            <div class="config-row">
              <span class="config-key">Estado</span>
              <span class="badge <?= $dbError ? 'badge-red' : 'badge-green' ?>">
                <?= $dbError ? 'Error de conexión' : 'Conectada' ?>
              </span>
            </div>
          </div>
          <div class="config-card">
            <div class="config-card-title"><?= icon('settings', 14) ?> URL de la API</div>
            <div class="config-row" style="flex-direction:column;align-items:flex-start;gap:4px">
              <span class="config-key">API Base URL</span>
              <code class="config-val" style="word-break:break-all">https://<?= $_SERVER['HTTP_HOST'] ?>/api</code>
            </div>
            <div class="config-row"><span class="config-key">GET /api/products</span></div>
            <div class="config-row"><span class="config-key">POST /api/auth/login</span></div>
            <div class="config-row"><span class="config-key">POST /api/auth/register</span></div>
          </div>
          <div class="config-card">
            <div class="config-card-title"><?= icon('info', 14) ?> Google OAuth</div>
            <div style="font-size:12.5px;color:var(--text-3);line-height:1.8">
              <p>1. <a href="https://console.cloud.google.com" target="_blank" style="color:var(--brand);font-weight:600">console.cloud.google.com</a></p>
              <p>2. APIs → Credentials → Authorized origins:</p>
              <code class="config-val">https://<?= $_SERVER['HTTP_HOST'] ?></code>
              <p>3. Redirect URIs:</p>
              <code class="config-val">https://<?= $_SERVER['HTTP_HOST'] ?>/auth</code>
            </div>
          </div>
          <div class="config-card">
            <div class="config-card-title"><?= icon('alert', 14) ?> Seguridad</div>
            <div class="notice notice-warning" style="font-size:12px;margin:0">
              Cambia <code>ADMIN_PASSWORD</code> en la sección CONFIG del archivo PHP.<br>
              Cambia <code>SECRET_KEY</code> en <code>../index.php</code>
            </div>
          </div>
        </div>
      </div>
    </div>

<?php endif ?>
  </div>
</div>
<?php endif ?>


<!-- ═══════════════ MODAL: PRODUCTO ════════════════════ -->
<div id="product-modal" class="modal-overlay">
  <div class="modal modal-lg">
    <div class="modal-header">
      <h2 id="modal-title" class="modal-title">Nuevo producto</h2>
      <button class="modal-close" onclick="closeModal()"><?= icon('x', 14) ?></button>
    </div>
    <div class="modal-body">
      <form id="product-form" onsubmit="saveProduct(event)">
        <input type="hidden" id="prod-id">
        <div class="field-row mb-2">
          <div class="field">
            <label class="field-label">Nombre <span>*</span></label>
            <input id="prod-name" required placeholder="JITOMATE">
          </div>
          <div class="field">
            <label class="field-label">SKU / Código <span>(opcional)</span></label>
            <input id="prod-sku" placeholder="TPN-001">
          </div>
        </div>
        <div class="field-row mb-2">
          <div class="field">
            <label class="field-label">Categoría <span>*</span></label>
            <select id="prod-cat" required>
              <option value="">Selecciona una categoría…</option>
              <?php foreach ($categories as $c): ?><option value="<?= $c ?>"><?= $c ?></option><?php endforeach ?>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Unidad</label>
            <select id="prod-unit">
              <option value="KG">KG — Kilogramo</option>
              <option value="PZA">PZA — Pieza</option>
              <option value="L">L — Litro</option>
              <option value="G">G — Gramos</option>
              <option value="PAQUETE">PAQUETE</option>
              <option value="CAJA">CAJA</option>
            </select>
          </div>
        </div>
        <div class="field-row-4 mb-2">
          <div class="field">
            <label class="field-label">Precio <span>*</span></label>
            <input id="prod-price" type="number" step="0.01" required placeholder="7.90">
          </div>
          <div class="field">
            <label class="field-label">Stock</label>
            <input id="prod-stock" type="number" min="0" placeholder="0">
          </div>
          <div class="field">
            <label class="field-label">Promo</label>
            <input id="prod-promo" placeholder="-10%">
          </div>
          <div class="field">
            <label class="field-label">Estado</label>
            <select id="prod-active">
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
        </div>

        <div class="field mb-2">
          <label class="field-label">Imagen principal</label>
          <div class="field-group">
            <input id="prod-img" placeholder="https://… o sube una imagen">
            <button type="button" class="btn btn-secondary btn-sm" onclick="triggerUpload('img-upload','prod-img','img-preview')">
              <?= icon('photo', 13) ?> Subir
            </button>
            <input type="file" id="img-upload" accept="image/*" class="hidden" onchange="uploadImageTo(this,'prod-img','img-preview')">
          </div>
          <img id="img-preview" class="img-preview mt-1">
        </div>

        <div class="field mb-2 extra-imgs-panel">
          <div class="flex items-center gap-2 mb-2">
            <label class="field-label" style="margin:0">Imágenes adicionales</label>
            <div class="toolbar-spacer"></div>
            <button type="button" class="btn btn-outline btn-xs" onclick="addExtraImg()">
              <?= icon('plus', 11) ?> Agregar
            </button>
          </div>
          <div id="extra-imgs-list" class="extra-imgs-list"></div>
          <div class="field-hint">Máximo 6 imágenes. Aparecen en la galería del producto.</div>
        </div>

        <div class="field mb-3">
          <label class="field-label">Descripción</label>
          <textarea id="prod-desc" rows="3" placeholder="Descripción del producto para los clientes…"></textarea>
        </div>

        <div class="flex gap-2">
          <button type="button" class="btn btn-outline" style="flex:1" onclick="closeModal()">Cancelar</button>
          <button type="submit" id="save-btn" class="btn btn-primary" style="flex:1">Guardar producto</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- ═══════════════ MODAL: CATEGORÍA ════════════════════ -->
<div id="cat-modal" class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2 id="cat-modal-title" class="modal-title">Nueva categoría</h2>
      <button class="modal-close" onclick="closeCatModal()"><?= icon('x', 14) ?></button>
    </div>
    <div class="modal-body">
      <form id="cat-form" onsubmit="saveCat(event)">
        <input type="hidden" id="cat-id">
        <div class="field-row mb-2">
          <div class="field">
            <label class="field-label">Nombre en BD <span>* (MAYÚSCULAS)</span></label>
            <input id="cat-name" required placeholder="VEGETALES">
          </div>
          <div class="field">
            <label class="field-label">Etiqueta en App <span>*</span></label>
            <input id="cat-label" required placeholder="Vegetales">
          </div>
          <div class="field">
            <label class="field-label">Ícono (Ionicons)</label>
            <input id="cat-icon" placeholder="leaf-outline">
          </div>
          <div class="field">
            <label class="field-label">Orden</label>
            <input id="cat-order" type="number" value="0" min="0">
          </div>
        </div>
        <div class="field mb-2">
          <label class="field-label">URL de imagen</label>
          <div class="field-group">
            <input id="cat-img" placeholder="https://…">
            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('cat-img-upload').click()">
              <?= icon('photo', 13) ?>
            </button>
            <input type="file" id="cat-img-upload" accept="image/*" class="hidden" onchange="uploadCatImage(this)">
          </div>
          <img id="cat-img-preview" class="img-preview mt-1">
        </div>
        <div class="field mb-3">
          <label class="field-label">Estado</label>
          <select id="cat-active">
            <option value="1">Activo — visible en app</option>
            <option value="0">Inactivo — oculto</option>
          </select>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn-outline" style="flex:1" onclick="closeCatModal()">Cancelar</button>
          <button type="submit" id="cat-save-btn" class="btn btn-primary" style="flex:1">Guardar categoría</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- ═══════════════ MODAL: PROMOCIÓN ════════════════════ -->
<div id="promo-modal" class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2 id="promo-modal-title" class="modal-title">Nueva promoción</h2>
      <button class="modal-close" onclick="closePromoModal()"><?= icon('x', 14) ?></button>
    </div>
    <div class="modal-body">
      <form id="promo-form" onsubmit="savePromo(event)">
        <input type="hidden" id="promo-id">
        <div class="field mb-2">
          <label class="field-label">Título <span>*</span></label>
          <input id="promo-title" required placeholder="Oferta de temporada">
        </div>
        <div class="field-row mb-2">
          <div class="field">
            <label class="field-label">Posición <span>*</span></label>
            <select id="promo-position">
              <option value="both">Ambos dispositivos (1200×400)</option>
              <option value="home_mobile">Solo móvil (800×300)</option>
              <option value="home_desktop">Solo escritorio (1200×380)</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Orden</label>
            <input id="promo-order" type="number" value="0" min="0">
          </div>
        </div>
        <div class="field mb-2">
          <label class="field-label">Imagen <span>*</span></label>
          <div class="field-group">
            <input id="promo-img" required placeholder="https://… o sube una imagen">
            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('promo-img-upload').click()">
              <?= icon('photo', 13) ?> Subir
            </button>
            <input type="file" id="promo-img-upload" accept="image/*" class="hidden" onchange="uploadPromoImage(this)">
          </div>
          <img id="promo-img-preview" class="img-preview mt-1" style="height:90px;width:100%">
        </div>
        <div class="field mb-2">
          <label class="field-label">Enlace <span>(opcional)</span></label>
          <input id="promo-link" placeholder="https://…">
        </div>
        <div class="field mb-3">
          <label class="field-label">Estado</label>
          <select id="promo-active">
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </select>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn-outline" style="flex:1" onclick="closePromoModal()">Cancelar</button>
          <button type="submit" id="promo-save-btn" class="btn btn-primary" style="flex:1">Guardar promoción</button>
        </div>
      </form>
    </div>
  </div>
</div>


<!-- ═══════════════ SCRIPTS ═══════════════════════════════ -->
<script>
let csvData = [];
const PRODS = {}, PROMOS = {}, CATS = {}, STORES = {};

// ── Tabs ───────────────────────────────────────────────
function showTab(tab, btnEl) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (btnEl) btnEl.classList.add('active');
  if (tab === 'products')   loadProducts();
  if (tab === 'categories') loadCats();
  if (tab === 'promos')     loadPromos();
  if (tab === 'stores')     loadStores();
  if (tab === 'users')      loadUsers();
  if (tab === 'orders')     loadOrders();
  if (tab === 'delivery')   loadDeliveryTab();
}

// ── Stats ──────────────────────────────────────────────
async function loadStats() {
  const s = await api('stats');
  const cards = [
    { label: 'Productos activos', val: s.products,       color: 'green',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>' },
    { label: 'Total catálogo',   val: s.products_total, color: 'blue',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/>' },
    { label: 'Usuarios',          val: s.users,          color: 'purple',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>' },
    { label: 'Pedidos totales',   val: s.orders,         color: 'orange',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>' },
    { label: 'Ingresos totales',  val: '$' + Number(s.revenue).toLocaleString('es-MX', {minimumFractionDigits:2}), color: 'red',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>' },
  ];
  document.getElementById('stats-row').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-icon ${c.color}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">${c.icon}</svg>
      </div>
      <div>
        <div class="stat-value">${c.val}</div>
        <div class="stat-label">${c.label}</div>
      </div>
    </div>`).join('');
}

// ── Productos ──────────────────────────────────────────
async function loadProducts() {
  const q   = document.getElementById('search-q').value;
  const cat = document.getElementById('filter-cat').value;
  const res = await api(`list_products&q=${encodeURIComponent(q)}&cat=${encodeURIComponent(cat)}`);
  const tbody = document.getElementById('products-tbody');
  if (!res.data?.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/></svg></div><div class="empty-label">Sin productos que mostrar</div></div></td></tr>`;
    return;
  }
  res.data.forEach(p => PRODS[p.id] = p);
  tbody.innerHTML = res.data.map(p => {
    const stock = parseInt(p.stock ?? 0);
    const stockBadge = stock === 0
      ? `<span class="badge badge-red"><span class="status-dot red"></span>Agotado</span>`
      : stock < 10
      ? `<span class="badge badge-yellow"><span class="status-dot yellow"></span>${stock} bajo</span>`
      : `<span class="badge badge-green"><span class="status-dot green"></span>${stock}</span>`;
    return `<tr>
      <td class="td-img"><img src="${p.image_url || 'https://placehold.co/40x40/f1f3f7/94a3b8?text=N/A'}" alt="${p.name}"></td>
      <td>
        <div class="td-name">${p.name}</div>
        ${p.sku ? `<div class="td-sub">${p.sku}</div>` : ''}
      </td>
      <td><span class="badge badge-gray">${p.category}</span></td>
      <td class="td-price">$${Number(p.price).toFixed(2)}</td>
      <td class="td-muted">${p.unit}</td>
      <td>${stockBadge}</td>
      <td>${p.promo ? `<span class="badge badge-red">${p.promo}</span>` : '<span class="text-faint">—</span>'}</td>
      <td>
        <label class="toggle">
          <input type="checkbox" ${p.active ? 'checked' : ''} onchange="toggleProduct(${p.id})">
          <span class="toggle-track"></span>
        </label>
      </td>
      <td>
        <div class="td-actions">
          <button class="btn btn-outline btn-xs" onclick="editProd(${p.id})">Editar</button>
          <button class="btn btn-danger btn-xs" onclick="deleteProd(${p.id})">Eliminar</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function toggleProduct(id) { await api('toggle_product', 'POST', { id }); loadProducts(); loadStats(); }
function editProd(id) { const p = PRODS[id]; if (p) editProduct(p); }

async function deleteProd(id) {
  const p = PRODS[id]; if (!p) return;
  if (!confirm(`¿Eliminar "${p.name}"?\n\nEsta acción no se puede deshacer.`)) return;
  await api('delete_product', 'POST', { id }); loadProducts(); loadStats();
}

function openModal(mode) {
  document.getElementById('modal-title').textContent = mode === 'create' ? 'Nuevo producto' : 'Editar producto';
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-stock').value = '0';
  document.getElementById('img-preview').classList.remove('visible');
  document.getElementById('extra-imgs-list').innerHTML = '';
  document.getElementById('product-modal').classList.add('open');
}

function editProduct(p) {
  openModal('edit');
  document.getElementById('prod-id').value    = p.id;
  document.getElementById('prod-sku').value   = p.sku || '';
  document.getElementById('prod-name').value  = p.name;
  document.getElementById('prod-cat').value   = p.category;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-unit').value  = p.unit;
  document.getElementById('prod-stock').value = p.stock ?? 0;
  document.getElementById('prod-promo').value = p.promo || '';
  document.getElementById('prod-img').value   = p.image_url || '';
  document.getElementById('prod-desc').value  = p.description || '';
  document.getElementById('prod-active').value= p.active;
  if (p.image_url) { const img = document.getElementById('img-preview'); img.src = p.image_url; img.classList.add('visible'); }
  document.getElementById('extra-imgs-list').innerHTML = '';
  try { (p.extra_images ? JSON.parse(p.extra_images) : []).forEach(url => addExtraImg(url)); } catch(e) {}
}

function closeModal() { document.getElementById('product-modal').classList.remove('open'); }

// ── Extra imgs ─────────────────────────────────────────
let extraImgCount = 0;
function addExtraImg(url = '') {
  const list = document.getElementById('extra-imgs-list');
  if (list.children.length >= 6) { alert('Máximo 6 imágenes adicionales'); return; }
  const idx = extraImgCount++;
  const div = document.createElement('div');
  div.className = 'extra-img-row';
  div.innerHTML = `
    <input type="text" id="extra-inp-${idx}" class="extra-img-url" placeholder="https://…" value="${url}">
    <button type="button" onclick="triggerUpload('extra-upload-${idx}','extra-inp-${idx}','extra-prev-${idx}')" class="btn btn-outline btn-xs">Subir</button>
    <input type="file" id="extra-upload-${idx}" accept="image/*" class="hidden" onchange="uploadImageTo(this,'extra-inp-${idx}','extra-prev-${idx}')">
    <img id="extra-prev-${idx}" class="extra-img-thumb ${url ? 'visible' : ''}" src="${url}">
    <button type="button" onclick="this.parentElement.remove()" class="btn btn-danger btn-xs">✕</button>`;
  div.querySelector('.extra-img-url').addEventListener('input', function() {
    const prev = document.getElementById(`extra-prev-${idx}`);
    prev.src = this.value; prev.classList.toggle('visible', !!this.value);
  });
  list.appendChild(div);
}

function triggerUpload(fileId, textId, prevId) {
  const fi = document.getElementById(fileId);
  fi._textId = textId; fi._prevId = prevId; fi.click();
}

async function uploadImageTo(fileInput, textInputId, previewId) {
  const file = fileInput.files[0]; if (!file) return;
  const fd = new FormData(); fd.append('image', file);
  const res = await fetch('?action=upload_image', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.url) {
    document.getElementById(textInputId).value = data.url;
    const prev = document.getElementById(previewId);
    prev.src = data.url; prev.classList.add('visible');
  } else alert('Error: ' + (data.error || 'desconocido'));
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  const extraImgs = [...document.querySelectorAll('.extra-img-url')].map(i => i.value.trim()).filter(Boolean);
  const data = {
    id: id ? parseInt(id) : null,
    sku: document.getElementById('prod-sku').value.trim() || null,
    name: document.getElementById('prod-name').value,
    category: document.getElementById('prod-cat').value,
    price: document.getElementById('prod-price').value,
    unit: document.getElementById('prod-unit').value,
    stock: parseInt(document.getElementById('prod-stock').value) || 0,
    promo: document.getElementById('prod-promo').value || null,
    image_url: document.getElementById('prod-img').value,
    extra_images: extraImgs,
    description: document.getElementById('prod-desc').value || null,
    active: document.getElementById('prod-active').value,
  };
  const btn = document.getElementById('save-btn');
  btn.textContent = 'Guardando…'; btn.disabled = true;
  const res = await api(id ? 'update_product' : 'create_product', 'POST', data);
  btn.textContent = 'Guardar producto'; btn.disabled = false;
  if (res.error) { alert('Error: ' + res.error); return; }
  closeModal(); loadProducts(); loadStats();
}

// ── Categorías ─────────────────────────────────────────
async function loadCats() {
  const res = await api('list_cats');
  const tbody = document.getElementById('cats-tbody');
  if (!res.data?.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-label">Sin categorías</div></div></td></tr>`; return; }
  res.data.forEach(c => CATS[c.id] = c);
  tbody.innerHTML = res.data.map(c => `<tr>
    <td class="td-img">${c.img_url ? `<img src="${c.img_url}" alt="${c.label}">` : '<span class="text-faint td-muted">—</span>'}</td>
    <td><code class="font-mono">${c.name}</code></td>
    <td class="td-name">${c.label}</td>
    <td class="td-muted">${c.icon || '—'}</td>
    <td class="td-muted" style="text-align:center">${c.sort_order}</td>
    <td><label class="toggle"><input type="checkbox" ${c.active ? 'checked' : ''} onchange="toggleCat(${c.id})"><span class="toggle-track"></span></label></td>
    <td><div class="td-actions">
      <button class="btn btn-outline btn-xs" onclick="editCatById(${c.id})">Editar</button>
      <button class="btn btn-danger btn-xs" onclick="deleteCatById(${c.id})">Eliminar</button>
    </div></td>
  </tr>`).join('');
}

async function toggleCat(id) { await api('toggle_cat', 'POST', { id }); loadCats(); }

function editCatById(id) {
  const c = CATS[id]; if (!c) return;
  document.getElementById('cat-modal-title').textContent = 'Editar categoría';
  document.getElementById('cat-id').value    = c.id;
  document.getElementById('cat-name').value  = c.name;
  document.getElementById('cat-label').value = c.label;
  document.getElementById('cat-icon').value  = c.icon || '';
  document.getElementById('cat-order').value = c.sort_order;
  document.getElementById('cat-img').value   = c.img_url || '';
  document.getElementById('cat-active').value= c.active;
  const prev = document.getElementById('cat-img-preview');
  prev.src = c.img_url || ''; prev.classList.toggle('visible', !!c.img_url);
  document.getElementById('cat-modal').classList.add('open');
}

async function deleteCatById(id) {
  const c = CATS[id]; if (!c) return;
  if (!confirm(`¿Eliminar categoría "${c.label}"?`)) return;
  await api('del_cat', 'POST', { id }); loadCats();
}

function openCatModal() {
  document.getElementById('cat-modal-title').textContent = 'Nueva categoría';
  document.getElementById('cat-form').reset();
  document.getElementById('cat-id').value = '';
  document.getElementById('cat-img-preview').classList.remove('visible');
  document.getElementById('cat-modal').classList.add('open');
}
function closeCatModal() { document.getElementById('cat-modal').classList.remove('open'); }

async function saveCat(e) {
  e.preventDefault();
  const id = document.getElementById('cat-id').value;
  const data = {
    id: id ? parseInt(id) : null,
    name: document.getElementById('cat-name').value.toUpperCase().trim(),
    label: document.getElementById('cat-label').value,
    icon: document.getElementById('cat-icon').value || 'grid-outline',
    sort_order: parseInt(document.getElementById('cat-order').value) || 0,
    img_url: document.getElementById('cat-img').value,
    active: document.getElementById('cat-active').value,
  };
  const btn = document.getElementById('cat-save-btn');
  btn.textContent = 'Guardando…'; btn.disabled = true;
  const res = await api('save_cat', 'POST', data);
  btn.textContent = 'Guardar categoría'; btn.disabled = false;
  if (res.error) { alert('Error: ' + res.error); return; }
  closeCatModal(); loadCats();
}

async function uploadCatImage(input) {
  if (!input.files[0]) return;
  const fd = new FormData(); fd.append('image', input.files[0]);
  const res = await fetch('?action=upload_image', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.ok) {
    document.getElementById('cat-img').value = data.url;
    const prev = document.getElementById('cat-img-preview');
    prev.src = data.url; prev.classList.add('visible');
  } else alert('Error: ' + data.error);
}

// ── Promos ─────────────────────────────────────────────
const posLabel = { home_mobile: 'Solo móvil', home_desktop: 'Solo escritorio', both: 'Ambos' };
const posBadge = { home_mobile: 'badge-blue', home_desktop: 'badge-purple', both: 'badge-green' };

async function loadPromos() {
  const res = await api('list_promos');
  const tbody = document.getElementById('promos-tbody');
  if (!res.data?.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-label">Sin promociones</div></div></td></tr>`; return; }
  res.data.forEach(p => PROMOS[p.id] = p);
  tbody.innerHTML = res.data.map(p => `<tr>
    <td class="td-img"><img src="${p.image_url}" alt="${p.title}" style="width:72px;height:40px;object-fit:cover;border-radius:6px"></td>
    <td class="td-name">${p.title}</td>
    <td><span class="badge ${posBadge[p.position]||'badge-gray'}">${posLabel[p.position] || p.position}</span></td>
    <td class="td-muted" style="text-align:center">${p.sort_order}</td>
    <td class="td-muted truncate">${p.link_url || '—'}</td>
    <td><label class="toggle"><input type="checkbox" ${p.active ? 'checked' : ''} onchange="togglePromo(${p.id})"><span class="toggle-track"></span></label></td>
    <td><div class="td-actions">
      <button class="btn btn-outline btn-xs" onclick="editPromoById(${p.id})">Editar</button>
      <button class="btn btn-danger btn-xs" onclick="deletePromoById(${p.id})">Eliminar</button>
    </div></td>
  </tr>`).join('');
}

async function togglePromo(id) { await api('toggle_promo', 'POST', { id }); loadPromos(); }

function editPromoById(id) {
  const p = PROMOS[id]; if (!p) return;
  openPromoModal('edit');
  document.getElementById('promo-id').value       = p.id;
  document.getElementById('promo-title').value    = p.title;
  document.getElementById('promo-position').value = p.position;
  document.getElementById('promo-order').value    = p.sort_order;
  document.getElementById('promo-img').value      = p.image_url;
  document.getElementById('promo-link').value     = p.link_url || '';
  document.getElementById('promo-active').value   = p.active;
  const prev = document.getElementById('promo-img-preview');
  if (p.image_url) { prev.src = p.image_url; prev.classList.add('visible'); }
}

async function deletePromoById(id) {
  const p = PROMOS[id]; if (!p) return;
  if (!confirm(`¿Eliminar "${p.title}"?`)) return;
  await api('delete_promo', 'POST', { id }); loadPromos();
}

function openPromoModal(mode) {
  document.getElementById('promo-modal-title').textContent = mode === 'create' ? 'Nueva promoción' : 'Editar promoción';
  document.getElementById('promo-form').reset();
  document.getElementById('promo-id').value = '';
  document.getElementById('promo-img-preview').classList.remove('visible');
  document.getElementById('promo-modal').classList.add('open');
}
function closePromoModal() { document.getElementById('promo-modal').classList.remove('open'); }

async function savePromo(e) {
  e.preventDefault();
  const id = document.getElementById('promo-id').value;
  const data = {
    id: id ? parseInt(id) : null,
    title: document.getElementById('promo-title').value,
    position: document.getElementById('promo-position').value,
    sort_order: parseInt(document.getElementById('promo-order').value) || 0,
    image_url: document.getElementById('promo-img').value,
    link_url: document.getElementById('promo-link').value || '',
    active: document.getElementById('promo-active').value,
  };
  const btn = document.getElementById('promo-save-btn');
  btn.textContent = 'Guardando…'; btn.disabled = true;
  const res = await api(id ? 'update_promo' : 'create_promo', 'POST', data);
  btn.textContent = 'Guardar promoción'; btn.disabled = false;
  if (res.error) { alert('Error: ' + res.error); return; }
  closePromoModal(); loadPromos();
}

async function uploadPromoImage(input) {
  if (!input.files[0]) return;
  const fd = new FormData(); fd.append('image', input.files[0]);
  const res = await fetch('?action=upload_promo_image', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.ok) {
    document.getElementById('promo-img').value = data.url;
    const prev = document.getElementById('promo-img-preview');
    prev.src = data.url; prev.classList.add('visible');
  } else alert('Error: ' + data.error);
}

// ── CSV ────────────────────────────────────────────────
function handleDrop(e) {
  e.preventDefault(); document.getElementById('drop-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) { document.getElementById('csv-file').files = e.dataTransfer.files; previewCSV({files:[file]}); }
}

function previewCSV(input) {
  const file = input.files ? input.files[0] : input; if (!file) return;
  document.getElementById('csv-filename').textContent = file.name;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
    csvData = lines.map(l => l.split(',').map(v => v.trim().replace(/^"|"$/g, '')));
    const head = csvData[0];
    document.getElementById('csv-head').innerHTML = '<tr>' + head.map(h => `<th>${h}</th>`).join('') + '</tr>';
    document.getElementById('csv-body').innerHTML = csvData.slice(1, 6).map(row =>
      '<tr>' + row.map(v => `<td style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:12px">${v}</td>`).join('') + '</tr>'
    ).join('');
    document.getElementById('csv-count').textContent = `${csvData.length - 1} productos detectados (mostrando primeras 5 filas)`;
    document.getElementById('csv-preview').classList.remove('hidden');
    document.getElementById('import-result').classList.add('hidden');
  };
  reader.readAsText(file);
}

async function importCSV() {
  const fileInput = document.getElementById('csv-file');
  if (!fileInput.files[0]) { alert('Selecciona un archivo CSV'); return; }
  const fd = new FormData(); fd.append('csv', fileInput.files[0]);
  const res = await fetch('?action=import_csv', { method: 'POST', body: fd });
  const data = await res.json();
  const resultDiv = document.getElementById('import-result');
  resultDiv.classList.remove('hidden');
  resultDiv.innerHTML = data.ok
    ? `<div class="notice notice-success"><strong>Importación completada:</strong> ${data.inserted} productos importados / actualizados.${data.errors?.length ? `<br>${data.errors.length} errores: ${data.errors.slice(0,3).join(', ')}` : ''}</div>`
    : `<div class="notice notice-error">${data.error}</div>`;
  if (data.ok) { loadProducts(); loadStats(); }
}

// ── Usuarios ───────────────────────────────────────────
const ROLE_LABELS = { customer: 'Cliente', delivery: 'Repartidor', admin: 'Admin' };
const ROLE_COLORS = { customer: 'badge-gray', delivery: 'badge-orange', admin: 'badge-red' };

async function loadUsers() {
  const res = await api('list_users');
  const tbody = document.getElementById('users-tbody');
  if (!res.data?.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-label">Sin usuarios</div></div></td></tr>`; return; }
  tbody.innerHTML = res.data.map(u => {
    const role = u.role || 'customer';
    return `<tr>
      <td class="td-mono">#${u.id}</td>
      <td class="td-name">${u.name}</td>
      <td class="td-muted">${u.email}</td>
      <td>
        <select class="role-select" onchange="setUserRole(${u.id},this.value,this)">
          <option value="customer"  ${role==='customer'  ? 'selected':''}>Cliente</option>
          <option value="delivery"  ${role==='delivery'  ? 'selected':''}>Repartidor</option>
          <option value="admin"     ${role==='admin'     ? 'selected':''}>Admin</option>
        </select>
      </td>
      <td>${u.is_google
        ? '<span class="badge badge-blue">Google</span>'
        : '<span class="badge badge-gray">Email</span>'}</td>
      <td>${u.email_verified ? '<span class="badge badge-green">Verificado</span>' : '<span class="badge badge-yellow">Pendiente</span>'}</td>
      <td class="td-muted">${u.created_at?.substring(0,10)}</td>
      <td><button class="btn btn-danger btn-xs" onclick="deleteUser(${u.id},'${u.email.replace(/'/g,"\\'")}')">Eliminar</button></td>
    </tr>`;
  }).join('');
}

async function deleteUser(id, email) {
  if (!confirm(`¿Eliminar usuario ${email}?`)) return;
  await api('delete_user', 'POST', { id }); loadUsers(); loadStats();
}

async function setUserRole(id, role, selectEl) {
  const r = await api('set_user_role', 'POST', { id, role });
  if (r.error) { alert('Error: ' + r.error); loadUsers(); return; }
  const td = selectEl?.closest('td');
  if (td) td.classList.add('flash-confirm');
  if (document.getElementById('tab-delivery')?.classList.contains('active')) loadDeliveryTab();
}

// ── Pedidos ────────────────────────────────────────────
const ORDER_STATUS = {
  pending:    { label: 'Pendiente',  color: 'badge-yellow' },
  accepted:   { label: 'Aceptado',   color: 'badge-blue'   },
  picked_up:  { label: 'Recogido',   color: 'badge-blue'   },
  on_the_way: { label: 'En camino',  color: 'badge-purple' },
  delivered:  { label: 'Entregado',  color: 'badge-green'  },
  cancelled:  { label: 'Cancelado',  color: 'badge-red'    },
};

async function loadOrders() {
  const status = document.getElementById('orders-filter-status')?.value || '';
  const res = await api('list_orders' + (status ? `&status=${status}` : ''));
  const tbody = document.getElementById('orders-tbody');
  if (res.error) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-label">${res.error}</div></div></td></tr>`; return; }
  if (!res.data?.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-label">No hay pedidos</div></div></td></tr>`; return; }
  tbody.innerHTML = res.data.map(o => {
    const st = ORDER_STATUS[o.status] || { label: o.status, color: 'badge-gray' };
    return `<tr>
      <td class="td-mono">#${o.id}</td>
      <td>
        <div class="td-name">${o.customer_name || o.user_name || `#${o.user_id}`}</div>
        <div class="td-sub">${o.customer_email || o.user_email || ''}</div>
      </td>
      <td class="td-price">$${parseFloat(o.total||0).toFixed(2)}</td>
      <td><span class="badge ${st.color}">${st.label}</span></td>
      <td>${o.payment_status === 'paid'
        ? '<span class="badge badge-green">Pagado</span>'
        : '<span class="badge badge-yellow">Pendiente</span>'}</td>
      <td class="td-muted">${o.delivery_name || '—'}</td>
      <td class="td-muted">${o.created_at?.substring(0,16) || ''}</td>
      <td>
        <select class="status-select" onchange="updateOrderStatus(${o.id},this.value,this)">
          <option value="">Cambiar estado…</option>
          <option value="pending">Pendiente</option>
          <option value="accepted">Aceptado</option>
          <option value="picked_up">Recogido</option>
          <option value="on_the_way">En camino</option>
          <option value="delivered">Entregado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </td>
    </tr>`;
  }).join('');
}

async function updateOrderStatus(id, status, selectEl) {
  if (!status) return;
  const r = await api('update_order_status', 'POST', { id, status });
  if (r.error) { alert('Error: ' + r.error); return; }
  const td = selectEl?.closest('td'); if (td) td.classList.add('flash-confirm');
  loadOrders();
}

// ── Repartidores ───────────────────────────────────────
async function loadDeliveryTab() {
  const res = await api('list_users'); if (!res.data) return;
  const delivery = res.data.filter(u => u.role === 'delivery');
  const dTbody = document.getElementById('delivery-tbody');
  dTbody.innerHTML = delivery.length
    ? delivery.map(u => `<tr>
        <td class="td-mono">#${u.id}</td>
        <td class="td-name">${u.name}</td>
        <td class="td-muted">${u.email}</td>
        <td>${u.is_google ? '<span class="badge badge-blue">Google</span>' : '<span class="badge badge-gray">Email</span>'}</td>
        <td><button class="btn btn-outline btn-xs" onclick="setUserRoleAndRefreshDelivery(${u.id},'customer')">Quitar rol</button></td>
      </tr>`).join('')
    : `<tr><td colspan="5"><div class="empty-state"><div class="empty-label">No hay repartidores. Asigna el rol desde la tabla inferior.</div></div></td></tr>`;

  const allTbody = document.getElementById('all-users-role-tbody');
  allTbody.innerHTML = res.data.map(u => {
    const role = u.role || 'customer';
    return `<tr>
      <td class="td-mono">#${u.id}</td>
      <td class="td-name">${u.name}</td>
      <td class="td-muted">${u.email}</td>
      <td><span class="badge ${ROLE_COLORS[role] || 'badge-gray'}">${ROLE_LABELS[role] || role}</span></td>
      <td><div class="td-actions">
        ${role!=='customer'  ? `<button class="btn btn-secondary btn-xs" onclick="setUserRoleAndRefreshDelivery(${u.id},'customer')">Cliente</button>` : ''}
        ${role!=='delivery'  ? `<button class="btn btn-outline btn-xs" onclick="setUserRoleAndRefreshDelivery(${u.id},'delivery')">Repartidor</button>` : ''}
        ${role!=='admin'     ? `<button class="btn btn-danger btn-xs" onclick="setUserRoleAndRefreshDelivery(${u.id},'admin')">Admin</button>` : '<span class="text-faint td-muted">—</span>'}
      </div></td>
    </tr>`;
  }).join('');
}

async function setUserRoleAndRefreshDelivery(id, role) {
  const r = await api('set_user_role', 'POST', { id, role });
  if (r.error) { alert('Error: ' + r.error); return; }
  loadDeliveryTab(); loadUsers();
}

// ── Sucursales ─────────────────────────────────────────
async function loadStores() {
  const r = await api('list_stores');
  if (r.error) {
    document.getElementById('storesTbody').innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-label">${r.error}</div></div></td></tr>`;
    return;
  }
  const rows = r.data || [];
  rows.forEach(s => STORES[s.id] = s);
  document.getElementById('storesTbody').innerHTML = rows.length
    ? rows.map(s => `<tr>
        <td class="td-name">${s.name}</td>
        <td class="td-muted">${s.city || '—'}</td>
        <td class="td-muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.address}</td>
        <td class="td-mono">${parseFloat(s.lat).toFixed(5)}, ${parseFloat(s.lng).toFixed(5)}</td>
        <td class="td-muted">${s.phone || '—'}</td>
        <td>
          <button onclick="toggleStore(${s.id})" class="badge ${s.active==1 ? 'badge-green' : 'badge-gray'}" style="cursor:pointer;border:none">
            <span class="status-dot ${s.active==1?'green':'gray'}"></span>
            ${s.active==1 ? 'Activa' : 'Inactiva'}
          </button>
        </td>
        <td><div class="td-actions">
          <button class="btn btn-outline btn-xs" onclick="openStoreForm(${s.id})">Editar</button>
          <button class="btn btn-danger btn-xs" onclick="deleteStore(${s.id},'${s.name.replace(/'/g,"\\'")}')">Eliminar</button>
        </div></td>
      </tr>`).join('')
    : `<tr><td colspan="7"><div class="empty-state"><div class="empty-label">No hay sucursales registradas.</div></div></td></tr>`;
}

function openStoreForm(id) {
  const form = document.getElementById('storeForm');
  form.classList.add('open');
  if (id && STORES[id]) {
    const s = STORES[id];
    document.getElementById('storeFormTitle').textContent = 'Editar sucursal';
    document.getElementById('storeId').value    = id;
    document.getElementById('storeName').value  = s.name;
    document.getElementById('storeCity').value  = s.city || '';
    document.getElementById('storeAddress').value = s.address;
    document.getElementById('storeLat').value   = s.lat;
    document.getElementById('storeLng').value   = s.lng;
    document.getElementById('storePhone').value = s.phone || '';
    document.getElementById('storeSortOrder').value = s.sort_order || 0;
  } else {
    document.getElementById('storeFormTitle').textContent = 'Nueva sucursal';
    document.getElementById('storeId').value = '';
    ['storeName','storeCity','storeAddress','storeLat','storeLng','storePhone'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('storeSortOrder').value = 0;
  }
  document.getElementById('storeFormError').classList.add('hidden');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveStore() {
  const errEl = document.getElementById('storeFormError');
  const payload = {
    id: document.getElementById('storeId').value || 0,
    name: document.getElementById('storeName').value.trim(),
    city: document.getElementById('storeCity').value.trim(),
    address: document.getElementById('storeAddress').value.trim(),
    lat: document.getElementById('storeLat').value,
    lng: document.getElementById('storeLng').value,
    phone: document.getElementById('storePhone').value.trim(),
    sort_order: document.getElementById('storeSortOrder').value,
    active: 1,
  };
  if (!payload.name || !payload.address || !payload.lat || !payload.lng) {
    errEl.textContent = 'Nombre, dirección, latitud y longitud son requeridos.';
    errEl.classList.remove('hidden'); return;
  }
  const r = await api('save_store', 'POST', payload);
  if (r.error) { errEl.textContent = r.error; errEl.classList.remove('hidden'); return; }
  document.getElementById('storeForm').classList.remove('open'); loadStores();
}

async function deleteStore(id, name) {
  if (!confirm(`¿Eliminar la sucursal "${name}"?`)) return;
  await api('delete_store', 'POST', { id }); loadStores();
}

async function toggleStore(id) { await api('toggle_store', 'POST', { id }); loadStores(); }

// ── API helper ─────────────────────────────────────────
async function api(action, method = 'GET', body = null) {
  const opts = { method, headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(`?action=${action}`, opts);
  return res.json();
}

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadProducts();

  ['product-modal','cat-modal','promo-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        if (id === 'product-modal') closeModal();
        if (id === 'cat-modal')     closeCatModal();
        if (id === 'promo-modal')   closePromoModal();
      }
    });
  });

  document.getElementById('prod-img')?.addEventListener('input', function() {
    const img = document.getElementById('img-preview');
    img.src = this.value; img.classList.toggle('visible', !!this.value);
  });
  document.getElementById('cat-img')?.addEventListener('input', function() {
    const prev = document.getElementById('cat-img-preview');
    prev.src = this.value; prev.classList.toggle('visible', !!this.value);
  });
  document.getElementById('promo-img')?.addEventListener('input', function() {
    const prev = document.getElementById('promo-img-preview');
    prev.src = this.value; prev.classList.toggle('visible', !!this.value);
  });
});
</script>
</body>
</html>