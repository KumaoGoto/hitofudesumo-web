// ホーム画面に置ける形（PWA）のための手元の置き場（Service Worker）。初めて開いたときに遊ぶのに要るファイルを手元に置き、次からは通信がなくても遊べる。
// VERSION と PRECACHE（ファイルの名前 → 中身の印）は tools/web/make_sw.py が build/web/sw.js に書く（ここはひな形）。中身が変わると VERSION が変わり、
// 新しい置き場を作って古い置き場を捨てる。中身の変わっていないファイルは古い置き場から移す（更新のたびに全部を取り直さない）。
// 公開の形（tools/web/stage.py）では、プログラムは版ごとの箱 v/<VERSION>/ に入り、PRECACHE もその場所に書き換わる。

const VERSION = 'a61bcd9a47ae';
const PRECACHE = {
  'assets/AssetManifest.bin': 'ba60621882358037',
  'assets/AssetManifest.bin.json': 'eb5553aeb095e649',
  'assets/FontManifest.json': 'de95678be240f739',
  'assets/assets/audio/bgm_draw.m4a': '92fa728f619059bb',
  'assets/assets/audio/bgm_title.m4a': '50200f5967819f5d',
  'assets/assets/audio/end.wav': '714209c43ee2b58e',
  'assets/assets/audio/go.wav': '29de0c563207b49b',
  'assets/assets/audio/hit.wav': 'cc92ca4259515eb8',
  'assets/assets/audio/hyoshigi.wav': '3f31256f29eccc23',
  'assets/assets/audio/jingle_lose.m4a': '0a3481aff4854768',
  'assets/assets/audio/jingle_win.m4a': '572806032c31cc6c',
  'assets/assets/audio/jingle_yusho.m4a': 'a1cd3b762d5c0f1e',
  'assets/assets/audio/pull.wav': 'fcf8855252cb9205',
  'assets/assets/audio/ton.wav': '38a4ee8e2f4b42fd',
  'assets/assets/audio/ton2.wav': 'cfb99ec7c1c211a1',
  'assets/assets/fonts/DelaGothicOne-Regular.ttf': '2c8a0fd5f4d26e83',
  'assets/assets/fonts/MPLUSRounded1c-Black.ttf': '0922096a8728105e',
  'assets/assets/fonts/MPLUSRounded1c-Bold.ttf': 'dc736a06476ecd82',
  'assets/assets/fonts/MPLUSRounded1c-Regular.ttf': 'af1490d60b6141a2',
  'assets/assets/fonts/YujiBoku-Regular.ttf': 'e3b9c5697e809391',
  'assets/assets/fonts/YujiBokuKanji.ttf': '8479980823d46cb0',
  'assets/assets/kimarite/abisetaoshi.jpg': '957fb6db5480b40b',
  'assets/assets/kimarite/fumidashi.jpg': '698ade8b4ae646db',
  'assets/assets/kimarite/hatakikomi.jpg': 'bfe401162a2342aa',
  'assets/assets/kimarite/hikiotoshi.jpg': '2e7fe3b9f32b8345',
  'assets/assets/kimarite/isamiashi.jpg': 'c390cf26e0142c8e',
  'assets/assets/kimarite/koshikudake.jpg': '9217bbd313296a47',
  'assets/assets/kimarite/okuridashi.jpg': 'f9f5f43449a9b6f4',
  'assets/assets/kimarite/oshidashi.jpg': 'e2d1d37d00056537',
  'assets/assets/kimarite/oshitaoshi.jpg': '5de8403f18456aad',
  'assets/assets/kimarite/tsukidashi.jpg': '73989d60d5e5b333',
  'assets/assets/kimarite/tsukiotoshi.jpg': 'c53f3541575f1ddc',
  'assets/assets/kimarite/tsukite.jpg': '62fab96da4a71c24',
  'assets/assets/kimarite/tsuridashi.jpg': '9aca9232498bd759',
  'assets/assets/kimarite/utchari.jpg': '496bc1c9be4893ed',
  'assets/assets/kimarite/yorikiri.jpg': '743491a0bd94f2eb',
  'assets/assets/kimarite/yoritaoshi.jpg': '062163a51663bd51',
  'assets/fonts/MaterialIcons-Regular.otf': 'b8fda7fd4f7401d6',
  'assets/packages/cupertino_icons/assets/CupertinoIcons.ttf': '3d90c370aa4cf00d',
  'v/a61bcd9a47ae/assets/packages/forge2d/lib/src/backend/wasm/box2d.wasm': '33cfc1f30ef9aa3e',
  'assets/shaders/ink_sparkle.frag': '2dca5ab93d4ec29e',
  'assets/shaders/stretch_effect.frag': 'ab412f07a5b9b50b',
  'v/a61bcd9a47ae/canvaskit/canvaskit.js': '7361b744487f9826',
  'v/a61bcd9a47ae/canvaskit/canvaskit.wasm': '6bdfaa51c76845c0',
  'v/a61bcd9a47ae/flutter_bootstrap.js': '96fe6b4df16f4579',
  'icons/apple-touch-icon.png': '2eb8cb3a30175557',
  'icons/favicon-32.png': 'd5043d4d3c6e1ea5',
  'icons/icon-192.png': '8ce3572059044ded',
  'icons/icon-512.png': 'd906c3407cfba853',
  'icons/icon-maskable-512.png': '6aa2f53178d260bd',
  'index.html': 'a61bcd9a47ae',
  'v/a61bcd9a47ae/main.dart.js': '6dd5d5f35b394d5d',
  'manifest.webmanifest': 'ed06b9f5c5e57911',
};
// @@PRECACHE_END

