// Maktub Go: importação da planilha da Base de cartões.
// Abas lidas: regua_ia (números), cartoes e cartoes_novos (textos), salas_vip, bancos_segmentos,
// beneficios, programas_bandeiras, salas_aeroportos (salas e restaurantes de cada aeroporto) e correcoes_2026
// (vira a lista de correções a revisar, nada é aplicado sozinho).
// Nada é gravado antes de "Importar". Cartão que já existe só ganha o que está vazio; um valor
// diferente do que a equipe já preencheu só muda se for marcado na lista de diferenças.

const semAc = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STOP = new Set(['cartao', 'cartoes', 'de', 'do', 'da', 'dos', 'das', 'e', 'the', 'card', 'credito', 'banco', 'bank', 'versao', 'a', 'confirmar', 'categoria', 'padrao', 'para', 'com']);
const SIN = { master: ['mastercard'], mc: ['mastercard'], amex: ['american', 'express'] };
const pal = (t) => semAc(t).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).flatMap(w => SIN[w] || [w]);
const palNome = (nome, banco) => { const b = new Set(pal(banco)); return [...new Set(pal(nome).filter(w => !b.has(w)))]; };
const chave = (banco, nome) => semAc(String(banco ?? '').trim() + '|' + String(nome ?? '').trim()).replace(/\s+/g, ' ');
const vazio = (v) => v === null || v === undefined || v === '';
const txt = (v) => vazio(v) ? null : String(v).trim() || null;
const num = (v) => { if (typeof v === 'number') return isFinite(v) ? v : null; const t = String(v ?? '').trim(); return /^-?\d+([.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : null; };
const sim = (v) => semAc(v).trim() === 'sim';
const data = (v) => {
  if (typeof v === 'number' && v > 20000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
  const m = String(v ?? '').match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null;
};
const primeiraUrl = (v) => (String(v ?? '').match(/https?:\/\/[^\s;]+/) || [])[0] || null;
const programaCurto = (d) => { const s = String(d ?? '').split(/[;(]/)[0].trim(); return s || null; };
const FORA = /fora de linha|nao e mais comercializado|nao e mais vendido/;
const TIPOS_SALA = ['rede_global', 'sala_banco', 'sala_bandeira', 'sala_companhia'];
const TIPOS_AERO = ['independente', 'companhia', 'banco', 'bandeira', 'aeroporto', 'restaurante', 'outro'];
const simNao = (v) => { const t = semAc(v).trim(); return t === 'sim' ? true : t === 'nao' ? false : null; };

// nome do cartão sem o nome do banco (a base mostra "banco nome"): "Itaú Platinum" vira "Platinum"
function limparNome(nome, banco) {
  const b = new Set(semAc(banco).split(/\s+/).filter(w => w.length > 1 && !['de', 'do', 'da', 'dos', 'das'].includes(w)));
  const fica = String(nome ?? '').trim().split(/\s+/).filter(t => !b.has(semAc(t).replace(/[()]/g, '')));
  const n = fica.join(' ').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
  return n || String(nome ?? '').trim();
}
// gasto que libera a sala: "R$ 30 mil somando as 3 últimas faturas" vira [30000, 3]
function gastoMinimo(t) {
  const s = semAc(t);
  const m = s.match(/r\$\s*([\d.,]+)\s*(mil)?/); if (!m) return [null, null];
  let v = Number(m[1].replace(/\./g, '').replace(',', '.')); if (m[2]) v *= 1000;
  const f = /3 ultimas faturas|tres ultimas|trimestre/.test(s) ? 3 : /fatura|por mes|mensal|no mes/.test(s) ? 1 : null;
  return [v > 0 ? v : null, f];
}
// resumo de sala VIP que fica no próprio cartão (as contas e o painel usam), a partir da aba salas_vip.
// Vale só a rede global (Priority Pass, LoungeKey, DragonPass/Visa Airport Companion): "ilimitada" é ilimitada
// em qualquer sala da rede. Salas próprias de banco, bandeira ou companhia ficam na aba Salas VIP, com a regra delas.
function resumoVip(r, S) {
  if (S.length) {
    const G = S.filter(s => s.tipo === 'rede_global');
    const ilim = G.some(s => num(s.acessos_titular_ano) === -1);
    const ns = G.map(s => num(s.acessos_titular_ano)).filter(n => n > 0);
    const redes = [...new Set(G.map(s => txt(s.rede_ou_sala)).filter(Boolean))].join(' + ');
    return { salas_vip_ilimitado: ilim, salas_vip_ano: ilim || !ns.length ? null : Math.round(Math.max(...ns)), salas_vip_programa: redes ? redes.slice(0, 160) : null };
  }
  const a = num(r.vip_acessos_ano);
  return { salas_vip_ilimitado: a === -1, salas_vip_ano: a > 0 ? Math.round(a) : null, salas_vip_programa: txt(r.vip_rede_global) };
}
function linhaCatalogo(r, t, S) {
  const exige = txt(r.exige_segmento_ou_outro) || txt(t.exigencia_para_ter), obs = txt(t.observacoes);
  const red = num(r.isencao_50_gasto_mes_rs), pn = num(r.pts_nacional), destino = txt(r.destino_pontos);
  return {
    banco: txt(r.banco), nome: limparNome(r.nome_cartao, r.banco), bandeira: txt(r.bandeira), categoria: txt(t.categoria_bandeira) || txt(t.categoria),
    anuidade_anual: num(r.anuidade_ano_rs), isencao_gasto_mes: num(r.isencao_100_gasto_mes_rs), reducao_gasto_mes: red, reducao_pct: red ? 50 : null,
    isencao: txt(t.regra_isencao_anuidade), isencao_invest: num(r.isencao_100_invest_rs), isencao_outras: txt(r.isencao_outras_regras),
    pontos_por: pn, pontos_moeda: 'USD', programa: pn !== null ? programaCurto(destino) : null,
    pts_nacional: pn, pts_internacional: num(r.pts_internacional), pts_condicional: txt(r.pts_condicional), destino_pontos: destino, tipo_destino: txt(r.tipo_destino),
    regua_id: num(r.id), familia_regua: txt(r.familia_regua), posicao_regua: num(r.posicao_regua), proximo_degrau: txt(r.proximo_degrau),
    exige_renda: num(r.exige_renda_rs), exige_invest: num(r.exige_invest_rs), exige_outro: exige, somente_convite: sim(r.somente_convite),
    a_confirmar: sim(r.revisar_antes_de_usar) || sim(t.a_confirmar), vendido_hoje: !FORA.test(semAc((exige || '') + ' ' + (obs || ''))),
    pontos_expiram: txt(t.pontos_expiram), seguro_viagem: txt(t.seguro_viagem), observacoes: obs,
    fonte: primeiraUrl(t.fonte_url || r.fonte_url), conferido_em: data(t.data_verificacao || r.data_verificacao),
    ...resumoVip(r, S),
  };
}

function lerPlanilha(wb, XLSX) {
  const aba = (n) => wb.Sheets[n] ? XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null, raw: true }) : [];
  const regua = aba('regua_ia').filter(r => num(r.id) !== null && r.banco && r.nome_cartao);
  const T = {}; [...aba('cartoes'), ...aba('cartoes_novos')].forEach(t => { if (t.banco && t.nome_cartao) T[chave(t.banco, t.nome_cartao)] = t; });
  const salas = aba('salas_vip').filter(s => s.banco && s.nome_cartao && s.rede_ou_sala);
  const VIP = {}; salas.forEach(s => (VIP[chave(s.banco, s.nome_cartao)] ||= []).push(s));
  const P = regua.map(r => { const k = chave(r.banco, r.nome_cartao); return { r, k, row: linhaCatalogo(r, T[k] || {}, VIP[k] || []) }; });
  return { P, salas, segs: aba('bancos_segmentos').filter(s => s.banco && s.segmento), benef: aba('beneficios').filter(b => b.beneficio),
    progs: aba('programas_bandeiras').filter(b => b.beneficio), corr: aba('correcoes_2026').filter(c => c.banco && c.nome_cartao && c.campo),
    aero: aba('salas_aeroportos').filter(a => /^[a-z]{3}$/i.test(String(a.aeroporto_iata || '').trim()) && a.sala) };
}

// cartões ativos do app x linhas da planilha. Sugestão automática só quando um nome contém o outro.
function casar(BASE, P) {
  const porRegua = {}; P.forEach(p => { porRegua[p.row.regua_id] = p; });
  const res = {};
  for (const a of BASE.filter(b => b.ativo !== false)) {
    if (a.regua_id && porRegua[a.regua_id]) { res[a.id] = { cands: [{ p: porRegua[a.regua_id], jac: 1, cont: 1 }], escolha: a.regua_id, tipo: 'ligado' }; continue; }
    const aw = palNome(a.nome, a.banco), ab = new Set(pal(a.banco)), cands = [];
    for (const p of P) {
      if (!pal(p.r.banco).some(w => ab.has(w))) continue;
      const pw = palNome(p.r.nome_cartao, p.r.banco); if (!aw.length || !pw.length) continue;
      const inter = aw.filter(w => pw.includes(w)).length; if (!inter) continue;
      const jac = inter / new Set([...aw, ...pw]).size, cont = inter / Math.min(aw.length, pw.length);
      if (cont >= 0.5) cands.push({ p, jac, cont });
    }
    cands.sort((x, y) => y.cont - x.cont || y.jac - x.jac);
    const fortes = cands.filter(c => c.cont === 1);
    let escolha = '', tipo = cands.length ? 'escolher' : 'sempar';
    if (fortes.length === 1 || (fortes.length > 1 && fortes[0].jac > fortes[1].jac)) { escolha = fortes[0].p.row.regua_id; tipo = fortes[0].jac === 1 ? 'ligado' : 'confira'; }
    res[a.id] = { cands, escolha, tipo };
  }
  // a mesma linha da planilha não vai para dois cartões do app: fica com o nome mais parecido
  const dono = {};
  for (const [id, x] of Object.entries(res)) {
    if (!x.escolha) continue;
    const jac = (x.cands.find(c => c.p.row.regua_id === x.escolha) || {}).jac || 0, d = dono[x.escolha];
    if (!d || jac > d.jac) { if (d) Object.assign(res[d.id], { escolha: '', tipo: 'escolher' }); dono[x.escolha] = { id, jac }; }
    else Object.assign(x, { escolha: '', tipo: 'escolher' });
  }
  return res;
}

const COMPARA = [['nome', 'Nome'], ['anuidade_anual', 'Anuidade (R$/ano)'], ['isencao_gasto_mes', 'Gasto que isenta (R$/mês)'], ['reducao_gasto_mes', 'Gasto que dá desconto (R$/mês)'],
  ['reducao_pct', 'Desconto na anuidade (%)'], ['pontos_por', 'Pontos por US$ no Brasil'], ['programa', 'Programa de pontos'], ['salas_vip_ano', 'Acessos de sala VIP por ano'], ['salas_vip_ilimitado', 'Sala VIP ilimitada']];
const NOVAS_BOOL = ['somente_convite', 'vendido_hoje', 'a_confirmar'];
const igual = (k, a, b) => k === 'nome' ? pal(a).sort().join(' ') === pal(b).sort().join(' ') : k === 'programa' ? semAc(a).replace(/[^a-z0-9]/g, '') === semAc(b).replace(/[^a-z0-9]/g, '') : typeof b === 'number' ? Number(a) === b : a === b;
const confirmarNoTexto = (a) => /confirmar/i.test([a.nome, a.categoria, a.isencao, a.beneficios, a.programa].filter(Boolean).join(' '));
// o que entra num cartão que já existe: campos vazios, as diferenças marcadas e as marcas novas
function atualizacao(a, pr, marcadas) {
  const up = {}, dif = [];
  for (const [k, v] of Object.entries(pr)) {
    if (NOVAS_BOOL.includes(k) || k === 'salas_vip_ilimitado') continue;
    if (vazio(v)) continue;
    if (vazio(a[k])) { up[k] = v; continue; }
    const c = COMPARA.find(x => x[0] === k);
    if (c && !igual(k, a[k], v)) { dif.push({ k, rot: c[1], app: a[k], plan: v }); if (marcadas.has(a.id + '|' + k)) up[k] = v; }
  }
  if (!!a.salas_vip_ilimitado !== pr.salas_vip_ilimitado) { dif.push({ k: 'salas_vip_ilimitado', rot: 'Sala VIP ilimitada', app: !!a.salas_vip_ilimitado, plan: pr.salas_vip_ilimitado }); if (marcadas.has(a.id + '|salas_vip_ilimitado')) up.salas_vip_ilimitado = pr.salas_vip_ilimitado; }
  up.regua_id = pr.regua_id;
  if (!a.regua_id) { // primeira importação deste cartão: as marcas novas vêm da planilha
    up.somente_convite = pr.somente_convite;
    up.vendido_hoje = a.vendido_hoje === false ? false : pr.vendido_hoje;
    up.a_confirmar = !!(a.a_confirmar || pr.a_confirmar || confirmarNoTexto(a));
  }
  return { up, dif };
}

async function todos(sb, tabela, cols) {
  const L = [];
  for (let de = 0; ; de += 1000) {
    const r = await sb.from(tabela).select(cols).range(de, de + 999);
    if (r.error) throw r.error;
    L.push(...(r.data || [])); if (!r.data || r.data.length < 1000) return L;
  }
}
async function inserirEmLotes(sb, tabela, linhas, msg, rot) {
  for (let i = 0; i < linhas.length; i += 200) {
    msg(`${rot}: ${Math.min(i + 200, linhas.length)} de ${linhas.length}...`);
    const r = await sb.from(tabela).insert(linhas.slice(i, i + 200));
    if (r.error) throw new Error(rot + ': ' + r.error.message);
  }
}

let PLAN = null, CAS = null, MARC = new Set(), TOCADAS = new Set(), ARQ = '';
export function limpar() { PLAN = null; CAS = null; MARC = new Set(); TOCADAS = new Set(); ARQ = ''; }
const FICA_APP = ['nome', 'programa'];

export async function telaImportar(P, X, { base, voltar, recarregar }) {
  const { $, esc } = X;
  const cab = `<button class="voltar" id="voltarImp">‹ Base de cartões</button><h1 class="titulo" style="margin-top:6px">Importar <em>planilha</em></h1>`;
  if (!PLAN) {
    P.innerHTML = cab + `<div class="sub" style="font-size:13px">Escolha a planilha da base de cartões (.xlsx). Antes de gravar, o app mostra o que entra, o que muda e o que precisa da sua escolha.</div>
      <section class="bloco"><label class="fl"><span>Planilha</span><input type="file" id="impArq" accept=".xlsx,.xls"></label><div class="sub" id="impMsg" style="font-size:13px"></div></section>`;
    $('voltarImp').onclick = () => { limpar(); voltar(); };
    $('impArq').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      $('impMsg').textContent = 'Lendo a planilha...';
      try {
        const XLSX = await import('https://esm.sh/xlsx@0.18.5');
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false });
        if (!wb.Sheets.regua_ia) { $('impMsg').textContent = 'A planilha não tem a aba regua_ia. Use a planilha da base de cartões.'; return; }
        PLAN = lerPlanilha(wb, XLSX); CAS = casar(base, PLAN.P); MARC = new Set(); TOCADAS = new Set(); ARQ = f.name;
        telaImportar(P, X, { base, voltar, recarregar });
      } catch (err) { console.error(err); $('impMsg').textContent = 'Não consegui ler o arquivo: ' + (err.message || err); }
    };
    return;
  }
  const porRegua = {}; PLAN.P.forEach(p => { porRegua[p.row.regua_id] = p; });
  const nomeApp = (a) => `${a.banco} ${a.nome}`.trim();
  const nomePl = (p) => `${p.r.banco} · ${p.r.nome_cartao}`;
  const appPorId = Object.fromEntries(base.map(a => [a.id, a]));
  const usados = new Set(Object.values(CAS).map(x => x.escolha).filter(Boolean));
  const novos = PLAN.P.filter(p => !usados.has(p.row.regua_id));
  const ids = Object.keys(CAS);
  const escolher = ids.filter(id => CAS[id].tipo === 'escolher' || CAS[id].tipo === 'confira');
  const ligados = ids.filter(id => CAS[id].tipo === 'ligado');
  const semPar = ids.filter(id => CAS[id].tipo === 'sempar');
  const DIF = ids.filter(id => CAS[id].escolha).map(id => ({ a: appPorId[id], ...atualizacao(appPorId[id], porRegua[CAS[id].escolha].row, MARC) })).filter(x => x.dif.length);
  DIF.forEach(({ a, dif }) => dif.forEach(d => { const k = a.id + '|' + d.k; if (!TOCADAS.has(k) && !FICA_APP.includes(d.k)) MARC.add(k); }));
  const sel = (id) => { const x = CAS[id]; return `<select data-esc="${id}"><option value="">Nenhum: o cartão do app fica como está</option>${x.cands.map(c => `<option value="${c.p.row.regua_id}"${c.p.row.regua_id === x.escolha ? ' selected' : ''}>${esc(nomePl(c.p))}</option>`).join('')}</select>`; };
  const fmt = (v) => v === true ? 'sim' : v === false ? 'não' : typeof v === 'number' ? v.toLocaleString('pt-BR') : esc(v);
  const n = (L, s, p) => `${L.length} ${L.length === 1 ? s : p}`;
  P.innerHTML = cab + `<div class="sub" style="font-size:13px">${esc(ARQ)}. Confira e toque em Importar. Nada foi gravado ainda.</div>
    <div class="numeros" style="margin-top:12px">
      <div class="num"><div class="l">Cartões novos</div><div class="v">${novos.length}</div><div class="d">entram completos</div></div>
      <div class="num"><div class="l">Já no app</div><div class="v">${ids.length - semPar.length}</div><div class="d">só preenche o que está vazio</div></div>
    </div>
    <div class="sub" style="font-size:13px">Também entram: ${n(PLAN.salas, 'sala VIP', 'salas VIP')}, ${n(PLAN.segs, 'segmento de banco', 'segmentos de bancos')}, ${PLAN.benef.length + PLAN.progs.length} benefícios, ${PLAN.aero.length ? `${PLAN.aero.length} salas e restaurantes em ${new Set(PLAN.aero.map(a => String(a.aeroporto_iata).trim().toUpperCase())).size} aeroportos, ` : ''}e ${n(PLAN.corr, 'correção para revisar', 'correções para revisar')}. O que já estiver no app não entra de novo.</div>
    ${escolher.length ? `<div class="secao">Escolha a versão (${escolher.length})</div><section class="bloco" style="margin-top:0"><div class="sub" style="font-size:13px;margin-top:0">O cartão do app parece com mais de um da planilha, ou o nome não é igual. Escolha qual é. O que ninguém escolher entra como cartão novo.</div>
      ${escolher.map(id => `<label class="fl"><span><b style="font-weight:600">${esc(nomeApp(appPorId[id]))}</b>${CAS[id].tipo === 'confira' ? ' (sugestão, confira)' : ''}</span>${sel(id)}</label>`).join('')}</section>` : ''}
    ${DIF.length ? `<div class="secao">Diferenças (${DIF.reduce((s, x) => s + x.dif.length, 0)})</div><section class="bloco" style="margin-top:0"><div class="sub" style="font-size:13px;margin-top:0">O app já tem um valor e a planilha traz outro. Os números (anuidade, isenção, pontos e sala VIP) já vêm marcados para usar a planilha, que é mais nova e tem fonte; nome e programa ficam como no app. Só mexa se quiser trocar algum.</div>
      ${DIF.map(({ a, dif }) => `<div style="margin-top:12px"><b style="font-weight:600">${esc(nomeApp(a))}</b>${dif.map(d => `<label class="fc" style="align-items:flex-start"><input type="checkbox" data-dif="${a.id}|${d.k}" ${MARC.has(a.id + '|' + d.k) ? 'checked' : ''}><span style="font-size:13px">${d.rot}: no app <b>${fmt(d.app)}</b>, na planilha <b>${fmt(d.plan)}</b>. Usar a planilha</span></label>`).join('')}</div>`).join('')}</section>` : ''}
    <details class="gsec"><summary><span>Ligados automaticamente (${ligados.length})<small>Mesmo nome no app e na planilha</small></span></summary>${ligados.map(id => `<label class="fl"><span>${esc(nomeApp(appPorId[id]))}</span>${sel(id)}</label>`).join('') || '<div class="vazio">Nenhum.</div>'}<div style="height:12px"></div></details>
    <details class="gsec"><summary><span>Cartões novos (${novos.length})<small>Não existem no app e entram completos</small></span></summary><div style="font-size:13px;padding-bottom:12px">${novos.map(p => esc(nomePl(p))).join('<br>') || 'Nenhum.'}</div></details>
    <details class="gsec"><summary><span>Do app sem par na planilha (${semPar.length})<small>Ficam como estão</small></span></summary><div style="font-size:13px;padding-bottom:12px">${semPar.map(id => esc(nomeApp(appPorId[id]))).join('<br>') || 'Nenhum.'}</div></details>
    <button class="zap grande" id="impOk" style="width:100%;margin-top:14px">Importar</button><div class="sub" id="impMsg" style="font-size:13px"></div>`;
  $('voltarImp').onclick = () => { limpar(); voltar(); };
  const redesenhar = () => { const y = scrollY; telaImportar(P, X, { base, voltar, recarregar }); scrollTo(0, y); };
  P.querySelectorAll('[data-esc]').forEach(s => s.onchange = () => {
    const id = s.dataset.esc, v = s.value === '' ? '' : Number(s.value);
    if (v !== '') for (const [o, x] of Object.entries(CAS)) if (o !== id && x.escolha === v) Object.assign(x, { escolha: '', tipo: 'escolher' });
    CAS[id].escolha = v; if (CAS[id].tipo === 'sempar' && v !== '') CAS[id].tipo = 'confira';
    redesenhar();
  });
  P.querySelectorAll('[data-dif]').forEach(c => c.onchange = () => { TOCADAS.add(c.dataset.dif); c.checked ? MARC.add(c.dataset.dif) : MARC.delete(c.dataset.dif); });
  $('impOk').onclick = async () => {
    const bt = $('impOk'), msg = (t) => { $('impMsg').textContent = t; };
    bt.disabled = true;
    try { await gravar(X, base, porRegua, novos, msg); }
    catch (err) { console.error(err); bt.disabled = false; msg('Parou no meio: ' + X.limparTec(err.message || String(err)) + '. O que já entrou fica; ao importar de novo, só entra o que falta.'); return; }
    limpar(); await recarregar(); X.aviso('Planilha importada.'); voltar();
  };
}

