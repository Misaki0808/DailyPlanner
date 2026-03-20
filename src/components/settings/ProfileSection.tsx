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
import { Gender } from '../../context/AppContext';
import { sharedStyles } from '../../utils/sharedStyles';

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
      <View style={sharedStyles.glassCard}>
        <LinearGradient
          colors={['#fa709a', '#fee140']}
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
          <Text style={styles.genderLabel}>Profil Resmi:</Text>
          <View style={styles.genderButtons}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'male' && styles.genderButtonActive,
              ]}
              onPress={() => onChangeGender('male')}
            >
              <Text style={styles.genderIcon}>👨‍💼</Text>
              <Text style={styles.genderText}>Erkek</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'female' && styles.genderButtonActive,
              ]}
              onPress={() => onChangeGender('female')}
            >
              <Text style={styles.genderIcon}>👩‍💼</Text>
              <Text style={styles.genderText}>Kadın</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isEditing ? (
          <View style={styles.nameDisplay}>
            <Text style={styles.greeting}>Merhaba,</Text>
            <Text style={styles.userName}>{username || 'Kullanıcı'}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <View style={styles.editButtonInner}>
                <Text style={styles.editButtonText}>✏️ İsmi Değiştir</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nameEdit}>
            <Text style={styles.label}>İsminiz:</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="İsminizi girin"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
              />
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
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
    color: 'rgba(255, 255, 255, 0.9)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderButtonActive: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  genderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  nameDisplay: {
    alignItems: 'center',
    width: '100%',
    padding: 24,
  },
  greeting: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  editButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  editButtonInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  editButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  nameEdit: {
    width: '100%',
    padding: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    marginBottom: 16,
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#fff',
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
