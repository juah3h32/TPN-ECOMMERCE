import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import MobileMenu from "./components/MobileMenu";
import ProductDetailModal from "./components/ProductDetailModal";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider, useCart } from "./context/CartContext";
import { LocationProvider, useLocation } from "./context/LocationContext";
import { WishlistProvider, useWishlist } from "./context/WishlistContext";
import { getProducts, getUserOrders } from "./services/api";
import CartScreen from "./screens/CartScreen";
import CheckoutScreen from "./screens/CheckoutScreen";
import AdminScreen from "./screens/AdminScreen";
import DeliveryScreen from "./screens/DeliveryScreen";
import { DesktopNav, MobileHeader } from "./screens/HomeScreen";
import HomeScreen from "./screens/HomeScreen";
import OrdersScreen from "./screens/OrdersScreen";
import ProfileScreen, { MisDatos, MisDirecciones, MetodosPago, ListaDeseos } from "./screens/ProfileScreen";
import StoreScreen from "./screens/StoreScreen";

const RED = "#e6192e";

// ─── CART DRAWER ──────────────────────────────────────────────────────────────
function CartDrawer({ onClose, onCheckout }) {
  const { width } = useWindowDimensions();
  const { items, removeFromCart, updateQty, clearCart, count } = useCart();
  const { deliveryAddress, setDeliveryAddress } = useLocation();

  const drawerWidth = Math.min(400, width * 0.9);

  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(String(item.price).replace(/[^0-9.]/g, "")) || 0;
    return sum + price * (item.qty || 1);
  }, 0);
  const shipping = subtotal > 500 ? 0 : 49;
  const total = subtotal + shipping;

  const isWeb = Platform.OS === "web";

  const backdropStyle = isWeb
    ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }
    : { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 };

  return (
    <View style={[styles.drawerBackdrop, backdropStyle]}>
      {/* Backdrop: tapping closes drawer */}
      <TouchableOpacity
        style={styles.drawerOverlay}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Drawer Panel */}
      <View style={[styles.drawerPanel, { width: drawerWidth }]}>
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.drawerHeaderLeft}>
            <Ionicons name="cart-sharp" size={22} color={RED} />
            <Text style={styles.drawerTitle}>MI CARRITO</Text>
            {count > 0 && (
              <View style={styles.drawerCountBadge}>
                <Text style={styles.drawerCountText}>{count}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.drawerCloseBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Delivery Address */}
        <View style={styles.drawerAddressRow}>
          <Ionicons name="location-sharp" size={16} color={RED} style={{ marginRight: 6 }} />
          <TextInput
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Dirección de entrega..."
            placeholderTextColor="#aaa"
            style={styles.drawerAddressInput}
          />
        </View>

        {items.length === 0 ? (
          // Empty state
          <View style={styles.drawerEmpty}>
            <Ionicons name="cart-outline" size={64} color="#ddd" />
            <Text style={styles.drawerEmptyTitle}>Tu carrito está vacío</Text>
            <Text style={styles.drawerEmptySubtitle}>
              Agrega productos para comenzar tu pedido
            </Text>
          </View>
        ) : (
          <>
            {/* Items List */}
            <ScrollView
              style={styles.drawerItemsList}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item) => {
                const price =
                  parseFloat(String(item.price).replace(/[^0-9.]/g, "")) || 0;
                const qty = item.qty || 1;
                return (
                  <View key={item.id} style={styles.drawerItem}>
                    <Image
                      source={{ uri: item.img }}
                      style={styles.drawerItemImg}
                      resizeMode="contain"
                    />
                    <View style={styles.drawerItemInfo}>
                      {item.cat ? (
                        <Text style={styles.drawerItemCat}>{item.cat}</Text>
                      ) : null}
                      <Text style={styles.drawerItemName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.drawerItemPrice}>
                        ${(price * qty).toFixed(2)}
                      </Text>
                      <View style={styles.drawerQtyRow}>
                        <TouchableOpacity
                          style={styles.drawerQtyBtn}
                          onPress={() =>
                            qty > 1
                              ? updateQty(item.id, qty - 1)
                              : removeFromCart(item.id)
                          }
                        >
                          <Text style={styles.drawerQtyBtnText}>
                            {qty === 1 ? "🗑" : "−"}
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.drawerQtyNum}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.drawerQtyBtn}
                          onPress={() => updateQty(item.id, qty + 1)}
                        >
                          <Text style={styles.drawerQtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.drawerDeleteBtn}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ccc" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <View style={styles.drawerFooter}>
              <View style={styles.drawerSummaryRow}>
                <Text style={styles.drawerSummaryLabel}>Subtotal</Text>
                <Text style={styles.drawerSummaryValue}>
                  ${subtotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.drawerSummaryRow}>
                <Text style={styles.drawerSummaryLabel}>Envío</Text>
                <Text
                  style={[
                    styles.drawerSummaryValue,
                    shipping === 0 && { color: "#2da44e", fontWeight: "700" },
                  ]}
                >
                  {shipping === 0 ? "GRATIS" : `$${shipping.toFixed(2)}`}
                </Text>
              </View>
              {shipping === 0 && (
                <Text style={styles.drawerFreeShippingNote}>
                  ¡Envío gratis en pedidos mayores a $500!
                </Text>
              )}
              <View style={[styles.drawerSummaryRow, styles.drawerTotalRow]}>
                <Text style={styles.drawerTotalLabel}>TOTAL</Text>
                <Text style={styles.drawerTotalValue}>${total.toFixed(2)}</Text>
              </View>

              <TouchableOpacity style={styles.drawerCheckoutBtn} activeOpacity={0.85} onPress={() => { onClose(); onCheckout?.(); }}>
                <Ionicons name="lock-closed" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.drawerCheckoutText}>PROCEDER AL PAGO</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerClearBtn}
                onPress={clearCart}
              >
                <Text style={styles.drawerClearText}>Vaciar carrito</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── SETTINGS DRAWER ─────────────────────────────────────────────────────────
