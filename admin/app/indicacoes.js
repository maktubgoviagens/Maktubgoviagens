// Maktub Go: origem dos clientes e indicações.
// A origem é da pessoa e fica congelada na primeira marcação (colunas origem_* da ficha, 75-origem-e-indicacoes.sql
// e 75b-complemento-origem.sql). Cada venda tem um único dono de origem: a origem de quem comprou.
// Lucro sempre líquido para a Maktub (lucro_liquido da venda, que já desconta custo, imposto, comissão e repasse).
// Direto: vendas de quem a pessoa indicou. Rede: vendas dos níveis seguintes, só informativa, nunca soma.
// Comissão só no Direto. A comissão indireta não existe no sistema e aparece sempre como zero.

export const ROTULO = {
  internet: 'Internet', indicacao_cliente: 'Indicação de cliente', indicacao_parceiro: 'Indicação de parceiro',
  rede_socios: 'Rede dos sócios', prospeccao_ativa: 'Prospecção ativa', registro_teste: 'Registro de teste'
};
const DETALHES = {
  rede_socios: [['isadora', 'Isadora'], ['matheus', 'Matheus']],
  internet: [['site', 'Site'], ['instagram', 'Instagram'], ['google', 'Google'], ['trafego_pago', 'Tráfego pago']],
  prospeccao_ativa: [['abordagem_equipe', 'Abordagem da equipe'], ['email_frio', 'E-mail frio']]
};
const ROT_DET = Object.fromEntries(Object.values(DETALHES).flat());
// ordem do gráfico e da conferência
const LINHAS = ['internet', 'indicacao_cliente', 'indicacao_parceiro', 'rede_socios', 'prospeccao_ativa', 'registro_teste', 'sem_origem', 'sem_ficha'];
const ROT_LINHA = { ...ROTULO, sem_origem: 'Sem origem marcada', sem_ficha: 'Sem ficha do comprador' };

const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const r2 = (x) => Math.round(x * 100) / 100;
const verValor = (X) => X.ADMIN || (X.pode && X.pode('financeiro'));
export const rotuloOrigem = (p) => p && p.origem_canal ? ROTULO[p.origem_canal] + (p.origem_detalhe && ROT_DET[p.origem_detalhe] ? ' · ' + ROT_DET[p.origem_detalhe] : '') : '';

// pistas no nome da ficha: "amigo de", "esposa de", parênteses, Mentoria, Camões, Natural do mundo
const PISTA = /\b(amig[oa]s?|espos[oa]|marido|mulher|namorad[oa]|filh[oa]|m[ãa]e|pai|irm[ãa]o?|prim[oa]|sobrinh[oa]|cunhad[oa]|sogr[oa])\b[^,()/]*|\([^)]*\)|\bmentoria\b[^,()/]*|\bcam[õo]es\b|\bnatural do mundo\b/gi;
export function pistas(nome) { return (String(nome || '').match(PISTA) || []).map(s => s.replace(/^\(|\)$/g, '').trim()).filter(Boolean); }
export function nomeComPistas(nome, esc) {
  let out = '', i = 0; const s = String(nome || ''); PISTA.lastIndex = 0; let m;
  while ((m = PISTA.exec(s))) { out += esc(s.slice(i, m.index)) + '<mark class="ind-pista">' + esc(m[0]) + '</mark>'; i = m.index + m[0].length; }
  return out + esc(s.slice(i));
}

// ---------- dados ----------
let CACHE = null; // { vendas, contratos, parceiros, atend, em }
export function limparCache() { CACHE = null; }
export const carregarDados = (X) => carregar(X);
async function carregar(X) {
  if (CACHE && Date.now() - CACHE.em < 60000) return CACHE;
  const [v, k, pa, at] = await Promise.all([
    X.sb.from('emissoes').select('id,pessoa_id,data_negociacao,valor_receber,lucro_liquido,repasse,parceiro_id,parceiro_app,parceiro_pct,parceiro_pct_app').order('data_negociacao').limit(20000),
    X.sb.from('contratos').select('id,pessoa_id,cliente_id,status,assinado_em,cortesia:dados->cortesia').limit(5000),
    X.sb.from('parceiros').select('*').limit(5000),
    X.sb.from('atendimentos').select('pessoa_id,origem,data').not('pessoa_id', 'is', null).order('data').limit(20000)
  ]);
  CACHE = {
    vendas: v.error ? (X.D.emissoes || []).filter(e => !e.outra) : (v.data || []),
    contratos: k.error ? [] : (k.data || []),
    parceiros: pa.error || !(pa.data || []).length ? (X.D.parceirosAdm && X.D.parceirosAdm.length ? X.D.parceirosAdm : (X.D.parc || [])) : pa.data,
    atend: at.error ? (X.D.reunioes || []).filter(r => r.pessoa_id) : (at.data || []),
    erroVendas: v.error ? v.error.message : null, em: Date.now()
  };
  return CACHE;
}
const parceiroDe = (C, id) => (C.parceiros || []).find(x => x.id === id) || null;
const efetivo = (e) => e.parceiro_app || e.parceiro_id || null;
// percentual de quem indicou na entrada do indicado: o da primeira venda dele com esse parceiro; sem venda, o atual do cadastro
function pctEntrada(C, indicado, indicador) {
  const ref = indicador && indicador.parceiro_ref; if (!ref) return { pct: 0, evento: false, conhecido: true };
  const pa = parceiroDe(C, ref);
  const ev = !!(pa && pa.evento);
  const e = indicado ? (C.vendas || []).filter(x => x.pessoa_id === indicado.id && efetivo(x) === ref).sort((a, b) => String(a.data_negociacao).localeCompare(String(b.data_negociacao)))[0] : null;
  if (e) { const p = e.parceiro_pct_app != null ? +e.parceiro_pct_app : +e.parceiro_pct; if (!isNaN(p)) return { pct: p, evento: ev, conhecido: true }; }
  if (pa && pa.pct != null) return { pct: +pa.pct, evento: ev, conhecido: true };
  return { pct: 0, evento: ev, conhecido: false };
}
function canalIndicacao(C, indicado, indicador) {
  const r = pctEntrada(C, indicado, indicador);
  return { canal: r.pct > 0 || r.evento ? 'indicacao_parceiro' : 'indicacao_cliente', ...r };
}
const motivoCanal = (r, indicador) => r.evento ? `${indicador.nome} é um evento cadastrado como parceiro` : r.pct > 0 ? `${indicador.nome} tinha ${String(r.pct).replace('.', ',')}% de comissão` : `${indicador.nome} não tem comissão`;

