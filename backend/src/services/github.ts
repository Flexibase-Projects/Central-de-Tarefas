import { Octokit } from '@octokit/rest';

// Lazy initialization of Octokit - ensures dotenv.config() has run first
let _octokit: Octokit | null = null;

function getOctokit(): Octokit | null {
  if (_octokit === null) {
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      _octokit = new Octokit({ auth: githubToken });
    }
  }
  return _octokit;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  updated_at: string;
  created_at: string;
  size: number;
  watchers_count: number;
  license: string | null;
  topics: string[];
  archived: boolean;
  private: boolean;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
}

export interface GitHubContributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

/**
 * Get repository information from GitHub
 * @param owner Repository owner
 * @param repo Repository name
 */
export async function getRepositoryInfo(owner: string, repo: string): Promise<GitHubRepository | null> {
  const octokitInstance = getOctokit();
  if (!octokitInstance) {
    console.warn('GitHub token not configured. Please set GITHUB_TOKEN in .env');
    return null;
  }

  try {
    const { data } = await octokitInstance.repos.get({ owner, repo });
    return {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      html_url: data.html_url,
      language: data.language,
      stargazers_count: data.stargazers_count,
      forks_count: data.forks_count,
      open_issues_count: data.open_issues_count,
      default_branch: data.default_branch,
      updated_at: data.updated_at,
      created_at: data.created_at,
      size: data.size,
      watchers_count: data.watchers_count,
      license: data.license?.name || null,
      topics: data.topics || [],
      archived: data.archived || false,
      private: data.private || false,
    };
  } catch (error: any) {
    const status = error?.status ?? error?.response?.status;
    const msg = error?.message ?? String(error);
    console.error(`Error fetching repository info (${owner}/${repo}): status=${status} message=${msg}`);
    return null;
  }
}

/**
 * Get total commit count from a repository.
 * Usa listContributors (não stats/contributors) para compatibilidade com tokens
 * fine-grained e orgs; stats/contributors retorna 202 ou exige permissões extras.
 */
export async function getTotalCommits(owner: string, repo: string): Promise<number> {
  const octokitInstance = getOctokit();
  if (!octokitInstance) {
    console.warn('GitHub token not configured. Please set GITHUB_TOKEN in .env');
    return 0;
  }

  try {
    let totalCommits = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data: contributors } = await octokitInstance.repos.listContributors({
        owner,
        repo,
        per_page: 100,
        page,
        anon: 'true',
      });

      if (!contributors || contributors.length === 0) {
        hasMore = false;
      } else {
        totalCommits += contributors.reduce((sum, c) => sum + (c.contributions || 0), 0);
        page++;
        if (contributors.length < 100) hasMore = false;
      }
    }

    return totalCommits;
  } catch (error: any) {
    const status = error?.status ?? error?.response?.status;
    const msg = error?.message ?? String(error);
    console.error(`Error fetching total commits (${owner}/${repo}): status=${status} message=${msg}`);
    return 0;
  }
}

/**
 * Get recent commits from a repository
 * @param owner Repository owner
 * @param repo Repository name
 * @param limit Number of commits to fetch (default: 10)
 */
export async function getRecentCommits(
  owner: string,
  repo: string,
  limit: number = 10
): Promise<GitHubCommit[]> {
  const octokitInstance = getOctokit();
  if (!octokitInstance) {
    console.warn('GitHub token not configured. Please set GITHUB_TOKEN in .env');
    return [];
  }

  try {
    const { data } = await octokitInstance.repos.listCommits({
      owner,
      repo,
      per_page: limit,
    });

    return data.map((commit) => ({
      sha: commit.sha,
      commit: {
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name || 'Unknown',
          email: commit.commit.author?.email || '',
          date: commit.commit.author?.date || '',
        },
      },
      author: commit.author ? {
        login: commit.author.login,
        avatar_url: commit.author.avatar_url,
      } : null,
      html_url: commit.html_url,
    }));
  } catch (error: any) {
    const status = error?.status ?? error?.response?.status;
    const msg = error?.message ?? String(error);
    console.error(`Error fetching commits (${owner}/${repo}): status=${status} message=${msg}`);
    return [];
  }
}

/**
 * Get repository contributors
 * @param owner Repository owner
 * @param repo Repository name
 */
export async function getContributors(owner: string, repo: string): Promise<GitHubContributor[]> {
  const octokitInstance = getOctokit();
  if (!octokitInstance) {
    console.warn('GitHub token not configured. Please set GITHUB_TOKEN in .env');
    return [];
  }

  try {
    const { data } = await octokitInstance.repos.listContributors({ owner, repo });
    return data.map((contributor) => ({
      login: contributor.login,
      avatar_url: contributor.avatar_url,
      contributions: contributor.contributions,
    }));
  } catch (error: any) {
    const status = error?.status ?? error?.response?.status;
    const msg = error?.message ?? String(error);
    console.error(`Error fetching contributors (${owner}/${repo}): status=${status} message=${msg}`);
    return [];
  }
}

/**
 * Get repository README content
 * @param owner Repository owner
 * @param repo Repository name
 */
export async function getReadme(owner: string, repo: string): Promise<string | null> {
  const octokitInstance = getOctokit();
  if (!octokitInstance) {
    console.warn('GitHub token not configured. Please set GITHUB_TOKEN in .env');
    return null;
  }

  try {
    const { data } = await octokitInstance.repos.getReadme({ owner, repo });
    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  } catch (error: any) {
    if (error?.status === 404 || error?.response?.status === 404) {
      return null;
    }
    const status = error?.status ?? error?.response?.status;
    const msg = error?.message ?? String(error);
    console.error(`Error fetching README (${owner}/${repo}): status=${status} message=${msg}`);
    return null;
  }
}

/**
 * Parse GitHub URL to extract owner and repo
 * @param url GitHub repository URL
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '').split('?')[0].split('#')[0],
      };
    }
    return null;
  } catch {
    return null;
  }
}
