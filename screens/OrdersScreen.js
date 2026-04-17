import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
// WebView solo disponible en nativo
let WebView = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}
import { useAuth } from "../context/AuthContext";
import { getUserOrders, getOrderTracking, MAPBOX_TOKEN } from "../services/api";

const RED = "#e6192e";
const YELLOW = "#fede33";
const BLUE = "#3b82f6";
const GREEN = "#22c55e";

const STATUS_MAP = {
  pending:    { label: "Pendiente",   style: "preparando" },
  accepted:   { label: "Aceptado",    style: "preparando" },
  preparing:  { label: "Preparando",  style: "preparando" },
  picked_up:  { label: "Recogido",    style: "en_camino"  },
  on_the_way: { label: "En camino",   style: "en_camino"  },
  shipped:    { label: "En camino",   style: "en_camino"  },
  delivered:  { label: "Entregado",   style: "entregado"  },
  cancelled:  { label: "Cancelado",   style: "cancelado"  },
};

const STATUS_STYLES = {
  entregado:  { bg: "#f0fdf4", color: GREEN, icon: "checkmark-circle" },
  en_camino:  { bg: "#eff6ff", color: BLUE,  icon: "bicycle"          },
  preparando: { bg: "#fffbeb", color: "#f59e0b", icon: "time"             },
  cancelado:  { bg: "#fff1f2", color: RED,        icon: "close-circle"    },
};

// ─── COMPONENTE DE MAPA DE RASTREO ───────────────────────────────────────────
function TrackingMap({ order, onBack }) {
  const { user } = useAuth();
  const [trackingData, setTrackingData] = useState(null);
  const [eta, setEta] = useState(null);
  const [km, setKm] = useState(null);
  const [traffic, setTraffic] = useState(null); // "fluido" | "lento" | "congestionado"
  const webViewRef = useRef(null);
  const iframeRef = useRef(null);
  const timerRef = useRef(null);
  const mapReadyRef = useRef(false);
  const pendingDataRef = useRef(null);

  // Envía comando al mapa (funciona en WebView nativo e iframe web)
  const sendToMap = useCallback((cmd) => {
    const msg = JSON.stringify(cmd);
    if (Platform.OS !== "web" && webViewRef.current) {
      webViewRef.current.injectJavaScript(`receiveCmd(${msg});`);
    } else if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, "*");
    }
  }, []);

  const injectMapData = useCallback((data) => {
    const status = data.status || order.status;
    const destLat = parseFloat(data.dest_lat) || 19.7044;
    const destLng = parseFloat(data.dest_lng) || -101.2262;
    const sLat = parseFloat(data.store_lat) || 0;
    const sLng = parseFloat(data.store_lng) || 0;
    const hasDriver = !!(data.delivery_lat && data.delivery_lng);

    sendToMap({ cmd: "init", destLat, destLng, sLat, sLng, status });

    if (hasDriver) {
      sendToMap({
        cmd: "driver",
        dLat: parseFloat(data.delivery_lat),
        dLng: parseFloat(data.delivery_lng),
        destLat, destLng, sLat, sLng, status,
      });
    }
  }, [order.status, sendToMap]);

  const fetchTracking = useCallback(async () => {
    try {
      const res = await getOrderTracking(order.id, user.token);
      if (res?.success && res.data) {
        setTrackingData(res.data);
        if (mapReadyRef.current) {
          injectMapData(res.data);
        } else {
          pendingDataRef.current = res.data;
        }
      }
    } catch {}
  }, [order.id, user?.token, injectMapData]);

  useEffect(() => {
    fetchTracking();
    timerRef.current = setInterval(fetchTracking, 15000);
    return () => clearInterval(timerRef.current);
  }, [fetchTracking]);

  const handleMapReady = () => {
    mapReadyRef.current = true;
    if (pendingDataRef.current) {
      injectMapData(pendingDataRef.current);
      pendingDataRef.current = null;
    }
  };

  const handleMessage = (event) => {
    try {
      const raw = event?.nativeEvent?.data ?? event?.data;
      const data = JSON.parse(raw);
      if (data.type === "eta") {
        setEta(data.value);
        if (data.km) setKm(data.km);
        if (data.traffic) setTraffic(data.traffic);
      }
      if (data.type === "ready") handleMapReady();
    } catch {}
  };

  // Web: escuchar mensajes del iframe
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e) => handleMessage(e);
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const currentStatus = trackingData?.status || order.status;

  const trafficColor = { fluido: "#22c55e", lento: "#f59e0b", congestionado: "#e6192e" }[traffic];
  const trafficLabel = { fluido: "Tráfico fluido", lento: "Tráfico moderado", congestionado: "Tráfico intenso" }[traffic];

  // HTML Mapbox GL JS estilo Uber — navigation-day-v1
  const mapHtml = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body,#map{width:100%;height:100vh;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,sans-serif;}

