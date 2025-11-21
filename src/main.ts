//@ts-ignore
import './style.css';
import { RisuAPI } from './api';
import { AuthManager } from './manager/auth';
import { ModelManager } from './manager/model';
import { generateContent } from './chat';

/* Plugin Entry */

ModelManager.init();

RisuAPI.addProvider('[GCA] Google Code Assist', generateContent);
//@ts-ignore
globalThis.gca_login = AuthManager.login;
// Cleanup OpenButton on unload
RisuAPI.onUnload(() => {

})

