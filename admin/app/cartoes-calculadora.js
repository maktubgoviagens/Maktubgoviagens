// Maktub Go: calculadora de cartões (aba Gestão). Só a equipe da Gestão usa.
// A equipe marca o cartão que a pessoa usa hoje e escolhe até 3 cartões da base para comparar (as sugestões vêm
// em ordem de pontos, só como ajuda); a tela mostra os pontos por ano de cada um e quantos pontos a mais ela acumula trocando.
// Sem IA: todo número sai da Base de cartões, do Valor do milheiro, das regras da casa e do motor de contas (cartoes-motor.js).
import { n, chave, familia, refDe, bonusDe, progProprio, contaCartao } from '/admin/app/cartoes-motor.js?v=1';

const PROGS = [['livre', 'O que o cartão usar', ''], ['livelo', 'Livelo', 'livelo'], ['esfera', 'Esfera', 'esfera'], ['smiles', 'Smiles', 'smiles'], ['latam', 'LATAM Pass', 'latam'], ['azul', 'Azul Fidelidade', 'azul']];
const MAX_ESC = 3;
const AVISO_BANCO = 'A aprovação de cartão, limite e upgrade depende do banco.';

// estado da tela: fica no módulo, então um redesenho nunca apaga o que foi preenchido
let S = null;
const novoEstado = (modo, id) => ({ modo, id: id || null, gasto: '', intModo: 'pct', intVal: '', atual: null, prog: 'livre', soVip: false, semConvite: false, bancos: [], escolhidos: [], apresenta: false,
  buscaAtual: '', buscaComp: '', cotAberta: false, buscaLead: '', ligando: false, dados: null, cliCartoes: null, nome: '', preenchido: false });

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
body.calc-largo{--conteudo:1180px}
body.calc-largo .pagina{max-width:1180px}
body.calc-apresenta .pagina{margin-left:auto!important;margin-right:auto!important}
.calc{--cv:#193826;--co:#715E32;--co2:#B49755;--co3:#A88B4A;--cc:#EBE0C4;--cf:#F7F3EA;--ct:#2B2B26}
.calc .ent{background:#fff;border:1px solid var(--linha);padding:14px;margin-top:12px}
.calc .passo{margin-top:16px}
.calc .passo:first-child{margin-top:0}
.calc .passo > .rot{font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:var(--co);font-weight:600;margin-bottom:8px}
.calc .ent .lin2{display:grid;grid-template-columns:1fr;gap:10px}
.calc .esc{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.calc .esc span{display:inline-flex;align-items:center;gap:6px;background:var(--cv);color:var(--cc);font-size:14px;padding:6px 6px 6px 12px;border-radius:999px}
.calc .esc button{background:none;border:0;color:var(--cc);font-size:16px;line-height:1;width:28px;height:28px;cursor:pointer}
.calc .opcoes button[disabled]{opacity:.45;cursor:default}
.calc .lnk{background:none;border:0;padding:0;color:var(--co);text-decoration:underline;font-size:14px;cursor:pointer}
.calc label.fl span,.calc .rot{font-size:14px;color:var(--tinta-2);display:block;margin-bottom:4px}
.calc input[type=text],.calc input[type=search],.calc select{width:100%;height:44px;border:1px solid var(--linha);background:#fff;padding:0 10px;font-size:16px}
.calc .chips{display:flex;flex-wrap:wrap;gap:6px}
.calc .chips button{font-size:14px}
.calc .opcoes{max-height:240px;overflow:auto;border:1px solid var(--linha);margin-top:6px;background:#fff}
.calc .opcoes button{display:block;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--linha);padding:10px;font-size:16px;cursor:pointer}
.calc .opcoes button:first-child{border-top:0}
.calc .opcoes small{display:block;font-size:14px;color:var(--tinta-3)}
.calc .faixa{background:var(--cv);color:var(--cc);padding:18px 16px;margin-top:14px}
.calc .faixa .t{font-family:'Cormorant Garamond',serif;font-size:28px;line-height:1.2}
.calc .faixa .t em{color:var(--co2);font-style:italic}
.calc .faixa .r{font-size:14px;color:var(--cc);opacity:.85;margin-top:8px}
.calc .cols{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}
.calc .col{background:#fff;border:1px solid var(--linha);padding:14px}
.calc .col.atual{background:var(--cc);border:1px solid var(--co3)}
.calc .col .k{font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:var(--co)}
.calc .col h3{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:22px;color:var(--cv);line-height:1.15;margin:4px 0 8px}
.calc .col .big{font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--cv);line-height:1.1}
.calc .col .big em{color:var(--co);font-style:italic}
.calc .col .cprog{font-size:14px;color:var(--tinta-3)}
.calc .col dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:16px;margin-top:10px}
.calc .col dt{color:var(--tinta-3);font-size:14px;padding-top:3px}
.calc .col dd{margin:0}
.calc .col .dif{margin-top:6px;font-size:16px;color:var(--cv);font-weight:600}
.calc .ress{font-size:14px;color:var(--tinta-2);margin-top:12px;line-height:1.5}
.calc .resumo{display:none;font-size:16px;color:var(--tinta-2);margin-top:6px}
.calc .barra{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.calc .barra button{flex:1;min-width:150px}
.calc .sair{display:none}
.calc .salvas{margin-top:16px}
.calc .salvas button.sv{display:block;width:100%;text-align:left;background:#fff;border:1px solid var(--linha);border-top:0;padding:10px 12px;font-size:16px;cursor:pointer}
.calc .salvas button.sv:first-of-type{border-top:1px solid var(--linha)}
.calc .salvas small{display:block;font-size:14px;color:var(--tinta-3)}
@media (min-width:900px){.calc .cols{grid-template-columns:repeat(var(--ncols,4),minmax(0,1fr))}.calc .ent .lin2{grid-template-columns:1fr 1fr}}
body.calc-apresenta{background:#F7F3EA}
body.calc-apresenta .topo,body.calc-apresenta .nav,body.calc-apresenta #fab,body.calc-apresenta .fab,body.calc-apresenta .calc [data-int],body.calc-apresenta .voltar{display:none!important}
body.calc-apresenta .pagina{padding-top:24px;padding-bottom:40px}
body.calc-apresenta .calc .resumo{display:block}
body.calc-apresenta .calc .faixa{padding:28px 22px}
body.calc-apresenta .calc .faixa .t{font-size:36px}
body.calc-apresenta .calc .sair{display:block;position:fixed;top:calc(8px + env(safe-area-inset-top));right:8px;z-index:40;background:transparent;border:1px solid var(--linha);color:var(--tinta-3);font-size:14px;padding:8px 12px;cursor:pointer}
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
      <div class="passo"><div class="rot">1. Cartão que usa hoje</div><div id="cAtualBox"></div></div>
      <div class="passo"><div class="rot">2. Programa dos pontos</div>
        <div class="chips" id="cProgs">${PROGS.map(([k, l]) => `<button type="button" data-prog="${k}" class="${S.prog === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="passo"><div class="rot">3. Comparar com (até ${MAX_ESC})</div><div id="cCompBox"></div>
        <details style="margin-top:8px"${S.soVip || S.semConvite || S.bancos.length ? ' open' : ''}><summary class="sub" style="cursor:pointer;font-size:13px">Filtrar sugestões</summary>
          <div class="chips" style="margin-top:6px"><button type="button" id="fVip" class="${S.soVip ? 'on' : ''}">Só sala VIP ilimitada</button><button type="button" id="fConv" class="${S.semConvite ? 'on' : ''}">Esconder somente por convite</button></div>
          <div class="sub" style="font-size:13px;margin-top:8px">Bancos onde já tem relacionamento</div><div class="chips" id="fBancos" style="margin-top:6px"></div></details></div>
      <div class="passo"><div class="rot">4. Gasto</div>
        <div class="lin2">
          <label class="fl"><span>Gasto mensal no cartão (R$)</span><input type="text" inputmode="decimal" id="cGasto" value="${esc(S.gasto)}" placeholder="Ex.: 20.000" data-livre></label>
          <div><span class="rot">Quanto disso é internacional</span><div style="display:flex;gap:6px"><input type="text" inputmode="decimal" id="cInt" value="${esc(S.intVal)}" placeholder="0" data-livre style="flex:1"><select id="cIntModo" style="width:80px" data-livre><option value="pct"${S.intModo === 'pct' ? ' selected' : ''}>%</option><option value="rs"${S.intModo === 'rs' ? ' selected' : ''}>R$</option></select></div></div>
        </div>
        <div class="sub" style="font-size:13px;margin-top:8px"><span id="cCotLinha">${esc(linhaDolar(X.D.cfg))}</span> <button type="button" class="lnk" id="cCotAlt">alterar</button></div>
        <div id="cCotBox"${S.cotAberta ? '' : ' hidden'} style="margin-top:8px"><div style="display:flex;gap:6px;max-width:360px"><input type="text" inputmode="decimal" id="cCot" value="${cot ?? ''}" placeholder="Ex.: 5,40" data-livre style="flex:1" aria-label="Cotação do dólar (R$)"><button class="sec" type="button" id="cCotOk" style="height:44px">Salvar</button></div>
          <div class="sub" id="cCotInfo" style="font-size:13px">${esc(origemDolar(X.D.cfg))}</div></div>
      </div>
    </section>
    <div id="cRes"></div>
    <div class="barra" data-int><button class="zap" type="button" id="cApres">Modo apresentação</button>${S.modo !== 'avulsa' ? '<button class="sec" type="button" id="cSalvar">Salvar simulação</button>' : ''}</div>
    <div class="salvas" id="cSalvas" data-int></div>
  </div>`;
  ligar(P, X);
  desenharAtual(P, X); desenharBancos(P, X); atualizar(P, X);
  if (S.modo !== 'avulsa') desenharSalvas(P, X);
}
// tudo que depende das entradas: as sugestões do passo 3 e o resultado
function atualizar(P, X) { desenharComparar(P, X); desenharResultado(P, X); }

/* ---------- simulações salvas (tabela simulacoes_cartoes, 88-simulacoes-cartoes.sql) ---------- */
// resumo de um cartão para guardar: só o que a tela mostrou
const fotoCartao = (x) => !x ? null : x.nenhum ? { nenhum: true, cartao: 'Sem cartão que pontua', pontos: 0, valor: 0, anuidade: 0, resultado: 0 }
  : { catalogo_id: x.b.id, cartao: nomeB(x.b), pontos: x.pontos, programa: x.programa || null, valor: x.valor, anuidade: x.anuidade, isenta: !!(x.c && x.c.isenta), resultado: x.saldo, a_confirmar: !!x.a_confirmar };
async function salvar(P, X) {
  const U = S.ultimo;
  if (!U || !U.G.total) { X.aviso('Informe o gasto mensal antes de salvar.'); return; }
  if (!U.atual) { X.aviso('Marque o cartão que a pessoa usa hoje antes de salvar.'); return; }
  if (!U.escolhidos.length) { X.aviso('Escolha pelo menos um cartão para comparar antes de salvar.'); return; }
  const bt = P.querySelector('#cSalvar'); if (bt) bt.disabled = true;
  const destaque = (P.querySelector('.faixa .t') || {}).textContent || '';
  const row = {
    cliente_id: S.modo === 'cliente' ? S.id : null, atendimento_id: S.modo === 'lead' ? S.id : null, nome: S.nome || null, criado_por: X.D.meuId || null,
    entrada: { gasto_mes: U.G.total, gasto_nacional: U.G.gNac, gasto_internacional: U.G.gInt, internacional_digitado: S.intVal, internacional_modo: S.intModo, cartao_atual: S.atual,
      programa: S.prog, programa_nome: U.ctx.prefNome || 'O que o cartão usar', so_vip_ilimitada: S.soVip, esconder_convite: S.semConvite, bancos: S.bancos, escolhidos: S.escolhidos,
      cotacao_dolar: U.ctx.cotacao, milheiro: U.ctx.milheiro, bonus_transferencia: U.ctx.bonus },
    resultado: { atual: fotoCartao(U.atual), opcoes: U.escolhidos.map(fotoCartao), destaque: U.melhor ? { catalogo_id: U.melhor.b.id, cartao: nomeB(U.melhor.b) } : null, texto_destaque: destaque.trim() },
  };
  const r = await X.sb.from('simulacoes_cartoes').insert(row).select().single();
  if (bt) bt.disabled = false;
  if (r.error) { X.aviso(/simulacoes_cartoes/.test(r.error.message) ? X.tec('Para salvar simulações, rode no Supabase o 88-simulacoes-cartoes.sql.') : 'Não salvou: ' + X.limparTec(r.error.message)); return; }
  X.aviso('Simulação salva.');
  desenharSalvas(P, X);
}
// lista do cliente (e dos cards de lead ligados a ele) ou do lead; tocar numa traz as entradas de volta, sem recarregar a página
async function desenharSalvas(P, X) {
  const box = P.querySelector('#cSalvas'); if (!box) return;
  const L = await listarSimulacoes(X, S.modo === 'cliente' ? { cliente: S.id } : { lead: S.id });
  if (!box.isConnected) return;
  if (L === null) { box.innerHTML = ''; return; }
  box.innerHTML = L.length ? `<details><summary class="sub" style="cursor:pointer;font-size:13px">Simulações salvas (${L.length})</summary>${L.map(x => `<button type="button" class="sv" data-sv="${X.esc(x.id)}">${X.esc(resumoSimulacao(x))}<small>${X.esc(rodapeSimulacao(x, X))}</small></button>`).join('')}
    <div class="sub" style="font-size:13px">Tocar numa simulação traz as entradas dela de volta. A conta é refeita com a base de hoje.</div></details>` : '';
  box.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => {
    const x = L.find(y => String(y.id) === b.dataset.sv), e = (x && x.entrada) || {};
    // simulações salvas antes desta versão guardavam as "trocas"; as de agora guardam os escolhidos
    const esc0 = Array.isArray(e.escolhidos) ? e.escolhidos : Object.values(e.trocas || {});
    Object.assign(S, { gasto: e.gasto_mes ? String(e.gasto_mes) : '', intVal: e.internacional_digitado || '', intModo: e.internacional_modo || 'pct', atual: e.cartao_atual || null, prog: e.programa || 'livre',
      soVip: !!e.so_vip_ilimitada, semConvite: !!e.esconder_convite, bancos: e.bancos || [], escolhidos: esc0.slice(0, MAX_ESC), buscaComp: '' });
    tela(P, X); scrollTo(0, 0); X.aviso('Simulação carregada.');
  });
}
export async function listarSimulacoes(X, { cliente, lead }) {
  let q = X.sb.from('simulacoes_cartoes').select('*').order('criado_em', { ascending: false }).limit(20);
  if (lead) q = q.eq('atendimento_id', lead);
  else {
    const cards = X.cardsDoCliente ? X.cardsDoCliente(cliente) : [];
    q = cards.length ? q.or(`cliente_id.eq.${cliente},atendimento_id.in.(${cards.join(',')})`) : q.eq('cliente_id', cliente);
  }
  const r = await q;
  return r.error ? null : (r.data || []);
}
export const resumoSimulacao = (x) => { const e = x.entrada || {}, R = x.resultado || {}, a = R.atual, d = R.destaque;
  return [e.gasto_mes ? brl(e.gasto_mes) + ' por mês' : '', a ? a.cartao : '', d ? 'trocando por ' + d.cartao : ''].filter(Boolean).join(' · '); };
export const rodapeSimulacao = (x, X) => [new Date(x.criado_em).toLocaleDateString('pt-BR'), X.nomeTime ? X.nomeTime(x.criado_por) : '', x.atendimento_id && !x.cliente_id ? 'no card do lead' + (x.nome ? ' ' + x.nome : '') : '', (x.entrada || {}).programa_nome || ''].filter(Boolean).join(' · ');

// de onde veio o dólar: a busca automática dos dias úteis (89-cotacao-dolar-diaria.sql) grava o maior entre PTAX e turismo
const NOME_FONTE = { ptax: 'PTAX de venda do Banco Central', turismo: 'dólar turismo' };
function origemDolar(cfg) {
  const v = cfg && n(cfg.cotacao_dolar), i = cfg && cfg.cotacao_dolar_info;
  if (!(v > 0)) return 'Sem cotação: preencha à mão ou aguarde a busca automática do próximo dia útil.';
  if (!i || !i.fonte || !i[i.fonte] || Math.abs(n(i[i.fonte].valor) - v) > 0.00005) return 'Cotação informada à mão pela equipe. A busca automática dos dias úteis grava por cima.';
  const quando = new Date(i.atualizado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const outra = i.fonte === 'ptax' ? i.turismo : i.ptax, nomeOutra = i.fonte === 'ptax' ? 'turismo' : 'PTAX';
  return `${NOME_FONTE[i.fonte] || i.fonte}, buscado sozinho em ${quando}; usamos sempre o maior dólar do dia.`
    + (outra ? ` ${nomeOutra[0].toUpperCase() + nomeOutra.slice(1)}: R$ ${String(outra.valor).replace('.', ',')}.` : ` O ${nomeOutra} não respondeu nessa busca.`);
}

// a linha curta do passo 4: "Dólar de hoje R$ 6,05 (turismo, automático)"
function linhaDolar(cfg) {
  const v = cfg && n(cfg.cotacao_dolar), i = cfg && cfg.cotacao_dolar_info;
  if (!(v > 0)) return 'Sem cotação do dólar: os cartões que pontuam por dólar ficam sem conta.';
  const auto = i && i.fonte && i[i.fonte] && Math.abs(n(i[i.fonte].valor) - v) <= 0.00005;
  return `Dólar de hoje R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${auto ? (i.fonte === 'ptax' ? 'PTAX' : 'turismo') + ', automático' : 'informado pela equipe'})`;
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
  $q('#cApres').onclick = () => { S.apresenta = true; document.body.classList.add('calc-apresenta'); desenharResultado(P, X); scrollTo(0, 0); };
  $q('#cGasto').oninput = (e) => { S.gasto = e.target.value; atualizar(P, X); };
  $q('#cInt').oninput = (e) => { S.intVal = e.target.value; atualizar(P, X); };
  $q('#cIntModo').onchange = (e) => { S.intModo = e.target.value; atualizar(P, X); };
  P.querySelectorAll('[data-prog]').forEach(b => b.onclick = () => { S.prog = b.dataset.prog; P.querySelectorAll('[data-prog]').forEach(x => x.classList.toggle('on', x === b)); atualizar(P, X); });
  $q('#fVip').onclick = (e) => { S.soVip = !S.soVip; e.target.classList.toggle('on', S.soVip); desenharComparar(P, X); };
  $q('#fConv').onclick = (e) => { S.semConvite = !S.semConvite; e.target.classList.toggle('on', S.semConvite); desenharComparar(P, X); };
  $q('#cCotAlt').onclick = () => { S.cotAberta = !S.cotAberta; $q('#cCotBox').hidden = !S.cotAberta; if (S.cotAberta) $q('#cCot').focus(); };
  $q('#cCotOk').onclick = async () => {
    const t = $q('#cCot').value.trim(), v = t === '' ? null : Number(t.replace(',', '.'));
    if (v !== null && !(v > 0)) { X.aviso('Cotação inválida.'); return; }
    const { error } = await X.sb.from('configuracoes').update({ cotacao_dolar: v }).eq('id', 1);
    if (error) { X.aviso('Não salvou: ' + X.limparTec(error.message)); return; }
    if (X.D.cfg) X.D.cfg.cotacao_dolar = v;
    $q('#cCotInfo').textContent = origemDolar(X.D.cfg); $q('#cCotLinha').textContent = linhaDolar(X.D.cfg);
    X.aviso('Cotação salva.'); atualizar(P, X);
  };
  if ($q('#cLigar')) $q('#cLigar').onclick = () => { S.ligando = !S.ligando; desenharLigar(P, X); };
  if ($q('#cSalvar')) $q('#cSalvar').onclick = () => salvar(P, X);
}

// avulsa: liga a simulação a um lead da Gestão (para salvar e para puxar o gasto da qualificação)
function desenharLigar(P, X) {
  const box = P.querySelector('#cLigarBox'), { esc } = X;
  if (!S.ligando) { box.innerHTML = ''; return; }
  const q = chave(S.buscaLead);
  const L = (X.D.reunioes || []).filter(r => r.produto === 'Gestão de Milhas' && r.resultado !== 'Não fechou' && (!q || chave(r.cliente).includes(q))).slice(0, 30);
  box.innerHTML = `<input type="search" id="cBuscaLead" value="${esc(S.buscaLead)}" placeholder="Buscar lead da Gestão pelo nome" style="width:100%;height:44px;margin-top:8px;font-size:16px;padding:0 10px;border:1px solid var(--linha)">
    <div class="opcoes">${L.length ? L.map(r => `<button type="button" data-lead="${esc(r.id)}">${esc(r.cliente || 'Sem nome')}<small>${esc(r.etapa || r.resultado || '')}</small></button>`).join('') : '<div class="vazio">Nenhum lead da Gestão com esse nome.</div>'}</div>`;
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
    ${achados.length ? `<div class="opcoes">${achados.map(b => `<button type="button" data-at="${esc(b.id)}">${esc(nomeB(b))}<small>${esc(b.programa || '')}${b.a_confirmar ? ' · a confirmar' : ''}</small></button>`).join('')}</div>` : q.length >= 2 ? '<div class="vazio" style="font-size:13px">Nenhum cartão com esse nome na base.</div>' : ''}`;
  const inp = box.querySelector('#cBuscaAtual');
  inp.oninput = (e) => { S.buscaAtual = e.target.value; const pos = e.target.selectionStart; desenharAtual(P, X); const i = box.querySelector('#cBuscaAtual'); i.focus(); i.setSelectionRange(pos, pos); };
  box.querySelectorAll('[data-at]').forEach(b => b.onclick = () => { S.atual = b.dataset.at; S.buscaAtual = ''; S.escolhidos = S.escolhidos.filter(id => id !== S.atual); desenharAtual(P, X); atualizar(P, X); });
}

function desenharBancos(P, X) {
  const box = P.querySelector('#fBancos'), { esc } = X;
  const bancos = [...new Set(S.dados.base.filter(b => b.ativo !== false && b.vendido_hoje !== false).map(b => b.banco).filter(Boolean))].sort((a, c) => a.localeCompare(c));
  box.innerHTML = bancos.map(b => `<button type="button" data-bc="${esc(b)}" class="${S.bancos.includes(b) ? 'on' : ''}">${esc(b)}</button>`).join('');
  box.querySelectorAll('[data-bc]').forEach(b => b.onclick = () => {
    const v = b.dataset.bc; S.bancos = S.bancos.includes(v) ? S.bancos.filter(x => x !== v) : [...S.bancos, v];
    b.classList.toggle('on', S.bancos.includes(v));
    desenharComparar(P, X);
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
// sugestões: cartões vendidos hoje, com pontos calculáveis, pelos filtros; ordem pelos pontos por ano
// (com um programa de destino escolhido, entram só os cartões cujos pontos chegam nele)
export function ranking(base, G, E, F) {
  return base.filter(b => b.ativo !== false && b.vendido_hoje !== false && b.id !== F.atualId
      && (!F.soVip || b.salas_vip_ilimitado) && (!F.semConvite || !b.somente_convite) && (!F.bancos.length || F.bancos.includes(b.banco)))
    .map(b => contaCalc(b, G, E)).filter(x => x.pontos !== null && x.pontos > 0 && (!E.ctx.pref || x.chega))
    .sort((a, c) => c.pontos - a.pontos || (a.anuidade ?? Infinity) - (c.anuidade ?? Infinity) || nomeB(a.b).localeCompare(nomeB(c.b)));
}
// "sem cartão que pontua": não acumula nada e não paga anuidade de cartão que pontua
const NENHUM = { b: null, pontos: 0, programa: '', valor: 0, anuidade: 0, saldo: 0, nenhum: true };

function contexto(X) {
  const { refs, regras } = S.dados, pr = PROGS.find(x => x[0] === S.prog) || PROGS[0], pref = pr[2];
  return { calc: X.calc, cotacao: X.D.cfg && n(X.D.cfg.cotacao_dolar), refs, normProg: X.CART.normProg, pref, prefNome: pref ? pr[1] : '',
    bonus: pref ? bonusDe(regras, pref) : 0, milheiro: pref ? refDe(refs, pref) : null, livre: !pref };
}

// as contas do momento, usadas pelo passo 3 (sugestões) e pelo resultado
function contasAgora(X) {
  const base = S.dados.base, ctx = contexto(X), G = gastos(S.gasto, S.intVal, S.intModo);
  const porId = Object.fromEntries(base.map(b => [b.id, b]));
  const kCli = (id) => (S.cliCartoes || []).find(k => k.catalogo_id === id);
  // anuidade negociada do cliente só vale para o cartão que ele já tem
  const E = { ctx, anuidadePaga: (b) => { const k = kCli(b.id); return k && n(k.anuidade_paga) !== null ? n(k.anuidade_paga) : undefined; } };
  const atual = S.atual === 'nenhum' ? NENHUM : S.atual && porId[S.atual] ? contaCalc(porId[S.atual], G, E) : null;
  return { base, ctx, G, porId, E, atual };
}
const mesmoProg = (a, c) => a && c && a.programa && a.programa === c.programa;
// pontos a mais que hoje: só quando dá para comparar (mesmo programa, ou a pessoa não tem cartão que pontua)
const aMais = (atual, x) => atual && x.pontos !== null && (atual.nenhum || mesmoProg(atual, x)) ? (x.pontos - (atual.pontos ?? 0)) : null;
const anuTxt = (x) => x.anuidade === null || x.anuidade === undefined ? 'não informada na base' : x.anuidade === 0 ? (x.c && x.c.isenta ? 'isenta com esse gasto' : 'sem anuidade') : brl(x.anuidade) + ' por ano';
const salaTxt = (b) => !b ? '' : b.salas_vip_ilimitado ? 'ilimitada' : n(b.salas_vip_ano) ? `${b.salas_vip_ano} ${Number(b.salas_vip_ano) === 1 ? 'acesso' : 'acessos'} por ano` : 'não tem';

// passo 3: os escolhidos (até 3), as sugestões em ordem de pontos e a busca na base inteira
function desenharComparar(P, X) {
  const box = P.querySelector('#cCompBox'), { esc } = X;
  if (!box) return;
  const { base, G, porId, E, atual } = contasAgora(X);
  S.escolhidos = S.escolhidos.filter(id => porId[id] && id !== S.atual);
  const cheio = S.escolhidos.length >= MAX_ESC;
  const linha = (x) => {
    const d = aMais(atual, x), usado = S.escolhidos.includes(x.b.id);
    const det = [x.cashback ? 'cashback, sem pontos' : x.pontos !== null ? `${num(x.pontos)} pontos por ano${x.programa ? ' ' + x.programa : ''}` : 'pontos não calculados',
      d !== null && d > 0 ? `+ ${num(d)} que hoje` : '', 'anuidade ' + anuTxt(x), x.a_confirmar ? 'a confirmar' : ''].filter(Boolean).join(' · ');
    return `<button type="button" data-esc="${esc(x.b.id)}"${usado || cheio ? ' disabled' : ''}>${esc(nomeB(x.b))}${usado ? ' (escolhido)' : ''}<small>${esc(det)}</small></button>`;
  };
  const q = chave(S.buscaComp);
  let lista, titulo;
  if (q.length >= 2) {
    titulo = 'Resultado da busca';
    lista = base.filter(b => b.ativo !== false && b.id !== S.atual && chave(nomeB(b) + ' ' + (b.programa || '')).includes(q)).slice(0, 20).map(b => contaCalc(b, G, E));
  } else if (G.total) {
    titulo = 'Sugestões, em ordem de pontos por ano';
    lista = ranking(base, G, E, { atualId: atual && atual.b ? atual.b.id : null, soVip: S.soVip, semConvite: S.semConvite, bancos: S.bancos }).slice(0, 8);
  } else { titulo = ''; lista = []; }
  box.innerHTML = `${S.escolhidos.length ? `<div class="esc">${S.escolhidos.map(id => `<span>${esc(nomeB(porId[id]))}<button type="button" data-tira="${esc(id)}" aria-label="Tirar ${esc(nomeB(porId[id]))}">×</button></span>`).join('')}</div>` : ''}
    <input type="search" id="cBuscaComp" value="${esc(S.buscaComp)}" placeholder="Buscar cartão na base pelo nome">
    ${cheio ? `<div class="sub" style="font-size:13px">Já são ${MAX_ESC} cartões. Toque no × para trocar um deles.</div>` : ''}
    ${titulo ? `<div class="sub" style="font-size:13px;margin-top:8px">${titulo}</div>` : !G.total ? '<div class="sub" style="font-size:13px;margin-top:8px">Informe o gasto no passo 4 para ver as sugestões em ordem, ou busque pelo nome.</div>' : ''}
    ${lista.length ? `<div class="opcoes">${lista.map(linha).join('')}</div>` : titulo ? '<div class="vazio" style="font-size:13px">Nenhum cartão encontrado.</div>' : ''}`;
  const inp = box.querySelector('#cBuscaComp');
  inp.oninput = (e) => { S.buscaComp = e.target.value; const pos = e.target.selectionStart; desenharComparar(P, X); const i = box.querySelector('#cBuscaComp'); i.focus(); i.setSelectionRange(pos, pos); };
  box.querySelectorAll('[data-esc]').forEach(b => b.onclick = () => {
    if (S.escolhidos.length >= MAX_ESC || S.escolhidos.includes(b.dataset.esc)) return;
    S.escolhidos.push(b.dataset.esc); S.buscaComp = ''; atualizar(P, X);
  });
  box.querySelectorAll('[data-tira]').forEach(b => b.onclick = () => { S.escolhidos = S.escolhidos.filter(id => id !== b.dataset.tira); atualizar(P, X); });
}

function desenharResultado(P, X) {
  const box = P.querySelector('#cRes'), { esc } = X;
  if (!box) return;
  const { ctx, G, porId, E, atual } = contasAgora(X);
  const resumo = P.querySelector('#cResumo');
  if (resumo) resumo.textContent = G.total ? `Gasto de ${brl(G.total)} por mês${G.gInt ? `, ${brl(G.gInt)} no exterior` : ''}${ctx.pref ? ', pontos em ' + ctx.prefNome : ''}.` : '';
  // os escolhidos pela equipe, na ordem em que foram escolhidos; no modo apresentação só os já conferidos
  const escolhidos = S.escolhidos.map(id => porId[id]).filter(b => b && !(S.apresenta && b.a_confirmar)).map(b => contaCalc(b, G, E));
  const avisos = [];
  if (!(ctx.cotacao > 0)) avisos.push('Falta a cotação do dólar: sem ela, os cartões que pontuam por dólar ficam sem conta.');
  if (!G.total) { box.innerHTML = `${avisos.map(a => `<div class="config" data-int style="margin-top:12px;font-size:13px">${esc(a)}</div>`).join('')}<div class="vazio" style="margin-top:14px">Informe o gasto mensal no passo 4 para ver a conta.</div>`; S.ultimo = null; return; }

  // destaque: o escolhido que mais dá pontos a mais que hoje, com dados conferidos e pontuação toda na base
  const ok = (x) => !x.a_confirmar && !x.extNacional && x.pontos !== null && !x.cashback;
  const melhor = escolhidos.filter(ok).sort((a, c) => (aMais(atual, c) ?? c.pontos) - (aMais(atual, a) ?? a.pontos))[0] || null;
  let dest;
  const prog = (x) => x.programa ? ` no ${esc(x.programa)}` : '';
  if (!atual) dest = 'Marque o cartão que a pessoa usa hoje.';
  else if (!escolhidos.length) dest = `Escolha até ${MAX_ESC} cartões para comparar.`;
  else if (!melhor) dest = 'Os cartões escolhidos ainda têm dados a conferir na base.';
  else if (atual.nenhum) dest = `Com o ${esc(nomeB(melhor.b))}, você passa a acumular <em>${num(melhor.pontos)} pontos</em> por ano${prog(melhor)}.`;
  else {
    const d = aMais(atual, melhor);
    dest = d === null ? `Com o ${esc(nomeB(melhor.b))}, você acumula <em>${num(melhor.pontos)} pontos</em> por ano${prog(melhor)}. Hoje são ${num(atual.pontos ?? 0)} pontos${prog(atual)}.`
      : d > 0 ? `Trocando o ${esc(nomeB(atual.b))} pelo ${esc(nomeB(melhor.b))}, você acumula <em>+ ${num(d)} pontos</em> por ano${prog(melhor)}.`
      : `Com esse gasto, o ${esc(nomeB(atual.b))} já acumula mais pontos que os cartões escolhidos.`;
  }

  const col = (x, hoje) => {
    if (x.nenhum) return `<div class="col atual"><div class="k">Hoje</div><h3>Sem cartão que pontua</h3><div class="big">0 <em>pontos/ano</em></div></div>`;
    const d = hoje ? null : aMais(atual, x);
    return `<div class="col${hoje ? ' atual' : ''}">
      <div class="k">${hoje ? 'Hoje' : 'Trocando por'}</div>
      <h3>${esc(nomeB(x.b))}</h3>${x.a_confirmar ? '<div data-int style="margin:-4px 0 6px"><span class="tag alerta">a confirmar</span></div>' : ''}
      <div class="big">${x.cashback ? '<em>cashback, sem pontos</em>' : x.pontos !== null ? `${num(x.pontos)} <em>pontos/ano</em>` : '<em>pontos não calculados</em>'}</div>
      ${x.programa && !x.cashback ? `<div class="cprog">${esc(x.programa)}</div>` : ''}
      ${d !== null ? `<div class="dif">${d > 0 ? '+ ' + num(d) + ' pontos que hoje' : d < 0 ? num(-d) + ' pontos a menos que hoje' : 'os mesmos pontos de hoje'}</div>` : ''}
      <dl><dt>Anuidade</dt><dd>${esc(anuTxt(x))}</dd><dt>Sala VIP</dt><dd>${esc(salaTxt(x.b))}</dd></dl>
    </div>`;
  };
  const cartoes = [...(atual ? [col(atual, true)] : []), ...escolhidos.map(x => col(x, false))];
  box.innerHTML = `${avisos.map(a => `<div class="config" data-int style="margin-top:12px;font-size:13px">${esc(a)}</div>`).join('')}
    <section class="faixa"><div class="t">${dest}</div></section>
    ${cartoes.length ? `<div class="cols" style="--ncols:${Math.max(2, cartoes.length)}">${cartoes.join('')}</div>` : ''}
    <div class="ress">${AVISO_BANCO}</div>`;
  S.ultimo = { G, ctx: { pref: ctx.pref, prefNome: ctx.prefNome, cotacao: ctx.cotacao, milheiro: ctx.milheiro, bonus: ctx.bonus }, atual, escolhidos, melhor };
}
