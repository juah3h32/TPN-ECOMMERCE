import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useLocation } from "../context/LocationContext";

// Altura fija del MobileHeader por debajo del safe area:
// paddingBottom(10) + locationRow(~36) + marginBottom(10) + searchRow(42) + border(1) = 99
export const MOBILE_HEADER_FIXED = 99;
import { getCategories, getProducts, getPromos } from "../services/api";
import LocationPickerModal from "../components/LocationPickerModal";
import ProductDetailModal from "../components/ProductDetailModal";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const RED = "#e6192e";
const YELLOW = "#fede33";

// ─── DATA ────────────────────────────────────────────────────────────────────
// Las categorías se cargan desde la API (ver useHomeData)

// Marcas: reemplaza estas URLs con tus links reales de Cloudinary
const BRANDS = [
  {
    name: "Marca 1",
    img: "https://res.cloudinary.com/dfuzfdrat/image/upload/q_auto/f_auto/v1775496685/QyW4qf4bS-uuEyqMcrlOS_xxupzg.webp",
  },
  {
    name: "Marca 2",
    img: "https://res.cloudinary.com/dfuzfdrat/image/upload/q_auto/f_auto/v1775496686/8raVd8Ge171ERwyz9Nekf_i6qeim.webp",
  },
  {
    name: "Marca 3",
    img: "https://res.cloudinary.com/dfuzfdrat/image/upload/q_auto/f_auto/v1775496686/aarfs_ilybpd.png",
  },
  {
    name: "Marca 4",
    img: "https://res.cloudinary.com/dfuzfdrat/image/upload/q_auto/f_auto/v1775496685/vYWD8lIqjt3GIeKFTZaav_iuipju.webp",
  },
  {
    name: "Marca 5",
    img: "https://res.cloudinary.com/dfuzfdrat/image/upload/q_auto/f_auto/v1775496685/coAP5yJmDus_5jMyJftPO_v1wlfj.webp",
  },
  {
    name: "Marca 6",
    img: "https://res.cloudinary.com/dfuzfdrat/image/upload/q_auto/f_auto/v1775496685/EtMNQTFHzDJ_hvyuV7zkb_ndvqj4.webp",
  },
  {
    name: "Marca 7",
    img: "https://res.cloudinary.com/dfuzfdrat/image/upload/q_auto/f_auto/v1775496684/ReymaLogoOficial_glqfgk.png",
  },
  {
    name: "Marca 8",
    img: "https://res.cloudinary.com/dfuzfdrat/image/upload/q_auto/f_auto/v1775496684/images_lxabhm.png",
  },
];

