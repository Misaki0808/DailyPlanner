import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Plans } from '../../types';
import { getCategoryColor, getCategoryLabel, normalizeCategoryId } from '../../utils/categories';
import { useTheme } from '../../context/AppContext';

interface CategoryDonutChartProps {
  plans: Plans;
}

/**
 * Tüm görevlerin kategori dağılımı (halka grafik).
 *
 * Bu görsel daha önce WeeklyProgressChart'ın içinde duruyordu, ama HAFTALIK
 * bir grafik değil: tüm geçmişi kapsıyor. Haftalık grafikler tek bileşende
 * birleştirilirken buraya ayrıldı ki Genel Bakış modalindeki özellik
 * kaybolmasın.
 */
export default function CategoryDonutChart({ plans }: CategoryDonutChartProps) {
  const theme = useTheme();

  const data = useMemo(() => {
    const counts: Record<string, number> = {};

    Object.values(plans).forEach(dayTasks => {
      (dayTasks || []).forEach(task => {
        // Tanınmayan kimlikler tek bir "Diğer" dilimine indirgenir; İstatistikler
        // listesiyle aynı gruplama.
        const category = normalizeCategoryId(task.category);
        counts[category] = (counts[category] || 0) + 1;
      });
    });

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return [];

    // Renk artık kategorinin kendi rengi; önceden sıraya göre dört renk
    // döngüsel atanıyordu ve aynı kategori farklı ekranlarda farklı renkte
    // görünüyordu.
    return Object.entries(counts).map(([category, count]) => {
      const percent = Math.round((count / total) * 100);
      return {
        value: count,
        color: getCategoryColor(category),
        text: `${percent}%`,
        category,
        label: getCategoryLabel(category),
        percent,
      };
    });
  }, [plans]);

  if (data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>🏷️ Kategori Dağılımı (Genel)</Text>

      {/*
        Halka grafiğin kendisi ekran okuyucuya hiçbir şey anlatmıyor: SVG
        dilimlerinin metin karşılığı yok. WeeklyChart'taki çubuk etiketleri
        deseniyle aynı şekilde, önce halkanın özeti veriliyor, ardından her
        dilim tek tek etiketleniyor. Görsel liste gerekmediği için dilim
        etiketleri sıfır yükseklikli bir katmanda duruyor.
      */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Kategori dağılımı halka grafiği. Toplam ${total} görev, ${data.length} kategori.`}
      >
        <View style={styles.chartContainer}>
          <PieChart
            data={data}
            donut
            showText
            textColor={theme.text}
            radius={80}
            innerRadius={50}
            textSize={12}
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={[styles.centerValue, { color: theme.text }]}>{total}</Text>
                <Text style={[styles.centerCaption, { color: theme.textMuted }]}>Görev</Text>
              </View>
            )}
          />
        </View>
      </View>

      <View style={styles.sliceLabels} importantForAccessibility="yes">
        {data.map(slice => (
          <Text
            key={slice.category}
            accessible
            accessibilityLabel={`${slice.label}: ${slice.value} görev, yüzde ${slice.percent}`}
            style={styles.sliceLabelText}
          >
            {slice.label} {slice.value}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  centerCaption: {
    fontSize: 10,
  },
  // Dilim etiketleri yalnız ekran okuyucu için; görsel olarak yer kaplamaz.
  sliceLabels: {
    height: 0,
    overflow: 'hidden',
  },
  sliceLabelText: {
    fontSize: 1,
  },
});
