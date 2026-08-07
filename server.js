const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SEED_FILE = path.join(ROOT, 'community-data.json');
const DATA_DIR = process.env.DATA_DIR || ROOT;
const DATA_FILE = path.join(DATA_DIR, 'community-data.json');
const PORT = Number(process.env.PORT) || 4173;
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const SOCIAL_COPY = {
  '/index.html': ['Joy Vapers | Tienda de vape en Iquitos', 'Descubre productos, sabores, novedades, eventos y la comunidad de Joy Vapers en Iquitos. Visítanos en Calle Nauta N.° 341.'],
  '/productos.html': ['Productos | Joy Vapers Iquitos', 'Explora los dispositivos y sabores disponibles en Joy Vapers. Compra fácilmente por WhatsApp.'],
  '/producto.html': ['Producto disponible | Joy Vapers', 'Conoce sus características, precio y solicítalo directamente por WhatsApp en Joy Vapers Iquitos.'],
  '/novedades.html': ['Novedades | Joy Vapers', 'Conoce las novedades, recomendaciones y todo lo que sucede en el universo Joy Vapers.'],
  '/eventos.html': ['Eventos con propósito | Joy Vapers', 'Conoce las actividades, colaboraciones y acciones de Joy Vapers junto a la comunidad de Loreto.'],
  '/comunidad.html': ['Joy Community | Foro de Joy Vapers', 'Publica, responde, reacciona y forma parte de la comunidad de Joy Vapers Iquitos.']
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
if (!fs.existsSync(DATA_FILE)) fs.copyFileSync(SEED_FILE, DATA_FILE);
const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = data => {
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temp, DATA_FILE);
};
const send = (res, status, data) => {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
};
const body = req => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', chunk => { raw += chunk; if (raw.length > 12000) reject(new Error('too_large')); });
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('invalid_json')); } });
  req.on('error', reject);
});
const clean = (value, max) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
const publicAuthor = value => {
  const author = clean(value, 60);
  const match = author.match(/^([^@]+)@([^@]+)$/);
  if (!match) return author;
  return `${match[1].slice(0, 2)}***@${match[2]}`;
};
const htmlEscape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const socialMeta = (req, url) => {
  const pagePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const [title, description] = SOCIAL_COPY[pagePath] || SOCIAL_COPY['/index.html'];
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim();
  const host = /^[a-z0-9.:-]+$/i.test(forwardedHost) ? forwardedHost : 'localhost';
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto === 'https' || forwardedProto === 'http' ? forwardedProto : (host.includes('localhost') ? 'http' : 'https');
  const origin = `${protocol}://${host}`;
  const canonical = `${origin}${pagePath}${url.search}`;
  const image = `${origin}/metadatos.png`;
  return `<meta property="og:type" content="website">
  <meta property="og:site_name" content="Joy Vapers">
  <meta property="og:locale" content="es_PE">
  <meta property="og:title" content="${htmlEscape(title)}">
  <meta property="og:description" content="${htmlEscape(description)}">
  <meta property="og:url" content="${htmlEscape(canonical)}">
  <meta property="og:image" content="${htmlEscape(image)}">
  <meta property="og:image:secure_url" content="${htmlEscape(image)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1672">
  <meta property="og:image:height" content="941">
  <meta property="og:image:alt" content="Joy Vapers, tienda de vape en Iquitos">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${htmlEscape(title)}">
  <meta name="twitter:description" content="${htmlEscape(description)}">
  <meta name="twitter:image" content="${htmlEscape(image)}">
  <link rel="canonical" href="${htmlEscape(canonical)}">`;
};
const present = (post, clientId) => ({
  id: post.id, name: post.name, text: post.text, createdAt: post.createdAt,
  official: Boolean(post.official), likes: post.likes.length,
  liked: Boolean(clientId && post.likes.includes(clientId)),
  comments: post.comments.map(comment => ({id:comment.id,name:comment.name,text:comment.text,createdAt:comment.createdAt}))
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      const data = readData();
      return send(res, 200, {status:'ok',posts:data.posts.length});
    }
    if (req.method === 'GET' && url.pathname === '/api/community') {
      const clientId = clean(url.searchParams.get('clientId'), 80);
      return send(res, 200, {posts:readData().posts.map(post => present(post, clientId))});
    }
    if (req.method === 'POST' && url.pathname === '/api/posts') {
      const input = await body(req), name = publicAuthor(input.author), text = clean(input.text, 500);
      if (name.length < 2 || text.length < 2) return send(res, 400, {error:'Completa tu nombre o correo y el mensaje.'});
      const data = readData();
      const post = {id:crypto.randomUUID(),name,text,createdAt:new Date().toISOString(),official:false,likes:[],comments:[]};
      data.posts.unshift(post); writeData(data); return send(res, 201, {post:present(post, clean(input.clientId, 80))});
    }
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'posts' && parts[3] === 'like') {
      const input = await body(req), clientId = clean(input.clientId, 80);
      if (clientId.length < 12) return send(res, 400, {error:'Identificador de visitante inválido.'});
      const data = readData(), post = data.posts.find(item => item.id === parts[2]);
      if (!post) return send(res, 404, {error:'Publicación no encontrada.'});
      const index = post.likes.indexOf(clientId); if (index >= 0) post.likes.splice(index, 1); else post.likes.push(clientId);
      writeData(data); return send(res, 200, {likes:post.likes.length,liked:index < 0});
    }
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'posts' && parts[3] === 'comments') {
      const input = await body(req), name = publicAuthor(input.author), text = clean(input.text, 300);
      if (name.length < 2 || text.length < 1) return send(res, 400, {error:'Escribe tu nombre o correo y una respuesta.'});
      const data = readData(), post = data.posts.find(item => item.id === parts[2]);
      if (!post) return send(res, 404, {error:'Publicación no encontrada.'});
      const comment = {id:crypto.randomUUID(),name,text,createdAt:new Date().toISOString()};
      post.comments.push(comment); writeData(data); return send(res, 201, {comment});
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, {error:'Ruta no encontrada.'});

    let requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = path.resolve(ROOT, `.${requested}`);
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); return res.end('Página no encontrada');
    }
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.html') {
      const html = fs.readFileSync(filePath, 'utf8').replace('</head>', `  ${socialMeta(req, url)}\n</head>`);
      res.writeHead(200, {'Content-Type':MIME[extension],'Cache-Control':'no-cache'});
      return res.end(html);
    }
    res.writeHead(200, {'Content-Type':MIME[extension] || 'application/octet-stream','Cache-Control':extension === '.png' || extension === '.webp' ? 'public, max-age=86400' : 'no-cache'});
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    send(res, error.message === 'too_large' ? 413 : 500, {error:'No se pudo completar la operación.'});
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`Joy Vapers disponible en http://0.0.0.0:${PORT}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
