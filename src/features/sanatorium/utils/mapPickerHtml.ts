// The page of the tap-to-place map. It loads MapLibre and the style from OUR OWN tile server only (the same
// assets its viewer page uses), so a CSP pins every request to that host. The page talks to the app with
// JSON messages: {type:'ready'|'pick'|'zoom'|'error', lat?, lng?, zoom?}.
import { Env } from '@/config/env';

export type MapMessage = { type: 'ready' } | { type: 'pick'; lat: number; lng: number; zoom: number } | { type: 'zoom'; zoom: number } | { type: 'error' };

const viewer = () => Env.mapViewerUrl.replace(/\/+$/, '');
/** `https://hr.uzgidro.uz/tiles` out of `https://hr.uzgidro.uz/tiles/styles/uzgidro-dark/`. */
export const tilesBase = (): string => viewer().replace(/\/styles\/[^/]+$/, '');
/** A trusted address of our own for `source={{ html, baseUrl }}`. */
export const mapPickerBaseUrl = (): string => `${tilesBase()}/`;

/** Tashkent: where the map opens until a point is chosen. */
export const DEFAULT_CENTER = { lat: 41.2995, lng: 69.2401, zoom: 11 };
const num = (n: number | null | undefined, fallback: number): number => (typeof n === 'number' && Number.isFinite(n) ? n : fallback);

export function mapPickerHtml(p: { lat: number | null; lng: number | null; zoom: number; readOnly?: boolean; pin?: string }): string {
  const base = tilesBase();
  const origin = /^https?:\/\/[^/]+/.exec(base)?.[0] ?? base;
  const has = p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng);
  const init = {
    lat: has ? num(p.lat, DEFAULT_CENTER.lat) : null,
    lng: has ? num(p.lng, DEFAULT_CENTER.lng) : null,
    clat: has ? num(p.lat, DEFAULT_CENTER.lat) : DEFAULT_CENTER.lat,
    clng: has ? num(p.lng, DEFAULT_CENTER.lng) : DEFAULT_CENTER.lng,
    zoom: has ? Math.min(19, Math.max(1, num(p.zoom, 15))) : DEFAULT_CENTER.zoom,
    ro: !!p.readOnly,
    style: `${viewer()}/style.json`,
    pin: /^#[0-9a-f]{6}$/i.test(p.pin ?? '') ? p.pin : 'red',
  };
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${origin} 'unsafe-inline' blob:; style-src ${origin} 'unsafe-inline'; img-src ${origin} data: blob:; connect-src ${origin}; font-src ${origin}; worker-src blob:; child-src blob:">
<link rel="stylesheet" href="${base}/maplibre-gl.css">
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%}</style></head><body><div id="map"></div>
<script>
var I=${JSON.stringify(init)};
function send(m){var s=JSON.stringify(m);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else if(window.parent!==window)window.parent.postMessage(s,'*');}
function r6(n){return Math.round(n*1e6)/1e6;}
function boot(){
  try{
    var map=new maplibregl.Map({container:'map',style:I.style,center:[I.clng,I.clat],zoom:I.zoom,attributionControl:false});
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');
    map.addControl(new maplibregl.AttributionControl({compact:true,customAttribution:'\\u00a9 OpenStreetMap'}),'bottom-left');
    var marker=null;
    var pick=function(){var p=marker.getLngLat();send({type:'pick',lat:r6(p.lat),lng:r6(p.lng),zoom:Math.round(map.getZoom())});};
    var put=function(lat,lng){
      if(!marker){marker=new maplibregl.Marker({draggable:!I.ro,color:I.pin}).setLngLat([lng,lat]).addTo(map);marker.on('dragend',pick);}
      else marker.setLngLat([lng,lat]);
    };
    if(I.lat!==null)put(I.lat,I.lng);
    map.on('click',function(e){if(I.ro)return;put(e.lngLat.lat,e.lngLat.lng);pick();});
    map.on('zoomend',function(){send({type:'zoom',zoom:Math.round(map.getZoom())});});
    window.__setPoint=function(lat,lng){
      if(lat===null){if(marker){marker.remove();marker=null;}return;}
      // No animation: a page that is throttled (off screen) would leave the pin behind the map.
      map.jumpTo({center:[lng,lat]});put(lat,lng);
    };
    window.addEventListener('message',function(e){try{var m=JSON.parse(e.data);if(m&&m.cmd==='set')window.__setPoint(m.lat,m.lng);}catch(x){}});
    // The credits start folded: unfolded they cover half of a phone-sized map.
    map.once('load',function(){var a=document.querySelector('.maplibregl-ctrl-attrib');if(a){a.classList.remove('maplibregl-compact-show');a.removeAttribute('open');}send({type:'ready'});});
    map.once('styledata',function(){send({type:'ready'});});
  }catch(e){send({type:'error'});}
}
</script>
<script src="${base}/maplibre-gl.js" onload="boot()" onerror="send({type:'error'})"></script>
</body></html>`;
}

/** A message of the page; anything else is null (coordinates are checked, the page is not trusted blindly). */
export function parseMapMessage(raw: unknown): MapMessage | null {
  if (typeof raw !== 'string' || raw.length > 500) return null;
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  const ok = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max;
  if (m.type === 'ready') return { type: 'ready' };
  if (m.type === 'error') return { type: 'error' };
  if (m.type === 'zoom' && ok(m.zoom, 24)) return { type: 'zoom', zoom: Math.min(19, Math.max(1, Math.round(m.zoom))) };
  if (m.type === 'pick' && ok(m.lat, 90) && ok(m.lng, 180)) return { type: 'pick', lat: m.lat, lng: m.lng, zoom: ok(m.zoom, 24) ? Math.min(19, Math.max(1, Math.round(m.zoom))) : 15 };
  return null;
}

/** Script that moves the pin from the app side (typed coordinates, «clear»). */
export const setPointScript = (lat: number | null, lng: number | null): string =>
  lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) ? `window.__setPoint&&window.__setPoint(${Number(lat)},${Number(lng)});true;` : 'window.__setPoint&&window.__setPoint(null,null);true;';
