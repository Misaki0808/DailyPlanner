import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { DailyPlannerWidget } from './src/widgets/DailyPlannerWidget';
import type { Task } from './src/types';

function getToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetAction = props.widgetAction;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const today = getToday();
      let tasks: Task[] = [];

      try {
        const planJson = await AsyncStorage.getItem(`@dp_plan_${today}`);
        tasks = planJson ? JSON.parse(planJson) as Task[] : [];
      } catch (e) {
        console.log('Widget: AsyncStorage read error', e);
      }

      props.renderWidget(
        <DailyPlannerWidget
          date={today}
          tasks={tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            done: !!t.done,
            priority: t.priority,
          }))}
        />
      );
      break;
    }

    case 'WIDGET_DELETED':
      // Widget kaldırıldı, temizleme gerekiyorsa burada
      break;

    case 'WIDGET_CLICK':
      // clickAction="OPEN_APP" ile otomatik olarak uygulamayı açıyor
      break;

    default:
      break;
  }
}
