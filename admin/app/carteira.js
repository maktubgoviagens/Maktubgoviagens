// Carteira de milhas: cálculo e gravação no painel do cliente.
// Mesmo cálculo da Administração completa, usado pelo app da operação.
let sb = null;
export function usar(cliente) { sb = cliente; }
export const normProg = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const round2 = (n) => n === null || n === undefined || !isFinite(n) ? null : Math.round(n * 100) / 100;
const hojeISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
export function calcCarteira(extrato) {
  const hoje = hojeISO();
  const ordem = (x) => x.tipo === 'transf_saida' ? 0 : x.tipo === 'transf_entrada' ? 2 : 1;
  const rows = [...extrato].sort((a, b) => String(a.data).localeCompare(String(b.data)) || String(a.created_at || '').localeCompare(String(b.created_at || '')) || ordem(a) - ordem(b));
  const P = {}, porLinha = {}, pend = {}, meses = {};
  const prog = (nome) => { const k = normProg(nome); return P[k] || (P[k] = { key: k, programa: String(nome || '').trim(), h: 0, o: 0, p: 0, ch: 0, cp: 0, lotes: [] }); };
  const saldo = (s) => s.h + s.o + s.p;
  const retirar = (s, q) => {
    const tot = saldo(s);
    if (tot <= 0 || q <= 0) { s.o -= q; return { h: 0, o: q, p: 0, ch: 0, cp: 0, custo: 0 }; }
    const f = Math.min(1, q / tot), r = { h: s.h * f, o: s.o * f, p: s.p * f, ch: s.ch * f, cp: s.cp * f };
    s.h -= r.h; s.o -= r.o; s.p -= r.p; s.ch -= r.ch; s.cp -= r.cp;
    if (q > tot) { s.o -= (q - tot); r.o += (q - tot); }
    r.custo = r.ch + r.cp; return r;
  };
  for (const x of rows) {
    const s = prog(x.programa), q = Number(x.quantidade || 0), custo = Number(x.custo_brl || 0);
    const info = { custo_milhas: null, custo_milheiro: null };
    if (x.tipo === 'saldo_inicial' && q > 0) { s.h += q; s.ch += custo; }
    else if ((x.tipo === 'compra' || x.tipo === 'clube') && q > 0) { s.p += q; s.cp += custo; info.custo_milheiro = custo / q * 1000; }
    else if (x.tipo === 'transf_entrada' && q > 0) {
      const c = x.grupo_id && pend[x.grupo_id];
      if (c) {
        const bonus = Math.max(0, Math.min(q, Number(x.milhas_bonus || 0))), base = q - bonus, env = c.h + c.o + c.p, f = env > 0 ? base / env : 0;
        s.h += c.h * f; s.o += c.o * f + bonus; s.p += c.p * f; s.ch += c.ch; s.cp += c.cp;
        if (env <= 0) s.o += base;
        info.custo_milhas = c.custo; info.custo_milheiro = c.custo / q * 1000;
      } else s.o += q;
    }
    else if (q > 0) s.o += q;
    else if (q < 0) {
      const r = retirar(s, -q);
      info.custo_milhas = r.custo; info.custo_milheiro = r.custo / -q * 1000;
      if (x.tipo === 'transf_saida' && x.grupo_id) pend[x.grupo_id] = r;
    }
    if (x.tipo === 'saldo_inicial' && custo && q > 0) info.custo_milheiro = custo / q * 1000;
    if (x.validade && q > 0) s.lotes.push({ validade: String(x.validade).slice(0, 10), qtd: q });
    if (x.tipo === 'emissao') info.custo_real = (info.custo_milhas || 0) + Number(x.taxas_brl || 0);
    porLinha[x.id] = info;
    const mk = String(x.data).slice(0, 7);
    meses[mk] = meses[mk] || {}; meses[mk][s.key] = saldo(s);
  }
  const fechamentos = [], ks = Object.keys(meses).sort();
  if (ks.length) {
    const ult = {}, fim = hoje.slice(0, 7); let [y, m] = ks[0].split('-').map(Number);
    for (let guard = 0; guard < 600; guard++) {
      const k = `${y}-${String(m).padStart(2, '0')}`;
      Object.assign(ult, meses[k] || {});
      Object.entries(ult).forEach(([pk, v]) => fechamentos.push({ mes: k, key: pk, saldo: Math.round(v) }));
      if (k >= fim) break;
      m++; if (m > 12) { m = 1; y++; }
    }
  }
  const ano = hoje.slice(0, 4), mes = hoje.slice(0, 7);
  const cresce = (x) => x.tipo === 'saldo_inicial' || x.tipo === 'transf_saida' ? 0 : x.tipo === 'transf_entrada' ? Number(x.milhas_bonus || 0) : Number(x.quantidade || 0);
  const evolucao_mes = Math.round(rows.filter(x => String(x.data).startsWith(mes)).reduce((a, x) => a + cresce(x), 0));
  const evolucao_ano = Math.round(rows.filter(x => String(x.data).startsWith(ano)).reduce((a, x) => a + cresce(x), 0));
  const programas = Object.values(P).map(s => {
    const tot = saldo(s), custo = s.ch + s.cp;
    const lotes = s.lotes.filter(l => l.validade >= hoje).sort((a, b) => a.validade.localeCompare(b.validade));
    const prox = lotes[0] ? lotes[0].validade : null;
    return { key: s.key, programa: s.programa, saldo: Math.round(tot), herdado: Math.round(s.h), organico: Math.round(s.o), pago: Math.round(s.p),
      custo_total: round2(custo), custo_medio: tot > 0 ? custo / tot * 1000 : null, custo_compras: s.p > 0.5 ? s.cp / s.p * 1000 : null,
      tem_validade: s.lotes.length > 0, venc_data: prox, venc_qtd: prox ? Math.min(Math.round(tot), lotes.filter(l => l.validade === prox).reduce((a, l) => a + l.qtd, 0)) : null };
  }).sort((a, b) => b.saldo - a.saldo);
  const total = programas.reduce((a, p) => a + p.saldo, 0);
  return { programas, porLinha, fechamentos, evolucao_mes, evolucao_ano, total, custo_total: programas.reduce((a, p) => a + (p.custo_total || 0), 0) };
}
 
