// Maktub Go: montador de cotações.
// Dois modelos: "Maktub Go" (proposta de experiência, com opções, roteiro, voos, hotel, carro e investimento)
// e "Maktub Corporativo" (cotação objetiva de voos). Gera o HTML pronto, no visual aprovado, sem mostrar custo.

import { lerColado, completarVoo, carregarAero, cidadeDe } from '/admin/app/cot-colar.js?v=3';
let LISTA = null, ED = null, S = null, MARCA = null, PRE = null, PEDIR = null;
// toda cotação pertence a um card do funil (S.reuniao_id). Sem card, o app pede para escolher um antes de abrir.
// atendimento do funil de onde a cotação saiu: nome, destino e o id para mover o card
export function novaRapida() { PRE = null; S = null; ED = null; PEDIR = 'rapida'; }
export function preparar(pre) { PRE = pre || null; ED = null; S = null; PEDIR = null; }
// abre uma cotação já salva (vinda do card)
export function abrir(row) { PRE = null; PEDIR = null; S = JSON.parse(JSON.stringify(row.dados || {})); S._id = row.id; ED = String(row.id); }
const comPre = (d) => { if (!PRE) return d; d.reuniao_id = PRE.id; d.destino = d.destino || PRE.destino || ''; if (d.modelo === 'go') { d.para = PRE.cliente || ''; d.nomeZap = String(PRE.cliente || '').split(' ')[0]; } else if (d.modelo === 'corp') d.passageiro = PRE.cliente || ''; else d.cliente = PRE.cliente || '';
  (d.opcoes || []).forEach(o => { if (PRE.ida && !o.embarque) o.embarque = PRE.ida; if (PRE.volta && !o.retorno) o.retorno = PRE.volta; });
  const vs = d.voos || (d.opcoes && d.opcoes[0] && d.opcoes[0].voos) || [];
  if (vs[0] && PRE.ida && 'data' in vs[0] && !vs[0].data) vs[0].data = PRE.ida;
  if (vs[1] && PRE.volta && 'data' in vs[1] && !vs[1].data) vs[1].data = PRE.volta;
  return d; };
