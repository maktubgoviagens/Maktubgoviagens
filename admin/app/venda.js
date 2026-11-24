// Maktub Go: detalhes de cada serviço do atendimento, fechamento (pagamento, comprovante)
// e envio das vendas fechadas para a planilha B2C.
// Cada serviço vira uma linha da planilha. O ID da linha (planilha_id) é gerado aqui e
// vai para a coluna "ID sistema", então a emissão sincronizada já nasce ligada ao card.

export const VOO = ['Passagens', 'Maktub Corporativo'];
const pergunta = (t, o) => window.pergunta(t, o); // folha de confirmação do app (index.html)
export const HOTEL = 'Hotelaria';
export const ehVoo = (x) => VOO.includes(x.produto);
export const ehHotel = (x) => x.produto === HOTEL;
// produto do app -> "Serviço" da planilha
export function servicoPlanilha(x) {
  if (ehVoo(x)) return x.pago_em === 'pagante' ? 'Passagens (Consolidadora)' : 'Passagens (Milhas)';
  return ({ 'Hotelaria': 'Hotéis', 'Viagem completa / pacote': 'Pacotes', 'Passeios e ingressos': 'Passeios', 'Taxa de Planejamento': 'Serviços / Consultoria', 'Outro': 'Serviços / Consultoria' })[x.produto] || x.produto;
}
export const numCard = (r) => r && r.numero ? '#' + String(r.numero).padStart(3, '0') : '';
const nb = (v) => { let x = String(v ?? '').trim(); if (x.includes(',')) x = x.replace(/\./g, '').replace(',', '.'); return x === '' || isNaN(+x) ? null : +x; };
const r2 = (n) => Math.round((+n || 0) * 100) / 100;
// custo da emissão em milhas = milhas x milheiro / 1000 + taxas (mesma conta da planilha)
export const custoMilhas = (x) => r2((+x.milhas || 0) * (+x.milheiro || 0) / 1000 + (+x.taxas || 0));
// emissão com as milhas do cliente da Gestão: não é venda. Fica fora de planilha, metas, comissão, conversão e dos totais do card;
// ao fechar, vira um Uso de milhas na ficha da Gestão do cliente e o voo entra no check-in.
export const ehCliente = (x) => !!x && ehVoo(x) && x.pago_em === 'cliente_gestao';
// card que só tem emissão com milhas do cliente: fica em Fechou, mas fora da conversão e do valor fechado
export const soMilhasCliente = (r) => { const IT = (r && r.itens) || []; return IT.length > 0 && IT.every(ehCliente); };
export const usaMilhas = (x) => ehVoo(x) && x.pago_em !== 'pagante' && x.pago_em !== 'cliente_gestao';
export const custoDe = (x) => ehCliente(x) ? 0 : usaMilhas(x) && (x.milhas || x.taxas) ? custoMilhas(x) : (+x.custo || 0);
export const vendaDe = (x) => ehCliente(x) ? 0 : (+x.venda || 0);
export const enviado = (x) => !!x.planilha_id;

// ---------- ida e volta com fornecedores diferentes ----------
// a emissão vira blocos ligados pelo mesmo "grupo" (um por trecho, até 4). Cada bloco é um item do card e uma linha da planilha,
// com companhia, fornecedor, forma de compra, milhas, custo, localizador e parte do valor próprios. Para metas, o grupo é uma venda só.
export const PARTES = { ida: 'IDA', volta: 'VOLTA', t1: 'TRECHO 1', t2: 'TRECHO 2', t3: 'TRECHO 3', t4: 'TRECHO 4' };
const LETRA = { ida: 'A', volta: 'B', t1: 'A', t2: 'B', t3: 'C', t4: 'D' };
export const emGrupo = (x) => !!(x && x.grupo);
export const blocosDe = (IT, g) => (IT || []).filter(y => y && y.grupo === g && !y.cancelado_em);
// forma de compra do bloco: as duas de milhas viram "milhas" e as duas compradas viram "pagante" (mesma regra de custo e de planilha)
export const COMPRAS = [['maktub', 'Milhas da Maktub', 'milhas'], ['fornecedor', 'Milhas do fornecedor', 'milhas'], ['pronta', 'Passagem pronta', 'pagante'], ['pagante', 'Pagante', 'pagante']];
export const compraDe = (x) => x.compra || (x.pago_em === 'pagante' ? 'pagante' : x.fornecedor ? 'fornecedor' : 'maktub');
// quem vendeu o trecho (o que a equipe precisa saber no pós-venda)
export const fornecedorDe = (x) => { const c = compraDe(x); return c === 'maktub' ? 'Maktub' : (x.fornecedor || (c === 'fornecedor' ? x.gestor : '') || ''); };
// "IDA 12/11 GRU > MAD | Gol | Soberano | LOC ABC123" (texto puro, para Operação, check-in e ficha do cliente)
export function cabTrecho(x) {
  const o = String(x.origem || '').trim().toUpperCase().slice(0, 3), d = String(x.destino || '').trim().toUpperCase().slice(0, 3);
  return [PARTES[x.parte] || '', ddmm(x.data_ida), o || d ? `${o} > ${d}` : ''].filter(Boolean).join(' ');
}
export function textoTrecho(x) {
  return [cabTrecho(x), x.cia_voo || x.cia_emissora || '', fornecedorDe(x), x.localizador ? 'LOC ' + String(x.localizador).toUpperCase() : ''].filter(Boolean).join(' | ');
}
// soma das partes do valor tem que bater com o valor da passagem; devolve o aviso ou ''
export function conferirGrupos(IT) {
  const gs = [...new Set((IT || []).filter(y => y.grupo && !y.cancelado_em).map(y => y.grupo))];
  for (const g of gs) {
    const B = blocosDe(IT, g), tot = +B[0].grupo_venda || 0, soma = r2(B.reduce((a, y) => a + (+y.venda || 0), 0));
    if (tot && Math.abs(soma - tot) > 0.01) return `A soma das partes do valor (${soma.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) não bate com o valor da passagem (${tot.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Ajuste as partes de ${B.map(y => PARTES[y.parte] || '').join(' e ').toLowerCase()} antes de salvar.`;
  }
  return '';
}
// divide o valor da passagem entre os blocos pelo custo de cada um; parte digitada à mão fica como está
export function ratearGrupo(IT, g) {
  const B = blocosDe(IT, g), tot = +(B[0] || {}).grupo_venda || 0; if (!tot || !B.length) return;
  const livres = B.filter(y => !y.venda_fixa && !enviado(y)); if (!livres.length) return;
  const alvo = tot - B.filter(y => !livres.includes(y)).reduce((a, y) => a + (+y.venda || 0), 0);
  const pesos = livres.map(y => custoDe(y) || 0), sp = pesos.reduce((a, b) => a + b, 0);
  let resto = alvo; livres.forEach((y, k) => { const v = k === livres.length - 1 ? r2(resto) : r2((sp ? pesos[k] / sp : 1 / livres.length) * alvo); resto -= v; y.venda = v; });
}
// liga o interruptor: um bloco por trecho, cada um só ida, com os dados do voo daquele trecho
export function dividirEmBlocos(IT, i) {
  const x = IT[i], ls = voosDaEmissao(x).filter(l => l.o || l.d).slice(0, 4);
  const L = ls.length >= 2 ? ls : [{ o: up3(x.origem), d: up3(x.destino), data: x.data_ida || '', hora: x.hora_ida || '', chegada: x.chegada_ida || '' }, { o: up3(x.destino), d: up3(x.origem), data: x.data_volta || '', hora: x.hora_volta || '', chegada: x.chegada_volta || '' }];
  const g = 'g' + Math.random().toString(36).slice(2, 8), partes = L.length === 2 ? ['ida', 'volta'] : L.map((_, k) => 't' + (k + 1));
  const total = r2(vendaDe(x)) || null;
  const blocos = L.map((l, k) => {
    const comum = { grupo: g, parte: partes[k], grupo_venda: total, tipo_trecho: 'ida', origem: l.o, destino: l.d, data_ida: l.data || (k === L.length - 1 && L.length === 2 ? x.data_volta || '' : k === 0 ? x.data_ida || '' : ''), hora_ida: l.hora || '', chegada_ida: l.chegada || '', data_volta: null, hora_volta: '', chegada_volta: '', ct_on: false, ct: null, trechos: '', hrs: null, chs: null, compra: compraDe(x), sugere_blocos: false };
    // o primeiro bloco fica com o que já foi preenchido; os outros começam com companhia, passageiros e bagagem e o resto em branco
    if (!k) return Object.assign(x, comum);
    return { produto: x.produto, pago_em: x.pago_em || 'milhas', cia_emissora: x.cia_emissora || '', cia_voo: '', passageiros: x.passageiros ?? null, bagagem: x.bagagem ?? null,
      ...(Array.isArray(x.pax) && x.pax.length ? { pax: JSON.parse(JSON.stringify(x.pax)) } : {}), custo: null, venda: null, ...comum };
  });
  IT.splice(i, 1, ...blocos);
  ratearGrupo(IT, g);
}
// algum bloco além do primeiro já tem dado digitado (para pedir confirmação antes de juntar)
export const grupoTemDados = (IT, g) => blocosDe(IT, g).slice(1).some(y => y.localizador || +y.milhas || +y.taxas || +y.custo || y.fornecedor || y.print);
// desliga o interruptor: volta para uma emissão só, com os dados do primeiro trecho
export function juntarBlocos(IT, g) {
  const B = blocosDe(IT, g); if (!B.length) return;
  const x = B[0], u = B[B.length - 1], total = +x.grupo_venda || r2(B.reduce((a, y) => a + (+y.venda || 0), 0)) || null;
  if (B.length === 2 && up3(u.destino) === up3(x.origem)) Object.assign(x, { tipo_trecho: 'iv', data_volta: u.data_ida || null, hora_volta: u.hora_ida || '', chegada_volta: u.chegada_ida || '' });
  else if (B.length > 1) Object.assign(x, { tipo_trecho: 'multi', destino: u.destino, trechos: B.map(y => `${up3(y.origem)}-${up3(y.destino)}${y.data_ida ? ' ' + ddmm(y.data_ida) : ''}`).join('\n'), hrs: B.map(y => y.hora_ida || '') });
  x.venda = total;
  ['grupo', 'parte', 'grupo_venda', 'venda_fixa', 'compra'].forEach(k => delete x[k]);
  for (let k = IT.length - 1; k >= 0; k--) if (IT[k] !== x && IT[k].grupo === g) IT.splice(k, 1);
}

// passageiros do voo: nome, CPF e nascimento de cada um (B2C). A quantidade tem que bater com "Passageiros".
const soDig = (v) => String(v || '').replace(/\D/g, '');
export function cpfValido(v) {
  const c = soDig(v); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n) => { let t = 0; for (let i = 0; i < n; i++) t += +c[i] * (n + 1 - i); const r = (t * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === +c[9] && dv(10) === +c[10];
}
export const fmtCpf = (v) => { const d = soDig(v); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : v; };
// nascimento digitado só com números: a barra entra sozinha (dd/mm/aaaa); também aceita colar 21/02/2002, 21022002 ou 2002-02-21
export const isoBr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
export function mascaraData(v) {
  const t = String(v || '').trim(), iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  const d = iso ? iso[3] + iso[2] + iso[1] : t.replace(/\D/g, '').slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
export function brIso(txt) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt || ''); if (!m) return '';
  const [dd, mm, aa] = [+m[1], +m[2], +m[3]], dt = new Date(aa, mm - 1, dd);
  if (aa < 1900 || dt > new Date() || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}
const nPax = (x) => Math.max(parseInt(x.passageiros, 10) || 0, 0);
export function paxAjustado(x) {
  const n = nPax(x); x.pax = Array.isArray(x.pax) ? x.pax : [];
  while (x.pax.length < n) x.pax.push({ nome: '', cpf: '', nasc: '' });
  return x.pax.slice(0, n);
}
function pendenciasPax(x) {
  const n = nPax(x); if (!n) return [];
  const L = paxAjustado(x), f = [];
  L.forEach((p, k) => {
    const falta = [!String(p.nome || '').trim().includes(' ') && 'nome completo', !cpfValido(p.cpf) && 'CPF válido', !p.nasc && 'nascimento'].filter(Boolean);
    if (falta.length) f.push(`passageiro ${k + 1}: ${falta.join(', ')}`);
  });
  return f;
}

// ---------- o mínimo que trava o lançamento e o que vira conferência (decisão de 14/11/2026) ----------
// Trava: valor de venda e custo de cada serviço, onde comprou (ou gestor/conta nas milhas), localizador e
// data e horário de saída de todos os voos. Passageiros, CPF, nascimento, bagagem, print e companhia
// não travam: a venda sobe e esses itens ficam em "Vendas a conferir". Nada deixa de ser gravado.
// Cada falta: { k: campo, rot: texto }. O campo diz o que a tela curta do Fechou mostra.
export function minimoItem(x) {
  if (ehCliente(x)) return minimoCliente(x);
  const f = [];
  if (!x.venda) f.push({ k: 'venda', rot: 'valor de venda' });
  if (!custoDe(x) && x.produto !== 'Taxa de Planejamento') f.push({ k: usaMilhas(x) ? 'milhas' : 'custo', rot: usaMilhas(x) ? 'custo (milhas, milheiro e taxas)' : 'custo' });
  if (usaMilhas(x)) { if (!String(x.gestor || '').trim() && !String(x.conta || '').trim() && !(x.grupo && compraDe(x) === 'fornecedor' && String(x.fornecedor || '').trim())) f.push({ k: 'gestor', rot: 'gestor ou conta das milhas' }); }
  else if (!String(x.fornecedor || '').trim()) f.push({ k: 'fornecedor', rot: 'onde comprou' });
  if (ehVoo(x)) {
    if (!String(x.localizador || '').trim()) f.push({ k: 'localizador', rot: 'localizador' });
    // data e horário de saída de cada voo: é deles que saem o aviso de check-in e o envio do bilhete
    pendenciasHorarios(x).forEach(t => f.push({ k: 'voos', rot: t }));
  }
  return f;
}
// o que falta para um serviço poder ir para a planilha (só o mínimo)
export const pendenciasItem = (x) => minimoItem(x).map(p => p.rot);
// conferência de cada serviço já lançado: não trava, só aparece em "Vendas a conferir"
export function conferirItem(x) {
  if (x.cancelado_em) return [];
  if (ehCliente(x)) return conferirCliente(x);
  const f = [];
  if (ehVoo(x)) {
    if (!x.passageiros) f.push({ k: 'passageiros', rot: 'quantidade de passageiros' });
    else pendenciasPax(x).forEach(t => f.push({ k: 'pax', rot: t }));
    if (x.bagagem == null || x.bagagem === '') f.push({ k: 'bagagem', rot: 'bagagem despachada' });
    if (!x.print) f.push({ k: 'print', rot: 'print da tarifa' });
    if (!String(x.cia_emissora || '').trim()) f.push({ k: 'cia_emissora', rot: 'companhia' });
  } else if (ehHotel(x) && !x.carta) f.push({ k: 'carta', rot: 'carta de boas-vindas ao hotel' });
  return f;
}
const rotServico = (x) => ehCliente(x) ? 'Milhas do cliente' : x.produto;
// faltas do mínimo da venda inteira: pagamento (i = -1) e cada serviço ainda não lançado
export function faltasMinimo(r) {
  const F = r.fech || {}, IT = r.itens || [], f = [];
  // pagamento e comprovante só quando há venda da Maktub a lançar (emissão com milhas do cliente não é venda)
  const vendas = IT.filter(x => !ehCliente(x) && !enviado(x) && !x.cancelado_em);
  if (vendas.length) {
    if (!F.forma) f.push({ i: -1, k: 'forma', rot: 'forma de pagamento' });
    // sem as parcelas não dá para medir o custo da maquininha
    if (F.forma === 'cartao' && !+F.parcelas) f.push({ i: -1, k: 'parcelas', rot: 'em quantas vezes no cartão' });
    if (F.forma === 'pix_cartao') {
      if (!+F.pix_valor) f.push({ i: -1, k: 'pix_valor', rot: 'valor recebido no Pix' });
      if (!+F.cartao_liq) f.push({ i: -1, k: 'cartao_liq', rot: 'valor recebido no cartão' });
      if (!+F.parcelas) f.push({ i: -1, k: 'parcelas', rot: 'em quantas vezes no cartão' });
    }
    if (!F.comprovante) f.push({ i: -1, k: 'comprovante', rot: 'comprovante de pagamento' });
  }
  IT.forEach((x, i) => {
    if (x.cancelado_em || (ehCliente(x) ? x.gestao_em : enviado(x))) return;
    minimoItem(x).forEach(p => f.push({ i, ...p }));
  });
  return f;
}
// a mesma lista em texto, agrupada por serviço (para os avisos do card e do funil)
const emTexto = (r, L) => {
  const IT = r.itens || [], txt = [], por = new Map();
  L.forEach(p => { if (p.i < 0) { txt.push(p.rot); return; } if (!por.has(p.i)) por.set(p.i, []); por.get(p.i).push(p.rot); });
  por.forEach((rots, i) => txt.push(`${rotServico(IT[i])}: ${rots.join(', ')}`));
  return txt;
};
export const pendenciasMinimo = (r) => emTexto(r, faltasMinimo(r));
// conferência da venda lançada: comprovante conferido pelo financeiro e os itens que não travaram
export function faltasConferencia(r) {
  const F = r.fech || {}, IT = r.itens || [], f = [];
  if (F.comprovante && !F.conferido && IT.some(x => !ehCliente(x) && !x.cancelado_em)) f.push({ i: -1, k: 'comprovante', rot: 'comprovante conferido com o extrato' });
  IT.forEach((x, i) => conferirItem(x).forEach(p => f.push({ i, ...p })));
  return f;
}
export const pendenciasConferencia = (r) => emTexto(r, faltasConferencia(r));
// voos da emissão (ida, volta, cada trecho do multitrecho) com a data e o horário de saída que o check-in vai usar.
// O horário vem da cotação quando bate a rota; o digitado no fechamento vale mais (ida, volta e cada trecho do meio).
function voosDaEmissao(x) {
  const tipo = x.tipo_trecho || 'iv', ct = Array.isArray(x.ct) ? x.ct : [], porTrecho = !!(x.ct_on && ct.length);
  let ls = (porTrecho ? ct : linhasPadrao(x, { tipoPadrao: tipo })).map(l => ({ o: up3(l.o), d: up3(l.d), data: l.data || '', hora: l.hora || '', chegada: l.chegada || '' }));
  // só ida: a volta que sobrou de antes (campo escondido) não é voo
  if (tipo === 'ida' && !porTrecho) ls = ls.slice(0, 1);
  ls.forEach(l => { const c = ct.find(q => up3(q.o) === l.o && up3(q.d) === l.d && (!q.data || !l.data || q.data === l.data)); if (c) { if (!l.hora && c.hora) l.hora = c.hora; if (!l.chegada && c.chegada) l.chegada = c.chegada; } });
  const hrs = Array.isArray(x.hrs) ? x.hrs : [], chs = Array.isArray(x.chs) ? x.chs : [];
  ls.forEach((l, k) => { if (hrs[k]) l.hora = hrs[k]; if (chs[k]) l.chegada = chs[k]; });
  if (ls.length && x.hora_ida) ls[0].hora = x.hora_ida;
  if (ls.length > 1 && tipo !== 'ida' && x.hora_volta) ls[ls.length - 1].hora = x.hora_volta;
  // horário de chegada (vem da cotação ou do print da emissão): só informativo, não trava nada
  if (ls.length && x.chegada_ida) ls[0].chegada = x.chegada_ida;
  if (ls.length > 1 && tipo !== 'ida' && x.chegada_volta) ls[ls.length - 1].chegada = x.chegada_volta;
  return ls;
}
// voos da emissão para a tela curta do Fechou: data e horário de saída de cada um, com o jeito certo de gravar
// (ida e volta: campos da ida e da volta; trechos separados: cada trecho; multitrecho escrito: a linha do trecho)
export function voosEditaveis(x) {
  const ls = voosDaEmissao(x), tipo = x.tipo_trecho || 'iv', porTrecho = !!(x.ct_on && Array.isArray(x.ct) && x.ct.length), multi = tipo === 'multi' && !porTrecho;
  const nome = (k) => ls.length === 1 ? 'Ida' : tipo === 'iv' && ls.length === 2 ? (k ? 'Volta' : 'Ida') : `Voo ${k + 1}`;
  const ult = ls.length - 1;
  return ls.map((l, k) => ({ rot: nome(k) + (l.o && l.d ? ` (${l.o} → ${l.d})` : ''), data: l.data, hora: l.hora,
    setData: (v) => {
      if (porTrecho) { x.ct[k].data = v; return; }
      if (multi) { const L = String(x.trechos || '').split('\n'), cheias = L.map((t, j) => t.trim() ? j : -1).filter(j => j >= 0), j = cheias[k] ?? L.length; L[j] = String(L[j] || '').replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?/, '') + (v ? ' ' + v.split('-').reverse().join('/') : ''); x.trechos = L.join('\n'); if (k === 0) x.data_ida = v || null; if (k === ult) x.data_volta = v || null; return; }
      if (k === 0) x.data_ida = v || null; else x.data_volta = v || null;
    },
    setHora: (v) => { x.hrs = Array.isArray(x.hrs) ? x.hrs : []; x.hrs[k] = v; if (k === 0) x.hora_ida = v; else if (k === ult) x.hora_volta = v; } }));
}
export function pendenciasHorarios(x) {
  const ls = voosDaEmissao(x), tipo = x.tipo_trecho || 'iv', f = [];
  if (!ls.length) return ['data da ida', 'horário de saída da ida'];
  const nome = (k) => ls.length === 1 ? 'da ida' : tipo === 'iv' && ls.length === 2 ? (k ? 'da volta' : 'da ida') : `do voo ${k + 1}${ls[k].o && ls[k].d ? ` (${ls[k].o} → ${ls[k].d})` : ''}`;
  ls.forEach((l, k) => { if (!l.data) f.push('data ' + nome(k)); if (!l.hora) f.push('horário de saída ' + nome(k)); });
  return f;
}
// o que trava o Fechou (só o mínimo); o nome fica por causa dos avisos do card e do funil
export const pendenciasFechamento = (r) => pendenciasMinimo(r);
// card concluído: cada venda na planilha (com comprovante) e cada emissão com milhas do cliente lançada na Gestão (ou cancelada)
export const concluida = (r) => {
  const IT = (r && r.itens) || [];
  return r.resultado === 'Fechou' && IT.length > 0 && IT.every(x => ehCliente(x) ? !!(x.gestao_em || x.cancelado_em) : enviado(x))
    && (IT.every(ehCliente) || !!(r.fech || {}).comprovante);
};
// o que falta lançar ao tocar no botão do Fechou: vendas para a planilha e emissões com milhas do cliente para a Gestão
// estado da conferência da venda lançada (gravado no card: aparece em "Vendas a conferir" e no alerta dos sócios)
export function estadoConferencia(r, quem) {
  const pend = pendenciasConferencia(r), agora = new Date().toISOString();
  return pend.length ? { conferencia_status: 'a_conferir', conferencia_pend: pend, conferida_por: null, conferida_em: null }
    : { conferencia_status: 'conferida', conferencia_pend: [], conferida_por: quem || null, conferida_em: agora };
}
export const aEnviar = (IT) => ({ vendas: (IT || []).filter(x => !ehCliente(x) && !enviado(x)), cliente: (IT || []).filter(x => ehCliente(x) && !x.gestao_em && !x.cancelado_em) });

