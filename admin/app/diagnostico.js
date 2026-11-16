// Maktub Go: aba Diagnóstico do card (101-diagnostico-card.sql).
// Dois modelos: planejamento de viagem (29 perguntas, enviadas pela Nayara) e Gestão de Milhas (19 perguntas).
// Preenchimento rápido durante a reunião: nada é obrigatório, chips e Sim/Não onde couber, salva sozinho.
// Os administradores renomeiam, reordenam, escondem e acrescentam perguntas (configuracoes.diagnostico), sem mexer no código.
import { carregarAero } from '/admin/app/cot-colar.js?v=6';

/* ---------- modelos padrão ----------
   tipo: texto (uma linha) | longo | simnao | opcao (um chip) | multi (vários chips) | moeda | data | datas (ida e volta)
         pax (quantidade + quem são) | destinos | bancos | cartoes | programas | gasto | simnao2 | par | simnao_texto | texto_data
   sug: chips que completam o texto com um toque */
export const MODELOS_PADRAO = {
  viagem: [
    { k: 'motivo', t: 'Motivo da viagem', tipo: 'texto', sug: ['Lazer', 'Lua de mel', 'Aniversário', 'Família', 'Comemoração', 'Trabalho'] },
    { k: 'primeira_int', t: 'Primeira viagem internacional?', tipo: 'simnao' },
    { k: 'data_prevista', t: 'Data prevista', tipo: 'texto', ph: 'Ex.: segunda quinzena de maio' },
    { k: 'clima', t: 'Preferência de clima/estação', tipo: 'texto', sug: ['Calor', 'Frio', 'Neve', 'Primavera', 'Outono', 'Tanto faz'] },
    { k: 'sugestao_epoca', t: 'Sugestão (do consultor, sobre época)', tipo: 'texto' },
    { k: 'data_pre', t: 'Data pré-selecionada', tipo: 'datas' },
    { k: 'duracao', t: 'Duração da viagem', tipo: 'texto', ph: 'Ex.: 15 dias' },
    { k: 'flexivel', t: 'Flexibilidade', tipo: 'simnao' },
    { k: 'origem', t: 'Origem', tipo: 'texto', aero: true, ph: 'Cidade ou aeroporto' },
    { k: 'destino', t: 'Destino', tipo: 'texto' },
    { k: 'pax', t: 'Quantidade de passageiros, quem são e idades', tipo: 'pax' },
    { k: 'bagagem', t: 'Bagagens despachadas', tipo: 'opcao', op: [['0', 'Sem bagagem'], ['1', '1 por pessoa'], ['2', '2 por pessoa'], ['3', '3 por pessoa']] },
    { k: 'opcoes_destinos', t: 'Opções de destinos', tipo: 'destinos' },
    { k: 'hospedagem', t: 'Preferências de hospedagem', tipo: 'texto', sug: ['Hotel', 'Boutique', 'Resort', 'Apartamento', 'Pousada', 'Perto do centro'] },
    { k: 'indispensavel', t: 'Indispensável', tipo: 'texto' },
    { k: 'interesses', t: 'Interesses', tipo: 'texto', sug: ['Gastronomia', 'Cultura', 'Museus', 'Natureza', 'Praia', 'Compras', 'Vinhos', 'Vida noturna', 'Aventura'] },
    { k: 'restricoes', t: 'Restrições', tipo: 'texto' },
    { k: 'carro', t: 'Aluguel de carro', tipo: 'simnao' },
    { k: 'passaportes', t: 'Passaportes (já possuem? validade)', tipo: 'texto', sug: ['Todos têm', 'Precisa tirar', 'Vencendo'] },
    { k: 'deslocamento', t: 'Deslocamento interno', tipo: 'texto', sug: ['Trem', 'Voo', 'Carro', 'Transfer'] },
    { k: 'ingressos', t: 'Ingressos', tipo: 'texto' },
    { k: 'roteiro', t: 'Querem roteiro?', tipo: 'simnao' },
    { k: 'gostam', t: 'O que gostam de fazer', tipo: 'texto' },
    { k: 'locais', t: 'Preferências por locais (lugares que já ouviram falar e querem visitar)', tipo: 'texto' },
    { k: 'ritmo', t: 'Ritmo de viagem', tipo: 'opcao', op: [['Tranquilo', 'Tranquilo'], ['Equilibrado', 'Equilibrado'], ['Intenso', 'Intenso']] },
    { k: 'bebem', t: 'Bebem?', tipo: 'simnao' },
    { k: 'orcamento', t: 'Orçamento prévio', tipo: 'moeda' },
    { k: 'pagamento', t: 'Preferências de pagamento', tipo: 'texto', sug: ['Pix', 'Cartão parcelado', 'Pix e cartão'] },
    { k: 'obs', t: 'Observações, orientações e sugestões prévias do consultor', tipo: 'longo' }
  ],
  gestao: [
    { k: 'como_chegou', t: 'Como chegou (indicação de quem, site, evento)', tipo: 'texto', sug: ['Indicação', 'Site', 'Instagram', 'Evento'] },
    { k: 'profissao', t: 'Profissão / empresa', tipo: 'texto' },
    { k: 'gasto', t: 'Gasto mensal total (cartões + Pix) e quanto do Pix poderia ir para o crédito', tipo: 'gasto' },
    { k: 'moeda_estrangeira', t: 'Parte do gasto em moeda estrangeira', tipo: 'texto' },
    { k: 'bancos', t: 'Bancos em que tem relacionamento e segmento (ex.: Prime, Select)', tipo: 'bancos' },
    { k: 'cartoes', t: 'Cartões atuais: banco, nome, limite e anuidade (paga ou isenta)', tipo: 'cartoes' },
    { k: 'programas', t: 'Programas em que já tem cadastro e saldos aproximados', tipo: 'programas' },
    { k: 'vencendo', t: 'Pontos vencendo ou já perdidos', tipo: 'texto' },
    { k: 'experiencia', t: 'Já transferiu com bônus? Já usou milhas para emitir?', tipo: 'simnao2', L: ['Transferiu com bônus', 'Usou milhas para emitir'] },
    { k: 'cia_aeroporto', t: 'Companhia aérea que mais voa e aeroporto de origem', tipo: 'par', L: ['Companhia', 'Aeroporto'], aeroB: true },
    { k: 'viagens_ano', t: 'Quantas viagens por ano (trabalho e lazer) e com quem viaja', tipo: 'texto' },
    { k: 'viagens_12m', t: 'Viagens planejadas nos próximos 12 meses (destino e época)', tipo: 'texto' },
    { k: 'interesse', t: 'Interesse em executiva, sala VIP, hotel melhor', tipo: 'multi', op: [['executiva', 'Executiva'], ['sala_vip', 'Sala VIP'], ['hotel', 'Hotel melhor']] },
    { k: 'sala_vip', t: 'Usa sala VIP hoje? Com qual cartão?', tipo: 'simnao_texto', ph: 'Com qual cartão' },
    { k: 'dor', t: 'Maior dor hoje com milhas e cartões', tipo: 'texto' },
    { k: 'decisor', t: 'Quem decide a contratação', tipo: 'texto' },
    { k: 'objecoes', t: 'Objeções levantadas', tipo: 'texto' },
    { k: 'proximo', t: 'Próximo passo combinado e data', tipo: 'texto_data' },
    { k: 'obs', t: 'Observações do SDR / closer', tipo: 'longo' }
  ]
};
export const NOME_MODELO = { viagem: 'Diagnóstico de planejamento de viagem', gestao: 'Diagnóstico da Gestão de Milhas' };
export const LIMITES_PADRAO = { valor: 15000, margem: 3000, europa: true };
const PROGRAMAS = ['Esfera', 'Livelo', 'Azul', 'Smiles', 'Latam'];
export const TIPOS_NOVOS = [['texto', 'Texto curto'], ['longo', 'Texto longo'], ['simnao', 'Sim ou Não'], ['moeda', 'Valor em reais'], ['data', 'Data']];

