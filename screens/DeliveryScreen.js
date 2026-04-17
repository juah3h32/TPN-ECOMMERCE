import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  getAvailableOrders,
  getMyDeliveryOrders,
  getDeliveryHistory,
  acceptDeliveryOrder,
  updateDeliveryStatus,
  updateDeliveryLocation,
} from "../services/api";

const RED = "#e6192e";
const GREEN = "#22c55e";
const BLUE = "#3b82f6";
const ORANGE = "#f59e0b";

// ─── ESTADOS DEL PEDIDO ───────────────────────────────────────────────────────
const STATUS = {
  pending:     { label: "Disponible",    color: ORANGE, bg: "#fffbeb", icon: "time-outline" },
  accepted:    { label: "Aceptado",      color: BLUE,   bg: "#eff6ff", icon: "bicycle-outline" },
  picked_up:   { label: "Recogido",      color: BLUE,   bg: "#eff6ff", icon: "bag-check-outline" },
  on_the_way:  { label: "En camino",     color: BLUE,   bg: "#eff6ff", icon: "navigate-outline" },
  delivered:   { label: "Entregado",     color: GREEN,  bg: "#f0fdf4", icon: "checkmark-circle-outline" },
  cancelled:   { label: "Cancelado",     color: RED,    bg: "#fff1f2", icon: "close-circle-outline" },
};

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Hoy ${formatTime(dateStr)}`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }) + " " + formatTime(dateStr);
}

// ─── TARJETA DE PEDIDO (lista) ────────────────────────────────────────────────
function OrderListCard({ order, onPress, isActive }) {
  const st = STATUS[order.status] || STATUS.pending;
  const total = parseFloat(order.total || 0).toFixed(2);
  return (
    <TouchableOpacity
      style={[d.listCard, isActive && d.listCardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={d.listCardTop}>
        <View>
          <Text style={d.orderId}>#{String(order.id).padStart(6, "0")}</Text>
          <Text style={d.orderTime}>{formatDate(order.created_at)}</Text>
        </View>
        <View style={[d.badge, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon} size={12} color={st.color} />
          <Text style={[d.badgeText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
      {order.store_name && (
        <View style={d.listCardStore}>
          <Ionicons name="storefront-outline" size={12} color={RED} />
          <Text style={d.storeNameText}>{order.store_name}</Text>
        </View>
      )}
      <View style={d.listCardMid}>
        <Ionicons name="location-outline" size={14} color="#aaa" />
        <Text style={d.addrText} numberOfLines={1}>{order.address || "Sin dirección"}</Text>
      </View>
      <View style={d.listCardBottom}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="cube-outline" size={13} color="#bbb" />
          <Text style={d.metaText}>{order.items_count ?? order.items?.length ?? 0} productos</Text>
        </View>
        <Text style={d.totalText}>${total}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── DETALLE DEL PEDIDO ───────────────────────────────────────────────────────
function OrderDetail({ order, onBack, onRefresh }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localOrder, setLocalOrder] = useState(order);
  const st = STATUS[localOrder.status] || STATUS.pending;

  const doAction = async (action) => {
    setLoading(true);
    try {
      let res;
      if (action === "accept") {
        res = await acceptDeliveryOrder(localOrder.id, user?.token);
      } else {
        res = await updateDeliveryStatus(localOrder.id, action, user?.token);
      }
      // Optimistic update even if API fails
      const nextStatus = {
        accept: "accepted",
        picked_up: "picked_up",
        on_the_way: "on_the_way",
        delivered: "delivered",
      }[action] || localOrder.status;
      setLocalOrder((o) => ({ ...o, status: nextStatus }));
      onRefresh?.();
    } catch {}
    setLoading(false);
  };

  // Botones de acción según estado
  const renderActions = () => {
    if (localOrder.status === "pending") {
      return (
        <TouchableOpacity style={d.acceptBtn} onPress={() => doAction("accept")} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={d.acceptBtnText}>ACEPTAR PEDIDO</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }
    if (localOrder.status === "accepted") {
      return (
        <TouchableOpacity style={[d.acceptBtn, { backgroundColor: BLUE }]} onPress={() => doAction("picked_up")} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="bag-check-outline" size={20} color="#fff" />
              <Text style={d.acceptBtnText}>PEDIDO RECOGIDO</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }
    if (localOrder.status === "picked_up") {
      return (
        <TouchableOpacity style={[d.acceptBtn, { backgroundColor: BLUE }]} onPress={() => doAction("on_the_way")} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="navigate-outline" size={20} color="#fff" />
              <Text style={d.acceptBtnText}>SALIR A ENTREGAR</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }
    if (localOrder.status === "on_the_way") {
      return (
        <TouchableOpacity style={[d.acceptBtn, { backgroundColor: GREEN }]} onPress={() => doAction("delivered")} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
              <Text style={d.acceptBtnText}>MARCAR COMO ENTREGADO</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }
    if (localOrder.status === "delivered") {
      return (
        <View style={[d.acceptBtn, { backgroundColor: GREEN }]}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={d.acceptBtnText}>ENTREGADO ✓</Text>
        </View>
      );
    }
    return null;
  };

  // Timeline de estado
  const TIMELINE = [
    { key: "pending",    label: "Pedido recibido",   icon: "document-text-outline" },
    { key: "accepted",   label: "Aceptado",           icon: "hand-right-outline" },
    { key: "picked_up",  label: "Pedido recogido",    icon: "bag-check-outline" },
    { key: "on_the_way", label: "En camino",          icon: "navigate-outline" },
    { key: "delivered",  label: "Entregado",          icon: "checkmark-circle-outline" },
  ];
  const statusOrder = ["pending", "accepted", "picked_up", "on_the_way", "delivered"];
  const currentIdx = statusOrder.indexOf(localOrder.status);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={d.detailHeader}>
        <TouchableOpacity style={d.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={d.detailOrderId}>Pedido #{String(localOrder.id).padStart(6, "0")}</Text>
          <Text style={d.detailTime}>{formatDate(localOrder.created_at)}</Text>
        </View>
        <View style={[d.badge, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon} size={12} color={st.color} />
          <Text style={[d.badgeText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* Timeline */}
        <View style={d.card}>
          <Text style={d.cardTitle}>ESTADO DEL PEDIDO</Text>
          {TIMELINE.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <View key={step.key} style={d.timelineRow}>
                <View style={{ alignItems: "center", width: 32 }}>
                  <View style={[d.timelineDot, done && d.timelineDotDone, active && d.timelineDotActive]}>
                    <Ionicons name={step.icon} size={14} color={done ? "#fff" : "#ccc"} />
                  </View>
                  {i < TIMELINE.length - 1 && (
                    <View style={[d.timelineLine, done && i < currentIdx && d.timelineLineDone]} />
                  )}
                </View>
                <Text style={[d.timelineLabel, active && d.timelineLabelActive, done && i < currentIdx && { color: GREEN }]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Datos del cliente y dirección */}
        <View style={d.card}>
          <Text style={d.cardTitle}>CLIENTE Y ENTREGA</Text>
          <View style={d.infoRow}>
            <View style={d.infoIcon}><Ionicons name="person-outline" size={17} color={RED} /></View>
            <View style={{ flex: 1 }}>
              <Text style={d.infoLabel}>Cliente</Text>
              <Text style={d.infoValue}>{localOrder.customer_name || "No disponible"}</Text>
              {localOrder.customer_email && <Text style={d.infoSub}>{localOrder.customer_email}</Text>}
            </View>
          </View>
          {localOrder.store_name && (
            <View style={d.infoRow}>
              <View style={d.infoIcon}><Ionicons name="storefront-outline" size={17} color={RED} /></View>
              <View style={{ flex: 1 }}>
                <Text style={d.infoLabel}>Sucursal origen</Text>
                <Text style={[d.infoValue, { color: RED }]}>{localOrder.store_name}</Text>
              </View>
            </View>
          )}
          <View style={d.infoRow}>
            <View style={d.infoIcon}><Ionicons name="location-outline" size={17} color={RED} /></View>
            <View style={{ flex: 1 }}>
              <Text style={d.infoLabel}>Dirección de entrega</Text>
              <Text style={d.infoValue}>{localOrder.address || "No especificada"}</Text>
            </View>
          </View>
          <View style={d.infoRow}>
            <View style={d.infoIcon}><Ionicons name="card-outline" size={17} color={RED} /></View>
            <View style={{ flex: 1 }}>
              <Text style={d.infoLabel}>Método de pago</Text>
              <Text style={d.infoValue}>{localOrder.payment_method || "—"}</Text>
              <View style={[d.payBadge, { backgroundColor: localOrder.payment_status === "paid" ? "#f0fdf4" : "#fffbeb" }]}>
                <Ionicons name={localOrder.payment_status === "paid" ? "checkmark-circle" : "time"} size={11}
                  color={localOrder.payment_status === "paid" ? GREEN : ORANGE} />
                <Text style={{ fontSize: 10, fontWeight: "700", color: localOrder.payment_status === "paid" ? GREEN : ORANGE }}>
                  {localOrder.payment_status === "paid" ? "Pagado" : "Pago al entregar"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Productos */}
        {Array.isArray(localOrder.items) && localOrder.items.length > 0 && (
          <View style={d.card}>
            <Text style={d.cardTitle}>PRODUCTOS ({localOrder.items.length})</Text>
            {localOrder.items.map((item, i) => (
              <View key={i} style={[d.productRow, i < localOrder.items.length - 1 && d.productDivider]}>
                <View style={d.productQtyBadge}>
                  <Text style={d.productQtyText}>x{item.qty}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={d.productName}>{item.product_name}</Text>
                  <Text style={d.productPrice}>${parseFloat(item.price || 0).toFixed(2)} c/u</Text>
                </View>
                <Text style={d.productTotal}>${(parseFloat(item.price || 0) * item.qty).toFixed(2)}</Text>
              </View>
            ))}
            <View style={d.totalRow}>
              <Text style={d.totalLabel}>TOTAL</Text>
              <Text style={d.totalValue}>${parseFloat(localOrder.total || 0).toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Notas */}
        {localOrder.notes ? (
          <View style={d.card}>
            <Text style={d.cardTitle}>NOTAS DEL CLIENTE</Text>
            <Text style={{ fontSize: 13, color: "#555", lineHeight: 19 }}>{localOrder.notes}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Acción flotante */}
      <View style={d.actionBar}>
        {renderActions()}
      </View>
    </View>
  );
}

// ─── PANTALLA PRINCIPAL DEL REPARTIDOR ───────────────────────────────────────
export default function DeliveryScreen() {
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeFilter, setActiveFilter] = useState("active"); // "active" | "available" | "done"
  
  const intervalRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const myOrdersRef = useRef([]);

  const fetchOrders = async () => {
    if (!user?.token) return;
    try {
      const [resAvail, resMine, resHist] = await Promise.all([
        getAvailableOrders(user.token),
        getMyDeliveryOrders(user.token),
        getDeliveryHistory(user.token),
      ]);

      if (resAvail?.success) setAvailableOrders(resAvail.data || []);
      if (resMine?.success) {
        myOrdersRef.current = resMine.data || [];
        setMyOrders(resMine.data || []);
      }
      if (resHist?.success) setHistoryOrders(resHist.data || []);
    } catch (e) {
      console.error("Error fetching orders:", e);
    }
    setLoading(false);
  };

  // Rastreo de ubicación en tiempo real
  const updateLocation = useCallback(async () => {
    const hasActive = myOrdersRef.current.some(o => ["accepted", "picked_up", "on_the_way"].includes(o.status));
    if (!hasActive) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc?.coords) {
        await updateDeliveryLocation(loc.coords.latitude, loc.coords.longitude, user?.token);
      }
    } catch {}
  }, [user?.token]);

  useEffect(() => {
    setLoading(true);
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 20000);
    locationIntervalRef.current = setInterval(updateLocation, 15000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(locationIntervalRef.current);
    };
  }, [user?.token, updateLocation]);

  const displayList = {
    active: myOrders,
    available: availableOrders,
    done: historyOrders
  }[activeFilter] || [];

  const newCount = availableOrders.length;

  // ── Desktop: sidebar + detail ─────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        <View style={d.desktopBody}>
          {/* Sidebar */}
          <View style={d.desktopSidebar}>
            <View style={d.sidebarHeader}>
              <View style={d.driverBadge}>
                <Ionicons name="bicycle" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.driverName} numberOfLines={1}>{user?.name || "Repartidor"}</Text>
                {user?.store_name ? (
                  <View style={d.storeBadge}>
                    <Ionicons name="storefront" size={10} color={RED} />
                    <Text style={d.storeBadgeText}>{user.store_name}</Text>
                  </View>
                ) : (
                  <Text style={d.driverRole}>MODO ENTREGA</Text>
                )}
              </View>
              <TouchableOpacity onPress={fetchOrders} style={d.refreshBtn}>
                <Ionicons name="refresh-outline" size={18} color="#aaa" />
              </TouchableOpacity>
            </View>

            {/* Filtros */}
            <View style={d.filterRow}>
              <TouchableOpacity style={[d.filterBtn, activeFilter === "available" && d.filterBtnActive]} onPress={() => setActiveFilter("available")}>
                <Text style={[d.filterBtnText, activeFilter === "available" && d.filterBtnTextActive]}>
                  Nuevos {newCount > 0 ? `(${newCount})` : ""}
                </Text>
                {newCount > 0 && activeFilter !== "available" && <View style={d.newDot} />}
              </TouchableOpacity>
              <TouchableOpacity style={[d.filterBtn, activeFilter === "active" && d.filterBtnActive]} onPress={() => setActiveFilter("active")}>
                <Text style={[d.filterBtnText, activeFilter === "active" && d.filterBtnTextActive]}>
                  Míos {myOrders.length > 0 ? `(${myOrders.length})` : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[d.filterBtn, activeFilter === "done" && d.filterBtnActive]} onPress={() => setActiveFilter("done")}>
                <Text style={[d.filterBtnText, activeFilter === "done" && d.filterBtnTextActive]}>Historial</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {loading && <ActivityIndicator color={RED} style={{ marginTop: 20 }} />}
              {!loading && displayList.length === 0 && (
                <View style={d.emptyList}>
                  <Ionicons name={
                    activeFilter === "available" ? "time-outline" : 
                    activeFilter === "active" ? "bicycle-outline" : "checkmark-circle-outline"
                  } size={40} color="#e0e0e0" />
                  <Text style={d.emptyListText}>
                    {activeFilter === "available" ? "No hay pedidos nuevos" : 
                     activeFilter === "active" ? "No tienes pedidos asignados" : "Sin historial de entregas"}
                  </Text>
                </View>
              )}
              {displayList.map((order) => (
                <OrderListCard
                  key={order.id}
                  order={order}
                  onPress={() => setSelectedOrder(order)}
                  isActive={selectedOrder?.id === order.id}
                />
              ))}
            </ScrollView>

            <TouchableOpacity style={d.signOutBtn} onPress={signOut}>
              <Ionicons name="log-out-outline" size={16} color={RED} />
              <Text style={d.signOutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>

          {/* Panel principal */}
          <View style={{ flex: 1 }}>
            {selectedOrder ? (
              <OrderDetail
                order={selectedOrder}
                onBack={() => setSelectedOrder(null)}
                onRefresh={fetchOrders}
              />
            ) : (
              <View style={d.desktopPlaceholder}>
                <Ionicons name="bicycle-outline" size={64} color="#e0e0e0" />
                <Text style={d.desktopPlaceholderTitle}>
                  {newCount > 0 ? `${newCount} pedido${newCount > 1 ? "s" : ""} disponible${newCount > 1 ? "s" : ""}` : "Sin pedidos nuevos"}
                </Text>
                <Text style={d.desktopPlaceholderSub}>
                  {newCount > 0 ? "Selecciona un pedido para aceptarlo" : "Los nuevos pedidos aparecerán aquí automáticamente"}
                </Text>
                {loading && <ActivityIndicator color={RED} style={{ marginTop: 16 }} />}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (selectedOrder) {
    return (
      <View style={d.mobileWrapper}>
        <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} onRefresh={fetchOrders} />
      </View>
    );
  }

  return (
    <View style={d.mobileWrapper}>
      {/* Header */}
      <View style={d.mobileHeader}>
        <View style={d.driverBadge}>
          <Ionicons name="bicycle" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={d.driverName}>{user?.name || "Repartidor"}</Text>
          {user?.store_name ? (
            <View style={d.storeBadge}>
              <Ionicons name="storefront" size={10} color={RED} />
              <Text style={d.storeBadgeText}>{user.store_name}</Text>
            </View>
          ) : (
            <Text style={d.driverRole}>MODO ENTREGA</Text>
          )}
        </View>
        <TouchableOpacity onPress={fetchOrders} style={d.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color="#aaa" />
        </TouchableOpacity>
        <TouchableOpacity onPress={signOut} style={[d.refreshBtn, { marginLeft: 4 }]}>
          <Ionicons name="log-out-outline" size={20} color={RED} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={d.statsRow}>
        <View style={d.statItem}>
          <Text style={[d.statNum, { color: ORANGE }]}>{newCount}</Text>
          <Text style={d.statLabel}>Nuevos</Text>
        </View>
        <View style={d.statDivider} />
        <View style={d.statItem}>
          <Text style={[d.statNum, { color: BLUE }]}>{myOrders.length}</Text>
          <Text style={d.statLabel}>Asignados</Text>
        </View>
        <View style={d.statDivider} />
        <View style={d.statItem}>
          <Text style={[d.statNum, { color: GREEN }]}>{historyOrders.length}</Text>
          <Text style={d.statLabel}>Historial</Text>
        </View>
      </View>

      {/* Filtros */}
      <View style={d.filterRow}>
        <TouchableOpacity style={[d.filterBtn, activeFilter === "available" && d.filterBtnActive]} onPress={() => setActiveFilter("available")}>
          <Text style={[d.filterBtnText, activeFilter === "available" && d.filterBtnTextActive]}>
            Disponibles {newCount > 0 ? `(${newCount})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[d.filterBtn, activeFilter === "active" && d.filterBtnActive]} onPress={() => setActiveFilter("active")}>
          <Text style={[d.filterBtnText, activeFilter === "active" && d.filterBtnTextActive]}>
            Míos {myOrders.length > 0 ? `(${myOrders.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[d.filterBtn, activeFilter === "done" && d.filterBtnActive]} onPress={() => setActiveFilter("done")}>
          <Text style={[d.filterBtnText, activeFilter === "done" && d.filterBtnTextActive]}>Historial</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14 }}>
        {loading && <ActivityIndicator color={RED} style={{ marginTop: 20 }} />}
        {!loading && displayList.length === 0 && (
          <View style={d.emptyList}>
            <Ionicons name={
              activeFilter === "available" ? "time-outline" : 
              activeFilter === "active" ? "bicycle-outline" : "checkmark-circle-outline"
            } size={48} color="#e0e0e0" />
            <Text style={d.emptyListText}>
              {activeFilter === "available" ? "No hay pedidos nuevos por ahora" : 
               activeFilter === "active" ? "No tienes pedidos asignados" : "Sin historial de pedidos"}
            </Text>
            <Text style={{ fontSize: 12, color: "#ccc", textAlign: "center" }}>Desliza hacia abajo para actualizar</Text>
          </View>
        )}
        {displayList.map((order) => (
          <OrderListCard key={order.id} order={order} onPress={() => setSelectedOrder(order)} />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── DEMO DATA (mientras el endpoint no esté listo) ───────────────────────────
const DEMO_ORDERS = [
  {
    id: 100042,
    status: "pending",
    created_at: new Date().toISOString(),
    address: "Av. Insurgentes Sur 1234, Col. Del Valle, CDMX",
    customer_name: "María González",
    customer_email: "maria@correo.com",
    payment_method: "Tarjeta VISA •••• 4242",
    payment_status: "paid",
    total: 340.50,
    items_count: 3,
    items: [
      { product_name: "Aceite Vegetal 1L", qty: 2, price: 45 },
      { product_name: "Leche Entera 1L",   qty: 3, price: 22 },
      { product_name: "Pan Integral",       qty: 1, price: 38 },
    ],
    notes: "Tocar timbre 2 veces",
  },
  {
    id: 100041,
    status: "on_the_way",
    created_at: new Date(Date.now() - 1800000).toISOString(),
    address: "Calle Morelos 56, Col. Centro, CDMX",
    customer_name: "Carlos Ramírez",
    customer_email: "carlos@correo.com",
    payment_method: "Efectivo al entregar",
    payment_status: "pending",
    total: 185.00,
    items_count: 2,
    items: [
      { product_name: "Agua Purificada 20L", qty: 1, price: 120 },
      { product_name: "Detergente 1Kg",      qty: 1, price: 65 },
    ],
    notes: "",
  },
];

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const d = StyleSheet.create({
  mobileWrapper: { flex: 1, backgroundColor: "#f5f5f5", paddingTop: Platform.OS === "ios" ? 54 : 44 },
  mobileHeader: {
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  driverBadge: { width: 38, height: 38, borderRadius: 10, backgroundColor: RED, justifyContent: "center", alignItems: "center" },
  driverName: { fontSize: 14, fontWeight: "800", color: "#111" },
  driverRole: { fontSize: 9, fontWeight: "800", color: RED, letterSpacing: 1 },
  storeBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  storeBadgeText: { fontSize: 10, fontWeight: "700", color: RED },
  listCardStore: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  storeNameText: { fontSize: 11, fontWeight: "700", color: RED },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },

  statsRow: { flexDirection: "row", backgroundColor: "#fff", paddingVertical: 14, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "900", marginBottom: 2 },
  statLabel: { fontSize: 10, color: "#aaa", fontWeight: "600" },
  statDivider: { width: 1, backgroundColor: "#f0f0f0" },

  filterRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: "#f5f5f5", alignItems: "center", position: "relative" },
  filterBtnActive: { backgroundColor: "#fff0f0" },
  filterBtnText: { fontSize: 13, fontWeight: "700", color: "#aaa" },
  filterBtnTextActive: { color: RED },
  newDot: { position: "absolute", top: 6, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: RED },

  listCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1.5, borderColor: "transparent",
  },
  listCardActive: { borderColor: RED, backgroundColor: "#fff8f8" },
  listCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  orderId: { fontSize: 15, fontWeight: "900", color: "#111" },
  orderTime: { fontSize: 11, color: "#aaa", marginTop: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  listCardMid: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  addrText: { flex: 1, fontSize: 12, color: "#666" },
  listCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaText: { fontSize: 12, color: "#aaa" },
  totalText: { fontSize: 15, fontWeight: "900", color: "#111" },

  emptyList: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyListText: { fontSize: 14, fontWeight: "600", color: "#ccc", textAlign: "center" },

  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  signOutText: { fontSize: 13, fontWeight: "700", color: RED },

  // Desktop
  desktopBody: { flex: 1, flexDirection: "row" },
  desktopSidebar: {
    width: 320, backgroundColor: "#fff",
    borderRightWidth: 1, borderRightColor: "#f0f0f0",
    flexDirection: "column",
  },
  sidebarHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  desktopPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  desktopPlaceholderTitle: { fontSize: 20, fontWeight: "900", color: "#333" },
  desktopPlaceholderSub: { fontSize: 14, color: "#aaa", textAlign: "center" },

  // Detail
  detailHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  detailOrderId: { fontSize: 16, fontWeight: "900", color: "#111" },
  detailTime: { fontSize: 11, color: "#aaa" },

  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 10, fontWeight: "800", color: "#bbb", letterSpacing: 0.5, marginBottom: 14 },

  timelineRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 0 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", marginBottom: 0 },
  timelineDotDone: { backgroundColor: GREEN },
  timelineDotActive: { backgroundColor: RED },
  timelineLine: { width: 2, height: 24, backgroundColor: "#f0f0f0", marginLeft: 15 },
  timelineLineDone: { backgroundColor: GREEN },
  timelineLabel: { flex: 1, fontSize: 13, color: "#aaa", marginLeft: 12, paddingTop: 7, paddingBottom: 16 },
  timelineLabelActive: { color: "#111", fontWeight: "800" },

  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9f9f9" },
  infoIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#fff5f5", justifyContent: "center", alignItems: "center", marginTop: 2 },
  infoLabel: { fontSize: 10, fontWeight: "700", color: "#bbb", marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "700", color: "#111" },
  infoSub: { fontSize: 12, color: "#aaa", marginTop: 1 },
  payBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start", marginTop: 4 },

  productRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  productDivider: { borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  productQtyBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  productQtyText: { fontSize: 12, fontWeight: "800", color: "#555" },
  productName: { fontSize: 13, fontWeight: "700", color: "#111" },
  productPrice: { fontSize: 11, color: "#aaa" },
  productTotal: { fontSize: 14, fontWeight: "800", color: "#111" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  totalLabel: { fontSize: 12, fontWeight: "800", color: "#aaa" },
  totalValue: { fontSize: 18, fontWeight: "900", color: "#111" },

  actionBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#f0f0f0",
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  acceptBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16,
  },
  acceptBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
