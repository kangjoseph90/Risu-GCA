import { PLUGIN_NAME, RISU_ARGS, RisuArgType } from './plugin'

export interface GlobalFetchArgs {
  plainFetchForce?: boolean;
  plainFetchDeforce?: boolean;
  body?: any;
  headers?: { [key: string]: string };
  rawResponse?: boolean;
  method?: 'POST' | 'GET';
  abortSignal?: AbortSignal;
  useRisuToken?: boolean;
  chatId?: string;
}

export interface GlobalFetchResult {
  ok: boolean;
  data: any;
  headers: { [key: string]: string };
  status: number;
}

export interface NativeFetchArgs {
    body?:string|Uint8Array|ArrayBuffer,
    headers?:{[key:string]:string},
    method?:"POST"|"GET"|"PUT"|"DELETE",
    signal?:AbortSignal,
    useRisuTk?:boolean,
    chatId?:string
}

export interface MultiModal{
    type:'image'|'video'|'audio'
    base64:string,
    height?:number,
    width?:number
}

export interface OpenAIChat{
    role: 'system'|'user'|'assistant'|'function'
    content: string
    memo?:string
    name?:string
    removable?:boolean
    attr?:string[]
    multimodals?: MultiModal[]
    thoughts?: string[]
    cachePoint?: boolean
}

export type PluginV2ProviderArgument = {
    prompt_chat: OpenAIChat[] 
    frequency_penalty: number
    min_p: number
    presence_penalty: number
    repetition_penalty: number
    top_k: number
    top_p: number
    temperature: number
    mode: string
    max_tokens: number
}

export type PluginV2ProviderOptions = {
    tokenizer?: string
    tokenizerFunc?: (content: string) => number[] | Promise<number[]>
}

type EditFunction = (content: string) => string | Promise<string>

enum ScriptMode {
    EditInput = 'input',
    EditOutput = 'output',
    EditProcess = 'process',
    EditDisplay = 'display'
}

type ReplacerFunction = (content: any[], type: string) => any[] | Promise<any[]>

enum ReplacerType {
    BeforeRequest = 'beforeRequest',
    AfterRequest = 'afterRequest',
}

const rawAPI = {
    //@ts-ignore
    risuFetch,
    //@ts-ignore
    nativeFetch,
    //@ts-ignore
    getArg,
    //@ts-ignore
    setArg,
    //@ts-ignore
    getChar,
    //@ts-ignore
    setChar,
    //@ts-ignore
    addProvider,
    //@ts-ignore
    addRisuScriptHandler,
    //@ts-ignore
    removeRisuScriptHandler,
    //@ts-ignore
    addRisuReplacer,
    //@ts-ignore
    removeRisuReplacer,
    //@ts-ignore
    onUnload,
}

function getFullName(name: string) {
    return `${PLUGIN_NAME}::${name}`
}

/**
 * RisuAI Plugin API
 * - risuFetch
 * - nativeFetch
 * - getArg
 * - setArg
 * - getChar
 * - setChar
 * - addProvider
 * - addRisuScriptHandler
 * - removeRisuScriptHandler
 * - addRisuReplacer
 * - removeRisuReplacer
 * - onUnload
 */
export class RisuAPI {
    static risuFetch(url: string, args?: GlobalFetchArgs): Promise<GlobalFetchResult> {
        return rawAPI.risuFetch(url, args);
    }   
    static nativeFetch(url: string, args: NativeFetchArgs): Promise<Response> {
        return rawAPI.nativeFetch(url, args);
    }
    static getArg(name: string): string | number | undefined {
        if(RISU_ARGS[name] === undefined) return;
        switch(RISU_ARGS[name]) {
            case RisuArgType.Int:
                return Number(rawAPI.getArg(getFullName(name)));
            case RisuArgType.String:
                return String(rawAPI.getArg(getFullName(name)));
        }
    }
    static setArg(name: string, value: string | number) {
        if(RISU_ARGS[name] === undefined) return;
        switch(RISU_ARGS[name]) {
            case RisuArgType.Int:
                rawAPI.setArg(getFullName(name), Number(value));
                break;
            case RisuArgType.String:
                rawAPI.setArg(getFullName(name), String(value));
                break;
        }
    }
    static getChar(): any {
        return rawAPI.getChar();
    }
    static setChar(char: any) {
        rawAPI.setChar(char);
    }
    static addProvider(name: string, func: (arg: PluginV2ProviderArgument, abortSignal?: AbortSignal) => Promise<{ success: boolean, content: string }>, options?: PluginV2ProviderOptions) {
        rawAPI.addProvider(name, func, options);
    }
    static addRisuScriptHandler(mode: ScriptMode, func: EditFunction) {
        rawAPI.addRisuScriptHandler(mode, func);
    }
    static removeRisuScriptHandler(mode: ScriptMode, func: EditFunction) {
        rawAPI.removeRisuScriptHandler(mode, func);
    }
    static addRisuReplacer(type: ReplacerType, func: ReplacerFunction) {
        rawAPI.addRisuReplacer(type, func);
    }
    static removeRisuReplacer(type: ReplacerType, func: ReplacerFunction) {
        rawAPI.removeRisuReplacer(type, func);
    }
    static onUnload(callback: () => void) {
        rawAPI.onUnload(callback);
    }
}

