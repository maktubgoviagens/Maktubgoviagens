// Maktub Go: contrato da Gestão de Milhas gerado direto da ficha do cliente.
// O texto do contrato fica no banco (tabela contrato_modelos), visível só para a equipe:
// assim os dados da Maktub e do sócio não ficam em arquivo público, e o modelo pode mudar sem mexer no código.
// Fluxo: conferir dados > gerar PDF > enviar ao Autentique (função contrato-autentique) > assinado volta para a ficha e para o painel do cliente.

const ESTADOS_CIVIS = ['solteiro(a)', 'casado(a)', 'divorciado(a)', 'viúvo(a)', 'separado(a)', 'em união estável'];
const STATUS = { gerado: ['Gerado', ''], enviado: ['Aguardando assinatura', 'alerta'], assinado: ['Assinado', 'ok'], recusado: ['Recusado', 'alerta'], cancelado: ['Cancelado', ''] };
const LIMITE_GRATIS = 10, AVISO_LIMITE = 8;
const so = (t) => String(t || '').replace(/\D/g, '');
const fmtCpf = (cpf) => { const d = so(cpf); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (cpf || ''); };
const fmtCep = (c) => { const d = so(c); return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : (c || ''); };
const cpfOk = (c) => { const d = so(c); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; }; return dv(9) === +d[9] && dv(10) === +d[10]; };
const dinheiro = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const centavos = (v) => Math.round(Number(v || 0) * 100);
const dataExtensa = (iso) => { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }); };
const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const lembrar = (k, v) => { try { if (v === undefined) return localStorage.getItem('mk_ctr_' + k) || ''; localStorage.setItem('mk_ctr_' + k, v); } catch (_) { return ''; } };

// ---------- valor por extenso (reais e centavos) ----------
const UN = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
function ate999(n) {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100), r = n % 100, p = [];
  if (c) p.push(CT[c]);
  if (r) p.push(r < 20 ? UN[r] : DZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UN[r % 10] : ''));
  return p.join(' e ');
}
function inteiroExtenso(n) {
  if (n === 0) return 'zero';
  const nomes = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']], grupos = [];
  let x = n; while (x > 0) { grupos.push(x % 1000); x = Math.floor(x / 1000); }
  const partes = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i]; if (!g) continue;
    partes.push({ g, t: i === 1 && g === 1 ? 'mil' : ate999(g) + (i ? ' ' + nomes[i][g === 1 ? 0 : 1] : '') });
  }
  // "e" antes do último grupo quando ele é menor que 100 ou centena redonda: dois mil e quinhentos, mil e um
  return partes.map((p, k) => k === 0 ? p.t : (k === partes.length - 1 && (p.g < 100 || p.g % 100 === 0) ? ' e ' : ' ') + p.t).join('');
}
export function extenso(valor) {
  const tot = centavos(valor), r = Math.floor(tot / 100), c = tot % 100;
  const milhaoRedondo = r >= 1e6 && r % 1e6 === 0;
  const reais = r ? inteiroExtenso(r) + (milhaoRedondo ? ' de' : '') + (r === 1 ? ' real' : ' reais') : '';
  const cent = c ? inteiroExtenso(c) + (c === 1 ? ' centavo' : ' centavos') : '';
  return reais && cent ? reais + ' e ' + cent : reais || cent || 'zero reais';
}

