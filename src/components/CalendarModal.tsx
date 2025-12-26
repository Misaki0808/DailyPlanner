import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  // Seçili tarihi parse et
  const parseDate = (dateStr: string) => {
    if (!dateStr || dateStr === '') {
      // Eğer tarih boşsa bugünün tarihini kullan
      const today = new Date();
      return { 
        year: today.getFullYear(), 
        month: today.getMonth() + 1, 
        day: today.getDate() 
      };
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    return { year, month, day };
  };

  const { year: initialYear, month: initialMonth, day: initialDay } = parseDate(selectedDate);
  
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(initialDay);

  // Ay isimleri
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  // Ayın kaç gün olduğunu hesapla
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const maxDay = getDaysInMonth(selectedYear, selectedMonth);

  // Yıl artır/azalt
  const changeYear = (increment: number) => {
    const newYear = selectedYear + increment;
    if (newYear >= 2025 && newYear <= 2030) {
      setSelectedYear(newYear);
    }
  };

  // Ay artır/azalt
  const changeMonth = (increment: number) => {
    let newMonth = selectedMonth + increment;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
      if (newYear <= 2030) {
        setSelectedYear(newYear);
      } else {
        return;
      }
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
      if (newYear >= 2025) {
        setSelectedYear(newYear);
      } else {
        return;
      }
    }

    setSelectedMonth(newMonth);
    
    // Gün ayarla (yeni ayda bu gün yoksa son güne ayarla)
    const newMaxDay = getDaysInMonth(newYear, newMonth);
    if (selectedDay > newMaxDay) {
      setSelectedDay(newMaxDay);
    }
  };

  // Gün artır/azalt
  const changeDay = (increment: number) => {
    const newDay = selectedDay + increment;
    if (newDay >= 1 && newDay <= maxDay) {
      setSelectedDay(newDay);
    }
  };

  // Tarihi kaydet
  const handleSave = () => {
    const month = String(selectedMonth).padStart(2, '0');
    const day = String(selectedDay).padStart(2, '0');
    const dateStr = `${selectedYear}-${month}-${day}`;
    onSelectDate(dateStr);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Başlık */}
            <View style={styles.header}>
              <Text style={styles.title}>📅 Tarih Seçin</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Yıl Seçici */}
            <View style={styles.pickerSection}>
              <Text style={styles.label}>YIL</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity 
                  style={styles.arrowButton} 
                  onPress={() => changeYear(-1)}
                >
                  <Text style={styles.arrowText}>◀</Text>
                </TouchableOpacity>
                <View style={styles.valueBox}>
                  <Text style={styles.valueText}>{selectedYear}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.arrowButton} 
                  onPress={() => changeYear(1)}
                >
                  <Text style={styles.arrowText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ay Seçici */}
            <View style={styles.pickerSection}>
              <Text style={styles.label}>AY</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity 
                  style={styles.arrowButton} 
                  onPress={() => changeMonth(-1)}
                >
                  <Text style={styles.arrowText}>◀</Text>
                </TouchableOpacity>
                <View style={styles.valueBox}>
                  <Text style={styles.valueText}>{monthNames[selectedMonth - 1]}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.arrowButton} 
                  onPress={() => changeMonth(1)}
                >
                  <Text style={styles.arrowText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gün Seçici */}
            <View style={styles.pickerSection}>
              <Text style={styles.label}>GÜN</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity 
                  style={styles.arrowButton} 
                  onPress={() => changeDay(-1)}
                >
                  <Text style={styles.arrowText}>◀</Text>
                </TouchableOpacity>
                <View style={styles.valueBox}>
                  <Text style={styles.valueText}>{selectedDay}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.arrowButton} 
                  onPress={() => changeDay(1)}
                >
                  <Text style={styles.arrowText}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Seçilen Tarih Önizleme */}
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Seçilen Tarih:</Text>
              <Text style={styles.previewDate}>
                {selectedDay} {monthNames[selectedMonth - 1]} {selectedYear}
              </Text>
            </View>

            {/* Kaydet Butonu */}
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
