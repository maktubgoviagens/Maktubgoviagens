// Maktub Go: compromissos do financeiro (só administradores).
// Salário + comissão de cada pessoa, com data para pagar, e despesas fixas com dia de vencimento.
// Regra combinada com o time: comissão sempre 50/50.
// 1ª metade: fechamento do mês da venda, paga no mês seguinte junto com o salário fixo.
// 2ª metade: fechamento do mês em que o cliente embarcou, paga no mês seguinte ao embarque.
// Venda ainda sem data de ida: a 2ª metade fica aguardando a data (não entra em nenhum pagamento).
// Exceção: emissão B2B. A comissão inteira entra no fechamento do mês da venda (paga no mês seguinte), sem esperar o embarque.
// O pagamento sai no dia de pagamento da pessoa (padrão: dia 5).

// Primeiro fechamento do time controlado aqui: setembro/2026 (pago em 05/10/2026).
// Despesas fixas e avulsas: a partir de outubro/2026.
import * as CX from './caixa.js?v=7';
import { ehB2B } from '/admin/app/b2b.js?v=11';

export const INICIO = '2026-09';
const INICIO_CONTAS = '2026-10';

let C = null, ABERTO = null, CONF = null;

const r2 = (x) => Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100;
const mk = (s) => String(s || '').slice(0, 7);
const mesMais = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const ultimoDia = (k) => { const [y, m] = k.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const dataNoMes = (k, d) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, Math.min(d, ultimoDia(k))); };
const hoje0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const difDias = (d) => Math.round((d - hoje0()) / 864e5);
const nomeMes = (k) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }); };

/* Parcelas de comissão de uma pessoa: em que mês trabalhado cada metade entra. */
// Cancelamento de venda de mês já fechado (regra de out/2026, rever com o contador em dez/2026):
// a 1ª metade, já paga, fica com a pessoa; a 2ª metade (do voado) é cancelada. A linha de ajuste do
// cancelamento entra inteira no mês dela, com a 2ª metade da venda original devolvida ao cálculo.
const obs = (e) => String((e && e.observacoes) || '');
const refDe = (e) => (obs(e).match(/ref ([0-9a-f-]{8,})/i) || [])[1] || null;
export function parcelas(emissoes, uid) {
  const L = [], todas = emissoes || [];
  // mês do ajuste de cancelamento de cada venda original
  const mesAjuste = new Map(todas.filter(e => /CANCELAMENTO/.test(obs(e)) && !ehB2B(e) && refDe(e)).map(e => [refDe(e), mk(e.data_negociacao)]));
  const embarque = (o) => { const v = o && (o.data_ida || o.data_volta); const mv = mk(o && o.data_negociacao), mi = mk(v); return v ? (mi > mv ? mi : mv) : null; };
  // a 2ª metade só é cancelada se ainda não tinha entrado num fechamento anterior ao cancelamento
  const h2Cancelada = (o) => { const ma = mesAjuste.get(o.id); if (!ma) return false; const me = embarque(o); return !me || me >= ma; };
  const canceladasFechadas = new Set(todas.filter(e => mesAjuste.has(e.id) && h2Cancelada(e)).map(e => e.id));
  todas.forEach(e => {
    if (e.vendedor_id !== uid) return;
    const mv = mk(e.data_negociacao); if (!mv) return;
    const nome = e.comprador || e.produto || e.servico || 'Venda';
    let c = Number(e.comissao) || 0;
    // linhas de ajuste (cancelamento ou estorno de mês fechado): inteiras no mês do ajuste
    if (/CANCELAMENTO|AJUSTE ESTORNO/.test(obs(e))) {
      if (/CANCELAMENTO/.test(obs(e)) && !ehB2B(e)) { const o = todas.find(x => x.id === refDe(e)); if (o) c = r2(c + (Number(o.comissao) || 0) - r2((Number(o.comissao) || 0) / 2)); }
      // 2ª metade já paga antes do cancelamento: fica com o vendedor, então o ajuste não a desconta
      if (c) L.push({ e, nome, comp: mv, valor: r2(c), tipo: /CANCELAMENTO/.test(obs(e)) ? 'ajuste de cancelamento' : 'ajuste de estorno' });
      return;
    }
    if (!c) return;
    if (ehB2B(e)) { L.push({ e, nome, comp: mv, valor: r2(c), tipo: 'B2B, inteira no mês da venda' }); return; }
    if (canceladasFechadas.has(e.id)) { L.push({ e, nome, comp: mv, valor: r2(c / 2), tipo: '1ª metade, venda (cancelada depois: 2ª metade não é paga)' }); return; }
    const viagem = e.data_ida || e.data_volta; // trecho só de volta: vale a data da volta
    const h1 = r2(c / 2), mi = mk(viagem);
    L.push({ e, nome, comp: mv, valor: h1, tipo: '1ª metade, venda' });
    if (!viagem) { L.push({ e, nome, comp: null, valor: r2(c - h1), tipo: '2ª metade aguardando a data de ida' }); return; }
    L.push({ e, nome, comp: mi > mv ? mi : mv, valor: r2(c - h1), tipo: '2ª metade, embarque ' + mi.split('-').reverse().join('/') });
  });
  return L;
}

