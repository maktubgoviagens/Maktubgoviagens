// Maktub Go: fornecedores e indicações.
// Hotéis, transfers, passeios, ingressos, seguros, trens e locadoras com a nota de cada cliente que usou,
// para indicar os melhores aos próximos clientes de cada destino.

export const TIPOS = { hotel: 'Hotel', transfer: 'Transfer', passeio: 'Passeio', ingresso: 'Ingresso', seguro: 'Seguro viagem', locadora: 'Aluguel de carro', trem: 'Trem', restaurante: 'Restaurante', outro: 'Outro' };
let LISTA = null, AVS = null, JUNTAR = null, VISTA = 'lista', FID = null, TIPO = 'todos', BUSCA = '', PRE = null, PULADOS = new Set();

const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const media = (L) => { const n = L.filter(a => a.nota); return n.length ? n.reduce((s, a) => s + a.nota, 0) / n.length : null; };
const periodo = (a) => a.data_uso ? new Date(a.data_uso + 'T12:00:00').toLocaleDateString('pt-BR') + (a.data_fim && a.data_fim !== a.data_uso ? ' a ' + new Date(a.data_fim + 'T12:00:00').toLocaleDateString('pt-BR') : '') : '';
const fmt1 = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const estrelas = (n) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));

export function abrir(id) { FID = id; VISTA = id ? 'ficha' : 'lista'; }
export function avaliar(pre) { PRE = pre || null; VISTA = 'avaliar'; FID = (pre && pre.fornecedor_id) || null; }
export function rota(h) { if (h[1] === 'novo') { VISTA = 'novo'; FID = null; } else if (h[1]) { VISTA = 'ficha'; FID = h[1]; } else { VISTA = 'lista'; FID = null; } }
export function doCliente(pid) { return (AVS || []).filter(a => a.pessoa_id === pid); }
export async function carregar(sb) {
  const [f, a] = await Promise.all([sb.from('fornecedores').select('*').order('nome').limit(5000), sb.from('fornecedor_avaliacoes').select('*').order('created_at', { ascending: false }).limit(20000)]);
  if (f.error) { LISTA = false; return; }
  LISTA = f.data || []; AVS = a.data || [];
}
export function lista() { return LISTA || []; }
export function avaliacoes() { return AVS || []; }

export async function tela(P, X) {
  const { $ } = X;
  if (LISTA === null) { P.innerHTML = '<h1 class="titulo">Fornecedores</h1><div class="vazio">Carregando...</div>'; await carregar(X.sb); if (X.aba() !== 'fornecedores') return; }
  if (LISTA === false) { P.innerHTML = `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">Fornecedores</h1><div class="config" style="margin-top:12px">${X.admin ? 'Fornecedores ainda não ativados no Supabase. Rode o <b>38-fornecedores.sql</b>.' : 'Recurso ainda não ativado. Fale com o administrador.'}</div>`; $('voltar').onclick = () => X.ir('empresa'); return; }
  if (VISTA === 'novo' || VISTA === 'editar') return form(P, X);
  if (VISTA === 'avaliar') return formAvaliar(P, X);
  if (VISTA === 'lote') return loteGoogle(P, X);
  if (VISTA === 'duplicados') return telaDuplicados(P, X);
  if (VISTA === 'juntar') return telaJuntar(P, X);
  if (VISTA === 'ficha' && FID) return ficha(P, X);
  return telaLista(P, X);
}
function ir(X, v, id) { VISTA = v; FID = id || null; history.pushState(null, '', v === 'lista' ? '#fornecedores' : v === 'novo' ? '#fornecedores/novo' : '#fornecedores/' + (id || '')); tela(X.$('pagina'), X); scrollTo(0, 0); }

