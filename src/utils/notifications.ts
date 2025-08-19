// src/utils/notifications.ts
import notifee, { AndroidImportance, TimestampTrigger, TriggerType } from '@notifee/react-native';
import { Platform } from 'react-native';

const CHANNEL_ID = 'clotidy-reminder';

export async function ensureNotificationSetup() {
  // iOS/Android 13+ の権限
  await notifee.requestPermission();

  // Android 通知チャンネル（最優先でバナーに出したいので HIGH）
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: '착용 리마인드',
      importance: AndroidImportance.HIGH,
      lights: false,
      vibration: true,
    });
  }
}

export async function showReminderNow(title: string, body: string) {
  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher', // 既定のアプリアイコン
      pressAction: { id: 'default' }, // 通知タップでアプリを開く
    },
  });
}

/** 指定日時に1回鳴らすスケジュール（端末ローカルでトリガー） */
export async function scheduleReminderAt(date: Date, title: string, body: string) {
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: date.getTime(),
    alarmManager: true, // Android: アラームマネージャ使用で信頼度UP
  };

  await notifee.createTriggerNotification(
    {
      title,
      body,
      android: { channelId: CHANNEL_ID, smallIcon: 'ic_launcher' },
    },
    trigger
  );
}