const SETTINGS_SECTIONS = [
  {
    title: "MI CUENTA",
    items: [
      { key: "datos",       icon: "person-circle-outline", label: "Mis datos" },
      { key: "direcciones", icon: "location-outline",      label: "Mis direcciones" },
      { key: "pagos",       icon: "card-outline",          label: "Métodos de pago" },
    ],
  },
  {
    title: "PEDIDOS",
    items: [
      { key: "orders", icon: "receipt-outline", label: "Historial de pedidos" },
      { key: "deseos", icon: "heart-outline",   label: "Lista de deseos" },
    ],
  },
  {
    title: "PREFERENCIAS",
    items: [
      { key: null, icon: "notifications-outline", label: "Notificaciones" },
      { key: null, icon: "moon-outline",           label: "Modo oscuro" },
    ],
  },
  {
    title: "SOPORTE",
    items: [
      { key: null, icon: "chatbubble-ellipses-outline", label: "Chat de soporte" },
      { key: null, icon: "help-circle-outline",         label: "Preguntas frecuentes" },
      { key: null, icon: "document-text-outline",       label: "Términos y condiciones" },
      { key: null, icon: "shield-checkmark-outline",    label: "Aviso de privacidad" },
    ],
  },
];

function SettingsDrawer({ onClose, onOrdersPress }) {
  const { width } = useWindowDimensions();
  const { user, signOut } = useAuth();
  const { wishlist } = useWishlist();
  const drawerWidth = Math.min(440, width * 0.9);
  const [currentSection, setCurrentSection] = useState(null);

  const handleSignOut = () => { signOut(); onClose(); };

  const isWeb = Platform.OS === "web";
  const backdropStyle = isWeb
    ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }
    : { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 };

  // ── Sub-screen panel ──────────────────────────────────────────────────────
  const SUB_TITLES = { datos: "MIS DATOS", direcciones: "MIS DIRECCIONES", pagos: "MÉTODOS DE PAGO", deseos: "LISTA DE DESEOS" };

  const renderSubScreen = () => {
    if (currentSection === "datos")        return <MisDatos user={user} onBack={() => setCurrentSection(null)} isDesktop />;
    if (currentSection === "direcciones")  return <MisDirecciones userId={user?.id} onBack={() => setCurrentSection(null)} isDesktop />;
    if (currentSection === "pagos")        return <MetodosPago userId={user?.id} onBack={() => setCurrentSection(null)} isDesktop />;
    if (currentSection === "deseos")       return <ListaDeseos onBack={() => setCurrentSection(null)} isDesktop />;
    return null;
  };

  return (
    <View style={[settingsStyles.backdrop, backdropStyle]}>
      <TouchableOpacity style={settingsStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[settingsStyles.panel, { width: drawerWidth }]}>
        {/* Header */}
        <View style={settingsStyles.header}>
          <View style={settingsStyles.headerLeft}>
            {currentSection ? (
              <TouchableOpacity onPress={() => setCurrentSection(null)} style={{ marginRight: 4 }}>
                <Ionicons name="arrow-back" size={20} color="#333" />
              </TouchableOpacity>
            ) : (
              <Ionicons name="settings-sharp" size={20} color={RED} />
            )}
            <Text style={settingsStyles.headerTitle}>
              {currentSection ? SUB_TITLES[currentSection] : "CONFIGURACIÓN"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={settingsStyles.closeBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Sub-screen content */}
        {currentSection ? (
          <View style={{ flex: 1 }}>
            {renderSubScreen()}
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Profile card */}
            {user && (
              <View style={settingsStyles.profileCard}>
                {user.photo ? (
                  <Image source={{ uri: user.photo }} style={settingsStyles.avatar} />
                ) : (
                  <View style={[settingsStyles.avatar, { backgroundColor: RED, justifyContent: "center", alignItems: "center" }]}>
                    <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>
                      {(user.name || "U")[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={settingsStyles.profileName}>{(user.name || "USUARIO").toUpperCase()}</Text>
                  <Text style={settingsStyles.profileEmail}>{user.email}</Text>
                </View>
              </View>
            )}

            {/* Stats */}
            <View style={settingsStyles.statsRow}>
              {[["0", "Pedidos"], [String(wishlist?.length ?? 0), "Favoritos"], ["$0", "Ahorrado"]].map(([num, label], i, arr) => (
                <View key={label} style={{ flex: 1, flexDirection: "row" }}>
                  <View style={settingsStyles.statItem}>
                    <Text style={settingsStyles.statNum}>{num}</Text>
                    <Text style={settingsStyles.statLabel}>{label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={settingsStyles.statDivider} />}
                </View>
              ))}
            </View>

            {/* Menu sections */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {SETTINGS_SECTIONS.map((section, si) => (
                <View key={si} style={{ marginBottom: 20 }}>
                  <Text style={settingsStyles.sectionTitle}>{section.title}</Text>
                  <View style={settingsStyles.sectionCard}>
                    {section.items.map((item, ii) => (
                      <View key={ii}>
                        <TouchableOpacity
                          style={settingsStyles.menuItem}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (item.key === "orders") { onClose(); onOrdersPress?.(); }
                            else if (item.key) setCurrentSection(item.key);
                          }}
                        >
                          <View style={settingsStyles.menuIcon}>
                            <Ionicons name={item.icon} size={19} color={RED} />
                          </View>
                          <Text style={settingsStyles.menuLabel}>{item.label}</Text>
                          {item.key && <Ionicons name="chevron-forward" size={15} color="#ddd" />}
                        </TouchableOpacity>
                        {ii < section.items.length - 1 && (
                          <View style={settingsStyles.menuDivider} />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              {/* Sign out */}
              <TouchableOpacity style={settingsStyles.logoutBtn} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={18} color={RED} />
                <Text style={settingsStyles.logoutText}>Cerrar sesión</Text>
              </TouchableOpacity>

              <Text style={settingsStyles.version}>Todo Pal Negocio v1.0.0</Text>
              <View style={{ height: 32 }} />
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const settingsStyles = StyleSheet.create({
  backdrop: { flexDirection: "row", justifyContent: "flex-end" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  panel: {
    backgroundColor: "#fff",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#1a1a1a", letterSpacing: 1 },
  closeBtn: { padding: 4 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#fafafa",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  profileName: { fontSize: 14, fontWeight: "900", color: "#111", marginBottom: 2 },
  profileEmail: { fontSize: 12, color: "#888", marginBottom: 5 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#d97706" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "900", color: "#111", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#999", fontWeight: "600" },
  statDivider: { width: 1, height: 32, backgroundColor: "#f0f0f0" },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#bbb",
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#fff5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#222" },
  menuDivider: { height: 1, backgroundColor: "#f8f8f8", marginLeft: 60 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 4,
  },
  logoutText: { fontSize: 14, fontWeight: "700", color: RED },
  version: { fontSize: 11, color: "#ccc", textAlign: "center" },
});

// ─── ORDERS DRAWER ────────────────────────────────────────────────────────────
const ORDER_STATUS = {
  pending:    { label: "Pendiente",  bg: "#fffbeb", color: "#f59e0b", icon: "time"             },
  processing: { label: "Preparando", bg: "#fffbeb", color: "#f59e0b", icon: "time"             },
  shipped:    { label: "En camino",  bg: "#eff6ff", color: "#3b82f6", icon: "bicycle"          },
  delivered:  { label: "Entregado",  bg: "#f0fdf4", color: "#22c55e", icon: "checkmark-circle" },
  cancelled:  { label: "Cancelado",  bg: "#fff1f2", color: RED,       icon: "close-circle"     },
};

function formatOrderDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function OrdersDrawer({ onClose }) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const drawerWidth = Math.min(440, width * 0.9);
  const isWeb = Platform.OS === "web";
  const backdropStyle = isWeb
    ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }
    : { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 };

  useEffect(() => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    getUserOrders(user.token)
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setOrders(res.data);
        else setError(res?.message || "No se pudieron cargar los pedidos");
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [user?.token]);

  return (
    <View style={[odStyles.backdrop, backdropStyle]}>
      <TouchableOpacity style={odStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[odStyles.panel, { width: drawerWidth }]}>

        {/* Header */}
        <View style={odStyles.header}>
          <View style={odStyles.headerLeft}>
            <Ionicons name="receipt-sharp" size={20} color={RED} />
            <Text style={odStyles.headerTitle}>MIS PEDIDOS</Text>
            {orders.length > 0 && (
              <View style={odStyles.countBadge}>
                <Text style={odStyles.countText}>{orders.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={odStyles.closeBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Body */}
        {!user ? (
          <View style={odStyles.empty}>
            <Ionicons name="person-outline" size={48} color="#ddd" />
            <Text style={odStyles.emptyTitle}>Inicia sesión</Text>
            <Text style={odStyles.emptySub}>Para ver tus pedidos necesitas una cuenta</Text>
          </View>
        ) : loading ? (
          <View style={odStyles.empty}>
            <ActivityIndicator size="large" color={RED} />
            <Text style={[odStyles.emptySub, { marginTop: 16 }]}>Cargando pedidos...</Text>
          </View>
        ) : error ? (
          <View style={odStyles.empty}>
            <Ionicons name="wifi-outline" size={48} color="#ddd" />
            <Text style={odStyles.emptyTitle}>Sin conexión</Text>
            <Text style={odStyles.emptySub}>{error}</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={odStyles.empty}>
            <Ionicons name="receipt-outline" size={64} color="#ddd" />
            <Text style={odStyles.emptyTitle}>Sin pedidos aún</Text>
            <Text style={odStyles.emptySub}>Tus pedidos aparecerán aquí una vez que realices tu primera compra</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text style={odStyles.sectionLabel}>HISTORIAL ({orders.length})</Text>
            {orders.map((order) => {
              const s = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
              return (
                <View key={order.id} style={odStyles.card}>
                  <View style={odStyles.cardTop}>
                    <View>
                      <Text style={odStyles.orderId}>#{String(order.id).padStart(6, "0")}</Text>
                      <Text style={odStyles.orderDate}>{formatOrderDate(order.created_at)}</Text>
                    </View>
                    <View style={[odStyles.badge, { backgroundColor: s.bg }]}>
                      <Ionicons name={s.icon} size={11} color={s.color} />
                      <Text style={[odStyles.badgeText, { color: s.color }]}>{s.label}</Text>
                    </View>
                  </View>
                  <View style={odStyles.divider} />
                  <View style={odStyles.cardBot}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name="cube-outline" size={13} color="#aaa" />
                      <Text style={odStyles.metaText}>
                        {order.items_count ?? order.items?.length ?? 0} productos
                      </Text>
                    </View>
                    <Text style={odStyles.total}>${parseFloat(order.total || 0).toFixed(2)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const odStyles = StyleSheet.create({
  backdrop: { flexDirection: "row", justifyContent: "flex-end" },
  overlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  panel: {
    backgroundColor: "#f5f5f5",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 18,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#1a1a1a", letterSpacing: 1 },
  countBadge: {
    backgroundColor: RED, borderRadius: 10, minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  countText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  closeBtn: { padding: 4 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#333" },
  emptySub: { fontSize: 13, color: "#aaa", textAlign: "center", lineHeight: 19 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#bbb", letterSpacing: 0.5, marginBottom: 12 },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 14, fontWeight: "800", color: "#111" },
  orderDate: { fontSize: 11, color: "#aaa", marginTop: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f5f5f5", marginVertical: 10 },
  cardBot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metaText: { fontSize: 12, color: "#888" },
  total: { fontSize: 15, fontWeight: "900", color: "#111" },
});

// ─── COOKIE BANNER ────────────────────────────────────────────────────────────
const COOKIE_KEY = "@tpn_cookie_consent";

function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [prefs, setPrefs] = useState({
    essential:   true,   // siempre activas
    functional:  true,
    analytics:   false,
    marketing:   false,
  });
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(COOKIE_KEY).then((v) => {
      if (!v && mounted.current) setVisible(true);
    }).catch(() => {});
    return () => { mounted.current = false; };
  }, []);

  const accept = async (accepted) => {
    const consent = {
      essential: true,
      functional: accepted ? true  : prefs.functional,
      analytics:  accepted ? true  : prefs.analytics,
      marketing:  accepted ? false : prefs.marketing,
      date: new Date().toISOString(),
      version: "1.0",
    };
    await AsyncStorage.setItem(COOKIE_KEY, JSON.stringify(consent)).catch(() => {});
    setVisible(false);
    setDetailOpen(false);
  };

  const saveCustom = async () => {
    const consent = { ...prefs, essential: true, date: new Date().toISOString(), version: "1.0" };
    await AsyncStorage.setItem(COOKIE_KEY, JSON.stringify(consent)).catch(() => {});
    setVisible(false);
    setDetailOpen(false);
  };

  const isWeb = Platform.OS === "web";

  if (!visible) return null;

  const COOKIE_TYPES = [
    {
      key: "essential",
      title: "Esenciales",
      icon: "shield-checkmark-outline",
      desc: "Necesarias para el funcionamiento básico: sesión de usuario, carrito de compras y preferencias de ubicación. No pueden desactivarse.",
      always: true,
    },
    {
      key: "functional",
      title: "Funcionales",
      icon: "construct-outline",
      desc: "Guardan tu lista de deseos, direcciones guardadas, métodos de pago y otras preferencias personales entre sesiones.",
      always: false,
    },
    {
      key: "analytics",
      title: "Analíticas",
      icon: "bar-chart-outline",
      desc: "Nos ayudan a entender cómo usas la app para mejorar la experiencia: páginas visitadas, búsquedas y tiempo de uso.",
      always: false,
    },
    {
      key: "marketing",
      title: "Marketing",
      icon: "megaphone-outline",
      desc: "Permiten mostrarte ofertas y promociones personalizadas basadas en tus hábitos de compra.",
      always: false,
    },
  ];

  return (
    <>
      {/* ── Banner principal ────────────────────────────────────────────── */}
      <View style={ckStyles.banner} pointerEvents="box-none">
        <View style={ckStyles.bannerInner}>
          <View style={ckStyles.bannerLeft}>
            <View style={ckStyles.cookieIcon}>
              <Text style={{ fontSize: 22 }}>🍪</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ckStyles.bannerTitle}>Usamos cookies y almacenamiento local</Text>
              <Text style={ckStyles.bannerText}>
                Guardamos datos en tu dispositivo para mejorar tu experiencia: carrito, favoritos, sesión y preferencias. Puedes personalizar qué datos se guardan.
              </Text>
            </View>
          </View>
          <View style={ckStyles.bannerBtns}>
            <TouchableOpacity style={ckStyles.configBtn} onPress={() => setDetailOpen(true)}>
              <Text style={ckStyles.configBtnText}>Configurar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ckStyles.rejectBtn} onPress={() => accept(false)}>
              <Text style={ckStyles.rejectBtnText}>Solo esenciales</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ckStyles.acceptBtn} onPress={() => accept(true)}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={ckStyles.acceptBtnText}>Aceptar todo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Modal de configuración ──────────────────────────────────────── */}
      <Modal
        visible={detailOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailOpen(false)}
      >
        <View style={ckStyles.modalBackdrop}>
          <View style={ckStyles.modalPanel}>
            {/* Header */}
            <View style={ckStyles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 20 }}>🍪</Text>
                <Text style={ckStyles.modalTitle}>Centro de privacidad</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailOpen(false)} style={ckStyles.modalClose}>
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              <Text style={ckStyles.modalIntro}>
                Todo Pal Negocio utiliza almacenamiento local en tu dispositivo para ofrecerte la mejor experiencia. A continuación puedes decidir qué tipos de datos se guardan. Las cookies esenciales siempre están activas porque la app no puede funcionar sin ellas.
              </Text>

              {COOKIE_TYPES.map((type) => (
                <View key={type.key} style={ckStyles.typeCard}>
                  <View style={ckStyles.typeHeader}>
                    <View style={ckStyles.typeIconWrap}>
                      <Ionicons name={type.icon} size={20} color={RED} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={ckStyles.typeTitle}>{type.title}</Text>
                        {type.always && (
                          <View style={ckStyles.alwaysBadge}>
                            <Text style={ckStyles.alwaysBadgeText}>Siempre activas</Text>
                          </View>
                        )}
                      </View>
                      <Text style={ckStyles.typeDesc}>{type.desc}</Text>
                    </View>
                    <Switch
                      value={prefs[type.key]}
                      onValueChange={(v) => !type.always && setPrefs((p) => ({ ...p, [type.key]: v }))}
                      disabled={type.always}
                      trackColor={{ false: "#e5e7eb", true: "#fca5a5" }}
                      thumbColor={prefs[type.key] ? RED : "#f3f4f6"}
                      ios_backgroundColor="#e5e7eb"
                    />
                  </View>
                </View>
              ))}

              <Text style={ckStyles.legalNote}>
                Los datos se almacenan únicamente en tu dispositivo mediante AsyncStorage (almacenamiento local). No se comparten con terceros sin tu consentimiento. Puedes cambiar tus preferencias en cualquier momento desde Configuración → Privacidad.
              </Text>
            </ScrollView>

            {/* Footer */}
            <View style={ckStyles.modalFooter}>
              <TouchableOpacity style={ckStyles.rejectBtn} onPress={() => accept(false)}>
                <Text style={ckStyles.rejectBtnText}>Solo esenciales</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ckStyles.acceptBtn, { flex: 1 }]} onPress={saveCustom}>
                <Ionicons name="checkmark" size={14} color="#fff" />
                <Text style={ckStyles.acceptBtnText}>Guardar preferencias</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const ckStyles = StyleSheet.create({
  banner: {
    position: Platform.OS === "web" ? "fixed" : "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    paddingTop: 12,
    backgroundColor: "rgba(15,15,15,0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  bannerInner: {
    maxWidth: 1100,
    alignSelf: "center",
    width: "100%",
    flexDirection: Platform.OS === "web" ? "row" : "column",
    alignItems: Platform.OS === "web" ? "center" : "stretch",
    gap: 14,
  },
  bannerLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cookieIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  bannerTitle: { fontSize: 13, fontWeight: "800", color: "#fff", marginBottom: 3 },
  bannerText: { fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 17 },
  bannerBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  configBtn: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  configBtnText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.8)" },
  rejectBtn: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  rejectBtnText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  acceptBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 10, backgroundColor: RED,
  },
  acceptBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
    padding: 16,
  },
  modalPanel: {
    backgroundColor: "#fff", borderRadius: 20,
    width: "100%", maxWidth: 540,
    maxHeight: "90%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 24, elevation: 16,
    overflow: "hidden",
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 17, fontWeight: "900", color: "#111" },
  modalClose: { padding: 4 },
  modalIntro: { fontSize: 13, color: "#666", lineHeight: 20, marginBottom: 20 },
  typeCard: {
    backgroundColor: "#fafafa", borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#f0f0f0",
  },
  typeHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  typeIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: "#fff5f5",
    justifyContent: "center", alignItems: "center",
    marginTop: 2,
  },
  typeTitle: { fontSize: 14, fontWeight: "800", color: "#111", marginBottom: 3 },
  typeDesc: { fontSize: 12, color: "#777", lineHeight: 17, paddingRight: 8 },
  alwaysBadge: {
    backgroundColor: "#f0fdf4", paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, borderColor: "#bbf7d0",
  },
  alwaysBadgeText: { fontSize: 9, fontWeight: "800", color: "#16a34a" },
  legalNote: {
    fontSize: 11, color: "#aaa", lineHeight: 17,
    marginTop: 10, marginBottom: 8,
    paddingHorizontal: 4, textAlign: "center",
  },
  modalFooter: {
    flexDirection: "row", gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: "#f0f0f0",
    alignItems: "center",
  },
});

// ─── APP CONTENT ──────────────────────────────────────────────────────────────
function AppContent() {
  const [activeTab, setActiveTab] = useState(0);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [ordersDrawerOpen, setOrdersDrawerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [navProducts, setNavProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inCheckout, setInCheckout] = useState(false);
  const { width } = useWindowDimensions();
  const { count } = useCart();
  const { user } = useAuth();

  // Carga productos para la búsqueda del navbar global
  useEffect(() => {
    getProducts()
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setNavProducts(
            res.data.map((p) => ({
              id: p.id,
              cat: p.category,
              name: p.name,
              price: p.price_display || `$${parseFloat(p.price).toFixed(2)} / ${p.unit}`,
              price_numeric: parseFloat(p.price),
              img: p.image_url,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const isDesktop = width >= 1024;

  const nav = {
    onHomePress: () => setActiveTab(0),
    onStorePress: () => setActiveTab(1),
    onCartPress: isDesktop
      ? () => setCartDrawerOpen(true)
      : () => setActiveTab(4),
    onOrdersPress: isDesktop
      ? () => setOrdersDrawerOpen(true)
      : () => setActiveTab(2),
    onProfilePress: () => setActiveTab(3),
    onSettingsPress: () => setSettingsDrawerOpen(true),
  };

  // ── Admin: panel de administración ───────────────────────────────────────
  if (user?.role === "admin") {
    return <AdminScreen />;
  }

  // ── Repartidor: interfaz propia ──────────────────────────────────────────
  if (user?.role === "delivery") {
    return <DeliveryScreen />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 0:
        return <HomeScreen {...nav} />;
      case 1:
        return <StoreScreen {...nav} activeTab={activeTab} />;
      case 2:
        return <OrdersScreen {...nav} />;
      case 3:
        return <ProfileScreen onAuthSuccess={() => setActiveTab(0)} onOrdersPress={() => setActiveTab(2)} />;
      case 4:
        return <CartScreen onBack={() => setActiveTab(0)} onCheckout={() => setInCheckout(true)} />;
      default:
        return <HomeScreen {...nav} />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Navbar global — solo desktop */}
      {isDesktop && (
        <DesktopNav
          onHomePress={() => setActiveTab(0)}
          onStorePress={() => setActiveTab(1)}
          onOrdersPress={() => setOrdersDrawerOpen(true)}
          onCartPress={() => setCartDrawerOpen(true)}
          onProfilePress={() => setActiveTab(3)}
          onSettingsPress={() => setSettingsDrawerOpen(true)}
          products={navProducts}
          onProductSelect={(product) => setSelectedProduct(product)}
          activeTabIndex={activeTab}
        />
      )}

      {/* Header fijo móvil — aparece en todas las páginas excepto Pedidos (tab 2) y Carrito (tab 4) */}
      {!isDesktop && [0, 1, 3].includes(activeTab) && (
        <MobileHeader
          onCartPress={() => setActiveTab(4)}
          products={navProducts}
          onProductSelect={(product) => setSelectedProduct(product)}
        />
      )}

      {renderScreen()}

      {!isDesktop && (
        <MobileMenu
          active={activeTab}
          setActive={setActiveTab}
          isDesktop={isDesktop}
          cartCount={count}
          onCartPress={() => setActiveTab(4)}
        />
      )}

      {cartDrawerOpen && isDesktop && (
        <CartDrawer onClose={() => setCartDrawerOpen(false)} onCheckout={() => setInCheckout(true)} />
      )}

      {inCheckout && (
        <CheckoutScreen
          onBack={() => setInCheckout(false)}
          onSuccess={() => {
            setInCheckout(false);
            if (isDesktop) {
              setOrdersDrawerOpen(true);
            } else {
              setActiveTab(2);
            }
          }}
        />
      )}

      {ordersDrawerOpen && isDesktop && (
        <OrdersDrawer onClose={() => setOrdersDrawerOpen(false)} />
      )}

      {settingsDrawerOpen && isDesktop && (
        <SettingsDrawer
          onClose={() => setSettingsDrawerOpen(false)}
          onOrdersPress={() => { setSettingsDrawerOpen(false); setOrdersDrawerOpen(true); }}
        />
      )}

      <ProductDetailModal
        visible={!!selectedProduct}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </View>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocationProvider>
          <CartProvider>
            <WishlistProvider>
              <AppContent />
              <CookieBanner />
            </WishlistProvider>
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Backdrop
  drawerBackdrop: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  // Panel
  drawerPanel: {
    backgroundColor: "#fff",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
    flexDirection: "column",
  },

  // Header
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  drawerHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1a1a1a",
    letterSpacing: 1,
  },
  drawerCountBadge: {
    backgroundColor: RED,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  drawerCountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  drawerCloseBtn: {
    padding: 4,
  },

  // Address
  drawerAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fafafa",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  drawerAddressInput: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    paddingVertical: 0,
  },

  // Empty state
  drawerEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  drawerEmptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#333",
    marginTop: 8,
  },
  drawerEmptySubtitle: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 20,
  },

  // Items list
  drawerItemsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 12,
  },
  drawerItemImg: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#f8f8f8",
  },
  drawerItemInfo: {
    flex: 1,
    gap: 3,
  },
  drawerItemCat: {
    fontSize: 10,
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  drawerItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    lineHeight: 18,
  },
  drawerItemPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: RED,
    marginTop: 2,
  },
  drawerQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  drawerQtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerQtyBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  drawerQtyNum: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    minWidth: 20,
    textAlign: "center",
  },
  drawerDeleteBtn: {
    padding: 4,
    marginTop: 2,
  },

  // Footer
  drawerFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
    gap: 8,
  },
  drawerSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drawerSummaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  drawerSummaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  drawerFreeShippingNote: {
    fontSize: 11,
    color: "#2da44e",
    textAlign: "right",
    marginTop: -4,
  },
  drawerTotalRow: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  drawerTotalLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },
  drawerTotalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: RED,
  },
  drawerCheckoutBtn: {
    backgroundColor: RED,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 6,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  drawerCheckoutText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 1,
  },
  drawerClearBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  drawerClearText: {
    fontSize: 13,
    color: "#aaa",
    textDecorationLine: "underline",
  },
});
