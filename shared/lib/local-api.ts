import type { TransferPackage } from "./transfer-package";
import type { BridgeStatus, JobKind, OnlineJob } from "./bridge-jobs";
import type { SignedReleaseManifest } from "./edge-release-manifest";
export const LOCAL_API_VERSION=1;
export const LOCAL_BOX_HOSTS=["http://schiessportal.local:8080","http://schiessportal-box.local:8080","http://192.168.4.1:8080"] as const;
export type BoxDiscovery={box_id:string|null;name:string;club_id:string|null;agent_version:string;local_api_version:number;ui_version:string|null;offline_ready:boolean;pending:{hits:number;operations:number}};
export type LocalSession={token:string;expires_at:string};
export type LocalDatasetInfo={schema_version:number;datasets:{name:string;revision:string;checksum:string;count:number}[];updated_at:string|null};
export type LocalImportResult={accepted:boolean;duplicate:boolean;reason?:string;summary?:string};
export type BoxConnectionState="verbunden"|"nicht_gefunden"|"offline_bereit"|"daten_warten"|"synchron";
export function describeBoxState(state:BoxConnectionState):{title:string;next:string}{switch(state){case"verbunden":return{title:"Box verbunden",next:"Sie können jetzt offline arbeiten."};case"daten_warten":return{title:"Daten warten",next:"«Daten übertragen» drücken."};case"synchron":return{title:"Alles synchronisiert",next:"Nichts zu tun."};case"offline_bereit":return{title:"Offline bereit",next:"Sie können ohne Internet weiterarbeiten."};default:return{title:"Box nicht gefunden",next:"Mit dem WLAN im Schützenhaus oder mit «Schiessportal-Box-…» verbinden."};}}
export function boxStateFrom(discovery:BoxDiscovery|null,online:boolean):BoxConnectionState{if(!discovery)return"nicht_gefunden";const waiting=discovery.pending.hits+discovery.pending.operations>0;if(waiting)return"daten_warten";if(!online)return discovery.offline_ready?"offline_bereit":"verbunden";return"synchron";}
export function isLocalApiCompatible(version:number|null|undefined):boolean{return version===LOCAL_API_VERSION;}
export const LOCAL_API_INCOMPATIBLE_MESSAGE="Box aktualisieren – die Box ist noch auf einer älteren Version.";
export class LocalBoxClient{
constructor(readonly baseUrl:string,private token:string|null=null){} setToken(token:string|null){this.token=token;}
private async call<T>(path:string,init?:RequestInit):Promise<T>{const res=await fetch(`${this.baseUrl}${path}`,{...init,headers:{"content-type":"application/json",...(this.token?{authorization:`Bearer ${this.token}`} : {}),...(init?.headers??{})}});if(!res.ok)throw new Error(`Box antwortet nicht (${res.status}).`);return await res.json() as T;}
discovery(){return this.call<BoxDiscovery>("/local/v1/discovery");}
login(username:string,code:string){return this.call<LocalSession>("/local/v1/login",{method:"POST",body:JSON.stringify({username,code})});}
dataset(){return this.call<LocalDatasetInfo>("/local/v1/dataset");}
importPackage(pkg:TransferPackage){return this.call<LocalImportResult>("/local/v1/import",{method:"POST",body:JSON.stringify(pkg)});}
exportPackage(){return this.call<TransferPackage>("/local/v1/export",{method:"POST"});}
receipts(receipt:TransferPackage){return this.call<{settled:number}>("/local/v1/receipts",{method:"POST",body:JSON.stringify(receipt)});}
bridgeHello(online:boolean){return this.call<{ok:boolean;bridge:BridgeStatus}>("/local/v1/bridge/hello",{method:"POST",body:JSON.stringify({online})});}
bridgeStatus(){return this.call<{ok:boolean;bridge:BridgeStatus}>("/local/v1/bridge");}
listJobs(){return this.call<{ok:boolean;jobs:(OnlineJob&{label:string})[]}>("/local/v1/jobs");}
createJob(kind:JobKind,payload:Record<string,unknown>={}){return this.call<{ok:boolean;job?:OnlineJob;error?:string}>("/local/v1/jobs/create",{method:"POST",body:JSON.stringify({kind,payload})});}
nextJob(){return this.call<{ok:boolean;job:OnlineJob|null}>("/local/v1/jobs/next",{method:"POST",body:JSON.stringify({})});}
jobResult(jobId:string,result:Record<string,unknown>,error=""){return this.call<{ok:boolean;duplicate?:boolean}>("/local/v1/jobs/result",{method:"POST",body:JSON.stringify({job_id:jobId,result,error})});}
retryJob(jobId:string){return this.call<{ok:boolean;duplicate?:boolean;error?:string}>("/local/v1/jobs/retry",{method:"POST",body:JSON.stringify({job_id:jobId})});}
installUpdate(input:{manifest:SignedReleaseManifest;archiveBase64:string}){return this.call<{ok:boolean;state:string;version:string|null;message:string}>("/local/v1/update",{method:"POST",body:JSON.stringify({manifest:input.manifest.manifest,manifest_signature:input.manifest.signature,archive_base64:input.archiveBase64})});}
relayPrepare(){return this.call<{ok:boolean;done:boolean;step?:string;label?:string;url?:string;bundle?:unknown;error?:string}>("/local/relay/prepare",{method:"POST",body:JSON.stringify({})});}
relayApply(answer:unknown){return this.call<{ok:boolean;done:boolean;step?:string;error?:string}>("/local/relay/apply",{method:"POST",body:JSON.stringify(answer)});}
ops<T>(name:string){return this.call<T>(`/local/v1/ops/${name}`);}
}
export async function discoverBox(hosts:readonly string[]=LOCAL_BOX_HOSTS,timeoutMs=1500):Promise<{baseUrl:string;discovery:BoxDiscovery}|null>{for(const host of hosts){try{const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),timeoutMs);const res=await fetch(`${host}/local/v1/discovery`,{signal:ctrl.signal});clearTimeout(t);if(!res.ok)continue;return{baseUrl:host,discovery:await res.json() as BoxDiscovery};}catch{}}return null;}
