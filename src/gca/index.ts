import { AuthManager } from '../auth';
import { RisuAPI } from '../api';
import type { NativeFetchArgs, GlobalFetchArgs, GlobalFetchResult, PluginV2ProviderArgument } from '../api';
import { PROJECT_ID, SERVICE_TIER, OPT_OUT } from '../plugin';
import { Logger } from '../shared/logger';

const CODE_ASSIST_ENDPOINT = 'https://cloudcode-pa.googleapis.com/v1internal';

export class GCAManager {
    private static projectId: string | undefined;
    private static serviceTier: string | undefined;
    private static optOut: boolean | undefined;

    /**
     * Ensures the user is initialized for GCA (onboarded, project ID loaded, opt-out checked).
     * Returns the Project ID.
     */
    static async ensureInitialized(): Promise<string> {
        // 1. Check memory cache
        if (this.projectId) {
            // Ensure other fields are loaded from storage if missing in memory
            if (!this.serviceTier) this.serviceTier = RisuAPI.getArg(SERVICE_TIER) as string;
            if (this.optOut === undefined) this.optOut = (RisuAPI.getArg(OPT_OUT) as number) === 1;
            return this.projectId;
        }

        // 2. Check persistent storage
        const storedProjectId = RisuAPI.getArg(PROJECT_ID) as string;
        if (storedProjectId) {
            this.projectId = storedProjectId;
            this.serviceTier = RisuAPI.getArg(SERVICE_TIER) as string;
            this.optOut = (RisuAPI.getArg(OPT_OUT) as number) === 1;

            // Even if we have project ID, we might want to check opt-out status if not set
            if (!this.optOut) {
                // Run in background to not block
                this.checkAndOptOutDataCollection().catch((e) => Logger.error(e));
            }
            return storedProjectId;
        }


        // 3. Initialize via API
        await this.initializeUser();

        if (!this.projectId) {
            throw new Error("Failed to initialize Gemini Code Assist project ID.");
        }
        return this.projectId;
    }

    private static async initializeUser(): Promise<void> {
        // 1. loadCodeAssist to get status
        const loadData = await this.fetchGCA('loadCodeAssist', {
            metadata: {
                ideType: 'IDE_UNSPECIFIED',
                platform: 'PLATFORM_UNSPECIFIED',
                pluginType: 'GEMINI',
            }
        });

        let pid = loadData.cloudaicompanionProject;
        let tierId = loadData.currentTier?.id;

        // 2. Onboarding if needed (if currentTier is missing)
        if (!loadData.currentTier) {
            Logger.log('User not onboarded. Starting onboarding...');
            const defaultTier = loadData.allowedTiers?.find((t: any) => t.isDefault);
            tierId = defaultTier?.id || 'free-tier';

            const onboardReq = {
                tierId: tierId,
                cloudaicompanionProject: undefined,
                metadata: {
                    ideType: 'IDE_UNSPECIFIED',
                    platform: 'PLATFORM_UNSPECIFIED',
                    pluginType: 'GEMINI',
                },
            };

            // Polling for LRO completion
            let onboarded = false;
            while (!onboarded) {
                const lro = await this.fetchGCA('onboardUser', onboardReq);
                if (lro.done) {
                    onboarded = true;
                    pid = lro.response?.cloudaicompanionProject?.id;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
                }
            }
        }

        // Save Project ID and Tier
        if (pid) {
            this.projectId = pid;
            RisuAPI.setArg(PROJECT_ID, pid);
        }
        if (tierId) {
            this.serviceTier = tierId;
            RisuAPI.setArg(SERVICE_TIER, tierId);
        }

        // 3. Check & Update Settings (Opt-out)
        await this.checkAndOptOutDataCollection();
    }

    private static async checkAndOptOutDataCollection(): Promise<void> {
        try {
            const settings = await this.fetchGCA('getCodeAssistGlobalUserSetting', null, 'GET');

            if (settings.freeTierDataCollectionOptin == true) {
                Logger.log('Opting out of data collection...');
                await this.fetchGCA('setCodeAssistGlobalUserSetting', {
                    freeTierDataCollectionOptin: false
                });
            }
            // Mark as opted out in our storage
            this.optOut = true;
            RisuAPI.setArg(OPT_OUT, 1);
        } catch (e) {
            Logger.warn('Failed to update data collection settings:', e);
        }
    }

    static getCachedInfo() {
        return {
            projectId: this.projectId,
            serviceTier: this.serviceTier,
            optOut: this.optOut
        };
    }


    // Helper for fetch with Auth
    private static async fetchGCA(path: string, body: any, method: string = 'POST'): Promise<any> {
        const url = `${CODE_ASSIST_ENDPOINT}:${path}`;
        const token = await AuthManager.getAccessToken();
        const options: RequestInit = {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'GeminiCLI/1.0',
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(url, options);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`GCA API Error (${res.status}): ${text}`);
        } 
        return res.json();
    }

    static async nativeFetchGCA(path: string, args: NativeFetchArgs): Promise<Response> {
        const url = `${CODE_ASSIST_ENDPOINT}:${path}`;
        const token = await AuthManager.getAccessToken();
        const headers = { ...args.headers };
        headers['Authorization'] = `Bearer ${token}`;
        headers['User-Agent'] = 'GeminiCLI/1.0';

        let body = args.body;

        const projectId = await this.ensureInitialized();
        if (typeof body === 'string') {
            const parsed = JSON.parse(body);
            parsed.project = projectId;
            body = JSON.stringify(parsed);
        } else {
            // If body is ArrayBuffer or Uint8Array, we can't easily inject
            Logger.warn('Cannot inject project ID into non-string body');
        }

        return RisuAPI.nativeFetch(url, {
            ...args,
            body,
            headers
        });
    }

    static async risuFetchGCA(path: string, args: GlobalFetchArgs = {}): Promise<GlobalFetchResult> {
        const url = `${CODE_ASSIST_ENDPOINT}:${path}`;
        const token = await AuthManager.getAccessToken();
        const headers = { ...args.headers };
        headers['Authorization'] = `Bearer ${token}`;
        headers['User-Agent'] = 'GeminiCLI/1.0';

        let body = args.body;

        const projectId = await this.ensureInitialized();
        if (typeof body === 'object' && body !== null) {
            body = { ...body, project: projectId };
        } else {
            Logger.warn('Cannot inject project ID into non-object body');
        }

        return RisuAPI.risuFetch(url, {
            ...args,
            body,
            headers
        });
    }
}