async function gravar(X, base, porRegua, novos, msg) {
  const { sb } = X, agora = new Date().toISOString();
  const idPorChave = {}, reguaChave = {}; PLAN.P.forEach(p => { reguaChave[p.row.regua_id] = p.k; });
  // 1. cartões que já existem: só o vazio, as diferenças marcadas e as marcas novas
  const lig = Object.entries(CAS).filter(([, x]) => x.escolha);
  for (const [i, [id, x]] of lig.entries()) {
    msg(`Atualizando cartões do app: ${i + 1} de ${lig.length}...`);
    const a = base.find(b => b.id === id), { up } = atualizacao(a, porRegua[x.escolha].row, MARC);
    const r = await sb.from('cartoes_catalogo').update({ ...up, atualizado_em: agora }).eq('id', id);
    if (r.error) throw new Error(`${a.banco} ${a.nome}: ${r.error.message}`);
    idPorChave[reguaChave[x.escolha]] = id;
  }
  // 2. cartões novos
  for (let i = 0; i < novos.length; i += 100) {
    msg(`Cartões novos: ${Math.min(i + 100, novos.length)} de ${novos.length}...`);
    const r = await sb.from('cartoes_catalogo').insert(novos.slice(i, i + 100).map(p => ({ ...p.row, ativo: true, atualizado_em: agora }))).select('id,regua_id');
    if (r.error) throw new Error('Cartões novos: ' + r.error.message);
    (r.data || []).forEach(c => { idPorChave[reguaChave[c.regua_id]] = c.id; });
  }
  const idDe = (banco, nome) => idPorChave[chave(banco, nome)] || null;
  // 3. salas VIP
  msg('Conferindo salas VIP...');
  const jaS = new Set((await todos(sb, 'cartoes_salas_vip', 'banco,nome_cartao,rede_ou_sala')).map(s => chave(s.banco, s.nome_cartao) + '|' + semAc(s.rede_ou_sala)));
  const salas = [], vistoS = new Set();
  for (const s of PLAN.salas) {
    const k = chave(s.banco, s.nome_cartao) + '|' + semAc(txt(s.rede_ou_sala));
    if (jaS.has(k) || vistoS.has(k)) continue; vistoS.add(k);
    const [rs, fat] = gastoMinimo(s.gasto_minimo_para_liberar), ac = num(s.acessos_titular_ano);
    salas.push({ catalogo_id: idDe(s.banco, s.nome_cartao), banco: txt(s.banco), nome_cartao: txt(s.nome_cartao), rede_ou_sala: txt(s.rede_ou_sala),
      tipo: TIPOS_SALA.includes(s.tipo) ? s.tipo : null, acessos_titular_ano: ac === null ? null : Math.round(ac), acompanhantes: txt(s.acompanhantes), adicionais: txt(s.adicionais),
      gasto_minimo: txt(s.gasto_minimo_para_liberar), gasto_minimo_rs: rs, gasto_minimo_faturas: fat, aeroportos: txt(s.aeroportos), como_acessar: txt(s.como_acessar),
      condicao_extra: txt(s.condicao_extra), mudou_em_2026: txt(s.mudou_em_2026), fonte: txt(s.fonte_url), conferido_em: data(s.data_verificacao), a_confirmar: !semAc(s.a_confirmar).startsWith('nao') });
  }
  await inserirEmLotes(sb, 'cartoes_salas_vip', salas, msg, 'Salas VIP');
  // 4. segmentos dos bancos, com os cartões liberados ligados à base quando o nome bate
  msg('Conferindo segmentos dos bancos...');
  const jaB = new Set((await todos(sb, 'bancos_segmentos', 'banco,segmento')).map(s => semAc(s.banco + '|' + s.segmento)));
  const ligaCartoes = (banco, texto) => String(texto || '').split(';').map(t => t.trim()).filter(Boolean).map(t => {
    const w = palNome(t.replace(/\(.*?\)/g, ''), banco).sort().join(' ');
    const p = PLAN.P.find(p => pal(p.r.banco).some(x => pal(banco).includes(x)) && palNome(p.r.nome_cartao, p.r.banco).sort().join(' ') === w);
    return p ? idPorChave[p.k] : null;
  }).filter(Boolean);
  const segs = PLAN.segs.filter(s => !jaB.has(semAc(s.banco + '|' + s.segmento))).map(s => ({
    banco: txt(s.banco), segmento: txt(s.segmento), posicao_regua: num(s.posicao_regua), renda_minima: num(s.renda_minima_rs), renda_minima_txt: num(s.renda_minima_rs) === null ? txt(s.renda_minima_rs) : null,
    investimento_minimo: num(s.investimento_minimo_rs), investimento_minimo_txt: num(s.investimento_minimo_rs) === null ? txt(s.investimento_minimo_rs) : null,
    outra_exigencia: txt(s.outra_exigencia), somente_convite: sim(s.somente_convite), cartoes_liberados: txt(s.cartoes_liberados), cartoes_ids: [...new Set(ligaCartoes(s.banco, s.cartoes_liberados))],
    isencao_relacionamento: txt(s.isencao_anuidade_relacionamento), bonus_pontos: txt(s.bonus_pontos), beneficio_sala_vip: txt(s.beneficio_sala_vip), como_subir: txt(s.como_subir),
    observacoes: txt(s.observacoes), fonte: txt(s.fonte_url), conferido_em: data(s.data_verificacao), a_confirmar: !semAc(s.a_confirmar).startsWith('nao') }));
  await inserirEmLotes(sb, 'bancos_segmentos', segs, msg, 'Segmentos');
  // 5. benefícios dos cartões e dos programas e bandeiras
  msg('Conferindo benefícios...');
  const kB = (b) => semAc([b.banco, b.nome_cartao, b.origem, b.beneficio].map(x => x || '').join('|'));
  const jaBen = new Set((await todos(sb, 'cartoes_beneficios', 'banco,nome_cartao,origem,beneficio')).map(kB));
  const ben = [];
  PLAN.benef.forEach(b => ben.push({ catalogo_id: idDe(b.banco, b.nome_cartao), banco: txt(b.banco), nome_cartao: txt(b.nome_cartao), categoria: txt(b.categoria), beneficio: txt(b.beneficio),
    como_usar: txt(b.como_usar), condicao: txt(b.condicao), fonte: txt(b.fonte_url), conferido_em: data(b.data_verificacao), a_confirmar: sim(b.a_confirmar) }));
  PLAN.progs.forEach(b => ben.push({ origem: txt(b.origem), tipo_origem: txt(b.tipo_origem), quais_cartoes: txt(b.quais_cartoes_dao_acesso), categoria: txt(b.categoria), beneficio: txt(b.beneficio),
    como_usar: txt(b.como_usar), condicao: txt(b.condicao), fonte: txt(b.fonte_url), conferido_em: data(b.data_verificacao), a_confirmar: sim(b.a_confirmar) }));
  const vistoB = new Set();
  await inserirEmLotes(sb, 'cartoes_beneficios', ben.filter(b => { const k = kB(b); if (jaBen.has(k) || vistoB.has(k)) return false; vistoB.add(k); return true; }), msg, 'Benefícios');
  // 6. salas, restaurantes e experiências de cada aeroporto
  if (PLAN.aero.length) {
    msg('Conferindo salas por aeroporto...');
    const kA = (a) => semAc([a.aeroporto_iata, a.terminal, a.sala].map(x => String(x ?? '').trim()).join('|'));
    const jaA = new Set((await todos(sb, 'salas_aeroportos', 'aeroporto_iata,terminal,sala')).map(kA)), vistoA = new Set();
    const aero = PLAN.aero.map(a => ({ aeroporto_iata: String(a.aeroporto_iata).trim().toUpperCase(), aeroporto_nome: txt(a.aeroporto_nome), cidade: txt(a.cidade), pais: txt(a.pais), terminal: txt(a.terminal),
      sala: txt(a.sala), tipo: TIPOS_AERO.includes(semAc(a.tipo).trim()) ? semAc(a.tipo).trim() : null, area: txt(a.area), priority_pass: simNao(a.priority_pass), loungekey: simNao(a.loungekey), dragonpass: simNao(a.dragonpass),
      outras_formas_acesso: txt(a.outras_formas_acesso), localizacao: txt(a.localizacao), horario: txt(a.horario), observacao: txt(a.observacao), fonte: txt(a.fonte_url), conferido_em: data(a.data_verificacao),
      a_confirmar: !semAc(a.a_confirmar).startsWith('nao') })).filter(a => { const k = kA(a); if (jaA.has(k) || vistoA.has(k)) return false; vistoA.add(k); return true; });
    await inserirEmLotes(sb, 'salas_aeroportos', aero, msg, 'Salas por aeroporto');
  }
  // 7. correções da planilha: entram como pendentes, para a equipe aceitar ou recusar
  msg('Conferindo correções...');
  const kC = (c) => semAc([c.banco, c.nome_cartao, c.campo, c.valor_atual, c.origem].map(x => x ?? '').join('|'));
  const jaC = new Set((await todos(sb, 'cartoes_correcoes', 'banco,nome_cartao,campo,valor_atual,origem')).map(kC));
  const corr = PLAN.corr.map(c => ({ catalogo_id: idDe(c.banco, c.nome_cartao), banco: txt(c.banco), nome_cartao: txt(c.nome_cartao), campo: txt(c.campo),
    valor_na_base: txt(c.valor_na_base), valor_atual: txt(c.valor_atual), fonte: txt(c.fonte_url), observacao: txt(c.observacao), origem: 'planilha', status: 'pendente' }));
  const vistoC = new Set();
  await inserirEmLotes(sb, 'cartoes_correcoes', corr.filter(c => { const k = kC(c); if (jaC.has(k) || vistoC.has(k)) return false; vistoC.add(k); return true; }), msg, 'Correções');
}