// ---------- PDF ----------
// Identidade Maktub: verde, dourado e creme; títulos em Cormorant Garamond e texto em Montserrat.
const COR = { verde: '#1B4332', dourado: '#A88B4A', creme: '#EBE0C4', creme2: '#F6F1E4', texto: '#2E2E2E', cinza: '#8A8A8A' };
let PDFMAKE = null, FONTES = null;
function script(src) { return new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Não carregou ' + src)); document.head.appendChild(s); }); }
const paraDataUrl = (b) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(null); r.readAsDataURL(b); });
async function pdfMake() {
  if (PDFMAKE) return PDFMAKE;
  if (!window.pdfMake) await script('/admin/app/lib/pdfmake.min.js?v=0.2.23');
  if (!window.pdfMake.vfs || !Object.keys(window.pdfMake.vfs).length) await script('/admin/app/lib/vfs_fonts.js?v=0.2.23');
  PDFMAKE = window.pdfMake; return PDFMAKE;
}
// carrega as fontes da marca; se falhar, o contrato sai em Roboto (fonte padrão), sem travar
async function fontesMarca(pm) {
  if (FONTES !== null) return FONTES;
  try {
    const arqs = ['montserrat-400', 'montserrat-600', 'montserrat-400i', 'cormorant-600', 'cormorant-600i'];
    const b64 = await Promise.all(arqs.map(async (n) => { const r = await fetch(`/admin/app/lib/fontes/${n}.ttf?v=1`); if (!r.ok) throw new Error(n); return String(await paraDataUrl(await r.blob())).split(',')[1]; }));
    arqs.forEach((n, i) => { pm.vfs[n + '.ttf'] = b64[i]; });
    pm.fonts = Object.assign({}, pm.fonts || {}, {
      Montserrat: { normal: 'montserrat-400.ttf', bold: 'montserrat-600.ttf', italics: 'montserrat-400i.ttf', bolditalics: 'montserrat-600.ttf' },
      Cormorant: { normal: 'cormorant-600.ttf', bold: 'cormorant-600.ttf', italics: 'cormorant-600i.ttf', bolditalics: 'cormorant-600i.ttf' }
    });
    FONTES = { texto: 'Montserrat', titulo: 'Cormorant' };
  } catch (_) { FONTES = { texto: 'Roboto', titulo: 'Roboto' }; }
  return FONTES;
}
async function imagem(url) { try { const r = await fetch(url); if (!r.ok) return null; return await paraDataUrl(await r.blob()); } catch (_) { return null; } }
const CHAVE = /\{\{\s*([a-z_]+)\s*\}\}/g;
export function camposDoModelo(blocos) {
  const s = new Set();
  const ver = (t) => { for (const m of String(t || '').matchAll(CHAVE)) s.add(m[1]); };
  (blocos || []).forEach(b => { (b.r || []).forEach(r => ver(r[0])); (b.linhas || []).forEach(l => l.forEach(ver)); [b.titulo, b.subtitulo, b.local].forEach(ver); (b.partes || []).forEach(l => l.forEach(ver)); });
  return [...s];
}
const trocar = (t, dados) => marcarImagem(String(t || '').replace(CHAVE, (_, k) => (dados[k] !== undefined && dados[k] !== null && String(dados[k]).trim() !== '') ? String(dados[k]) : `[${k}]`), dados);
// a opção de uso de imagem é escolhida no app e já sai marcada no PDF
function marcarImagem(t, dados) {
  if (!dados || !['sim', 'nao'].includes(dados.uso_imagem)) return t;
  return t.replace(/\(\s*\)\s*Autorizo\s*\(\s*\)\s*Não autorizo/, dados.uso_imagem === 'sim' ? '( X ) Autorizo   (   ) Não autorizo' : '(   ) Autorizo   ( X ) Não autorizo');
}
// número da cláusula (1.1., 10.2.) em destaque, sem mexer no texto
function comNumero(runs, dados) {
  const out = [];
  runs.forEach(([t, neg], i) => {
    let txt = trocar(t, dados);
    if (i === 0) { const m = txt.match(/^(\d+\.\d+\.)\s*/); if (m) { out.push({ text: m[1] + ' ', bold: true, color: COR.verde }); txt = txt.slice(m[0].length); } }
    out.push({ text: txt, bold: !!neg });
  });
  return out;
}
// ---------- página de assinaturas e rubricas ----------
// O contrato termina numa página só de assinaturas, com posições fixas, e a rubrica do membro fica no rodapé de todas as páginas.
// As posições (em % da página A4) vão para o Autentique, que carimba a assinatura e a rubrica de cada um no lugar certo.
const A4 = { w: 595.28, h: 841.89 };
const ASS = { titulo: 92, local: 128, maktub: 186, membro: 356, altura: 86, x: 52, largura: 300 };
// rodapé: começa a 54pt do fim da página + 18pt de margem; caixa na 3ª coluna, contada da direita (página de 30 + espaço de 8 + caixa de 92)
const RUB = { x: 413, y: 805.89, w: 92, h: 24 };
const pct = (v, total) => (Math.round(v / total * 10000) / 100).toFixed(2);
export const LAYOUT_VERSAO = 1;
function layoutAssinaturas(paginas) {
  const caixa = (topo) => ({ x: pct(ASS.x + 12, A4.w), y: pct(topo + 18, A4.h) });
  return {
    versao: LAYOUT_VERSAO, paginas,
    maktub: [{ ...caixa(ASS.maktub), z: paginas, element: 'SIGNATURE' }],
    membro: [{ ...caixa(ASS.membro), z: paginas, element: 'SIGNATURE' },
      ...Array.from({ length: paginas - 1 }, (_, i) => ({ x: pct(RUB.x + 8, A4.w), y: pct(RUB.y + 3, A4.h), z: i + 1, element: 'INITIALS' }))]
  };
}
function paginaAssinaturas(linhas, dados, F) {
  // linhas do bloco "Assinaturas" do modelo: local e data, Maktub e representante, membro
  const L = linhas.map(t => t.trim()).filter(Boolean);
  const membroLinha = L.find(t => /^MEMBRO\b/i.test(t)) || ('MEMBRO: ' + (dados.nome_completo || ''));
  const local = L.find(t => t !== membroLinha && /\d{4}\.?$/.test(t)) || '';
  const maktub = L.filter(t => t !== membroLinha && t !== local);
  const abs = (y, x = ASS.x) => ({ x, y });
  const rotulo = (t, y) => ({ text: t, fontSize: 6.8, bold: true, characterSpacing: 1.6, color: COR.dourado, absolutePosition: abs(y) });
  const area = (topo) => [
    { canvas: [{ type: 'rect', x: 0, y: 0, w: ASS.largura, h: ASS.altura, color: COR.creme2 }], absolutePosition: abs(topo) },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: ASS.largura, y2: 0, lineWidth: 0.8, lineColor: COR.verde }], absolutePosition: abs(topo + ASS.altura) }
  ];
  const nomes = (topo, t) => ({ stack: t.map((x, i) => ({ text: x, fontSize: i ? 7.8 : 8.4, bold: !i, color: i ? COR.texto : COR.verde, margin: [0, 0, 0, 2] })), absolutePosition: abs(topo + ASS.altura + 8) });
  const membroNome = membroLinha.replace(/^MEMBRO\s*:?\s*/i, '');
  return [
    { text: '', pageBreak: 'before' },
    { text: 'Assinaturas', font: F.titulo, fontSize: 22, color: COR.verde, absolutePosition: abs(ASS.titulo) },
    { text: local, fontSize: 8.6, color: COR.texto, absolutePosition: abs(ASS.local) },
    rotulo('PELA CONTRATADA', ASS.maktub - 14), ...area(ASS.maktub), nomes(ASS.maktub, maktub.length ? maktub : ['MAKTUB GO AGENCIA DE VIAGENS LTDA']),
    rotulo('PELO MEMBRO', ASS.membro - 14), ...area(ASS.membro), nomes(ASS.membro, [membroNome, dados.cpf ? 'CPF ' + dados.cpf : ''].filter(Boolean)),
    { text: 'Documento assinado eletronicamente, com validade jurídica nos termos da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020. As assinaturas e as rubricas são inseridas pela plataforma de assinatura, e a página de autenticação ao final integra este contrato.', fontSize: 7, color: COR.cinza, lineHeight: 1.4, absolutePosition: abs(ASS.membro + ASS.altura + 70) }
  ];
}
// ---------- versão cortesia ----------
// Cliente estratégico que não paga: a cláusula de investimento vira cortesia (com o valor de referência),
// a de cancelamento vira encerramento sem custo, e o Anexo I mostra "Cortesia". O resto do contrato não muda.
function versaoCortesia(blocos) {
  const txt = (b) => (b.r || []).map(([t]) => t).join('');
  const kItem = ((blocos || []).find(b => /^\d+\.\d+\.\s/.test(txt(b))) || {}).k || 'p';
  const item = (t) => ({ k: kItem, r: [[t, false]] });
  const out = []; let pular = false, nCanc = 13;
  for (const b of blocos || []) {
    const t = txt(b);
    if (['h1', 'h2', 'tabela', 'quadro', 'capa', 'assinaturas'].includes(b.k)) pular = false;
    if (b.k === 'h2' && /^Cláusula \d+\. Arrependimento/.test(t)) nCanc = +t.match(/^Cláusula (\d+)/)[1];
  }
  for (const b of blocos || []) {
    const t = txt(b);
    if (['h1', 'h2', 'tabela', 'quadro', 'capa', 'assinaturas'].includes(b.k)) pular = false;
    if (b.k === 'h2' && /^Cláusula \d+\. Investimento/.test(t)) {
      const n = t.match(/^Cláusula (\d+)/)[1];
      out.push({ ...b, r: [[`Cláusula ${n}. Cortesia`]] },
        item(`${n}.1. Os serviços deste contrato são prestados ao MEMBRO como cortesia da CONTRATADA, por mera liberalidade, sem investimento por parte do MEMBRO.`),
        item(`${n}.2. Para referência, o plano corresponde ao investimento de R$ {{valor_total}} ({{valor_total_extenso}}) por 12 (doze) meses. O valor é apenas informativo e não gera cobrança.`),
        item(`${n}.3. Não estão incluídos na cortesia, e serão pagos pelo MEMBRO à parte: passagens e reservas adquiridas, taxas de embarque, taxas cobradas pelas companhias e pelos programas de fidelidade nas emissões, e os serviços adicionais previstos na Cláusula 8.`),
        item(`${n}.4. A cortesia é pessoal e intransferível. A renovação ao fim da vigência, se houver, segue as condições da proposta de renovação.`));
      pular = true; continue;
    }
    if (b.k === 'h2' && /^Cláusula \d+\. Arrependimento/.test(t)) {
      const n = nCanc;
      out.push({ ...b, r: [[`Cláusula ${n}. Encerramento`]] },
        item(`${n}.1. O MEMBRO pode encerrar este contrato a qualquer momento, por escrito, pelos canais oficiais da CONTRATADA, sem multa e sem valores a pagar ou a receber.`),
        item(`${n}.2. A CONTRATADA pode encerrar a cortesia mediante aviso por escrito com 30 (trinta) dias de antecedência, ou de imediato em caso de fornecimento de informações falsas pelo MEMBRO ou de conduta contrária aos regulamentos dos programas de fidelidade.`),
        item(`${n}.3. O encerramento não afeta as emissões e reservas já realizadas, que seguem com o pós-venda previsto na Cláusula 7.4.`));
      pular = true; continue;
    }
    if (pular) continue;
    if (b.k === 'tabela') {
      const mapa = { 'Investimento total': 'Cortesia, sem investimento (valor de referência: R$ {{valor_total}} por 12 meses)', 'Implantação': 'Incluída na cortesia, concluída em até 30 dias, em 5 etapas', 'Acompanhamento': 'Incluído na cortesia, por 12 meses', 'Forma de pagamento': 'Não se aplica', 'Parcelas no cartão': 'Não se aplica', 'Nota fiscal': 'Não se aplica', 'Cancelamento': `A qualquer momento, sem custo. Ver Cláusula ${nCanc}` };
      out.push({ ...b, linhas: (b.linhas || []).map(l => mapa[l[0]] ? [l[0], mapa[l[0]]] : l) });
      continue;
    }
    if (b.r && b.r.length) {
      if (/^\d+\.\d+\.\s*O congelamento não conta como mês|^\d+\.\d+\.\s*O período de congelamento não conta/.test(t)) continue;
      let novo = t
        .replace('O investimento previsto na Cláusula 4 remunera duas entregas distintas:', 'Os serviços deste contrato compreendem duas entregas distintas:')
        .replace(/^(3\.2\.)\s.*$/, '$1 A cortesia é concedida pelo prazo de 12 (doze) meses.')
        .replace(/cancelar este contrato na forma da Cláusula \d+\.2, sem a multa rescisória/, `encerrar este contrato na forma da Cláusula ${nCanc}.1`)
        .replace(/^(\d+\.\d+\.)\s*O congelamento não altera a Implantação.*$/, '$1 O congelamento não altera a Implantação e não gera nenhuma cobrança.');
      if (novo !== t) { out.push({ ...b, r: [[novo, false]] }); continue; }
    }
    out.push(b);
  }
  return out;
}

