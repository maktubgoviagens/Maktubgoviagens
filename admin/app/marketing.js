// Maktub Go: aba Marketing.
// Administradores (Isadora e Matheus): painel de controle, aprovação, calendário, produção e estratégia.
// Equipe de marketing: "Estúdio", visão mais visual da semana, produção, ideias e estratégia.
// Sem mídia no app: as artes ficam no Canva ou no Drive e aqui entra só o link.

const FMT = { reels: ['Reels', '#8a6520'], carrossel: ['Carrossel', '#2f6b4a'], feed: ['Feed', '#a0561f'], stories: ['Stories', '#2e5e6e'] };
const ST = { ideia: 'Ideia', producao: 'Em produção', aprovacao: 'Aprovação', agendado: 'Aprovado', publicado: 'Publicado' };
const ST_TAG = { ideia: '', producao: '', aprovacao: 'alerta', agendado: 'ouro', publicado: 'ok' };
const CORES = ['#1a3826', '#8a6520', '#a0561f', '#2e5e6e', '#6b3a4a', '#5f6b2f', '#7a6a55'];
const DOCS = [
  ['doc-posicionamento', 'Posicionamento', 'Como a Maktub quer ser vista e o que a diferencia.'],
  ['doc-publico', 'Público', 'Para quem falamos: perfil, desejos e objeções.'],
  ['doc-tom', 'Tom de voz', 'Como escrevemos: palavras que usamos e que evitamos.'],
  ['doc-regras', 'Regras da marca', 'O que sempre e o que nunca aparece nos posts.'],
  ['doc-referencias', 'Hashtags e referências', 'Hashtags, perfis de referência e links úteis.']
];
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

let LISTA = null, EST = [], TIME = [], ERRO = null, X = null;
let VIEW = null, ED = null, PRE = null, ED_EST = null, MES = null, DIA = null, AJ = null, CONF = null, ID_FMT = 'reels';

