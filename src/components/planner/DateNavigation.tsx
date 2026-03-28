import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { formatDateDisplay, getToday } from '../../utils/dateUtils';
import { useApp } from '../../context/AppContext';

interface DateNavigationProps {
  selectedDate: string;
  onChangeDate: (days: number) => void;
  onOpenCalendar?: () => void;
}

export default function DateNavigation({
  selectedDate,
  onChangeDate,
  onOpenCalendar,
}: DateNavigationProps) {
  const { theme } = useApp();

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.navigationContent}>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.accentLight }]}
          onPress={() => onChangeDate(-1)}
        >
          <Text style={[styles.navButtonText, { color: theme.text }]}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.currentDateContainer}
          activeOpacity={0.7}
          onPress={onOpenCalendar}
        >
          <Text style={[styles.currentDate, { color: theme.text }]}>{formatDateDisplay(selectedDate)}</Text>
          {selectedDate === getToday() && (
            <View style={[styles.todayBadge, { backgroundColor: theme.success }]}>
              <Text style={styles.todayBadgeText}>BUGÜN</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.accentLight }]}
          onPress={() => onChangeDate(1)}
        >
          <Text style={[styles.navButtonText, { color: theme.text }]}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  navigationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: '700',
  },
  currentDateContainer: {
    alignItems: 'center',
    flex: 1,
  },
  currentDate: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  todayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});
