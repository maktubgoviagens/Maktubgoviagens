// Maktub Go: compromissos do financeiro (só administradores).
// Salário + comissão de cada pessoa, com data para pagar, e despesas fixas com dia de vencimento.
// Regra combinada com o time: comissão sempre 50/50.
// 1ª metade: fechamento do mês da venda, paga no mês seguinte junto com o salário fixo.
// 2ª metade: fechamento do mês em que o cliente embarcou, paga no mês seguinte ao embarque.
// Venda ainda sem data de ida: a 2ª metade fica aguardando a data (não entra em nenhum pagamento).
// O pagamento sai no dia de pagamento da pessoa (padrão: dia 5).

// Primeiro mês controlado aqui. Até setembro/2026 tudo já foi pago (pagamento de 05/10/2026).
export const INICIO = '2026-10';

let C = null, ABERTO = null, CONF = null;

const r2 = (x) => Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100;
const mk = (s) => String(s || '').slice(0, 7);
const mesMais = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const ultimoDia = (k) => { const [y, m] = k.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const dataNoMes = (k, d) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, Math.min(d, ultimoDia(k))); };
const hoje0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const difDias = (d) => Math.round((d - hoje0()) / 864e5);
const nomeMes = (k) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }); };
const dd = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/* Parcelas de comissão de uma pessoa: em que mês trabalhado cada metade entra. */
export function parcelas(emissoes, uid) {
  const L = [];
  (emissoes || []).forEach(e => {
    if (e.vendedor_id !== uid) return;
    const c = Number(e.comissao) || 0; if (!c) return;
    const mv = mk(e.data_negociacao); if (!mv) return;
    const nome = e.comprador || e.produto || e.servico || 'Venda';
    const h1 = r2(c / 2), mi = mk(e.data_ida);
    L.push({ e, nome, comp: mv, valor: h1, tipo: '1ª metade, venda' });
    if (!e.data_ida) { L.push({ e, nome, comp: null, valor: r2(c - h1), tipo: '2ª metade aguardando a data de ida' }); return; }
    L.push({ e, nome, comp: mi > mv ? mi : mv, valor: r2(c - h1), tipo: '2ª metade, embarque ' + mi.split('-').reverse().join('/') });
  });
  return L;
}

/* Carrega salários, dias de pagamento, despesas fixas e o que já foi pago. */
export async function carregar(ctx) {
  const { sb } = ctx, atual = mk(new Date().toISOString());
  const [t, p, f, a] = await Promise.all([
    sb.rpc('compromissos_time', { p_ini: INICIO + '-01', p_fim: mesMais(atual, 4) + '-01' }),
    sb.from('pagamentos_feitos').select('*').order('pago_em', { ascending: false }).limit(500),
    sb.from('despesas_fixas').select('*'),
    sb.from('despesas').select('*').gte('mes', INICIO + '-01')
  ]);
  if (t.error || p.error) { C = { erro: (t.error || p.error).message }; return C; }
  C = { time: t.data || [], pagos: p.data || [], fixas: f.error ? [] : (f.data || []), avulsas: a.error ? [] : (a.data || []) };
  return C;
}