/* ── Moto (repartidor) ── */
.driver-wrap{
  width:48px;height:48px;
  filter:drop-shadow(0 4px 12px rgba(0,0,0,0.30));
}
.driver-bg{
  width:48px;height:48px;border-radius:50%;
  background:#000;border:3px solid #fff;
  display:flex;align-items:center;justify-content:center;
  animation:driverPulse 2.5s ease-in-out infinite;
}
.driver-bg svg{width:26px;height:26px;fill:#fff;}
@keyframes driverPulse{
  0%,100%{transform:scale(1);}
  50%{transform:scale(1.08);}
}

/* ── Pin destino — persona recibiendo ── */
.dest-wrap{display:flex;flex-direction:column;align-items:center;}
.dest-circle{
  width:52px;height:52px;border-radius:50%;
  background:#111;border:3px solid #fff;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 16px rgba(0,0,0,0.40);
}
.dest-circle svg{width:28px;height:28px;fill:#fff;}
.dest-tail{
  width:0;height:0;
  border-left:7px solid transparent;
  border-right:7px solid transparent;
  border-top:10px solid #111;
  margin-top:-2px;
}
.dest-label{
  background:#111;color:#fff;
  font-size:9px;font-weight:800;
  padding:2px 8px;border-radius:8px;
  margin-top:4px;white-space:nowrap;letter-spacing:0.3px;
  box-shadow:0 2px 6px rgba(0,0,0,0.25);
}

/* ── Pin tienda — rojo TPN ── */
.store-wrap{display:flex;flex-direction:column;align-items:center;}
.store-pin{
  background:#e6192e;
  border-radius:18px;
  width:54px;height:54px;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 18px rgba(230,25,46,0.50);
  border:3px solid #fff;
}
.store-pin svg{width:30px;height:30px;fill:#fff;}
.store-label{
  background:#e6192e;color:#fff;
  font-size:9px;font-weight:800;
  padding:2px 8px;border-radius:8px;
  margin-top:4px;white-space:nowrap;letter-spacing:0.5px;
  box-shadow:0 2px 8px rgba(230,25,46,0.35);
}

/* Ocultar branding Mapbox */
.mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important;}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
<script>
mapboxgl.accessToken='${MAPBOX_TOKEN}';

var map=new mapboxgl.Map({
  container:'map',
  // Estilo Navigation Day = idéntico a Uber/Waze (calles claras, edificios, sin ruido visual)
  style:'mapbox://styles/juanpa1829/cmo21o95r001l01s5cd8z3n6u',
  center:[-101.2262,19.7044],
  zoom:14,
  pitch:0,
  bearing:0,
  attributionControl:false
});

var driverMarker=null,destMarker=null,storeMarker=null;
var ROUTE_SRC='route',ROUTE_CASE='route-case',ROUTE_FILL='route-fill';

/* ── Comunicación ── */
function postMsg(o){
  var s=JSON.stringify(o);
  try{window.ReactNativeWebView.postMessage(s);}catch(e){
    try{window.parent.postMessage(s,'*');}catch(e2){}
  }
}
function receiveCmd(d){
  if(d.cmd==='init')   cmdInit(d);
  if(d.cmd==='driver') cmdDriver(d);
}
window.addEventListener('message',function(e){try{receiveCmd(JSON.parse(e.data));}catch(_){}});

/* ── Iconos SVG ── */
function makeDriverEl(){
  var w=document.createElement('div');
  w.className='driver-wrap';
  w.innerHTML='<div class="driver-bg">'
    +'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
    +'<path d="M19 7c0-1.1-.9-2-2-2h-3l2 4h3c.55 0 1-.45 1-1v-1zm-7-2l-2 4h4l2-4h-4zM5 7c0 .55.45 1 1 1h3l2-4H8C6.9 4 6 4.9 6 6v1H4.5C3.12 7 2 8.12 2 9.5V12h2v1.5C4 14.88 5.12 16 6.5 16S9 14.88 9 13.5V12h6v1.5c0 1.38 1.12 2.5 2.5 2.5S20 14.88 20 13.5V12h2V9.5C22 8.12 20.88 7 19.5 7H5z"/>'
    +'</svg></div>';
  return w;
}
function makeDestEl(){
  var w=document.createElement('div');
  w.className='dest-wrap';
  // Persona recibiendo paquete
  w.innerHTML='<div class="dest-circle">'
    +'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
    +'<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-4 0-7 1.79-7 4v1h14v-1c0-2.21-3-4-7-4z"/>'
    +'</svg></div>'
    +'<div class="dest-tail"></div>'
    +'<div class="dest-label">TU PEDIDO</div>';
  return w;
}
function makeStoreEl(){
  var w=document.createElement('div');
  w.className='store-wrap';
  // Ícono tienda estilo TPN (bolsa de compras)
  w.innerHTML='<div class="store-pin">'
    +'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
    +'<path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-2.76 0-5-2.24-5-5h2c0 1.66 1.34 3 3 3s3-1.34 3-3h2c0 2.76-2.24 5-5 5z"/>'
    +'</svg></div>'
    +'<div class="store-label">TIENDA</div>';
  return w;
}

/* ── Ruta ── */
function setRoute(geojson, color){
  ['route-shadow',ROUTE_CASE,ROUTE_FILL].forEach(function(id){
    if(map.getLayer(id)) map.removeLayer(id);
  });
  if(map.getSource(ROUTE_SRC)) map.removeSource(ROUTE_SRC);

  map.addSource(ROUTE_SRC,{type:'geojson',data:{type:'Feature',geometry:geojson}});
  // Sombra difusa (profundidad) — desaparece lejos
  map.addLayer({id:'route-shadow',type:'line',source:ROUTE_SRC,
    layout:{'line-cap':'round','line-join':'round'},
    paint:{
      'line-color':'rgba(255,255,255,0.07)',
      'line-width':['interpolate',['linear'],['zoom'],9,0,11,4,14,14,17,22],
      'line-blur':4
    }
  });
  // Casing oscuro
  map.addLayer({id:ROUTE_CASE,type:'line',source:ROUTE_SRC,
    layout:{'line-cap':'round','line-join':'round'},
    paint:{
      'line-color':'rgba(0,0,0,0.50)',
      'line-width':['interpolate',['linear'],['zoom'],9,0,11,3,14,10,17,16]
    }
  });
  // Línea principal
  map.addLayer({id:ROUTE_FILL,type:'line',source:ROUTE_SRC,
    layout:{'line-cap':'round','line-join':'round'},
    paint:{
      'line-color':color,
      'line-width':['interpolate',['linear'],['zoom'],9,0,11,2,14,6,17,10]
    }
  });
}

function fitBounds(pts,pad){
  if(!pts||pts.length<2) return;
  var b=new mapboxgl.LngLatBounds();
  pts.forEach(function(p){b.extend(p);});
  map.fitBounds(b,{padding:pad||{top:90,bottom:310,left:70,right:70},maxZoom:15,duration:1200,essential:true});
}

/* ── Directions API con tráfico ── */
function fetchRoute(fLng,fLat,tLng,tLat,status,onDone){
  var url='https://api.mapbox.com/directions/v5/mapbox/driving-traffic/'
    +fLng+','+fLat+';'+tLng+','+tLat
    +'?access_token=${MAPBOX_TOKEN}'
    +'&geometries=geojson&overview=full&steps=false&language=es'
    +'&annotations=congestion,duration,distance';
  fetch(url)
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.routes||!d.routes[0]) return;
      var route=d.routes[0];
      var mins=Math.ceil(route.duration/60);
      var km=(route.distance/1000).toFixed(1);

      var cong=(route.legs&&route.legs[0]&&route.legs[0].annotation&&route.legs[0].annotation.congestion)||[];
      var heavy=cong.filter(function(c){return c==='heavy'||c==='severe';}).length;
      var mod=cong.filter(function(c){return c==='moderate';}).length;
      var trf='fluido';
      if(heavy>6||cong.filter(function(c){return c==='severe';}).length>3) trf='congestionado';
      else if(mod>12||heavy>2) trf='lento';

      postMsg({type:'eta',value:mins,km:km,traffic:trf});

      // Colores sobre mapa oscuro estilo Uber
      var col='#ffffff';
      if(status==='accepted')        col='#fbbf24';
      else if(trf==='congestionado') col='#ef4444';
      else if(trf==='lento')         col='#f97316';

      if(map.isStyleLoaded()) setRoute(route.geometry,col);
      else map.once('load',function(){setRoute(route.geometry,col);});
      if(onDone) onDone();
    })
    .catch(function(){});
}