// ---------- emissão com as milhas do cliente da Gestão ----------
const ok3 = (t) => /^[A-Za-z]{3}$/.test(String(t || '').trim());
export const voosCliente = (x) => (Array.isArray(x.voos) ? x.voos : []);
// emissão com milhas do cliente: travam só programa, milhas usadas, localizador e voos completos
function minimoCliente(x) {
  const f = [];
  if (!String(x.programa || '').trim()) f.push({ k: 'programa', rot: 'programa' });
  if (!(+x.milhas > 0)) f.push({ k: 'milhas', rot: 'milhas usadas' });
  if (!String(x.localizador || '').trim()) f.push({ k: 'localizador', rot: 'localizador' });
  const V = voosCliente(x);
  if (!V.length) f.push({ k: 'voos', rot: 'voos' });
  // datas e horários obrigatórios em todos os voos: é deles que sai o aviso de check-in
  V.forEach((v, k) => { const fv = [!ok3(v.o) && 'origem', !ok3(v.d) && 'destino', !v.data && 'data', !v.hora && 'horário']; if (fv.some(Boolean)) f.push({ k: 'voos', rot: `voo ${k + 1}: ${fv.filter(Boolean).join(', ')}` }); });
  return f;
}
// o resto da emissão com milhas do cliente vira conferência
function conferirCliente(x) {
  const f = [];
  if (!x.data_emissao) f.push({ k: 'data_emissao', rot: 'data da emissão' });
  if (!String(x.cia_emissora || '').trim()) f.push({ k: 'cia_emissora', rot: 'companhia' });
  if (!x.passageiros) f.push({ k: 'passageiros', rot: 'quantidade de passageiros' });
  else pendenciasPax(x).forEach(t => f.push({ k: 'pax', rot: t }));
  if (!(+x.pagante > 0) && !(+x.rex > 0)) f.push({ k: 'pagante', rot: 'valor pagante' });
  if (x.taxas_quem === 'maktub' && !(+x.taxas > 0)) f.push({ k: 'taxas', rot: 'taxas pagas pela Maktub' });
  if (x.taxas_quem === 'maktub' && !x.taxas_pago_em) f.push({ k: 'taxas_pago_em', rot: 'data em que a Maktub pagou as taxas' });
  if (!x.print) f.push({ k: 'print', rot: 'print da emissão' });
  return f;
}
export const pendenciasCliente = (x) => minimoCliente(x).map(p => p.rot);
const ddmm = (iso) => iso ? String(iso).slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '';
const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const juntarE = (L) => L.length > 1 ? L.slice(0, -1).join(', ') + ' e ' + L[L.length - 1] : (L[0] || '');
// descrição do Uso de milhas: "GIG > GRU 12/11, GRU > GIG 15/11, econômica, Ana e João"
export function descCliente(x) {
  if (x.desc_manual && String(x.descricao || '').trim()) return String(x.descricao).trim();
  const tr = voosCliente(x).filter(v => v.o || v.d).map(v => `${up3(v.o)} > ${up3(v.d)}${v.data ? ' ' + ddmm(v.data) : ''}`);
  const pax = juntarE((x.pax || []).slice(0, nPax(x)).map(p => primeiroNome(p.nome)).filter(Boolean));
  return [tr.join(', '), String(x.cabine || '').trim().toLowerCase(), pax].filter(Boolean).join(', ');
}
// rota, datas e horários do cabeçalho saem da lista de voos (o título, a agenda e o check-in usam esses campos)
function cabecalhoCliente(x) {
  const V = voosCliente(x).filter(v => v.o || v.d); if (!V.length) return;
  const ult = V[V.length - 1], volta = V.length === 2 && up3(V[1].d) === up3(V[0].o);
  x.tipo_trecho = V.length === 1 ? 'ida' : volta ? 'iv' : 'multi';
  x.origem = up3(V[0].o); x.destino = volta || V.length === 1 ? up3(V[0].d) : up3(ult.d);
  x.data_ida = V[0].data || null; x.hora_ida = V[0].hora || '';
  x.data_volta = V.length > 1 ? (ult.data || null) : null; x.hora_volta = V.length > 1 ? (ult.hora || '') : '';
  x.trechos = x.tipo_trecho === 'multi' ? V.map(v => `${up3(v.o)}-${up3(v.d)}${v.data ? ' ' + ddmm(v.data) : ''}`).join('\n') : '';
}
// retrato do que vai para a Gestão: se mudou depois de lançado, aparece "Atualizar na Gestão"
export const snapCliente = (x) => JSON.stringify([x.data_emissao, x.programa, +x.milhas || 0, +x.taxas || 0, +x.pagante || 0, +x.rex || 0, descCliente(x), x.taxas_quem, x.taxas_pago_em, x.localizador, x.cia_emissora, x.cia_voo, voosCliente(x), nPax(x)]);
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function prepararCliente(x, ctx) {
  if (!x.ref) x.ref = uuid();
  if (!x.taxas_quem) x.taxas_quem = 'cliente';
  if (!x.data_emissao) x.data_emissao = hojeIso();
  if (!voosCliente(x).length) {
    // aproveita a rota e as datas que já estavam na emissão
    const L = linhasPadrao(x, ctx).filter(l => l.o || l.d);
    x.voos = L.length ? L.map((l, k) => ({ o: l.o, d: l.d, data: l.data || '', hora: (k === 0 ? x.hora_ida : k === L.length - 1 ? x.hora_volta : '') || '' })) : [{ o: '', d: '', data: '', hora: '' }];
  }
  if (ctx.gestao && ctx.gestao.cliente_id) { x.cliente_gestao_id = ctx.gestao.cliente_id; x.cliente_gestao_nome = ctx.gestao.nome; }
  x.custo = null; x.venda = null; x.milheiro = null; x.ct_on = false;
}

const seg = (k, i, ops, v) => `<div class="seg" style="margin:6px 0 8px">${ops.map(([val, l]) => `<button type="button" data-it="${i}" data-k="${k}" data-set="${val}" class="${String(v ?? '') === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const inp = (X, k, i, rot, v, t = 's', extra = '') => `<label class="fl"><span>${rot}</span><input data-it="${i}" data-k="${k}" data-t="${t}" value="${X.esc(v ?? '')}" ${t === 'n' ? 'inputmode="decimal"' : ''} ${t === 'd' ? 'type="date"' : ''} ${t === 'h' ? 'type="time"' : ''} ${extra}></label>`;
const dupla = (a, b) => `<div class="duas-col">${a}${b}</div>`;
const chk = (X, k, i, rot, v, dis) => `<label class="fc" style="margin:8px 0"><input type="checkbox" data-it="${i}" data-k="${k}" data-t="b" ${v ? 'checked' : ''} ${dis ? 'disabled' : ''}><span>${rot}</span></label>`;

// item ainda na cotação: o formato curto. Custos reais, dados do voo, milhas e emissão ficam para o fechamento (Emitiu).
// Já emitido, já na planilha ou com milhas do cliente da Gestão: sempre o formulário completo.
export const naCotacao = (x, ctx) => !!(ctx && ctx.cotacao) && !ehCliente(x) && !enviado(x) && !x.emitido;
const campoForn = (X, x, i, rot) => `<label class="fl"><span>${rot}</span><input data-it="${i}" data-k="fornecedor" value="${X.esc(x.fornecedor || '')}" list="dlFornV" autocomplete="off" placeholder="Buscar ou cadastrar"></label><button type="button" class="forn-novo" data-fornnovo="${i}" hidden></button>`;
function htmlItemCotacao(X, x, i, ctx) {
  const voo = ehVoo(x), verCusto = X.verMargem !== false;
  const aero = 'maxlength="40" placeholder="Cidade ou código" data-aero="cod" autocomplete="off"';
  return `${voo ? dupla(inp(X, 'origem', i, 'Origem', x.origem, 's', aero), inp(X, 'destino', i, 'Destino', x.destino, 's', aero)) + (x.trecho && !x.origem && !x.destino ? `<div class="sub" style="margin:-2px 0 6px">Trecho anotado antes: ${X.esc(x.trecho)}</div>` : '') : ''}
    ${ehHotel(x) ? inp(X, 'destino', i, 'Cidade', x.destino) : ''}
    <div class="cli-lado">${inp(X, 'nome', i, 'Nome', x.nome, 's', `placeholder="${voo ? 'Companhia ou tarifa' : ehHotel(x) ? 'Nome do hotel' : 'Nome do serviço'}" ${voo ? '' : 'list="dlServV"'} autocomplete="off"`)}<div>${campoForn(X, x, i, 'Fornecedor (onde cotou)')}</div></div>
    ${dupla(inp(X, 'data_ida', i, voo ? 'Ida' : 'Check-in', x.data_ida ?? ctx.ida, 'd'), inp(X, 'data_volta', i, voo ? 'Volta' : 'Check-out', x.data_volta ?? ctx.volta, 'd'))}
    ${dupla(inp(X, 'venda', i, 'Valor de venda (R$)', x.venda, 'n'), verCusto ? inp(X, 'custo_dia', i, 'Valor de custo do dia (R$)', x.custo_dia, 'n') : '<div></div>')}
    ${verCusto ? '<div class="sub" style="margin:-2px 0 4px">O custo do dia é interno: não aparece para o cliente nem no link de cotação.</div>' : ''}`;
}

// detalhes de um serviço (dentro do atendimento)
function htmlItem(X, x, i, ctx) {
  if (ehCliente(x)) return htmlCliente(X, x, i, ctx);
  if (naCotacao(x, ctx)) return htmlItemCotacao(X, x, i, ctx);
  const trava = enviado(x);
  somarTrechos(x);
  const base = `${dupla(inp(X, 'custo', i, usaMilhas(x) ? 'Custo (calculado)' : x.ct_on ? 'Custo (soma dos trechos)' : x.grupo ? 'Valor pago (R$)' : 'Custo (R$)', usaMilhas(x) && (x.milhas || x.taxas) ? custoMilhas(x) : x.custo, 'n', (usaMilhas(x) && (x.milhas || x.taxas)) || x.ct_on ? 'readonly' : ''), inp(X, 'venda', i, x.grupo ? (ctx.vendaTotal ? 'Parte do valor (pelo custo)' : 'Parte do valor (R$)') : ctx.vendaTotal ? 'Venda (rateada do total)' : 'Venda (R$)', x.venda, 'n', ctx.vendaTotal && !trava ? 'readonly' : ''))}`;
  const ref = [x.trecho && ehVoo(x) ? 'Trecho cotado: ' + X.esc(x.trecho) : '', x.custo_dia != null && x.custo_dia !== '' && X.verMargem !== false ? 'Custo do dia na cotação: ' + X.brl2(+x.custo_dia) : ''].filter(Boolean).join(' · ');
  if (!ctx.detalhes) return base + (ref ? `<div class="sub" style="margin:-2px 0 4px">${ref}</div>` : '');
  let det = ref ? `<div class="sub" style="margin:0 0 6px">${ref}</div>` : '';
  if (ehVoo(x)) {
    // print da emissão (bilhete, e-mail da companhia, tela do programa): a IA preenche o que ainda estiver vazio
    det += `<div class="botoes4" style="margin:2px 0 4px"><button type="button" class="sec" data-lercola="${i}">Colar print da emissão</button><label class="sec" style="display:block;text-align:center;cursor:pointer;padding:10px">Escolher da galeria<input type="file" accept="image/*" multiple data-lerarq="${i}" style="display:none"></label></div>
      <div class="sub" style="margin:0 0 8px">${x.lido_em ? 'Preenchido pelo print. Confira cada campo.' + (x.lido_obs ? ' ' + X.esc(x.lido_obs) : '') : 'O print da emissão preenche localizador, companhia, datas, saída e chegada de cada voo e passageiros' + (usaMilhas(x) ? ', milhas e taxas' : '') + '. Só o que estiver vazio.'}</div>`;
    det += `${x.grupo ? '' : `<div class="sub" style="margin:6px 0 0">Trecho</div>${seg('tipo_trecho', i, [['iv', 'Ida e volta'], ['ida', 'Só ida'], ['multi', 'Multitrecho']], x.tipo_trecho || ctx.tipoPadrao)}${htmlInterruptor(X, x, i, trava, ctx)}`}
      ${dupla(inp(X, 'origem', i, 'Origem', x.origem, 's', 'maxlength="40" placeholder="Cidade ou código" data-aero="cod" autocomplete="off"'), inp(X, 'destino', i, 'Destino', x.destino, 's', 'maxlength="40" placeholder="Cidade ou código" data-aero="cod" autocomplete="off"'))}
      ${(x.tipo_trecho || ctx.tipoPadrao) === 'multi' ? `<label class="fl"><span>Trechos (um por linha)</span><textarea data-it="${i}" data-k="trechos" rows="3" placeholder="GIG-LIS 10/11&#10;LIS-MAD 15/11&#10;MAD-GIG 22/11">${X.esc(x.trechos || '')}</textarea></label>` : ''}
      ${dupla(inp(X, 'data_ida', i, x.grupo ? 'Data do voo' : 'Data da ida', x.data_ida ?? ctx.ida, 'd'), (x.tipo_trecho || ctx.tipoPadrao) === 'ida' ? '<div></div>' : inp(X, 'data_volta', i, 'Data da volta', x.data_volta ?? ctx.volta, 'd'))}
      ${(m => dupla(inp(X, 'hora_ida', i, m ? 'Saída do 1º trecho' : x.grupo ? 'Horário de saída' : 'Horário de saída da ida', x.hora_ida, 'h'), (x.tipo_trecho || ctx.tipoPadrao) === 'ida' ? '<div></div>' : inp(X, 'hora_volta', i, m ? 'Saída do último trecho' : 'Horário de saída da volta', x.hora_volta, 'h')))((x.tipo_trecho || ctx.tipoPadrao) === 'multi')}
      ${(m => dupla(inp(X, 'chegada_ida', i, m ? 'Chegada do 1º trecho' : x.grupo ? 'Horário de chegada' : 'Chegada da ida', x.chegada_ida, 'h'), (x.tipo_trecho || ctx.tipoPadrao) === 'ida' ? '<div></div>' : inp(X, 'chegada_volta', i, m ? 'Chegada do último trecho' : 'Chegada da volta', x.chegada_volta, 'h')))((x.tipo_trecho || ctx.tipoPadrao) === 'multi')}
      ${(x.tipo_trecho || ctx.tipoPadrao) === 'multi' ? (ls => ls.length > 2 ? `<div class="duas-col">${ls.slice(1, -1).map((l, j) => inp(X, 'hrm', i, `Saída do voo ${j + 2}${l.o && l.d ? ` (${l.o} → ${l.d})` : ''}`, l.hora, 'h', `data-hrm="${i}|${j + 1}"`)).join('')}</div>` : '')(voosDaEmissao(x)) : ''}
      <div class="sub" style="margin:-2px 0 6px">O horário de saída faz o aviso de check-in chegar 24 h antes do voo. Data e horário de saída de todos os voos são obrigatórios para fechar.</div>
      ${x.grupo ? `<div class="sub" style="margin:6px 0 0">Forma de compra</div><div class="seg-2x2">${seg('compra', i, COMPRAS.map(([v, l]) => [v, l]), compraDe(x))}</div>` : `<div class="sub" style="margin:6px 0 0">Como foi pago</div>${seg('pago_em', i, [['milhas', 'Milhas'], ['pagante', 'Pagante']].concat(ctx.gestao && ctx.gestao.ativo && !trava ? [['cliente_gestao', 'Milhas do cliente da Gestão']] : []), x.pago_em || 'milhas')}`}
      ${dupla(inp(X, 'cia_emissora', i, 'Emitido na cia', x.cia_emissora, 's', 'placeholder="Azul"'), inp(X, 'cia_voo', i, 'Voa de (se for aliança)', x.cia_voo, 's', 'placeholder="Turkish"'))}
      ${x.cia_voo && x.cia_emissora && x.cia_voo.trim().toLowerCase() !== x.cia_emissora.trim().toLowerCase() ? `<div class="config" style="margin:4px 0 8px">Aliança: emitido na ${X.esc(x.cia_emissora)}, voa de ${X.esc(x.cia_voo)}. O check-in e o bilhete são pela ${X.esc(x.cia_voo)}.</div>` : ''}
      ${usaMilhas(x) ? `${dupla(inp(X, 'conta', i, 'Conta usada', x.conta), inp(X, 'gestor', i, 'Gestor da conta', x.gestor))}
      <div class="duas-col" style="grid-template-columns:1fr 1fr 1fr">${inp(X, 'milhas', i, x.ct_on ? 'Milhas (soma)' : 'Milhas', x.milhas, 'n', x.ct_on ? 'readonly' : '')}${inp(X, 'milheiro', i, x.ct_on ? 'Milheiro (média)' : 'Milheiro (R$)', x.milheiro, 'n', x.ct_on && (x.ct || []).some(l => l.milheiro != null && l.milheiro !== '') ? 'readonly' : '')}${inp(X, 'taxas', i, x.ct_on ? 'Taxas (soma)' : 'Taxas (R$)', x.taxas, 'n', x.ct_on ? 'readonly' : '')}</div>` : ''}
      ${x.grupo ? '' : htmlTrechos(X, x, i, trava, ctx)}
      ${dupla(inp(X, 'localizador', i, 'Localizador', x.localizador, 's', 'style="text-transform:uppercase"'), inp(X, 'passageiros', i, 'Passageiros', x.passageiros ?? ctx.pax, 'n', 'inputmode="numeric"'))}
      ${htmlPax(X, x, i, false, ctx)}
      <div class="sub" style="margin:6px 0 0">Bagagem despachada por passageiro</div>${seg('bagagem', i, [['0', 'Não tem'], ['1', '1 mala'], ['2', '2 malas'], ['3', '3 malas']], x.bagagem)}
      <div class="emchk" style="margin:4px 0 8px"><button type="button" data-print="${i}" class="${x.print ? 'ok' : ''}"><span class="cx">${x.print ? '✓' : '+'}</span><span>${x.print ? 'Print da tarifa anexado (tocar para ver)' : 'Anexar print da tarifa'}</span></button>${!x.print ? `<button type="button" data-printcola="${i}"><span class="cx">⎘</span><span>Colar print</span></button>` : ''}${x.print ? `<button type="button" data-printtroca="${i}" style="font-size:12px;text-decoration:underline;color:var(--tinta-2)">trocar</button>` : ''}</div>
      <div class="sub" style="margin:-4px 0 8px">Confira no print se a tarifa inclui a mala despachada. Às vezes o bilhete não mostra.</div>`;
  } else if (ehHotel(x)) {
    det += `${inp(X, 'nome', i, 'Hotel', x.nome)}${dupla(inp(X, 'data_ida', i, 'Check-in', x.data_ida ?? ctx.ida, 'd'), inp(X, 'data_volta', i, 'Check-out', x.data_volta ?? ctx.volta, 'd'))}
      ${dupla(inp(X, 'destino', i, 'Cidade', x.destino), inp(X, 'localizador', i, 'Nº da reserva', x.localizador))}
      ${chk(X, 'carta', i, 'Carta de boas-vindas enviada ao hotel', x.carta)}`;
  } else {
    det += `${dupla(inp(X, 'nome', i, 'Descrição', x.nome, 's', 'placeholder="O que foi comprado"'), inp(X, 'data_ida', i, 'Data', x.data_ida ?? ctx.ida, 'd'))}${inp(X, 'localizador', i, 'Código ou reserva', x.localizador)}`;
  }
  if (!x.grupo) det += campoForn(X, x, i, usaMilhas(x) ? 'Fornecedor (se comprou milhas de alguém)' : 'Onde comprou (fornecedor)');
  else if (compraDe(x) !== 'maktub') det += campoForn(X, x, i, compraDe(x) === 'fornecedor' ? 'Fornecedor (de quem comprou as milhas)' : 'Fornecedor (com quem comprou a passagem)');
  if (x.grupo) det += htmlPagoFornecedor(X, x);
  det += chk(X, 'emitido', i, ehVoo(x) ? 'Emitido (bilhete gerado)' : 'Comprado / reservado', x.emitido, trava);
  const pend = pendenciasItem(x);
  det += trava ? `<div class="sub" style="color:var(--verde)">Enviado para a planilha${x.enviado_em ? ' em ' + new Date(x.enviado_em).toLocaleDateString('pt-BR') : ''}. Correção feita aqui vai para a mesma linha da planilha ao salvar, em até 5 minutos.</div>${htmlCorrecoes(X, x)}` : ctx.fechou && pend.length ? `<div class="sub" style="color:var(--alerta)">Falta: ${pend.join(', ')}.</div>` : '';
  return base + `<details ${ctx.fechou && !trava ? 'open' : ''} style="margin-top:4px"><summary style="cursor:pointer;font-size:13px;color:var(--verde);font-weight:600;padding:6px 0">Detalhes ${ehVoo(x) ? 'do voo' : ehHotel(x) ? 'do hotel' : 'do serviço'}${trava ? ' · na planilha' : x.emitido ? ' · emitido' : ''}</summary>${det}</details>`;
}

