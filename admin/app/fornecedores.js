// Maktub Go: fornecedores e indicações.
// Hotéis, transfers, passeios, ingressos, seguros, trens e locadoras com a nota de cada cliente que usou,
// para indicar os melhores aos próximos clientes de cada destino.

export const TIPOS = { hotel: 'Hotel', transfer: 'Transfer', passeio: 'Passeio', ingresso: 'Ingresso', seguro: 'Seguro viagem', locadora: 'Aluguel de carro', trem: 'Trem', restaurante: 'Restaurante', outro: 'Outro' };
let LISTA = null, AVS = null, VISTA = 'lista', FID = null, TIPO = 'todos', BUSCA = '', PRE = null, PULADOS = new Set();

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
  if (LISTA === false) { P.innerHTML = `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">Fornecedores</h1><div class="config" style="margin-top:12px">Fornecedores ainda não ativados no Supabase. Rode o <b>38-fornecedores.sql</b>.</div>`; $('voltar').onclick = () => X.ir('empresa'); return; }
  if (VISTA === 'novo' || VISTA === 'editar') return form(P, X);
  if (VISTA === 'avaliar') return formAvaliar(P, X);
  if (VISTA === 'lote') return loteGoogle(P, X);
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
    <input class="busca" id="buscaF" type="search" placeholder="Buscar por cidade, país ou nome" value="${esc(BUSCA)}">
    <div class="chips" id="tipoF" style="margin-top:10px">${[['todos', 'Todos'], ...Object.entries(TIPOS)].map(([k, l]) => `<button data-t="${k}" class="${k === TIPO ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="lista">${L.length ? L.map(({ f, av, m, ind, nInd }) => `<button class="cli" data-f="${f.id}"><div><div class="nome">${esc(f.nome)}</div>
      <div class="meta">${TIPOS[f.tipo] || f.tipo}${f.cidade ? ' · ' + esc(f.cidade) : ''}${f.pais ? ', ' + esc(f.pais) : ''}${nInd ? ` · ${Math.round(ind / nInd * 100)}% indicariam` : ''}${f.google_nota ? ` · Google ${fmt1(+f.google_nota)}` : ''}</div></div>
      <div class="val">${m !== null ? `<b>${fmt1(m)}</b><span>${av.filter(a => a.nota).length} ${av.filter(a => a.nota).length === 1 ? 'nota' : 'notas'}</span>` : `<span>${av.length ? av.length + (av.length === 1 ? ' uso' : ' usos') + ', sem nota' : 'sem avaliação'}</span>`}</div></button>`).join('')
      : `<div class="vazio">${BUSCA || TIPO !== 'todos' ? 'Nada encontrado com esse filtro.' : 'Nenhum fornecedor ainda. Cadastre o primeiro hotel ou registre a avaliação de um cliente.'}</div>`}</div>
    <div class="sub">Ordenado pela nota média dos clientes. Busque pela cidade para ver as melhores opções de um destino.</div>`;
  $('voltar').onclick = () => X.ir('empresa');
  $('novoF').onclick = () => ir(X, 'novo');
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
    <section class="bloco" id="blGoogle"><h2>No Google</h2>${blocoGoogle(f, esc)}</section>
    ${f.contato || f.site || f.observacoes ? `<section class="bloco"><h2>Dados</h2>
      ${f.contato ? `<div class="lin"><span>Contato</span><span style="white-space:normal;text-align:right">${esc(f.contato)}</span></div>` : ''}
      ${f.site ? `<div class="lin"><span>Site</span><span><a href="${esc(/^https?:\/\//.test(f.site) ? f.site : 'https://' + f.site)}" target="_blank" rel="noopener" style="color:var(--verde)">abrir ›</a></span></div>` : ''}
      ${f.observacoes ? `<div style="white-space:pre-wrap;color:var(--tinta-2);margin-top:8px">${esc(f.observacoes)}</div>` : ''}</section>` : ''}
    <section class="bloco"><h2>Clientes que usaram</h2>
      ${av.length ? av.map(a => `<div style="padding:10px 0;border-top:1px solid var(--linha)"><div style="display:flex;justify-content:space-between;gap:8px"><b style="color:var(--verde);font-weight:600">${a.pessoa_id && nomeP(a.pessoa_id) ? `<button data-pid="${a.pessoa_id}" style="background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer">${esc(nomeP(a.pessoa_id))} ›</button>` : 'Cliente'}</b>${a.nota ? `<span style="color:var(--dourado);white-space:nowrap">${estrelas(a.nota)}</span>` : `<button class="sec" data-avid="${a.id}" style="padding:6px 10px;min-width:0;font-size:11px">Avaliar</button>`}</div>
        <div class="sub" style="margin-top:2px">${periodo(a)}${a.indicaria === true ? ' · indicaria' : a.indicaria === false ? ' · não indicaria' : ''}${!a.nota ? ' · sem nota' : ''}${a.localizador ? ' · loc. ' + esc(a.localizador) : ''}</div>
        ${a.comentario ? `<div style="white-space:pre-wrap;color:var(--tinta-2);margin-top:4px">${esc(a.comentario)}</div>` : ''}</div>`).join('') : '<div class="vazio">Ninguém avaliou ainda.</div>'}
    </section>`;
  $('voltar').onclick = () => ir(X, 'lista');
  $('editarF').onclick = () => { VISTA = 'editar'; tela(P, X); };
  ligarGoogle(P, X, f);
  // nota com mais de 30 dias: atualiza sozinho
  if (f.google_place_id && (!f.google_em || Date.now() - new Date(f.google_em) > 30 * 864e5)) google(X, { acao: 'atualizar', place_id: f.google_place_id, fornecedor_id: f.id }).then(r => { if (r && r.fornecedor && VISTA === 'ficha' && FID === f.id) { Object.assign(f, r.fornecedor); $('blGoogle').innerHTML = '<h2>No Google</h2>' + blocoGoogle(f, esc); ligarGoogle(P, X, f); } });
  $('avaliarEste').onclick = () => { PRE = { fornecedor_id: f.id }; ir(X, 'avaliar', f.id); };
  P.querySelectorAll('[data-pid]').forEach(b => b.onclick = () => X.abrirCliente(b.dataset.pid));
  P.querySelectorAll('[data-avid]').forEach(b => b.onclick = () => { const a = AVS.find(x => x.id === b.dataset.avid); PRE = { ...a }; ir(X, 'avaliar', f.id); });
}

async function google(X, body) {
  const { data, error } = await X.sb.functions.invoke('google-lugar', { body });
  if (error || !data || !data.ok) { const msg = (data && data.erro) || (error && error.message) || 'sem resposta'; return { erro: msg }; }
  return data;
}
function blocoGoogle(f, esc) {
  if (!f.google_place_id) return `<div class="sub" style="margin-top:0">Ainda não ligado ao Google. Busque para trazer a nota, o endereço e o link do Maps.</div>
    <button class="sec" type="button" id="buscarGoogle" style="margin-top:8px;width:100%">Buscar no Google</button><div id="resGoogle"></div>`;
  return `${f.google_nota ? `<div style="display:flex;align-items:baseline;gap:8px"><b style="font-family:'Cormorant Garamond',serif;font-size:30px;color:var(--verde)">${fmt1(+f.google_nota)}</b><span style="color:var(--dourado)">${estrelas(+f.google_nota)}</span><span class="sub" style="margin:0">${(f.google_avaliacoes || 0).toLocaleString('pt-BR')} avaliações no Google</span></div>` : '<div class="sub" style="margin-top:0">Sem nota no Google.</div>'}
    ${f.google_endereco ? `<div class="lin"><span>Endereço</span><span style="white-space:normal;text-align:right">${esc(f.google_endereco)}</span></div>` : ''}
    ${f.google_maps ? `<div class="lin"><span>Mapa</span><span><a href="${esc(f.google_maps)}" target="_blank" rel="noopener" style="color:var(--verde)">abrir no Google Maps ›</a></span></div>` : ''}
    <div class="sub">Fonte: Google${f.google_em ? ', atualizado em ' + new Date(f.google_em).toLocaleDateString('pt-BR') : ''}. <button type="button" id="trocarGoogle" style="background:none;border:0;padding:0;color:var(--verde);text-decoration:underline;font:inherit;cursor:pointer">Não é este lugar?</button></div><div id="resGoogle"></div>`;
}
function ligarGoogle(P, X, f) {
  const { $, esc } = X;
  const buscar = async () => {
    const el = $('resGoogle'); el.innerHTML = '<div class="vazio">Buscando no Google...</div>';
    const r = await google(X, { acao: 'buscar', texto: [f.nome, f.cidade, f.pais].filter(Boolean).join(' ') });
    if (r.erro) { el.innerHTML = `<div class="config">Não deu para buscar: ${esc(r.erro)}</div>`; return; }
    if (!r.lugares.length) { el.innerHTML = '<div class="vazio">O Google não encontrou. Confira o nome e a cidade em Editar.</div>'; return; }
    el.innerHTML = `<div class="sub">Toque no lugar certo:</div>${r.lugares.map((l, i) => `<button class="lin" data-gl="${i}" style="width:100%;font-size:14px;text-align:left"><span>${esc(l.nome)}<small style="display:block;color:var(--tinta-3);white-space:normal">${esc(l.endereco || '')}</small></span><span>${l.nota ? fmt1(l.nota) + ' · ' + (l.avaliacoes || 0).toLocaleString('pt-BR') : 'sem nota'}</span></button>`).join('')}`;
    el.querySelectorAll('[data-gl]').forEach(b => b.onclick = async () => {
      const l = r.lugares[+b.dataset.gl]; el.innerHTML = '<div class="vazio">Salvando...</div>';
      const v = await google(X, { acao: 'vincular', place_id: l.place_id, fornecedor_id: f.id });
      if (v.erro) { el.innerHTML = `<div class="config">Não salvou: ${esc(v.erro)}</div>`; return; }
      Object.assign(f, v.fornecedor); X.aviso('Ligado ao Google.'); tela(P, X);
    });
  };
  if ($('buscarGoogle')) $('buscarGoogle').onclick = buscar;
  if ($('trocarGoogle')) $('trocarGoogle').onclick = buscar;
}

async function loteGoogle(P, X) {
  const { $, esc } = X;
  const pend = LISTA.filter(f => !f.google_place_id && !PULADOS.has(f.id));
  const total = LISTA.filter(f => !f.google_place_id).length;
  const sair = () => { VISTA = 'lista'; tela(P, X); scrollTo(0, 0); };
  if (!pend.length) {
    P.innerHTML = `<button class="voltar" id="voltar">‹ Fornecedores</button><h1 class="titulo" style="margin-top:6px">Ligar ao <em>Google</em></h1>
      <div class="vazio" style="margin-top:14px">${total ? `Fim da lista. ${total} ${total === 1 ? 'ficou' : 'ficaram'} sem vínculo; dá para buscar de novo na ficha de cada um, ajustando o nome ou a cidade em Editar.` : 'Todos os fornecedores estão ligados ao Google.'}</div>`;
    $('voltar').onclick = sair; return;
  }
  const f = pend[0];
  P.innerHTML = `<button class="voltar" id="voltar">‹ Fornecedores</button><h1 class="titulo" style="margin-top:6px">Ligar ao <em>Google</em></h1>
    <div class="sub">${pend.length} para ligar. Toque no lugar certo ou pule.</div>
    <section class="bloco"><h2>${esc(TIPOS[f.tipo] || f.tipo)}</h2><div style="font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--verde)">${esc(f.nome)}</div>
      <div class="sub" style="margin-top:2px">${esc([f.cidade, f.pais].filter(Boolean).join(', ') || 'sem cidade cadastrada')}</div>
      <div id="resLote" style="margin-top:8px"><div class="vazio">Buscando no Google...</div></div>
      <button class="sec" type="button" id="pularG" style="margin-top:10px;width:100%">Nenhum é este, pular</button></section>`;
  $('voltar').onclick = sair;
  $('pularG').onclick = () => { PULADOS.add(f.id); loteGoogle(P, X); };
  const r = await google(X, { acao: 'buscar', texto: [f.nome, f.cidade, f.pais].filter(Boolean).join(' ') });
  if (VISTA !== 'lote' || !$('resLote')) return;
  const el = $('resLote');
  if (r.erro) { el.innerHTML = `<div class="config">Não deu para buscar: ${esc(r.erro)}</div>`; return; }
  if (!r.lugares.length) { el.innerHTML = '<div class="vazio">O Google não encontrou nada com esse nome.</div>'; return; }
  el.innerHTML = r.lugares.map((l, i) => `<button class="lin" data-gl="${i}" style="width:100%;font-size:14px;text-align:left"><span>${esc(l.nome)}<small style="display:block;color:var(--tinta-3);white-space:normal">${esc(l.endereco || '')}</small></span><span>${l.nota ? fmt1(l.nota) + ' · ' + (l.avaliacoes || 0).toLocaleString('pt-BR') : 'sem nota'}</span></button>`).join('');
  el.querySelectorAll('[data-gl]').forEach(b => b.onclick = async () => {
    const l = r.lugares[+b.dataset.gl]; el.innerHTML = '<div class="vazio">Salvando...</div>';
    const v = await google(X, { acao: 'vincular', place_id: l.place_id, fornecedor_id: f.id });
    if (v.erro) { el.innerHTML = `<div class="config">Não salvou: ${esc(v.erro)}</div>`; return; }
    Object.assign(f, v.fornecedor); X.aviso('Ligado: ' + f.nome); loteGoogle(P, X); scrollTo(0, 0);
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
      <label class="fl"><span>Observações para o time</span><textarea name="observacoes" rows="3" placeholder="Ex.: pedir quarto andar alto; aceita late checkout">${esc(f.observacoes || '')}</textarea></label>
      <button class="zap grande" type="submit" id="salvarF" style="margin-top:14px;width:100%">${novo ? 'Cadastrar' : 'Salvar'}</button>
      <div class="sub" id="msgF"></div>
    </form>`;
  $('voltar').onclick = () => novo ? ir(X, 'lista') : ir(X, 'ficha', f.id);
  $('fF').onsubmit = async (ev) => {
    ev.preventDefault();
    const e = ev.target.elements, g = (n) => e[n].value.trim();
    const row = { tipo: g('tipo'), nome: g('nome'), cidade: g('cidade') || null, pais: g('pais') || null, contato: g('contato') || null, site: g('site') || null, observacoes: g('observacoes') || null };
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
