import express from 'express';
import { supabase } from '../config/supabase.js';
import { isSupabaseConnectionRefused, SUPABASE_UNAVAILABLE_MESSAGE } from '../utils/supabase-errors.js';
import { PRESET_ACHIEVEMENTS } from '../utils/achievement-engine.js';
import { getWorkspaceContext } from '../middleware/workspace.js';
import { hasRole } from '../services/permissions.js';
import { getRequesterId as getAuthRequesterId } from '../middleware/auth.js';
import { getWorkspaceModuleState } from '../services/workspace-modules.js';
import { listWorkspaceAchievements } from '../services/workspace-gamification.js';
import { getTrimmedString, isValidationError, requireString } from '../utils/validation.js';

const router = express.Router();

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

async function ensureAdmin(req: express.Request, res: express.Response): Promise<string | null> {
  const requesterId = getAuthRequesterId(req);
  if (!requesterId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const isAdmin = await hasRole(requesterId, 'admin');
  if (!isAdmin) {
    res.status(403).json({ error: 'Only admins can manage achievements.' });
    return null;
  }
  return requesterId;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function mapDbAchievement(a: {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xp_bonus: number | null;
  reward_xp_fixed?: number | null;
  reward_percent?: number | null;
  condition_type?: string | null;
  condition_value?: number | null;
  mode?: string | null;
  is_active?: boolean;
}) {
  const rewardXpFixed = parseNumber(a.reward_xp_fixed, parseNumber(a.xp_bonus, 0));
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    description: a.description,
    icon: a.icon,
    category: a.category,
    rarity: a.rarity,
    xpBonus: rewardXpFixed,
    rewardXpFixed,
    rewardPercent: parseNumber(a.reward_percent, 0),
    conditionType: a.condition_type ?? null,
    conditionValue: a.condition_value ?? null,
    mode: a.mode ?? 'global_auto',
    isActive: a.is_active ?? true,
  };
}

router.get('/', async (req, res) => {
  const userId = getAuthRequesterId(req);
  const workspaceId = getWorkspaceContext(req)?.workspace.id ?? null;

  try {
    if (!workspaceId) {
      return res.status(400).json({
        error: 'Workspace context unavailable.',
        code: 'WORKSPACE_REQUIRED',
      });
    }

    const includeInactiveRaw = String(req.query.includeInactive ?? req.query.include_inactive ?? '')
      .trim()
      .toLowerCase();
    const canIncludeInactive =
      includeInactiveRaw === '1' || includeInactiveRaw === 'true' || includeInactiveRaw === 'yes';
    const isAdmin = userId ? await hasRole(userId, 'admin') : false;
    const gamificationModule = await getWorkspaceModuleState(workspaceId, 'gamification');

    if (!gamificationModule?.available) {
      const disabledAchievements = await listWorkspaceAchievements(
        workspaceId,
        null,
        isAdmin && canIncludeInactive,
      );
      return res.json(
        disabledAchievements.map((achievement) => ({
          ...achievement,
          unlocked: false,
          unlockedAt: null,
        })),
      );
    }

    let query = supabase
      .from('cdt_achievements')
      .select(
        'id, slug, name, description, icon, category, rarity, xp_bonus, reward_xp_fixed, reward_percent, condition_type, condition_value, mode, is_active',
      )
      .order('slug');

    if (!(isAdmin && canIncludeInactive)) {
      query = query.eq('is_active', true);
    }

    const { data: dbAchievements, error: dbError } = await query;

    if (dbError) {
      const staticList = PRESET_ACHIEVEMENTS.map((a) => ({
        id: a.slug,
        slug: a.slug,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        rarity: a.rarity,
        xpBonus: a.xpBonus,
        rewardXpFixed: a.xpBonus,
        rewardPercent: 0,
        conditionType: a.conditionType,
        conditionValue: a.conditionValue,
        mode: 'global_auto',
        isActive: true,
        unlocked: false,
        unlockedAt: null,
      }));
      return res.json(staticList);
    }

    const mapped = (dbAchievements ?? []).map((a: unknown) => mapDbAchievement(a as any));

    if (!userId) {
      return res.json(
        mapped.map((a: ReturnType<typeof mapDbAchievement>) => ({
          ...a,
          unlocked: false,
          unlockedAt: null,
        })),
      );
    }

    const unlockedMap = new Map<string, string | null>();
    try {
      const { data: userAch, error: userAchError } = await supabase
        .from('cdt_user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (!userAchError && userAch) {
        for (const row of userAch as Array<{ achievement_id: string; unlocked_at: string | null }>) {
          unlockedMap.set(row.achievement_id, row.unlocked_at ?? null);
        }
      }
    } catch {
      // Keep all locked
    }

    return res.json(
      mapped.map((a: ReturnType<typeof mapDbAchievement>) => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) ?? null,
      })),
    );
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error fetching achievements:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch achievements',
    });
  }
});

