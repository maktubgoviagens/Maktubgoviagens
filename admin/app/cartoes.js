// Maktub Go: base de cartões do mercado e cartões dos clientes da Gestão.
// As contas (anuidade que paga, isenção pelo gasto, pontos e valor no ano) são feitas aqui, por fórmula, sem IA.

export const MOEDAS = [['USD', 'pontos por US$ 1'], ['BRL', 'pontos por R$ 1'], ['PCT', '% de cashback']];
let BASE = null, ED = null, BUSCA = '';

export async function carregarBase(sb, forcar) {
  if (BASE && !forcar) return BASE;
  const { data, error } = await sb.from('cartoes_catalogo').select('*').order('banco').order('nome');
  if (error) throw error;
  BASE = data || [];
  return BASE;
}
const nomeBase = (b) => `${b.banco} ${b.nome}`.trim();
const dec = (x) => Number(x).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const n = (x) => x === null || x === undefined || x === '' ? null : Number(x);

// Contas de um cartão do cliente. cat: cartão da base (ou null); refs: valor do milheiro por programa.
export function calc(cart, cat, cotacao, refs, normProg) {
  const gasto = n(cart.gasto_medio_mes) || 0, cheia = cat ? n(cat.anuidade_anual) : null, minimo = cat ? n(cat.isencao_gasto_mes) : null;
  const isentaGasto = minimo !== null && minimo > 0 && gasto >= minimo;
  const paga = n(cart.anuidade_paga);
  // anuidade negociada vale mais que a regra da base; sem nenhuma das duas, não dá para saber
  const custo = paga !== null ? paga : cheia === null ? null : isentaGasto ? 0 : cheia;
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
  return { gasto, cheia, minimo, isentaGasto, paga, custo, pontos, valor, semValor, resultado: valor !== null && custo !== null ? valor - custo : null };
}

