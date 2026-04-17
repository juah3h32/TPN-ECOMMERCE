import { Ionicons } from "@expo/vector-icons";
import { useRef, useState, useEffect, useCallback } from "react";
import { getStores } from "../services/api";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { WebView } from "react-native-webview";

const RED = "#e6192e";

// ─── SUCURSALES TPN ───────────────────────────────────────────────────────────
export const TPN_STORES = [
  { name: "20 de Noviembre", city: "Morelia", address: "Calle 20 de Noviembre #825", lat: 19.7061, lng: -101.1950 },
  { name: "Calle Zamora",    city: "Morelia", address: "Calle Zamora #395",           lat: 19.7074, lng: -101.1970 },
  { name: "TPN Zacapu",     city: "Zacapu",  address: "Calle Lic. Eduardo Ruiz #178",lat: 19.8248, lng: -101.7907 },
  { name: "TPN Uruapan",    city: "Uruapan", address: "Calle Sarabia #30",            lat: 19.4157, lng: -102.0573 },
  { name: "TPN Maravatío",  city: "Maravatío",address: "Calle Álvaro Obregón #206",  lat: 19.9092, lng: -100.4381 },
];

// ─── HAVERSINE: distancia entre dos coordenadas en km ────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestStore(lat, lng, storeList) {
  const list = storeList?.length ? storeList : TPN_STORES;
  return list.reduce((best, s) => {
    const d = haversineKm(lat, lng, s.lat, s.lng);
    return d < best.dist ? { ...s, dist: d } : best;
  }, { ...list[0], dist: haversineKm(lat, lng, list[0].lat, list[0].lng) });
}

// ─── HTML MAPA LEAFLET ────────────────────────────────────────────────────────
function getMapHTML(lat, lng) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="referrer" content="no-referrer">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%;overflow:hidden;}
  .leaflet-control-attribution{font-size:9px;}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var lat=${lat}, lng=${lng};
  var map = L.map('map', {zoomControl:false}).setView([lat,lng], 15);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    maxZoom:19,
    subdomains:'abcd',
    attribution:'© <a href="https://carto.com/attributions">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  }).addTo(map);
  L.control.zoom({position:'bottomright'}).addTo(map);

  var icon = L.divIcon({
    html: '<div style="width:26px;height:26px;background:#e6192e;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4);position:relative;"><div style="position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:12px solid #e6192e;"></div></div>',
    iconSize:[26,38],
    iconAnchor:[13,38],
    className:''
  });

  var marker = L.marker([lat,lng], {icon:icon, draggable:true}).addTo(map);

  function send(la, ln){
    var msg = JSON.stringify({lat:la, lng:ln});
    try{ window.ReactNativeWebView.postMessage(msg); }catch(e){
      try{ window.parent.postMessage(msg,'*'); }catch(e2){}
    }
  }

  marker.on('dragend', function(e){
    var p = e.target.getLatLng();
    send(p.lat, p.lng);
  });

  map.on('click', function(e){
    marker.setLatLng(e.latlng);
    map.panTo(e.latlng);
    send(e.latlng.lat, e.latlng.lng);
  });

  // Recibir pan desde RN
  function handleMsg(e){
    try{
      var d = JSON.parse(typeof e.data === 'string' ? e.data : '{}');
      if(d.lat && d.lng){
        marker.setLatLng([d.lat, d.lng]);
        map.flyTo([d.lat, d.lng], 15, {duration:0.8});
      }
    }catch(err){}
  }
  document.addEventListener('message', handleMsg);
  window.addEventListener('message', handleMsg);
