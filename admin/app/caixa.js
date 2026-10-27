// Maktub Go: Investimentos e caixa (só administradores).
// 1. Investimentos: um lançamento por mês com o rendimento do relatório do banco (e o saldo no fim do mês, opcional).
//    Com retiradas frequentes no CDB de liquidez diária, o número confiável é o do relatório mensal.
// 2. Empréstimos para o caixa: valor que entrou na empresa (ex.: tirado no cartão de crédito e parcelado),
//    com as parcelas. As parcelas aparecem em Compromissos a pagar; o juro (parcelas acima do valor recebido)
//    entra no DRE como despesa financeira. O valor recebido não é receita e a parte principal não é despesa.

const ORIGENS = [['cartao', 'Cartão de crédito'], ['banco', 'Empréstimo bancário'], ['socios', 'Dinheiro dos sócios'], ['outro', 'Outro']];
const DIA_LANCAR = 5; // dia do mês em que o rendimento do mês anterior já deve estar lançado

let R = null, E = null, PG = null, ERRO = null, ANO = String(new Date().getFullYear()), ED = null, VER = null, CONF = null;

const r2 = (x) => Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100;
const mk = (s) => String(s || '').slice(0, 7);
const mesMais = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const ultimoDia = (k) => { const [y, m] = k.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const dataNoMes = (k, d) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, Math.min(d, ultimoDia(k))); };
const hojeK = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const iso = (d) => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const br = (s) => String(s || '').slice(0, 10).split('-').reverse().join('/');
const nomeMes = (k, curto) => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', curto ? { month: 'short' } : { month: 'long', year: 'numeric' }).replace('.', ''); };
const num = (x) => { const s = String(x ?? '').trim(); if (!s) return null; return /,/.test(s) ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s); };
const origemNome = (o) => (ORIGENS.find(x => x[0] === o) || [o, o])[1];

/* ---------- dados ---------- */
export async function carregar(sb) {
  const [a, b, c] = await Promise.all([
    sb.from('investimentos_rendimentos').select('*').order('mes', { ascending: false }),
    sb.from('emprestimos').select('*').order('recebido_em', { ascending: false }),
    sb.from('emprestimos_pagamentos').select('*')
  ]);
  ERRO = (a.error || b.error || c.error) ? (a.error || b.error || c.error).message : null;
  R = a.error ? [] : (a.data || []); E = b.error ? [] : (b.data || []); PG = c.error ? [] : (c.data || []);
  return { R, E, PG, erro: ERRO };
}
export const recarregar = () => { R = E = PG = null; };