// sugestão para fichas antigas (mesma lógica do 0b-sugestao-de-origens.sql)
export function sugestao(X, C, p) {
  const D = X.D;
  const prim = (C.atend || []).filter(a => a.pessoa_id === p.id).sort((a, b) => String(a.data).localeCompare(String(b.data)))[0];
  const oa = norm(prim && prim.origem), of = norm(p.origem);
  let ind = p.indicado_por ? (D.pessoas || []).find(x => x.id === p.indicado_por) : null, fonte = ind ? 'indicado por, na ficha' : '';
  if (!ind) {
    const parcs = [...new Set((C.vendas || []).filter(e => e.pessoa_id === p.id && efetivo(e)).map(efetivo))];
    if (parcs.length === 1) { ind = (D.pessoas || []).find(x => x.parceiro_ref === parcs[0]) || null; if (ind) fonte = 'parceiro das vendas'; }
  }
  const ehInd = !!ind || /^indica/.test(of) || of === 'parceiro' || /^indica/.test(oa) || oa === 'parceiro';
  const antiga = [p.origem && 'na ficha: ' + p.origem, prim && prim.origem && 'no 1º atendimento: ' + prim.origem].filter(Boolean).join(' · ');
  if (ehInd) {
    if (!ind) return { tipo: 'indicacao_sem_ficha', antiga, canal: 'indicacao' };
    const r = canalIndicacao(C, p, ind);
    return { tipo: 'sugestao', antiga, canal: r.canal, indicado_por: ind.id, texto: `${ROTULO[r.canal]}, por ${ind.nome} (${motivoCanal(r, ind)}; ${fonte})` };
  }
  if (oa === 'prospeccao ativa' || of === 'prospeccao ativa') return { tipo: 'sugestao', antiga, canal: 'prospeccao_ativa', texto: 'Prospecção ativa' };
  const net = [of, oa].find(o => ['site', 'instagram', 'google'].includes(o));
  if (net) return { tipo: 'sugestao', antiga, canal: 'internet', detalhe: net, texto: 'Internet · ' + ROT_DET[net] };
  return { tipo: 'sem_pista', antiga };
}

