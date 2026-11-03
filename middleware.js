// Just Do it Statistics — 사이트 비밀번호 (Vercel Routing Middleware)
// 모든 페이지·파일 요청 전에 Vercel 서버에서 실행됩니다. 비밀번호가 맞으면 브라우저를 닫을 때까지만 기억합니다.
//
// 비밀번호 바꾸는 법: Vercel → 프로젝트 → Settings → Environment Variables 에
//   SITE_PASSWORD = 원하는 비밀번호   를 추가하고 다시 배포하면 그 값이 우선합니다.
// 설정이 없으면 아래 해시(기본 비밀번호의 SHA-256 값)로 확인합니다. 코드에는 비밀번호 자체를 적지 않습니다.
const DEFAULT_HASH = '70cc44b2ed0ef98bdc8399a76b0de69294e7e6f81996d7e08519985d386a8a42';
const COOKIE = 'jd_gate2';   // 이름을 바꿔 예전(30일) 기억을 모두 무효화
const LOGIN = '/__login';

export const config = { matcher: '/:path*' };

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function expectedHash() {
  const pw = (typeof process !== 'undefined' && process.env && process.env.SITE_PASSWORD) || '';
  return pw ? sha256(pw) : DEFAULT_HASH;
}
const tokenFor = hash => sha256('jd-gate-v2:' + hash);
function readCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}
const safeNext = n => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') && !n.startsWith(LOGIN)) ? n : '/';

function page(next, error) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Just Do it Statistics</title><meta name="robots" content="noindex">
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Noto+Sans+KR:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f3f0ea;--card:#fffdf9;--ink:#1e2350;--muted:#7d8098;--line:#ebe6dc;--btn:#262b55;--on:#fbf9f5;--blue:#2a63d4;--err:#c0504d}
@media (prefers-color-scheme:dark){:root{--bg:#141733;--card:#1e2245;--ink:#f4f0e6;--muted:#a2a4c4;--line:#30355f;--btn:#f3d778;--on:#1b1f3d;--blue:#7fb0ff;--err:#f09a83}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font-family:"Noto Sans KR",system-ui,sans-serif;padding:16px}
.card{width:min(380px,100%);background:var(--card);border:1px solid var(--line);border-radius:28px;padding:34px 28px;box-shadow:0 10px 30px rgba(52,50,110,.1);text-align:center}
h1{font-family:Caveat,cursive;font-weight:700;font-size:46px;margin:0;line-height:1}h1 b{color:var(--blue);font-size:1.25em}
p{color:var(--muted);margin:12px 0 22px;font-size:14px}
input{width:100%;font:inherit;font-size:28px;letter-spacing:.5em;text-align:center;padding:12px 0 12px .5em;border:1px solid var(--line);border-radius:18px;background:var(--bg);color:var(--ink)}
input:focus{outline:2px solid var(--blue);outline-offset:1px}
button{margin-top:14px;width:100%;font:inherit;font-size:16px;border:none;border-radius:999px;padding:13px;background:var(--btn);color:var(--on);cursor:pointer}
.err{color:var(--err);font-size:14px;margin:12px 0 0}
</style></head><body><form class="card" method="post" action="${LOGIN}?next=${encodeURIComponent(next)}">
<h1><b>J</b>ust <b>D</b>o it Statistics</h1><p>비밀번호를 입력해 주세요</p>
<input name="pw" type="password" inputmode="numeric" autocomplete="current-password" autofocus required aria-label="비밀번호">
<button type="submit">들어가기 →</button>${error ? `<p class="err">${esc(error)}</p>` : ''}</form></body></html>`;
}
const html = (body, status) => new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

export default async function middleware(request) {
  const url = new URL(request.url);
  const hash = await expectedHash(), token = await tokenFor(hash);

  if (url.pathname === LOGIN) {
    const next = safeNext(url.searchParams.get('next'));
    if (request.method === 'POST') {
      let pw = '';
      try { pw = String((await request.formData()).get('pw') || '').trim(); } catch (e) {}
      if (pw && (await sha256(pw)) === hash) {
        return new Response(null, { status: 303, headers: {
          location: next, 'cache-control': 'no-store',
          'set-cookie': `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`   // 만료일 없음 = 브라우저를 닫으면 사라짐,
        } });
      }
      return html(page(next, '비밀번호가 맞지 않습니다. 다시 입력해 주세요.'), 401);
    }
    return html(page(next, ''), 200);
  }

  if (readCookie(request, COOKIE) === token) return; // 통과: 원래 페이지를 보여 줌
  return html(page(url.pathname + url.search, ''), 401);
}
