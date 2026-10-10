import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

const subscribe = (onChange: () => void) => {
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
};

const getSnapshot = () => AppState.currentState === 'active';

/** true while the app is in the foreground. */
export function useAppActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