// ─── HOOK DATOS INICIO DESDE API ─────────────────────────────────────────────
function useHomeData() {
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [promos, setPromos] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  const load = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);

    // Categorías
    getCategories()
      .then((res) => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setCategories(res.data.map((c) => ({
            label: c.label,
            img:   c.img_url || null,
            name:  c.name,
          })));
        }
      })
      .catch(() => {});

    // Productos (todos para búsqueda, primeros 12 para destacados)
    try {
      const res = await getProducts();
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((p) => ({
          id:            p.id,
          cat:           p.category,
          name:          p.name,
          price:         p.price_display || `$${parseFloat(p.price).toFixed(2)} / ${p.unit}`,
          price_numeric: parseFloat(p.price),
          img:           p.image_url,
          promo:         p.promo || null,
          stock:         p.stock ?? null,
        }));
        setAllProducts(mapped);
        setFeaturedProducts(mapped.slice(0, 12));
      } else {
        setProductsError(res?.message || "No se pudieron cargar los productos");
      }
    } catch (e) {
      setProductsError(`Error de conexión: ${e?.message || "Sin internet"}`);
    } finally {
      setProductsLoading(false);
    }

    // Promos / banners
    getPromos()
      .then((res) => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setPromos(res.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  return { categories, allProducts, featuredProducts, promos, productsLoading, productsError, reload: load };
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ item, isDesktop, cardWidth, onPress }) {
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(item.id);

  if (!isDesktop) {
    return (
      <TouchableOpacity
        style={[styles.cardMobile, { width: cardWidth }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {item.promo && (
          <View style={styles.cardBadgeMobile}>
            <Text style={styles.badgeText}>{item.promo}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.heartBtnMobile}
          onPress={(e) => { e.stopPropagation?.(); toggleWishlist(item); }}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name={wishlisted ? "heart" : "heart-outline"} size={14} color={wishlisted ? RED : "#bbb"} />
        </TouchableOpacity>
        <View style={styles.cardImgBgMobile}>
          <Image
            source={{ uri: item.img }}
            style={styles.cardImgMobile}
            resizeMode="contain"
          />
        </View>
        <View style={styles.cardInfoMobile}>
          <Text style={styles.cardCatMobile}>{item.cat}</Text>
          <Text style={styles.prodNameMobile} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardFooterMobile}>
            <Text style={styles.priceMobile}>{item.price}</Text>
            <TouchableOpacity style={styles.addBtnMobile} onPress={(e) => { e.stopPropagation?.(); addToCart(item); }}>
              <Ionicons name="add" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.cardDesktop, { width: cardWidth }]}>
      {item.promo && (
        <View style={styles.cardBadge}>
          <Text style={styles.badgeText}>{item.promo}</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.heartBtn}
        onPress={(e) => { e.stopPropagation?.(); toggleWishlist(item); }}
        activeOpacity={0.7}
      >
        <Ionicons name={wishlisted ? "heart" : "heart-outline"} size={18} color={wishlisted ? RED : "#999"} />
      </TouchableOpacity>
      <Image
        source={{ uri: item.img }}
        style={styles.cardImgDesktop}
        resizeMode="contain"
      />
      <Text style={styles.cardCatDesktop}>{item.cat}</Text>
      <Text style={styles.prodNameDesktop}>{item.name}</Text>
      <Text style={styles.priceDesktop}>{item.price}</Text>
      <View style={styles.cardFooterDesktop}>
        <View style={styles.qtyControl}>
          <TouchableOpacity onPress={() => setQty(Math.max(1, qty - 1))}>
            <Text style={styles.qtyBtn}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{qty}</Text>
          <TouchableOpacity onPress={() => setQty(qty + 1)}>
            <Text style={styles.qtyBtn}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addBtnDesktop} onPress={() => addToCart(item)}>
          <Ionicons name="add" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── SEARCH BAR WITH AUTOCOMPLETE ────────────────────────────────────────────
function SearchBar({ products = [], onSelect, isDesktop }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);

  const handleChange = (text) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    const q = text.toLowerCase();
    const filtered = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.cat && p.cat.toLowerCase().includes(q))
      )
      .slice(0, 6);
    setResults(filtered);
  };

  const handleSelect = (item) => {
    setQuery("");
    setResults([]);
    setFocused(false);
    onSelect?.(item);
  };

  const showDropdown = focused && results.length > 0;

  const dropdown = showDropdown ? (
    <View style={isDesktop ? searchStyles.desktopDropdown : searchStyles.mobileDropdown}>
      {results.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={searchStyles.resultItem}
          onPress={() => handleSelect(item)}
        >
          {item.img ? (
            <Image
              source={{ uri: item.img }}
              style={searchStyles.resultImg}
              resizeMode="contain"
            />
          ) : (
            <View style={[searchStyles.resultImg, { backgroundColor: "#f5f5f5" }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={searchStyles.resultName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={searchStyles.resultCat}>{item.cat}</Text>
          </View>
          <Text style={searchStyles.resultPrice}>{item.price}</Text>
        </TouchableOpacity>
      ))}
    </View>
  ) : null;

  if (isDesktop) {
    return (
      <View style={[styles.desktopSearch, { zIndex: 200 }]}>
        <Ionicons name="search" size={18} color="#999" style={{ marginLeft: 16 }} />
        <TextInput
          value={query}
          onChangeText={handleChange}
          placeholder="Escribe lo que necesitas..."
          style={styles.desktopSearchInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => { setQuery(""); setResults([]); }}
            style={{ paddingRight: 8 }}
          >
            <Ionicons name="close-circle" size={17} color="#bbb" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.desktopSearchBtn}>
          <Ionicons name="search" size={18} color="#fff" />
        </TouchableOpacity>
        {dropdown}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, zIndex: 200 }}>
      <View style={styles.mobileSearch}>
        <Ionicons name="search" size={18} color="#999" style={{ marginLeft: 12 }} />
        <TextInput
          value={query}
          onChangeText={handleChange}
          placeholder="Escribe lo que necesitas..."
          style={styles.mobileSearchInput}
          placeholderTextColor="#999"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => { setQuery(""); setResults([]); }}
            style={{ paddingRight: 10 }}
          >
            <Ionicons name="close-circle" size={17} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>
      {dropdown}
    </View>
  );
}

const searchStyles = StyleSheet.create({
  desktopDropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 9999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  mobileDropdown: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 9999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 12,
  },
  resultImg: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  resultName: { fontSize: 13, fontWeight: "700", color: "#222" },
  resultCat: { fontSize: 10, color: "#aaa", fontWeight: "600", marginTop: 2 },
  resultPrice: { fontSize: 13, fontWeight: "800", color: "#e6192e" },
});