/* Carrega salários, dias de pagamento, despesas fixas e o que já foi pago. */
export async function carregar(ctx) {
  const { sb } = ctx, atual = mk(hojeLocal());
  const [t, p, f, a] = await Promise.all([
    sb.rpc('compromissos_time', { p_ini: INICIO + '-01', p_fim: mesMais(atual, 4) + '-01' }),
    sb.from('pagamentos_feitos').select('*').order('pago_em', { ascending: false }).limit(500),
    sb.from('despesas_fixas').select('*'),
    sb.from('despesas').select('*').gte('mes', INICIO_CONTAS + '-01'),
    CX.carregar(sb)
  ]);
  if (t.error || p.error) { C = { erro: (t.error || p.error).message }; return C; }
  C = { time: t.data || [], pagos: p.data || [], fixas: f.error ? [] : (f.data || []), avulsas: a.error ? [] : (a.data || []) };
  return C;
}

/* Lista de compromissos (pagos e a pagar) a partir do INICIO até alguns meses à frente. */
function montar(ctx) {
  const { D } = ctx, atual = mk(hojeLocal()), fim = mesMais(atual, 3);
  const pago = (tipo, ref, comp) => C.pagos.find(x => x.tipo === tipo && x.ref === ref && mk(x.competencia) === comp) || null;
  const pessoas = {};
  C.time.forEach(r => { (pessoas[r.user_id] = pessoas[r.user_id] || { id: r.user_id, nome: r.nome, dia: r.dia_pagamento || 5, fixo: {} }).fixo[mk(r.mes)] = Number(r.fixo) || 0; });
  const L = [];
  Object.values(pessoas).forEach(ps => {
    const par = parcelas(D.emissoes, ps.id);
    for (let k = INICIO; k <= fim; k = mesMais(k, 1)) {
      const itens = par.filter(x => x.comp === k), fixo = ps.fixo[k] || 0, com = r2(itens.reduce((a, x) => a + x.valor, 0));
      if (!fixo && !com) continue;
      L.push({ tipo: 'time', ref: ps.id, comp: k, titulo: ps.nome, desc: 'Fechamento de ' + nomeMes(k) + ': salário + comissões', venc: dataNoMes(mesMais(k, 1), ps.dia),
        valor: r2(fixo + com), fixo, com, itens, aberto: k >= atual, pago: pago('time', ps.id, k) });
    }
  });
  C.fixas.filter(x => x.dia_vencimento).forEach(x => {
    for (let k = INICIO_CONTAS; k <= mesMais(atual, 1); k = mesMais(k, 1)) {
      if (mk(x.desde) > k || (x.ate && mk(x.ate) < k)) continue;
      L.push({ tipo: 'fixa', ref: x.id, comp: k, titulo: x.descricao, desc: (x.categoria || 'Despesa fixa') + ' de ' + nomeMes(k), venc: dataNoMes(k, x.dia_vencimento),
        valor: Number(x.valor) || 0, pago: pago('fixa', x.id, k) });
    }
  });
  C.avulsas.forEach(d => {
    const k = mk(d.mes), v = d.vencimento ? new Date(+d.vencimento.slice(0, 4), +d.vencimento.slice(5, 7) - 1, +d.vencimento.slice(8, 10)) : dataNoMes(k, 31);
    L.push({ tipo: 'avulsa', ref: d.id, comp: k, titulo: d.descricao, desc: (d.categoria || 'Despesa avulsa') + ' de ' + nomeMes(k), venc: v, valor: Number(d.valor) || 0, pago: pago('avulsa', d.id, k) });
  });
  L.push(...CX.compromissos()); // parcelas dos empréstimos para o caixa
  return { pessoas: Object.values(pessoas), L: L.sort((a, b) => a.venc - b.venc) };
}