// ---------- seletor de origem (usado aqui, na ficha, no novo atendimento e na cotação rápida) ----------
let SEQ = 0;
export function htmlSeletor(X, ini = {}) {
  estilos();
  const id = 'sel' + (++SEQ), esc = X.esc;
  const canal = ini.canal && ini.canal.startsWith('indicacao') ? 'indicacao' : ini.canal || '';
  const ind = ini.indicado_por ? (X.D.pessoas || []).find(x => x.id === ini.indicado_por) : null;
  const bt = (k, l, cls = '') => `<button type="button" data-canal="${k}" class="${cls}${canal === k ? ' on' : ''}">${l}</button>`;
  return `<div class="ind-sel" id="${id}" data-detalhe="${esc(ini.detalhe || '')}">
    <div class="ind-canais">${bt('rede_socios', 'Rede dos sócios', 'ind-rede full')}${bt('indicacao', 'Indicação')}${bt('internet', 'Internet')}${bt('prospeccao_ativa', 'Prospecção ativa')}${X.ADMIN ? bt('registro_teste', 'Registro de teste (só administrador)', 'full') : ''}</div>
    <div class="ind-det"></div>
    <div class="ind-quem" ${canal === 'indicacao' ? '' : 'hidden'}><label class="fl"><span>Quem indicou</span><input type="text" class="ind-quem-in" list="${id}dl" value="${esc(ind ? ind.nome : '')}" placeholder="Digite o nome e escolha a ficha" autocomplete="off"></label>
      <datalist id="${id}dl">${(X.D.pessoas || []).slice(0, 3000).map(o => `<option value="${esc(o.nome)}">`).join('')}</datalist><div class="ind-canal-res"></div></div>
  </div>`;
}
// liga o seletor. ctx: { pessoa (a ficha que recebe a origem, se já existe), C (dados carregados) }
export function ligarSeletor(el, X, ctx = {}) {
  const box = typeof el === 'string' ? document.getElementById(el) : el;
  if (!box) return null;
  let canal = (box.querySelector('[data-canal].on') || {}).dataset ? (box.querySelector('[data-canal].on') || {}).dataset.canal || '' : '';
  let detalhe = box.dataset.detalhe || '';
  const det = box.querySelector('.ind-det'), quem = box.querySelector('.ind-quem'), qin = box.querySelector('.ind-quem-in'), res = box.querySelector('.ind-canal-res');
  const achar = () => { const k = norm(qin.value); if (!k) return []; return (X.D.pessoas || []).filter(o => norm(o.nome) === k && (!ctx.pessoa || o.id !== ctx.pessoa.id)); };
  const desenharDet = () => {
    const L = DETALHES[canal] || [];
    det.innerHTML = L.length ? `<div class="ind-detchips">${L.map(([k, l]) => `<button type="button" data-det="${k}" class="${detalhe === k ? 'on' : ''}">${l}</button>`).join('')}</div>` : '';
    quem.hidden = canal !== 'indicacao';
    mostrarRes();
  };
  const mostrarRes = () => {
    if (canal !== 'indicacao' || !res) return;
    const L = achar();
    if (!qin.value.trim()) { res.textContent = ''; return; }
    if (L.length > 1) { res.innerHTML = '<span class="ind-alerta">Há mais de uma ficha com esse nome. Junte as fichas antes ou escreva o nome completo.</span>'; return; }
    if (!L.length) { res.textContent = 'Não achei essa ficha. Ao confirmar, a ficha de quem indicou é criada.'; return; }
    const r = canalIndicacao(ctx.C || { vendas: [], parceiros: X.D.parceirosAdm || X.D.parc || [] }, ctx.pessoa, L[0]);
    res.textContent = `Entra como ${ROTULO[r.canal]}: ${motivoCanal(r, L[0])}.`;
  };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-canal]');
    if (b) { canal = b.dataset.canal; detalhe = ''; box.querySelectorAll('[data-canal]').forEach(x => x.classList.toggle('on', x === b)); desenharDet(); return; }
    const d = e.target.closest('[data-det]');
    if (d) { detalhe = detalhe === d.dataset.det ? '' : d.dataset.det; det.querySelectorAll('[data-det]').forEach(x => x.classList.toggle('on', x.dataset.det === detalhe)); }
  });
  if (qin) { qin.addEventListener('input', mostrarRes); qin.addEventListener('change', mostrarRes); }
  desenharDet();
  return {
    escolhido: () => !!canal,
    // valida e devolve a origem pronta para gravar; cria a ficha de quem indicou se ela não existir
    async valor() {
      if (!canal) return { erro: 'Escolha de onde a pessoa veio.' };
      if (canal !== 'indicacao') return { origem_canal: canal, origem_detalhe: detalhe || null, origem_indicado_por: null };
      const nome = qin.value.replace(/\s+/g, ' ').trim();
      if (!nome) return { erro: 'Escolha a ficha de quem indicou.' };
      const L = achar();
      if (L.length > 1) return { erro: 'Há mais de uma ficha com o nome de quem indicou. Junte as fichas antes ou escreva o nome completo.' };
      let ind = L[0];
      if (!ind) {
        if (!confirm(`Não existe ficha de "${nome}". Criar a ficha de quem indicou agora?`)) return { erro: 'Escolha a ficha de quem indicou.' };
        const ins = await X.sb.from('pessoas').insert({ nome, papeis: [] }).select().single();
        if (ins.error) return { erro: X.limparTec('Não criou a ficha de quem indicou: ' + ins.error.message) };
        ind = ins.data; (X.D.pessoas = X.D.pessoas || []).push(ind);
      }
      const r = canalIndicacao(ctx.C || { vendas: [], parceiros: X.D.parceirosAdm || X.D.parc || [] }, ctx.pessoa, ind);
      if (!r.conhecido) return { erro: `Não consegui ver a comissão de ${ind.nome}. Peça a um administrador para confirmar esta origem.` };
      return { origem_canal: r.canal, origem_detalhe: null, origem_indicado_por: ind.id };
    }
  };
}
// grava a origem na ficha. Primeira marcação: só grava se a ficha ainda estiver sem origem (a trava do banco protege o resto)
export async function gravarOrigem(X, pessoaId, v, correcao) {
  const row = { origem_canal: v.origem_canal, origem_detalhe: v.origem_detalhe || null, origem_indicado_por: v.origem_indicado_por || null };
  let q = X.sb.from('pessoas').update(row).eq('id', pessoaId);
  if (!correcao) q = q.is('origem_canal', null);
  const { data, error } = await q.select();
  if (error) return { erro: X.limparTec('Não salvou a origem: ' + error.message) };
  if (!data || !data.length) return { erro: 'A origem desta pessoa já tinha sido marcada por outra pessoa da equipe. Atualize a tela.' };
  const i = (X.D.pessoas || []).findIndex(x => x.id === pessoaId); if (i >= 0) X.D.pessoas[i] = data[0];
  return { ok: data[0] };
}

