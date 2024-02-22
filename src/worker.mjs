import { isBrowser, isJsDom } from 'browser-or-node';
import * as mod from 'module';
let internalRequire = null;
const ensureRequire = ()=> (!internalRequire) && (
    internalRequire = mod.createRequire(import.meta.url)
);
let ThisWorker = null;
if(isBrowser || isJsDom){
    const Worker = function(script, options={}){
        if(options.inheritMap){
            const mapEls = [...document.head.getElementsByTagName('script')].filter(
                (el)=> el.getAttribute('type') === 'importmap'
            );
            options.map = JSON.parse(mapEls[0].innerHTML);
            console.log('MAP', options.map);
        }
        if(options.map){
            var iframe = document.createElement('iframe');
            const callbackId = `cb${Math.floor(Math.random()*1000000000)}`;
            const worker = {};
            worker.ready = new Promise((resolve, reject)=>{
                window[callbackId] = function(window){
                    resolve();
                }
            });
            var html = `<html><head>
                <script type="importmap">${JSON.stringify(options.map)}</script>
            </head><body onload="parent.${callbackId}(this.window)"><script>
                window.self = {};
            </script><script type="module" src="${script}"></script></body></html>`;
            document.body.appendChild(iframe);
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(html);
            iframe.contentWindow.document.close();
            worker.postMessage = (data)=>{
                iframe.contentWindow.postMessage(data, '*');
            }
            window.onmessage = function(e) {
                if(worker.onmessage) worker.onmessage(e);
            };
            return worker;
        }else{
            return new window.Worker(script, options);
        }
    }
    ThisWorker = Worker;
}else{
    ensureRequire();
    ThisWorker = internalRequire('web-worker');
}

export const Worker = ThisWorker;