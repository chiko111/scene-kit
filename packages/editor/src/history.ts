import { useReducer } from 'react';
import type { Scene } from '@chiko111/scene-kit-core';

const LIMIT = 100;

type Recipe = (scene: Scene) => Scene;

type State = {
  past: Scene[];
  present: Scene;
  future: Scene[];
  /** Snapshot taken when a gesture (drag, typing in a field) starts. */
  gestureBase: Scene | null;
};

type Action =
  | { type: 'apply'; recipe: Recipe }
  | { type: 'gestureStart' }
  | { type: 'gestureEnd' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; scene: Scene };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'apply': {
      const next = action.recipe(state.present);
      if (next === state.present) return state;
      // Inside a gesture: only move `present`, one history entry is pushed on gestureEnd.
      if (state.gestureBase) return { ...state, present: next };
      return { past: [...state.past, state.present].slice(-LIMIT), present: next, future: [], gestureBase: null };
    }
    case 'gestureStart':
      return state.gestureBase ? state : { ...state, gestureBase: state.present };
    case 'gestureEnd': {
      const base = state.gestureBase;
      if (!base) return state;
      if (base === state.present) return { ...state, gestureBase: null };
      return { past: [...state.past, base].slice(-LIMIT), present: state.present, future: [], gestureBase: null };
    }
    case 'undo': {
      const previous = state.past.at(-1);
      if (!previous || state.gestureBase) return state;
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future], gestureBase: null };
    }
    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next || state.gestureBase) return state;
      return { past: [...state.past, state.present].slice(-LIMIT), present: next, future: rest, gestureBase: null };
    }
    case 'reset':
      return { past: [], present: action.scene, future: [], gestureBase: null };
  }
}

const init = (scene: Scene): State => ({ past: [], present: scene, future: [], gestureBase: null });

export type SceneHistory = ReturnType<typeof useSceneHistory>;

/**
 * Undo/redo for the scene. Recipes must be pure (StrictMode runs reducers twice).
 * `apply` outside a gesture = one undo step; inside beginGesture/endGesture = one step in total.
 */
export function useSceneHistory(initial: Scene) {
  const [state, dispatch] = useReducer(reducer, initial, init);

  return {
    scene: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    apply: (recipe: Recipe) => dispatch({ type: 'apply', recipe }),
    beginGesture: () => dispatch({ type: 'gestureStart' }),
    endGesture: () => dispatch({ type: 'gestureEnd' }),
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    reset: (scene: Scene) => dispatch({ type: 'reset', scene }),
  };
}
