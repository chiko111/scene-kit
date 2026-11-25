import { createContext } from 'react';

/**
 * What a scene gets from its surroundings. Standalone banners use the defaults; PageView provides
 * its clock (countdowns) and switches parallax on (a standalone banner doesn't scroll as a page).
 */
export type SceneEnv = {
  now: () => number;
  parallax: boolean;
};

export const SceneEnvContext = createContext<SceneEnv>({ now: Date.now, parallax: false });
