import React, { useMemo } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useApp } from '../../context/AppContext';
import { getCategoryColor } from '../../utils/categories';

// Takvim Türkçe Dil Ayarları
LocaleConfig.locales['tr'] = {
  monthNames: [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ],
  monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'],
  today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

interface MonthlyCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export default function MonthlyCalendarModal({ visible, onClose, selectedDate, onSelectDate }: MonthlyCalendarModalProps) {
  const { plans, theme } = useApp();

  // Takvimde gösterilecek renkli noktaları (dots) plans objesinden hesapla
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    Object.entries(plans).forEach(([date, tasks]) => {
      if (!tasks || tasks.length === 0) return;

      const dots = tasks.map((task, index) => ({
        key: `${task.id}-${index}`,
        color: getCategoryColor(task.category || 'diger')
      })).slice(0, 3); // max 3 dots

      marks[date] = { dots };
    });

    // Seçili günü belirginleştir
    if (marks[selectedDate]) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: theme.accent, selectedTextColor: '#fff' };
    } else {
      marks[selectedDate] = { selected: true, selectedColor: theme.accent, selectedTextColor: '#fff' };
    }

    return marks;
  }, [plans, selectedDate, theme.accent]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Calendar
                current={selectedDate}
                onDayPress={(day: any) => {
                  onSelectDate(day.dateString);
                  onClose();
                }}
                markingType={'multi-dot'}
                markedDates={markedDates}
                theme={{
                  backgroundColor: theme.background,
                  calendarBackground: theme.background,
                  textSectionTitleColor: theme.textSecondary,
                  selectedDayBackgroundColor: theme.accent,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: theme.accent,
                  dayTextColor: theme.text,
                  textDisabledColor: theme.textMuted,
                  dotColor: theme.accent,
                  monthTextColor: theme.text,
                  arrowColor: theme.accent,
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '600',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                }}
                style={styles.calendar}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  calendar: {
    padding: 10,
  },
});
