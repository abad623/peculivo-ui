import { Slot, usePathname, router } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/AuthContext";
import { IntentsProvider } from "@/lib/IntentsContext";
import { InvoicesProvider } from "@/lib/InvoicesContext";
import { RemindersProvider } from "@/lib/RemindersContext";
import { EmailsProvider } from "@/lib/EmailsContext";

const NAV_ITEMS = [
  { label: "Voice Assistant", path: "/voice-assistant", icon: "\uD83C\uDF99\uFE0F" },
  { label: "Calendar", path: "/calendar", icon: "\uD83D\uDCC5" },
  { label: "Invoices", path: "/invoices", icon: "\uD83E\uDDFE" },
  { label: "Emails", path: "/emails", icon: "\u2709\uFE0F" },
  { label: "Airtable", path: "/airtable", icon: "\uD83D\uDCCA" },
];

export default function DashboardLayout() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <IntentsProvider>
    <InvoicesProvider>
    <RemindersProvider>
    <EmailsProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.root}>
          {/* Sidebar */}
          <View style={styles.sidebar}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>Peculivo</Text>
              <Text style={styles.logoSub}>CRM Assistant</Text>
            </View>

            <View style={styles.nav}>
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.path;
                return (
                  <TouchableOpacity
                    key={item.path}
                    style={[styles.navItem, active && styles.navItemActive]}
                    onPress={() => router.push(item.path as any)}
                  >
                    <Text style={styles.navIcon}>{item.icon}</Text>
                    <Text
                      style={[styles.navLabel, active && styles.navLabelActive]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Slot />
          </View>
        </View>
      </SafeAreaView>
    </EmailsProvider>
    </RemindersProvider>
    </InvoicesProvider>
    </IntentsProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#1e1e2e" },
  root: { flex: 1, flexDirection: "row" },

  /* ---- Sidebar ---- */
  sidebar: {
    width: 240,
    backgroundColor: "#1e1e2e",
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
    ...(Platform.OS === "web"
      ? { borderRightWidth: 1, borderRightColor: "#2e2e3e" }
      : {}),
  },
  logoBox: { marginBottom: 36, paddingHorizontal: 8 },
  logoText: { fontSize: 22, fontWeight: "700", color: "#e0e0ff" },
  logoSub: { fontSize: 12, color: "#8888aa", marginTop: 2 },

  nav: { flex: 1, gap: 4 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navItemActive: { backgroundColor: "#2e2e4a" },
  navIcon: { fontSize: 18, marginRight: 12 },
  navLabel: { fontSize: 15, color: "#aaaacc", fontWeight: "500" },
  navLabelActive: { color: "#e0e0ff" },

  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: "#2e2e3e",
    paddingTop: 16,
  },
  logoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutText: { color: "#ff6b6b", fontSize: 14, fontWeight: "500" },

  /* ---- Content ---- */
  content: { flex: 1, backgroundColor: "#f8f9fa" },
});