</script>
</body>
</html>`;
}

// ─── BÚSQUEDA CON NOMINATIM ───────────────────────────────────────────────────
// viewbox cubre Michoacán y zonas cercanas (oeste MX)
const MX_VIEWBOX = "-103.8,18.9,-99.8,20.5";

async function searchNominatim(query) {
  // Si el query ya menciona ciudad o estado, no añadir contexto
  const needsContext = !/michoacán|michoacan|morelia|uruapan|zacapu|maravat/i.test(query);
  const q = needsContext ? `${query}, Michoacán, México` : query;

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "6",
    "accept-language": "es",
    countrycodes: "mx",
    viewbox: MX_VIEWBOX,
    bounded: "1",          // solo resultados dentro del viewbox
    addressdetails: "1",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "User-Agent": "TPN-App/1.0", Accept: "application/json" } }
  );
  const data = await res.json();

  // Si bounded no devuelve nada, reintentar sin bounded (por si escribió otra ciudad de MX)
  if (!data.length) {
    const params2 = new URLSearchParams({
      q,
      format: "json",
      limit: "6",
      "accept-language": "es",
      countrycodes: "mx",
      addressdetails: "1",
    });
    const res2 = await fetch(
      `https://nominatim.openstreetmap.org/search?${params2}`,
      { headers: { "User-Agent": "TPN-App/1.0", Accept: "application/json" } }
    );
    return res2.json();
  }

  return data;
}