/* ---------- datas ---------- */
const isoDe = (d) => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const hoje = () => isoDe(new Date());
const maisDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDe(d); };
const dm = (s) => s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '';
const mesK = (s) => String(s || '').slice(0, 7);
const mesNome = (k) => { const [y, m] = k.split('-').map(Number); const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const mesMais = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const diaPost = (p) => p.status === 'publicado' ? (p.publicado_em || p.data_prevista) : p.data_prevista;

/* ---------- dados ---------- */
export async function carregar(sb) {
  const [p, e, t] = await Promise.all([
    sb.from('marketing_posts').select('*').order('data_prevista', { ascending: true, nullsFirst: false }).limit(3000),
    sb.from('marketing_estrategia').select('*').order('ordem').order('criado_em'),
    sb.rpc('time_nomes')
  ]);
  if (p.error || e.error) { ERRO = (p.error || e.error).message; LISTA = null; return; }
  ERRO = null; LISTA = p.data || []; EST = e.data || []; TIME = t.data || [];
}
export function pend() {
  if (!LISTA) return {};
  return {
    aprovacao: LISTA.filter(p => p.status === 'aprovacao').length,
    tiktok: LISTA.filter(precisaTikTok).length,
    atrasados: LISTA.filter(atrasado).length
  };
}
export function rota(h) { VIEW = h[1] || null; ED = null; ED_EST = null; PRE = null; }
export function abrir(v) { VIEW = v; ED = null; ED_EST = null; PRE = null; }

// posts só no Instagram: sem controle de repost no TikTok
const precisaTikTok = () => false;
const atrasado = (p) => !['ideia', 'publicado'].includes(p.status) && p.data_prevista && p.data_prevista < hoje();
const cfg = () => EST.find(e => e.chave === 'config');
const exigir = () => !(cfg() && cfg().valores && cfg().valores.aprovacao === false);
const meta = (k) => (EST.find(e => e.chave === 'meta-' + k) || {}).valores || {};
const pilares = () => EST.filter(e => e.tipo === 'pilar');
const campanhas = () => EST.filter(e => e.tipo === 'campanha');
const est = (id) => EST.find(e => e.id === id);
const nomeT = (id) => (TIME.find(t => t.user_id === id) || {}).nome || '';
const primeiro = (n) => String(n || '').split(' ')[0];
const corP = (p) => (FMT[p.formato] || FMT.feed)[1];
const pubNoMes = (k) => LISTA.filter(p => p.status === 'publicado' && mesK(p.publicado_em) === k);

/* ---------- estilos próprios da aba ---------- */
function estilos() {
  if (document.getElementById('mkCss')) return;
  const s = document.createElement('style'); s.id = 'mkCss';
  s.textContent = `
.mk-lin{display:flex;align-items:center;gap:10px;width:100%;background:var(--branco);border:0;border-top:1px solid var(--linha);padding:11px 12px;text-align:left;cursor:pointer;font-size:14px}
.mk-lista{background:var(--branco);border:1px solid var(--linha)}.mk-lista .mk-lin:first-child{border-top:0}
.mk-lin i{flex:0 0 8px;height:8px;border-radius:50%}
.mk-lin .t{flex:1;min-width:0}.mk-lin small{display:block;font-size:12px;color:var(--tinta-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mk-lin .tag{margin-top:0;white-space:nowrap}
.mk-aprov{background:var(--branco);border:1px solid var(--linha);border-left:3px solid var(--alerta);padding:14px;margin-top:8px}
.mk-aprov .nome{font-family:'Cormorant Garamond',serif;font-size:21px;color:var(--verde);line-height:1.15}
.mk-aprov .leg{font-size:13.5px;color:var(--tinta-2);margin-top:8px;white-space:pre-wrap;max-height:7.5em;overflow:hidden}
.mk-links{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:13px}.mk-links a{color:var(--dourado)}
.mk-btns{display:flex;gap:8px;margin-top:12px}.mk-btns>*{flex:1}
.mk-barra{display:grid;grid-template-columns:110px 1fr 28px;gap:8px;align-items:center;padding:6px 0;font-size:13px}
.mk-barra .t{height:8px;background:var(--creme-2)}.mk-barra .t i{display:block;height:100%}
.mk-barra .q{text-align:right;color:var(--tinta-2)}
.mk-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:10px}
.mk-cal .h{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-3);text-align:center;padding:4px 0}
.mk-cal button{aspect-ratio:1/1.05;background:var(--branco);border:1px solid var(--linha);font-size:13px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:6px;gap:4px;color:var(--tinta)}
.mk-cal button.fora{visibility:hidden}.mk-cal button.hj{border-color:var(--dourado)}.mk-cal button.sel{background:var(--verde);color:var(--creme);border-color:var(--verde)}
.mk-cal button.sel .mk-dots i{border-color:var(--creme)!important}
.mk-dots{display:flex;gap:2px;flex-wrap:wrap;justify-content:center;max-width:90%}.mk-dots i{width:6px;height:6px;border-radius:50%}
.mk-fmts{display:flex;gap:6px;flex-wrap:wrap}
.mk-fmts label{cursor:pointer}.mk-fmts input{position:absolute;opacity:0;pointer-events:none}
.mk-fmts span{display:inline-block;padding:9px 14px;border:1px solid var(--linha);background:var(--branco);font-size:13px;border-radius:20px;color:var(--tinta-2)}
.mk-fmts input:checked+span{background:var(--c);border-color:var(--c);color:#fff}
.mk-cores{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.mk-cores label{cursor:pointer}.mk-cores input{position:absolute;opacity:0}
.mk-cores span{display:block;width:32px;height:32px;border-radius:50%;background:var(--c);border:3px solid var(--branco);box-shadow:0 0 0 1px var(--linha)}
.mk-cores input:checked+span{box-shadow:0 0 0 2px var(--tinta)}
.mk-ajuste{background:rgba(160,86,31,.08);border-left:3px solid var(--alerta);padding:10px 12px;font-size:13.5px;margin-top:10px;white-space:pre-wrap}
.mk-pilares{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mk-pilar{background:var(--c);color:#fff;border:0;padding:14px;text-align:left;cursor:pointer;min-height:92px;display:flex;flex-direction:column;justify-content:space-between}
.mk-pilar b{font-family:'Cormorant Garamond',serif;font-size:21px;font-weight:500;line-height:1.1}.mk-pilar small{font-size:12px;opacity:.85}
.mk-doc{background:var(--branco);border:1px solid var(--linha);padding:14px;margin-top:8px}
.mk-doc h3{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--dourado);font-weight:600;display:flex;justify-content:space-between;align-items:center}
.mk-doc h3 button{background:none;border:0;color:var(--tinta-2);font-size:12px;letter-spacing:.04em;text-transform:none;cursor:pointer}
.mk-doc p{font-size:14px;white-space:pre-wrap;margin-top:8px}.mk-doc p.v{color:var(--tinta-3)}
/* Estúdio: visão da equipe de marketing */
.mk-hero{background:var(--verde);color:var(--creme);margin:-18px -16px 0;padding:22px 16px 18px}
.mk-hero .ola{font-family:'Cormorant Garamond',serif;font-size:30px;line-height:1.1}.mk-hero .ola em{color:var(--dourado-claro)}
.mk-hero .s{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--dourado-claro);margin-bottom:6px}
.mk-aneis{display:flex;gap:18px;margin-top:16px;align-items:center}
.mk-anel{display:flex;align-items:center;gap:10px}.mk-anel svg{width:64px;height:64px;transform:rotate(-90deg)}
.mk-anel .n{font-family:'Cormorant Garamond',serif;font-size:26px;line-height:1}.mk-anel small{display:block;font-size:11px;letter-spacing:.08em;color:rgba(249,246,241,.7)}
.mk-semana{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:18px}
.mk-semana button{background:rgba(249,246,241,.07);border:1px solid rgba(249,246,241,.12);color:var(--creme);padding:8px 0 7px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px}
.mk-semana .d{font-size:10px;letter-spacing:.1em;text-transform:uppercase;opacity:.7}.mk-semana .n{font-family:'Cormorant Garamond',serif;font-size:21px;line-height:1}
.mk-semana button.hj{border-color:var(--dourado-claro)}.mk-semana button.sel{background:var(--creme);color:var(--verde)}
.mk-semana .mk-dots{min-height:6px}
.mk-vcard{background:var(--branco);border:1px solid var(--linha);border-left:5px solid var(--c);margin-top:8px}
.mk-vcard>button{display:block;width:100%;background:none;border:0;text-align:left;padding:13px 14px 10px;cursor:pointer}
.mk-vcard .pill{display:inline-block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:3px 9px;border-radius:12px;background:var(--c);color:#fff;font-weight:500}
.mk-vcard .st{display:inline-block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2);margin-left:6px}
.mk-vcard b{display:block;font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:500;color:var(--verde);line-height:1.15;margin-top:7px}
.mk-vcard small{display:block;font-size:12.5px;color:var(--tinta-3);margin-top:3px}
.mk-vcard .ac{display:flex;border-top:1px solid var(--linha)}
.mk-vcard .ac button{flex:1;background:none;border:0;padding:11px;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--verde);font-weight:600;cursor:pointer}
.mk-vcard .ac span{flex:1;padding:11px;font-size:12px;color:var(--tinta-3);text-align:center}
.mk-dia{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--dourado);font-weight:600;margin:20px 0 2px}
.mk-ideias{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.mk-ideia{background:#f4ead2;border:0;padding:12px 12px 10px;text-align:left;cursor:pointer;min-height:110px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 1px 0 rgba(0,0,0,.06);transform:rotate(var(--r))}
.mk-ideia b{font-size:14.5px;font-weight:500;color:var(--tinta);line-height:1.3}
.mk-ideia small{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--c);font-weight:600}
.mk-rapida{display:flex;gap:8px;margin-top:12px}.mk-rapida input{flex:1;min-width:0;padding:12px;border:1px solid var(--linha);font-size:16px;background:var(--branco)}
.mk-tt{background:#1f1f1c;color:#f9f6f1}.mk-tt .nome{color:#f9f6f1}
`;
  document.head.appendChild(s);
}

/* ---------- tela ---------- */
export function tela(P, ctx) {
  X = ctx; estilos();
  const { esc } = X;
  if (ERRO || !LISTA) {
    P.innerHTML = `<h1 class="titulo">Marketing</h1>${X.tec('<div class="config" style="margin-top:12px">O marketing ainda não foi ativado no Supabase. Rode o marketing.sql do guia.</div>')}${X.so ? sairBtn() : ''}`;
    return;
  }
  const vistas = X.ADMIN ? ['painel', 'calendario', 'producao', 'estrategia'] : ['semana', 'producao', 'ideias', 'estrategia'];
  if (!vistas.includes(VIEW)) VIEW = vistas[0];
  if (!MES) MES = mesK(hoje());
  if (ED) return formPost(P);
  if (ED_EST) return formEst(P);
  const nomes = { painel: 'Painel', calendario: 'Calendário', producao: 'Produção', estrategia: 'Estratégia', semana: 'Semana', ideias: 'Ideias' };
  const seg = `<div class="seg" id="mkSeg" style="margin-top:${X.ADMIN ? 12 : 16}px">${vistas.map(v => `<button data-v="${v}" class="${VIEW === v ? 'on' : ''}">${nomes[v]}</button>`).join('')}</div>`;
  let html = '';
  if (VIEW === 'painel') html = vPainel();
  if (VIEW === 'calendario') html = vCalendario();
  if (VIEW === 'producao') html = vProducao();
  if (VIEW === 'estrategia') html = vEstrategia();
  if (VIEW === 'semana') html = vSemana();
  if (VIEW === 'ideias') html = vIdeias();
  const topo = X.ADMIN
    ? `${X.so ? '' : '<button class="voltar" id="mkVoltar">‹ Empresa</button>'}<h1 class="titulo" style="margin-top:6px">Marketing <em>da Maktub</em></h1>${seg}`
    : (VIEW === 'semana' ? '' : `<h1 class="titulo">Estúdio de <em>conteúdo</em></h1>`) + (VIEW === 'semana' ? '' : seg);
  P.innerHTML = topo + html + (X.so ? sairBtn() : '');
  if (VIEW === 'semana') { const h = P.querySelector('.mk-hero'); if (h) h.insertAdjacentHTML('afterend', seg); }
  history.replaceState(null, '', '#marketing/' + VIEW);
  ligar(P);
}
const sairBtn = () => '<button class="sec" data-sair style="width:100%;margin-top:28px">Sair do app</button>';
const rerender = () => { const P = document.getElementById('pagina'); if (P && X.aba() === 'marketing') tela(P, X); };

/* ---------- administradores: painel ---------- */
function vPainel() {
  const { esc } = X, k = mesK(hoje()), m = meta(k), pub = pubNoMes(k), reels = pub.filter(p => p.formato === 'reels');
  const aprov = LISTA.filter(p => p.status === 'aprovacao').sort(porData);
  const atras = LISTA.filter(atrasado).sort(porData);
  const prox = LISTA.filter(p => !['ideia', 'publicado'].includes(p.status) && p.data_prevista && p.data_prevista >= hoje() && p.data_prevista <= maisDias(hoje(), 7)).sort(porData);
  const tt = LISTA.filter(precisaTikTok);
  const noMes = LISTA.filter(p => p.status !== 'ideia' && mesK(diaPost(p)) === k);
  const porPilar = pilares().map(pl => [pl, noMes.filter(p => p.pilar_id === pl.id).length]);
  const semPilar = noMes.filter(p => !p.pilar_id).length;
  const maxP = Math.max(1, ...porPilar.map(x => x[1]), semPilar);
  const ideias = LISTA.filter(p => p.status === 'ideia').length;
  return `
    <div class="botoes4" style="display:flex;gap:8px;margin-top:12px"><button class="zap" data-novo="producao" style="flex:1">+ Novo post</button><button class="sec" data-novo="ideia" style="flex:1">+ Ideia</button></div>
    <div class="numeros" style="margin-top:12px">
      <div class="num destaque"><div class="l">Publicados no mês</div><div class="v">${pub.length}${m.posts ? `<small style="font-size:.55em;color:var(--tinta-3)"> / ${m.posts}</small>` : ''}</div><div class="d">${m.posts ? Math.round(pub.length / m.posts * 100) + '% da meta' : 'meta não definida'}</div></div>
      <div class="num destaque"><div class="l">Reels no mês</div><div class="v">${reels.length}${m.reels ? `<small style="font-size:.55em;color:var(--tinta-3)"> / ${m.reels}</small>` : ''}</div><div class="d">${m.reels ? Math.round(reels.length / m.reels * 100) + '% da meta' : 'meta não definida'}</div></div>
      <div class="num ${aprov.length ? 'alerta' : ''}"><div class="l">Para aprovar</div><div class="v">${aprov.length}</div><div class="d">${exigir() ? 'aprovação obrigatória' : 'aprovação opcional'}</div></div>
      <div class="num ${atras.length ? 'alerta' : ''}"><div class="l">Atrasados</div><div class="v">${atras.length}</div><div class="d">passaram da data prevista</div></div>
    </div>
    <div class="secao">Para você aprovar</div>
    ${aprov.length ? aprov.map(cardAprovar).join('') : '<div class="vazio">Nada esperando aprovação.</div>'}
    ${atras.length ? `<div class="secao">Atrasados</div><div class="mk-lista">${atras.map(linha).join('')}</div>` : ''}
    <div class="secao">Próximos 7 dias <button data-v="calendario">Calendário ›</button></div>
    ${prox.length ? `<div class="mk-lista">${prox.map(linha).join('')}</div>` : '<div class="vazio">Nada programado para os próximos dias.</div>'}
    ${tt.length ? `<div class="secao">Repostar no TikTok</div><div class="mk-lista">${tt.map(linha).join('')}</div>` : ''}
    <section class="bloco"><h2>Pilares em ${mesNome(k).split(' ')[0].toLowerCase()}</h2>
      ${porPilar.length || semPilar ? porPilar.map(([pl, n]) => `<div class="mk-barra"><span>${esc(pl.titulo)}</span><span class="t"><i style="width:${n / maxP * 100}%;background:${pl.cor || CORES[0]}"></i></span><span class="q">${n}</span></div>`).join('') + (semPilar ? `<div class="mk-barra"><span style="color:var(--tinta-3)">Sem pilar</span><span class="t"><i style="width:${semPilar / maxP * 100}%;background:var(--tinta-3)"></i></span><span class="q">${semPilar}</span></div>` : '') : '<div class="vazio">Cadastre os pilares em Estratégia para ver o equilíbrio dos temas.</div>'}
      ${pilares().length && porPilar.some(x => !x[1]) ? `<div class="sub">Sem post no mês: ${porPilar.filter(x => !x[1]).map(x => esc(x[0].titulo)).join(', ')}.</div>` : ''}
    </section>
    <div class="pend" style="margin-top:12px"><button data-v="producao"><span>Banco de ideias</span><span>${ideias ? `<b>${ideias}</b>` : ''}<span class="seta">›</span></span></button></div>`;
}
const porData = (a, b) => String(a.data_prevista || '9999').localeCompare(String(b.data_prevista || '9999'));
function linha(p) {
  const { esc } = X, pl = est(p.pilar_id);
  const det = [FMT[p.formato][0], diaPost(p) ? dm(diaPost(p)) + (p.hora ? ' ' + p.hora : '') : 'sem data', pl ? pl.titulo : '', primeiro(nomeT(p.responsavel_id))].filter(Boolean).join(' · ');
  const tag = precisaTikTok(p) ? '<span class="tag alerta">TikTok</span>' : `<span class="tag ${atrasado(p) ? 'alerta' : ST_TAG[p.status]}">${atrasado(p) ? 'Atrasado' : ST[p.status]}</span>`;
  return `<button class="mk-lin" data-p="${p.id}"><i style="background:${corP(p)}"></i><span class="t">${esc(p.titulo)}<small>${esc(det)}</small></span>${tag}</button>`;
}
function links(p) {
  const L = [[p.link_arquivo, 'Ver a arte'], [p.link_post, 'Ver no Instagram']].filter(x => x[0]);
  return L.length ? `<div class="mk-links">${L.map(([u, t]) => `<a href="${X.esc(u)}" target="_blank" rel="noopener">${t} ›</a>`).join('')}</div>` : '';
}
function cardAprovar(p) {
  const { esc } = X, pl = est(p.pilar_id);
  return `<div class="mk-aprov">
    <div style="display:flex;justify-content:space-between;gap:8px"><span class="tag" style="margin:0;border-color:${corP(p)};color:${corP(p)}">${FMT[p.formato][0]}</span><span class="sub" style="margin:0">${p.data_prevista ? dm(p.data_prevista) + (p.hora ? ' às ' + esc(p.hora) : '') : 'sem data'}</span></div>
    <button data-p="${p.id}" style="background:none;border:0;text-align:left;padding:0;cursor:pointer;margin-top:8px;display:block"><div class="nome">${esc(p.titulo)}</div></button>
    <div class="sub">${[pl ? pl.titulo : '', est(p.campanha_id) ? est(p.campanha_id).titulo : '', p.responsavel_id ? 'por ' + primeiro(nomeT(p.responsavel_id)) : ''].filter(Boolean).map(esc).join(' · ')}</div>
    ${p.legenda ? `<div class="leg">${esc(p.legenda)}</div>` : ''}
    ${links(p) || '<div class="sub">Sem link da arte.</div>'}
    ${AJ === p.id ? `<label class="fl"><span>O que precisa ajustar</span><textarea id="mkAjTxt" rows="3"></textarea></label><div class="mk-btns"><button class="sec" data-ajc>Cancelar</button><button class="zap" data-ajok="${p.id}">Devolver com ajuste</button></div>`
      : `<div class="mk-btns"><button class="sec" data-aj="${p.id}">Pedir ajuste</button><button class="zap" data-aprovar="${p.id}">Aprovar</button></div>`}
  </div>`;
}

/* ---------- administradores: calendário ---------- */
function vCalendario() {
  const { esc } = X, k = MES, [y, mm] = k.split('-').map(Number);
  const prim = new Date(y, mm - 1, 1).getDay(), dias = new Date(y, mm, 0).getDate();
  const doMes = LISTA.filter(p => p.status !== 'ideia' && mesK(diaPost(p)) === k);
  if (!DIA || mesK(DIA) !== k) DIA = mesK(hoje()) === k ? hoje() : null;
  let cel = SEMANA.map(d => `<div class="h">${d.slice(0, 1)}</div>`).join('');
  for (let i = 0; i < prim; i++) cel += '<button class="fora" tabindex="-1"></button>';
  for (let d = 1; d <= dias; d++) {
    const iso = `${k}-${String(d).padStart(2, '0')}`, L = doMes.filter(p => diaPost(p) === iso);
    cel += `<button data-dia="${iso}" class="${iso === hoje() ? 'hj' : ''} ${iso === DIA ? 'sel' : ''}">${d}<span class="mk-dots">${L.slice(0, 6).map(p => `<i style="background:${p.status === 'publicado' ? corP(p) : 'transparent'};border:1.5px solid ${corP(p)}"></i>`).join('')}</span></button>`;
  }
  const doDia = DIA ? doMes.filter(p => diaPost(p) === DIA) : [];
  const semData = LISTA.filter(p => !['ideia', 'publicado'].includes(p.status) && !p.data_prevista);
  return `
    <div class="mesnav" id="mkMes" style="margin-top:12px"><button data-n="-1" aria-label="Mês anterior">‹</button><span>${mesNome(k)}</span><button data-n="1" aria-label="Próximo mês">›</button></div>
    <div class="mk-cal">${cel}</div>
    <div class="sub">Bolinha cheia: publicado. Contorno: programado. Cores por formato: ${Object.values(FMT).map(([n, c]) => `<span style="color:${c};font-weight:600">${n}</span>`).join(', ')}.</div>
    ${DIA ? `<div class="secao">${new Date(DIA + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} <button data-novo-dia="${DIA}">+ Post neste dia</button></div>${doDia.length ? `<div class="mk-lista">${doDia.sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || ''))).map(linha).join('')}</div>` : '<div class="vazio">Nenhum post neste dia.</div>'}` : ''}
    <div class="secao">Mês inteiro · ${doMes.length}</div>
    ${doMes.length ? `<div class="mk-lista">${doMes.sort((a, b) => String(diaPost(a)).localeCompare(String(diaPost(b)))).map(linha).join('')}</div>` : '<div class="vazio">Nada programado neste mês.</div>'}
    ${semData.length ? `<div class="secao">Sem data definida</div><div class="mk-lista">${semData.map(linha).join('')}</div>` : ''}`;
}

/* ---------- produção (kanban) ---------- */
function vProducao() {
  const { esc } = X;
  const cols = X.ADMIN ? ['ideia', 'producao', 'aprovacao', 'agendado', 'publicado'] : ['producao', 'aprovacao', 'agendado', 'publicado'];
  const limite = maisDias(hoje(), -21);
  const col = (s) => LISTA.filter(p => p.status === s && (s !== 'publicado' || (p.publicado_em || '') >= limite || precisaTikTok(p))).sort(s === 'publicado' ? (a, b) => String(b.publicado_em).localeCompare(String(a.publicado_em)) : porData);
  const nome = { ideia: 'Ideias', producao: 'Em produção', aprovacao: exigir() ? 'Aprovação' : 'Revisão', agendado: 'Aprovado e agendado', publicado: 'Publicado' };
  return `
    <div style="display:flex;gap:8px;margin-top:12px"><button class="zap grande" data-novo="producao">+ Novo post</button></div>
    <div class="secao" style="margin-top:16px">Produção</div>
    <div class="kdica">Arraste para o lado para ver as etapas. Toque no post para abrir.</div>
    <div class="kanban" style="margin-top:8px">${cols.map(s => { const L = col(s); return `<div class="kcol"><h3>${nome[s]} <small>${L.length}</small></h3>${L.map(p => kcard(p)).join('') || '<div class="vazio" style="padding:6px 2px">Nada aqui.</div>'}</div>`; }).join('')}</div>
    <div class="sub">Publicados aparecem por 21 dias.</div>`;
}
function kcard(p) {
  const { esc } = X, pl = est(p.pilar_id), a = acao(p);
  return `<div class="mk-vcard" style="--c:${corP(p)};margin-top:0;margin-bottom:8px"><button data-p="${p.id}"><span class="pill">${FMT[p.formato][0]}</span>${atrasado(p) ? '<span class="st" style="color:var(--alerta)">atrasado</span>' : ''}${p.ajuste && p.status === 'producao' ? '<span class="st" style="color:var(--alerta)">ajuste pedido</span>' : ''}
    <b style="font-size:18px">${esc(p.titulo)}</b><small>${[diaPost(p) ? dm(diaPost(p)) + (p.hora ? ' ' + p.hora : '') : 'sem data', pl ? pl.titulo : '', primeiro(nomeT(p.responsavel_id))].filter(Boolean).map(esc).join(' · ')}</small></button>
    ${a ? `<div class="ac">${a}</div>` : ''}</div>`;
}
// botão de próxima etapa de cada post
function acao(p) {
  if (p.status === 'ideia') return `<button data-mudar="${p.id}" data-st="producao">Produzir</button>`;
  if (p.status === 'producao') return exigir() && !X.ADMIN ? `<button data-mudar="${p.id}" data-st="aprovacao">Enviar para aprovação</button>` : `<button data-mudar="${p.id}" data-st="agendado">${X.ADMIN ? 'Aprovar e agendar' : 'Marcar agendado'}</button>`;
  if (p.status === 'aprovacao') return X.ADMIN || !exigir() ? `<button data-aprovar="${p.id}">Aprovar</button>` : '<span>Aguardando aprovação</span>';
  if (p.status === 'agendado') return `<button data-publicar="${p.id}">Marcar publicado</button>`;
  if (precisaTikTok(p)) return `<button data-tt="${p.id}">Repostado no TikTok</button>`;
  return '';
}

/* ---------- equipe de marketing: semana ---------- */
function anel(v, total, cor) {
  const r = 27, c = 2 * Math.PI * r, f = total ? Math.min(1, v / total) : 0;
  return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="rgba(249,246,241,.15)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${cor}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c * f} ${c}"/></svg>`;
}
function vSemana() {
  const { esc } = X, h = hoje(), k = mesK(h), m = meta(k), pub = pubNoMes(k), reels = pub.filter(p => p.formato === 'reels');
  const dias = [...Array(7)].map((_, i) => maisDias(h, i));
  const ativos = LISTA.filter(p => !['ideia'].includes(p.status));
  const naSemana = (d) => ativos.filter(p => diaPost(p) === d);
  const hora = new Date().getHours();
  const ajustes = LISTA.filter(p => p.status === 'producao' && p.ajuste);
  const atras = LISTA.filter(atrasado);
  const tt = LISTA.filter(precisaTikTok);
  const mostrar = DIA && dias.includes(DIA) ? [DIA] : dias;
  return `
    <div class="mk-hero">
      <div class="s">Estúdio de conteúdo</div>
      <div class="ola">${hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'}${X.eu ? ', <em>' + esc(X.eu) + '</em>' : ''}.</div>
      <div class="mk-aneis">
        <div class="mk-anel">${anel(pub.length, m.posts, '#c9a96e')}<div><div class="n">${pub.length}${m.posts ? '/' + m.posts : ''}</div><small>posts no mês</small></div></div>
        <div class="mk-anel">${anel(reels.length, m.reels, '#f2ece1')}<div><div class="n">${reels.length}${m.reels ? '/' + m.reels : ''}</div><small>reels no mês</small></div></div>
      </div>
      <div class="mk-semana">${dias.map(d => { const L = naSemana(d), dd = new Date(d + 'T12:00:00'); return `<button data-sdia="${d}" class="${d === h ? 'hj' : ''} ${d === DIA ? 'sel' : ''}"><span class="d">${SEMANA[dd.getDay()]}</span><span class="n">${dd.getDate()}</span><span class="mk-dots">${L.slice(0, 4).map(p => `<i style="background:${corP(p)}"></i>`).join('')}</span></button>`; }).join('')}</div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px"><button class="zap" data-novo="producao" style="flex:1">+ Novo post</button><button class="sec" data-novo="ideia" style="flex:1">+ Ideia</button></div>
    ${ajustes.length ? `<div class="mk-dia" style="color:var(--alerta)">Ajustes pedidos</div>${ajustes.map(vcard).join('')}` : ''}
    ${atras.length ? `<div class="mk-dia" style="color:var(--alerta)">Atrasados</div>${atras.map(vcard).join('')}` : ''}
    ${(c => c || `<div class="mk-dia">${DIA ? (DIA === h ? 'Hoje' : SEMANA[new Date(DIA + 'T12:00:00').getDay()] + ' ' + dm(DIA)) : 'Próximos 7 dias'}</div><div class="vazio" style="padding:6px 0">Nada programado.</div>`)(mostrar.map(d => { const L = naSemana(d).sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || ''))); const dd = new Date(d + 'T12:00:00'); return L.length ? `<div class="mk-dia">${d === h ? 'Hoje' : d === maisDias(h, 1) ? 'Amanhã' : SEMANA[dd.getDay()] + ' ' + dm(d)}</div>${L.map(vcard).join('')}` : ''; }).join(''))}
    ${DIA && dias.includes(DIA) ? '<button class="sec" data-sdia="" style="width:100%;margin-top:12px">Ver a semana inteira</button>' : ''}
    ${tt.length ? `<div class="mk-dia">Repostar no TikTok</div>${tt.map(vcard).join('')}` : ''}`;
}
function vcard(p) {
  const { esc } = X, pl = est(p.pilar_id), a = acao(p);
  return `<div class="mk-vcard" style="--c:${corP(p)}"><button data-p="${p.id}"><span class="pill">${FMT[p.formato][0]}</span><span class="st">${ST[p.status]}</span>
    <b>${esc(p.titulo)}</b><small>${[p.hora ? 'às ' + p.hora : '', pl ? pl.titulo : '', est(p.campanha_id) ? est(p.campanha_id).titulo : '', primeiro(nomeT(p.responsavel_id))].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</small>
    ${p.ajuste && p.status === 'producao' ? `<div class="mk-ajuste">${esc(p.ajuste)}</div>` : ''}</button>
    ${a ? `<div class="ac">${a}</div>` : ''}</div>`;
}

/* ---------- equipe de marketing: ideias ---------- */
function vIdeias() {
  const { esc } = X, L = LISTA.filter(p => p.status === 'ideia').sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
  return `
    <div class="sub" style="margin-top:12px">Anote a ideia na hora. Quando for produzir, toque em Produzir e ela vai para a produção.</div>
    <div class="mk-fmts" id="mkIdFmt" style="margin-top:10px">${Object.entries(FMT).map(([k, [n, c]]) => `<label style="--c:${c}"><input type="radio" name="idfmt" value="${k}" ${ID_FMT === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
    <div class="mk-rapida"><input id="mkIdTxt" placeholder="Nova ideia de post" maxlength="160"><button class="zap" id="mkIdOk" style="flex:0 0 auto;min-width:0">Salvar</button></div>
    ${L.length ? `<div class="mk-ideias">${L.map((p, i) => `<div style="display:flex;flex-direction:column"><button class="mk-ideia" data-p="${p.id}" style="--r:${[-1, .8, -.5, 1.2][i % 4]}deg;--c:${corP(p)}"><b>${esc(p.titulo)}</b><small>${FMT[p.formato][0]}${est(p.pilar_id) ? ' · ' + esc(est(p.pilar_id).titulo) : ''}</small></button><button class="sec" data-mudar="${p.id}" data-st="producao" style="margin-top:6px;padding:8px">Produzir</button></div>`).join('')}</div>` : '<div class="vazio" style="margin-top:10px">Nenhuma ideia guardada ainda.</div>'}`;
}

/* ---------- estratégia ---------- */
function vEstrategia() {
  const { esc } = X, k = MES, m = meta(k), pub = pubNoMes(k), reels = pub.filter(p => p.formato === 'reels');
  const camp = campanhas().sort((a, b) => String(b.inicio || '').localeCompare(String(a.inicio || '')));
  const ativa = (c) => c.ativo && (!c.fim || c.fim >= hoje());
  return `
    ${X.ADMIN ? `<section class="bloco"><h2>Aprovação</h2><label class="fc"><input type="checkbox" id="mkExigir" ${exigir() ? 'checked' : ''}><span>Todo post passa pela aprovação da Isadora ou do Matheus antes de ser agendado ou publicado</span></label></section>` : ''}
    <div class="secao">Metas do mês</div>
    <div class="mesnav" id="mkMes"><button data-n="-1" aria-label="Mês anterior">‹</button><span>${mesNome(k)}</span><button data-n="1" aria-label="Próximo mês">›</button></div>
    <div class="numeros" style="margin-top:8px">
      <div class="num destaque"><div class="l">Posts publicados</div><div class="v">${pub.length}${m.posts ? ' / ' + m.posts : ''}</div><div class="d">${m.posts ? Math.round(pub.length / m.posts * 100) + '% da meta' : 'sem meta'}</div></div>
      <div class="num destaque"><div class="l">Reels publicados</div><div class="v">${reels.length}${m.reels ? ' / ' + m.reels : ''}</div><div class="d">${m.reels ? Math.round(reels.length / m.reels * 100) + '% da meta' : 'sem meta'}</div></div>
    </div>
    ${X.ADMIN ? `<form class="bloco form" id="mkMeta"><div class="duas-col">${X.campo('posts', 'Meta de posts no mês', m.posts ?? '', 'number', 'min="0"')}${X.campo('reels', 'Meta de reels no mês', m.reels ?? '', 'number', 'min="0"')}</div><button class="sec" type="submit" style="width:100%;margin-top:10px">Salvar metas de ${mesNome(k).split(' ')[0].toLowerCase()}</button><div class="sub">O realizado conta sozinho pelos posts marcados como publicados. Os reels também contam nos posts.</div></form>` : `<div class="sub">Metas definidas pela Isadora e pelo Matheus. O realizado conta sozinho pelos posts publicados.</div>`}
    <div class="secao">Pilares de conteúdo <button data-novo-est="pilar">+ Pilar</button></div>
    ${pilares().length ? `<div class="mk-pilares">${pilares().map(pl => { const n = LISTA.filter(p => p.pilar_id === pl.id && p.status === 'publicado' && mesK(p.publicado_em) === k).length; return `<button class="mk-pilar" data-est="${pl.id}" style="--c:${pl.cor || CORES[0]}"><b>${esc(pl.titulo)}</b><small>${n} publicado${n === 1 ? '' : 's'} no mês${pl.descricao ? ' · ' + esc(pl.descricao.slice(0, 40)) + (pl.descricao.length > 40 ? '...' : '') : ''}</small></button>`; }).join('')}</div>` : '<div class="vazio">Os pilares são os temas fixos da Maktub. Cada post fica ligado a um, e o painel mostra se algum tema está sendo esquecido.</div>'}
    <div class="secao">Campanhas <button data-novo-est="campanha">+ Campanha</button></div>
    ${camp.length ? `<div class="mk-lista">${camp.map(c => { const n = LISTA.filter(p => p.campanha_id === c.id).length; return `<button class="mk-lin" data-est="${c.id}"><i style="background:${ativa(c) ? 'var(--dourado)' : 'var(--tinta-3)'}"></i><span class="t">${esc(c.titulo)}<small>${[c.inicio ? dm(c.inicio) + (c.fim ? ' a ' + dm(c.fim) : '') : '', n + ' post' + (n === 1 ? '' : 's')].filter(Boolean).join(' · ')}</small></span><span class="tag ${ativa(c) ? 'ouro' : ''}">${ativa(c) ? 'Ativa' : 'Encerrada'}</span></button>`; }).join('')}</div>` : '<div class="vazio">Quando houver uma ação específica (lançamento, temporada, promoção da Gestão de Milhas), crie a campanha e ligue os posts a ela.</div>'}
    <div class="secao">Documento da marca</div>
    ${DOCS.map(([ch, t, d]) => { const x = EST.find(e => e.chave === ch); return `<div class="mk-doc"><h3>${t}<button data-doc="${ch}">${x && x.descricao ? 'Editar' : 'Escrever'} ›</button></h3>${x && x.descricao ? `<p>${esc(x.descricao)}</p>` : `<p class="v">${d}</p>`}</div>`; }).join('')}`;
}

/* ---------- formulário do post ---------- */
function formPost(P) {
  const { esc, campo } = X, nova = ED === 'nova';
  const base = nova ? { titulo: '', formato: 'reels', status: 'producao', responsavel_id: X.ADMIN ? null : X.meuId } : LISTA.find(x => x.id === ED);
  if (!base) { ED = null; return tela(P, X); }
  const p = { ...base, ...(PRE || {}) };
  const pode = (s) => X.ADMIN || !exigir() || ['ideia', 'producao', 'aprovacao'].includes(s) || base.aprovado_em || base.status === s;
  const marketing = TIME.filter(t => t.user_id);
  P.innerHTML = `<button class="voltar" id="mkVoltarF">‹ Marketing</button><h1 class="titulo" style="margin-top:6px">${nova ? (p.status === 'ideia' ? 'Nova <em>ideia</em>' : 'Novo <em>post</em>') : 'Editar <em>post</em>'}</h1>
    ${!nova && base.ajuste && base.status === 'producao' ? `<div class="mk-ajuste"><b>Ajuste pedido:</b> ${esc(base.ajuste)}</div>` : ''}
    ${!nova && base.aprovado_em ? `<div class="sub">Aprovado por ${esc(primeiro(nomeT(base.aprovado_por)) || 'administrador')} em ${new Date(base.aprovado_em).toLocaleDateString('pt-BR')}.</div>` : ''}
    <form class="bloco form" id="mkF">
      ${campo('titulo', 'Título ou tema do post', p.titulo, 'text', 'required maxlength="160"')}
      <div class="fl"><span>Formato</span><div class="mk-fmts">${Object.entries(FMT).map(([k, [n, c]]) => `<label style="--c:${c}"><input type="radio" name="formato" value="${k}" ${p.formato === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></div>
      <label class="fl"><span>Etapa</span><select name="status">${Object.entries(ST).map(([k, n]) => `<option value="${k}" ${p.status === k ? 'selected' : ''} ${pode(k) ? '' : 'disabled'}>${k === 'agendado' ? 'Aprovado e agendado' : n}${pode(k) ? '' : ' (precisa de aprovação)'}</option>`).join('')}</select></label>
      <div class="duas-col">${campo('data_prevista', 'Data de publicação', p.data_prevista, 'date')}${campo('hora', 'Horário', p.hora, 'time')}</div>
      <div class="duas-col">
        <label class="fl"><span>Pilar</span><select name="pilar_id"><option value="">Nenhum</option>${pilares().map(pl => `<option value="${pl.id}" ${p.pilar_id === pl.id ? 'selected' : ''}>${esc(pl.titulo)}</option>`).join('')}</select></label>
        <label class="fl"><span>Campanha</span><select name="campanha_id"><option value="">Nenhuma</option>${campanhas().filter(c => c.ativo || c.id === p.campanha_id).map(c => `<option value="${c.id}" ${p.campanha_id === c.id ? 'selected' : ''}>${esc(c.titulo)}</option>`).join('')}</select></label>
      </div>
      <label class="fl"><span>Responsável</span><select name="responsavel_id"><option value="">Ninguém definido</option>${marketing.map(t => `<option value="${t.user_id}" ${p.responsavel_id === t.user_id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></label>
      <label class="fl"><span>Legenda</span><textarea name="legenda" rows="5">${esc(p.legenda || '')}</textarea></label>
      ${campo('link_arquivo', 'Link da arte ou do vídeo (Canva ou Drive)', p.link_arquivo, 'url', 'placeholder="https://"')}
      <div id="mkPub">${campo('link_post', 'Link do post no Instagram', p.link_post, 'url', 'placeholder="https://www.instagram.com/..."')}
        ${campo('publicado_em', 'Publicado em', p.publicado_em || (p.status === 'publicado' ? hoje() : ''), 'date')}</div>
      <label class="fl"><span>Observações internas</span><textarea name="obs" rows="2">${esc(p.obs || '')}</textarea></label>
      <button class="zap grande" type="submit" id="mkSalvar" style="margin-top:16px;width:100%">${nova ? 'Salvar' : 'Salvar alterações'}</button>
      ${!nova ? '<button class="sec grande" type="button" id="mkExcluir" style="margin-top:10px;width:100%">Excluir post</button>' : ''}
      <div class="sub" id="mkMsg"></div>
    </form>`;
  const f = document.getElementById('mkF'), el = f.elements;
  const mostrar = () => {
    const st = el.status.value, fmt = f.querySelector('[name=formato]:checked').value;
    document.getElementById('mkPub').hidden = st !== 'publicado';
    if (st === 'publicado' && !el.publicado_em.value) el.publicado_em.value = hoje();
  };
  mostrar(); f.addEventListener('change', mostrar);
  document.getElementById('mkVoltarF').onclick = () => { ED = null; PRE = null; rerender(); scrollTo(0, 0); };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = (n) => (el[n].value || '').trim() || null;
    const reg = { titulo: v('titulo'), formato: f.querySelector('[name=formato]:checked').value, status: el.status.value, data_prevista: v('data_prevista'), hora: v('hora'),
      pilar_id: v('pilar_id'), campanha_id: v('campanha_id'), responsavel_id: v('responsavel_id'), legenda: v('legenda'), link_arquivo: v('link_arquivo'),
      link_post: v('link_post'), publicado_em: el.status.value === 'publicado' ? v('publicado_em') : null, obs: v('obs') };
    if (!reg.titulo) { msg('Escreva o título do post.'); return; }
    if (reg.status === 'aprovacao' && base.status !== 'aprovacao') reg.ajuste = null;
    const r = await salvar(nova ? null : base.id, reg);
    if (!r) return;
    ED = null; PRE = null; X.aviso(nova ? (reg.status === 'ideia' ? 'Ideia guardada.' : 'Post criado.') : 'Post atualizado.'); rerender(); scrollTo(0, 0);
  };
  const msg = (t) => { document.getElementById('mkMsg').textContent = t; };
  if (document.getElementById('mkExcluir')) document.getElementById('mkExcluir').onclick = async () => {
    const b = document.getElementById('mkExcluir');
    if (CONF !== base.id) { CONF = base.id; b.textContent = 'Toque de novo para excluir'; return; }
    CONF = null;
    const { error } = await X.sb.from('marketing_posts').delete().eq('id', base.id);
    if (error) { X.aviso('Não excluiu: ' + error.message); return; }
    LISTA = LISTA.filter(x => x.id !== base.id); ED = null; X.aviso('Post excluído.'); rerender();
  };
}
async function salvar(id, reg) {
  const b = document.getElementById('mkSalvar'); if (b) b.disabled = true;
  const r = id ? await X.sb.from('marketing_posts').update(reg).eq('id', id).select().single() : await X.sb.from('marketing_posts').insert(reg).select().single();
  if (b) b.disabled = false;
  if (r.error) { X.aviso(/aprovação/.test(r.error.message) ? r.error.message : 'Não salvou: ' + r.error.message); return null; }
  if (id) LISTA[LISTA.findIndex(x => x.id === id)] = r.data; else LISTA.push(r.data);
  return r.data;
}

/* ---------- formulário de pilar, campanha e documento ---------- */
function formEst(P) {
  const { esc, campo } = X;
  const doc = DOCS.find(d => d[0] === ED_EST.chave);
  const nova = !ED_EST.id;
  const e = nova ? { tipo: ED_EST.tipo, titulo: doc ? doc[1] : '', cor: CORES[pilares().length % CORES.length], ativo: true, chave: ED_EST.chave || null, descricao: '' } : est(ED_EST.id);
  if (!e) { ED_EST = null; return tela(P, X); }
  const rot = { pilar: 'pilar', campanha: 'campanha', documento: 'documento' }[e.tipo];
  P.innerHTML = `<button class="voltar" id="mkVoltarE">‹ Estratégia</button><h1 class="titulo" style="margin-top:6px">${doc ? esc(doc[1]) : (nova ? 'Nov' + (e.tipo === 'pilar' ? 'o' : 'a') + ' <em>' + rot + '</em>' : 'Editar <em>' + rot + '</em>')}</h1>
    <form class="bloco form" id="mkE">
      ${doc ? `<div class="sub" style="margin-top:0">${doc[2]}</div>` : campo('titulo', e.tipo === 'pilar' ? 'Nome do pilar' : 'Nome da campanha', e.titulo, 'text', 'required maxlength="80"')}
      <label class="fl"><span>${doc ? 'Texto' : e.tipo === 'pilar' ? 'O que entra nesse pilar' : 'Objetivo e ideia central'}</span><textarea name="descricao" rows="${doc ? 10 : 4}">${esc(e.descricao || '')}</textarea></label>
      ${e.tipo === 'pilar' ? `<div class="fl"><span>Cor</span><div class="mk-cores">${CORES.map(c => `<label style="--c:${c}"><input type="radio" name="cor" value="${c}" ${e.cor === c ? 'checked' : ''}><span></span></label>`).join('')}</div></div>` : ''}
      ${e.tipo === 'campanha' ? `<div class="duas-col">${campo('inicio', 'Início', e.inicio, 'date')}${campo('fim', 'Fim', e.fim, 'date')}</div><label class="fc"><input type="checkbox" name="ativo" ${e.ativo ? 'checked' : ''}><span>Campanha ativa</span></label>` : ''}
      <button class="zap grande" type="submit" style="margin-top:14px;width:100%">Salvar</button>
      ${!nova && !doc ? '<button class="sec grande" type="button" id="mkExcluirE" style="margin-top:10px;width:100%">Excluir</button><div class="sub">Os posts ligados a ele continuam, só ficam sem ' + (e.tipo === 'pilar' ? 'pilar.' : 'campanha.') + '</div>' : ''}
    </form>`;
  const f = document.getElementById('mkE'), el = f.elements;
  document.getElementById('mkVoltarE').onclick = () => { ED_EST = null; rerender(); scrollTo(0, 0); };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const reg = { tipo: e.tipo, descricao: el.descricao.value.trim() || null };
    if (doc) { reg.titulo = doc[1]; reg.chave = doc[0]; } else { reg.titulo = el.titulo.value.trim(); if (!reg.titulo) return; }
    if (e.tipo === 'pilar') { const c = f.querySelector('[name=cor]:checked'); reg.cor = c ? c.value : CORES[0]; if (nova) reg.ordem = pilares().length; }
    if (e.tipo === 'campanha') { reg.inicio = el.inicio.value || null; reg.fim = el.fim.value || null; reg.ativo = el.ativo.checked; }
    const r = nova ? await X.sb.from('marketing_estrategia').insert(reg).select().single() : await X.sb.from('marketing_estrategia').update(reg).eq('id', e.id).select().single();
    if (r.error) { X.aviso('Não salvou: ' + r.error.message); return; }
    if (nova) EST.push(r.data); else EST[EST.findIndex(x => x.id === e.id)] = r.data;
    ED_EST = null; X.aviso('Salvo.'); rerender(); scrollTo(0, 0);
  };
  if (document.getElementById('mkExcluirE')) document.getElementById('mkExcluirE').onclick = async () => {
    const b = document.getElementById('mkExcluirE');
    if (CONF !== e.id) { CONF = e.id; b.textContent = 'Toque de novo para excluir'; return; }
    CONF = null;
    const { error } = await X.sb.from('marketing_estrategia').delete().eq('id', e.id);
    if (error) { X.aviso('Não excluiu: ' + error.message); return; }
    EST = EST.filter(x => x.id !== e.id);
    LISTA.forEach(p => { if (p.pilar_id === e.id) p.pilar_id = null; if (p.campanha_id === e.id) p.campanha_id = null; });
    ED_EST = null; X.aviso('Excluído.'); rerender();
  };
}

/* ---------- ações ---------- */
async function mudar(id, campos, ok) {
  const { data, error } = await X.sb.from('marketing_posts').update(campos).eq('id', id).select().single();
  if (error) { X.aviso(/aprovação/.test(error.message) ? error.message : 'Não salvou: ' + error.message); return; }
  LISTA[LISTA.findIndex(x => x.id === id)] = data; X.aviso(ok); rerender();
}
async function guardarEst(chave, tipo, valores, titulo) {
  const atual = EST.find(e => e.chave === chave);
  const r = atual ? await X.sb.from('marketing_estrategia').update({ valores }).eq('id', atual.id).select().single()
    : await X.sb.from('marketing_estrategia').insert({ tipo, chave, titulo, valores }).select().single();
  if (r.error) { X.aviso('Não salvou: ' + r.error.message); return false; }
  if (atual) EST[EST.findIndex(e => e.id === atual.id)] = r.data; else EST.push(r.data);
  return true;
}

function ligar(P) {
  const q = (s) => P.querySelectorAll(s), by = (id) => document.getElementById(id);
  if (by('mkVoltar')) by('mkVoltar').onclick = () => X.ir('empresa');
  q('[data-v]').forEach(b => b.onclick = () => { VIEW = b.dataset.v; DIA = null; rerender(); scrollTo(0, 0); });
  q('[data-p]').forEach(b => b.onclick = () => { ED = b.dataset.p; PRE = null; rerender(); scrollTo(0, 0); });
  q('[data-novo]').forEach(b => b.onclick = () => { ED = 'nova'; PRE = { status: b.dataset.novo }; rerender(); scrollTo(0, 0); });
  q('[data-novo-dia]').forEach(b => b.onclick = () => { ED = 'nova'; PRE = { status: 'producao', data_prevista: b.dataset.novoDia }; rerender(); scrollTo(0, 0); });
  q('[data-mudar]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); const st = b.dataset.st; mudar(b.dataset.mudar, { status: st, ...(st === 'aprovacao' ? { ajuste: null } : {}) }, { producao: 'Foi para a produção.', aprovacao: 'Enviado para aprovação. Isadora e Matheus recebem o aviso.', agendado: 'Marcado como agendado.' }[st] || 'Atualizado.'); });
  q('[data-aprovar]').forEach(b => b.onclick = () => mudar(b.dataset.aprovar, { status: 'agendado' }, 'Post aprovado.'));
  q('[data-publicar]').forEach(b => b.onclick = () => { ED = b.dataset.publicar; PRE = { status: 'publicado' }; rerender(); scrollTo(0, 0); X.aviso('Cole o link do post e salve.'); });
  q('[data-tt]').forEach(b => b.onclick = () => mudar(b.dataset.tt, { tiktok_feito: true }, 'Repost no TikTok marcado.'));
  q('[data-aj]').forEach(b => b.onclick = () => { AJ = b.dataset.aj; rerender(); const t = by('mkAjTxt'); if (t) t.focus(); });
  q('[data-ajc]').forEach(b => b.onclick = () => { AJ = null; rerender(); });
  q('[data-ajok]').forEach(b => b.onclick = () => { const t = (by('mkAjTxt').value || '').trim(); if (!t) { X.aviso('Escreva o que precisa ajustar.'); return; } AJ = null; mudar(b.dataset.ajok, { status: 'producao', ajuste: t }, 'Devolvido para a produção com o ajuste.'); });
  q('[data-dia]').forEach(b => b.onclick = () => { DIA = b.dataset.dia; rerender(); });
  q('[data-sdia]').forEach(b => b.onclick = () => { DIA = b.dataset.sdia === DIA || !b.dataset.sdia ? null : b.dataset.sdia; rerender(); });
  q('[data-est]').forEach(b => b.onclick = () => { ED_EST = { id: b.dataset.est }; rerender(); scrollTo(0, 0); });
  q('[data-novo-est]').forEach(b => b.onclick = () => { ED_EST = { tipo: b.dataset.novoEst }; rerender(); scrollTo(0, 0); });
  q('[data-doc]').forEach(b => b.onclick = () => { const x = EST.find(e => e.chave === b.dataset.doc); ED_EST = x ? { id: x.id, chave: x.chave } : { tipo: 'documento', chave: b.dataset.doc }; rerender(); scrollTo(0, 0); });
  if (by('mkMes')) by('mkMes').onclick = (e) => { const b = e.target.closest('button'); if (b) { MES = mesMais(MES, +b.dataset.n); DIA = null; rerender(); } };
  if (by('mkExigir')) by('mkExigir').onchange = async (e) => { const ok = await guardarEst('config', 'config', { ...((cfg() || {}).valores || {}), aprovacao: e.target.checked }, 'Configuração do marketing'); if (ok) X.aviso(e.target.checked ? 'Aprovação obrigatória ligada.' : 'Aprovação obrigatória desligada.'); rerender(); };
  if (by('mkMeta')) by('mkMeta').onsubmit = async (ev) => {
    ev.preventDefault(); const el = ev.target.elements, n = (x) => x.value === '' ? null : Math.max(0, Math.round(+x.value));
    if (await guardarEst('meta-' + MES, 'meta', { posts: n(el.posts), reels: n(el.reels) }, 'Meta ' + MES)) { X.aviso('Metas salvas.'); rerender(); }
  };
  q('[name=idfmt]').forEach(r => r.onchange = () => { ID_FMT = r.value; });
  if (by('mkIdOk')) {
    const salvarIdeia = async () => {
      const t = by('mkIdTxt').value.trim(); if (!t) return;
      by('mkIdOk').disabled = true;
      const { data, error } = await X.sb.from('marketing_posts').insert({ titulo: t, formato: ID_FMT, status: 'ideia', responsavel_id: X.meuId }).select().single();
      by('mkIdOk').disabled = false;
      if (error) { X.aviso('Não salvou: ' + error.message); return; }
      LISTA.push(data); X.aviso('Ideia guardada.'); rerender(); const i = document.getElementById('mkIdTxt'); if (i) i.focus();
    };
    by('mkIdOk').onclick = salvarIdeia;
    by('mkIdTxt').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); salvarIdeia(); } };
  }
}