// correções feitas depois do lançamento: quem, quando e o que foi para a planilha
const ROT_COL = { 'Valor a receber': 'valor', 'Taxas': 'custo', 'Milhas': 'milhas', 'Milheiro': 'milheiro', 'CPF (NF)': 'CPF da nota', 'Cia': 'companhia', 'Passageiros': 'passageiros', 'Observações': 'observações', 'Localizador': 'localizador', 'Origem': 'origem', 'Destino': 'destino', 'Data do Voo (Ida)': 'data da ida', 'Data do Voo (Volta)': 'data da volta', 'Gestor': 'gestor', 'Conta': 'conta' };
function htmlCorrecoes(X, x) {
  const C = Array.isArray(x.correcoes) ? x.correcoes : []; if (!C.length) return '';
  return `<div class="sub" style="margin:4px 0 6px">${C.slice(-5).reverse().map(c => `Corrigido em ${new Date(c.em).toLocaleDateString('pt-BR')}${c.por && X.nomeTime && X.nomeTime(c.por) ? ' por ' + X.esc(X.nomeTime(c.por)) : ''}: ${X.esc((c.campos || []).map(k => ROT_COL[k] || k).join(', '))}${c.ajuste ? ' (ajuste no mês atual)' : ''}.`).join('<br>')}</div>`;
}
// emissão com as milhas do cliente da Gestão: o print preenche quase tudo; a equipe confere e digita o valor pagante (e a REX)
const normP = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const milFmt = (n) => Math.round(+n || 0).toLocaleString('pt-BR');
function htmlCliente(X, x, i, ctx) {
  const G = ctx.gestao || null, canc = !!x.cancelado_em, lanc = !!x.gestao_em, dis = canc ? 'disabled' : '';
  const nome = (G && G.nome) || x.cliente_gestao_nome || 'cliente da Gestão';
  const progs = G && Array.isArray(G.programas) ? G.programas : [];
  const prog = progs.find(p => normP(p.programa) === normP(x.programa));
  const anc = Math.max(+x.pagante || 0, +x.rex || 0), V = voosCliente(x), mudou = lanc && !canc && x.gestao_snap && x.gestao_snap !== snapCliente(x);
  const n = (k, rot, v, extra = '') => inp(X, k, i, rot, v, 'n', `${dis} ${extra}`);
  const t = (k, rot, v, extra = '') => inp(X, k, i, rot, v, 's', `${dis} ${extra}`);
  const pend = canc ? [] : pendenciasCliente(x);
  const estado = canc ? `<div class="config" style="margin:6px 0">Emissão cancelada em ${ddmm(String(x.cancelado_em).slice(0, 10))}. O registro continua guardado na Gestão, fora do painel do cliente.</div>`
    : lanc ? `<div class="config" style="margin:6px 0"><b style="color:var(--verde)">Lançado na Gestão em ${ddmm(String(x.gestao_em).slice(0, 10))}${x.gestao_por && X.nomeTime ? ' por ' + X.esc(X.nomeTime(x.gestao_por) || '') : ''}.</b>${x.gestao_manual ? '<br>Ligado ao Uso de milhas que já estava lançado à mão na ficha.' : ''}
      <div class="botoes4" style="margin-top:8px">${mudou ? `<button type="button" class="zap" data-clatual="${i}">Atualizar na Gestão</button>` : ''}${ctx.verFicha ? `<button type="button" class="sec" data-clficha="${i}">Ver na ficha</button>` : ''}<button type="button" class="sec" data-clcanc="${i}">Cancelar esta emissão</button></div></div>` : '';
  const det = `${seg('pago_em', i, [['milhas', 'Milhas'], ['pagante', 'Pagante'], ['cliente_gestao', 'Milhas do cliente da Gestão']], 'cliente_gestao')}
    <div class="config" style="margin:6px 0 8px"><b>Milhas de ${X.esc(nome)} · Gestão</b><br>Não é venda: fica fora de metas, comissão e planilha. Ao fechar, entra sozinho no Uso de milhas da ficha da Gestão e o voo vai para o check-in.</div>
    ${canc ? '' : `<div class="botoes4" style="margin:2px 0 4px"><button type="button" class="zap" data-lercola="${i}">Colar print da emissão</button><label class="sec" style="display:block;text-align:center;cursor:pointer;padding:10px">Escolher da galeria<input type="file" accept="image/*" multiple data-lerarq="${i}" style="display:none"></label></div>
    <div class="sub" style="margin:0 0 8px">${x.lido_em ? 'Preenchido pelo print. Confira cada campo.' + (x.lido_obs ? ' ' + X.esc(x.lido_obs) : '') : 'O print da emissão preenche voos, localizador, passageiros, programa, milhas e taxas. No computador, Ctrl+V também lê.'}</div>`}
    <datalist id="dlProgG${i}">${progs.map(p => `<option value="${X.esc(p.programa)}">`).join('')}</datalist>
    ${dupla(inp(X, 'data_emissao', i, 'Data da emissão', x.data_emissao, 'd', dis), t('programa', 'Programa', x.programa, `list="dlProgG${i}" autocomplete="off"`))}
    ${dupla(n('milhas', 'Milhas usadas', x.milhas), n('taxas', 'Taxas pagas (R$)', x.taxas))}
    ${prog ? `<div class="sub" style="margin:-2px 0 6px">Saldo de ${X.esc(prog.programa)} na carteira: ${milFmt(prog.saldo)}.${+x.milhas > +prog.saldo ? ` <span style="color:var(--alerta)">A emissão passa do saldo da carteira. Pode gravar; depois faça a Conferência do mês na ficha da Gestão.</span>` : ''}</div>` : x.programa && progs.length ? '<div class="sub" style="margin:-2px 0 6px">Programa ainda não está na carteira do cliente. Confira o nome.</div>' : ''}
    ${dupla(t('cia_emissora', 'Emitido na cia', x.cia_emissora, 'placeholder="GOL"'), t('cia_voo', 'Voa de (se for aliança)', x.cia_voo))}
    ${dupla(t('localizador', 'Localizador', x.localizador, 'style="text-transform:uppercase"'), t('cabine', 'Cabine (opcional)', x.cabine, 'placeholder="econômica"'))}
    <div class="sub" style="margin:6px 0 0">Voos: data e horário de saída obrigatórios em todos</div>
    ${V.map((v, k) => `<div style="border-left:3px solid ${ok3(v.o) && ok3(v.d) && v.data && v.hora ? 'var(--verde)' : 'var(--linha)'};padding-left:8px;margin:6px 0">
      <div class="duas-col">${['o', 'd'].map(f => `<label class="fl"><span>Voo ${k + 1}: ${f === 'o' ? 'de' : 'para'}</span><input data-cv="${i}|${k}|${f}" value="${X.esc(v[f] || '')}" maxlength="3" style="text-transform:uppercase" placeholder="${f === 'o' ? 'GIG' : 'GRU'}" ${dis}></label>`).join('')}</div>
      <div class="duas-col"><label class="fl"><span>Data</span><input type="date" data-cv="${i}|${k}|data" value="${X.esc(v.data || '')}" ${dis}></label><label class="fl"><span>Horário de saída</span><input type="time" data-cv="${i}|${k}|hora" value="${X.esc(v.hora || '')}" ${dis}></label></div>
      ${canc || V.length < 2 ? '' : `<button type="button" data-cvtira="${i}|${k}" style="background:none;border:0;color:var(--tinta-3);text-decoration:underline;font:inherit;font-size:13px;padding:0">tirar voo</button>`}</div>`).join('')}
    ${canc ? '' : `<button type="button" class="sec" data-cvmais="${i}" style="width:100%;margin:2px 0 8px">+ Voo</button>`}
    <div class="sub" style="margin:-2px 0 6px">O horário de saída é o local do aeroporto. O aviso de check-in chega 24 h antes do voo.</div>
    ${dupla(n('passageiros', 'Passageiros', x.passageiros, 'inputmode="numeric"'), '<div></div>')}
    <div class="sub" style="margin:-2px 0 4px">As milhas são de ${X.esc(String(nome).split(' ')[0])}; os passageiros podem ser ele, a família ou outras pessoas.</div>
    ${htmlPax(X, x, i, canc, ctx)}
    <div class="sub" style="margin:6px 0 0">Bagagem despachada por passageiro</div>${seg('bagagem', i, [['0', 'Não tem'], ['1', '1 mala'], ['2', '2 malas'], ['3', '3 malas']], x.bagagem)}
    ${dupla(n('pagante', 'Valor pagante (R$)', x.pagante), n('rex', 'Tarifa REX (R$, opcional)', x.rex))}
    <div class="sub" style="margin:-2px 0 6px">${anc ? `Base da economia no painel do cliente: ${X.brl2(anc)} (o maior entre pagante e REX).` : 'Digite quanto a mesma passagem custaria em dinheiro: é a base da economia no painel do cliente.'}</div>
    <label class="fl"><span>Descrição no Uso de milhas</span><input data-it="${i}" data-k="descricao" data-descm="1" value="${X.esc(descCliente(x))}" ${dis}></label>
    <div class="sub" style="margin:6px 0 0">Quem pagou as taxas</div>${seg('taxas_quem', i, [['cliente', 'Cliente, no cartão dele'], ['maktub', 'Maktub, cliente reembolsa']], x.taxas_quem || 'cliente')}
    ${x.taxas_quem === 'maktub' ? `${dupla(inp(X, 'taxas_pago_em', i, 'Data em que a Maktub pagou', x.taxas_pago_em, 'd', dis), '<div></div>')}
      <div class="sub" style="margin:-2px 0 6px">Custo ${X.brl2(+x.taxas || 0)} e reembolso ${X.brl2(+x.taxas || 0)}: lucro zero. Fica em A receber até o reembolso ser marcado como recebido e, no Caixa, aparece como movimento neutro. Fora de vendas, metas, comissão, DRE e planilha.</div>` : ''}
    <div class="emchk" style="margin:4px 0 8px"><button type="button" data-print="${i}" class="${x.print ? 'ok' : ''}"><span class="cx">${x.print ? '✓' : '+'}</span><span>${x.print ? 'Print da emissão anexado (tocar para ver)' : 'Anexar print da emissão'}</span></button>${!x.print && !canc ? `<button type="button" data-printcola="${i}"><span class="cx">⎘</span><span>Colar print</span></button>` : ''}${x.print && !canc ? `<button type="button" data-printtroca="${i}" style="font-size:13px;text-decoration:underline">trocar</button>` : ''}</div>
    ${chk(X, 'emitido', i, 'Emitido (bilhete gerado)', x.emitido, canc)}
    ${!lanc && !canc && ctx.fechou && pend.length ? `<div class="sub" style="color:var(--alerta)">Falta: ${pend.join(', ')}.</div>` : ''}`;
  const base = `<div class="lin" style="margin:4px 0"><span>Milhas do cliente da Gestão</span><b>${+x.milhas ? milFmt(x.milhas) + ' ' + X.esc(x.programa || 'milhas') : 'a preencher'}</b></div>${estado}`;
  return base + `<details ${(ctx.fechou && !lanc) || !x.print ? 'open' : ''} style="margin-top:4px"><summary style="cursor:pointer;font-size:13px;color:var(--verde);font-weight:600;padding:6px 0">Detalhes do voo · milhas do cliente${canc ? ' · cancelada' : lanc ? ' · lançado na Gestão' : x.emitido ? ' · emitido' : ''}</summary>${det}</details>`;
}

