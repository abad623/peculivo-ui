import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { languages, type Lang, type LangOption } from "@/lib/i18n";

interface Props {
  value: Lang;
  onChange: (lang: Lang) => void;
}

export default function LanguageDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = languages.find((l) => l.code === value)!;

  function select(lang: LangOption) {
    onChange(lang.code);
    setOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.flag}>{current.flag}</Text>
        <Text style={styles.label}>{current.label}</Text>
        <Text style={styles.chevron}>{"\u25BE"}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.code === value && styles.optionActive,
                  ]}
                  onPress={() => select(item)}
                >
                  <Text style={styles.optionFlag}>{item.flag}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      item.code === value && styles.optionLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-end",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dadce0",
    backgroundColor: "#fff",
  },
  flag: {
    fontSize: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#5f6368",
  },
  chevron: {
    fontSize: 12,
    color: "#5f6368",
    marginLeft: 2,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 80,
    paddingRight: 24,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionActive: {
    backgroundColor: "#e8f0fe",
  },
  optionFlag: {
    fontSize: 18,
  },
  optionLabel: {
    fontSize: 15,
    color: "#202124",
  },
  optionLabelActive: {
    color: "#1a73e8",
    fontWeight: "500",
  },
});