async function reverseNominatim(lat, lng) {
  // zoom=18 → nivel de número de casa/calle (más preciso que zoom=16 barrio)
  const url =
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es&zoom=18&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TPN-App/1.0", Accept: "application/json" },
  });
  return res.json();
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function LocationPickerModal({
  visible,
  onClose,
  onConfirm,
  currentCoords,       // { lat, lng } del GPS actual
  businessCoords,      // ignorado — se usa TPN_STORES para distancias
  popup = false,       // true → Modal transparente (PC), false → Modal fullscreen
}) {
  const webViewRef = useRef(null);
  const searchTimer = useRef(null);
  const openedAt = useRef(0); // para evitar que el backdrop cierre al mismo click que abre

  const defaultLat = currentCoords?.latitude ?? currentCoords?.lat ?? 19.7044;
  const defaultLng = currentCoords?.longitude ?? currentCoords?.lng ?? -101.2262;

  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedCoords, setSelectedCoords] = useState({ lat: defaultLat, lng: defaultLng });
  const [reverseLoading, setReverseLoading] = useState(false);
  const [nearestStore, setNearestStore] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [stores, setStores] = useState(TPN_STORES);

  // Cargar sucursales desde la BD una sola vez
  useEffect(() => {
    getStores()
      .then((res) => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setStores(res.data.map((s) => ({
            ...s,
            lat: parseFloat(s.lat),
            lng: parseFloat(s.lng),
          })));
        }
      })
      .catch(() => {}); // usa TPN_STORES como fallback
  }, []);

  useEffect(() => {
    if (visible) {
      openedAt.current = Date.now();
      setSearchText("");
      setResults([]);
      setSelectedAddress("");
      setNearestStore(null);
      setMapReady(false);
      const lat = currentCoords?.latitude ?? currentCoords?.lat ?? defaultLat;
      const lng = currentCoords?.longitude ?? currentCoords?.lng ?? defaultLng;
      setSelectedCoords({ lat, lng });
      doReverse(lat, lng);
    }
  }, [visible]);

  const doReverse = async (lat, lng) => {
    setReverseLoading(true);
    try {
      const data = await reverseNominatim(lat, lng);
      if (data?.display_name) {
        const short = buildShortAddress(data);
        setSelectedAddress(short);
      }
    } catch {}
    // Siempre calcular la sucursal más cercana
    const store = findNearestStore(lat, lng, stores);
    setNearestStore(store);
    setReverseLoading(false);
  };

  function buildShortAddress(data) {
    const a = data.address || {};
    // "Calle Nombre 123, Colonia, Ciudad"
    const street = [
      a.road || a.pedestrian || a.path || a.footway,
      a.house_number,
    ].filter(Boolean).join(" ");
    const parts = [
      street,
      a.suburb || a.neighbourhood || a.quarter || a.village,
      a.city || a.town || a.municipality,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : data.display_name;
  }

  // Formatea el label del resultado de búsqueda: "Calle, Colonia, Ciudad"
  // Omite país y estado para mantenerlo corto y local
  const formatResultLabel = (item) => {
    const a = item.address || {};
    const line1 = [
      a.road || a.pedestrian || a.path || a.neighbourhood || a.suburb,
      a.house_number,
    ].filter(Boolean).join(" ");
    const line2 = [
      a.suburb || a.neighbourhood || a.quarter,
      a.city || a.town || a.village || a.municipality,
    ].filter(Boolean).join(", ");
    const parts = [line1, line2].filter(Boolean);
    return parts.length ? parts.join(", ") : item.display_name.split(",").slice(0, 3).join(",").trim();
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    clearTimeout(searchTimer.current);
    if (text.length < 3) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchNominatim(text);
        setResults(data || []);
      } catch {}
      setSearching(false);
    }, 400);
  };

  const selectResult = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setSelectedCoords({ lat, lng });
    const short = formatResultLabel(item);
    setSelectedAddress(short || item.display_name);
    setSearchText("");
    setResults([]);
    setNearestStore(findNearestStore(lat, lng, stores));
    // Mover el mapa
    panMap(lat, lng);
  };

  const panMap = (lat, lng) => {
    const js = `(function(){
      var e = new MessageEvent('message', {data: JSON.stringify({lat:${lat},lng:${lng}})});
      window.dispatchEvent(e);
    })(); true;`;
    webViewRef.current?.injectJavaScript(js);
  };

  const handleWebViewMessage = (event) => {
    try {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      setSelectedCoords({ lat, lng });
      doReverse(lat, lng);
    } catch {}
  };

  const confirm = () => {
    if (!selectedAddress) return;
    onConfirm(selectedAddress, selectedCoords);
    onClose();
  };

  const distance = nearestStore?.dist ?? null;

  const formatDistance = (d) => {
    if (d === null) return "";
    if (d < 1) return `${Math.round(d * 1000)} m`;
    return `${d.toFixed(1)} km`;
  };

  const gpsAction = () => {
    const lat = currentCoords?.latitude ?? currentCoords?.lat;
    const lng = currentCoords?.longitude ?? currentCoords?.lng;
    if (lat && lng) {
      setSelectedCoords({ lat, lng });
      doReverse(lat, lng);
      panMap(lat, lng);
    }
  };

  // ── Sección búsqueda ──────────────────────────────────────────────────────
  const searchSection = (compact) => (
    <>
      <View style={[styles.searchWrap, compact && { margin: 10, height: 42 }]}>
        <Ionicons name="search" size={18} color={RED} style={{ marginLeft: 14 }} />
        <TextInput
          value={searchText}
          onChangeText={handleSearchChange}
          placeholder="Busca tu calle, colonia o ciudad..."
          placeholderTextColor="#bbb"
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searching ? (
          <ActivityIndicator size="small" color={RED} style={{ marginRight: 12 }} />
        ) : searchText.length > 0 ? (
          <TouchableOpacity onPress={() => { setSearchText(""); setResults([]); }} style={{ marginRight: 12 }}>
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </TouchableOpacity>
        ) : null}
      </View>

      {results.length > 0 && (
        <View style={[styles.resultsList, compact && { marginHorizontal: 10 }]}>
          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => selectResult(item)}>
                <Ionicons name="location-outline" size={16} color={RED} style={{ marginRight: 10, marginTop: 2 }} />
                <Text style={styles.resultText} numberOfLines={2}>{formatResultLabel(item)}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.resultSep} />}
          />
        </View>
      )}
    </>
  );

  // ── Sección mapa ──────────────────────────────────────────────────────────
  const mapSection = (mapHeight) => (
    <View style={[styles.mapWrap, mapHeight && { height: mapHeight, flex: 0 }]}>
      <WebView
        ref={webViewRef}
        source={{ html: getMapHTML(defaultLat, defaultLng) }}
        onMessage={handleWebViewMessage}
        onLoad={() => setMapReady(true)}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        allowUniversalAccessFromFileURLs
        scrollEnabled={false}
        bounces={false}
        allowsInlineMediaPlayback
        mixedContentMode="always"
      />
      {!mapReady && (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color={RED} />
          <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
        </View>
      )}
      {mapReady && (
        <View style={styles.mapHintWrap} pointerEvents="none">
          <View style={styles.mapHintPill}>
            <Ionicons name="hand-left-outline" size={13} color="#555" />
            <Text style={styles.mapHintText}>Toca el mapa o arrastra el pin</Text>
          </View>
        </View>
      )}
    </View>
  );

  // ── Panel inferior ────────────────────────────────────────────────────────
  const bottomSection = (compact) => (
    <View style={[styles.bottomPanel, compact && { paddingBottom: 14, paddingTop: 12, gap: 8 }]}>
      {reverseLoading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" color={RED} />
          <Text style={{ color: "#aaa", fontSize: 13 }}>Obteniendo dirección...</Text>
        </View>
      ) : (
        <View style={styles.selectedRow}>
          <View style={styles.pinIconWrap}>
            <Ionicons name="location-sharp" size={22} color={RED} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedLabel}>Dirección de entrega</Text>
            <Text style={[styles.selectedAddress, compact && { fontSize: 13 }]} numberOfLines={2}>
              {selectedAddress || "Selecciona un punto en el mapa"}
            </Text>
            {distance !== null && nearestStore && (
              <View style={styles.distanceRow}>
                <Ionicons name="storefront-outline" size={13} color="#888" />
                <Text style={styles.distanceText}>
                  {nearestStore.name}
                  <Text style={{ color: "#bbb" }}> · </Text>
                  {formatDistance(distance)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {compact ? (
        // PC popup: botones en fila
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={[styles.gpsBtn, { flex: 1, justifyContent: "center", paddingVertical: 12 }]} onPress={gpsAction}>
            <Ionicons name="navigate" size={15} color={RED} />
            <Text style={styles.gpsBtnText}>Mi ubicación</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, !selectedAddress && styles.confirmBtnDisabled, { flex: 2, paddingVertical: 12 }]}
            onPress={confirm}
            disabled={!selectedAddress}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={[styles.confirmText, { fontSize: 13 }]}>CONFIRMAR</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Móvil: botones apilados
        <>
          <TouchableOpacity style={styles.gpsBtn} onPress={gpsAction}>
            <Ionicons name="navigate" size={15} color={RED} />
            <Text style={styles.gpsBtnText}>Usar mi ubicación actual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, !selectedAddress && styles.confirmBtnDisabled]}
            onPress={confirm}
            disabled={!selectedAddress}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.confirmText}>CONFIRMAR DIRECCIÓN</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  // ── Modo popup PC — Modal transparente para evitar clipping ───────────────
  if (popup) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.popupBackdrop}
          onPress={() => { if (Date.now() - openedAt.current > 400) onClose(); }}
          activeOpacity={1}
        >
          <View
            onStartShouldSetResponder={() => true}
            onResponderGrant={() => {}}
            style={styles.popupCard}
            {...(Platform.OS === "web" ? { onClick: (e) => e.stopPropagation() } : {})}
          >
            <View style={styles.popupHeader}>
              <Text style={styles.headerTitle}>¿Dónde te entregamos?</Text>
              <TouchableOpacity onPress={onClose} style={styles.popupCloseBtn}>
                <Ionicons name="close" size={18} color="#555" />
              </TouchableOpacity>
            </View>
            {searchSection(true)}
            {mapSection(220)}
            {bottomSection(true)}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  // ── Modo fullscreen móvil ─────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>¿Dónde te entregamos?</Text>
          <View style={{ width: 40 }} />
        </View>
        {searchSection(false)}
        {mapSection(null)}
        {bottomSection(false)}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
  },

  // ── Popup PC ──────────────────────────────────────────────────────────────
  popupBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  popupCard: {
    width: 460,
    maxWidth: "95%",
    borderRadius: 18,
    backgroundColor: "#fff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 24,
  },
  popupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  popupCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },

  // Búsqueda
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#222",
  },

  // Resultados
  resultsList: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    maxHeight: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  resultText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },
  resultSep: {
    height: 1,
    backgroundColor: "#f5f5f5",
    marginLeft: 42,
  },

  // Mapa
  mapWrap: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  mapLoadingText: { fontSize: 13, color: "#aaa", marginTop: 8 },
  mapHintWrap: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
  },
  mapHintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  mapHintText: { fontSize: 12, color: "#555", fontWeight: "600" },

  // Panel inferior
  bottomPanel: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
    gap: 12,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  pinIconWrap: {
    marginTop: 2,
  },
  selectedLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  selectedAddress: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    lineHeight: 20,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  distanceText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#eee",
    alignSelf: "flex-start",
  },
  gpsBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: RED,
  },
  confirmBtn: {
    backgroundColor: RED,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: "#ddd",
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.8,
  },
});