const cfgDiag = (cfg) => (cfg && cfg.diagnostico) || {};
export const limites = (cfg) => ({ ...LIMITES_PADRAO, ...(cfgDiag(cfg).limites || {}) });
// perguntas do modelo: as do padrão com o que a administração mudou (título, ordem, escondida) e as que ela acrescentou
export function campos(tipo, cfg, comOcultos) {
  const pad = MODELOS_PADRAO[tipo] || [], ed = (cfgDiag(cfg).modelos || {})[tipo];
  let L;
  if (!Array.isArray(ed) || !ed.length) L = pad.map(c => ({ ...c }));
  else {
    L = ed.map(e => { const p = pad.find(c => c.k === e.k); return p ? { ...p, t: e.t || p.t, oculto: !!e.oculto } : (e.tipo ? { k: e.k, t: e.t, tipo: e.tipo, oculto: !!e.oculto, novo: true } : null); }).filter(Boolean);
    pad.forEach(p => { if (!L.some(c => c.k === p.k)) L.push({ ...p }); }); // pergunta nova do padrão entra no fim
  }
  return comOcultos ? L : L.filter(c => !c.oculto);
}

/* ---------- valores ---------- */
const vazio = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
export function numero(v) {
  if (v == null || v === '') return null; if (typeof v === 'number') return v;
  let t = String(v).toLowerCase().replace(/r\$|\s/g, ''); const mil = /mil|k$/.test(t); t = t.replace(/mil|k/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = parseFloat(t); return isNaN(n) ? null : n * (mil ? 1000 : 1);
}
export function preenchido(c, v) {
  if (vazio(v)) return false;
  switch (c.tipo) {
    case 'datas': return !!(v.ida || v.volta);
    case 'pax': return !!(v.n || String(v.quem || '').trim());
    case 'destinos': case 'bancos': case 'cartoes': case 'programas': return Array.isArray(v) && v.some(x => Object.values(x || {}).some(y => y !== '' && y != null && y !== false));
    case 'gasto': return ['cartoes', 'pix', 'pix_credito'].some(k => !vazio(v[k]));
    case 'simnao2': case 'par': return !vazio(v.a) || !vazio(v.b);
    case 'simnao_texto': return !vazio(v.sn) || !vazio(v.txt);
    case 'texto_data': return !vazio(v.txt) || !vazio(v.data);
    default: return typeof v === 'object' ? false : String(v).trim() !== '';
  }
}
export function progresso(L, resp) { resp = resp || {}; return { n: L.filter(c => preenchido(c, resp[c.k])).length, total: L.length }; }
const dBR = (iso) => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '';
const brl = (v) => { const n = numero(v); return n == null ? String(v || '') : 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); };
const sn = (v) => v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : '';
// a resposta em texto (cópia para o WhatsApp, ficha da pessoa, IA)
export function texto(c, v) {
  if (!preenchido(c, v)) return '';
  switch (c.tipo) {
    case 'simnao': return sn(v);
    case 'opcao': return ((c.op || []).find(o => o[0] === v) || [, v])[1];
    case 'multi': return (Array.isArray(v) ? v : []).map(x => ((c.op || []).find(o => o[0] === x) || [, x])[1]).join(', ');
    case 'moeda': return brl(v);
    case 'data': return dBR(v);
    case 'datas': return v.ida && v.volta ? `${dBR(v.ida)} a ${dBR(v.volta)}` : v.ida ? 'ida ' + dBR(v.ida) : 'volta ' + dBR(v.volta);
    case 'pax': return [v.n ? v.n + (+v.n === 1 ? ' passageiro' : ' passageiros') : '', String(v.quem || '').trim()].filter(Boolean).join(': ');
    case 'destinos': return v.filter(x => x && x.nome).map(x => x.nome + (x.obrig ? ' (obrigatório)' : '')).join(', ');
    case 'bancos': return v.filter(x => x && x.banco).map(x => x.banco + (x.segmento ? ' (' + x.segmento + ')' : '')).join('; ');
    case 'cartoes': return v.filter(x => x && (x.banco || x.nome)).map(x => [[x.banco, x.nome].filter(Boolean).join(' '), x.limite ? 'limite ' + brl(x.limite) : '', x.anuidade ? 'anuidade ' + x.anuidade : ''].filter(Boolean).join(', ')).join('; ');
    case 'programas': return v.filter(x => x && x.programa).map(x => x.programa + (x.saldo ? ' ' + x.saldo : '')).join('; ');
    case 'gasto': return [v.cartoes ? 'cartões ' + brl(v.cartoes) + '/mês' : '', v.pix ? 'Pix ' + brl(v.pix) + '/mês' : '', v.pix_credito ? 'do Pix, poderia ir para o crédito ' + brl(v.pix_credito) + '/mês' : ''].filter(Boolean).join('; ');
    case 'simnao2': return (c.L || ['', '']).map((l, i) => { const x = sn(v[i ? 'b' : 'a']); return x ? `${l}: ${x}` : ''; }).filter(Boolean).join(' · ');
    case 'par': return (c.L || ['', '']).map((l, i) => { const x = String(v[i ? 'b' : 'a'] || '').trim(); return x ? `${l}: ${x}` : ''; }).filter(Boolean).join(' · ');
    case 'simnao_texto': return [sn(v.sn), String(v.txt || '').trim()].filter(Boolean).join(', ');
    case 'texto_data': return [String(v.txt || '').trim(), v.data ? dBR(v.data) : ''].filter(Boolean).join(' · ');
    default: return String(v).trim();
  }
}
// "Copiar diagnóstico": títulos em negrito no padrão do WhatsApp, pulando o que está vazio
export function textoCopiar(tipo, L, resp, cliente) {
  const ls = L.map(c => { const t = texto(c, (resp || {})[c.k]); return t ? `*${c.t}:* ${t}` : ''; }).filter(Boolean);
  return `*${NOME_MODELO[tipo]}${cliente ? ': ' + cliente : ''}*\n\n` + ls.join('\n');
}

