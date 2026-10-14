// Maktub Go: "Colar e preencher" da cotação corporativa.
// Lê o texto copiado do site da companhia (ou um resumo curto digitado) e devolve voos, valores e opções.
// Também completa sozinho o nome do aeroporto e a duração do voo (com fuso horário).

let AERO = null;
export async function carregarAero() {
  if (AERO) return AERO;
  try { AERO = await (await fetch('/admin/app/aeroportos.json')).json(); } catch (e) { AERO = {}; }
  return AERO;
}

// nomes próprios dos aeroportos mais usados (os demais usam o nome da cidade)
const NOME_AER = { GIG: 'Galeão', SDU: 'Santos Dumont', GRU: 'Guarulhos', CGH: 'Congonhas', VCP: 'Viracopos', CNF: 'Confins', PLU: 'Pampulha',
  EZE: 'Ezeiza', AEP: 'Aeroparque', CDG: 'Charles de Gaulle', ORY: 'Orly', LHR: 'Heathrow', LGW: 'Gatwick', FCO: 'Fiumicino', MXP: 'Malpensa',
  JFK: 'JFK', EWR: 'Newark', LGA: 'LaGuardia' };
// cidade em português quando o cadastro vem em inglês ou sem acento
const CIDADE_PT = { 'Rio De Janeiro': 'Rio de Janeiro', 'Sao Paulo': 'São Paulo', 'Brasilia': 'Brasília', 'Florianopolis': 'Florianópolis', 'Belem': 'Belém',
  'Cuiaba': 'Cuiabá', 'Maceio': 'Maceió', 'Goiania': 'Goiânia', 'Foz Do Iguacu': 'Foz do Iguaçu', 'Vitoria': 'Vitória', 'Sao Luis': 'São Luís',
  'Joao Pessoa': 'João Pessoa', 'Ilheus': 'Ilhéus', 'Ribeirao Preto': 'Ribeirão Preto', 'Uberlandia': 'Uberlândia', 'Maringa': 'Maringá',
  'Santarem': 'Santarém', 'Sao Goncalo Do Amarante': 'Natal', 'Juazeiro Do Norte': 'Juazeiro do Norte', 'Lisbon': 'Lisboa', 'Rome': 'Roma',
  'Milan': 'Milão', 'London': 'Londres', 'New York': 'Nova York', 'Bogota': 'Bogotá', 'Asuncion': 'Assunção', 'Mexico City': 'Cidade do México',
  'Frankfurt-am-Main': 'Frankfurt', 'Zurich': 'Zurique', 'Geneva': 'Genebra', 'Ezeiza': 'Buenos Aires', 'Tocumen': 'Cidade do Panamá',
  'San Carlos de Bariloche': 'Bariloche', 'Ushuahia': 'Ushuaia', 'Oranjestad': 'Aruba', 'Willemstad': 'Curaçao', 'Amsterdam': 'Amsterdã',
  'Munich': 'Munique', 'Florence': 'Florença', 'Venice': 'Veneza', 'Seville': 'Sevilha', 'Athens': 'Atenas', 'Istanbul': 'Istambul',
  'Cancun': 'Cancún', 'Montevideo': 'Montevidéu', 'Newark': 'Nova York', 'Dallas-Fort Worth': 'Dallas' };
export const cidadeDe = (cod) => { const a = AERO && AERO[String(cod || '').toUpperCase()]; if (!a) return ''; return CIDADE_PT[a[0]] || a[0]; };
export const nomeAer = (cod) => { const c = String(cod || '').toUpperCase(); return NOME_AER[c] || cidadeDe(c); };

// fuso horário: país com um fuso só, ou a referência mais próxima nos países com vários
const TZ_PAIS = { CL: 'America/Santiago', AR: 'America/Argentina/Buenos_Aires', UY: 'America/Montevideo', PY: 'America/Asuncion', PE: 'America/Lima',
  CO: 'America/Bogota', BO: 'America/La_Paz', EC: 'America/Guayaquil', VE: 'America/Caracas', PA: 'America/Panama', CR: 'America/Costa_Rica',
  DO: 'America/Santo_Domingo', CU: 'America/Havana', JM: 'America/Jamaica', AW: 'America/Aruba', CW: 'America/Curacao', PT: 'Europe/Lisbon',
  ES: 'Europe/Madrid', FR: 'Europe/Paris', IT: 'Europe/Rome', GB: 'Europe/London', IE: 'Europe/Dublin', DE: 'Europe/Berlin', NL: 'Europe/Amsterdam',
  BE: 'Europe/Brussels', CH: 'Europe/Zurich', AT: 'Europe/Vienna', CZ: 'Europe/Prague', HU: 'Europe/Budapest', PL: 'Europe/Warsaw',
  DK: 'Europe/Copenhagen', SE: 'Europe/Stockholm', NO: 'Europe/Oslo', FI: 'Europe/Helsinki', HR: 'Europe/Zagreb', GR: 'Europe/Athens',
  TR: 'Europe/Istanbul', IS: 'Atlantic/Reykjavik', AE: 'Asia/Dubai', QA: 'Asia/Qatar', IL: 'Asia/Jerusalem', EG: 'Africa/Cairo',
  MA: 'Africa/Casablanca', ZA: 'Africa/Johannesburg', JP: 'Asia/Tokyo', KR: 'Asia/Seoul', CN: 'Asia/Shanghai', SG: 'Asia/Singapore',
  TH: 'Asia/Bangkok', IN: 'Asia/Kolkata', NZ: 'Pacific/Auckland' };
