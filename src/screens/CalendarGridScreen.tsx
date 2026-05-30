import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { getToday } from '../utils/dateUtils';
import { useNavigation } from '@react-navigation/native';

LocaleConfig.locales['tr'] = {
  monthNames: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'],
  today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

export default function CalendarGridScreen() {
  const { plans, theme } = useApp();
  const navigation = useNavigation();
  const today = getToday();

  // Create marked dates object based on plans
  const markedDates = useMemo(() => {
    const dates: any = {};
    
    // Always mark today
    dates[today] = { selected: true, selectedColor: theme.accent };

    Object.entries(plans).forEach(([date, tasks]) => {
      if (tasks.length > 0) {
        // Only mark if it's not today (today is already marked above)
        if (date !== today) {
          dates[date] = { 
            marked: true, 
            dotColor: theme.accent 
          };
        } else {
          // Add dot to today as well if there are tasks
          dates[today] = { ...dates[today], marked: true, dotColor: theme.accent };
        }
      }
    });
    
    return dates;
  }, [plans, theme, today]);

  const onDayPress = (day: any) => {
    // Navigate to MultiDayView with selected date, or set global date
    // Since our architecture sets selectedDate inside MultiDayView locally, 
    // we should ideally navigate with params or just show toast for now.
    // Let's just navigate to MultiDay (which defaults to today, but could take params)
    (navigation as any).navigate('MultiDayView', { date: day.dateString });
  };

  return (
    <LinearGradient colors={theme.primaryGradient} style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Calendar
          current={today}
          onDayPress={onDayPress}
          markedDates={markedDates}
          theme={{
            backgroundColor: theme.cardBackground,
            calendarBackground: theme.cardBackground,
            textSectionTitleColor: theme.textSecondary,
            selectedDayBackgroundColor: theme.accent,
            selectedDayTextColor: '#ffffff',
            todayTextColor: theme.accent,
            dayTextColor: theme.text,
            textDisabledColor: theme.textMuted,
            dotColor: theme.accent,
            selectedDotColor: '#ffffff',
            arrowColor: theme.accent,
            monthTextColor: theme.text,
            indicatorColor: theme.accent,
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14
          }}
        />
      </View>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: theme.textSecondary }]}>
          ● Görev bulunan günleri ifade eder.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  legend: {
    marginTop: 20,
    alignItems: 'center',
  },
  legendText: {
    fontSize: 14,
    fontStyle: 'italic',
  }
});