/* Parcelas de um empréstimo: mês, vencimento, valor, juro e se já foi paga. */
// ao entrar pelo menu, abre o painel (e não o formulário ou o detalhe que ficou aberto da última vez)
export function inicio() { ED = null; VER = null; CONF = null; }
export function parcelasDe(emp, pagos) {
  const n = +emp.parcelas || 0, princ = (+emp.valor_recebido || 0) / (n || 1), ini = mk(emp.primeira_parcela), L = [];
  for (let i = 1; i <= n; i++) {
    const comp = mesMais(ini, i - 1), pago = (pagos || []).find(p => p.emprestimo_id === emp.id && +p.parcela === i) || null;
    const valor = pago ? +pago.valor || 0 : +emp.valor_parcela || 0;
    L.push({ n: i, comp, venc: dataNoMes(comp, +emp.dia_vencimento || 10), valor, principal: r2(princ), juros: r2(valor - princ), pago });
  }
  return L;
}
/* Resumo do empréstimo: total, juro, quanto já pagou e quanto falta. */
export function resumo(emp, pagos) {
  const P = parcelasDe(emp, pagos), total = r2(P.reduce((t, p) => t + p.valor, 0)), rec = +emp.valor_recebido || 0;
  const pagas = P.filter(p => p.pago), falta = P.filter(p => !p.pago);
  return { P, total, juros: r2(total - rec), jurosPct: rec ? (total - rec) / rec * 100 : 0, taxaMes: taxaMensal(rec, +emp.valor_parcela || 0, +emp.parcelas || 0),
    pagas: pagas.length, pagoValor: r2(pagas.reduce((t, p) => t + p.valor, 0)), falta: falta.length, faltaValor: r2(falta.reduce((t, p) => t + p.valor, 0)), proxima: falta[0] || null };
}
/* Taxa de juros ao mês equivalente (parcelas iguais). Aproximada: não conta o tempo até a 1ª parcela. */
export function taxaMensal(pv, pmt, n) {
  if (!(pv > 0 && pmt > 0 && n > 0) || pmt * n <= pv) return 0;
  let lo = 0, hi = 1;
  for (let k = 0; k < 100; k++) { const i = (lo + hi) / 2, v = pmt * (1 - Math.pow(1 + i, -n)) / i; if (v > pv) lo = i; else hi = i; }
  return (lo + hi) / 2 * 100;
}
/* Para o Compromissos a pagar: parcelas não pagas até o mês que vem e as já pagas. */
export function compromissos() {
  if (!E || ERRO) return [];
  const ate = mesMais(hojeK(), 1), L = [];
  E.forEach(emp => parcelasDe(emp, PG).forEach(p => {
    if (p.comp > ate && !p.pago) return;
    L.push({ tipo: 'emprestimo', ref: emp.id, parcela: p.n, comp: p.comp, titulo: emp.descricao,
      desc: `Parcela ${p.n} de ${emp.parcelas} · ${origemNome(emp.origem)}${emp.de_quem ? ' de ' + emp.de_quem : ''}`, venc: p.venc, valor: p.valor,
      pago: p.pago ? { id: 'emp:' + p.pago.id, valor: p.pago.valor, pago_em: p.pago.pago_em } : null });
  }));
  return L;
}
export async function marcarParcela(sb, empId, parcela, valor, pagoEm) {
  const r = await sb.from('emprestimos_pagamentos').insert({ emprestimo_id: empId, parcela, valor, pago_em: pagoEm || undefined });
  if (!r.error) recarregar();
  return r;
}
export async function desfazerParcela(sb, pagId) {
  const r = await sb.from('emprestimos_pagamentos').delete().eq('id', pagId);
  if (!r.error) recarregar();
  return r;
}
/* Juro das parcelas de cada mês do período, para o DRE. */
export function jurosPeriodo(ini, fim) {
  if (!E || ERRO) return [];
  const L = [];
  E.forEach(emp => parcelasDe(emp, PG).forEach(p => { if (p.comp >= ini && p.comp <= fim && p.juros) L.push({ emp, ...p }); }));
  return L;
}
export const pronto = () => !!E && !ERRO;
/* Para o Início: o rendimento do mês passado ainda não foi lançado (a partir do dia 5). */
export function alertaRendimento() {
  if (!R || ERRO) return undefined;
  if (new Date().getDate() < DIA_LANCAR) return 0;
  const ant = mesMais(hojeK(), -1);
  return R.some(x => mk(x.mes) === ant) ? 0 : 1;
}

/* ---------- tela ---------- */
export async function tela(P, X) {
  const { sb, $, esc, ir } = X;
  const voltar = () => { ED = VER = null; ir('empresa'); };
  if (!E) {
    P.innerHTML = `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">Investimentos <em>e caixa</em></h1><div class="vazio">Carregando...</div>`;
    $('voltar').onclick = voltar;
    await carregar(sb);
    if (X.aba() !== 'caixa') return;
  }
  if (ERRO) { P.innerHTML = `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">Investimentos <em>e caixa</em></h1><div class="vazio">Rode o investimentos-e-caixa.sql no Supabase para ativar. (${esc(ERRO)})</div>`; $('voltar').onclick = voltar; return; }
  if (ED && ED.tipo === 'rend') return formRend(P, X);
  if (ED && ED.tipo === 'emp') return formEmp(P, X);
  if (VER) return detalheEmp(P, X);
  return painel(P, X);
}