const TZ_REF = {
  BR: [['America/Sao_Paulo', -23.5, -46.6], ['America/Sao_Paulo', -22.9, -43.2], ['America/Sao_Paulo', -27.6, -48.5], ['America/Bahia', -13, -38.5],
    ['America/Recife', -8, -34.9], ['America/Fortaleza', -3.7, -38.5], ['America/Maceio', -9.6, -35.7], ['America/Belem', -1.4, -48.5],
    ['America/Santarem', -2.4, -54.7], ['America/Araguaina', -7.2, -48.2], ['America/Manaus', -3.1, -60], ['America/Boa_Vista', 2.8, -60.7],
    ['America/Porto_Velho', -8.8, -63.9], ['America/Rio_Branco', -10, -67.8], ['America/Cuiaba', -15.6, -56.1], ['America/Campo_Grande', -20.4, -54.6],
    ['America/Noronha', -3.85, -32.4], ['America/Sao_Paulo', -15.8, -47.9]],
  US: [['America/New_York', 40.7, -74], ['America/New_York', 25.8, -80.2], ['America/New_York', 28.4, -81.3], ['America/New_York', 33.6, -84.4],
    ['America/Chicago', 41.9, -87.6], ['America/Chicago', 29.8, -95.3], ['America/Chicago', 32.9, -97], ['America/Denver', 39.7, -105],
    ['America/Phoenix', 33.4, -112], ['America/Los_Angeles', 34, -118.2], ['America/Los_Angeles', 37.6, -122.4], ['America/Los_Angeles', 36.1, -115.2],
    ['America/Los_Angeles', 47.4, -122.3], ['America/Anchorage', 61.2, -149.9], ['Pacific/Honolulu', 21.3, -157.8]],
  MX: [['America/Mexico_City', 19.4, -99.1], ['America/Cancun', 21.1, -86.8], ['America/Tijuana', 32.5, -117], ['America/Mazatlan', 23.2, -106.4]],
  CA: [['America/Toronto', 43.7, -79.4], ['America/Toronto', 45.5, -73.6], ['America/Vancouver', 49.2, -123.1], ['America/Edmonton', 51, -114]],
  AU: [['Australia/Sydney', -33.9, 151.2], ['Australia/Melbourne', -37.8, 145], ['Australia/Brisbane', -27.5, 153], ['Australia/Perth', -31.9, 115.9],
    ['Australia/Adelaide', -34.9, 138.6]] };
function tzDe(cod) {
  const a = AERO && AERO[String(cod || '').toUpperCase()]; if (!a) return null;
  if (TZ_PAIS[a[1]]) return TZ_PAIS[a[1]];
  const refs = TZ_REF[a[1]]; if (!refs) return null;
  let melhor = null, d0 = Infinity;
  refs.forEach(([tz, la, lo]) => { const d = (la - a[2]) ** 2 + (lo - a[3]) ** 2; if (d < d0) { d0 = d; melhor = tz; } });
  return melhor;
}
function offMin(tz, iso, hhmm) {
  try {
    const [y, m, d] = iso.split('-').map(Number), [hh, mm] = hhmm.split(':').map(Number);
    const s = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(new Date(Date.UTC(y, m - 1, d, hh, mm))).find(x => x.type === 'timeZoneName').value;
    if (s === 'GMT') return 0;
    const r = s.match(/GMT([+-])(\d{1,2}):?(\d{2})?/); if (!r) return null;
    return (r[1] === '-' ? -1 : 1) * (+r[2] * 60 + (+r[3] || 0));
  } catch (e) { return null; }
}
// duração do voo a partir dos horários locais, considerando o fuso de cada aeroporto
export function duracaoDe(v) {
  if (!v || !v.data || !/^\d{1,2}:\d{2}$/.test(v.saida || '') || !/^\d{1,2}:\d{2}$/.test(v.chegada || '')) return '';
  const tzO = tzDe(v.ocod), tzD = tzDe(v.dcod); if (!tzO || !tzD) return '';
  const oO = offMin(tzO, v.data, v.saida), oD = offMin(tzD, v.data, v.chegada); if (oO == null || oD == null) return '';
  const min = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
  let d = (min(v.chegada) - oD) - (min(v.saida) - oO);
  while (d <= 0) d += 1440;
  if (d > 1440 * 2) return '';
  return `${Math.floor(d / 60)}h${String(d % 60).padStart(2, '0')}`;
}
// completa nome do aeroporto e duração, sem apagar o que a pessoa digitou à mão
export function completarVoo(v) {
  if (!v) return;
  const on = nomeAer(v.ocod), dn = nomeAer(v.dcod);
  if (on && (!v.onome || v.onome === v._on)) { v.onome = on; v._on = on; }
  if (dn && (!v.dnome || v.dnome === v._dn)) { v.dnome = dn; v._dn = dn; }
  const du = duracaoDe(v);
  if (du && (!v.duracao || v.duracao === v._du)) { v.duracao = du; v._du = du; }
}

