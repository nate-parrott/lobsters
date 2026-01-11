import { PersistentState, createInitialPersistentState } from './types';

const STORAGE_KEY = 'lobsterfolk_state';

export function loadPersistentState(): PersistentState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as PersistentState;
    }
  } catch (e) {
    console.warn('Failed to load persistent state:', e);
  }
  return createInitialPersistentState();
}

export function savePersistentState(state: PersistentState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save persistent state:', e);
  }
}
