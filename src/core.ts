/**
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { OAuth2Client } from 'google-auth-library';
import * as http from 'http';
import * as url from 'url';
import open from 'open';

// Constants from gemini-cli source
const OAUTH_CLIENT_ID =
  '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = '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';
const OAUTH_SCOPE = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];
const CODE_ASSIST_ENDPOINT = 'https://cloudcode-pa.googleapis.com/v1internal';

async function main() {
  const port = 3000;
  const redirectUri = `http://localhost:${port}/oauth2callback`;

  const client = new OAuth2Client({
    clientId: OAUTH_CLIENT_ID,
    clientSecret: OAUTH_CLIENT_SECRET,
    redirectUri: redirectUri,
  });

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: OAUTH_SCOPE,
  });

  console.log('Opening browser for authentication...');
  console.log(`If it doesn't open, please visit: ${authUrl}`);

  try {
    await open(authUrl);
  } catch (e) {
    console.error('Failed to open browser:', e);
  }

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url && req.url.indexOf('/oauth2callback') > -1) {
          const qs = new url.URL(req.url, `http://localhost:${port}`)
            .searchParams;
          const code = qs.get('code');
          if (code) {
            res.end('Authentication successful! You can close this tab.');
            server.close();
            resolve(code);
          } else {
            res.end('Authentication failed: No code received.');
            server.close();
            reject(new Error('No code received'));
          }
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      } catch (e) {
        res.end('Error');
        server.close();
        reject(e);
      }
    });
    server.listen(port, () => {
      console.log(`Listening on port ${port}...`);
    });
  });

  console.log('Received auth code. Exchanging for tokens...');
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  console.log(
    'Access Token obtained:',
    tokens.access_token?.substring(0, 10) + '...',
  );

  // 1. Load Code Assist to get Project ID
  console.log('Fetching Project ID via loadCodeAssist...');
  let projectId: string | undefined;

  try {
    const loadResponse = await fetch(`${CODE_ASSIST_ENDPOINT}:loadCodeAssist`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GeminiCLI/1.0',
      },
      body: JSON.stringify({
        metadata: {
          ideType: 'IDE_UNSPECIFIED',
          platform: 'PLATFORM_UNSPECIFIED',
          pluginType: 'GEMINI',
        },
      }),
    });

    if (loadResponse.ok) {
      const loadData = await loadResponse.json();
      console.log(
        'loadCodeAssist Response:',
        JSON.stringify(loadData, null, 2),
      );

      // @ts-ignore
      if (loadData.currentTier) {
        // @ts-ignore
        projectId = loadData.cloudaicompanionProject;
      } else {
        console.log('User not onboarded. Starting onboarding process...');
        // Find default tier (usually free-tier)
        // @ts-ignore
        const defaultTier = loadData.allowedTiers?.find(
          (t: any) => t.isDefault,
        );
        const tierId = defaultTier?.id || 'free-tier';
        console.log(`Onboarding to tier: ${tierId}`);

        // For Free Tier, cloudaicompanionProject must be undefined in the request
        const onboardReq = {
          tierId: tierId,
          cloudaicompanionProject: undefined,
          metadata: {
            ideType: 'IDE_UNSPECIFIED',
            platform: 'PLATFORM_UNSPECIFIED',
            pluginType: 'GEMINI',
          },
        };

        let onboarded = false;
        while (!onboarded) {
          console.log('Sending onboardUser request...');
          const onboardResponse = await fetch(
            `${CODE_ASSIST_ENDPOINT}:onboardUser`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'GeminiCLI-PoC/1.0',
              },
              body: JSON.stringify(onboardReq),
            },
          );

          if (onboardResponse.ok) {
            const lro = await onboardResponse.json();
            console.log('Onboard LRO:', JSON.stringify(lro, null, 2));

            // @ts-ignore
            if (lro.done) {
              onboarded = true;
              // @ts-ignore
              projectId = lro.response?.cloudaicompanionProject?.id;
              console.log('Onboarding complete!');
            } else {
              console.log('Onboarding in progress, waiting 5s...');
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          } else {
            console.error('Failed to onboard:', await onboardResponse.text());
            break;
          }
        }
      }
    } else {
      console.error('Failed to load Code Assist:', await loadResponse.text());
    }
  } catch (e) {
    console.error('Error calling loadCodeAssist:', e);
  }

  if (!projectId) {
    console.log(
      'Project ID not found after loadCodeAssist/onboarding. Trying env var or default...',
    );
  } else {
    console.log(`Using Project ID: ${projectId}`);
  }

  // 2. Check and Opt-out of Data Collection (Free Tier)
  console.log('Checking Data Collection settings...');
  try {
    const settingsResponse = await fetch(
      `${CODE_ASSIST_ENDPOINT}:getCodeAssistGlobalUserSetting`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'GeminiCLI-PoC/1.0',
        },
      },
    );

    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('Current Settings:', JSON.stringify(settings, null, 2));

      // @ts-ignore
      if (settings.freeTierDataCollectionOptin !== false) {
        console.log('Opting out of free tier data collection...');
        const setSettingsResponse = await fetch(
          `${CODE_ASSIST_ENDPOINT}:setCodeAssistGlobalUserSetting`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json',
              'User-Agent': 'GeminiCLI-PoC/1.0',
            },
            body: JSON.stringify({
              freeTierDataCollectionOptin: false,
            }),
          },
        );

        if (setSettingsResponse.ok) {
          const newSettings = await setSettingsResponse.json();
          console.log(
            'Updated Settings:',
            JSON.stringify(newSettings, null, 2),
          );
        } else {
          console.error(
            'Failed to update settings:',
            await setSettingsResponse.text(),
          );
        }
      } else {
        console.log('Already opted out of data collection.');
      }
    } else {
      console.error('Failed to get settings:', await settingsResponse.text());
    }
  } catch (e) {
    console.error('Error checking/updating settings:', e);
  }

  // Make LLM Request
  console.log('Sending LLM request to Code Assist API...');

  const requestBody = {
    model: 'gemini-2.5-flash',
    project: projectId,
    request: {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Explain how OAuth2 works in 2 sentences.' }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.5,
      },
    },
  };

  try {
    const response = await fetch(`${CODE_ASSIST_ENDPOINT}:generateContent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GeminiCLI-PoC/1.0',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response body:', text);
    } else {
      const data = await response.json();
      console.log('LLM Response received!');
      console.log(JSON.stringify(data, null, 2));

      // @ts-ignore
      const content = data.response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        console.log('\n--- Generated Text ---');
        console.log(content);
        console.log('----------------------');
      }
    }
  } catch (e) {
    console.error('Failed to call LLM API:', e);
  }
}

main().catch(console.error);