function telaLista(P, X) {
  const { $, esc } = X;
  const q = norm(BUSCA);
  const L = LISTA.filter(f => TIPO === 'todos' || f.tipo === TIPO)
    .filter(f => !q || norm(f.nome).includes(q) || norm(f.cidade).includes(q) || norm(f.pais).includes(q))
    .map(f => { const av = AVS.filter(a => a.fornecedor_id === f.id); return { f, av, m: media(av), ind: av.filter(a => a.indicaria === true).length, nInd: av.filter(a => a.indicaria !== null && a.indicaria !== undefined).length }; })
    .sort((a, b) => (b.m || 0) - (a.m || 0) || b.av.length - a.av.length || a.f.nome.localeCompare(b.f.nome, 'pt-BR'));
  P.innerHTML = `
    <button class="voltar" id="voltar">‹ Empresa</button>
    <h1 class="titulo" style="margin-top:6px">Fornecedores e <em>indicações</em></h1>
    <div class="sub">${LISTA.length} fornecedores · ${AVS.filter(a => a.nota).length} avaliações · ${AVS.filter(a => !a.nota).length} usos esperando nota</div>
    <div class="botoes4" style="margin-top:12px"><button class="zap" id="novoF">+ Fornecedor</button><button class="sec" id="avaliarF">Registrar avaliação</button></div>
    ${LISTA.filter(f => !f.google_place_id).length ? `<button class="sec grande" id="loteG" style="margin-top:8px;width:100%">Ligar ao Google (${LISTA.filter(f => !f.google_place_id).length} sem vínculo) ›</button>` : ''}
    ${X.admin && duplicados().length ? `<button class="sec grande" id="dupG" style="margin-top:8px;width:100%">${duplicados().length} ${duplicados().length === 1 ? 'possível duplicado' : 'possíveis duplicados'} para juntar ›</button>` : ''}
    <input class="busca" id="buscaF" type="search" placeholder="Buscar por cidade, país ou nome" value="${esc(BUSCA)}">
    <div class="chips" id="tipoF" style="margin-top:10px">${[['todos', 'Todos'], ...Object.entries(TIPOS)].map(([k, l]) => `<button data-t="${k}" class="${k === TIPO ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="lista">${L.length ? L.map(({ f, av, m, ind, nInd }) => `<button class="cli" data-f="${f.id}"><div><div class="nome">${esc(f.nome)}</div>
      <div class="meta">${TIPOS[f.tipo] || f.tipo}${f.cidade ? ' · ' + esc(f.cidade) : ''}${f.pais ? ', ' + esc(f.pais) : ''}${nInd ? ` · ${Math.round(ind / nInd * 100)}% indicariam` : ''}${f.google_nota ? ` · Google ${fmt1(+f.google_nota)}` : ''}${STATUS[f.google_status] ? ' · ' + STATUS[f.google_status] : ''}</div></div>
      <div class="val">${m !== null ? `<b>${fmt1(m)}</b><span>${av.filter(a => a.nota).length} ${av.filter(a => a.nota).length === 1 ? 'nota' : 'notas'}</span>` : `<span>${av.length ? av.length + (av.length === 1 ? ' uso' : ' usos') + ', sem nota' : 'sem avaliação'}</span>`}</div></button>`).join('')
      : `<div class="vazio">${BUSCA || TIPO !== 'todos' ? 'Nada encontrado com esse filtro.' : 'Nenhum fornecedor ainda. Cadastre o primeiro hotel ou registre a avaliação de um cliente.'}</div>`}</div>
    <div class="sub">Ordenado pela nota média dos clientes. Busque pela cidade para ver as melhores opções de um destino.</div>`;
  $('voltar').onclick = () => X.ir('empresa');
  $('novoF').onclick = () => ir(X, 'novo');
  if ($('dupG')) $('dupG').onclick = () => { VISTA = 'duplicados'; tela(P, X); scrollTo(0, 0); };
  if ($('loteG')) $('loteG').onclick = () => { PULADOS = new Set(); VISTA = 'lote'; tela(P, X); scrollTo(0, 0); };
  $('avaliarF').onclick = () => { PRE = null; ir(X, 'avaliar'); };
  $('buscaF').oninput = (e) => { BUSCA = e.target.value; const pos = e.target.selectionStart; telaLista(P, X); $('buscaF').focus(); $('buscaF').setSelectionRange(pos, pos); };
  $('tipoF').onclick = (e) => { const b = e.target.closest('button'); if (b) { TIPO = b.dataset.t; telaLista(P, X); } };
  P.querySelectorAll('[data-f]').forEach(b => b.onclick = () => ir(X, 'ficha', b.dataset.f));
}

function ficha(P, X) {
  const { $, esc, D } = X;
  const f = LISTA.find(x => x.id === FID);
  if (!f) return ir(X, 'lista');
  const av = AVS.filter(a => a.fornecedor_id === f.id), m = media(av);
  const ind = av.filter(a => a.indicaria === true).length, nInd = av.filter(a => a.indicaria !== null && a.indicaria !== undefined).length;
  const nomeP = (id) => ((D.pessoas || []).find(p => p.id === id) || {}).nome;
  P.innerHTML = `
    <button class="voltar" id="voltar">‹ Fornecedores</button>
    <h1 class="titulo" style="margin-top:6px">${esc(f.nome)}</h1>
    <div class="sub">${TIPOS[f.tipo] || f.tipo}${f.cidade ? ' · ' + esc(f.cidade) : ''}${f.pais ? ', ' + esc(f.pais) : ''}</div>
    <div class="numeros" style="margin-top:12px">
      <div class="num destaque"><div class="l">Nota dos clientes</div><div class="v">${m !== null ? fmt1(m) : '-'}</div><div class="d">${m !== null ? estrelas(m) + ' · ' : ''}${av.filter(a => a.nota).length} de ${av.length} ${av.length === 1 ? 'uso' : 'usos'} avaliados</div></div>
      <div class="num"><div class="l">Indicariam</div><div class="v">${nInd ? Math.round(ind / nInd * 100) + '%' : '-'}</div><div class="d">${nInd ? `${ind} de ${nInd}` : 'sem resposta'}</div></div>
    </div>
    <div class="botoes4" style="margin-top:12px"><button class="zap" id="avaliarEste">Registrar avaliação</button><button class="sec" id="editarF">Editar</button></div>
    <section class="bloco"><h2>Ficha Maktub</h2>${blocoMaktub(f, esc, X.admin)}</section>
    <section class="bloco" id="blGoogle"><h2>No Google</h2>${blocoGoogle(f, esc)}</section>
    ${f.contato || f.site || f.observacoes ? `<section class="bloco"><h2>Outros dados</h2>
      ${f.contato ? `<div class="lin"><span>Contato</span><span style="white-space:normal;text-align:right">${esc(f.contato)}</span></div>` : ''}
      ${f.site ? `<div class="lin"><span>Site</span><span><a href="${esc(/^https?:\/\//.test(f.site) ? f.site : 'https://' + f.site)}" target="_blank" rel="noopener" style="color:var(--verde)">abrir ›</a></span></div>` : ''}
      ${f.observacoes ? `<div style="white-space:pre-wrap;color:var(--tinta-2);margin-top:8px">${esc(f.observacoes)}</div>` : ''}</section>` : ''}
    <section class="bloco"><h2>Clientes que usaram</h2>
      ${av.length ? av.map(a => `<div style="padding:10px 0;border-top:1px solid var(--linha)"><div style="display:flex;justify-content:space-between;gap:8px"><b style="color:var(--verde);font-weight:600">${a.pessoa_id && nomeP(a.pessoa_id) ? `<button data-pid="${a.pessoa_id}" style="background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer">${esc(nomeP(a.pessoa_id))} ›</button>` : 'Cliente'}</b>${a.nota ? `<span style="color:var(--dourado);white-space:nowrap">${estrelas(a.nota)}</span>` : `<button class="sec" data-avid="${a.id}" style="padding:6px 10px;min-width:0;font-size:11px">Avaliar</button>`}</div>
        <div class="sub" style="margin-top:2px">${periodo(a)}${a.indicaria === true ? ' · indicaria' : a.indicaria === false ? ' · não indicaria' : ''}${!a.nota ? ' · sem nota' : ''}${a.localizador ? ' · loc. ' + esc(a.localizador) : ''}</div>
        ${a.comentario ? `<div style="white-space:pre-wrap;color:var(--tinta-2);margin-top:4px">${esc(a.comentario)}</div>` : ''}</div>`).join('') : '<div class="vazio">Ninguém avaliou ainda.</div>'}
    </section>
    ${X.admin ? '<button class="sec" type="button" id="juntarF" style="margin-top:12px;width:100%">É duplicado? Juntar com outro fornecedor</button>' : ''}`;
  $('voltar').onclick = () => ir(X, 'lista');
  $('editarF').onclick = () => { VISTA = 'editar'; tela(P, X); };
  if ($('juntarF')) $('juntarF').onclick = () => { JUNTAR = null; VISTA = 'juntar'; tela(P, X); scrollTo(0, 0); };
  ligarGoogle(P, X, f);
  // nota com mais de 30 dias: atualiza sozinho
  if (f.google_place_id && (!f.google_em || !f.google_dados || Date.now() - new Date(f.google_em) > 30 * 864e5)) google(X, { acao: 'atualizar', place_id: f.google_place_id, fornecedor_id: f.id }).then(r => { if (r && r.fornecedor && VISTA === 'ficha' && FID === f.id) { Object.assign(f, r.fornecedor); $('blGoogle').innerHTML = '<h2>No Google</h2>' + blocoGoogle(f, esc); ligarGoogle(P, X, f); } });
  $('avaliarEste').onclick = () => { PRE = { fornecedor_id: f.id }; ir(X, 'avaliar', f.id); };
  P.querySelectorAll('[data-pid]').forEach(b => b.onclick = () => X.abrirCliente(b.dataset.pid));
  P.querySelectorAll('[data-avid]').forEach(b => b.onclick = () => { const a = AVS.find(x => x.id === b.dataset.avid); PRE = { ...a }; ir(X, 'avaliar', f.id); });
}

