// Maktub Go: base de cartões do mercado e cartões dos clientes da Gestão.
// As contas (anuidade que paga, isenção pelo gasto, pontos e valor no ano) são feitas aqui, por fórmula, sem IA.
import * as IMPORTAR from '/admin/app/cartoes-importar.js?v=2';

export const MOEDAS = [['USD', 'pontos por US$ 1'], ['BRL', 'pontos por R$ 1'], ['PCT', '% de cashback']];
let BASE = null, ED = null, BUSCA = '', FILTRO_C = 'todos';
// abas da Base de cartões (Cartões, Salas VIP, Bancos, Correções) e o que cada uma guarda
let ABA_B = 'cartoes', IMP = false, LIN_ED = null, CORR_ED = null;
let SALAS = null, SEGS = null, CORR = null, NPEND = null, AERO = null;
const SV = { modo: 'aeroporto', filtro: 'todas', rede: '', aero: '', gasto: 'todos' };
const SA = { busca: '', tipo: 'todos', rede: 'todas' };
let BUSCA_BANCO = '', CORR_ST = 'pendente';

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
// régua, salas VIP, bancos e correções dependem do 62-ia-cartoes-bases.sql
const TEM_NOVAS = () => (BASE || []).some(b => 'vendido_hoje' in b);
const dec = (x) => Number(x).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export const salaVip = (b) => !b ? '' : b.salas_vip_ilimitado ? `sala VIP ilimitada${b.salas_vip_programa ? ' (' + b.salas_vip_programa + ')' : ''}`
  : n(b.salas_vip_ano) ? `${b.salas_vip_ano} ${Number(b.salas_vip_ano) === 1 ? 'acesso' : 'acessos'}/ano a sala VIP${b.salas_vip_programa ? ' (' + b.salas_vip_programa + ')' : ''}` : '';
const n = (x) => x === null || x === undefined || x === '' ? null : Number(x);
const hojeISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const velho = (d) => !d || (Date.now() - new Date(String(d).slice(0, 10) + 'T12:00:00')) / 864e5 > 90;
const dataBR = (d) => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '';
const conferido = (d) => `<span${velho(d) ? ' style="color:var(--alerta)"' : ''}>${d ? 'conferido ' + dataBR(d) : 'não conferido'}</span>`;
const avisoVelhos = (L, X) => { const v = L.filter(x => velho(x.conferido_em)).length; return v ? `<div class="sub" style="margin-top:8px;font-size:13px">${X.num(v)} ${v === 1 ? 'item conferido' : 'itens conferidos'} há mais de 90 dias ou sem data, em laranja: vale revisar no site do banco.</div>` : ''; };

// ao entrar pelo menu, abre a lista (e não o cartão que ficou aberto da última vez)
export function inicio() { ED = null; ABA_B = 'cartoes'; IMP = false; LIN_ED = null; CORR_ED = null; SALAS = SEGS = CORR = NPEND = AERO = null; IMPORTAR.limpar(); }
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

/* ---------------- Base de cartões (aba Gestão): Cartões, Salas VIP, Bancos e Correções ---------------- */
const ABAS_B = [['cartoes', 'Cartões'], ['salas', 'Salas VIP'], ['bancos', 'Bancos'], ['correcoes', 'Correções']];
const rotuloAba = (k, l) => k === 'correcoes' && NPEND ? `${l} (${NPEND})` : l;
const TIPO_SALA = { rede_global: 'rede global', sala_banco: 'sala do banco', sala_bandeira: 'sala da bandeira', sala_companhia: 'sala da companhia' };
async function contarPendentes(sb) {
  const r = await sb.from('cartoes_correcoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente');
  return r.error ? 0 : (r.count || 0);
}
// carrega uma tabela da aba e redesenha; sem o SQL, a aba avisa
async function carregar(X, P, tabela, ordem, guardar) {
  let q = X.sb.from(tabela).select('*');
  ordem.forEach(o => { q = q.order(o); });
  const r = await q;
  guardar(r.error ? false : (r.data || []));
  if (X.aba() === 'cartoesbase' && !ED && !IMP && !LIN_ED) telaBase(P, X);
}

export async function telaBase(P, X) {
  const { sb, $, esc } = X;
  const voltar = () => { ED = null; X.ir('gestao'); };
  if (!BASE) {
    P.innerHTML = `<button class="voltar" id="voltar">‹ Gestão</button><h1 class="titulo" style="margin-top:6px">Base de <em>cartões</em></h1><div class="vazio">Carregando...</div>`;
    $('voltar').onclick = voltar;
    try { await carregarBase(sb); } catch (e) { if (X.aba() === 'cartoesbase') P.querySelector('.vazio').textContent = X.tec('A base de cartões ainda não foi ativada: rode no Supabase o SQL da base de cartões.'); return; }
    if (X.aba() !== 'cartoesbase') return;
  }
  if (IMP) return IMPORTAR.telaImportar(P, X, { base: BASE, voltar: () => { IMP = false; telaBase(P, X); scrollTo(0, 0); },
    recarregar: async () => { await carregarBase(sb, true); SALAS = SEGS = CORR = NPEND = AERO = null; } });
  if (ED) return formBase(P, X);
  if (LIN_ED) return formLinha(P, X);
  if (TEM_NOVAS() && NPEND === null) { NPEND = 0; contarPendentes(sb).then(c => { NPEND = c; const b = P.querySelector('[data-ab="correcoes"]'); if (b) b.textContent = rotuloAba('correcoes', 'Correções'); }); }
  P.innerHTML = `<button class="voltar" id="voltar">‹ Gestão</button>
    <h1 class="titulo" style="margin-top:6px">Base de <em>cartões</em></h1>
    ${TEM_NOVAS() ? `<div class="chips" id="abasB" style="margin-top:10px">${ABAS_B.map(([k, l]) => `<button data-ab="${k}" class="${ABA_B === k ? 'on' : ''}">${rotuloAba(k, l)}</button>`).join('')}</div>` : ''}
    <div id="corpoB"></div>`;
  $('voltar').onclick = voltar;
  P.querySelectorAll('[data-ab]').forEach(b => b.onclick = () => { ABA_B = b.dataset.ab; telaBase(P, X); });
  const corpo = $('corpoB');
  corpo.onclick = (e) => { if (e.target.closest('[data-irimp]')) { ABA_B = 'cartoes'; IMP = true; telaBase(P, X); scrollTo(0, 0); } };
  if (ABA_B === 'salas' && TEM_NOVAS()) return SV.modo === 'aeroporto' ? abaAeroportos(corpo, P, X) : abaSalas(corpo, P, X);
  if (ABA_B === 'bancos' && TEM_NOVAS()) return abaBancos(corpo, P, X);
  if (ABA_B === 'correcoes' && TEM_NOVAS()) return abaCorrecoes(corpo, P, X);
  return abaCartoes(corpo, P, X);
}