/* ================= leitura do texto colado ================= */
const MESES = { jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12 };
function anoPara(m, d) { const h = new Date(), y = h.getFullYear(); const t = new Date(y, m - 1, d); return t < new Date(y, h.getMonth(), h.getDate()) ? y + 1 : y; }
function datas(t) {
  const out = [];
  const r1 = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g; let m;
  while ((m = r1.exec(t))) { const d = +m[1], mes = +m[2]; if (d < 1 || d > 31 || mes < 1 || mes > 12) continue; let y = m[3] ? +m[3] : anoPara(mes, d); if (y < 100) y += 2000; out.push({ pos: m.index, iso: `${y}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}` }); }
  const r2 = /\b(\d{1,2})\s*(?:de\s+)?(jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|out|oct|nov|dez|dec)[a-zç]*\.?(?:\s*(?:de\s+)?(\d{4}))?/gi;
  while ((m = r2.exec(t))) { const d = +m[1], mes = MESES[m[2].toLowerCase()]; if (d < 1 || d > 31) continue; const y = m[3] ? +m[3] : anoPara(mes, d); out.push({ pos: m.index, iso: `${y}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}` }); }
  return out.sort((a, b) => a.pos - b.pos);
}
// palavras de 3 letras maiúsculas que aparecem nas telas das companhias e não são aeroporto
const NAO_AER = new Set(('BRL USD EUR CLP ARS UYU PYG PEN COP MXN GBP CHF CAD ' +
  'JAN FEV FEB MAR ABR APR MAI MAY JUN JUL AGO AUG SET SEP OUT OCT NOV DEZ DEC ' +
  'SEG TER QUA QUI SEX SAB DOM MON TUE WED THU FRI SAT SUN ' +
  'IDA VOO CIA DIA MIN PAX TAP KLM TAM GOL SKY ADT CHD INF CPF VIA AND USB').split(' '));
const ehAer = (c) => !NAO_AER.has(c) && (!AERO || !Object.keys(AERO).length || !!AERO[c]);
const hora = (hh, mm) => `${String(+hh).padStart(2, '0')}:${mm}`;
const minDe = (iso, hh) => { const [a, b] = hh.split(':').map(Number); return (iso ? Date.parse(iso + 'T00:00:00Z') / 6e4 : 0) + a * 60 + b; };
const isoDe = (d, m, y) => { y = +y; if (y < 100) y += 2000; return `${y}-${String(+m).padStart(2, '0')}-${String(+d).padStart(2, '0')}`; };

/* ---- reconhecedores dos sites: cada um devolve os voos um a um (com as conexões separadas) ---- */
// Azul: "Voo origem CNF 2027-02-09T17:05:00 destino VCP 2027-02-09T18:20:00"
function trechosAzul(t) {
  const out = []; let m; const r = /Voo origem ([A-Z]{3}) (\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2})? destino ([A-Z]{3}) (\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/g;
  while ((m = r.exec(t))) out.push({ pos: m.index, fim: m.index + m[0].length, ocod: m[1], data: m[2], saida: hora(m[3], m[4]), dcod: m[5], dataCheg: m[6], chegada: hora(m[7], m[8]) });
  return out;
}
// Smiles / GOL (detalhes): "GIG\nRio de Janeiro, Brasil\n05h35 - Qua, 11/11/26"
function trechosSmiles(t) {
  const ev = []; let m; const r = /\b([A-Z]{3})[ \t]*\n[^\n]*\n[ \t]*(\d{1,2})[h:](\d{2})\s*-\s*[A-Za-zçáé]{3}\.?,?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g;
  while ((m = r.exec(t))) if (ehAer(m[1])) ev.push({ pos: m.index, fim: m.index + m[0].length, cod: m[1], hora: hora(m[2], m[3]), data: isoDe(m[4], m[5], m[6]) });
  const out = []; for (let i = 0; i + 1 < ev.length; i += 2) out.push({ pos: ev[i].pos, fim: ev[i + 1].fim, ocod: ev[i].cod, data: ev[i].data, saida: ev[i].hora, dcod: ev[i + 1].cod, dataCheg: ev[i + 1].data, chegada: ev[i + 1].hora });
  return out;
}
// Google Flights: "06:20Aeroporto Internacional ... (CNF)", horário e aeroporto na mesma linha (no print o nome pode quebrar em até 3 linhas)
function trechosGoogle(t) {
  const ev = []; let m; const r = /^[ \t]*(\d{1,2}):(\d{2})(?:\s*\+(\d))?[ \t]*(?:[^\n\d][^\n]*?)?(?:\n[ \t]*(?:[^\n\d][^\n]*?)?){0,4}?\(([A-Z]{3})\)[ \t]*$/gm;
  while ((m = r.exec(t))) if (ehAer(m[4])) ev.push({ pos: m.index, fim: m.index + m[0].length, cod: m[4], hora: hora(m[1], m[2]), mais: +(m[3] || 0) });
  if (ev.length < 2) return [];
  const ds = datas(t), dataAntes = (p) => (ds.filter(d => d.pos < p).pop() || {}).iso || '';
  const out = []; for (let i = 0; i + 1 < ev.length; i += 2) { const d = dataAntes(ev[i].pos);
    out.push({ pos: ev[i].pos, fim: ev[i + 1].fim, ocod: ev[i].cod, data: d, saida: ev[i].hora, dcod: ev[i + 1].cod, dataCheg: ev[i + 1].mais && d ? new Date(Date.parse(d + 'T12:00:00Z') + ev[i + 1].mais * 864e5).toISOString().slice(0, 10) : d, chegada: ev[i + 1].hora }); }
  return out;
}

