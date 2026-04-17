import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { adminGetUsers, adminGetStores, adminUpdateUser } from "../services/api";

const RED    = "#e6192e";
const YELLOW = "#fede33";
const GREEN  = "#22c55e";
const BLUE   = "#3b82f6";
const ORANGE = "#f59e0b";

const ROLE_CONFIG = {
  customer: { label: "Cliente",      color: "#6b7280", bg: "#f3f4f6", icon: "person-outline" },
  delivery: { label: "Repartidor",   color: BLUE,      bg: "#eff6ff", icon: "bicycle-outline" },
  admin:    { label: "Admin",        color: RED,       bg: "#fff1f2", icon: "shield-checkmark-outline" },
};

// ─── MODAL EDITAR USUARIO ─────────────────────────────────────────────────────
function EditUserModal({ user, stores, onClose, onSave }) {
  const [role, setRole]       = useState(user.role || "customer");
  const [storeId, setStoreId] = useState(user.store_id ? String(user.store_id) : "");
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(user.id, { role, store_id: storeId ? parseInt(storeId) : null });
    setSaving(false);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          {/* Header */}
          <View style={s.modalHeader}>
            <View style={s.modalAvatar}>
              <Text style={s.modalAvatarText}>{(user.name || "?")[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.modalName}>{user.name}</Text>
              <Text style={s.modalEmail}>{user.email}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Rol */}
          <Text style={s.sectionLabel}>ROL</Text>
          <View style={s.roleRow}>
            {["customer", "delivery", "admin"].map((r) => {
              const cfg = ROLE_CONFIG[r];
              return (
                <TouchableOpacity
                  key={r}
                  style={[s.roleChip, role === r && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                  onPress={() => { setRole(r); if (r !== "delivery") setStoreId(""); }}
                >
                  <Ionicons name={cfg.icon} size={14} color={role === r ? cfg.color : "#aaa"} />
                  <Text style={[s.roleChipText, role === r && { color: cfg.color, fontWeight: "800" }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sucursal — solo si es repartidor */}
          {role === "delivery" && (
            <>
              <Text style={s.sectionLabel}>SUCURSAL ASIGNADA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={s.storeRow}>
                  <TouchableOpacity
                    style={[s.storeChip, storeId === "" && s.storeChipActive]}
                    onPress={() => setStoreId("")}
                  >
                    <Text style={[s.storeChipText, storeId === "" && s.storeChipTextActive]}>Sin asignar</Text>
                  </TouchableOpacity>
                  {stores.map((st) => (
                    <TouchableOpacity
                      key={st.id}
                      style={[s.storeChip, storeId === String(st.id) && s.storeChipActive]}
                      onPress={() => setStoreId(String(st.id))}
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={12}
                        color={storeId === String(st.id) ? "#fff" : "#888"}
                      />
                      <Text style={[s.storeChipText, storeId === String(st.id) && s.storeChipTextActive]}>
                        {st.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Guardar */}
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={s.saveBtnText}>GUARDAR CAMBIOS</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── TARJETA DE USUARIO ───────────────────────────────────────────────────────
function UserCard({ user, onEdit }) {
  const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.customer;
  return (
    <TouchableOpacity style={s.userCard} onPress={() => onEdit(user)} activeOpacity={0.82}>
      <View style={s.userCardLeft}>
        <View style={[s.avatar, { backgroundColor: cfg.bg }]}>
          <Text style={[s.avatarText, { color: cfg.color }]}>{(user.name || "?")[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.userName}>{user.name}</Text>
          <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
          {user.store_name && user.role === "delivery" && (
            <View style={s.storePill}>
              <Ionicons name="storefront-outline" size={10} color={RED} />
              <Text style={s.storePillText}>{user.store_name}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <View style={[s.roleBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={11} color={cfg.color} />
          <Text style={[s.roleBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#ddd" />
      </View>
    </TouchableOpacity>
  );
}

// ─── PANTALLA ADMIN ───────────────────────────────────────────────────────────
export default function AdminScreen() {
  const { user, signOut } = useAuth();
  const [users, setUsers]         = useState([]);
  const [stores, setStores]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all"); // all | delivery | customer | admin
  const [editingUser, setEditingUser] = useState(null);

  const load = async () => {
    setLoading(true);
    const [resU, resS] = await Promise.all([
      adminGetUsers(user.token),
      adminGetStores(user.token),
    ]);
    if (resU?.success) setUsers(resU.data || []);
    if (resS?.success) setStores(resS.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (userId, data) => {
    await adminUpdateUser(userId, data, user.token);
    await load();
  };

  const filtered = filter === "all" ? users : users.filter((u) => u.role === filter);

  const counts = {
    all:      users.length,
    delivery: users.filter((u) => u.role === "delivery").length,
    customer: users.filter((u) => u.role === "customer" || !u.role).length,
    admin:    users.filter((u) => u.role === "admin").length,
  };

  return (
    <View style={s.wrapper}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerIcon}>
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
          </View>
          <View>
            <Text style={s.headerTitle}>PANEL ADMIN</Text>
            <Text style={s.headerSub}>{user?.name}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={s.iconBtn} onPress={load}>
            <Ionicons name="refresh-outline" size={18} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor: "#fff1f2" }]} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={RED} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Resumen rápido */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { borderColor: "#e5e7eb" }]}>
          <Text style={s.statNum}>{counts.all}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={[s.statCard, { borderColor: BLUE + "44" }]}>
          <Text style={[s.statNum, { color: BLUE }]}>{counts.delivery}</Text>
          <Text style={s.statLabel}>Repartidores</Text>
        </View>
        <View style={[s.statCard, { borderColor: GREEN + "44" }]}>
          <Text style={[s.statNum, { color: GREEN }]}>{counts.customer}</Text>
          <Text style={s.statLabel}>Clientes</Text>
        </View>
        <View style={[s.statCard, { borderColor: RED + "44" }]}>
          <Text style={[s.statNum, { color: RED }]}>{counts.admin}</Text>
          <Text style={s.statLabel}>Admins</Text>
        </View>
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {[
          { key: "all",      label: "Todos",        icon: "people-outline" },
          { key: "delivery", label: "Repartidores",  icon: "bicycle-outline" },
          { key: "customer", label: "Clientes",      icon: "person-outline" },
          { key: "admin",    label: "Admins",        icon: "shield-outline" },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Ionicons name={f.icon} size={13} color={filter === f.key ? "#fff" : "#888"} />
            <Text style={[s.filterChipText, filter === f.key && s.filterChipTextActive]}>
              {f.label} ({counts[f.key]})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={RED} />
          <Text style={s.loadingText}>Cargando usuarios...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
          {filtered.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="people-outline" size={48} color="#ddd" />
              <Text style={s.emptyText}>Sin usuarios en esta categoría</Text>
            </View>
          ) : (
            filtered.map((u) => (
              <UserCard key={u.id} user={u} onEdit={setEditingUser} />
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Modal editar */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          stores={stores}
          onClose={() => setEditingUser(null)}
          onSave={handleSave}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f5f5f5", paddingTop: Platform.OS === "ios" ? 54 : 44 },

  header: {
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: RED, justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  headerSub: { fontSize: 11, color: "#aaa", marginTop: 1 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center",
  },

  statsRow: {
    flexDirection: "row", gap: 10, padding: 16, paddingBottom: 8,
  },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12,
    alignItems: "center", borderWidth: 1.5,
  },
  statNum: { fontSize: 22, fontWeight: "900", color: "#111" },
  statLabel: { fontSize: 10, color: "#aaa", fontWeight: "600", marginTop: 2 },

  filters: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee",
  },
  filterChipActive: { backgroundColor: RED, borderColor: RED },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "#666" },
  filterChipTextActive: { color: "#fff" },

  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#aaa", fontSize: 13 },
  emptyWrap: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#bbb", fontSize: 14 },

  userCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  userCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "900" },
  userName: { fontSize: 14, fontWeight: "800", color: "#111" },
  userEmail: { fontSize: 11, color: "#aaa", marginTop: 1, maxWidth: 180 },
  storePill: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  storePillText: { fontSize: 10, fontWeight: "700", color: RED },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  roleBadgeText: { fontSize: 10, fontWeight: "700" },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, width: "100%", maxWidth: 420,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  modalAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#f3f4f6", justifyContent: "center", alignItems: "center",
  },
  modalAvatarText: { fontSize: 20, fontWeight: "900", color: "#555" },
  modalName: { fontSize: 15, fontWeight: "900", color: "#111" },
  modalEmail: { fontSize: 12, color: "#aaa", marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center",
  },
  sectionLabel: { fontSize: 10, fontWeight: "800", color: "#bbb", letterSpacing: 0.5, marginBottom: 10 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  roleChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: "#eee",
    backgroundColor: "#fafafa",
  },
  roleChipText: { fontSize: 12, fontWeight: "600", color: "#aaa" },
  storeRow: { flexDirection: "row", gap: 8 },
  storeChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#eee", backgroundColor: "#fafafa",
  },
  storeChipActive: { backgroundColor: RED, borderColor: RED },
  storeChipText: { fontSize: 12, fontWeight: "700", color: "#666" },
  storeChipTextActive: { color: "#fff" },
  saveBtn: {
    backgroundColor: RED, borderRadius: 14, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