export async function gerarPdf(modelo, dados) {
  if (dados && dados.cortesia) modelo = { ...modelo, blocos: versaoCortesia(modelo.blocos) };
  const pm = await pdfMake(), F = await fontesMarca(pm);
  const [logo, simbolo] = await Promise.all([imagem('/ativos/logo-verde-transparente.png'), imagem('/ativos/simbolo-verde.png')]);
  const content = [];
  let assin = null, capturando = false;
  const textoDe = (b) => (b.r || []).map(([t]) => trocar(t, dados)).join('');
  (modelo.blocos || []).forEach((b, i, todos) => {
    if (capturando) { if (['h1', 'h2', 'tabela', 'quadro', 'capa', 'assinaturas'].includes(b.k)) capturando = false; else { assin.push(textoDe(b)); return; } }
    if (b.k === 'h2' && textoDe(b).trim() === 'Assinaturas') { assin = []; capturando = true; return; }
    if (b.k === 'assinaturas') { assin = [trocar(b.local, dados), ...(b.partes || []).flatMap(([nome, papel], j) => j === (b.partes.length - 1) ? ['MEMBRO: ' + trocar(nome, dados)] : [trocar(nome, dados), trocar(papel, dados)])]; return; }
    // a rubrica do membro agora fica no rodapé de todas as páginas
    if (!['h1', 'h2'].includes(b.k) && /^Rubrica do MEMBRO/i.test(textoDe(b).trim())) return;
    if (b.k === 'capa') {
      if (logo) content.push({ image: logo, width: 118, alignment: 'center', margin: [0, 0, 0, 14] });
      content.push({ canvas: [{ type: 'line', x1: 207, y1: 0, x2: 288, y2: 0, lineWidth: 0.8, lineColor: COR.dourado }], margin: [0, 0, 0, 12] });
      content.push({ text: trocar(b.titulo, dados), font: F.titulo, fontSize: 25, color: COR.verde, alignment: 'center' });
      content.push({ text: trocar(b.subtitulo, dados).toUpperCase(), fontSize: 6.8, characterSpacing: 1.6, color: COR.dourado, alignment: 'center', margin: [0, 6, 0, 22] });
      return;
    }
    if (b.k === 'quadro') {
      const body = [[{ text: String(b.titulo || 'Quadro-resumo').toUpperCase(), colSpan: 2, fontSize: 7.2, bold: true, characterSpacing: 1.8, color: COR.creme, fillColor: COR.verde, margin: [8, 6, 8, 6] }, {}]];
      b.linhas.forEach(([rot, val]) => body.push([
        { text: String(rot).toUpperCase(), fontSize: 6.6, bold: true, characterSpacing: 0.8, color: COR.verde, margin: [8, 5, 4, 5] },
        { text: trocar(val, dados), fontSize: 8.4, color: COR.texto, margin: [4, 4.5, 8, 4.5] }]));
      content.push({ table: { widths: [112, '*'], body, dontBreakRows: true }, layout: { fillColor: (r) => r === 0 ? COR.verde : r % 2 ? COR.creme2 : '#FFFFFF', hLineWidth: (r, n) => r === 0 || r === 1 || r === n.table.body.length ? 0 : 0.4, vLineWidth: () => 0, hLineColor: () => '#E2D8BE', paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }, margin: [0, 0, 0, 16] });
      return;
    }
    if (b.k === 'tabela') {
      const nc = (b.linhas[0] || []).length;
      content.push({ table: { widths: nc === 2 ? ['38%', '62%'] : Array(nc).fill('*'), headerRows: 1, body: b.linhas.map((l, r) => l.map(c => ({ text: trocar(c, dados), bold: r === 0, fontSize: 8.4, color: r === 0 ? COR.verde : COR.texto, margin: [2, 2, 2, 2] }))) },
        layout: { hLineColor: () => '#E2D8BE', vLineColor: () => '#E2D8BE', fillColor: (r) => r === 0 ? COR.creme : null }, margin: [0, 4, 0, 12] });
      if (b.linhas.length <= 4 && content.length > 1 && todos[i - 1] && todos[i - 1].k !== 'tabela') { const t = content.pop(), h = content.pop(); content.push({ stack: [h, t], unbreakable: true }); }
      return;
    }
    if (b.k === 'destaque') {
      content.push({ unbreakable: true, margin: [0, 4, 0, 10], stack: [
        { table: { widths: ['*'], body: [[{ text: (b.r || []).map(([t, neg]) => ({ text: trocar(t, dados), bold: !!neg })), fontSize: 8.4, color: COR.verde, margin: [10, 8, 10, 8] }]] }, layout: { fillColor: () => COR.creme2, hLineWidth: () => 0, vLineWidth: (c) => c === 0 ? 2.2 : 0, vLineColor: () => COR.dourado } },
        ] });
      return;
    }
    if (b.k === 'assinaturas') {
      const col = ([nome, papel]) => ({ width: '*', stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 215, y2: 0, lineWidth: 0.6, lineColor: COR.verde }] }, { text: trocar(nome, dados), fontSize: 8, bold: true, color: COR.verde, margin: [0, 5, 0, 0] }, { text: trocar(papel, dados), fontSize: 7.4, color: COR.cinza }] });
      content.push({ unbreakable: true, margin: [0, 18, 0, 0], stack: [
        { text: trocar(b.local, dados), fontSize: 8.4, margin: [0, 0, 0, 34] },
        { columns: (b.partes || []).map(col), columnGap: 30 },
        { text: 'Documento assinado eletronicamente. A página de autenticação da plataforma de assinatura integra este contrato.', fontSize: 6.8, color: COR.cinza, margin: [0, 16, 0, 0] }] });
      return;
    }
    if (b.k === 'h1') { content.push({ text: (b.r || []).map(([t]) => trocar(t, dados)).join(''), font: F.titulo, fontSize: 22, color: COR.verde, alignment: 'center', margin: [0, 0, 0, 14] }); return; }
    if (b.k === 'h2') { content.push({ text: (b.r || []).map(([t]) => trocar(t, dados)).join(''), font: F.titulo, fontSize: 13.5, color: COR.verde, margin: [0, 10, 0, 3], headlineLevel: 1 }); return; }
    if (b.k === 'item') { content.push({ text: comNumero(b.r || [], dados), style: 'p', margin: [12, 0, 0, 4] }); return; }
    content.push({ text: comNumero(b.r || [], dados), style: 'p' });
  });
  // título de cláusula nunca fica sozinho no fim da página: vai junto com o primeiro parágrafo
  for (let i = content.length - 2; i >= 0; i--) if (content[i].headlineLevel === 1) { const h = content[i], n = content[i + 1]; delete h.headlineLevel; content.splice(i, 2, { stack: [h, n], unbreakable: true }); }
  content.push(...paginaAssinaturas(assin || [], dados, F));
  let paginas = 0;
  const doc = {
    pageSize: 'A4', pageMargins: [52, 62, 52, 54], content,
    info: { title: `Contrato Gestão de Milhas - ${dados.nome_completo || ''}`, author: 'Maktub Go', subject: modelo.versao || '' },
    defaultStyle: { font: F.texto, fontSize: 8.5, lineHeight: 1.32, color: COR.texto },
    styles: { p: { margin: [0, 0, 0, 4.5] } },
    // título de cláusula nunca fica sozinho no fim da página
    pageBreakBefore: (no, seguintesNaPagina) => no.headlineLevel === 1 && seguintesNaPagina.length === 0,
    header: (atual) => atual === 1 ? null : { margin: [52, 26, 52, 0], stack: [
      { columns: [simbolo ? { image: simbolo, width: 12 } : { text: '' }, { text: 'CONTRATO DE GESTÃO DE MILHAS', fontSize: 6.2, characterSpacing: 1.4, color: COR.dourado, alignment: 'right', margin: [0, 3, 0, 0] }] },
      { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 491, y2: 6, lineWidth: 0.5, lineColor: COR.creme }] }] },
    footer: (atual, total) => {
      paginas = total;
      // rubrica do membro em todas as páginas, menos na de assinaturas (posição fixa, usada no envio ao Autentique)
      const rub = atual < total;
      return { margin: [52, 18, 52, 0], columnGap: 8, columns: [
        { text: 'Maktub Go · Alfaiataria de Viagens', fontSize: 6.6, color: COR.cinza, margin: [0, 8, 0, 0] },
        { width: 84, text: rub ? 'RUBRICA DO MEMBRO' : '', fontSize: 5.2, bold: true, characterSpacing: 0.8, color: COR.cinza, alignment: 'right', margin: [0, 9, 0, 0] },
        { width: RUB.w, canvas: rub ? [{ type: 'rect', x: 0, y: 0, w: RUB.w, h: RUB.h, lineWidth: 0.5, lineColor: '#D9CFB4' }] : [] },
        { width: 30, text: `${atual} / ${total}`, alignment: 'right', fontSize: 6.6, color: COR.cinza, margin: [0, 8, 0, 0] }] };
    }
  };
  const blob = await new Promise((ok, erro) => { try { pm.createPdf(doc).getBlob(ok); } catch (e) { erro(e); } });
  // guarda onde cada um assina, para o envio ao Autentique
  blob.layout = layoutAssinaturas(paginas);
  return blob;
}

