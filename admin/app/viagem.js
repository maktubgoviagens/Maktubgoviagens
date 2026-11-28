// Maktub Go: a viagem do card do Comercial, digitada uma vez só (002-card-viagem.sql, coluna atendimentos.viagem).
// O bloco Viagem do card é o lugar de origem e destino (sempre no código IATA), tipo (ida e volta, só ida, multitrecho), trechos, datas,
// passageiros e bagagem. Diagnóstico, cotação e serviços leem daqui, pela mesma regra.
// Card antigo (coluna viagem vazia): mostra o que o diagnóstico já tinha e, faltando, o "trecho" antigo do card.
// Nada é gravado sozinho: o card antigo só muda quando alguém salva o card.
import { codigoDe, carregarNomes, carregarAero, cidadeDe as cidadeAero } from '/admin/app/cot-colar.js?v=6';

export const BAGAGEM = [['0', 'Sem bagagem'], ['1', '1 por pessoa'], ['2', '2 por pessoa'], ['3', '3 por pessoa']];
let AERO = null;
// lista de aeroportos e nomes de cidade (os mesmos arquivos da busca de aeroporto do app)
export async function preparar() { try { await carregarNomes(); AERO = await carregarAero(); } catch (_) {} }

const txt = (v) => String(v ?? '').trim();
const cod3 = (t) => /^[A-Za-z]{3}$/.test(txt(t)) && (!AERO || AERO[txt(t).toUpperCase()]) ? txt(t).toUpperCase() : '';
// código do aeroporto de um texto (cidade ou código); vazio quando não dá para ter certeza
export const codDe = (texto, cod) => cod3(cod) || cod3(texto) || (txt(texto) ? codigoDe(texto) : '') || '';
// nome da cidade de um código (GIG -> Rio de Janeiro); sem a lista carregada, fica o próprio código
export const cidadeDe = (c) => cidadeAero(c) || txt(c);
// origem e destino ficam sempre no código IATA (melhor para os indicadores); sem código conhecido, fica o texto
export const iata = (v, k) => codDe(v[k], v[k + '_cod']) || txt(v[k]);
// cidade para mostrar ao lado do código (e para o hotel e a cotação Maktub Go)
const cidadeDoCampo = (v, k) => { const c = codDe(v[k], v[k + '_cod']); return c ? cidadeDe(c) : txt(v[k]); };
export const cidadeDoLugar = (texto) => cidadeDoCampo({ x: texto }, 'x');

// "Rio de Janeiro → Lisboa", "GRU-LIS", "GRU x LIS", "Rio x Goiânia" ou só o destino
export function partirTrecho(t) {
  t = txt(t); if (!t) return {};
  const m = /^([A-Za-z]{3})\s*(?:[-–>→\/]+|\s[xX]\s)\s*([A-Za-z]{3})$/.exec(t);
  if (m) return { origem: m[1].toUpperCase(), destino: m[2].toUpperCase() };
  const p = t.split(/\s*(?:→|->|⇄|↔|>)\s*|\s+[-–xX]\s+/).map(txt).filter(Boolean);
  if (p.length >= 2) return { origem: p[0], destino: p.slice(1).join(' → ') };
  return { destino: t };
}

const norm = (v) => ({
  origem: txt(v.origem), origem_cod: txt(v.origem_cod).toUpperCase(), destino: txt(v.destino), destino_cod: txt(v.destino_cod).toUpperCase(),
  tipo: ['iv', 'ida', 'multi'].includes(v.tipo) ? v.tipo : 'iv',
  trechos: Array.isArray(v.trechos) ? v.trechos.map(t => ({ o: txt(t && t.o).toUpperCase(), d: txt(t && t.d).toUpperCase(), data: txt(t && t.data) })) : [],
  pax: +v.pax > 0 ? Math.round(+v.pax) : null, bagagem: ['0', '1', '2', '3'].includes(String(v.bagagem ?? '')) ? String(v.bagagem) : '',
  ida: txt(v.ida).slice(0, 10), volta: txt(v.volta).slice(0, 10)
});

