import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../docs/sw.js", import.meta.url), "utf8");

function setup({cachedHtml,networkHtml}){
  const listeners = new Map();
  const notices = [];
  const entries = new Map([["index.html",new Response(cachedHtml)],["./",new Response(cachedHtml)]]);
  const cache = {
    match: async key => entries.get(key)?.clone(),
    put: async (key,value) => entries.set(key,value.clone())
  };
  const self = {
    location: new URL("https://andisgreened.github.io/sw.js"),
    registration: {scope:"https://andisgreened.github.io/"},
    addEventListener: (name,callback) => listeners.set(name,callback),
    skipWaiting: async () => {},
    clients: {
      claim: async () => {},
      matchAll: async () => [{postMessage: message => notices.push(message)}]
    }
  };
  const context = {
    self,
    URL,
    Request: class WorkerRequest extends Request {
      constructor(input,init){ super(new URL(input,self.registration.scope),init); }
    },
    Response,
    Date,
    fetch: async request => new Response(networkHtml,{status:200}),
    caches: {
      open: async () => cache,
      keys: async () => ["andisgreened-shell-old"]
    }
  };
  const api = vm.runInNewContext(`${source}; ({revalidate,cachedVersion})`,context);
  return {api,entries,notices,listeners};
}

test("revalidates and notifies open clients when the cached shell version changes", async () => {
  const {api,entries,notices} = setup({
    cachedHtml:'<script>const APP_VERSION = "5.18.15";</script>',
    networkHtml:'<script>const APP_VERSION = "5.18.16";</script>'
  });

  await api.revalidate(true);

  assert.equal(await api.cachedVersion(),"5.18.16");
  assert.deepEqual(notices.map(x => ({...x})),[{type:"shell-updated"}]);
  assert.equal(await entries.get("index.html").text(),'<script>const APP_VERSION = "5.18.16";</script>');
});

test("leaves spot updates to the network instead of serving the app cache", () => {
  const {listeners} = setup({cachedHtml:"",networkHtml:""});
  const event = {
    request:new Request("https://andisgreened.github.io/spot-updates.json?t=1"),
    respondWith(){ this.responded = true; },
    waitUntil(){}
  };

  listeners.get("fetch")(event);

  assert.equal(event.responded,undefined);
});