// ---------- dados do contrato ----------
// Junta tudo o que o contrato pede: ficha (pessoa), documentos, dados do contrato e condições.
export function montarDados({ p, doc, ext, cond }) {
  const total = Number(cond.valor_total) || 0;
  const impl = Math.round(total * 0.25 * 100) / 100, acomp = Math.round((total - impl) * 100) / 100, mensal = Math.round(acomp / 12 * 100) / 100;
  const cartao = cond.forma === 'cartao' && !cond.cortesia;
  return {
    cortesia: !!cond.cortesia,
    nome_completo: (p.nome || '').trim(), nacionalidade: ext.nacionalidade || (doc && doc.nacionalidade) || '', estado_civil: ext.estado_civil || '', profissao: ext.profissao || '',
    cpf: doc && doc.cpf ? fmtCpf(doc.cpf) : '', rg: ext.rg || '', rg_orgao_uf: ext.rg_orgao_uf || '', endereco_completo: ext.endereco_completo || '', cep: ext.cep ? fmtCep(ext.cep) : '',
    email: p.email || '', telefone: p.celular || '', data_nascimento: p.nascimento ? new Date(p.nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '',
    valor_total: total ? dinheiro(total) : '', valor_total_extenso: total ? extenso(total) : '',
    valor_implantacao: total ? dinheiro(impl) : '', valor_implantacao_extenso: total ? extenso(impl) : '',
    valor_acompanhamento: total ? dinheiro(acomp) : '', valor_acompanhamento_extenso: total ? extenso(acomp) : '',
    valor_mensal: total ? dinheiro(mensal) : '', valor_mensal_extenso: total ? extenso(mensal) : '',
    forma_pagamento: cond.cortesia ? 'Cortesia, sem investimento' : cartao ? 'Parcelado no cartão de crédito' : 'À vista, via Pix', parcelas: cartao ? `${cond.parcelas}x de R$ ${dinheiro(total / (Number(cond.parcelas) || 1))}` : 'Não se aplica',
    programas_fidelidade: cond.programas || '', uso_imagem: cond.uso_imagem || '', cidade_assinatura: cond.cidade || '', data_assinatura: cond.data ? dataExtensa(cond.data) : ''
  };
}
const ROTULO = { nome_completo: 'Nome completo', nacionalidade: 'Nacionalidade', estado_civil: 'Estado civil', profissao: 'Profissão', cpf: 'CPF', rg: 'RG', rg_orgao_uf: 'Órgão emissor e UF do RG', endereco_completo: 'Endereço completo', cep: 'CEP', email: 'E-mail', telefone: 'Celular', data_nascimento: 'Data de nascimento', valor_total: 'Valor total', forma_pagamento: 'Forma de pagamento', parcelas: 'Parcelas', programas_fidelidade: 'Programas e nº de fidelidade', cidade_assinatura: 'Cidade da assinatura', data_assinatura: 'Data da assinatura' };
export function faltando(campos, dados) { return campos.filter(k => !String(dados[k] ?? '').trim()).map(k => ROTULO[k] || k).filter((v, i, a) => a.indexOf(v) === i); }

// ---------- tela: bloco "Contrato para assinatura" na ficha da Gestão ----------
let FORM = null;
export async function bloco(el, c, X) {
  if (!el) return;
  const { sb, esc } = X;
  const pf = (X.D.pessoas || []).find(x => x.cliente_id === c.id);
  const [ct, mod, dx, dd] = await Promise.all([
    sb.from('contratos').select('*').eq('cliente_id', c.id).order('criado_em', { ascending: false }),
    sb.from('contrato_modelos').select('id,versao,blocos').eq('tipo', 'gestao').eq('ativo', true).order('criado_em', { ascending: false }).limit(1).maybeSingle(),
    pf ? sb.from('contrato_dados_pessoa').select('*').eq('pessoa_id', pf.id).maybeSingle() : Promise.resolve({}),
    pf ? sb.from('pessoas_documentos').select('cpf').eq('pessoa_id', pf.id).maybeSingle() : Promise.resolve({})
  ]);
  if (!el.isConnected) return;
  if (ct.error || mod.error) { el.innerHTML = `<div class="vazio">${X.ADMIN ? 'Rode o 50-contratos.sql no Supabase para ativar os contratos.' : 'Contratos ainda não ativados.'}</div>`; return; }
  if (!mod.data) { el.innerHTML = '<div class="vazio">Nenhum modelo de contrato ativo.</div>'; return; }
  const L = ct.data || [];
  // conferência silenciosa ao abrir a ficha: se algum contrato enviado já foi assinado no Autentique, atualiza sozinho
  // (o webhook já faz isso; aqui é a garantia caso o aviso tenha se perdido)
  if (!bloco._conferido) bloco._conferido = new Set();
  const pend = L.filter(k => k.status === 'enviado' && !bloco._conferido.has(k.id));
  if (pend.length) {
    pend.forEach(k => bloco._conferido.add(k.id));
    Promise.all(pend.map(k => sb.functions.invoke('contrato-autentique', { body: { acao: 'status', contrato_id: k.id } }).then(r => r.data && r.data.status).catch(() => null)))
      .then(st => { if (st.some(x => x === 'assinado' || x === 'recusado') && el.isConnected) { if (st.includes('assinado')) X.aviso('Contrato assinado. O PDF já está na ficha e no painel do cliente.'); bloco(el, c, X); } });
  }
  const mes = new Date().toISOString().slice(0, 7);
  // dados do contrato que o cliente preencheu pelo link (ou a equipe na ficha): mostra se já chegaram e o que falta
  const ext = dx.data || null, cpf = dd.data && dd.data.cpf;
  const faltaDados = [[cpf, 'CPF'], ...['rg', 'rg_orgao_uf', 'nacionalidade', 'estado_civil', 'profissao', 'endereco_completo', 'cep'].map(k => [ext && ext[k], ROTULO[k]])].filter(([v]) => !String(v || '').trim()).map(([, r]) => r);
  const quando = ext && ext.atualizado_em ? new Date(ext.atualizado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' às') : '';
  const temAtivo = L.some(k => ['enviado', 'assinado'].includes(k.status));
  // um contrato por ciclo: com um contrato gerado, enviado ou assinado, não sai outro (cada envio gasta um dos envios grátis do Autentique).
  // Depois de assinado, o próximo só libera na renovação, a partir de 30 dias antes do vencimento da Gestão.
  const ult = L.find(k => !['cancelado', 'recusado'].includes(k.status));
  const diasVenc = c.gestao_vencimento ? Math.ceil((new Date(c.gestao_vencimento + 'T12:00:00') - Date.now()) / 864e5) : null;
  // também libera se a Gestão já foi renovada antes do contrato novo (o assinado é de um ciclo anterior)
  const cicloAnterior = !!ult && !!ult.assinado_em && !!c.gestao_inicio && new Date(ult.assinado_em) < new Date(new Date(c.gestao_inicio + 'T12:00:00').getTime() - 30 * 864e5);
  const renovacao = !!ult && ult.status === 'assinado' && ((diasVenc !== null && diasVenc <= 30) || cicloAnterior);
  const podeNovo = !ult || renovacao;
  if (!podeNovo) FORM = null;
  const travaHtml = podeNovo ? '' : ult.status === 'assinado'
    ? `<div class="sub" style="margin-top:10px">${c.gestao_vencimento ? `Novo contrato só na renovação: libera em ${new Date(new Date(c.gestao_vencimento + 'T12:00:00').getTime() - 30 * 864e5).toLocaleDateString('pt-BR')}, 30 dias antes do vencimento.` : 'Novo contrato só na renovação, 30 dias antes do vencimento. Defina a data de entrada no Contrato da Gestão para contar.'}</div>`
    : `<div class="sub" style="margin-top:10px">Este contrato ainda está em andamento. Para gerar outro no lugar, ${X.ADMIN ? 'cancele este primeiro' : 'um administrador precisa cancelar este primeiro'}.</div>`;
  const dadosHtml = !pf || temAtivo || dx.error ? '' : !ext && !cpf ? '<div class="sub" style="margin-top:10px">O cliente ainda não preencheu os dados do contrato.</div>'
    : !faltaDados.length ? `<div class="sub" style="margin-top:10px;color:var(--verde)"><b style="font-weight:600">Dados do contrato recebidos${quando ? ' em ' + quando : ''}.</b> Toque em Gerar contrato: eles já vêm preenchidos.</div>`
    : `<div class="sub" style="margin-top:10px;color:var(--alerta)">Dados do contrato incompletos${quando ? ' (atualizados em ' + quando + ')' : ''}. Falta: ${esc(faltaDados.join(', '))}.</div>`;
  el.innerHTML = `
    ${L.length ? L.map(k => { const [rot, cls] = STATUS[k.status] || [k.status, '']; return `<div class="lanc" style="align-items:flex-start"><div style="flex:1"><b>Contrato de ${new Date(k.criado_em).toLocaleDateString('pt-BR')}</b>
      <small style="display:block">${k.dados && k.dados.cortesia ? 'Cortesia · ' : k.valor_total ? 'R$ ' + dinheiro(k.valor_total) + ' · ' : ''}${k.assinado_em ? 'assinado em ' + new Date(k.assinado_em).toLocaleDateString('pt-BR') : k.enviado_em ? 'enviado em ' + new Date(k.enviado_em).toLocaleDateString('pt-BR') : 'ainda não enviado'}</small>
      <span class="tag ${cls}" style="margin-top:6px;display:inline-block">${rot}</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        ${k.status === 'gerado' ? `<button class="mini" data-k-enviar="${k.id}">Enviar para assinatura</button>` : ''}
        ${k.status === 'enviado' && k.link_assinatura ? `<button class="mini" data-k-zap="${k.id}">Mandar link no WhatsApp</button><button class="mini" data-k-copiar="${k.id}">Copiar link</button>` : ''}
        ${k.status === 'enviado' ? `<button class="mini" data-k-status="${k.id}">Atualizar status</button>` : ''}
        <button class="mini" data-k-ver="${k.id}" data-arq="${esc(k.arquivo_assinado || k.arquivo_original || '')}">${k.arquivo_assinado ? 'Ver assinado' : 'Ver PDF'}</button>
        ${['gerado', 'enviado'].includes(k.status) && X.ADMIN ? `<button class="mini" data-k-cancelar="${k.id}">Cancelar</button>` : ''}
      </div></div></div>`; }).join('') : '<div class="vazio" style="margin-top:0">Nenhum contrato gerado ainda.</div>'}
    ${dadosHtml}
    ${travaHtml}
    ${pf && podeNovo ? `<button class="sec" id="ctrPedir" style="width:100%;margin-top:10px">${ext && !faltaDados.length ? 'Pedir os dados de novo por e-mail' : 'Pedir os dados do contrato ao cliente por e-mail'}</button><div id="ctrPedirRes"></div>` : ''}
    ${podeNovo ? `<button class="zap" id="ctrNovo" style="width:100%;margin-top:10px">${renovacao ? 'Gerar contrato da renovação' : 'Gerar contrato'}</button>` : ''}
    <div id="ctrForm"></div>`;
  const acha = (id) => L.find(k => String(k.id) === String(id));
  el.querySelectorAll('[data-k-ver]').forEach(b => b.onclick = async () => {
    if (!b.dataset.arq) { X.aviso('Arquivo não encontrado.'); return; }
    const w = window.open('', '_blank');
    const { data, error } = await sb.storage.from('contratos').createSignedUrl(b.dataset.arq, 300);
    if (error) { w && w.close(); X.aviso('Não abriu: ' + error.message); } else if (w) w.location = data.signedUrl;
  });
  el.querySelectorAll('[data-k-copiar]').forEach(b => b.onclick = async () => { const k = acha(b.dataset.kCopiar); try { await navigator.clipboard.writeText(k.link_assinatura); X.aviso('Link copiado. Ele é exclusivo do cliente.'); } catch (_) { prompt('Copie o link:', k.link_assinatura); } });
  el.querySelectorAll('[data-k-zap]').forEach(b => b.onclick = () => {
    const k = acha(b.dataset.kZap), nome = String((pf && pf.nome) || c.nome_completo || '').split(' ')[0];
    const url = X.zapLink(pf && pf.celular, nome, `Oi, ${nome}! Aqui é da Maktub Go. Segue o link para assinar o contrato da sua Gestão de Milhas: ${k.link_assinatura}\n\nA assinatura é digital e leva menos de 2 minutos. Qualquer dúvida, estou por aqui.`);
    if (!url) { X.aviso('A ficha não tem celular. Copie o link e envie.'); return; }
    window.open(url, '_blank', 'noopener');
  });
  el.querySelectorAll('[data-k-enviar]').forEach(b => b.onclick = () => enviar(acha(b.dataset.kEnviar), c, X, el, b));
  el.querySelectorAll('[data-k-status]').forEach(b => b.onclick = async () => {
    b.disabled = true; b.textContent = 'Consultando...';
    const { data, error } = await sb.functions.invoke('contrato-autentique', { body: { acao: 'status', contrato_id: b.dataset.kStatus } });
    if (error || !data || data.erro) { b.disabled = false; b.textContent = 'Atualizar status'; X.aviso('Não consultou: ' + ((data && data.erro) || (error && error.message) || 'erro')); return; }
    X.aviso(data.status === 'assinado' ? 'Contrato assinado. O PDF já está na ficha e no painel do cliente.' : data.status === 'recusado' ? 'O cliente recusou a assinatura.'
      : data.aviso ? data.aviso : (data.faltam && data.faltam.length ? 'Ainda falta assinar: ' + data.faltam.join(', ') + '.' : 'Ainda aguardando a assinatura.'));
    bloco(el, c, X);
  });
  el.querySelectorAll('[data-k-cancelar]').forEach(b => b.onclick = async () => {
    if (b.dataset.conf !== '1') { b.dataset.conf = '1'; b.textContent = 'Toque de novo para cancelar'; return; }
    const { error } = await sb.from('contratos').update({ status: 'cancelado' }).eq('id', b.dataset.kCancelar);
    if (error) X.aviso('Não cancelou: ' + error.message); else { X.aviso('Contrato cancelado no app. Se já foi enviado, cancele também no Autentique.'); bloco(el, c, X); }
  });
  const enviadosMes = L.filter(k => k.enviado_em && String(k.enviado_em).slice(0, 7) === mes).length;
  // manda ao cliente o link que pede só os dados do contrato; ao preencher, tudo cai na ficha e vocês recebem o aviso
  if (X.$('ctrPedir')) X.$('ctrPedir').onclick = async () => {
    const b = X.$('ctrPedir'), res = X.$('ctrPedirRes'); b.disabled = true; b.textContent = 'Enviando...';
    const { data, error } = await sb.functions.invoke('email-enviar', { body: { acao: 'cadastro_gestao', pessoa_id: pf.id } });
    b.disabled = false; b.textContent = 'Pedir os dados do contrato ao cliente por e-mail';
    if (data && data.ok) { X.aviso(`E-mail enviado para ${data.email}. Quando ele preencher, vocês recebem o aviso.`); res.innerHTML = `<div class="sub" style="margin-top:6px">Enviado para ${esc(data.email)} em ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.</div>`; return; }
    const msg = (data && data.erro) || (error && error.message) || 'erro';
    if (!data || !data.link) { X.aviso(/not found|404|Failed to send/i.test(msg) ? 'A função email-enviar ainda não está ativa no Supabase.' : 'Não enviou: ' + msg); return; }
    const nome = String(pf.nome || '').split(' ')[0], texto = `Oi, ${nome}! Para deixarmos o contrato da sua Gestão de Milhas pronto, preencha seus dados neste link seguro. Leva 2 minutos: ${data.link}`;
    const zap = X.zapLink(pf.celular, nome, texto);
    res.innerHTML = `<div class="config" style="margin-top:8px">${esc(msg)}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${zap ? `<a class="zap" href="${esc(zap)}" target="_blank" rel="noopener">Mandar no WhatsApp</a>` : ''}<button class="mini" id="ctrPedirCopiar">Copiar link</button></div></div>`;
    X.$('ctrPedirCopiar').onclick = async () => { try { await navigator.clipboard.writeText(texto); X.aviso('Mensagem com o link copiada.'); } catch (_) { prompt('Copie o link:', data.link); } };
  };
  if (X.$('ctrNovo')) X.$('ctrNovo').onclick = () => { FORM = { mes }; formulario(X.$('ctrForm'), c, pf, mod.data, X, el); };
  if (FORM) formulario(X.$('ctrForm'), c, pf, mod.data, X, el);
  void enviadosMes;
}

async function formulario(box, c, pf, modelo, X, el) {
  const { sb, esc, campo } = X;
  if (!pf) { box.innerHTML = '<div class="config" style="margin-top:10px">Este cliente da Gestão ainda não está ligado a uma ficha em Clientes. Ligue a ficha para puxar os dados.</div>'; return; }
  box.innerHTML = '<div class="vazio">Carregando dados...</div>';
  const [dc, ex, cnt] = await Promise.all([
    sb.from('pessoas_documentos').select('cpf,nacionalidade').eq('pessoa_id', pf.id).maybeSingle(),
    sb.from('contrato_dados_pessoa').select('*').eq('pessoa_id', pf.id).maybeSingle(),
    sb.rpc('contratos_enviados_mes')
  ]);
  const doc = dc.data || {}, ext = ex.data || {};
  const at = (X.D.reunioes || []).filter(r => r.pessoa_id === pf.id && r.produto === 'Gestão de Milhas' && Number(r.valor_estimado) > 0).sort((a, b) => (b.resultado === 'Fechou') - (a.resultado === 'Fechou') || String(b.data || '').localeCompare(String(a.data || '')))[0];
  const progs = X.programas ? X.programas(c.id) : [];
  const usados = cnt.error ? null : Number(cnt.data) || 0;
  const sel = (nome, rot, ops, v) => `<label class="fl"><span>${rot}</span><select name="${nome}"><option value="">Selecione</option>${ops.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  box.innerHTML = `<form class="bloco form" id="fCtr" style="margin-top:12px" autocomplete="off">
    <h2>Contrato da Gestão de Milhas</h2>
    <div class="sub" style="margin-top:0">Nome, e-mail, celular e nascimento vêm da ficha. O que faltar, preencha aqui: fica salvo na ficha para os próximos contratos.</div>
    <div class="lin"><span>Nome</span><span>${esc(pf.nome)}</span></div>
    <div class="lin"><span>E-mail</span><span>${pf.email ? esc(pf.email) : '<span style="color:var(--alerta)">falta na ficha</span>'}</span></div>
    <div class="lin"><span>Celular</span><span>${pf.celular ? esc(pf.celular) : '<span style="color:var(--alerta)">falta na ficha</span>'}</span></div>
    <div class="lin"><span>Nascimento</span><span>${pf.nascimento ? new Date(pf.nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '<span style="color:var(--alerta)">falta na ficha</span>'}</span></div>
    <div class="grupo">Documento e qualificação</div>
    ${campo('cpf', 'CPF', doc.cpf ? fmtCpf(doc.cpf) : '', 'text', 'inputmode="numeric" required')}
    <div class="duas-col">${campo('rg', 'RG', ext.rg, 'text', 'required')}${campo('rg_orgao_uf', 'Órgão emissor/UF', ext.rg_orgao_uf, 'text', 'required placeholder="Ex.: DETRAN/RJ"')}</div>
    <div class="duas-col">${campo('nacionalidade', 'Nacionalidade', ext.nacionalidade || doc.nacionalidade || 'brasileiro(a)', 'text', 'required')}${sel('estado_civil', 'Estado civil', ESTADOS_CIVIS, ext.estado_civil)}</div>
    ${campo('profissao', 'Profissão', ext.profissao, 'text', 'required')}
    ${campo('endereco_completo', 'Endereço completo (rua, número, complemento, bairro, cidade/UF)', ext.endereco_completo, 'text', 'required')}
    ${campo('cep', 'CEP', ext.cep ? fmtCep(ext.cep) : '', 'text', 'inputmode="numeric" required')}
    <div class="grupo">Condições</div>
    ${campo('valor_total', 'Investimento total (R$)', at ? at.valor_estimado : '', 'number', 'required')}
    <div class="sub" id="ctrConta" style="margin-top:0"></div>
    <label class="fc"><input type="checkbox" name="cortesia"><span>Cortesia: cliente estratégico, sem investimento. O valor acima entra só como referência.</span></label>
    <label class="fl"><span>Forma de pagamento</span><select name="forma"><option value="pix">À vista, via Pix</option><option value="cartao">Parcelado no cartão de crédito</option></select></label>
    <div id="ctrParc" hidden>${campo('parcelas', 'Número de parcelas', '', 'number', 'min="2" max="12"')}</div>
    <label class="fl"><span>Uso de imagem (Cláusula de uso de imagem)</span><select name="uso_imagem" required><option value="">Pergunte ao cliente</option><option value="sim">Autoriza</option><option value="nao">Não autoriza</option></select></label>
    <label class="fl"><span>Programas e nº de fidelidade (Anexo I)</span><textarea name="programas" rows="2" placeholder="Ex.: Smiles 123456, LATAM Pass 987654">${esc(progs.join(', '))}</textarea></label>
    <div class="duas-col">${campo('cidade', 'Cidade da assinatura', lembrar('cidade'), 'text', 'required')}${campo('data', 'Data da assinatura', hojeISO(), 'date', 'required')}</div>
    <label class="fc"><input type="checkbox" name="selfie"><span>Pedir foto do documento e selfie na assinatura (pode consumir créditos do Autentique)</span></label>
    ${usados !== null ? `<div class="sub" style="${usados >= AVISO_LIMITE ? 'color:var(--alerta)' : ''}">${usados} de ${LIMITE_GRATIS} contratos enviados este mês no plano gratuito do Autentique.${usados >= AVISO_LIMITE ? ' Está perto do limite.' : ''}</div>` : ''}
    <div class="sub" id="ctrFalta" style="color:var(--alerta)"></div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="sec" type="button" id="ctrBaixar" style="flex:1">Baixar para conferir</button>
      <button class="zap" type="submit" id="ctrSalvar" style="flex:2">Salvar e enviar para assinatura</button>
    </div>
    <button class="voltar" type="button" id="ctrFechar" style="margin-top:10px">Fechar</button>
  </form>`;
  const f = box.querySelector('#fCtr'), g = (n) => f.elements[n] ? f.elements[n].value.trim() : '';
  const conta = () => { const t = Number(String(g('valor_total')).replace(',', '.')) || 0; if (f.elements.cortesia.checked) { X.$('ctrConta').textContent = t ? `Cortesia: o contrato mostra R$ ${dinheiro(t)} como valor de referência, sem cobrança.` : ''; return; } X.$('ctrConta').textContent = t ? `Implantação R$ ${dinheiro(t * 0.25)} (25%) · acompanhamento R$ ${dinheiro(t * 0.75)}, ou R$ ${dinheiro(t * 0.75 / 12)} por mês` : ''; };
  f.elements.valor_total.oninput = conta; conta();
  f.elements.forma.onchange = () => { X.$('ctrParc').hidden = g('forma') !== 'cartao' || f.elements.cortesia.checked; };
  f.elements.cortesia.onchange = () => { const c = f.elements.cortesia.checked; f.elements.forma.closest('label').hidden = c; X.$('ctrParc').hidden = c || g('forma') !== 'cartao'; conta(); };
  f.elements.cpf.oninput = (e) => { const d = so(e.target.value).slice(0, 11); e.target.value = d.length === 11 ? fmtCpf(d) : d; };
  X.$('ctrFechar').onclick = () => { FORM = null; box.innerHTML = ''; };
  const coletar = () => {
    const extNovo = { pessoa_id: pf.id, rg: g('rg') || null, rg_orgao_uf: g('rg_orgao_uf') || null, nacionalidade: g('nacionalidade') || null, estado_civil: g('estado_civil') || null, profissao: g('profissao') || null, endereco_completo: g('endereco_completo') || null, cep: so(g('cep')) || null };
    const cond = { valor_total: Number(String(g('valor_total')).replace(',', '.')) || 0, forma: g('forma'), parcelas: Number(g('parcelas')) || 0, programas: g('programas'), cidade: g('cidade'), data: g('data'), uso_imagem: g('uso_imagem'), cortesia: f.elements.cortesia.checked };
    const dados = montarDados({ p: pf, doc: { cpf: g('cpf'), nacionalidade: g('nacionalidade') }, ext: extNovo, cond });
    const falta = faltando(camposDoModelo(modelo.blocos), dados);
    if (g('cpf') && !cpfOk(g('cpf'))) falta.unshift('CPF válido');
    if (cond.forma === 'cartao' && !cond.cortesia && !(cond.parcelas >= 2 && cond.parcelas <= 12)) falta.push('Número de parcelas (2 a 12)');
    if (!cond.uso_imagem) falta.push('Uso de imagem (autoriza ou não)');
    if (!pf.email && !pf.celular) falta.push('E-mail ou celular na ficha, para enviar o link');
    X.$('ctrFalta').textContent = falta.length ? 'Falta: ' + falta.join(', ') + '.' : '';
    return { extNovo, cond, dados, falta };
  };
  const salvarDados = async (extNovo) => {
    const r = await sb.from('contrato_dados_pessoa').upsert({ ...extNovo, atualizado_em: new Date().toISOString() });
    if (r.error) throw new Error('Não salvou os dados do contrato: ' + r.error.message);
    const cpf = so(g('cpf'));
    if (cpf && so(doc.cpf) !== cpf) { const r2 = await sb.from('pessoas_documentos').upsert({ pessoa_id: pf.id, cpf: fmtCpf(cpf) }); if (r2.error) throw new Error('Não salvou o CPF: ' + r2.error.message); }
    if (g('cidade')) lembrar('cidade', g('cidade'));
  };
  X.$('ctrBaixar').onclick = async () => {
    const { dados } = coletar();
    const b = X.$('ctrBaixar'); b.disabled = true; b.textContent = 'Gerando...';
    try { const blob = await gerarPdf(modelo, dados); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Contrato Gestao - ${dados.nome_completo || 'cliente'} (conferencia).pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 6e4); }
    catch (e) { X.aviso('Não gerou o PDF: ' + e.message); }
    b.disabled = false; b.textContent = 'Baixar para conferir';
  };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const { extNovo, cond, dados, falta } = coletar();
    if (falta.length) { X.$('ctrFalta').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const btn = X.$('ctrSalvar'); btn.disabled = true; btn.textContent = 'Gerando o contrato...';
    let criado = null;
    try {
      await salvarDados(extNovo);
      const blob = await gerarPdf(modelo, dados);
      const ins = await sb.from('contratos').insert({ cliente_id: c.id, pessoa_id: pf.id, modelo_id: modelo.id, modelo_versao: modelo.versao, dados: { ...dados, _assinaturas: blob.layout }, valor_total: cond.valor_total, forma_pagamento: cond.cortesia ? 'pix' : cond.forma, parcelas: cond.forma === 'cartao' && !cond.cortesia ? cond.parcelas : null, pedir_selfie: f.elements.selfie.checked, status: 'gerado' }).select().single();
      if (ins.error) throw new Error(ins.error.message);
      criado = ins.data;
      const path = `${c.id}/${criado.id}/contrato.pdf`;
      const up = await sb.storage.from('contratos').upload(path, blob, { contentType: 'application/pdf', upsert: false });
      if (up.error) throw new Error('Não guardou o PDF: ' + up.error.message);
      const u = await sb.from('contratos').update({ arquivo_original: path }).eq('id', criado.id).select().single();
      if (u.error) throw new Error(u.error.message);
      FORM = null;
      await enviar(u.data, c, X, el, btn);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Salvar e enviar para assinatura';
      X.aviso(e.message + (criado ? ' O contrato ficou salvo como "Gerado": dá para tentar enviar de novo pela lista.' : ''));
      if (criado) bloco(el, c, X);
    }
  };
}

async function enviar(k, c, X, el, btn) {
  if (!k) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando ao Autentique...'; }
  const { data, error } = await X.sb.functions.invoke('contrato-autentique', { body: { acao: 'enviar', contrato_id: k.id } });
  if (error || !data || data.erro) {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar para assinatura'; }
    const msg = (data && data.erro) || (error && error.message) || 'erro desconhecido';
    X.aviso(/not found|404|Failed to send/i.test(msg) ? 'A função contrato-autentique ainda não está ativa no Supabase. O contrato ficou salvo como "Gerado".' : 'Não enviou: ' + msg);
    bloco(el, c, X); return;
  }
  X.aviso('Contrato enviado. Agora mande o link pelo WhatsApp da Maktub.');
  bloco(el, c, X);
}