function painel(P, X) {
  const { $, esc, brl2, brlC, pct, ir } = X;
  const ant = mesMais(hojeK(), -1), doAno = R.filter(x => mk(x.mes).slice(0, 4) === ANO);
  const porMes = {}; doAno.forEach(x => { const k = mk(x.mes); (porMes[k] = porMes[k] || { rend: 0, saldo: 0, temSaldo: false, itens: [] }); const m = porMes[k]; m.rend += +x.rendimento || 0; if (x.saldo_fim != null) { m.saldo += +x.saldo_fim; m.temSaldo = true; } m.itens.push(x); });
  const rendAno = doAno.reduce((t, x) => t + (+x.rendimento || 0), 0);
  const ultMes = R.length ? mk(R[0].mes) : null, ult = ultMes ? R.filter(x => mk(x.mes) === ultMes) : [];
  const ultRend = ult.reduce((t, x) => t + (+x.rendimento || 0), 0), ultSaldo = ult.some(x => x.saldo_fim != null) ? ult.reduce((t, x) => t + (+x.saldo_fim || 0), 0) : null;
  const meses = []; for (let m = 1; m <= 12; m++) { const k = `${ANO}-${String(m).padStart(2, '0')}`; meses.push([k, porMes[k]]); }
  const maxM = Math.max(1, ...meses.map(([, x]) => x ? Math.abs(x.rend) : 0));
  const pend = alertaRendimento();
  const ativos = E.map(emp => ({ emp, ...resumo(emp, PG) })), abertos = ativos.filter(x => x.falta), quitados = ativos.filter(x => !x.falta);
  const divida = abertos.reduce((t, x) => t + x.faltaValor, 0), jurosTot = ativos.reduce((t, x) => t + x.juros, 0);
  const card = (x) => `<button class="card em" data-emp="${x.emp.id}">
      <div class="cab"><div class="nome">${esc(x.emp.descricao)}</div>${x.falta ? `<span class="quando">${x.pagas}/${x.emp.parcelas} pagas</span>` : '<span class="tag">quitado</span>'}</div>
      <div class="info"><div><span>${esc(origemNome(x.emp.origem))}${x.emp.de_quem ? ' de ' + esc(x.emp.de_quem) : ''}:</span> ${brl2(x.emp.valor_recebido)} recebidos em ${br(x.emp.recebido_em)}</div>
        <div><span>Parcelas:</span> ${x.emp.parcelas}x de ${brl2(x.emp.valor_parcela)} · juro total ${brl2(x.juros)} (${pct(x.jurosPct)})</div>
        ${x.falta ? `<div><span>Falta pagar:</span> ${brl2(x.faltaValor)} em ${x.falta} ${x.falta === 1 ? 'parcela' : 'parcelas'}${x.proxima ? ' · próxima ' + br(iso(x.proxima.venc)) : ''}</div>` : ''}
        <div class="toque">Toque para ver as parcelas ›</div></div></button>`;

  P.innerHTML = `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">Investimentos <em>e caixa</em></h1>
    ${pend ? `<div class="pend" style="margin-top:12px"><button id="cxPend"><span>Lançar o rendimento de ${nomeMes(ant)}</span><span><b class="tem">1</b><span class="seta">›</span></span></button></div>` : ''}
    <div class="numeros" style="margin-top:12px">
      <div class="num destaque"><div class="l">Rendimento em ${ANO}</div><div class="v">${brlC(rendAno)}</div><div class="d">${doAno.length ? Object.keys(porMes).length + (Object.keys(porMes).length === 1 ? ' mês lançado' : ' meses lançados') : 'nada lançado'}</div></div>
      <div class="num"><div class="l">Último mês</div><div class="v">${ultMes ? brlC(ultRend) : '-'}</div><div class="d">${ultMes ? nomeMes(ultMes) : 'sem lançamento'}</div></div>
      <div class="num"><div class="l">Saldo aplicado</div><div class="v">${ultSaldo != null ? brlC(ultSaldo) : '-'}</div><div class="d">${ultSaldo != null ? 'fim de ' + nomeMes(ultMes).split(' ')[0] : 'saldo não informado'}</div></div>
      <div class="num"><div class="l">Empréstimos a pagar</div><div class="v">${brlC(divida)}</div><div class="d">${abertos.length} em aberto</div></div>
    </div>

    <div class="secao">Investimentos</div>
    <button class="zap grande" id="cxNovoRend" style="width:100%">+ Lançar rendimento do mês</button>
    <div class="mesnav" id="cxAno" style="margin-top:12px"><button data-n="-1" aria-label="Ano anterior">‹</button><span>${ANO}</span><button data-n="1" aria-label="Próximo ano">›</button></div>
    <section class="bloco"><h2>Rendimento por mês</h2>
      ${meses.map(([k, x]) => `<div class="barra" style="grid-template-columns:42px 1fr 96px"><span class="r">${nomeMes(k, true)}</span><span class="t"><i style="width:${x && x.rend ? Math.max(2, Math.abs(x.rend) / maxM * 100) : 0}%"></i></span><span class="q">${x ? brl2(x.rend) : ''}</span></div>`).join('')}
      <div class="sub">Lance todo dia ${DIA_LANCAR} o rendimento do mês anterior, copiado do relatório do banco. O app avisa no Início se esquecer.</div></section>
    <section class="bloco"><h2>Lançamentos de ${ANO}</h2>
      ${doAno.length ? doAno.map(x => { const p = x.saldo_fim != null && +x.saldo_fim - +x.rendimento > 0 ? pct(+x.rendimento / (+x.saldo_fim - +x.rendimento) * 100) : ''; return `<button class="lin" data-rend="${x.id}"><span>${nomeMes(mk(x.mes))} · ${esc(x.banco)}<small style="display:block;color:var(--tinta-3);font-size:12px">${x.saldo_fim != null ? 'saldo no fim do mês ' + brl2(x.saldo_fim) + (p ? ' · rendeu ' + p + ' no mês (aprox.)' : '') : 'sem saldo informado'}</small></span><span>${brl2(x.rendimento)}<b class="seta">›</b></span></button>`; }).join('') : '<div class="vazio">Nenhum rendimento lançado neste ano.</div>'}
      <div class="sub">A % do mês é aproximada: rendimento sobre o saldo do fim do mês menos o próprio rendimento. Com retiradas no meio do mês, vale como referência.</div></section>

    <div class="secao">Empréstimos para o caixa</div>
    <button class="zap grande" id="cxNovoEmp" style="width:100%">+ Registrar empréstimo</button>
    <div class="lista" style="margin-top:10px">${abertos.length ? abertos.map(card).join('') : '<div class="vazio">Nenhum empréstimo em aberto.</div>'}</div>
    ${quitados.length ? `<div class="secao">Quitados</div><div class="lista" style="margin-top:0">${quitados.map(card).join('')}</div>` : ''}
    ${ativos.length ? `<section class="bloco"><h2>Custo dos empréstimos</h2>
      <div class="lin"><span>Juro total de todos os empréstimos</span><span>${brl2(jurosTot)}</span></div>
      <div class="sub">O valor que entrou não é receita e a parte principal das parcelas não é despesa: os dois ficam fora do resultado. Só o juro entra no DRE, como despesa financeira, no mês de cada parcela. As parcelas aparecem em Compromissos a pagar.</div></section>` : ''}`;

  $('voltar').onclick = () => { ED = VER = null; ir('empresa'); };
  const tela2 = () => { tela(P, X); scrollTo(0, 0); };
  if ($('cxPend')) $('cxPend').onclick = () => { ED = { tipo: 'rend', id: 'novo', mes: ant }; tela2(); };
  $('cxNovoRend').onclick = () => { ED = { tipo: 'rend', id: 'novo' }; tela2(); };
  $('cxNovoEmp').onclick = () => { ED = { tipo: 'emp', id: 'novo' }; tela2(); };
  $('cxAno').onclick = (e) => { const b = e.target.closest('button'); if (b) { ANO = String(+ANO + +b.dataset.n); tela(P, X); } };
  P.querySelectorAll('[data-rend]').forEach(b => b.onclick = () => { ED = { tipo: 'rend', id: b.dataset.rend }; tela2(); });
  P.querySelectorAll('[data-emp]').forEach(b => b.onclick = () => { VER = b.dataset.emp; tela2(); });
}