// ---------- estilos das duas telas ----------
function estilos() {
  if (document.getElementById('indCss')) return;
  const s = document.createElement('style'); s.id = 'indCss';
  s.textContent = `
  .ind-sel{margin-top:8px}
  .ind-canais{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .ind-canais button{border:1px solid var(--linha);background:var(--creme);padding:10px 8px;font:500 13px Jost,sans-serif;color:var(--tinta);text-align:left;cursor:pointer;min-height:44px}
  .ind-canais button.on{background:var(--verde);color:var(--creme);border-color:var(--verde)}
  .ind-canais button.ind-rede{border:2px solid var(--dourado-claro);background:#fbf6e8;color:var(--dourado);font-weight:600}
  .ind-canais button.ind-rede.on{background:var(--verde);color:var(--creme);border-color:var(--verde)}
  .ind-canais .full{grid-column:1/-1}
  .ind-detchips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .ind-detchips button{border:1px solid var(--linha);background:var(--branco);padding:8px 12px;font:13px Jost,sans-serif;cursor:pointer}
  .ind-detchips button.on{border-color:var(--verde);color:var(--verde);font-weight:600}
  .ind-quem{margin-top:8px}.ind-canal-res{font-size:13px;color:var(--tinta-2);margin-top:2px}
  .ind-alerta{color:var(--alerta)}
  mark.ind-pista{background:#f3e3b5;color:var(--dourado);padding:0 3px;font-weight:600}
  .ind-cont{background:var(--branco);border:1px solid var(--linha);padding:14px;margin-top:12px}
  .ind-cont .t{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}
  .ind-cont .v{font:500 36px/1 'Cormorant Garamond',serif;color:var(--verde)}
  .ind-barra{height:8px;background:var(--creme-2);margin-top:10px}.ind-barra i{display:block;height:100%;background:var(--verde)}
  .ind-lista{display:grid;gap:10px;margin-top:12px}@media(min-width:900px){.ind-lista{grid-template-columns:1fr 1fr}}
  .ind-card{background:var(--branco);border:1px solid var(--linha);padding:14px}
  .ind-card .c1{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
  .ind-card .nome{font-weight:600;color:var(--verde);font-size:16px}
  .ind-card .luc{font:500 22px 'Cormorant Garamond',serif;color:var(--verde);white-space:nowrap}
  .ind-card .ant{font-size:13px;color:var(--tinta-2);margin-top:4px}
  .ind-sug{font-size:13px;margin-top:8px;padding:6px 8px;background:#eef3ee;color:var(--ok)}
  .ind-pis{font-size:13px;margin-top:8px;padding:6px 8px;background:#faf3df;color:var(--dourado)}
  .ind-conf{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;margin-top:12px;font-size:16px;border:1px solid}
  .ind-conf.ok{background:#eef3ee;border-color:rgba(47,107,74,.3)}.ind-conf.ok b{color:var(--ok)}
  .ind-conf.erro{background:#fbefe6;border-color:rgba(160,86,31,.35)}.ind-conf.erro b{color:var(--alerta)}
  .ind-or{padding:8px 0;border-top:1px solid var(--linha)}.ind-or:first-of-type{border-top:0}
  .ind-or .t{display:flex;justify-content:space-between;gap:10px;font-size:16px}.ind-or .t span:last-child{color:var(--tinta-2);white-space:nowrap}
  .ind-or .b{height:10px;background:var(--creme-2);margin-top:6px}.ind-or .b i{display:block;height:100%;background:var(--verde)}
  .ind-tot{display:flex;justify-content:space-between;border-top:2px solid var(--verde);padding-top:8px;margin-top:6px;font-weight:600;color:var(--verde)}
  .ind-nota{font-size:13px;color:var(--tinta-2);margin-top:8px}
  .ind-duas{display:grid;gap:12px}@media(min-width:900px){.ind-duas{grid-template-columns:1fr 1fr}}
  .ind-tab{width:100%;border-collapse:collapse;font-size:14px}
  .ind-tab th{font-weight:500;font-size:13px;color:var(--tinta-2);text-align:right;padding:8px 6px;border-bottom:1px solid var(--linha);white-space:nowrap}
  .ind-tab td{text-align:right;padding:10px 6px;border-bottom:1px solid var(--linha);white-space:nowrap}
  .ind-tab th:first-child,.ind-tab td:first-child{text-align:left}
  .ind-tab td.n button{color:var(--verde);font-weight:600;background:none;border:0;padding:0;font:inherit;cursor:pointer}
  .ind-tab .rede{background:#faf7ef;color:var(--tinta-2);font-style:italic}
  .ind-tab tr.tot td{font-weight:600;color:var(--verde)}
  .ind-cards{display:none}
  @media(max-width:899px){.ind-tabw{display:none}.ind-cards{display:block}}
  .ind-tabw{overflow-x:auto;margin:0 -4px}
  .ind-c{border-top:1px solid var(--linha);padding:12px 0}.ind-c:first-child{border-top:0}
  .ind-c .c1{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
  .ind-c .c1 button{color:var(--verde);font-weight:600;background:none;border:0;padding:0;font:inherit;font-size:16px;cursor:pointer;text-align:left}
  .ind-c .c1 span{font:500 22px 'Cormorant Garamond',serif;color:var(--verde);white-space:nowrap}
  .ind-c .c2{font-size:13px;color:var(--tinta-2);margin-top:2px}
  .ind-c .c3{font-size:13px;margin-top:6px;background:#faf7ef;padding:6px 8px;color:var(--tinta-2)}
  .ind-no{border-left:2px solid var(--dourado-claro);padding:6px 0 6px 12px;margin-left:6px}
  .ind-no .n{font-weight:600;color:var(--verde)}.ind-no .s{font-size:13px;color:var(--tinta-2)}
  .ind-tag{display:inline-block;font-size:13px;padding:0 8px;background:var(--creme-2);color:var(--dourado);margin-left:6px;font-weight:500}
  .ind-per{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
  .ind-per .seg{margin:0;flex:1 1 320px}
  `;
  document.head.appendChild(s);
}

