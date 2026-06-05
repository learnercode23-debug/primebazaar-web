/**
 * Expo Push Notification sender.
 * Looks up the user's Expo push token from MongoDB and sends a push via Expo's API.
 * This works even when the mobile app is closed / backgrounded.
 *
 * Token format:  ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
 * API docs:      https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { connectDB } from './mongodb'
import User from '@/models/User'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export async function sendExpoPush(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    await connectDB()
    const user = await User.findById(userId).select('expoPushToken').lean() as
      | { expoPushToken?: string }
      | null

    const token = user?.expoPushToken
    // Validate token format before calling the API
    if (!token || !token.startsWith('ExponentPushToken[')) return

    const message = {
      to:    token,
      sound: 'default',
      title,
      body,
      data:  data ?? {},
      // Badge count is handled by the client
    }

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept':          'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type':    'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error('[Push] Expo API error:', res.status, txt)
    }
  } catch (err) {
    // Push notifications are non-critical — never crash the order flow
    console.error('[Push] Failed to send notification to user', userId, err)
  }
}