/* ---------- lançamento de rendimento ---------- */
function formRend(P, X) {
  const { sb, $, esc, aviso, campo } = X;
  const novo = ED.id === 'novo';
  const bancos = [...new Set(R.map(x => x.banco).filter(Boolean))];
  const x = novo ? { mes: (ED.mes || mesMais(hojeK(), -1)) + '-01', banco: bancos[0] || '' } : R.find(y => y.id === ED.id);
  if (!x) { ED = null; return tela(P, X); }
  P.innerHTML = `<button class="voltar" id="voltar">‹ Investimentos e caixa</button><h1 class="titulo" style="margin-top:6px">${novo ? 'Lançar <em>rendimento</em>' : 'Editar <em>rendimento</em>'}</h1>
    <form class="bloco form" id="fRend">
      <div class="duas-col">${campo('mes', 'Mês do relatório', mk(x.mes), 'month', 'required')}${campo('banco', 'Banco', x.banco, 'text', 'required list="cxBancos" placeholder="Ex.: Cora"')}</div>
      <datalist id="cxBancos">${bancos.map(b => `<option>${esc(b)}</option>`).join('')}</datalist>
      <div class="duas-col">${campo('rendimento', 'Rendimento do mês (R$)', x.rendimento, 'number', 'required')}${campo('saldo_fim', 'Saldo no fim do mês (R$)', x.saldo_fim, 'number', 'placeholder="opcional"')}</div>
      <div class="sub">Copie do relatório mensal do banco. O saldo é opcional, mas é com ele que o app mostra a % do mês e quanto vocês têm aplicado.</div>
      <label class="fl"><span>Observação</span><textarea name="obs" rows="2">${esc(x.obs || '')}</textarea></label>
      <button class="zap grande" type="submit" style="margin-top:14px;width:100%">${novo ? 'Lançar' : 'Salvar alterações'}</button>
      ${novo ? '' : `<button class="sec grande" type="button" id="cxExcluir" style="margin-top:10px;width:100%">Excluir lançamento</button>`}
    </form>`;
  const f = $('fRend'), el = f.elements;
  $('voltar').onclick = () => { ED = null; tela(P, X); };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const row = { mes: el.mes.value + '-01', banco: el.banco.value.trim(), rendimento: num(el.rendimento.value), saldo_fim: num(el.saldo_fim.value), obs: el.obs.value.trim() || null };
    if (!el.mes.value || !row.banco || row.rendimento === null || isNaN(row.rendimento)) { aviso('Preencha mês, banco e rendimento.'); return; }
    if (row.saldo_fim !== null && (isNaN(row.saldo_fim) || row.saldo_fim < 0)) { aviso('Saldo inválido.'); return; }
    const r = novo ? await sb.from('investimentos_rendimentos').insert(row) : await sb.from('investimentos_rendimentos').update(row).eq('id', x.id);
    if (r.error) { aviso(/duplicate|unique/i.test(r.error.message) ? 'Já existe lançamento desse mês nesse banco. Abra o lançamento e edite.' : 'Não salvou: ' + r.error.message); return; }
    aviso(novo ? 'Rendimento lançado.' : 'Alterações salvas.');
    ED = null; ANO = el.mes.value.slice(0, 4); recarregar(); tela(P, X);
  };
  if ($('cxExcluir')) $('cxExcluir').onclick = async (ev) => {
    if (CONF !== 'r' + x.id) { CONF = 'r' + x.id; ev.target.textContent = 'Toque de novo para confirmar'; return; }
    CONF = null;
    const r = await sb.from('investimentos_rendimentos').delete().eq('id', x.id);
    if (r.error) { aviso('Não excluiu: ' + r.error.message); return; }
    aviso('Lançamento excluído.'); ED = null; recarregar(); tela(P, X);
  };
}