/* ---- genérico: cada horário com o aeroporto mais perto (primeiro na mesma linha), sem pular outro horário ---- */
function eventos(t) {
  const hs = [], cs = []; let m;
  // "12:20" é horário; "12h20" só com dois dígitos e sem cara de duração ("1h05", "05h30min", "duração 12h10", "parada de 01h10")
  const rH = /(?<![\d:])(\d{1,2})([:h])(\d{2})(?![\d:])/g; while ((m = rH.exec(t))) { if (+m[1] > 23 || +m[3] > 59) continue;
    if (m[2] === 'h' && (m[1].length < 2 || /^\s*min/i.test(t.slice(m.index + m[0].length)) || /dura|tempo|total|parada|conex|escala|espera/i.test(t.slice(Math.max(0, m.index - 22), m.index)))) continue;
    hs.push({ pos: m.index, fim: m.index + m[0].length, hora: hora(m[1], m[3]) }); }
  const rA = /\b([A-Z]{3})\b/g; while ((m = rA.exec(t))) if (ehAer(m[1])) cs.push({ pos: m.index, fim: m.index + m[0].length, cod: m[1], usado: false });
  const PERTO = 45, ev = [];
  // o texto tem um padrão: "GIG 12:20" (código antes) ou "12:20 GIG" (código depois). Serve de desempate.
  const cola = (a, b) => b >= a && b - a <= 4 && /^[\s()]*$/.test(t.slice(a, b));
  const nAntes = hs.filter(x => cs.some(c => cola(c.fim, x.pos))).length, nDepois = hs.filter(x => cs.some(c => cola(x.fim, c.pos))).length;
  const lado = nAntes > nDepois ? 'antes' : nDepois > nAntes ? 'depois' : '';
  const linha = (a, b) => !t.slice(a, b).includes('\n');
  hs.forEach((x, i) => {
    const ant = i ? hs[i - 1].fim : 0, prox = hs[i + 1] ? hs[i + 1].pos : t.length;
    const depois = cs.find(c => !c.usado && c.pos >= x.fim && c.pos < prox && c.pos - x.fim <= PERTO);
    const antes = cs.filter(c => !c.usado && c.fim <= x.pos && c.pos >= ant && x.pos - c.fim <= PERTO).pop();
    let c = depois || antes;
    if (depois && antes) {
      const ld = linha(x.fim, depois.pos), la = linha(antes.fim, x.pos), dd = depois.pos - x.fim, da = x.pos - antes.fim;
      c = ld !== la ? (ld ? depois : antes) : dd !== da ? (dd < da ? depois : antes) : lado === 'antes' ? antes : depois;
    }
    if (c) { c.usado = true; ev.push({ pos: Math.min(x.pos, c.pos), fim: Math.max(x.fim, c.fim), hora: x.hora, cod: c.cod }); }
  });
  if (ev.length >= 2) return ev.sort((a, b) => a.pos - b.pos);
  // formato "12:20 – 17:00 ... GIG–SCL" (buscadores de voo)
  const out = []; const rF = /(\d{1,2})[:h](\d{2})\s*[–—-]\s*(\d{1,2})[:h](\d{2})[\s\S]{0,120}?\b([A-Z]{3})\s*[–—-]\s*([A-Z]{3})\b/g;
  while ((m = rF.exec(t))) { if (!ehAer(m[5]) || !ehAer(m[6])) continue; const p = m.index, f = p + m[0].length;
    out.push({ pos: p, fim: p + 1, hora: hora(m[1], m[2]), cod: m[5] }, { pos: p + 1, fim: f, hora: hora(m[3], m[4]), cod: m[6] }); }
  return out.length ? out : ev;
}
function trechosGenerico(t) {
  const PRINT = /^#print/.test(t);
  const ev = eventos(t), ds = datas(t), out = [];
  for (let i = 0; i + 1 < ev.length; i += 2) {
    const dep = ev[i], arr = ev[i + 1], prox = ev[i + 2] ? ev[i + 2].pos : t.length;
    const antes = out.length ? ev[i - 1].fim : 0;
    const dt = ds.filter(d => d.pos >= antes && d.pos < dep.pos).pop() || (out.length ? null : ds.find(d => d.pos < arr.pos));
    const txt = t.slice(dep.fim, arr.pos) + ' ' + t.slice(arr.fim, prox);
    // "1 parada" pode vir antes do horário (telas de resultado) ou depois (resumo colado)
    const rx = /(\d)\s*(?:parada|conex|escala|stop)/i, entre = t.slice(dep.fim, arr.pos), antesTxt = t.slice(antes, dep.pos);
    const st = PRINT ? (entre.match(rx) || (/direto|sem escala|sem parada/i.test(entre) ? null : antesTxt.match(rx) || (/direto/i.test(antesTxt) ? null : txt.match(rx))))
      : txt.match(rx) || (/direto|sem escala|sem parada|nonstop/i.test(txt) ? null : antesTxt.match(rx));
    const px = txt.match(/(\d{1,2})\s*(?:pax|pessoas?)\b/i);
    out.push({ pos: dep.pos, fim: arr.fim, ocod: dep.cod, saida: dep.hora, dcod: arr.cod, chegada: arr.hora, data: dt ? dt.iso : (out.length ? out[out.length - 1].data : ''),
      con: st ? +st[1] : 0, pax: px ? px[1] : '' });
  }
  return out;
}

