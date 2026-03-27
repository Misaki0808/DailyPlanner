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
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { Task } from '../types';
import { TASK_CATEGORIES, getCategoryById } from '../utils/categories';

interface TaskEditModalProps {
    visible: boolean;
    task: Task;
    onSave: (updates: { title?: string; note?: string; category?: string }) => void;
    onClose: () => void;
}

export default function TaskEditModal({
    visible,
    task,
    onSave,
    onClose,
}: TaskEditModalProps) {
    const { theme } = useApp();
    const [titleText, setTitleText] = useState(task.title);
    const [noteText, setNoteText] = useState(task.note || '');
    const [selectedCategory, setSelectedCategory] = useState(task.category || 'diger');

    useEffect(() => {
        if (visible) {
            setTitleText(task.title);
            setNoteText(task.note || '');
            setSelectedCategory(task.category || 'diger');
        }
    }, [visible, task]);

    const handleSave = () => {
        onSave({
            title: titleText.trim() || task.title,
            note: noteText.trim() || undefined,
            category: selectedCategory,
        });
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.container, { backgroundColor: theme.modalBackground, borderColor: theme.border }]}>
                    <Text style={[styles.title, { color: theme.text }]}>✏️ Görevi Düzenle</Text>

                    {/* Başlık */}
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Başlık</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.accentLight, color: theme.text, borderColor: theme.border }]}
                        value={titleText}
                        onChangeText={setTitleText}
                        placeholder="Görev başlığı..."
                        placeholderTextColor={theme.textMuted}
                        autoFocus
                    />

                    {/* Not */}
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Not</Text>
                    <TextInput
                        style={[styles.input, styles.noteInput, { backgroundColor: theme.accentLight, color: theme.text, borderColor: theme.border }]}
                        value={noteText}
                        onChangeText={setNoteText}
                        placeholder="Not ekle (opsiyonel)..."
                        placeholderTextColor={theme.textMuted}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />

                    {/* Kategori */}
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Kategori</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryScroll}
                    >
                        {TASK_CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        { backgroundColor: isSelected ? cat.color + '30' : theme.accentLight },
                                        isSelected && { borderColor: cat.color, borderWidth: 2 },
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                                    <Text style={[
                                        styles.categoryChipText,
                                        { color: isSelected ? cat.color : theme.textSecondary },
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Aksiyonlar */}
                    <View style={styles.actions}>
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
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 4,
    },
    input: {
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        borderWidth: 1,
        marginBottom: 12,
    },
    noteInput: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    categoryScroll: {
        gap: 8,
        paddingBottom: 12,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        gap: 4,
    },
    categoryEmoji: {
        fontSize: 14,
    },
    categoryChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 8,
        gap: 10,
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