async function google(X, body) {
  const { data, error } = await X.sb.functions.invoke('google-lugar', { body });
  if (data && data.ok) return data;
  let msg = data && data.erro;
  if (!msg && error && error.context && error.context.json) { try { const j = await error.context.json(); msg = j.erro || j.message || j.msg; } catch (e) { /* sem corpo */ } }
  if (!msg && error && error.context && error.context.status) msg = { 401: 'Sessão expirada. Saia e entre de novo no app.', 404: 'A função google-lugar não está publicada no Supabase.', 502: 'A função antiga está no ar. Publique a versão nova da google-lugar.' }[error.context.status] || 'A função respondeu ' + error.context.status;
  return { erro: msg || (error && error.message) || 'sem resposta' };
}
const STATUS = { CLOSED_TEMPORARILY: 'Fechado temporariamente', CLOSED_PERMANENTLY: 'Fechado de vez' };
const FOTOS = new Map();
const linha = (rot, val) => val ? `<div class="lin"><span>${rot}</span><span style="white-space:normal;text-align:right">${val}</span></div>` : '';
const linkBtn = 'background:none;border:0;padding:0;color:var(--verde);text-decoration:underline;font:inherit;cursor:pointer';

function blocoGoogle(f, esc) {
  if (!f.google_place_id) return `<div class="sub" style="margin-top:0">Ainda não ligado ao Google. Busque para trazer nota, fotos, contato, horário e avaliações.</div>
    <div id="resGoogle"></div>`;
  const d = f.google_dados || {};
  const site = f.google_site ? `<a href="${esc(f.google_site)}" target="_blank" rel="noopener" style="color:var(--verde)">abrir ›</a>` : '';
  return `<div id="fotosG" class="fotosG"></div>
    ${STATUS[f.google_status] ? `<div class="config" style="margin:8px 0">${STATUS[f.google_status]} no Google. Não indicar antes de confirmar.</div>` : ''}
    ${f.google_nota ? `<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><b style="font-family:'Cormorant Garamond',serif;font-size:30px;color:var(--verde)">${fmt1(+f.google_nota)}</b><span style="color:var(--dourado)">${estrelas(+f.google_nota)}</span><span class="sub" style="margin:0">${(f.google_avaliacoes || 0).toLocaleString('pt-BR')} avaliações no Google</span></div>` : '<div class="sub" style="margin-top:0">Sem nota no Google.</div>'}
    ${d.resumo ? `<div style="color:var(--tinta-2);margin:8px 0">${esc(d.resumo)}</div>` : ''}
    ${linha('Tipo', esc(d.tipo || ''))}
    ${linha('Faixa de preço', esc(d.preco || ''))}
    ${linha('Endereço', esc(f.google_endereco || ''))}
    ${linha('Telefone', f.google_tel ? `<a href="tel:${esc(f.google_tel.replace(/[^\d+]/g, ''))}" style="color:var(--verde)">${esc(f.google_tel)}</a>` : '')}
    ${linha('Site', site)}
    ${linha('Mapa', f.google_maps ? `<a href="${esc(f.google_maps)}" target="_blank" rel="noopener" style="color:var(--verde)">abrir no Google Maps ›</a>` : '')}
    ${d.facilidades && d.facilidades.length ? `<div class="chips" style="flex-wrap:wrap;margin-top:8px">${d.facilidades.map(x => `<span style="border:1px solid var(--linha);padding:5px 10px;border-radius:20px;font-size:12px;color:var(--tinta-2)">${esc(x)}</span>`).join('')}</div>` : ''}
    ${d.horario && d.horario.length ? `<details style="margin-top:8px"><summary class="sub" style="cursor:pointer">Horário de funcionamento</summary>${d.horario.map(h => `<div class="sub" style="margin:2px 0">${esc(h)}</div>`).join('')}</details>` : ''}
    ${d.avaliacoes && d.avaliacoes.length ? `<details style="margin-top:8px"><summary class="sub" style="cursor:pointer">Avaliações recentes no Google (${d.avaliacoes.length})</summary>${d.avaliacoes.map(r => `<div style="padding:8px 0;border-top:1px solid var(--linha)"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-weight:600;color:var(--verde)">${esc(r.autor || 'Hóspede')}</b><span style="color:var(--dourado);white-space:nowrap">${r.nota ? estrelas(r.nota) : ''}</span></div><div class="sub" style="margin:0">${esc(r.quando || '')}</div>${r.texto ? `<div style="white-space:pre-wrap;color:var(--tinta-2);margin-top:4px">${esc(r.texto)}</div>` : ''}</div>`).join('')}</details>` : ''}
    <div class="sub">Fonte: Google${f.google_em ? ', atualizado em ' + new Date(f.google_em).toLocaleDateString('pt-BR') : ''}. <button type="button" id="trocarGoogle" style="${linkBtn}">Não é este lugar?</button> · <button type="button" id="atualizarGoogle" style="${linkBtn}">Atualizar agora</button></div><div id="resGoogle"></div>`;
}