// conexões viram um voo só (origem → destino final, "1 conexão"); a volta nunca é engolida pela ida
function juntar(ls, t) {
  const out = [];
  ls.forEach(l => {
    const a = out[out.length - 1];
    if (a && a.dcod === l.ocod && l.dcod !== a.ocod && !/volta|retorno/i.test(t.slice(a.fim, l.pos))) {
      let gap = minDe(l.data, l.saida) - minDe(a.dataCheg || a.data, a.chegada);
      if (!l.data || !(a.dataCheg || a.data)) gap = gap < 0 ? gap + 1440 : gap;
      if (gap >= 0 && gap <= 20 * 60) { a.dcod = l.dcod; a.chegada = l.chegada; a.dataCheg = l.dataCheg || l.data || a.dataCheg; a.junt = (a.junt || 0) + 1; a.con = Math.max(a.con0 || 0, a.junt); a.fim = l.fim; return; }
    }
    out.push({ ...l, con: l.con || 0, con0: l.con || 0 });
  });
  // a mesma viagem copiada duas vezes (resumo e detalhes) fica uma só
  const vistos = [];
  return out.filter(v => { const d = vistos.find(x => x.ocod === v.ocod && x.dcod === v.dcod && x.saida === v.saida && x.chegada === v.chegada && (!x.data || !v.data || x.data === v.data));
    if (d) { if (!d.data) d.data = v.data; if (v.con > d.con) d.con = v.con; return false; } vistos.push(v); return true; });
}

const valor = (s) => s ? s.replace(/\s/g, '') : '';
function lerBloco(t) {
  const ls = [trechosAzul, trechosSmiles, trechosGoogle].map(f => f(t)).find(x => x.length) || trechosGenerico(t);
  const voos = juntar(ls, t).map((v, i) => ({ rotulo: i === 0 ? 'Ida' : i === 1 ? 'Volta' : 'Trecho ' + (i + 1), data: v.data || '',
    ocod: v.ocod, onome: '', saida: v.saida, dcod: v.dcod, dnome: '', chegada: v.chegada,
    mais1: v.data && v.dataCheg ? v.dataCheg > v.data : !!(v.saida && v.chegada && v.chegada < v.saida), tipo: !v.con ? 'Direto' : v.con === 1 ? '1 conexão' : '2 conexões', duracao: '', pax: v.pax || '' }));
  // valores em reais: o do site (subtotal/total/site/de) e o da Maktub (maktub/por/nosso). Pontos e milhas não contam.
  const N = '(?:R\\$|BRL)?\\s*(\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,2})?|\\d+(?:,\\d{1,2})?)(?![\\d.,]|\\s*(?:pontos|milhas|pts|mil\\b))';
  let site = '', mk = '', m;
  const rS = new RegExp(`(?:subtotal|total|no site|site|^\\s*de)\\b(?:[^\\d]{0,24}?(?:R\\$|BRL)\\s*|[ \\t:]*)${N}`, 'gim'); while ((m = rS.exec(t))) site = valor(m[1]);
  const rM = new RegExp(`(?:maktub|nosso valor|^\\s*por)\\b[^\\d\\n]{0,20}?${N}`, 'gim'); while ((m = rM.exec(t))) mk = valor(m[1]);
  return { voos, de: site, por: mk };
}
const CIAS = [[/latam/i, 'LATAM'], [/\bgol\b|voegol/i, 'GOL'], [/\bazul\b|voeazul/i, 'Azul'], [/\btap\b/i, 'TAP'], [/copa airlines|\bcopa\b/i, 'Copa'],
  [/aerol[ií]neas argentinas/i, 'Aerolíneas Argentinas'], [/american airlines/i, 'American Airlines'], [/iberia/i, 'Iberia'], [/air france/i, 'Air France'],
  [/\bklm\b/i, 'KLM'], [/emirates/i, 'Emirates'], [/jetsmart/i, 'JetSMART'], [/\bsky\b/i, 'SKY'], [/avianca/i, 'Avianca'], [/united/i, 'United'], [/delta/i, 'Delta']];