export async function valoresRef() {
  const { data } = await sb.from('valores_milheiro').select('*');
  const map = {}; (data || []).forEach(v => { map[normProg(v.programa)] = Number(v.valor_brl); });
  return map;
}
 
// Grava no painel do cliente tudo o que é calculado: saldos, custo médio, vencimentos, fechamentos, indicadores e economias das emissões.
export async function syncCarteira(cid, refs) {
  const [ex, pr, ec] = await Promise.all([
    sb.from('extrato_milhas').select('*').eq('cliente_id', cid),
    sb.from('programas_milhas').select('*').eq('cliente_id', cid),
    sb.from('economia_gerada').select('*').eq('cliente_id', cid).maybeSingle()
  ]);
  if (ex.error) throw ex.error; if (pr.error) throw pr.error;
  refs = refs || await valoresRef();
  const W = calcCarteira(ex.data || []), agora = new Date().toISOString();
  const exist = {}; (pr.data || []).forEach(p => { exist[normProg(p.programa)] = p; });
  const nome = (key) => (exist[key] && exist[key].programa) || (W.programas.find(p => p.key === key) || {}).programa || key;
  const ops = []; let patrimonio = 0, temRef = false;
  for (const p of W.programas) {
    const vref = refs[p.key] !== undefined ? refs[p.key] : null;
    if (vref !== null) { temRef = true; patrimonio += p.saldo * vref / 1000; }
    const row = { saldo: p.saldo, qtd_herdado: p.herdado, qtd_organico: p.organico, qtd_pago: p.pago, custo_total_brl: p.custo_total,
      custo_medio_milheiro: round2(p.custo_medio), custo_medio_compras: round2(p.custo_compras), valor_referencia_milheiro: vref,
      patrimonio_brl: vref !== null ? round2(p.saldo * vref / 1000) : null, calculado_em: agora };
    if (p.tem_validade) { row.vencimento_data = p.venc_data; row.vencimento_quantidade = p.venc_qtd; }
    const e = exist[p.key];
    ops.push(e ? sb.from('programas_milhas').update(row).eq('id', e.id) : sb.from('programas_milhas').insert({ ...row, cliente_id: cid, programa: p.programa, unidade: 'milhas', ordem: 99 }));
  }
  Object.entries(exist).forEach(([key, e]) => { if (!W.programas.some(p => p.key === key) && Number(e.saldo || 0) !== 0) ops.push(sb.from('programas_milhas').update({ saldo: 0, qtd_herdado: 0, qtd_organico: 0, qtd_pago: 0, custo_total_brl: 0, custo_medio_milheiro: null, patrimonio_brl: 0, calculado_em: agora }).eq('id', e.id)); });
  if (W.fechamentos.length) ops.push(sb.from('historico_saldos').upsert(W.fechamentos.map(f => ({ cliente_id: cid, mes: f.mes + '-01', programa: nome(f.key), saldo: f.saldo })), { onConflict: 'cliente_id,mes,programa' }));
  const base = W.total - W.evolucao_ano;
  const ind = { patrimonio_total: W.total, evolucao_mes: W.evolucao_mes, evolucao_ano: W.evolucao_ano, crescimento_pct: base > 0 ? round2(W.evolucao_ano / base * 100) : null, atualizado_em: agora };
  if (temRef) ind.patrimonio_equivalente_brl = round2(patrimonio);
  ops.push(ec.data ? sb.from('economia_gerada').update(ind).eq('id', ec.data.id) : sb.from('economia_gerada').insert({ ...ind, cliente_id: cid }));
  const emis = (ex.data || []).filter(x => x.tipo === 'emissao');
  const comEco = emis.filter(x => Number(x.valor_pagante_brl) > 0), semEco = emis.filter(x => !(Number(x.valor_pagante_brl) > 0));
  if (comEco.length) ops.push(sb.from('historico_economia').upsert(comEco.map(x => {
    const i = W.porLinha[x.id] || {};
    return { cliente_id: cid, extrato_id: x.id, categoria: !x.categoria_uso || x.categoria_uso === 'passagem' ? 'emissao' : 'outro', data: x.data,
      descricao: x.descricao || 'Uso de milhas', programa: nome(normProg(x.programa)), milhas_utilizadas: Math.abs(Number(x.quantidade || 0)),
      valor_mercado_brl: Number(x.valor_pagante_brl), valor_pago_brl: round2(i.custo_real || 0), valor_economia_brl: null,
      custo_milhas_brl: round2(i.custo_milhas || 0), taxas_brl: x.taxas_brl === null || x.taxas_brl === undefined ? null : Number(x.taxas_brl) };
  }), { onConflict: 'extrato_id' }));
  if (semEco.length) ops.push(sb.from('historico_economia').delete().in('extrato_id', semEco.map(x => x.id)));
  const res = await Promise.all(ops);
  const err = res.find(r => r && r.error);
  if (err) throw err.error;
  return W;
}
 
