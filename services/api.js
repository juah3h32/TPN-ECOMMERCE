// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE LA API
// Cambia API_BASE_URL al dominio de tu Hostinger donde subiste api/index.php
// Ejemplo: "https://tudominio.com/api" o "https://tudominio.com/tpn-api"
// ─────────────────────────────────────────────────────────────────────────────
// URL base de la API (sin index.php, el .htaccess lo enruta)
// Si el .htaccess no funciona en tu hosting, cambia a:
//   "https://todopalnegocio.com.mx/api/index.php"
export const API_BASE_URL = "https://todopalnegocio.com.mx/api/index.php";

// Token de Mapbox — gratis en mapbox.com (100k requests/mes gratis)
// Para obtenerlo: https://account.mapbox.com → Create a token
export const MAPBOX_TOKEN = "PONER_TU_TOKEN_AQUI";

const DEFAULT_TIMEOUT = 30000; // 30 segundos

async function apiFetch(endpoint, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const sep = endpoint.startsWith("?") ? "" : "/";
  const url = `${API_BASE_URL}${sep}${endpoint}`;

  // Solo enviar Content-Type en requests con body (POST, PUT, PATCH)
  const hasBody =
    options.method && !["GET", "HEAD"].includes(options.method.toUpperCase());
  const defaultHeaders = hasBody ? { "Content-Type": "application/json" } : {};

  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok && res.status !== 201) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        message: data.message || `Error HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return data;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError")
      throw new Error("Tiempo de espera agotado (30s)");
    throw e;
  }
}

// ─── PRODUCTOS ───────────────────────────────────────────────────────────────
export async function getProduct(id) {
  return apiFetch(`products/${id}`);
}

export async function getProducts(categoryFilter = null) {
  const query = categoryFilter
    ? `?category=${encodeURIComponent(categoryFilter)}`
    : "";
  return apiFetch(`products${query}`);
}

// ─── AUTENTICACIÓN EMAIL/CONTRASEÑA ──────────────────────────────────────────
export async function loginWithEmail(email, password) {
  return apiFetch("auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(name, email, password) {
  return apiFetch("auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

// ─── GOOGLE LOGIN ─────────────────────────────────────────────────────────────
export async function loginWithGoogle({ googleId, name, email, photo }) {
  return apiFetch("auth/google", {
    method: "POST",
    body: JSON.stringify({ google_id: googleId, name, email, photo }),
  });
}

// ─── PERFIL ACTUALIZADO ───────────────────────────────────────────────────────
export async function getMyProfile(token) {
  return apiFetch("auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── RECUPERAR CONTRASEÑA ─────────────────────────────────────────────────────
export async function forgotPassword(email) {
  return apiFetch("auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, newPassword) {
  return apiFetch("auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password: newPassword }),
  });
}

// ─── CATEGORÍAS ──────────────────────────────────────────────────────────────
export async function getCategories() {
  return apiFetch("categories");
}

// ─── PROMOCIONES / BANNERS ───────────────────────────────────────────────────
export async function getPromos(position = null) {
  const query = position ? `?position=${encodeURIComponent(position)}` : "";
  return apiFetch(`promos${query}`);
}

// ─── PEDIDOS ──────────────────────────────────────────────────────────────────
export async function getUserOrders(token) {
  return apiFetch("orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createOrder(orderData, token) {
  return apiFetch("orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(orderData),
  });
}

// ─── SUCURSALES ───────────────────────────────────────────────────────────────
export async function getStores() {
  return apiFetch("stores");
}

// ─── ENTREGA / REPARTIDOR ─────────────────────────────────────────────────────
export async function getAvailableOrders(token) {
  return apiFetch("delivery/available", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMyDeliveryOrders(token) {
  return apiFetch("delivery/my-orders", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getDeliveryHistory(token) {
  return apiFetch("delivery/history", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateDeliveryLocation(lat, lng, token) {
  return apiFetch("delivery/location", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ lat, lng }),
  });
}

export async function acceptDeliveryOrder(orderId, token) {
  return apiFetch(`delivery/orders/${orderId}/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateDeliveryStatus(orderId, status, token) {
  return apiFetch(`delivery/orders/${orderId}/status`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
export async function adminGetUsers(token) {
  return apiFetch("admin/users", { headers: { Authorization: `Bearer ${token}` } });
}

export async function adminGetStores(token) {
  return apiFetch("admin/stores", { headers: { Authorization: `Bearer ${token}` } });
}

export async function adminUpdateUser(userId, data, token) {
  return apiFetch(`admin/users/${userId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function getOrderTracking(orderId, token) {
  return apiFetch(`tracking/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