/* ---------- cadastro de empréstimo ---------- */
function formEmp(P, X) {
  const { sb, $, esc, aviso, brl2, pct, campo } = X;
  const novo = ED.id === 'novo';
  const x = novo ? { origem: 'cartao', recebido_em: iso(new Date()), primeira_parcela: mesMais(hojeK(), 1) + '-01', dia_vencimento: 10, parcelas: 12 } : E.find(y => y.id === ED.id);
  if (!x) { ED = null; return tela(P, X); }
  const pagas = novo ? 0 : PG.filter(p => p.emprestimo_id === x.id).length;
  P.innerHTML = `<button class="voltar" id="voltar">‹ ${novo ? 'Investimentos e caixa' : 'Empréstimo'}</button><h1 class="titulo" style="margin-top:6px">${novo ? 'Registrar <em>empréstimo</em>' : 'Editar <em>empréstimo</em>'}</h1>
    <form class="bloco form" id="fEmp">
      ${campo('descricao', 'Descrição', x.descricao, 'text', 'required placeholder="Ex.: Reforço de caixa após o prejuízo da Azul"')}
      <div class="duas-col"><label class="fl"><span>Origem</span><select name="origem">${ORIGENS.map(([k, t]) => `<option value="${k}" ${x.origem === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        ${campo('de_quem', 'De quem (cartão ou conta)', x.de_quem, 'text', 'list="cxQuem" placeholder="Isadora, Matheus..."')}</div>
      <datalist id="cxQuem"><option>Isadora</option><option>Matheus</option></datalist>
      <div class="duas-col">${campo('valor_recebido', 'Valor que entrou no caixa (R$)', x.valor_recebido, 'number', 'required')}${campo('recebido_em', 'Recebido em', x.recebido_em, 'date', 'required')}</div>
      <div class="duas-col">${campo('parcelas', 'Número de parcelas', x.parcelas, 'number', 'required min="1" max="120" step="1"')}${campo('valor_parcela', 'Valor de cada parcela (R$)', x.valor_parcela, 'number', 'required')}</div>
      <div class="duas-col">${campo('primeira_parcela', 'Mês da 1ª parcela', mk(x.primeira_parcela), 'month', 'required')}${campo('dia_vencimento', 'Dia de vencimento', x.dia_vencimento, 'number', 'required min="1" max="31" step="1"')}</div>
      ${novo ? `${campo('ja_pagas', 'Parcelas que já foram pagas', '0', 'number', 'min="0" step="1"')}<div class="sub">As primeiras parcelas, até esse número, entram como pagas no dia do vencimento de cada uma.</div>` : `<div class="sub">${pagas} ${pagas === 1 ? 'parcela marcada' : 'parcelas marcadas'} como paga. Para marcar ou desfazer, use a lista de parcelas.</div>`}
      <label class="fl"><span>Observação</span><textarea name="obs" rows="2">${esc(x.obs || '')}</textarea></label>
      <div class="bloco" id="cxCalc" style="margin-top:14px"></div>
      <button class="zap grande" type="submit" style="margin-top:14px;width:100%">${novo ? 'Registrar empréstimo' : 'Salvar alterações'}</button>
      ${novo ? '' : `<button class="sec grande" type="button" id="cxExcluir" style="margin-top:10px;width:100%">Excluir empréstimo</button>`}
    </form>`;
  const f = $('fEmp'), el = f.elements;
  const atual = () => {
    const pv = num(el.valor_recebido.value) || 0, n = Math.round(num(el.parcelas.value) || 0), pmt = num(el.valor_parcela.value) || 0;
    if (!(pv && n && pmt)) { $('cxCalc').innerHTML = '<div class="sub">Preencha o valor recebido, as parcelas e o valor de cada parcela para ver o custo do empréstimo.</div>'; return; }
    const tot = pmt * n, j = tot - pv, tx = taxaMensal(pv, pmt, n);
    $('cxCalc').innerHTML = `<h2>Custo do empréstimo</h2>
      <div class="lin"><span>Total das parcelas</span><span>${brl2(tot)}</span></div>
      <div class="lin" style="font-weight:600"><span>Juro total</span><span>${brl2(j)} (${pct(pv ? j / pv * 100 : 0)})</span></div>
      ${tx ? `<div class="lin"><span>Taxa equivalente ao mês (aprox.)</span><span>${pct(tx)}</span></div>` : ''}
      <div class="lin"><span>Juro que entra no DRE por parcela</span><span>${brl2(pmt - pv / n)}</span></div>`;
  };
  atual(); f.addEventListener('input', atual);
  $('voltar').onclick = () => { ED = null; tela(P, X); };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const row = { descricao: el.descricao.value.trim(), origem: el.origem.value, de_quem: el.de_quem.value.trim() || null, valor_recebido: num(el.valor_recebido.value), recebido_em: el.recebido_em.value,
      parcelas: Math.round(num(el.parcelas.value) || 0), valor_parcela: num(el.valor_parcela.value), primeira_parcela: el.primeira_parcela.value + '-01', dia_vencimento: Math.round(num(el.dia_vencimento.value) || 0), obs: el.obs.value.trim() || null };
    if (!row.descricao || !(row.valor_recebido > 0) || !(row.parcelas >= 1) || !(row.valor_parcela >= 0) || !el.primeira_parcela.value || !(row.dia_vencimento >= 1 && row.dia_vencimento <= 31)) { aviso('Confira os campos obrigatórios.'); return; }
    if (!novo && PG.some(p => p.emprestimo_id === x.id && +p.parcela > row.parcelas)) { aviso('Há parcelas pagas acima desse número. Desfaça essas parcelas antes.'); return; }
    let r;
    if (novo) {
      r = await sb.from('emprestimos').insert(row).select().single();
      if (!r.error) {
        const k = Math.min(row.parcelas, Math.max(0, Math.round(num(el.ja_pagas.value) || 0)));
        if (k) {
          const ps = parcelasDe(r.data, []).slice(0, k).map(p => ({ emprestimo_id: r.data.id, parcela: p.n, valor: row.valor_parcela, pago_em: iso(p.venc) }));
          const r2x = await sb.from('emprestimos_pagamentos').insert(ps);
          if (r2x.error) aviso('Empréstimo salvo, mas as parcelas pagas não: ' + r2x.error.message);
        }
      }
    } else r = await sb.from('emprestimos').update(row).eq('id', x.id);
    if (r.error) { aviso('Não salvou: ' + r.error.message); return; }
    aviso(novo ? 'Empréstimo registrado. As parcelas já aparecem em Compromissos a pagar.' : 'Alterações salvas.');
    VER = novo ? r.data.id : x.id; ED = null; recarregar(); X.aoMudar && X.aoMudar(); tela(P, X);
  };
  if ($('cxExcluir')) $('cxExcluir').onclick = async (ev) => {
    if (CONF !== 'e' + x.id) { CONF = 'e' + x.id; ev.target.textContent = 'Toque de novo para confirmar (apaga as parcelas pagas)'; return; }
    CONF = null;
    const r = await sb.from('emprestimos').delete().eq('id', x.id);
    if (r.error) { aviso('Não excluiu: ' + r.error.message); return; }
    aviso('Empréstimo excluído.'); ED = VER = null; recarregar(); X.aoMudar && X.aoMudar(); tela(P, X);
  };
}

/* ---------- parcelas de um empréstimo ---------- */
function detalheEmp(P, X) {
  const { sb, $, esc, aviso, brl2, pct } = X;
  const emp = E.find(y => y.id === VER);
  if (!emp) { VER = null; return tela(P, X); }
  const s = resumo(emp, PG);
  const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
  const st = (p) => { if (p.pago) return `<span class="tag">paga em ${br(p.pago.pago_em)}</span>`; const d = Math.round((p.venc - hoje0) / 864e5); return d < 0 ? `<span class="tag">atrasada ${-d} ${-d === 1 ? 'dia' : 'dias'}</span>` : d <= 7 ? `<span class="tag ouro">vence ${d === 0 ? 'hoje' : 'em ' + d + (d === 1 ? ' dia' : ' dias')}</span>` : `<span class="quando">vence ${br(iso(p.venc))}</span>`; };
  P.innerHTML = `<button class="voltar" id="voltar">‹ Investimentos e caixa</button><h1 class="titulo" style="margin-top:6px">${esc(emp.descricao)}</h1>
    <div class="sub">${esc(origemNome(emp.origem))}${emp.de_quem ? ' de ' + esc(emp.de_quem) : ''} · ${brl2(emp.valor_recebido)} recebidos em ${br(emp.recebido_em)}</div>
    <div class="numeros" style="margin-top:10px">
      <div class="num destaque"><div class="l">Falta pagar</div><div class="v">${brl2(s.faltaValor)}</div><div class="d">${s.falta} de ${emp.parcelas} ${emp.parcelas === 1 ? 'parcela' : 'parcelas'}</div></div>
      <div class="num"><div class="l">Já pago</div><div class="v">${brl2(s.pagoValor)}</div><div class="d">${s.pagas} ${s.pagas === 1 ? 'parcela' : 'parcelas'}</div></div>
      <div class="num"><div class="l">Juro total</div><div class="v">${brl2(s.juros)}</div><div class="d">${pct(s.jurosPct)} sobre o recebido</div></div>
      <div class="num"><div class="l">Taxa ao mês</div><div class="v">${s.taxaMes ? pct(s.taxaMes) : '-'}</div><div class="d">aproximada</div></div>
    </div>
    <section class="bloco"><h2>Parcelas</h2>
      ${s.P.map(p => `<form class="lin" data-parc="${p.n}" style="align-items:center"><span>Parcela ${p.n} · ${nomeMes(p.comp)}<small style="display:block;color:var(--tinta-3);font-size:12px">${brl2(p.valor)}, sendo juro ${brl2(p.juros)}</small></span>
        <span>${st(p)} ${p.pago ? `<button class="mini" type="button" data-desf="${p.pago.id}">${CONF === p.pago.id ? 'confirmar' : 'desfazer'}</button>` : `<button class="mini" type="submit">marcar paga</button>`}</span></form>`).join('')}
      <div class="sub">Marcar aqui ou em Compromissos a pagar dá no mesmo. A parcela é marcada com o valor da parcela e a data de hoje; se pagou outro valor, ajuste por Compromissos a pagar.</div></section>
    ${emp.obs ? `<section class="bloco"><h2>Observação</h2><div>${esc(emp.obs)}</div></section>` : ''}
    <button class="sec grande" id="cxEditar" style="margin-top:12px;width:100%">Editar empréstimo</button>`;
  $('voltar').onclick = () => { VER = null; tela(P, X); };
  $('cxEditar').onclick = () => { ED = { tipo: 'emp', id: emp.id }; tela(P, X); scrollTo(0, 0); };
  P.querySelectorAll('form[data-parc]').forEach(f => f.onsubmit = async (ev) => {
    ev.preventDefault();
    const p = s.P.find(y => y.n === +f.dataset.parc);
    const r = await marcarParcela(sb, emp.id, p.n, +emp.valor_parcela || 0, iso(new Date()));
    if (r.error) { aviso('Não salvou: ' + r.error.message); return; }
    aviso('Parcela marcada como paga.'); X.aoMudar && X.aoMudar(); tela(P, X);
  });
  P.querySelectorAll('[data-desf]').forEach(b => b.onclick = async () => {
    if (CONF !== b.dataset.desf) { CONF = b.dataset.desf; b.textContent = 'confirmar'; return; }
    CONF = null;
    const r = await desfazerParcela(sb, b.dataset.desf);
    if (r.error) { aviso('Não desfez: ' + r.error.message); return; }
    aviso('Parcela voltou para a pagar.'); X.aoMudar && X.aoMudar(); tela(P, X);
  });
}