/* ---------- destaque do diagnóstico de viagem: valor, margem ou Europa (limites editáveis pela administração) ---------- */
const EUROPA_ISO = 'PT ES FR IT GB DE NL CH GR BE AT CZ HU IE DK SE NO IS HR PL MT FI LU MC VA SI SK RO BG EE LV LT CY AD SM ME AL RS BA MK'.split(' ');
const EUROPA_CIDADES = 'europa|paris|roma|lisboa|porto|madri|madrid|barcelona|sevilha|londres|london|edimburgo|dublin|amsterda|amsterdam|berlim|munique|frankfurt|praga|viena|budapeste|atenas|santorini|mykonos|florenca|veneza|milao|napoles|toscana|amalfi|sicilia|zurique|genebra|interlaken|bruxelas|bruges|copenhague|estocolmo|oslo|helsinque|reykjavik|dubrovnik|split|algarve|nice|cannes|provence|monaco|salzburgo|cracovia|varsovia|malta|chipre'.split('|');
const semAc = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let NOMES_PAISES = null, AEROS = null;
function nomesPaises() {
  if (NOMES_PAISES) return NOMES_PAISES;
  NOMES_PAISES = [];
  try { ['pt-BR', 'en'].forEach(l => { const dn = new Intl.DisplayNames([l], { type: 'region' }); EUROPA_ISO.forEach(k => { const n = semAc(dn.of(k)); if (n && n.length > 3) NOMES_PAISES.push(n); }); }); } catch (_) {}
  NOMES_PAISES.push('inglaterra', 'escocia', 'holanda');
  return NOMES_PAISES;
}
// carrega a lista de aeroportos uma vez (o mesmo arquivo do cotador) para reconhecer códigos como LIS ou CDG
export async function prepararEuropa() { if (!AEROS) AEROS = await carregarAero().catch(() => ({})); }
export function ehEuropa(txt) {
  const t = semAc(txt); if (!t.trim()) return false;
  const palavra = (w) => new RegExp('(^|[^a-z])' + w + '([^a-z]|$)').test(t);
  if (EUROPA_CIDADES.some(palavra) || nomesPaises().some(palavra)) return true;
  if (AEROS) return (String(txt).match(/\b[A-Z]{3}\b/g) || []).some(c => AEROS[c] && EUROPA_ISO.includes(AEROS[c][1]));
  return false;
}
// motivo do destaque (vazio: o diagnóstico fica recolhido)
export function motivoDestaque({ valor, margem, destino, resp }, lim) {
  const orc = numero((resp || {}).orcamento);
  if (+valor && +valor >= lim.valor) return 'valor estimado a partir de ' + brl(lim.valor);
  if (orc && orc >= lim.valor) return 'orçamento prévio a partir de ' + brl(lim.valor);
  if (+margem && +margem > lim.margem) return 'margem prevista acima de ' + brl(lim.margem);
  if (lim.europa && ehEuropa(destino)) return 'destino na Europa';
  return '';
}