function resumoCartao(b, brl) {
  const pts = n(b.pontos_por) ? (b.pontos_moeda === 'PCT' ? dec(b.pontos_por) + '% de cashback'
    : dec(b.pontos_por) + ' pts/' + (b.pontos_moeda === 'USD' ? 'US$' : 'R$') + (n(b.pts_internacional) && n(b.pts_internacional) !== n(b.pontos_por) ? ` (exterior ${dec(b.pts_internacional)})` : '') + (b.programa ? ' ' + b.programa : '')) : '';
  return [b.anuidade_anual === null ? 'anuidade não informada' : Number(b.anuidade_anual) === 0 ? 'sem anuidade' : brl(b.anuidade_anual) + '/ano',
    n(b.isencao_gasto_mes) ? 'isenta com ' + brl(b.isencao_gasto_mes) + '/mês' : (Number(b.anuidade_anual) === 0 ? '' : b.isencao || ''),
    n(b.reducao_gasto_mes) && n(b.reducao_pct) ? 'cai ' + dec(b.reducao_pct) + '% com ' + brl(b.reducao_gasto_mes) + '/mês' : '', pts, salaVip(b)].filter(Boolean).join(' · ');
}
function abaCartoes(corpo, P, X) {
  const { sb, $, esc, aviso, campo, D, num, brl } = X;
  const cot = D.cfg && n(D.cfg.cotacao_dolar);
  const filtros = [['todos', 'Todos'], ['ilim', 'Sala VIP ilimitada'], ['conf', 'A confirmar'], ['fora', 'Fora de linha']];
  const passa = (b) => FILTRO_C === 'ilim' ? b.salas_vip_ilimitado : FILTRO_C === 'conf' ? b.a_confirmar : FILTRO_C === 'fora' ? b.vendido_hoje === false || b.ativo === false : true;
  const L = BASE.filter(b => passa(b) && (!BUSCA || (nomeBase(b) + ' ' + (b.programa || '')).toLowerCase().includes(BUSCA.toLowerCase())));
  corpo.innerHTML = `<div class="sub">Anuidade, isenção e pontuação de cada cartão do mercado. Os cartões dos clientes usam estes dados nas contas.</div>
    ${X.admin && TEM_NOVAS() ? '<button class="sec" id="bImp" style="width:100%;margin-top:10px">Importar planilha da base</button>' : ''}
    <section class="bloco">
      <div class="duas-col" style="align-items:end">${campo('cot', 'Cotação de referência do dólar (R$)', cot ?? '', 'number', 'placeholder="Ex.: 5,40"')}<button class="sec" id="cotOk" style="height:44px">Salvar cotação</button></div>
      <div class="sub">Usada para converter os gastos dos cartões que pontuam por dólar.</div>
    </section>
    <div class="duas-col" style="margin-top:14px;align-items:end"><label class="fl"><span>Buscar</span><input id="bBusca" value="${esc(BUSCA)}" placeholder="Banco, cartão ou programa"></label><button class="zap" id="bNovo" style="height:44px">+ Novo cartão</button></div>
    ${TEM_NOVAS() ? `<div class="chips" style="margin-top:8px">${filtros.map(([k, l]) => `<button data-fc="${k}" class="${FILTRO_C === k ? 'on' : ''}">${l}</button>`).join('')}</div>`
      : `<label class="fc" style="margin-top:8px"><input type="checkbox" id="bIlim" ${FILTRO_C === 'ilim' ? 'checked' : ''}><span>Só cartões com sala VIP ilimitada</span></label>`}
    <section class="bloco" style="margin-top:10px">${L.length ? L.map(b => `<button type="button" class="lin" data-b="${b.id}" style="width:100%;background:none;border:0;border-top:1px solid var(--linha);text-align:left;cursor:pointer">
        <span><b style="font-weight:600">${esc(nomeBase(b))}</b>${b.ativo === false ? ' <small>(fora da lista)</small>' : b.vendido_hoje === false ? ' <small>(fora de linha)</small>' : ''}${b.a_confirmar ? ' <span class="tag alerta">a confirmar</span>' : ''}
          <small style="display:block;color:var(--tinta-3);font-size:13px">${esc(resumoCartao(b, brl))}</small></span>
        ${conferido(b.conferido_em)}</button>`).join('')
      : `<div class="vazio">${BASE.length ? 'Nenhum cartão com essa busca.' : 'Nenhum cartão cadastrado ainda.'}</div>`}</section>
    <div class="sub" style="margin-top:8px">${num(L.length)} de ${num(BASE.length)} cartões. Em laranja, os conferidos há mais de 90 dias: vale revisar no site do banco.</div>
    ${X.admin && !TEM_NOVAS() ? X.tec('<div class="config" style="margin-top:14px">Para salas VIP, bancos, correções e a importação da planilha, rode no Supabase o 62-ia-cartoes-bases.sql.</div>') : ''}`;
  $('bBusca').oninput = (e) => { BUSCA = e.target.value; const pos = e.target.selectionStart; telaBase(P, X); const b = $('bBusca'); b.focus(); b.setSelectionRange(pos, pos); };
  $('bNovo').onclick = () => { ED = 'novo'; telaBase(P, X); };
  if ($('bIlim')) $('bIlim').onchange = (e) => { FILTRO_C = e.target.checked ? 'ilim' : 'todos'; telaBase(P, X); };
  corpo.querySelectorAll('[data-fc]').forEach(b => b.onclick = () => { FILTRO_C = b.dataset.fc; telaBase(P, X); });
  if ($('bImp')) $('bImp').onclick = () => { IMP = true; telaBase(P, X); scrollTo(0, 0); };
  corpo.querySelectorAll('[data-b]').forEach(el => el.onclick = () => { ED = el.dataset.b; telaBase(P, X); scrollTo(0, 0); });
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
  const b = ED === 'novo' ? { ativo: true, vendido_hoje: true, pontos_moeda: 'USD' } : BASE.find(x => x.id === ED);
  if (!b) { ED = null; return telaBase(P, X); }
  const novas = TEM_NOVAS();
  const sel = (nome, rot, ops, v) => `<label class="fl"><span>${rot}</span><select name="${nome}">${ops.map(([k, l]) => `<option value="${esc(k)}"${String(k) === String(v ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const caixa = (nome, rot, v) => `<label class="fc"><input type="checkbox" name="${nome}" ${v ? 'checked' : ''}><span>${rot}</span></label>`;
  const grupo = (t) => `<div class="secao" style="margin:18px 0 0">${t}</div>`;
  const c = CORR_ED && CORR_ED.catalogo_id === b.id ? CORR_ED : null;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Base de cartões</button>
    <h1 class="titulo" style="margin-top:6px">${ED === 'novo' ? 'Novo <em>cartão</em>' : esc(nomeBase(b))}</h1>
    ${c ? `<div class="config" style="margin-top:12px;font-size:14px"><b>Correção a aplicar: ${esc(c.campo)}</b><br>Hoje na base: ${esc(c.valor_na_base || 'vazio')}<br>Valor atual: ${esc(c.valor_atual || '')}${c.observacao ? '<br>' + esc(c.observacao) : ''}<br>Ajuste o campo abaixo e salve: a correção fica como aceita.</div>` : ''}
    <form class="bloco form" id="fBase">
      <div class="duas-col">${campo('banco', 'Banco *', b.banco, 'text', 'required placeholder="Ex.: Santander"')}${campo('nome', 'Cartão *', b.nome, 'text', 'required placeholder="Ex.: Unique Visa Infinite"')}</div>
      <div class="duas-col">${campo('bandeira', 'Bandeira', b.bandeira, 'text', 'placeholder="Visa, Mastercard, Elo"')}${campo('categoria', 'Categoria', b.categoria, 'text', 'placeholder="Gold, Platinum, Black..."')}</div>
      ${novas ? grupo('Régua') + `<div class="duas-col">${campo('familia_regua', 'Família', b.familia_regua, 'text', 'placeholder="Ex.: Santander alta renda"')}${campo('posicao_regua', 'Posição (1 = entrada)', b.posicao_regua, 'number')}</div>${campo('proximo_degrau', 'Próximo cartão da família', b.proximo_degrau)}` : ''}
      ${novas ? grupo('Anuidade e isenção') : ''}
      <div class="duas-col">${campo('anuidade_anual', 'Anuidade cheia (R$ por ano)', b.anuidade_anual, 'number')}${campo('isencao_gasto_mes', 'Gasto por mês que isenta 100% (R$)', b.isencao_gasto_mes, 'number', 'placeholder="em branco se não houver"')}</div>
      ${TEM_REDUCAO() ? `<div class="duas-col">${campo('reducao_gasto_mes', 'Gasto por mês que reduz (R$)', b.reducao_gasto_mes, 'number', 'placeholder="em branco se não houver"')}${campo('reducao_pct', 'Redução da anuidade (%)', b.reducao_pct, 'number', 'placeholder="Ex.: 50"')}</div>` : X.tec('<div class="sub">Para guardar a redução parcial da anuidade (ex.: 50% com um gasto menor), rode no Supabase o SQL da redução de anuidade.</div>')}
      ${novas ? campo('isencao_invest', 'Valor investido que isenta 100% (R$)', b.isencao_invest, 'number', 'placeholder="em branco se não houver"') : ''}
      ${campo('isencao', 'Regra de isenção, como o banco descreve', b.isencao, 'text', 'placeholder="Ex.: isenta com R$ 10 mil/mês ou R$ 100 mil investidos"')}
      ${novas ? campo('isencao_outras', 'Outras regras de isenção', b.isencao_outras) : ''}
      ${novas ? grupo('Pontuação') : ''}
      <div class="duas-col">${campo('pontos_por', novas ? 'Pontuação no Brasil' : 'Pontuação', b.pontos_por, 'number', 'placeholder="Ex.: 2,2"')}${sel('pontos_moeda', 'Por', MOEDAS, b.pontos_moeda)}</div>
      ${novas ? `<div class="duas-col">${campo('pts_internacional', 'Pontuação no exterior', b.pts_internacional, 'number', 'placeholder="Ex.: 3"')}${sel('tipo_destino', 'Para onde vão os pontos', [['', ''], ['programa_banco', 'Programa do banco'], ['aerea_direta', 'Direto na companhia aérea'], ['cashback', 'Cashback'], ['nenhum', 'Sem pontos'], ['outro', 'Outro']], b.tipo_destino)}</div>
        ${campo('pts_condicional', 'Pontuação com condição', b.pts_condicional, 'text', 'placeholder="Ex.: 2,5 com fatura a partir de R$ 4 mil"')}${campo('destino_pontos', 'Destino dos pontos', b.destino_pontos, 'text', 'placeholder="Ex.: Livelo (transfere para LATAM Pass, Smiles...)"')}` : ''}
      ${campo('programa', 'Programa de pontos (usado no valor do milheiro)', b.programa, 'text', 'placeholder="Ex.: Esfera, Livelo, Átomos, Azul"')}
      ${novas ? campo('pontos_expiram', 'Validade dos pontos', b.pontos_expiram) : ''}
      ${novas ? grupo('Sala VIP') : ''}
      <div class="duas-col">${campo('salas_vip_programa', 'Sala VIP: programa', b.salas_vip_programa, 'text', 'placeholder="LoungeKey, Priority Pass, DragonPass..."')}${campo('salas_vip_ano', 'Acessos por ano (titular)', b.salas_vip_ano, 'number', 'placeholder="em branco se não tiver"')}</div>
      <label class="fc"><input type="checkbox" name="salas_vip_ilimitado" ${b.salas_vip_ilimitado ? 'checked' : ''}><span>Sala VIP ilimitada</span></label>
      ${novas ? '<div class="sub" style="font-size:13px">O detalhe de cada sala (acompanhantes, gasto mínimo, aeroportos) fica na aba Salas VIP.</div>' + grupo('Para ter o cartão') + `<div class="duas-col">${campo('exige_renda', 'Renda mínima (R$/mês)', b.exige_renda, 'number')}${campo('exige_invest', 'Investimento mínimo (R$)', b.exige_invest, 'number')}</div>${campo('exige_outro', 'Outra exigência', b.exige_outro, 'text', 'placeholder="Ex.: cliente Private, via gerente"')}${caixa('somente_convite', 'Somente por convite', b.somente_convite)}` : ''}
      ${novas ? grupo('Outros') : ''}
      ${campo('beneficios', 'Outros benefícios e condições', b.beneficios, 'text', 'placeholder="Ex.: acesso exige gasto mínimo, seguro viagem"')}
      ${novas ? campo('seguro_viagem', 'Seguro viagem', b.seguro_viagem) + campo('observacoes', 'Observações', b.observacoes) : ''}
      <div class="duas-col">${campo('fonte', 'Fonte (site do banco)', b.fonte, 'url', 'placeholder="https://..."')}${campo('conferido_em', 'Conferido em', b.conferido_em, 'date')}</div>
      ${novas ? caixa('vendido_hoje', 'O banco ainda vende este cartão', b.vendido_hoje !== false) + caixa('a_confirmar', 'Falta conferir no site do banco', b.a_confirmar) : ''}
      ${caixa('ativo', novas ? 'Aparece na lista para lançar nos clientes' : 'Cartão ainda é oferecido pelo banco', b.ativo !== false)}
      <div style="display:flex;gap:8px;margin-top:12px"><button class="zap" type="submit" style="flex:2">Salvar</button>${ED !== 'novo' ? '<button class="sec" type="button" id="bDel" style="flex:1">Excluir</button>' : ''}</div>
    </form>`;
  const voltar = () => { ED = null; if (c) { CORR_ED = null; ABA_B = 'correcoes'; } telaBase(P, X); };
  $('voltar').onclick = voltar;
  const f = $('fBase'), v = (k) => f.elements[k].value.trim(), nv = (k) => v(k) === '' ? null : Number(v(k).replace(',', '.'));
  f.onsubmit = async (e) => {
    e.preventDefault();
    const row = { banco: v('banco'), nome: v('nome'), bandeira: v('bandeira') || null, categoria: v('categoria') || null, anuidade_anual: nv('anuidade_anual'), isencao_gasto_mes: nv('isencao_gasto_mes'),
      isencao: v('isencao') || null, pontos_por: nv('pontos_por'), pontos_moeda: v('pontos_moeda'), programa: v('programa') || null, beneficios: v('beneficios') || null,
      fonte: v('fonte') || null, conferido_em: v('conferido_em') || null, ativo: f.elements.ativo.checked, atualizado_em: new Date().toISOString(),
      salas_vip_programa: v('salas_vip_programa') || null, salas_vip_ano: nv('salas_vip_ano') === null ? null : Math.round(nv('salas_vip_ano')), salas_vip_ilimitado: f.elements.salas_vip_ilimitado.checked,
      ...(TEM_REDUCAO() ? { reducao_gasto_mes: nv('reducao_gasto_mes'), reducao_pct: nv('reducao_pct') } : {}),
      // a pontuação no Brasil é a mesma que as contas usam
      ...(novas ? { familia_regua: v('familia_regua') || null, posicao_regua: nv('posicao_regua') === null ? null : Math.round(nv('posicao_regua')), proximo_degrau: v('proximo_degrau') || null,
        isencao_invest: nv('isencao_invest'), isencao_outras: v('isencao_outras') || null, pts_nacional: nv('pontos_por'), pts_internacional: nv('pts_internacional'), tipo_destino: v('tipo_destino') || null,
        pts_condicional: v('pts_condicional') || null, destino_pontos: v('destino_pontos') || null, pontos_expiram: v('pontos_expiram') || null, exige_renda: nv('exige_renda'), exige_invest: nv('exige_invest'),
        exige_outro: v('exige_outro') || null, somente_convite: f.elements.somente_convite.checked, seguro_viagem: v('seguro_viagem') || null, observacoes: v('observacoes') || null,
        vendido_hoje: f.elements.vendido_hoje.checked, a_confirmar: f.elements.a_confirmar.checked } : {}) };
    if (row.reducao_pct !== undefined && row.reducao_pct !== null && !(row.reducao_pct > 0 && row.reducao_pct <= 100)) { aviso('A redução é uma porcentagem entre 1 e 100.'); return; }
    if (!row.banco || !row.nome) { aviso('Informe banco e cartão.'); return; }
    if (['anuidade_anual', 'isencao_gasto_mes', 'pontos_por', 'salas_vip_ano', 'pts_internacional', 'isencao_invest', 'exige_renda', 'exige_invest'].some(k => row[k] !== undefined && row[k] !== null && !(row[k] >= 0))) { aviso('Confira os números.'); return; }
    const r = ED === 'novo' ? await sb.from('cartoes_catalogo').insert(row).select().single() : await sb.from('cartoes_catalogo').update(row).eq('id', ED).select().single();
    if (r.error) { aviso('Não salvou: ' + r.error.message); return; }
    if (ED === 'novo') BASE.push(r.data); else Object.assign(BASE.find(x => x.id === ED), r.data);
    // quem já tem esse cartão: os textos do painel do cliente (anuidade e pontuação) acompanham a base
    if (ED !== 'novo' && X.CART) atualizarPaineis(sb, X.CART, X.D, r.data).catch(() => {});
    BASE.sort((a, x) => nomeBase(a).localeCompare(nomeBase(x)));
    if (c) { await decidirCorrecao(X, c, 'aceita'); aviso('Cartão salvo e correção aceita.'); } else aviso('Cartão salvo na base.');
    voltar();
  };
  if ($('bDel')) $('bDel').onclick = async (e) => {
    if (e.target.dataset.ok !== '1') { e.target.dataset.ok = '1'; e.target.textContent = 'Toque de novo'; return; }
    const { error } = await sb.from('cartoes_catalogo').delete().eq('id', ED);
    if (error) { aviso('Não excluiu: ' + error.message); return; }
    BASE = BASE.filter(x => x.id !== ED); aviso('Cartão excluído da base.'); voltar();
  };
}

// aba sem nada ainda: o caminho é importar a planilha
const vazioImportar = (X) => `<div class="config" style="margin-top:12px">Ainda não há dados. Importe a planilha na aba Cartões.${X.admin ? '<br><button class="sec" data-irimp style="margin-top:10px">Importar planilha</button>' : ''}</div>`;
const modoSalas = () => `<div class="chips" style="margin-top:8px">${[['aeroporto', 'Por aeroporto'], ['cartao', 'Por cartão']].map(([k, l]) => `<button data-sm="${k}" class="${SV.modo === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const ligarModo = (corpo, P, X) => corpo.querySelectorAll('[data-sm]').forEach(b => b.onclick = () => { SV.modo = b.dataset.sm; telaBase(P, X); });

/* ---------- Salas VIP: uma linha por cartão e por rede ou sala ---------- */
const acessosTxt = (a) => a === null || a === undefined ? 'acessos não informados' : Number(a) === -1 ? 'ilimitado' : Number(a) === 0 ? 'sem acesso grátis' : `${a} ${Number(a) === 1 ? 'acesso' : 'acessos'} por ano`;
const temGastoMin = (s) => n(s.gasto_minimo_rs) > 0 || /r\$\s*\d/i.test(s.gasto_minimo || '');
const semGastoMin = (s) => !temGastoMin(s) && /sem gasto|n[aã]o h[aá] gasto/i.test(s.gasto_minimo || '');
function abaSalas(corpo, P, X) {
  const { $, esc, num, brl } = X;
  if (SALAS === null) { corpo.innerHTML = '<div class="vazio">Carregando...</div>'; carregar(X, P, 'cartoes_salas_vip', ['banco', 'nome_cartao'], d => { SALAS = d; }); return; }
  if (SALAS === false) { corpo.innerHTML = X.tec('<div class="config" style="margin-top:12px">Rode no Supabase o 62-ia-cartoes-bases.sql para ativar as salas VIP.</div>'); return; }
  if (!SALAS.length) { corpo.innerHTML = modoSalas() + vazioImportar(X); ligarModo(corpo, P, X); return; }
  const filtros = [['todas', 'Todas'], ['ilim', 'Ilimitadas'], ['mudou', 'Mudou em 2026'], ['conf', 'Só conferidas']];
  const t = (x) => String(x || '').toLowerCase();
  const L = SALAS.filter(s => (SV.filtro !== 'ilim' || Number(s.acessos_titular_ano) === -1) && (SV.filtro !== 'mudou' || s.mudou_em_2026) && (SV.filtro !== 'conf' || !s.a_confirmar)
    && (!SV.rede || t(s.rede_ou_sala).includes(t(SV.rede))) && (!SV.aero || t(s.aeroportos).includes(t(SV.aero)))
    && (SV.gasto === 'todos' || (SV.gasto === 'sem' ? semGastoMin(s) : temGastoMin(s))));
  const grupos = []; L.forEach(s => { const k = s.banco + ' · ' + s.nome_cartao; const g = grupos.find(x => x.k === k); g ? g.L.push(s) : grupos.push({ k, s, L: [s] }); });
  const linha = (s) => `<div style="border-top:1px solid var(--linha);padding:10px 0">
      <div><b style="font-weight:600">${esc(s.rede_ou_sala)}</b> ${s.tipo ? `<span class="tag">${TIPO_SALA[s.tipo] || esc(s.tipo)}</span>` : ''}${s.a_confirmar ? ' <span class="tag alerta">a confirmar</span>' : ''}</div>
      <div style="font-size:13px;color:var(--tinta-2);margin-top:4px">${esc([acessosTxt(s.acessos_titular_ano), s.acompanhantes ? 'acompanhantes: ' + s.acompanhantes : '', s.adicionais ? 'adicionais: ' + s.adicionais : ''].filter(Boolean).join(' · '))}</div>
      ${s.gasto_minimo ? `<div style="font-size:13px;margin-top:2px;${temGastoMin(s) ? 'color:var(--verde)' : 'color:var(--tinta-3)'}">Gasto mínimo: ${esc(s.gasto_minimo)}${n(s.gasto_minimo_rs) ? ` (${brl(s.gasto_minimo_rs)}${n(s.gasto_minimo_faturas) > 1 ? ' em ' + s.gasto_minimo_faturas + ' faturas' : n(s.gasto_minimo_faturas) === 1 ? ' na fatura' : ''})` : ''}</div>` : ''}
      ${s.aeroportos ? `<div style="font-size:13px;color:var(--tinta-3);margin-top:2px">Aeroportos: ${esc(s.aeroportos)}</div>` : ''}
      ${s.como_acessar || s.condicao_extra ? `<div style="font-size:13px;color:var(--tinta-3);margin-top:2px">${esc([s.como_acessar, s.condicao_extra].filter(Boolean).join(' · '))}</div>` : ''}
      ${s.mudou_em_2026 ? `<div style="font-size:13px;color:var(--alerta);margin-top:2px">Mudou em 2026: ${esc(s.mudou_em_2026)}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:13px">${conferido(s.conferido_em)}<span><button class="mini" data-se="${s.id}">editar</button>${s.a_confirmar ? `<button class="mini" data-sc="${s.id}">conferida</button>` : ''}</span></div></div>`;
  corpo.innerHTML = `${modoSalas()}<div class="sub">Uma linha por cartão e por rede ou sala. No painel do cliente só aparecem as já conferidas.</div>
    <div class="chips" style="margin-top:8px">${filtros.map(([k, l]) => `<button data-sf="${k}" class="${SV.filtro === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="duas-col"><label class="fl"><span>Rede ou sala</span><input id="svRede" value="${esc(SV.rede)}" placeholder="LoungeKey, Priority..."></label><label class="fl"><span>Aeroporto</span><input id="svAero" value="${esc(SV.aero)}" placeholder="Ex.: GRU"></label></div>
    <label class="fl"><span>Gasto mínimo para liberar</span><select id="svGasto">${[['todos', 'Todos'], ['sem', 'Sem gasto mínimo'], ['com', 'Com gasto mínimo']].map(([k, l]) => `<option value="${k}"${SV.gasto === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    ${SV.aero ? '<div class="sub" style="font-size:13px">Aqui o aeroporto só aparece quando a regra do cartão cita o aeroporto. Para ver tudo o que existe num aeroporto, use "Por aeroporto".</div>' : ''}
    ${grupos.length ? grupos.map(g => `<section class="bloco"><h2 style="margin-bottom:4px">${esc(g.k)}</h2>${g.L.map(linha).join('')}</section>`).join('') : '<div class="vazio">Nenhuma sala com esses filtros.</div>'}
    <div class="sub" style="margin-top:8px;font-size:13px">${num(L.length)} de ${num(SALAS.length)} linhas.</div>${avisoVelhos(L, X)}`;
  ligarModo(corpo, P, X);
  corpo.querySelectorAll('[data-sf]').forEach(b => b.onclick = () => { SV.filtro = b.dataset.sf; telaBase(P, X); });
  const texto = (id, k) => { $(id).oninput = (e) => { SV[k] = e.target.value; const pos = e.target.selectionStart; telaBase(P, X); const el = $(id); el.focus(); el.setSelectionRange(pos, pos); }; };
  texto('svRede', 'rede'); texto('svAero', 'aero');
  $('svGasto').onchange = (e) => { SV.gasto = e.target.value; telaBase(P, X); };
  corpo.querySelectorAll('[data-se]').forEach(b => b.onclick = () => { LIN_ED = { tabela: 'cartoes_salas_vip', id: b.dataset.se }; telaBase(P, X); scrollTo(0, 0); });
  corpo.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => marcarConferido(X, P, 'cartoes_salas_vip', SALAS, b.dataset.sc));
}

/* ---------- Salas, restaurantes e experiências de cada aeroporto ---------- */
const TIPO_AERO = { independente: 'sala independente', companhia: 'sala da companhia', banco: 'sala do banco', bandeira: 'sala da bandeira', aeroporto: 'sala do aeroporto', restaurante: 'restaurante', outro: 'experiência' };
const AREA_TXT = { domestico: 'embarque doméstico', internacional: 'embarque internacional', schengen: 'área Schengen', nao_schengen: 'fora do Schengen', ambos: 'doméstico e internacional' };
const REDES = [['priority_pass', 'Priority Pass', /priority/i], ['loungekey', 'LoungeKey', /loungekey|airport experiences/i], ['dragonpass', 'DragonPass', /dragon|airport companion/i]];
const ehSala = (a) => !['restaurante', 'outro'].includes(a.tipo);
// cartões da base que entram em cada rede, pela aba de salas de cada cartão (fica o acesso mais amplo)
function cartoesPorRede() {
  const m = Object.fromEntries(REDES.map(([k]) => [k, new Map()]));
  (SALAS || []).forEach(s => REDES.forEach(([k, , re]) => {
    if (!re.test(s.rede_ou_sala || '')) return;
    const c = s.catalogo_id && (BASE || []).find(b => b.id === s.catalogo_id), nome = c ? nomeBase(c) : `${s.banco} ${s.nome_cartao}`;
    const antes = m[k].get(nome), a = n(s.acessos_titular_ano);
    if (!antes || a === -1 || (n(antes.acessos_titular_ano) !== -1 && a > n(antes.acessos_titular_ano))) m[k].set(nome, s);
  }));
  return m;
}
function abaAeroportos(corpo, P, X) {
  const { $, esc, num } = X;
  if (AERO === null || SALAS === null) {
    corpo.innerHTML = modoSalas() + '<div class="vazio">Carregando...</div>'; ligarModo(corpo, P, X);
    const ler = (t, o) => { let q = X.sb.from(t).select('*'); o.forEach(c => { q = q.order(c); }); return q; };
    Promise.all([AERO === null ? ler('salas_aeroportos', ['aeroporto_iata', 'terminal', 'sala']) : null, SALAS === null ? ler('cartoes_salas_vip', ['banco', 'nome_cartao']) : null]).then(([a, s]) => {
      if (a) AERO = a.error ? false : (a.data || []);
      if (s) SALAS = s.error ? false : (s.data || []);
      if (X.aba() === 'cartoesbase' && !ED && !IMP && !LIN_ED) telaBase(P, X);
    });
    return;
  }
  if (AERO === false) { corpo.innerHTML = modoSalas() + X.tec('<div class="config" style="margin-top:12px">Rode no Supabase o 63-salas-por-aeroporto.sql para ativar as salas por aeroporto.</div>'); ligarModo(corpo, P, X); return; }
  if (!AERO.length) { corpo.innerHTML = modoSalas() + vazioImportar(X); ligarModo(corpo, P, X); return; }
  const q = semAc(SA.busca.trim());
  const porIata = new Map(); AERO.forEach(a => { if (!porIata.has(a.aeroporto_iata)) porIata.set(a.aeroporto_iata, { a, L: [] }); porIata.get(a.aeroporto_iata).L.push(a); });
  const casa = ({ a }) => semAc(a.aeroporto_iata) === q || (q.length >= 3 && semAc([a.aeroporto_nome, a.cidade, a.pais].join(' ')).includes(q));
  const achados = q ? [...porIata.values()].filter(casa) : [];
  const redeOk = (a) => SA.rede === 'todas' || a[SA.rede] === true || a[SA.rede] === null;
  const tipoOk = (a) => SA.tipo === 'todos' || (SA.tipo === 'salas' ? ehSala(a) : !ehSala(a));
  const CR = cartoesPorRede();
  const acessoCurto = (s) => { const v = n(s.acessos_titular_ano); return v === -1 ? 'ilimitado' : v > 0 ? `${v}/ano` : 'acesso pago ou não informado'; };
  const selos = (a) => REDES.map(([k, rot]) => a[k] === true ? `<span class="tag ok">${rot}</span>` : a[k] === null || a[k] === undefined ? `<span class="tag" style="opacity:.7">${rot}?</span>` : '').join(' ');
  const item = (a) => `<div style="border-top:1px solid var(--linha);padding:10px 0">
      <div><b style="font-weight:600">${esc(a.sala)}</b> <span class="tag">${esc(TIPO_AERO[a.tipo] || a.tipo || 'sala')}</span>${a.a_confirmar ? ' <span class="tag alerta">a confirmar</span>' : ''}</div>
      ${a.sala === 'sem sala VIP' ? '' : `<div style="margin-top:6px">${selos(a)}</div>`}
      ${a.outras_formas_acesso ? `<div style="font-size:13px;color:var(--tinta-2);margin-top:4px">${esc(a.outras_formas_acesso)}</div>` : ''}
      <div style="font-size:13px;color:var(--tinta-3);margin-top:2px">${esc([AREA_TXT[a.area] || '', a.localizacao, a.horario].filter(Boolean).join(' · '))}</div>
      ${a.observacao ? `<div style="font-size:13px;color:var(--tinta-3);margin-top:2px">${esc(a.observacao)}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:13px;gap:8px">${conferido(a.conferido_em)}<span>${a.fonte && /^https?:\/\//.test(a.fonte) ? `<a class="mini" href="${esc(a.fonte)}" target="_blank" rel="noopener">fonte</a>` : ''}<button class="mini" data-ae-ed="${a.id}">editar</button>${a.a_confirmar ? `<button class="mini" data-ae-ok="${a.id}">conferida</button>` : ''}</span></div></div>`;
  const quemEntra = (L) => REDES.filter(([k]) => L.some(a => a[k] === true || a[k] === null)).map(([k, rot]) => { const C = [...CR[k].entries()].sort((x, y) => x[0].localeCompare(y[0]));
    return `<details style="border-top:1px solid var(--linha);padding:8px 0"><summary style="cursor:pointer;font-size:14px"><b style="font-weight:600">${rot}</b>: ${C.length ? num(C.length) + (C.length === 1 ? ' cartão da base' : ' cartões da base') : 'nenhum cartão da base'}</summary>
      <div style="font-size:13px;color:var(--tinta-2);margin-top:6px">${C.map(([nm, s]) => `${esc(nm)} (${acessoCurto(s)})`).join('<br>') || 'Nenhum.'}</div></details>`; }).join('');
  const bloco = ({ a, L }) => {
    const F = L.filter(x => redeOk(x) && tipoOk(x)), ters = [...new Set(F.map(x => x.terminal || 'Terminal não informado'))];
    return `<section class="bloco"><h2 style="margin-bottom:2px">${esc(a.aeroporto_iata)} · ${esc(a.cidade || a.aeroporto_nome || '')}</h2><div class="sub" style="margin-top:0;font-size:13px">${esc([a.aeroporto_nome, a.pais].filter(Boolean).join(', '))} · ${num(L.filter(ehSala).length)} salas e ${num(L.filter(x => !ehSala(x)).length)} restaurantes ou experiências</div>
      ${quemEntra(L) ? `<div style="margin-top:10px"><div style="font-size:13px;color:var(--tinta-3)">Quem entra pelas redes (cartões da base de cartões):</div>${quemEntra(L)}</div>` : ''}
      ${ters.length ? ters.map(t => `<div class="secao" style="margin:16px 0 0">${esc(t)}</div>${F.filter(x => (x.terminal || 'Terminal não informado') === t).sort((x, y) => Number(!ehSala(x)) - Number(!ehSala(y)) || String(x.sala).localeCompare(String(y.sala))).map(item).join('')}`).join('') : '<div class="vazio">Nada com esses filtros.</div>'}</section>`;
  };
  const paises = [...new Set([...porIata.values()].map(x => x.a.pais || 'Outros'))].sort((x, y) => (x === 'Brasil' ? -1 : y === 'Brasil' ? 1 : x.localeCompare(y)));
  corpo.innerHTML = `${modoSalas()}<div class="sub">Digite o aeroporto e veja as salas, os restaurantes e o que aceita cada programa. A regra de cada cartão (acessos, acompanhantes, gasto mínimo) fica em "Por cartão".</div>
    <label class="fl"><span>Aeroporto</span><input id="saBusca" value="${esc(SA.busca)}" placeholder="Código ou cidade: GRU, Miami, Lisboa" autocomplete="off"></label>
    ${q ? `<div class="chips" style="margin-top:8px">${[['todos', 'Tudo'], ['salas', 'Salas'], ['rest', 'Restaurantes e experiências']].map(([k, l]) => `<button data-sat="${k}" class="${SA.tipo === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="chips">${[['todas', 'Qualquer programa'], ...REDES.map(([k, l]) => [k, l])].map(([k, l]) => `<button data-sar="${k}" class="${SA.rede === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${achados.length ? achados.map(bloco).join('') : '<div class="vazio">Nenhum aeroporto com esse nome na base.</div>'}
      <div class="sub" style="margin-top:8px;font-size:13px">"Priority Pass?" quer dizer que a fonte não confirma: vale olhar o app da rede antes de indicar ao cliente.</div>`
    : paises.map(pa => `<div class="secao" style="margin:16px 0 6px">${esc(pa)}</div><div class="chips" style="flex-wrap:wrap">${[...porIata.values()].filter(x => (x.a.pais || 'Outros') === pa).map(({ a, L }) => `<button data-sae="${esc(a.aeroporto_iata)}">${esc(a.aeroporto_iata)} · ${esc(a.cidade || '')} (${L.length})</button>`).join('')}</div>`).join('')}
    ${avisoVelhos(q ? achados.flatMap(x => x.L) : AERO, X)}`;
  ligarModo(corpo, P, X);
  $('saBusca').oninput = (e) => { SA.busca = e.target.value; const pos = e.target.selectionStart; telaBase(P, X); const el = $('saBusca'); el.focus(); el.setSelectionRange(pos, pos); };
  corpo.querySelectorAll('[data-sae]').forEach(b => b.onclick = () => { SA.busca = b.dataset.sae; telaBase(P, X); });
  corpo.querySelectorAll('[data-sat]').forEach(b => b.onclick = () => { SA.tipo = b.dataset.sat; telaBase(P, X); });
  corpo.querySelectorAll('[data-sar]').forEach(b => b.onclick = () => { SA.rede = b.dataset.sar; telaBase(P, X); });
  corpo.querySelectorAll('[data-ae-ed]').forEach(b => b.onclick = () => { LIN_ED = { tabela: 'salas_aeroportos', id: b.dataset.aeEd }; telaBase(P, X); scrollTo(0, 0); });
  corpo.querySelectorAll('[data-ae-ok]').forEach(b => b.onclick = () => marcarConferido(X, P, 'salas_aeroportos', AERO, b.dataset.aeOk));
}

/* ---------- Bancos: segmentos em ordem, da entrada ao topo ---------- */
function abaBancos(corpo, P, X) {
  const { $, esc, num, brl } = X;
  if (SEGS === null) { corpo.innerHTML = '<div class="vazio">Carregando...</div>'; carregar(X, P, 'bancos_segmentos', ['banco', 'posicao_regua'], d => { SEGS = d; }); return; }
  if (SEGS === false) { corpo.innerHTML = X.tec('<div class="config" style="margin-top:12px">Rode no Supabase o 62-ia-cartoes-bases.sql para ativar a base de bancos.</div>'); return; }
  if (!SEGS.length) { corpo.innerHTML = vazioImportar(X); return; }
  const L = SEGS.filter(s => !BUSCA_BANCO || (s.banco + ' ' + s.segmento).toLowerCase().includes(BUSCA_BANCO.toLowerCase()));
  const bancos = [...new Set(L.map(s => s.banco))];
  const valor = (v, t) => n(v) ? brl(v) : t || 'não informado';
  const item = (rot, v) => v ? `<div style="font-size:13px;margin-top:6px"><span style="color:var(--tinta-3)">${rot}:</span> ${esc(v)}</div>` : '';
  const seg = (s) => `<details style="border-top:1px solid var(--linha);padding:10px 0"><summary style="cursor:pointer"><b style="font-weight:600">${s.posicao_regua ? s.posicao_regua + '. ' : ''}${esc(s.segmento)}</b>${s.somente_convite ? ' <span class="tag ouro">convite</span>' : ''}${s.a_confirmar ? ' <span class="tag alerta">a confirmar</span>' : ''}
      <small style="display:block;color:var(--tinta-3);font-size:13px">renda mínima: ${esc(valor(s.renda_minima, s.renda_minima_txt))} · investimento mínimo: ${esc(valor(s.investimento_minimo, s.investimento_minimo_txt))}</small></summary>
      ${item('Outra exigência', s.outra_exigencia)}${item('Cartões liberados', s.cartoes_liberados)}${(s.cartoes_ids || []).length ? `<div style="font-size:13px;color:var(--tinta-3)">${s.cartoes_ids.length} ligados à base de cartões</div>` : ''}
      ${item('Isenção pelo relacionamento', s.isencao_relacionamento)}${item('Bônus de pontos', s.bonus_pontos)}${item('Sala VIP do segmento', s.beneficio_sala_vip)}${item('Como subir', s.como_subir)}${item('Observações', s.observacoes)}${item('Fonte', s.fonte)}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:13px">${conferido(s.conferido_em)}<span><button class="mini" data-be="${s.id}">editar</button>${s.a_confirmar ? `<button class="mini" data-bc="${s.id}">conferido</button>` : ''}</span></div></details>`;
  corpo.innerHTML = `<div class="sub">Segmentos de cada banco, do de entrada ao topo: o que pedem, que cartões liberam e como subir.</div>
    <label class="fl"><span>Buscar</span><input id="bbBusca" value="${esc(BUSCA_BANCO)}" placeholder="Banco ou segmento"></label>
    ${bancos.length ? bancos.map(bn => `<section class="bloco"><h2 style="margin-bottom:4px">${esc(bn)}</h2>${L.filter(s => s.banco === bn).sort((a, b) => (a.posicao_regua || 99) - (b.posicao_regua || 99)).map(seg).join('')}</section>`).join('') : '<div class="vazio">Nenhum segmento com essa busca.</div>'}
    <div class="sub" style="margin-top:8px;font-size:13px">${num(L.length)} segmentos de ${num(bancos.length)} bancos.</div>${avisoVelhos(L, X)}`;
  $('bbBusca').oninput = (e) => { BUSCA_BANCO = e.target.value; const pos = e.target.selectionStart; telaBase(P, X); const el = $('bbBusca'); el.focus(); el.setSelectionRange(pos, pos); };
  corpo.querySelectorAll('[data-be]').forEach(b => b.onclick = () => { LIN_ED = { tabela: 'bancos_segmentos', id: b.dataset.be }; telaBase(P, X); scrollTo(0, 0); });
  corpo.querySelectorAll('[data-bc]').forEach(b => b.onclick = () => marcarConferido(X, P, 'bancos_segmentos', SEGS, b.dataset.bc));
}
async function marcarConferido(X, P, tabela, lista, id) {
  const up = { a_confirmar: false, conferido_em: hojeISO(), atualizado_em: new Date().toISOString() };
  const { error } = await X.sb.from(tabela).update(up).eq('id', id);
  if (error) { X.aviso('Não salvou: ' + error.message); return; }
  Object.assign(lista.find(x => x.id === id) || {}, up); X.aviso('Marcado como conferido hoje.'); telaBase(P, X);
}

// edição de uma sala VIP ou de um segmento de banco
const CAMPOS_LIN = {
  salas_aeroportos: [['sala', 'Nome da sala, do restaurante ou da experiência', 'text'], ['aeroporto_iata', 'Aeroporto (código de 3 letras)', 'text'], ['terminal', 'Terminal', 'text'],
    ['tipo', 'Tipo', 'select', [['', ''], ...Object.entries(TIPO_AERO)]], ['area', 'Área', 'select', [['', ''], ...Object.entries(AREA_TXT), ['outro', 'outra']]],
    ['priority_pass', 'Aceita Priority Pass', 'tri'], ['loungekey', 'Aceita LoungeKey (Mastercard)', 'tri'], ['dragonpass', 'Aceita DragonPass (Visa Airport Companion)', 'tri'],
    ['outras_formas_acesso', 'Outras formas de entrar ou benefício', 'area'], ['localizacao', 'Localização', 'text'], ['horario', 'Horário', 'text'], ['observacao', 'Observação', 'area'],
    ['fonte', 'Fonte', 'text'], ['conferido_em', 'Conferido em', 'date'], ['a_confirmar', 'Falta conferir na fonte oficial', 'bool']],
  cartoes_salas_vip: [['rede_ou_sala', 'Rede ou sala', 'text'], ['tipo', 'Tipo', 'select', [['', ''], ...Object.entries(TIPO_SALA)]], ['acessos_titular_ano', 'Acessos do titular por ano (-1 = ilimitado)', 'int'],
    ['acompanhantes', 'Acompanhantes', 'text'], ['adicionais', 'Adicionais', 'text'], ['gasto_minimo', 'Gasto mínimo, como o banco descreve', 'text'], ['gasto_minimo_rs', 'Gasto mínimo para liberar (R$)', 'num'],
    ['gasto_minimo_faturas', 'Em quantas faturas (1 = no mês, 3 = últimas 3)', 'int'], ['aeroportos', 'Aeroportos', 'text'], ['como_acessar', 'Como acessar', 'text'], ['condicao_extra', 'Condição extra', 'text'],
    ['mudou_em_2026', 'O que mudou em 2026', 'text'], ['fonte', 'Fonte', 'text'], ['conferido_em', 'Conferido em', 'date'], ['a_confirmar', 'Falta conferir no site do banco', 'bool']],
  bancos_segmentos: [['segmento', 'Segmento', 'text'], ['posicao_regua', 'Posição na régua (1 = entrada)', 'int'], ['renda_minima', 'Renda mínima (R$/mês)', 'num'], ['renda_minima_txt', 'Renda, como o banco descreve', 'text'],
    ['investimento_minimo', 'Investimento mínimo (R$)', 'num'], ['investimento_minimo_txt', 'Investimento, como o banco descreve', 'text'], ['outra_exigencia', 'Outra exigência', 'area'], ['somente_convite', 'Somente por convite', 'bool'],
    ['cartoes_liberados', 'Cartões liberados', 'area'], ['isencao_relacionamento', 'Isenção ou desconto pelo relacionamento', 'area'], ['bonus_pontos', 'Bônus de pontos', 'area'], ['beneficio_sala_vip', 'Sala VIP do segmento', 'area'],
    ['como_subir', 'Como subir', 'area'], ['observacoes', 'Observações', 'area'], ['fonte', 'Fonte', 'text'], ['conferido_em', 'Conferido em', 'date'], ['a_confirmar', 'Falta conferir no site do banco', 'bool']],
};
function formLinha(P, X) {
  const { sb, $, esc, aviso, campo } = X;
  const lista = { cartoes_salas_vip: SALAS, bancos_segmentos: SEGS, salas_aeroportos: AERO }[LIN_ED.tabela], x = (lista || []).find(y => y.id === LIN_ED.id);
  const voltar = () => { LIN_ED = null; telaBase(P, X); };
  if (!x) return voltar();
  const C = CAMPOS_LIN[LIN_ED.tabela];
  const titulo = LIN_ED.tabela === 'cartoes_salas_vip' ? `${esc(x.banco)} · ${esc(x.nome_cartao)}` : LIN_ED.tabela === 'salas_aeroportos' ? `${esc(x.aeroporto_iata)} · ${esc(x.sala)}` : `${esc(x.banco)}`;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Base de cartões</button><h1 class="titulo" style="margin-top:6px">${titulo}</h1>
    <form class="bloco form" id="fLin">${C.map(([k, rot, tipo, ops]) => tipo === 'bool' ? `<label class="fc"><input type="checkbox" name="${k}" ${x[k] ? 'checked' : ''}><span>${rot}</span></label>`
      : tipo === 'select' ? `<label class="fl"><span>${rot}</span><select name="${k}">${ops.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(x[k] ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`
      : tipo === 'tri' ? `<label class="fl"><span>${rot}</span><select name="${k}">${[['', 'a confirmar'], ['true', 'sim'], ['false', 'não']].map(([v, l]) => `<option value="${v}"${String(x[k] ?? '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`
      : tipo === 'area' ? `<label class="fl"><span>${rot}</span><textarea name="${k}" rows="3">${esc(x[k] ?? '')}</textarea></label>`
      : campo(k, rot, x[k], tipo === 'int' || tipo === 'num' ? 'number' : tipo === 'date' ? 'date' : 'text')).join('')}
      <button class="zap" type="submit" style="width:100%;margin-top:12px">Salvar</button></form>`;
  $('voltar').onclick = voltar;
  $('fLin').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, up = { atualizado_em: new Date().toISOString() };
    for (const [k, , tipo] of C) {
      if (tipo === 'bool') { up[k] = f.elements[k].checked; continue; }
      if (tipo === 'tri') { const v = f.elements[k].value; up[k] = v === '' ? null : v === 'true'; continue; }
      const v = f.elements[k].value.trim();
      if (tipo === 'int' || tipo === 'num') { const num = v === '' ? null : Number(v.replace(',', '.')); if (num !== null && !isFinite(num)) { aviso('Confira os números.'); return; } up[k] = num === null ? null : tipo === 'int' ? Math.round(num) : num; }
      else up[k] = v || null;
    }
    if (!up[C[0][0]]) { aviso('Preencha ' + C[0][1].toLowerCase() + '.'); return; }
    if (up.aeroporto_iata !== undefined) { up.aeroporto_iata = String(up.aeroporto_iata || '').toUpperCase(); if (!/^[A-Z]{3}$/.test(up.aeroporto_iata)) { aviso('O aeroporto é o código de 3 letras, ex.: GRU.'); return; } }
    const { error } = await sb.from(LIN_ED.tabela).update(up).eq('id', x.id);
    if (error) { aviso('Não salvou: ' + X.limparTec(error.message)); return; }
    Object.assign(x, up); aviso('Salvo.'); voltar();
  };
}

/* ---------- Correções a revisar (planilha e, depois, o vigia do mercado) ---------- */
// campos que entram sozinhos no cartão quando o valor atual é só um número (ou um link)
const AUTO = { anuidade_ano_rs: ['anuidade_anual'], pts_nacional: ['pts_nacional', 'pontos_por'], pts_internacional: ['pts_internacional'], vip_acessos_ano: ['salas_vip_ano'], fonte: ['fonte'] };
const CAMPO_TXT = { sala_vip_texto: 'Sala VIP', isencao: 'Isenção', vip_convidados_ano: 'Acompanhantes na sala VIP', anuidade_ano_rs: 'Anuidade (R$/ano)', pts_nacional: 'Pontos no Brasil',
  pts_internacional: 'Pontos no exterior', vip_acessos_ano: 'Acessos de sala VIP por ano', vip_rede_global: 'Rede de sala VIP', fonte: 'Fonte', vip_salas_ilimitadas: 'Salas ilimitadas', gasto_minimo_vip: 'Gasto mínimo para a sala VIP' };
function valorAuto(c) {
  if (!AUTO[c.campo]) return undefined;
  const v = String(c.valor_atual || '').trim();
  if (c.campo === 'fonte') return /^https?:\/\/\S+$/.test(v) ? v : undefined;
  return /^-?\d+([.,]\d+)?$/.test(v) ? Number(v.replace(',', '.')) : undefined;
}
async function decidirCorrecao(X, c, status) {
  const up = { status, decidido_por: status === 'pendente' ? null : X.D.meuId, decidido_em: status === 'pendente' ? null : new Date().toISOString() };
  const { error } = await X.sb.from('cartoes_correcoes').update(up).eq('id', c.id);
  if (error) { X.aviso('Não salvou: ' + error.message); return false; }
  if (c.status === 'pendente' && status !== 'pendente') NPEND = Math.max(0, (NPEND || 0) - 1);
  if (c.status !== 'pendente' && status === 'pendente') NPEND = (NPEND || 0) + 1;
  Object.assign(c, up); return true;
}
function abaCorrecoes(corpo, P, X) {
  const { sb, esc, aviso, num } = X;
  if (CORR === null) { corpo.innerHTML = '<div class="vazio">Carregando...</div>'; carregar(X, P, 'cartoes_correcoes', ['banco', 'nome_cartao'], d => { CORR = d; }); return; }
  if (CORR === false) { corpo.innerHTML = X.tec('<div class="config" style="margin-top:12px">Rode no Supabase o 62-ia-cartoes-bases.sql para ativar as correções.</div>'); return; }
  if (!CORR.length) { corpo.innerHTML = vazioImportar(X); return; }
  const L = CORR.filter(c => c.status === CORR_ST);
  const st = [['pendente', 'Pendentes'], ['aceita', 'Aceitas'], ['recusada', 'Recusadas']];
  const cat = (c) => c.catalogo_id && BASE.find(b => b.id === c.catalogo_id);
  corpo.innerHTML = `<div class="sub">Diferenças achadas entre a base e o site do banco. Nada muda no cartão sem um toque da equipe.</div>
    <div class="chips" style="margin-top:8px">${st.map(([k, l]) => `<button data-cs="${k}" class="${CORR_ST === k ? 'on' : ''}">${l} (${CORR.filter(c => c.status === k).length})</button>`).join('')}</div>
    ${L.length ? L.map(c => `<section class="bloco" style="padding:12px 14px">
      <div><b style="font-weight:600">${esc(c.banco)} · ${esc(c.nome_cartao)}</b> <span class="tag">${esc(CAMPO_TXT[c.campo] || c.campo)}</span>${c.origem === 'vigia' ? ' <span class="tag ouro">vigia</span>' : ''}</div>
      <div style="font-size:13px;margin-top:6px"><span style="color:var(--tinta-3)">Na base:</span> ${esc(c.valor_na_base || 'vazio')}</div>
      <div style="font-size:14px;margin-top:2px"><span style="color:var(--tinta-3);font-size:13px">Atual:</span> <b style="font-weight:600">${esc(c.valor_atual || '')}</b></div>
      ${c.observacao ? `<div style="font-size:13px;color:var(--tinta-2);margin-top:4px">${esc(c.observacao)}</div>` : ''}
      ${c.fonte ? `<div style="font-size:13px;margin-top:4px;overflow-wrap:anywhere">${/^https?:\/\//.test(c.fonte) ? `<a href="${esc(c.fonte)}" target="_blank" rel="noopener">fonte</a>` : esc(c.fonte)}</div>` : ''}
      ${!cat(c) ? '<div style="font-size:13px;color:var(--alerta);margin-top:4px">Este cartão ainda não está na base.</div>' : ''}
      <div style="display:flex;gap:8px;margin-top:10px">${c.status === 'pendente' ? `<button class="zap" data-ca="${c.id}" style="flex:1">${valorAuto(c) !== undefined && cat(c) ? 'Aceitar e aplicar' : cat(c) ? 'Aceitar e ajustar' : 'Aceitar'}</button><button class="sec" data-cr="${c.id}" style="flex:1">Recusar</button>`
        : `<button class="sec" data-cp="${c.id}" style="flex:1">Voltar para pendentes</button>`}</div></section>`).join('') : `<div class="vazio">Nenhuma correção ${CORR_ST === 'pendente' ? 'pendente' : CORR_ST === 'aceita' ? 'aceita' : 'recusada'}.</div>`}
    <div class="sub" style="margin-top:8px;font-size:13px">${num(L.length)} nesta lista.</div>`;
  corpo.querySelectorAll('[data-cs]').forEach(b => b.onclick = () => { CORR_ST = b.dataset.cs; telaBase(P, X); });
  const achar = (id) => CORR.find(c => c.id === id);
  corpo.querySelectorAll('[data-cr]').forEach(b => b.onclick = async () => { if (await decidirCorrecao(X, achar(b.dataset.cr), 'recusada')) { aviso('Correção recusada.'); telaBase(P, X); } });
  corpo.querySelectorAll('[data-cp]').forEach(b => b.onclick = async () => { if (await decidirCorrecao(X, achar(b.dataset.cp), 'pendente')) telaBase(P, X); });
  corpo.querySelectorAll('[data-ca]').forEach(b => b.onclick = async () => {
    const c = achar(b.dataset.ca), k = cat(c), v = valorAuto(c);
    if (k && v !== undefined) {
      const up = { atualizado_em: new Date().toISOString() };
      if (c.campo === 'vip_acessos_ano') Object.assign(up, v === -1 ? { salas_vip_ilimitado: true, salas_vip_ano: null } : { salas_vip_ano: Math.round(v) });
      else AUTO[c.campo].forEach(col => { up[col] = v; });
      const r = await sb.from('cartoes_catalogo').update(up).eq('id', k.id).select().single();
      if (r.error) { aviso('Não salvou no cartão: ' + r.error.message); return; }
      Object.assign(k, r.data);
      if (X.CART) atualizarPaineis(sb, X.CART, X.D, r.data).catch(() => {});
      if (await decidirCorrecao(X, c, 'aceita')) { aviso('Correção aplicada no cartão.'); telaBase(P, X); }
      return;
    }
    // valor em texto: abre o cartão para a equipe ajustar; ao salvar, a correção fica aceita
    if (k) { CORR_ED = c; ED = k.id; ABA_B = 'cartoes'; telaBase(P, X); scrollTo(0, 0); return; }
    if (await decidirCorrecao(X, c, 'aceita')) { aviso('Marcada como aceita. O cartão ainda não está na base.'); telaBase(P, X); }
  });
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
      <div class="sub">Entra na Base de cartões e passa a valer para todos os clientes. Sala VIP e redução parcial você completa em Gestão > Base de cartões.</div>
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