// a viagem que vale para o card: a gravada; no card antigo, a do diagnóstico e, faltando, o trecho antigo
export function viagemDe(r, resp) {
  r = r || {}; resp = resp || {};
  if (r.viagem && typeof r.viagem === 'object') return completar({ ...norm({ ...r.viagem, ida: r.data_viagem, volta: r.data_volta }), novo: true }, doServico(r.itens));
  const t = partirTrecho(r.trecho), d = resp.data_pre || {}, p = resp.pax || {};
  const ida = r.data_viagem || d.ida || '', volta = r.data_viagem ? (r.data_volta || '') : (d.volta || '');
  const tipo = r.data_viagem ? (r.data_volta ? 'iv' : 'ida') : (d.ida && !d.volta ? 'ida' : 'iv');
  return completar({ ...norm({ origem: txt(resp.origem) || t.origem || '', destino: txt(resp.destino) || t.destino || '', tipo, pax: p.n, bagagem: resp.bagagem, ida, volta }), novo: false }, doServico(r.itens));
}
// card sem rota: nem origem nem destino (no multitrecho, nenhum trecho com origem ou destino)
export function semRota(v) {
  v = v || {};
  if (v.tipo === 'multi') return !(v.trechos || []).some(t => t && (txt(t.o) || txt(t.d)));
  return !txt(v.origem) && !txt(v.origem_cod) && !txt(v.destino) && !txt(v.destino_cod);
}
// a rota do primeiro serviço de passagem que vale como venda (sem o cancelado e sem a emissão com milhas do cliente)
const ehPassagem = (x) => !!x && ['Passagens', 'Maktub Corporativo'].includes(x.produto) && !x.cancelado_em && x.pago_em !== 'cliente_gestao';
const dataBr = (s, ref) => { const m = /(\d{2})\/(\d{2})(?:\/(\d{2,4}))?/.exec(s || ''); if (!m) return '';
  const a = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : String((ref || '').slice(0, 4) || new Date().getFullYear()); return `${a}-${m[2]}-${m[1]}`; };
