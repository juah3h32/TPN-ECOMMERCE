<?php
/**
 * ════════════════════════════════════════════════════════════════════════════
 * TPN - Todo Pal Negocio - API REST
 * Versión: 1.0.0
 *
 * INSTALACIÓN EN HOSTINGER:
 * 1. Sube esta carpeta "api/" a tu public_html (quedaría public_html/api/index.php)
 * 2. Ejecuta schema.sql en phpMyAdmin
 * 3. Configura los valores de DB_* y las constantes de abajo
 * 4. Configura APP_URL en services/api.js de la app con tu dominio
 * ════════════════════════════════════════════════════════════════════════════
 */

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
// !! CAMBIA ESTOS VALORES con los datos de tu base de datos de Hostinger !!
define('DB_HOST', 'localhost');
define('DB_NAME', 'u992666585_TPN');        // ← Tu nombre de BD en Hostinger
define('DB_USER', 'u992666585_TPN_USER');    // ← Tu usuario de BD
define('DB_PASS', 'JUANPA9912a'); // ← Tu contraseña de BD

// Email de la tienda (para enviar correos de reset de contraseña)
define('MAIL_FROM',    'noreply@tudominio.com');
define('MAIL_FROMNAME','Todo Pal Negocio');
define('APP_NAME',     'Todo Pal Negocio');
define('APP_URL',      'https://todopalnegocio.com.mx/'); // URL de tu app web

// Llave secreta para firmar tokens (cambia por una cadena aleatoria larga)
define('SECRET_KEY', 'cambia_esto_por_una_llave_muy_secreta_2024_TPN');

// Duración de sesión: 30 días
define('SESSION_DAYS', 30);

// ─── CORS + HEADERS ───────────────────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── CONEXIÓN A BASE DE DATOS ─────────────────────────────────────────────────
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    respond(500, false, 'Error de base de datos. Verifica la configuración.');
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
// Soporta 3 estilos de URL:
//   1. /api/products                (con .htaccess rewrite)
//   2. /api/index.php/products      (PATH_INFO directo)
//   3. /api/index.php?resource=products&action=login  (query params, fallback)

$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

// --- Intentar PATH_INFO primero (funciona con /index.php/resource/action) ---
$pathInfo = trim($_SERVER['PATH_INFO'] ?? '', '/');

// --- Si PATH_INFO está vacío, parsear REQUEST_URI ---
if (empty($pathInfo)) {
    $uri   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = array_values(array_filter(explode('/', trim($uri, '/'))));
    // Eliminar segmentos que no son datos: 'api', 'index.php'
    $parts = array_values(array_filter($parts, fn($s) => $s !== 'api' && $s !== 'index.php'));
    $pathInfo = implode('/', $parts);
}

// --- Fallback a query params (?resource=products&action=login) ---
$segments = array_values(array_filter(explode('/', $pathInfo)));
if (empty($segments)) {
    $r = $_GET['resource'] ?? $_POST['resource'] ?? '';
    $a = $_GET['action']   ?? $_POST['action']   ?? '';
    $segments = array_filter([$r, $a]);
    $segments = array_values($segments);
}

$resource = $segments[0] ?? '';
$action   = $segments[1] ?? '';