/* ---------- ponte com o resto do app ---------- */
// respostas antigas da "Qualificação do SDR" (qualificacao do card) e do formulário do site entram nos campos equivalentes
export function deQualificacao(q, so) {
  q = q || {}; so = so || {}; const r = {};
  const gc = q.gasto || so.gasto_mensal, px = so.movimentacao_pix;
  if (gc || px) r.gasto = { cartoes: gc || '', pix: px || '', pix_credito: '' };
  if (q.cartoes) r.cartoes = [{ banco: '', nome: q.cartoes, limite: '', anuidade: '' }];
  if (q.programas || so.programas) r.programas = [{ programa: q.programas || so.programas, saldo: '' }];
  if (q.viagens || so.viagens_ano) r.viagens_ano = q.viagens || so.viagens_ano;
  if (q.objetivo || so.objetivo) r.viagens_12m = q.objetivo || so.objetivo;
  if (q.decisor) r.decisor = q.decisor;
  if (so.como_conheceu || so.indicado_por) r.como_chegou = [so.como_conheceu, so.indicado_por ? 'indicação de ' + so.indicado_por : ''].filter(Boolean).join(', ');
  return r;
}
// o que a proposta com IA, a calculadora e a regra de passar ao closer leem (qualificacao), a partir do diagnóstico
export function paraQualificacao(L, resp) {
  resp = resp || {}; const c = (k) => L.find(x => x.k === k) || MODELOS_PADRAO.gestao.find(x => x.k === k);
  const g = resp.gasto || {};
  return { gasto: g.cartoes || '', cartoes: [texto(c('bancos'), resp.bancos), texto(c('cartoes'), resp.cartoes)].filter(Boolean).join(' · '), programas: texto(c('programas'), resp.programas),
    viagens: texto(c('viagens_ano'), resp.viagens_ano), objetivo: [texto(c('viagens_12m'), resp.viagens_12m), texto(c('dor'), resp.dor)].filter(Boolean).join(' · '), decisor: texto(c('decisor'), resp.decisor) };
}
// cotação montada a partir do card: origem, destino, datas, passageiros e bagagem
export function paraCotacao(resp) {
  resp = resp || {}; const d = resp.data_pre || {}, p = resp.pax || {};
  return { origem: String(resp.origem || '').trim(), destino: String(resp.destino || '').trim(), ida: d.ida || '', volta: d.volta || '', pessoas: p.n ? String(p.n) : '', bagagem: resp.bagagem || '' };
}
// ficha da Gestão do cliente que fechou: perfil, bancos, cartões e programas, sem redigitar
export function paraFicha(L, resp) {
  resp = resp || {}; const c = (k) => L.find(x => x.k === k) || MODELOS_PADRAO.gestao.find(x => x.k === k), g = resp.gasto || {}, ca = resp.cia_aeroporto || {};
  return { gasto: g.cartoes || '', pix: g.pix_credito || '', programas: texto(c('programas'), resp.programas), viagens: texto(c('viagens_ano'), resp.viagens_ano),
    companhia: ca.a || '', aeroporto: /^[A-Za-z]{3}$/.test(String(ca.b || '').trim()) ? String(ca.b).trim().toUpperCase() : '', aeroportoTxt: ca.b || '',
    executiva: Array.isArray(resp.interesse) && resp.interesse.includes('executiva') ? true : null,
    bancos: (resp.bancos || []).filter(x => x && x.banco), cartoes: texto(c('cartoes'), resp.cartoes), salaVip: texto(c('sala_vip'), resp.sala_vip) };
}

