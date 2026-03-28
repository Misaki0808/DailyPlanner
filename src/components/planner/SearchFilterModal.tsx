import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { TASK_CATEGORIES } from '../../utils/categories';

interface SearchFilterModalProps {
  visible: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedFilterCats: string[];
  setSelectedFilterCats: (cats: string[]) => void;
  onApply: () => void;
  onClear: () => void;
}

export default function SearchFilterModal({
  visible,
  onClose,
  searchQuery,
  setSearchQuery,
  selectedFilterCats,
  setSelectedFilterCats,
  onApply,
  onClear,
}: SearchFilterModalProps) {
  const { theme } = useApp();

  const handleToggleCategory = (catId: string) => {
    if (selectedFilterCats.includes(catId)) {
      setSelectedFilterCats(selectedFilterCats.filter((id) => id !== catId));
    } else {
      setSelectedFilterCats([...selectedFilterCats, catId]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.modalContent, { backgroundColor: theme.cardBackground, shadowColor: '#000' }]}
            >
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>🔍 Arama ve Filtrele</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollArea}>
                {/* Metin Arama */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Kelime veya Görev Ara</Text>
                <TextInput
                  style={[
                    styles.searchInput,
                    { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
                  ]}
                  placeholder="Başlık veya not içerir..."
                  placeholderTextColor={theme.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                {/* Kategori Filtresi */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 24 }]}>
                  Kategorilere Göre Filtrele
                </Text>
                <View style={styles.categoryWrap}>
                  {TASK_CATEGORIES.map((cat) => {
                    const isActive = selectedFilterCats.includes(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: isActive ? cat.color + '20' : theme.background,
                            borderColor: isActive ? cat.color : theme.border,
                          },
                        ]}
                        onPress={() => handleToggleCategory(cat.id)}
                      >
                        <Text style={styles.catEmoji}>{cat.emoji}</Text>
                        <Text
                          style={[
                            styles.catLabel,
                            { color: isActive ? cat.color : theme.textSecondary, fontWeight: isActive ? '700' : '400' },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={[styles.footer, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.clearButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={onClear}
                >
                  <Text style={[styles.clearText, { color: theme.text }]}>Temizle</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.applyButton, { backgroundColor: theme.accent }]} onPress={onApply}>
                  <Text style={styles.applyText}>Sonuçları Gör</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollArea: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  catEmoji: {
    fontSize: 14,
  },
  catLabel: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
