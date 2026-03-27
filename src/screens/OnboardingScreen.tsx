import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { Gender } from '../types';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '📋',
    title: 'Hoş Geldin!',
    description: 'DailyPlanner ile günlük görevlerini kolayca planla, takip et ve hedeflerine ulaş.',
  },
  {
    emoji: '🤖',
    title: 'Yapay Zeka Destekli',
    description: 'Görevlerini paragraf olarak yaz, AI otomatik olarak madde madde listeye ve kategorilere dönüştürsün.',
  },
  {
    emoji: '📊',
    title: 'İlerlemeyi Takip Et',
    description: 'Haftalık istatistikler, kategori dağılımları ve AI analizleriyle motivasyonunu yüksek tut.',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { setUsername, setGender, theme } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [name, setName] = useState('');
  const [selectedGender, setSelectedGender] = useState<Gender>('male');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isSlidePhase = currentSlide < SLIDES.length;
  const isNamePhase = currentSlide === SLIDES.length;
  const isGenderPhase = currentSlide === SLIDES.length + 1;

  const animateTransition = (nextSlide: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: nextSlide, duration: 0, useNativeDriver: true }),
    ]).start(() => {
      setCurrentSlide(nextSlide);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const handleNext = () => {
    if (isSlidePhase) {
      animateTransition(currentSlide + 1);
    } else if (isNamePhase) {
      if (name.trim().length < 2) return;
      animateTransition(currentSlide + 1);
    } else if (isGenderPhase) {
      handleComplete();
    }
  };

  const handleSkipSlides = () => {
    animateTransition(SLIDES.length);
  };

  const handleComplete = async () => {
    await setUsername(name.trim());
    await setGender(selectedGender);
    onComplete();
  };

  const renderSlide = () => {
    const slide = SLIDES[currentSlide];
    return (
      <View style={styles.slideContainer}>
        <Text style={styles.slideEmoji}>{slide.emoji}</Text>
        <Text style={[styles.slideTitle, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.slideDesc, { color: theme.textSecondary }]}>{slide.description}</Text>
      </View>
    );
  };

  const renderNameInput = () => (
    <View style={styles.slideContainer}>
      <Text style={styles.slideEmoji}>👋</Text>
      <Text style={[styles.slideTitle, { color: theme.text }]}>Adın ne?</Text>
      <Text style={[styles.slideDesc, { color: theme.textSecondary }]}>
        Sana isminle hitap edelim
      </Text>
      <TextInput
        style={[styles.nameInput, { color: theme.text, backgroundColor: theme.accentLight, borderColor: theme.border }]}
        placeholder="İsmini gir..."
        placeholderTextColor={theme.textMuted}
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="words"
        maxLength={20}
      />
    </View>
  );

  const renderGenderSelect = () => (
    <View style={styles.slideContainer}>
      <Text style={styles.slideEmoji}>🎭</Text>
      <Text style={[styles.slideTitle, { color: theme.text }]}>Profil Avatarı</Text>
      <Text style={[styles.slideDesc, { color: theme.textSecondary }]}>
        Profilinde hangi avatarı kullanmak istersin?
      </Text>
      <View style={styles.genderRow}>
        <TouchableOpacity
          style={[
            styles.genderOption,
            { backgroundColor: theme.accentLight, borderColor: theme.border },
            selectedGender === 'male' && { borderColor: theme.accent, backgroundColor: theme.accent + '20' },
          ]}
          onPress={() => setSelectedGender('male')}
        >
          <Text style={styles.genderEmoji}>👨</Text>
          <Text style={[styles.genderLabel, { color: selectedGender === 'male' ? theme.accent : theme.textSecondary }]}>
            Erkek
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.genderOption,
            { backgroundColor: theme.accentLight, borderColor: theme.border },
            selectedGender === 'female' && { borderColor: theme.accent, backgroundColor: theme.accent + '20' },
          ]}
          onPress={() => setSelectedGender('female')}
        >
          <Text style={styles.genderEmoji}>👩</Text>
          <Text style={[styles.genderLabel, { color: selectedGender === 'female' ? theme.accent : theme.textSecondary }]}>
            Kadın
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const canProceed = isSlidePhase || (isNamePhase && name.trim().length >= 2) || isGenderPhase;
  const totalSteps = SLIDES.length + 2;
  const buttonText = isGenderPhase ? '🚀 Başla!' : 'Devam →';

  return (
    <LinearGradient
      colors={theme.primaryGradient}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Slayt atla */}
        {isSlidePhase && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkipSlides}>
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>Atla ›</Text>
          </TouchableOpacity>
        )}

        {/* İçerik */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {isSlidePhase && renderSlide()}
          {isNamePhase && renderNameInput()}
          {isGenderPhase && renderGenderSelect()}
        </Animated.View>

        {/* İlerleme noktaları */}
        <View style={styles.dotsRow}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentSlide ? theme.accent : theme.textMuted + '40' },
                i === currentSlide && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Devam butonu */}
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && { opacity: 0.4 }]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <LinearGradient
            colors={theme.accentGradient}
            style={styles.nextButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextButtonText}>{buttonText}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  slideEmoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  nameInput: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 24,
    borderWidth: 1,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  genderOption: {
    width: 130,
    height: 130,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  genderEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    borderRadius: 12,
  },
  nextButton: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 18,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