function buildAchievementCreatePayload(input: Record<string, unknown>) {
  const rewardXpFixed = parseNumber(input.rewardXpFixed ?? input.reward_xp_fixed ?? input.xpBonus ?? input.xp_bonus, 0);
  const rewardPercent = parseNumber(input.rewardPercent ?? input.reward_percent, 0);
  const conditionType = (input.conditionType ?? input.condition_type ?? null) as string | null;
  const conditionValueRaw = input.conditionValue ?? input.condition_value;
  const conditionValue =
    conditionValueRaw === undefined || conditionValueRaw === null || conditionValueRaw === ''
      ? null
      : parseNumber(conditionValueRaw, 0);

  const modeRaw = String(input.mode ?? 'global_auto');
  const mode = ['global_auto', 'linked_item', 'manual'].includes(modeRaw) ? modeRaw : 'global_auto';

  const name = requireString(input.name, 'name', { minLength: 2, maxLength: 200 });
  const slugRaw = getTrimmedString(input.slug) ?? '';
  const slug = (slugRaw || slugify(name || `achievement_${Date.now()}`)).slice(0, 80);

  return {
    slug,
    name,
    description: String(input.description ?? '').trim(),
    icon: String(input.icon ?? 'emoji_events').trim() || 'emoji_events',
    category: String(input.category ?? 'geral').trim() || 'geral',
    rarity: String(input.rarity ?? 'common').trim() || 'common',
    xp_bonus: rewardXpFixed,
    reward_xp_fixed: rewardXpFixed,
    reward_percent: rewardPercent,
    condition_type: conditionType,
    condition_value: conditionValue,
    mode,
    is_active: input.isActive === undefined ? true : Boolean(input.isActive),
  };
}

function buildAchievementUpdatePayload(input: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};

  if (input.slug !== undefined) payload.slug = requireString(input.slug, 'slug', { minLength: 1, maxLength: 80 });
  if (input.name !== undefined) payload.name = requireString(input.name, 'name', { minLength: 2, maxLength: 200 });
  if (input.description !== undefined) payload.description = getTrimmedString(input.description);
  if (input.icon !== undefined) payload.icon = getTrimmedString(input.icon) || 'emoji_events';
  if (input.category !== undefined) payload.category = getTrimmedString(input.category) || 'geral';
  if (input.rarity !== undefined) payload.rarity = getTrimmedString(input.rarity) || 'common';
  if (input.mode !== undefined) {
    const modeRaw = getTrimmedString(input.mode) || '';
    payload.mode = ['global_auto', 'linked_item', 'manual'].includes(modeRaw) ? modeRaw : 'global_auto';
  }
  if (input.isActive !== undefined) payload.is_active = Boolean(input.isActive);
  if (input.is_active !== undefined) payload.is_active = Boolean(input.is_active);

  if (
    input.rewardXpFixed !== undefined ||
    input.reward_xp_fixed !== undefined ||
    input.xpBonus !== undefined ||
    input.xp_bonus !== undefined
  ) {
    const fixed = parseNumber(
      input.rewardXpFixed ?? input.reward_xp_fixed ?? input.xpBonus ?? input.xp_bonus,
      0,
    );
    payload.reward_xp_fixed = fixed;
    payload.xp_bonus = fixed;
  }
  if (input.rewardPercent !== undefined || input.reward_percent !== undefined) {
    payload.reward_percent = parseNumber(input.rewardPercent ?? input.reward_percent, 0);
  }
  if (input.conditionType !== undefined || input.condition_type !== undefined) {
    payload.condition_type = (input.conditionType ?? input.condition_type ?? null) as string | null;
  }
  if (input.conditionValue !== undefined || input.condition_value !== undefined) {
    const raw = input.conditionValue ?? input.condition_value;
    payload.condition_value =
      raw === null || raw === '' || raw === undefined ? null : parseNumber(raw, 0);
  }

  return payload;
}

router.post('/', async (req, res) => {
  const requesterId = await ensureAdmin(req, res);
  if (!requesterId) return;

  const payload = buildAchievementCreatePayload(req.body as Record<string, unknown>);
  if (!payload.name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('cdt_achievements')
      .insert(payload)
      .select(
        'id, slug, name, description, icon, category, rarity, xp_bonus, reward_xp_fixed, reward_percent, condition_type, condition_value, mode, is_active',
      )
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(mapDbAchievement(data as any));
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error creating achievement:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create achievement',
    });
  }
});

async function updateAchievement(req: express.Request, res: express.Response) {
  const requesterId = await ensureAdmin(req, res);
  if (!requesterId) return;

  const { id } = req.params;
  const updates = req.body as Record<string, unknown>;
  delete updates.id;

  const payload = buildAchievementUpdatePayload(updates);

  try {
    const { data, error } = await supabase
      .from('cdt_achievements')
      .update(payload)
      .eq('id', id)
      .select(
        'id, slug, name, description, icon, category, rarity, xp_bonus, reward_xp_fixed, reward_percent, condition_type, condition_value, mode, is_active',
      )
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Achievement not found' });
    return res.json(mapDbAchievement(data as any));
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error updating achievement:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update achievement',
    });
  }
}

router.put('/:id', updateAchievement);
router.patch('/:id', updateAchievement);

router.delete('/:id', async (req, res) => {
  const requesterId = await ensureAdmin(req, res);
  if (!requesterId) return;

  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('cdt_achievements')
      .update({ is_active: false })
      .eq('id', id)
      .select('id')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Achievement not found' });
    return res.json({ message: 'Achievement deactivated', id });
  } catch (error: unknown) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    if (isSupabaseConnectionRefused(error)) {
      return res.status(503).json({ error: SUPABASE_UNAVAILABLE_MESSAGE });
    }
    console.error('Error deleting achievement:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to deactivate achievement',
    });
  }
});

export default router;