// painel de busca: nome editável, cidade, e opção de colar o link do Google Maps
function painelBusca(X, el, f, aoLigar, auto) {
  const { esc } = X;
  el.innerHTML = `<div class="duas-col" style="margin-top:8px"><label class="fl"><span>Nome para buscar</span><input id="gNome" value="${esc(f.nome)}"></label><label class="fl"><span>Cidade</span><input id="gCid" value="${esc(f.cidade || '')}" placeholder="Ex.: Belo Horizonte"></label></div>
    <button class="sec" type="button" id="gBuscar" style="margin-top:8px;width:100%">Buscar no Google</button>
    <details style="margin-top:8px"><summary class="sub" style="cursor:pointer">Não achou? Cole o link do Google Maps</summary>
      <label class="fl"><span>Link do lugar (Maps, botão Compartilhar)</span><input id="gLink" inputmode="url" placeholder="https://maps.app.goo.gl/..."></label>
      <button class="sec" type="button" id="gLinkBtn" style="margin-top:6px;width:100%">Usar este link</button></details>
    <div id="gRes" style="margin-top:8px"></div>`;
  const res = el.querySelector('#gRes');
  const mostrar = async (pedido) => {
    res.innerHTML = '<div class="vazio">Buscando no Google...</div>';
    const r = await google(X, pedido);
    if (!res.isConnected) return;
    if (r.erro) { res.innerHTML = `<div class="config">Não deu para buscar: ${esc(r.erro)}</div>`; return; }
    if (!r.lugares.length) { res.innerHTML = '<div class="vazio">O Google não encontrou. Tente outro nome (ex.: "Ibis Belo Horizonte Savassi"), confira a cidade ou cole o link do Maps.</div>'; return; }
    res.innerHTML = `<div class="sub">Toque no lugar certo:</div>${r.lugares.map((l, i) => `<button class="lin" data-gl="${i}" style="width:100%;font-size:14px;text-align:left"><span>${esc(l.nome)}<small style="display:block;color:var(--tinta-3);white-space:normal">${esc(l.endereco || '')}${STATUS[l.status] ? ' · ' + STATUS[l.status] : ''}</small></span><span>${l.nota ? fmt1(l.nota) + ' · ' + (l.avaliacoes || 0).toLocaleString('pt-BR') : 'sem nota'}</span></button>`).join('')}`;
    res.querySelectorAll('[data-gl]').forEach(b => b.onclick = async () => {
      const l = r.lugares[+b.dataset.gl]; res.innerHTML = '<div class="vazio">Salvando a ficha completa...</div>';
      const v = await google(X, { acao: 'vincular', place_id: l.place_id, fornecedor_id: f.id });
      if (v.erro) { res.innerHTML = `<div class="config">Não salvou: ${esc(v.erro)}</div>`; return; }
      Object.assign(f, v.fornecedor); FOTOS.delete(f.google_place_id); aoLigar();
    });
  };
  const pedir = () => { const nome = el.querySelector('#gNome').value.trim(), cid = el.querySelector('#gCid').value.trim(); return { acao: 'buscar', texto: [nome, cid, cid ? '' : f.pais].filter(Boolean).join(' '), nome, tipo: f.tipo }; };
  el.querySelector('#gBuscar').onclick = () => mostrar(pedir());
  el.querySelector('#gLinkBtn').onclick = () => { const l = el.querySelector('#gLink').value.trim(); if (l) mostrar({ acao: 'link', link: l }); };
  if (auto) mostrar(pedir());
}

async function carregarFotos(X, f) {
  const el = X.$('fotosG'); if (!el || !f.google_place_id) return;
  let fotos = FOTOS.get(f.google_place_id);
  if (!fotos) { el.innerHTML = '<div class="sub" style="margin:0 0 8px">Carregando fotos...</div>'; const r = await google(X, { acao: 'fotos', place_id: f.google_place_id, max: 8 }); fotos = r.erro ? [] : r.fotos; if (!r.erro) FOTOS.set(f.google_place_id, fotos); }
  if (!X.$('fotosG')) return;
  el.innerHTML = fotos.length ? fotos.map(ft => `<figure><a href="${X.esc(ft.url)}" target="_blank" rel="noopener"><img src="${X.esc(ft.url)}" loading="lazy" alt=""></a><figcaption>${ft.autor ? `Foto: ${ft.autor_link ? `<a href="${X.esc(ft.autor_link)}" target="_blank" rel="noopener">${X.esc(ft.autor)}</a>` : X.esc(ft.autor)}` : 'Google'}</figcaption></figure>`).join('') : '';
}