// Texto curto que vai para o painel do cliente (ele não lê a base de cartões)
function textosPainel(cart, cat, k) {
  const brl = (x) => 'R$ ' + Math.round(x).toLocaleString('pt-BR');
  const anuidade = k.custo === null ? null : k.custo === 0 ? (k.paga === null && k.cheia === 0 ? 'Sem anuidade' : k.isentaGasto ? 'Isenta pelo gasto' : 'Isenta') : `${brl(k.custo)}/ano`;
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
  const velho = (d) => !d || (Date.now() - new Date(d + 'T12:00:00')) / 864e5 > 180;
  const L = BASE.filter(b => !BUSCA || (nomeBase(b) + ' ' + (b.programa || '')).toLowerCase().includes(BUSCA.toLowerCase()));
  P.innerHTML = `<button class="voltar" id="voltar">‹ Empresa</button>
    <h1 class="titulo" style="margin-top:6px">Base de <em>cartões</em></h1>
    <div class="sub">Anuidade, isenção e pontuação de cada cartão do mercado. Os cartões dos clientes usam estes dados nas contas.</div>
    <section class="bloco">
      <div class="duas-col" style="align-items:end">${campo('cot', 'Cotação de referência do dólar (R$)', cot ?? '', 'number', 'placeholder="Ex.: 5,40"')}<button class="sec" id="cotOk" style="height:44px">Salvar cotação</button></div>
      <div class="sub">Usada para converter os gastos dos cartões que pontuam por dólar.</div>
    </section>
    <div class="duas-col" style="margin-top:14px;align-items:end"><label class="fl"><span>Buscar</span><input id="bBusca" value="${esc(BUSCA)}" placeholder="Banco, cartão ou programa"></label><button class="zap" id="bNovo" style="height:44px">+ Novo cartão</button></div>
    <section class="bloco" style="margin-top:10px">${L.length ? L.map(b => `<button type="button" class="lin" data-b="${b.id}" style="width:100%;background:none;border:0;border-top:1px solid var(--linha);text-align:left;cursor:pointer">
        <span><b style="font-weight:600">${esc(nomeBase(b))}</b>${!b.ativo ? ' <small>(fora de linha)</small>' : ''}
          <small style="display:block;color:var(--tinta-3);font-size:12px">${[b.anuidade_anual === null ? 'anuidade não informada' : Number(b.anuidade_anual) === 0 ? 'sem anuidade' : brl(b.anuidade_anual) + '/ano', n(b.isencao_gasto_mes) ? 'isenta com ' + brl(b.isencao_gasto_mes) + '/mês' : (Number(b.anuidade_anual) === 0 ? '' : b.isencao || ''), n(b.pontos_por) ? (b.pontos_moeda === 'PCT' ? dec(b.pontos_por) + '% de cashback' : dec(b.pontos_por) + ' pts/' + (b.pontos_moeda === 'USD' ? 'US$' : 'R$') + (b.programa ? ' ' + b.programa : '')) : ''].filter(Boolean).map(esc).join(' · ')}</small></span>
        <span${velho(b.conferido_em) ? ' style="color:var(--alerta)"' : ''}>${b.conferido_em ? 'conferido ' + b.conferido_em.split('-').reverse().join('/') : 'não conferido'}</span></button>`).join('')
      : `<div class="vazio">${BASE.length ? 'Nenhum cartão com essa busca.' : 'Nenhum cartão cadastrado ainda.'}</div>`}</section>
    <div class="sub" style="margin-top:8px">${num(BASE.length)} cartões na base. Em laranja, os conferidos há mais de 6 meses: vale revisar no site do banco.</div>`;
  $('voltar').onclick = voltar;
  $('bBusca').oninput = (e) => { BUSCA = e.target.value; const pos = e.target.selectionStart; telaBase(P, X); const b = $('bBusca'); b.focus(); b.setSelectionRange(pos, pos); };
  $('bNovo').onclick = () => { ED = 'novo'; telaBase(P, X); };
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
      ${campo('isencao', 'Regra de isenção, como o banco descreve', b.isencao, 'text', 'placeholder="Ex.: isenta com R$ 10 mil/mês ou R$ 100 mil investidos"')}
      <div class="duas-col">${campo('pontos_por', 'Pontuação', b.pontos_por, 'number', 'placeholder="Ex.: 2,2"')}${sel('pontos_moeda', 'Por', MOEDAS, b.pontos_moeda)}</div>
      ${campo('programa', 'Programa de pontos', b.programa, 'text', 'placeholder="Ex.: Esfera, Livelo, Átomos, Azul"')}
      ${campo('beneficios', 'Benefícios de viagem', b.beneficios, 'text', 'placeholder="Ex.: 8 acessos/ano LoungeKey, seguro viagem"')}
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
      fonte: v('fonte') || null, conferido_em: v('conferido_em') || null, ativo: f.elements.ativo.checked, atualizado_em: new Date().toISOString() };
    if (!row.banco || !row.nome) { aviso('Informe banco e cartão.'); return; }
    if (['anuidade_anual', 'isencao_gasto_mes', 'pontos_por'].some(k => row[k] !== null && !(row[k] >= 0))) { aviso('Confira os números.'); return; }
    const r = ED === 'novo' ? await sb.from('cartoes_catalogo').insert(row).select().single() : await sb.from('cartoes_catalogo').update(row).eq('id', ED).select().single();
    if (r.error) { aviso('Não salvou: ' + r.error.message); return; }
    if (ED === 'novo') BASE.push(r.data); else Object.assign(BASE.find(x => x.id === ED), r.data);
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
export async function secaoCliente(box, c, X, onPrimeiro) {
  const { sb, esc, aviso, campo, brl, num, D, CART } = X;
  box.innerHTML = '<div class="vazio">Carregando...</div>';
  const [r, refs] = await Promise.all([sb.from('cartoes').select('*').eq('cliente_id', c.id).order('ordem'), CART.valoresRef()]);
  try { await carregarBase(sb); } catch (_) { BASE = BASE || []; }
  if (!box.isConnected) return;
  if (r.error) { box.innerHTML = `<div class="vazio">${esc(X.limparTec('Não carregou: ' + r.error.message))}</div>`; return; }
  const C = r.data || [], cot = D.cfg && n(D.cfg.cotacao_dolar), porId = Object.fromEntries(BASE.map(b => [b.id, b]));
  const K = C.map(x => ({ x, cat: porId[x.catalogo_id] || null, k: calc(x, porId[x.catalogo_id] || null, cot, refs, CART.normProg) }));
  const soma = (f) => K.reduce((s, o) => s + (f(o) || 0), 0);
  const tot = { limite: soma(o => n(o.x.limite)), custo: soma(o => o.k.custo), valor: soma(o => o.k.valor), pontos: soma(o => o.k.pontos), semAnu: K.filter(o => o.k.custo === null).length };
  const data = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
  const linha = ({ x, cat, k }) => {
    const det = [
      k.custo === null ? 'anuidade: ligue à base ou informe' : k.custo === 0 ? (k.paga !== null ? 'anuidade negociada: isenta' : k.isentaGasto ? 'isenta pelo gasto' : 'sem anuidade') : `anuidade ${brl(k.custo)}/ano${k.paga !== null ? ' (negociada)' : k.minimo ? ` · isenta com ${brl(k.minimo)}/mês (gasta ${brl(k.gasto)})` : ''}`,
      k.pontos !== null ? `${num(Math.round(k.pontos))} pts/ano` : '', k.valor !== null ? `vale ${brl(k.valor)}/ano` : k.semValor,
    ].filter(Boolean).join(' · ');
    const res = k.resultado === null ? '' : `<b style="font-weight:600;color:${k.resultado >= 0 ? 'var(--verde)' : 'var(--alerta)'}">${k.resultado >= 0 ? '+' : '−'} ${brl(Math.abs(k.resultado))}/ano</b>`;
    return `<div class="lin" style="align-items:flex-start"><span><b style="font-weight:600">${esc(cat ? nomeBase(cat) : [x.banco, x.categoria].filter(Boolean).join(' '))}</b>${x.final_cartao ? ' · final ' + esc(x.final_cartao) : ''}${!cat ? ' <small style="color:var(--alerta)">(fora da base)</small>' : ''}
        <small style="display:block;color:var(--tinta-3);font-size:12px">${esc(det)}</small>
        ${x.disponivel !== null && x.disponivel !== undefined ? `<small style="display:block;color:var(--tinta-3);font-size:12px">disponível ${brl(x.disponivel)}, informado pelo cliente em ${data(x.disponivel_em)}</small>` : ''}
        ${x.observacao_interna ? `<small style="display:block;color:var(--tinta-3);font-size:12px">${esc(x.observacao_interna)}</small>` : ''}</span>
      <span style="text-align:right">${n(x.limite) !== null ? brl(x.limite) : 'limite a confirmar'}${res ? '<br>' + res : ''}<br><button class="mini" data-ce="${x.id}">editar</button><button class="mini" data-cd="${x.id}">excluir</button></span></div>`;
  };
  box.innerHTML = (C.length ? `<div class="numeros" style="margin:0 0 6px">
        <div class="num"><div class="l">Limite total</div><div class="v">${brl(tot.limite)}</div><div class="d">${num(C.length)} cartões</div></div>
        <div class="num"><div class="l">Anuidades no ano</div><div class="v">${brl(tot.custo)}</div><div class="d">${tot.semAnu ? `${tot.semAnu} sem anuidade conhecida` : 'com as isenções pelo gasto'}</div></div>
        <div class="num"><div class="l">Valor dos pontos no ano</div><div class="v">${brl(tot.valor)}</div><div class="d">${num(Math.round(tot.pontos))} pts pelo gasto informado</div></div>
      </div>${K.map(linha).join('')}` : '<div class="vazio">Nenhum cartão lançado. Eles chegam pelo checklist pré-onboard.</div>')
    + `<details style="margin-top:8px" id="cxForm"${C.length ? '' : ' open'}><summary class="sub" style="cursor:pointer">+ Adicionar cartão</summary><div id="cxCampos"></div></details>`;
  const ED_C = { id: null };
  const desenharForm = (x) => {
    ED_C.id = x ? x.id : null;
    const ops = [['', 'Escolha o cartão na base']].concat(BASE.filter(b => b.ativo !== false || (x && x.catalogo_id === b.id)).map(b => [b.id, nomeBase(b)])).concat([['outro', 'Outro, fora da base']]);
    const atual = x ? (x.catalogo_id || 'outro') : '';
    box.querySelector('#cxCampos').innerHTML = `
      <label class="fl"><span>Cartão</span><select name="cx_base">${ops.map(([k, l]) => `<option value="${esc(k)}"${k === atual ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <div id="cxOutro" ${atual === 'outro' ? '' : 'hidden'}><div class="duas-col">${campo('cx_banco', 'Banco', x ? x.banco : '', 'text', 'placeholder="Ex.: Sicoob"')}${campo('cx_cartao', 'Cartão', x ? x.categoria : '', 'text', 'placeholder="Ex.: Sicoobcard Gold"')}</div></div>
      <div class="duas-col">${campo('cx_limite', 'Limite (R$)', x ? x.limite : '', 'number', 'placeholder="em branco se a confirmar"')}${campo('cx_final', 'Final (4 dígitos)', x ? x.final_cartao : '', 'text', 'inputmode="numeric" maxlength="4"')}</div>
      <div class="duas-col">${campo('cx_gasto', 'Gasto médio por mês (R$)', x ? x.gasto_medio_mes : '', 'number')}${campo('cx_paga', 'Anuidade que paga hoje (R$/ano)', x ? x.anuidade_paga : '', 'number', 'placeholder="só se negociou"')}</div>
      ${campo('cx_obs', 'Observação (opcional)', x ? x.observacao_interna : '', 'text', 'placeholder="Ex.: titular, adicional da esposa"')}
      <div class="sub">Nunca anote o número inteiro do cartão nem senha. O cliente vê no painel o cartão, o limite e a anuidade.</div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="zap" type="button" id="cxSalvar" style="flex:2">${x ? 'Salvar alterações' : 'Salvar cartão'}</button>${x ? '<button class="sec" type="button" id="cxCanc" style="flex:1">Cancelar</button>' : ''}</div>`;
    const q = (k) => box.querySelector(`[name=${k}]`);
    q('cx_base').onchange = () => { box.querySelector('#cxOutro').hidden = q('cx_base').value !== 'outro'; };
    if (box.querySelector('#cxCanc')) box.querySelector('#cxCanc').onclick = () => secaoCliente(box, c, X, onPrimeiro);
    box.querySelector('#cxSalvar').onclick = async () => {
      const t = (k) => q(k).value.trim(), num2 = (k) => t(k) === '' ? null : Number(t(k).replace(',', '.'));
      const id = t('cx_base'), cat = porId[id] || null;
      if (!id) { aviso('Escolha o cartão na base ou "Outro, fora da base".'); return; }
      if (id === 'outro' && !t('cx_banco')) { aviso('Informe o banco.'); return; }
      if (t('cx_final') && !/^\d{4}$/.test(t('cx_final'))) { aviso('O final tem 4 dígitos.'); return; }
      if (/\d{12,}/.test((t('cx_cartao') + t('cx_obs')).replace(/\s/g, ''))) { aviso('Parece um número de cartão. Não guarde o número aqui.'); return; }
      const lim = num2('cx_limite'), gasto = num2('cx_gasto'), paga = num2('cx_paga');
      if ([lim, gasto, paga].some(v => v !== null && !(v >= 0))) { aviso('Confira os valores.'); return; }
      const row = { catalogo_id: cat ? cat.id : null, banco: cat ? cat.banco : t('cx_banco'), categoria: cat ? cat.nome : (t('cx_cartao') || null), limite: lim, final_cartao: t('cx_final') || null,
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
  box.querySelectorAll('[data-ce]').forEach(b => b.onclick = () => { const x = C.find(y => y.id === b.dataset.ce); const d = box.querySelector('#cxForm'); d.open = true; d.querySelector('summary').textContent = 'Editar cartão'; desenharForm(x); d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  box.querySelectorAll('[data-cd]').forEach(b => b.onclick = async () => {
    if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = 'confirmar'; return; }
    const { error } = await sb.from('cartoes').delete().eq('id', b.dataset.cd);
    if (error) { aviso('Não excluiu: ' + error.message); return; }
    secaoCliente(box, c, X, onPrimeiro);
  });
}
