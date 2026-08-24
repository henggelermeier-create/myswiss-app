import type { TransferPackage } from "@/lib/transfer-package";
import type { SignedReleaseManifest } from "@/lib/edge-release-manifest";
export const PORTAL_BASE_URL="https://schiessportal.com"; const APP_API="/api/public/app/box";
export type RedeemQrResult={token:string;expires_at:string;club_name:string;device_id:string|null};
async function portalFetch<T>(path:string,token:string|null,body?:unknown):Promise<T>{const res=await fetch(`${PORTAL_BASE_URL}${path}`,{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body??{})});const data=await res.json().catch(()=>null) as {error?:string}|null;if(!res.ok)throw new Error(data?.error??`Portal antwortet nicht (${res.status}).`);return data as T;}
export function redeemBoxQr(qrToken:string){return portalFetch<RedeemQrResult>(`${APP_API}/redeem`,null,{token:qrToken});}
export function buildDownstreamPackage(sessionToken:string){return portalFetch<TransferPackage>(`${APP_API}/downstream`,sessionToken);}
export function receiveUpstreamPackage(sessionToken:string,pkg:TransferPackage){return portalFetch<{receipt:TransferPackage}>(`${APP_API}/upstream`,sessionToken,pkg);}
export function fetchReleaseManifest(sessionToken:string){return portalFetch<SignedReleaseManifest>(`${APP_API}/release`,sessionToken);}
export const PORTAL_PROBE_TIMEOUT_MS=4000; export const PORTAL_PROBE_MARKER="schiessportal";
export function evaluatePortalProbe(status:number,body:unknown):boolean{if(status<200||status>=300)return false;const data=body as {ok?:unknown;service?:unknown}|null;return Boolean(data&&data.ok===true&&data.service===PORTAL_PROBE_MARKER);}
export type ProbeDeps={fetchImpl?:typeof fetch;timeoutMs?:number};
export async function isPortalReachable(deps:ProbeDeps={}):Promise<boolean>{const doFetch=deps.fetchImpl??fetch;const timeoutMs=deps.timeoutMs??PORTAL_PROBE_TIMEOUT_MS;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);try{const res=await doFetch(`${PORTAL_BASE_URL}${APP_API}/ping`,{method:"POST",headers:{"content-type":"application/json"},body:"{}",cache:"no-store",signal:controller.signal});const body=await res.json().catch(()=>null);return evaluatePortalProbe(res.status,body);}catch{return false;}finally{clearTimeout(timer);}}