function ligarGoogle(P, X, f) {
  const { $ } = X;
  const recarregar = () => { if (VISTA === 'ficha' && FID === f.id) { $('blGoogle').innerHTML = '<h2>No Google</h2>' + blocoGoogle(f, X.esc); ligarGoogle(P, X, f); } };
  if (!f.google_place_id) { painelBusca(X, $('resGoogle'), f, () => { X.aviso('Ligado ao Google.'); tela(P, X); }, false); return; }
  carregarFotos(X, f);
  if ($('trocarGoogle')) $('trocarGoogle').onclick = () => painelBusca(X, $('resGoogle'), f, () => { X.aviso('Ligado ao Google.'); tela(P, X); }, true);
  if ($('atualizarGoogle')) $('atualizarGoogle').onclick = async () => {
    $('atualizarGoogle').textContent = 'atualizando...';
    const r = await google(X, { acao: 'atualizar', place_id: f.google_place_id, fornecedor_id: f.id });
    if (r.erro) { X.aviso('Não atualizou: ' + r.erro); recarregar(); return; }
    Object.assign(f, r.fornecedor); FOTOS.delete(f.google_place_id); recarregar();
  };
}

async function loteGoogle(P, X) {
  const { $, esc } = X;
  const pend = LISTA.filter(f => !f.google_place_id && !PULADOS.has(f.id));
  const total = LISTA.filter(f => !f.google_place_id).length;
  const sair = () => { VISTA = 'lista'; tela(P, X); scrollTo(0, 0); };
  if (!pend.length) {
    P.innerHTML = `<button class="voltar" id="voltar">‹ Fornecedores</button><h1 class="titulo" style="margin-top:6px">Ligar ao <em>Google</em></h1>
      <div class="vazio" style="margin-top:14px">${total ? `Fim da lista. ${total} ${total === 1 ? 'ficou' : 'ficaram'} sem vínculo; abra a ficha de cada um para buscar com outro nome ou colar o link do Maps.` : 'Todos os fornecedores estão ligados ao Google.'}</div>`;
    $('voltar').onclick = sair; return;
  }
  const f = pend[0];
  P.innerHTML = `<button class="voltar" id="voltar">‹ Fornecedores</button><h1 class="titulo" style="margin-top:6px">Ligar ao <em>Google</em></h1>
    <div class="sub">${pend.length} para ligar. Toque no lugar certo, ajuste a busca ou pule.</div>
    <section class="bloco"><h2>${esc(TIPOS[f.tipo] || f.tipo)}</h2><div style="font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--verde)">${esc(f.nome)}</div>
      <div class="sub" style="margin-top:2px">${esc([f.cidade, f.pais].filter(Boolean).join(', ') || 'sem cidade cadastrada')}</div>
      <div id="resLote"></div>
      <button class="sec" type="button" id="pularG" style="margin-top:10px;width:100%">Nenhum é este, pular</button></section>`;
  $('voltar').onclick = sair;
  $('pularG').onclick = () => { PULADOS.add(f.id); loteGoogle(P, X); };
  painelBusca(X, $('resLote'), f, () => { X.aviso('Ligado: ' + f.nome); loteGoogle(P, X); scrollTo(0, 0); }, true);
}

const PERFIS = { casal: 'Casal', lua: 'Lua de mel', familia: 'Família', executivo: 'Executivo', grupo: 'Grupo', sozinho: 'Viajante sozinho' };
const CAFE = { incluso: 'Incluso', pago: 'Cobrado à parte', nao: 'Não oferece' };
function blocoMaktub(f, esc, admin) {
  const t = (v) => v ? esc(v) : '';
  const itens = [
    linha('Categoria', f.estrelas ? '★'.repeat(f.estrelas) + ' (' + f.estrelas + ' estrelas)' : ''),
    linha('Café da manhã', CAFE[f.cafe] || ''),
    linha('Check-in / out', [f.checkin, f.checkout].some(Boolean) ? esc([f.checkin || '?', f.checkout || '?'].join(' / ')) : ''),
    linha('Indicar para', (f.perfis || []).map(k => PERFIS[k] || k).join(', ')),
    linha('Canal de reserva', t(f.canal_reserva)),
    linha('Contato comercial', t(f.contato_comercial)),
    admin ? linha('Tarifa ou acordo', t(f.acordo)) : '', admin ? linha('Comissão', t(f.comissao)) : '', admin ? linha('Pagamento', t(f.pagamento)) : '',
    linha('Melhor quarto', t(f.melhor_quarto)),
    linha('Pedir na reserva', t(f.pedir_reserva)),
    f.atencao ? `<div class="config" style="margin-top:8px"><b>Atenção:</b> ${esc(f.atencao)}</div>` : '',
  ].join('');
  return itens || '<div class="sub" style="margin-top:0">Ainda sem a ficha interna. Toque em Editar para preencher o que só a Maktub sabe.</div>';
}

// duplicados: mesmo lugar no Google, ou mesmo nome e cidade
function duplicados() {
  const grupos = new Map();
  for (const f of LISTA) {
    const k = f.google_place_id ? 'g:' + f.google_place_id : 'n:' + norm(f.nome) + '|' + norm(f.cidade);
    if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(f);
  }
  return [...grupos.values()].filter(g => g.length > 1);
}
const usos = (id) => AVS.filter(a => a.fornecedor_id === id).length;
const resumoF = (f, esc) => `${esc(f.nome)}<small style="display:block;color:var(--tinta-3);white-space:normal">${esc([TIPOS[f.tipo], f.cidade].filter(Boolean).join(' · '))} · ${usos(f.id)} ${usos(f.id) === 1 ? 'uso' : 'usos'}${f.google_place_id ? ' · ligado ao Google' : ''}</small>`;

