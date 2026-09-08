import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  processLock,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { serverOrigin } from './environment';

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = serverOrigin(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // legacy JWT keys are deliberately excluded: a service_role key must never enter the app.
  if (!key?.startsWith('sb_publishable_')) {
    throw new Error('공개 인증 키 설정을 확인해 주세요.');
  }
  client = createClient(url, key, {
    auth: {
      ...(Platform.OS !== 'web'
        ? { storage: AsyncStorage, lock: processLock }
        : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