/* Fechamentos do time pagos (ou a pagar) dentro do mês k: o fechamento do mês anterior. Para o DRE. */
export async function folha(ctx, k) {
  if (!C || C.erro) await carregar(ctx);
  if (!C || C.erro) return null;
  return montar(ctx).L.filter(x => x.tipo === 'time' && mesMais(x.comp, 1) === k);
}
export const MES_CAIXA = mesMais(INICIO, 1);

/* Para o Início: quantos pagamentos vencem nos próximos 3 dias ou já venceram. */
export function alertas(ctx) {
  if (!C || C.erro) return undefined;
  return montar(ctx).L.filter(x => !x.pago && !(x.tipo === 'time' && x.aberto) && difDias(x.venc) <= 3).length + C.fixas.filter(x => !x.dia_vencimento && (!x.ate || mk(x.ate) >= mk(hojeLocal()))).length;
}

const hojeLocal = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

/* ---------- para a tela Contas (aba A pagar, index.html): dados e gravações dos compromissos ---------- */
export const chave = (x) => x.tipo + x.ref + x.comp;
export async function dadosPagar(ctx) {
  await carregar(ctx);
  if (C.erro) return { erro: C.erro };
  const { pessoas, L } = montar(ctx), atual = mk(hojeLocal());
  const aPagar = L.filter(x => !x.pago && (x.comp <= atual || difDias(x.venc) <= 40));
  return {
    aPagar,
    futuro: L.filter(x => !x.pago && x.tipo === 'time' && !aPagar.includes(x)),
    pagos: L.filter(x => x.pago),
    pessoas: pessoas.filter(p => L.some(x => x.ref === p.id)),
    semFixa: C.fixas.filter(x => !x.dia_vencimento && (!x.ate || mk(x.ate) >= atual)),
    semIda: ctx.D.emissoes.filter(e => (Number(e.comissao) || 0) > 0 && !e.data_ida && !e.data_volta && pessoas.some(p => p.id === e.vendedor_id) && mk(e.data_negociacao) >= mesMais(INICIO, -6)),
    naoFechou: (x) => x.tipo === 'time' && x.comp >= mk(hojeLocal()),
    nomeMes
  };
}
// marca como pago (o fechamento do time só depois que o mês fecha; ao pagar, o mês fecha sozinho)
export async function pagarItem(ctx, x, valor, data) {
  const { sb } = ctx;
  if (x.tipo === 'time' && x.comp >= mk(hojeLocal())) return { message: 'o mês ainda não fechou' };
  const { error } = x.tipo === 'emprestimo' ? await CX.marcarParcela(sb, x.ref, x.parcela, valor, data)
    : await sb.from('pagamentos_feitos').insert({ tipo: x.tipo, ref: x.ref, competencia: x.comp + '-01', valor, pago_em: data || undefined });
  if (!error && x.tipo === 'time' && ctx.fecharMes && x.comp < mk(hojeLocal())) await ctx.fecharMes(x.comp);
  return error;
}
export async function desfazerPagamento(ctx, id) {
  const { error } = id.startsWith('emp:') ? await CX.desfazerParcela(ctx.sb, id.slice(4)) : await ctx.sb.from('pagamentos_feitos').delete().eq('id', id);
  return error;
}
export async function definirDia(ctx, uid, dia) {
  const { error } = await ctx.sb.rpc('dia_pagamento_definir', { p_user: uid, p_dia: Number(dia) });
  return error;
}