// junta "apagar" dentro de "manter": move as avaliações, completa campos vazios e apaga o duplicado
async function juntar(X, manter, apagar) {
  const r1 = await X.sb.from('fornecedor_avaliacoes').update({ fornecedor_id: manter.id }).eq('fornecedor_id', apagar.id);
  if (r1.error) return 'Não moveu as avaliações: ' + r1.error.message;
  const extra = {};
  for (const [k, v] of Object.entries(apagar)) {
    if (['id', 'created_at', 'updated_at', 'nome', 'observacoes'].includes(k)) continue;
    const atual = manter[k];
    if ((atual === null || atual === undefined || atual === '' || (Array.isArray(atual) && !atual.length)) && v !== null && v !== undefined && v !== '') extra[k] = v;
  }
  if (apagar.observacoes && apagar.observacoes !== manter.observacoes) extra.observacoes = [manter.observacoes, apagar.observacoes].filter(Boolean).join('\n');
  if (Object.keys(extra).length) {
    const r2 = await X.sb.from('fornecedores').update(extra).eq('id', manter.id).select().single();
    if (r2.error) return 'Não completou os dados: ' + r2.error.message;
    Object.assign(manter, r2.data);
  }
  const r3 = await X.sb.from('fornecedores').delete().eq('id', apagar.id).select();
  if (r3.error || !r3.data || !r3.data.length) return 'As avaliações foram movidas, mas o duplicado não foi apagado' + (r3.error ? ': ' + r3.error.message : ' (sem permissão para apagar; rode o 1-apagar-fornecedor.sql)') + '.';
  AVS.forEach(a => { if (a.fornecedor_id === apagar.id) a.fornecedor_id = manter.id; });
  LISTA = LISTA.filter(x => x.id !== apagar.id);
  return null;
}

function telaDuplicados(P, X) {
  const { $, esc } = X;
  const G = duplicados();
  P.innerHTML = `<button class="voltar" id="voltar">‹ Fornecedores</button><h1 class="titulo" style="margin-top:6px">Possíveis <em>duplicados</em></h1>
    <div class="sub">Toque em "Manter este" no cadastro que fica. Os outros do grupo são juntados nele: as avaliações dos clientes passam para ele e os campos vazios são completados.</div>
    ${G.length ? G.map((g, gi) => `<section class="bloco"><h2>${g[0].google_place_id ? 'Mesmo lugar no Google' : 'Mesmo nome e cidade'}</h2>
      ${g.map(f => `<div class="lin" style="align-items:center"><span>${resumoF(f, esc)}</span><button class="sec" data-g="${gi}" data-m="${f.id}" style="padding:6px 10px;min-width:0;font-size:11px">Manter este</button></div>`).join('')}</section>`).join('')
      : '<div class="vazio" style="margin-top:14px">Nenhum duplicado encontrado. Se ainda houver um, abra a ficha e use "Juntar com outro fornecedor".</div>'}
    <div class="sub" id="msgD"></div>`;
  $('voltar').onclick = () => { VISTA = 'lista'; tela(P, X); };
  P.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => {
    const g = G[+b.dataset.g], manter = g.find(f => f.id === b.dataset.m);
    if (!confirm(`Manter "${manter.nome}" e juntar ${g.length - 1} ${g.length === 2 ? 'cadastro' : 'cadastros'} nele? Não dá para desfazer.`)) return;
    P.querySelectorAll('[data-m]').forEach(x => x.disabled = true);
    for (const f of g) if (f.id !== manter.id) { const e = await juntar(X, manter, f); if (e) { $('msgD').textContent = e; P.querySelectorAll('[data-m]').forEach(x => x.disabled = false); return; } }
    X.aviso('Juntado em ' + manter.nome + '.'); telaDuplicados(P, X);
  });
}

function telaJuntar(P, X) {
  const { $, esc } = X;
  const f = LISTA.find(x => x.id === FID);
  if (!f) return ir(X, 'lista');
  const q = norm(JUNTAR || '');
  const L = LISTA.filter(x => x.id !== f.id).filter(x => q ? norm(x.nome + ' ' + (x.cidade || '')).includes(q) : (x.tipo === f.tipo && (norm(x.nome).split(' ')[0] === norm(f.nome).split(' ')[0] || (f.cidade && norm(x.cidade) === norm(f.cidade))))).slice(0, 30);
  P.innerHTML = `<button class="voltar" id="voltar">‹ ${esc(f.nome)}</button><h1 class="titulo" style="margin-top:6px">Juntar <em>duplicado</em></h1>
    <div class="sub">Escolha o cadastro repetido. Ele é juntado em <b>${esc(f.nome)}</b>, que fica: avaliações passam para cá e campos vazios são completados.</div>
    <input class="busca" id="buscaJ" type="search" placeholder="Buscar pelo nome ou cidade" value="${esc(JUNTAR || '')}">
    <div class="lista">${L.length ? L.map(x => `<button class="lin" data-j="${x.id}" style="width:100%;font-size:14px;text-align:left"><span>${resumoF(x, esc)}</span><span>juntar ›</span></button>`).join('') : '<div class="vazio">Nenhum parecido. Busque pelo nome.</div>'}</div>
    <div class="sub" id="msgJ"></div>`;
  $('voltar').onclick = () => { VISTA = 'ficha'; tela(P, X); };
  $('buscaJ').oninput = (e) => { JUNTAR = e.target.value; const pos = e.target.selectionStart; telaJuntar(P, X); $('buscaJ').focus(); $('buscaJ').setSelectionRange(pos, pos); };
  P.querySelectorAll('[data-j]').forEach(b => b.onclick = async () => {
    const outro = LISTA.find(x => x.id === b.dataset.j);
    if (!confirm(`Juntar "${outro.nome}" em "${f.nome}"? O cadastro "${outro.nome}" deixa de existir. Não dá para desfazer.`)) return;
    b.disabled = true;
    const e = await juntar(X, f, outro);
    if (e) { $('msgJ').textContent = e; b.disabled = false; return; }
    X.aviso('Juntado.'); ir(X, 'ficha', f.id);
  });
}

