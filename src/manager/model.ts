
import { RisuAPI } from '../api';
import { MODEL_CONFIG } from '../plugin';
import { RequestType, type ModelParameters } from '../types';
import { debounce } from '../util';

type ModelConfig = {
    [K in RequestType]?: {
        model_id: string;
        parameters: ModelParameters;
    };
};

export class ModelManager {
    private static config: ModelConfig = {};
    private static readonly DEBOUNCE_WAIT = 500;

    private static debouncedSave = debounce(() => {
        RisuAPI.setArg(MODEL_CONFIG, JSON.stringify(ModelManager.config));
    }, ModelManager.DEBOUNCE_WAIT);

    static async init() {
        try {
            const storedMap = RisuAPI.getArg(MODEL_CONFIG) as string;
            this.config = storedMap ? JSON.parse(storedMap) : {};
        } catch (e) {
            this.config = {};
            this.debouncedSave();
        }
    }

    static getConfig(type: RequestType) {
        return this.config[type] || { model_id: 'gemini-2.5-flash', parameters: {} as ModelParameters };
    }
}