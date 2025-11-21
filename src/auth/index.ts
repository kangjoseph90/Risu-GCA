import { 
    IS_LOGGED_IN, 
    ACCESS_TOKEN, 
    ACCESS_TOKEN_EXPIRES, 
    REFRESH_TOKEN, 
    PROJECT_ID,
    SERVICE_TIER,
    OPT_OUT
} from "../plugin";
import { RisuAPI } from "../api";
import { Logger } from "../shared/logger";
import { prompt } from "../ui/popup";

const CLIENT_ID =
  '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export class AuthManager {
    private static userProfileCache: any = null;

    static async getAccessToken(): Promise<string> {
        if (!this.isLoggedIn()) {
            throw new Error('User is not logged in');
        }
        const accessToken = RisuAPI.getArg(ACCESS_TOKEN) as string;
        const accessTokenExpiresStr = RisuAPI.getArg(ACCESS_TOKEN_EXPIRES) as string;

        if (!accessToken || !accessTokenExpiresStr) {
             return await this.login();
        }

        const accessTokenExpires = new Date(accessTokenExpiresStr);
        
        // Check if expired (with 1 minute buffer)
        if (new Date().getTime() + 60 * 1000 < accessTokenExpires.getTime()) {
            return accessToken;
        }

        // Access token expired, try to refresh using Refresh Token
        try {
            Logger.log('Token expired, refreshing...');
            return await this.refreshAccessToken();
        } catch (e) {
            Logger.log('Refresh failed, prompting user...', e);
            // If refresh fails, request new login
            return await this.login();
        }
    }

    static isLoggedIn(): boolean {
        return (RisuAPI.getArg(IS_LOGGED_IN) as number) === 1;
    }

    static async login(): Promise<string> {
        return new Promise((resolve, reject) => {
            // Use localhost redirect which is allowed for Native clients
            const redirectUri = 'http://localhost:3000/oauth2callback';
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent`;
            
            const width = 600;
            const height = 600;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            window.open(
                authUrl,
                'google_auth',
                `width=${width},height=${height},top=${top},left=${left}`
            );

            setTimeout(async () => {
                const pastedUrl = await prompt(
                    "Log in to Google and PASTE the full URL you were redirected to",
                );

                if (pastedUrl) {
                    try {
                        // Handle both full URL and just the code
                        let code = pastedUrl.trim();
                        
                        if (code.includes('code=')) {
                            // Extract code from URL
                            const match = code.match(/[?&]code=([^&]+)/);
                            if (match) {
                                code = match[1];
                            } else {
                                reject(new Error("Could not find code in URL"));
                                return;
                            }
                        }
                        
                        if (code && code.length > 10) {
                            // We must use the SAME redirect_uri for exchange
                            AuthManager.exchangeCodeForToken(code, redirectUri)
                                .then(tokens => resolve(tokens.access_token))
                                .catch(e => reject(e));
                        } else {
                            reject(new Error("Could not find valid code"));
                        }
                    } catch (e) {
                        Logger.error('Login error:', e);
                        reject(new Error(`Invalid URL or code: ${e}`));
                    }
                } else {
                    reject(new Error("Login cancelled"));
                }
            }, 100);
        });
    }

    private static async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
        const params = new URLSearchParams();
        params.append('code', code);
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('redirect_uri', redirectUri);
        params.append('grant_type', 'authorization_code');

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to exchange code for token: ${errorText}`);
        }

        const tokens = await response.json();
        this.saveTokens(tokens);
        return tokens;
    }

    private static async refreshAccessToken(): Promise<string> {
        const refreshToken = RisuAPI.getArg(REFRESH_TOKEN) as string;
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const params = new URLSearchParams();
        params.append('refresh_token', refreshToken);
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('grant_type', 'refresh_token');

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to refresh token: ${errorText}`);
        }

        const tokens = await response.json();
        this.saveTokens(tokens);
        return tokens.access_token;
    }

    private static saveTokens(tokens: any) {
        const expiresIn = tokens.expires_in; // seconds
        const expiresAt = new Date(new Date().getTime() + expiresIn * 1000);
        
        RisuAPI.setArg(IS_LOGGED_IN, 1);
        RisuAPI.setArg(ACCESS_TOKEN, tokens.access_token);
        RisuAPI.setArg(ACCESS_TOKEN_EXPIRES, expiresAt.toISOString());
        
        if (tokens.refresh_token) {
            RisuAPI.setArg(REFRESH_TOKEN, tokens.refresh_token);
        }
    }

    static logout(): void {
        this.userProfileCache = null;
        RisuAPI.setArg(IS_LOGGED_IN, 0);
        RisuAPI.setArg(ACCESS_TOKEN, '');
        RisuAPI.setArg(ACCESS_TOKEN_EXPIRES, '');
        RisuAPI.setArg(REFRESH_TOKEN, '');
        RisuAPI.setArg(PROJECT_ID, '');
        RisuAPI.setArg(SERVICE_TIER, '');
        RisuAPI.setArg(OPT_OUT, 0);
    }

    static async fetchUserProfile(): Promise<any> {
        if (this.userProfileCache) {
            return this.userProfileCache;
        }
        try {
            const token = await this.getAccessToken();
            const res = await fetch(
                "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (res.ok) {
                this.userProfileCache = await res.json();
                return this.userProfileCache;
            }
        } catch (e) {
            Logger.error("Failed to fetch user profile:", e);
        }
        return null;
    }
}