// ─── DESKTOP NAVBAR (STICKY) ──────────────────────────────────────────────────
export function DesktopNav({ onHomePress, onCartPress, onStorePress, onOrdersPress, onProfilePress, products, onProductSelect, onSettingsPress, activeTabIndex = 0 }) {
  const { count } = useCart();
  const { user, signOut, signInWithGoogle } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const firstName = user?.givenName || user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Mi cuenta";

  return (
    <View style={[styles.desktopNav, { zIndex: 200 }]}>
      <View style={[styles.desktopNavInner, styles.centeredContainer]}>
        <View style={styles.navLeft}>
          <Image source={require("../assets/images/logo.png")} style={styles.navLogo} resizeMode="contain" />
          <TouchableOpacity style={styles.navLink} onPress={onHomePress}>
            <Text style={[styles.navLinkText, activeTabIndex === 0 && { color: RED }]}>INICIO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLink} onPress={onStorePress}>
            <Text style={[styles.navLinkText, activeTabIndex === 1 && { color: RED }]}>TIENDA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLink} onPress={onOrdersPress}>
            <Text style={[styles.navLinkText, activeTabIndex === 2 && { color: RED }]}>PEDIDOS</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, marginHorizontal: 30, maxWidth: 600, zIndex: 200 }}>
          <SearchBar products={products} onSelect={onProductSelect} isDesktop={true} />
        </View>

        <View style={styles.navRight}>
          <TouchableOpacity style={styles.navIconBtn} onPress={onCartPress}>
            <View style={{ position: "relative" }}>
              <Ionicons name="cart-sharp" size={24} color="#333" />
              {count > 0 && (
                <View style={styles.navCartBadge}>
                  <Text style={styles.navCartBadgeText}>{count > 9 ? "9+" : count}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {user ? (
            <View style={{ position: "relative", zIndex: 300 }}>
              {/* Botón perfil — abre dropdown */}
              <TouchableOpacity
                style={[styles.userNavBtn, menuOpen && { backgroundColor: "#f5f5f5" }]}
                onPress={() => setMenuOpen((v) => !v)}
                activeOpacity={0.85}
              >
                <View style={styles.userNavAvatar}>
                  <Text style={styles.userNavAvatarText}>
                    {(user.givenName || user.name || "U")[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.userNavName} numberOfLines={1}>{firstName}</Text>
                <Ionicons
                  name={menuOpen ? "chevron-up" : "chevron-down"}
                  size={13}
                  color="#888"
                  style={{ marginLeft: 2 }}
                />
              </TouchableOpacity>

              {/* Dropdown */}
              {menuOpen && (
                <>
                  {/* Backdrop invisible */}
                  <TouchableOpacity
                    onPress={() => setMenuOpen(false)}
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 298 }}
                  />
                  <View style={navDropdown.container}>
                    {/* Cabecera usuario */}
                    <View style={navDropdown.userRow}>
                      {user.photo ? (
                        <Image source={{ uri: user.photo }} style={navDropdown.avatarImg} />
                      ) : (
                        <View style={[navDropdown.avatarImg, { backgroundColor: RED, justifyContent: "center", alignItems: "center" }]}>
                          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }}>
                            {(user.givenName || user.name || "U")[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={navDropdown.userName} numberOfLines={1}>{user.name || firstName}</Text>
                        <Text style={navDropdown.userEmail} numberOfLines={1}>{user.email}</Text>
                      </View>
                    </View>

                    <View style={navDropdown.divider} />

                    {/* Configuración */}
                    <TouchableOpacity
                      style={navDropdown.item}
                      onPress={() => { setMenuOpen(false); onSettingsPress?.(); }}
                      activeOpacity={0.7}
                    >
                      <View style={navDropdown.itemIcon}>
                        <Ionicons name="settings-outline" size={17} color="#555" />
                      </View>
                      <Text style={navDropdown.itemText}>Configuración</Text>
                      <Ionicons name="chevron-forward" size={13} color="#ccc" />
                    </TouchableOpacity>

                    <View style={navDropdown.divider} />

                    {/* Cerrar sesión */}
                    <TouchableOpacity
                      style={navDropdown.item}
                      onPress={() => { setMenuOpen(false); signOut(); }}
                      activeOpacity={0.7}
                    >
                      <View style={[navDropdown.itemIcon, { backgroundColor: "#fff5f5" }]}>
                        <Ionicons name="log-out-outline" size={17} color={RED} />
                      </View>
                      <Text style={[navDropdown.itemText, { color: RED }]}>Cerrar sesión</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.loginBtn} onPress={signInWithGoogle}>
              <Ionicons name="logo-google" size={16} color={RED} />
              <Text style={styles.loginText}>INICIAR SESIÓN</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const navDropdown = StyleSheet.create({
  container: {
    position: "absolute",
    top: 48,
    right: 0,
    width: 260,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 24,
    zIndex: 999,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fafafa",
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: { fontSize: 14, fontWeight: "800", color: "#111" },
  userEmail: { fontSize: 11, color: "#999", marginTop: 1 },
  divider: { height: 1, backgroundColor: "#f0f0f0" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#222" },
});

// ─── MOBILE FIXED HEADER ──────────────────────────────────────────────────────
export function MobileHeader({ onCartPress, products, onProductSelect }) {
  const { top: safeTop } = useSafeAreaInsets();
  const { count } = useCart();
  const { address, coords, deliveryAddress, setDeliveryAddress, loading: locLoading, requestLocation } = useLocation();
  const { user } = useAuth();
  const [pickerVisible, setPickerVisible] = useState(false);

  const displayAddress = deliveryAddress || address;

  return (
    <View style={[styles.mobileHeaderFixed, { paddingTop: Math.max(safeTop, 20) }]}>
      {/* Fila superior: ubicación + íconos */}
      <View style={styles.mobileHeaderTop}>
        <TouchableOpacity
          style={styles.mobileLocation}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="location-sharp" size={22} color={RED} />
          <View style={{ flex: 1, paddingHorizontal: 8 }}>
            <Text style={styles.mobileWelcome}>
              {user ? `HOLA, ${(user.givenName || user.name || user.email?.split('@')[0] || "USUARIO").toUpperCase()}` : "ENTREGAR EN"}
            </Text>
            <Text style={styles.mobileAddress} numberOfLines={1}>
              {locLoading ? "Detectando ubicación..." : (displayAddress || "Selecciona tu dirección ›")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={RED} />
        </TouchableOpacity>

        <View style={styles.mobileHeaderIcons}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={onCartPress}>
            <Ionicons name="cart" size={26} color="#000" />
            {count > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{count > 9 ? "9+" : count}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>5</Text>
            </View>
            <Ionicons name="notifications" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Fila de búsqueda */}
      <View style={[styles.mobileSearchRow, { zIndex: 200 }]}>
        <SearchBar products={products} onSelect={onProductSelect} isDesktop={false} />
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal selector de ubicación */}
      <LocationPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={(addr) => setDeliveryAddress(addr)}
        currentCoords={coords}
      />
    </View>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function RappiStore({ onCartPress, onStorePress, onOrdersPress, onProfilePress, onSettingsPress }) {
  const { width } = useWindowDimensions();
  const { top: safeTop } = useSafeAreaInsets();
  const isDesktop = width >= 1024;
  const { categories, allProducts, featuredProducts, promos, productsLoading, productsError, reload } = useHomeData();
  const { address, coords, deliveryAddress, setDeliveryAddress, requestLocation, resetDeliveryAddress } = useLocation();
  const [showAllCats, setShowAllCats] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const desktopCardWidth = 210;
  const gap = 16;
  const mobileCardWidth = (width - 16 * 2 - gap) / 2;

  return (
    <View style={styles.mainWrapper}>
      {/* Navbar fija PC */}
      {/* DesktopNav is rendered globally in App.js */}

      {/* Header fijo móvil — renderizado globalmente desde App.js */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: isDesktop ? 0 : Math.max(safeTop, 20) + MOBILE_HEADER_FIXED + 8,
          paddingBottom: 40,
        }}
      >
        {/* ── BANNER PRINCIPAL ── */}
        <View style={[styles.banner, isDesktop && styles.bannerDesktop]}>
          <View
            style={[
              styles.bannerInner,
              isDesktop && styles.centeredContainer,
              isDesktop && { paddingVertical: 50 },
            ]}
          >
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerLine1}>TODO LO QUE TU</Text>
              <Text style={styles.bannerLine2}>NEGOCIO</Text>
              <Text style={styles.bannerLine3}>NECESITA</Text>

              {isDesktop ? (
                <View style={{ position: "relative", zIndex: 999 }}>
                  {/* Input de dirección — abre picker al tocar */}
                  <TouchableOpacity
                    style={styles.bannerLocationRow}
                    onPress={() => setLocationPickerVisible(!locationPickerVisible)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="location-sharp"
                      size={20}
                      color="#666"
                      style={{ marginLeft: 15 }}
                    />
                    <Text
                      style={[styles.bannerLocationInput, { lineHeight: 20 }]}
                      numberOfLines={1}
                    >
                      {deliveryAddress && deliveryAddress !== "Mi ubicación actual"
                        ? deliveryAddress
                        : (address && address !== "Mi ubicación actual" && address !== "Detectando ubicación..."
                          ? address
                          : "¿Dónde quieres recibir tu compra?")}
                    </Text>
                    <View style={styles.ordenarBtnDesktop}>
                      <Text style={styles.ordenarBtnTextDesktop}>CAMBIAR</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.cambiarUbicacionRow}>
                    <TouchableOpacity style={styles.cambiarUbicacion} onPress={requestLocation}>
                      <Ionicons name="navigate" size={13} color="#fff" />
                      <Text style={styles.cambiarUbicacionText}>Usar mi ubicación GPS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cambiarUbicacion} onPress={() => setLocationPickerVisible(!locationPickerVisible)}>
                      <Ionicons name="map-outline" size={13} color="#fff" />
                      <Text style={styles.cambiarUbicacionText}>Elegir en el mapa</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Popup picker PC — aparece debajo del botón */}
                  <LocationPickerModal
                    popup
                    visible={locationPickerVisible}
                    onClose={() => setLocationPickerVisible(false)}
                    onConfirm={(addr) => { setDeliveryAddress(addr); setLocationPickerVisible(false); }}
                    currentCoords={coords}
                  />
                </View>
              ) : (
                <TouchableOpacity style={styles.ordenarBtnMobile} onPress={onStorePress}>
                  <Text style={styles.ordenarBtnTextMobile}>ORDENAR AHORA</Text>
                </TouchableOpacity>
              )}
            </View>

            <Image
              source={{
                uri: "https://res.cloudinary.com/dfuzfdrat/image/upload/q_auto/f_auto/v1775497342/Sin_t_%CC%B8tulo-2_Recuperado_fpjpzz.png",
              }}
              style={[styles.bannerImg, isDesktop && styles.bannerImgDesktop]}
              resizeMode="contain"
            />
          </View>
        </View>

        {!isDesktop && (
          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        )}

        {/* ── CATEGORÍAS ── */}
        <View
          style={[
            isDesktop ? styles.sectionDesktopWrap : styles.sectionMobileWrap,
            isDesktop && styles.centeredContainer,
          ]}
        >
          <View style={styles.catHeader}>
            <Text
              style={
                isDesktop
                  ? styles.sectionTitleDesktop
                  : styles.sectionTitleMobile
              }
            >
              {isDesktop ? "TODO POR CATEGORÍA" : "CATEGORÍA"}
            </Text>
            <TouchableOpacity
              style={
                isDesktop ? styles.todasBtnDesktop : styles.verTodoBtnMobile
              }
              onPress={() => setShowAllCats(v => !v)}
            >
              <Text
                style={
                  isDesktop
                    ? styles.todasBtnTextDesktop
                    : styles.verTodoTextMobile
                }
              >
                {showAllCats ? "CERRAR ▲" : (isDesktop ? "TODAS >" : "VER TODO")}
              </Text>
            </TouchableOpacity>
          </View>

          {isDesktop ? (
            <View style={styles.catRowDesktop}>
              {categories.map((cat, i) => (
                <TouchableOpacity key={i} style={styles.catItemDesktop}>
                  <Image
                    source={{ uri: cat.img }}
                    style={styles.catImgDesktop}
                    resizeMode="contain"
                  />
                  <Text style={styles.catLabelDesktop}>
                    {cat.label.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.catGridMobile}>
              {(showAllCats ? categories : categories.slice(0, 4)).map((cat, i) => (
                <TouchableOpacity key={i} style={styles.catItemMobile}>
                  <Image
                    source={{ uri: cat.img }}
                    style={styles.catImgMobile}
                    resizeMode="contain"
                  />
                  <View style={styles.catPillMobile}>
                    <Text style={styles.catPillTextMobile}>{cat.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── LO MÁS COMPRADO ── */}
        <View
          style={[
            { marginTop: isDesktop ? 40 : 20 },
            isDesktop && styles.centeredContainer,
          ]}
        >
          <Text
            style={[
              isDesktop
                ? styles.sectionTitleDesktop
                : styles.sectionTitleMobile,
              { marginBottom: 16, paddingHorizontal: isDesktop ? 0 : 16 },
            ]}
          >
            {isDesktop ? "LO MÁS COMPRADO" : "LO MÁS PEDIDO"}
          </Text>

          {isDesktop ? (
            // PC: scroll horizontal
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingBottom: 10 }}
            >
              {featuredProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  isDesktop={true}
                  cardWidth={desktopCardWidth}
                  onPress={() => setSelectedProduct(item)}
                />
              ))}
            </ScrollView>
          ) : (
            // Móvil: grid 2 columnas con wrap
            <View>
              {productsLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <ActivityIndicator size="large" color={RED} />
                  <Text style={{ color: "#aaa", marginTop: 10, fontSize: 13 }}>Cargando productos...</Text>
                </View>
              ) : productsError ? (
                <View style={{ alignItems: "center", paddingVertical: 28, paddingHorizontal: 24 }}>
                  <Ionicons name="wifi-outline" size={40} color="#ddd" />
                  <Text style={{ color: "#aaa", marginTop: 10, fontSize: 13, textAlign: "center" }}>{productsError}</Text>
                  <TouchableOpacity
                    onPress={reload}
                    style={{ marginTop: 14, backgroundColor: RED, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.mobileProductsGrid}>
                    {featuredProducts.slice(0, 8).map((item) => (
                      <ProductCard
                        key={item.id}
                        item={item}
                        isDesktop={false}
                        onPress={() => setSelectedProduct(item)}
                        cardWidth={mobileCardWidth}
                      />
                    ))}
                  </View>
                  {featuredProducts.length > 0 && (
                    <TouchableOpacity
                      style={{
                        marginHorizontal: 16, marginTop: 12, backgroundColor: RED,
                        borderRadius: 14, paddingVertical: 14,
                        alignItems: "center", flexDirection: "row",
                        justifyContent: "center", gap: 8,
                      }}
                      onPress={onStorePress}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="grid-outline" size={18} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14, letterSpacing: 1 }}>
                        VER TODOS LOS PRODUCTOS
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* ── CARRUSEL BANNERS PROMOCIONES (desde API) ── */}
        {promos.length > 0 && (
          <View style={[styles.promoCarouselContainer, isDesktop && styles.centeredContainer]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={isDesktop ? { gap: 20 } : styles.promoBannersScrollMobile}
            >
              {promos.map(p => (
                  <TouchableOpacity key={p.id} activeOpacity={0.92}>
                    <Image
                      source={{ uri: p.image_url }}
                      style={isDesktop ? styles.promoImgDesktop : styles.promoImgMobile}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}


        {/* ── SOLO PC: MARCAS DESTACADAS (carga desde Cloudinary) ── */}
        {isDesktop && (
          <View style={[styles.brandsSection, styles.centeredContainer]}>
            <Text style={styles.sectionTitleDesktop}>MARCAS DESTACADAS</Text>
            <View style={styles.brandsCarouselWrap}>
              <TouchableOpacity
                style={[styles.carouselArrow, { backgroundColor: RED }]}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.brandsScroll}
              >
                {BRANDS.map((brand, index) => (
                  <View key={index} style={styles.brandLogoWrap}>
                    <Image
                      source={{ uri: brand.img }}
                      style={styles.brandLogo}
                      resizeMode="contain"
                      // Cloudinary entrega imágenes optimizadas automáticamente
                    />
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.carouselArrow, { backgroundColor: RED }]}
              >
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── SOLO PC: BANNERS APP + DOMICILIO ── */}
        {isDesktop && (
          <View style={[styles.appPromoSection, styles.centeredContainer]}>
            <Image
              source={{
                uri: "https://res.cloudinary.com/TU_CLOUD/image/upload/banner-app.jpg",
              }}
              style={styles.appPromoBannerImg}
              resizeMode="cover"
            />
            <Image
              source={{
                uri: "https://res.cloudinary.com/TU_CLOUD/image/upload/banner-domicilio.jpg",
              }}
              style={styles.appPromoBannerImg}
              resizeMode="cover"
            />
          </View>
        )}

        {/* ── SOLO PC: FOOTER ── */}
        {isDesktop && (
          <View style={styles.footerContainer}>
            <View style={[styles.footerInner, styles.centeredContainer]}>
              {/* Columna 1: Logo + descripción + pagos */}
              <View style={styles.footerCol}>
                <View style={styles.footerLogoWrap}>
                  <Image source={require("../assets/images/logo.png")} style={styles.footerLogoImg} resizeMode="contain" />
                </View>
                <Text style={styles.footerDesc}>
                  Somos una distribuidora líder de productos esenciales,
                  destinada a satisfacer las necesidades de todo tipo de
                  negocios.
                </Text>
                <Text style={styles.footerSubtitle}>MÉTODOS DE PAGO</Text>
                <View style={styles.paymentMethodsRow}>
                  {["VISA", "MC", "AMEX"].map((p) => (
                    <View key={p} style={styles.payBadge}>
                      <Text style={styles.payBadgeText}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Columna 2: Políticas + newsletter */}
              <View style={styles.footerCol}>
                <Text style={styles.footerTitle}>POLÍTICAS DE LA TIENDA</Text>
                {[
                  "Políticas de entrega",
                  "Términos y Condiciones",
                  "Aviso de Privacidad",
                  "Devoluciones",
                ].map((l) => (
                  <Text key={l} style={styles.footerLink}>
                    {l}
                  </Text>
                ))}
                <Text style={[styles.footerTitle, { marginTop: 20 }]}>
                  Recibe ofertas exclusivas
                </Text>
                <View style={styles.newsletterRow}>
                  <TextInput
                    placeholder="Ingresa tu correo"
                    style={styles.newsletterInput}
                  />
                  <TouchableOpacity style={styles.newsletterBtn}>
                    <Text style={styles.newsletterBtnText}>Enviar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Columna 3: Links */}
              <View style={styles.footerCol}>
                <Text style={styles.footerTitle}>TODO PAL NEGOCIO</Text>
                {[
                  "Inicio",
                  "Productos",
                  "Ofertas",
                  "Cómo comprar",
                  "Quiénes somos",
                ].map((l) => (
                  <Text key={l} style={styles.footerLink}>
                    {l}
                  </Text>
                ))}
                <Text style={[styles.footerTitle, { marginTop: 20 }]}>
                  AYUDA
                </Text>
                <Text style={styles.footerLink}>Mi cuenta</Text>
              </View>

              {/* Columna 4: Contacto + redes */}
              <View style={styles.footerCol}>
                <Text style={styles.footerTitle}>CONTÁCTANOS</Text>
                <Text style={styles.footerLink}>Sucursales</Text>
                <Text style={[styles.footerLink, { fontWeight: "700" }]}>
                  atencionaclientes@todopalnegocio.com.mx
                </Text>
                <Text style={[styles.footerTitle, { marginTop: 20 }]}>
                  SÍGUENOS EN NUESTRAS REDES
                </Text>
                <View style={styles.socialRow}>
                  <Ionicons name="logo-facebook" size={24} color="#000" />
                  <Ionicons name="logo-tiktok" size={24} color="#000" />
                  <Ionicons name="logo-instagram" size={24} color="#000" />
                  <Ionicons name="logo-linkedin" size={24} color="#000" />
                </View>
              </View>
            </View>

            <View style={styles.footerBottomBar}>
              <Text style={styles.footerCopyright}>
                Copyright © TODO PAL NEGOCIO. Todos los derechos reservados.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <ProductDetailModal
        visible={!!selectedProduct}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: "#fff",
  },

  centeredContainer: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
  },

  // ── PC NAVBAR (sticky) ──────────────────────────────────────────────────────
  desktopNav: {
    backgroundColor: "#fff",
    zIndex: 200,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    ...Platform.select({ web: { position: "sticky", top: 0 } }),
  },
  desktopNavInner: {
    flexDirection: "row",
    alignItems: "center",
    height: 70,
    justifyContent: "space-between",
  },
  navLeft: { flexDirection: "row", alignItems: "center" },
  navLogo: {
    width: 44,
    height: 44,
    marginRight: 20,
  },
  navLink: { paddingHorizontal: 15 },
  navLinkText: { fontWeight: "700", fontSize: 14, color: "#333" },
  desktopSearch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 30,
    height: 45,
    marginHorizontal: 30,
    maxWidth: 600,
  },
  desktopSearchInput: { flex: 1, paddingHorizontal: 15, fontSize: 14, outlineWidth: 0 },
  desktopSearchBtn: {
    backgroundColor: "#333",
    width: 45,
    height: 45,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  navRight: { flexDirection: "row", alignItems: "center", gap: 15 },
  navIconBtn: { padding: 5 },
  navCartBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: RED,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  navCartBadgeText: { fontSize: 9, fontWeight: "900", color: "#fff" },
  navLocationWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    maxWidth: 200,
  },
  navLocationText: { fontSize: 11, color: "#555", flex: 1 },
  loginBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: "#eee" },
  loginText: { fontSize: 13, fontWeight: "800", color: RED },
  userNavBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "#f5f5f5" },
  userNavAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: RED, justifyContent: "center", alignItems: "center" },
  userNavAvatarText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  userNavName: { fontSize: 13, fontWeight: "700", color: "#333", maxWidth: 100 },

  // ── MÓVIL HEADER FIJO ────────────────────────────────────────────────────────
  mobileHeaderFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  mobileHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  mobileLocation: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  mobileWelcome: { fontSize: 12, fontWeight: "900", color: "#000" },
  mobileAddress: { fontSize: 10, color: "#666", fontWeight: "500" },
  mobileHeaderIcons: { flexDirection: "row", gap: 12 },
  headerIconBtn: { position: "relative" },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    backgroundColor: RED,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: RED,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  mobileSearchRow: { flexDirection: "row", gap: 10 },
  mobileSearch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    height: 42,
  },
  mobileSearchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    color: "#333",
    outlineWidth: 0,
  },
  filterBtn: {
    backgroundColor: RED,
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── BANNER ────────────────────────────────────────────────────────────────────
  banner: {
    backgroundColor: RED,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
  },
  bannerDesktop: {
    marginHorizontal: 0,
    borderRadius: 0,
    minHeight: 360,
    justifyContent: "center",
  },
  bannerInner: { flexDirection: "row", alignItems: "center", padding: 24 },
  bannerTextWrap: { flex: 1, zIndex: 2 },
  bannerLine1: { color: "#fff", fontSize: 16, fontWeight: "800" },
  bannerLine2: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
  },
  bannerLine3: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 18,
  },
  ordenarBtnMobile: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  ordenarBtnTextMobile: { color: RED, fontWeight: "900", fontSize: 13 },
  bannerImg: {
    width: 140,
    height: 110,
    position: "absolute",
    right: 8,
    bottom: 0,
  },
  bannerImgDesktop: {
    width: "42%",
    height: 360,
    position: "relative",
    right: 0,
  },
  bannerLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    maxWidth: 460,
    height: 50,
  },
  bannerLocationInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#333",
  },
  ordenarBtnDesktop: {
    backgroundColor: "#000",
    height: 50,
    paddingHorizontal: 28,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: "center",
  },
  ordenarBtnTextDesktop: { color: "#fff", fontWeight: "800", fontSize: 14 },
  cambiarUbicacionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginLeft: 15,
    gap: 16,
  },
  cambiarUbicacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cambiarUbicacionClear: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cambiarUbicacionText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // ── DOTS ─────────────────────────────────────────────────────────────────────
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 14,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RED,
    opacity: 0.4,
  },
  dotActive: { opacity: 1 },

  // ── SECCIONES ─────────────────────────────────────────────────────────────────
  sectionDesktopWrap: { marginTop: 36 },
  sectionMobileWrap: { paddingHorizontal: 16, marginTop: 4 },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleDesktop: {
    fontSize: 20,
    fontWeight: "900",
    color: "#222",
    textAlign: "center",
    flex: 1,
  },
  sectionTitleMobile: { fontSize: 15, fontWeight: "900", color: "#000" },
  todasBtnDesktop: {
    position: "absolute",
    right: 0,
    backgroundColor: RED,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  todasBtnTextDesktop: { color: "#fff", fontWeight: "800", fontSize: 12 },
  verTodoBtnMobile: {
    backgroundColor: RED,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verTodoTextMobile: { color: "#fff", fontWeight: "800", fontSize: 11 },

  // ── CATEGORÍAS ────────────────────────────────────────────────────────────────
  catGridMobile: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  catItemMobile: {
    width: "22%",
    alignItems: "center",
    paddingBottom: 18,
    position: "relative",
  },
  catImgMobile: { width: "100%", height: 68 },
  catPillMobile: {
    position: "absolute",
    bottom: 0,
    backgroundColor: RED,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  catPillTextMobile: { color: "#fff", fontSize: 9, fontWeight: "900" },
  catRowDesktop: {
    flexDirection: "row",
    paddingVertical: 10,
    marginHorizontal: -6,
  },
  catCarouselWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  carouselArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  catScrollDesktop: { gap: 16, paddingVertical: 10 },
  catItemDesktop: {
    flex: 1,
    minWidth: 0,
    height: 160,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eaeaea",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  catImgDesktop: { width: 72, height: 72, marginBottom: 10 },
  catLabelDesktop: {
    color: "#333",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  // ── PRODUCTOS GRID MÓVIL ──────────────────────────────────────────────────────
  mobileProductsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 16,
  },

  // ── PRODUCT CARD ──────────────────────────────────────────────────────────────
  cardMobile: {
    backgroundColor: "#f6f6f6",
    borderRadius: 14,
    padding: 12,
    marginBottom: 0,
    position: "relative",
  },
  cardBadgeMobile: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: RED,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  heartBtnMobile: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImgBgMobile: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  cardImgMobile: { width: "100%", height: 90 },
  cardInfoMobile: {},
  cardCatMobile: {
    fontSize: 9,
    color: "#aaa",
    fontWeight: "700",
    marginBottom: 4,
  },
  prodNameMobile: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000",
    marginBottom: 8,
  },
  cardFooterMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceMobile: { fontSize: 13, fontWeight: "900", color: RED },
  addBtnMobile: {
    backgroundColor: RED,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  cardDesktop: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eaeaea",
    borderRadius: 14,
    padding: 15,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: RED,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  heartBtn: { position: "absolute", top: 10, right: 10, zIndex: 1 },
  cardImgDesktop: { width: "100%", height: 110, marginBottom: 10 },
  cardCatDesktop: {
    fontSize: 10,
    color: "#bbb",
    fontWeight: "700",
    marginBottom: 2,
  },
  prodNameDesktop: {
    fontSize: 13,
    fontWeight: "800",
    color: "#222",
    marginBottom: 6,
  },
  priceDesktop: {
    fontSize: 13,
    fontWeight: "800",
    color: RED,
    marginBottom: 10,
  },
  cardFooterDesktop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  qtyBtn: { fontSize: 16, color: RED, fontWeight: "900", paddingHorizontal: 5 },
  qtyText: { fontSize: 13, fontWeight: "700", marginHorizontal: 6 },
  addBtnDesktop: {
    backgroundColor: RED,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── PROMOS ────────────────────────────────────────────────────────────────────
  promoCarouselContainer: { marginTop: 24, marginBottom: 30 },
  promoBannersScrollMobile: { paddingHorizontal: 16, gap: 14 },
  promoImgDesktop: {
    width: 480,
    height: 220,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  promoImgMobile: {
    width: 290,
    height: 135,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
  },

  // ── MARCAS (con Cloudinary) ───────────────────────────────────────────────────
  brandsSection: { paddingVertical: 30 },
  brandsCarouselWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  brandsScroll: { gap: 16, alignItems: "center", paddingHorizontal: 10 },
  brandLogoWrap: {
    width: 110,
    height: 60,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  brandLogo: { width: "100%", height: "100%" },

  // ── APP PROMO ─────────────────────────────────────────────────────────────────
  appPromoSection: { flexDirection: "row", gap: 20, marginBottom: 50 },
  appPromoBannerImg: {
    flex: 1,
    height: 260,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  footerContainer: {
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    width: "100%",
  },
  footerInner: {
    flexDirection: "row",
    paddingVertical: 50,
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 30,
  },
  footerCol: { flex: 1, minWidth: 200 },
  footerLogoWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  footerLogoImg: {
    width: 80,
    height: 50,
    marginBottom: 4,
  },
  footerBrandText: {
    fontSize: 17,
    fontWeight: "900",
    color: RED,
    lineHeight: 19,
  },
  footerDesc: { fontSize: 12, color: "#666", marginBottom: 18, lineHeight: 18 },
  footerSubtitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#333",
    marginBottom: 10,
  },
  paymentMethodsRow: { flexDirection: "row", gap: 8 },
  payBadge: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  payBadgeText: { fontSize: 10, fontWeight: "800", color: "#555" },
  footerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000",
    marginBottom: 12,
  },
  footerLink: { fontSize: 12, color: "#555", marginBottom: 8 },
  newsletterRow: { flexDirection: "row", marginTop: 5 },
  newsletterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
    backgroundColor: "#fff",
    outlineWidth: 0,
  },
  newsletterBtn: {
    backgroundColor: RED,
    paddingHorizontal: 18,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    justifyContent: "center",
  },
  newsletterBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  socialRow: { flexDirection: "row", gap: 14, marginTop: 6 },
  footerBottomBar: {
    backgroundColor: RED,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  footerCopyright: { fontSize: 12, color: "#fff", fontWeight: "600" },
});