// título de cada emissão quando a venda tem mais de uma: rota, companhia e localizador
// interruptor "Ida e volta com fornecedores diferentes": em voo de ida e volta ou multitrecho que ainda não foi para a planilha
function htmlInterruptor(X, x, i, trava, ctx) {
  if (trava || ehCliente(x) || (x.tipo_trecho || ctx.tipoPadrao) === 'ida') return '';
  return `<label class="fc" style="margin:2px 0 6px"><input type="checkbox" data-blocos="${i}"><span>Ida e volta com fornecedores diferentes</span></label>${x.sugere_blocos ? '<div class="config" style="margin:0 0 8px">A ida e a volta estão em companhias diferentes. Se cada uma foi comprada com um fornecedor, ligue Ida e volta com fornecedores diferentes.</div>' : ''}`;
}
// pago ao fornecedor do bloco: só depois que a linha chegou da planilha (é a mesma marcação do Financeiro)
function htmlPagoFornecedor(X, x) {
  if (!enviado(x)) return '';
  const e = (X.D.emissoes || []).find(o => String(o.id) === String(x.planilha_id));
  if (!e) return '<div class="sub" style="margin:4px 0 6px">Pago fornecedor: disponível quando a linha chegar da planilha.</div>';
  if (e.pago_fornecedor) return `<div class="sub" style="margin:4px 0 6px;color:var(--verde)">Pago ao fornecedor${e.pago_fornecedor_em ? ' em ' + new Date(e.pago_fornecedor_em).toLocaleDateString('pt-BR') : ''}.</div>`;
  return X.pagarFornecedores ? `<button type="button" class="sec" data-pagforn="${X.esc(e.id)}" style="width:100%;margin:4px 0 8px">Pago fornecedor${e.fornecedor ? ' (' + X.esc(e.fornecedor) + ')' : ''}</button>` : '';
}
// linha de um trecho com o fornecedor tocável (abre a ficha com WhatsApp)
function linhaTrechoHtml(X, x) {
  const f = fornecedorDe(x);
  const partes = [X.esc(cabTrecho(x)), X.esc(x.cia_voo || x.cia_emissora || ''), f ? `<button type="button" data-fornficha="${X.esc(f)}" style="background:none;border:0;padding:0;font:inherit;color:var(--verde);text-decoration:underline;cursor:pointer">${X.esc(f)}</button>` : '', x.localizador ? 'LOC ' + X.esc(String(x.localizador).toUpperCase()) : ''].filter(Boolean);
  return `<div style="font-size:16px;margin:2px 0">${partes.join(' | ')}</div>`;
}
// topo do grupo: interruptor ligado, uma linha por trecho e o valor da passagem dividido entre os blocos
function htmlCabecalhoGrupo(X, IT, g, ctx) {
  const B = blocosDe(IT, g), trava = B.some(enviado);
  if (ctx.vendaTotal) B.forEach(y => { y.grupo_venda = r2(B.reduce((a, z) => a + (+z.venda || 0), 0)) || null; });
  const tot = +B[0].grupo_venda || 0, soma = r2(B.reduce((a, y) => a + (+y.venda || 0), 0));
  return `<div style="border:1px solid var(--linha);border-radius:12px;padding:10px 12px;margin:6px 0 8px">
    <label class="fc" style="margin:0 0 6px"><input type="checkbox" data-blocos-g="${X.esc(g)}" checked ${trava ? 'disabled' : ''}><span>Ida e volta com fornecedores diferentes</span></label>
    ${B.map(y => linhaTrechoHtml(X, y)).join('')}
    <div id="fornFicha-${X.esc(g)}"></div>
    ${ctx.detalhes ? `<label class="fl" style="margin-top:6px"><span>${ctx.vendaTotal ? 'Valor da passagem (rateado do total do card)' : 'Valor de venda da passagem (R$)'}</span><input data-gv="${X.esc(g)}" inputmode="decimal" value="${X.esc(tot || '')}" ${ctx.vendaTotal || trava ? 'readonly' : ''}></label>
    <div class="sub" style="margin:0" data-gvmsg="${X.esc(g)}">${tot && Math.abs(soma - tot) > 0.01 ? `A soma das partes (${X.brl2(soma)}) não bate com o valor da passagem.` : 'Dividido entre os blocos pelo custo de cada um. Dá para editar a parte de cada bloco.'}</div>` : ''}
  </div>`;
}
function tituloVoo(X, x, IT) {
  if (x.grupo) return `<span style="font-weight:400;color:var(--tinta-2)"> · ${X.esc(PARTES[x.parte] || '')}${x.origem || x.destino ? ` · ${X.esc(up3(x.origem))} → ${X.esc(up3(x.destino))}` : ''}${x.localizador ? ' · ' + X.esc(String(x.localizador).toUpperCase()) : ''}</span>`;
  const n = IT.filter(ehVoo).length; if (n < 2 && !x.localizador) return '';
  const rota = x.origem || x.destino ? ` · ${X.esc(up3(x.origem))} ${x.tipo_trecho === 'iv' ? '⇄' : '→'} ${X.esc(up3(x.destino))}` : '';
  const tipo = ehCliente(x) ? ' · milhas do cliente' : IT.some(ehCliente) ? ' · vendida pela Maktub' : '';
  return `<span style="font-weight:400;color:var(--tinta-2)">${n > 1 ? ' · emissão ' + (IT.filter(ehVoo).indexOf(x) + 1) : ''}${rota}${x.cia_emissora ? ' · ' + X.esc(x.cia_emissora) : ''}${x.localizador ? ' · ' + X.esc(String(x.localizador).toUpperCase()) : ''}${tipo}</span>`;
}
// um trecho que foi emitido à parte (outra companhia, outro localizador) vira outra emissão, com o próprio custo
function separarTrecho(IT, i, k) {
  const x = IT[i], ls0 = voosDaEmissao(x), l = x.ct.splice(k, 1)[0];
  // o horário de saída de cada voo vai junto: o trecho separado leva o dele e a emissão que ficou recalcula ida e volta
  const hs = ls0.map(v => v.hora || ''); hs.splice(k, 1);
  const novo = { produto: x.produto, custo: null, venda: null, tipo_trecho: 'ida', origem: up3(l.o), destino: up3(l.d), data_ida: l.data || null, hora_ida: (ls0[k] && ls0[k].hora) || l.hora || '', passageiros: +l.pax || +x.passageiros || null, pago_em: 'milhas',
    ...(ls0[k] && ls0[k].chegada ? { chegada_ida: ls0[k].chegada } : {}),
    // os passageiros costumam ser os mesmos: vêm junto (dá para corrigir)
    ...(Array.isArray(x.pax) && x.pax.length ? { pax: JSON.parse(JSON.stringify(x.pax)) } : {}),
    // emissão já lançada: a nova guarda de onde veio, qual voo era e a venda de antes (a soma das duas tem que continuar igual)
    ...(enviado(x) ? { separada_de: { id: x.planilha_id, n: k + 1, venda: r2(vendaDe(x)) } } : {}) };
  x.hrs = hs.slice(); x.hora_ida = hs[0] || ''; x.hora_volta = hs.length > 1 ? hs[hs.length - 1] : '';
  // a emissão que ficou: rota e datas pelos trechos que sobraram
  const r = x.ct; if (r.length === 1) { x.tipo_trecho = 'ida'; x.origem = up3(r[0].o); x.destino = up3(r[0].d); x.data_ida = r[0].data || x.data_ida; x.data_volta = null; x.ct_on = false; }
  else if (r.length === 2 && up3(r[1].d) === up3(r[0].o)) { x.tipo_trecho = 'iv'; x.origem = up3(r[0].o); x.destino = up3(r[0].d); x.data_ida = r[0].data || null; x.data_volta = r[1].data || null; x.ct_on = false; }
  else x.trechos = r.map(t => `${up3(t.o)}-${up3(t.d)}${t.data ? ' ' + t.data.split('-').reverse().slice(0, 2).join('/') : ''}`).join('\n');
  x.passageiros = Math.max(...r.map(t => +t.pax || 0)) || x.passageiros;
  IT.splice(i + 1, 0, novo);
}

