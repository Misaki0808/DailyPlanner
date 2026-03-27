import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { createSharedStyles } from '../../utils/sharedStyles';

export default function AboutMeSection() {
  const { theme, aboutMe, saveAboutMe } = useApp();
  const themed = createSharedStyles(theme);
  const [text, setText] = useState(aboutMe);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setText(aboutMe);
  }, [aboutMe]);

  const handleSave = async () => {
    await saveAboutMe(text.trim());
    setIsEditing(false);
    Alert.alert('Kaydedildi ✅', 'Yapay zeka artık bu bilgileri dikkate alacak.');
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>🧠 Hakkımda</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Buraya kendini tanıt — aldığın dersler, ilgi alanların, işin vs. Yapay zeka, görevlerini kategorize ederken bu bilgileri dikkate alır.
      </Text>

      <View style={themed.glassCard}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[styles.textArea, { color: theme.text, backgroundColor: theme.accentLight, borderColor: theme.border }]}
              value={text}
              onChangeText={setText}
              placeholder={'Örnek:\n• Bilgisayar Mühendisliği öğrencisiyim\n• Derslerim: Mobil Uygulama Geliştirme, Algoritmalar, Veritabanı\n• Freelance web geliştirme yapıyorum\n• Haftada 3 gün fitness yapıyorum'}
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: theme.accentLight }]}
                onPress={() => { setText(aboutMe); setIsEditing(false); }}
              >
                <Text style={[styles.btnText, { color: theme.textSecondary }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <LinearGradient
                  colors={theme.accentGradient}
                  style={styles.saveBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.saveBtnText}>💾 Kaydet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.displayContainer} onPress={() => setIsEditing(true)}>
            {aboutMe ? (
              <Text style={[styles.displayText, { color: theme.text }]}>{aboutMe}</Text>
            ) : (
              <Text style={[styles.placeholder, { color: theme.textMuted }]}>
                Henüz bilgi girilmedi. Dokunarak düzenle...
              </Text>
            )}
            <Text style={[styles.editHint, { color: theme.accent }]}>✏️ Düzenle</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  editContainer: {
    padding: 16,
  },
  textArea: {
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 120,
    borderWidth: 1,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  displayContainer: {
    padding: 16,
  },
  displayText: {
    fontSize: 14,
    lineHeight: 20,
  },
  placeholder: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  editHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'right',
  },
});
