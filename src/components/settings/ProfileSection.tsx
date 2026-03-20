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
import { Gender } from '../../types';
import { createSharedStyles } from '../../utils/sharedStyles';
import { useApp } from '../../context/AppContext';

interface ProfileSectionProps {
  username: string | null;
  gender: Gender;
  onSaveUsername: (name: string) => Promise<void>;
  onChangeGender: (gender: Gender) => Promise<void>;
}

export default function ProfileSection({
  username,
  gender,
  onSaveUsername,
  onChangeGender,
}: ProfileSectionProps) {
  const { theme } = useApp();
  const themed = createSharedStyles(theme);
  const [nameInput, setNameInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!username) {
      setIsEditing(true);
    } else {
      setNameInput(username);
    }
  }, [username]);

  const handleSaveName = async () => {
    if (nameInput.trim() === '') {
      Alert.alert('Uyarı', 'Lütfen bir isim girin');
      return;
    }
    try {
      await onSaveUsername(nameInput.trim());
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Hata', 'İsim kaydedilemedi');
    }
  };

  return (
    <View style={styles.profileSection}>
      <View style={themed.glassCard}>
        <LinearGradient
          colors={theme.accentGradient}
          style={styles.avatarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>
            {gender === 'male' ? '👨‍💼' : '👩‍💼'}
          </Text>
        </LinearGradient>

        {/* Gender Seçici */}
        <View style={styles.genderSelector}>
          <Text style={[styles.genderLabel, { color: theme.text }]}>Profil Resmi:</Text>
          <View style={styles.genderButtons}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                { backgroundColor: theme.accentLight },
                gender === 'male' && { borderColor: theme.accent, backgroundColor: `${theme.accent}30` },
              ]}
              onPress={() => onChangeGender('male')}
            >
              <Text style={styles.genderIcon}>👨‍💼</Text>
              <Text style={[styles.genderText, { color: theme.text }]}>Erkek</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderButton,
                { backgroundColor: theme.accentLight },
                gender === 'female' && { borderColor: theme.accent, backgroundColor: `${theme.accent}30` },
              ]}
              onPress={() => onChangeGender('female')}
            >
              <Text style={styles.genderIcon}>👩‍💼</Text>
              <Text style={[styles.genderText, { color: theme.text }]}>Kadın</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isEditing ? (
          <View style={styles.nameDisplay}>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>Merhaba,</Text>
            <Text style={[styles.userName, { color: theme.text }]}>{username || 'Kullanıcı'}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <View style={[styles.editButtonInner, { backgroundColor: theme.accentLight }]}>
                <Text style={[styles.editButtonText, { color: theme.text }]}>✏️ İsmi Değiştir</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nameEdit}>
            <Text style={[styles.label, { color: theme.text }]}>İsminiz:</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.accentLight }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="İsminizi girin"
                placeholderTextColor={theme.textMuted}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
              <LinearGradient
                colors={theme.successGradient}
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.saveButtonText}>💾 Kaydet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    marginBottom: 24,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  genderSelector: {
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 24,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  genderButton: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nameDisplay: {
    alignItems: 'center',
    width: '100%',
    padding: 24,
  },
  greeting: {
    fontSize: 18,
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  editButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  editButtonInner: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  nameEdit: {
    width: '100%',
    padding: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputContainer: {
    borderRadius: 16,
    marginBottom: 16,
  },
  input: {
    padding: 16,
    fontSize: 16,
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
