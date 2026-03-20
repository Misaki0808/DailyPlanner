import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { formatDateDisplay, getToday } from '../../utils/dateUtils';
import { sharedStyles } from '../../utils/sharedStyles';

interface DateNavigationProps {
  selectedDate: string;
  onChangeDate: (days: number) => void;
}

export default function DateNavigation({
  selectedDate,
  onChangeDate,
}: DateNavigationProps) {
  return (
    <View style={sharedStyles.glassCard}>
      <View style={styles.navigationContent}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onChangeDate(-1)}
        >
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.currentDateContainer}>
          <Text style={styles.currentDate}>{formatDateDisplay(selectedDate)}</Text>
          {selectedDate === getToday() && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>BUGÜN</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onChangeDate(1)}
        >
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
  },
  currentDateContainer: {
    alignItems: 'center',
    flex: 1,
  },
  currentDate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  todayBadge: {
    backgroundColor: 'rgba(67, 233, 123, 0.9)',
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