function form(P, X) {
  const { $, esc, campo } = X;
  const novo = VISTA === 'novo';
  const f = novo ? { tipo: TIPO !== 'todos' ? TIPO : 'hotel' } : LISTA.find(x => x.id === FID);
  if (!f) return ir(X, 'lista');
  P.innerHTML = `
    <button class="voltar" id="voltar">‹ ${novo ? 'Fornecedores' : esc(f.nome)}</button>
    <h1 class="titulo" style="margin-top:6px">${novo ? 'Novo <em>fornecedor</em>' : 'Editar <em>fornecedor</em>'}</h1>
    <form id="fF" class="form" autocomplete="off">
      <label class="fl"><span>Tipo</span><select name="tipo">${Object.entries(TIPOS).map(([k, l]) => `<option value="${k}" ${k === f.tipo ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${campo('nome', 'Nome', f.nome, 'text', 'required')}
      <div class="duas-col">${campo('cidade', 'Cidade', f.cidade, 'text', 'list="dlCid"')}${campo('pais', 'País', f.pais)}</div>
      <datalist id="dlCid">${[...new Set(LISTA.map(x => x.cidade).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('')}</datalist>
      ${campo('contato', 'Contato (telefone, e-mail, nome de quem atende)', f.contato)}
      ${campo('site', 'Site', f.site, 'text', 'inputmode="url" placeholder="www..."')}
      <div class="grupo">Ficha Maktub</div>
      <div class="duas-col"><label class="fl"><span>Estrelas</span><select name="estrelas"><option value="">-</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${+f.estrelas === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="fl"><span>Café da manhã</span><select name="cafe"><option value="">-</option>${Object.entries(CAFE).map(([k, l]) => `<option value="${k}" ${f.cafe === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div class="duas-col">${campo('checkin', 'Check-in', f.checkin, 'text', 'placeholder="14h"')}${campo('checkout', 'Check-out', f.checkout, 'text', 'placeholder="12h"')}</div>
      <div class="sub" style="margin-bottom:4px">Indicar para</div>
      <div class="chips" id="perfisF" style="flex-wrap:wrap">${Object.entries(PERFIS).map(([k, l]) => `<button type="button" data-p="${k}" class="${(f.perfis || []).includes(k) ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${campo('canal_reserva', 'Canal de reserva (direto, Booking, operadora...)', f.canal_reserva)}
      ${campo('contato_comercial', 'Contato comercial (nome, WhatsApp, e-mail)', f.contato_comercial)}
      ${X.admin ? `${campo('acordo', 'Tarifa ou acordo', f.acordo)}<div class="duas-col">${campo('comissao', 'Comissão', f.comissao, 'text', 'placeholder="10%"')}${campo('pagamento', 'Pagamento ao fornecedor', f.pagamento, 'text', 'placeholder="faturado, no check-in..."')}</div>` : ''}
      ${campo('melhor_quarto', 'Melhor quarto ou andar', f.melhor_quarto)}
      ${campo('pedir_reserva', 'O que pedir na reserva', f.pedir_reserva)}
      <label class="fl"><span>Pontos de atenção</span><textarea name="atencao" rows="2" placeholder="Ex.: obra no prédio ao lado até dezembro">${esc(f.atencao || '')}</textarea></label>
      <label class="fl"><span>Observações para o time</span><textarea name="observacoes" rows="3" placeholder="Ex.: pedir quarto andar alto; aceita late checkout">${esc(f.observacoes || '')}</textarea></label>
      <button class="zap grande" type="submit" id="salvarF" style="margin-top:14px;width:100%">${novo ? 'Cadastrar' : 'Salvar'}</button>
      <div class="sub" id="msgF"></div>
    </form>`;
  $('voltar').onclick = () => novo ? ir(X, 'lista') : ir(X, 'ficha', f.id);
  $('perfisF').onclick = (e) => { const b = e.target.closest('button'); if (b) b.classList.toggle('on'); };
  $('fF').onsubmit = async (ev) => {
    ev.preventDefault();
    const e = ev.target.elements, g = (n) => e[n].value.trim();
    const row = { tipo: g('tipo'), nome: g('nome'), cidade: g('cidade') || null, pais: g('pais') || null, contato: g('contato') || null, site: g('site') || null, observacoes: g('observacoes') || null,
      estrelas: g('estrelas') ? +g('estrelas') : null, cafe: g('cafe') || null, checkin: g('checkin') || null, checkout: g('checkout') || null,
      perfis: [...$('perfisF').querySelectorAll('.on')].map(b => b.dataset.p), canal_reserva: g('canal_reserva') || null, contato_comercial: g('contato_comercial') || null,
      melhor_quarto: g('melhor_quarto') || null, pedir_reserva: g('pedir_reserva') || null, atencao: g('atencao') || null };
    if (X.admin) Object.assign(row, { acordo: g('acordo') || null, comissao: g('comissao') || null, pagamento: g('pagamento') || null });
    if (novo) { const igual = LISTA.find(x => norm(x.nome) === norm(row.nome) && norm(x.cidade) === norm(row.cidade)); if (igual) { $('msgF').innerHTML = `Já existe: <button type="button" id="abrirIgual" style="color:var(--verde);text-decoration:underline;background:none;border:0;font:inherit">${esc(igual.nome)}</button>`; $('abrirIgual').onclick = () => ir(X, 'ficha', igual.id); return; } }
    $('salvarF').disabled = true;
    const { data, error } = novo ? await X.sb.from('fornecedores').insert(row).select().single() : await X.sb.from('fornecedores').update(row).eq('id', f.id).select().single();
    $('salvarF').disabled = false;
    if (error) { $('msgF').textContent = 'Não salvou: ' + error.message; return; }
    const i = LISTA.findIndex(x => x.id === data.id); if (i >= 0) LISTA[i] = data; else LISTA.push(data);
    X.aviso(novo ? 'Fornecedor cadastrado.' : 'Salvo.'); ir(X, 'ficha', data.id);
  };
}

function formAvaliar(P, X) {
  const { $, esc, campo, D } = X;
  const pre = PRE || {};
  const forn = pre.fornecedor_id ? LISTA.find(x => x.id === pre.fornecedor_id) : null;
  const cli = pre.pessoa_id ? (D.pessoas || []).find(p => p.id === pre.pessoa_id) : null;
  P.innerHTML = `
    <button class="voltar" id="voltar">‹ Voltar</button>
    <h1 class="titulo" style="margin-top:6px">Avaliação de <em>fornecedor</em></h1>
    <div class="sub">O que o cliente achou. Vale anotar logo no pós-viagem, enquanto está fresco.</div>
    <form id="fA" class="form" autocomplete="off">
      <div class="grupo">Fornecedor</div>
      ${forn ? `<div class="lin"><span>${esc(forn.nome)}</span><span>${TIPOS[forn.tipo]}${forn.cidade ? ' · ' + esc(forn.cidade) : ''}</span></div><input type="hidden" name="fornecedor_id" value="${forn.id}">`
        : `<label class="fl"><span>Tipo</span><select name="tipo">${Object.entries(TIPOS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
           ${campo('fnome', 'Nome do hotel ou serviço', '', 'text', 'required list="dlForn"')}
           <datalist id="dlForn">${LISTA.map(x => `<option value="${esc(x.nome)}">${esc(x.cidade || '')}</option>`).join('')}</datalist>
           ${campo('fcidade', 'Cidade', pre.cidade || '', 'text', 'list="dlCid2"')}
           <datalist id="dlCid2">${[...new Set(LISTA.map(x => x.cidade).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('')}</datalist>
           <div class="sub">Se já estiver cadastrado, escolha da lista; se não, ele é criado.</div>`}
      <div class="grupo">Cliente</div>
      ${cli ? `<div class="lin"><span>${esc(cli.nome)}</span></div><input type="hidden" name="pessoa_id" value="${cli.id}">`
        : `${campo('cliente', 'Quem usou', '', 'text', 'list="dlCliA"')}<datalist id="dlCliA">${(D.pessoas || []).slice(0, 3000).map(p => `<option value="${esc(p.nome)}">`).join('')}</datalist>`}
      ${campo('data_uso', 'Quando usou', pre.data_uso || '', 'date')}
      ${pre.id ? `<input type="hidden" name="av_id" value="${pre.id}">` : ''}
      <div class="grupo">Avaliação</div>
      <div class="seg" id="notaA">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}">${n}</button>`).join('')}</div>
      <div class="seg" id="indA" style="margin-top:10px"><button type="button" data-v="1">Indicaria</button><button type="button" data-v="0">Não indicaria</button></div>
      <label class="fl"><span>Comentário</span><textarea name="comentario" rows="4" placeholder="O que se destacou, o que poderia ser melhor, dicas para o próximo cliente"></textarea></label>
      <button class="zap grande" type="submit" id="salvarA" style="margin-top:14px;width:100%">Salvar avaliação</button>
      <div class="sub" id="msgA"></div>
    </form>`;
  let nota = 0, ind = null;
  $('notaA').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; nota = +b.dataset.n; [...$('notaA').children].forEach(x => x.classList.toggle('on', x === b)); };
  $('indA').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; ind = b.dataset.v === '1'; [...$('indA').children].forEach(x => x.classList.toggle('on', x === b)); };
  $('voltar').onclick = () => history.back();
  $('fA').onsubmit = async (ev) => {
    ev.preventDefault();
    const e = ev.target.elements, g = (n) => e[n] ? e[n].value.trim() : '';
    if (!nota) { $('msgA').textContent = 'Escolha a nota de 1 a 5.'; return; }
    let fid = g('fornecedor_id');
    if (!fid) {
      const igual = LISTA.find(x => norm(x.nome) === norm(g('fnome')) && (!g('fcidade') || norm(x.cidade) === norm(g('fcidade'))));
      if (igual) fid = igual.id;
      else {
        const r = await X.sb.from('fornecedores').insert({ tipo: g('tipo'), nome: g('fnome'), cidade: g('fcidade') || null }).select().single();
        if (r.error) { $('msgA').textContent = 'Não criou o fornecedor: ' + r.error.message; return; }
        LISTA.push(r.data); fid = r.data.id;
      }
    }
    let pid = g('pessoa_id');
    if (!pid && g('cliente')) { const p = (D.pessoas || []).find(x => norm(x.nome) === norm(g('cliente'))); if (p) pid = p.id; }
    $('salvarA').disabled = true;
    const row = { fornecedor_id: fid, pessoa_id: pid || null, data_uso: g('data_uso') || null, nota, indicaria: ind, comentario: g('comentario') || null };
    const { data, error } = g('av_id') ? await X.sb.from('fornecedor_avaliacoes').update(row).eq('id', g('av_id')).select().single() : await X.sb.from('fornecedor_avaliacoes').insert(row).select().single();
    $('salvarA').disabled = false;
    if (error) { $('msgA').textContent = 'Não salvou: ' + error.message; return; }
    const i = AVS.findIndex(x => x.id === data.id); if (i >= 0) AVS[i] = data; else AVS.unshift(data); PRE = null;
    X.aviso('Avaliação salva.'); ir(X, 'ficha', fid);
  };
}