const CACHE = `hitofudesumo-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(fill().then(() => self.skipWaiting()));
});

async function fill() {
  const cache = await caches.open(CACHE);
  const missing = await moveUnchanged(cache);
  await Promise.all(missing.map((name) => fetchAndPut(cache, name)));
}

/**
 * 残りを取りに行って置く。まずブラウザの HTTP の置き場を使う（初めての人が、いま読んだばかりの字やプログラムを 2 回落とさない）。
 * 版の箱 v/<VERSION>/ の中は名前が版ごとに違うので、そのまま信じてよい。箱の外は同じ名前で中身が変わることがある
 * （GitHub Pages は 10 分置かせる）ので、中身の印を見て、違えば HTTP の置き場を通さずに取り直す
 * （古いものを新しい版の置き場に入れると、次の版まで新旧が混ざって動く）。index.html の印は版なので、いつも取り直す。
 */
async function fetchAndPut(cache, name) {
  let res = await fetch(new Request(name, { cache: 'default' }));
  if (res.ok && !name.startsWith('v/') && (await mark(await res.clone().arrayBuffer())) !== PRECACHE[name]) {
    res = await fetch(new Request(name, { cache: 'reload' }));
  }
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  await cache.put(name, res);
}

/** 版の箱を除いた名前（版が変わっても同じファイルを見つける） */
const withoutBox = (name) => name.replace(/^v\/[0-9a-f]+\//, '');

/** 中身の印（tools/web/make_sw.py と同じ。SHA-256 の頭 16 けた） */
async function mark(bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...hash].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/** 古い置き場から、中身の印が同じファイルを移す。移せなかったファイルの名前を返す */
async function moveUnchanged(cache) {
  const scope = new URL(self.registration.scope).pathname;
  const old = new Map();
  for (const name of await caches.keys()) {
    if (name === CACHE || !name.startsWith('hitofudesumo-')) continue;
    const c = await caches.open(name);
    for (const req of await c.keys()) {
      old.set(withoutBox(new URL(req.url).pathname.slice(scope.length)), [c, req]);
    }
  }
  const missing = [];
  for (const [name, expected] of Object.entries(PRECACHE)) {
    const found = old.get(withoutBox(name));
    const res = found && (await found[0].match(found[1]));
    const bytes = res && (await res.arrayBuffer());
    if (bytes && (await mark(bytes)) === expected) {
      await cache.put(name, new Response(bytes, { headers: { 'content-type': res.headers.get('content-type') ?? 'application/octet-stream' } }));
    } else {
      missing.push(name);
    }
  }
  return missing;
}

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hitofudesumo-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** ゲームのページ（置き場の頭か index.html）を開く要求か。ほかのページはそのページのまま返す */
function isGamePage(req, url) {
  if (req.mode !== 'navigate') return false;
  const scope = new URL(self.registration.scope).pathname;
  return url.pathname === scope || url.pathname === `${scope}index.html`;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // ランキング（別の場所の API）・足りない字（Google のフォント配信）と POST は手元に置かない
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const game = isGamePage(req, url);
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // ゲームのページは手元の index.html を先に（通信がなくても開ける。?fps などの後ろは見ない）
    const hit = await cache.match(game ? 'index.html' : req, { ignoreSearch: game });
    if (hit) return hit;
    const res = await fetch(req);
    // 初めて読んだものも置いておく（次は通信なしで使える）。置き終わるまで Service Worker を止めさせない
    if (res.ok && res.type === 'basic') e.waitUntil(cache.put(req, res.clone()));
    return res;
  })());
});
