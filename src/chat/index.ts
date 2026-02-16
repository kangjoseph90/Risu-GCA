import type { PluginV2ProviderArgument, PluginV2ProviderResult } from "../api";
import { Logger } from "../shared/logger";
import { GCAManager } from "../gca";
import { ModelManager } from "../model";
import { RequestType } from "../shared/types";
import { parseRequestType } from "../shared/util";
import { applyPluginParams, getGenerationConfig, getPluginParams, getSafetySettings } from "./config";
import { parse } from "svelte/compiler";
import { parseGeminiChat } from "./format";
import { requestGenerateContent, requestGenerateStreamContent } from "./request";
import { handleResponse, handleStreamResponse } from "./response";

export async function handleRequest(args: PluginV2ProviderArgument, abortSignal?: AbortSignal): Promise<PluginV2ProviderResult> {
    const requestType = parseRequestType(args.mode);
    const config = ModelManager.getConfig(requestType);

    const model = config.model_id;
    const params = config.parameters;
    const pluginParams = getPluginParams(args);
    const newParams = applyPluginParams(params, pluginParams);

    const stream = newParams.use_stream === true && requestType === RequestType.Chat;
        
    const contents = parseGeminiChat(args.prompt_chat);
    const generationConfig = getGenerationConfig(newParams);
    const safetySettings = getSafetySettings();
    const activeTool = newParams.active_tool;
    const tools: any[] = [];

    if (activeTool === 'google_search') {
        tools.push({ google_search: {} });
    } else if (activeTool === 'googleMaps') {
        tools.push({ googleMaps: {} });
    } else if (activeTool === 'url_context') {
        tools.push({ url_context: {} });
    }

    const body = {
        model: model,
        request: {
            contents: contents,
            generationConfig: generationConfig,
            safetySettings: safetySettings,
            tools
        }
    }

    if (stream) {
        const res = await requestGenerateStreamContent(body, abortSignal);
        return await handleStreamResponse(res);
    } else {
        const res = await requestGenerateContent(body, abortSignal);
        return handleResponse(res);
    }
}