// ---------- tela: Origens para marcar ----------
let OR_FILTRO = 'todas', OR_MSG = '';
export async function telaOrigens(P, X) {
  estilos();
  const { $, esc, brlC } = X;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Clientes</button><h1 class="titulo" style="margin-top:6px">Origens <em>para marcar</em></h1><div class="vazio">Carregando...</div>`;
  $('voltar').onclick = () => X.ir('crm');
  if (!(X.D.pessoas || []).length || !('origem_canal' in ((X.D.pessoas || [])[0] || {}))) {
    P.querySelector('.vazio').textContent = X.ADMIN ? 'Rode o 75-origem-e-indicacoes.sql no Supabase para ativar.' : 'Recurso ainda não ativado. Fale com o administrador.'; return;
  }
  const C = await carregar(X);
  if (X.aba() !== 'origens') return;
  const D = X.D, V = verValor(X);
  const lucroDe = {}; let total = 0, marcado = 0;
  (C.vendas || []).forEach(e => {
    const l = +e.lucro_liquido || 0; total += l;
    if (e.pessoa_id) lucroDe[e.pessoa_id] = (lucroDe[e.pessoa_id] || 0) + l;
    const p = e.pessoa_id && D.pessoas.find(x => x.id === e.pessoa_id);
    if (p && p.origem_canal) marcado += l;
  });
  const comp = new Set([...(C.vendas || []).map(e => e.pessoa_id), ...(C.atend || []).map(a => a.pessoa_id)].filter(Boolean));
  const fichas = D.pessoas.filter(p => comp.has(p.id));
  const pend = fichas.filter(p => !p.origem_canal).map(p => ({ p, l: lucroDe[p.id] || 0, s: sugestao(X, C, p) }))
    .sort((a, b) => b.l - a.l || a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
  const semFicha = (C.vendas || []).filter(e => !e.pessoa_id || !D.pessoas.some(x => x.id === e.pessoa_id));
  const n = (t) => pend.filter(x => t === 'todas' || x.s.tipo === t).length;
  const lista = pend.filter(x => OR_FILTRO === 'todas' || x.s.tipo === OR_FILTRO);
  const pc = total ? marcado / total * 100 : 0;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Clientes</button><h1 class="titulo" style="margin-top:6px">Origens <em>para marcar</em></h1>
    <div class="sub">Marque uma vez só. Depois de confirmada, a origem fica congelada e só um administrador corrige.</div>
    ${OR_MSG ? `<div class="config" style="margin-top:10px">${OR_MSG}</div>` : ''}
    <div class="ind-cont"><div class="t"><span class="v">${V ? Math.floor(pc).toLocaleString('pt-BR') + '%' : fichas.length - pend.length}</span><span class="sub" style="margin:0">${V ? 'do lucro já com origem marcada · ' : ''}${fichas.length - pend.length} de ${fichas.length} fichas</span></div><div class="ind-barra"><i style="width:${V ? pc : (fichas.length ? (fichas.length - pend.length) / fichas.length * 100 : 0)}%"></i></div></div>
    <div class="chips" id="orFiltro" style="margin-top:12px;flex-wrap:wrap">${[['todas', 'Todas'], ['sugestao', 'Com sugestão'], ['indicacao_sem_ficha', 'Indicação sem ficha'], ['sem_pista', 'Sem pista']].map(([k, l]) => `<button data-f="${k}" class="${OR_FILTRO === k ? 'on' : ''}">${l} · ${n(k)}</button>`).join('')}</div>
    <div class="sub">${V ? 'Ordenadas pelo lucro que cada cliente já gerou, do maior para o menor.' : 'Clientes com compra ou atendimento e sem origem marcada.'}</div>
    <div class="ind-lista">${lista.length ? lista.map(({ p, l, s }) => {
      const pi = pistas(p.nome);
      return `<div class="ind-card" data-pid="${p.id}">
        <div class="c1"><span class="nome">${nomeComPistas(p.nome, esc)}</span>${V ? `<span class="luc">${brlC(l)}</span>` : ''}</div>
        <div class="ant">${esc(s.antiga || 'Sem origem na ficha nem nos atendimentos')}</div>
        ${pi.length ? `<div class="ind-pis">Pista no nome: <b>${pi.map(esc).join(', ')}</b></div>` : ''}
        ${s.texto ? `<div class="ind-sug">Sugestão: ${esc(s.texto)}</div>` : ''}
        ${htmlSeletor(X, { canal: s.canal, detalhe: s.detalhe, indicado_por: s.indicado_por })}
        <button class="zap" type="button" data-conf="${p.id}" style="width:100%;margin-top:12px">Confirmar origem</button>
        <div class="sub" data-msg="${p.id}"></div>
      </div>`; }).join('') : '<div class="vazio">Nada para marcar neste filtro.</div>'}</div>
    ${semFicha.length ? `<div class="secao">Vendas sem ficha do comprador</div><section class="bloco" style="margin-top:0"><div class="lin"><span>${semFicha.length} ${semFicha.length === 1 ? 'venda' : 'vendas'}${V ? ' · ' + X.brl2(semFicha.reduce((t, e) => t + (+e.lucro_liquido || 0), 0)) + ' de lucro' : ''}</span></div><div class="sub" style="margin-top:0">Aparecem como "Sem ficha do comprador" nas indicações. Para entrarem num canal, cada venda precisa ser ligada a uma ficha.</div></section>` : ''}`;
  OR_MSG = '';
  $('voltar').onclick = () => X.ir('crm');
  $('orFiltro').onclick = (e) => { const b = e.target.closest('button'); if (b) { OR_FILTRO = b.dataset.f; telaOrigens(P, X); } };
  P.querySelectorAll('.ind-card').forEach(card => {
    const p = D.pessoas.find(x => x.id === card.dataset.pid);
    const S = ligarSeletor(card.querySelector('.ind-sel'), X, { pessoa: p, C });
    card.querySelector('[data-conf]').onclick = async (ev) => {
      const b = ev.currentTarget, msg = card.querySelector('[data-msg]');
      b.disabled = true; msg.textContent = 'Salvando...';
      const v = await S.valor();
      if (v.erro) { b.disabled = false; msg.innerHTML = `<span class="ind-alerta">${esc(v.erro)}</span>`; return; }
      const r = await gravarOrigem(X, p.id, v);
      if (r.erro) { b.disabled = false; msg.innerHTML = `<span class="ind-alerta">${esc(r.erro)}</span>`; return; }
      X.aviso(`Origem de ${p.nome}: ${rotuloOrigem(r.ok)}.`);
      telaOrigens(P, X);
    };
  });
}
export function pendentes(X) {
  const D = X.D; if (!(D.pessoas || []).length || !('origem_canal' in D.pessoas[0])) return 0;
  const comp = new Set([...(D.emissoes || []).map(e => e.pessoa_id), ...(D.reunioes || []).map(r => r.pessoa_id)].filter(Boolean));
  return D.pessoas.filter(p => comp.has(p.id) && !p.origem_canal).length;
}

// ---------- período: semana (quarta a terça, sem atravessar o mês), mês, ano, desde o início ----------
let PER = 'mes', REF = null, ARV = null;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const deIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export function periodo(modo, ref) {
  const r = deIso(ref);
  if (modo === 'tudo') return { ini: '0000-01-01', fim: '9999-12-31', nome: 'Desde o início' };
  if (modo === 'ano') return { ini: `${r.getFullYear()}-01-01`, fim: `${r.getFullYear()}-12-31`, nome: String(r.getFullYear()) };
  const m0 = new Date(r.getFullYear(), r.getMonth(), 1), m1 = new Date(r.getFullYear(), r.getMonth() + 1, 0);
  if (modo === 'mes') return { ini: iso(m0), fim: iso(m1), nome: m0.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase()) };
  const qua = new Date(r); qua.setDate(r.getDate() - ((r.getDay() - 3 + 7) % 7));
  const ter = new Date(qua); ter.setDate(qua.getDate() + 6);
  const ini = qua < m0 ? m0 : qua, fim = ter > m1 ? m1 : ter;
  const f = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return { ini: iso(ini), fim: iso(fim), nome: `${f(ini)} a ${f(fim)}` };
}
function mover(dir) {
  const p = periodo(PER, REF), r = deIso(REF);
  if (PER === 'semana') { const d = deIso(dir < 0 ? p.ini : p.fim); d.setDate(d.getDate() + dir); REF = iso(d); }
  else if (PER === 'mes') REF = iso(new Date(r.getFullYear(), r.getMonth() + dir, 1));
  else if (PER === 'ano') REF = iso(new Date(r.getFullYear() + dir, 0, 1));
}

