import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { useApp } from '../../context/AppContext';
import { getToday, addDays } from '../../utils/dateUtils';
import { Task } from '../../types';

export default function WeeklyProgressChart() {
  const { plans, theme } = useApp();
  
  // Calculate the last 7 days of data
  const chartData = useMemo(() => {
    const today = getToday();
    const data = [];
    
    // Line chart data
    for (let i = 6; i >= 0; i--) {
      const date = addDays(today, -i);
      const dayTasks = plans[date] || [];
      const completed = dayTasks.filter(t => t.done).length;
      data.push({ 
        value: completed, 
        label: date.substring(8, 10), // just the day part e.g. "12"
        dataPointText: completed.toString()
      });
    }
    
    return data;
  }, [plans]);

  // Calculate overall category distribution for pie chart
  const pieData = useMemo(() => {
    const categories: Record<string, number> = {};
    let totalTasks = 0;
    
    Object.values(plans).forEach(dayTasks => {
      dayTasks.forEach(task => {
        if (task.category) {
          categories[task.category] = (categories[task.category] || 0) + 1;
        } else {
          categories['diger'] = (categories['diger'] || 0) + 1;
        }
        totalTasks++;
      });
    });

    const colors = [theme.accent, theme.success, theme.warning, theme.error];
    let idx = 0;
    
    return Object.entries(categories).map(([cat, count]) => {
      const color = colors[idx % colors.length];
      idx++;
      return {
        value: count,
        color,
        text: `${Math.round((count / totalTasks) * 100)}%`,
        category: cat
      };
    });
  }, [plans, theme]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Haftalık Tamamlanma</Text>
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          color={theme.accent}
          thickness={3}
          dataPointsColor={theme.accent}
          textColor={theme.textSecondary}
          textFontSize={12}
          xAxisColor={theme.border}
          yAxisColor={theme.border}
          yAxisTextStyle={{ color: theme.textMuted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: theme.textMuted, fontSize: 10 }}
          width={280}
          height={180}
          isAnimated
          curved
        />
      </View>
      
      {pieData.length > 0 && (
        <>
          <Text style={[styles.title, { color: theme.text, marginTop: 24 }]}>Kategori Dağılımı (Genel)</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData}
              donut
              showText
              textColor={theme.text}
              radius={80}
              innerRadius={50}
              textSize={12}
              centerLabelComponent={() => {
                const total = pieData.reduce((acc, item) => acc + item.value, 0);
                return (
                  <View style={{justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{fontSize: 22, color: theme.text, fontWeight: 'bold'}}>{total}</Text>
                    <Text style={{fontSize: 10, color: theme.textMuted}}>Görev</Text>
                  </View>
                );
              }}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
});
