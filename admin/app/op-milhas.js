// Maktub Go: Operação de milhas dos sócios (só administradores).
// Compras de milhas em promoções que os sócios revendem para a Maktub.
// Fica separada do DRE da empresa; serve para saber quanto os sócios ganham no ano.

const PROGRAMAS = [['Azul Fidelidade', 15.5], ['Smiles (Gol)', 16.5], ['Latam Pass', 27], ['TAP Miles&Go', 45], ['Iberia Plus', 57], ['Outro', null]];
let OM_ANO = String(new Date().getFullYear()), OM_ED = null, OM_PROG = 'todos', OM_CONF = null, LISTA = null;

const r2 = (x) => Math.round(x * 100) / 100;
export function calc(o) {
  const mil = +o.milhas || 0, inv = +o.investido || 0, venda = +o.milheiro_venda || 0;
  const custo = mil ? inv / mil * 1000 : 0;
  return { custo: r2(custo), receita: r2(mil * venda / 1000), previsto: r2(mil * venda / 1000 - inv) };
}

export async function telaOpMilhas(P, X) {
  const { sb, $, esc, aviso, brl2, brlC, milC, num, pct, campo, ir, D, dia, dataCurta, soma } = X;
  const voltar = () => { OM_ED = null; ir('mais'); };
  if (!LISTA) {
    P.innerHTML = `<button class="voltar" id="voltar">‹ Mais</button><h1 class="titulo" style="margin-top:6px">Operação de <em>milhas</em></h1><div class="vazio">Carregando...</div>`;
    $('voltar').onclick = voltar;
    const { data, error } = await sb.from('operacoes_milhas').select('*').order('data', { ascending: false }).order('criado_em', { ascending: false });
    if (X.aba() !== 'opmilhas') return;
    if (error) { P.querySelector('.vazio').textContent = 'Operação de milhas ainda não ativada no Supabase. Rode o 18-operacao-milhas.sql.'; return; }
    LISTA = data || [];
  }
  if (OM_ED) return form(P, X);

  const doAno = LISTA.filter(o => String(o.data).slice(0, 4) === OM_ANO);
  const L = OM_PROG === 'todos' ? doAno : doAno.filter(o => o.programa === OM_PROG);
  const c = L.map(o => ({ o, ...calc(o) }));
  const inv = c.reduce((s, x) => s + (+x.o.investido || 0), 0), prev = c.reduce((s, x) => s + x.previsto, 0);
  const mil = c.reduce((s, x) => s + (+x.o.milhas || 0), 0), rec = c.reduce((s, x) => s + x.receita, 0);
  const custoMed = mil ? inv / mil * 1000 : 0, vendaMed = mil ? rec / mil * 1000 : 0;

  const porProg = {}; doAno.forEach(o => { const k = o.programa; const x = calc(o); porProg[k] = porProg[k] || { n: 0, mil: 0, inv: 0, prev: 0 }; const p = porProg[k]; p.n++; p.mil += +o.milhas || 0; p.inv += +o.investido || 0; p.prev += x.previsto; });
  const meses = []; for (let m = 1; m <= 12; m++) { const k = `${OM_ANO}-${String(m).padStart(2, '0')}`; meses.push([new Date(+OM_ANO, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), Math.round(c.filter(x => String(x.o.data).slice(0, 7) === k).reduce((s, x) => s + x.previsto, 0))]); }
  const maxM = Math.max(1, ...meses.map(m => Math.abs(m[1])));
  const empresa = (D.emissoes || []).filter(e => String(e.data_negociacao).slice(0, 4) === OM_ANO);
  const lucroEmp = soma(empresa, 'lucro_liquido');
  const progs = [...new Set([...PROGRAMAS.map(p => p[0]).filter(p => p !== 'Outro'), ...LISTA.map(o => o.programa)])];

  P.innerHTML = `<button class="voltar" id="voltar">‹ Mais</button><h1 class="titulo" style="margin-top:6px">Operação de <em>milhas</em></h1>
    <button class="zap grande" id="omNova" style="margin-top:12px;width:100%">+ Lançar compra de milhas</button>
    <div class="mesnav" id="omAno" style="margin-top:12px"><button data-n="-1" aria-label="Ano anterior">‹</button><span>${OM_ANO}</span><button data-n="1" aria-label="Próximo ano">›</button></div>
    <select class="busca" id="omProg" style="margin-top:8px"><option value="todos">Todos os programas</option>${progs.map(p => `<option ${OM_PROG === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
    <div class="numeros" style="margin-top:10px">
      <div class="num destaque"><div class="l">Lucro projetado</div><div class="v">${brlC(prev)}</div><div class="d">${inv ? pct(prev / inv * 100) : '0%'} sobre o investido</div></div>
      <div class="num"><div class="l">Investido</div><div class="v">${brlC(inv)}</div><div class="d">${L.length} compra${L.length === 1 ? '' : 's'}</div></div>
      <div class="num"><div class="l">Milhas compradas</div><div class="v">${milC(mil)}</div><div class="d">com bônus</div></div>
      <div class="num"><div class="l">Venda à Maktub</div><div class="v">${brlC(rec)}</div><div class="d">valor das milhas</div></div>
      <div class="num"><div class="l">Milheiro de custo</div><div class="v">${brl2(custoMed)}</div><div class="d">média ponderada</div></div>
      <div class="num"><div class="l">Milheiro de venda</div><div class="v">${brl2(vendaMed)}</div><div class="d">para a Maktub</div></div>
    </div>
    ${OM_PROG === 'todos' ? `<section class="bloco"><h2>Resultado dos sócios em ${OM_ANO}</h2>
      <div class="lin"><span>Operação de milhas (projeção)</span><span>${brl2(prev)}</span></div>
      <div class="lin"><span>Lucro líquido da Maktub nas vendas</span><span>${brl2(lucroEmp)}</span></div>
      <div class="lin" style="font-weight:600;color:var(--verde)"><span>Total</span><span>${brl2(prev + lucroEmp)}</span></div>
      <div class="sub">O lucro da Maktub aqui é o das emissões, antes de salários e despesas fixas. A operação de milhas não entra no DRE da empresa: o custo da Maktub já é o milheiro de venda que vocês lançam aqui.</div></section>` : ''}
    <section class="bloco"><h2>Lucro projetado por mês</h2>${meses.map(([r, q]) => `<div class="barra" style="grid-template-columns:42px 1fr 86px"><span class="r">${r}</span><span class="t"><i class="ouro" style="width:${q ? Math.max(2, Math.abs(q) / maxM * 100) : 0}%"></i></span><span class="q">${q ? brlC(q) : ''}</span></div>`).join('')}</section>
    <section class="bloco"><h2>Por programa</h2>${Object.keys(porProg).length ? Object.entries(porProg).sort((a, b) => b[1].prev - a[1].prev).map(([k, p]) => `<div class="prog"><span class="p">${esc(k)}</span><span class="p">${brl2(p.prev)}</span><span class="s">${p.n} compra${p.n === 1 ? '' : 's'} · ${milC(p.mil)} milhas · custo ${brl2(p.mil ? p.inv / p.mil * 1000 : 0)}</span><span class="s">${p.inv ? pct(p.prev / p.inv * 100) : '0%'} de retorno</span></div>`).join('') : '<div class="vazio">Nenhuma compra lançada no ano.</div>'}</section>
    <section class="bloco"><h2>Compras de ${OM_ANO}</h2></section>
    <div class="lista">${c.length ? c.map(({ o, custo, previsto }) => `<button class="card em" data-o="${o.id}">
      <div class="cab"><div><div class="nome">${esc(o.programa)}${o.titular ? ' · ' + esc(o.titular) : ''}</div></div><span class="quando">${dataCurta(dia(o.data))}</span></div>
      <div class="info">${o.descricao ? `<div>${esc(o.descricao)}</div>` : ''}
        <div><span>Milhas:</span> ${num(o.milhas)} · <span>Investido:</span> ${brl2(o.investido)}</div>
        <div><span>Milheiro:</span> custo ${brl2(custo)} → venda ${brl2(o.milheiro_venda)}</div>
        <div><span>Lucro projetado:</span> ${brl2(previsto)} (${+o.investido ? pct(previsto / o.investido * 100) : '0%'})</div>
        <div class="toque">Toque para editar ›</div></div></button>`).join('') : '<div class="vazio">Nenhuma compra lançada neste ano.</div>'}</div>`;
  $('voltar').onclick = voltar;
  $('omNova').onclick = () => { OM_ED = 'nova'; telaOpMilhas(P, X); scrollTo(0, 0); };
  $('omAno').onclick = (e) => { const b = e.target.closest('button'); if (b) { OM_ANO = String(+OM_ANO + +b.dataset.n); telaOpMilhas(P, X); } };
  $('omProg').onchange = (e) => { OM_PROG = e.target.value; telaOpMilhas(P, X); };
  P.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { OM_ED = b.dataset.o; telaOpMilhas(P, X); scrollTo(0, 0); });
}

function form(P, X) {
  const { sb, $, esc, aviso, brl2, num, pct, campo } = X;
  const nova = OM_ED === 'nova';
  const o = nova ? { data: new Date().toISOString().slice(0, 10), programa: 'Azul Fidelidade', titular: X.eu || '', milheiro_venda: 15.5 } : LISTA.find(x => x.id === OM_ED);
  if (!o) { OM_ED = null; return telaOpMilhas(P, X); }
  const conhecido = PROGRAMAS.some(p => p[0] === o.programa);
  P.innerHTML = `<button class="voltar" id="voltar">‹ Operação de milhas</button><h1 class="titulo" style="margin-top:6px">${nova ? 'Nova <em>compra</em>' : 'Editar <em>compra</em>'}</h1>
    <form class="bloco form" id="fOm">
      <div class="duas-col">${campo('data', 'Data da compra', o.data, 'date', 'required')}
        <label class="fl"><span>Programa</span><select name="programa">${PROGRAMAS.map(([p]) => `<option ${(conhecido ? o.programa : 'Outro') === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label></div>
      <div id="omOutro" ${conhecido ? 'hidden' : ''}>${campo('programa_outro', 'Nome do programa', conhecido ? '' : o.programa)}</div>
      ${campo('titular', 'Conta de quem', o.titular, 'text', 'list="omTit" placeholder="Isadora, Matheus..."')}
      <datalist id="omTit"><option>Isadora</option><option>Matheus</option></datalist>
      ${campo('descricao', 'Promoção ou origem', o.descricao, 'text', 'placeholder="Ex.: compra de pontos com 100% de bônus"')}
      <div class="duas-col">${campo('milhas', 'Milhas creditadas (com bônus)', o.milhas, 'number', 'required')}${campo('investido', 'Valor investido (R$)', o.investido, 'number', 'required')}</div>
      ${campo('milheiro_venda', 'Milheiro de venda à Maktub (R$)', o.milheiro_venda, 'number', 'required')}
      <label class="fl"><span>Observações</span><textarea name="obs" rows="2">${esc(o.obs || '')}</textarea></label>
      <div class="bloco" id="omCalc" style="margin-top:14px"></div>
      <button class="zap grande" type="submit" id="omSalvar" style="margin-top:14px;width:100%">${nova ? 'Lançar compra' : 'Salvar alterações'}</button>
      ${nova ? '' : '<button class="sec grande" type="button" id="omExcluir" style="margin-top:10px;width:100%">Excluir compra</button>'}
      <div class="sub" id="omMsg"></div>
    </form>`;
  const f = $('fOm'), el = f.elements;
  const n = (x) => x === '' || x == null ? null : Number(String(x).replace(/\./g, '').replace(',', '.'));
  const nn = (x) => { const s = String(x ?? '').trim(); if (!s) return null; return /,/.test(s) ? n(s) : Number(s); };
  const ler = () => ({ milhas: nn(el.milhas.value), investido: nn(el.investido.value), milheiro_venda: nn(el.milheiro_venda.value) });
  const atual = () => {
    const v = ler(), x = calc(v);
    $('omCalc').innerHTML = v.milhas ? `<h2>Projeção</h2>
      <div class="lin"><span>Milheiro de custo</span><span>${brl2(x.custo)}</span></div>
      <div class="lin"><span>Venda para a Maktub</span><span>${brl2(x.receita)}</span></div>
      <div class="lin" style="font-weight:600;color:var(--verde)"><span>Lucro projetado</span><span>${brl2(x.previsto)}</span></div>
      <div class="lin"><span>Retorno sobre o investido</span><span>${v.investido ? pct(x.previsto / v.investido * 100) : '0%'}</span></div>` : '<div class="sub">Preencha as milhas e o valor investido para ver o lucro projetado.</div>';
  };
  atual(); f.addEventListener('input', atual);
  el.programa.onchange = () => {
    const p = PROGRAMAS.find(x => x[0] === el.programa.value);
    $('omOutro').hidden = el.programa.value !== 'Outro';
    if (p && p[1] != null && nova) { el.milheiro_venda.value = p[1]; atual(); }
  };
  $('voltar').onclick = () => { OM_ED = null; telaOpMilhas(P, X); };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = ler();
    const programa = el.programa.value === 'Outro' ? el.programa_outro.value.trim() : el.programa.value;
    if (!programa) { $('omMsg').textContent = 'Informe o nome do programa.'; return; }
    if (!(v.milhas > 0) || v.investido == null || v.milheiro_venda == null) { $('omMsg').textContent = 'Preencha milhas, valor investido e milheiro de venda.'; return; }
    const reg = { data: el.data.value, programa, titular: el.titular.value.trim() || null, descricao: el.descricao.value.trim() || null, ...v,
      obs: el.obs.value.trim() || null };
    $('omSalvar').disabled = true; $('omMsg').textContent = 'Salvando...';
    const r = nova ? await sb.from('operacoes_milhas').insert(reg).select().single() : await sb.from('operacoes_milhas').update(reg).eq('id', o.id).select().single();
    $('omSalvar').disabled = false;
    if (r.error) { $('omMsg').textContent = 'Não salvou: ' + r.error.message; return; }
    if (nova) LISTA.unshift(r.data); else LISTA[LISTA.findIndex(x => x.id === o.id)] = r.data;
    LISTA.sort((a, b) => String(b.data).localeCompare(String(a.data)));
    OM_ANO = String(r.data.data).slice(0, 4); OM_ED = null;
    aviso(nova ? 'Compra lançada.' : 'Compra atualizada.'); telaOpMilhas(P, X); scrollTo(0, 0);
  };
  if ($('omExcluir')) $('omExcluir').onclick = async () => {
    if (OM_CONF !== o.id) { OM_CONF = o.id; $('omExcluir').textContent = 'Toque de novo para excluir'; return; }
    OM_CONF = null;
    const r = await sb.from('operacoes_milhas').delete().eq('id', o.id);
    if (r.error) { aviso('Não excluiu: ' + r.error.message); return; }
    LISTA = LISTA.filter(x => x.id !== o.id); OM_ED = null; aviso('Compra excluída.'); telaOpMilhas(P, X);
  };
}

export function recarregar() { LISTA = null; }
