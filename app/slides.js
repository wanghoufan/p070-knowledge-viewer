/* HTML deck import helpers: encoding, self-containment scan, sandbox hardening. */

const CSP = [
  "default-src 'none'",
  "img-src data: blob:",
  "media-src data: blob:",
  "style-src 'unsafe-inline' data: blob:",
  "script-src 'unsafe-inline' 'unsafe-eval' blob: data:",
  "font-src data: blob:",
  "connect-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'"
].join('; ');

export function decodeHtml(buffer) {
  const head = new TextDecoder('latin1').decode(buffer.slice(0, 2048)).toLowerCase();
  const m = /<meta[^>]+charset\s*=\s*["']?\s*([a-z0-9_-]+)/i.exec(head);
  const charset = m ? m[1].toLowerCase() : 'utf-8';
  try {
    return new TextDecoder(charset === 'gb2312' ? 'gbk' : charset).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

export function scanSelfContained(raw) {
  const cleaned = String(raw)
    .replace(/xmlns(:\w+)?="https?:\/\/[^"]*"/gi, '')
    .replace(/http:\/\/www\.w3\.org[^"'\s)]*/gi, '');
  const refs = [];
  const re = /(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
  let m;
  while ((m = re.exec(cleaned))) refs.push(m[1]);
  const urlRe = /url\(\s*["']?(https?:\/\/[^"')]+)/gi;
  while ((m = urlRe.exec(cleaned))) refs.push(m[1]);
  const importRe = /@import\s+(?:url\()?\s*["']?(https?:\/\/[^"')]+)/gi;
  while ((m = importRe.exec(cleaned))) refs.push(m[1]);
  return { selfContained: refs.length === 0, refs: Array.from(new Set(refs)).slice(0, 12) };
}

function bridge() {
  return `<script>(function(){
    function send(m){try{parent.postMessage(m,'*')}catch(e){}}
    function boot(){
      var n=document.querySelectorAll('section.slide, .slide, [data-page], .reveal .slides > section').length;
      send({type:'p070:ready', pages:n||0, origin:String(self.origin)});
    }
    if(document.readyState==='complete') setTimeout(boot,30); else addEventListener('load',function(){setTimeout(boot,30)});
    addEventListener('message',function(e){
      var d=e.data||{}; if(d.type!=='p070:nav') return;
      var key=d.dir==='next'?'ArrowRight':'ArrowLeft';
      document.dispatchEvent(new KeyboardEvent('keydown',{key:key,code:key,bubbles:true,cancelable:true}));
    });
    addEventListener('keydown',function(e){ if(e.key==='Escape') send({type:'p070:exit'}); });
  })();<\/script>`;
}

export function hardenHtml(raw) {
  let out = String(raw);
  out = out.replace(/<meta[^>]+http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, '');
  out = out.replace(/<base[^>]*>/gi, '');
  const csp = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
  if (/<head[^>]*>/i.test(out)) out = out.replace(/<head([^>]*)>/i, `<head$1>${csp}`);
  else out = csp + out;
  const b = bridge();
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${b}</body>`);
  else out += b;
  return out;
}
