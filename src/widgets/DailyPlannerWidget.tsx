import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface WidgetTask {
  id: string;
  title: string;
  done: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface DailyPlannerWidgetProps {
  date: string;
  tasks: WidgetTask[];
}

function formatDateTR(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${d.getDate()} ${months[d.getMonth()]} ${days[d.getDay()]}`;
  } catch {
    return dateStr;
  }
}

export function DailyPlannerWidget({ date, tasks }: DailyPlannerWidgetProps) {
  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const displayTasks = tasks.slice(0, 4);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 16,
      }}
      clickAction="OPEN_APP"
    >
      {/* Header: Date + Count */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <TextWidget
          text={`📅 ${formatDateTR(date)}`}
          style={{
            fontSize: 14,
            color: '#e0e0ff',
            fontWeight: '700',
          }}
        />
        <TextWidget
          text={`${doneCount}/${totalCount}`}
          style={{
            fontSize: 13,
            color: '#a0a0cc',
          }}
        />
      </FlexWidget>

      {/* Progress Bar */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 6,
          backgroundColor: '#2a2a4e',
          borderRadius: 3,
          marginBottom: 12,
        }}
      >
        <FlexWidget
          style={{
            width: `${progress}%` as any,
            height: 6,
            backgroundColor: progress === 100 ? '#4ade80' : '#7c3aed',
            borderRadius: 3,
          }}
        />
      </FlexWidget>

      {/* Tasks */}
      {displayTasks.length === 0 ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="🎉 Bugün için görev yok!"
            style={{
              fontSize: 14,
              color: '#8888aa',
            }}
          />
        </FlexWidget>
      ) : (
        displayTasks.map((task, i) => (
          <FlexWidget
            key={task.id || `task-${i}`}
            style={{
              width: 'match_parent',
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: i < displayTasks.length - 1 ? 6 : 0,
              paddingVertical: 2,
            }}
          >
            <TextWidget
              text={task.done ? '✅' : '⬜'}
              style={{
                fontSize: 14,
                marginRight: 8,
              }}
            />
            <TextWidget
              text={task.title}
              style={{
                fontSize: 13,
                color: task.done ? '#666688' : '#e0e0ff',
                textDecorationLine: task.done ? 'line-through' : 'none',
                flex: 1,
              }}
            />
            {task.priority === 'high' && (
              <TextWidget
                text="🔴"
                style={{ fontSize: 10 }}
              />
            )}
          </FlexWidget>
        ))
      )}

      {/* "more" indicator */}
      {totalCount > 4 && (
        <TextWidget
          text={`+${totalCount - 4} görev daha...`}
          style={{
            fontSize: 11,
            color: '#7777aa',
            marginTop: 4,
            textAlign: 'center',
          }}
        />
      )}
    </FlexWidget>
  );
}
