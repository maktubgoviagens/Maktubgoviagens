// Maktub Go: base de cartões do mercado e cartões dos clientes da Gestão.
// As contas (anuidade que paga, isenção pelo gasto, pontos e valor no ano) são feitas aqui, por fórmula, sem IA.

export const MOEDAS = [['USD', 'pontos por US$ 1'], ['BRL', 'pontos por R$ 1'], ['PCT', '% de cashback']];
let BASE = null, ED = null, BUSCA = '', SO_ILIM = false;

export async function carregarBase(sb, forcar) {
  if (BASE && !forcar) return BASE;
  const { data, error } = await sb.from('cartoes_catalogo').select('*').order('banco').order('nome');
  if (error) throw error;
  BASE = data || [];
  return BASE;
}
const nomeBase = (b) => `${b.banco} ${b.nome}`.trim();
// redução parcial da anuidade depende das colunas reducao_gasto_mes e reducao_pct (SQL da redução de anuidade)
const TEM_REDUCAO = () => (BASE || []).some(b => 'reducao_pct' in b);
const dec = (x) => Number(x).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export const salaVip = (b) => !b ? '' : b.salas_vip_ilimitado ? `sala VIP ilimitada${b.salas_vip_programa ? ' (' + b.salas_vip_programa + ')' : ''}`
  : n(b.salas_vip_ano) ? `${b.salas_vip_ano} ${Number(b.salas_vip_ano) === 1 ? 'acesso' : 'acessos'}/ano a sala VIP${b.salas_vip_programa ? ' (' + b.salas_vip_programa + ')' : ''}` : '';
const n = (x) => x === null || x === undefined || x === '' ? null : Number(x);

// ao entrar pelo menu, abre a lista (e não o cartão que ficou aberto da última vez)
export function inicio() { ED = null; }
// Contas de um cartão do cliente. cat: cartão da base (ou null); refs: valor do milheiro por programa.
export function calc(cart, cat, cotacao, refs, normProg) {
  const gasto = n(cart.gasto_medio_mes) || 0, cheia = cat ? n(cat.anuidade_anual) : null, minimo = cat ? n(cat.isencao_gasto_mes) : null;
  const isentaGasto = minimo !== null && minimo > 0 && gasto >= minimo;
  // redução parcial: gastando a partir de um valor por mês, a anuidade cai uma porcentagem (ex.: 50%)
  const redGasto = cat ? n(cat.reducao_gasto_mes) : null, redPct = cat ? n(cat.reducao_pct) : null;
  const reduzida = !isentaGasto && redGasto > 0 && redPct > 0 && gasto >= redGasto;
  const paga = n(cart.anuidade_paga);
  // anuidade negociada vale mais que a regra da base; sem nenhuma das duas, não dá para saber
  const custo = paga !== null ? paga : cheia === null ? null : isentaGasto ? 0 : reduzida ? Math.round(cheia * (1 - Math.min(100, redPct) / 100) * 100) / 100 : cheia;
  let pontos = null, valor = null, semValor = '';
  const por = cat ? n(cat.pontos_por) : null;
  if (por && gasto > 0) {
    if (cat.pontos_moeda === 'PCT') valor = gasto * 12 * por / 100;
    else if (cat.pontos_moeda === 'USD' && !(cotacao > 0)) semValor = 'falta a cotação do dólar';
    else {
      pontos = gasto * 12 * por / (cat.pontos_moeda === 'USD' ? cotacao : 1);
      const ref = cat.programa ? refs[normProg(cat.programa)] : undefined;
      if (ref !== undefined) valor = pontos * ref / 1000; else semValor = cat.programa ? `sem valor do milheiro de ${cat.programa}` : 'programa de pontos não informado';
    }
  }
  return { gasto, cheia, minimo, isentaGasto, reduzida, redPct, paga, custo, pontos, valor, semValor, resultado: valor !== null && custo !== null ? valor - custo : null };
}

// Texto curto que vai para o painel do cliente (ele não lê a base de cartões)
function textosPainel(cart, cat, k) {
  const brl = (x) => 'R$ ' + Math.round(x).toLocaleString('pt-BR');
  const anuidade = k.custo === null ? null : k.custo === 0 ? (k.paga === null && k.cheia === 0 ? 'Sem anuidade' : k.isentaGasto ? 'Isenta pelo gasto' : 'Isenta') : `${brl(k.custo)}/ano` + (k.reduzida && k.paga === null ? ` (${dec(k.redPct)}% de desconto pelo gasto)` : '');
  const pont = cat && n(cat.pontos_por) ? (cat.pontos_moeda === 'PCT' ? `${dec(cat.pontos_por)}% de cashback` : `${dec(cat.pontos_por)} ${Number(cat.pontos_por) === 1 ? 'pt' : 'pts'} por ${cat.pontos_moeda === 'USD' ? 'US$' : 'R$'}${cat.programa ? ' · ' + cat.programa : ''}`) : null;
  return { anuidade, pontuacao: pont };
}

