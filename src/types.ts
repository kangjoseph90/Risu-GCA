export enum RequestType {
    Chat = 'chat',
    Memory = 'memory',
    Emotion = 'emotion',
    Translate = 'translate',
    Other = 'other',
    Unknown = 'unknown',
}

export interface PluginParameters {
    frequency_penalty?: number
    min_p?: number
    presence_penalty?: number
    repetition_penalty?: number
    top_k?: number
    top_p?: number
    temperature?: number
    max_tokens?: number
}

export interface ModelParameters extends PluginParameters {
    thinking_level?: 'low' | 'medium' | 'high'
    media_resolution?: 'media_resolution_low' | 'media_resolution_medium' | 'media_resolution_high'
    use_stream?: boolean
}