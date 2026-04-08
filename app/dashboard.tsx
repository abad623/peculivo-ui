import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/lib/AuthContext";

export default function DashboardScreen() {
  const { signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Peculivo</Text>
        <Text style={styles.subtitle}>
          You're signed in. This is where your dashboard will live.
        </Text>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f9fa" },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: "#202124",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#5f6368",
    textAlign: "center",
    marginBottom: 40,
    maxWidth: 300,
  },
  logoutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dadce0",
  },
  logoutText: {
    color: "#1a73e8",
    fontSize: 15,
    fontWeight: "500",
  },
});