const ZAP = '5521976275225', ZAP_TXT = '(21) 97627-5225', EMAIL = 'contato@maktubgo.com.br';
const SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const h = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => { let t = String(v ?? '').replace(/[^\d.,-]/g, ''); if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); const n = parseFloat(t); return isNaN(n) ? 0 : n; };
const brl = (v) => 'R$ ' + (+v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (iso) => iso ? new Date(iso + 'T12:00:00') : null;
const ddmm = (iso) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
const dLonga = (iso) => { const d = dt(iso); return d ? `${SEMANA[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} de ${MES[d.getMonth()]}` : ''; };
const dCurta = (iso) => { const d = dt(iso); return d ? `${String(d.getDate()).padStart(2, '0')} de ${MES[d.getMonth()]}` : ''; };
const linhas = (t) => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const hoje = () => new Date().toLocaleDateString('sv-SE');
const noites = (a, b) => a && b ? Math.round((dt(b) - dt(a)) / 864e5) : 0;

const VOO = () => ({ rotulo: '', data: '', origem: '', saida: '', destino: '', chegada: '', mais1: false, tipo: 'Voo direto', periodo: '' });
const HOTEL = () => ({ fornecedor_id: '', nome: '', cidade: '', estrelas: '', entrada: '', saida: '', descricao: '', itens: '', fotos: '', nota: 'Taxas locais cobradas pelo hotel, quando existirem, são pagas diretamente na recepção.' });
const OPCAO = (n) => ({ nome: '', resumo: '', embarque: '', retorno: '', hotelaria: '', dias: [], voos: [{ ...VOO(), rotulo: 'Ida' }, { ...VOO(), rotulo: 'Volta' }], bagagem: '', hoteis: [], carro: { intro: '', opcoes: [] },
  sites: '', cartao: '', parcelas: '10', pix: '5', incluso: 'Check-in dos voos feito por nós\nTime com vocês do embarque ao retorno', cta: n ? `Quero seguir com a Opção ${n}` : 'Quero seguir com essa viagem' });
const NOVO_GO = () => ({ modelo: 'go', kicker: 'Proposta de experiência', titulo: '', sub: '', linha: '', para: '', pessoas: '2', nomeZap: '', carta: '', consulta: hoje(), destino: '',
  opcoes: [OPCAO(0)], avisos: 'Tarifas com cobrança de multa para alterações e cancelamentos.\nAlterações podem ser feitas pela companhia aérea.\nValores podem ser alterados, pois as tarifas são flutuantes.', porque: '' });
const NOVO_CORP = () => ({ modelo: 'corp', marca: 'Maktub Corporativo', codigo: '', passageiro: '', pessoas: '1', validade: hoje(), cia: '', destino: '',
  voos: [{ rotulo: 'Ida', data: '', ocod: '', onome: '', saida: '', dcod: '', dnome: '', chegada: '', tipo: 'Direto', duracao: '' }, { rotulo: 'Volta', data: '', ocod: '', onome: '', saida: '', dcod: '', dnome: '', chegada: '', tipo: 'Direto', duracao: '' }],
  bagagem: '1 item pessoal + 1 mala de cabine de até 10 kg por passageiro', print: '', de: '', por: '', forma: 'À vista via Pix',
  rodape: 'Sem bagagem despachada. Taxas inclusas. Alterações e cancelamentos têm custo e devem ser solicitados à Maktub. Tarifa válida apenas na data de emissão e sujeita à confirmação no momento da compra. Horários locais. Check-in realizado por nossa equipe. Suporte humanizado e pós-venda. Você fala sempre com uma pessoa.' });

const padraoRap = () => { try { return JSON.parse(localStorage.getItem('cotRapPadrao') || '{}'); } catch (e) { return {}; } };
const NOVO_RAP = () => { const p = padraoRap(); return { modelo: 'rapida', marca: p.marca || 'Maktub Go', cliente: '', pessoas: '1', prints: [], voos: [], cia: '', bagagem: '1 item pessoal + 1 mala de cabine de até 10 kg por passageiro', de: '', por: '', forma: p.forma || 'À vista via Pix', parcelas: '', obs: '' }; };
// seções recolhidas que a pessoa abriu continuam abertas quando o formulário redesenha
const ABERTOS = new Set();
const dobra = (id, titulo, corpo) => `<details data-d="${id}" ${ABERTOS.has(id) ? 'open' : ''} style="margin-top:8px;border-top:1px solid var(--linha);padding-top:6px"><summary class="sub" style="cursor:pointer;margin:0">${titulo}</summary>${corpo}</details>`;
const caixaColar = (ajuda, exemplo) => `<div class="config" style="margin:6px 0 4px"><b>Colar e preencher</b><br>${ajuda}<br><span style="font-family:monospace;font-size:12px">${exemplo}</span></div>
    <label class="fl"><textarea id="colaTxt" rows="4" placeholder="Cole aqui a tela da companhia"></textarea></label>
    <div class="botoes4" style="margin:2px 0 6px"><button type="button" class="zap" id="colaImg">Colar print</button><label class="sec" style="display:block;text-align:center;cursor:pointer;padding:10px">Escolher da galeria<input type="file" accept="image/*" multiple id="colaPrint" style="display:none"></label></div>`;
/* ler print: os prints vão para a função ler-print do Supabase (Claude), que devolve os voos.
   Os voos voltam no formato curto ("02/12/2026 GIG 12:20 SCL 17:00 direto") e entram pelo mesmo "Preencher" de sempre. */
function textoDosVoos(d) {
  const ls = [d.companhia || ''];
  (d.voos || []).forEach(v => { const dt = /^\d{4}-\d{2}-\d{2}$/.test(v.data || '') ? v.data.split('-').reverse().join('/') : '';
    const c = +v.conexoes || 0; ls.push([dt, v.origem, v.saida, v.destino, v.chegada, c ? `${c} ${c === 1 ? 'conexão' : 'conexões'}` : 'direto'].filter(Boolean).join(' ')); });
  if (d.valor_site_reais) ls.push('site ' + Number(d.valor_site_reais).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  return ls.filter(Boolean).join('\n');
}
async function lerImagens(P, X, fs) {
  fs = fs.slice(0, 4); if (!fs.length) return;
  X.aviso(fs.length > 1 ? `Lendo ${fs.length} prints...` : 'Lendo o print...');
  const imagens = (await Promise.all(fs.map(f => reduzir(f, 2400, 0.88)))).filter(Boolean);
  const { data, error } = await X.sb.functions.invoke('ler-print', { body: { imagens } });
  let msg = data && data.erro;
  if (!msg && error && error.context && error.context.json) { try { msg = (await error.context.json()).erro; } catch (e) { /* sem corpo */ } }
  if (!msg && error && error.context && error.context.status === 404) msg = 'A função ler-print ainda não está publicada no Supabase.';
  if (!data || !data.ok) { X.aviso(msg || 'Não consegui ler o print. Tente de novo ou cole o texto.'); return; }
  if (!(data.voos || []).length) { X.aviso('Não achei voos nesse print. Confira se aparecem os horários e os aeroportos.'); return; }
  const ta = P.querySelector('#colaTxt'); if (ta) ta.value = textoDosVoos(data);
  const b = P.querySelector('#rpColar, [data-colar="tudo"]'); if (b) b.click();
}
const imgsDoClipboard = (dt) => [...((dt && dt.items) || [])].filter(it => it.kind === 'file' && /^image\//.test(it.type)).map(it => it.getAsFile()).filter(Boolean);
let colarGlobal = null;
function ligarPrint(P, X) {
  const inp = P.querySelector('#colaPrint'); if (!inp) return;
  inp.onchange = () => { const fs = [...inp.files]; inp.value = ''; lerImagens(P, X, fs); };
  // botão "Colar print": lê a imagem copiada (print da tela) direto da área de transferência
  const bt = P.querySelector('#colaImg');
  if (bt) bt.onclick = async () => {
    if (!navigator.clipboard || !navigator.clipboard.read) { X.aviso('Toque e segure na caixa acima e escolha Colar.'); return; }
    try { const its = await navigator.clipboard.read(), fs = [];
      for (const it of its) { const t = it.types.find(x => /^image\//.test(x)); if (t) { const b = await it.getType(t); fs.push(new File([b], 'print.' + t.split('/')[1], { type: t })); } }
      if (fs.length) lerImagens(P, X, fs); else X.aviso('Não tem imagem copiada. Tire o print, toque nele e escolha Copiar.');
    } catch (e) { X.aviso('O celular não liberou a colagem. Toque e segure na caixa acima e escolha Colar.'); }
  };
  // colar na caixa de texto (ou Ctrl+V no computador) com uma imagem copiada também lê o print
  if (colarGlobal) document.removeEventListener('paste', colarGlobal);
  colarGlobal = (e) => { if (!document.body.contains(inp)) { document.removeEventListener('paste', colarGlobal); colarGlobal = null; return; }
    const fs = imgsDoClipboard(e.clipboardData); if (!fs.length) return; e.preventDefault(); lerImagens(P, X, fs); };
  document.addEventListener('paste', colarGlobal);
}
const TIPO_GO = { 'Direto': 'Voo direto', '1 conexão': 'Com 1 conexão', '2 conexões': 'Com 2 conexões' };

/* ================= telas ================= */
export function rota(hh) { ED = hh[1] || null; if (!ED) S = null; }
export async function tela(P, X) {
  if (!MARCA) { try { MARCA = (await import('/admin/app/cot-marca.js?v=1')).MARCA; } catch (e) { MARCA = { selo: '', ornato: '', assin: '', rodape: '' }; } }
  carregarAero();
  if (PEDIR) { const tipo = PEDIR; PEDIR = null; return comCard(P, X, () => { S = comPre(tipo === 'rapida' ? NOVO_RAP() : tipo === 'corp' ? NOVO_CORP() : NOVO_GO()); PRE = null; ir(X, 'novo'); }); }
  if (ED) return editor(P, X);
  return lista(P, X);
}

/* ================= card do funil ================= */
const cardDe = (X, id) => id ? (X.D.reunioes || []).find(r => r.id === id) : null;
const numC = (r) => r && r.numero ? '#' + String(r.numero).padStart(3, '0') + ' ' : '';
const preDe = (r) => ({ id: r.id, cliente: r.cliente, destino: r.trecho || '', ida: r.data_viagem || '', volta: r.data_volta || '' });
// garante um card antes de seguir: se a cotação já saiu de um card, segue direto
function comCard(P, X, depois) { if (PRE) return depois(); escolherCard(P, X, (r) => { PRE = preDe(r); depois(); }); }
// escolher o card (atendimento em aberto) ou criar um na hora, com o mínimo: nome e WhatsApp
function escolherCard(P, X, escolhido, voltar) {
  const { esc, D } = X;
  const abertos = (D.reunioes || []).filter(r => r.resultado === 'Em andamento' && r.produto !== 'Gestão de Milhas')
    .sort((a, b) => String(b.created_at || b.data).localeCompare(String(a.created_at || a.data)));
  P.innerHTML = `<button class="voltar" id="voltarCard">‹ ${voltar ? 'Cotação' : 'Cotações'}</button>
    <h1 class="titulo" style="margin-top:6px">Para qual <em>atendimento</em>?</h1>
    <div class="sub">Toda cotação fica ligada a um card do funil. Assim o card anda sozinho quando você envia e, no Fechou, a venda já vem preenchida.</div>
    <label class="fl" style="margin-top:10px"><input id="buscaCard" placeholder="Buscar pelo nome ou destino" autocomplete="off"></label>
    <div class="lista" id="lsCard"></div>
    <div class="grupo" style="margin-top:14px">Cliente novo (cria o card agora)</div>
    <form class="form" id="fCardNovo" autocomplete="off" onsubmit="return false">
      <label class="fl"><span>Nome do cliente ou empresa</span><input name="cliente" list="dlCliC"></label>
      <datalist id="dlCliC">${(D.pessoas || []).slice(0, 3000).map(p => `<option value="${esc(p.nome)}">`).join('')}</datalist>
      <div class="duas-col"><label class="fl"><span>WhatsApp ou e-mail</span><input name="contato"></label><label class="fl"><span>Trecho ou destino</span><input name="trecho" placeholder="Rio → Lisboa"></label></div>
      <button class="zap grande" id="criarCard" style="width:100%;margin-top:6px">Criar card e seguir para a cotação</button>
    </form>`;
  const desenha = (q) => {
    const t = String(q || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const L = abertos.filter(r => !t || `${r.cliente} ${r.trecho || ''} ${r.numero || ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(t)).slice(0, 40);
    X.$('lsCard').innerHTML = L.length ? L.map(r => `<button class="cli" data-card="${r.id}"><div><div class="nome">${esc(numC(r) + r.cliente)}</div><div class="meta">${esc([r.trecho, r.etapa].filter(Boolean).join(' · '))}</div></div></button>`).join('')
      : '<div class="vazio">Nenhum atendimento em aberto com esse nome. Crie o card abaixo.</div>';
    P.querySelectorAll('[data-card]').forEach(b => b.onclick = () => escolhido(abertos.find(r => r.id === b.dataset.card)));
  };
  desenha('');
  X.$('buscaCard').oninput = (e) => desenha(e.target.value);
  X.$('voltarCard').onclick = () => voltar ? voltar() : (S = null, ir(X, null));
  X.$('criarCard').onclick = async () => {
    const f = X.$('fCardNovo'), g = (n) => f.elements[n].value.trim();
    const nome = g('cliente').replace(/\s+/g, ' ');
    if (!nome) { X.aviso('Informe o nome do cliente.'); f.elements.cliente.focus(); return; }
    const b = X.$('criarCard'); b.disabled = true; b.textContent = 'Criando...';
    const ct = g('contato'), ehMail = /@/.test(ct), agora = new Date().toISOString();
    const chave = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    let p = (D.pessoas || []).find(x => chave(x.nome) === chave(nome));
    if (!p) { const pn = await X.sb.from('pessoas').insert({ nome, celular: !ehMail && ct ? ct : null, email: ehMail ? ct : null, papeis: [], interesse: ['viagens'] }).select().single(); if (!pn.error) { p = pn.data; (D.pessoas = D.pessoas || []).push(p); } }
    const row = { data: agora, tipo: 'Cotação', produto: 'Passagens', resultado: 'Em andamento', etapa: 'Em cotação', cliente: p ? p.nome : nome, contato: ct || (p && (p.celular || p.email)) || null, trecho: g('trecho') || null,
      responsavel_id: D.meuId, assumido_por: D.meuId, assumido_em: agora, cotacao_inicio: hoje(), proximo_passo: 'Montar e enviar a cotação', proximo_passo_data: hoje() };
    if (p) row.pessoa_id = p.id;
    const r = await X.sb.from('atendimentos').insert(row).select().single();
    b.disabled = false; b.textContent = 'Criar card e seguir para a cotação';
    if (r.error) { X.aviso('Não criou o card: ' + r.error.message); return; }
    D.reunioes.unshift(r.data); X.aviso(`Card ${numC(r.data)}criado para ${r.data.cliente}.`);
    escolhido(r.data);
  };
}
// liga a cotação aberta a um card (ou troca de card)
function ligarCard(P, X, r) {
  S.reuniao_id = r.id;
  if (S.modelo === 'go') { if (!S.para) { S.para = r.cliente; S.nomeZap = String(r.cliente || '').split(' ')[0]; } } else if (S.modelo === 'corp') { if (!S.passageiro) S.passageiro = r.cliente; } else if (!S.cliente) S.cliente = r.cliente;
  if (!S.destino && r.trecho) S.destino = r.trecho;
  editor(P, X);
  if (S._id) salvar(X, true);
  if (X.cotacaoEnviada) X.cotacaoEnviada(r.id, { iniciada: true });
  X.aviso(`Cotação ligada ao card ${numC(r)}${r.cliente}.`);
}
function faixaCard(X) {
  const r = cardDe(X, S.reuniao_id);
  if (r) return `<div class="config" style="margin-top:8px;display:flex;justify-content:space-between;gap:8px;align-items:center"><span>Card <b>${X.esc(numC(r) + r.cliente)}</b>${r.etapa ? ' · ' + X.esc(r.etapa) : ''}</span><button type="button" data-trocacard="1" style="background:none;border:0;color:var(--verde);text-decoration:underline;font:inherit;font-size:12px;cursor:pointer">trocar</button></div>`;
  return `<div class="config" style="margin-top:8px;border-color:var(--alerta)"><b style="color:var(--alerta)">Cotação sem card.</b> Ligue a um atendimento antes de enviar ao cliente.<button type="button" class="zap" data-trocacard="1" style="width:100%;margin-top:8px">Ligar a um card</button></div>`;
}
function ligarFaixa(P, X) {
  P.querySelectorAll('[data-trocacard]').forEach(b => b.onclick = () => escolherCard(P, X, (r) => ligarCard(P, X, r), () => editor(P, X)));
}
// antes de salvar, baixar, gerar link ou enviar: sem card, pede o card e depois segue com a ação
function comCardNaCotacao(P, X, acao) {
  if (S.reuniao_id && cardDe(X, S.reuniao_id)) return acao();
  escolherCard(P, X, (r) => { ligarCard(P, X, r); acao(); }, () => editor(P, X));
}

/* ================= da cotação para a venda (usado no Fechou do card) ================= */
// opções da cotação, cada uma com nome, valor e voos
export function opcoesCotacao(d) {
  if (!d) return [];
  if (d.modelo === 'go') return (d.opcoes || []).map((o, i) => ({ nome: o.nome || (d.opcoes.length > 1 ? 'Opção ' + (i + 1) : ''), valor: precos(o).cartao, o }));
  if (d.modelo === 'corp') return [{ nome: d.nome1 || ((d.extras || []).length ? 'Opção 1' : ''), valor: num(d.por), voos: d.voos || [] }].concat((d.extras || []).map((o, i) => ({ nome: o.nome || 'Opção ' + (i + 2), valor: num(o.por), voos: o.voos || [] })));
  return [{ nome: '', valor: num(d.por), voos: (d.voos || []).filter(v => v.ocod) }];
}
export const valorCotacao = (d) => { const o = opcoesCotacao(d)[0]; return o ? o.valor : 0; };
// serviços já preenchidos para o fechamento: voo (rota, datas, passageiros, companhia) e hotéis (nome e datas)
export function itensDaCotacao(d, k = 0) {
  const op = opcoesCotacao(d)[k] || opcoesCotacao(d)[0]; if (!op) return { itens: [], valor: 0 };
  const go = d.modelo === 'go', vs = go ? (op.o.voos || []).filter(v => v.origem || v.destino) : op.voos.filter(v => v.ocod || v.dcod);
  const ori = (v) => go ? v.origem : v.ocod, des = (v) => go ? v.destino : v.dcod;
  const itens = [];
  if (vs.length) {
    const iv = vs.length === 2 && des(vs[1]) && des(vs[1]) === ori(vs[0]);
    const tipo = vs.length === 1 ? 'ida' : iv ? 'iv' : 'multi';
    const x = { produto: !go && (d.marca || (d.modelo === 'corp' ? 'Maktub Corporativo' : '')) === 'Maktub Corporativo' ? 'Maktub Corporativo' : 'Passagens',
      custo: null, venda: null, tipo_trecho: tipo, origem: ori(vs[0]) || '', destino: des(vs[0]) || '', data_ida: vs[0].data || null, passageiros: parseInt(d.pessoas) || null, cia_emissora: d.cia || '' };
    if (tipo === 'iv') x.data_volta = vs[1].data || null;
    if (tipo === 'multi') { x.data_volta = vs[vs.length - 1].data || null; x.trechos = vs.map(v => `${ori(v)}-${des(v)}${v.data ? ' ' + ddmm(v.data) : ''}`).join('\n'); }
    itens.push(x);
  }
  if (go) (op.o.hoteis || []).filter(ht => ht.nome).forEach(ht => itens.push({ produto: 'Hotelaria', custo: null, venda: null, nome: ht.nome, destino: ht.cidade || '', data_ida: ht.entrada || null, data_volta: ht.saida || null }));
  // com um serviço só, o valor da cotação já é a venda; com mais de um, o total vai para o valor fechado e a venda é dividida no fechamento
  if (itens.length === 1 && op.valor) itens[0].venda = op.valor;
  return { itens, valor: op.valor || 0, nome: op.nome };
}
function ir(X, id) { ED = id; history.pushState(null, '', '#cotador' + (id ? '/' + id : '')); tela(X.$('pagina'), X); scrollTo(0, 0); }

async function lista(P, X) {
  const { $, sb, esc } = X;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Comercial</button><h1 class="titulo" style="margin-top:6px"><em>Cotações</em></h1>
    <div class="sub">Preencha só o que muda; o visual, a economia e as parcelas saem prontos. Nunca mostra o custo.</div>
    <button class="zap grande" id="novoRap" style="width:100%;margin-top:12px">Cotação rápida: cole e envie ›</button>
    <div class="botoes4" style="margin-top:8px"><button class="sec" id="novoGo">+ Maktub Go</button><button class="sec" id="novoCorp">+ Corporativo</button></div>
    ${PRE ? `<div class="config" style="margin-top:10px">Cotação para <b>${esc(PRE.cliente || '')}</b>${PRE.destino ? ' · ' + esc(PRE.destino) : ''}. Ao enviar, o atendimento vai para "Cotação enviada" no funil.</div>` : ''}
    <div class="lista" id="lsC"><div class="vazio">Carregando...</div></div>`;
  $('voltar').onclick = () => X.ir('reunioes');
  $('novoGo').onclick = () => comCard(P, X, () => { S = comPre(NOVO_GO()); PRE = null; ir(X, 'novo'); });
  $('novoCorp').onclick = () => comCard(P, X, () => { S = comPre(NOVO_CORP()); PRE = null; ir(X, 'novo'); });
  $('novoRap').onclick = () => comCard(P, X, () => { S = comPre(NOVO_RAP()); PRE = null; ir(X, 'novo'); });
  const r = await sb.from('propostas').select('id,modelo,titulo,cliente,destino,atualizado_em,dados').order('atualizado_em', { ascending: false }).limit(300);
  if (!$('lsC')) return;
  if (r.error) { $('lsC').innerHTML = '<div class="config">Rode o 1-cotador.sql no Supabase para guardar as cotações. Dá para montar e baixar mesmo sem ele.</div>'; LISTA = []; return; }
  LISTA = r.data || [];
  $('lsC').innerHTML = LISTA.length ? LISTA.map(c => `<button class="cli" data-c="${c.id}"><div><div class="nome">${esc(c.titulo || 'Sem título')}</div><div class="meta">${c.modelo === 'corp' ? 'Corporativo' : c.modelo === 'rapida' ? 'Rápida' : 'Maktub Go'}${c.cliente ? ' · ' + esc(c.cliente) : ''}${c.destino ? ' · ' + esc(c.destino) : ''}${(k => k ? ' · card ' + esc(numC(k).trim() || k.cliente) : ' · <span style="color:var(--alerta)">sem card</span>')(cardDe(X, c.dados && c.dados.reuniao_id))}</div></div><div class="val"><span>${new Date(c.atualizado_em).toLocaleDateString('pt-BR')}</span></div></button>`).join('')
    : '<div class="vazio">Nenhuma cotação ainda. Comece pelo modelo Maktub Go ou Corporativo.</div>';
  P.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const c = LISTA.find(x => String(x.id) === b.dataset.c); S = JSON.parse(JSON.stringify(c.dados)); S._id = c.id; ir(X, String(c.id)); });
}

/* ================= editor ================= */
const get = (p) => p.split('.').reduce((o, k) => o == null ? o : o[k], S);
const set = (p, v) => { const ks = p.split('.'), last = ks.pop(); const o = ks.reduce((a, k) => a[k], S); o[last] = v; };
function inp(p, rot, tipo = 'text', extra = '') {
  const v = get(p);
  if (tipo === 'area') return `<label class="fl"><span>${rot}</span><textarea data-k="${p}" rows="3" ${extra}>${h(v)}</textarea></label>`;
  if (tipo === 'check') return `<label class="fc"><input type="checkbox" data-k="${p}" ${v ? 'checked' : ''}><span>${rot}</span></label>`;
  return `<label class="fl"><span>${rot}</span><input data-k="${p}" type="${tipo}" value="${h(v)}" ${tipo === 'num' ? 'inputmode="decimal"' : ''} ${extra}></label>`;
}
const sel = (p, rot, ops) => `<label class="fl"><span>${rot}</span><select data-k="${p}">${ops.map(o => `<option ${get(p) === o ? 'selected' : ''}>${h(o)}</option>`).join('')}</select></label>`;
const duas = (a, b) => `<div class="duas-col">${a}${b}</div>`;
const btnMais = (acao, rot) => `<button type="button" class="sec" data-mais="${acao}" style="width:100%;margin-top:6px">${rot}</button>`;
const btnTira = (acao) => `<button type="button" data-tira="${acao}" style="background:none;border:0;color:var(--tinta-3);text-decoration:underline;font:inherit;font-size:12px;cursor:pointer;float:right">remover</button>`;

function editor(P, X) {
  const { $ } = X;
  if (!S) { if (ED !== 'novo' && LISTA) { const c = LISTA.find(x => String(x.id) === ED); if (c) { S = JSON.parse(JSON.stringify(c.dados)); S._id = c.id; } } if (!S) { ED = null; return lista(P, X); } }
  if (S.modelo === 'rapida') return editorRapida(P, X);
  const corp = S.modelo === 'corp';
  P.innerHTML = `<button class="voltar" id="voltar">‹ Cotações</button>
    <h1 class="titulo" style="margin-top:6px">${corp ? 'Cotação <em>corporativa</em>' : 'Cotação <em>Maktub Go</em>'}</h1>${faixaCard(X)}
    <form class="form" id="fCot" autocomplete="off" onsubmit="return false">${corp ? formCorp(X) : formGo(X)}</form>
    <div class="botoes4" style="margin-top:14px"><button class="zap" id="verC">Ver como o cliente</button><button class="sec" id="baixarC">Baixar HTML</button></div>
    ${S.modelo !== 'rapida' ? `<label class="fl" style="margin-top:10px"><span>Nome do link (maktubgo.com.br/...)</span><input id="slugC" value="${h(S.slug || sugerirSlug())}" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="${corp ? 'ian-santiago' : 'veronica-lisboa'}"></label>` : ''}
    <button class="zap grande" id="linkC" style="width:100%;margin-top:6px">${S.link_slug ? 'Atualizar o link do cliente' : 'Gerar link para o cliente'}</button><div id="linkBox"></div>
    <div class="botoes4" style="margin-top:6px"><button class="sec" id="salvarC">Salvar rascunho</button><button class="sec" id="acervoC">Guardar no acervo</button></div>
    ${S._id ? '<button class="sec" id="duplicarC" style="width:100%;margin-top:6px">Duplicar para outro cliente</button>' : ''}
    <div class="sub" id="msgC"></div>`;
  $('voltar').onclick = () => { S = null; ir(X, null); };
  const f = $('fCot');
  f.addEventListener('toggle', (e) => { const d = e.target.dataset && e.target.dataset.d; if (d) { if (e.target.open) ABERTOS.add(d); else ABERTOS.delete(d); } }, true);
  f.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; set(k, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    const m = k.match(/^opcoes\.(\d+)\.(sites|cartao|parcelas|pix)$/); if (m && $('rv' + m[1])) $('rv' + m[1]).innerHTML = resumoValores(S.opcoes[+m[1]]);
    const vk = S.modelo === 'corp' && k.match(/^(.*voos\.\d+)\.(ocod|dcod|saida|chegada|data|tipo)$/);
    if (vk) { const v = get(vk[1]); completarVoo(v); ['onome', 'dnome', 'duracao'].forEach(c => { const el = f.querySelector(`[data-k="${vk[1]}.${c}"]`); if (el && el !== e.target && el.value !== (v[c] || '')) el.value = v[c] || ''; }); } });
  f.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' && e.target.dataset.k) set(e.target.dataset.k, e.target.value); if (e.target.dataset.hotel) escolherHotel(X, e.target); if (e.target.dataset.foto) fotoUpload(e.target, P, X); if (e.target.dataset.print) printUpload(e.target, P, X); });
  f.addEventListener('click', (e) => {
    const cb = e.target.closest('[data-colar]'); if (cb) { (S.modelo === 'go' ? colarGo : colar)(P, X, cb.dataset.colar); return; }
    const m = e.target.closest('[data-mais]'), t = e.target.closest('[data-tira]');
    if (m) { mais(m.dataset.mais); editor(P, X); }
    if (t) { const [lista, i] = t.dataset.tira.split('#'); if (lista === '_print') S.print = ''; else get(lista).splice(+i, 1); editor(P, X); }
  });
  ligarPrint(P, X);
  $('verC').onclick = () => { const w = window.open('', '_blank'); const html = gerar(X); if (w) { w.document.open(); w.document.write(html); w.document.close(); } else X.aviso('Libere as janelas novas para ver a cotação.'); };
  ligarFaixa(P, X);
  $('baixarC').onclick = () => comCardNaCotacao(P, X, () => { enviada(X); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([gerar(X)], { type: 'text/html' })); a.download = 'index.html'; document.body.appendChild(a); a.click(); a.remove(); X.aviso('Baixado como index.html, pronto para enviar.'); });
  $('salvarC').onclick = () => comCardNaCotacao(P, X, () => salvar(X));
  $('acervoC').onclick = () => acervo(X);
  $('linkC').onclick = () => comCardNaCotacao(P, X, () => gerarLink(X));
  if ($('duplicarC')) $('duplicarC').onclick = () => { delete S._id; delete S.reuniao_id; delete S.link_slug; delete S.slug; if (S.modelo === 'go') { S.para = ''; S.nomeZap = ''; } else { S.passageiro = ''; S.codigo = ''; } S.consulta = hoje(); ED = 'novo'; history.replaceState(null, '', '#cotador/novo'); editor(P, X); X.aviso('Cópia criada. Ligue ao card do outro cliente e ajuste.'); };
}

function mais(a) {
  const [o, tipo] = a.split('|');
  if (tipo === 'opcao') { S.opcoes.push(OPCAO(S.opcoes.length + 1)); if (S.opcoes.length === 2 && S.opcoes[0].cta === 'Quero seguir com essa viagem') S.opcoes[0].cta = 'Quero seguir com a Opção 1'; return; }
  if (tipo === 'corpop') { if (S.extras.length >= 2) return; const ant = S.extras.length ? S.extras[S.extras.length - 1] : S; S.extras.push({ nome: '', voos: JSON.parse(JSON.stringify(ant.voos)), de: '', por: '' }); return; }
  const l = get(o);
  if (tipo === 'dia') l.push({ data: '', titulo: '', destaque: false });
  if (tipo === 'voo') l.push({ ...VOO(), rotulo: 'Trecho ' + (l.length + 1) });
  if (tipo === 'vooc') l.push({ rotulo: 'Trecho ' + (l.length + 1), data: '', ocod: '', onome: '', saida: '', dcod: '', dnome: '', chegada: '', tipo: 'Direto', duracao: '' });
  if (tipo === 'hotel') l.push(HOTEL());
  if (tipo === 'carro') l.push({ grupo: '', valor: '', modelos: '', desc: '' });
}

function formGo(X) {
  const { esc } = X;
  const hoteis = (X.fornecedores ? X.fornecedores.lista() : []).filter(f => f.tipo === 'hotel');
  const multi = S.opcoes.length > 1;
  const op = S.opcoes.map((o, i) => {
    const b = `opcoes.${i}`;
    const vs = o.voos.filter(v => v.origem || v.destino);
    const resumoVoos = vs.length ? vs.map(v => `<div style="font-size:13px;padding:3px 0"><b>${h(v.rotulo || 'Voo')}</b> ${ddmm(v.data)} · ${h(v.origem)} ${h(v.saida)} → ${h(v.destino)} ${h(v.chegada)}${v.mais1 ? ' (+1)' : ''} · ${h(v.tipo)}</div>`).join('') : '<div class="sub" style="margin:0">Nenhum voo ainda. Cole a tela da companhia acima ou preencha abaixo.</div>';
    return `<div class="grupo">${multi ? `Opção ${i + 1} ${btnTira('opcoes#' + i)}` : 'A viagem'}</div>
      ${multi ? inp(b + '.nome', 'Nome da opção', 'text', 'placeholder="Ex.: Voo direto + hotel no centro"') : ''}
      <div class="sub" style="margin-top:6px"><b>Voos</b></div>
      ${resumoVoos}
      ${dobra(b + '.voos', `Editar voos (${vs.length})`, `${o.voos.map((v, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira(`${b}.voos#${j}`)}
        ${duas(inp(`${b}.voos.${j}.rotulo`, 'Rótulo', 'text', 'placeholder="Ida, Volta, Entre países"'), inp(`${b}.voos.${j}.data`, 'Data', 'date'))}
        ${duas(inp(`${b}.voos.${j}.origem`, 'Saída de', 'text', 'placeholder="Uberlândia"'), inp(`${b}.voos.${j}.saida`, 'Horário', 'time'))}
        ${duas(inp(`${b}.voos.${j}.destino`, 'Chegada em', 'text', 'placeholder="Lisboa"'), inp(`${b}.voos.${j}.chegada`, 'Horário', 'time'))}
        ${duas(sel(`${b}.voos.${j}.tipo`, 'Tipo', ['Voo direto', 'Com 1 conexão', 'Com 2 conexões', 'Com 3 conexões']), sel(`${b}.voos.${j}.periodo`, 'Período', ['', 'Voo diurno', 'Voo noturno']))}
        ${inp(`${b}.voos.${j}.mais1`, 'Chega no dia seguinte (+1)', 'check')}</div>`).join('')}
        ${btnMais(`${b}.voos|voo`, '+ Trecho')}
        ${inp(b + '.bagagem', 'Bagagem', 'text', 'placeholder="Para cada um: 1 mala despachada, 1 mala de bordo de 10 kg e 1 mochila, ida e volta"')}`)}
      <div class="sub" style="margin-top:10px"><b>Hotelaria</b></div>
      ${o.hoteis.map((ht, j) => { const c = `${b}.hoteis.${j}`; return `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira(`${b}.hoteis#${j}`)}
        <label class="fl"><span>Hotel (escolha da base ou digite)</span><input data-k="${c}.nome" data-hotel="${c}" list="dlHot" value="${h(ht.nome)}"></label>
        ${duas(inp(c + '.entrada', 'Check-in', 'date'), inp(c + '.saida', 'Check-out', 'date'))}
        ${dobra(c, 'Detalhes do hotel (cidade, fotos, descrição)', `${duas(inp(c + '.cidade', 'Cidade'), inp(c + '.estrelas', 'Estrelas', 'num'))}
        ${inp(c + '.descricao', 'Descrição para o cliente', 'area', 'placeholder="O que faz esse hotel especial para eles"')}
        ${inp(c + '.itens', 'O que está incluso (uma linha cada)', 'area', 'placeholder="Quarto standard\nCafé da manhã incluso"')}
        ${inp(c + '.fotos', 'Fotos (um link por linha)', 'area', 'placeholder="https://site-do-hotel/foto.jpg"')}
        <label class="fl"><span>Ou envie fotos do celular</span><input type="file" accept="image/*" multiple data-foto="${c}.fotos"></label>
        <div class="sub" style="margin:0">Use fotos do site do hotel, enviadas pelo hotel ou da equipe. Fotos do Google não podem ir para material de cliente.</div>
        ${inp(c + '.nota', 'Observação', 'text')}`)}</div>`; }).join('')}
      ${btnMais(`${b}.hoteis|hotel`, '+ Hotel')}
      <div class="sub" style="margin-top:10px"><b>Investimento</b> (para ${h(S.pessoas || '?')} ${+S.pessoas === 1 ? 'pessoa' : 'pessoas'})</div>
      ${duas(inp(b + '.sites', 'Valor nos sites', 'num', 'placeholder="3.799,00"'), inp(b + '.cartao', o.carro.opcoes.length ? 'Maktub: voos + hotel no cartão' : 'Valor Maktub no cartão', 'num', 'placeholder="3.388,00"'))}
      ${duas(inp(b + '.parcelas', 'Parcelas sem juros', 'num'), inp(b + '.pix', 'Desconto no Pix (%)', 'num', 'placeholder="5"'))}
      <div id="rv${i}">${resumoValores(o)}</div>
      ${dobra(b + '.mais', 'Mais desta opção (roteiro, carro, datas, incluso)', `${multi ? '' : inp(b + '.nome', 'Nome da viagem', 'text', 'placeholder="Ex.: Navegando por Portugal"')}
        ${inp(b + '.resumo', 'Resumo curto', 'text', 'placeholder="Em branco: usa as noites de hotel"')}
        ${duas(inp(b + '.embarque', 'Embarque', 'date'), inp(b + '.retorno', 'Retorno', 'date'))}
        ${inp(b + '.hotelaria', 'Hotelaria (resumo)', 'text', 'placeholder="Em branco: calcula pelas datas do hotel"')}
        <div class="sub" style="margin-top:8px"><b>Sugestão de roteiro</b> (${o.dias.length} ${o.dias.length === 1 ? 'dia' : 'dias'})</div>
        ${o.dias.map((d, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px"><b>Dia ${j + 1}</b>${btnTira(`${b}.dias#${j}`)}${duas(inp(`${b}.dias.${j}.data`, 'Data', 'date'), inp(`${b}.dias.${j}.titulo`, 'Título do dia'))}${inp(`${b}.dias.${j}.destaque`, 'Dia em destaque', 'check')}</div>`).join('')}
        ${btnMais(`${b}.dias|dia`, '+ Dia')}
        <div class="sub" style="margin-top:8px"><b>Aluguel de carro</b> (${o.carro.opcoes.length ? o.carro.opcoes.length + ' opções' : 'sem carro'})</div>
        ${inp(b + '.carro.intro', 'Retirada e devolução', 'area', 'placeholder="Retirada e devolução no Aeroporto de Porto Alegre. Retirada em 18/02 às 11:00 e devolução em 21/02 às 11:00, com 3 diárias."')}
        ${o.carro.opcoes.map((c, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira(`${b}.carro.opcoes#${j}`)}${duas(inp(`${b}.carro.opcoes.${j}.grupo`, 'Grupo', 'text', 'placeholder="SUV"'), inp(`${b}.carro.opcoes.${j}.valor`, 'Valor total (R$)', 'num'))}${inp(`${b}.carro.opcoes.${j}.modelos`, 'Modelos', 'text', 'placeholder="Volkswagen Nivus ou Fiat Pulse"')}${inp(`${b}.carro.opcoes.${j}.desc`, 'Detalhe', 'text', 'placeholder="Câmbio automático · mais espaço para a serra"')}</div>`).join('')}
        ${btnMais(`${b}.carro.opcoes|carro`, '+ Opção de carro')}
        ${inp(b + '.incluso', 'Incluso (uma linha cada)', 'area')}
        ${inp(b + '.cta', 'Texto do botão')}`)}`;
  }).join('');
  return `${caixaColar('Copie a tela da companhia (dos horários até o subtotal) e cole. Voos, datas e valores entram sozinhos. Ou escreva curto, uma linha por voo:', '02/12 GIG 22:10 LIS 12:05 direto<br>15/12 LIS 10:20 GIG 17:40 direto<br>site 9.800 maktub 8.900<br>Várias opções: comece cada uma com "Opção 1", "Opção 2".')}
    <div class="botoes4"><button type="button" class="zap" data-colar="tudo">Preencher</button><button type="button" class="sec" data-colar="nova">Colar como nova opção</button></div>
    <div class="grupo">Cliente</div>
    ${duas(inp('para', 'Para quem', 'text', 'placeholder="Verônica e Helena"'), inp('pessoas', 'Pessoas', 'num'))}
    ${inp('destino', 'Destino', 'text', 'placeholder="Em branco: usa a cidade do voo de ida"')}
    ${dobra('capa', 'Personalizar capa e abertura (opcional)', `<div class="sub" style="margin:4px 0">Em branco, sai sozinho: título "${h(S.destino || 'Lisboa')} te espera, e a Maktub vai te levar.", linha com mês e destino, e o WhatsApp com o primeiro nome do cliente.</div>
      ${inp('kicker', 'Rótulo de cima')}
      ${inp('titulo', 'Título', 'text', 'placeholder="Um sonho em família,"')}
      ${inp('sub', 'Complemento em itálico', 'text', 'placeholder="e a Maktub vai te levar."')}
      ${inp('linha', 'Linha de datas ou rota', 'text', 'placeholder="Maio de 2027 · Portugal"')}
      ${inp('nomeZap', 'Quem fala no WhatsApp', 'text', 'placeholder="Verônica"')}
      ${inp('carta', 'Texto de abertura', 'area', 'placeholder="Proposta inicial para vocês terem clareza do investimento..."')}`)}
    <datalist id="dlHot">${hoteis.map(f => `<option value="${esc(f.nome)}">${esc(f.cidade || '')}</option>`).join('')}</datalist>
    ${op}
    ${btnMais('x|opcao', '+ Outra opção para o cliente escolher')}
    ${dobra('fecho', 'Fechamento e condições', `${inp('porque', 'Frase de "Por que a Maktub" (opcional)', 'area', 'placeholder="Primeira viagem internacional não precisa ser motivo de preocupação..."')}
      ${inp('consulta', 'Valores consultados em', 'date')}
      ${inp('avisos', 'Condições (uma linha cada)', 'area', 'rows="5"')}`)}`;
}

/* o que ficou em branco sai pronto na hora de gerar, sem mudar o que foi digitado */
function autoGo(src) {
  const d = JSON.parse(JSON.stringify(src));
  d.opcoes.forEach(o => {
    const ds = o.voos.filter(v => v.origem || v.destino).map(v => v.data).filter(Boolean).sort();
    if (!o.embarque && ds.length) o.embarque = ds[0];
    if (!o.retorno && ds.length > 1) o.retorno = ds[ds.length - 1];
    o.hoteis.forEach(x => { if (x.nome) { if (!x.entrada) x.entrada = o.embarque || ''; if (!x.saida) x.saida = o.retorno || ''; } });
    if (!o.hotelaria) { const t = o.hoteis.filter(x => x.nome).map(x => { const n = noites(x.entrada, x.saida); return n > 0 ? `${n} ${n === 1 ? 'noite' : 'noites'}${x.cidade ? ' em ' + x.cidade : ''}` : ''; }).filter(Boolean); if (t.length) o.hotelaria = t.join(' + '); }
    if (!o.resumo) o.resumo = o.hotelaria || '';
  });
  const o0 = d.opcoes[0];
  if (!d.destino) { const v = o0.voos.find(v => v.destino); if (v) d.destino = v.destino; }
  if (!d.titulo) { d.titulo = `${d.destino || 'Sua viagem'} te espera,`; if (!d.sub) d.sub = 'e a Maktub vai te levar.'; }
  if (!d.linha && o0.embarque) { const x = dt(o0.embarque); const m = MES[x.getMonth()]; d.linha = `${m.charAt(0).toUpperCase() + m.slice(1)} de ${x.getFullYear()}${d.destino ? ' · ' + d.destino : ''}`; }
  if (!d.nomeZap) d.nomeZap = String(d.para || '').trim().split(/\s+/)[0] || '';
  return d;
}

/* colar e preencher no Maktub Go: os voos da companhia viram os cards da proposta */
async function colarGo(P, X, modo) {
  const txt = X.$('colaTxt').value.trim(); if (!txt) { X.aviso('Cole o texto primeiro.'); return; }
  const r = await lerColado(txt);
  if (!r.opcoes.length) { X.aviso('Não encontrei voos nem valores. Confira se tem horário e código do aeroporto (ex.: 22:10 GIG).'); return; }
  const conv = (v) => ({ ...VOO(), rotulo: v.rotulo, data: v.data, origem: cidadeDe(v.ocod) || v.ocod, saida: v.saida, destino: cidadeDe(v.dcod) || v.dcod, chegada: v.chegada,
    mais1: !!(v.mais1 || (v.saida && v.chegada && v.chegada < v.saida)), tipo: TIPO_GO[v.tipo] || 'Voo direto' });
  const aplicar = (o, p) => {
    if (p.voos.length) o.voos = p.voos.map(conv);
    if (p.de) o.sites = p.de; if (p.por) o.cartao = p.por; if (p.nome && !o.nome) o.nome = p.nome;
    const ds = o.voos.map(v => v.data).filter(Boolean).sort();
    if (ds.length) { o.embarque = ds[0]; o.retorno = ds.length > 1 ? ds[ds.length - 1] : o.retorno; }
  };
  const temVoo = S.opcoes[0].voos.some(v => v.origem);
  if (modo === 'nova' && temVoo) r.opcoes.forEach(p => { const o = OPCAO(S.opcoes.length + 1); aplicar(o, p); S.opcoes.push(o); });
  else r.opcoes.forEach((p, i) => { if (!S.opcoes[i]) S.opcoes.push(OPCAO(i + 1)); aplicar(S.opcoes[i], p); });
  if (S.opcoes.length > 1) S.opcoes.forEach((o, i) => { if (/^Quero seguir com (essa viagem|a Opção \d+)$/.test(o.cta)) o.cta = `Quero seguir com a Opção ${i + 1}`; });
  if (r.cliente && !S.para) S.para = r.cliente;
  if (!S.destino) { const v = S.opcoes[0].voos.find(v => v.destino); if (v) S.destino = v.destino; }
  editor(P, X);
  const falta = S.opcoes.some(o => !num(o.cartao));
  X.aviso(falta ? 'Voos preenchidos. Digite o valor Maktub de cada opção e, se tiver, escolha o hotel.' : 'Preenchido. Confira, escolha o hotel e gere o link.');
}

function precos(o) {
  const cartao = num(o.cartao), parc = Math.max(1, parseInt(o.parcelas, 10) || 1), pixP = num(o.pix), sites = num(o.sites);
  const pix = pixP > 0 ? Math.round(cartao * (1 - pixP / 100) * 100) / 100 : 0;
  const melhor = pix || cartao;
  return { cartao, parc, vparc: cartao / parc, pixP, pix, sites, economia: sites > melhor ? sites - melhor : 0 };
}
function resumoValores(o) {
  const p = precos(o); if (!p.cartao) return '';
  return `<div class="config" style="margin:6px 0">${p.parc}x de ${brl(p.vparc)} no cartão${p.pix ? ` · ${brl(p.pix)} no Pix` : ''}${p.sites ? (p.economia ? ` · economia de ${brl(p.economia)} sobre os sites` : ' · atenção: valor da Maktub não está abaixo dos sites') : ' · sem ancoragem: a economia não vai aparecer'}</div>`;
}

function voosCorp(pre) {
  return `${get(pre + 'voos').map((v, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira(pre + 'voos#' + j)}
      ${duas(inp(`${pre}voos.${j}.rotulo`, 'Rótulo'), inp(`${pre}voos.${j}.data`, 'Data', 'date'))}
      ${duas(inp(`${pre}voos.${j}.ocod`, 'Origem (código)', 'text', 'placeholder="GIG" style="text-transform:uppercase"'), inp(`${pre}voos.${j}.onome`, 'Aeroporto', 'text', 'placeholder="Galeão"'))}
      ${duas(inp(`${pre}voos.${j}.dcod`, 'Destino (código)', 'text', 'placeholder="SCL" style="text-transform:uppercase"'), inp(`${pre}voos.${j}.dnome`, 'Aeroporto', 'text', 'placeholder="Santiago"'))}
      ${duas(inp(`${pre}voos.${j}.saida`, 'Saída', 'time'), inp(`${pre}voos.${j}.chegada`, 'Chegada', 'time'))}
      ${duas(sel(`${pre}voos.${j}.tipo`, 'Tipo', ['Direto', '1 conexão', '2 conexões']), inp(`${pre}voos.${j}.duracao`, 'Duração', 'text', 'placeholder="4h40"'))}</div>`).join('')}
    ${btnMais(pre + 'voos|vooc', '+ Trecho')}`;
}
function formCorp() {
  if (!S.extras) S.extras = [];
  const multi = S.extras.length > 0;
  return `<div class="config" style="margin:6px 0 4px"><b>Colar e preencher</b><br>Copie a tela da companhia (do horário até o subtotal) e cole aqui. Ou escreva curto, uma linha por voo:<br><span style="font-family:monospace;font-size:12px">02/12 GIG 12:20 SCL 17:00 direto<br>09/12 SCL 14:10 GIG 21:25 1 parada<br>site 1.670,93 maktub 1.655</span><br>Para várias opções, comece cada uma com "Opção 1", "Opção 2".</div>
    <label class="fl"><textarea id="colaTxt" rows="5" placeholder="Cole aqui"></textarea></label>
    <div class="botoes4"><button type="button" class="zap" data-colar="tudo">Preencher</button><button type="button" class="sec" data-colar="nova">Colar como nova opção</button></div>
    <div class="grupo">Cotação</div>
    ${duas(inp('codigo', 'Código', 'text', `placeholder="MC-${hoje().slice(8, 10)}${hoje().slice(5, 7)}-001"`), inp('validade', 'Válida somente em', 'date'))}
    ${duas(inp('passageiro', 'Passageiro', 'text', 'placeholder="Victor"'), inp('pessoas', 'Pessoas', 'num'))}
    ${duas(inp('cia', 'Companhia', 'text', 'placeholder="LATAM"'), inp('destino', 'Destino (acervo)', 'text', 'placeholder="Santiago"'))}
    ${inp('rota', 'Título da rota', 'text', 'placeholder="Rio de Janeiro ⇄ Santiago"')}
    ${sel('marca', 'Marca no topo', ['Maktub Corporativo', 'Maktub Go'])}
    <div class="grupo">${multi ? 'Opção 1' : 'Voos'}</div>
    ${multi ? inp('nome1', 'Nome da Opção 1', 'text', 'placeholder="Ida direta, volta com 1 parada"') : ''}
    ${voosCorp('')}
    ${duas(inp('de', 'De (valor no site)', 'num', 'placeholder="1.670,93"'), inp('por', 'Por (valor Maktub)', 'num', 'placeholder="1.655,00"'))}
    ${S.extras.map((o, i) => `<div class="grupo">Opção ${i + 2} ${btnTira('extras#' + i)}</div>
    ${inp(`extras.${i}.nome`, `Nome da Opção ${i + 2}`, 'text', 'placeholder="Ida e volta em voo direto"')}
    ${voosCorp(`extras.${i}.`)}
    ${duas(inp(`extras.${i}.de`, 'De (valor no site)', 'num', 'placeholder="2.154,06"'), inp(`extras.${i}.por`, 'Por (valor Maktub)', 'num', 'placeholder="2.100,00"'))}`).join('')}
    ${S.extras.length < 2 ? btnMais('extras|corpop', `+ Opção ${S.extras.length + 2} (copia os voos da anterior)`) : '<div class="sub">Máximo de 3 opções por cotação.</div>'}
    <div class="grupo">Pagamento e condições</div>
    ${inp('bagagem', 'Bagagem incluída')}
    ${inp('forma', 'Forma de pagamento')}
    <label class="fl"><span>Print do site da companhia (opcional)</span><input type="file" accept="image/*" data-print="1"></label>
    ${S.print ? `<img src="${S.print}" style="max-width:100%;border:1px solid var(--linha);margin:6px 0"><button type="button" data-tira="_print#0" style="background:none;border:0;color:var(--tinta-3);text-decoration:underline;font:inherit;font-size:12px">remover print</button>` : ''}
    ${inp('rodape', 'Condições', 'area', 'rows="4"')}`;
}

function escolherHotel(X, el) {
  const base = el.dataset.hotel, f = (X.fornecedores ? X.fornecedores.lista() : []).find(x => x.nome === el.value);
  if (!f) return;
  const ht = get(base);
  Object.assign(ht, { fornecedor_id: f.id, cidade: ht.cidade || f.cidade || '', estrelas: ht.estrelas || f.estrelas || '' });
  const op = S.opcoes && S.opcoes[+base.split('.')[1]];
  if (op) { const ds = op.voos.map(v => v.data).filter(Boolean).sort(); if (!ht.entrada) ht.entrada = op.embarque || ds[0] || ''; if (!ht.saida) ht.saida = op.retorno || (ds.length > 1 ? ds[ds.length - 1] : ''); }
  if (!ht.itens && f.cafe) ht.itens = f.cafe === 'incluso' ? 'Café da manhã incluso' : 'Café da manhã não incluso';
  if (!ht.fotos && f.fotos_maktub && f.fotos_maktub.length) ht.fotos = f.fotos_maktub.join('\n');
  editor(X.$('pagina'), X);
}
function reduzir(file, max = 1200, q = 0.74) {
  return new Promise((ok) => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', q)); URL.revokeObjectURL(img.src); }; img.onerror = () => ok(null); img.src = URL.createObjectURL(file); });
}
async function fotoUpload(el, P, X) {
  const novas = (await Promise.all([...el.files].slice(0, 6).map(f => reduzir(f)))).filter(Boolean);
  set(el.dataset.foto, linhas(get(el.dataset.foto)).concat(novas).join('\n')); editor(P, X);
}
async function printUpload(el, P, X) { const f = el.files[0]; if (!f) return; S.print = await reduzir(f, 1400) || ''; editor(P, X); }

/* ================= salvar e acervo ================= */
function tituloDe() { if (S.modelo === 'rapida') return 'Rápida' + (S.cliente ? ' · ' + S.cliente : '') + (S.por ? ' · ' + brl(num(S.por)) : ''); return S.modelo === 'corp' ? `${S.codigo || 'Corporativo'} · ${S.passageiro || ''}`.trim() : [S.titulo, S.sub].filter(Boolean).join(' ').replace(/[,.]\s*$/, '') || S.opcoes[0].nome || 'Cotação'; }
function clienteDe() { return S.modelo === 'rapida' ? S.cliente : S.modelo === 'corp' ? S.passageiro : S.para; }
async function salvar(X, quieto) {
  const dados = JSON.parse(JSON.stringify(S)); delete dados._id;
  const row = { modelo: S.modelo, titulo: tituloDe(), cliente: clienteDe() || null, destino: S.destino || null, dados, atualizado_em: new Date().toISOString() };
  const r = S._id ? await X.sb.from('propostas').update(row).eq('id', S._id).select().single() : await X.sb.from('propostas').insert(row).select().single();
  if (r.error) { X.aviso('Não salvou: ' + r.error.message + (/relation|does not exist/.test(r.error.message) ? ' (rode o 1-cotador.sql)' : '')); return false; }
  S._id = r.data.id; ED = String(r.data.id); history.replaceState(null, '', '#cotador/' + ED);
  if (X.cotSalva) X.cotSalva({ id: r.data.id, titulo: row.titulo, modelo: row.modelo, atualizado_em: row.atualizado_em, reuniao_id: S.reuniao_id || null });
  if (S.reuniao_id && X.cotacaoEnviada) X.cotacaoEnviada(S.reuniao_id, { iniciada: true });
  // fotos de hotel entram no banco de fotos do fornecedor
  if (S.modelo === 'go') for (const o of S.opcoes) for (const ht of o.hoteis) { const urls = linhas(ht.fotos).filter(u => /^https?:/.test(u)); const f = ht.fornecedor_id && X.fornecedores && X.fornecedores.lista().find(x => x.id === ht.fornecedor_id); if (f && urls.length) { const todas = [...new Set([...(f.fotos_maktub || []), ...urls])].slice(0, 30); if (todas.length !== (f.fotos_maktub || []).length) { const u = await X.sb.from('fornecedores').update({ fotos_maktub: todas }).eq('id', f.id); if (!u.error) f.fotos_maktub = todas; } } }
  if (!quieto) X.aviso('Rascunho salvo.'); return true;
}
async function colar(P, X, modo) {
  const txt = X.$('colaTxt').value.trim(); if (!txt) { X.aviso('Cole o texto primeiro.'); return; }
  const r = await lerColado(txt);
  if (!r.opcoes.length || !r.opcoes.some(o => o.voos.length)) { X.aviso('Não encontrei voos no texto. Confira se tem horário e código do aeroporto (ex.: 12:20 GIG).'); return; }
  if (!S.extras) S.extras = [];
  const ops = modo === 'nova' && (S.voos || []).some(v => v.ocod) ? r.opcoes.map(o => ({ nome: o.nome, voos: o.voos, de: o.de, por: o.por })) : null;
  if (ops) { S.extras = S.extras.concat(ops).slice(0, 2); }
  else {
    const [p1, ...resto] = r.opcoes;
    S.voos = p1.voos.length ? p1.voos : S.voos; S.de = p1.de || S.de; S.por = p1.por || S.por; S.nome1 = p1.nome || S.nome1 || '';
    S.extras = resto.slice(0, 2).map(o => ({ nome: o.nome, voos: o.voos, de: o.de, por: o.por }));
  }
  if (r.cliente && !S.passageiro) S.passageiro = r.cliente;
  if (r.cia && !S.cia) S.cia = r.cia;
  const v0 = (S.voos || [])[0];
  if (v0 && !S.rota) { const a = cidadeDe(v0.ocod) || v0.ocod, b = cidadeDe(v0.dcod) || v0.dcod; S.rota = `${a} ${S.voos.length > 1 ? '⇄' : '→'} ${b}`; }
  if (v0 && !S.destino) S.destino = cidadeDe(v0.dcod) || '';
  editor(P, X);
  const faltaPor = [S.por].concat(S.extras.map(o => o.por)).some(x => !x);
  X.aviso(faltaPor ? 'Preenchido. Confira e digite o valor da Maktub (Por) de cada opção.' : 'Preenchido. Confira e gere o link.');
}
/* nomes que nunca podem virar link de cotação: páginas e pastas do site e nomes que o site pode usar */
const RESERVADOS = ['acesso', 'admin', 'assets', 'ativos', 'avaliacao', 'c', 'cadastro', 'classe-executiva-com-milhas', 'como-trabalhamos', 'corporativo', 'gestao-de-milhas', 'painel', 'privacidade', 'quem-somos', 'termos', 'trabalheconosco', 'trabalhe-conosco', 'viagens', 'index', 'sitemap', 'robots', '404',
  'fale-conosco', 'contato', 'blog', 'cotacao', 'cotacoes', 'login', 'app', 'site', 'maktub', 'maktubgo', 'servicos', 'sobre', 'politica-de-privacidade', 'termos-de-uso', 'lua-de-mel', 'europa', 'milhas'];
// confere no próprio site se o endereço já é uma página publicada (pega também páginas novas que entrarem no GitHub)
async function existeNoSite(slug) {
  for (const u of [`/${slug}/`, `/${slug}`]) {
    try { const r = await fetch(u, { method: 'HEAD', cache: 'no-store', redirect: 'follow' }); if (r.ok) return true; } catch (e) {}
  }
  return false;
}
const limparSlug = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
function sugerirSlug() { const n = String(clienteDe() || '').trim().split(/\s+/)[0]; const dest = S.destino || (S.modelo === 'rapida' && rapVoos()[0] ? (cidadeDe(rapVoos()[0].dcod) || rapVoos()[0].dnome || '') : ''); return limparSlug([n, dest].filter(Boolean).join(' ')); }
async function gerarLink(X) {
  const campo = X.$('slugC'); let slug = campo ? limparSlug(campo.value) : '';
  if (campo) { campo.value = slug; S.slug = slug; }
  if (slug && slug.length < 3) { X.aviso('O nome do link precisa de pelo menos 3 letras.'); return; }
  const troque = () => { X.aviso(`"maktubgo.com.br/${slug}" já é uma página do site. Troque o nome do link.`); if (campo) { campo.focus(); campo.select(); } };
  if (slug && RESERVADOS.includes(slug)) return troque();
  const b = X.$('linkC'), rot = b.textContent; b.disabled = true; b.textContent = 'Conferindo o nome...';
  const fim = () => { b.disabled = false; b.textContent = rot; };
  if (slug && await existeNoSite(slug)) { fim(); return troque(); }
  b.textContent = 'Gerando...';
  const row = { html: S.modelo === 'rapida' ? gerarHTML(rapParaCorp()) : gerar(X), titulo: tituloDe(), cliente: clienteDe() || null }; if (slug) row.slug = slug;
  // mesma cotação e mesmo nome: atualiza o link que o cliente já recebeu
  const atualizar = slug && S.link_slug === slug;
  const r = atualizar
    ? await X.sb.rpc('cotacao_link_atualizar', { p_slug: slug, p_html: row.html, p_titulo: row.titulo, p_cliente: row.cliente })
    : await X.sb.from('cotacoes_link').insert(row).select('token,slug').single();
  fim();
  if (r.error) {
    if (r.error.code === '23505') { X.aviso(`O nome "${slug}" já está em uso por outra cotação. Troque o nome (ex.: ${slug}-2) e gere de novo.`); if (campo) campo.focus(); return; }
    if (/página do site/.test(r.error.message)) return troque();
    X.aviso(/cotacao_link_atualizar/.test(r.error.message) ? 'Falta rodar o SQL de atualizar link no Supabase.' : /slug/.test(r.error.message) ? 'Falta rodar o SQL do nome do link no Supabase.' : /cotacoes_link/.test(r.error.message) ? 'Falta rodar o SQL do link no Supabase.' : 'Não gerou o link: ' + r.error.message); return;
  }
  if (atualizar && r.data !== true) { X.aviso('Não encontrei o link antigo para atualizar. Troque o nome e gere um novo.'); S.link_slug = null; return; }
  const dados = atualizar ? { slug } : r.data;
  if (dados.slug) S.link_slug = dados.slug;
  const url = dados.slug ? `https://www.maktubgo.com.br/${dados.slug}` : `https://www.maktubgo.com.br/c/?k=${dados.token}`;
  const zap = `https://wa.me/?text=${encodeURIComponent(url)}`;
  X.$('linkBox').innerHTML = `<div class="config" style="margin-top:8px;word-break:break-all"><b>${atualizar ? 'Link atualizado' : 'Link pronto'}:</b><br><a href="${url}" target="_blank" rel="noopener">${url}</a></div><div class="botoes4" style="margin-top:6px"><button class="sec" id="copiarL">Copiar link</button><a class="sec" style="text-align:center;text-decoration:none" href="${zap}" target="_blank" rel="noopener">Enviar no WhatsApp</a></div>`;
  X.$('copiarL').onclick = async () => { try { await navigator.clipboard.writeText(url); X.aviso('Link copiado.'); } catch (e) { X.aviso(url); } };
  try { await navigator.clipboard.writeText(url); } catch (e) {}
  X.aviso(atualizar ? 'Link atualizado. O cliente vê a versão nova no mesmo endereço.' : 'Link gerado e copiado.');
  if (dados.slug) await salvar(X, true);
  enviada(X);
}
async function acervo(X) {
  const html = gerar(X), nome = (tituloDe() || 'cotacao').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase().slice(0, 60);
  const path = `${new Date().getFullYear()}/${Date.now()}-${nome}.html`;
  const up = await X.sb.storage.from('roteiros').upload(path, new Blob([html], { type: 'text/html' }), { contentType: 'text/html', upsert: false });
  if (up.error) { X.aviso('Não enviou: ' + up.error.message); return; }
  const op = S.modelo === 'go' ? S.opcoes[0] : null;
  const row = { tipo: 'proposta', titulo: tituloDe(), destino: S.destino || null, cliente: clienteDe() || null, data_viagem: op ? op.embarque || null : (S.voos[0] && S.voos[0].data) || null, dias: op && op.embarque && op.retorno ? noites(op.embarque, op.retorno) + 1 : null, arquivo_path: path, observacoes: S.modelo === 'corp' ? 'Cotação corporativa' : null };
  const r = await X.sb.from('roteiros').insert(row);
  if (r.error) { await X.sb.storage.from('roteiros').remove([path]); X.aviso('Não guardou: ' + r.error.message); return; }
  if (X.acervoRecarregar) X.acervoRecarregar();
  enviada(X); X.aviso('Guardada no acervo, na pasta do destino.');
}

/* ================= geração: Maktub Go ================= */
const CSS_GO = `:root{--verde:#1B4332;--dourado:#A88B4A;--creme:#EBE0C4;--papel:#FAF6EC;--texto:#2B2B26;--suave:#6E6A5E;--linha:rgba(168,139,74,.35);--serif:'Cormorant Garamond',Georgia,serif;--sans:'Montserrat',Helvetica,Arial,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
body{background:var(--papel);color:var(--texto);font-family:var(--sans);font-weight:300;line-height:1.7;font-size:15px;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}.wrap{max-width:880px;margin:0 auto;padding:0 20px}
.barra{background:var(--verde);color:var(--creme);font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.barra .wrap{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:10px;padding-bottom:10px;flex-wrap:wrap}.barra a{color:var(--creme);text-decoration:none}
.capa{background:var(--creme);padding:56px 0 64px;text-align:center}.capa .moldura{border:1px solid var(--dourado);outline:1px solid var(--dourado);outline-offset:6px;padding:48px 24px;margin:0 8px}
.selo{width:190px;height:auto;margin:0 auto 34px}.sub{font-family:var(--serif);font-style:italic;font-size:clamp(24px,4.5vw,32px);color:var(--dourado);margin:-6px 0 20px}
.ornato{width:34px;height:auto;margin:0 auto 14px}.assin{width:240px;height:auto;margin:0 auto}.assin-footer{width:150px;height:auto;margin:0 auto 12px}
.kicker{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--dourado);margin-bottom:14px}
h1{font-family:var(--serif);font-weight:400;font-size:clamp(40px,8vw,62px);line-height:1.1;color:var(--verde);margin-bottom:18px}
.capa .datas{font-size:13px;letter-spacing:.06em;color:var(--suave)}.capa .para{font-family:var(--serif);font-style:italic;font-size:21px;color:var(--verde);margin-top:26px}
.capa .pax{display:block;font-size:13px;font-style:normal;letter-spacing:.2em;text-transform:uppercase;color:var(--dourado);font-family:var(--sans);margin-top:4px}
.carta{padding:56px 0 20px}.carta p{font-family:var(--sans);font-size:13.5px;color:var(--suave);line-height:1.7;max-width:640px;margin:0 auto 16px;text-align:center}
section{padding:56px 0}.titulo-sec{text-align:center;margin-bottom:36px}.titulo-sec .kicker{margin-bottom:8px}
h2{font-family:var(--serif);font-weight:400;font-size:clamp(28px,5vw,38px);color:var(--verde);line-height:1.2}.intro{max-width:620px;margin:14px auto 0;color:var(--suave);font-size:14px}
.seletor{position:sticky;top:0;z-index:40;background:rgba(250,246,236,.96);backdrop-filter:blur(6px);border-bottom:1px solid var(--linha);padding:14px 0}
.seletor .rot{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--dourado);text-align:center;margin-bottom:10px}
.opcoes{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.opt{cursor:pointer;background:#fff;border:1px solid var(--linha);border-radius:4px;padding:12px 14px;text-align:left;font-family:var(--sans);transition:border-color .2s,box-shadow .2s}
.opt .n{font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:var(--dourado)}.opt .t{font-family:var(--serif);font-size:20px;color:var(--verde);line-height:1.2;margin-top:2px}.opt .s{font-size:11.5px;color:var(--suave);margin-top:2px}
.opt[aria-selected="true"]{border:2px solid var(--dourado);box-shadow:0 4px 16px rgba(168,139,74,.18);padding:11px 13px}
.painel{display:none}.painel.ativo{display:block}
.resumo{display:flex;justify-content:center;flex-wrap:wrap;margin:6px auto 0;max-width:720px}
.resumo>div{flex:1 1 25%;min-width:140px;text-align:center;padding:14px 8px;border-left:1px solid var(--linha)}.resumo>div:first-child{border-left:0}
.resumo .l{font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:var(--dourado)}.resumo .v{font-family:var(--serif);font-size:22px;color:var(--verde);line-height:1.25}
.timeline{position:relative;padding-left:34px}.timeline::before{content:"";position:absolute;left:9px;top:6px;bottom:6px;width:1px;background:var(--linha)}
.dia{position:relative;margin-bottom:22px}.dia:last-child{margin-bottom:0}
.dia::before{content:"";position:absolute;left:-30px;top:10px;width:11px;height:11px;border:1px solid var(--dourado);border-radius:50%;background:var(--papel)}.dia.destaque::before{background:var(--dourado)}
.dia .data{font-family:var(--serif);font-style:italic;font-size:26px;color:var(--dourado);line-height:1}.dia .num{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--dourado);margin:10px 0 2px}
.dia h3{font-family:var(--serif);font-weight:500;font-size:24px;color:var(--verde);line-height:1.25}
.card{background:#fff;border:1px solid var(--linha);border-radius:4px;overflow:hidden;margin-bottom:22px}
.card-cab{background:var(--verde);color:var(--creme);padding:14px 22px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
.card-cab .rot{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--dourado)}.card-cab .dt{font-family:var(--serif);font-size:20px}.card-corpo{padding:24px 22px}
.rota{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;text-align:center}.rota .cid{font-family:var(--serif);font-size:24px;color:var(--verde);line-height:1.15}
.rota .hora{font-size:30px;font-weight:500;color:var(--texto);letter-spacing:.02em;margin-top:6px}.rota .hora small{font-size:12px;font-weight:400;color:var(--dourado);margin-left:4px;vertical-align:super}
.rota .leg{font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:var(--suave)}.rota .seta{color:var(--dourado);font-size:22px}
.tags{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:20px}.tag{font-size:12px;border:1px solid var(--linha);border-radius:20px;padding:5px 14px;color:var(--verde);background:var(--papel)}
.galeria{display:flex;gap:6px;overflow-x:auto;scroll-snap-type:x mandatory;background:var(--creme)}.galeria img{flex:0 0 78%;max-width:78%;height:240px;object-fit:cover;scroll-snap-align:start}
.hotel-nome{font-family:var(--serif);font-size:28px;color:var(--verde);line-height:1.2}.hotel-meta{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--dourado);margin:6px 0 14px}.hotel p{color:var(--suave);font-size:14.5px}
.lista{list-style:none;margin-top:16px}.lista li{padding:7px 0 7px 22px;position:relative;border-bottom:1px solid rgba(168,139,74,.15);font-size:14px}.lista li:last-child{border-bottom:0}
.lista li::before{content:"✦";position:absolute;left:0;color:var(--dourado);font-size:11px;top:9px}.nota{font-size:12.5px;color:var(--suave);font-style:italic;margin-top:14px}
.carros{display:grid;gap:12px}.carro{display:block;cursor:pointer}.carro input{position:absolute;opacity:0;pointer-events:none}
.carro-in{background:#fff;border:1px solid var(--linha);border-radius:4px;padding:16px 18px;transition:border-color .2s,box-shadow .2s}
.carro input:checked+.carro-in{border:2px solid var(--dourado);padding:15px 17px;box-shadow:0 4px 16px rgba(168,139,74,.18)}
.carro-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}.grupo{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--dourado)}
.carro-val{font-family:var(--serif);font-size:22px;color:var(--verde);white-space:nowrap}.modelos{font-family:var(--serif);font-size:20px;color:var(--verde);line-height:1.3;margin-top:4px}
.modelos small{font-family:var(--sans);font-size:11px;color:var(--suave)}.carro-desc{font-size:13px;color:var(--suave);margin-top:4px}
.check{background:var(--papel);border-left:3px solid var(--dourado);padding:20px 22px;border-radius:2px;margin-top:22px}.check h4{font-family:var(--serif);font-weight:500;font-size:22px;color:var(--verde);margin-bottom:8px}.check p{font-size:14px;color:var(--suave);margin-bottom:8px}.check p:last-child{margin-bottom:0}
.invest{background:var(--verde);color:var(--creme);padding:60px 0}.invest h2{color:var(--creme)}
.invest-box{max-width:560px;margin:0 auto;border:1px solid var(--dourado);padding:36px 28px;text-align:center}.invest .opnome{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--dourado);margin-bottom:10px}
.parcela{font-family:var(--serif);color:var(--creme);line-height:1.1}.parcela .x{font-size:28px;display:block}.parcela .v{font-size:clamp(38px,10vw,60px);white-space:nowrap}
.valor-leg{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--dourado);margin-top:8px}.avista{margin-top:16px;font-size:13px;color:rgba(235,224,196,.85)}
.precos{margin:6px 0 0;text-align:left}.linha{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 4px;border-bottom:1px solid rgba(168,139,74,.3);text-align:left}
.linha .rot{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--dourado);line-height:1.5}.linha .rot small{display:block;font-size:11px;letter-spacing:.04em;text-transform:none;color:rgba(235,224,196,.7);margin-top:2px}
.linha .val{font-family:var(--serif);font-size:26px;color:var(--creme);white-space:nowrap;text-align:right}.linha.sites .val{font-size:20px;color:rgba(235,224,196,.6);text-decoration:line-through}
.linha.destaque{background:rgba(168,139,74,.14);border:1px solid var(--dourado);border-radius:4px;padding:18px 14px;margin-top:10px}.linha.destaque .val{font-size:34px}
.selo-off{display:inline-block;background:var(--dourado);color:#fff;font-size:10px;letter-spacing:.15em;padding:3px 8px;border-radius:12px;margin-top:6px}
.economia{display:inline-block;margin-top:20px;font-size:12px;letter-spacing:.1em;border:1px solid var(--dourado);padding:6px 16px;border-radius:20px;color:var(--creme)}
.obs-parc{font-size:12px;color:rgba(235,224,196,.7);margin-top:12px;font-style:italic}
.invest .lista{text-align:left;max-width:460px;margin:28px auto 0}.invest .lista li{border-color:rgba(168,139,74,.3);color:var(--creme)}
.urgencia{font-family:var(--serif);font-style:italic;font-size:19px;text-align:center;color:rgba(235,224,196,.85);max-width:560px;margin:34px auto 0;line-height:1.5}
.cta{display:block;max-width:380px;margin:26px auto 0;text-align:center;background:var(--dourado);color:#fff;text-decoration:none;font-size:12px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;padding:18px 24px;border-radius:2px;transition:background .2s}.cta:hover{background:#8f7540}
.cta-leg{text-align:center;font-size:12px;color:rgba(235,224,196,.7);margin-top:10px}
.difs{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.dif{border-top:1px solid var(--dourado);padding-top:16px}.dif h4{font-family:var(--serif);font-weight:500;font-size:21px;color:var(--verde);margin-bottom:4px}.dif p{font-size:13.5px;color:var(--suave)}
.avisos{font-size:12px;color:var(--suave);text-align:center;padding:0 0 30px}.avisos p{margin-bottom:4px}.fecho{text-align:center;padding:10px 0 40px}
footer{background:var(--creme);text-align:center;padding:30px 20px;font-size:11px;letter-spacing:.08em;color:var(--suave)}footer a{color:var(--verde);text-decoration:none}
footer .prop{margin-top:10px;font-size:10.5px;max-width:560px;margin-left:auto;margin-right:auto;line-height:1.6}
.marca-dagua{position:fixed;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;z-index:30}
.marca-dagua span{transform:rotate(-30deg);font-family:var(--serif);font-size:clamp(28px,6vw,56px);color:rgba(27,67,50,.045);white-space:nowrap;letter-spacing:.1em}
@media (min-width:760px){.timeline{padding-left:0}.timeline::before{left:50%}.dia{display:grid;grid-template-columns:1fr 1fr;gap:0 56px}.dia::before{left:calc(50% - 6px)}.dia .data{text-align:right;padding-top:4px}.dia:nth-child(even) .data{order:2;text-align:left}.dia:nth-child(even) .txt{order:1;text-align:right}}
@media (max-width:560px){.difs{grid-template-columns:1fr}.rota .cid{font-size:19px}.rota .hora{font-size:24px}.galeria img{height:200px;flex-basis:86%;max-width:86%}section{padding:44px 0}.opt .t{font-size:17px}.opt .s{display:none}.resumo>div{min-width:100px}.resumo .v{font-size:18px}}
@media print{.seletor,.cta,.cta-leg{display:none}.painel{display:block!important;break-before:page}}`;

function gerar(X) { if (S.modelo === 'corp') return gerarCorp(X); const antes = S; S = autoGo(S); try { return gerarGo(X); } finally { S = antes; } }

function gerarGo(X) {
  const M = MARCA, multi = S.opcoes.length > 1, pax = +S.pessoas || 0;
  const vcs = pax === 1 ? 'você' : 'vocês';
  const painel = (o, i) => {
    const p = precos(o), n = i + 1, nomeOp = o.nome || (multi ? 'Opção ' + n : 'Sua viagem');
    const res = [['Embarque', dCurta(o.embarque)], ['Retorno', dCurta(o.retorno)], ['Viajantes', pax ? pax + (pax === 1 ? ' pessoa' : ' pessoas') : ''], ['Hotelaria', o.hotelaria]].filter(x => x[1] && !(multi && x[0] === 'Viajantes'));
    const dias = o.dias.filter(d => d.titulo);
    const voos = o.voos.filter(v => v.origem || v.destino);
    const hoteis = o.hoteis.filter(x => x.nome);
    const carros = o.carro.opcoes.filter(c => c.grupo);
    let s = '';
    if (multi || res.length) s += `<section><div class="wrap"><div class="titulo-sec"><div class="kicker">${multi ? 'Opção ' + n : 'Sua viagem'}</div><h2>${h(nomeOp)}</h2></div>${res.length ? `<div class="resumo">${res.map(([l, v]) => `<div><div class="l">${l}</div><div class="v">${h(v)}</div></div>`).join('')}</div>` : ''}</div></section>`;
    if (dias.length) s += `<section style="padding-top:0"><div class="wrap"><div class="titulo-sec"><div class="kicker">Sugestão de roteiro</div><h2>Os dias da viagem</h2></div><div class="timeline">${dias.map((d, j) => `<article class="dia${d.destaque ? ' destaque' : ''}"><div class="data">${ddmm(d.data)}</div><div class="txt"><div class="num">Dia ${j + 1}</div><h3>${h(d.titulo)}</h3></div></article>`).join('')}</div></div></section>`;
    if (voos.length) s += `<section style="background:#fff"><div class="wrap"><div class="titulo-sec"><div class="kicker">Voos</div><h2>Como ${vcs} ${pax === 1 ? 'chega' : 'chegam'}</h2></div>${voos.map(v => `<div class="card"><div class="card-cab"><span class="rot">${h(v.rotulo)}</span><span class="dt">${dLonga(v.data)}</span></div><div class="card-corpo"><div class="rota"><div><div class="leg">Saída</div><div class="cid">${h(v.origem)}</div><div class="hora">${h(v.saida)}</div></div><div class="seta">→</div><div><div class="leg">Chegada</div><div class="cid">${h(v.destino)}</div><div class="hora">${h(v.chegada)}${v.mais1 ? '<small>+1</small>' : ''}</div></div></div><div class="tags">${[v.periodo, v.tipo].filter(Boolean).map(t => `<span class="tag">${h(t)}</span>`).join('')}</div></div></div>`).join('')}<p class="nota" style="text-align:center">${o.bagagem ? h(o.bagagem) + '<br>' : ''}Horários sujeitos a alteração pela companhia aérea.</p></div></section>`;
    if (carros.length) s += `<section><div class="wrap"><div class="titulo-sec"><div class="kicker">No destino</div><h2>Aluguel de carro</h2>${o.carro.intro ? `<p class="intro">${h(o.carro.intro)} Escolham o carro e o valor total da viagem aparece logo abaixo.</p>` : ''}</div><div class="carros">${carros.map((c, j) => `<label class="carro"><input type="radio" name="carro${n}" data-preco="${num(c.valor)}" data-nome="${h(c.grupo + (c.modelos ? ': ' + c.modelos : ''))}"><div class="carro-in"><div class="carro-top"><span class="grupo">${h(c.grupo)}</span><span class="carro-val">${brl(num(c.valor))}</span></div>${c.modelos ? `<div class="modelos">${h(c.modelos)} <small>ou similar</small></div>` : ''}${c.desc ? `<div class="carro-desc">${h(c.desc)}</div>` : ''}</div></label>`).join('')}<label class="carro"><input type="radio" name="carro${n}" data-preco="0" data-nome="Sem carro" checked><div class="carro-in"><div class="carro-top"><span class="grupo">Seguir sem carro</span><span class="carro-val">R$ 0,00</span></div></div></label></div>
      <div class="check"><h4>Importante sobre a locação</h4><p>Aqui está incluso somente o aluguel do veículo.</p><p>A caução é feita diretamente no balcão da locadora, na retirada do carro, e a Maktub não tem como intermediar esse processo. Levem a CNH válida e um cartão de crédito em nome do condutor.</p><p>Combustível, lavagem, limpeza, pedágios, multas e demais taxas cobradas pela locadora são de responsabilidade do condutor e acertados direto com a locadora.</p></div></div></section>`;
    if (hoteis.length) s += `<section${carros.length ? ' style="background:#fff"' : ''}><div class="wrap"><div class="titulo-sec"><div class="kicker">Hotelaria</div><h2>Onde ${vcs} ${pax === 1 ? 'descansa' : 'descansam'}</h2></div>${hoteis.map(x => { const fotos = linhas(x.fotos), nt = noites(x.entrada, x.saida); const meta = [x.cidade, x.estrelas ? x.estrelas + ' estrelas' : '', nt ? nt + (nt === 1 ? ' noite' : ' noites') : '', x.entrada && x.saida ? ddmm(x.entrada) + ' a ' + ddmm(x.saida) : ''].filter(Boolean).join(' · ');
      return `<div class="card hotel">${fotos.length ? `<div class="galeria">${fotos.map(u => `<img src="${h(u)}" alt="${h(x.nome)}" loading="lazy">`).join('')}</div>` : ''}<div class="card-corpo"><div class="hotel-nome">${h(x.nome)}</div>${meta ? `<div class="hotel-meta">${h(meta)}</div>` : ''}${x.descricao ? `<p>${h(x.descricao)}</p>` : ''}${linhas(x.itens).length ? `<ul class="lista">${linhas(x.itens).map(l => `<li>${h(l)}</li>`).join('')}</ul>` : ''}${x.nota ? `<p class="nota">${h(x.nota)}</p>` : ''}</div></div>`; }).join('')}</div></section>`;
    // investimento
    const rotPax = `${multi ? 'Opção ' + n + ' · v' : 'V'}alor para ${pax} ${pax === 1 ? 'pessoa' : 'pessoas'}`;
    let box = `<div class="opnome">${rotPax}</div>`;
    if (carros.length) {
      box += `<div class="precos">${p.sites ? `<div class="linha sites"><div class="rot">Nos sites de viagem</div><div class="val">${brl(p.sites)}</div></div>` : ''}
        <div class="linha"><div class="rot">${hoteis.length ? 'Voos + hotelaria' : 'Voos'}<small>em até ${p.parc}x de ${brl(p.vparc)} sem juros</small></div><div class="val">${brl(p.cartao)}</div></div>
        <div class="linha"><div class="rot">Aluguel de carro<small data-cnome>Sem carro</small></div><div class="val" data-cval>R$ 0,00</div></div>
        <div class="linha destaque"><div class="rot">Total da viagem</div><div class="val" data-total>${brl(p.cartao)}</div></div></div>
        <p class="obs-parc" data-obs hidden>O parcelamento do aluguel de carro é confirmado pelo nosso time no fechamento.</p>`;
    } else if (p.sites) {
      box += `<div class="precos"><div class="linha sites"><div class="rot">Nos sites de viagem</div><div class="val">${brl(p.sites)}</div></div>
        <div class="linha${p.pix ? '' : ' destaque'}"><div class="rot">Com a Maktub<small>no cartão, sem juros</small></div><div class="val">${p.parc > 1 ? p.parc + 'x de ' + brl(p.vparc) : brl(p.cartao)}</div></div>
        ${p.pix ? `<div class="linha destaque"><div class="rot">Com a Maktub<small>no Pix</small><span class="selo-off">${String(p.pixP).replace('.', ',')}% OFF</span></div><div class="val">${brl(p.pix)}</div></div>` : ''}</div>
        ${p.economia ? `<div class="economia">${p.pix ? 'No Pix, ' : ''}${vcs} ${pax === 1 ? 'economiza' : 'economizam'} ${brl(p.economia)} em relação aos sites</div>` : ''}`;
    } else {
      box += `<div class="parcela"><span class="x">${p.parc}x de </span><span class="v">${brl(p.vparc)}</span></div><div class="valor-leg">sem juros</div>${p.pix ? `<p class="avista">ou ${brl(p.pix)} no Pix, com ${String(p.pixP).replace('.', ',')}% de desconto</p>` : ''}`;
    }
    const inc = linhas(o.incluso);
    box += inc.length || carros.length ? `<ul class="lista">${inc.map(l => `<li>${h(l)}</li>`).join('')}${carros.length ? `<li data-licarro hidden>Aluguel de carro conforme a opção escolhida</li>` : ''}</ul>` : '';
    s += `<section class="invest" data-op="${n}" data-base="${p.cartao}"><div class="wrap"><div class="titulo-sec"><div class="kicker" style="color:var(--dourado)">Investimento</div><h2>${h(nomeOp)}</h2></div><div class="invest-box">${box}</div>
      <p class="urgencia">Tarifas aéreas mudam a qualquer momento e podem ficar indisponíveis nas próximas horas. Se essa viagem faz sentido pra ${vcs}, o melhor momento é agora.</p>
      <a class="cta" data-cta="${n}" href="#" target="_blank" rel="noopener">${h(o.cta || 'Quero seguir com essa viagem')}</a><p class="cta-leg">Você fala direto com o nosso time pelo WhatsApp.</p></div></section>`;
    return `<div class="painel${i === 0 ? ' ativo' : ''}" id="op${n}">${s}</div>`;
  };
  const avisos = [`Proposta inicial com valores de referência consultados em ${S.consulta ? S.consulta.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR')}.`];
  if (S.opcoes.some(o => o.dias.some(d => d.titulo))) avisos.push('O roteiro apresentado é uma sugestão e não está incluso no investimento acima.');
  avisos.push(...linhas(S.avisos));
  const nomes = {}; S.opcoes.forEach((o, i) => { nomes[i + 1] = multi ? `Opção ${i + 1}${o.nome ? ', ' + o.nome : ''}` : ''; });
  const titulo = [S.titulo, S.sub].filter(Boolean).join(' ').replace(/[,.]\s*$/, '') || 'Proposta';
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${h(titulo)} · Maktub Go</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet"><style>${CSS_GO}</style></head><body>
<div class="marca-dagua" aria-hidden="true"><span>Maktub Go · Documento exclusivo</span></div>
<div class="barra"><div class="wrap"><span>Alfaiataria de Viagens</span><span><a href="mailto:${EMAIL}">${EMAIL}</a> &nbsp;·&nbsp; <a href="https://wa.me/${ZAP}">${ZAP_TXT}</a></span></div></div>
<header class="capa"><div class="wrap"><div class="moldura"><img class="selo" src="${M.selo}" alt="Maktub Go, Alfaiataria de Viagens e Experiências">
<div class="kicker">${h(S.kicker)}</div><h1>${h(S.titulo)}</h1>${S.sub ? `<p class="sub">${h(S.sub)}</p>` : ''}${S.linha ? `<p class="datas">${h(S.linha)}</p>` : ''}
${S.para ? `<p class="para">${S.opcoes.some(o => o.hoteis.some(x => x.nome) || o.dias.some(d => d.titulo)) ? 'Desenhada para' : 'Para'} ${h(S.para)}${pax ? `<span class="pax">${pax} ${pax === 1 ? 'passageiro' : 'passageiros'}</span>` : ''}</p>` : ''}</div></div></header>
${S.carta ? `<div class="carta"><div class="wrap">${linhas(S.carta).map(l => `<p>${h(l)}</p>`).join('')}</div></div>` : ''}
${multi ? `<div class="seletor"><div class="wrap"><div class="rot">Escolha o seu caminho</div><div class="opcoes" role="tablist">${S.opcoes.map((o, i) => `<button class="opt" role="tab" aria-selected="${i === 0}" data-op="${i + 1}"><div class="n">Opção ${i + 1}</div><div class="t">${h(o.nome || 'Opção ' + (i + 1))}</div>${o.resumo ? `<div class="s">${h(o.resumo)}</div>` : ''}</button>`).join('')}</div></div></div>` : ''}
${S.opcoes.map(painel).join('')}
<section><div class="wrap"><div class="titulo-sec"><img class="ornato" src="${M.ornato}" alt=""><div class="kicker">Por que a Maktub</div><h2>Cuidamos de cada detalhe</h2>${S.porque ? `<p class="intro">${h(S.porque)}</p>` : ''}</div>
<div class="difs"><div class="dif"><h4>Time com ${vcs}</h4><p>Um time inteiro acompanhando a viagem, do planejamento ao retorno.</p></div><div class="dif"><h4>Suporte humanizado</h4><p>${pax === 1 ? 'Você fala' : 'Vocês falam'} sempre com uma pessoa, do embarque ao retorno.</p></div><div class="dif"><h4>Pós-venda dedicado</h4><p>Check-in, documentos e ajustes resolvidos por nós.</p></div><div class="dif"><h4>Roteiro sob medida</h4><p>Cada dia desenhado junto com ${vcs}, no ritmo de ${vcs}.</p></div></div></div></section>
<div class="avisos"><div class="wrap">${avisos.map(a => `<p>${h(a)}</p>`).join('')}</div></div>
<div class="fecho"><img class="assin" src="${M.assin}" alt="Seu destino começa aqui."></div>
<footer><img class="assin-footer" src="${M.rodape}" alt="Maktub Go"><div><a href="mailto:${EMAIL}">${EMAIL}</a> &nbsp;·&nbsp; <a href="https://wa.me/${ZAP}">${ZAP_TXT}</a> &nbsp;·&nbsp; @maktubgo_</div>
<p class="prop">Documento exclusivo Maktub Go, de uso restrito ${pax === 1 ? 'ao viajante indicado' : 'aos viajantes indicados'}. Proibida a reprodução ou distribuição a terceiros.</p></footer>
<script>
var NOMES=${JSON.stringify(nomes)},QUEM=${JSON.stringify(S.nomeZap || '')};
function brl(v){return 'R$ '+v.toFixed(2).replace('.',',').replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.');}
function atualizar(sec){var n=sec.dataset.op,base=parseFloat(sec.dataset.base)||0,s=document.querySelector('input[name="carro'+n+'"]:checked'),extra='';
 if(s){var p=parseFloat(s.dataset.preco),tem=p>0;sec.querySelector('[data-cnome]').textContent=s.dataset.nome;sec.querySelector('[data-cval]').textContent=brl(p);sec.querySelector('[data-total]').textContent=brl(base+p);sec.querySelector('[data-obs]').hidden=!tem;var li=sec.querySelector('[data-licarro]');if(li)li.hidden=!tem;extra=tem?' com o carro '+s.dataset.nome+'. Total: '+brl(base+p)+'.':', sem aluguel de carro.';}
 var msg='Olá, Maktub!'+(QUEM?' Aqui é '+QUEM+'.':'')+' Vi a proposta da viagem e quero seguir'+(NOMES[n]?' com a '+NOMES[n]:'')+(extra||'.');
 sec.querySelector('[data-cta]').href='https://wa.me/${ZAP}?text='+encodeURIComponent(msg);}
document.querySelectorAll('.invest[data-op]').forEach(function(sec){atualizar(sec);});
document.querySelectorAll('input[type=radio][name^="carro"]').forEach(function(i){i.addEventListener('change',function(){atualizar(i.closest('.painel').querySelector('.invest'));});});
document.querySelectorAll('.opt').forEach(function(b){b.addEventListener('click',function(){var op=b.dataset.op;document.querySelectorAll('.opt').forEach(function(x){x.setAttribute('aria-selected',x.dataset.op===op?'true':'false');});document.querySelectorAll('.painel').forEach(function(p){p.classList.toggle('ativo',p.id==='op'+op);});window.scrollTo({top:document.querySelector('.seletor').offsetTop,behavior:'smooth'});});});
</script></body></html>`;
}

/* ================= geração: Maktub Corporativo ================= */
function gerarCorp() {
  const filtra = (l) => (l || []).filter(v => v.ocod || v.dcod), pax = +S.pessoas || 1;
  const OPS = [{ nome: S.nome1 || '', voos: filtra(S.voos), de: num(S.de), por: num(S.por) }].concat((S.extras || []).map(o => ({ nome: o.nome || '', voos: filtra(o.voos), de: num(o.de), por: num(o.por) })));
  const multi = OPS.length > 1, GO = S.marca === 'Maktub Go';
  const voos = OPS[0].voos;
  const ida = voos[0], vol = voos[1];
  const trecho = ida ? `${(ida.ocod || '').toUpperCase()} ${vol ? '⇄' : '→'} ${(ida.dcod || '').toUpperCase()}` : '';
  const cidade = (v, q) => (q === 'o' ? v.onome : v.dnome) || '';
  const titDe = (vs) => { const a = vs[0], b = vs[1]; return S.rota ? h(S.rota).toUpperCase() : a ? `${h(a.onome).toUpperCase() || h(a.ocod)} ${b ? '⇄' : '→'} ${h(a.dnome).toUpperCase() || h(a.dcod)}` : 'Cotação'; };
  const tit = S.rota ? h(S.rota).toUpperCase() : ida ? `${h(cidade(ida, 'o')).toUpperCase() || h(ida.ocod)} ${vol ? '⇄' : '→'} ${h(cidade(ida, 'd')).toUpperCase() || h(ida.dcod)}` : 'Cotação';
  const val = S.validade ? S.validade.split('-').reverse().join('/') : '';
  const zapTxt = (n) => `Olá, Maktub! Sobre a cotação ${S.codigo || ''}${S.passageiro ? ' de ' + S.passageiro : ''}: quero seguir com ${n ? 'a Opção ' + n : 'a emissão'}.`;
  const resumo = (o, n) => `<div class="resumo"><div class="rot">${n ? 'Opção ' + n : 'Resumo da cotação'}</div><div class="p">VALOR TOTAL · ${pax} ${pax === 1 ? 'PASSAGEIRO' : 'PASSAGEIROS'}</div>${o.de > o.por ? `<div class="de">De <s>${brl(o.de)}</s></div>` : ''}<div class="por">${o.de > o.por ? 'Por ' : ''}${brl(o.por)}</div><div class="forma">${h(S.forma)}</div>${o.de > o.por ? `<div class="eco">Economia de ${brl(o.de - o.por)}</div>` : ''}<hr><small>Tarifas e disponibilidade confirmadas somente no momento da emissão.</small></div>
<a class="cta" href="https://wa.me/${ZAP}?text=${encodeURIComponent(zapTxt(n))}" target="_blank" rel="noopener">${n ? 'QUERO A OPÇÃO ' + n : 'FALE COM O ESPECIALISTA'} · WHATSAPP ${ZAP_TXT}</a>`;
  const dataCab = (iso) => { const d = dt(iso); return d ? `${SEMANA[d.getDay()]} · ${iso.split('-').reverse().join('/')}`.toUpperCase() : ''; };
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${h(S.passageiro ? 'Cotação para ' + String(S.passageiro).trim().split(/\s+/)[0] : (S.codigo || 'Cotação'))} · ${GO ? 'Maktub Go' : 'Maktub Corporativo'}</title>
<style>:root{--v:#1B4332;--v2:#245a3b;--d:#A88B4A;--c:#F3F1EA;--b:#F3EAD2;--t:#1f2a24;--s:#5b625d;--l:#d9d2bf}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--c);color:var(--t);font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5}
.w{max-width:760px;margin:0 auto;padding:0 18px}header{background:var(--v);color:#fff;padding:24px 0}header .w{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start}
.marca{font-size:22px;font-weight:700;letter-spacing:.06em;color:#EBE0C4}.marca b{color:var(--d)}.slog{color:#EBE0C4;margin-top:4px}.cont{text-align:right;color:#EBE0C4;font-size:13px}.cont a{color:#EBE0C4;text-decoration:none}.cont b{display:block;font-size:15px;margin-top:4px}
.faixa{background:var(--v2);color:#fff;padding:18px 0}.faixa .w{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.faixa .l{font-size:10px;letter-spacing:.12em;color:var(--d);font-weight:700}.faixa .v{font-weight:700;font-size:13.5px;margin-top:4px}
.caixa{background:#fff;border:1px solid var(--l);border-radius:8px;padding:16px 18px;margin-top:18px}.rot{font-size:11px;letter-spacing:.12em;color:var(--d);font-weight:700;text-transform:uppercase}
h1{font-size:24px;color:var(--v);letter-spacing:.02em;margin-top:26px}.subt{color:var(--s);font-size:13px}.tit{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap}.tit .r{text-align:right;color:var(--s);font-size:12px;font-weight:700;letter-spacing:.06em}
.voo{background:#fff;border:1px solid var(--l);border-radius:8px;overflow:hidden;margin-top:14px}.voo .cab{background:var(--v);color:#fff;display:flex;justify-content:space-between;padding:10px 16px;font-weight:700;font-size:12.5px;letter-spacing:.06em}
.voo .corpo{padding:18px 16px;display:grid;grid-template-columns:1fr auto 1fr auto;gap:10px;align-items:start}.hora{font-size:28px;font-weight:700;color:var(--v)}.aer{color:var(--s);font-weight:700;font-size:13px}.seta{color:var(--d);font-size:22px;padding-top:4px}.cia{font-weight:700;color:var(--v);font-size:16px;padding-top:6px}
.chips{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}.chip{background:var(--b);border-radius:16px;padding:5px 14px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--v)}
.caixa.obs{background:var(--b);border-color:var(--d)}.print img{max-width:100%;display:block;margin-top:10px;border-radius:4px}.resumo{background:var(--v);color:#fff;border-radius:10px;padding:22px 18px;margin-top:20px}.resumo .p{font-size:11px;letter-spacing:.1em;font-weight:700;margin-top:8px;color:#EBE0C4}
.de{margin-top:12px;color:#EBE0C4}.de s{text-decoration-color:var(--d)}.por{font-size:32px;font-weight:800;margin-top:4px}.forma{font-weight:700;color:#EBE0C4;font-size:13px}.resumo hr{border:0;border-top:1px solid var(--d);margin:14px 0 10px}.resumo small{color:#EBE0C4;font-size:11.5px}
.opcao{margin-top:34px;padding-top:18px;border-top:2px solid var(--d);color:var(--s);font-size:13px;font-weight:700}.opcao span{display:inline-block;background:var(--d);color:#fff;border-radius:4px;padding:3px 10px;margin-right:10px;font-size:11px;letter-spacing:.12em}
header.go{background:#F3EAD2;color:var(--v)}header.go .slog,header.go .cont,header.go .cont a{color:var(--v)}header.go .marca{color:var(--v)}.logo{height:58px;display:block}
.abas{margin-top:22px}.abas .lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:8px}.aba{font:inherit;text-align:left;cursor:pointer;background:#fff;border:1px solid var(--l);border-radius:8px;padding:12px 14px;color:var(--t)}.aba .n{display:block;font-size:11px;letter-spacing:.12em;font-weight:700;color:var(--d);text-transform:uppercase}.aba .t{display:block;font-size:12.5px;color:var(--s);margin-top:2px;min-height:18px}.aba .v{display:block;font-size:19px;font-weight:800;color:var(--v);margin-top:4px}.aba[aria-selected="true"]{background:var(--v);border-color:var(--v)}.aba[aria-selected="true"] .t{color:#EBE0C4}.aba[aria-selected="true"] .v{color:#fff}
.ola{margin-top:20px;font-size:17px;line-height:1.45;color:var(--v)}.ola b{font-weight:700}
.eco{display:inline-block;margin-top:10px;border:1px solid var(--d);border-radius:20px;padding:4px 14px;font-size:12.5px;font-weight:700;color:#EBE0C4}
.cta{display:block;text-align:center;background:var(--d);color:var(--v);font-weight:800;letter-spacing:.08em;padding:16px;border-radius:8px;margin-top:16px;text-decoration:none;font-size:13px}
.cond{color:var(--s);font-size:11.5px;margin:16px 0 26px}footer{background:var(--v);color:#EBE0C4;padding:22px 0}footer .w{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}footer b{display:block;letter-spacing:.06em}footer .g{color:var(--d);font-size:12px}footer .r{text-align:right;font-size:12px}
@media (max-width:560px){.faixa .w{grid-template-columns:1fr 1fr}.voo .corpo{grid-template-columns:1fr auto 1fr}.cia{grid-column:1/-1;padding:0}.cont{text-align:left}}</style></head><body>
<header class="${GO ? 'go' : ''}"><div class="w"><div>${GO && MARCA && MARCA.rodape ? `<img class="logo" src="${MARCA.rodape}" alt="Maktub Go">` : `<div class="marca">MAKTUB <b>${GO ? 'GO' : 'CORPORATIVO'}</b></div>`}<div class="slog">${GO ? 'Alfaiataria de Viagens' : 'Viagens a trabalho, resolvidas.'}</div></div><div class="cont"><a href="mailto:${EMAIL}">${EMAIL}</a><b><a href="https://wa.me/${ZAP}">${ZAP_TXT}</a></b></div></div></header>
<div class="faixa"><div class="w">${S.codigo ? `<div><div class="l">COTAÇÃO</div><div class="v">${h(S.codigo)}</div></div>` : ''}<div><div class="l">PASSAGEIRO</div><div class="v">${S.passageiro ? h(S.passageiro) + ' · ' : ''}${pax} ${pax === 1 ? 'pessoa' : 'pessoas'}</div></div><div><div class="l">TRECHO</div><div class="v">${h(trecho)}</div></div><div><div class="l">VALIDADE</div><div class="v">${val}</div></div></div></div>
<div class="w">
${S.passageiro ? `<div class="ola"><b>${h(String(S.passageiro).trim().split(/\s+/)[0])}, ${multi ? `separamos ${['', 'uma', 'duas', 'três'][OPS.length] || OPS.length} opções` : 'separamos esta cotação'} para a sua viagem${S.destino ? ' a ' + h(S.destino) : ''}.</b>${multi ? ' Toque em cada uma para comparar.' : ''}</div>` : ''}
${val ? `<div class="caixa"><div class="rot">Validade da tarifa</div><div>Cotação válida somente em ${val}. Após essa data, os valores precisam ser consultados novamente.</div></div>` : ''}
${multi ? `<div class="abas" role="tablist"><div class="rot">Escolha a sua opção</div><div class="lista">${OPS.map((o, i) => `<button type="button" class="aba" role="tab" aria-selected="${i === 0}" data-op="${i + 1}"><span class="n">Opção ${i + 1}</span><span class="t">${h(o.nome)}</span><span class="v">${brl(o.por)}</span></button>`).join('')}</div></div>` : ''}
${OPS.map((o, i) => { const vs = o.voos, b = vs[1], n = i + 1;
  return `${multi ? `<section class="op" data-op="${n}"${i ? ' hidden' : ''}><div class="opcao"><span>OPÇÃO ${n}</span>${o.nome ? h(o.nome) : ''}</div>` : ''}<div class="tit"><div><h1>${titDe(vs)}</h1><div class="subt">${[h(S.cia), b ? 'ida e volta' : 'só ida', vs.every(v => v.tipo === 'Direto') ? 'voos diretos' : 'com conexão'].filter(Boolean).join(' · ')}</div></div><div class="r">${vs.slice(0, 2).map(v => `${h(v.rotulo).toUpperCase()}: ${h(v.ocod).toUpperCase()} → ${h(v.dcod).toUpperCase()}`).join('<br>')}</div></div>
${vs.map(v => `<div class="voo"><div class="cab"><span>${h(v.rotulo).toUpperCase()}${paxTrecho(v, pax) ? ` · ${paxTrecho(v, pax)} ${paxTrecho(v, pax) === 1 ? 'PASSAGEIRO' : 'PASSAGEIROS'}` : ''}</span><span>${dataCab(v.data)}</span></div><div class="corpo"><div><div class="hora">${h(v.saida)}</div><div class="aer">${h(v.ocod).toUpperCase()} · ${h(v.onome)}</div></div><div class="seta">→</div><div><div class="hora">${h(v.chegada)}${v.mais1 ? '<sup style="font-size:13px;color:var(--d);margin-left:3px">+1</sup>' : ''}</div><div class="aer">${h(v.dcod).toUpperCase()} · ${h(v.dnome)}</div></div><div class="cia">${h(S.cia)}</div><div class="chips"><span class="chip">${h(v.tipo)}</span></div></div></div>`).join('')}
${multi ? resumo(o, n) + '</section>' : ''}`; }).join('')}
${String(S.obs || '').trim() ? `<div class="caixa obs"><div class="rot">Observação</div><div style="font-weight:700;color:var(--v)">${h(String(S.obs).trim()).replace(/\n/g, '<br>')}</div></div>` : ''}
${S.bagagem ? `<div class="caixa"><div class="rot">Bagagem incluída</div><div style="font-weight:700">${h(S.bagagem)}</div></div>` : ''}
${S.print ? `<div class="caixa print"><div class="rot">Valor no site ${S.cia ? 'da ' + h(S.cia) : 'da companhia'}</div><img src="${S.print}" alt="Valor no site da companhia"></div>` : ''}
${multi ? '' : resumo(OPS[0], 0)}
<p class="cond">${h(S.bagagem ? 'Inclui ' + S.bagagem.charAt(0).toLowerCase() + S.bagagem.slice(1) + '. ' : '')}${h(S.rodape)}</p></div>
<footer><div class="w"><div><b>${GO ? 'MAKTUB GO' : 'MAKTUB CORPORATIVO'}</b><span class="g">${GO ? 'Alfaiataria de Viagens' : 'Viagens a trabalho, resolvidas.'}</span></div><div class="r">${EMAIL} · ${ZAP_TXT}<br>${S.codigo ? `<span class="g">Cotação ${h(S.codigo)}</span>` : ''}</div></div></footer>${multi ? `<script>document.querySelectorAll('.aba').forEach(function(b){b.onclick=function(){var n=b.dataset.op;document.querySelectorAll('.aba').forEach(function(x){x.setAttribute('aria-selected',x===b)});document.querySelectorAll('.op').forEach(function(s){s.hidden=s.dataset.op!==n});var a=document.querySelector('.abas');if(a)window.scrollTo({top:a.offsetTop-10,behavior:'smooth'})}})</script>` : ''}</body></html>`;
}
// usado em testes e para gerar a partir de dados salvos
export function gerarHTML(dados) { const antes = S; S = dados; try { return gerar({}); } finally { S = antes; } }
export { NOVO_GO, NOVO_CORP };

/* ================= cotação rápida: print + valor, vira imagem para o WhatsApp ================= */
/* cotação rápida: mesmo visual da corporativa (voos, bagagem, valor total), em imagem para o WhatsApp ou em link.
   A economia só aparece quando faz sentido: liga sozinha a partir de 10% abaixo do site, e dá para ligar ou desligar. */
const ECO_MIN = 0.10;
const RAP_BAGAGEM = '1 item pessoal + 1 mala de cabine de até 10 kg por passageiro';
const RAP_RODAPE = 'Taxas inclusas. Alterações e cancelamentos têm custo e devem ser solicitados à Maktub. Tarifa sujeita à confirmação no momento da emissão. Horários locais. Check-in realizado por nossa equipe.';
const ecoAuto = () => { const a = num(S.de), b = num(S.por); return a > b && b > 0 && (a - b) / a >= ECO_MIN; };
const mostraEco = () => { const a = num(S.de), b = num(S.por); if (!(a > b && b > 0)) return false; return S.eco === true || S.eco === false ? S.eco : ecoAuto(); };
const parcTxt = () => { const np = String(S.parcelas || '').trim(), por = num(S.por); return /^\d{1,2}$/.test(np) && +np > 1 ? `${+np}x de ${brl(por / +np)} sem juros` : np; };
const rapVoos = () => (S.voos || []).filter(v => v.ocod);
const VOO_RAP = () => ({ rotulo: '', data: '', ocod: '', onome: '', saida: '', dcod: '', dnome: '', chegada: '', tipo: 'Direto', duracao: '', pax: '' });
// passageiros de um trecho só aparecem quando são diferentes do total da cotação
const paxTrecho = (v, total) => { const n = parseInt(v && v.pax) || 0; return n > 0 && n !== total ? n : 0; };
// rótulos automáticos: Ida, Volta (ou Volta 1, Volta 2 quando a volta é em datas diferentes), Trecho N. O que foi digitado à mão fica.
function rotular(vs) {
  const ori = vs[0] && vs[0].ocod, voltas = vs.filter((v, i) => i && ori && v.dcod === ori), nv = voltas.length;
  vs.forEach((v, i) => { if (v._rotM) return; v.rotulo = i === 0 ? 'Ida' : voltas.includes(v) ? (nv > 1 ? 'Volta ' + (voltas.indexOf(v) + 1) : 'Volta') : vs.length === 2 ? 'Volta' : 'Trecho ' + (i + 1); });
}
function rapRota() { const v = rapVoos()[0]; if (!v) return ''; const a = cidadeDe(v.ocod) || v.onome || v.ocod, b = cidadeDe(v.dcod) || v.dnome || v.dcod; return `${a} ${rapVoos().length > 1 ? '⇄' : '→'} ${b}`; }
// a rápida vira uma cotação corporativa de uma opção para gerar o link
function rapParaCorp() {
  const v0 = rapVoos()[0];
  return { modelo: 'corp', marca: S.marca, codigo: '', passageiro: S.cliente || '', pessoas: S.pessoas || '1', validade: hoje(), cia: S.cia || '', rota: rapRota(),
    destino: v0 ? (cidadeDe(v0.dcod) || v0.dnome || '') : '', voos: rapVoos(), bagagem: S.bagagem || '', print: mostraEco() ? (S.prints[0] || '') : '',
    de: mostraEco() ? S.de : '', por: S.por, forma: [S.forma, parcTxt() ? 'ou ' + parcTxt() : ''].filter(Boolean).join(' · '), obs: S.obs || '', rodape: RAP_RODAPE };
}
function editorRapida(P, X) {
  const { $ } = X;
  if (!S.voos) S.voos = []; if (!S.prints) S.prints = [];
  if (S.pessoas === undefined) S.pessoas = '1'; if (S.bagagem === undefined) S.bagagem = RAP_BAGAGEM;
  const vs = rapVoos(), paxTot = Math.max(1, parseInt(S.pessoas) || 1);
  const listaVoos = () => { const l = rapVoos(), tot = Math.max(1, parseInt(S.pessoas) || 1); return l.length ? l.map(v => { const n = paxTrecho(v, tot); return `<div><b>${h(v.rotulo)}</b> ${ddmm(v.data)} · ${h(v.ocod)} ${h(v.saida)} → ${h(v.dcod)} ${h(v.chegada)} · ${h(v.tipo)}${n ? ` · ${n} ${n === 1 ? 'passageiro' : 'passageiros'}` : ''}</div>`; }).join('') : 'Sem voos ainda. Cole a tela acima ou digite à mão abaixo.'; };
  const avisoEco = () => { const a = num(S.de), b = num(S.por); if (!a || !b) return ''; if (b >= a) return '<div class="config" style="margin:4px 0">O valor da Maktub não está abaixo do site. A cotação sai só com o valor, sem comparação.</div>';
    const pc = Math.round((a - b) / a * 100); return `<label class="fc" style="margin:4px 0"><input type="checkbox" id="rpEcoCk" ${mostraEco() ? 'checked' : ''}><span>Mostrar a comparação com o site (economia de ${brl(a - b)}, ${pc}%)${ecoAuto() ? '' : '. Economia pequena: sugerimos deixar desligado'}</span></label>`; };
  P.innerHTML = `<button class="voltar" id="voltar">‹ Cotações</button>
    <h1 class="titulo" style="margin-top:6px">Cotação <em>rápida</em></h1>${faixaCard(X)}
    <div class="sub">Cole a tela da companhia e digite o valor. Sai no mesmo visual da corporativa: voos, bagagem e valor total, em imagem ou em link.</div>
    <form class="form" id="fRap" autocomplete="off" onsubmit="return false">
      ${caixaColar('Copie o print e toque em Colar print, ou cole o texto da tela. Voos, paradas e valor do site vêm sozinhos.', 'ou curto: 02/12 GIG 12:20 SCL 17:00 direto · site 2.100 maktub 1.700')}
      <button type="button" class="zap" id="rpColar" style="width:100%">Preencher</button>
      <div class="config" style="margin:6px 0" id="rpLista">${listaVoos()}</div>${vs.length ? '<button type="button" id="rpLimpa" style="background:none;border:0;color:var(--tinta-3);text-decoration:underline;font:inherit;font-size:12px;padding:0">tirar voos</button>' : ''}
      ${dobra('rpVoosD', S.voos.length ? `Ajustar voos ou incluir trecho (${S.voos.length})` : 'Digitar voo à mão', `${S.voos.map((v, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira('voos#' + j)}
        ${duas(inp(`voos.${j}.rotulo`, 'Rótulo', 'text', 'data-rot="1" placeholder="Ida, Volta 1, Volta 2"'), inp(`voos.${j}.data`, 'Data', 'date'))}
        ${duas(inp(`voos.${j}.ocod`, 'Origem (código)', 'text', 'placeholder="GIG" maxlength="3" autocapitalize="characters" style="text-transform:uppercase"'), inp(`voos.${j}.saida`, 'Saída', 'time'))}
        ${duas(inp(`voos.${j}.dcod`, 'Destino (código)', 'text', 'placeholder="SCL" maxlength="3" autocapitalize="characters" style="text-transform:uppercase"'), inp(`voos.${j}.chegada`, 'Chegada', 'time'))}
        ${duas(sel(`voos.${j}.tipo`, 'Tipo', ['Direto', '1 conexão', '2 conexões']), inp(`voos.${j}.pax`, 'Passageiros neste trecho', 'text', `inputmode="numeric" placeholder="${paxTot} (todos)"`))}</div>`).join('')}
        <button type="button" class="sec" id="rpMais" style="width:100%;margin-top:6px">${S.voos.length ? '+ Trecho (já vem com a rota, só ajustar data e horário)' : '+ Voo'}</button>`)}
      <div class="duas-col">${inp('cliente', 'Passageiro', 'text', 'placeholder="Victor Santiago"')}${inp('pessoas', 'Passageiros', 'text', 'inputmode="numeric"')}</div>
      <div class="duas-col">${inp('cia', 'Companhia', 'text', 'placeholder="LATAM"')}${sel('marca', 'Marca', ['Maktub Go', 'Maktub Corporativo'])}</div>
      ${inp('bagagem', 'Bagagem incluída')}
      <div class="duas-col">${inp('por', 'Valor total com a Maktub', 'num', 'placeholder="1.700,00"')}${inp('de', 'Valor no site (opcional)', 'num', 'placeholder="2.100,00"')}</div>
      <div id="rpEco">${avisoEco()}</div>
      <div class="duas-col">${inp('forma', 'Forma de pagamento')}${inp('parcelas', 'Ou parcelado em (opcional)', 'text', 'inputmode="numeric" placeholder="4 (calcula sozinho)"')}</div>
      ${inp('obs', 'Observação (opcional, aparece em destaque)', 'area', 'rows="2" placeholder="Ex.: Volta em datas diferentes: Ana e João em 10/12, Pedro em 15/12."')}
      ${dobra('rpPrintD', 'Print do site (opcional, aparece só com a comparação ligada)', `<label class="fl"><input type="file" accept="image/*" multiple id="rpPrint"></label>
      ${S.prints.map((u, i) => `<div style="position:relative;margin:6px 0"><img src="${u}" style="max-width:100%;border:1px solid var(--linha)"><button type="button" data-rm="${i}" style="position:absolute;top:6px;right:6px;background:#fff;border:1px solid var(--linha);padding:4px 8px;font-size:12px">remover</button></div>`).join('')}`)}
    </form>
    <button class="zap grande" id="rpEnviar" style="width:100%;margin-top:12px">Enviar imagem no WhatsApp</button>
    <div class="botoes4" style="margin-top:6px"><button class="sec" id="rpBaixar">Baixar imagem</button><button class="sec" id="rpSalvar">Salvar</button></div>
    <label class="fl" style="margin-top:10px"><span>Nome do link (maktubgo.com.br/...)</span><input id="slugC" value="${h(S.slug || sugerirSlug())}" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="victor-santiago"></label>
    <button class="sec grande" id="linkC" style="width:100%;margin-top:6px">${S.link_slug ? 'Atualizar o link do cliente' : 'Gerar link para o cliente'}</button><div id="linkBox"></div>
    <div id="rpPrevia" style="margin-top:12px"></div>`;
  $('voltar').onclick = () => { S = null; ir(X, null); };
  const f = $('fRap');
  const ligarEco = () => { const ck = $('rpEcoCk'); if (ck) ck.onchange = () => { S.eco = ck.checked; previa(); }; };
  let tm = null; const previa = () => { clearTimeout(tm); tm = setTimeout(() => { if (!num(S.por) || !$('rpPrevia')) return; imagemRapida().then(b => { if ($('rpPrevia')) $('rpPrevia').innerHTML = `<div class="sub">Prévia</div><img src="${URL.createObjectURL(b)}" style="max-width:100%;border:1px solid var(--linha)">`; }); }, 400); };
  let slugManual = !!S.slug; $('slugC').addEventListener('input', () => { slugManual = true; });
  f.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return;
    const vk = k.match(/^voos\.(\d+)\.(\w+)$/);
    set(k, vk && /^(ocod|dcod)$/.test(vk[2]) ? e.target.value.toUpperCase().trim() : e.target.value);
    if (vk) { const v = S.voos[+vk[1]]; if (vk[2] === 'rotulo') v._rotM = !!e.target.value.trim(); if (/^(ocod|dcod|data|saida|chegada)$/.test(vk[2])) completarVoo(v); if (/^(ocod|dcod)$/.test(vk[2])) { rotular(S.voos); S.voos.forEach((x, i) => { const el = f.querySelector(`[data-k="voos.${i}.rotulo"]`); if (el && el !== e.target) el.value = x.rotulo; }); } }
    if ((vk || k === 'pessoas') && $('rpLista')) $('rpLista').innerHTML = listaVoos();
    if (k === 'cliente' && !slugManual) $('slugC').value = sugerirSlug();
    if (k === 'de' || k === 'por') { S.eco = undefined; $('rpEco').innerHTML = avisoEco(); ligarEco(); } previa(); });
  ligarEco();
  const lembrar = () => { try { localStorage.setItem('cotRapPadrao', JSON.stringify({ marca: S.marca, forma: S.forma })); } catch (e) {} };
  f.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' && /^voos\./.test(e.target.dataset.k || '')) set(e.target.dataset.k, e.target.value); if (/^voos\./.test(e.target.dataset.k || '') && $('rpLista')) $('rpLista').innerHTML = listaVoos(); if (e.target.dataset.k === 'marca') set('marca', e.target.value); if (e.target.dataset.k === 'marca' || e.target.dataset.k === 'forma') lembrar(); previa(); });
  ligarPrint(P, X);
  $('rpColar').onclick = async () => {
    const txt = $('colaTxt').value.trim(); if (!txt) { X.aviso('Cole o texto primeiro.'); return; }
    const r = await lerColado(txt), o = r.opcoes[0];
    if (!o) { X.aviso('Não encontrei voos nem valores no texto.'); return; }
    if (o.voos.length) { S.voos = o.voos; S.voos.forEach(v => completarVoo(v)); rotular(S.voos);
      const mx = Math.max(0, ...S.voos.map(v => parseInt(v.pax) || 0)); if (mx > (parseInt(S.pessoas) || 1)) S.pessoas = String(mx); }
    if (o.de) S.de = o.de; if (o.por) S.por = o.por; if (r.cia) S.cia = r.cia; if (r.cliente && !S.cliente) S.cliente = r.cliente;
    if (!o.voos.length) ABERTOS.add('rpVoosD');
    S.eco = undefined; editorRapida(P, X); X.aviso(!o.voos.length ? 'Não achei os voos no texto. Digite à mão em "Digitar voo à mão".' : num(S.por) ? 'Preenchido. Confira e envie.' : 'Preenchido. Digite o valor com a Maktub.');
    if (!num(S.por) && $('fRap').querySelector('[data-k="por"]')) $('fRap').querySelector('[data-k="por"]').focus();
  };
  if ($('rpLimpa')) $('rpLimpa').onclick = () => { S.voos = []; editorRapida(P, X); };
  $('rpMais').onclick = () => { const ult = S.voos[S.voos.length - 1], uma = S.voos.length === 1, n = ult ? { ...VOO_RAP(), ocod: uma ? ult.dcod : ult.ocod, dcod: uma ? ult.ocod : ult.dcod, onome: uma ? ult.dnome : ult.onome, dnome: uma ? ult.onome : ult.dnome, tipo: ult.tipo, data: ult.data } : VOO_RAP();
    S.voos.push(n); rotular(S.voos); ABERTOS.add('rpVoosD'); editorRapida(P, X); };
  P.querySelectorAll('#fRap [data-tira]').forEach(b => b.onclick = () => { S.voos.splice(+b.dataset.tira.split('#')[1], 1); rotular(S.voos); editorRapida(P, X); });
  $('rpPrint').onchange = async (e) => { const novas = (await Promise.all([...e.target.files].slice(0, 4).map(x => reduzir(x, 1400)))).filter(Boolean); S.prints = S.prints.concat(novas); ABERTOS.add('rpPrintD'); editorRapida(P, X); };
  P.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { S.prints.splice(+b.dataset.rm, 1); editorRapida(P, X); });
  P.querySelectorAll('details[data-d]').forEach(d => d.ontoggle = () => { d.open ? ABERTOS.add(d.dataset.d) : ABERTOS.delete(d.dataset.d); });
  const pronto = () => { if (!num(S.por)) { X.aviso('Digite o valor total com a Maktub.'); return false; } return true; };
  ligarFaixa(P, X);
  $('rpEnviar').onclick = () => { if (pronto()) comCardNaCotacao(P, X, enviarImagem); };
  const enviarImagem = async () => {
    enviada(X); salvar(X, true); const blob = await imagemRapida(); const arq = new File([blob], 'cotacao-maktub.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [arq] })) { try { await navigator.share({ files: [arq] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    baixar(blob); X.aviso('Imagem baixada. Anexe no WhatsApp.');
  };
  $('rpBaixar').onclick = () => { if (pronto()) comCardNaCotacao(P, X, async () => { enviada(X); salvar(X, true); baixar(await imagemRapida()); }); };
  $('rpSalvar').onclick = () => comCardNaCotacao(P, X, () => salvar(X));
  $('linkC').onclick = () => { if (pronto()) comCardNaCotacao(P, X, () => gerarLink(X)); };
  previa();
}
// cotação entregue ao cliente: o card vai para "Cotação enviada" com o valor cotado (a ligação com o card fica guardada)
function enviada(X) { if (S && S.reuniao_id && X.cotacaoEnviada) X.cotacaoEnviada(S.reuniao_id, { valor: valorCotacao(S.modelo === 'go' ? autoGo(S) : S) }); }
function baixar(blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cotacao-maktub.jpg'; document.body.appendChild(a); a.click(); a.remove(); }
const carregar = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

async function imagemRapida() {
  const W = 1080, PAD = 44, corp = S.marca === 'Maktub Corporativo', GO = !corp;
  const eco = mostraEco(), de = num(S.de), por = num(S.por), pax = Math.max(1, parseInt(S.pessoas) || 1);
  const prints = eco ? (await Promise.all((S.prints || []).map(carregar))).filter(Boolean) : [];
  const logo = GO && MARCA && MARCA.rodape ? await carregar(MARCA.rodape) : null;
  const vs = rapVoos(), parc = parcTxt();
  const c = document.createElement('canvas'); c.width = W; c.height = 4200; const g = c.getContext('2d');
  const VERDE = '#1B4332', VERDE2 = '#245a3b', DOUR = '#A88B4A', CREME = '#EBE0C4', BEGE = '#F3EAD2', PAPEL = '#F3F1EA', CINZA = '#5b625d', LINHA = '#d9d2bf';
  const sans = (px, w = '500') => `${w} ${px}px Montserrat, "Helvetica Neue", Arial, sans-serif`;
  const espac = (t, x, y, sp) => { let cx = x; for (const ch of t) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; } return cx - x - sp; };
  const largEsp = (t, sp) => [...t].reduce((a, ch) => a + g.measureText(ch).width + sp, -sp);
  const centro = (t, y) => { g.textAlign = 'center'; g.fillText(t, W / 2, y); g.textAlign = 'left'; };
  const caixa = (x, y, w, hh, r, cor, borda) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, r) : g.rect(x, y, w, hh); if (cor) { g.fillStyle = cor; g.fill(); } if (borda) { g.strokeStyle = borda; g.lineWidth = 2; g.stroke(); } };
  const corta = (t, max) => { t = String(t || ''); if (g.measureText(t).width <= max) return t; while (t && g.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
  const quebra = (t, max) => { const out = []; let l = ''; String(t || '').split(/\s+/).forEach(p => { const n = l ? l + ' ' + p : p; if (g.measureText(n).width > max && l) { out.push(l); l = p; } else l = n; }); if (l) out.push(l); return out; };
  g.fillStyle = PAPEL; g.fillRect(0, 0, W, c.height);
  // cabeçalho, como na corporativa
  const CAB = 170; g.fillStyle = GO ? BEGE : VERDE; g.fillRect(0, 0, W, CAB);
  if (logo) { const lh = 92, lw = logo.width * lh / logo.height; g.drawImage(logo, PAD, (CAB - lh) / 2 - 10, lw, lh); }
  else { g.font = sans(36, '700'); g.fillStyle = GO ? VERDE : CREME; const w1 = espac('MAKTUB ', PAD, 82, 4); g.fillStyle = DOUR; espac(GO ? 'GO' : 'CORPORATIVO', PAD + w1 + 4, 82, 4); }
  g.font = sans(22, '400'); g.fillStyle = GO ? VERDE : CREME; g.fillText(GO ? 'Alfaiataria de Viagens' : 'Viagens a trabalho, resolvidas.', PAD, logo ? CAB - 26 : 122);
  g.textAlign = 'right'; g.font = sans(20, '400'); g.fillText(EMAIL, W - PAD, 76); g.font = sans(24, '700'); g.fillText(ZAP_TXT, W - PAD, 112); g.textAlign = 'left';
  // faixa: passageiro, trecho e validade
  let y = CAB; const FX = 110; g.fillStyle = VERDE2; g.fillRect(0, y, W, FX);
  const v0 = vs[0], trecho = v0 ? `${String(v0.ocod).toUpperCase()} ${vs.length > 1 ? '⇄' : '→'} ${String(v0.dcod).toUpperCase()}` : '';
  const cols = [['PASSAGEIRO', `${S.cliente ? String(S.cliente).trim() + ' · ' : ''}${pax} ${pax === 1 ? 'pessoa' : 'pessoas'}`], ...(trecho ? [['TRECHO', trecho]] : []), ['VALIDADE', new Date().toLocaleDateString('pt-BR')]];
  const pesos = cols.length === 3 ? [0.48, 0.27, 0.25] : [0.6, 0.4], cx = pesos.map((_, i) => PAD + pesos.slice(0, i).reduce((a, b) => a + b, 0) * (W - PAD * 2));
  cols.forEach(([l, v], i) => { const x = cx[i], cw = pesos[i] * (W - PAD * 2); g.font = sans(17, '700'); g.fillStyle = DOUR; espac(l, x, y + 44, 2); g.font = sans(24, '700'); g.fillStyle = '#fff'; g.fillText(corta(v, cw - 16), x, y + 82); });
  y += FX + 50;
  // título com a rota
  if (v0) {
    g.font = sans(40, '700'); g.fillStyle = VERDE; g.fillText(corta(rapRota().toUpperCase(), W - PAD * 2), PAD, y); y += 38;
    g.font = sans(22, '400'); g.fillStyle = CINZA; g.fillText([S.cia, vs.length > 1 ? 'ida e volta' : 'só ida', vs.every(v => v.tipo === 'Direto') ? 'voos diretos' : 'com conexão'].filter(Boolean).join(' · '), PAD, y); y += 34;
    // cartões dos voos
    vs.forEach(v => {
      const CH = 196; caixa(PAD, y, W - PAD * 2, CH, 12, '#fff', LINHA);
      g.save(); g.beginPath(); g.roundRect ? g.roundRect(PAD, y, W - PAD * 2, 56, [12, 12, 0, 0]) : g.rect(PAD, y, W - PAD * 2, 56); g.fillStyle = VERDE; g.fill(); g.restore();
      const d = dt(v.data), np = paxTrecho(v, pax); g.font = sans(20, '700'); g.fillStyle = '#fff'; const wr = espac(String(v.rotulo || '').toUpperCase(), PAD + 24, y + 36, 2);
      if (np) { g.fillStyle = CREME; espac(` · ${np} ${np === 1 ? 'PASSAGEIRO' : 'PASSAGEIROS'}`, PAD + 24 + wr, y + 36, 2); g.fillStyle = '#fff'; }
      g.textAlign = 'right'; g.fillText(d ? `${SEMANA[d.getDay()].toUpperCase()} · ${v.data.split('-').reverse().join('/')}` : '', W - PAD - 24, y + 36); g.textAlign = 'left';
      const yb = y + 56, meio = W / 2, colW = (W - PAD * 2) / 2 - 70;
      g.font = sans(52, '700'); g.fillStyle = VERDE; g.fillText(v.saida || '', PAD + 24, yb + 70); g.fillText(v.chegada || '', meio + 50, yb + 70);
      if (v.mais1) { const wc = g.measureText(v.chegada || '').width; g.font = sans(22, '700'); g.fillStyle = DOUR; g.fillText('+1', meio + 56 + wc, yb + 46); }
      g.font = sans(40, '400'); g.fillStyle = DOUR; centro('→', yb + 64);
      g.font = sans(21, '700'); g.fillStyle = CINZA;
      g.fillText(corta(`${String(v.ocod).toUpperCase()} · ${v.onome || cidadeDe(v.ocod) || ''}`, colW), PAD + 24, yb + 104);
      g.fillText(corta(`${String(v.dcod).toUpperCase()} · ${v.dnome || cidadeDe(v.dcod) || ''}`, colW), meio + 50, yb + 104);
      const chip = (v.tipo || 'Direto').toUpperCase(); g.font = sans(17, '700'); const tw = largEsp(chip, 1.5) + 32;
      caixa(W - PAD - 24 - tw, yb + 84 - 26, tw, 34, 17, BEGE); g.fillStyle = VERDE; espac(chip, W - PAD - 24 - tw + 16, yb + 84 - 3, 1.5);
      y += CH + 18;
    });
    y += 6;
  }
  // observação em destaque, com o texto inteiro
  if (String(S.obs || '').trim()) { g.font = sans(24, '600'); const ls = String(S.obs).trim().split('\n').flatMap(l => quebra(l, W - PAD * 2 - 60)); const OH = 70 + ls.length * 34;
    caixa(PAD, y, W - PAD * 2, OH, 12, BEGE, DOUR); g.font = sans(17, '700'); g.fillStyle = DOUR; espac('OBSERVAÇÃO', PAD + 24, y + 40, 2); g.font = sans(24, '600'); g.fillStyle = VERDE; ls.forEach((l, i) => g.fillText(l, PAD + 24, y + 78 + i * 34)); y += OH + 22; }
  // bagagem
  if (S.bagagem) { g.font = sans(24, '700'); const ls = quebra(S.bagagem, W - PAD * 2 - 48); const BH = 70 + ls.length * 32; caixa(PAD, y, W - PAD * 2, BH, 12, '#fff', LINHA);
    g.font = sans(17, '700'); g.fillStyle = DOUR; espac('BAGAGEM INCLUÍDA', PAD + 24, y + 40, 2); g.font = sans(24, '700'); g.fillStyle = VERDE; ls.forEach((l, i) => g.fillText(l, PAD + 24, y + 76 + i * 32)); y += BH + 22; }
  // print do site, só quando a comparação está ligada
  prints.forEach((im) => { const hh = Math.round(im.height * (W - PAD * 2 - 48) / im.width); caixa(PAD, y, W - PAD * 2, hh + 74, 12, '#fff', LINHA); g.font = sans(17, '700'); g.fillStyle = DOUR; espac(('VALOR NO SITE' + (S.cia ? ' DA ' + S.cia : '')).toUpperCase(), PAD + 24, y + 40, 2); g.drawImage(im, PAD + 24, y + 56, W - PAD * 2 - 48, hh); y += hh + 96; });
  // resumo com o valor total
  const linhasR = [['rot'], ['p'], ...(eco ? [['de']] : []), ['por'], ['forma'], ...(parc ? [['parc']] : []), ...(eco ? [['eco']] : []), ['hr'], ['small']];
  const alt = { rot: 30, p: 40, de: 50, por: 92, forma: 48, parc: 40, eco: 68, obs: 52, hr: 34, small: 32 };
  const RH = linhasR.reduce((a, [k]) => a + alt[k] - 10, 0) + 74;
  caixa(PAD, y, W - PAD * 2, RH, 16, VERDE); let yy = y + 40; const X0 = PAD + 32;
  linhasR.forEach(([k]) => {
    yy += alt[k] - 10;
    if (k === 'rot') { g.font = sans(18, '700'); g.fillStyle = DOUR; espac('RESUMO DA COTAÇÃO', X0, yy, 2.5); }
    if (k === 'p') { g.font = sans(19, '700'); g.fillStyle = CREME; espac(`VALOR TOTAL · ${pax} ${pax === 1 ? 'PASSAGEIRO' : 'PASSAGEIROS'}`, X0, yy, 1.5); }
    if (k === 'de') { g.font = sans(24, '400'); g.fillStyle = 'rgba(235,224,196,.8)'; const t = 'No site ' + brl(de); g.fillText(t, X0, yy); const a = g.measureText('No site ').width, tw = g.measureText(t).width; g.strokeStyle = DOUR; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X0 + a, yy - 8); g.lineTo(X0 + tw, yy - 8); g.stroke(); }
    if (k === 'por') { g.font = sans(64, '800'); g.fillStyle = '#fff'; g.fillText(brl(por), X0, yy); }
    if (k === 'forma') { g.font = sans(23, '700'); g.fillStyle = CREME; g.fillText(S.forma || '', X0, yy); }
    if (k === 'parc') { g.font = sans(22, '400'); g.fillStyle = 'rgba(235,224,196,.85)'; g.fillText('ou ' + parc, X0, yy); }
    if (k === 'eco') { const t = 'Economia de ' + brl(de - por); g.font = sans(21, '700'); const tw = g.measureText(t).width + 36; caixa(X0, yy - 32, tw, 44, 22, null, DOUR); g.fillStyle = CREME; g.fillText(t, X0 + 18, yy - 3); }
    if (k === 'hr') { g.strokeStyle = DOUR; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X0, yy - 12); g.lineTo(W - PAD - 32, yy - 12); g.stroke(); }
    if (k === 'small') { g.font = sans(18, '400'); g.fillStyle = CREME; g.fillText('Tarifas e disponibilidade confirmadas somente no momento da emissão.', X0, yy - 6); }
  });
  y += RH + 30;
  // condições e contato
  g.font = sans(18, '400'); g.fillStyle = CINZA; const agora = new Date();
  quebra(`Valores consultados em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. ${RAP_RODAPE}`, W - PAD * 2).forEach(l => { g.fillText(l, PAD, y); y += 26; });
  y += 20; g.fillStyle = VERDE; g.fillRect(0, y, W, 96);
  g.font = sans(22, '700'); g.fillStyle = CREME; espac(GO ? 'MAKTUB GO' : 'MAKTUB CORPORATIVO', PAD, y + 44, 2); g.font = sans(18, '400'); g.fillStyle = DOUR; g.fillText(GO ? 'Alfaiataria de Viagens' : 'Viagens a trabalho, resolvidas.', PAD, y + 72);
  g.textAlign = 'right'; g.font = sans(20, '600'); g.fillStyle = CREME; g.fillText(`WhatsApp ${ZAP_TXT}`, W - PAD, y + 44); g.font = sans(18, '400'); g.fillText('@maktubgo_', W - PAD, y + 72); g.textAlign = 'left';
  y += 96;
  const out = document.createElement('canvas'); out.width = W; out.height = Math.ceil(y); out.getContext('2d').drawImage(c, 0, 0);
  return new Promise(ok => out.toBlob(ok, 'image/jpeg', 0.92));
}
