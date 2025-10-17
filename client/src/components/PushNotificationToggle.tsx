import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setIsSupported(false);
      setIsLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPush = async () => {
    setIsLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast({
          title: "Permesso negato",
          description: "Devi consentire le notifiche per ricevere i promemoria.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get VAPID public key from backend
      const vapidResponse = await fetch('/api/push-subscription/vapid-public-key');
      const { publicKey } = await vapidResponse.json();

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to backend
      await apiRequest('POST', '/api/push-subscription', {
        subscription: JSON.stringify(subscription)
      });

      setIsSubscribed(true);
      toast({
        title: "Notifiche attivate",
        description: "Riceverai un promemoria alle 19:00 per compilare il rapportino.",
      });
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: "Errore",
        description: "Impossibile attivare le notifiche. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove subscription from backend
      await apiRequest('DELETE', '/api/push-subscription', {});

      setIsSubscribed(false);
      toast({
        title: "Notifiche disattivate",
        description: "Non riceverai più promemoria per i rapportini.",
      });
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: "Errore",
        description: "Impossibile disattivare le notifiche. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (!isSupported) {
      toast({
        title: "Notifiche non supportate",
        description: "Il tuo browser non supporta le notifiche push. Prova ad usare Safari su iOS 16.4+ o un browser desktop.",
        variant: "destructive",
      });
      return;
    }
    
    if (isSubscribed) {
      unsubscribeFromPush();
    } else {
      subscribeToPush();
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      disabled={isLoading}
      data-testid="button-push-notifications"
      title={
        !isSupported
          ? "Notifiche non supportate su questo browser"
          : isSubscribed
          ? "Disattiva notifiche promemoria"
          : "Attiva notifiche promemoria"
      }
    >
      {!isSupported ? (
        <BellOff className="h-4 w-4 opacity-50" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
    </Button>
  );
}
