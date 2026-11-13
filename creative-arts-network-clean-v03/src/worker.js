import { parseSheets } from './graph.js';

const encoder = new TextEncoder();
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const encodedJSON = obj => base64url(encoder.encode(JSON.stringify(obj)));

async function serviceAccountToken(raw) {
  let creds;
  try { creds=JSON.parse(raw); } catch { throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON secret'); }
  if(!creds.client_email || !creds.private_key)throw new Error('Service account missing email or private key');
  const now=Math.floor(Date.now()/1000);
  const header=encodedJSON({alg:'RS256',typ:'JWT'});
  const payload=encodedJSON({iss:creds.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3000});
  const unsigned=`${header}.${payload}`;
  const binary=Uint8Array.from(atob(creds.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'')),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('pkcs8',binary,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(unsigned));
  const assertion=`${unsigned}.${base64url(new Uint8Array(signature))}`;
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
  if(!response.ok)throw new Error(`Google token exchange failed (${response.status})`);
  const result=await response.json();
  return result.access_token;
}

async function readSheet(sheetId,token,range) {
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`;
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)throw new Error(`Google Sheets read failed (${response.status}) for ${range}`);
  return (await response.json()).values||[];
}

const json=(object,status=200)=>new Response(JSON.stringify(object),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return json({ok:true,configured:Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON&&env.SHEET_ID)});
    if(url.pathname==='/api/graph'){
      if(request.method!=='GET')return json({error:'Method not allowed'},405);
      if(!env.GOOGLE_SERVICE_ACCOUNT_JSON)return json({error:'Google credentials not configured. See README.'},503);
      try {
        const token=await serviceAccountToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
        const [table,dual]=await Promise.all([
          readSheet(env.SHEET_ID,token,'2027!A1:M210'),
          readSheet(env.SHEET_ID,token,"'Vis Arts Dual Delivery'!A1:P120")
        ]);
        return json(parseSheets(table,dual));
      }catch(error){console.error('Graph load failed',error.message);return json({error:'Unable to load curriculum data; check Worker logs and Google Sheets permissions.'},502);}
    }
    return env.ASSETS.fetch(request);
  }
};
