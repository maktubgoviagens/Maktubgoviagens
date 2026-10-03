// Maktub Go: ficha única de clientes (o CRM da Maktub).
// Cada pessoa existe uma vez; leads, atendimentos, reuniões, emissões, carteira da Gestão e
// indicações ficam pendurados na ficha. O vendedor é de cada venda, não do cliente.

const PAPEIS = { lead: 'Lead', cliente: 'Cliente', gestao: 'Gestão', passageiro: 'Passageiro', parceiro: 'Parceiro' };
const ORIGENS = ['Site', 'Indicação', 'Instagram', 'WhatsApp', 'Cliente antigo', 'Outro'];
let VISTA = 'lista', PID = null, BUSCA = '', FILTRO = 'todos', MSG = '';

const so = (t) => String(t || '').replace(/\D/g, '');
const tel = (t) => { const d = so(t); if (d.length < 10) return ''; return (d.length === 12 || d.length === 13) && d.startsWith('55') ? d.slice(2) : d; };
const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const idade = (nasc) => { if (!nasc) return null; const n = new Date(nasc + 'T12:00:00'), h = new Date(); let a = h.getFullYear() - n.getFullYear(); if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) a--; return a; };
const proxAniv = (nasc) => { if (!nasc) return null; const n = new Date(nasc + 'T12:00:00'), h = new Date(); h.setHours(0, 0, 0, 0); let d = new Date(h.getFullYear(), n.getMonth(), n.getDate()); if (d < h) d = new Date(h.getFullYear() + 1, n.getMonth(), n.getDate()); return d; };
const mascara = (cpf) => { const d = so(cpf); return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : '***'; };
const fmtCpf = (cpf) => { const d = so(cpf); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (cpf || ''); };

// ---------- dados que outras telas também usam ----------
export function pessoa(D, id) { return (D.pessoas || []).find(p => p.id === id) || null; }
export function emissoesDe(D, id) { return (D.emissoes || []).filter(e => e.pessoa_id === id || (D.passageiros || []).some(x => x.emissao_id === e.id && x.pessoa_id === id)); }
export function resumo(D, id) {
  const em = (D.emissoes || []).filter(e => e.pessoa_id === id);
  const total = em.reduce((s, e) => s + (Number(e.valor_receber) || 0), 0);
  const datas = em.map(e => e.data_ida || e.data_negociacao).filter(Boolean).sort();
  return { n: em.length, total, ticket: em.length ? total / em.length : 0, ultima: datas[datas.length - 1] || null };
}
// aniversários e documentos vencendo, para a Agenda e o Início
export function eventos(D, dias = 120) {
  const E = [], h = new Date(); h.setHours(0, 0, 0, 0);
  (D.pessoas || []).forEach(p => {
    const a = proxAniv(p.nascimento);
    if (a && (a - h) / 864e5 <= dias) E.push({ d: a, ic: 'aniv', t: `Aniversário: ${p.nome}`, s: `${idade(p.nascimento) + ((a - h) / 864e5 === 0 ? 0 : 1)} anos${p.celular ? ' · mande uma mensagem' : ''}`, pid: p.id, aniv: true });
  });
  (D.docs || []).forEach(d => {
    const p = pessoa(D, d.pessoa_id); if (!p) return;
    [['passaporte_validade', 'Passaporte vence'], ['visto_validade', 'Visto vence']].forEach(([k, l]) => {
      if (!d[k]) return; const v = new Date(d[k] + 'T00:00:00'), x = (v - h) / 864e5;
      if (x >= -1 && x <= 180) E.push({ d: v, ic: 'doc', alerta: x <= 60, t: `${l}: ${p.nome}`, s: 'Avise o cliente antes da próxima viagem', pid: p.id });
    });
  });
  return E;
}

// ---------- tela ----------
export function abrir(id) { PID = id; VISTA = id ? 'ficha' : 'lista'; }
export function rota(h) { if (h[1] === 'nova') { VISTA = 'nova'; PID = null; } else if (h[1] === 'duplicadas') { VISTA = 'dups'; PID = null; } else if (h[1]) { VISTA = h[2] === 'editar' ? 'editar' : 'ficha'; PID = h[1]; } else { VISTA = 'lista'; PID = null; } }

export function telaCRM(P, X) {
  const { D } = X;
  if (D.pessoas === null) {
    P.innerHTML = `<h1 class="titulo">Clientes</h1><div class="config" style="margin-top:12px">A ficha única ainda não foi ativada no Supabase. Rode o <b>30-ficha-unica.sql</b> do guia.</div>`;
    return;
  }
  if (VISTA === 'dups') return telaDups(P, X);
  if (VISTA === 'nova' || VISTA === 'editar') return telaForm(P, X);
  if (VISTA === 'ficha' && PID) return telaFicha(P, X);
  return telaLista(P, X);
}

