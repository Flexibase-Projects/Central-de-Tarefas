import express from 'express';
import { supabase } from '../config/supabase.js';
import { Activity } from '../types/index.js';

const router = express.Router();
const ACTIVITY_COVERS_BUCKET = 'activity-covers';

// Get all activities
router.get('/', async (req, res) => {
  try {
    // Check if Supabase is configured
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return res.status(503).json({ 
        error: 'Supabase not configured',
        message: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env'
      });
    }

    const { data, error } = await supabase
      .from('cdt_activities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch activities' });
  }
});

// Get activity by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('cdt_activities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch activity' });
  }
});

// Create new activity
router.post('/', async (req, res) => {
  try {
    // Check if Supabase is configured
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      return res.status(503).json({ 
        error: 'Supabase not configured',
        message: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env'
      });
    }

    const activity: Partial<Activity> = req.body;
    console.log('Creating activity with data:', activity);
    
    // Validar status se fornecido
    const validStatuses = ['backlog', 'todo', 'in_progress', 'review', 'done'];
    if (activity.status && !validStatuses.includes(activity.status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Validar priority se fornecido
    const validPriorities = ['low', 'medium', 'high'];
    if (activity.priority && !validPriorities.includes(activity.priority)) {
      return res.status(400).json({ 
        error: 'Invalid priority',
        message: `Priority must be one of: ${validPriorities.join(', ')}`
      });
    }
    
    const { data, error } = await supabase
      .from('cdt_activities')
      .insert([{
        name: activity.name,
        description: activity.description || null,
        status: activity.status || 'backlog',
        due_date: activity.due_date || null,
        priority: activity.priority || 'medium',
        assigned_to: activity.assigned_to || null,
        cover_image_url: activity.cover_image_url ?? null,
        created_by: activity.created_by || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating activity:', error);
      throw error;
    }
    
    console.log('Activity created successfully:', data);
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating activity:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create activity',
      details: error.details || error.hint || null
    });
  }
});

// Upload cover image (backend uses SERVICE_ROLE so bucket doesn't need client policies)
router.post('/:id/cover', async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body as { image?: string };
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Body must include { image: "data:image/...;base64,..." }' });
    }
    const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'jpg';
    const base64Data = match ? match[2] : image;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch {
      return res.status(400).json({ error: 'Invalid base64 image' });
    }
    const MAX_COVER_BYTES = 10 * 1024 * 1024; // 10MB
    if (buffer.length > MAX_COVER_BYTES) {
      return res.status(413).json({ error: 'Imagem muito grande. O tamanho máximo é 10MB.' });
    }
    const path = `${id}/cover-${Date.now()}.${ext}`;
    const contentType = match ? `image/${match[1]}` : 'image/jpeg';
    const { error: uploadError } = await supabase.storage.from(ACTIVITY_COVERS_BUCKET).upload(path, buffer, {
      upsert: true,
      contentType,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(ACTIVITY_COVERS_BUCKET).getPublicUrl(path);
    res.json({ url: data.publicUrl });
  } catch (error: any) {
    console.error('Error uploading activity cover:', error);
    res.status(500).json({ error: error.message || 'Failed to upload cover' });
  }
});

// Update activity
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: Partial<Activity> = req.body;

    // Validar status se fornecido
    const validStatuses = ['backlog', 'todo', 'in_progress', 'review', 'done'];
    if (updates.status && !validStatuses.includes(updates.status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Validar priority se fornecido
    const validPriorities = ['low', 'medium', 'high'];
    if (updates.priority && !validPriorities.includes(updates.priority)) {
      return res.status(400).json({ 
        error: 'Invalid priority',
        message: `Priority must be one of: ${validPriorities.join(', ')}`
      });
    }

    // Preparar update apenas com campos válidos
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.assigned_to !== undefined) updateData.assigned_to = updates.assigned_to;
    if (updates.cover_image_url !== undefined) updateData.cover_image_url = updates.cover_image_url;

    let { data, error } = await supabase
      .from('cdt_activities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    // Coluna cover_image_url inexistente: retorna 503 com instrução em vez de retry sem capa
    if (error && (error.code === 'PGRST204' || /column.*does not exist|cover_image_url/i.test(String(error.message))) && updateData.cover_image_url !== undefined) {
      return res.status(503).json({
        error: 'Para salvar a capa, adicione a coluna no banco. No Supabase (SQL Editor) execute:',
        code: 'MIGRATION_REQUIRED',
        sql: 'ALTER TABLE cdt_activities ADD COLUMN IF NOT EXISTS cover_image_url TEXT NULL;',
      });
    }

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: error.message || 'Failed to update activity' });
  }
});

// Delete activity
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: error.message || 'Failed to delete activity' });
  }
});

export default router;
