import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useCart } from "../context/CartContext";

const RED = "#e6192e";
const YELLOW = "#fede33";

function CartItem({ item }) {
  const { updateQty, removeFromCart } = useCart();

  return (
    <View style={styles.cartItem}>
      <View style={styles.cartItemImgWrap}>
        <Image
          source={{ uri: item.img }}
          style={styles.cartItemImg}
          resizeMode="contain"
        />
      </View>

      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemCat}>{item.cat}</Text>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>{item.price}</Text>
      </View>

      <View style={styles.cartItemRight}>
        <TouchableOpacity
          onPress={() => removeFromCart(item.id)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={16} color="#999" />
        </TouchableOpacity>
        <View style={styles.qtyControl}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQty(item.id, item.qty - 1)}
          >
            <Text style={styles.qtyBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.qty}</Text>
          <TouchableOpacity
            style={[
              styles.qtyBtn,
              { backgroundColor: (item.stock !== null && item.qty >= item.stock) ? "#ccc" : RED },
            ]}
            onPress={() => updateQty(item.id, item.qty + 1)}
            disabled={item.stock !== null && item.qty >= item.stock}
          >
            <Text style={[styles.qtyBtnText, { color: "#fff" }]}>+</Text>
          </TouchableOpacity>
        </View>
        {item.stock !== null && item.stock <= 5 && item.stock > 0 && (
          <Text style={{ fontSize: 10, color: "#e65100", textAlign: "center", marginTop: 2 }}>
            Stock: {item.stock}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function CartScreen({ onBack, onCheckout }) {
  const { items, subtotal, clearCart, count } = useCart();

  const shipping = subtotal > 500 ? 0 : 49;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="cart-outline" size={72} color="#ddd" />
        </View>
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptySubtitle}>
          Agrega productos desde la tienda para verlos aquí
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MI CARRITO</Text>
        <Text style={styles.headerCount}>{count} {count === 1 ? "producto" : "productos"}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Items */}
        <View style={styles.itemsCard}>
          {items.map((item, i) => (
            <View key={item.id}>
              <CartItem item={item} />
              {i < items.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Vaciar carrito */}
        <TouchableOpacity onPress={clearCart} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={14} color="#999" />
          <Text style={styles.clearBtnText}>Vaciar carrito</Text>
        </TouchableOpacity>

        {/* Resumen */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>RESUMEN DE PEDIDO</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Envío</Text>
            <Text style={[styles.summaryValue, shipping === 0 && styles.freeShipping]}>
              {shipping === 0 ? "GRATIS" : `$${shipping.toFixed(2)}`}
            </Text>
          </View>

          {shipping > 0 && (
            <View style={styles.freeShippingBanner}>
              <Ionicons name="information-circle-outline" size={14} color={RED} />
              <Text style={styles.freeShippingText}>
                Agrega ${(500 - subtotal).toFixed(2)} más para envío gratis
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Cupón */}
        <View style={styles.couponRow}>
          <Ionicons name="pricetag-outline" size={18} color={RED} />
          <Text style={styles.couponText}>¿Tienes un cupón de descuento?</Text>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.totalRow}>
          <Text style={styles.bottomTotalLabel}>Total</Text>
          <Text style={styles.bottomTotalValue}>${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout}>
          <Text style={styles.checkoutBtnText}>PROCEDER AL PAGO</Text>
          <Ionicons name="arrow-forward" size={18} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: Platform.OS === "ios" ? 54 : 44,
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
    flex: 1,
  },
  headerCount: {
    fontSize: 13,
    color: "#999",
    fontWeight: "600",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    paddingTop: Platform.OS === "ios" ? 100 : 80,
    backgroundColor: "#fff",
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#222",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },

  itemsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  cartItemImgWrap: {
    width: 70,
    height: 70,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    padding: 4,
  },
  cartItemImg: { width: "100%", height: "100%" },
  cartItemInfo: { flex: 1 },
  cartItemCat: { fontSize: 9, color: "#bbb", fontWeight: "700", marginBottom: 2 },
  cartItemName: { fontSize: 13, fontWeight: "800", color: "#111", marginBottom: 4 },
  cartItemPrice: { fontSize: 13, fontWeight: "900", color: RED },
  cartItemRight: { alignItems: "flex-end", gap: 8 },
  deleteBtn: { padding: 4 },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  qtyBtnText: { fontSize: 16, fontWeight: "700", color: "#333" },
  qtyText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
    paddingHorizontal: 10,
  },
  divider: { height: 1, backgroundColor: "#f5f5f5", marginVertical: 8 },

  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginBottom: 16,
    paddingRight: 4,
  },
  clearBtnText: { fontSize: 12, color: "#999" },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#333",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 14, color: "#666" },
  summaryValue: { fontSize: 14, fontWeight: "700", color: "#333" },
  freeShipping: { color: "#22c55e", fontWeight: "800" },
  freeShippingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginBottom: 8,
  },
  freeShippingText: { fontSize: 12, color: RED, flex: 1 },
  totalLabel: { fontSize: 16, fontWeight: "900", color: "#111" },
  totalValue: { fontSize: 18, fontWeight: "900", color: RED },

  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  couponText: { flex: 1, fontSize: 14, color: "#333", fontWeight: "600" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 110 : 90,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bottomTotalLabel: { fontSize: 14, color: "#666" },
  bottomTotalValue: { fontSize: 20, fontWeight: "900", color: "#111" },
  checkoutBtn: {
    backgroundColor: YELLOW,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  checkoutBtnText: { fontSize: 15, fontWeight: "900", color: "#000" },
});
