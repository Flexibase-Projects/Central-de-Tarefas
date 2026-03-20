import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Comentários de uma atividade (antes de /:projectId para não capturar "by-activity")
router.get('/by-activity/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;

    const { data, error } = await supabase
      .from('cdt_comments')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching activity comments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch activity comments' });
  }
});

// Get all comments for a project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('cdt_comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch comments' });
  }
});

// Create a new comment (projeto OU atividade)
router.post('/', async (req, res) => {
  try {
    const { project_id, activity_id, content, author_name, author_email } = req.body;

    const hasProject = Boolean(project_id);
    const hasActivity = Boolean(activity_id);
    if (!content || hasProject === hasActivity) {
      return res.status(400).json({
        error: 'content e exatamente um entre project_id ou activity_id são obrigatórios',
      });
    }

    const { data, error } = await supabase
      .from('cdt_comments')
      .insert({
        project_id: hasProject ? project_id : null,
        activity_id: hasActivity ? activity_id : null,
        task_id: null,
        content,
        author_name: author_name || null,
        author_email: author_email || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: error.message || 'Failed to create comment' });
  }
});

// Update a comment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const { data, error } = await supabase
      .from('cdt_comments')
      .update({ content })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: error.message || 'Failed to update comment' });
  }
});

// Delete a comment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('cdt_comments')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: error.message || 'Failed to delete comment' });
  }
});

export default router;