// ─── DISPATCH ─────────────────────────────────────────────────────────────────
switch ($resource) {

    // ── PRODUCTOS ──────────────────────────────────────────────────────────────
    case 'products':
        if ($method === 'GET') {

            // GET /api/products/123 → detalle de un producto
            if (!empty($action) && is_numeric($action)) {
                $stmt = $pdo->prepare(
                    "SELECT id, name, category, price, unit, image_url, extra_images, promo, description, stock
                     FROM products WHERE id = ? AND active = 1"
                );
                $stmt->execute([(int)$action]);
                $p = $stmt->fetch();
                if (!$p) respond(404, false, 'Producto no encontrado');
                $p['price']        = (float)$p['price'];
                $p['price_display'] = '$' . number_format($p['price'], 2) . ' / ' . $p['unit'];
                $p['extra_images'] = $p['extra_images'] ? json_decode($p['extra_images'], true) : [];
                respond(200, true, 'OK', $p);
            }

            $cat = $_GET['category'] ?? null;
            $q   = $_GET['q'] ?? null;

            $sql    = "SELECT id, sku, name, category, price, unit, image_url, extra_images, promo, description, stock
                       FROM products WHERE active = 1";
            $params = [];

            if ($cat && $cat !== 'all') {
                $sql .= " AND category = ?";
                $params[] = strtoupper($cat);
            }
            if ($q) {
                $sql .= " AND name LIKE ?";
                $params[] = "%$q%";
            }
            $sql .= " ORDER BY category, name";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $products = $stmt->fetchAll();

            // Formatear precio como string igual al app: "$7.90 / KG"
            foreach ($products as &$p) {
                $p['price_display'] = "$" . number_format($p['price'], 2) . " / " . $p['unit'];
                $p['price']         = (float) $p['price'];
                $p['stock']         = (int) $p['stock'];
                $p['in_stock']      = $p['stock'] > 0;
                $p['extra_images']  = $p['extra_images'] ? json_decode($p['extra_images'], true) : [];
            }

            respond(200, true, 'OK', $products);
        }

        if ($method === 'POST') {
            // Crear/actualizar producto (requiere autenticación de admin en futuro)
            $required = ['name', 'category', 'price', 'unit', 'image_url'];
            foreach ($required as $field) {
                if (empty($body[$field])) {
                    respond(400, false, "Campo requerido: $field");
                }
            }

            $stmt = $pdo->prepare(
                "INSERT INTO products (name, category, price, unit, image_url, promo, description)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                strtoupper(trim($body['name'])),
                strtoupper(trim($body['category'])),
                (float) $body['price'],
                strtoupper(trim($body['unit'])),
                trim($body['image_url']),
                $body['promo'] ?? null,
                $body['description'] ?? null,
            ]);

            respond(201, true, 'Producto creado', ['id' => $pdo->lastInsertId()]);
        }

        respond(405, false, 'Método no permitido');
        break;

    // ── AUTENTICACIÓN ──────────────────────────────────────────────────────────
    case 'auth':
        switch ($action) {

            // ── REGISTRO ────────────────────────────────────────────────────────
            case 'register':
                if ($method !== 'POST') respond(405, false, 'Método no permitido');

                $name     = trim($body['name'] ?? '');
                $email    = strtolower(trim($body['email'] ?? ''));
                $password = $body['password'] ?? '';

                if (!$name || !$email || !$password) {
                    respond(400, false, 'Nombre, email y contraseña son requeridos');
                }
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    respond(400, false, 'Email inválido');
                }
                if (strlen($password) < 6) {
                    respond(400, false, 'La contraseña debe tener al menos 6 caracteres');
                }

                // Verificar si ya existe
                $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
                $check->execute([$email]);
                if ($check->fetch()) {
                    respond(409, false, 'Ya existe una cuenta con ese email');
                }

                $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 11]);
                $stmt = $pdo->prepare(
                    "INSERT INTO users (name, email, password_hash, email_verified) VALUES (?, ?, ?, 1)"
                );
                $stmt->execute([$name, $email, $hash]);
                $userId = $pdo->lastInsertId();

                $token  = createSession($pdo, $userId);
                $user   = getUserById($pdo, $userId);

                respond(201, true, '¡Bienvenido!', [
                    'user'  => $user,
                    'token' => $token,
                ]);
                break;

            // ── LOGIN ────────────────────────────────────────────────────────────
            case 'login':
                if ($method !== 'POST') respond(405, false, 'Método no permitido');

                $email    = strtolower(trim($body['email'] ?? ''));
                $password = $body['password'] ?? '';

                if (!$email || !$password) {
                    respond(400, false, 'Email y contraseña requeridos');
                }

                $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND active = 1");
                $stmt->execute([$email]);
                $row = $stmt->fetch();

                if (!$row || !$row['password_hash'] || !password_verify($password, $row['password_hash'])) {
                    respond(401, false, 'Email o contraseña incorrectos');
                }

                $token = createSession($pdo, $row['id']);
                $user  = getUserById($pdo, $row['id']);

                respond(200, true, '¡Bienvenido!', [
                    'user'  => $user,
                    'token' => $token,
                ]);
                break;

            // ── GOOGLE LOGIN ─────────────────────────────────────────────────────
            case 'google':
                if ($method !== 'POST') respond(405, false, 'Método no permitido');

                $googleId = trim($body['google_id'] ?? '');
                $name     = trim($body['name'] ?? '');
                $email    = strtolower(trim($body['email'] ?? ''));
                $photo    = trim($body['photo'] ?? '');

                if (!$googleId || !$email) {
                    respond(400, false, 'Datos de Google incompletos');
                }

                // Buscar por google_id o email
                $stmt = $pdo->prepare(
                    "SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1"
                );
                $stmt->execute([$googleId, $email]);
                $row = $stmt->fetch();

                if ($row) {
                    // Actualizar datos de Google
                    $pdo->prepare("UPDATE users SET google_id=?, name=?, photo_url=?, email_verified=1 WHERE id=?")
                        ->execute([$googleId, $name, $photo, $row['id']]);
                    $userId = $row['id'];
                } else {
                    // Crear usuario nuevo
                    $pdo->prepare(
                        "INSERT INTO users (name, email, google_id, photo_url, email_verified) VALUES (?,?,?,?,1)"
                    )->execute([$name, $email, $googleId, $photo]);
                    $userId = $pdo->lastInsertId();
                }

                $token = createSession($pdo, $userId);
                $user  = getUserById($pdo, $userId);

                respond(200, true, '¡Bienvenido!', [
                    'user'  => $user,
                    'token' => $token,
                ]);
                break;

            // ── OLVIDÉ CONTRASEÑA ────────────────────────────────────────────────
            case 'forgot-password':
                if ($method !== 'POST') respond(405, false, 'Método no permitido');

                $email = strtolower(trim($body['email'] ?? ''));
                if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    respond(400, false, 'Email inválido');
                }

                $stmt = $pdo->prepare("SELECT id, name FROM users WHERE email = ? AND active = 1");
                $stmt->execute([$email]);
                $user = $stmt->fetch();

                // Siempre responder OK por seguridad (no revelar si existe)
                if (!$user) {
                    respond(200, true, 'Si el email existe, recibirás un enlace de recuperación.');
                }

                // Crear token de reset
                $token  = bin2hex(random_bytes(32));
                $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

                // Eliminar tokens anteriores
                $pdo->prepare("DELETE FROM password_resets WHERE user_id = ?")->execute([$user['id']]);
                $pdo->prepare(
                    "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)"
                )->execute([$user['id'], $token, $expiry]);

                // Enviar email
                $resetLink = APP_URL . "/reset-password?token=" . $token;
                $subject   = APP_NAME . " - Recupera tu contraseña";
                $body_mail  = "Hola " . htmlspecialchars($user['name']) . ",\n\n"
                    . "Recibimos una solicitud para restablecer tu contraseña.\n\n"
                    . "Haz clic en el siguiente enlace (válido por 1 hora):\n"
                    . $resetLink . "\n\n"
                    . "Si no solicitaste esto, ignora este mensaje.\n\n"
                    . "— " . APP_NAME;

                $headers  = "From: " . MAIL_FROMNAME . " <" . MAIL_FROM . ">\r\n";
                $headers .= "Reply-To: " . MAIL_FROM . "\r\n";
                $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

                mail($email, $subject, $body_mail, $headers);

                respond(200, true, 'Si el email existe, recibirás un enlace de recuperación.');
                break;

            // ── VERIFICAR TOKEN DE RESET ─────────────────────────────────────────
            case 'verify-reset':
                $token = $_GET['token'] ?? $body['token'] ?? '';
                if (!$token) respond(400, false, 'Token requerido');

                $stmt = $pdo->prepare(
                    "SELECT pr.*, u.email FROM password_resets pr
                     JOIN users u ON u.id = pr.user_id
                     WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > NOW()"
                );
                $stmt->execute([$token]);
                $row = $stmt->fetch();

                if (!$row) {
                    respond(400, false, 'Token inválido o expirado');
                }

                respond(200, true, 'Token válido', ['email' => $row['email']]);
                break;

            // ── CONFIRMAR NUEVA CONTRASEÑA ───────────────────────────────────────
            case 'reset-password':
                if ($method !== 'POST') respond(405, false, 'Método no permitido');

                $token    = $body['token'] ?? '';
                $password = $body['password'] ?? '';

                if (!$token || !$password) {
                    respond(400, false, 'Token y nueva contraseña requeridos');
                }
                if (strlen($password) < 6) {
                    respond(400, false, 'La contraseña debe tener al menos 6 caracteres');
                }

                $stmt = $pdo->prepare(
                    "SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW()"
                );
                $stmt->execute([$token]);
                $reset = $stmt->fetch();

                if (!$reset) {
                    respond(400, false, 'Token inválido o expirado');
                }

                $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 11]);
                $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")->execute([$hash, $reset['user_id']]);
                $pdo->prepare("UPDATE password_resets SET used = 1 WHERE id = ?")->execute([$reset['id']]);

                // Invalidar todas las sesiones del usuario
                $pdo->prepare("DELETE FROM sessions WHERE user_id = ?")->execute([$reset['user_id']]);

                respond(200, true, 'Contraseña actualizada correctamente');
                break;

            // ── ME (perfil actual con rol actualizado) ───────────────────────────
            case 'me':
                if ($method !== 'GET') respond(405, false, 'Método no permitido');
                $uid  = requireAuth($pdo);
                $user = getUserById($pdo, $uid);
                if (!$user) respond(404, false, 'Usuario no encontrado');
                respond(200, true, 'OK', $user);
                break;

            // ── LOGOUT ───────────────────────────────────────────────────────────
            case 'logout':
                $token = getBearerToken();
                if ($token) {
                    $pdo->prepare("DELETE FROM sessions WHERE token = ?")->execute([$token]);
                }
                respond(200, true, 'Sesión cerrada');
                break;

            default:
                respond(404, false, 'Endpoint no encontrado');
        }
        break;

    // ── CATEGORÍAS ────────────────────────────────────────────────────────────
    case 'categories':
        if ($method === 'GET') {
            // Si existe la tabla categories, usar esa; si no, derivar de productos
            try {
                $stmt = $pdo->query(
                    "SELECT id, name, label, icon, img_url, sort_order
                     FROM categories WHERE active = 1 ORDER BY sort_order, name"
                );
                $cats = $stmt->fetchAll();
            } catch (PDOException $e) {
                // Tabla no existe todavía: derivar de productos activos
                $stmt = $pdo->query(
                    "SELECT DISTINCT category AS name FROM products WHERE active = 1 ORDER BY category"
                );
                $cats = array_map(fn($r) => [
                    'id'         => null,
                    'name'       => $r['name'],
                    'label'      => ucfirst(strtolower($r['name'])),
                    'icon'       => 'grid-outline',
                    'img_url'    => null,
                    'sort_order' => 0,
                ], $stmt->fetchAll());
            }
            respond(200, true, 'OK', $cats);
        }
        respond(405, false, 'Método no permitido');
        break;

    // ── PROMOCIONES / BANNERS ──────────────────────────────────────────────────
    case 'promos':
        if ($method === 'GET') {
            $pos  = $_GET['position'] ?? null;
            $sql  = "SELECT * FROM promos WHERE active = 1";
            $params = [];
            if ($pos) {
                $sql .= " AND (position = ? OR position = 'both')";
                $params[] = $pos;
            }
            $sql .= " ORDER BY sort_order ASC, id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            respond(200, true, 'OK', $stmt->fetchAll());
        }
        respond(405, false, 'Método no permitido');
        break;

    // ── PEDIDOS ────────────────────────────────────────────────────────────────
    case 'orders':
        $userId = requireAuth($pdo);

        if ($method === 'GET') {
            $stmt = $pdo->prepare(
                "SELECT o.*,
                 (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items_count
                 FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 50"
            );
            $stmt->execute([$userId]);
            $orders = $stmt->fetchAll();

            foreach ($orders as &$order) {
                $items = $pdo->prepare(
                    "SELECT * FROM order_items WHERE order_id = ?"
                );
                $items->execute([$order['id']]);
                $order['items'] = $items->fetchAll();
            }

            respond(200, true, 'OK', $orders);
        }

        if ($method === 'POST') {
            $items          = $body['items'] ?? [];
            $address        = trim($body['address'] ?? '');
            $notes          = trim($body['notes'] ?? '');
            $paymentMethod  = trim($body['payment_method'] ?? '');
            $paymentStatus  = in_array($body['payment_status'] ?? '', ['pending','paid','failed'])
                               ? $body['payment_status'] : 'pending';
            $customerName   = trim($body['customer_name'] ?? '');
            $customerEmail  = trim($body['customer_email'] ?? '');
            $destLat        = $body['dest_lat'] ?? null;
            $destLng        = $body['dest_lng'] ?? null;
            $storeId        = isset($body['store_id']) ? (int)$body['store_id'] : null;

            if (empty($items)) respond(400, false, 'El carrito está vacío');

            // Calcular totales desde los items (aceptar tanto 'price' como 'price_numeric')
            $subtotal = 0;
            foreach ($items as $item) {
                $price     = (float)($item['price_numeric'] ?? $item['price'] ?? 0);
                $subtotal += $price * (int)($item['qty'] ?? 1);
            }
            // Si el cliente envió total calculado y es mayor a 0, usarlo como respaldo
            if ($subtotal == 0 && isset($body['total']) && (float)$body['total'] > 0) {
                $total    = (float)$body['total'];
                $shipping = (float)($body['shipping'] ?? 49);
            } else {
                $shipping = $subtotal >= 500 ? 0 : 49;
                $total    = $subtotal + $shipping;
            }

            $pdo->beginTransaction();
            try {
                $pdo->prepare(
                    "INSERT INTO orders
                     (user_id, total, shipping, address, dest_lat, dest_lng, notes,
                      payment_method, payment_status, customer_name, customer_email, store_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                )->execute([
                    $userId, $total, $shipping, $address, $destLat, $destLng, $notes,
                    $paymentMethod ?: null,
                    $paymentStatus,
                    $customerName ?: null,
                    $customerEmail ?: null,
                    $storeId ?: null,
                ]);
                $orderId = $pdo->lastInsertId();
                $insItem = $pdo->prepare(
                    "INSERT INTO order_items (order_id, product_id, product_name, price, qty) VALUES (?,?,?,?,?)"
                );
                foreach ($items as $item) {
                    $price = (float)($item['price_numeric'] ?? $item['price'] ?? 0);
                    $insItem->execute([
                        $orderId,
                        (int)($item['product_id'] ?? $item['id'] ?? 0),
                        $item['product_name'] ?? $item['name'] ?? '',
                        $price,
                        (int)($item['qty'] ?? 1),
                    ]);
                }

                $pdo->commit();
                respond(201, true, 'Pedido creado', ['order_id' => $orderId, 'id' => $orderId]);
            } catch (Exception $e) {
                $pdo->rollBack();
                respond(500, false, 'Error al crear el pedido: ' . $e->getMessage());
            }
        }

        respond(405, false, 'Método no permitido');
        break;

    // ── SUCURSALES ────────────────────────────────────────────────────────────
    case 'stores':
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query(
                    "SELECT id, name, city, address, lat, lng
                     FROM stores WHERE active = 1 ORDER BY sort_order ASC, name ASC"
                );
                respond(200, true, 'OK', $stmt->fetchAll());
            } catch (PDOException $e) {
                respond(500, false, 'Error al obtener sucursales');
            }
        }
        respond(405, false, 'Método no permitido');
        break;

    // ── DELIVERY (repartidor) ─────────────────────────────────────────────────
    case 'delivery':
        $deliveryUserId = requireAuth($pdo);

        // Verificar que el usuario sea repartidor o admin
        $roleRow = $pdo->prepare("SELECT COALESCE(role,'customer') AS role FROM users WHERE id=?");
        $roleRow->execute([$deliveryUserId]);
        $roleCheck = $roleRow->fetch();
        if (!$roleCheck || !in_array($roleCheck['role'], ['delivery','admin'])) {
            respond(403, false, 'Acceso denegado');
        }

        // GET /delivery/available — pedidos disponibles para tomar (sin repartidor asignado)
        if ($method === 'GET' && $action === 'available') {
            try {
                // Obtener store_id del repartidor actual
                $driverStmt = $pdo->prepare("SELECT store_id FROM users WHERE id = ?");
                $driverStmt->execute([$userId]);
                $driverRow = $driverStmt->fetch();
                $driverStoreId = $driverRow ? $driverRow['store_id'] : null;

                // Si tiene sucursal asignada, solo ver pedidos de esa sucursal
                if ($driverStoreId) {
                    $stmt = $pdo->prepare(
                        "SELECT o.*, u.name AS customer_name, u.email AS customer_email,
                                s.name AS store_name
                         FROM orders o
                         LEFT JOIN users u ON u.id = o.user_id
                         LEFT JOIN stores s ON s.id = o.store_id
                         WHERE o.delivery_user_id IS NULL
                           AND o.status = 'pending'
                           AND o.store_id = ?
                         ORDER BY o.created_at DESC LIMIT 50"
                    );
                    $stmt->execute([$driverStoreId]);
                } else {
                    $stmt = $pdo->query(
                        "SELECT o.*, u.name AS customer_name, u.email AS customer_email,
                                s.name AS store_name
                         FROM orders o
                         LEFT JOIN users u ON u.id = o.user_id
                         LEFT JOIN stores s ON s.id = o.store_id
                         WHERE o.delivery_user_id IS NULL
                           AND o.status = 'pending'
                         ORDER BY o.created_at DESC LIMIT 50"
                    );
                }
                $orders = $stmt->fetchAll();
                foreach ($orders as &$order) {
                    $items = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
                    $items->execute([$order['id']]);
                    $order['items'] = $items->fetchAll();
                }
                respond(200, true, 'OK', $orders);
            } catch (PDOException $e) {
                respond(500, false, 'Error al obtener pedidos');
            }
        }

        // GET /delivery/my-orders — pedidos asignados al repartidor actual (activos)
        if ($method === 'GET' && $action === 'my-orders') {
            try {
                $stmt = $pdo->prepare(
                    "SELECT o.*, u.name AS customer_name, u.email AS customer_email,
                            s.name AS store_name
                     FROM orders o
                     LEFT JOIN users u ON u.id = o.user_id
                     LEFT JOIN stores s ON s.id = o.store_id
                     WHERE o.delivery_user_id = ?
                       AND o.status IN ('accepted','preparing','picked_up','on_the_way')
                     ORDER BY o.created_at DESC"
                );
                $stmt->execute([$deliveryUserId]);
                $orders = $stmt->fetchAll();
                foreach ($orders as &$order) {
                    $items = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
                    $items->execute([$order['id']]);
                    $order['items'] = $items->fetchAll();
                }
                respond(200, true, 'OK', $orders);
            } catch (PDOException $e) {
                respond(500, false, 'Error al obtener tus pedidos');
            }
        }

        // GET /delivery/history — pedidos terminados por el repartidor
        if ($method === 'GET' && $action === 'history') {
            try {
                $stmt = $pdo->prepare(
                    "SELECT o.*, u.name AS customer_name, u.email AS customer_email
                     FROM orders o
                     LEFT JOIN users u ON u.id = o.user_id
                     WHERE o.delivery_user_id = ? 
                       AND o.status IN ('delivered','cancelled')
                     ORDER BY o.updated_at DESC LIMIT 50"
                );
                $stmt->execute([$deliveryUserId]);
                $orders = $stmt->fetchAll();
                respond(200, true, 'OK', $orders);
            } catch (PDOException $e) {
                respond(500, false, 'Error al obtener historial');
            }
        }

        // POST /delivery/location — actualizar mi ubicación actual para el rastreo
        if ($method === 'POST' && $action === 'location') {
            $lat = $body['lat'] ?? null;
            $lng = $body['lng'] ?? null;
            if (!$lat || !$lng) respond(400, false, 'Coordenadas requeridas');

            try {
                // Actualizar ubicación en todos los pedidos activos del repartidor
                $stmt = $pdo->prepare(
                    "UPDATE orders SET delivery_lat = ?, delivery_lng = ?, updated_at = NOW() 
                     WHERE delivery_user_id = ? 
                       AND status IN ('accepted','preparing','picked_up','on_the_way')"
                );
                $stmt->execute([$lat, $lng, $deliveryUserId]);
                respond(200, true, 'Ubicación actualizada');
            } catch (PDOException $e) {
                respond(500, false, 'Error al actualizar ubicación');
            }
        }

        // POST /delivery/orders/{id}/accept — aceptar pedido
        if ($method === 'POST' && $segments[1] === 'orders') {
            $orderId = (int)($segments[2] ?? 0); // delivery/orders/{id}/accept
            if (!$orderId) respond(400, false, 'ID de pedido requerido');

            try {
                // Solo si el pedido no tiene repartidor y está pendiente
                $stmt = $pdo->prepare(
                    "UPDATE orders SET status='accepted', delivery_user_id=?, updated_at=NOW() 
                     WHERE id=? AND delivery_user_id IS NULL AND status='pending'"
                );
                $stmt->execute([$deliveryUserId, $orderId]);
                if ($stmt->rowCount() === 0) respond(400, false, 'El pedido ya no está disponible');
                respond(200, true, 'Pedido aceptado');
            } catch (PDOException $e) {
                respond(500, false, 'Error al aceptar pedido');
            }
        }

        // PUT /delivery/orders/{id}/status — actualizar estado
        if ($method === 'PUT' && $segments[1] === 'orders') {
            $orderId = (int)($segments[2] ?? 0);
            $status  = $body['status'] ?? '';
            $allowed = ['preparing','picked_up','on_the_way','delivered','cancelled'];
            if (!$orderId || !in_array($status, $allowed)) {
                respond(400, false, 'ID o estado inválido');
            }
            try {
                $pdo->prepare(
                    "UPDATE orders SET status=?, updated_at=NOW() WHERE id=? AND delivery_user_id=?"
                )->execute([$status, $orderId, $deliveryUserId]);
                respond(200, true, 'Estado actualizado');
            } catch (PDOException $e) {
                respond(500, false, 'Error al actualizar estado');
            }
        }

        respond(405, false, 'Método no permitido');
        break;

    // ── RASTREO (público para el cliente dueño del pedido) ───────────────────
    case 'tracking':
        $userId = requireAuth($pdo);
        $orderId = (int)$action;
        if (!$orderId) respond(400, false, 'ID de pedido requerido');

        $stmt = $pdo->prepare(
            "SELECT o.id, o.status, o.delivery_lat, o.delivery_lng, o.dest_lat, o.dest_lng,
                    COALESCE(s.lat, ns.lat) as store_lat,
                    COALESCE(s.lng, ns.lng) as store_lng,
                    COALESCE(s.name, ns.name) as store_name,
                    d.name AS driver_name,
                    d.photo_url AS driver_photo
             FROM orders o
             LEFT JOIN stores s ON s.id = o.store_id
             LEFT JOIN stores ns ON ns.id = (
               SELECT id FROM stores WHERE active = 1
               ORDER BY (
                 POW(lat - COALESCE(o.dest_lat, 19.7044), 2) +
                 POW(lng - COALESCE(o.dest_lng, -101.2262), 2)
               ) ASC LIMIT 1
             )
             LEFT JOIN users d ON d.id = o.delivery_user_id
             WHERE o.id = ? AND o.user_id = ?"
        );
        $stmt->execute([$orderId, $userId]);
        $order = $stmt->fetch();
        if (!$order) respond(404, false, 'Pedido no encontrado');

        respond(200, true, 'OK', $order);
        break;

        respond(405, false, 'Método no permitido');
        break;

    // ── ADMIN ──────────────────────────────────────────────────────────────────
    case 'admin':
        $userId = requireAuth($pdo);
        // Verificar que sea admin
        $roleCheck = $pdo->prepare("SELECT COALESCE(role,'customer') AS role FROM users WHERE id=?");
        $roleCheck->execute([$userId]);
        $roleRow = $roleCheck->fetch();
        if (!$roleRow || $roleRow['role'] !== 'admin') {
            respond(403, false, 'Acceso restringido a administradores');
        }

        // GET /admin/users — lista todos los usuarios
        if ($method === 'GET' && $action === 'users') {
            $stmt = $pdo->query(
                "SELECT u.id, u.name, u.email, u.photo_url, u.active,
                        COALESCE(u.role,'customer') AS role,
                        u.store_id, s.name AS store_name,
                        u.created_at
                 FROM users u
                 LEFT JOIN stores s ON s.id = u.store_id
                 ORDER BY u.created_at DESC"
            );
            respond(200, true, 'OK', $stmt->fetchAll());
        }

        // GET /admin/stores — lista todas las sucursales activas
        if ($method === 'GET' && $action === 'stores') {
            $stmt = $pdo->query("SELECT id, name, address FROM stores WHERE active=1 ORDER BY name");
            respond(200, true, 'OK', $stmt->fetchAll());
        }

        // PUT /admin/users/{id} — actualizar role y/o store_id
        if ($method === 'PUT' && is_numeric($action)) {
            $targetId = (int)$action;
            $role     = $body['role'] ?? null;
            $storeId  = array_key_exists('store_id', $body) ? ($body['store_id'] ? (int)$body['store_id'] : null) : false;

            $allowed = ['customer','delivery','admin'];
            if ($role && !in_array($role, $allowed)) respond(400, false, 'Rol inválido');

            $sets = [];
            $params = [];
            if ($role) { $sets[] = 'role=?'; $params[] = $role; }
            if ($storeId !== false) { $sets[] = 'store_id=?'; $params[] = $storeId; }

            if (empty($sets)) respond(400, false, 'Nada que actualizar');

            $params[] = $targetId;
            $pdo->prepare("UPDATE users SET ".implode(',',$sets)." WHERE id=?")->execute($params);
            respond(200, true, 'Usuario actualizado');
        }

        respond(404, false, 'Endpoint admin no encontrado');
        break;

    default:
        respond(404, false, 'Recurso no encontrado');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function respond(int $code, bool $success, string $message, $data = null): void
{
    http_response_code($code);
    $out = ['success' => $success, 'message' => $message];
    if ($data !== null) $out['data'] = $data;
    echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function createSession(PDO $pdo, int $userId): string
{
    $token   = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+' . SESSION_DAYS . ' days'));

    // Limpiar sesiones expiradas del usuario
    $pdo->prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < NOW()")->execute([$userId]);

    $pdo->prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)")
        ->execute([$userId, $token, $expires]);

    return $token;
}

function getUserById(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        "SELECT u.id, u.name, u.email, u.photo_url, u.google_id, u.email_verified, u.created_at,
                COALESCE(u.role, 'customer') AS role,
                u.store_id,
                s.name AS store_name,
                s.address AS store_address
         FROM users u
         LEFT JOIN stores s ON s.id = u.store_id
         WHERE u.id = ?"
    );
    $stmt->execute([$userId]);
    return $stmt->fetch() ?: [];
}

function getBearerToken(): ?string
{
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) return $m[1];
    return null;
}

function requireAuth(PDO $pdo): int
{
    $token = getBearerToken();
    if (!$token) respond(401, false, 'Autenticación requerida');

    $stmt = $pdo->prepare(
        "SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()"
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row) respond(401, false, 'Sesión expirada o inválida');
    return (int)$row['user_id'];
}