/* ---------------- tela da base de cartões (aba Empresa) ---------------- */
export async function telaBase(P, X) {
  const { sb, $, esc, aviso, campo, ir, D, num, brl } = X;
  const voltar = () => { ED = null; ir('empresa'); };
  if (!BASE) {
    P.innerHTML = `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">Base de <em>cartões</em></h1><div class="vazio">Carregando...</div>`;
    $('voltar').onclick = voltar;
    try { await carregarBase(sb); } catch (e) { if (X.aba() === 'cartoesbase') P.querySelector('.vazio').textContent = X.tec('A base de cartões ainda não foi ativada: rode no Supabase o SQL da base de cartões.'); return; }
    if (X.aba() !== 'cartoesbase') return;
  }
  if (ED) return formBase(P, X);
  const cot = D.cfg && n(D.cfg.cotacao_dolar);
  const velho = (d) => !d || (Date.now() - new Date(d + 'T12:00:00')) / 864e5 > 90;
  const L = BASE.filter(b => (!SO_ILIM || b.salas_vip_ilimitado) && (!BUSCA || (nomeBase(b) + ' ' + (b.programa || '')).toLowerCase().includes(BUSCA.toLowerCase())));
  P.innerHTML = `<button class="voltar" id="voltar">‹ Empresa</button>
    <h1 class="titulo" style="margin-top:6px">Base de <em>cartões</em></h1>
    <div class="sub">Anuidade, isenção e pontuação de cada cartão do mercado. Os cartões dos clientes usam estes dados nas contas.</div>
    <section class="bloco">
      <div class="duas-col" style="align-items:end">${campo('cot', 'Cotação de referência do dólar (R$)', cot ?? '', 'number', 'placeholder="Ex.: 5,40"')}<button class="sec" id="cotOk" style="height:44px">Salvar cotação</button></div>
      <div class="sub">Usada para converter os gastos dos cartões que pontuam por dólar.</div>
    </section>
    <div class="duas-col" style="margin-top:14px;align-items:end"><label class="fl"><span>Buscar</span><input id="bBusca" value="${esc(BUSCA)}" placeholder="Banco, cartão ou programa"></label><button class="zap" id="bNovo" style="height:44px">+ Novo cartão</button></div>
    <label class="fc" style="margin-top:8px"><input type="checkbox" id="bIlim" ${SO_ILIM ? 'checked' : ''}><span>Só cartões com sala VIP ilimitada</span></label>
    <section class="bloco" style="margin-top:10px">${L.length ? L.map(b => `<button type="button" class="lin" data-b="${b.id}" style="width:100%;background:none;border:0;border-top:1px solid var(--linha);text-align:left;cursor:pointer">
        <span><b style="font-weight:600">${esc(nomeBase(b))}</b>${!b.ativo ? ' <small>(fora de linha)</small>' : ''}
          <small style="display:block;color:var(--tinta-3);font-size:12px">${[b.anuidade_anual === null ? 'anuidade não informada' : Number(b.anuidade_anual) === 0 ? 'sem anuidade' : brl(b.anuidade_anual) + '/ano', n(b.isencao_gasto_mes) ? 'isenta com ' + brl(b.isencao_gasto_mes) + '/mês' : (Number(b.anuidade_anual) === 0 ? '' : b.isencao || ''), n(b.reducao_gasto_mes) && n(b.reducao_pct) ? 'cai ' + dec(b.reducao_pct) + '% com ' + brl(b.reducao_gasto_mes) + '/mês' : '', n(b.pontos_por) ? (b.pontos_moeda === 'PCT' ? dec(b.pontos_por) + '% de cashback' : dec(b.pontos_por) + ' pts/' + (b.pontos_moeda === 'USD' ? 'US$' : 'R$') + (b.programa ? ' ' + b.programa : '')) : '', salaVip(b)].filter(Boolean).map(esc).join(' · ')}</small></span>
        <span${velho(b.conferido_em) ? ' style="color:var(--alerta)"' : ''}>${b.conferido_em ? 'conferido ' + b.conferido_em.split('-').reverse().join('/') : 'não conferido'}</span></button>`).join('')
      : `<div class="vazio">${BASE.length ? 'Nenhum cartão com essa busca.' : 'Nenhum cartão cadastrado ainda.'}</div>`}</section>
    <div class="sub" style="margin-top:8px">${num(BASE.length)} cartões na base. Em laranja, os conferidos há mais de 90 dias: vale revisar no site do banco.</div>`;
  $('voltar').onclick = voltar;
  $('bBusca').oninput = (e) => { BUSCA = e.target.value; const pos = e.target.selectionStart; telaBase(P, X); const b = $('bBusca'); b.focus(); b.setSelectionRange(pos, pos); };
  $('bNovo').onclick = () => { ED = 'novo'; telaBase(P, X); };
  $('bIlim').onchange = (e) => { SO_ILIM = e.target.checked; telaBase(P, X); };
  P.querySelectorAll('[data-b]').forEach(el => el.onclick = () => { ED = el.dataset.b; telaBase(P, X); });
  $('cotOk').onclick = async () => {
    const v = n(String(P.querySelector('[name=cot]').value).replace(',', '.'));
    if (v !== null && !(v > 0)) { aviso('Cotação inválida.'); return; }
    const { error } = await sb.from('configuracoes').update({ cotacao_dolar: v }).eq('id', 1);
    if (error) { aviso(/cotacao_dolar/.test(error.message) ? X.tec('Rode no Supabase o SQL da base de cartões.') : 'Não salvou: ' + error.message); return; }
    if (D.cfg) D.cfg.cotacao_dolar = v;
    aviso('Cotação salva.');
  };
}