export function doServico(itens) {
  for (const x of Array.isArray(itens) ? itens : []) {
    if (!ehPassagem(x)) continue;
    let L = Array.isArray(x.ct) && x.ct.length ? x.ct.map(t => ({ o: txt(t && t.o).toUpperCase(), d: txt(t && t.d).toUpperCase(), data: txt(t && t.data).slice(0, 10) })) : [];
    if (!L.length && txt(x.trechos)) L = txt(x.trechos).split('\n').map(l => { const m = /^\s*([A-Za-z]{3})\s*-\s*([A-Za-z]{3})\b(.*)$/.exec(l); return m ? { o: m[1].toUpperCase(), d: m[2].toUpperCase(), data: dataBr(m[3], x.data_ida) } : null; }).filter(Boolean);
    L = L.filter(t => t.o || t.d);
    const tipo = x.tipo_trecho === 'multi' && L.length ? 'multi' : x.tipo_trecho === 'ida' ? 'ida' : 'iv';
    const o = codDe(x.origem) || (L[0] || {}).o || '', d = codDe(x.destino) || (tipo !== 'multi' && L.length ? L[0].d : (L[L.length - 1] || {}).d) || '';
    if (tipo !== 'multi' && !o && !d) continue;
    return { origem_cod: o, destino_cod: d, tipo, trechos: tipo === 'multi' ? L : [], ida: txt(x.data_ida).slice(0, 10), volta: tipo === 'ida' ? '' : txt(x.data_volta).slice(0, 10), pax: +x.passageiros > 0 ? Math.round(+x.passageiros) : null };
  }
  return null;
}
// completa só a rota que falta com a do serviço (datas e passageiros só quando o card não tem); o resto do card fica como está
export function completar(v, s) {
  if (!s || !semRota(v)) return v;
  const o = { ...v, tipo: s.tipo, origem: s.origem_cod, origem_cod: s.origem_cod, destino: s.destino_cod, destino_cod: s.destino_cod, trechos: s.trechos.map(t => ({ ...t })), doServico: true };
  if (!o.ida && !o.volta) { o.ida = s.ida; o.volta = s.volta; }
  if (o.tipo === 'ida') o.volta = '';
  // multitrecho sem data nos trechos: a ida e a volta do card vão para o primeiro e o último trecho (as datas do card vêm deles)
  if (o.tipo === 'multi' && o.trechos.length) { const T = o.trechos; if (!T[0].data && o.ida) T[0].data = o.ida; if (T.length > 1 && !T[T.length - 1].data && o.volta) T[T.length - 1].data = o.volta; }
  if (!o.pax && s.pax) o.pax = s.pax;
  return o;
}
// o que vai para a coluna viagem (as datas ficam em data_viagem e data_volta)
export function paraGravar(v) {
  const n = norm(v);
  return { origem: iata(n, 'origem') || null, origem_cod: codDe(n.origem, n.origem_cod) || null, destino: iata(n, 'destino') || null, destino_cod: codDe(n.destino, n.destino_cod) || null,
    tipo: n.tipo, trechos: n.tipo === 'multi' ? n.trechos.filter(t => t.o || t.d || t.data) : [], pax: n.pax, bagagem: n.bagagem || null };
}
// datas do card: no multitrecho, a do primeiro e a do último trecho
export function datasDe(v) {
  if (v.tipo !== 'multi') return { ida: v.ida || '', volta: v.tipo === 'ida' ? '' : (v.volta || '') };
  const L = (v.trechos || []).filter(t => t.data);
  return { ida: L.length ? L[0].data : '', volta: L.length > 1 ? L[L.length - 1].data : '' };
}
// texto do campo "trecho" do card (listas, busca, cotação e tudo que já lia esse campo)
export function trechoTexto(v) {
  if (v.tipo === 'multi') { const L = (v.trechos || []).filter(t => t.o || t.d); if (!L.length) return '';
    return [L[0].o, ...L.map(t => t.d)].filter(Boolean).join(' → '); }
  return [iata(v, 'origem'), iata(v, 'destino')].filter(Boolean).join(' → ');
}
export const dias = (a, b) => a && b ? Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5) : null;
const dm = (iso) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
// "GIG → LIS · 10/05 a 25/05 (15 dias) · 2 passageiros · 1 mala por pessoa"
export function resumo(v) {
  const dt = datasDe(v), n = dias(dt.ida, dt.volta);
  return [trechoTexto(v) || v.destino || '',
    dt.ida ? (dt.volta ? `${dm(dt.ida)} a ${dm(dt.volta)}${n != null && n >= 0 ? ` (${n} ${n === 1 ? 'dia' : 'dias'})` : ''}` : (v.tipo === 'ida' ? 'só ida ' : 'ida ') + dm(dt.ida)) : '',
    v.pax ? v.pax + (v.pax === 1 ? ' passageiro' : ' passageiros') : '',
    v.bagagem === '0' ? 'sem bagagem despachada' : v.bagagem ? `${v.bagagem} ${v.bagagem === '1' ? 'mala' : 'malas'} por pessoa` : ''].filter(Boolean).join(' · ');
}
// o que os serviços herdam do card: passagem (códigos, tipo, trechos, datas, passageiros, bagagem) e hotel (cidade e datas)
export function paraServicos(v) {
  const dt = datasDe(v), L = (v.tipo === 'multi' ? v.trechos : []).filter(t => t.o || t.d);
  const o = v.tipo === 'multi' ? (L[0] || {}).o || '' : iata(v, 'origem');
  const d = v.tipo === 'multi' ? (L[L.length - 1] || {}).d || '' : iata(v, 'destino');
  const cidade = v.tipo === 'multi' ? (L.length ? cidadeDe(L[0].d) : '') : cidadeDoCampo(v, 'destino');
  return {
    voo: { origem: o || '', destino: d || '', tipo_trecho: v.tipo, trechos: L.map(t => `${t.o}-${t.d}${t.data ? ' ' + dm(t.data) : ''}`).join('\n'),
      data_ida: dt.ida || '', data_volta: v.tipo === 'ida' ? '' : (dt.volta || ''), passageiros: v.pax || '', bagagem: v.bagagem || '' },
    hotel: { destino: cidade || '', data_ida: dt.ida || '', data_volta: dt.volta || '' }
  };
}
// cotação montada a partir do card (COT.preparar)
export function paraCotacao(v) {
  const dt = datasDe(v), L = v.tipo === 'multi' ? v.trechos.filter(t => t.o || t.d) : [];
  return { origem: v.tipo === 'multi' ? cidadeDe((L[0] || {}).o || '') : cidadeDoCampo(v, 'origem'), origemCod: v.tipo === 'multi' ? (L[0] || {}).o || '' : codDe(v.origem, v.origem_cod),
    destino: v.tipo === 'multi' ? (L.length ? cidadeDe(L[0].d) : '') : cidadeDoCampo(v, 'destino'), destinoCod: v.tipo === 'multi' ? (L[0] || {}).d || '' : codDe(v.destino, v.destino_cod),
    ida: dt.ida, volta: dt.volta, pessoas: v.pax ? String(v.pax) : '', bagagem: v.bagagem, trechos: L };
}