/* ---------- formulário ---------- */
const h = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inp = (dp, v, o = {}) => `<input data-dp="${dp}" value="${h(v)}" ${o.tipo ? `type="${o.tipo}"` : ''} ${o.ph ? `placeholder="${h(o.ph)}"` : ''} ${o.im ? `inputmode="${o.im}"` : ''} ${o.aero ? 'data-aero="cidade" autocomplete="off"' : ''} maxlength="${o.max || 300}">`;
const chips = (lista, sel, dset, multi) => `<div class="chips dg-chips">${lista.map(([v, l]) => `<button type="button" data-dset="${dset}" data-dv="${h(v)}" class="${(multi ? (sel || []).includes(v) : sel === v) ? 'on' : ''}">${h(l)}</button>`).join('')}</div>`;
const SN = [['sim', 'Sim'], ['nao', 'Não']];
function widget(c, v) {
  v = v ?? null;
  switch (c.tipo) {
    case 'longo': return `<textarea data-dp="" rows="3" maxlength="4000">${h(v || '')}</textarea>`;
    case 'simnao': return chips(SN, v, '');
    case 'opcao': return chips(c.op, v, '');
    case 'multi': return chips(c.op, v || [], '', true);
    case 'moeda': return inp('', v || '', { im: 'decimal', ph: 'R$' });
    case 'data': return inp('', v || '', { tipo: 'date' });
    case 'datas': return `<div class="duas-col"><label class="fl"><span>Ida</span>${inp('ida', (v || {}).ida || '', { tipo: 'date' })}</label><label class="fl"><span>Volta</span>${inp('volta', (v || {}).volta || '', { tipo: 'date' })}</label></div>`;
    case 'pax': return `<div class="dg-pax"><label class="fl"><span>Quantos</span>${inp('n', (v || {}).n || '', { tipo: 'number', im: 'numeric' })}</label><label class="fl"><span>Quem são e idades</span>${inp('quem', (v || {}).quem || '', { ph: 'Ex.: casal, filhos de 8 e 12' })}</label></div>`;
    case 'gasto': return `<div class="dg-3"><label class="fl"><span>Cartões (R$/mês)</span>${inp('cartoes', (v || {}).cartoes || '', { im: 'decimal' })}</label><label class="fl"><span>Pix (R$/mês)</span>${inp('pix', (v || {}).pix || '', { im: 'decimal' })}</label><label class="fl"><span>Do Pix, poderia ir para o crédito (R$/mês)</span>${inp('pix_credito', (v || {}).pix_credito || '', { im: 'decimal' })}</label></div>`;
    case 'simnao2': return (c.L || []).map((l, i) => `<div class="dg-sub">${h(l)}</div>${chips(SN, (v || {})[i ? 'b' : 'a'], i ? 'b' : 'a')}`).join('');
    case 'par': return `<div class="duas-col">${(c.L || []).map((l, i) => `<label class="fl"><span>${h(l)}</span>${inp(i ? 'b' : 'a', (v || {})[i ? 'b' : 'a'] || '', { aero: i && c.aeroB })}</label>`).join('')}</div>`;
    case 'simnao_texto': return `${chips(SN, (v || {}).sn, 'sn')}${inp('txt', (v || {}).txt || '', { ph: c.ph || '' })}`;
    case 'texto_data': return `<div class="dg-pax"><label class="fl"><span>O que ficou combinado</span>${inp('txt', (v || {}).txt || '')}</label><label class="fl"><span>Data</span>${inp('data', (v || {}).data || '', { tipo: 'date' })}</label></div>`;
    case 'destinos': { const L = Array.isArray(v) && v.length ? v : [{ nome: '', obrig: false }];
      return L.map((x, i) => `<div class="dg-linha">${inp(`r:${i}:nome`, x.nome || '', { ph: 'Destino' })}<button type="button" class="dg-ob ${x.obrig ? 'on' : ''}" data-dset="r:${i}:obrig" data-dv="${x.obrig ? '' : '1'}">${x.obrig ? 'Obrigatório' : 'Opcional'}</button><button type="button" class="dg-x" data-ddel="${i}" aria-label="Tirar">×</button></div>`).join('') + '<button type="button" class="dg-mais" data-dadd="1">+ Destino</button>'; }
    case 'bancos': { const L = Array.isArray(v) && v.length ? v : [{ banco: '', segmento: '' }];
      return L.map((x, i) => `<div class="dg-linha">${inp(`r:${i}:banco`, x.banco || '', { ph: 'Banco' })}${inp(`r:${i}:segmento`, x.segmento || '', { ph: 'Segmento' })}<button type="button" class="dg-x" data-ddel="${i}" aria-label="Tirar">×</button></div>`).join('') + '<button type="button" class="dg-mais" data-dadd="1">+ Banco</button>'; }
    case 'cartoes': { const L = Array.isArray(v) && v.length ? v : [{ banco: '', nome: '', limite: '', anuidade: '' }];
      return L.map((x, i) => `<div class="dg-cartao"><div class="dg-linha">${inp(`r:${i}:banco`, x.banco || '', { ph: 'Banco' })}${inp(`r:${i}:nome`, x.nome || '', { ph: 'Cartão' })}<button type="button" class="dg-x" data-ddel="${i}" aria-label="Tirar">×</button></div>
        <div class="dg-linha">${inp(`r:${i}:limite`, x.limite || '', { ph: 'Limite', im: 'decimal' })}${chips([['paga', 'Anuidade paga'], ['isenta', 'Isenta']], x.anuidade, `r:${i}:anuidade`)}</div></div>`).join('') + '<button type="button" class="dg-mais" data-dadd="1">+ Cartão</button>'; }
    case 'programas': { const L = Array.isArray(v) ? v : [], tem = (p) => L.some(x => x.programa === p), outros = L.filter(x => !PROGRAMAS.includes(x.programa));
      return `<div class="chips dg-chips">${PROGRAMAS.map(p => `<button type="button" data-dprog="${p}" class="${tem(p) ? 'on' : ''}">${p}</button>`).join('')}<button type="button" data-dadd="1">+ Outro</button></div>`
        + L.map((x, i) => `<div class="dg-linha">${PROGRAMAS.includes(x.programa) ? `<span class="dg-prog">${h(x.programa)}</span>` : inp(`r:${i}:programa`, x.programa || '', { ph: 'Programa' })}${inp(`r:${i}:saldo`, x.saldo || '', { ph: 'Saldo aproximado' })}<button type="button" class="dg-x" data-ddel="${i}" aria-label="Tirar">×</button></div>`).join('') + (outros.length ? '' : ''); }
    default: return inp('', v || '', { ph: c.ph || '', aero: c.aero }) + (c.sug ? `<div class="chips dg-chips dg-sug">${c.sug.map(s => `<button type="button" data-dsug="${h(s)}">${h(s)}</button>`).join('')}</div>` : '');
  }
}
export const htmlCampo = (c, v, i) => `<div class="dg-c ${preenchido(c, v) ? 'ok' : ''}" data-dk="${h(c.k)}"><div class="dg-t"><span class="dg-n">${i + 1}</span>${h(c.t)}</div>${widget(c, v)}</div>`;
export function estilos() {
  if (document.getElementById('dgEstilo')) return;
  const s = document.createElement('style'); s.id = 'dgEstilo';
  s.textContent = `.dg{margin-top:4px}.dg-c{padding:12px 0;border-top:1px solid var(--linha)}.dg-c:first-child{border-top:0}
.dg-t{display:flex;gap:8px;align-items:baseline;font-size:16px;color:var(--verde);font-weight:500;margin-bottom:8px}.dg-n{flex:none;min-width:24px;font-size:14px;color:var(--tinta-3);font-weight:400}
.dg-c.ok .dg-n{color:var(--dourado-claro,#715E32);font-weight:600}
.dg input,.dg textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:10px 12px;border:1px solid var(--linha);border-radius:12px;background:#fff;color:var(--tinta)}
.dg-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}.dg-chips button{border-radius:999px}.dg-sug button{font-size:14px;padding:6px 12px}
.dg-sub{font-size:14px;color:var(--tinta-2);margin:8px 0 0}.dg-sub:first-child{margin-top:0}
.dg-linha{display:flex;gap:6px;align-items:center;margin:6px 0}.dg-linha input{flex:1;min-width:0}.dg-linha .dg-chips{margin:0;flex:none}
.dg-cartao{border:1px solid var(--linha);border-radius:12px;padding:6px 10px;margin:6px 0}
.dg-x{flex:none;background:none;border:0;font-size:22px;color:var(--tinta-3);cursor:pointer;padding:4px 8px;line-height:1}
.dg-ob{flex:none;border:1px solid var(--linha);background:#fff;border-radius:999px;padding:8px 12px;font:inherit;font-size:14px;cursor:pointer;color:var(--tinta-2)}.dg-ob.on{background:var(--verde);color:#fff;border-color:var(--verde)}
.dg-mais{background:none;border:0;color:var(--verde);text-decoration:underline;font:inherit;font-size:16px;cursor:pointer;padding:8px 0}
.dg-prog{flex:none;min-width:70px;font-size:16px;color:var(--verde)}
.dg-pax{display:grid;grid-template-columns:110px 1fr;gap:8px}.dg-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
@media(max-width:700px){.dg-3{grid-template-columns:1fr}}
.dg-topo{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 6px}.dg-prog-n{font-size:14px;color:var(--tinta-2)}.dg-salvo{font-size:14px;color:var(--tinta-3);margin-left:auto}
.dg-acoes{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 8px}.dg-acoes button{flex:1 1 auto}
.cb.dg-dest{border-color:var(--dourado,#A88B4A);box-shadow:inset 3px 0 0 var(--dourado,#A88B4A)}.dg-motivo{font-size:14px;color:var(--dourado-claro,#715E32);margin:0 0 8px}
.dg-fecha{text-align:center;margin:6px 0 4px}`;
  document.head.appendChild(s);
}
/* liga o formulário: grava sozinho (1,2 s depois da última mudança) e redesenha só a pergunta que mudou de forma.
   o: { el, L, resp, salvar(resp) => Promise<{erro}|{em}>, aoMudar(resp), status (onde aparece o "Salvo às") } */