/* ── Comandos ── */
function cmdInit(d){
  if(destMarker) destMarker.remove();
  destMarker=new mapboxgl.Marker({element:makeDestEl(),anchor:'bottom'})
    .setLngLat([d.destLng,d.destLat]).addTo(map);

  var hasStore=d.sLat!==0&&d.sLng!==0;
  if(hasStore){
    if(storeMarker) storeMarker.remove();
    storeMarker=new mapboxgl.Marker({element:makeStoreEl(),anchor:'bottom'})
      .setLngLat([d.sLng,d.sLat]).addTo(map);
    if(!driverMarker){
      fetchRoute(d.sLng,d.sLat,d.destLng,d.destLat,d.status,function(){
        fitBounds([[d.destLng,d.destLat],[d.sLng,d.sLat]]);
      });
    }
  } else {
    if(!driverMarker) map.flyTo({center:[d.destLng,d.destLat],zoom:15,duration:1200});
  }
}

function cmdDriver(d){
  if(!driverMarker){
    driverMarker=new mapboxgl.Marker({element:makeDriverEl(),anchor:'center'})
      .setLngLat([d.dLng,d.dLat]).addTo(map);
  } else {
    // Movimiento suave del marcador
    driverMarker.setLngLat([d.dLng,d.dLat]);
  }
  var hasStore=d.sLat!==0&&d.sLng!==0;
  var tLng=(d.status==='accepted'&&hasStore)?d.sLng:d.destLng;
  var tLat=(d.status==='accepted'&&hasStore)?d.sLat:d.destLat;
  fetchRoute(d.dLng,d.dLat,tLng,tLat,d.status,function(){
    var pts=[[d.dLng,d.dLat],[tLng,tLat]];
    if(hasStore&&d.status!=='accepted') pts.push([d.sLng,d.sLat]);
    fitBounds(pts);
  });
}

