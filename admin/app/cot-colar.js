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
function eventos(t) {
  const hora = (h) => { const [a, b] = h.split(/[:h]/); return `${String(+a).padStart(2, '0')}:${b}`; };
  const tf = [], cf = []; let m;
  const rT = /\b(\d{1,2}[:h]\d{2})\s*\(?\s*([A-Z]{3})\b/g; while ((m = rT.exec(t))) tf.push({ pos: m.index, fim: m.index + m[0].length, hora: hora(m[1]), cod: m[2] });
  const rC = /\b([A-Z]{3})\s*\)?\s+(\d{1,2}[:h]\d{2})\b/g; while ((m = rC.exec(t))) cf.push({ pos: m.index, fim: m.index + m[0].length, hora: hora(m[2]), cod: m[1] });
  const ign = /^(BRL|USD|EUR|CLP|ARS)$/;
  const a = tf.filter(e => !ign.test(e.cod)), b = cf.filter(e => !ign.test(e.cod));
  return b.length > a.length ? b : a;
}
const valor = (s) => s ? s.replace(/\s/g, '') : '';
function lerBloco(t) {
  const ev = eventos(t), ds = datas(t), voos = [];
  for (let i = 0; i + 1 < ev.length; i += 2) {
    const dep = ev[i], arr = ev[i + 1], prox = ev[i + 2] ? ev[i + 2].pos : t.length;
    const antes = voos.length ? ev[i - 1].fim : 0;
    const dt = ds.filter(d => d.pos >= antes && d.pos < dep.pos).pop() || (voos.length ? null : ds.find(d => d.pos < arr.pos));
    const trecho = (t.slice(dep.fim, arr.pos) + ' ' + t.slice(arr.fim, prox));
    const st = trecho.match(/(\d)\s*(?:parada|conex|escala|stop)/i);
    const tipo = /direto|sem escala|sem parada|nonstop/i.test(trecho) && !st ? 'Direto' : st ? (+st[1] === 1 ? '1 conexão' : '2 conexões') : 'Direto';
    const du = trecho.match(/(\d{1,2})\s*h(?:oras?)?\s*(\d{1,2})?\s*(?:min)?/i);
    voos.push({ rotulo: voos.length === 0 ? 'Ida' : voos.length === 1 ? 'Volta' : 'Trecho ' + (voos.length + 1), data: dt ? dt.iso : (voos.length ? voos[voos.length - 1].data : ''),
      ocod: dep.cod, onome: '', saida: dep.hora, dcod: arr.cod, dnome: '', chegada: arr.hora, tipo, duracao: du ? `${+du[1]}h${String(+(du[2] || 0)).padStart(2, '0')}` : '' });
  }
  // valores: o do site (subtotal/total/site/de) e o da Maktub (maktub/por/nosso)
  const N = '(?:R\\$|BRL)?\\s*(\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,2})?|\\d+(?:,\\d{1,2})?)';
  let site = '', mk = '', m;
  const rS = new RegExp(`(?:subtotal|total|no site|site|^\\s*de)\\b[^\\d\\n]{0,20}?${N}`, 'gim'); while ((m = rS.exec(t))) site = valor(m[1]);
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
