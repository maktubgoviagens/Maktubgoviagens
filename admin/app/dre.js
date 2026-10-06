// Maktub Go: DRE da empresa (só administradores).
// DRE geral do mês ou do ano, e cada linha abre o detalhe do que compõe o valor.
// Regime de competência: venda, custo, imposto e comissão contam no mês da venda.
// Quando cada valor sai do caixa fica em Compromissos a pagar.

let MODO = 'mes', CONF = null, ABERTOS = new Set();

const brlS = (brl2, v) => v < 0 ? '− ' + brl2(-v) : brl2(v);
const nomeEm = (e) => [e.comprador, e.sobrenome].filter(Boolean).join(' ') || e.produto || e.servico || 'Venda';
const servEm = (e) => e.servico_app || e.servico || 'Outro';
const diaMes = (d) => String(d || '').slice(8, 10) + '/' + String(d || '').slice(5, 7);
const mk = (s) => String(s || '').slice(0, 7);

export async function tela(P, ctx) {
  const { D, sb, $, esc, aviso, brl2, pct, campo, ir, mesNome, nomeTime, CAT_DESP } = ctx;
  const mes = ctx.mes(), ano = mes.slice(0, 4), mesModo = MODO === 'mes';
  const hojeK = mk(new Date().toISOString());
  const fimAno = ano === hojeK.slice(0, 4) ? hojeK : ano + '-12';
  const ini = mesModo ? mes : ano + '-01', fim = mesModo ? mes : fimAno;
  const cab = `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">DRE da <em>empresa</em></h1>
    <div class="seg" id="dreModo"><button data-m="mes" class="${mesModo ? 'on' : ''}">Mês</button><button data-m="ano" class="${mesModo ? '' : 'on'}">Ano</button></div>
    ${mesModo ? ctx.seletorMes('dreMes') : `<div class="mesnav" id="dreMes"><button data-n="-12">‹</button><span>${ano}${ano === hojeK.slice(0, 4) ? ' até ' + mesNome(hojeK).split(' ')[0].toLowerCase() : ''}</span><button data-n="12">›</button></div>`}`;
  P.innerHTML = cab + '<div class="vazio">Calculando...</div>';
  const ligarTopo = () => {
    $('voltar').onclick = () => ir('empresa');
    $('dreModo').onclick = (e) => { const b = e.target.closest('[data-m]'); if (b && b.dataset.m !== MODO) { MODO = b.dataset.m; tela(P, ctx); } };
    ctx.ligarMes('dreMes', () => tela(P, ctx));
  };
  ligarTopo();
  const [cu, dv, fx, pg] = await Promise.all([
    sb.rpc('dre_custos', { p_ini: ini + '-01', p_fim: fim + '-01' }),
    sb.from('despesas').select('*').gte('mes', ini + '-01').lte('mes', fim + '-01').order('mes', { ascending: false }),
    sb.from('despesas_fixas').select('*'),
    sb.from('pagamentos_feitos').select('*').eq('tipo', 'avulsa')
  ]);
  if (ctx.aba() !== 'dre' || ctx.mes() !== mes || (MODO === 'mes') !== mesModo) return;
  if (cu.error) { P.innerHTML = cab + '<div class="vazio">O DRE é ativado pelo 27-dre-e-salarios.sql no Supabase.</div>'; ligarTopo(); return; }

  // ---------- números ----------
  const E = D.emissoes.filter(e => { const k = mk(e.data_negociacao); return k >= ini && k <= fim; });
  const s = (arr, c) => arr.reduce((t, e) => t + (Number(e[c]) || 0), 0);
  const C = cu.data || [], avul = dv.error ? [] : (dv.data || []), fixas = fx.error ? [] : (fx.data || []), pagos = pg.error ? [] : (pg.data || []);
  const rec = s(E, 'valor_receber'), cus = s(E, 'custo'), lb = s(E, 'lucro_bruto'), imp = s(E, 'imposto'), com = s(E, 'comissao'), rep = s(E, 'repasse');
  const margem = lb - imp - com - rep;
  const sal = C.reduce((t, r) => t + (+r.salarios || 0), 0), fix = C.reduce((t, r) => t + (+r.fixas || 0), 0), avu = avul.reduce((t, d) => t + (+d.valor || 0), 0);
  const res = margem - sal - fix - avu;

  // ---------- detalhes ----------
  const item = (t, sub, v) => `<div class="lin" style="font-size:14px"><span>${t}${sub ? `<small style="display:block;color:var(--tinta-3);font-size:12px">${sub}</small>` : ''}</span><span>${brl2(v)}</span></div>`;
  const grupo = (arr, fn, col) => { const g = {}; arr.forEach(e => { const k = fn(e); g[k] = g[k] || { n: 0, v: 0 }; g[k].n++; g[k].v += Number(e[col]) || 0; }); return Object.entries(g).sort((a, b) => b[1].v - a[1].v); };
  const porEmissao = (col, extra) => {
    const L = E.filter(e => Number(e[col])).sort((a, b) => String(a.data_negociacao).localeCompare(String(b.data_negociacao)));
    if (!mesModo) return grupo(L, e => mesNome(mk(e.data_negociacao)), col).map(([k, x]) => item(k, x.n + (x.n === 1 ? ' venda' : ' vendas'), x.v)).join('') || '<div class="vazio">Nada no período.</div>';
    return L.map(e => item(esc(nomeEm(e)), diaMes(e.data_negociacao) + ' · ' + esc(servEm(e)) + (extra ? ' · ' + extra(e) : ''), e[col])).join('') || '<div class="vazio">Nada no período.</div>';
  };
  const det = {
    rec: `<div class="sub" style="margin:4px 0">Por serviço</div>${grupo(E, servEm, 'valor_receber').map(([k, x]) => item(esc(k), x.n + (x.n === 1 ? ' venda' : ' vendas'), x.v)).join('')}<div class="sub" style="margin:8px 0 4px">${mesModo ? 'Venda a venda' : 'Por mês'}</div>${porEmissao('valor_receber')}`,
    cus: porEmissao('custo', e => esc(e.fornecedor || e.cia || 'sem fornecedor')),
    imp: `<div class="sub" style="margin:4px 0">${pct(D.cfg ? D.cfg.imposto_pct : 6)} sobre o lucro de cada venda.</div>${porEmissao('imposto')}`,
    com: `<div class="sub" style="margin:4px 0">Por vendedor (comissão gerada pelas vendas do período)</div>${grupo(E.filter(e => Number(e.comissao)), e => nomeTime(e.vendedor_id) || 'Sem vendedor', 'comissao').map(([k, x]) => item(esc(k), x.n + (x.n === 1 ? ' venda' : ' vendas'), x.v)).join('') || '<div class="vazio">Nenhuma comissão no período.</div>'}${mesModo ? `<div class="sub" style="margin:8px 0 4px">Venda a venda</div>${porEmissao('comissao', e => esc(nomeTime(e.vendedor_id)))}` : ''}`,
    rep: porEmissao('repasse'),
    sal: (() => { const g = {}; C.forEach(r => (r.por_pessoa || []).forEach(p => { g[p.nome] = (g[p.nome] || 0) + (+p.fixo || 0); })); const L = Object.entries(g); return L.length ? L.map(([n, v]) => item(esc(n), mesModo ? 'salário fixo' : 'salário fixo somado no período', v)).join('') : '<div class="vazio">Nenhum salário fixo no período.</div>'; })(),
    fix: (() => { const meses = C.map(r => mk(r.mes)); const L = fixas.map(x => ({ x, n: meses.filter(k => mk(x.desde) <= k && (!x.ate || mk(x.ate) >= k)).length })).filter(o => o.n); return L.length ? L.map(({ x, n }) => item(esc(x.descricao), esc(x.categoria) + (mesModo ? '' : ' · ' + n + (n === 1 ? ' mês' : ' meses')), (+x.valor || 0) * n)).join('') : '<div class="vazio">Nenhuma despesa fixa no período.</div>'; })(),
    avu: avul.length ? (mesModo ? avul.map(d => item(esc(d.descricao), esc(d.categoria), d.valor)).join('') : grupo(avul, d => d.categoria || 'Outros', 'valor').map(([k, x]) => item(esc(k), x.n + (x.n === 1 ? ' lançamento' : ' lançamentos'), x.v)).join('')) : '<div class="vazio">Nenhuma despesa avulsa no período.</div>'
  };
  const linha = (k, t, v) => `<details class="dreDet" data-k="${k}" ${ABERTOS.has(k) ? 'open' : ''}><summary class="lin" style="cursor:pointer;list-style:none"><span>${t} <b class="seta" style="font-size:12px">▾</b></span><span>${brlS(brl2, v)}</span></summary><div style="padding:2px 0 10px 10px;border-left:2px solid var(--linha, #ddd);margin:0 0 6px 4px">${det[k]}</div></details>`;
  const tot = (t, v) => `<div class="lin sub"><span>${t}</span><span>${brlS(brl2, v)}</span></div>`;

  // ---------- resultado por mês (ano) ----------
  let porMes = '';
  if (!mesModo) porMes = `<section class="bloco"><h2>Resultado por mês</h2>${C.map(r => {
    const k = mk(r.mes), Em = E.filter(e => mk(e.data_negociacao) === k), av = avul.filter(d => mk(d.mes) === k).reduce((t, d) => t + (+d.valor || 0), 0);
    const rr = s(Em, 'lucro_bruto') - s(Em, 'imposto') - s(Em, 'comissao') - s(Em, 'repasse') - (+r.salarios || 0) - (+r.fixas || 0) - av;
    return Em.length || +r.salarios || +r.fixas || av ? `<button class="lin" data-mesdre="${k}"><span>${mesNome(k)}<small style="display:block;color:var(--tinta-3);font-size:12px">vendas ${brl2(s(Em, 'valor_receber'))}</small></span><span style="color:${rr < 0 ? 'var(--alerta)' : 'var(--verde)'}">${brlS(brl2, rr)}<b class="seta">›</b></span></button>` : '';
  }).join('') || '<div class="vazio">Sem movimento no ano.</div>'}</section>`;

  // ---------- despesas avulsas do mês ----------
  const pagoDe = (d) => pagos.find(p => p.ref === d.id);
  const avulsas = !mesModo ? '' : `<div class="secao">Despesas avulsas do mês <button id="abrirDesp">+ Lançar</button></div>
    <form class="bloco form" id="fDesp" hidden style="margin-top:0">
      <div class="duas-col">${campo('descricao', 'Descrição', '', 'text', 'required placeholder="Ex.: tráfego pago, bônus, cartório"')}${campo('valor', 'Valor (R$)', '', 'number', 'required step="0.01"')}</div>
      <div class="duas-col"><label class="fl"><span>Categoria</span><select name="categoria">${CAT_DESP.map(c => `<option>${c}</option>`).join('')}</select></label>${campo('vencimento', 'Vence em', new Date().toISOString().slice(0, 10), 'date', 'required')}</div>
      <label class="fl" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="paga" style="width:auto"> <span>Já está paga</span></label>
      <button class="zap" type="submit" style="margin-top:8px;width:100%">Lançar em ${mesNome(mes).toLowerCase()}</button>
    </form>
    <div class="bloco" style="margin-top:0">${avul.length ? avul.map(d => { const p = pagoDe(d); return `<div class="lin"><span>${esc(d.descricao)} · ${esc(d.categoria)}<small style="display:block;color:var(--tinta-3);font-size:12px">${p ? 'paga em ' + diaMes(p.pago_em) : d.vencimento ? 'a pagar, vence ' + diaMes(d.vencimento) : 'a pagar'}</small></span><span>${brl2(d.valor)} ${p ? '<span class="tag">paga</span>' : `<button class="mini" data-pgdesp="${d.id}">marcar paga</button>`} <button class="mini" data-rmdesp="${d.id}">${CONF === 'rm' + d.id ? 'confirmar' : 'excluir'}</button></span></div>`; }).join('') : '<div class="vazio">Nenhuma despesa avulsa neste mês.</div>'}
      <div class="sub">Salários e despesas que se repetem todo mês ficam em <a href="#custos" id="irCustos">Salários e despesas fixas</a>. O que falta pagar aparece em <a href="#compromissos" id="irComp">Compromissos a pagar</a>.</div></div>`;

  P.innerHTML = cab + `
    <div class="numeros" style="margin-top:10px">
      <div class="num destaque"><div class="l">Resultado</div><div class="v" style="color:${res < 0 ? 'var(--alerta)' : 'inherit'}">${brlS(brl2, res)}</div><div class="d">${rec ? 'margem final de ' + pct(res / rec * 100) : 'sem vendas no período'}</div></div>
      <div class="num"><div class="l">Vendas</div><div class="v">${brl2(rec)}</div><div class="d">${E.length} ${E.length === 1 ? 'emissão' : 'emissões'}</div></div>
    </div>
    <section class="bloco dre"><h2>DRE ${mesModo ? 'de ' + mesNome(mes).toLowerCase() : 'de ' + ano}</h2>
      <div class="sub" style="margin:-4px 0 6px">Toque em cada linha para ver o detalhe.</div>
      ${linha('rec', 'Receita das vendas', rec)}${linha('cus', '(−) Custo das emissões', -cus)}${tot('= Lucro bruto', lb)}
      ${linha('imp', '(−) Imposto', -imp)}${linha('com', '(−) Comissões do time', -com)}${linha('rep', '(−) Parceiros', -rep)}${tot('= Margem de contribuição', margem)}
      ${linha('sal', '(−) Salários fixos', -sal)}${linha('fix', '(−) Despesas fixas', -fix)}${linha('avu', '(−) Despesas avulsas', -avu)}
      <div class="lin forte"><span>= Resultado da empresa</span><span style="color:${res < 0 ? 'var(--alerta)' : 'var(--verde)'}">${brlS(brl2, res)}</span></div>
      <div class="sub" style="margin-top:8px">Por competência: cada venda, com o custo, o imposto e a comissão dela, conta no mês em que foi feita. Quando cada valor sai do caixa fica em Compromissos a pagar.</div>
    </section>
    ${porMes}${avulsas}`;
  ligarTopo();
  P.querySelectorAll('details.dreDet').forEach(d => d.ontoggle = () => { if (d.open) ABERTOS.add(d.dataset.k); else ABERTOS.delete(d.dataset.k); });
  P.querySelectorAll('[data-mesdre]').forEach(b => b.onclick = () => { MODO = 'mes'; ctx.setMes(b.dataset.mesdre); tela(P, ctx); scrollTo(0, 0); });
  if ($('irCustos')) $('irCustos').onclick = (e) => { e.preventDefault(); ir('custos'); };
  if ($('irComp')) $('irComp').onclick = (e) => { e.preventDefault(); ir('compromissos'); };
  if ($('abrirDesp')) $('abrirDesp').onclick = () => { $('fDesp').hidden = !$('fDesp').hidden; };
  if ($('fDesp')) $('fDesp').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target;
    const valor = Number(String(f.elements.valor.value).replace(',', '.'));
    const { data, error } = await sb.from('despesas').insert({ mes: mes + '-01', descricao: f.elements.descricao.value.trim(), categoria: f.elements.categoria.value, valor, vencimento: f.elements.vencimento.value || null }).select().single();
    if (error) { aviso('Não salvou: ' + error.message); return; }
    if (f.elements.paga.checked) {
      const r = await sb.from('pagamentos_feitos').insert({ tipo: 'avulsa', ref: data.id, competencia: mes + '-01', valor });
      if (r.error) { aviso('Lançada, mas não marcou como paga: ' + r.error.message); tela(P, ctx); return; }
    }
    aviso(f.elements.paga.checked ? 'Despesa lançada e marcada como paga.' : 'Despesa lançada. Ela aparece em Compromissos a pagar até você marcar como paga.'); tela(P, ctx);
  };
  P.querySelectorAll('[data-pgdesp]').forEach(b => b.onclick = async () => {
    const d = avul.find(x => x.id === b.dataset.pgdesp); if (!d) return;
    const { error } = await sb.from('pagamentos_feitos').insert({ tipo: 'avulsa', ref: d.id, competencia: mk(d.mes) + '-01', valor: +d.valor || 0 });
    if (error) { aviso('Não salvou: ' + error.message); return; }
    aviso('Marcada como paga.'); tela(P, ctx);
  });
  P.querySelectorAll('[data-rmdesp]').forEach(b => b.onclick = async () => {
    if (CONF !== 'rm' + b.dataset.rmdesp) { CONF = 'rm' + b.dataset.rmdesp; b.textContent = 'confirmar'; return; }
    CONF = null;
    await sb.from('pagamentos_feitos').delete().eq('tipo', 'avulsa').eq('ref', b.dataset.rmdesp);
    const { error } = await sb.from('despesas').delete().eq('id', b.dataset.rmdesp);
    if (error) { aviso('Não excluiu: ' + error.message); return; }
    aviso('Despesa excluída.'); tela(P, ctx);
  });
}