map.on('load',function(){
  postMsg({type:'ready'});
});
</script>
</body>
</html>`;

  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.trackingContainer}>
      <View style={styles.trackingHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.trackingTitle}>Rastreando #{String(order.id).padStart(6,"0")}</Text>
          <Text style={styles.trackingStatus}>
            {STATUS_MAP[currentStatus]?.label || "En proceso"}
          </Text>
        </View>
        {eta && (
          <View style={styles.etaBadge}>
            <Text style={styles.etaTime}>{eta} min</Text>
            <Text style={styles.etaLabel}>Llegada</Text>
          </View>
        )}
      </View>

      {isWeb ? (
        <iframe
          ref={iframeRef}
          srcDoc={mapHtml}
          style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
          onLoad={handleMapReady}
        />
      ) : WebView ? (
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          onMessage={handleMessage}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          originWhitelist={["*"]}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#aaa" }}>Mapa no disponible</Text>
        </View>
      )}

      {/* Footer estilo TaxiGo/Uber */}
      <View style={styles.trackingFooter}>
        {/* Fila superior: info repartidor + ETA grande */}
        <View style={styles.footerTop}>
          {/* Avatar + datos repartidor */}
          <View style={[styles.driverAvatarCircle,
            currentStatus === "accepted" && { backgroundColor: "#f59e0b" }]}>
            <Ionicons
              name={currentStatus === "accepted" ? "storefront" : "bicycle"}
              size={24} color="#fff"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.driverName}>
              {trackingData?.driver_name || "Repartidor TPN"}
            </Text>
            {/* Estrellas */}
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map((i) => (
                <Ionicons key={i} name="star" size={12} color={YELLOW} />
              ))}
              <Text style={styles.ratingVal}>4.8</Text>
            </View>
            <Text style={styles.driverRole}>
              {currentStatus === "accepted" ? "En tienda recogiendo" :
               currentStatus === "picked_up" ? "Pedido recogido" :
               currentStatus === "on_the_way" ? "En camino a tu dirección" : "Procesando pedido"}
            </Text>
          </View>
          {/* ETA block */}
          <View style={styles.etaBlock}>
            <Text style={styles.etaBigNum}>{eta || "—"}</Text>
            <Text style={styles.etaBigLabel}>MIN</Text>
          </View>
        </View>

        {/* Tienda origen */}
        {trackingData?.store_name && (
          <View style={styles.storeInfoRow}>
            <View style={styles.storeInfoIcon}>
              <Ionicons name="storefront" size={14} color={RED} />
            </View>
            <Text style={styles.storeInfoText}>
              Enviado desde <Text style={styles.storeInfoName}>{trackingData.store_name}</Text>
            </Text>
          </View>
        )}

        {/* Fila inferior: km + tráfico + llamar */}
        <View style={styles.footerBottom}>
          <View style={styles.kmBlock}>
            <Ionicons name="navigate-outline" size={13} color="#999" />
            <Text style={styles.kmText}>{km ? `${km} km` : "Calculando..."}</Text>
          </View>
          {traffic ? (
            <View style={[styles.trafficPill, { backgroundColor: trafficColor + "22", borderColor: trafficColor }]}>
              <View style={[styles.trafficDot, { backgroundColor: trafficColor }]} />
              <Text style={[styles.trafficText, { color: trafficColor }]}>{trafficLabel}</Text>
            </View>
          ) : (
            <Text style={styles.etaSubText}>Calculando tráfico...</Text>
          )}
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call" size={18} color={GREEN} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function OrderCard({ order, onTrack }) {
  const mapped = STATUS_MAP[order.status] || { label: order.status || "Pendiente", style: "preparando" };
  const s = STATUS_STYLES[mapped.style];
  const [expanded, setExpanded] = useState(false);

  const canTrack = ["accepted", "shipped", "on_the_way", "picked_up"].includes(order.status);

  return (
    <TouchableOpacity
      style={styles.orderCard}
      activeOpacity={0.85}
      onPress={() => setExpanded((v) => !v)}
    >
      <View style={styles.orderCardHeader}>
        <View>
          <Text style={styles.orderId}>#{String(order.id).padStart(6, "0")}</Text>
          <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
          <Ionicons name={s.icon} size={12} color={s.color} />
          <Text style={[styles.statusText, { color: s.color }]}>{mapped.label}</Text>
        </View>
      </View>

      <View style={styles.orderDivider} />

      <View style={styles.orderCardFooter}>
        <View style={styles.orderMeta}>
          <Ionicons name="cube-outline" size={14} color="#aaa" />
          <Text style={styles.orderMetaText}>
            {order.items_count ?? order.items?.length ?? 0} productos
          </Text>
        </View>
        <View style={styles.orderMetaRight}>
          <Text style={styles.orderTotal}>${parseFloat(order.total || 0).toFixed(2)}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#ddd" />
        </View>
      </View>

      {/* Detalle expandible */}
      {expanded && (
        <View style={styles.itemsList}>
          {Array.isArray(order.items) && order.items.map((item, i) => (
            <View key={i} style={styles.orderItem}>
              <Text style={styles.orderItemName} numberOfLines={1}>{item.product_name}</Text>
              <Text style={styles.orderItemQtyPrice}>
                x{item.qty}  ${parseFloat(item.price || 0).toFixed(2)}
              </Text>
            </View>
          ))}
          {order.address ? (
            <View style={styles.orderAddr}>
              <Ionicons name="location-outline" size={13} color="#aaa" />
              <Text style={styles.orderAddrText} numberOfLines={2}>{order.address}</Text>
            </View>
          ) : null}

          {canTrack && (
            <TouchableOpacity 
              style={styles.trackBtn} 
              onPress={() => onTrack(order)}
            >
              <Ionicons name="map-outline" size={16} color="#fff" />
              <Text style={styles.trackBtnText}>Seguir repartidor</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const FILTERS = ["Todos", "Preparando", "En camino", "Entregados", "Cancelados"];
const FILTER_STATUS = {
  "Todos": null,
  "Preparando": ["pending", "accepted", "preparing"],
  "En camino": ["shipped", "on_the_way", "picked_up"],
  "Entregados": ["delivered"],
  "Cancelados": ["cancelled"],
};

export default function OrdersScreen({ onStorePress }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [trackingOrder, setTrackingOrder] = useState(null);

  const fetchOrders = useCallback(() => {
    if (!user?.token) return;
    setLoading(true);
    getUserOrders(user.token)
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setOrders(res.data);
      })
      .finally(() => setLoading(false));
  }, [user?.token]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 20000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  if (trackingOrder) {
    return <TrackingMap order={trackingOrder} onBack={() => setTrackingOrder(null)} />;
  }

  const filtered = orders.filter((o) => {
    const statuses = FILTER_STATUS[activeFilter];
    if (!statuses) return true;
    return statuses.includes(o.status);
  });

  const inTransit = orders.filter((o) => ["accepted", "shipped", "on_the_way", "picked_up"].includes(o.status));

  return (
    <View style={[styles.wrapper, isDesktop && { paddingTop: 0 }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MIS PEDIDOS</Text>
        {loading && <ActivityIndicator size="small" color={RED} />}
      </View>

      {!user ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="person-outline" size={48} color="#ddd" />
          </View>
          <Text style={styles.emptyTitle}>Inicia sesión</Text>
          <Text style={styles.emptySubtitle}>
            Para ver tus pedidos necesitas una cuenta
          </Text>
        </View>
      ) : loading && orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={RED} />
          <Text style={[styles.emptySubtitle, { marginTop: 16 }]}>Cargando pedidos...</Text>
        </View>
      ) : error && orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="wifi-outline" size={48} color="#ddd" />
          <Text style={styles.emptyTitle}>Sin conexión</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={64} color="#ddd" />
          </View>
          <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
          <Text style={styles.emptySubtitle}>
            Tus pedidos aparecerán aquí una vez que realices tu primera compra
          </Text>
          <TouchableOpacity style={styles.shopBtn} onPress={onStorePress}>
            <Text style={styles.shopBtnText}>IR A LA TIENDA</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Filtros */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusChips}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.statusChip, activeFilter === f && styles.statusChipActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.statusChipText, activeFilter === f && styles.statusChipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Banner pedido activo */}
          {inTransit.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.activeOrderBanner}
              activeOpacity={0.85}
              onPress={() => setTrackingOrder(order)}
            >
              <View style={styles.activeOrderLeft}>
                <View style={styles.activeOrderIcon}>
                  <Ionicons name="bicycle" size={22} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.activeOrderLabel}>
                    {order.status === "accepted" ? "Repartidor asignado" : "Pedido en camino"}
                  </Text>
                  <Text style={styles.activeOrderId}>#{String(order.id).padStart(6, "0")}</Text>
                </View>
              </View>
              <View style={styles.trackLivePill}>
                <View style={styles.trackLiveDot} />
                <Text style={styles.trackLiveText}>RASTREAR</Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionLabel}>HISTORIAL ({filtered.length})</Text>
          {filtered.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#bbb", marginTop: 20, fontSize: 13 }}>
              No hay pedidos en esta categoría
            </Text>
          ) : (
            filtered.map((order) => <OrderCard key={order.id} order={order} onTrack={setTrackingOrder} />)
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}
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
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#111" },

  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIcon: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center", marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#222", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#999", textAlign: "center", lineHeight: 20, marginBottom: 28 },
  shopBtn: { backgroundColor: YELLOW, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  shopBtnText: { fontSize: 14, fontWeight: "900", color: "#000" },

  scrollContent: { padding: 16 },
  statusChips: { gap: 8, paddingBottom: 16 },
  statusChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee",
  },
  statusChipActive: { backgroundColor: RED, borderColor: RED },
  statusChipText: { fontSize: 12, fontWeight: "700", color: "#666" },
  statusChipTextActive: { color: "#fff" },

  activeOrderBanner: {
    backgroundColor: "#eff6ff", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20, borderWidth: 1, borderColor: "#dbeafe",
  },
  activeOrderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  activeOrderIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "#dbeafe", justifyContent: "center", alignItems: "center",
  },
  activeOrderLabel: { fontSize: 13, fontWeight: "800", color: "#1d4ed8" },
  activeOrderId: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  trackLivePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#3b82f6", paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
  },
  trackLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff", opacity: 0.85 },
  trackLiveText: { fontSize: 11, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },

  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#bbb", letterSpacing: 0.5, marginBottom: 12 },

  orderCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  orderCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 14, fontWeight: "800", color: "#111" },
  orderDate: { fontSize: 12, color: "#aaa", marginTop: 2 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  orderDivider: { height: 1, backgroundColor: "#f5f5f5", marginVertical: 12 },
  orderCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderMetaText: { fontSize: 13, color: "#888" },
  orderMetaRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderTotal: { fontSize: 15, fontWeight: "900", color: "#111" },

  itemsList: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#f5f5f5", paddingTop: 12 },
  orderItem: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 4,
  },
  orderItemName: { fontSize: 12, color: "#555", flex: 1, marginRight: 8 },
  orderItemQtyPrice: { fontSize: 12, color: "#888", fontWeight: "600" },
  orderAddr: { flexDirection: "row", gap: 4, marginTop: 8, alignItems: "flex-start" },
  orderAddrText: { fontSize: 11, color: "#aaa", flex: 1 },

  trackBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: BLUE, borderRadius: 12, paddingVertical: 12, marginTop: 16,
  },
  trackBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  trackingContainer: { flex: 1, backgroundColor: "#fff", paddingTop: Platform.OS === "ios" ? 54 : 44 },
  trackingHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  trackingTitle: { fontSize: 15, fontWeight: "900", color: "#111" },
  trackingStatus: { fontSize: 12, color: BLUE, fontWeight: "700" },

  etaBadge: { backgroundColor: "#fff5f5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#ffcccc" },
  etaTime: { fontSize: 16, fontWeight: "900", color: RED },
  etaLabel: { fontSize: 9, fontWeight: "700", color: "#aaa", textTransform: "uppercase" },

  trackingFooter: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    // menú (62) + offset menú (20) + safe area home indicator (~34 iOS) + buffer
    paddingBottom: Platform.OS === "ios" ? 130 : 88,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 20,
    elevation: 20,
    overflow: "hidden",
  },
  // Fila superior: avatar + datos + ETA
  footerTop: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  driverAvatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: BLUE, justifyContent: "center", alignItems: "center",
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 8,
    elevation: 4,
  },
  driverName: { fontSize: 15, fontWeight: "900", color: "#111" },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 3, marginBottom: 3 },
  ratingVal: { fontSize: 12, fontWeight: "700", color: "#555", marginLeft: 4 },
  driverRole: { fontSize: 11, color: "#888", fontWeight: "600" },
  etaBlock: { alignItems: "center", minWidth: 60 },
  etaBigNum: { fontSize: 34, fontWeight: "900", color: RED, lineHeight: 38 },
  etaBigLabel: { fontSize: 10, fontWeight: "800", color: "#aaa", letterSpacing: 0.5 },
  // Fila inferior: km + tráfico + llamar
  footerBottom: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingTop: 12, gap: 10,
  },
  storeInfoRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: "#f5f5f5",
  },
  storeInfoIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: "#fff0f1", justifyContent: "center", alignItems: "center",
  },
  storeInfoText: { fontSize: 12, color: "#888", fontWeight: "500" },
  storeInfoName: { fontWeight: "800", color: "#333" },
  kmBlock: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  kmText: { fontSize: 12, fontWeight: "700", color: "#666" },
  etaSubText: { fontSize: 11, color: "#aaa", flex: 1 },
  trafficPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1,
  },
  trafficDot: { width: 6, height: 6, borderRadius: 3 },
  trafficText: { fontSize: 10, fontWeight: "700" },
  callBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#f0fdf4", justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "#bbf7d0",
  },
});
