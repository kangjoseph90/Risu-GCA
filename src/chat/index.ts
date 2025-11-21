import type { PluginV2ProviderArgument } from "../api";
import { Logger } from "../logger";
import { GCAManager } from "../manager/gca";
import { ModelManager } from "../manager/model";
import { RequestType } from "../types";
import { parseRequestType } from "../util";

export async function generateContent(args: PluginV2ProviderArgument, abortSignal?: AbortSignal): Promise<{ success: boolean, content: string }> {
    const requestType = parseRequestType(args.mode);
    const config = ModelManager.getConfig(requestType);
    const model = config.model_id || 'gemini-2.5-flash';

    Logger.log(`GCA Generate Content - Model: ${model}, Request Type: ${requestType}`);

    const use_stream = config.parameters.use_stream === true && requestType === RequestType.Chat;

    const contents = [];
    for (const msg of args.prompt_chat) {
        if (msg.role === 'system') {
            if (contents.length === 0) {
                 contents.push({ role: 'user', parts: [{ text: msg.content }] });
            } else {
                 contents.push({ role: 'user', parts: [{ text: `[System Instruction]\n${msg.content}` }] });
            }
        } else {
            const role = msg.role === 'assistant' ? 'model' : 'user';
            contents.push({
                role: role,
                parts: [{ text: msg.content }]
            });
        }
    }
    const requestBody = {
        model: model,
        request: {
            contents: contents,
            generationConfig: {
                maxOutputTokens: args.max_tokens,
                temperature: args.temperature,
                topP: args.top_p,
                topK: args.top_k,
            },
        },
    };


    try {
        const res = await GCAManager.risuFetchGCA('generateContent', {
            method: 'POST',
            body: requestBody,
            abortSignal: abortSignal
        }, true);
        if (!res.ok) {
            throw new Error(`GCA API Error (${res.status}): ${JSON.stringify(res.data)}`);
        }
        const content = res.data.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { success: true, content: content };
    } catch (e) {
        Logger.error('GCA Chat Error:', e);
        return { success: false, content: `${e}` };
    }
    
}