/* Lista de compromissos (pagos e a pagar) a partir do INICIO até alguns meses à frente. */
function montar(ctx) {
  const { D } = ctx, atual = mk(new Date().toISOString()), fim = mesMais(atual, 3);
  const pago = (tipo, ref, comp) => C.pagos.find(x => x.tipo === tipo && x.ref === ref && mk(x.competencia) === comp) || null;
  const pessoas = {};
  C.time.forEach(r => { (pessoas[r.user_id] = pessoas[r.user_id] || { id: r.user_id, nome: r.nome, dia: r.dia_pagamento || 5, fixo: {} }).fixo[mk(r.mes)] = Number(r.fixo) || 0; });
  const L = [];
  Object.values(pessoas).forEach(ps => {
    const par = parcelas(D.emissoes, ps.id);
    for (let k = INICIO; k <= fim; k = mesMais(k, 1)) {
      const itens = par.filter(x => x.comp === k), fixo = ps.fixo[k] || 0, com = r2(itens.reduce((a, x) => a + x.valor, 0));
      if (!fixo && !com) continue;
      L.push({ tipo: 'time', ref: ps.id, comp: k, titulo: ps.nome, desc: 'Salário e comissão de ' + nomeMes(k), venc: dataNoMes(mesMais(k, 1), ps.dia),
        valor: r2(fixo + com), fixo, com, itens, aberto: k >= atual, pago: pago('time', ps.id, k) });
    }
  });
  C.fixas.filter(x => x.dia_vencimento).forEach(x => {
    for (let k = INICIO; k <= mesMais(atual, 1); k = mesMais(k, 1)) {
      if (mk(x.desde) > k || (x.ate && mk(x.ate) < k)) continue;
      L.push({ tipo: 'fixa', ref: x.id, comp: k, titulo: x.descricao, desc: (x.categoria || 'Despesa fixa') + ' de ' + nomeMes(k), venc: dataNoMes(k, x.dia_vencimento),
        valor: Number(x.valor) || 0, pago: pago('fixa', x.id, k) });
    }
  });
  C.avulsas.forEach(d => {
    const k = mk(d.mes), v = d.vencimento ? new Date(+d.vencimento.slice(0, 4), +d.vencimento.slice(5, 7) - 1, +d.vencimento.slice(8, 10)) : dataNoMes(k, 31);
    L.push({ tipo: 'avulsa', ref: d.id, comp: k, titulo: d.descricao, desc: (d.categoria || 'Despesa avulsa') + ' de ' + nomeMes(k), venc: v, valor: Number(d.valor) || 0, pago: pago('avulsa', d.id, k) });
  });
  return { pessoas: Object.values(pessoas), L: L.sort((a, b) => a.venc - b.venc) };
}

/* Para o Início: quantos pagamentos vencem nos próximos 3 dias ou já venceram. */
export function alertas(ctx) {
  if (!C || C.erro) return undefined;
  return montar(ctx).L.filter(x => !x.pago && difDias(x.venc) <= 3).length;
}

const quando = (d) => { const n = difDias(d); return n < 0 ? `<span class="tag">atrasado ${-n} ${-n === 1 ? 'dia' : 'dias'}</span>` : n === 0 ? '<span class="tag ouro">vence hoje</span>' : n <= 7 ? `<span class="tag ouro">em ${n} ${n === 1 ? 'dia' : 'dias'}</span>` : `<span class="quando">em ${n} dias</span>`; };

