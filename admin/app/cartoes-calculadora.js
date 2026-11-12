// Maktub Go: calculadora de cartões (aba Gestão). Só a equipe da Gestão usa.
// A pessoa informa quanto gasta no cartão e qual cartão usa hoje; a tela mostra quanto ela acumula por ano,
// quanto acumularia nos 3 melhores cartões da base e quanto ganha trocando.
// Sem IA: todo número sai da Base de cartões, do Valor do milheiro, das regras da casa e do motor de contas (cartoes-motor.js).
import { n, chave, familia, refDe, bonusDe, progProprio, contaCartao } from '/admin/app/cartoes-motor.js?v=1';

const PROGS = [['livre', 'O que o cartão usar', ''], ['livelo', 'Livelo', 'livelo'], ['esfera', 'Esfera', 'esfera'], ['smiles', 'Smiles', 'smiles'], ['latam', 'LATAM Pass', 'latam'], ['azul', 'Azul Fidelidade', 'azul']];
const AVISO_VALOR = 'Valor de referência, que varia conforme o resgate. Não é saldo em dinheiro.';
const AVISO_BANCO = 'A aprovação de cartão, limite e upgrade depende do banco.';

// estado da tela: fica no módulo, então um redesenho nunca apaga o que foi preenchido
let S = null;
const novoEstado = (modo, id) => ({ modo, id: id || null, gasto: '', intModo: 'pct', intVal: '', atual: null, prog: 'livre', soVip: false, semConvite: false, bancos: [], trocas: {}, apresenta: false,
  buscaAtual: '', trocando: null, buscaTroca: '', buscaLead: '', ligando: false, dados: null, cliCartoes: null, nome: '', preenchido: false });

export function abrir(modo, id) { S = novoEstado(modo, id); }
export function inicio() { if (S) S.apresenta = false; document.body.classList.remove('calc-apresenta', 'calc-largo'); }
export function rota(h) { const m = h[1] === 'c' ? 'cliente' : h[1] === 'l' ? 'lead' : 'avulsa', id = m === 'avulsa' ? null : h[2] || null; if (!S || S.modo !== m || S.id !== id) S = novoEstado(m, id); }
export const hash = () => !S || S.modo === 'avulsa' ? '/avulsa' : (S.modo === 'cliente' ? '/c/' : '/l/') + S.id;

const brl = (v) => (v < 0 ? '−' : '') + 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR');
const num = (v) => Math.round(v).toLocaleString('pt-BR');
const nomeB = (b) => `${b.banco} ${b.nome}`.trim();
// "20.000", "20000", "R$ 20.000,00", "12,5" e "12.5" viram número
const valorTxt = (t) => { const s = String(t || '').replace(/[^\d,.]/g, ''); if (!s) return null;
  const v = Number(/,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : /^\d+\.\d{1,2}$/.test(s) ? s : s.replace(/[.,]/g, '')); return v >= 0 ? v : null; };

