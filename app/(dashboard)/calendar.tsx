import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useReminders, Reminder } from "@/lib/RemindersContext";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function CalendarScreen() {
  const { reminders, removeReminder } = useReminders();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Map date → reminders
  const reminderMap = useMemo(() => {
    const map: Record<string, Reminder[]> = {};
    for (const r of reminders) {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    }
    return map;
  }, [reminders]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    // Monday=0 ... Sunday=6
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const cells: { day: number; key: string; current: boolean }[] = [];

    // Previous month fill
    for (let i = startDay - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      cells.push({ day: d, key: toKey(y, m, d), current: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, key: toKey(year, month, d), current: true });
    }

    // Next month fill
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      cells.push({ day: d, key: toKey(y, m, d), current: false });
    }

    return cells;
  }, [year, month]);

  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedReminders = selectedDate ? reminderMap[selectedDate] || [] : [];

  const prevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDate(null);
  }, [month, year]);

  const nextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDate(null);
  }, [month, year]);

  const goToday = useCallback(() => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(todayKey);
  }, [todayKey]);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Calendar</Text>
        <Text style={s.headerSub}>
          {reminders.length} reminder{reminders.length !== 1 ? "s" : ""} scheduled
        </Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={s.calendarCard}>
          {/* Month nav */}
          <View style={s.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
              <Text style={s.navBtnText}>{"\u2039"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToday}>
              <Text style={s.monthLabel}>
                {MONTHS[month]} {year}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
              <Text style={s.navBtnText}>{"\u203A"}</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={s.weekRow}>
            {DAYS.map((d) => (
              <View key={d} style={s.dayHeader}>
                <Text style={s.dayHeaderText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={s.grid}>
            {calendarDays.map((cell, idx) => {
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDate;
              const hasReminders = !!reminderMap[cell.key]?.length;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    s.cell,
                    !cell.current && s.cellOther,
                    isToday && s.cellToday,
                    isSelected && s.cellSelected,
                  ]}
                  onPress={() => setSelectedDate(cell.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      s.cellText,
                      !cell.current && s.cellTextOther,
                      isToday && s.cellTextToday,
                      isSelected && s.cellTextSelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                  {hasReminders && (
                    <View
                      style={[
                        s.dot,
                        isSelected || isToday ? s.dotWhite : s.dotBlue,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected date reminders */}
        {selectedDate && (
          <View style={s.detailCard}>
            <Text style={s.detailTitle}>
              {new Date(selectedDate + "T00:00").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>

            {selectedReminders.length === 0 ? (
              <Text style={s.noReminders}>No reminders for this day.</Text>
            ) : (
              selectedReminders.map((rem) => (
                <View key={rem.id} style={s.reminderItem}>
                  <View style={s.reminderTime}>
                    <Text style={s.timeText}>{rem.time}</Text>
                  </View>
                  <View style={s.reminderBody}>
                    <Text style={s.reminderTitle}>{rem.title}</Text>
                    {rem.description !== rem.title && (
                      <Text style={s.reminderDesc}>{rem.description}</Text>
                    )}
                    {rem.contact && (
                      <Text style={s.reminderContact}>
                        Contact: {rem.contact}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => removeReminder(rem.id)}
                  >
                    <Text style={s.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Upcoming reminders */}
        {!selectedDate && reminders.length > 0 && (
          <View style={s.detailCard}>
            <Text style={s.detailTitle}>Upcoming Reminders</Text>
            {reminders
              .filter((r) => r.date >= todayKey)
              .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
              .slice(0, 10)
              .map((rem) => (
                <View key={rem.id} style={s.reminderItem}>
                  <View style={s.reminderTime}>
                    <Text style={s.timeText}>{rem.time}</Text>
                    <Text style={s.dateSmall}>
                      {new Date(rem.date + "T00:00").toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </Text>
                  </View>
                  <View style={s.reminderBody}>
                    <Text style={s.reminderTitle}>{rem.title}</Text>
                    {rem.contact && (
                      <Text style={s.reminderContact}>
                        Contact: {rem.contact}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => removeReminder(rem.id)}
                  >
                    <Text style={s.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },

  header: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#202124" },
  headerSub: { fontSize: 13, color: "#5f6368", marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },

  /* Calendar card */
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },

  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f2f5",
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnText: { fontSize: 22, color: "#333", fontWeight: "600" },
  monthLabel: { fontSize: 18, fontWeight: "700", color: "#202124" },

  weekRow: { flexDirection: "row", marginBottom: 4 },
  dayHeader: { flex: 1, alignItems: "center", paddingVertical: 6 },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5f6368",
    textTransform: "uppercase",
  },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.285%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  cellOther: { opacity: 0.35 },
  cellToday: { backgroundColor: "#1a73e8" },
  cellSelected: { backgroundColor: "#1557b0" },
  cellText: { fontSize: 14, color: "#202124", fontWeight: "500" },
  cellTextOther: { color: "#999" },
  cellTextToday: { color: "#fff", fontWeight: "700" },
  cellTextSelected: { color: "#fff", fontWeight: "700" },

  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  dotBlue: { backgroundColor: "#1a73e8" },
  dotWhite: { backgroundColor: "#fff" },

  /* Detail card */
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#202124",
    marginBottom: 12,
  },
  noReminders: { fontSize: 14, color: "#999", fontStyle: "italic" },

  reminderItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
  },
  reminderTime: {
    backgroundColor: "#e8f0fe",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 56,
  },
  timeText: { fontSize: 14, fontWeight: "700", color: "#1a73e8" },
  dateSmall: { fontSize: 10, color: "#5f6368", marginTop: 2 },

  reminderBody: { flex: 1 },
  reminderTitle: { fontSize: 14, fontWeight: "600", color: "#202124" },
  reminderDesc: { fontSize: 13, color: "#5f6368", marginTop: 2 },
  reminderContact: {
    fontSize: 12,
    color: "#1a73e8",
    marginTop: 4,
    fontWeight: "500",
  },

  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  removeBtnText: { color: "#d32f2f", fontSize: 11, fontWeight: "600" },
});
