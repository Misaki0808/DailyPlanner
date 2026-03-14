import React, { useState, useRef, useEffect } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    Platform,
    Alert,
    Animated,
    View,
    ActivityIndicator,
} from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { correctVoiceTranscript, convertToSingleTask, checkApiKey } from '../utils/aiService';

interface VoiceInputButtonProps {
    onTranscript: (text: string, isFinal: boolean) => void;
    disabled?: boolean;
    mode?: 'paragraph' | 'task';
}

export default function VoiceInputButton({ onTranscript, disabled, mode = 'paragraph' }: VoiceInputButtonProps) {
    const [isListening, setIsListening] = useState(false);
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<any>(null);
    const finalTranscriptRef = useRef('');
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (Platform.OS === 'web') {
            const SpeechRecognition =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            setIsSupported(!!SpeechRecognition);
        } else {
            // Native is supported via expo-speech-recognition
            setIsSupported(true);
        }
    }, []);

    // --- Native Speech Recognition Events ---
    useSpeechRecognitionEvent('result', (event) => {
        if (Platform.OS === 'web') return; // Sadece native için

        const transcript = event.results[0]?.transcript || '';
        onTranscript(transcript, event.isFinal);

        if (event.isFinal) {
            setIsListening(false);
            const rawText = transcript.trim();
            if (rawText.length > 0 && checkApiKey()) {
                setIsCorrecting(true);
                const corrector = mode === 'task' ? convertToSingleTask : correctVoiceTranscript;
                corrector(rawText)
                    .then((corrected) => onTranscript(corrected, true))
                    .finally(() => setIsCorrecting(false));
            }
        }
    });

    useSpeechRecognitionEvent('error', (event) => {
        if (Platform.OS === 'web') return;
        setIsListening(false);
        if (event.error === 'not-allowed') {
            Alert.alert('İzin Gerekli', 'Mikrofon izni verilmedi.');
        } else if (event.error !== 'aborted') {
            console.warn('Speech recognition error:', event.error, event.message);
        }
    });
    // ----------------------------------------

    useEffect(() => {
        if (isListening) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isListening]);

    const startListening = () => {
        if (Platform.OS !== 'web') return;

        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        let finalTranscript = '';

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            finalTranscriptRef.current = finalTranscript;
            onTranscript(finalTranscript + interimTranscript, false);
        };

        recognition.onerror = (event: any) => {
            setIsListening(false);
            if (event.error === 'not-allowed') {
                Alert.alert('İzin Gerekli', 'Mikrofon erişimine izin vermeniz gerekiyor.');
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            const rawText = finalTranscriptRef.current.trim();
            if (rawText.length > 0 && checkApiKey()) {
                setIsCorrecting(true);
                const corrector = mode === 'task' ? convertToSingleTask : correctVoiceTranscript;
                corrector(rawText)
                    .then((corrected) => onTranscript(corrected, true))
                    .finally(() => setIsCorrecting(false));
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    };

    const startNativeListening = async () => {
        try {
            const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Mikrofon izni verilmedi.');
                return;
            }

            setIsListening(true);
            ExpoSpeechRecognitionModule.start({
                lang: 'tr-TR',
                interimResults: true,
                maxAlternatives: 1,
            });
        } catch (e) {
            console.error(e);
            setIsListening(false);
        }
    };

    const stopListening = () => {
        if (Platform.OS === 'web') {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
        } else {
            ExpoSpeechRecognitionModule.stop();
        }
        setIsListening(false);
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            if (Platform.OS === 'web') {
                startListening();
            } else {
                startNativeListening();
            }
        }
    };

    // Hem web hem native'de göster

    return (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
                onPress={toggleListening}
                disabled={disabled || isCorrecting}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.button,
                    isListening && styles.buttonActive,
                    isCorrecting && styles.buttonCorrecting,
                ]}>
                    {isCorrecting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.icon}>{isListening ? '⏹' : '🎤'}</Text>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonActive: {
        backgroundColor: 'rgba(245, 87, 108, 0.8)',
    },
    buttonCorrecting: {
        backgroundColor: 'rgba(102, 126, 234, 0.6)',
    },
    icon: {
        fontSize: 18,
    },
});
