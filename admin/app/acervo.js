// Maktub Go: Acervo de viagens (só administradores).
// Destinos: mapa e números tirados das emissões. Roteiros: biblioteca dos roteiros e propostas em HTML.

let ACV_ABA = 'destinos', ACV_PER = '12m', EMS = null, AERO = null, MAPA = null, RT = null, RT_TIPO = 'todos', RT_BUSCA = '', RT_NOVO = false, CONF = null;

// nomes em português para os aeroportos mais comuns (o resto usa o nome da base aberta de aeroportos)
const NOME_PT = { GRU: 'São Paulo', CGH: 'São Paulo', VCP: 'Campinas', GIG: 'Rio de Janeiro', SDU: 'Rio de Janeiro', CNF: 'Belo Horizonte', PLU: 'Belo Horizonte',
  BSB: 'Brasília', FLN: 'Florianópolis', NAT: 'Natal', MCZ: 'Maceió', JPA: 'João Pessoa', FOR: 'Fortaleza', SLZ: 'São Luís', BEL: 'Belém', MAO: 'Manaus',
  STM: 'Santarém', VIX: 'Vitória', IGU: 'Foz do Iguaçu', GYN: 'Goiânia', CGB: 'Cuiabá', CWB: 'Curitiba', NVT: 'Navegantes', BPS: 'Porto Seguro',
  IOS: 'Ilhéus', FEN: 'Fernando de Noronha', JJD: 'Jericoacoara', CXJ: 'Caxias do Sul', LIS: 'Lisboa', OPO: 'Porto', FAO: 'Faro', FNC: 'Funchal',
  MAD: 'Madri', BCN: 'Barcelona', CDG: 'Paris', ORY: 'Paris', LHR: 'Londres', LGW: 'Londres', FCO: 'Roma', MXP: 'Milão', LIN: 'Milão', VCE: 'Veneza',
  FRA: 'Frankfurt', MUC: 'Munique', AMS: 'Amsterdã', ZRH: 'Zurique', GVA: 'Genebra', BRU: 'Bruxelas', ATH: 'Atenas', IST: 'Istambul',
  JFK: 'Nova York', EWR: 'Nova York', LGA: 'Nova York', MIA: 'Miami', FLL: 'Fort Lauderdale', MCO: 'Orlando', LAX: 'Los Angeles', LAS: 'Las Vegas',
  EZE: 'Buenos Aires', AEP: 'Buenos Aires', SCL: 'Santiago', MVD: 'Montevidéu', LIM: 'Lima', CUZ: 'Cusco', BOG: 'Bogotá', CTG: 'Cartagena',
  PTY: 'Cidade do Panamá', MEX: 'Cidade do México', CUN: 'Cancún', PUJ: 'Punta Cana', BRC: 'Bariloche', USH: 'Ushuaia', FTE: 'El Calafate',
  MDZ: 'Mendoza', CPT: 'Cidade do Cabo', JNB: 'Joanesburgo', DXB: 'Dubai', DOH: 'Doha', NRT: 'Tóquio', HND: 'Tóquio', MLE: 'Maldivas' };
const PAIS_PT = { BR: 'Brasil', PT: 'Portugal', ES: 'Espanha', FR: 'França', IT: 'Itália', GB: 'Reino Unido', DE: 'Alemanha', NL: 'Holanda', CH: 'Suíça',
  US: 'Estados Unidos', AR: 'Argentina', CL: 'Chile', UY: 'Uruguai', PE: 'Peru', CO: 'Colômbia', MX: 'México', PA: 'Panamá', DO: 'Rep. Dominicana',
  AE: 'Emirados Árabes', QA: 'Catar', JP: 'Japão', ZA: 'África do Sul', GR: 'Grécia', TR: 'Turquia', BE: 'Bélgica', MV: 'Maldivas' };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const PERFIS = ['Casal', 'Lua de mel', 'Família', 'Amigos', 'Sozinho', 'Grupo ou time', 'Corporativo'];
const sem = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

