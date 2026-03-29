import express from 'express';
import { getRepositoryInfo, getRecentCommits, getContributors, getReadme, getTotalCommits } from '../services/github.js';
import { isValidationError, parseGitHubRepositoryUrl, requirePositiveInt } from '../utils/validation.js';

const router = express.Router();

// Get repository info
router.get('/repo', async (req, res) => {
  try {
    const parsed = parseGitHubRepositoryUrl(req.query.url);
    if (!parsed) {
      return res.status(400).json({ error: 'GitHub URL is required' });
    }

    const repoInfo = await getRepositoryInfo(parsed.owner, parsed.repo);
    if (!repoInfo) {
      return res.status(404).json({
        error: 'Repository not found or access denied',
        hint: 'If the repo is in an organization, ensure your token has access to that org and, if the org uses SAML SSO, authorize the token for the organization in GitHub token settings.',
      });
    }

    res.json(repoInfo);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching repository info:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch repository info' });
  }
});

// Get recent commits
router.get('/commits', async (req, res) => {
  try {
    const parsed = parseGitHubRepositoryUrl(req.query.url);
    if (!parsed) {
      return res.status(400).json({ error: 'GitHub URL is required' });
    }

    const commits = await getRecentCommits(parsed.owner, parsed.repo, req.query.limit !== undefined ? requirePositiveInt(req.query.limit, 'limit') : 10);
    res.json(commits);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching commits:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch commits' });
  }
});

// Get total commits count
router.get('/commits-count', async (req, res) => {
  try {
    const parsed = parseGitHubRepositoryUrl(req.query.url);
    if (!parsed) {
      return res.status(400).json({ error: 'GitHub URL is required' });
    }

    const totalCommits = await getTotalCommits(parsed.owner, parsed.repo);
    res.json({ count: totalCommits });
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching commit count:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch commit count' });
  }
});

// Get contributors
router.get('/contributors', async (req, res) => {
  try {
    const parsed = parseGitHubRepositoryUrl(req.query.url);
    if (!parsed) {
      return res.status(400).json({ error: 'GitHub URL is required' });
    }

    const contributors = await getContributors(parsed.owner, parsed.repo);
    res.json(contributors);
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching contributors:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch contributors' });
  }
});

// Get README
router.get('/readme', async (req, res) => {
  try {
    const parsed = parseGitHubRepositoryUrl(req.query.url);
    if (!parsed) {
      return res.status(400).json({ error: 'GitHub URL is required' });
    }

    const readme = await getReadme(parsed.owner, parsed.repo);
    if (readme === null) {
      return res.status(404).json({ error: 'README not found' });
    }

    res.json({ content: readme });
  } catch (error: any) {
    if (isValidationError(error)) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching README:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch README' });
  }
});

export default router;
