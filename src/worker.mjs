import { isBrowser, isJsDom } from 'browser-or-node';
import * as mod from 'module';
let internalRequire = null;
const ensureRequire = ()=> (!internalRequire) && (
    internalRequire = mod.createRequire(import.meta.url)
);
let ThisWorker = null;
if(isBrowser || isJsDom){
    ThisWorker = window.Worker;
}else{
    ensureRequire();
    ThisWorker = internalRequire('web-worker');
}

export const Worker = ThisWorker;