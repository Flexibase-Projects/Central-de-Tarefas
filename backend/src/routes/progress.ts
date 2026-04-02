import express from 'express';
import { getEffectiveUserId } from '../middleware/auth.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import { getWorkspaceModuleState } from '../services/workspace-modules.js';
import { getWorkspaceUserProgress } from '../services/workspace-gamification.js';
import { getXpThresholds } from '../utils/level-xp.js';
import {
  isSupabaseConnectionRefused,
  SUPABASE_UNAVAILABLE_MESSAGE,
} from '../utils/supabase-errors.js';

const router = express.Router();

function buildDisabledGamificationPayload() {
  return {
    completedTodos: 0,
    completedActivities: 0,
    totalXp: 0,
    level: 1,
    xpInCurrentLevel: 0,
    xpForNextLevel: 1,
    streakDays: 0,
    achievements: [],
    gamificationEnabled: false,
  };
}

router.get('/', async (req, res) => {
  const userId = getEffectiveUserId(req);
  const workspaceContext = getWorkspaceContext(req);

  if (!userId) {
    return res.status(401).json({ error: 'Nao autenticado' });
  }

  if (!workspaceContext?.workspace.id) {
    return res.status(400).json({
      error: 'Workspace context unavailable.',
      code: 'WORKSPACE_REQUIRED',
    });
  }

  try {
    const gamificationModule = await getWorkspaceModuleState(workspaceContext.workspace.id, 'gamification');
    const gamificationEnabled = Boolean(gamificationModule?.available && gamificationModule.is_enabled);

    if (!gamificationEnabled) {
      return res.json({
        ...buildDisabledGamificationPayload(),
        gamificationReason: gamificationModule?.reason ?? 'not_configured',
      });
    }

    const progress = await getWorkspaceUserProgress(workspaceContext.workspace.id, userId);

    return res.json({
      completedTodos: progress.completedTodos,
      completedActivities: progress.completedActivities,
      totalXp: progress.totalXp,
      level: progress.level,
      xpInCurrentLevel: progress.xpInCurrentLevel,
      xpForNextLevel: progress.xpForNextLevel,
      streakDays: progress.streakDays,
      tier: {
        name: progress.tier.name,
        color: progress.tier.color,
        glowColor: progress.tier.glowColor,
        cssClass: progress.tier.cssClass,
        gradient: progress.tier.gradient ?? null,
      },
      achievements: progress.achievements,
      gamificationEnabled: true,
    });
  } catch (error: unknown) {
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error fetching progress:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Falha ao buscar progresso',
    });
  }
});

router.get('/thresholds', (_req, res) => {
  return res.json({ thresholds: getXpThresholds().slice(0, 25) });
});

export default router;