function ir(X, v, id) { VISTA = v; PID = id || null; MSG = ''; const h = v === 'lista' ? '#crm' : v === 'nova' ? '#crm/nova' : v === 'dups' ? '#crm/duplicadas' : `#crm/${id}${v === 'editar' ? '/editar' : ''}`; history.pushState(null, '', h); telaCRM(X.$('pagina'), X); scrollTo(0, 0); }

function telaLista(P, X) {
  const { D, $, esc, brlC, ADMIN } = X;
  const todas = D.pessoas || [];
  const mesAtual = new Date().getMonth();
  const filtros = [['todos', 'Todos'], ['cliente', 'Clientes'], ['gestao', 'Gestão'], ['lead', 'Leads'], ['parceiro', 'Parceiros'], ['aniv', 'Aniversário no mês']];
  const q = norm(BUSCA), qd = so(BUSCA);
  const lista = todas.filter(p => FILTRO === 'todos' ? true : FILTRO === 'aniv' ? p.nascimento && new Date(p.nascimento + 'T12:00:00').getMonth() === mesAtual : (p.papeis || []).includes(FILTRO))
    .filter(p => !q || norm(p.nome).includes(q) || (qd.length >= 4 && so(p.celular).includes(qd)) || norm(p.email).includes(q))
    .map(p => ({ p, r: resumo(D, p.id) }))
    .sort((a, b) => FILTRO === 'aniv' ? new Date(a.p.nascimento).getDate() - new Date(b.p.nascimento).getDate() : b.r.total - a.r.total || a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
  const dups = (D.dups || []).length;
  P.innerHTML = `
    <h1 class="titulo">Clientes</h1>
    <div class="sub">${todas.length} fichas · ${todas.filter(p => (p.papeis || []).includes('cliente')).length} clientes · ${todas.filter(p => (p.papeis || []).includes('gestao')).length} na Gestão</div>
    ${ADMIN && dups ? `<button class="sec grande" id="irDups" style="margin-top:12px;width:100%">${dups === 1 ? '1 possível ficha duplicada' : dups + ' possíveis fichas duplicadas'} para confirmar ›</button>` : ''}
    <button class="zap grande" id="novaP" style="margin-top:10px;width:100%">+ Novo contato</button>
    <input class="busca" id="buscaP" type="search" placeholder="Buscar por nome, telefone ou e-mail" value="${esc(BUSCA)}">
    <div class="chips" id="filP" style="margin-top:10px">${filtros.map(([k, l]) => `<button data-f="${k}" class="${k === FILTRO ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="lista">${lista.length ? lista.slice(0, 300).map(({ p, r }) => `
      <button class="cli" data-p="${p.id}"><div><div class="nome">${esc(p.nome)}</div>
        <div class="meta">${(p.papeis || []).map(k => PAPEIS[k]).filter(Boolean).join(' · ') || 'Contato'}${p.celular ? ' · ' + esc(p.celular) : ''}${FILTRO === 'aniv' && p.nascimento ? ' · faz ' + (idade(p.nascimento) + 1) + ' em ' + new Date(p.nascimento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}</div></div>
        <div class="val">${r.n ? `<b>${brlC(r.total)}</b><span>${r.n} ${r.n === 1 ? 'emissão' : 'emissões'}</span>` : ''}</div></button>`).join('') : `<div class="vazio">${BUSCA ? 'Ninguém encontrado. Toque em Novo contato para cadastrar.' : 'Nenhuma ficha neste filtro.'}</div>`}</div>
    ${lista.length > 300 ? '<div class="sub">Mostrando as 300 primeiras. Use a busca para achar as demais.</div>' : ''}
    <div class="sub">Valores pelas emissões registradas no app.</div>`;
  $('buscaP').oninput = (e) => { BUSCA = e.target.value; const pos = e.target.selectionStart; telaLista(P, X); $('buscaP').focus(); $('buscaP').setSelectionRange(pos, pos); };
  $('filP').onclick = (e) => { const b = e.target.closest('button'); if (b) { FILTRO = b.dataset.f; telaLista(P, X); } };
  $('novaP').onclick = () => ir(X, 'nova');
  if ($('irDups')) $('irDups').onclick = () => ir(X, 'dups');
  P.querySelectorAll('[data-p]').forEach(b => b.onclick = () => ir(X, 'ficha', b.dataset.p));
}

function linhaTempo(D, X, p) {
  const { esc, brl2, nomeTime } = X, L = [];
  (D.leads || []).filter(l => l.pessoa_id === p.id).forEach(l => L.push({ d: l.created_at, t: 'Pedido pelo site', s: [l.produto, l.tipo, l.destino].filter(Boolean).join(' · ') }));
  (D.reunioes || []).filter(r => r.pessoa_id === p.id).forEach(r => L.push({ d: r.data, t: `${r.tipo || 'Atendimento'} · ${r.resultado === 'Em andamento' ? (r.etapa || 'em andamento') : r.resultado}`, s: [r.trecho || r.produto, r.valor_fechado ? brl2(r.valor_fechado) : r.valor_estimado ? 'cotado ' + brl2(r.valor_estimado) : '', r.responsavel_id ? 'por ' + nomeTime(r.responsavel_id) : ''].filter(Boolean).join(' · '), at: r.id }));
  (D.agenda || []).filter(a => a.pessoa_id === p.id).forEach(a => L.push({ d: a.data, t: `Reunião · ${a.status || ''}`, s: a.titulo || '', ag: a.id }));
  emissoesDe(D, p.id).forEach(e => L.push({ d: e.data_negociacao, t: `Emissão · ${[e.origem, e.destino].filter(Boolean).join(' → ') || e.servico || ''}`, s: [e.pessoa_id === p.id ? brl2(e.valor_receber) : 'como passageiro', e.data_ida ? 'ida ' + new Date(e.data_ida + 'T12:00:00').toLocaleDateString('pt-BR') : '', e.vendedor_id ? 'por ' + nomeTime(e.vendedor_id) : '', e.pessoa_id === p.id && e.pago === false ? 'a receber' : ''].filter(Boolean).join(' · '), em: e.id }));
  L.sort((a, b) => String(b.d || '').localeCompare(String(a.d || '')));
  return L.length ? L.slice(0, 60).map(x => `<button class="lin" ${x.at ? `data-at="${x.at}"` : x.ag ? `data-ag="${x.ag}"` : x.em ? `data-em="${x.em}"` : ''} style="display:block;padding:10px 0;text-align:left;width:100%">
      <span style="display:flex;justify-content:space-between;gap:8px"><b style="font-weight:600;color:var(--verde)">${esc(x.t)}</b><small style="color:var(--tinta-3);white-space:nowrap">${x.d ? new Date(String(x.d).length === 10 ? x.d + 'T12:00:00' : x.d).toLocaleDateString('pt-BR') : ''}</small></span>
      ${x.s ? `<span style="display:block;color:var(--tinta-2);white-space:normal;margin-top:2px">${esc(x.s)}</span>` : ''}</button>`).join('')
    : '<div class="vazio">Nada registrado ainda. Use os botões acima para lançar.</div>';
}

function telaFicha(P, X) {
  const { D, $, esc, brlC, brl2, zapLink, pode, ADMIN } = X;
  const p = pessoa(D, PID);
  if (!p) { VISTA = 'lista'; return telaLista(P, X); }
  const r = resumo(D, p.id), doc = (D.docs || []).find(d => d.pessoa_id === p.id), verDocs = pode('emissoes');
  const vinc = (D.vinculos || []).filter(v => v.pessoa_a === p.id || v.pessoa_b === p.id).map(v => ({ v, o: pessoa(D, v.pessoa_a === p.id ? v.pessoa_b : v.pessoa_a) })).filter(x => x.o);
  const ind = p.indicado_por ? pessoa(D, p.indicado_por) : null;
  const indicou = (D.pessoas || []).filter(x => x.indicado_por === p.id);
  const parc = p.parceiro_ref ? (D.parcAdm || D.parc || []).find(x => x.id === p.parceiro_ref) : null;
  const aniv = proxAniv(p.nascimento), hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diasAniv = aniv ? Math.round((aniv - hoje) / 864e5) : null;
  const primeiro = String(p.nome).split(' ')[0];
  const zap = p.celular ? zapLink(p.celular, p.nome, diasAniv === 0 ? `Oi, ${primeiro}! Feliz aniversário! Que o seu novo ano venha cheio de viagens incríveis. Um abraço do time Maktub Go.` : `Oi, ${primeiro}! Aqui é da Maktub Go.`) : '';
  const lin = (l, v) => v ? `<div class="lin"><span>${l}</span><span style="white-space:normal;text-align:right">${v}</span></div>` : '';
  const faltam = [!p.nascimento && 'nascimento', verDocs && !(doc && doc.cpf) && 'CPF'].filter(Boolean);
  P.innerHTML = `
    <button class="voltar" id="voltar">‹ Clientes</button>
    <h1 class="titulo" style="margin-top:6px">${esc(p.nome)}</h1>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${(p.papeis || []).map(k => `<span class="tag ${k === 'gestao' ? 'ouro' : k === 'cliente' ? 'ok' : ''}">${PAPEIS[k] || k}</span>`).join('')}${diasAniv !== null && diasAniv <= 7 ? `<span class="tag alerta">${diasAniv === 0 ? 'Aniversário hoje' : 'Aniversário em ' + diasAniv + (diasAniv === 1 ? ' dia' : ' dias')}</span>` : ''}</div>
    <div class="botoes4" style="margin-top:12px">
      ${zap ? `<a class="zap" href="${esc(zap)}" target="_blank" rel="noopener">${X.ZAP}WhatsApp</a>` : ''}
      <button class="sec" id="novaCot">Nova cotação</button>
      <button class="sec" id="linkCad">Link de cadastro</button>
      <button class="sec" id="editarP">Editar</button>
    </div>
    ${MSG ? `<div class="config" style="margin-top:10px">${MSG}</div>` : ''}
    ${faltam.length ? `<div class="sub" style="color:var(--alerta)">Falta ${faltam.join(' e ')} para emitir. Mande o link de cadastro para o cliente preencher.</div>` : ''}
    <div class="numeros" style="margin-top:12px">
      <div class="num destaque"><div class="l">Investimento</div><div class="v">${brlC(r.total)}</div><div class="d">${r.n} ${r.n === 1 ? 'emissão' : 'emissões'}</div></div>
      <div class="num"><div class="l">Ticket médio</div><div class="v">${r.n ? brlC(r.ticket) : '-'}</div><div class="d">por emissão</div></div>
    </div>
    ${p.cliente_id && pode('gestao') ? `<button class="sec grande" id="irGestao" style="margin-top:10px;width:100%">Abrir carteira da Gestão de Milhas ›</button>` : ''}
    <section class="bloco"><h2>Contato</h2>
      ${lin('Celular', esc(p.celular))}${lin('E-mail', esc(p.email))}${lin('Instagram', esc(p.instagram))}
      ${lin('Aceita comunicação', p.aceita_comunicacao ? 'Sim' : 'Não informado')}
      ${!p.celular && !p.email ? '<div class="vazio">Sem contato cadastrado.</div>' : ''}
    </section>
    <section class="bloco"><h2>Para emitir</h2>
      ${lin('Nascimento', p.nascimento ? new Date(p.nascimento + 'T12:00:00').toLocaleDateString('pt-BR') + ` (${idade(p.nascimento)} anos)` : '<span style="color:var(--alerta)">falta</span>')}
      ${lin('Sexo', { F: 'Feminino', M: 'Masculino', N: 'Prefere não informar' }[p.sexo] || '')}
      ${verDocs ? `${lin('CPF', doc && doc.cpf ? esc(fmtCpf(doc.cpf)) : '<span style="color:var(--alerta)">falta</span>')}
        ${doc && doc.passaporte ? lin('Passaporte', esc(doc.passaporte) + (doc.passaporte_validade ? ' · vence ' + new Date(doc.passaporte_validade + 'T12:00:00').toLocaleDateString('pt-BR') : '')) : ''}
        ${doc ? lin('Nacionalidade', esc(doc.nacionalidade)) : ''}
        ${doc && doc.visto ? lin('Visto', esc(doc.visto) + (doc.visto_validade ? ' · vence ' + new Date(doc.visto_validade + 'T12:00:00').toLocaleDateString('pt-BR') : '')) : ''}`
      : lin('Documentos', p.tem_documentos ? 'Cadastrados (visíveis para quem emite)' : 'Não cadastrados')}
    </section>
    <section class="bloco"><h2>Como chegou</h2>
      ${lin('Origem', esc(p.origem) || 'Não informado')}
      ${ind ? `<button class="lin" data-p="${ind.id}" style="width:100%"><span>Indicado por</span><span>${esc(ind.nome)} ›</span></button>` : ''}
      ${indicou.length ? `<div class="lin"><span>Indicou</span><span>${indicou.length} ${indicou.length === 1 ? 'pessoa' : 'pessoas'}</span></div>${indicou.map(x => `<button class="lin" data-p="${x.id}" style="width:100%"><span></span><span>${esc(x.nome)} ›</span></button>`).join('')}` : ''}
      ${parc ? lin('Parceiro', `${Number(parc.pct || 0).toLocaleString('pt-BR')}% de repasse${parc.ativo === false ? ' · inativo' : ''}`) + (verDocs && doc && doc.parceiro_pix ? lin('Pix', esc(doc.parceiro_pix)) : '') : ''}
    </section>
    <section class="bloco"><h2>Família e acompanhantes</h2>
      ${vinc.map(({ v, o }) => `<div class="lin"><button data-p="${o.id}" style="text-align:left;color:var(--verde);font-weight:600;background:none;border:0;padding:0;font:inherit;cursor:pointer">${esc(o.nome)} ›</button><span>${v.tipo === 'familia' ? 'Família' : 'Viaja junto'} <button class="mini" data-desv="${v.pessoa_a}|${v.pessoa_b}" aria-label="Remover vínculo" style="margin-left:8px;color:var(--tinta-3);background:none;border:0;font-size:18px;line-height:1;cursor:pointer">×</button></span></div>`).join('') || '<div class="vazio">Ninguém vinculado.</div>'}
      <form id="fVinc" class="form" autocomplete="off" style="margin-top:8px">
        <label class="fl"><span>Vincular pessoa</span><input name="nome" list="dlVinc" placeholder="Digite o nome"></label>
        <datalist id="dlVinc">${(D.pessoas || []).filter(o => o.id !== p.id && !vinc.some(x => x.o.id === o.id)).slice(0, 1500).map(o => `<option value="${esc(o.nome)}">`).join('')}</datalist>
        <div class="seg" id="vTipo" style="margin-top:6px"><button type="button" data-v="familia" class="on">Família</button><button type="button" data-v="viaja_com">Viaja junto</button></div>
        <button class="sec" type="submit" style="margin-top:8px;width:100%">Vincular</button>
        <div class="sub">Se a pessoa ainda não tem ficha, ela é criada como passageira.</div>
      </form>
    </section>
    <section class="bloco"><h2>Linha do tempo</h2>${linhaTempo(D, X, p)}</section>
    ${p.observacoes ? `<section class="bloco"><h2>Anotações</h2><div style="white-space:pre-wrap;color:var(--tinta-2)">${esc(p.observacoes)}</div></section>` : ''}
    ${ADMIN ? '<button class="sec grande" id="excluirP" style="margin-top:14px;width:100%">Excluir ficha</button>' : ''}`;
  $('voltar').onclick = () => ir(X, 'lista');
  $('editarP').onclick = () => ir(X, 'editar', p.id);
  $('novaCot').onclick = () => X.novaCotacao({ cliente: p.nome, contato: p.celular || p.email || '', pessoa_id: p.id, origem: p.origem || '' });
  $('linkCad').onclick = () => gerarLink(P, X, p);
  if ($('irGestao')) $('irGestao').onclick = () => X.abrirFicha(p.cliente_id);
  P.querySelectorAll('[data-p]').forEach(b => b.onclick = () => ir(X, 'ficha', b.dataset.p));
  P.querySelectorAll('[data-at]').forEach(b => b.onclick = () => X.abrirAtendimento(b.dataset.at));
  P.querySelectorAll('[data-ag]').forEach(b => b.onclick = () => X.abrirReuniao(b.dataset.ag));
  P.querySelectorAll('[data-em]').forEach(b => b.onclick = () => { location.hash = '#emissoes/' + b.dataset.em; });
  let tipo = 'familia';
  $('vTipo').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; tipo = b.dataset.v; [...$('vTipo').children].forEach(x => x.classList.toggle('on', x === b)); };
  P.querySelectorAll('[data-desv]').forEach(b => b.onclick = async () => {
    const [a, c] = b.dataset.desv.split('|');
    const { error } = await X.sb.from('pessoas_vinculos').delete().eq('pessoa_a', a).eq('pessoa_b', c);
    if (error) return X.aviso('Não removeu: ' + error.message);
    D.vinculos = D.vinculos.filter(v => !(v.pessoa_a === a && v.pessoa_b === c)); telaFicha(P, X);
  });
  $('fVinc').onsubmit = async (ev) => {
    ev.preventDefault();
    const nome = ev.target.elements.nome.value.trim(); if (!nome) return;
    let o = (D.pessoas || []).find(x => x.id !== p.id && norm(x.nome) === norm(nome));
    if (!o) {
      const ins = await X.sb.from('pessoas').insert({ nome, papeis: ['passageiro'] }).select().single();
      if (ins.error) return X.aviso('Não criou a ficha: ' + ins.error.message);
      o = ins.data; D.pessoas.push(o);
    }
    const [a, c] = [p.id, o.id].sort();
    const { data, error } = await X.sb.from('pessoas_vinculos').upsert({ pessoa_a: a, pessoa_b: c, tipo }).select().single();
    if (error) return X.aviso('Não vinculou: ' + error.message);
    D.vinculos = (D.vinculos || []).filter(v => !(v.pessoa_a === a && v.pessoa_b === c)).concat(data);
    X.aviso('Vinculado.'); telaFicha(P, X);
  };
  if ($('excluirP')) $('excluirP').onclick = async () => {
    const usos = (D.emissoes || []).filter(e => e.pessoa_id === p.id).length + (D.reunioes || []).filter(r => r.pessoa_id === p.id).length;
    if (p.cliente_id || p.parceiro_ref) return X.aviso('Esta ficha tem conta da Gestão ou cadastro de parceiro. Use "juntar fichas" em vez de excluir.');
    if (!confirm(usos ? `Excluir a ficha de ${p.nome}? As ${usos} vendas e atendimentos continuam no app, só deixam de estar ligados a ela.` : `Excluir a ficha de ${p.nome}?`)) return;
    const { error } = await X.sb.from('pessoas').delete().eq('id', p.id);
    if (error) return X.aviso('Não excluiu: ' + error.message);
    D.pessoas = D.pessoas.filter(x => x.id !== p.id); X.aviso('Ficha excluída.'); ir(X, 'lista');
  };
}

async function gerarLink(P, X, p) {
  const { data, error } = await X.sb.rpc('cadastro_link', { p_pessoa: p.id });
  if (error) { X.aviso('Link não gerado: ' + error.message); return; }
  const url = `${location.origin}/cadastro/?c=${data}`;
  const primeiro = String(p.nome).split(' ')[0];
  const texto = `Oi, ${primeiro}! Para deixarmos tudo pronto para a emissão, preencha seus dados neste link seguro. Leva 2 minutos: ${url}`;
  const zap = p.celular ? X.zapLink(p.celular, p.nome, texto) : '';
  MSG = `Link de cadastro pronto, válido por 30 dias.<br>${zap ? `<a class="zap" href="${X.esc(zap)}" target="_blank" rel="noopener" style="margin-top:8px;display:inline-flex">${X.ZAP}Enviar pelo WhatsApp</a> ` : ''}<button class="sec" id="copiarLink" style="margin-top:8px">Copiar link</button>`;
  telaFicha(P, X);
  X.$('copiarLink').onclick = async () => { try { await navigator.clipboard.writeText(texto); X.aviso('Mensagem com o link copiada.'); } catch (_) { prompt('Copie o link:', url); } };
}

function telaForm(P, X) {
  const { D, $, esc, campo, pode } = X;
  const nova = VISTA === 'nova';
  const p = nova ? { nome: BUSCA && !/\d{4}/.test(BUSCA) ? BUSCA : '', celular: /\d{8}/.test(so(BUSCA)) ? BUSCA : '', papeis: ['lead'] } : pessoa(D, PID);
  if (!p) return ir(X, 'lista');
  const doc = nova ? {} : ((D.docs || []).find(d => d.pessoa_id === p.id) || {});
  const verDocs = pode('emissoes');
  const parceiros = (D.pessoas || []).filter(o => o.id !== p.id && (o.papeis || []).includes('parceiro'));
  const outros = (D.pessoas || []).filter(o => o.id !== p.id);
  const ind = p.indicado_por ? pessoa(D, p.indicado_por) : null;
  P.innerHTML = `
    <button class="voltar" id="voltar">‹ ${nova ? 'Clientes' : esc(p.nome)}</button>
    <h1 class="titulo" style="margin-top:6px">${nova ? 'Novo <em>contato</em>' : 'Editar <em>ficha</em>'}</h1>
    <form id="fP" class="form" autocomplete="off">
      <div class="grupo">Quem é</div>
      ${campo('nome', 'Nome completo, como no documento', p.nome, 'text', 'required')}
      ${campo('celular', 'Celular com DDD', p.celular, 'tel', 'inputmode="tel"')}
      <div class="sub" id="dupAviso" hidden></div>
      <div class="grupo">Contato</div>
      ${campo('email', 'E-mail', p.email, 'email')}
      ${campo('instagram', 'Instagram', p.instagram, 'text', 'placeholder="@perfil"')}
      <label class="fc"><input type="checkbox" name="aceita_comunicacao" ${p.aceita_comunicacao ? 'checked' : ''}><span>Aceita receber novidades e convites da Maktub</span></label>
      <div class="grupo">Para emitir</div>
      ${campo('nascimento', 'Data de nascimento', p.nascimento, 'date')}
      <label class="fl"><span>Sexo</span><select name="sexo"><option value="">-</option>${[['F', 'Feminino'], ['M', 'Masculino'], ['N', 'Prefere não informar']].map(([v, l]) => `<option value="${v}" ${p.sexo === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${verDocs ? `${campo('cpf', 'CPF', doc.cpf ? fmtCpf(doc.cpf) : '', 'text', 'inputmode="numeric"')}
        <details ${doc.passaporte || doc.visto ? 'open' : ''} style="margin-top:8px"><summary style="color:var(--verde);font-weight:600;cursor:pointer">Viagem internacional</summary>
          ${campo('passaporte', 'Passaporte', doc.passaporte)}${campo('passaporte_validade', 'Validade do passaporte', doc.passaporte_validade, 'date')}
          ${campo('nacionalidade', 'Nacionalidade', doc.nacionalidade || '', 'text', 'placeholder="Brasileira"')}
          ${campo('visto', 'Visto', doc.visto, 'text', 'placeholder="Ex.: EUA B1/B2"')}${campo('visto_validade', 'Validade do visto', doc.visto_validade, 'date')}
        </details>` : '<div class="sub">CPF e passaporte ficam visíveis só para quem tem a permissão de emissão.</div>'}
      <div class="grupo">Como chegou</div>
      <label class="fl"><span>Origem</span><select name="origem"><option value="">-</option>${[...new Set([...ORIGENS, p.origem].filter(Boolean))].map(o => `<option ${norm(o) === norm(p.origem) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>
      <label class="fl"><span>Indicado por</span><input name="indicado" list="dlInd" value="${esc(ind ? ind.nome : '')}" placeholder="Nome de quem indicou"></label>
      <datalist id="dlInd">${[...parceiros, ...outros.filter(o => !parceiros.includes(o))].slice(0, 1500).map(o => `<option value="${esc(o.nome)}">`).join('')}</datalist>
      ${verDocs && (p.papeis || []).includes('parceiro') ? campo('parceiro_pix', 'Chave Pix do parceiro', doc.parceiro_pix) : ''}
      <div class="grupo">Papéis</div>
      <div class="chips" id="papeis" style="flex-wrap:wrap">${Object.entries(PAPEIS).filter(([k]) => k !== 'gestao' && k !== 'parceiro').map(([k, l]) => `<button type="button" data-k="${k}" class="${(p.papeis || []).includes(k) ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="sub">Gestão e Parceiro são marcados pelo app quando a pessoa entra na Gestão ou é cadastrada como parceira.</div>
      <label class="fl"><span>Anotações</span><textarea name="observacoes" rows="3">${esc(p.observacoes || '')}</textarea></label>
      <button class="zap grande" type="submit" id="salvarP" style="margin-top:14px;width:100%">${nova ? 'Cadastrar' : 'Salvar'}</button>
      <div class="sub" id="msgP"></div>
    </form>`;
  const f = $('fP');
  const papeis = new Set(p.papeis || []);
  $('papeis').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k; papeis.has(k) ? papeis.delete(k) : papeis.add(k); b.classList.toggle('on', papeis.has(k)); };
  $('voltar').onclick = () => nova ? ir(X, 'lista') : ir(X, 'ficha', p.id);
  // avisa na hora se a pessoa já tem ficha
  const checar = () => {
    const t = tel(f.elements.celular.value), em = norm(f.elements.email.value), cp = f.elements.cpf ? so(f.elements.cpf.value) : '';
    const o = (D.pessoas || []).find(x => x.id !== p.id && ((t && tel(x.celular) === t) || (em && norm(x.email) === em) || (cp.length === 11 && (D.docs || []).some(d => d.pessoa_id === x.id && so(d.cpf) === cp))));
    $('dupAviso').hidden = !o;
    if (o) { $('dupAviso').innerHTML = `<span style="color:var(--alerta)">Já existe uma ficha com esse contato: <button type="button" id="abrirDup" style="color:var(--verde);font-weight:600;text-decoration:underline">${esc(o.nome)}</button></span>`; $('abrirDup').onclick = () => ir(X, 'ficha', o.id); }
    return o;
  };
  ['celular', 'email', 'cpf'].forEach(n => { if (f.elements[n]) f.elements[n].onblur = checar; });
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const g = (n) => f.elements[n] ? f.elements[n].value.trim() : '';
    if (!g('nome')) return;
    if (nova && checar()) { $('msgP').textContent = 'Essa pessoa já tem ficha. Abra a ficha existente acima.'; return; }
    const cpf = so(g('cpf'));
    if (g('cpf') && cpf.length !== 11) { $('msgP').textContent = 'O CPF precisa ter 11 números.'; return; }
    const indN = norm(g('indicado')), indP = indN ? (D.pessoas || []).find(o => o.id !== p.id && norm(o.nome) === indN) : null;
    if (indN && !indP) { $('msgP').textContent = 'Quem indicou ainda não tem ficha. Cadastre essa pessoa primeiro ou deixe o campo em branco.'; return; }
    const row = { nome: g('nome').replace(/\s+/g, ' '), celular: g('celular') || null, email: g('email') || null, instagram: g('instagram') || null,
      aceita_comunicacao: f.elements.aceita_comunicacao.checked, nascimento: g('nascimento') || null, sexo: g('sexo') || null,
      origem: g('origem') || null, indicado_por: indP ? indP.id : null, observacoes: g('observacoes') || null,
      papeis: [...new Set([...papeis, ...(p.papeis || []).filter(k => k === 'gestao' || k === 'parceiro')])] };
    $('salvarP').disabled = true; $('msgP').textContent = 'Salvando...';
    const q = nova ? X.sb.from('pessoas').insert(row).select().single() : X.sb.from('pessoas').update(row).eq('id', p.id).select().single();
    const { data, error } = await q;
    if (error) { $('salvarP').disabled = false; $('msgP').textContent = 'Não salvou: ' + error.message; return; }
    if (verDocs) {
      const d = { pessoa_id: data.id, cpf: cpf ? fmtCpf(cpf) : null, passaporte: g('passaporte') || null, passaporte_validade: g('passaporte_validade') || null,
        nacionalidade: g('nacionalidade') || null, visto: g('visto') || null, visto_validade: g('visto_validade') || null };
      if (f.elements.parceiro_pix) d.parceiro_pix = g('parceiro_pix') || null;
      const temAlgo = Object.entries(d).some(([k, v]) => k !== 'pessoa_id' && v);
      if (temAlgo || (D.docs || []).some(x => x.pessoa_id === data.id)) {
        const r2 = await X.sb.from('pessoas_documentos').upsert(d).select().single();
        if (r2.error) X.aviso('A ficha foi salva, mas os documentos não: ' + r2.error.message);
        else { D.docs = (D.docs || []).filter(x => x.pessoa_id !== data.id).concat(r2.data); data.tem_documentos = !!(r2.data.cpf || r2.data.passaporte); }
      }
    }
    const i = D.pessoas.findIndex(x => x.id === data.id); if (i >= 0) D.pessoas[i] = data; else D.pessoas.push(data);
    X.aviso(nova ? 'Contato cadastrado.' : 'Ficha atualizada.');
    BUSCA = ''; ir(X, 'ficha', data.id);
  };
}

function telaDups(P, X) {
  const { D, $, esc, brlC } = X;
  const L = (D.dups || []).map(d => ({ d, a: pessoa(D, d.pessoa_a), b: pessoa(D, d.pessoa_b) })).filter(x => x.a && x.b);
  const usos = (p) => { const r = resumo(D, p.id); const at = (D.reunioes || []).filter(x => x.pessoa_id === p.id).length; return `${r.n} ${r.n === 1 ? 'emissão' : 'emissões'}${r.n ? ' · ' + brlC(r.total) : ''} · ${at} ${at === 1 ? 'atendimento' : 'atendimentos'}`; };
  const card = (p) => `<div style="flex:1;min-width:0"><b style="color:var(--verde)">${esc(p.nome)}</b><div class="meta" style="color:var(--tinta-2);font-size:13px;margin-top:4px">${esc(p.celular || 'sem celular')}<br>${esc(p.email || 'sem e-mail')}<br>${(p.papeis || []).map(k => PAPEIS[k]).join(', ')}<br>${usos(p)}</div></div>`;
  P.innerHTML = `
    <button class="voltar" id="voltar">‹ Clientes</button>
    <h1 class="titulo" style="margin-top:6px">Fichas <em>duplicadas</em></h1>
    <div class="sub">Mesmo nome, mas com telefone, e-mail ou CPF diferentes. Junte se for a mesma pessoa; se não for, marque como pessoas diferentes.</div>
    ${L.length ? L.map(({ d, a, b }) => `<section class="bloco">
      <div style="display:flex;gap:12px">${card(a)}${card(b)}</div>
      <div class="botoes4" style="margin-top:10px"><button class="zap" data-j="${d.id}|${a.id}|${b.id}">Juntar na primeira</button><button class="zap" data-j="${d.id}|${b.id}|${a.id}">Juntar na segunda</button><button class="sec" data-s="${d.id}" style="grid-column:1/-1">São pessoas diferentes</button></div>
    </section>`).join('') : '<div class="vazio" style="margin-top:14px">Nada para confirmar.</div>'}`;
  $('voltar').onclick = () => ir(X, 'lista');
  P.querySelectorAll('[data-j]').forEach(btn => btn.onclick = async () => {
    const [dup, manter, remover] = btn.dataset.j.split('|');
    if (!confirm('Juntar as duas fichas? Tudo o que está na outra passa para esta. Isso não pode ser desfeito.')) return;
    btn.disabled = true;
    const { error } = await X.sb.rpc('pessoas_juntar', { p_manter: manter, p_remover: remover });
    if (error) { btn.disabled = false; return X.aviso('Não juntou: ' + error.message); }
    X.aviso('Fichas juntadas.'); await X.recarregar(); ir(X, 'dups');
  });
  P.querySelectorAll('[data-s]').forEach(btn => btn.onclick = async () => {
    const { error } = await X.sb.rpc('pessoas_separar', { p_dup: btn.dataset.s });
    if (error) return X.aviso('Não salvou: ' + error.message);
    D.dups = D.dups.filter(x => x.id !== btn.dataset.s); telaDups(P, X);
  });
}