export function ligar(o) {
  const { el, L } = o; let resp = o.resp || {}, tm = null, gravando = null;
  const achar = (k) => L.find(c => c.k === k);
  const set = (k, dp, v) => {
    const c = achar(k); if (!c) return;
    if (!dp) resp[k] = v;
    else if (dp.startsWith('r:')) { const [, i, campo] = dp.split(':'); const a = Array.isArray(resp[k]) ? resp[k].slice() : []; while (a.length <= +i) a.push({}); a[+i] = { ...a[+i], [campo]: v }; resp[k] = a; }
    else resp[k] = { ...(resp[k] && typeof resp[k] === 'object' && !Array.isArray(resp[k]) ? resp[k] : {}), [dp]: v };
  };
  const redesenha = (k) => { const box = el.querySelector(`.dg-c[data-dk="${k}"]`); if (!box) return; const i = L.findIndex(c => c.k === k); box.outerHTML = htmlCampo(achar(k), resp[k], i); };
  const marca = (k) => { const box = el.querySelector(`.dg-c[data-dk="${k}"]`); if (box) box.classList.toggle('ok', preenchido(achar(k), resp[k])); };
  const salvarJa = async () => {
    clearTimeout(tm); tm = null; const st = o.status;
    if (st) st.textContent = 'Salvando...';
    gravando = Promise.resolve(o.salvar(JSON.parse(JSON.stringify(resp))));
    const r = await gravando; gravando = null;
    if (st) st.textContent = r && r.erro ? 'Não salvou: ' + r.erro : 'Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  const mudou = (k) => { marca(k); if (o.aoMudar) o.aoMudar(resp); clearTimeout(tm); tm = setTimeout(salvarJa, 1200); if (o.status) o.status.textContent = 'Salvando...'; };
  el.addEventListener('input', (e) => { const i = e.target.closest('[data-dp]'), box = e.target.closest('.dg-c'); if (!i || !box) return; set(box.dataset.dk, i.dataset.dp, i.value); mudou(box.dataset.dk); });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); const box = b && b.closest('.dg-c'); if (!b || !box) return; const k = box.dataset.dk, c = achar(k);
    if (b.dataset.dsug != null) { const cur = String(resp[k] || '').trim(), s = b.dataset.dsug; if (!cur.split(/,\s*/).includes(s)) { set(k, '', cur ? cur + ', ' + s : s); const i = box.querySelector('[data-dp=""]'); if (i) i.value = resp[k]; mudou(k); } return; }
    if (b.dataset.dset != null) {
      const dp = b.dataset.dset, v = b.dataset.dv;
      if (c.tipo === 'multi') { const a = Array.isArray(resp[k]) ? resp[k].slice() : []; resp[k] = a.includes(v) ? a.filter(x => x !== v) : a.concat(v); }
      else if (dp.endsWith(':obrig')) set(k, dp, !!v);
      else { const atual = !dp ? resp[k] : dp.startsWith('r:') ? ((resp[k] || [])[+dp.split(':')[1]] || {})[dp.split(':')[2]] : (resp[k] || {})[dp]; set(k, dp, atual === v ? '' : v); }
      redesenha(k); mudou(k); return;
    }
    if (b.dataset.dprog) { const a = Array.isArray(resp[k]) ? resp[k].slice() : [], p = b.dataset.dprog; resp[k] = a.some(x => x.programa === p) ? a.filter(x => x.programa !== p) : a.concat({ programa: p, saldo: '' }); redesenha(k); mudou(k); return; }
    if (b.dataset.dadd) { const a = Array.isArray(resp[k]) ? resp[k].slice() : []; if (!a.length && c.tipo !== 'programas') a.push({}); a.push(c.tipo === 'programas' ? { programa: '', saldo: '' } : {}); resp[k] = a; redesenha(k); const ins = el.querySelectorAll(`.dg-c[data-dk="${k}"] input`); if (ins.length) ins[ins.length - (c.tipo === 'cartoes' ? 3 : c.tipo === 'programas' ? 2 : c.tipo === 'bancos' ? 2 : 1)].focus(); return; }
    if (b.dataset.ddel != null) { const a = Array.isArray(resp[k]) ? resp[k].slice() : []; a.splice(+b.dataset.ddel, 1); resp[k] = a; redesenha(k); mudou(k); }
  });
  // sair do card no meio da digitação: grava na hora
  const fora = () => { if (tm) salvarJa(); };
  window.addEventListener('pagehide', fora); document.addEventListener('visibilitychange', () => { if (document.hidden) fora(); });
  return { resp: () => resp, salvarJa: () => tm ? salvarJa() : gravando, aplicar: (novas) => { Object.entries(novas).forEach(([k, v]) => { resp[k] = v; redesenha(k); }); if (o.aoMudar) o.aoMudar(resp); return salvarJa(); } };
}

