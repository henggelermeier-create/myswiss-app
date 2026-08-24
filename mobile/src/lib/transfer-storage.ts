import { Preferences } from "@capacitor/preferences";
import type { TransferPackage } from "@/lib/transfer-package";
import { secureStore } from "./secure-store";
const KEYS = { pendingUpstream:"sp_pending_upstream_v1", lastReceipt:"sp_last_receipt_v1", pendingDownstreamSummary:"sp_downstream_summary_v1", boxPairing:"sp_box_pairing_v1", offlineSecret:"sp_offline_secret_v1", appSession:"sp_app_session_v1" } as const;
export type StoredEnvelope<T> = { schema:1; saved_at:string; data:T };
export function serializeEnvelope<T>(data:T, savedAt:string=new Date().toISOString()):string { return JSON.stringify({ schema:1, saved_at:savedAt, data } satisfies StoredEnvelope<T>); }
export function parseEnvelope<T>(raw:string|null|undefined):StoredEnvelope<T>|null { if(!raw) return null; try { const p=JSON.parse(raw) as Partial<StoredEnvelope<T>>; return p && p.schema===1 && typeof p.saved_at==="string" && "data" in p ? p as StoredEnvelope<T> : null; } catch { return null; } }
export type BoxPairing={token:string;box_id:string|null;club_id:string|null}; export type AppSession={token:string;expires_at:string}; export type OfflineSecret={username:string;code:string};
async function readEnvelope<T>(key:string):Promise<T|null>{ const {value}=await Preferences.get({key}); return parseEnvelope<T>(value)?.data??null; }
async function writeEnvelope<T>(key:string,data:T):Promise<void>{ await Preferences.set({key,value:serializeEnvelope(data)}); }
async function removeKey(key:string):Promise<void>{ await Preferences.remove({key}); }
async function readSecret<T>(key:string):Promise<T|null>{ return parseEnvelope<T>(await secureStore.get(key))?.data??null; }
async function writeSecret<T>(key:string,data:T):Promise<void>{ await secureStore.set(key,serializeEnvelope(data)); }
export const pendingUpstreamStore={save:(pkg:TransferPackage)=>writeEnvelope(KEYS.pendingUpstream,pkg),load:()=>readEnvelope<TransferPackage>(KEYS.pendingUpstream),clear:()=>removeKey(KEYS.pendingUpstream)};
export const lastReceiptStore={save:(receipt:TransferPackage)=>writeEnvelope(KEYS.lastReceipt,receipt),load:()=>readEnvelope<TransferPackage>(KEYS.lastReceipt),clear:()=>removeKey(KEYS.lastReceipt)};
export const downstreamSummaryStore={save:(summary:string)=>writeEnvelope(KEYS.pendingDownstreamSummary,summary),load:()=>readEnvelope<string>(KEYS.pendingDownstreamSummary),clear:()=>removeKey(KEYS.pendingDownstreamSummary)};
export const boxPairingStore={save:(pairing:BoxPairing)=>writeEnvelope(KEYS.boxPairing,pairing),load:()=>readEnvelope<BoxPairing>(KEYS.boxPairing),clear:()=>removeKey(KEYS.boxPairing)};
export const appSessionStore={save:(session:AppSession)=>writeSecret(KEYS.appSession,session),load:()=>readSecret<AppSession>(KEYS.appSession),clear:()=>secureStore.remove(KEYS.appSession)};
export const offlineSecretStore={save:(secret:OfflineSecret)=>writeSecret(KEYS.offlineSecret,secret),load:()=>readSecret<OfflineSecret>(KEYS.offlineSecret),clear:()=>secureStore.remove(KEYS.offlineSecret)};