async function carregarAero() {
  if (AERO) return AERO;
  const r = await fetch('/admin/app/aeroportos.json'); AERO = await r.json();
  AERO._cidade = {}; Object.entries(AERO).forEach(([k, v]) => { if (k === '_cidade') return; const c = sem(NOME_PT[k] || v[0]); if (!AERO._cidade[c] || v[1] === 'BR') AERO._cidade[c] = k; });
  return AERO;
}
function local(txt) {
  const t = String(txt || '').trim(); if (!t) return null;
  const up = t.toUpperCase(), m = up.match(/\b([A-Z]{3})\b/);
  let k = /^[A-Z]{3}$/.test(up) && AERO[up] ? up : (m && AERO[m[1]] ? m[1] : AERO._cidade[sem(t)]);
  if (!k) return { cidade: t, pais: '', lat: null, lon: null, iata: '' };
  const v = AERO[k];
  return { cidade: NOME_PT[k] || v[0], pais: v[1], lat: v[2], lon: v[3], iata: k };
}

export async function telaAcervo(P, X) {
  const { $, esc, ir } = X;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Mais</button><h1 class="titulo" style="margin-top:6px">Acervo de <em>viagens</em></h1>
    <div class="seg" id="acvAba"><button data-a="destinos" class="${ACV_ABA === 'destinos' ? 'on' : ''}">Destinos</button><button data-a="roteiros" class="${ACV_ABA === 'roteiros' ? 'on' : ''}">Roteiros e propostas</button></div>
    <div id="acvCorpo"><div class="vazio">Carregando...</div></div>`;
  $('voltar').onclick = () => ir('mais');
  $('acvAba').onclick = (e) => { const b = e.target.closest('button'); if (b) { ACV_ABA = b.dataset.a; telaAcervo(P, X); } };
  if (ACV_ABA === 'destinos') return destinos($('acvCorpo'), X);
  return roteiros($('acvCorpo'), X);
}

/* ================= destinos ================= */
async function destinos(el, X) {
  const { sb, esc, brl2, brlC, num, aba } = X;
  if (!EMS) {
    const [r] = await Promise.all([sb.from('emissoes').select('id,origem,destino,cia,data_ida,data_negociacao,valor_receber,passageiros,servico').order('data_negociacao', { ascending: false }).limit(10000), carregarAero()]);
    if (r.error) { el.innerHTML = `<div class="vazio">Não carregou: ${esc(r.error.message)}</div>`; return; }
    EMS = r.data || [];
  } else await carregarAero();
  if (aba() !== 'acervo' || ACV_ABA !== 'destinos') return;
  const hoje = new Date(), ini = ACV_PER === '12m' ? new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1) : ACV_PER === 'ano' ? new Date(hoje.getFullYear(), 0, 1) : new Date(2000, 0, 1);
  const iniISO = ini.toISOString().slice(0, 10);
  const L = EMS.filter(e => String(e.data_negociacao || '') >= iniISO && (e.destino || e.origem)).map(e => ({ e, o: local(e.origem), d: local(e.destino), pax: Math.max(1, parseInt(e.passageiros, 10) || 1) }));
  const cid = {}, tre = {}, cia = {}, mes = Array(12).fill(0), semLoc = new Set(), paises = new Set();
  let pax = 0, antec = [];
  L.forEach(({ e, o, d, pax: p }) => {
    pax += p;
    if (d) {
      const k = d.cidade; cid[k] = cid[k] || { n: 0, pax: 0, valor: 0, d }; cid[k].n++; cid[k].pax += p; cid[k].valor += +e.valor_receber || 0;
      if (d.pais) paises.add(d.pais); if (d.lat === null) semLoc.add(String(e.destino).trim());
    }
    if (o && o.lat === null) semLoc.add(String(e.origem).trim());
    if (o && d) { const k = o.cidade + ' → ' + d.cidade; tre[k] = tre[k] || { n: 0, o, d }; tre[k].n++; }
    if (e.cia) { const k = String(e.cia).trim(); cia[k] = (cia[k] || 0) + 1; }
    if (e.data_ida) mes[+String(e.data_ida).slice(5, 7) - 1]++;
    if (e.data_ida && e.data_negociacao) { const dd = (new Date(e.data_ida) - new Date(e.data_negociacao)) / 864e5; if (dd >= 0 && dd < 730) antec.push(dd); }
  });
  antec.sort((a, b) => a - b);
  const medAntec = antec.length ? Math.round(antec[Math.floor(antec.length / 2)]) : null;
  const topC = Object.entries(cid).sort((a, b) => b[1].n - a[1].n), topT = Object.entries(tre).sort((a, b) => b[1].n - a[1].n);
  const ticket = topC.filter(([, x]) => x.valor > 0).slice(0, 6).map(([k, x]) => [k, Math.round(x.valor / x.pax)]);
  const totalValor = topC.reduce((t, [, x]) => t + x.valor, 0);
  const barra = (itens, fmt, cls) => { const max = Math.max(1, ...itens.map(i => i[1])); return `<div class="rank">${itens.map(([r, q], i) => `<div class="rk"><div class="rt"><span>${i + 1}</span><b>${esc(r)}</b><em>${fmt ? fmt(q) : q}</em></div><div class="rb"><i class="${cls || ''}" style="width:${Math.max(3, q / max * 100)}%"></i></div></div>`).join('')}</div>`; };
  el.innerHTML = `
    <div class="chips" id="acvPer" style="margin-top:10px">${[['12m', 'Últimos 12 meses'], ['ano', 'Este ano'], ['tudo', 'Desde o início']].map(([v, l]) => `<button data-p="${v}" class="${ACV_PER === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${L.length ? `
    <div class="mapa" id="acvMapa"></div>
    <div class="numeros" style="margin-top:12px">
      <div class="num destaque"><div class="l">Destinos</div><div class="v">${topC.length}</div><div class="d">em ${paises.size} ${paises.size === 1 ? 'país' : 'países'}</div></div>
      <div class="num destaque"><div class="l">Passageiros</div><div class="v">${num(pax)}</div><div class="d">${num(L.length)} emissões</div></div>
      <div class="num"><div class="l">Compra antes da viagem</div><div class="v">${medAntec === null ? '-' : medAntec + ' dias'}</div><div class="d">antecedência típica</div></div>
      <div class="num"><div class="l">Ticket por passageiro</div><div class="v">${pax ? brlC(totalValor / pax) : '-'}</div><div class="d">média do período</div></div>
    </div>
    <section class="bloco"><h2>Destinos mais visitados</h2>${barra(topC.slice(0, 8).map(([k, x]) => [k + (x.d.pais && x.d.pais !== 'BR' ? ' · ' + (PAIS_PT[x.d.pais] || x.d.pais) : ''), x.n]), null, 'ouro')}</section>
    <section class="bloco"><h2>Trechos mais voados</h2>${barra(topT.slice(0, 8).map(([k, x]) => [k, x.n]))}</section>
    <section class="bloco"><h2>Quando viajam</h2><div class="meses">${mes.map((n, i) => `<div><i style="height:${Math.max(4, n / Math.max(1, ...mes) * 100)}%"></i><b>${n || ''}</b><span>${MESES[i]}</span></div>`).join('')}</div><div class="sub" style="margin-top:6px">Pelo mês da ida.</div></section>
    ${Object.keys(cia).length ? `<section class="bloco"><h2>Companhias mais usadas</h2>${barra(Object.entries(cia).sort((a, b) => b[1] - a[1]).slice(0, 6))}</section>` : ''}
    ${ticket.length ? `<section class="bloco"><h2>Ticket por passageiro, por destino</h2>${barra(ticket, (q) => brl2(q).replace(',00', ''), 'ouro')}</section>` : ''}
    ${semLoc.size ? `<div class="sub">Sem localização no mapa: ${esc([...semLoc].slice(0, 12).join(', '))}${semLoc.size > 12 ? '...' : ''}. Use o código do aeroporto na planilha (ex.: GIG, LIS) para entrarem no mapa.</div>` : ''}`
    : '<div class="vazio">Nenhuma emissão com origem e destino neste período.</div>'}`;
  el.querySelector('#acvPer').onclick = (e) => { const b = e.target.closest('button'); if (b) { ACV_PER = b.dataset.p; destinos(el, X); } };
  if (L.length) desenharMapa(topT, topC);
}

function carregarLeaflet() {
  if (window.L) return Promise.resolve();
  return new Promise((ok, erro) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = ok; s.onerror = erro; document.head.appendChild(s);
  });
}
async function desenharMapa(topT, topC) {
  try { await carregarLeaflet(); } catch (_) { const m = document.getElementById('acvMapa'); if (m) m.innerHTML = '<div class="vazio">O mapa não carregou. Verifique a internet.</div>'; return; }
  const box = document.getElementById('acvMapa'); if (!box) return;
  if (MAPA) { MAPA.remove(); MAPA = null; }
  const L = window.L;
  MAPA = L.map(box, { zoomControl: false, attributionControl: true, worldCopyJump: true, scrollWheelZoom: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 10, attribution: '© OpenStreetMap © CARTO' }).addTo(MAPA);
  const verde = '#1B4332', ouro = '#A88B4A', pts = [];
  const maxT = Math.max(1, ...topT.map(([, x]) => x.n));
  topT.filter(([, x]) => x.o.lat !== null && x.d.lat !== null).slice(0, 40).forEach(([, x]) => {
    const a = [x.o.lat, x.o.lon], b = [x.d.lat, x.d.lon];
    let lon2 = b[1]; if (Math.abs(lon2 - a[1]) > 180) lon2 += lon2 < a[1] ? 360 : -360;
    const m = [(a[0] + b[0]) / 2, (a[1] + lon2) / 2], dx = lon2 - a[1], dy = b[0] - a[0], k = 0.18;
    const c = [m[0] + dx * k, m[1] - dy * k], arco = [];
    for (let t = 0; t <= 1.0001; t += 0.05) arco.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * lon2]);
    L.polyline(arco, { color: verde, weight: 1 + 2.5 * x.n / maxT, opacity: 0.25 + 0.5 * x.n / maxT }).addTo(MAPA);
  });
  const maxC = Math.max(1, ...topC.map(([, x]) => x.n));
  topC.filter(([, x]) => x.d.lat !== null).forEach(([k, x]) => {
    pts.push([x.d.lat, x.d.lon]);
    L.circleMarker([x.d.lat, x.d.lon], { radius: 4 + 10 * Math.sqrt(x.n / maxC), color: '#fff', weight: 1.5, fillColor: ouro, fillOpacity: 0.9 })
      .bindTooltip(`${k}: ${x.n} ${x.n === 1 ? 'emissão' : 'emissões'}`, { direction: 'top' }).addTo(MAPA);
  });
  if (pts.length) MAPA.fitBounds(pts, { padding: [24, 24], maxZoom: 5 }); else MAPA.setView([-15, -47], 3);
}

