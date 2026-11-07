import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
export interface AiOverride { mode:"mock"|"real"; apiKey?:string; model?:string; maxOutputTokens?:number }
const context=new AsyncLocalStorage<AiOverride>();
export const currentAiOverride=()=>context.getStore();
export const runWithAiOverride=<T>(settings:AiOverride,action:()=>Promise<T>)=>context.run(settings,action);