/* ---------- IA: sugestões a partir do resumo do Granola (função diagnostico-sugerir). Nada é gravado sem a pessoa marcar ---------- */
export async function sugerir(sb, tipo, L, texto) {
  const campos = L.map(c => ({ k: c.k, t: c.t, tipo: c.tipo, op: c.op ? c.op.map(o => o[0]) : undefined, L: c.L }));
  const { data, error } = await sb.functions.invoke('diagnostico-sugerir', { body: { modelo: tipo, campos, texto } });
  if (error) {
    let m = error.message || ''; try { const j = await error.context.json(); m = j.erro || m; } catch (_) {}
    if (/not found|404/i.test(m) || (error.context && error.context.status === 404)) m = 'A sugestão pela IA ainda não está publicada no Supabase (função diagnostico-sugerir).';
    return { erro: m };
  }
  if (data && data.erro) return { erro: data.erro };
  return { sugestoes: (data && data.sugestoes) || {} };
}
export function folhaSugestoes(L, resp, sug) {
  return new Promise((ok) => {
    const itens = L.filter(c => sug[c.k] != null && preenchido(c, sug[c.k]));
    const el = document.createElement('div'); el.className = 'folha';
    el.innerHTML = `<div class="folha-fundo"></div><div class="folha-caixa"><div class="ac-ftit">Sugestões do resumo do Granola</div>
      <p class="ac-fl">${itens.length ? 'Confira e marque o que entra no diagnóstico. As perguntas já respondidas vêm desmarcadas.' : 'A IA não encontrou respostas no resumo.'}</p>
      ${itens.map(c => { const ja = preenchido(c, resp[c.k]); return `<label class="fc" style="align-items:flex-start;margin:8px 0"><input type="checkbox" data-k="${h(c.k)}" ${ja ? '' : 'checked'}><span><b style="font-weight:600">${h(c.t)}</b><br>${h(texto(c, sug[c.k]))}${ja ? `<br><small style="color:var(--tinta-3)">Hoje: ${h(texto(c, resp[c.k]))}</small>` : ''}</span></label>`; }).join('')}
      <div class="duas-col" style="margin-top:10px"><button type="button" class="ac-sec" data-a="0">Voltar</button>${itens.length ? '<button type="button" class="ac-prim" data-a="ok">Usar as marcadas</button>' : ''}</div></div>`;
    const fim = (v) => { el.remove(); ok(v); };
    el.querySelector('.folha-fundo').onclick = () => fim(null); el.querySelector('[data-a="0"]').onclick = () => fim(null);
    const b = el.querySelector('[data-a="ok"]'); if (b) b.onclick = () => { const o = {}; el.querySelectorAll('input[data-k]:checked').forEach(i => { o[i.dataset.k] = sug[i.dataset.k]; }); fim(o); };
    document.body.appendChild(el);
  });
}