// ---------- cálculo ----------
export function calcular(D, C, ini, fim) {
  const pessoas = D.pessoas || [], porId = new Map(pessoas.map(p => [p.id, p]));
  const noPer = (d) => { const s = String(d || '').slice(0, 10); return s >= ini && s <= fim; };
  const vendas = (C.vendas || []).filter(e => noPer(e.data_negociacao));
  const somaL = (L) => r2(L.reduce((t, e) => t + (+e.lucro_liquido || 0), 0));
  const somaF = (L) => r2(L.reduce((t, e) => t + (+e.valor_receber || 0), 0));
  // por origem: cada venda vai para a origem de quem comprou
  const por = Object.fromEntries(LINHAS.map(k => [k, { l: 0, n: 0 }]));
  vendas.forEach(e => {
    const p = e.pessoa_id && porId.get(e.pessoa_id);
    const k = !p ? 'sem_ficha' : p.origem_canal || 'sem_origem';
    por[k].l += +e.lucro_liquido || 0; por[k].n++;
  });
  LINHAS.forEach(k => { por[k].l = r2(por[k].l); });
  const total = somaL(vendas), somaOrigens = r2(LINHAS.reduce((t, k) => t + por[k].l, 0));
  // indicações
  const filhos = new Map();
  pessoas.forEach(p => { if (p.origem_indicado_por) { if (!filhos.has(p.origem_indicado_por)) filhos.set(p.origem_indicado_por, []); filhos.get(p.origem_indicado_por).push(p); } });
  const vendasDe = (id) => vendas.filter(e => e.pessoa_id === id);
  const vendasSempre = new Set((C.vendas || []).map(e => e.pessoa_id).filter(Boolean));
  const ctrDe = (p) => (C.contratos || []).filter(k => k.status !== 'cancelado' && (k.pessoa_id === p.id || (p.cliente_id && String(k.cliente_id) === String(p.cliente_id))));
  const fechou = (p) => vendasSempre.has(p.id) || ctrDe(p).some(k => k.status === 'assinado');
  const rede = (id) => { // níveis 2 em diante, sem repetir ninguém
    const vistos = new Set([id]); let fila = (filhos.get(id) || []).flatMap(f => (vistos.add(f.id), filhos.get(f.id) || [])); const out = [];
    while (fila.length) { const x = fila.shift(); if (vistos.has(x.id)) continue; vistos.add(x.id); out.push(x); fila.push(...(filhos.get(x.id) || [])); }
    return out;
  };
  const ranking = [...filhos.keys()].map(id => {
    const q = porId.get(id); if (!q) return { id, orfao: true, n: (filhos.get(id) || []).length };
    const dir = filhos.get(id) || [];
    const vd = dir.flatMap(p => vendasDe(p.id));
    const ref = q.parceiro_ref;
    const gest = dir.flatMap(p => ctrDe(p)).filter(k => k.status === 'assinado' && noPer(k.assinado_em));
    const rd = rede(id).flatMap(p => vendasDe(p.id));
    return { id, q, indicou: dir.length, fecharam: dir.filter(fechou).length, vendas: vd.length, fat: somaF(vd), luc: somaL(vd),
      com: r2(vd.filter(e => ref && efetivo(e) === ref).reduce((t, e) => t + (+e.repasse || 0), 0)), gestao: gest.length, cortesia: gest.filter(k => k.cortesia === true || k.cortesia === 'true').length, rede: somaL(rd) };
  }).filter(x => !x.orfao).sort((a, b) => b.luc - a.luc || b.vendas - a.vendas || a.q.nome.localeCompare(b.q.nome, 'pt-BR'));
  const orfaos = [...filhos.keys()].filter(id => !porId.has(id)).reduce((t, id) => t + filhos.get(id).length, 0);
  return { vendas, por, total, somaOrigens, ranking, filhos, porId, vendasDe, orfaos };
}