/* ================= roteiros ================= */
async function roteiros(el, X) {
  const { sb, esc, aviso, campo, aba } = X;
  if (!RT) {
    const r = await sb.from('roteiros').select('*').order('criado_em', { ascending: false });
    if (aba() !== 'acervo' || ACV_ABA !== 'roteiros') return;
    if (r.error) { el.innerHTML = '<div class="vazio">Rode o 33-acervo-roteiros.sql no Supabase para ativar.</div>'; return; }
    RT = r.data || [];
  }
  const L = RT.filter(x => RT_TIPO === 'todos' || x.tipo === RT_TIPO).filter(x => !RT_BUSCA || sem([x.titulo, x.destino, x.cliente, x.perfil].join(' ')).includes(sem(RT_BUSCA)));
  const porDest = {}; RT.forEach(x => { if (x.destino) porDest[x.destino] = (porDest[x.destino] || 0) + 1; });
  el.innerHTML = `
    <div class="sub" style="margin-top:10px">${RT.length} ${RT.length === 1 ? 'arquivo guardado' : 'arquivos guardados'} · só você e o Matheus veem.</div>
    <input class="busca" id="rtBusca" type="search" placeholder="Buscar por destino, cliente ou perfil" value="${esc(RT_BUSCA)}" style="margin-top:10px">
    <div class="chips" id="rtTipo" style="margin-top:8px">${[['todos', 'Todos'], ['roteiro', 'Roteiros'], ['proposta', 'Propostas de voo']].map(([v, l]) => `<button data-t="${v}" class="${RT_TIPO === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${Object.keys(porDest).length > 1 ? `<div class="chips" id="rtDest" style="margin-top:4px">${Object.entries(porDest).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([d, n]) => `<button data-d="${esc(d)}">${esc(d)} · ${n}</button>`).join('')}</div>` : ''}
    <button class="zap grande" id="rtNovoB" style="margin-top:12px;width:100%">${RT_NOVO ? 'Fechar' : '+ Guardar roteiro ou proposta'}</button>
    <div id="rtForm"></div>
    <div class="lista">${L.length ? L.map(x => `<article class="card">
      <div class="cab"><div><div class="nome">${esc(x.titulo)}</div><span class="tag ${x.tipo === 'roteiro' ? 'ouro' : ''}">${x.tipo === 'roteiro' ? 'Roteiro' : 'Proposta de voo'}</span>${x.perfil ? ` <span class="tag">${esc(x.perfil)}</span>` : ''}</div><span class="quando">${x.data_viagem ? new Date(x.data_viagem + 'T12:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : ''}</span></div>
      <div class="info">${[['Destino', x.destino], ['Cliente', x.cliente], ['Duração', x.dias ? x.dias + (x.dias === 1 ? ' dia' : ' dias') : ''], ['Notas', x.observacoes]].filter(y => y[1]).map(([k, v]) => `<div><span>${k}:</span> ${esc(v)}</div>`).join('')}</div>
      <div class="acoes">${x.arquivo_path ? `<button class="zap" data-ver="${x.id}">Abrir</button><button class="sec" data-baixar="${x.id}">Baixar cópia</button>` : ''}${x.link ? `<a class="${x.arquivo_path ? 'sec' : 'zap'}" href="${esc(x.link)}" target="_blank" rel="noopener">Abrir link</a>` : ''}<button class="sec" data-rm="${x.id}">Excluir</button></div>
    </article>`).join('') : `<div class="vazio">${RT.length ? 'Nada encontrado com esse filtro.' : 'Nenhum roteiro guardado ainda. Comece pelos que vocês mais repetem.'}</div>`}</div>`;
  const busca = el.querySelector('#rtBusca');
  busca.oninput = () => { RT_BUSCA = busca.value; clearTimeout(roteiros.t); roteiros.t = setTimeout(() => { roteiros(el, X).then(() => { const b = el.querySelector('#rtBusca'); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }); }, 300); };
  el.querySelector('#rtTipo').onclick = (e) => { const b = e.target.closest('button'); if (b) { RT_TIPO = b.dataset.t; roteiros(el, X); } };
  if (el.querySelector('#rtDest')) el.querySelector('#rtDest').onclick = (e) => { const b = e.target.closest('button'); if (b) { RT_BUSCA = b.dataset.d; roteiros(el, X); } };
  el.querySelector('#rtNovoB').onclick = () => { RT_NOVO = !RT_NOVO; roteiros(el, X); };
  if (RT_NOVO) formRoteiro(el, X);
  const achar = (id) => RT.find(x => String(x.id) === String(id));
  el.querySelectorAll('[data-ver]').forEach(b => b.onclick = async () => {
    const x = achar(b.dataset.ver), w = window.open('', '_blank');
    const { data, error } = await sb.storage.from('roteiros').download(x.arquivo_path);
    if (error) { if (w) w.close(); aviso('Não abriu: ' + error.message); return; }
    const html = await data.text();
    if (w) { w.document.open(); w.document.write(html); w.document.close(); } else aviso('Libere as janelas novas para abrir o roteiro.');
  });
  el.querySelectorAll('[data-baixar]').forEach(b => b.onclick = async () => {
    const x = achar(b.dataset.baixar);
    const { data, error } = await sb.storage.from('roteiros').download(x.arquivo_path);
    if (error) { aviso('Não baixou: ' + error.message); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([await data.text()], { type: 'text/html' })); a.download = x.arquivo_path.split('/').pop().replace(/^\d+-/, ''); document.body.appendChild(a); a.click(); a.remove();
  });
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
    const x = achar(b.dataset.rm);
    if (CONF !== 'rt' + x.id) { CONF = 'rt' + x.id; b.textContent = 'Toque de novo'; return; }
    CONF = null;
    if (x.arquivo_path) await sb.storage.from('roteiros').remove([x.arquivo_path]);
    const { error } = await sb.from('roteiros').delete().eq('id', x.id);
    if (error) { aviso('Não excluiu: ' + error.message); return; }
    RT = RT.filter(y => y.id !== x.id); aviso('Excluído.'); roteiros(el, X);
  });
}
function formRoteiro(el, X) {
  const { sb, esc, aviso, campo } = X;
  const box = el.querySelector('#rtForm');
  box.innerHTML = `<form class="bloco form" id="fRt">
    <label class="fl"><span>Tipo</span><select name="tipo"><option value="roteiro">Roteiro</option><option value="proposta">Proposta de voo</option></select></label>
    ${campo('titulo', 'Título', '', 'text', 'required placeholder="Ex.: Lua de mel em Portugal, 12 dias"')}
    <div class="duas-col">${campo('destino', 'Destino principal', '', 'text', 'required placeholder="Ex.: Lisboa"')}${campo('cliente', 'Cliente', '', 'text')}</div>
    <div class="duas-col">${campo('data_viagem', 'Data da viagem', '', 'date')}${campo('dias', 'Dias', '', 'number')}</div>
    <label class="fl"><span>Perfil da viagem</span><select name="perfil"><option value="">-</option>${PERFIS.map(p => `<option>${p}</option>`).join('')}</select></label>
    <label class="fl"><span>Arquivo HTML</span><input type="file" name="arquivo" accept=".html,.htm"></label>
    ${campo('link', 'Ou o link do Netlify', '', 'url', 'placeholder="https://"')}
    <label class="fl"><span>Notas</span><textarea name="observacoes" rows="2" placeholder="Ex.: cliente amou o jantar no dia 3; trocar o hotel de Sintra"></textarea></label>
    <button class="zap" type="submit" id="rtSalvar" style="margin-top:10px;width:100%">Guardar no acervo</button>
    <div class="sub">Guarde o arquivo HTML sempre que puder: o link do Netlify pode sair do ar, o arquivo fica com vocês.</div></form>`;
  const f = box.querySelector('#fRt');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const g = (n) => f.elements[n].value.trim(), file = f.elements.arquivo.files[0];
    if (!file && !g('link')) { aviso('Envie o arquivo HTML ou cole o link.'); return; }
    if (file && file.size > 15 * 1024 * 1024) { aviso('Arquivo acima de 15 MB.'); return; }
    f.querySelector('#rtSalvar').disabled = true; f.querySelector('#rtSalvar').textContent = 'Guardando...';
    let path = null;
    if (file) {
      const nome = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '-').toLowerCase();
      path = `${new Date().getFullYear()}/${Date.now()}-${nome}`;
      const up = await sb.storage.from('roteiros').upload(path, file, { contentType: 'text/html', upsert: false });
      if (up.error) { f.querySelector('#rtSalvar').disabled = false; f.querySelector('#rtSalvar').textContent = 'Guardar no acervo'; aviso('Não enviou: ' + up.error.message); return; }
    }
    const row = { tipo: g('tipo'), titulo: g('titulo'), destino: g('destino') || null, cliente: g('cliente') || null, data_viagem: g('data_viagem') || null, dias: g('dias') ? parseInt(g('dias'), 10) : null, perfil: g('perfil') || null, link: g('link') || null, arquivo_path: path, observacoes: g('observacoes') || null };
    const { data, error } = await sb.from('roteiros').insert(row).select().single();
    if (error) { if (path) await sb.storage.from('roteiros').remove([path]); f.querySelector('#rtSalvar').disabled = false; f.querySelector('#rtSalvar').textContent = 'Guardar no acervo'; aviso('Não guardou: ' + error.message); return; }
    RT = [data].concat(RT || []); RT_NOVO = false; aviso('Guardado no acervo.'); roteiros(el, X);
  };
}
export function recarregar() { EMS = null; RT = null; }
