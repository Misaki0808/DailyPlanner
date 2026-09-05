import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/AppContext';
import { toDateString } from '../utils/dateUtils';
import { PickerDate, stepDay, stepMonth, stepYear, toPickerDate } from '../utils/datePicker';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  occupiedDates: string[];
}

const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
}) => {
  const theme = useTheme();

  // Yıl/ay/gün TEK bir state'te tutulur. Daha önce üç ayrı state vardı ve
  // changeDay, changeMonth'u çağırdığında changeMonth hâlâ render anındaki
  // bayat `selectedDay`'i okuyordu: 31 Ocak'ta "gün ileri" 1 Şubat yerine
  // 28 Şubat'a atlıyordu. Tek state + fonksiyonel güncelleme bunu engeller.
  const [picker, setPicker] = useState<PickerDate>(() => toPickerDate(selectedDate));

  // Modal her açıldığında dışarıdaki seçili tarihle senkronlanır. Aksi halde
  // state yalnız ilk mount'ta kuruluyor ve ekranın gösterdiği tarihten
  // farklı bir gün açılıyordu.
  useEffect(() => {
    if (visible) setPicker(toPickerDate(selectedDate));
  }, [visible, selectedDate]);

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const { year: selectedYear, month: selectedMonth, day: selectedDay } = picker;

  // Adım mantığı src/utils/datePicker.ts içinde saf fonksiyonlar olarak durur
  // ve orada test edilir; burada yalnız state'e bağlanır.
  const changeYear = (increment: number) => setPicker(prev => stepYear(prev, increment));
  const changeMonth = (increment: number) => setPicker(prev => stepMonth(prev, increment));
  const changeDay = (increment: number) => setPicker(prev => stepDay(prev, increment));

  const handleSave = () => {
    onSelectDate(toDateString(selectedYear, selectedMonth, selectedDay));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={theme.accentGradient}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.header}>
              <Text style={styles.title}>📅 Tarih Seçin</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Yıl */}
            <View style={styles.pickerSection}>
              <Text style={styles.label}>YIL</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeYear(-1)}>
                  <Text style={styles.arrowText}>◀</Text>
                </TouchableOpacity>
                <View style={styles.valueBox}>
                  <Text style={styles.valueText}>{selectedYear}</Text>
                </View>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeYear(1)}>
                  <Text style={styles.arrowText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ay */}
            <View style={styles.pickerSection}>
              <Text style={styles.label}>AY</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeMonth(-1)}>
                  <Text style={styles.arrowText}>◀</Text>
                </TouchableOpacity>
                <View style={styles.valueBox}>
                  <Text style={styles.valueText}>{monthNames[selectedMonth - 1]}</Text>
                </View>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeMonth(1)}>
                  <Text style={styles.arrowText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gün */}
            <View style={styles.pickerSection}>
              <Text style={styles.label}>GÜN</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeDay(-1)}>
                  <Text style={styles.arrowText}>◀</Text>
                </TouchableOpacity>
                <View style={styles.valueBox}>
                  <Text style={styles.valueText}>{selectedDay}</Text>
                </View>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeDay(1)}>
                  <Text style={styles.arrowText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Önizleme */}
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Seçilen Tarih:</Text>
              <Text style={styles.previewDate}>
                {selectedDay} {monthNames[selectedMonth - 1]} {selectedYear}
              </Text>
            </View>

            {/* Kaydet */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>✓ Tarihi Seç</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  gradient: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  pickerSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    letterSpacing: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  valueBox: {
    flex: 1,
    marginHorizontal: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  previewSection: {
    marginTop: 8,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  previewDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

export default CalendarModal;
