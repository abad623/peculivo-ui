import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/AuthContext";
import { translations, type Lang } from "@/lib/i18n";
import LanguageDropdown from "@/components/LanguageDropdown";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [lang, setLang] = useState<Lang>("en");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const s = translations[lang];

  async function handleRegister() {
    setError("");
    if (!email.trim() || !password || !confirmPassword) {
      setError(s.errorRequired);
      return;
    }
    if (password.length < 8) {
      setError(s.errorPasswordLength);
      return;
    }
    if (password !== confirmPassword) {
      setError(s.errorPasswordMatch);
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim() || undefined, lang);
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e.message || s.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Language dropdown — top right */}
      <View style={styles.topBar}>
        <LanguageDropdown value={lang} onChange={setLang} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.logo}>Peculivo</Text>
            <Text style={styles.title}>{s.title}</Text>

            <TextInput
              style={styles.input}
              placeholder={s.fullName}
              placeholderTextColor="#9aa0a6"
              value={fullName}
              onChangeText={setFullName}
              textContentType="name"
              autoComplete="name"
            />

            <TextInput
              style={styles.input}
              placeholder={s.email}
              placeholderTextColor="#9aa0a6"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />

            <TextInput
              style={styles.input}
              placeholder={s.password}
              placeholderTextColor="#9aa0a6"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
            />

            <TextInput
              style={styles.input}
              placeholder={s.confirmPassword}
              placeholderTextColor="#9aa0a6"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.linkRow}>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.link}>{s.signInInstead}</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>{s.createAccount}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f9fa" },
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1a73e8",
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "400",
    color: "#202124",
    textAlign: "center",
    marginBottom: 28,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#dadce0",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#202124",
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  error: {
    color: "#d93025",
    fontSize: 13,
    marginBottom: 12,
  },
  linkRow: {
    flexDirection: "row",
    marginBottom: 28,
  },
  link: {
    color: "#1a73e8",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    height: 48,
    backgroundColor: "#1a73e8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