// devolve { cliente, cia, opcoes: [{ nome, voos, de, por }] }
export async function lerColado(texto) {
  await carregarAero();
  const t = String(texto || '').replace(/ /g, ' ').replace(/\r/g, '');
  const linhas = t.split('\n'), blocos = []; let cab = [], atual = null;
  for (const l of linhas) {
    const op = l.match(/^\s*op[cç][aã]o\s*\d*\s*[:.\-·]?\s*(.*)$/i);
    if (op) { atual = { nome: op[1].trim(), linhas: [] }; blocos.push(atual); continue; }
    if (/^\s*-{3,}\s*$/.test(l)) { atual = { nome: '', linhas: [] }; blocos.push(atual); continue; }
    (atual ? atual.linhas : cab).push(l);
  }
  const cabTxt = cab.join('\n');
  const cli = cabTxt.match(/^\s*(?:cliente|passageiro|pax)\s*:?[ \t]*(\S.*)$/im);
  const cia = (CIAS.find(([r]) => r.test(t)) || [])[1] || '';
  const opcoes = (blocos.length ? blocos.map(b => ({ nome: b.nome, ...lerBloco(b.linhas.join('\n')) })) : [{ nome: '', ...lerBloco(t) }]).filter(o => o.voos.length || o.de || o.por);
  // se o cabeçalho trouxe o valor do site e só há uma opção, usa
  if (blocos.length && !opcoes.length) opcoes.push({ nome: '', ...lerBloco(t) });
  opcoes.forEach(o => o.voos.forEach(completarVoo));
  return { cliente: cli ? cli[1].trim() : '', cia, opcoes };
}