function css() {
  if (document.getElementById('calcCss')) return;
  const st = document.createElement('style'); st.id = 'calcCss';
  st.textContent = `
body.calc-largo .pagina{max-width:1180px}
.calc{--cv:#193826;--co:#715E32;--co2:#B49755;--co3:#A88B4A;--cc:#EBE0C4;--cf:#F7F3EA;--ct:#2B2B26}
.calc .ent{background:#fff;border:1px solid var(--linha);padding:14px;margin-top:12px}
.calc .ent .lin2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.calc label.fl span,.calc .rot{font-size:13px;color:var(--tinta-2);display:block;margin-bottom:4px}
.calc input[type=text],.calc input[type=search],.calc select{width:100%;height:44px;border:1px solid var(--linha);background:#fff;padding:0 10px;font-size:16px}
.calc .chips{display:flex;flex-wrap:wrap;gap:6px}
.calc .chips button{font-size:13px}
.calc .lista{max-height:240px;overflow:auto;border:1px solid var(--linha);margin-top:6px;background:#fff}
.calc .lista button{display:block;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--linha);padding:10px;font-size:16px;cursor:pointer}
.calc .lista button:first-child{border-top:0}
.calc .lista small{display:block;font-size:13px;color:var(--tinta-3)}
.calc .faixa{background:var(--cv);color:var(--cc);padding:18px 16px;margin-top:14px}
.calc .faixa .t{font-family:'Cormorant Garamond',serif;font-size:28px;line-height:1.2}
.calc .faixa .t em{color:var(--co2);font-style:italic}
.calc .faixa .r{font-size:13px;color:var(--cc);opacity:.85;margin-top:8px}
.calc .cols{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}
.calc .col{background:#fff;border:1px solid var(--linha);padding:14px}
.calc .col.atual{background:var(--cc);border:1px solid var(--co3)}
.calc .col .k{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--co)}
.calc .col h3{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:22px;color:var(--cv);line-height:1.15;margin:4px 0 8px}
.calc .col .big{font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--cv);line-height:1.1}
.calc .col .big em{color:var(--co);font-style:italic}
.calc .col dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:16px;margin-top:8px}
.calc .col dt{color:var(--tinta-3);font-size:13px;padding-top:3px}
.calc .col dd{margin:0}
.calc .col .dif{margin-top:8px;font-size:16px;color:var(--cv);font-weight:600}
.calc .col .int{font-size:13px;color:var(--tinta-2);margin-top:8px;line-height:1.5}
.calc .ress{font-size:13px;color:var(--tinta-2);margin-top:12px;line-height:1.5}
.calc .resumo{display:none;font-size:16px;color:var(--tinta-2);margin-top:6px}
.calc .barra{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.calc .barra button{flex:1;min-width:150px}
.calc .sair{display:none}
@media (min-width:900px){.calc .cols{grid-template-columns:repeat(4,1fr)}.calc .ent .lin4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}}
body.calc-apresenta{background:#F7F3EA}
body.calc-apresenta .topo,body.calc-apresenta .nav,body.calc-apresenta #fab,body.calc-apresenta .fab,body.calc-apresenta .calc [data-int],body.calc-apresenta .voltar{display:none!important}
body.calc-apresenta .pagina{padding-top:24px;padding-bottom:40px}
body.calc-apresenta .calc .resumo{display:block}
body.calc-apresenta .calc .faixa{padding:28px 22px}
body.calc-apresenta .calc .faixa .t{font-size:36px}
body.calc-apresenta .calc .sair{display:block;position:fixed;top:calc(8px + env(safe-area-inset-top));right:8px;z-index:40;background:transparent;border:1px solid var(--linha);color:var(--tinta-3);font-size:13px;padding:8px 12px;cursor:pointer}
@media (min-width:900px){body.calc-apresenta .calc .faixa .t{font-size:48px}}
@media (prefers-reduced-motion:no-preference){.calc .faixa,.calc .col{transition:opacity .2s ease}}
`;
  document.head.appendChild(st);
}

// carrega base, milheiros, regras e os dados de quem está sendo simulado (uma vez por abertura)
async function carregar(X) {
  const { sb } = X;
  const [base, refs, rg] = await Promise.all([X.carregarBase(sb), X.CART.valoresRef(), sb.from('regras_estrategia').select('*').eq('ativa', true)]);
  const D = { base: base || [], refs: refs || {}, regras: rg.error ? [] : (rg.data || []) };
  if (S.modo === 'cliente') {
    const c = (X.D.clientes || []).find(x => String(x.id) === String(S.id));
    S.nome = c ? c.nome_completo || '' : '';
    const [p, k] = await Promise.all([sb.from('cliente_perfil').select('gasto_cartao_mes,programa_preferido,companhia_preferida').eq('cliente_id', S.id).maybeSingle(), sb.from('cartoes').select('*').eq('cliente_id', S.id).order('ordem')]);
    S.cliCartoes = (k.data || []).filter(x => x.catalogo_id);
    if (!S.preenchido) {
      const pf = p.data || {};
      if (n(pf.gasto_cartao_mes)) S.gasto = String(Math.round(n(pf.gasto_cartao_mes)));
      const fam = familia(pf.programa_preferido || pf.companhia_preferida || ''), pr = PROGS.find(x => x[2] && x[2] === fam);
      if (pr) S.prog = pr[0];
    }
  }
  if (S.modo === 'lead') preencherLead(X);
  S.preenchido = true;
  return D;
}
function preencherLead(X) {
  const r = (X.D.reunioes || []).find(x => String(x.id) === String(S.id));
  S.nome = r ? r.cliente || '' : '';
  const g = r && X.gastoDoLead ? X.gastoDoLead(r) : null;
  if (g && !S.gasto) S.gasto = String(Math.round(g));
}

