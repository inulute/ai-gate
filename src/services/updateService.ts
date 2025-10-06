// src/services/updateService.ts
interface ReleaseInfo {
  version: string;
  releaseNotes: string;
  releaseUrl: string;
  publishedAt: string;
}

interface UpdateCheckResult {
  hasUpdate: boolean;
  releaseInfo?: ReleaseInfo;
  error?: string;
}

class UpdateService {
  private readonly GITHUB_REPO = 'inulute/ai-gate';
  private readonly GITHUB_API_URL = `https://api.github.com/repos/${this.GITHUB_REPO}/releases/latest`;
  private readonly GITHUB_RELEASES_URL = `https://github.com/${this.GITHUB_REPO}/releases`;
  private readonly GITHUB_RAW_BASE_URL = `https://raw.githubusercontent.com/${this.GITHUB_REPO}/main/release_notes`;
  private readonly CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  private checkTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicCheck();
  }

  private startPeriodicCheck(): void {
    this.checkForUpdates();
    
    this.checkTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.CHECK_INTERVAL);
  }

  async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      const currentVersion = this.getCurrentVersion();
      const latestRelease = await this.fetchLatestRelease();
      
      if (!latestRelease) {
        return { hasUpdate: false, error: 'Failed to fetch release information' };
      }

      const hasUpdate = this.compareVersions(currentVersion, latestRelease.tag_name);
      
      if (hasUpdate) {
        const version = latestRelease.tag_name.replace('v', '');
        const releaseNotes = await this.fetchReleaseNotes(version, latestRelease.body);
        
        return {
          hasUpdate: true,
          releaseInfo: {
            version: version,
            releaseNotes: releaseNotes,
            releaseUrl: latestRelease.html_url,
            publishedAt: latestRelease.published_at
          }
        };
      }

      return { hasUpdate: false };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { hasUpdate: false, error: 'Failed to check for updates' };
    }
  }

  private getCurrentVersion(): string {
    const version = (typeof window !== 'undefined' && (window as any).electronAPI?.getAppVersion?.()) ||
                   (typeof window !== 'undefined' && (window as any).APP_VERSION) ||
                   '4.0.0'
    
    console.log('Current app version detected:', version);
    return version || '4.0.0';
  }

  private async fetchLatestRelease(): Promise<any> {
    try {
      const response = await fetch(this.GITHUB_API_URL, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Tools-Hub-Updater'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching latest release:', error);
      throw error;
    }
  }

  private async fetchReleaseNotes(version: string, fallbackNotes: string): Promise<string> {
    try {
      const releaseNotesUrl = `${this.GITHUB_RAW_BASE_URL}/${version}.md`;
      const response = await fetch(releaseNotesUrl, {
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'AI-Tools-Hub-Updater'
        }
      });

      if (response.ok) {
        const releaseNotes = await response.text();
        console.log(`Successfully fetched release notes from ${releaseNotesUrl}`);
        return releaseNotes;
      } else {
        console.log(`Release notes file not found at ${releaseNotesUrl}, using GitHub release body as fallback`);
        return fallbackNotes || 'No release notes available';
      }
    } catch (error) {
      console.error('Error fetching release notes from file:', error);
      console.log('Using GitHub release body as fallback');
      return fallbackNotes || 'No release notes available';
    }
  }

  private compareVersions(current: string, latest: string): boolean {
    if (!current || !latest) {
      console.warn('Invalid version strings for comparison:', { current, latest });
      return false;
    }
    
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.replace('v', '').split('.').map(Number);
    
    console.log('Comparing versions:', {
      current: current,
      latest: latest,
      currentParts: currentParts,
      latestParts: latestParts
    });
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;
      
      if (latestPart > currentPart) {
        console.log(`Latest version is newer: ${latestPart} > ${currentPart} at position ${i}`);
        return true;
      } else if (latestPart < currentPart) {
        console.log(`Current version is newer: ${currentPart} > ${latestPart} at position ${i}`);
        return false;
      }
    }
    
    console.log('Versions are equal');
    return false;
  }

  public stopPeriodicCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  public async openReleasesPage(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
      console.log('Opening external URL:', this.GITHUB_RELEASES_URL);
      (window as any).electronAPI.openExternal(this.GITHUB_RELEASES_URL);
    } else {
      console.error('electronAPI.openExternal not available, falling back to window.open');
      window.open(this.GITHUB_RELEASES_URL, '_blank', 'noopener,noreferrer');
    }
  }
}

export const updateService = new UpdateService();
export type { ReleaseInfo, UpdateCheckResult };