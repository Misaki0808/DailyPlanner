import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VoiceInputButton from '../VoiceInputButton';

interface ActionButtonsBarProps {
  isEditMode: boolean;
  quickAddText: string;
  onSetEditMode: (value: boolean) => void;
  onQuickAddTextChange: (text: string) => void;
  onQuickAddSubmit: () => void;
  onSharePlan: () => void;
  onCopyPlan: () => void;
  onDeleteDay: () => void;
}

export default function ActionButtonsBar({
  isEditMode,
  quickAddText,
  onSetEditMode,
  onQuickAddTextChange,
  onQuickAddSubmit,
  onSharePlan,
  onCopyPlan,
  onDeleteDay,
}: ActionButtonsBarProps) {
  return (
    <View style={styles.buttonGroup}>
      {!isEditMode ? (
        // Normal mod - Düzenle, Paylaş, Kopyala
        <>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onSetEditMode(true)}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionButtonText}>⚙️ Düzenle</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onSharePlan}
          >
            <LinearGradient
              colors={['#4facfe', '#00f2fe']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionButtonText}>📤 Paylaş</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onCopyPlan}
          >
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.actionButtonText}>📋 Kopyala</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      ) : (
        // Edit mod
        <>
          {/* Hızlı Görev Ekle */}
          <View style={styles.quickAddWrapper}>
            <TextInput
              style={[
                styles.quickAddInput,
                // @ts-ignore — web-only CSS property
                Platform.OS === 'web' && { outlineStyle: 'none' },
              ]}
              placeholder="Yeni gorev ekle..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={quickAddText}
              onChangeText={onQuickAddTextChange}
              onSubmitEditing={onQuickAddSubmit}
              returnKeyType="done"
            />
            <VoiceInputButton
              mode="task"
              onTranscript={(text) => onQuickAddTextChange(text)}
            />
            <TouchableOpacity
              onPress={onQuickAddSubmit}
              disabled={quickAddText.trim() === ''}
              activeOpacity={0.7}
              style={styles.quickAddBtnInline}
            >
              <LinearGradient
                colors={quickAddText.trim() === '' ? ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'] : ['#00b894', '#00cec9']}
                style={styles.quickAddButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.quickAddButtonText}>+</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Bitti + Sil (kompakt) */}
          <TouchableOpacity
            onPress={() => onSetEditMode(false)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              style={styles.compactButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.compactButtonText}>{"\u2715"}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDeleteDay}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#ff6b6b', '#ee5a6f']}
              style={styles.compactButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.compactButtonText}>{"\uD83D\uDDD1"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  quickAddWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    marginRight: 8,
  },
  quickAddInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    color: '#fff',
  },
  quickAddBtnInline: {
    marginLeft: 4,
  },
  quickAddButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  compactButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
});
