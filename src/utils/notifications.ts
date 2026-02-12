import { supabase } from '@/integrations/supabase/client';

// Register service worker and get push subscription
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

// Convert base64 VAPID key to Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (userId: string): Promise<boolean> => {
  try {
    const registration = await registerServiceWorker();
    if (!registration) return false;

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Check if already subscribed
    let subscription = await (registration as any).pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      // Note: You should generate your own VAPID keys for production
      // For now, using a public VAPID key (you should replace this)
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8WbWKYxBp3nE5qCQXyYZqL1WVYHLdL-YnTdLXq3Lz8rxl6kA_XQGQE';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // Store subscription in database
    const subscriptionJSON = subscription.toJSON();
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscriptionJSON.endpoint!,
        p256dh: subscriptionJSON.keys!.p256dh,
        auth: subscriptionJSON.keys!.auth,
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Error storing push subscription:', error);
      return false;
    }

    console.log('Push subscription saved successfully');
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
};

// Send push notification via edge function
export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string
): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { userId, title, body }
    });

    if (error) {
      console.error('Error sending push notification:', error);
    } else {
      console.log('Push notification sent:', data);
    }
  } catch (error) {
    console.error('Error invoking push notification function:', error);
  }
};

// Show local notification (fallback)
export const showNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  }
};

// Initialize notifications system
export const initializeNotifications = async (userId: string) => {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    await subscribeToPushNotifications(userId);
  }
};