/* ================= leitura de print (OCR) =================
   O OCR devolve palavras soltas com a posição na tela. Aqui cada horário é casado com o código de aeroporto
   mais perto dele na imagem (ao lado, acima ou abaixo), e o texto é remontado na ordem de leitura,
   já no formato "06:20 CNF", para o mesmo leitor de sempre entender. */
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function textoDoPrint(palavras) {
  const toks = [];
  const TEMPO = '([0-9OoIl|]{1,2})[:hH.]([0-9OoIl|]{2})';
  const num = (s) => s.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1');
  // "SãoPaulo(VCP" e "(REC)(REC" viram pedaços separados, com a posição proporcional
  const partes = [];
  palavras.forEach(w => { const t0 = String(w.t || '').trim(); if (!/[()\s]/.test(t0.slice(1, -1))) { partes.push({ ...w, par: /^[([]/.test(t0.trim()) || /[)\]]$/.test(t0.trim()) }); return; }
    const L = t0.length, larg = w.b.x1 - w.b.x0; let ini = 0;
    t0.split(/([()\s]+)/).forEach(pd => { const x0 = w.b.x0 + larg * ini / L; ini += pd.length; if (pd.trim() && !/^[()\s]+$/.test(pd)) partes.push({ t: pd, b: { ...w.b, x0, x1: w.b.x0 + larg * ini / L }, par: /[()]/.test(t0) }); }); });
  partes.forEach(w => {
    const t = String(w.t || '').trim().replace(/^[()[\]{}.,;:•*'"“”‘’»«+>-]+|[()[\]{},;:•*'"“”‘’»«+>]+$/g, ''); if (!t) return;
    const b = w.b, larg = b.x1 - b.x0;
    let m = t.match(new RegExp(`^([A-Z]{3})${TEMPO}$`));
    if (m) { const k = 3 / t.length; toks.push({ t: m[1], b: { ...b, x1: b.x0 + larg * k } }, { t: m[2] + ':' + m[3], b: { ...b, x0: b.x0 + larg * k } }); return; }
    m = t.match(new RegExp(`^${TEMPO}([A-Z]{3})$`));
    if (m) { const k = (t.length - 3) / t.length; toks.push({ t: m[1] + ':' + m[2], b: { ...b, x1: b.x0 + larg * k } }, { t: m[3], b: { ...b, x0: b.x0 + larg * k } }); return; }
    // código com letra minúscula ou número no meio ("SlZ", "5LZ") vira maiúsculo
    const tc = /^[A-Za-z0-9]{3}$/.test(t) && (t.match(/[A-Z]/g) || []).length >= 2 ? t.toUpperCase().replace(/5/g, 'S').replace(/0/g, 'O').replace(/1/g, 'I').replace(/8/g, 'B') : t;
    toks.push({ t: /^[A-Z]{3}$/.test(tc) ? tc : t, b, par: w.par });
  });
  toks.forEach(k => { k.h = k.b.y1 - k.b.y0; k.cx = (k.b.x0 + k.b.x1) / 2; k.cy = (k.b.y0 + k.b.y1) / 2; });
  // texto logo à esquerda (lado -1) ou à direita (lado 1) do token, na mesma linha da tela
  const naLinha = (k, lado) => toks.filter(o => o !== k && Math.abs(o.cy - k.cy) < Math.min(o.h, k.h) * 0.6 && (lado < 0 ? o.b.x1 <= k.b.x0 + 2 && k.b.x0 - o.b.x1 < k.h * 6 : o.b.x0 >= k.b.x1 - 2 && o.b.x0 - k.b.x1 < k.h * 3))
    .sort((a, b) => a.b.x0 - b.b.x0).map(o => o.t).join(' ');
  // horários: "06:20", "22h45", "O1h45"; duração ("05h20min") e parada ("Parada de 01h10") ficam de fora
  toks.forEach(k => { const m = k.t.match(new RegExp(`^${TEMPO}$`)); if (!m) return; const hh = +num(m[1]), mm = num(m[2]);
    if (!/^\d+$/.test(mm) || hh > 23 || +mm > 59) return;
    if (/(parada|conex\S*|dura\S*|tempo|troca|espera|escala|voo:?)\s*(de)?\s*$/i.test(naLinha(k, -1)) || /^\s*min/i.test(naLinha(k, 1))) return;
    k.hora = `${String(hh).padStart(2, '0')}:${mm}`; });
  // "435" / "1015" sem os dois pontos: só quando tem o tamanho dos outros horários da tela (número de voo é pequeno)
  const hs = toks.filter(k => k.hora).map(k => k.h).sort((a, b) => a - b), H = hs.length ? hs[Math.floor(hs.length / 2)] : 0;
  toks.forEach((k) => { if (k.hora || k.par || !H || !/^[1-9]\d{2}$|^\d{4}$/.test(k.t) || k.h < H * 0.85) return;
    if (/(voo|la|g3|ad|n[º°o])\s*$/i.test(naLinha(k, -1)) || /^\s*(pontos|milhas|pts|mil|R\$|BRL)/i.test(naLinha(k, 1))) return; const hh = +k.t.slice(0, -2), mm = k.t.slice(-2); if (hh < 24 && +mm < 60) k.hora = `${String(hh).padStart(2, '0')}:${mm}`; });
  // códigos de aeroporto; letra trocada pelo OCR (CIG por GIG) é corrigida pela cidade que aparece na tela
  const tudo = ' ' + semAcento(palavras.map(w => w.t).join(' ')) + ' ';
  const cidadeNaTela = (c) => { const a = AERO && AERO[c]; if (!a) return false; const cid = semAcento(CIDADE_PT[a[0]] || a[0]); return cid.length > 2 && tudo.includes(cid.split(/[\s/-]/)[0].length > 3 ? cid.split(/[\s/-]/)[0] : cid); };
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const cods = toks.filter(k => !k.hora && /^[A-Z]{3}$/.test(k.t) && !NAO_AER.has(k.t));
  cods.forEach(k => { if (ehAer(k.t) && cidadeNaTela(k.t)) k.cod = k.t; });
  const certos = [...new Set(cods.filter(k => k.cod).map(k => k.cod))], dif = (a, b) => [...a].filter((ch, i) => ch !== b[i]).length;
  cods.forEach(k => { if (k.cod) return;
    const alt = []; for (let i = 0; i < 3; i++) for (const ch of ABC) { if (ch === k.t[i]) continue; const c = k.t.slice(0, i) + ch + k.t.slice(i + 1); if (ehAer(c) && cidadeNaTela(c)) alt.push(c); }
    const alt2 = certos.filter(c => dif(c, k.t) <= 2);
    k.cod = alt.length === 1 ? alt[0] : alt2.length === 1 ? alt2[0] : ehAer(k.t) ? k.t : undefined; });
  // casa cada horário com o código mais perto na imagem (ao lado ou logo acima/abaixo)
  const T = toks.filter(k => k.hora), C = toks.filter(k => k.cod), pares = [];
  T.forEach(t => C.forEach(c => { const hm = (t.h + c.h) / 2, dx = Math.max(0, c.b.x0 - t.b.x1, t.b.x0 - c.b.x1), dy = Math.max(0, c.b.y0 - t.b.y1, t.b.y0 - c.b.y1);
    const s = (dy < hm * 0.6 ? dx / hm : dx / hm * 0.6) + dy / hm * 1.3; if (s <= 4.5) pares.push({ t, c, s }); }));
  pares.sort((a, b) => a.s - b.s).forEach(p => { if (p.t.par || p.c.usado) return; p.t.par = p.c; p.c.usado = true; });
  // "Direto" / "1 parada" vão para o meio da linha do voo mais perto (cada site põe num lugar: acima, abaixo ou no meio)
  const linhaVoo = T.filter(t => t.par).flatMap(a => T.filter(b => b !== a && b.par && b.b.x0 > a.b.x1 && Math.abs(b.cy - a.cy) < Math.min(a.h, b.h) * 0.6).slice(0, 1).map(b => ({ a, b })));
  toks.forEach(k => { let fr = null;
    if (/^direto$/i.test(k.t)) fr = [k];
    else if (/^\d$/.test(k.t)) { const o = toks.find(o => o !== k && Math.abs(o.cy - k.cy) < Math.min(o.h, k.h) * 0.6 && o.b.x0 >= k.b.x1 - 2 && o.b.x0 - k.b.x1 < k.h * 1.5); if (o && /^(paradas?|conex\S*|escalas?)$/i.test(o.t)) fr = [k, o]; }
    if (!fr || !linhaVoo.length) return;
    const cx = fr[0].cx, cy = fr[0].cy, alvo = linhaVoo.map(p => ({ p, d: Math.hypot(cx - (p.a.cx + p.b.cx) / 2, (cy - p.a.cy) * 2) })).sort((x, y) => x.d - y.d)[0];
    if (alvo.d > alvo.p.a.h * 12) return;
    const meio = (alvo.p.a.b.x1 + alvo.p.b.b.x0) / 2; fr.forEach((f, i) => { f.cy = alvo.p.a.cy; f.b = { ...f.b, x0: meio + i, x1: meio + i + 1 }; }); });
  // remonta o texto em linhas, de cima para baixo e da esquerda para a direita
  const resto = toks.filter(k => !k.usado).sort((a, b) => a.cy - b.cy), linhas = [];
  resto.forEach(k => { const l = linhas.find(l => Math.abs(l.cy - k.cy) < Math.min(l.h, k.h) * 0.6); if (l) { l.ks.push(k); } else linhas.push({ cy: k.cy, h: k.h, ks: [k] }); });
  return '#print\n' + linhas.sort((a, b) => a.cy - b.cy).map(l => l.ks.sort((a, b) => a.b.x0 - b.b.x0).map(k => k.hora ? (k.par ? `${k.hora} ${k.par.cod}` : k.hora) : k.t).join(' ')).join('\n');
}

// junta duas leituras do mesmo print: onde a primeira leu lixo ("F1:05:5LZ") e a segunda leu certo ("11:05", "SLZ"), fica a certa
const lixo = (t) => !/min\.?$/i.test(t) && /\d[:h]\d/.test(t) && /[A-Za-z]/.test(t.replace(/^[A-Z]{3}|[A-Z]{3}$/g, '').replace(/h/g, ''));
const util = (t) => /^\(?([A-Z]{3})\)?$/.test(t) || /^[0-9O]{1,2}[:h][0-9O]{2}$/.test(t);
export function printDuvidoso(ps) { return ps.some(w => lixo(String(w.t || ''))); }
export const ehLixo = (t) => lixo(String(t || ''));
export function juntarPalavras(a, b) {
  const area = (x) => Math.max(0, x.x1 - x.x0) * Math.max(0, x.y1 - x.y0);
  const sob = (p, q) => { const i = { x0: Math.max(p.x0, q.x0), y0: Math.max(p.y0, q.y0), x1: Math.min(p.x1, q.x1), y1: Math.min(p.y1, q.y1) }; return area(i) / Math.min(area(p), area(q) || 1); };
  const out = a.slice();
  b.forEach(w => { const sobre = out.filter(o => sob(o.b, w.b) > 0.3);
    if (!sobre.length) { out.push(w); return; }
    if (util(String(w.t).trim()) && sobre.some(o => lixo(String(o.t)))) { sobre.filter(o => lixo(String(o.t))).forEach(o => out.splice(out.indexOf(o), 1)); out.push(w); } });
  return out;
}
// entre várias releituras de um pedaço do print, fica a que mais parece "11:05 SLZ" (a que aparece mais vezes desempata)
export function melhorReleitura(ops) {
  const nota = (t) => t.split(/\s+/).filter(Boolean).reduce((a, p) => a + (/^\d{1,2}[:h]\d{2}$/.test(p) ? 2 : /^[A-Z]{3}$/.test(p) && ehAer(p) ? 1 : -1), 0);
  const vs = ops.map(t => String(t || '').trim()).filter(Boolean); if (!vs.length) return '';
  return vs.map(t => ({ t, n: nota(t) + vs.filter(o => o === t).length * 0.5 })).sort((a, b) => b.n - a.n)[0].t;
}
