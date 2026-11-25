import { useReducer } from 'react';
import type { Scene } from '@chiko111/scene-kit-core';

const LIMIT = 100;

type Recipe<T> = (value: T) => T;

type State<T> = {
  past: T[];
  present: T;
  future: T[];
  /** Snapshot taken when a gesture (drag, typing in a field) starts. */
  gestureBase: T | null;
};

type Action<T> =
  | { type: 'apply'; recipe: Recipe<T> }
  | { type: 'gestureStart' }
  | { type: 'gestureEnd' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; value: T };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
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
      return { past: [], present: action.value, future: [], gestureBase: null };
  }
}

function init<T>(value: T): State<T> {
  return { past: [], present: value, future: [], gestureBase: null };
}

/**
 * Generic undo/redo. Recipes must be pure (StrictMode runs reducers twice).
 * `apply` outside a gesture = one undo step; inside beginGesture/endGesture = one step in total.
 */
export function useHistory<T>(initial: T) {
  const [state, dispatch] = useReducer(reducer<T>, initial, init<T>);
  return {
    present: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    apply: (recipe: Recipe<T>) => dispatch({ type: 'apply', recipe }),
    beginGesture: () => dispatch({ type: 'gestureStart' }),
    endGesture: () => dispatch({ type: 'gestureEnd' }),
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    reset: (value: T) => dispatch({ type: 'reset', value }),
  };
}

export type History<T> = ReturnType<typeof useHistory<T>>;

export type SceneHistory = {
  scene: Scene;
  canUndo: boolean;
  canRedo: boolean;
  apply: (recipe: (scene: Scene) => Scene) => void;
  beginGesture: () => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;
  reset: (scene: Scene) => void;
};

/** Undo/redo for a scene (same API as before). */
export function useSceneHistory(initial: Scene): SceneHistory {
  const h = useHistory<Scene>(initial);
  return { ...h, scene: h.present };
}

/**
 * A SceneHistory view onto a part of a bigger document (e.g. one scene of a page):
 * edits go through the parent's history, so there is a single undo stack.
 */
export function focusSceneHistory<T>(
  parent: History<T>,
  get: (value: T) => Scene,
  set: (value: T, scene: Scene) => T,
): SceneHistory {
  return {
    scene: get(parent.present),
    canUndo: parent.canUndo,
    canRedo: parent.canRedo,
    apply: (recipe) =>
      parent.apply((value) => {
        const current = get(value);
        const next = recipe(current);
        return next === current ? value : set(value, next);
      }),
    beginGesture: parent.beginGesture,
    endGesture: parent.endGesture,
    undo: parent.undo,
    redo: parent.redo,
    reset: (scene) => parent.apply((value) => set(value, scene)),
  };
}