// ---------- custo por trecho ----------
// cada trecho com o seu custo (milhas e taxas, ou valor pagante) e passageiros; o custo do serviço vira a soma.
// Fica guardado no atendimento, e o app mostra quanto já se pagou no mesmo trecho em vendas anteriores.
const up3 = (t) => String(t || '').trim().toUpperCase().slice(0, 3);
// cada trecho tem o próprio milheiro (conta e programa podem ser diferentes); sem milheiro no trecho, vale o da emissão
const milheiroDe = (x, l) => (l.milheiro != null && l.milheiro !== '' ? +l.milheiro : +x.milheiro) || 0;
export const custoLinha = (x, l) => r2(usaMilhas(x) ? (+l.milhas || 0) * milheiroDe(x, l) / 1000 + (+l.taxas || 0) : (+l.custo || 0));
function linhasPadrao(x, ctx) {
  const o = up3(x.origem), d = up3(x.destino), tipo = x.tipo_trecho || ctx.tipoPadrao, pax = String(x.passageiros || ctx.pax || '');
  if (tipo === 'multi' && x.trechos) return String(x.trechos).split('\n').map(t => t.trim()).filter(Boolean).map(t => {
    const m = /([A-Za-z]{3})\s*[-–>→ ]+\s*([A-Za-z]{3})(?:\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?)?/.exec(t) || [];
    // sem ano: data que já passou neste ano é do ano que vem (ex.: em outubro, 10/01 é janeiro do próximo ano)
    const ano = m[5] ? (m[5].length === 2 ? '20' + m[5] : m[5]) : ((y) => m[3] && new Date(y, +m[4] - 1, +m[3]) < new Date(new Date().setHours(0, 0, 0, 0)) ? String(y + 1) : String(y))(new Date().getFullYear());
    return { o: up3(m[1]), d: up3(m[2]), data: m[3] ? `${ano}-${m[4].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '', pax };
  });
  const L = [{ o, d, data: x.data_ida || ctx.ida || '', pax }];
  if (tipo !== 'ida' || x.data_volta) L.push({ o: d, d: o, data: x.data_volta || ctx.volta || '', pax });
  return L;
}
function somarTrechos(x) {
  if (!x.ct_on || !Array.isArray(x.ct)) return;
  if (usaMilhas(x)) {
    const mi = x.ct.reduce((a, l) => a + (+l.milhas || 0), 0), valorMilhas = x.ct.reduce((a, l) => a + (+l.milhas || 0) * milheiroDe(x, l), 0);
    x.milhas = mi || null; x.taxas = r2(x.ct.reduce((a, l) => a + (+l.taxas || 0), 0)) || null;
    // milheiro da emissão = média ponderada dos trechos, para o custo da planilha (milhas x milheiro + taxas) bater com a soma
    if (mi && x.ct.some(l => l.milheiro != null && l.milheiro !== '')) x.milheiro = Math.round(valorMilhas / mi * 10000) / 10000;
  }
  else x.custo = r2(x.ct.reduce((a, l) => a + (+l.custo || 0), 0)) || null;
}
function histTrecho(X, o, d, atual) {
  if (!o || !d) return [];
  const L = [];
  (X.D.reunioes || []).forEach(r => (r.itens || []).forEach(x => { if (x === atual || !x.ct_on || !Array.isArray(x.ct)) return;
    x.ct.forEach(l => { const c = custoLinha(x, l), p = +l.pax || +x.passageiros || 1; if (up3(l.o) === o && up3(l.d) === d && c > 0) L.push({ data: l.data || '', cia: x.cia_emissora || '', pax: r2(c / p), milhas: usaMilhas(x) && +l.milhas ? Math.round(+l.milhas / p) : 0 }); }); }));
  return L.sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 3);
}
function htmlTrechos(X, x, i, trava, ctx) {
  const milhas = usaMilhas(x);
  if (!x.ct_on) return `<label class="fc" style="margin:6px 0"><input type="checkbox" data-ctliga="${i}" ${trava ? 'disabled' : ''}><span>Separar o custo por trecho</span></label>`;
  // todos os trechos da viagem entram de uma vez; se ainda não tem custo digitado e a viagem mudou (ex.: virou ida e volta), refaz
  const pad = linhasPadrao(x, ctx), semCusto = (x.ct || []).every(l => !+l.milhas && !+l.taxas && !+l.custo);
  if (!Array.isArray(x.ct) || !x.ct.length || (semCusto && pad.length > x.ct.length)) x.ct = pad;
  const dd = (v) => v ? v.split('-').reverse().slice(0, 2).join('/') : '';
  return `<label class="fc" style="margin:6px 0"><input type="checkbox" data-ctliga="${i}" checked ${trava ? 'disabled' : ''}><span>Separar o custo por trecho</span></label>
    ${x.ct.map((l, k) => { const hs = histTrecho(X, up3(l.o), up3(l.d), x), c = custoLinha(x, l), p = +l.pax || 1;
      return `<div style="border-left:3px solid var(--linha);padding-left:8px;margin:6px 0">
      <div class="duas-col" style="grid-template-columns:1fr 1fr 1.3fr">${['o', 'd'].map(f => `<label class="fl"><span>${f === 'o' ? 'De' : 'Para'}</span><input data-ct="${i}|${k}|${f}" value="${X.esc(l[f] || '')}" maxlength="3" style="text-transform:uppercase"></label>`).join('')}<label class="fl"><span>Data</span><input type="date" data-ct="${i}|${k}|data" value="${X.esc(l.data || '')}"></label></div>
      <div class="duas-col" style="grid-template-columns:${milhas ? '1fr 0.9fr 0.9fr 0.7fr' : '1fr 0.8fr'}">${milhas ? `<label class="fl"><span>Milhas</span><input data-ct="${i}|${k}|milhas" inputmode="decimal" value="${X.esc(l.milhas ?? '')}"></label><label class="fl"><span>Milheiro (R$)</span><input data-ct="${i}|${k}|milheiro" inputmode="decimal" value="${X.esc(l.milheiro ?? '')}" placeholder="${X.esc(x.milheiro ?? '')}"></label><label class="fl"><span>Taxas (R$)</span><input data-ct="${i}|${k}|taxas" inputmode="decimal" value="${X.esc(l.taxas ?? '')}"></label>` : `<label class="fl"><span>Custo do trecho (R$)</span><input data-ct="${i}|${k}|custo" inputmode="decimal" value="${X.esc(l.custo ?? '')}"></label>`}<label class="fl"><span>Passageiros</span><input data-ct="${i}|${k}|pax" inputmode="numeric" value="${X.esc(l.pax ?? '')}"></label></div>
      <div class="sub" style="margin:2px 0 0">${c ? `Este trecho: ${X.brl2(c)}${p > 1 ? ` (${X.brl2(c / p)} por passageiro)` : ''}` : ''}${hs.length ? `<br>Já pago em ${X.esc(l.o)} → ${X.esc(l.d)}: ${hs.map(hh => `${X.brl2(hh.pax)}/pax${hh.milhas ? ` (${hh.milhas.toLocaleString('pt-BR')} milhas)` : ''}${hh.cia ? ' · ' + X.esc(hh.cia) : ''}${hh.data ? ' · ' + dd(hh.data) : ''}`).join(' | ')}` : ''}</div>
      ${x.ct.length < 2 ? '' : `<button type="button" data-ctsep="${i}|${k}" style="background:none;border:0;color:var(--verde);text-decoration:underline;font:inherit;font-size:12px;padding:0;margin-right:12px">emitido à parte: virar outra emissão</button>${trava ? '' : `<button type="button" data-cttira="${i}|${k}" style="background:none;border:0;color:var(--tinta-3);text-decoration:underline;font:inherit;font-size:12px;padding:0">tirar trecho</button>`}`}</div>`; }).join('')}
    ${trava ? '' : `<button type="button" class="sec" data-ctmais="${i}" style="width:100%;margin:2px 0 8px">+ Trecho</button>`}`;
}

// quem viaja com o cliente: a ficha do cliente do card e as fichas ligadas a ela (família, quem viaja junto)
const nrmNome = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function familiaDe(X, ctx) {
  const P = (X.D && X.D.pessoas) || [];
  const cli = (ctx && ctx.pessoaId && P.find(o => o.id === ctx.pessoaId)) || (ctx && ctx.cliente ? P.find(o => nrmNome(o.nome) === nrmNome(ctx.cliente)) : null);
  if (!cli) return [];
  const ids = [cli.id, ...((X.D && X.D.vinculos) || []).filter(v => v.pessoa_a === cli.id || v.pessoa_b === cli.id).map(v => v.pessoa_a === cli.id ? v.pessoa_b : v.pessoa_a)];
  return [...new Set(ids)].map(id => P.find(o => o.id === id)).filter(Boolean);
}
// um bloco por passageiro: nome (puxa da ficha), CPF e nascimento
function htmlPax(X, x, i, trava, ctx) {
  const L = paxAjustado(x); if (!L.length) return '';
  const cli = ctx && ctx.cliente ? String(ctx.cliente).trim() : '';
  const fam = trava ? [] : familiaDe(X, ctx), usados = new Set(L.map(p => p.pessoa_id).filter(Boolean));
  const chipsFam = fam.length ? `<div class="sub" style="margin:6px 0 2px">Toque em quem viaja (nome, CPF e nascimento vêm da ficha):</div><div class="chips" style="flex-wrap:wrap;margin-bottom:4px">${fam.map(o => `<button type="button" data-paxfam="${i}|${X.esc(o.id)}" class="${usados.has(o.id) ? 'on' : ''}">${X.esc(o.nome)}</button>`).join('')}</div>` : '';
  return `<div class="sub" style="margin:6px 0 0">Dados dos passageiros (${L.length})</div>${chipsFam}${cli && !trava && !fam.length ? `<label class="fc" style="margin:6px 0"><input type="checkbox" data-clipax="${i}" ${x.cliente_pax ? 'checked' : ''}><span>O cliente (${X.esc(cli.split(' ')[0])}) é o passageiro 1</span></label>` : ''}${L.map((p, k) => {
    const ok = String(p.nome || '').trim().includes(' ') && cpfValido(p.cpf) && p.nasc;
    return `<div style="border-left:3px solid ${ok ? 'var(--verde)' : 'var(--linha)'};padding-left:8px;margin:6px 0">
      <label class="fl"><span>Passageiro ${k + 1}: nome completo</span><input data-pax="${i}|${k}|nome" value="${X.esc(p.nome || '')}" list="dlPaxV" ${trava ? 'disabled' : ''}></label>
      <div class="duas-col"><label class="fl"><span>CPF</span><input data-pax="${i}|${k}|cpf" inputmode="numeric" value="${X.esc(p.cpf || '')}" ${trava ? 'disabled' : ''}>${p.cpf && !cpfValido(p.cpf) ? '<small style="color:var(--alerta)">CPF inválido</small>' : ''}</label>
      <label class="fl"><span>Nascimento</span><input data-pax="${i}|${k}|nasc" inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10" value="${X.esc(p.nasc ? isoBr(p.nasc) : (p.nasc_txt || ''))}" ${trava ? 'disabled' : ''}>${p.nasc_txt && !p.nasc ? '<small style="color:var(--alerta)">data incompleta ou inválida</small>' : ''}</label></div></div>`;
  }).join('')}`;
}

// voo sem a quantidade de passageiros: vale o maior número dos trechos (os blocos de nome, CPF e nascimento aparecem)
export function paxPelosTrechos(IT) {
  (IT || []).forEach(x => {
    if (!ehVoo(x) || ehCliente(x) || x.cancelado_em || +x.passageiros > 0) return;
    const n = Math.max(0, ...(Array.isArray(x.ct) ? x.ct : []).map(l => parseInt(l.pax, 10) || 0));
    if (n) x.passageiros = n;
  });
}
// editor dos serviços: devolve funções para ler o estado
// fornecedores para a busca: os 5 mais usados nas vendas primeiro, depois os outros em ordem alfabética
function fornOrdenados(X) {
  const todos = X.fornecedores(), n = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(), cont = new Map();
  (X.D.emissoes || []).forEach(e => [e.fornecedor, e.conta].forEach(v => { const k = n(v); if (k) cont.set(k, (cont.get(k) || 0) + 1); }));
  const top = todos.filter(t => cont.get(n(t))).sort((a, b) => cont.get(n(b)) - cont.get(n(a))).slice(0, 5);
  return [...top, ...todos.filter(t => !top.includes(t))];
}
export function editorItens(X, el, IT, ctx, aoMudar) {
  // totais só da parte vendida: a emissão com milhas do cliente não é venda
  const tot = () => ({ v: r2(IT.reduce((a, x) => a + vendaDe(x), 0)), c: r2(IT.reduce((a, x) => a + custoDe(x), 0)) });
  const linhaCliente = () => { const L = IT.filter(x => ehCliente(x) && !x.cancelado_em); if (!L.length) return '';
    const porProg = {}; L.forEach(x => { const k = String(x.programa || 'milhas').trim(); porProg[k] = (porProg[k] || 0) + (+x.milhas || 0); });
    return `<div class="lin"><span>Com milhas do cliente</span><span>${Object.entries(porProg).map(([k, v]) => v ? milFmt(v) + ' ' + X.esc(k) : 'a preencher').join(' + ')}</span></div><div class="sub" style="margin:0">Fora de metas, comissão e planilha.</div>`; };
  const resumo = () => { const t = tot(), soCot = IT.every(x => naCotacao(x, ctx)); const e = el.querySelector('#reTot'); if (e) e.innerHTML = (IT.length && (t.v || t.c) ? `<div class="lin"><span>Venda total</span><b>${X.brl2(t.v)}</b></div>${X.verMargem === false || soCot ? '' : `<div class="lin"><span>Custo total</span><span>${X.brl2(t.c)}</span></div><div class="lin"><span>Lucro bruto</span><b style="color:var(--verde)">${X.brl2(t.v - t.c)}</b></div>`}` : '') + linhaCliente(); if (aoMudar) aoMudar(t); };
  // viagem do card (bloco Viagem): o serviço herda o que estiver vazio. O que veio da cotação escolhida já está preenchido e fica.
  const herda = (x, C) => {
    if (!C || x.emitido || x.grupo) return;
    if (ehVoo(x)) { const c = C.voo;
      if (!x.origem && !x.destino) { if (c.origem) x.origem = c.origem; if (c.destino) x.destino = c.destino; }
      if (x.tipo_trecho === 'multi' && !x.trechos && c.trechos && c.tipo_trecho === 'multi') x.trechos = c.trechos;
      if (x.passageiros == null && +c.passageiros > 0) x.passageiros = +c.passageiros;
      if (x.bagagem == null && c.bagagem) x.bagagem = c.bagagem; }
    else if (ehHotel(x) && !x.destino && C.hotel.destino) x.destino = C.hotel.destino;
  };
  const padroes = () => IT.forEach(x => {
    if (enviado(x)) return;
    if (ehCliente(x)) { prepararCliente(x, ctx); cabecalhoCliente(x); return; }
    if (ehVoo(x)) { if (!x.tipo_trecho) x.tipo_trecho = ctx.tipoPadrao; if (!x.pago_em) x.pago_em = 'milhas';
      const m = /\b([A-Za-z]{3})\s*[-–>→\/]+\s*([A-Za-z]{3})\b/.exec(x.trecho || ''); if (m && !x.origem && !x.destino) { x.origem = m[1].toUpperCase(); x.destino = m[2].toUpperCase(); } }
    if (x.data_ida == null && ctx.ida) x.data_ida = ctx.ida;
    if (x.data_volta == null && ctx.volta && (ehVoo(x) || ehHotel(x)) && x.tipo_trecho !== 'ida') x.data_volta = ctx.volta;
    herda(x, ctx.card ? ctx.card() : null);
  });
  // o card mudou: cada serviço acompanha nos campos que ainda estavam iguais ao que o card tinha.
  // O que o vendedor mudou no serviço, o que já foi emitido ou enviado para a planilha fica como está.
  const seguirCard = (ant) => {
    const novo = ctx.card ? ctx.card() : null; if (!novo || !ant) return; let mudou = false;
    const igual = (a, b) => String(a ?? '') === String(b ?? '');
    IT.forEach(x => {
      if (enviado(x) || x.emitido || ehCliente(x) || x.grupo) return;
      const A = ehVoo(x) ? ant.voo : ehHotel(x) ? ant.hotel : { data_ida: ant.voo.data_ida }, N = ehVoo(x) ? novo.voo : ehHotel(x) ? novo.hotel : { data_ida: novo.voo.data_ida };
      Object.keys(N).forEach(k => {
        if (igual(A[k], N[k]) || !igual(x[k], A[k])) return;
        // campo que ficou vazio no card só esvazia no serviço na volta da passagem que virou só ida
        if ((N[k] ?? '') === '' && !(ehVoo(x) && k === 'data_volta' && N.tipo_trecho === 'ida')) return;
        x[k] = k === 'passageiros' ? (+N[k] || null) : /^data_/.test(k) ? (N[k] || null) : N[k]; mudou = true;
      });
    });
    if (mudou) desenha();
  };
  // valor de cada bloco atualizado no lugar (sem redesenhar: o teclado não fecha)
  const mostraGrupo = (g) => {
    const B = blocosDe(IT, g); B.forEach(y => { const c = el.querySelector(`input[data-it="${IT.indexOf(y)}"][data-k="venda"]`); if (c && c !== document.activeElement) c.value = y.venda ?? ''; });
    const tot = +(B[0] || {}).grupo_venda || 0, soma = r2(B.reduce((a, y) => a + (+y.venda || 0), 0)), m = el.querySelector(`[data-gvmsg="${g}"]`);
    if (m) m.textContent = tot && Math.abs(soma - tot) > 0.01 ? `A soma das partes (${X.brl2(soma)}) não bate com o valor da passagem.` : 'Dividido entre os blocos pelo custo de cada um. Dá para editar a parte de cada bloco.';
  };
  const mexeuNoGrupo = (x, k) => {
    if (ctx.vendaTotal) return;
    if (k === 'venda') { x.venda_fixa = true; ratearGrupo(IT, x.grupo); mostraGrupo(x.grupo); }
    else if (['milhas', 'milheiro', 'taxas', 'custo'].includes(k)) { ratearGrupo(IT, x.grupo); mostraGrupo(x.grupo); }
  };
  const desenha = () => {
    if (ctx.detalhes) padroes();
    paxPelosTrechos(IT);
    el.innerHTML = IT.length ? `<datalist id="dlPaxV">${(X.D.pessoas || []).slice(0, 3000).map(p => `<option value="${X.esc(p.nome)}">`).join('')}</datalist><datalist id="dlFornV">${fornOrdenados(X).map(n => `<option value="${X.esc(n)}">`).join('')}</datalist><datalist id="dlServV">${(X.servicos ? X.servicos() : []).map(n => `<option value="${X.esc(n)}">`).join('')}</datalist><div class="bloco" style="margin:8px 0 4px;padding:10px 12px">${IT.map((x, i) => `<div style="${i && !(x.grupo && IT[i - 1] && IT[i - 1].grupo === x.grupo) ? 'border-top:1px solid var(--linha);padding-top:8px;margin-top:8px' : x.grupo && i && IT[i - 1].grupo === x.grupo ? 'border-top:1px dashed var(--linha);padding-top:8px;margin-top:8px' : ''}">${x.grupo && blocosDe(IT, x.grupo)[0] === x ? htmlCabecalhoGrupo(X, IT, x.grupo, ctx) : ''}<div style="font-weight:600;font-size:13px">${X.esc(x.produto === 'Viagem completa / pacote' ? 'Outro' : x.produto)}${x.nome ? ' · ' + X.esc(x.nome) : ''}${ehVoo(x) ? tituloVoo(X, x, IT) : ''}</div>${htmlItem(X, x, i, ctx)}${ehVoo(x) && !enviado(x) && !naCotacao(x, ctx) && (!x.grupo || blocosDe(IT, x.grupo).slice(-1)[0] === x) ? `<button type="button" class="sec" data-outraem="${i}" style="width:100%;margin:6px 0 2px;font-size:12px">+ Outra emissão (outro localizador, companhia ou forma de pagamento)</button>` : ''}</div>`).join('')}<div id="reTot" style="margin-top:8px"></div></div>` : '<div class="sub">Marque pelo menos um produto.</div>';
    const nrmF = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    el.querySelectorAll('[data-fornnovo]').forEach(b => {
      const inpF = el.querySelector(`input[data-it="${b.dataset.fornnovo}"][data-k="fornecedor"]`); if (!inpF || !X.novoFornecedor) return;
      const mostra = () => { const v = inpF.value.trim(); b.hidden = !v || X.fornecedores().some(n => nrmF(n) === nrmF(v)); b.textContent = '+ Cadastrar "' + v + '" como fornecedor'; };
      inpF.addEventListener('input', mostra); inpF.addEventListener('change', mostra); mostra();
      // o toque no botão não tira o foco do campo: assim nada redesenha antes do cadastro
      ['mousedown', 'pointerdown'].forEach(ev => b.addEventListener(ev, (e) => e.preventDefault()));
      b.onclick = async () => { const v = inpF.value.trim(); if (!v) return; b.disabled = true; const ok = await X.novoFornecedor(v); b.disabled = false; if (ok) { IT[+b.dataset.fornnovo].fornecedor = v; desenha(); } };
    });
    el.querySelectorAll('[data-hrm]').forEach(e => { const [i, k] = e.dataset.hrm.split('|'), x = IT[+i]; e.removeAttribute('data-it'); e.oninput = () => { x.hrs = Array.isArray(x.hrs) ? x.hrs : []; x.hrs[+k] = e.value; }; });
    el.querySelectorAll('input[data-it],textarea[data-it]').forEach(e => {
      const set = () => { const x = IT[+e.dataset.it], k = e.dataset.k, t = e.dataset.t; x[k] = t === 'b' ? e.checked : t === 'n' ? nb(e.value) : e.value.trim(); };
      if (e.type === 'checkbox') e.onchange = () => {
        const x = IT[+e.dataset.it];
        if (e.dataset.k === 'emitido' && e.checked && ehVoo(x) && !x.print) { e.checked = false; X.aviso('Anexe o print da tarifa antes de marcar como emitido.'); return; }
        set(); desenha();
      };
      // milhas, milheiro e taxas: atualiza só o custo calculado, sem redesenhar a tela (não fecha o teclado nem pula a página)
      else { e.oninput = () => { set(); if (IT[+e.dataset.it].grupo) mexeuNoGrupo(IT[+e.dataset.it], e.dataset.k); resumo(); if (['milhas', 'milheiro', 'taxas'].includes(e.dataset.k)) { const x = IT[+e.dataset.it], c = el.querySelector(`input[data-it="${e.dataset.it}"][data-k="custo"]`); if (c && usaMilhas(x) && (x.milhas || x.taxas)) c.value = custoMilhas(x); } }; e.onchange = () => { const x = IT[+e.dataset.it]; if (['cia_voo', 'cia_emissora', 'trechos'].includes(e.dataset.k) || (ehCliente(x) && ['programa', 'milhas', 'taxas', 'pagante', 'rex', 'cabine', 'data_emissao', 'taxas_pago_em', 'localizador'].includes(e.dataset.k))) desenha(); }; }
    });
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
      const x = IT[+b.dataset.it], k = b.dataset.k, v = b.dataset.set;
      if (k === 'pago_em' && ehCliente(x) && v !== 'cliente_gestao' && (x.gestao_em || x.cancelado_em)) { X.aviso('Esta emissão já foi lançada na Gestão. Para trocar a forma, cancele a emissão.'); return; }
      x[k] = v; if (k === 'pago_em' && v === 'cliente_gestao') prepararCliente(x, ctx);
      // forma de compra do bloco: as de milhas usam a regra de milhas; pronta e pagante usam o valor pago
      if (k === 'compra') { x.pago_em = (COMPRAS.find(c => c[0] === v) || [])[2] || 'milhas'; if (x.grupo && !ctx.vendaTotal) ratearGrupo(IT, x.grupo); }
      if (k === 'taxas_quem' && v === 'maktub' && !x.taxas_pago_em) x.taxas_pago_em = x.data_emissao || hojeIso();
      desenha(); });
    // emissão com milhas do cliente: voos (de, para, data, horário), leitura do print, atualizar e cancelar na Gestão
    el.querySelectorAll('[data-cv]').forEach(e => {
      const [i, k, campo] = e.dataset.cv.split('|'), x = IT[+i];
      e.oninput = () => { const v = x.voos[+k]; v[campo] = /^(o|d)$/.test(campo) ? e.value.trim().toUpperCase() : e.value; cabecalhoCliente(x); };
      e.onchange = () => { if (campo === 'data' && e.value && +e.value.slice(0, 4) < 1990) return; cabecalhoCliente(x); desenha(); };
    });
    el.querySelectorAll('[data-cvmais]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.cvmais], u = x.voos[x.voos.length - 1] || {}; x.voos.push({ o: u.d || '', d: '', data: '', hora: '' }); desenha(); });
    el.querySelectorAll('[data-cvtira]').forEach(b => b.onclick = () => { const [i, k] = b.dataset.cvtira.split('|'), x = IT[+i]; x.voos.splice(+k, 1); cabecalhoCliente(x); desenha(); });
    el.querySelectorAll('[data-descm]').forEach(e => e.addEventListener('input', () => { IT[+e.dataset.it].desc_manual = !!e.value.trim(); }));
    el.querySelectorAll('[data-lercola]').forEach(b => b.onclick = async () => {
      if (!navigator.clipboard || !navigator.clipboard.read) { X.aviso('Este navegador não deixa colar direto. Use Escolher da galeria ou aperte Ctrl+V com o card aberto.'); return; }
      try { const fs = []; for (const it of await navigator.clipboard.read()) { const t = it.types.find(y => /^image\//.test(y)); if (t) fs.push(new File([await it.getType(t)], 'print.' + t.split('/')[1], { type: t })); }
        if (fs.length) lerEmissao(X, IT[+b.dataset.lercola], fs, ctx, desenha); else X.aviso('Não tem imagem copiada. Tire o print da emissão, toque nele e escolha Copiar.');
      } catch (_) { X.aviso('O navegador não liberou a colagem. Use Escolher da galeria ou Ctrl+V.'); }
    });
    el.querySelectorAll('[data-lerarq]').forEach(e => e.onchange = () => { const fs = [...e.files]; e.value = ''; lerEmissao(X, IT[+e.dataset.lerarq], fs, ctx, desenha); });
    el.querySelectorAll('[data-clficha]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.clficha]; if (ctx.verFicha) ctx.verFicha(x.cliente_gestao_id || (ctx.gestao && ctx.gestao.cliente_id)); });
    el.querySelectorAll('[data-clatual]').forEach(b => b.onclick = async () => { if (!ctx.lancarCliente) return; b.disabled = true; await ctx.lancarCliente(IT[+b.dataset.clatual]); desenha(); });
    el.querySelectorAll('[data-clcanc]').forEach(b => b.onclick = async () => {
      const x = IT[+b.dataset.clcanc]; if (!ctx.cancelarCliente) return;
      if (!await pergunta(x.gestao_manual ? 'Cancelar esta emissão com milhas do cliente?\n\nO voo sai do check-in. O Uso de milhas que já estava lançado à mão continua na ficha como está: se precisar, ajuste na Gestão.'
        : 'Cancelar esta emissão com milhas do cliente?\n\nNada é apagado: o Uso de milhas fica marcado como cancelado, as milhas voltam ao saldo da carteira, a economia sai do painel do cliente e o voo sai do check-in. Taxa de cancelamento do programa, se houver, a equipe lança à parte.', { sim: 'Cancelar a emissão', nao: 'Voltar', perigo: true })) return;
      b.disabled = true; await ctx.cancelarCliente(x); desenha(); });
    // custo por trecho
    el.querySelectorAll('[data-ctliga]').forEach(e => e.onchange = () => { const x = IT[+e.dataset.ctliga]; x.ct_on = e.checked; if (e.checked && !(x.ct || []).length) x.ct = null; desenha(); });
    el.querySelectorAll('[data-ctmais]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.ctmais], u = x.ct[x.ct.length - 1] || {}; x.ct.push({ o: u.d || '', d: '', data: '', pax: u.pax || '' }); desenha(); });
    const avisaMudou = () => el.dispatchEvent(new Event('change', { bubbles: true }));
    el.querySelectorAll('[data-ctsep]').forEach(b => b.onclick = () => {
      const [i, k] = b.dataset.ctsep.split('|'), ja = enviado(IT[+i]);
      separarTrecho(IT, +i, +k);
      // emissão já lançada: a venda passa a ser digitada por serviço (o card avisa se a soma não fechar)
      if (ja && ctx.aoSeparar) ctx.aoSeparar();
      desenha(); avisaMudou();
      X.aviso(ja ? 'Trecho virou outra emissão. Corrija custo e venda da que ficou, preencha os da nova e salve: a nova vai para a planilha e a que ficou é corrigida.' : 'Trecho virou outra emissão: preencha companhia, forma de pagamento, custo e localizador dela.');
    });
    // ida e volta com fornecedores diferentes: liga, desliga, valor da passagem, ficha do fornecedor e pago fornecedor
    el.querySelectorAll('[data-blocos]').forEach(e => e.onchange = () => { if (!e.checked) return; dividirEmBlocos(IT, +e.dataset.blocos); desenha(); avisaMudou();
      X.aviso('Cada trecho virou um bloco: preencha companhia, fornecedor, forma de compra, custo e localizador de cada um.'); });
    el.querySelectorAll('[data-blocos-g]').forEach(e => e.onchange = async () => {
      if (e.checked) return; const g = e.dataset.blocosG;
      if (grupoTemDados(IT, g) && !await pergunta('Voltar para um fornecedor só?\n\nFicam os dados do primeiro trecho. O que foi preenchido nos outros blocos será descartado.', { sim: 'Voltar para um bloco', nao: 'Manter separado', perigo: true })) { e.checked = true; return; }
      juntarBlocos(IT, g); desenha(); avisaMudou(); });
    el.querySelectorAll('[data-gv]').forEach(e => e.oninput = () => { const g = e.dataset.gv, v = nb(e.value);
      blocosDe(IT, g).forEach(y => { y.grupo_venda = v; delete y.venda_fixa; }); ratearGrupo(IT, g); mostraGrupo(g); resumo(); });
    el.querySelectorAll('[data-fornficha]').forEach(b => b.onclick = () => {
      const nome = b.dataset.fornficha, box = b.closest('div[style*="border-radius:12px"]').querySelector('[id^="fornFicha-"]'); if (!box) return;
      const p = X.fichaFornecedor ? X.fichaFornecedor(nome) : null, zap = p && p.celular && X.zapLink ? X.zapLink(p.celular, p.nome, `Oi, ${String(p.nome).split(' ')[0]}! Aqui é da Maktub Go.`) : '';
      box.innerHTML = `<div class="config" style="margin:6px 0">${X.esc(nome)}${p ? '' : ': sem ficha de fornecedor com esse nome.'}<div class="botoes4" style="margin-top:6px">${zap ? `<a class="sec" href="${X.esc(zap)}" target="_blank" rel="noopener" style="display:block;text-align:center;padding:10px">WhatsApp</a>` : ''}${p && X.abrirFicha ? `<button type="button" class="sec" data-abreficha="${X.esc(p.id)}">Abrir ficha</button>` : ''}</div></div>`;
      const ab = box.querySelector('[data-abreficha]'); if (ab) ab.onclick = () => X.abrirFicha(ab.dataset.abreficha);
    });
    el.querySelectorAll('[data-pagforn]').forEach(b => b.onclick = async () => { b.disabled = true; const r = await X.pagarFornecedores([b.dataset.pagforn]); if (r && r.erro) { b.disabled = false; X.aviso('Não marcou: ' + r.erro); return; } desenha(); });
    el.querySelectorAll('[data-outraem]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.outraem]; IT.splice(+b.dataset.outraem + 1, 0, { produto: x.produto, custo: null, venda: null, tipo_trecho: 'ida', pago_em: 'milhas' }); desenha(); avisaMudou(); });
    el.querySelectorAll('[data-cttira]').forEach(b => b.onclick = async () => { const [i, k] = b.dataset.cttira.split('|'), l = IT[+i].ct[+k] || {}; if ((l.o || l.d || l.milhas || l.custo) && !await pergunta('Tirar este trecho?\n\nO que foi preenchido nele será apagado.', { sim: 'Tirar', perigo: true })) return; IT[+i].ct.splice(+k, 1); desenha(); avisaMudou(); });
    el.querySelectorAll('[data-ct]').forEach(e => {
      const [i, k, campo] = e.dataset.ct.split('|'), x = IT[+i];
      e.oninput = () => { const l = x.ct[+k]; l[campo] = /^(o|d)$/.test(campo) ? e.value.trim().toUpperCase() : /^(milhas|milheiro|taxas|custo|pax)$/.test(campo) ? nb(e.value) : e.value; somarTrechos(x);
        const c = el.querySelector(`input[data-it="${i}"][data-k="custo"]`); if (c) c.value = custoDe(x) || ''; resumo(); };
      // data: o navegador avisa a cada pedaço do ano digitado (0002, 0020...); só redesenha com o ano completo
      e.onchange = () => { if (campo === 'data' && e.value && +e.value.slice(0, 4) < 1990) return; desenha(); };
    });
    // passageiros: muda a quantidade e redesenha os blocos; nome de quem tem ficha já traz CPF e nascimento
    el.querySelectorAll('input[data-k="passageiros"]').forEach(e => e.addEventListener('change', () => desenha()));
    el.querySelectorAll('[data-pax]').forEach(e => {
      const [i, k, campo] = e.dataset.pax.split('|'), x = IT[+i];
      e.oninput = () => { paxAjustado(x); const p = x.pax[+k];
        if (campo === 'nasc') { const m = mascaraData(e.value); if (m !== e.value) e.value = m; p.nasc_txt = m; p.nasc = brIso(m); return; }
        p[campo] = e.value.trim(); };
      e.onchange = () => {
        paxAjustado(x); const p = x.pax[+k];
        if (campo === 'nome') {
          const n = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
          const f = (X.D.pessoas || []).find(o => n(o.nome) === n(p.nome));
          if (f) { p.pessoa_id = f.id; const d = (X.D.docs || []).find(o => o.pessoa_id === f.id); if (!p.cpf && d && d.cpf) p.cpf = fmtCpf(d.cpf); if (!p.nasc && f.nascimento) p.nasc = f.nascimento; }
          else delete p.pessoa_id;
        }
        if (campo === 'cpf' && cpfValido(p.cpf)) p.cpf = fmtCpf(p.cpf);
        if (campo === 'nasc' && p.nasc) delete p.nasc_txt;
        desenha();
      };
    });
    // "o cliente é o passageiro": puxa nome, CPF e nascimento da ficha do cliente do card
    el.querySelectorAll('[data-clipax]').forEach(c => c.onchange = () => {
      const x = IT[+c.dataset.clipax]; paxAjustado(x); x.cliente_pax = c.checked; if (!x.pax.length) { desenha(); return; }
      if (c.checked) {
        const n = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
        const f = (ctx.pessoaId && (X.D.pessoas || []).find(o => o.id === ctx.pessoaId)) || (X.D.pessoas || []).find(o => n(o.nome) === n(ctx.cliente));
        const d = f ? (X.D.docs || []).find(o => o.pessoa_id === f.id) : null;
        x.pax[0] = { nome: (f && f.nome) || String(ctx.cliente || '').trim(), cpf: d && d.cpf ? fmtCpf(d.cpf) : '', nasc: (f && f.nascimento) || '', ...(f ? { pessoa_id: f.id } : {}) };
        if (!x.pax[0].cpf || !x.pax[0].nasc) X.aviso('Complete o que faltar do passageiro 1: a ficha do cliente não tem ' + [!x.pax[0].cpf && 'CPF', !x.pax[0].nasc && 'nascimento'].filter(Boolean).join(' nem ') + '.');
      } else x.pax[0] = { nome: '', cpf: '', nasc: '' };
      desenha();
    });
    // passageiro da ficha com um toque: preenche a primeira vaga em branco (ou tira, se já está)
    el.querySelectorAll('[data-paxfam]').forEach(b => b.onclick = () => {
      const [i, id] = b.dataset.paxfam.split('|'), x = IT[+i]; paxAjustado(x);
      const ja = x.pax.findIndex(p => p.pessoa_id === id);
      if (ja >= 0) { x.pax[ja] = { nome: '', cpf: '', nasc: '' }; desenha(); return; }
      const k = x.pax.findIndex(p => !String(p.nome || '').trim());
      if (k < 0) { X.aviso('Todas as vagas de passageiro estão preenchidas. Aumente o número de passageiros para incluir mais alguém.'); return; }
      const f = ((X.D && X.D.pessoas) || []).find(o => o.id === id); if (!f) return;
      const d = ((X.D && X.D.docs) || []).find(o => o.pessoa_id === f.id);
      x.pax[k] = { nome: f.nome, cpf: d && d.cpf ? fmtCpf(d.cpf) : '', nasc: f.nascimento || '', pessoa_id: f.id };
      if (!x.pax[k].cpf || !x.pax[k].nasc) X.aviso('Complete o que faltar de ' + String(f.nome).split(' ')[0] + ': a ficha não tem ' + [!x.pax[k].cpf && 'CPF', !x.pax[k].nasc && 'nascimento'].filter(Boolean).join(' nem ') + '.');
      desenha();
    });
    el.querySelectorAll('[data-print]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.print]; x.print ? verArquivo(X, x.print) : anexar(X, 'print', x, desenha); });
    el.querySelectorAll('[data-printtroca]').forEach(b => b.onclick = () => anexar(X, 'print', IT[+b.dataset.printtroca], desenha));
    el.querySelectorAll('[data-printcola]').forEach(b => b.onclick = () => colar(X, 'print', IT[+b.dataset.printcola], desenha));
    IT._proxAnexo = () => { const x = IT.find(y => ehVoo(y) && !y.print && !enviado(y) && !y.cancelado_em); return x ? (ehCliente(x) ? { tipo: 'ler', alvo: x, depois: desenha, ler: (f) => lerEmissao(X, x, [f], ctx, desenha) } : { tipo: 'print', alvo: x, depois: desenha }) : null; };
    resumo();
  };
  desenha();
  return { desenha, tot, seguirCard };
}

// arquivos (print da tarifa e comprovante) no bucket privado "vendas"
export async function verArquivo(X, path) {
  const w = window.open('', '_blank');
  const { data, error } = await X.sb.storage.from('vendas').createSignedUrl(path, 600);
  if (error) { if (w) w.close(); X.aviso('Não abriu: ' + error.message); return; }
  if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
}
// imagem vai reduzida (lado maior 1600 px, JPEG): um print fica em ~150 a 300 KB e continua legível. PDF vai como está.
async function reduzirImg(file) {
  if (!/^image\//.test(file.type) || /gif|svg/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.82));
    return b && b.size < file.size ? new File([b], 'print.jpg', { type: 'image/jpeg' }) : file;
  } catch (_) { return file; }
}
async function subir(X, tipo, alvo, depois, file) {
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) { X.aviso('Arquivo acima de 15 MB.'); return; }
  X.aviso('Enviando...');
  file = await reduzirImg(file);
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${tipo}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await X.sb.storage.from('vendas').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (up.error) { X.aviso('Não enviou: ' + up.error.message + (/bucket/i.test(up.error.message) ? ' (rode o SQL do processo de cotação)' : '')); return; }
  alvo[tipo] = path; X.aviso(tipo === 'print' ? 'Print anexado.' : 'Comprovante anexado.'); depois(); if (X.rascunho) X.rascunho(true);
}
export function anexar(X, tipo, alvo, depois) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*,application/pdf';
  i.onchange = () => subir(X, tipo, alvo, depois, i.files && i.files[0]);
  i.click();
}
// colar o print copiado (WhatsApp, banco, tela da companhia) sem precisar baixar
export async function colar(X, tipo, alvo, depois) {
  if (!navigator.clipboard || !navigator.clipboard.read) { X.aviso('Este navegador não deixa colar direto. Use Anexar ou aperte Ctrl+V com o card aberto.'); return; }
  try {
    for (const it of await navigator.clipboard.read()) { const t = it.types.find(x => /^image\//.test(x)); if (t) { const b = await it.getType(t); return subir(X, tipo, alvo, depois, new File([b], 'print.' + t.split('/')[1], { type: t })); } }
    X.aviso('Não tem imagem copiada. No WhatsApp, abra a foto e escolha Copiar; no computador, use Win+Shift+S.');
  } catch (_) { X.aviso('O navegador não liberou a colagem. Aperte Ctrl+V com o card aberto.'); }
}
// Ctrl+V com o card aberto: vai para o primeiro anexo que ainda falta (print da tarifa, depois comprovante)
let colarCard = null;
export function ligarColarCard(X, alvoFn) {
  if (colarCard) document.removeEventListener('paste', colarCard);
  colarCard = (e) => {
    const a = alvoFn(); if (!a) { document.removeEventListener('paste', colarCard); colarCard = null; return; }
    if (/^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName || '') && !(e.clipboardData && [...e.clipboardData.items].some(x => x.kind === 'file'))) return;
    const f = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => x.kind === 'file' && /^image\/|pdf/.test(x.type));
    if (!f) return; e.preventDefault(); const d = a(); if (d && d.ler) { if (/^image\//.test(f.type)) d.ler(f.getAsFile()); else subir(X, 'print', d.alvo, d.depois, f.getAsFile()); } else if (d) subir(X, d.tipo, d.alvo, d.depois, f.getAsFile());
  };
  document.addEventListener('paste', colarCard);
}

// bloco do fechamento: pagamento, link, comprovante, conferência do financeiro
export function editorFechamento(X, el, F, ctx) {
  const pixGuardado = () => { try { return localStorage.getItem('mk_pix') || ''; } catch (_) { return ''; } };
  // no cartão o cliente paga o total da maquininha, mas a venda (o que vai para a planilha) é sempre o que entra na conta
  const liq = () => F.forma === 'cartao' && +F.bruto ? Math.round(+F.bruto * (100 - (+F.taxa_pct || 0))) / 100 : null;
  const aplica = (v) => { if (v && ctx.aplicarTotal && Math.abs(v - ctx.total().v) > 0.009) ctx.aplicarTotal(v); };
  const num = (v) => { v = String(v ?? '').trim(); return v ? Number(v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v) || null : null; };
  // Pix + Cartão: digita o que caiu no Pix, o que caiu do cartão e as parcelas; a taxa vem da tabela cadastrada
  // e o app calcula quanto o cliente pagou no cartão e quanto ficou na maquininha
  const combo = () => {
    const n = +F.parcelas || 0, tx = n && ctx.taxa ? +ctx.taxa(n) || 0 : 0, l = +F.cartao_liq || 0, p = +F.pix_valor || 0;
    const b = l && tx < 100 ? Math.round(l / (1 - tx / 100) * 100) / 100 : 0;
    return { n, tx, l, p, b, perda: b ? Math.round((b - l) * 100) / 100 : 0 };
  };
  const desenha = () => {
    const t = ctx.total();
    const cartao = F.forma === 'cartao', misto = F.forma === 'pix_cartao', lq = liq(), C = combo();
    el.innerHTML = `<div class="bloco" style="margin:8px 0;padding:10px 12px">
      <div class="sub" style="margin:0">Forma de pagamento${F.forma ? '' : ': escolha primeiro, o valor da venda se ajusta sozinho'}</div>
      <div class="seg" style="margin:6px 0 8px"><button type="button" data-fp="pix" class="${F.forma === 'pix' ? 'on' : ''}">Pix</button><button type="button" data-fp="cartao" class="${cartao ? 'on' : ''}">Cartão</button><button type="button" data-fp="pix_cartao" class="${misto ? 'on' : ''}">Pix + Cartão</button></div>
      ${misto ? `<div class="duas-col"><label class="fl"><span>Recebido no Pix</span><input id="fMPix" inputmode="decimal" value="${X.esc(F.pix_valor || '')}" placeholder="0,00"></label><label class="fl"><span>Recebido do cartão (caiu na conta)</span><input id="fMCar" inputmode="decimal" value="${X.esc(F.cartao_liq || '')}" placeholder="0,00"></label></div>
      <div class="duas-col"><label class="fl"><span>Cartão em quantas vezes</span><input id="fParc" inputmode="numeric" value="${X.esc(F.parcelas || '')}" placeholder="4"></label><div></div></div>
      <div class="sub" style="margin:0 0 6px">${C.n && C.l ? `Cliente pagou ${X.brl2(C.b)} no cartão em ${C.n}x de ${X.brl2(C.b / C.n)}. Taxa da maquininha ${String(C.tx).replace('.', ',')}%: ${X.brl2(C.perda)} ficou no cartão.` : 'Com o valor recebido do cartão e as parcelas, o app calcula a taxa pela tabela cadastrada.'}</div>
      <label class="fl"><span>Dados do Pix para o cliente</span><input id="fPix" value="${X.esc(F.pix || pixGuardado())}" placeholder="Chave Pix e nome do recebedor"></label>
      <label class="fl"><span>Link de pagamento do cartão</span><input id="fLink" inputmode="url" value="${X.esc(F.link || '')}" placeholder="Cole o link gerado"></label>` : cartao ? `<div class="duas-col"><label class="fl"><span>Em quantas vezes</span><input id="fParc" inputmode="numeric" value="${X.esc(F.parcelas || '')}" placeholder="4"></label><label class="fl"><span>Total no cartão (cliente paga)</span><input id="fBruto" inputmode="decimal" value="${X.esc(F.bruto || '')}" placeholder="0,00"></label></div>
      <div class="sub" id="fCartaoInfo" style="margin:0 0 6px">${F.parcelas && +F.bruto ? `${F.parcelas}x de ${X.brl2(F.bruto / F.parcelas)}. Taxa da maquininha ${String(+F.taxa_pct || 0).replace('.', ',')}%: ${X.brl2(F.bruto - lq)}.` : 'Com as parcelas e o total, o app calcula o que entra na conta.'}</div>
      <label class="fl"><span>Link de pagamento do cartão</span><input id="fLink" inputmode="url" value="${X.esc(F.link || '')}" placeholder="Cole o link gerado"></label>` : F.forma === 'pix' ? `<label class="fl"><span>Dados do Pix para o cliente</span><input id="fPix" value="${X.esc(F.pix || pixGuardado())}" placeholder="Chave Pix e nome do recebedor"></label>` : ''}
      <div class="lin" style="margin-top:6px"><span>Entra na conta (vai para a planilha)</span><b>${X.brl2(t.v)}</b></div>
      ${F.forma ? `<button type="button" class="zap" id="fEnviar" style="width:100%;margin-top:8px">${F.enviado_em ? 'Enviar de novo ao cliente' : 'Enviar o pagamento ao cliente'}</button>${F.enviado_em ? `<div class="sub">Enviado em ${new Date(F.enviado_em).toLocaleDateString('pt-BR')}.</div>` : ''}` : ''}
      <div class="emchk" style="margin:10px 0 4px;border-top:1px solid var(--linha)"><button type="button" id="fComp" class="${F.comprovante ? 'ok' : ''}"><span class="cx">${F.comprovante ? '✓' : '+'}</span><span>${F.comprovante ? 'Comprovante anexado (tocar para ver)' : 'Anexar comprovante de pagamento'}</span></button>${F.comprovante ? '<button type="button" id="fCompT" style="font-size:12px;text-decoration:underline;color:var(--tinta-2)">trocar</button>' : '<button type="button" id="fCompC"><span class="cx">⎘</span><span>Colar print</span></button>'}</div>
      <div class="sub" style="margin-top:0">${F.comprovante ? (F.conferido ? `Conferido pelo financeiro${F.conferido_por ? ' (' + X.esc(X.nomeTime(F.conferido_por) || '') + ')' : ''}.` : 'Aparece no Início dos administradores para conferir.') : 'Com o comprovante, a venda vai como paga para a planilha.'}</div>
      ${F.comprovante && X.ADMIN ? `<label class="fc" style="margin:6px 0"><input type="checkbox" id="fConf" ${F.conferido ? 'checked' : ''}><span>Conferido pelo financeiro</span></label>` : ''}
    </div>`;
    // troca de forma ou de parcelas: o total do cartão vem da cotação e a venda passa sozinha para o líquido (ou para o Pix)
    const ajusta = () => {
      const n = +F.parcelas || 0;
      F.taxa_pct = F.forma === 'cartao' && n && ctx.taxa ? ctx.taxa(n) : (F.forma === 'pix' ? 0 : F.taxa_pct);
      if (F.forma === 'cartao') { const alvo = ctx.alvo ? ctx.alvo('cartao', n) : null; if (!F.bruto_manual) F.bruto = alvo || null; aplica(liq()); }
      else if (F.forma === 'pix') { F.bruto = null; F.bruto_manual = false; aplica(ctx.alvo ? ctx.alvo('pix', 0) : null); }
      else if (F.forma === 'pix_cartao') {
        // entra na conta = Pix + o que caiu do cartão; o total que o cliente pagou no cartão fica guardado para o custo da maquininha
        const c = combo(); F.taxa_pct = c.tx; F.bruto = c.b || null; F.bruto_manual = false;
        if (c.p + c.l > 0) aplica(Math.round((c.p + c.l) * 100) / 100);
      }
      desenha();
    };
    const mp = el.querySelector('#fMPix'); if (mp) { mp.oninput = () => { F.pix_valor = num(mp.value); }; mp.onchange = () => ajusta(); }
    const mc = el.querySelector('#fMCar'); if (mc) { mc.oninput = () => { F.cartao_liq = num(mc.value); }; mc.onchange = () => ajusta(); }
    el.querySelectorAll('[data-fp]').forEach(b => b.onclick = () => { F.forma = b.dataset.fp; ajusta(); });
    const fp = el.querySelector('#fParc'); if (fp) { fp.oninput = () => { const v = parseInt(fp.value, 10); F.parcelas = v ? Math.min(Math.max(v, 1), 12) : null; }; fp.onchange = () => { if (F.parcelas && +fp.value !== F.parcelas) { fp.value = F.parcelas; X.aviso('Parcelamento de 1 a 12 vezes.'); } ajusta(); }; }
    const fb = el.querySelector('#fBruto'); if (fb) { fb.oninput = () => { const v = String(fb.value).trim(); F.bruto = v ? Number(v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v) || null : null; F.bruto_manual = !!F.bruto; }; fb.onchange = () => ajusta(); }
    const liga = (id, k) => { const e = el.querySelector('#' + id); if (e) e.oninput = () => { F[k] = e.value.trim(); }; };
    liga('fLink', 'link'); liga('fPix', 'pix');
    const pix = el.querySelector('#fPix'); if (pix) { if (!F.pix && pix.value) F.pix = pix.value; pix.onchange = () => { try { localStorage.setItem('mk_pix', pix.value.trim()); } catch (_) {} }; }
    const env = el.querySelector('#fEnviar'); if (env) env.onclick = () => {
      const nome = String(ctx.cliente() || '').split(' ')[0];
      if (misto) {
        const c = combo();
        if (!c.p) { X.aviso('Informe o valor no Pix.'); return; }
        if (!c.l || !c.n) { X.aviso('Informe o valor do cartão e em quantas vezes.'); return; }
        if (!F.pix) { X.aviso('Informe os dados do Pix.'); return; }
        if (!F.link) { X.aviso('Cole o link de pagamento antes de enviar.'); return; }
        const txt = `Oi, ${nome}! Tudo pronto para garantir a sua viagem. O investimento ficou dividido assim: ${X.brl2(c.p)} no Pix e ${X.brl2(c.b)} no cartão, em ${c.n}x de ${X.brl2(c.b / c.n)}.\nPix:\n${F.pix}\nCartão:\n${F.link}\nAssim que os pagamentos caírem, me manda o comprovante do Pix por aqui que a gente emite e te manda tudo.`;
        const link = X.zapLink(ctx.contato(), ctx.cliente(), txt);
        if (!link) { X.aviso('O atendimento não tem WhatsApp do cliente.'); return; }
        F.enviado_em = new Date().toISOString(); window.open(link, '_blank'); desenha(); return;
      }
      if (cartao && !F.link) { X.aviso('Cole o link de pagamento antes de enviar.'); return; }
      if (cartao && !F.parcelas) { X.aviso('Informe em quantas vezes.'); return; }
      if (!cartao && !F.pix) { X.aviso('Informe os dados do Pix.'); return; }
      if (cartao && !+F.bruto) { X.aviso('Informe o total no cartão.'); return; }
      const t = ctx.total();
      const txt = cartao
        ? `Oi, ${nome}! Tudo pronto para garantir a sua viagem. O investimento total ficou em ${X.brl2(F.bruto)}, em ${F.parcelas}x de ${X.brl2(F.bruto / F.parcelas)} no cartão. É só pagar por este link:\n${F.link}\nAssim que o pagamento cair, a gente emite e te manda tudo.`
        : `Oi, ${nome}! Tudo pronto para garantir a sua viagem. O investimento total ficou em ${X.brl2(t.v)} no Pix.\n${F.pix}\nAssim que o pagamento cair, me manda o comprovante por aqui que a gente emite e te manda tudo.`;
      const link = X.zapLink(ctx.contato(), ctx.cliente(), txt);
      if (!link) { X.aviso('O atendimento não tem WhatsApp do cliente.'); return; }
      F.enviado_em = new Date().toISOString(); window.open(link, '_blank'); desenha();
    };
    const comp = el.querySelector('#fComp'); if (comp) comp.onclick = () => F.comprovante ? verArquivo(X, F.comprovante) : anexar(X, 'comprovante', F, desenha);
    const cc = el.querySelector('#fCompC'); if (cc) cc.onclick = () => colar(X, 'comprovante', F, desenha);
    F._proxAnexo = () => F.comprovante ? null : { tipo: 'comprovante', alvo: F, depois: desenha };
    const ct = el.querySelector('#fCompT'); if (ct) ct.onclick = () => anexar(X, 'comprovante', F, () => { F.conferido = false; desenha(); });
    const cf = el.querySelector('#fConf'); if (cf) cf.onchange = () => { F.conferido = cf.checked; F.conferido_por = cf.checked ? X.meuId : null; F.conferido_em = cf.checked ? new Date().toISOString() : null; desenha(); };
  };
  desenha();
  return { desenha };
}

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const sobrenome = (n) => { const p = String(n || '').trim().split(/\s+/); return p.length > 1 ? p[p.length - 1] : ''; };

// CPF da nota: o da ficha do comprador; sem ele, o do passageiro que é o comprador
const nrmNomeP = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function cpfNF(X, r, IT) {
  const p = r.pessoa_id ? (X.D.pessoas || []).find(x => x.id === r.pessoa_id) : null;
  const paxComprador = IT.flatMap(x => (x.pax || [])).find(q => q && cpfValido(q.cpf) && (nrmNomeP(q.nome) === nrmNomeP(r.cliente) || (p && q.pessoa_id === p.id)));
  const doc0 = p ? (X.D.docs || []).find(d => d.pessoa_id === p.id) : null;
  const doc = doc0 && doc0.cpf ? doc0 : paxComprador ? { cpf: paxComprador.cpf } : doc0;
  return doc && doc.cpf ? (d => d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : doc.cpf)(String(doc.cpf).replace(/\D/g, '')) : '';
}
// Observações da linha: card, passageiros, custo por trecho, horários, bagagem, onde comprou e pagamento
export function observacoesDe(r, x, F) {
  return [numCard(r) && x.grupo ? `${numCard(r)}-${LETRA[x.parte] || ''} · ${PARTES[x.parte] || ''}` : numCard(r), ehVoo(x) && paxAjustado(x).some(p => p.nome) ? 'Passageiros: ' + paxAjustado(x).map(p => p.nome).filter(Boolean).join('; ') : '', ehVoo(x) && x.ct_on && (x.ct || []).some(l => custoLinha(x, l) > 0) ? 'Custo por trecho: ' + x.ct.map(l => `${up3(l.o)}-${up3(l.d)}${l.data ? ' ' + l.data.split('-').reverse().slice(0, 2).join('/') : ''} R$ ${custoLinha(x, l).toFixed(2).replace('.', ',')}${+l.pax > 1 ? ' (' + l.pax + ' pax)' : ''}`).join('; ') : '', ehVoo(x) && x.tipo_trecho === 'multi' && x.trechos ? 'Multitrecho: ' + String(x.trechos).replace(/\n/g, ' | ') : '', ehVoo(x) && x.grupo && x.hora_ida ? 'Horário de saída: ' + x.hora_ida : ehVoo(x) && (x.hora_ida || x.hora_volta) ? 'Horário de saída: ' + [x.hora_ida ? 'ida ' + x.hora_ida : '', x.tipo_trecho !== 'ida' && x.hora_volta ? (x.tipo_trecho === 'multi' ? 'último trecho ' : 'volta ') + x.hora_volta : ''].filter(Boolean).join(', ') : '',
    // chegada só quando houver (vem da cotação ou do print da emissão)
    ehVoo(x) && x.grupo && x.chegada_ida ? 'Chegada: ' + x.chegada_ida : ehVoo(x) && (x.chegada_ida || x.chegada_volta) ? 'Chegada: ' + [x.chegada_ida ? 'ida ' + x.chegada_ida : '', x.tipo_trecho !== 'ida' && x.chegada_volta ? (x.tipo_trecho === 'multi' ? 'último trecho ' : 'volta ') + x.chegada_volta : ''].filter(Boolean).join(', ') : '',
    // bagagem só quando informada (deixou de travar: sem ela, a linha não diz nada sobre mala)
    ehVoo(x) && x.bagagem != null && x.bagagem !== '' ? `Bagagem: ${x.bagagem === '0' ? 'sem mala despachada' : x.bagagem + ' mala(s) por passageiro'}` : '', ehVoo(x) && x.pago_em === 'pagante' && x.fornecedor ? 'Comprado em ' + x.fornecedor : '', F.forma === 'cartao' && +F.bruto ? `Cliente pagou ${'R$ ' + (+F.bruto).toFixed(2).replace('.', ',')} no cartão em ${F.parcelas || 1}x (taxa da maquininha ${String(+F.taxa_pct || 0).replace('.', ',')}%)` : '',
    F.forma === 'pix_cartao' ? (rs => `Pix + Cartão: ${rs(F.pix_valor)} no Pix + ${rs(F.cartao_liq)} recebido do cartão em ${F.parcelas || 1}x (cliente pagou ${rs(F.bruto)} no cartão; taxa da maquininha ${String(+F.taxa_pct || 0).replace('.', ',')}%: ${rs((+F.bruto || 0) - (+F.cartao_liq || 0))})`)(v => 'R$ ' + (+v || 0).toFixed(2).replace('.', ',')) : ''].filter(Boolean).join(' · ');
}
const ciaDe = (x) => ehVoo(x) ? (x.cia_voo && x.cia_voo !== x.cia_emissora ? `${x.cia_emissora} (voa ${x.cia_voo})` : (x.cia_emissora || '')) : (x.fornecedor || '');
// linha da planilha de um serviço (sem o ID sistema e sem a data da negociação)
function dadosLinha(X, r, IT, x, F) {
  const milhas = usaMilhas(x), milhasInf = milhas && !!(+x.milhas || +x.taxas), p = r.pessoa_id ? (X.D.pessoas || []).find(y => y.id === r.pessoa_id) : null;
  return {
    // Gestor nunca vai vazio: as fórmulas de lucro da planilha e a sincronização com o app só leem linhas com Gestor
    'Gestor': (milhas && (x.gestor || (x.grupo && compraDe(x) === 'fornecedor' ? x.fornecedor : ''))) || 'Maktub', 'Conta': milhas ? (x.conta || '') : (x.fornecedor || ''),
    'Email ou Produto': ehVoo(x) ? '' : (x.nome || x.produto), 'Cidade': x.destino || '',
    'Cia': ciaDe(x), 'Sobrenome': sobrenome(r.cliente), 'CPF (NF)': cpfNF(X, r, IT),
    'Origem': x.origem || '', 'Destino': x.destino || '', 'Comprador': r.cliente || '', 'Passageiros': +x.passageiros || 1,
    'Contato': r.contato && !/@/.test(r.contato) ? r.contato : (p && p.celular) || '', 'Indicação': '',
    'Localizador': String(x.localizador || '').toUpperCase(),
    // emissão com milhas sem milhas e taxas informadas (custo digitado em reais, por exemplo o custo do dia da cotação):
    // o custo vai inteiro em Taxas, senão a planilha lê custo zero e o lucro fica igual à venda
    'Milhas': milhasInf ? (+x.milhas || 0) : 0, 'Milheiro': milhasInf ? (+x.milheiro || 0) : 0, 'Taxas': milhasInf ? (+x.taxas || 0) : r2(custoDe(x)),
    'Valor a receber': r2(x.venda), 'Pago': !!F.comprovante,
    'Data do Voo (Ida)': x.data_ida || '', 'Data do Voo (Volta)': x.tipo_trecho === 'ida' ? '' : (x.data_volta || ''),
    'Observações': observacoesDe(r, x, F),
    'Forma de pagamento': F.forma === 'cartao' ? 'Cartão de crédito' : F.forma === 'pix' ? 'Pix' : F.forma === 'pix_cartao' ? 'Pix + Cartão' : '',
    'Quantas vezes': (F.forma === 'cartao' || F.forma === 'pix_cartao') && F.parcelas ? +F.parcelas : '',
    'Serviço': servicoPlanilha(x), 'Vendedor': X.nomeTime(r.assumido_por || r.responsavel_id) || ''
  };
}
const NUMEROS = ['Milhas', 'Milheiro', 'Taxas', 'Valor a receber'];
// colunas que a conferência pode corrigir numa linha que já foi para a planilha
const CORRIGE = ['Gestor', 'Conta', 'Cia', 'CPF (NF)', 'Passageiros', 'Localizador', 'Origem', 'Destino', 'Data do Voo (Ida)', 'Data do Voo (Volta)', 'Observações', ...NUMEROS];
const retrato = (d) => Object.fromEntries(CORRIGE.map(k => [k, d[k]]));
// emissão já lançada que foi separada: a venda das emissões tem que continuar somando o que era antes
const rs = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function conferirSeparacao(IT) {
  const total = new Map();
  (IT || []).forEach(x => { const s = x.separada_de; if (s && !enviado(x) && !x.cancelado_em && !total.has(s.id)) total.set(s.id, +s.venda || 0); });
  for (const [id, t] of total) {
    const L = IT.filter(y => !y.cancelado_em && (String(y.planilha_id) === String(id) || (y.separada_de && String(y.separada_de.id) === String(id) && !enviado(y))));
    if (L.some(y => !(+y.venda > 0))) return `Divida a venda entre as emissões separadas: a soma precisa dar ${rs(t)}. Em "Valor de venda", escolha "Por serviço" e digite a venda de cada uma.`;
    const soma = r2(L.reduce((a, y) => a + vendaDe(y), 0));
    if (Math.abs(soma - t) > 0.009) return `A venda das emissões separadas precisa somar ${rs(t)} (está em ${rs(soma)}). Ajuste a venda de cada uma.`;
  }
  return '';
}
// o voo que saiu de uma emissão já lançada passa para a emissão nova (com o check-in que já tinha), e os voos
// que ficaram são renumerados. Nada é apagado: o mesmo registro muda de emissão.
async function moverVooSeparado(X, x, novoId) {
  const s = x.separada_de; if (!s || !s.id || !s.n) return;
  try {
    const T = (X.D.trechos || {})[String(s.id)] || [];
    const { error } = await X.sb.from('voos_emissao').update({ emissao_id: String(novoId), n: 1 }).eq('emissao_id', String(s.id)).eq('n', s.n);
    if (error) return;
    const resto = T.filter(t => t.n > s.n).sort((a, b) => a.n - b.n);
    for (const t of resto) await X.sb.from('voos_emissao').update({ n: t.n - 1 }).eq('emissao_id', String(s.id)).eq('n', t.n);
    if (X.D.trechos) {
      const mov = T.find(t => t.n === s.n);
      X.D.trechos[String(s.id)] = T.filter(t => t.n !== s.n).map(t => t.n > s.n ? { ...t, n: t.n - 1 } : t);
      if (mov) X.D.trechos[String(novoId)] = [{ ...mov, emissao_id: String(novoId), n: 1 }];
    }
  } catch (_) { /* o check-in da emissão nova é gravado logo depois de qualquer jeito */ }
}
// manda os serviços para a fila da planilha. opts.dataNeg: dia do Fechou (ou do lançamento, quando o mês do Fechou já fechou)
export async function enviarParaPlanilha(X, r, IT, F, opts = {}) {
  // passageiros primeiro: o CPF digitado no fechamento já vale para a nota (cliente novo não fica sem CPF)
  await salvarPassageiros(X, IT.filter(x => !enviado(x)));
  const dataNeg = opts.dataNeg || hojeIso();
  // emissão com milhas do cliente da Gestão não é venda: nunca vai para a planilha
  const novos = IT.filter(x => !enviado(x) && !ehCliente(x) && !x.cancelado_em);
  const linhas = novos.map(x => {
    const id = uuid(), d = dadosLinha(X, r, IT, x, F);
    return { id, atendimento_id: r.id, item: IT.indexOf(x), dados: { ...d, 'Data da negociação': dataNeg, 'ID sistema': id } };
  });
  if (!linhas.length) return { ok: true, n: 0 };
  const { error } = await X.sb.from('fila_planilha').insert(linhas);
  if (error) return { ok: false, erro: error.message };
  // emissão separada de outra já lançada: o voo dela muda de emissão antes de gravar os voos novos
  for (const l of linhas) await moverVooSeparado(X, IT[l.item], l.id);
  // e a emissão de onde ela saiu tem os horários e voos regravados (sem o voo que saiu)
  const origens = [...new Set(linhas.map(l => (IT[l.item].separada_de || {}).id).filter(Boolean))].map(id => IT.find(y => String(y.planilha_id) === String(id))).filter(Boolean);
  await salvarHorarios(X, linhas.map(l => ({ id: l.id, x: IT[l.item] })).concat(origens.map(y => ({ id: y.planilha_id, x: y }))));
  await salvarVoos(X, linhas.map(l => ({ id: l.id, x: IT[l.item] })).concat(origens.map(y => ({ id: y.planilha_id, x: y }))));
  const agora = new Date().toISOString();
  // o retrato do que foi enviado é a base para saber, na conferência, o que mudou
  linhas.forEach(l => { const x = IT[l.item]; x.planilha_id = l.id; x.enviado_em = agora; x.plan_data = dataNeg; x.plan_dados = retrato(l.dados); });
  return { ok: true, n: linhas.length };
}
// retrato das colunas que podem ser corrigidas numa linha já enviada
export const retratoLinha = (X, r, IT, x, F) => retrato(dadosLinha(X, r, IT, x, F));
// venda lançada antes do retrato existir: a base é o card como está agora (só o que mudar depois vai para a planilha)
export function garantirRetrato(X, r, IT, F) {
  IT.forEach(x => { if (enviado(x) && !ehCliente(x) && !x.cancelado_em && !x.plan_dados) x.plan_dados = retratoLinha(X, r, IT, x, F); });
}
// corrige na planilha tudo o que mudou nos serviços já enviados (card salvo ou conferência)
export async function corrigirNaPlanilha(X, r, IT, F, opts = {}) {
  let n = 0;
  for (const x of IT) { const z = await atualizarNaPlanilha(X, r, IT, F, x, opts); if (!z.ok) return { ok: false, erro: z.erro, n }; n += z.n; }
  return { ok: true, n };
}
// conferência: só o que foi mexido nesta conferência vai para a mesma linha da planilha (pelo ID sistema).
// A planilha manda nos dados: o que alguém corrigiu direto nela não é sobrescrito. opts.antes = retratoLinha de quando abriu.
// Valor ou custo de uma venda de mês fechado não mudam a linha antiga: entra uma linha de ajuste no mês atual
// com a diferença (mesma regra do cancelamento B2B). opts.fechado('AAAA-MM') diz se o mês da venda está fechado.
export async function atualizarNaPlanilha(X, r, IT, F, x, opts = {}) {
  const antes = opts.antes || x.plan_dados;
  if (!enviado(x) || ehCliente(x) || x.cancelado_em || !antes) return { ok: true, n: 0 };
  const novo = retratoLinha(X, r, IT, x, F);
  const igual = (a, b) => typeof a === 'number' || typeof b === 'number' ? r2(a) === r2(b) : String(a ?? '') === String(b ?? '');
  const mudou = CORRIGE.filter(k => !igual(novo[k], antes[k]));
  if (!mudou.length) return { ok: true, n: 0 };
  // mês da venda: o da linha que voltou da planilha; sem ela, o do envio
  const e = (X.D.emissoes || []).find(o => String(o.id) === String(x.planilha_id));
  const mes = String((e && e.data_negociacao) || x.plan_data || x.enviado_em || '').slice(0, 7);
  const fechado = !!(opts.fechado && mes && opts.fechado(mes));
  const textos = mudou.filter(k => !NUMEROS.includes(k)), nums = mudou.filter(k => NUMEROS.includes(k));
  const linhas = [], atual = {};
  [...textos, ...(fechado ? [] : nums)].forEach(k => { atual[k] = novo[k]; });
  // pedido de atualização: mesmo caminho do cancelamento B2B (linha sem card), testado na planilha em 15/11/2026
  if (Object.keys(atual).length) linhas.push({ id: uuid(), atendimento_id: null, item: 0, dados: { _acao: 'atualizar', _alvo: x.planilha_id, ...atual } });
  if (fechado && nums.length) {
    // ajuste no mês atual: só a diferença de venda e de custo (a diferença de custo vai em Taxas, como no B2B)
    const custoDe_ = (d) => r2((+d['Milhas'] || 0) * (+d['Milheiro'] || 0) / 1000 + (+d['Taxas'] || 0));
    const id = uuid(), d = dadosLinha(X, r, IT, x, F), quando = hojeIso().split('-').reverse().join('/');
    linhas.push({ id, atendimento_id: r.id, item: IT.indexOf(x), dados: { ...d, 'Milhas': 0, 'Milheiro': 0, 'Taxas': r2(custoDe_(novo) - custoDe_(antes)),
      'Valor a receber': r2((+novo['Valor a receber'] || 0) - (+antes['Valor a receber'] || 0)), 'Pago': true,
      'Observações': `AJUSTE em ${quando} da venda de ${mes.split('-').reverse().join('/')} (${numCard(r) || 'card'}): diferença de valor e custo corrigidos na conferência.`,
      'Data da negociação': hojeIso(), 'ID sistema': id } });
  }
  const { error } = await X.sb.from('fila_planilha').insert(linhas);
  if (error) return { ok: false, erro: error.message };
  x.plan_dados = { ...(x.plan_dados || {}), ...novo };
  (x.correcoes = Array.isArray(x.correcoes) ? x.correcoes : []).push({ em: new Date().toISOString(), por: X.meuId || null, campos: mudou, ...(fechado && nums.length ? { ajuste: true } : {}) });
  if (fechado && nums.length) (x.ajustes = Array.isArray(x.ajustes) ? x.ajustes : []).push({ id: linhas[linhas.length - 1].id, em: new Date().toISOString() });
  return { ok: true, n: linhas.length };
}

// horário de saída de cada emissão de voo (ida e volta/último trecho): é o que faz o aviso de check-in sair 24 h antes.
// Sem horário (vendas antigas), o aviso sai às 7h do dia anterior. Fica numa tabela própria, ligada pelo ID sistema da emissão.
// O horário digitado é o local do aeroporto de saída; o fuso dele vai junto para o aviso converter para Brasília.
let FUSOS = null;
export async function fusoDe(cod) {
  const c = String(cod || '').trim().toUpperCase(); if (!/^[A-Z]{3}$/.test(c)) return null;
  try { if (!FUSOS) FUSOS = await (await fetch('/admin/app/aeroportos-fuso.json?v=1')).json(); } catch (_) { return null; }
  const i = FUSOS.a[c]; return i == null ? null : FUSOS.f[i];
}
// origem do trecho de volta: na ida e volta é o destino; no multitrecho, a origem do último trecho
const origemVolta = (x) => x.tipo_trecho === 'multi' ? ((x.ct || []).length ? x.ct[x.ct.length - 1].o : (String(x.trechos || '').trim().split('\n').pop().match(/[A-Za-z]{3}/) || [''])[0]) : x.destino;
export async function salvarHorarios(X, L) {
  const rows = [];
  for (const { id, x } of L.filter(({ x }) => ehVoo(x) && (x.hora_ida || x.hora_volta))) {
    const volta = x.tipo_trecho === 'ida' ? null : (x.hora_volta || null);
    rows.push({ emissao_id: String(id), hora_ida: x.hora_ida || null, hora_volta: volta, tz_ida: x.hora_ida ? await fusoDe(x.origem) : null, tz_volta: volta ? await fusoDe(origemVolta(x)) : null });
  }
  if (!rows.length) return;
  try { const { error } = await X.sb.from('voo_horarios').upsert(rows); if (!error) rows.forEach(r => { (X.D.horas = X.D.horas || {})[r.emissao_id] = r; }); } catch (_) { /* a venda segue; o aviso usa a meia-noite */ }
}

// cada voo da emissão (ida, volta, cada trecho do multitrecho) vira uma linha com rota, data, horário e fuso:
// é por ela que o check-in e o aviso de 24 h funcionam voo a voo. Conexão dentro do mesmo trecho é um check-in só.
export async function salvarVoos(X, L) {
  const rows = [];
  for (const { id, x } of L.filter(({ x }) => ehVoo(x))) {
    // rota, datas e horários como estão no fechamento (podem ter mudado desde a cotação)
    const ls = voosDaEmissao(x).filter(l => l.data);
    if (!ls.length) continue;
    for (let n = 0; n < ls.length; n++) { const l = ls[n]; rows.push({ emissao_id: String(id), n: n + 1, origem: l.o || null, destino: l.d || null, data: l.data, hora: l.hora || null, tz: await fusoDe(l.o) }); }
  }
  if (!rows.length) return;
  try { const { error } = await X.sb.from('voos_emissao').upsert(rows); if (!error) { X.D.trechos = X.D.trechos || {}; rows.forEach(r => { (X.D.trechos[r.emissao_id] = (X.D.trechos[r.emissao_id] || []).filter(o => o.n !== r.n)).push(r); }); } } catch (_) { /* sem a tabela: segue o check-in de ida e volta */ }
}

// ficha que já existe para a mesma pessoa: CPF primeiro (não muda), depois celular, e-mail e nome
// (nome igual, ou o nome digitado contido no da ficha, como "Ana Paula" e "Ana Paula Souza", quando só uma ficha bate)
let CACHE_P = null;
export function acharPessoa(D, q) {
  const P = (D && D.pessoas) || [], n = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  // nomes já normalizados (a lista de leads chama isto para cada lead)
  if (!CACHE_P || CACHE_P.P !== P || CACHE_P.len !== P.length) CACHE_P = { P, len: P.length, k: new Map(P.map(o => [o, n(o.nome)])) };
  const nk = (o) => CACHE_P.k.get(o) || n(o.nome);
  const cpf = soDig(q.cpf); if (cpf.length === 11) { const d = ((D && D.docs) || []).find(o => soDig(o.cpf) === cpf); const p = d && P.find(o => o.id === d.pessoa_id); if (p) return p; }
  const ct = String(q.contato || '').trim(), dig = soDig(ct);
  if (/@/.test(ct)) { const p = P.find(o => n(o.email) === n(ct)); if (p) return p; }
  else if (dig.length >= 8) { const p = P.find(o => soDig(o.celular).slice(-8) === dig.slice(-8)); if (p) return p; }
  const k = n(q.nome); if (!k) return null;
  const ex = P.find(o => nk(o) === k); if (ex) return ex;
  if (q.exato || cpf.length === 11) return null;
  const tk = k.split(' '); if (tk.length < 2) return null;
  const c = P.filter(o => { const t = nk(o).split(' '); return t[0] === tk[0] && tk.every(x => t.includes(x)); });
  return c.length === 1 ? c[0] : null;
}

// cada passageiro vira (ou atualiza) uma ficha no CRM com papel de passageiro, CPF e nascimento
export async function salvarPassageiros(X, itens) {
  const n = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const todos = itens.filter(ehVoo).flatMap(x => paxAjustado(x).map(p => ({ x, p }))).filter(({ p }) => String(p.nome || '').trim().includes(' '));
  for (const { p } of todos) {
    try {
      let f = p.pessoa_id ? (X.D.pessoas || []).find(o => o.id === p.pessoa_id) : acharPessoa(X.D, { nome: p.nome, cpf: p.cpf, exato: true });
      if (!f) {
        const ins = await X.sb.from('pessoas').insert({ nome: p.nome.replace(/\s+/g, ' ').trim(), nascimento: p.nasc || null, papeis: ['passageiro'] }).select().single();
        if (ins.error) continue; f = ins.data; (X.D.pessoas = X.D.pessoas || []).push(f);
      } else {
        const up = {};
        if (p.nasc && !f.nascimento) up.nascimento = p.nasc;
        if (!(f.papeis || []).includes('passageiro')) up.papeis = [...(f.papeis || []), 'passageiro'];
        if (Object.keys(up).length) { const u = await X.sb.from('pessoas').update(up).eq('id', f.id).select().single(); if (!u.error) Object.assign(f, u.data); }
      }
      p.pessoa_id = f.id;
      const d = (X.D.docs || []).find(o => o.pessoa_id === f.id);
      if (cpfValido(p.cpf) && !(d && d.cpf)) {
        const r = await X.sb.from('pessoas_documentos').upsert({ ...(d || {}), pessoa_id: f.id, cpf: fmtCpf(p.cpf) }).select().single();
        if (!r.error) X.D.docs = (X.D.docs || []).filter(o => o.pessoa_id !== f.id).concat(r.data);
      }
    } catch (_) { /* a venda segue; a ficha pode ser completada depois no CRM */ }
  }
}

// ---------- emissão com milhas do cliente: leitura do print, lançamento na Gestão, voos e cancelamento ----------
const lerDataURL = (file) => new Promise(ok => { const img = new Image(); img.onload = () => { const k = Math.min(1, 2400 / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); ok(cv.toDataURL('image/jpeg', 0.88)); URL.revokeObjectURL(img.src); }; img.onerror = () => ok(null); img.src = URL.createObjectURL(file); });
// "SANTOS/ANA MARIA MRS" (como as companhias escrevem) vira "Ana Maria Santos"
function nomePax(n) {
  let t = String(n || '').trim(); const m = /^([^/]+)\/(.+)$/.exec(t);
  if (m) t = m[2].replace(/\s+(MR|MRS|MS|MISS|MSTR|SR|SRA|CHD|INF)\.?$/i, '') + ' ' + m[1];
  return t.toLowerCase().replace(/\s+/g, ' ').replace(/(^|\s)(\S)/g, (a, b, c) => b + c.toUpperCase()).replace(/\s(Da|De|Do|Das|Dos|E)(?=\s)/g, w => w.toLowerCase());
}
const GRUPOS_PROG = [['azul', 'tudoazul', 'azulfidelidade'], ['latampass', 'latam', 'multiplus'], ['smiles', 'golsmiles'], ['tapmilesgo', 'milesgo', 'tap'], ['livelo'], ['esfera'], ['aadvantage'], ['iberiaplus', 'iberia'], ['qatarprivilegeclub', 'qatar'], ['britishairways', 'avios']];
function casarPrograma(nome, G) {
  const L = (G && G.programas) || [], k = normP(nome), g = GRUPOS_PROG.find(gr => gr.some(z => k.includes(z)));
  const p = L.find(q => normP(q.programa) === k) || (g && L.find(q => g.some(z => normP(q.programa).includes(z))));
  return p ? p.programa : String(nome || '').trim();
}
// emissão vendida pela Maktub (milhas ou pagante): o print da emissão preenche rota, datas, saída e chegada de cada voo
function aplicarVoosVenda(x, tr, vazio) {
  const iv = tr.length === 2 && up3(tr[1].destino) === up3(tr[0].origem), tipo = tr.length === 1 ? 'ida' : iv ? 'iv' : 'multi';
  const ult = tr[tr.length - 1], porTrecho = !!(x.ct_on && Array.isArray(x.ct) && x.ct.length === tr.length);
  if (vazio(x.origem) && vazio(x.destino)) { x.tipo_trecho = tipo; x.origem = up3(tr[0].origem); x.destino = up3(tipo === 'multi' ? ult.destino : tr[0].destino); }
  if (vazio(x.data_ida) && tr[0].data) x.data_ida = tr[0].data;
  if (vazio(x.hora_ida) && tr[0].saida) x.hora_ida = tr[0].saida;
  if (vazio(x.chegada_ida) && tr[0].chegada) x.chegada_ida = tr[0].chegada;
  if (tr.length > 1) {
    if (vazio(x.data_volta) && ult.data) x.data_volta = ult.data;
    if (vazio(x.hora_volta) && ult.saida) x.hora_volta = ult.saida;
    if (vazio(x.chegada_volta) && ult.chegada) x.chegada_volta = ult.chegada;
  }
  if ((x.tipo_trecho || tipo) === 'multi' && !porTrecho && vazio(x.trechos)) x.trechos = tr.map(v => `${up3(v.origem)}-${up3(v.destino)}${v.data ? ' ' + ddmm(v.data) : ''}`).join('\n');
  // voos do meio do multitrecho e custo por trecho: cada um com a própria saída e chegada
  x.hrs = Array.isArray(x.hrs) ? x.hrs : []; x.chs = Array.isArray(x.chs) ? x.chs : [];
  tr.forEach((v, k) => {
    if (vazio(x.hrs[k]) && v.saida) x.hrs[k] = v.saida;
    if (vazio(x.chs[k]) && v.chegada) x.chs[k] = v.chegada;
    if (porTrecho) { const l = x.ct[k]; if (vazio(l.data) && v.data) l.data = v.data; if (vazio(l.hora) && v.saida) l.hora = v.saida; if (vazio(l.chegada) && v.chegada) l.chegada = v.chegada; }
  });
}
function aplicarLeitura(X, x, d, ctx) {
  // o print só preenche o que ainda está vazio: o que a pessoa já digitou fica
  const vazio = (v) => v === undefined || v === null || String(v).trim() === '';
  const cli = ehCliente(x);
  if (cli && d.programa && vazio(x.programa)) x.programa = casarPrograma(d.programa, ctx.gestao);
  // milhas e taxas: na milhas do cliente e na venda com milhas (na pagante, o custo é o valor pago ao fornecedor)
  if (cli || usaMilhas(x)) {
    if (+d.milhas > 0 && vazio(x.milhas)) x.milhas = Math.round(+d.milhas);
    if (d.taxas !== null && d.taxas !== undefined && +d.taxas >= 0 && vazio(x.taxas)) x.taxas = r2(+d.taxas);
  }
  if (d.localizador && vazio(x.localizador)) x.localizador = String(d.localizador).toUpperCase();
  if (d.companhia_emissora && vazio(x.cia_emissora)) x.cia_emissora = d.companhia_emissora;
  if (d.cabine && vazio(x.cabine)) x.cabine = d.cabine;
  const tr = (d.trechos || []).filter(v => v.origem || v.destino);
  const c0 = tr.length > 1 && tr[0].companhia, cU = tr.length > 1 && tr[tr.length - 1].companhia;
  if (!x.grupo && c0 && cU && normP(c0) !== normP(cU)) x.sugere_blocos = true;
  else { const op = tr.map(v => v.companhia).find(c => c && normP(c) !== normP(x.cia_emissora)); if (op && vazio(x.cia_voo)) x.cia_voo = op; }
  if (!cli && tr.length) aplicarVoosVenda(x, tr, vazio);
  else if (tr.length && !(x.voos || []).some(v => v.o || v.d || v.data)) {
    x.voos = tr.map(v => ({ o: up3(v.origem), d: up3(v.destino), data: v.data || '', hora: v.saida || '', chegada: v.chegada || '' }));
    cabecalhoCliente(x);
  } else if (tr.length) {
    // voos já preenchidos: a chegada entra onde ainda estiver vazia
    (x.voos || []).forEach((v, k) => { if (tr[k] && vazio(v.chegada) && tr[k].chegada) v.chegada = tr[k].chegada; });
  }
  // passageiros do print, na ordem do print; quem já tem ficha traz CPF e nascimento
  const P = (d.passageiros || []).map(nomePax).filter(n => n.includes(' '));
  if (P.length) {
    const ant = Array.isArray(x.pax) ? x.pax : [], n = (t) => normP(t);
    x.pax = P.map(nm => {
      const ja = ant.find(p => n(p.nome) === n(nm)); if (ja) return ja;
      const p = { nome: nm, cpf: '', nasc: '' }, f = acharPessoa(X.D, { nome: nm, exato: true });
      if (f) { p.nome = f.nome || nm; p.pessoa_id = f.id; const dc = (X.D.docs || []).find(o => o.pessoa_id === f.id); if (dc && dc.cpf) p.cpf = fmtCpf(dc.cpf); if (f.nascimento) p.nasc = f.nascimento; }
      return p;
    });
    x.passageiros = P.length;
  }
  x.lido_em = new Date().toISOString(); x.lido_obs = d.observacao || '';
}
// redesenhar tira o foco de quem estava digitando: guarda o campo e a posição do cursor e devolve depois (igual ao do cotador)
function comFoco(fn) {
  const a = document.activeElement, q = a && a !== document.body ? (a.dataset && a.dataset.k ? `[data-k="${a.dataset.k}"]${a.dataset.it !== undefined ? `[data-it="${a.dataset.it}"]` : ''}` : a.id ? '#' + a.id : a.name ? `[name="${a.name}"]` : null) : null;
  let pos = null; try { pos = a && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null; } catch (_) { pos = null; }
  const r = fn();
  if (!q) return r;
  // a tela pode redesenhar na hora ou só quando a leitura termina: espera o campo antigo sair e põe o foco no novo
  const devolve = () => {
    if (a.isConnected) return document.activeElement !== a; // não redesenhou ainda; se a pessoa já foi para outro campo, para
    const at = document.activeElement; if (at && at !== document.body) return true;
    const b = document.querySelector(q); if (!b) return false;
    b.focus(); try { if (pos) b.setSelectionRange(pos[0], pos[1]); } catch (_) { /* campo sem cursor */ }
    return true;
  };
  if (devolve()) return r;
  const ob = new MutationObserver(() => { if (devolve()) ob.disconnect(); });
  ob.observe(document.body, { childList: true, subtree: true }); setTimeout(() => ob.disconnect(), 8000);
  return r;
}
export async function lerEmissao(X, x, files, ctx, depois) {
  files = [...(files || [])].filter(f => f && /^image\//.test(f.type)).slice(0, 4);
  if (!files.length) { X.aviso('Escolha uma imagem da emissão.'); return; }
  X.aviso(files.length > 1 ? `Lendo ${files.length} prints...` : 'Lendo o print...');
  const imagens = (await Promise.all(files.map(lerDataURL))).filter(Boolean);
  const { data, error } = await X.sb.functions.invoke('ler-emissao', { body: { imagens } });
  let msg = data && data.erro;
  if (!msg && error && error.context && typeof error.context.json === 'function') { try { msg = (await error.context.json()).erro; } catch (_) { /* sem corpo */ } }
  if (!msg && error && error.context && error.context.status === 404) msg = 'A leitura do print da emissão ainda não está publicada. Preencha à mão.';
  if (!data || !data.ok) { X.aviso(msg || 'Não consegui ler o print. Tente de novo ou preencha à mão.'); return; }
  aplicarLeitura(X, x, data, ctx);
  comFoco(depois);
  if (!x.print) await subir(X, 'print', x, depois, files[0]);
  if (X.rascunho) X.rascunho(true);
  X.aviso(ehCliente(x) ? 'Print lido. Confira os campos e digite o valor pagante.' : 'Print lido. Confira os campos: só o que estava vazio foi preenchido.');
}
// cada voo da emissão vira uma linha em voos_emissao (mesma tabela das vendas): check-in voo a voo e bilhete obrigatório
export async function salvarVoosCliente(X, x) {
  const rows = [], V = voosCliente(x).filter(v => v.data);
  for (let k = 0; k < V.length; k++) { const v = V[k]; rows.push({ emissao_id: String(x.ref), n: k + 1, origem: up3(v.o) || null, destino: up3(v.d) || null, data: v.data, hora: v.hora || null, tz: await fusoDe(v.o) }); }
  if (!rows.length) return { ok: false, erro: 'sem voos com data' };
  const { error } = await X.sb.from('voos_emissao').upsert(rows);
  if (error) return { ok: false, erro: error.message };
  X.D.trechos = X.D.trechos || {}; X.D.trechos[String(x.ref)] = rows.map(r => Object.assign({}, ((X.D.trechos[String(x.ref)] || []).find(o => o.n === r.n) || {}), r));
  return { ok: true };
}
// lança (ou atualiza) a emissão na ficha da Gestão: Uso de milhas, voo e reembolso das taxas quando a Maktub pagou.
// Se já existir um Uso de milhas lançado à mão igual, pergunta se é o mesmo antes de gravar outro.
export async function lancarCliente(X, card, x, G) {
  const cli = (G && G.cliente_id) || x.cliente_gestao_id;
  if (!cli) return { ok: false, erro: 'Não achei a ficha da Gestão do cliente deste card.' };
  if (!x.ref) x.ref = uuid();
  cabecalhoCliente(x);
  const loc = String(x.localizador || '').toUpperCase();
  const voo = { comprador: card.cliente || '', contato: card.contato || '', cia_emissora: x.cia_emissora || '', cia_voo: x.cia_voo || '', localizador: loc,
    origem: x.origem || '', destino: x.destino || '', data_ida: x.data_ida || '', data_volta: x.data_volta || '', passageiros: nPax(x),
    passageiros_nomes: paxAjustado(x).map(p => p.nome).filter(Boolean).join('; ') };
  if (x.gestao_manual) {
    // ligado a um Uso de milhas lançado à mão: o lançamento fica como está, só o voo entra no check-in
    const { error } = await X.sb.from('voos_milhas_cliente').upsert({ id: String(x.ref), atendimento_id: card.id, cliente_id: cli, extrato_id: x.gestao_manual, programa: x.programa || null, ...voo,
      data_ida: voo.data_ida || null, data_volta: voo.data_volta || null, updated_at: new Date().toISOString() });
    if (error) return { ok: false, erro: error.message };
    // taxas pagas pela Maktub continuam como movimento neutro (reembolso a receber)
    const agora = new Date().toISOString();
    const rb = x.taxas_quem === 'maktub' && +x.taxas > 0
      ? await X.sb.from('reembolsos_taxas_gestao').upsert({ emissao_ref: String(x.ref), atendimento_id: card.id, cliente_id: cli, valor: +x.taxas, pago_em: x.taxas_pago_em || x.data_emissao, descricao: `Taxas da emissão ${loc} (${descCliente(x)})`, cancelado_em: null, cancelado_por: null, updated_at: agora }, { onConflict: 'emissao_ref' })
      : await X.sb.from('reembolsos_taxas_gestao').update({ cancelado_em: agora, cancelado_por: X.meuId, updated_at: agora }).eq('emissao_ref', String(x.ref)).is('cancelado_em', null);
    if (rb.error) return { ok: false, erro: rb.error.message };
  } else {
    const dados = { data: x.data_emissao, programa: x.programa, milhas: +x.milhas, taxas: x.taxas ?? null, pagante: x.pagante ?? null, rex: x.rex ?? null, descricao: descCliente(x), voo,
      reembolso: x.taxas_quem === 'maktub' && +x.taxas > 0 ? { valor: +x.taxas, pago_em: x.taxas_pago_em || x.data_emissao, descricao: `Taxas da emissão ${loc} (${descCliente(x)})` } : null };
    const chamar = () => X.sb.rpc('gestao_emissao_cliente_salvar', { p_ref: String(x.ref), p_atendimento: String(card.id), p_cliente: String(cli), p_dados: dados, p_ignorar_duplicado: !!x.dup_ok });
    let r = await chamar();
    if (r.error) return { ok: false, erro: r.error.message };
    if (r.data && r.data.ok === false && Array.isArray(r.data.duplicados) && r.data.duplicados.length) {
      const d0 = r.data.duplicados[0];
      const mesmo = await pergunta(`Já existe um Uso de milhas lançado à mão na ficha da Gestão. É esta mesma emissão?\n\n${ddmm(d0.data)} · ${d0.programa} · ${milFmt(d0.milhas)} milhas${d0.descricao ? ' · ' + d0.descricao : ''}\n\nSe for a mesma, o app não lança de novo e só liga o voo ao check-in. Se for outra, o app lança mais um Uso de milhas.`, { sim: 'É a mesma', nao: 'É outra emissão', escolha: true });
      if (mesmo) { x.gestao_manual = d0.id; return lancarCliente(X, card, x, G); }
      x.dup_ok = true; r = await chamar();
      if (r.error) return { ok: false, erro: r.error.message };
    }
    if (!r.data || !r.data.ok) return { ok: false, erro: 'A Gestão não confirmou o lançamento.' };
    x.gestao_extrato = r.data.extrato_id;
  }
  const v = await salvarVoosCliente(X, x);
  if (!x.gestao_em) { x.gestao_em = new Date().toISOString(); x.gestao_por = X.meuId; }
  x.cliente_gestao_id = cli; x.gestao_snap = snapCliente(x);
  return { ok: true, cliente_id: cli, avisoVoos: v.ok ? '' : 'Os voos não entraram no check-in: ' + v.erro };
}
export async function cancelarCliente(X, x) {
  const agora = new Date().toISOString();
  if (x.gestao_manual) {
    // o Uso de milhas lançado à mão não é alterado: só o voo sai do check-in e o reembolso (se houver) fica cancelado
    const { error } = await X.sb.from('voos_milhas_cliente').update({ cancelado_em: agora, cancelado_por: X.meuId, updated_at: agora }).eq('id', String(x.ref));
    if (error) return { ok: false, erro: error.message };
    await X.sb.from('reembolsos_taxas_gestao').update({ cancelado_em: agora, cancelado_por: X.meuId, updated_at: agora }).eq('emissao_ref', String(x.ref)).is('cancelado_em', null);
  } else {
    const r = await X.sb.rpc('gestao_emissao_cliente_cancelar', { p_ref: String(x.ref) });
    if (r.error) return { ok: false, erro: r.error.message };
  }
  x.cancelado_em = agora; x.cancelado_por = X.meuId;
  return { ok: true, cliente_id: x.cliente_gestao_id };
}