// ---------- tela: Indicações ----------
// opt.embutido: aba Indicações do painel da Empresa (sem título nem período próprios; usa o período do painel)
export async function telaIndicacoes(P, X, opt = {}) {
  estilos();
  const { $, esc, brlC, brl2 } = X, emb = !!opt.embutido;
  if (!REF) REF = iso(new Date());
  const MODO = emb ? opt.per : PER, REFX = emb ? opt.ref : REF;
  const em = (id) => P.querySelector('#' + id);
  P.innerHTML = emb ? '<div class="vazio">Carregando...</div>' : `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">Indicações <em>e origem</em></h1><div class="vazio">Carregando...</div>`;
  if (!emb) $('voltar').onclick = () => X.ir('empresa');
  if (!(X.D.pessoas || []).length || !('origem_canal' in ((X.D.pessoas || [])[0] || {}))) {
    P.querySelector('.vazio').textContent = X.ADMIN ? 'Rode o 75-origem-e-indicacoes.sql no Supabase para ativar.' : 'Recurso ainda não ativado. Fale com o administrador.'; return;
  }
  const C = await carregar(X);
  if (emb ? !P.isConnected : X.aba() !== 'indicacoes') return;
  const V = verValor(X), per = periodo(MODO, REFX), R = calcular(X.D, C, per.ini, per.fim);
  const val = (x) => V ? brl2(x) : '';
  // conferência 1: soma por origem = lucro total. Conferência 2 (no mês): mesmo número da tela Empresa
  const bate = Math.abs(R.somaOrigens - R.total) < 0.01;
  const empresa = MODO === 'mes' ? r2((X.D.emissoes || []).filter(e => !e.outra && String(e.data_negociacao).slice(0, 7) === per.ini.slice(0, 7)).reduce((t, e) => t + (+e.lucro_liquido || 0), 0)) : null;
  const bateEmp = empresa === null || Math.abs(empresa - R.total) < 0.01;
  const maxL = Math.max(1, ...['internet', 'indicacao_cliente', 'indicacao_parceiro', 'rede_socios', 'prospeccao_ativa'].map(k => Math.abs(V ? R.por[k].l : R.por[k].n)));
  const base = V ? R.total : R.vendas.length;
  const linha = (k) => { const x = R.por[k], v = V ? x.l : x.n; const barra = ['internet', 'indicacao_cliente', 'indicacao_parceiro', 'rede_socios', 'prospeccao_ativa'].includes(k);
    if (!barra && !v) return '';
    return `<div class="ind-or"><div class="t"><span>${ROT_LINHA[k]}</span><span>${V ? brl2(x.l) : x.n + (x.n === 1 ? ' venda' : ' vendas')}${barra && base ? ' · ' + Math.round(v / base * 100) + '%' : ''}</span></div>${barra ? `<div class="b"><i style="width:${Math.max(0, v) / maxL * 100}%"></i></div>` : ''}</div>`; };
  const tot = R.ranking.reduce((a, x) => ({ indicou: a.indicou + x.indicou, fecharam: a.fecharam + x.fecharam, vendas: a.vendas + x.vendas, fat: a.fat + x.fat, luc: a.luc + x.luc, com: a.com + x.com, gestao: a.gestao + x.gestao }), { indicou: 0, fecharam: 0, vendas: 0, fat: 0, luc: 0, com: 0, gestao: 0 });
  const conv = (x) => x.indicou ? Math.round(x.fecharam / x.indicou * 100) + '%' : '-';
  const arv = ARV && R.porId.get(ARV);
  const noArv = (p, nivel, vistos) => {
    if (vistos.has(p.id) || nivel > 6) return ''; vistos.add(p.id);
    const vd = R.vendasDe(p.id), fs = R.filhos.get(p.id) || [];
    return `<div class="ind-no"><div class="n">${esc(p.nome)} <span class="ind-tag">${nivel === 1 ? 'Direto' : 'Rede'}</span>${p.origem_canal ? `<span class="ind-tag">${esc(ROTULO[p.origem_canal])}</span>` : ''}</div>
      <div class="s">${vd.length} ${vd.length === 1 ? 'venda' : 'vendas'} no período${V && vd.length ? ' · lucro da Maktub ' + brl2(vd.reduce((t, e) => t + (+e.lucro_liquido || 0), 0)) + ' · repasse ' + brl2(vd.reduce((t, e) => t + (+e.repasse || 0), 0)) : ''}${nivel > 1 ? ' · comissão indireta R$ 0,00' : ''}</div>
      ${fs.map(f => noArv(f, nivel + 1, vistos)).join('')}</div>`;
  };
  P.innerHTML = `${emb ? '' : `<button class="voltar" id="voltar">‹ Empresa</button><h1 class="titulo" style="margin-top:6px">Indicações <em>e origem</em></h1>
    <div class="ind-per"><div class="seg" id="indPer">${[['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano'], ['tudo', 'Desde o início']].map(([k, l]) => `<button data-p="${k}" class="${PER === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${PER === 'tudo' ? '' : `<div class="mesnav" id="indNav" style="margin:0;flex:1 1 260px"><button data-n="-1">‹</button><span>${esc(per.nome)}</span><button data-n="1">›</button></div>`}</div>
    ${PER === 'semana' ? '<div class="sub">Semana de quarta a terça. Na virada do mês, a semana é cortada no último dia do mês.</div>' : ''}`}
    ${C.erroVendas ? `<div class="config" style="margin-top:10px">${esc(X.limparTec('As vendas não carregaram por completo: ' + C.erroVendas))}</div>` : ''}
    ${V ? `<div class="ind-conf ${bate && bateEmp ? 'ok' : 'erro'}"><span>Soma por origem <b>${brl2(R.somaOrigens)}</b> = lucro total do período <b>${brl2(R.total)}</b>${empresa !== null ? ` · tela Empresa ${brl2(empresa)}` : ''}</span><b>${bate && bateEmp ? 'Confere ✓' : 'Não confere: avise o administrador'}</b></div>` : ''}
    ${arv ? `<section class="bloco"><h2 style="display:flex;justify-content:space-between;align-items:center">Árvore de ${esc(arv.nome)}<button type="button" class="mini" id="fecharArv" style="background:none;border:0;font-size:22px;line-height:1;cursor:pointer;color:var(--tinta-3)" aria-label="Fechar">×</button></h2>
      <div class="n" style="font-weight:600;color:var(--verde)">${esc(arv.nome)}${arv.origem_canal ? `<span class="ind-tag">${esc(rotuloOrigem(arv))}</span>` : ''}</div>
      ${(R.filhos.get(arv.id) || []).map(f => noArv(f, 1, new Set([arv.id]))).join('') || '<div class="vazio">Ainda não indicou ninguém.</div>'}
      <div class="ind-nota">A Rede é a mesma venda que já está no Direto de outra pessoa. Por isso nunca entra em total.</div></section>` : ''}
    <div class="ind-duas" style="margin-top:12px">
      <section class="bloco" style="margin-top:0"><h2>${V ? 'Lucro da Maktub por origem' : 'Vendas por origem'}</h2>
        ${['internet', 'indicacao_cliente', 'indicacao_parceiro', 'rede_socios', 'prospeccao_ativa', 'registro_teste', 'sem_origem', 'sem_ficha'].map(linha).join('')}
        <div class="ind-tot"><span>Total</span><span>${V ? brl2(R.total) : R.vendas.length + ' vendas'}</span></div>
        <div class="ind-nota">${V ? 'Lucro líquido: venda menos custo, imposto, comissão do vendedor e repasse do parceiro. ' : ''}Cada venda conta uma vez, pela origem de quem comprou, na data da venda.${R.por.sem_origem.n ? ' Para tirar vendas de "Sem origem marcada", use Clientes › Origens para marcar.' : ''}</div>
      </section>
      <section class="bloco" style="margin-top:0"><h2>Indicação no período</h2>
        <div class="lin"><span>${V ? 'Lucro vindo de indicação' : 'Vendas vindas de indicação'}</span><span>${V ? brl2(R.por.indicacao_cliente.l + R.por.indicacao_parceiro.l) : R.por.indicacao_cliente.n + R.por.indicacao_parceiro.n}</span></div>
        ${V ? `<div class="lin"><span>Comissão direta paga</span><span>${brl2(tot.com)}</span></div><div class="lin"><span>Comissão indireta</span><span>R$ 0,00</span></div>` : ''}
        <div class="lin"><span>Contratos de Gestão trazidos</span><span>${tot.gestao}</span></div>
        <div class="lin"><span>Rede dos sócios</span><span>${V ? brl2(R.por.rede_socios.l) : R.por.rede_socios.n}</span></div>
        <div class="ind-nota">A Rede dos sócios mostra quanto ainda depende do contato pessoal da Isadora e do Matheus.</div>
      </section>
    </div>
    <section class="bloco"><h2>Quem indica · ordenado pelo ${V ? 'lucro Direto' : 'número de vendas'}</h2>
      ${R.ranking.length ? `<div class="ind-tabw"><table class="ind-tab"><thead><tr><th>Quem indica</th><th>Indicou</th><th>Fecharam</th><th>Conversão</th><th>Vendas</th>${V ? '<th>Faturamento</th><th>Lucro da Maktub</th><th>Comissão direta</th><th>Comissão indireta</th>' : ''}<th>Gestão</th>${V ? '<th class="rede">Rede gerada (informativo)</th>' : ''}</tr></thead><tbody>
        ${R.ranking.map(x => `<tr><td class="n"><button data-arv="${x.id}">${esc(x.q.nome)} ›</button></td><td>${x.indicou}</td><td>${x.fecharam}</td><td>${conv(x)}</td><td>${x.vendas}</td>${V ? `<td>${brlC(x.fat)}</td><td><b>${brl2(x.luc)}</b></td><td>${brl2(x.com)}</td><td>R$ 0,00</td>` : ''}<td>${x.gestao}${x.cortesia ? ` (${x.cortesia} cortesia)` : ''}</td>${V ? `<td class="rede">${brl2(x.rede)}</td>` : ''}</tr>`).join('')}
        <tr class="tot"><td>Total da empresa</td><td>${tot.indicou}</td><td>${tot.fecharam}</td><td>${conv(tot)}</td><td>${tot.vendas}</td>${V ? `<td>${brlC(tot.fat)}</td><td>${brl2(tot.luc)}</td><td>${brl2(tot.com)}</td><td>R$ 0,00</td>` : ''}<td>${tot.gestao}</td>${V ? '<td class="rede">não soma</td>' : ''}</tr>
      </tbody></table></div>
      <div class="ind-cards">${R.ranking.map(x => `<div class="ind-c"><div class="c1"><button data-arv="${x.id}">${esc(x.q.nome)} ›</button>${V ? `<span>${brlC(x.luc)}</span>` : ''}</div>
        <div class="c2">indicou ${x.indicou} · fecharam ${x.fecharam} (${conv(x)}) · ${x.vendas} ${x.vendas === 1 ? 'venda' : 'vendas'}${V ? ` · faturamento ${brlC(x.fat)} · comissão direta ${brl2(x.com)} · indireta R$ 0,00` : ''} · Gestão ${x.gestao}</div>
        ${V ? `<div class="c3">Rede gerada: ${brl2(x.rede)} (informativo, já contado em outra pessoa)</div>` : ''}</div>`).join('')}
        <div class="ind-c"><div class="c1"><b style="color:var(--tinta)">Total da empresa</b>${V ? `<span>${brlC(tot.luc)}</span>` : ''}</div><div class="c2">${tot.vendas} vendas${V ? ` · comissão direta ${brl2(tot.com)} · comissão indireta R$ 0,00` : ''} · a Rede não soma</div></div></div>`
      : '<div class="vazio">Ninguém com indicação marcada ainda. As indicações aparecem aqui conforme a equipe marca as origens.</div>'}
      <div class="ind-nota">Indicou, fecharam e conversão contam desde o início. Vendas, ${V ? 'faturamento, lucro, comissão e ' : ''}Gestão seguem o período (Gestão pela data de assinatura do contrato). Toque no nome para ver a árvore.${R.orfaos ? ` ${R.orfaos} ${R.orfaos === 1 ? 'pessoa aponta' : 'pessoas apontam'} para uma ficha de quem indicou que não existe mais: um administrador precisa corrigir.` : ''}</div>
    </section>`;
  if (!emb) {
    $('voltar').onclick = () => X.ir('empresa');
    $('indPer').onclick = (e) => { const b = e.target.closest('button'); if (b) { PER = b.dataset.p; telaIndicacoes(P, X); } };
    if ($('indNav')) $('indNav').onclick = (e) => { const b = e.target.closest('button'); if (b) { mover(+b.dataset.n); telaIndicacoes(P, X); } };
  }
  if (em('fecharArv')) em('fecharArv').onclick = () => { ARV = null; telaIndicacoes(P, X, opt); };
  P.querySelectorAll('[data-arv]').forEach(b => b.onclick = () => { ARV = b.dataset.arv; telaIndicacoes(P, X, opt).then(() => { const a = em('fecharArv'); if (a) a.scrollIntoView({ block: 'center' }); }); });
}