export async function tela(P, ctx) {
  const { $, esc, brl2, aviso, sb, ir } = ctx;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">Compromissos <em>a pagar</em></h1><div class="vazio">Carregando...</div>`;
  $('voltar').onclick = () => ir('empresa');
  await carregar(ctx);
  if (ctx.aba() !== 'compromissos') return;
  if (C.erro) { P.querySelector('.vazio').textContent = 'Rode o compromissos.sql no Supabase para ativar. (' + C.erro + ')'; return; }
  const { pessoas, L } = montar(ctx), atual = mk(new Date().toISOString());
  const aPagar = L.filter(x => !x.pago && (x.comp <= atual || difDias(x.venc) <= 40));
  const futuro = L.filter(x => !x.pago && x.tipo === 'time' && !aPagar.includes(x));
  const pagos = L.filter(x => x.pago).sort((a, b) => String(b.pago.pago_em).localeCompare(String(a.pago.pago_em))).slice(0, 12);
  const forn = ctx.aPagar(), semIda = ctx.D.emissoes.filter(e => (Number(e.comissao) || 0) > 0 && !e.data_ida && pessoas.some(p => p.id === e.vendedor_id) && mk(e.data_negociacao) >= mesMais(INICIO, -6));
  const vence7 = aPagar.filter(x => difDias(x.venc) >= 0 && difDias(x.venc) <= 7), atras = aPagar.filter(x => difDias(x.venc) < 0);
  const chave = (x) => x.tipo + x.ref + x.comp;
  const detalhe = (x) => x.tipo !== 'time' ? '' : `<details ${ABERTO === chave(x) ? 'open' : ''} data-det="${chave(x)}" style="margin-top:6px"><summary class="sub" style="cursor:pointer">Ver a conta</summary>
      ${x.fixo ? `<div class="lin"><span>Salário fixo de ${nomeMes(x.comp)}</span><span>${brl2(x.fixo)}</span></div>` : ''}
      ${x.itens.map(i => `<div class="lin"><span>${esc(i.nome)}<small style="display:block;color:var(--tinta-3);font-size:12px">${esc(i.tipo)}</small></span><span>${brl2(i.valor)}</span></div>`).join('')}
      ${x.aberto ? `<div class="sub">${nomeMes(x.comp).replace(/^./, c => c.toUpperCase())} ainda está em aberto: as vendas novas deste mês ainda somam a 1ª metade da comissão delas.</div>` : ''}</details>`;
  const card = (x) => `<form class="card form" data-pg="${chave(x)}">
      <div class="cab"><div class="nome" style="font-size:19px">${esc(x.titulo)}</div>${quando(x.venc)}</div>
      <div class="lin"><span>${esc(x.desc)} · vence ${dd(x.venc)}</span><span><b>${brl2(x.valor)}</b></span></div>
      ${detalhe(x)}
      <div class="duas-col" style="margin-top:8px;align-items:end"><label class="fl"><span>Valor pago (R$)</span><input name="valor" type="number" step="0.01" value="${x.valor.toFixed(2)}" required></label><button class="zap" type="submit">Marcar como pago</button></div>
    </form>`;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">Compromissos <em>a pagar</em></h1>
    <div class="sub">Salário e comissão de cada pessoa, despesas fixas com dia de vencimento e despesas avulsas lançadas no DRE. Fechamento de cada mês, pago no mês seguinte: salário fixo + 1ª metade da comissão das vendas do mês + 2ª metade das viagens que embarcaram no mês.</div>
    <div class="numeros" style="margin-top:10px">
      <div class="num destaque"><div class="l">Próximos 7 dias</div><div class="v">${brl2(vence7.reduce((a, x) => a + x.valor, 0))}</div><div class="d">${vence7.length} ${vence7.length === 1 ? 'pagamento' : 'pagamentos'}</div></div>
      <div class="num"><div class="l">Atrasados</div><div class="v">${brl2(atras.reduce((a, x) => a + x.valor, 0))}</div><div class="d">${atras.length} ${atras.length === 1 ? 'pagamento' : 'pagamentos'}</div></div>
    </div>
    <div class="secao">A pagar</div>
    <div class="lista" style="margin-top:0">${aPagar.length ? aPagar.map(card).join('') : '<div class="vazio">Nada a pagar por enquanto.</div>'}</div>
    ${forn.length ? `<div class="pend" style="margin-top:10px"><button data-irpagar><span>Fornecedores a pagar · ${forn.length} ${forn.length === 1 ? 'venda' : 'vendas'}</span><span><b class="tem">${brl2(forn.reduce((a, e) => a + (Number(e.custo) || 0), 0))}</b><span class="seta">›</span></span></button></div>` : ''}
    ${semIda.length ? `<section class="bloco"><h2>Vendas sem data de ida</h2><div class="sub">A 1ª metade da comissão já entra no pagamento. A 2ª metade só entra quando a data de ida for preenchida.</div>${semIda.map(e => `<button class="lin" data-em="${e.id}"><span>${esc(e.comprador || e.produto || e.servico || 'Venda')} · ${esc(ctx.nomeTime(e.vendedor_id))}</span><span>${brl2(Number(e.comissao) - r2(Number(e.comissao) / 2))} aguardando<b class="seta">›</b></span></button>`).join('')}</section>` : ''}
    <div class="secao">Previsão dos próximos meses</div>
    <section class="bloco" style="margin-top:0">${futuro.length ? futuro.map(x => `<div class="lin"><span>${esc(x.titulo)} · paga em ${dd(x.venc)}<small style="display:block;color:var(--tinta-3);font-size:12px">fixo ${brl2(x.fixo)} + comissões já garantidas ${brl2(x.com)}</small></span><span>${brl2(x.valor)}</span></div>`).join('') : '<div class="vazio">Sem previsão além dos próximos pagamentos.</div>'}
      <div class="sub">Conta o salário atual e as metades de comissão de embarques já vendidos. Vendas novas ainda vão somar.</div></section>
    <div class="secao">Pagos</div>
    <section class="bloco" style="margin-top:0">${pagos.length ? pagos.map(x => `<div class="lin"><span>${esc(x.titulo)} · ${esc(x.desc)}<small style="display:block;color:var(--tinta-3);font-size:12px">pago em ${String(x.pago.pago_em).split('-').reverse().join('/')}</small></span><span>${brl2(x.pago.valor)} <button class="mini" type="button" data-desf="${x.pago.id}">${CONF === x.pago.id ? 'confirmar' : 'desfazer'}</button></span></div>`).join('') : '<div class="vazio">Nenhum pagamento marcado ainda.</div>'}</section>
    <div class="secao">Dia de pagamento de cada pessoa</div>
    <section class="bloco" style="margin-top:0">${pessoas.filter(p => L.some(x => x.ref === p.id)).map(p => `<div class="lin"><span>${esc(p.nome)}</span><span><select data-dia="${p.id}">${Array.from({ length: 28 }, (_, i) => `<option ${i + 1 === p.dia ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></span></div>`).join('') || '<div class="vazio">Ninguém com salário ou comissão.</div>'}
      <div class="sub">Despesas fixas entram aqui quando têm dia de vencimento, em Salários e despesas fixas. Despesas avulsas entram ao serem lançadas no DRE.</div></section>`;
  $('voltar').onclick = () => ir('empresa');
  P.querySelectorAll('details[data-det]').forEach(d => d.ontoggle = () => { if (d.open) ABERTO = d.dataset.det; else if (ABERTO === d.dataset.det) ABERTO = null; });
  P.querySelectorAll('form[data-pg]').forEach(f => f.onsubmit = async (ev) => {
    ev.preventDefault();
    const x = L.find(y => chave(y) === f.dataset.pg); if (!x) return;
    const valor = Number(String(f.elements.valor.value).replace(',', '.'));
    if (!(valor >= 0)) { aviso('Valor inválido.'); return; }
    const { error } = await sb.from('pagamentos_feitos').insert({ tipo: x.tipo, ref: x.ref, competencia: x.comp + '-01', valor });
    if (error) { aviso('Não salvou: ' + error.message); return; }
    aviso('Marcado como pago.'); tela(P, ctx);
  });
  P.querySelectorAll('[data-desf]').forEach(b => b.onclick = async () => {
    if (CONF !== b.dataset.desf) { CONF = b.dataset.desf; b.textContent = 'confirmar'; return; }
    CONF = null;
    const { error } = await sb.from('pagamentos_feitos').delete().eq('id', b.dataset.desf);
    if (error) { aviso('Não desfez: ' + error.message); return; }
    aviso('Voltou para a lista de a pagar.'); tela(P, ctx);
  });
  P.querySelectorAll('[data-dia]').forEach(s => s.onchange = async () => {
    const { error } = await sb.rpc('dia_pagamento_definir', { p_user: s.dataset.dia, p_dia: Number(s.value) });
    if (error) { aviso('Não salvou: ' + error.message); return; }
    aviso('Dia de pagamento salvo.'); tela(P, ctx);
  });
  P.querySelectorAll('[data-irpagar]').forEach(b => b.onclick = () => ir('pagar'));
  P.querySelectorAll('[data-em]').forEach(b => b.onclick = () => { location.hash = '#emissoes/' + b.dataset.em; });
}