export async function tela(P, X) {
  css();
  if (!S) S = novoEstado('avulsa');
  document.body.classList.add('calc-largo');
  document.body.classList.toggle('calc-apresenta', !!S.apresenta);
  const { esc } = X;
  if (!S.dados) {
    P.innerHTML = `<div class="calc"><button class="voltar" id="cVoltar">‹ ${S.modo === 'cliente' ? 'Ficha do cliente' : S.modo === 'lead' ? 'Card do lead' : 'Gestão'}</button><h1 class="titulo" style="margin-top:6px">Calculadora de <em>cartões</em></h1><div class="vazio">Carregando...</div></div>`;
    P.querySelector('#cVoltar').onclick = () => voltar(X);
    try { S.dados = await carregar(X); } catch (e) { if (X.aba() === 'calccartoes') P.querySelector('.vazio').textContent = X.tec('A base de cartões ainda não foi ativada: rode no Supabase o SQL da base de cartões.'); return; }
    if (X.aba() !== 'calccartoes') return;
  }
  const cot = X.D.cfg && n(X.D.cfg.cotacao_dolar);
  const lig = S.modo === 'cliente' ? 'Cliente: ' + esc(S.nome || 'cliente da Gestão') : S.modo === 'lead' ? 'Lead: ' + esc(S.nome || 'lead da Gestão') : 'Simulação avulsa, sem ficha';
  P.innerHTML = `<div class="calc">
    <button class="sair" type="button" id="cSair">Sair da apresentação</button>
    <button class="voltar" id="cVoltar">‹ ${S.modo === 'cliente' ? 'Ficha do cliente' : S.modo === 'lead' ? 'Card do lead' : 'Gestão'}</button>
    <h1 class="titulo" style="margin-top:6px">Calculadora de <em>cartões</em></h1>
    <div class="sub" data-int style="font-size:13px">${lig}${S.modo === 'avulsa' ? ' · <button type="button" class="mini" id="cLigar">Ligar a um lead</button>' : ''}</div>
    <div id="cLigarBox" data-int></div>
    <div class="resumo" id="cResumo"></div>
    <section class="ent" data-int>
      <div class="lin4">
        <label class="fl"><span>Gasto mensal no cartão (R$)</span><input type="text" inputmode="decimal" id="cGasto" value="${esc(S.gasto)}" placeholder="Ex.: 20.000" data-livre></label>
        <div><span class="rot">Quanto disso é internacional</span><div style="display:flex;gap:6px"><input type="text" inputmode="decimal" id="cInt" value="${esc(S.intVal)}" placeholder="0" data-livre style="flex:1"><select id="cIntModo" style="width:80px" data-livre><option value="pct"${S.intModo === 'pct' ? ' selected' : ''}>%</option><option value="rs"${S.intModo === 'rs' ? ' selected' : ''}>R$</option></select></div></div>
        <label class="fl"><span>Programa de destino dos pontos</span><select id="cProg" data-livre>${PROGS.map(([k, l]) => `<option value="${k}"${S.prog === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="fl"><span>Cotação de referência do dólar (R$)</span><div style="display:flex;gap:6px"><input type="text" inputmode="decimal" id="cCot" value="${cot ?? ''}" placeholder="Ex.: 5,40" data-livre style="flex:1"><button class="sec" type="button" id="cCotOk" style="height:44px">Salvar</button></div></label>
      </div>
      <div style="margin-top:12px"><span class="rot">Cartão que usa hoje</span><div id="cAtualBox"></div></div>
      <div style="margin-top:12px"><span class="rot">Filtros (opcionais)</span>
        <div class="chips"><button type="button" id="fVip" class="${S.soVip ? 'on' : ''}">Só sala VIP ilimitada</button><button type="button" id="fConv" class="${S.semConvite ? 'on' : ''}">Esconder somente por convite</button></div>
        <details style="margin-top:8px"${S.bancos.length ? ' open' : ''}><summary class="sub" style="cursor:pointer;font-size:13px">Bancos onde já tem relacionamento${S.bancos.length ? ' (' + S.bancos.length + ')' : ''}</summary><div class="chips" id="fBancos" style="margin-top:6px"></div></details>
      </div>
    </section>
    <div id="cRes"></div>
    <div class="barra" data-int><button class="zap" type="button" id="cApres">Modo apresentação</button>${S.modo !== 'avulsa' ? '<button class="sec" type="button" id="cSalvar">Salvar simulação</button>' : ''}</div>
  </div>`;
  ligar(P, X);
  desenharAtual(P, X); desenharBancos(P, X); desenharResultado(P, X);
}

function voltar(X) {
  inicio();
  if (S.modo === 'cliente' && S.id) return X.abrirFicha(S.id, 'cartoes');
  if (S.modo === 'lead' && S.id) return X.abrirAtendimento(S.id);
  X.ir('gestao');
}

function ligar(P, X) {
  const $q = (s) => P.querySelector(s);
  $q('#cVoltar').onclick = () => voltar(X);
  $q('#cSair').onclick = () => { S.apresenta = false; document.body.classList.remove('calc-apresenta'); desenharResultado(P, X); scrollTo(0, 0); };
  $q('#cApres').onclick = () => { S.apresenta = true; S.trocando = null; document.body.classList.add('calc-apresenta'); desenharResultado(P, X); scrollTo(0, 0); };
  $q('#cGasto').oninput = (e) => { S.gasto = e.target.value; desenharResultado(P, X); };
  $q('#cInt').oninput = (e) => { S.intVal = e.target.value; desenharResultado(P, X); };
  $q('#cIntModo').onchange = (e) => { S.intModo = e.target.value; desenharResultado(P, X); };
  $q('#cProg').onchange = (e) => { S.prog = e.target.value; desenharResultado(P, X); };
  $q('#fVip').onclick = (e) => { S.soVip = !S.soVip; e.target.classList.toggle('on', S.soVip); desenharResultado(P, X); };
  $q('#fConv').onclick = (e) => { S.semConvite = !S.semConvite; e.target.classList.toggle('on', S.semConvite); desenharResultado(P, X); };
  $q('#cCotOk').onclick = async () => {
    const t = $q('#cCot').value.trim(), v = t === '' ? null : Number(t.replace(',', '.'));
    if (v !== null && !(v > 0)) { X.aviso('Cotação inválida.'); return; }
    const { error } = await X.sb.from('configuracoes').update({ cotacao_dolar: v }).eq('id', 1);
    if (error) { X.aviso('Não salvou: ' + X.limparTec(error.message)); return; }
    if (X.D.cfg) X.D.cfg.cotacao_dolar = v;
    X.aviso('Cotação salva.'); desenharResultado(P, X);
  };
  if ($q('#cLigar')) $q('#cLigar').onclick = () => { S.ligando = !S.ligando; desenharLigar(P, X); };
  if ($q('#cSalvar')) $q('#cSalvar').onclick = () => X.aviso(X.tec('Para salvar simulações, rode no Supabase o 87-simulacoes-cartoes.sql.'));
}

// avulsa: liga a simulação a um lead da Gestão (para salvar e para puxar o gasto da qualificação)
function desenharLigar(P, X) {
  const box = P.querySelector('#cLigarBox'), { esc } = X;
  if (!S.ligando) { box.innerHTML = ''; return; }
  const q = chave(S.buscaLead);
  const L = (X.D.reunioes || []).filter(r => r.produto === 'Gestão de Milhas' && r.resultado !== 'Não fechou' && (!q || chave(r.cliente).includes(q))).slice(0, 30);
  box.innerHTML = `<input type="search" id="cBuscaLead" value="${esc(S.buscaLead)}" placeholder="Buscar lead da Gestão pelo nome" style="width:100%;height:44px;margin-top:8px;font-size:16px;padding:0 10px;border:1px solid var(--linha)">
    <div class="lista">${L.length ? L.map(r => `<button type="button" data-lead="${esc(r.id)}">${esc(r.cliente || 'Sem nome')}<small>${esc(r.etapa || r.resultado || '')}</small></button>`).join('') : '<div class="vazio">Nenhum lead da Gestão com esse nome.</div>'}</div>`;
  const inp = box.querySelector('#cBuscaLead');
  inp.oninput = (e) => { S.buscaLead = e.target.value; const pos = e.target.selectionStart; desenharLigar(P, X); const i = box.querySelector('#cBuscaLead'); i.focus(); i.setSelectionRange(pos, pos); };
  box.querySelectorAll('[data-lead]').forEach(b => b.onclick = () => {
    S.modo = 'lead'; S.id = b.dataset.lead; S.ligando = false; preencherLead(X);
    history.replaceState(null, '', '#calccartoes' + hash());
    tela(P, X);
  });
}

// cartão que a pessoa usa hoje: os do cliente (vindo da ficha), a busca na base ou "não tenho cartão que pontua"
function desenharAtual(P, X) {
  const box = P.querySelector('#cAtualBox'), { esc } = X, base = S.dados.base;
  const porId = Object.fromEntries(base.map(b => [b.id, b]));
  const doCli = (S.cliCartoes || []).filter(k => porId[k.catalogo_id]);
  const escolhido = S.atual && S.atual !== 'nenhum' ? porId[S.atual] : null;
  const q = chave(S.buscaAtual);
  const achados = q.length >= 2 ? base.filter(b => chave(nomeB(b) + ' ' + (b.programa || '')).includes(q)).slice(0, 25) : [];
  box.innerHTML = `${doCli.length ? `<div class="sub" style="font-size:13px;margin:0 0 6px">Cartões do cliente: marque qual concentra o gasto.</div><div class="chips">${doCli.map(k => `<button type="button" data-at="${esc(k.catalogo_id)}" class="${S.atual === k.catalogo_id ? 'on' : ''}">${esc(nomeB(porId[k.catalogo_id]))}</button>`).join('')}</div>` : ''}
    <div class="chips" style="margin-top:6px"><button type="button" data-at="nenhum" class="${S.atual === 'nenhum' ? 'on' : ''}">Não tenho cartão que pontua</button>${escolhido && !doCli.some(k => k.catalogo_id === escolhido.id) ? `<button type="button" class="on" data-at="${esc(escolhido.id)}">${esc(nomeB(escolhido))}</button>` : ''}</div>
    <input type="search" id="cBuscaAtual" value="${esc(S.buscaAtual)}" placeholder="Buscar outro cartão na base pelo nome" style="margin-top:8px">
    ${achados.length ? `<div class="lista">${achados.map(b => `<button type="button" data-at="${esc(b.id)}">${esc(nomeB(b))}<small>${esc(b.programa || '')}${b.a_confirmar ? ' · a confirmar' : ''}</small></button>`).join('')}</div>` : q.length >= 2 ? '<div class="vazio" style="font-size:13px">Nenhum cartão com esse nome na base.</div>' : ''}`;
  const inp = box.querySelector('#cBuscaAtual');
  inp.oninput = (e) => { S.buscaAtual = e.target.value; const pos = e.target.selectionStart; desenharAtual(P, X); const i = box.querySelector('#cBuscaAtual'); i.focus(); i.setSelectionRange(pos, pos); };
  box.querySelectorAll('[data-at]').forEach(b => b.onclick = () => { S.atual = b.dataset.at; S.buscaAtual = ''; desenharAtual(P, X); desenharResultado(P, X); });
}

function desenharBancos(P, X) {
  const box = P.querySelector('#fBancos'), { esc } = X;
  const bancos = [...new Set(S.dados.base.filter(b => b.ativo !== false && b.vendido_hoje !== false).map(b => b.banco).filter(Boolean))].sort((a, c) => a.localeCompare(c));
  box.innerHTML = bancos.map(b => `<button type="button" data-bc="${esc(b)}" class="${S.bancos.includes(b) ? 'on' : ''}">${esc(b)}</button>`).join('');
  box.querySelectorAll('[data-bc]').forEach(b => b.onclick = () => {
    const v = b.dataset.bc; S.bancos = S.bancos.includes(v) ? S.bancos.filter(x => x !== v) : [...S.bancos, v];
    b.classList.toggle('on', S.bancos.includes(v));
    const sm = P.querySelector('#fBancos').closest('details').querySelector('summary'); sm.textContent = 'Bancos onde já tem relacionamento' + (S.bancos.length ? ` (${S.bancos.length})` : '');
    desenharResultado(P, X);
  });
}

/* ---------- contas ---------- */
// entradas já em número: gasto nacional e internacional por mês, em R$
export function gastos(gastoTxt, intTxt, intModo) {
  const g = valorTxt(gastoTxt) || 0, iv = valorTxt(intTxt) || 0;
  const gInt = Math.min(g, intModo === 'pct' ? g * Math.min(iv, 100) / 100 : iv);
  return { total: g, gNac: g - gInt, gInt };
}
// um cartão com o gasto: pontos (no programa de destino, ou no programa do próprio cartão), valor, anuidade e resultado no ano
export function contaCalc(b, G, E) {
  const c = contaCartao(b, G.gNac, G.gInt, { ...E.ctx, anuidadePaga: E.anuidadePaga ? E.anuidadePaga(b) : undefined });
  let pontos = null, programa = '';
  if (c.modo === 'direto' || c.modo === 'transferido') { pontos = c.pontos === null ? null : c.milhas; programa = E.ctx.prefNome; }
  else if (c.modo === 'outro' && c.outro) { pontos = c.outro.pontos; programa = progProprio(b) || c.outro.programa; }
  else if (c.modo === 'nenhum') { pontos = 0; programa = ''; }
  return { b, c, pontos, programa, chega: c.modo === 'direto' || c.modo === 'transferido', valor: c.valor, anuidade: c.anuidade, saldo: c.saldo, cashback: c.modo === 'cashback', a_confirmar: !!b.a_confirmar, extNacional: c.extNacional };
}
// ranking: cartões vendidos hoje, com resultado calculável, pelos filtros; ordem pelo resultado no ano (valor - anuidade)
export function ranking(base, G, E, F) {
  return base.filter(b => b.ativo !== false && b.vendido_hoje !== false && b.id !== F.atualId
      && (!F.soVip || b.salas_vip_ilimitado) && (!F.semConvite || !b.somente_convite) && (!F.bancos.length || F.bancos.includes(b.banco))
      && (!F.soConferidos || !b.a_confirmar))
    // com um programa de destino escolhido, entram só os cartões cujos pontos chegam nele
    .map(b => contaCalc(b, G, E)).filter(x => x.saldo !== null && (!E.ctx.pref || x.chega))
    .sort((a, c) => c.saldo - a.saldo || (c.pontos ?? 0) - (a.pontos ?? 0) || nomeB(a.b).localeCompare(nomeB(c.b)));
}
// "sem cartão que pontua": não acumula nada e não paga anuidade de cartão que pontua
const NENHUM = { b: null, pontos: 0, programa: '', valor: 0, anuidade: 0, saldo: 0, nenhum: true };

function contexto(X) {
  const { refs, regras } = S.dados, pr = PROGS.find(x => x[0] === S.prog) || PROGS[0], pref = pr[2];
  return { calc: X.calc, cotacao: X.D.cfg && n(X.D.cfg.cotacao_dolar), refs, normProg: X.CART.normProg, pref, prefNome: pref ? pr[1] : '',
    bonus: pref ? bonusDe(regras, pref) : 0, milheiro: pref ? refDe(refs, pref) : null, livre: !pref };
}

function desenharResultado(P, X) {
  const box = P.querySelector('#cRes'), { esc } = X, base = S.dados.base;
  if (!box) return;
  const ctx = contexto(X), G = gastos(S.gasto, S.intVal, S.intModo);
  const porId = Object.fromEntries(base.map(b => [b.id, b]));
  const kCli = (id) => (S.cliCartoes || []).find(k => k.catalogo_id === id);
  // anuidade negociada do cliente só vale para o cartão que ele já tem
  const E = { ctx, anuidadePaga: (b) => { const k = kCli(b.id); return k && n(k.anuidade_paga) !== null ? n(k.anuidade_paga) : undefined; } };
  const resumo = P.querySelector('#cResumo');
  if (resumo) resumo.textContent = G.total ? `Gasto de ${brl(G.total)} por mês${G.gInt ? `, ${brl(G.gInt)} no exterior` : ''}${ctx.pref ? ', pontos em ' + ctx.prefNome : ''}.` : '';
  const avisos = [];
  if (!(ctx.cotacao > 0)) avisos.push('Falta a cotação de referência do dólar: sem ela, os cartões que pontuam por dólar não entram na conta.');
  if (ctx.pref && ctx.milheiro === null) avisos.push(`Sem valor do milheiro de ${ctx.prefNome} em "Valor do milheiro".`);
  if (!G.total) { box.innerHTML = `${avisos.map(a => `<div class="config" data-int style="margin-top:12px;font-size:13px">${esc(a)}</div>`).join('')}<div class="vazio" style="margin-top:14px">Informe o gasto mensal no cartão para ver a conta.</div>`; return; }

  const atual = S.atual === 'nenhum' ? NENHUM : S.atual && porId[S.atual] ? contaCalc(porId[S.atual], G, E) : null;
  const F = { atualId: atual && atual.b ? atual.b.id : null, soVip: S.soVip, semConvite: S.semConvite, bancos: S.bancos, soConferidos: S.apresenta };
  const R = ranking(base, G, E, F);
  // os 3 da tela: o ranking, com as trocas que a equipe fez em "Comparar outro cartão"
  const tres = [];
  for (let i = 0; i < 3; i++) {
    // no modo apresentação só entram cartões já conferidos, também os escolhidos pela equipe
    const t = S.trocas[i] && porId[S.trocas[i]] && !(S.apresenta && porId[S.trocas[i]].a_confirmar) ? porId[S.trocas[i]] : null;
    if (t) tres.push({ ...contaCalc(t, G, E), trocado: true });
    else { const x = R.find(r => !tres.some(y => y.b.id === r.b.id) && !Object.values(S.trocas).includes(r.b.id)); if (x) tres.push(x); }
  }
  // destaque: o melhor dos 3 que pode ir para o topo (dados conferidos e pontuação toda na base) e que ganha do atual
  const ok = (x) => !x.a_confirmar && !x.extNacional && x.saldo !== null;
  const ref = atual && atual.saldo !== null ? atual.saldo : null;
  // quando os 3 de cima estão a confirmar, o destaque vai para o melhor já conferido do ranking (é o que o modo apresentação mostra)
  const melhor3 = tres.filter(ok).sort((a, c) => c.saldo - a.saldo)[0] || null;
  const melhor = melhor3 || R.find(ok) || null, foraDos3 = melhor && !melhor3;
  const mesmoProg = (a, c) => a && c && a.programa && a.programa === c.programa;
  let dest = '';
  if (!atual) dest = `<div class="t">Marque o cartão que a pessoa usa hoje para comparar.</div>`;
  else if (!melhor) dest = `<div class="t">Os cartões que mais rendem com esse gasto ainda têm dados a conferir na base.</div>`;
  else if (ref !== null && melhor.saldo <= ref) dest = `<div class="t">Com esse gasto, o ${esc(nomeB(atual.b))} já rende mais que as opções da base.</div>`;
  else {
    const dPts = atual.nenhum || mesmoProg(atual, melhor) ? (melhor.pontos ?? 0) - (atual.pontos ?? 0) : null;
    const dVal = (melhor.valor ?? 0) - (atual.valor ?? 0), dSaldo = melhor.saldo - (ref ?? 0);
    const quem = atual.nenhum ? `Com o ${esc(nomeB(melhor.b))}` : `Trocando o ${esc(nomeB(atual.b))} pelo ${esc(nomeB(melhor.b))}`;
    const prog = melhor.programa ? ` no ${esc(melhor.programa)}` : '';
    dest = atual.nenhum && melhor.pontos > 0
      ? `<div class="t">${quem}, você passa a acumular <em>${num(melhor.pontos)} pontos</em> por ano${prog}, cerca de <em>${brl(melhor.valor ?? 0)}</em> em passagens.</div>`
      : dPts !== null && dPts > 0 && dVal > 0
      ? `<div class="t">${quem}, você acumula <em>+ ${num(dPts)} pontos</em> por ano${prog}, cerca de <em>${brl(dVal)}</em> em passagens.</div>`
      : dVal > 0 && melhor.pontos
        ? `<div class="t">${quem}, você passa a acumular <em>${num(melhor.pontos)} pontos</em> por ano${prog}, cerca de <em>${brl(dVal)}</em> a mais em passagens.</div>`
        : `<div class="t">${quem}, sobram cerca de <em>${brl(dSaldo)}</em> a mais por ano, já descontada a anuidade.</div>`;
  }

  const anuTxt = (x) => x.anuidade === null || x.anuidade === undefined ? 'não informada na base' : x.anuidade === 0 ? (x.c && x.c.isenta ? 'isenta com esse gasto' : 'sem anuidade') : brl(x.anuidade) + ' por ano' + (x.c && x.c.reduzida ? ` (${String(x.c.redPct).replace('.', ',')}% de desconto pelo gasto)` : '');
  const exige = (b) => [n(b.exige_renda) ? `renda de ${brl(n(b.exige_renda))} por mês` : '', n(b.exige_invest) ? `${brl(n(b.exige_invest))} investidos` : '', b.somente_convite ? 'somente por convite' : ''].filter(Boolean).join(', ') || 'sem exigência de renda ou investimento na base';
  const ptsTxt = (x) => x.cashback ? 'cashback, sem pontos' : x.pontos === null ? 'não calculado' : `${num(x.pontos)}${x.programa ? ' ' + esc(x.programa) : ''}`;
  const dif = (x) => {
    if (!atual) return '';
    const dP = atual.nenhum || mesmoProg(atual, x) ? (x.pontos ?? 0) - (atual.pontos ?? 0) : null, dV = (x.valor ?? 0) - (atual.valor ?? 0), dS = x.saldo === null ? null : x.saldo - (ref ?? 0);
    const sinal = (v, f) => (v > 0 ? '+ ' : v < 0 ? '− ' : '') + f(Math.abs(v));
    return `<div class="dif">${dP !== null ? sinal(dP, num) + ' pontos · ' : ''}${sinal(dV, (v) => brl(v))} em pontos por ano</div>${dS !== null ? `<div style="font-size:13px;color:var(--tinta-2)">Resultado ${sinal(dS, (v) => brl(v))} por ano contra hoje, com a anuidade.</div>` : ''}`;
  };
  const col = (x, i) => {
    if (x.nenhum) return `<div class="col atual"><div class="k">Hoje</div><h3>Sem cartão que pontua</h3><div class="big">0 <em>pontos</em></div><div style="font-size:13px;color:var(--tinta-2);margin-top:6px">Hoje o gasto não vira pontos.</div></div>`;
    const b = x.b, interno = [x.a_confirmar ? '<span class="tag alerta">a confirmar</span>' : '', x.trocado ? '<span class="tag">escolhido pela equipe</span>' : ''].filter(Boolean).join(' ');
    const notas = [...x.c.notas, b.exige_outro ? 'Outra exigência: ' + b.exige_outro : '', x.c.fontes.length ? 'Fontes: ' + x.c.fontes.join(', ') : '', b.conferido_em ? 'Conferido em ' + String(b.conferido_em).slice(0, 10).split('-').reverse().join('/') : 'Sem data de conferência', b.observacoes || ''].filter(Boolean);
    return `<div class="col${i === -1 ? ' atual' : ''}">
      <div class="k">${i === -1 ? 'Hoje' : 'Opção ' + (i + 1)}</div>
      <h3>${esc(nomeB(b))}</h3>${interno ? `<div data-int style="margin:-4px 0 6px">${interno}</div>` : ''}
      <div class="big">${x.pontos !== null && !x.cashback ? `${num(x.pontos)} <em>pontos/ano</em>` : x.cashback ? '<em>cashback</em>' : '<em>não calculado</em>'}</div>
      <dl>
        <dt>Pontos</dt><dd>${ptsTxt(x)}</dd>
        <dt>Valor</dt><dd>${x.valor !== null ? 'cerca de ' + brl(x.valor) + ' por ano' : 'sem valor de referência'}</dd>
        <dt>Anuidade</dt><dd>${esc(anuTxt(x))}</dd>
        <dt>Resultado</dt><dd>${x.saldo !== null ? brl(x.saldo) + ' por ano' : 'não calculado'}</dd>
        <dt>Sala VIP</dt><dd>${esc(X.salaVip(b) || 'sem sala VIP na base')}</dd>
        ${i >= 0 ? `<dt>Para ter</dt><dd>${esc(exige(b))}</dd>` : ''}
      </dl>
      ${i >= 0 ? dif(x) : ''}
      <div class="int" data-int>${notas.map(esc).join('<br>')}</div>
      ${i >= 0 ? `<div data-int style="margin-top:10px"><button class="mini" type="button" data-trocar="${i}">Comparar outro cartão</button>${x.trocado ? ` <button class="mini" type="button" data-desfaz="${i}">Voltar ao sugerido</button>` : ''}</div><div data-int id="cTroca${i}"></div>` : ''}
    </div>`;
  };
  box.innerHTML = `${avisos.map(a => `<div class="config" data-int style="margin-top:12px;font-size:13px">${esc(a)}</div>`).join('')}
    <section class="faixa">${dest}<div class="r">${AVISO_VALOR}</div>${foraDos3 && ref !== null && melhor.saldo > ref ? `<div class="r" data-int>Os 3 de cima estão a confirmar: o destaque usa o melhor cartão já conferido, ${esc(nomeB(melhor.b))}.</div>` : ''}</section>
    <div class="cols">${atual ? col(atual, -1) : ''}${tres.map((x, i) => col(x, i)).join('')}</div>
    ${!tres.length ? '<div class="vazio">Nenhum cartão da base com esses filtros e resultado calculável.</div>' : ''}
    <div class="ress">${AVISO_VALOR}<br>${AVISO_BANCO}</div>
    <div class="sub" data-int style="font-size:13px;margin-top:8px">Contas por fórmula, sem IA: pontuação, anuidade e isenção da Base de cartões; valor pelo milheiro de referência${ctx.pref ? ` de ${esc(ctx.prefNome)} (${ctx.milheiro !== null ? 'R$ ' + String(ctx.milheiro).replace('.', ',') : 'sem valor'})` : ' do programa de cada cartão'}${ctx.bonus ? `, com bônus médio de transferência de ${num(ctx.bonus)}% (regra da casa) para pontos de banco` : ''}; dólar a ${ctx.cotacao > 0 ? 'R$ ' + String(ctx.cotacao).replace('.', ',') : 'definir'}. Ordem pelo resultado no ano (valor menos anuidade). ${S.apresenta ? '' : 'No modo apresentação entram só cartões já conferidos.'}</div>`;
  box.querySelectorAll('[data-trocar]').forEach(b => b.onclick = () => { S.trocando = Number(b.dataset.trocar); S.buscaTroca = ''; desenharTroca(P, X); });
  box.querySelectorAll('[data-desfaz]').forEach(b => b.onclick = () => { delete S.trocas[b.dataset.desfaz]; desenharResultado(P, X); });
  if (S.trocando !== null) desenharTroca(P, X);
  S.ultimo = { G, ctx: { pref: ctx.pref, prefNome: ctx.prefNome, cotacao: ctx.cotacao, milheiro: ctx.milheiro, bonus: ctx.bonus }, atual, tres, melhor };
}

// "Comparar outro cartão": busca na base e troca a opção escolhida
function desenharTroca(P, X) {
  const i = S.trocando, box = P.querySelector('#cTroca' + i), { esc } = X;
  if (!box) return;
  const q = chave(S.buscaTroca);
  const L = q.length >= 2 ? S.dados.base.filter(b => b.ativo !== false && chave(nomeB(b) + ' ' + (b.programa || '')).includes(q)).slice(0, 20) : [];
  box.innerHTML = `<input type="search" id="cBuscaTroca" value="${esc(S.buscaTroca)}" placeholder="Buscar cartão na base" style="margin-top:8px">
    ${L.length ? `<div class="lista">${L.map(b => `<button type="button" data-tc="${esc(b.id)}">${esc(nomeB(b))}<small>${esc(b.programa || '')}${b.a_confirmar ? ' · a confirmar' : ''}${b.vendido_hoje === false ? ' · fora de linha' : ''}</small></button>`).join('')}</div>` : ''}
    <button class="mini" type="button" id="cTrocaFecha" style="margin-top:6px">Fechar</button>`;
  const inp = box.querySelector('#cBuscaTroca'); inp.focus();
  inp.oninput = (e) => { S.buscaTroca = e.target.value; const pos = e.target.selectionStart; desenharTroca(P, X); const n2 = box.querySelector('#cBuscaTroca'); n2.focus(); n2.setSelectionRange(pos, pos); };
  box.querySelector('#cTrocaFecha').onclick = () => { S.trocando = null; box.innerHTML = ''; };
  box.querySelectorAll('[data-tc]').forEach(b => b.onclick = () => { S.trocas[i] = b.dataset.tc; S.trocando = null; desenharResultado(P, X); });
}