function formBase(P, X) {
  const { sb, $, esc, aviso, campo } = X;
  const b = ED === 'novo' ? { ativo: true, pontos_moeda: 'USD' } : BASE.find(x => x.id === ED);
  if (!b) { ED = null; return telaBase(P, X); }
  const sel = (nome, rot, ops, v) => `<label class="fl"><span>${rot}</span><select name="${nome}">${ops.map(([k, l]) => `<option value="${esc(k)}"${String(k) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Base de cartões</button>
    <h1 class="titulo" style="margin-top:6px">${ED === 'novo' ? 'Novo <em>cartão</em>' : esc(nomeBase(b))}</h1>
    <form class="bloco form" id="fBase">
      <div class="duas-col">${campo('banco', 'Banco *', b.banco, 'text', 'required placeholder="Ex.: Santander"')}${campo('nome', 'Cartão *', b.nome, 'text', 'required placeholder="Ex.: Unique Visa Infinite"')}</div>
      <div class="duas-col">${campo('bandeira', 'Bandeira', b.bandeira, 'text', 'placeholder="Visa, Mastercard, Elo"')}${campo('categoria', 'Categoria', b.categoria, 'text', 'placeholder="Gold, Platinum, Black..."')}</div>
      <div class="duas-col">${campo('anuidade_anual', 'Anuidade cheia (R$ por ano)', b.anuidade_anual, 'number')}${campo('isencao_gasto_mes', 'Gasto por mês que isenta (R$)', b.isencao_gasto_mes, 'number', 'placeholder="em branco se não houver"')}</div>
      ${TEM_REDUCAO() ? `<div class="duas-col">${campo('reducao_gasto_mes', 'Gasto por mês que reduz (R$)', b.reducao_gasto_mes, 'number', 'placeholder="em branco se não houver"')}${campo('reducao_pct', 'Redução da anuidade (%)', b.reducao_pct, 'number', 'placeholder="Ex.: 50"')}</div>` : X.tec('<div class="sub">Para guardar a redução parcial da anuidade (ex.: 50% com um gasto menor), rode no Supabase o SQL da redução de anuidade.</div>')}
      ${campo('isencao', 'Regra de isenção, como o banco descreve', b.isencao, 'text', 'placeholder="Ex.: isenta com R$ 10 mil/mês ou R$ 100 mil investidos"')}
      <div class="duas-col">${campo('pontos_por', 'Pontuação', b.pontos_por, 'number', 'placeholder="Ex.: 2,2"')}${sel('pontos_moeda', 'Por', MOEDAS, b.pontos_moeda)}</div>
      ${campo('programa', 'Programa de pontos', b.programa, 'text', 'placeholder="Ex.: Esfera, Livelo, Átomos, Azul"')}
      <div class="duas-col">${campo('salas_vip_programa', 'Sala VIP: programa', b.salas_vip_programa, 'text', 'placeholder="LoungeKey, Priority Pass, DragonPass..."')}${campo('salas_vip_ano', 'Acessos por ano (titular)', b.salas_vip_ano, 'number', 'placeholder="em branco se não tiver"')}</div>
      <label class="fc"><input type="checkbox" name="salas_vip_ilimitado" ${b.salas_vip_ilimitado ? 'checked' : ''}><span>Sala VIP ilimitada</span></label>
      ${campo('beneficios', 'Outros benefícios e condições', b.beneficios, 'text', 'placeholder="Ex.: acesso exige gasto mínimo, seguro viagem"')}
      <div class="duas-col">${campo('fonte', 'Fonte (site do banco)', b.fonte, 'url', 'placeholder="https://..."')}${campo('conferido_em', 'Conferido em', b.conferido_em, 'date')}</div>
      <label class="fc"><input type="checkbox" name="ativo" ${b.ativo !== false ? 'checked' : ''}><span>Cartão ainda é oferecido pelo banco</span></label>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="zap" type="submit" style="flex:2">Salvar</button>${ED !== 'novo' ? '<button class="sec" type="button" id="bDel" style="flex:1">Excluir</button>' : ''}</div>
    </form>`;
  const voltar = () => { ED = null; telaBase(P, X); };
  $('voltar').onclick = voltar;
  const f = $('fBase'), v = (k) => f.elements[k].value.trim(), nv = (k) => v(k) === '' ? null : Number(v(k).replace(',', '.'));
  f.onsubmit = async (e) => {
    e.preventDefault();
    const row = { banco: v('banco'), nome: v('nome'), bandeira: v('bandeira') || null, categoria: v('categoria') || null, anuidade_anual: nv('anuidade_anual'), isencao_gasto_mes: nv('isencao_gasto_mes'),
      isencao: v('isencao') || null, pontos_por: nv('pontos_por'), pontos_moeda: v('pontos_moeda'), programa: v('programa') || null, beneficios: v('beneficios') || null,
      fonte: v('fonte') || null, conferido_em: v('conferido_em') || null, ativo: f.elements.ativo.checked, atualizado_em: new Date().toISOString(),
      salas_vip_programa: v('salas_vip_programa') || null, salas_vip_ano: nv('salas_vip_ano') === null ? null : Math.round(nv('salas_vip_ano')), salas_vip_ilimitado: f.elements.salas_vip_ilimitado.checked,
      ...(TEM_REDUCAO() ? { reducao_gasto_mes: nv('reducao_gasto_mes'), reducao_pct: nv('reducao_pct') } : {}) };
    if (row.reducao_pct !== undefined && row.reducao_pct !== null && !(row.reducao_pct > 0 && row.reducao_pct <= 100)) { aviso('A redução é uma porcentagem entre 1 e 100.'); return; }
    if (!row.banco || !row.nome) { aviso('Informe banco e cartão.'); return; }
    if (['anuidade_anual', 'isencao_gasto_mes', 'pontos_por', 'salas_vip_ano'].some(k => row[k] !== null && !(row[k] >= 0))) { aviso('Confira os números.'); return; }
    const r = ED === 'novo' ? await sb.from('cartoes_catalogo').insert(row).select().single() : await sb.from('cartoes_catalogo').update(row).eq('id', ED).select().single();
    if (r.error) { aviso('Não salvou: ' + r.error.message); return; }
    if (ED === 'novo') BASE.push(r.data); else Object.assign(BASE.find(x => x.id === ED), r.data);
    // quem já tem esse cartão: os textos do painel do cliente (anuidade e pontuação) acompanham a base
    if (ED !== 'novo' && X.CART) atualizarPaineis(sb, X.CART, X.D, r.data).catch(() => {});
    BASE.sort((a, c) => nomeBase(a).localeCompare(nomeBase(c)));
    aviso('Cartão salvo na base.'); voltar();
  };
  if ($('bDel')) $('bDel').onclick = async (e) => {
    if (e.target.dataset.ok !== '1') { e.target.dataset.ok = '1'; e.target.textContent = 'Toque de novo'; return; }
    const { error } = await sb.from('cartoes_catalogo').delete().eq('id', ED);
    if (error) { aviso('Não excluiu: ' + error.message); return; }
    BASE = BASE.filter(x => x.id !== ED); aviso('Cartão excluído da base.'); voltar();
  };
}

/* ---------------- cartões do cliente (ficha > Tarefas) ---------------- */
// onPrimeiro: chamado quando o primeiro cartão é salvo (marca a tarefa da implantação)
// refaz o texto do painel de todos os clientes que têm um cartão da base (depois de editar esse cartão na base)
async function atualizarPaineis(sb, CART, D, cat) {
  const [r, refs] = await Promise.all([sb.from('cartoes').select('*').eq('catalogo_id', cat.id), CART.valoresRef()]);
  if (r.error) return;
  const cot = D && D.cfg ? n(D.cfg.cotacao_dolar) : null;
  for (const x of r.data || []) {
    const t = textosPainel(x, cat, calc(x, cat, cot, refs, CART.normProg));
    if (t.anuidade !== (x.anuidade ?? null) || t.pontuacao !== (x.pontuacao ?? null)) await sb.from('cartoes').update(t).eq('id', x.id);
  }
}

/* ---------- colar lista de cartões (nome e limite) ---------- */
const semAc = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const PALAVRAS_VAZIAS = new Set(['cartao', 'cartoes', 'banco', 'de', 'do', 'da', 'e', 'card', 'credito', 'empresa', 'pj']);
const SINONIMOS = { master: 'mastercard', mc: 'mastercard', amex: 'american', visa: 'visa' };
const palavras = (t) => semAc(t).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !PALAVRAS_VAZIAS.has(w)).map(w => SINONIMOS[w] || w);
// "75.000", "49.170", "R$ 1.234,56", "pendente" -> número ou null
function valorBR(t) {
  t = String(t || '').replace(/r\$|\s/gi, '');
  if (!t || /pendente|confirmar|-/i.test(t)) return null;
  t = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/\./g, '');
  const v = Number(t); return v >= 0 ? v : null;
}
// cada linha: nome do cartão e o limite no fim (separados por tab ou espaço). O gasto médio quem informa é o cliente.
// O que estiver entre parênteses vira observação. "pendente" ou "a confirmar" no lugar do limite.
const VALOR = /^(?:R\$)?[\d.,]*\d[\d.,]*$|^pendente$/i;
function lerLista(texto) {
  return String(texto || '').split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => {
    if (/^(cart[aã]o|nome)\b/i.test(l) && /limite/i.test(l)) return null; // linha de título
    const obs = (l.match(/\(([^)]+)\)/) || [])[1] || '';
    const tk = l.replace(/\([^)]*\)/g, ' ').replace(/r\$\s*/gi, 'R$').replace(/a\s+confirmar/gi, 'pendente').split(/[\t ]+/).filter(Boolean);
    const vals = [];
    while (vals.length < 1 && tk.length > 1 && VALOR.test(tk[tk.length - 1])) vals.unshift(tk.pop());
    const limTxt = vals[0] || '';
    return { linha: l, nome: tk.join(' ').trim(), limite: valorBR(limTxt), pendente: !limTxt || /pendente/i.test(limTxt), obs: obs.trim() };
  }).filter(Boolean);
}
// cartões da base que combinam com o nome colado (todas as palavras do nome aparecem no cartão da base);
// sem nenhum assim, os que têm mais da metade das palavras. Mais de um: a pessoa escolhe qual é
function acharNaBase(nome) {
  const w = palavras(nome); if (!w.length) return [];
  const nota = (b) => { const wb = palavras(nomeBase(b)); return w.filter(x => wb.includes(x)).length / w.length; };
  const ativos = (BASE || []).filter(b => b.ativo !== false), todas = ativos.filter(b => nota(b) === 1);
  return todas.length ? todas : ativos.filter(b => nota(b) >= 0.5).map(b => Object.assign(Object.create(b), { _parcial: true }));
}
function ligarLista(box, c, X, onPrimeiro, C, cot, refs) {
  const { sb, esc, aviso, brl } = X;
  const rev = box.querySelector('#cxRevisao');
  box.querySelector('#cxConferir').onclick = () => {
    const L = lerLista(box.querySelector('[name=cx_lista]').value);
    if (!L.length) { aviso('Cole pelo menos uma linha com o nome do cartão.'); return; }
    const ops = (sel) => [['', 'Escolha o cartão na base']].concat((BASE || []).filter(b => b.ativo !== false).map(b => [b.id, nomeBase(b)])).concat([['outro', 'Outro, fora da base']])
      .map(([k, l]) => `<option value="${esc(k)}"${k === sel ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const ja = new Set(C.map(x => x.catalogo_id).filter(Boolean));
    rev.innerHTML = `<div class="sub" style="margin-top:10px">Confira o cartão que o app achou na base. O que não estiver na base entra como "fora da base", com o nome como você escreveu; depois, com a anuidade conferida no site do banco, é só tocar em "cadastrar na base" no cartão.</div>
      ${L.map((x, i) => { const A0 = acharNaBase(x.nome), A = A0.map(a => a._parcial ? Object.getPrototypeOf(a) : a), b = A0.length === 1 && !A0[0]._parcial ? A[0] : null;
        const rot = b ? 'Achei na base: confira' + (ja.has(b.id) ? ' (o cliente já tem esse cartão)' : '')
          : A.length ? `${A0[0]._parcial ? 'Parecido na base' : 'Mais de um na base'} (${A.map(nomeBase).join(', ')}): escolha se for um deles; se não, fica fora da base` : 'Não achei na base: entra como fora da base para cadastrar depois';
        return `<div class="bloco" style="padding:10px 12px;margin-top:8px;${b ? '' : 'border-left:3px solid var(--alerta)'}" data-li="${i}">
        <div style="font-size:13px;color:var(--tinta-2)">${esc(x.linha)}</div>
        <label class="fl" style="margin-top:6px"><span data-rot${b ? '' : ' style="color:var(--alerta)"'}>${esc(rot)}</span><select name="li_base">${ops(b ? b.id : 'outro')}</select></label>
        <div class="duas-col"><label class="fl"><span>Limite (R$)</span><input name="li_lim" type="number" inputmode="decimal" step="any" value="${x.limite ?? ''}" placeholder="pendente"></label><label class="fl"><span>Observação</span><input name="li_obs" value="${esc(x.obs)}" placeholder="opcional"></label></div></div>`; }).join('')}
      <button class="zap grande" type="button" id="cxSalvarLista" style="width:100%;margin-top:10px">Salvar ${L.length} ${L.length === 1 ? 'cartão' : 'cartões'}</button><div class="sub" id="cxMsgLista"></div>`;
    rev.querySelector('#cxSalvarLista').onclick = async () => {
      const bt = rev.querySelector('#cxSalvarLista'), msg = rev.querySelector('#cxMsgLista');
      const linhas = [...rev.querySelectorAll('[data-li]')].map(d => ({ x: L[+d.dataset.li], base: d.querySelector('[name=li_base]').value, lim: d.querySelector('[name=li_lim]').value, obs: d.querySelector('[name=li_obs]').value.trim() }));
      if (linhas.some(l => !l.base)) { msg.textContent = 'Escolha o cartão (ou "Outro, fora da base") em todas as linhas.'; return; }
      bt.disabled = true; let feitos = 0; const erros = [];
      for (const [k, l] of linhas.entries()) {
        const cat = (BASE || []).find(b => b.id === l.base) || null, lim = l.lim === '' ? null : Number(l.lim);
        const row = { catalogo_id: cat ? cat.id : null, banco: cat ? cat.banco : l.x.nome, categoria: cat ? cat.nome : null, limite: lim >= 0 ? lim : null, final_cartao: null,
          gasto_medio_mes: null, anuidade_paga: null, observacao_interna: l.obs || null };
        Object.assign(row, textosPainel(row, cat, calc(row, cat, cot, refs, X.CART.normProg)));
        const r = await sb.from('cartoes').insert({ ...row, cliente_id: c.id, ordem: C.length + k + 1 });
        if (r.error) erros.push(l.x.nome + ': ' + X.limparTec(r.error.message)); else feitos++;
      }
      if (erros.length) { bt.disabled = false; msg.textContent = `Salvou ${feitos} de ${linhas.length}. Não salvou: ${erros.join('; ')}`; if (!feitos) return; }
      else aviso(`${feitos} ${feitos === 1 ? 'cartão salvo' : 'cartões salvos'}.`);
      if (feitos && !C.length && onPrimeiro) await onPrimeiro();
      if (!erros.length) secaoCliente(box, c, X, onPrimeiro);
    };
    rev.scrollIntoView({ block: 'start' });
  };
}

export async function secaoCliente(box, c, X, onPrimeiro) {
  const { sb, esc, aviso, campo, brl, num, D, CART } = X;
  box.innerHTML = '<div class="vazio">Carregando...</div>';
  const [r, refs] = await Promise.all([sb.from('cartoes').select('*').eq('cliente_id', c.id).order('ordem'), CART.valoresRef()]);
  try { await carregarBase(sb); } catch (_) { BASE = BASE || []; }
  if (!box.isConnected) return;
  if (r.error) { box.innerHTML = `<div class="vazio">${esc(X.limparTec('Não carregou: ' + r.error.message))}</div>`; return; }
  const C = r.data || [], cot = D.cfg && n(D.cfg.cotacao_dolar), porId = Object.fromEntries(BASE.map(b => [b.id, b]));
  const K = C.map(x => ({ x, cat: porId[x.catalogo_id] || null, k: calc(x, porId[x.catalogo_id] || null, cot, refs, CART.normProg) }));
  // cartão cadastrado pela lista no SQL ou base corrigida depois: o texto que o cliente vê no painel é refeito aqui
  K.forEach(({ x, cat, k }) => { const t = textosPainel(x, cat, k); if (t.anuidade !== (x.anuidade ?? null) || t.pontuacao !== (x.pontuacao ?? null)) sb.from('cartoes').update(t).eq('id', x.id).then(({ error }) => { if (!error) Object.assign(x, t); }); });
  const soma = (f) => K.reduce((s, o) => s + (f(o) || 0), 0);
  const tot = { limite: soma(o => n(o.x.limite)), custo: soma(o => o.k.custo), valor: soma(o => o.k.valor), pontos: soma(o => o.k.pontos), semAnu: K.filter(o => o.k.custo === null).length,
    vip: soma(o => o.cat && !o.cat.salas_vip_ilimitado ? n(o.cat.salas_vip_ano) : 0), vipIlim: K.filter(o => o.cat && o.cat.salas_vip_ilimitado).map(o => nomeBase(o.cat)) };
  const data = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
  const linha = ({ x, cat, k }) => {
    const det = [
      k.custo === null ? 'anuidade: ligue à base ou informe' : k.custo === 0 ? (k.paga !== null ? 'anuidade negociada: isenta' : k.isentaGasto ? 'isenta pelo gasto' : 'sem anuidade') : `anuidade ${brl(k.custo)}/ano${k.paga !== null ? ' (negociada)' : k.minimo ? ` · isenta com ${brl(k.minimo)}/mês (gasta ${brl(k.gasto)})` : ''}`,
      k.pontos !== null ? `${num(Math.round(k.pontos))} pts/ano` : '', k.valor !== null ? `vale ${brl(k.valor)}/ano` : k.semValor, salaVip(cat),
    ].filter(Boolean).join(' · ');
    const res = k.resultado === null ? '' : `<b style="font-weight:600;color:${k.resultado >= 0 ? 'var(--verde)' : 'var(--alerta)'}">${k.resultado >= 0 ? '+' : '−'} ${brl(Math.abs(k.resultado))}/ano</b>`;
    return `<div class="lin" style="align-items:flex-start"><span><b style="font-weight:600">${esc(cat ? nomeBase(cat) : [x.banco, x.categoria].filter(Boolean).join(' '))}</b>${!cat ? ' <small style="color:var(--alerta)">(fora da base)</small>' : ''}
        <small style="display:block;color:var(--tinta-3);font-size:12px">${esc(det)}</small>
        ${x.disponivel !== null && x.disponivel !== undefined ? `<small style="display:block;color:var(--tinta-3);font-size:12px">disponível ${brl(x.disponivel)}, informado pelo cliente em ${data(x.disponivel_em)}</small>` : ''}
        ${x.observacao_interna ? `<small style="display:block;color:var(--tinta-3);font-size:12px">${esc(x.observacao_interna)}</small>` : ''}</span>
      <span style="text-align:right">${n(x.limite) !== null ? brl(x.limite) : 'limite a confirmar'}${res ? '<br>' + res : ''}<br>${!cat ? `<button class="mini" data-cb="${x.id}">cadastrar na base</button>` : ''}<button class="mini" data-ce="${x.id}">editar</button><button class="mini" data-cd="${x.id}">excluir</button></span></div>${!cat ? `<div data-cbf="${x.id}" hidden></div>` : ''}`;
  };
  box.innerHTML = (C.length ? `<div class="numeros" style="margin:0 0 6px">
        <div class="num"><div class="l">Limite total</div><div class="v">${brl(tot.limite)}</div><div class="d">${C.length === 1 ? '1 cartão' : num(C.length) + ' cartões'}</div></div>
        <div class="num"><div class="l">Anuidades no ano</div><div class="v">${brl(tot.custo)}</div><div class="d">${tot.semAnu ? `${tot.semAnu} sem anuidade conhecida` : 'com as isenções pelo gasto'}</div></div>
        <div class="num"><div class="l">Valor dos pontos no ano</div><div class="v">${brl(tot.valor)}</div><div class="d">${num(Math.round(tot.pontos))} pts pelo gasto informado</div></div>
        <div class="num"><div class="l">Sala VIP</div><div class="v">${tot.vipIlim.length ? 'Ilimitada' : num(tot.vip) + ' acessos'}</div><div class="d">${tot.vipIlim.length ? esc(tot.vipIlim.join(', ')) : 'por ano, somando os cartões; nenhum ilimitado'}</div></div>
      </div>${K.some(o => !o.cat) ? `<div class="sub" style="color:var(--alerta);margin:4px 0">${K.filter(o => !o.cat).length === 1 ? '1 cartão fora da base' : K.filter(o => !o.cat).length + ' cartões fora da base'}: confira a anuidade no site do banco e toque em "cadastrar na base" para entrar nas contas.</div>` : ''}${K.map(linha).join('')}` : '<div class="vazio">Nenhum cartão lançado. Eles chegam pelo checklist pré-onboard.</div>')
    + `<details style="margin-top:8px" id="cxForm"${C.length ? '' : ' open'}><summary class="sub" style="cursor:pointer">+ Adicionar cartão</summary><div id="cxCampos"></div></details>`
    + `<details style="margin-top:8px" id="cxLista"><summary class="sub" style="cursor:pointer">+ Colar lista de cartões</summary>
        <div class="sub" style="margin-top:6px">Uma linha por cartão: o nome e o limite (ou "pendente"). Ex.: Inter Prime 50.000. O app procura cada um na base e puxa a anuidade.</div>
        <label class="fl"><span>Lista</span><textarea name="cx_lista" rows="8" placeholder="Banco BV Gold&#9;75.000&#10;Inter Prime&#9;50.000&#10;Sicoob&#9;pendente"></textarea></label>
        <button class="sec" type="button" id="cxConferir" style="width:100%">Conferir a lista</button><div id="cxRevisao"></div></details>`;
  const ED_C = { id: null };
  const desenharForm = (x) => {
    ED_C.id = x ? x.id : null;
    const ops = [['', 'Escolha o cartão na base']].concat(BASE.filter(b => b.ativo !== false || (x && x.catalogo_id === b.id)).map(b => [b.id, nomeBase(b)])).concat([['outro', 'Outro, fora da base']]);
    const atual = x ? (x.catalogo_id || 'outro') : '';
    box.querySelector('#cxCampos').innerHTML = `
      <label class="fl"><span>Cartão</span><select name="cx_base">${ops.map(([k, l]) => `<option value="${esc(k)}"${k === atual ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <div id="cxOutro" ${atual === 'outro' ? '' : 'hidden'}><div class="duas-col">${campo('cx_banco', 'Banco', x ? x.banco : '', 'text', 'placeholder="Ex.: Sicoob"')}${campo('cx_cartao', 'Cartão', x ? x.categoria : '', 'text', 'placeholder="Ex.: Sicoobcard Gold"')}</div></div>
      <div class="duas-col">${campo('cx_limite', 'Limite (R$)', x ? x.limite : '', 'number', 'placeholder="em branco se a confirmar"')}<span></span></div>
      <div class="duas-col">${campo('cx_gasto', 'Gasto médio por mês (R$)', x ? x.gasto_medio_mes : '', 'number')}${campo('cx_paga', 'Anuidade que paga hoje (R$/ano)', x ? x.anuidade_paga : '', 'number', 'placeholder="só se negociou"')}</div>
      ${campo('cx_obs', 'Observação (opcional)', x ? x.observacao_interna : '', 'text', 'placeholder="Ex.: titular, adicional da esposa"')}
      <div class="sub">A Maktub não guarda número nem final do cartão, nem senha. O cliente vê no painel o cartão, o limite e a anuidade.</div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="zap" type="button" id="cxSalvar" style="flex:2">${x ? 'Salvar alterações' : 'Salvar cartão'}</button>${x ? '<button class="sec" type="button" id="cxCanc" style="flex:1">Cancelar</button>' : ''}</div>`;
    const q = (k) => box.querySelector(`[name=${k}]`);
    q('cx_base').onchange = () => { box.querySelector('#cxOutro').hidden = q('cx_base').value !== 'outro'; };
    if (box.querySelector('#cxCanc')) box.querySelector('#cxCanc').onclick = () => secaoCliente(box, c, X, onPrimeiro);
    box.querySelector('#cxSalvar').onclick = async () => {
      const t = (k) => q(k).value.trim(), num2 = (k) => t(k) === '' ? null : Number(t(k).replace(',', '.'));
      const id = t('cx_base'), cat = porId[id] || null;
      if (!id) { aviso('Escolha o cartão na base ou "Outro, fora da base".'); return; }
      if (id === 'outro' && !t('cx_banco')) { aviso('Informe o banco.'); return; }
      if (/\d{12,}/.test((t('cx_cartao') + t('cx_obs')).replace(/\s/g, ''))) { aviso('Parece um número de cartão. Não guarde o número aqui.'); return; }
      const lim = num2('cx_limite'), gasto = num2('cx_gasto'), paga = num2('cx_paga');
      if ([lim, gasto, paga].some(v => v !== null && !(v >= 0))) { aviso('Confira os valores.'); return; }
      const row = { catalogo_id: cat ? cat.id : null, banco: cat ? cat.banco : t('cx_banco'), categoria: cat ? cat.nome : (t('cx_cartao') || null), limite: lim, final_cartao: null,
        gasto_medio_mes: gasto, anuidade_paga: paga, observacao_interna: t('cx_obs') || null };
      Object.assign(row, textosPainel(row, cat, calc(row, cat, cot, refs, CART.normProg)));
      const r2 = ED_C.id ? await sb.from('cartoes').update(row).eq('id', ED_C.id) : await sb.from('cartoes').insert({ ...row, cliente_id: c.id, ordem: C.length + 1 });
      if (r2.error) { aviso(/catalogo_id|anuidade_paga/.test(r2.error.message) ? X.tec('Rode no Supabase o SQL da base de cartões.') : 'Não salvou: ' + r2.error.message); return; }
      aviso(ED_C.id ? 'Cartão atualizado.' : 'Cartão salvo.');
      if (!ED_C.id && !C.length && onPrimeiro) await onPrimeiro();
      secaoCliente(box, c, X, onPrimeiro);
    };
  };
  desenharForm(null);
  ligarLista(box, c, X, onPrimeiro, C, cot, refs);
  // cartão fora da base: cadastra na Base de cartões depois de conferir a anuidade e liga este cartão
  // (e os mesmos cartões fora da base de outros clientes, escritos igual)
  box.querySelectorAll('[data-cb]').forEach(bt => bt.onclick = () => {
    const x = C.find(y => y.id === bt.dataset.cb), f = box.querySelector(`[data-cbf="${x.id}"]`);
    if (!f.hidden) { f.hidden = true; return; }
    const escrito = [x.banco, x.categoria].filter(Boolean).join(' ');
    f.innerHTML = `<div class="bloco" style="padding:10px 12px;margin:6px 0 10px">
      <div class="sub">Como veio na lista: <b>${esc(escrito)}</b> · <a href="https://www.google.com/search?q=${encodeURIComponent(escrito + ' cartão anuidade isenção pontuação')}" target="_blank" rel="noopener">buscar anuidade no Google</a></div>
      <div class="duas-col">${campo('nb_banco', 'Banco *', '', 'text', 'placeholder="Ex.: Sicoob"')}${campo('nb_nome', 'Cartão *', '', 'text', 'placeholder="Ex.: Sicoobcard Gold Visa"')}</div>
      <div class="duas-col">${campo('nb_anu', 'Anuidade cheia (R$/ano)', '', 'number', 'placeholder="0 se não tiver"')}${campo('nb_isen', 'Gasto por mês que isenta (R$)', '', 'number', 'placeholder="em branco se não houver"')}</div>
      <div class="duas-col">${campo('nb_pts', 'Pontuação', '', 'number', 'placeholder="Ex.: 2,2"')}<label class="fl"><span>Por</span><select name="nb_moeda">${MOEDAS.map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select></label></div>
      <div class="duas-col">${campo('nb_prog', 'Programa de pontos', '', 'text', 'placeholder="Ex.: Esfera, Livelo"')}${campo('nb_fonte', 'Fonte (site do banco)', '', 'url', 'placeholder="https://..."')}</div>
      <div class="sub">Entra na Base de cartões e passa a valer para todos os clientes. Sala VIP e redução parcial você completa em Empresa > Base de cartões.</div>
      <button class="zap" type="button" data-cbok style="width:100%;margin-top:8px">Cadastrar na base</button></div>`;
    f.hidden = false;
    f.querySelector('[data-cbok]').onclick = async (e) => {
      const q = (k) => f.querySelector(`[name=${k}]`).value.trim(), nq = (k) => q(k) === '' ? null : Number(q(k).replace(',', '.'));
      const row = { banco: q('nb_banco'), nome: q('nb_nome'), anuidade_anual: nq('nb_anu'), isencao_gasto_mes: nq('nb_isen'), pontos_por: nq('nb_pts'), pontos_moeda: q('nb_moeda'),
        programa: q('nb_prog') || null, fonte: q('nb_fonte') || null, ativo: true, conferido_em: new Date().toISOString().slice(0, 10), atualizado_em: new Date().toISOString() };
      if (!row.banco || !row.nome) { aviso('Informe banco e cartão.'); return; }
      if (row.anuidade_anual === null) { aviso('Informe a anuidade cheia (0 se o cartão não tiver).'); return; }
      if (['anuidade_anual', 'isencao_gasto_mes', 'pontos_por'].some(k => row[k] !== null && !(row[k] >= 0))) { aviso('Confira os números.'); return; }
      e.target.disabled = true;
      const r1 = await sb.from('cartoes_catalogo').insert(row).select().single();
      if (r1.error) { e.target.disabled = false; aviso('Não salvou na base: ' + X.limparTec(r1.error.message)); return; }
      const cat = r1.data; BASE.push(cat); BASE.sort((a, b) => nomeBase(a).localeCompare(nomeBase(b)));
      let qy = sb.from('cartoes').select('*').is('catalogo_id', null).eq('banco', x.banco);
      qy = x.categoria ? qy.eq('categoria', x.categoria) : qy.is('categoria', null);
      const r2 = await qy, iguais = (r2.data && r2.data.length) ? r2.data : [x];
      let outros = 0;
      for (const y of iguais) {
        const up = { catalogo_id: cat.id, banco: cat.banco, categoria: cat.nome };
        Object.assign(up, textosPainel({ ...y, ...up }, cat, calc({ ...y, ...up }, cat, cot, refs, CART.normProg)));
        const r3 = await sb.from('cartoes').update(up).eq('id', y.id);
        if (!r3.error && y.cliente_id !== c.id) outros++;
      }
      aviso('Cartão cadastrado na base' + (outros ? ` e ligado também em ${outros} ${outros === 1 ? 'cartão de outro cliente' : 'cartões de outros clientes'}.` : '.'));
      secaoCliente(box, c, X, onPrimeiro);
    };
  });
  box.querySelectorAll('[data-ce]').forEach(b => b.onclick = () => { const x = C.find(y => y.id === b.dataset.ce); const d = box.querySelector('#cxForm'); d.open = true; d.querySelector('summary').textContent = 'Editar cartão'; desenharForm(x); d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  box.querySelectorAll('[data-cd]').forEach(b => b.onclick = async () => {
    if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = 'confirmar'; return; }
    const { error } = await sb.from('cartoes').delete().eq('id', b.dataset.cd);
    if (error) { aviso('Não excluiu: ' + error.message); return; }
    secaoCliente(box, c, X, onPrimeiro);
  });
}
