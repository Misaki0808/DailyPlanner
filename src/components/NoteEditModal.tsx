import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

interface NoteEditModalProps {
    visible: boolean;
    taskTitle: string;
    currentNote: string;
    onSave: (note: string) => void;
    onDelete: () => void;
    onClose: () => void;
}

export default function NoteEditModal({
    visible,
    taskTitle,
    currentNote,
    onSave,
    onDelete,
    onClose,
}: NoteEditModalProps) {
    const { theme } = useApp();
    const [noteText, setNoteText] = useState(currentNote);

    useEffect(() => {
        if (visible) {
            setNoteText(currentNote);
        }
    }, [visible, currentNote]);

    const handleSave = () => {
        if (noteText.trim()) {
            onSave(noteText.trim());
        }
        onClose();
    };

    const handleDelete = () => {
        onDelete();
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.container, { backgroundColor: theme.modalBackground, borderColor: theme.border }]}>
                    <Text style={[styles.title, { color: theme.text }]}>
                        {currentNote ? '📝 Notu Düzenle' : '📝 Not Ekle'}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>{taskTitle}</Text>

                    <TextInput
                        style={[styles.input, { backgroundColor: theme.accentLight, color: theme.text, borderColor: theme.border }]}
                        placeholder="Notunuzu yazın..."
                        placeholderTextColor={theme.textMuted}
                        value={noteText}
                        onChangeText={setNoteText}
                        multiline
                        numberOfLines={3}
                        autoFocus
                    />

                    <View style={styles.actions}>
                        {currentNote ? (
                            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                                <Text style={[styles.deleteBtnText, { color: theme.error }]}>🗑 Sil</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <LinearGradient
                                colors={theme.accentGradient}
                                style={styles.saveBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.saveBtnText}>Kaydet</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 16,
    },
    input: {
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
        borderWidth: 1,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 16,
        gap: 10,
    },
    deleteBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginRight: 'auto',
    },
    deleteBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    saveBtn: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    saveBtnGradient: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