/* ---------- edição dos modelos pela administração (Comissões e regras) ---------- */
export function htmlAdmin(cfg) {
  const lim = limites(cfg), brlN = (v) => String(v ?? '');
  const lista = (tipo) => campos(tipo, cfg, true).map((c, i, A) => `<div class="dg-ad" data-tipo="${tipo}" data-k="${h(c.k)}" ${c.novo ? `data-novo="${h(c.tipo)}"` : ''}>
      <input value="${h(c.t)}" aria-label="Pergunta ${i + 1}" maxlength="200">
      <button type="button" class="mini" data-adm="sobe" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button type="button" class="mini" data-adm="desce" ${i < A.length - 1 ? '' : 'disabled'} aria-label="Descer">↓</button>
      <label class="fc" style="margin:0"><input type="checkbox" data-adm="oculto" ${c.oculto ? '' : 'checked'}><span>Usar</span></label></div>`).join('');
  return `<div class="secao">Diagnóstico do card</div>
    <form class="bloco form" id="fDiagCfg">
      <div class="sub" style="margin:0 0 6px">O diagnóstico de viagem abre em destaque no card quando o valor estimado (ou o orçamento prévio) chega ao limite, a margem prevista passa do limite ou o destino é na Europa. Nos demais cards de viagem, fica recolhido. Na Gestão de Milhas, sempre aparece.</div>
      <div class="duas-col"><label class="fl"><span>Valor a partir de (R$)</span><input name="dg_valor" inputmode="decimal" value="${h(brlN(lim.valor))}"></label><label class="fl"><span>Margem acima de (R$)</span><input name="dg_margem" inputmode="decimal" value="${h(brlN(lim.margem))}"></label></div>
      <label class="fc"><input type="checkbox" name="dg_europa" ${lim.europa ? 'checked' : ''}><span>Destino na Europa também abre em destaque</span></label>
      ${['viagem', 'gestao'].map(tipo => `<details style="margin-top:10px"><summary class="sub" style="cursor:pointer;margin:0"><b>${NOME_MODELO[tipo]}</b>: renomear, reordenar, usar ou não cada pergunta</summary>
        <div class="dg-adl" data-lista="${tipo}">${lista(tipo)}</div>
        <div class="duas-col" style="margin-top:6px"><label class="fl"><span>Nova pergunta</span><input data-novo-t="${tipo}" maxlength="200" placeholder="Escreva a pergunta"></label><label class="fl"><span>Tipo</span><select data-novo-tipo="${tipo}">${TIPOS_NOVOS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label></div>
        <button type="button" class="sec" data-novo="${tipo}" style="width:100%">+ Acrescentar pergunta</button></details>`).join('')}
      <div class="sub">Pergunta que deixa de ser usada sai do formulário, mas as respostas já dadas ficam guardadas.</div>
      <button class="zap" type="submit" style="margin-top:8px">Salvar diagnóstico</button>
    </form>`;
}
export function ligarAdmin(form, salvar) {
  if (!document.getElementById('dgAdEst')) { const s = document.createElement('style'); s.id = 'dgAdEst'; s.textContent = '.dg-ad{display:flex;gap:6px;align-items:center;padding:6px 0;border-top:1px solid var(--linha)}.dg-ad>input{flex:1;min-width:0;font:inherit;font-size:16px;padding:8px 10px;border:1px solid var(--linha);border-radius:12px;background:#fff;color:var(--tinta)}.dg-ad .mini{flex:none}'; document.head.appendChild(s); }
  form.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.adm === 'sobe' || b.dataset.adm === 'desce') { const l = b.closest('.dg-ad'), alvo = b.dataset.adm === 'sobe' ? l.previousElementSibling : l.nextElementSibling; if (!alvo) return; b.dataset.adm === 'sobe' ? alvo.before(l) : alvo.after(l); const L = [...l.parentNode.children]; L.forEach((x, i) => { x.querySelector('[data-adm="sobe"]').disabled = !i; x.querySelector('[data-adm="desce"]').disabled = i === L.length - 1; }); return; }
    if (b.dataset.novo) {
      const tipo = b.dataset.novo, t = form.querySelector(`[data-novo-t="${tipo}"]`), tp = form.querySelector(`[data-novo-tipo="${tipo}"]`).value; if (!t.value.trim()) { t.focus(); return; }
      const k = 'x_' + Date.now().toString(36), lista = form.querySelector(`[data-lista="${tipo}"]`);
      lista.insertAdjacentHTML('beforeend', `<div class="dg-ad" data-tipo="${tipo}" data-k="${k}" data-novo="${tp}"><input value="${h(t.value.trim())}" maxlength="200"><button type="button" class="mini" data-adm="sobe" aria-label="Subir">↑</button><button type="button" class="mini" data-adm="desce" disabled aria-label="Descer">↓</button><label class="fc" style="margin:0"><input type="checkbox" data-adm="oculto" checked><span>Usar</span></label></div>`);
      [...lista.children].forEach((x, i, A) => { x.querySelector('[data-adm="desce"]').disabled = i === A.length - 1; }); t.value = '';
    }
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    const n = (v) => numero(v);
    const modelos = {}; ['viagem', 'gestao'].forEach(tipo => { modelos[tipo] = [...form.querySelectorAll(`[data-lista="${tipo}"] .dg-ad`)].map(l => ({ k: l.dataset.k, t: l.querySelector('input').value.trim(), oculto: !l.querySelector('[data-adm="oculto"]').checked, ...(l.dataset.novo ? { tipo: l.dataset.novo } : {}) })); });
    salvar({ limites: { valor: n(form.elements.dg_valor.value) ?? LIMITES_PADRAO.valor, margem: n(form.elements.dg_margem.value) ?? LIMITES_PADRAO.margem, europa: form.elements.dg_europa.checked }, modelos });
  };
}
