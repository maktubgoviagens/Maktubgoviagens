// Maktub Go: montador de cotações.
// Dois modelos: "Maktub Go" (proposta de experiência, com opções, roteiro, voos, hotel, carro e investimento)
// e "Maktub Corporativo" (cotação objetiva de voos). Gera o HTML pronto, no visual aprovado, sem mostrar custo.

import { lerColado, completarVoo, carregarAero, cidadeDe, carregarNomes, codigoDe } from '/admin/app/cot-colar.js?v=5';
import { acharPessoa } from '/admin/app/venda.js?v=20';
export const prepararAero = carregarNomes;
let LISTA = null, ED = null, S = null, MARCA = null, RAPM = null, PRE = null, PEDIR = null;
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
// contatos clicáveis no rodapé de toda cotação: WhatsApp, Instagram e site (com origem "cotacao" para medir no Analytics)
const INSTA = 'maktubgo_', SITE = 'maktubgo.com.br', SITE_URL = 'https://www.maktubgo.com.br/?utm_source=cotacao&utm_medium=link';
const ctLinks = (cor) => { const a = (href, t) => `<a href="${href}" target="_blank" rel="noopener" style="color:${cor || 'inherit'};text-decoration:none">${t}</a>`;
  return [a('https://wa.me/' + ZAP, 'WhatsApp ' + ZAP_TXT), a('https://www.instagram.com/' + INSTA + '/', '@' + INSTA), a(SITE_URL, SITE)].join(' &nbsp;·&nbsp; '); };
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
    const c = +v.conexoes || 0; const dc = /^\d{4}-\d{2}-\d{2}$/.test(v.data_chegada || '') && dt ? Math.round((Date.parse(v.data_chegada) - Date.parse(v.data)) / 864e5) : 0;
    ls.push([dt, v.origem, v.saida, v.destino, v.chegada + (dc > 0 ? ' +' + dc : ''), c ? `${c} ${c === 1 ? 'conexão' : 'conexões'}` : 'direto'].filter(Boolean).join(' ')); });
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
const TIPO_GO = { 'Direto': 'Voo direto', '1 conexão': 'Com 1 conexão', '2 conexões': 'Com 2 conexões', '3 conexões': 'Com 3 conexões', '4 conexões': 'Com 4 conexões' };
// quantos dias depois da saída o voo chega (0 = mesmo dia). Aceita o antigo true/false do "+1".
const dmais = (v) => { const m = v && v.mais1; if (m === true) return 1; if (m === false || m == null || m === '') return v && v.saida && v.chegada && v.chegada < v.saida ? 1 : 0; return Math.max(0, parseInt(m) || 0); };
const selDias = (p) => { const n = dmais(get(p.replace(/\.mais1$/, ''))); return `<label class="fl"><span>Chegada</span><select data-k="${p}">${['Mesmo dia', '+1 dia', '+2 dias', '+3 dias'].map((o, i) => `<option value="${i}" ${n === i ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`; };

/* ================= telas ================= */
export function rota(hh) { ED = hh[1] || null; if (!ED) S = null; }
export async function tela(P, X) {
  if (!MARCA) { try { const m = await import('/admin/app/cot-marca.js?v=2'); MARCA = m.MARCA; RAPM = m.RAP || null; } catch (e) { MARCA = { selo: '', ornato: '', assin: '', rodape: '' }; } }
  carregarAero(); const cfg = (X.D && X.D.cfg) || {}; TAXAS = cfg.taxas_cartao; REGRA = { desc: cfg.pix_desconto, n: cfg.parcelas_sem_juros };
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
    if (!p) { const ja = acharPessoa(D, { nome, contato: ct }); if (ja && confirm(`Já existe a ficha de ${ja.nome}${ja.celular ? ' (' + ja.celular + ')' : ''}. É esta pessoa?\n\nOK: usar esta ficha. Cancelar: criar uma ficha nova.`)) p = ja; }
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
  P.querySelectorAll('[data-verenvio]').forEach(b => b.onclick = () => verEnvio(X, b.dataset.verenvio));
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
  // valor da opção = o que entra na conta: Pix quando existe; só cartão, o valor do cartão sem a taxa da maquininha
  if (d.modelo === 'go') return (d.opcoes || []).map((o, i) => { const p = precos(o), t = taxasCartao()[p.parc - 1]; return { nome: o.nome || (d.opcoes.length > 1 ? 'Opção ' + (i + 1) : ''), valor: p.pix || (p.cartao && t != null ? Math.round(p.cartao * (100 - t)) / 100 : p.cartao), o }; });
  if (d.modelo === 'corp') return [{ nome: d.nome1 || ((d.extras || []).length ? 'Opção 1' : ''), valor: num(d.por), voos: d.voos || [] }].concat((d.extras || []).map((o, i) => ({ nome: o.nome || 'Opção ' + (i + 2), valor: num(o.por), voos: o.voos || [] })));
  return [{ nome: '', valor: (precoRapida(d) || {}).pix || num(d.por), voos: (d.voos || []).filter(v => v.ocod) }];
}
export const valorCotacao = (d) => { const o = opcoesCotacao(d)[0]; return o ? o.valor : 0; };
// serviços já preenchidos para o fechamento: voo (rota, datas, passageiros, companhia) e hotéis (nome e datas)
export function itensDaCotacao(d, k = 0) {
  const op = opcoesCotacao(d)[k] || opcoesCotacao(d)[0]; if (!op) return { itens: [], valor: 0 };
  const go = d.modelo === 'go', vs = go ? (op.o.voos || []).filter(v => v.origem || v.destino) : op.voos.filter(v => v.ocod || v.dcod);
  // no modelo Maktub Go o voo tem a cidade escrita: vira o código do aeroporto para a venda (fuso, planilha, check-in)
  const ori = (v) => go ? (codigoDe(v.origem) || v.origem) : v.ocod, des = (v) => go ? (codigoDe(v.destino) || v.destino) : v.dcod;
  const itens = [];
  // passageiros diferentes por trecho costumam ser emissões diferentes (ex.: um vai antes): cada grupo vira uma emissão,
  // com o próprio custo, companhia, forma de pagamento e localizador
  const tot = parseInt(d.pessoas) || 1, paxDe = (v) => parseInt(v.pax) || tot;
  const grupos = []; vs.forEach(v => { const g = grupos.find(g => g.pax === paxDe(v)); if (g) g.vs.push(v); else grupos.push({ pax: paxDe(v), vs: [v] }); });
  grupos.forEach(({ pax, vs: gv }) => {
    const iv = gv.length === 2 && des(gv[1]) && des(gv[1]) === ori(gv[0]);
    const tipo = gv.length === 1 ? 'ida' : iv ? 'iv' : 'multi';
    const x = { produto: !go && (d.marca || (d.modelo === 'corp' ? 'Maktub Corporativo' : '')) === 'Maktub Corporativo' ? 'Maktub Corporativo' : 'Passagens',
      custo: null, venda: null, tipo_trecho: tipo, origem: ori(gv[0]) || '', destino: des(gv[0]) || '', data_ida: gv[0].data || null, hora_ida: gv[0].saida || '', passageiros: pax, cia_emissora: grupos.length > 1 ? '' : (d.cia || '') };
    if (tipo === 'iv') { x.data_volta = gv[1].data || null; x.hora_volta = gv[1].saida || ''; }
    if (tipo === 'multi') { x.data_volta = gv[gv.length - 1].data || null; x.hora_volta = gv[gv.length - 1].saida || ''; x.trechos = gv.map(v => `${ori(v)}-${des(v)}${v.data ? ' ' + ddmm(v.data) : ''}${v.saida ? ' ' + v.saida : ''}`).join('\n'); }
    // trechos da emissão já entram como linhas do custo por trecho (com o horário de saída, para o aviso de check-in)
    x.ct = gv.map(v => ({ o: String(ori(v) || '').toUpperCase(), d: String(des(v) || '').toUpperCase(), data: v.data || '', hora: v.saida || '', pax: String(pax) }));
    if (tipo === 'multi') x.ct_on = true;
    // bagagem despachada já informada na cotação: vem para o fechamento (editável lá), sem perguntar de novo
    { const tb = String(d.bagagem || ''), m = /(\d)\s*malas?\s*despachada/i.exec(tb);
      const nb = d.bag_desp != null && d.bag_desp !== '' ? +d.bag_desp || 0 : m ? +m[1] : /sem\s+mala\s+despachada|n[aã]o\s+inclui\s+mala/i.test(tb) ? 0 : null;
      if (nb != null) x.bagagem = String(Math.min(nb, 3)); }
    itens.push(x);
  });
  if (go) (op.o.hoteis || []).filter(ht => ht.nome).forEach(ht => itens.push({ produto: 'Hotelaria', custo: null, venda: null, nome: ht.nome, destino: ht.cidade || '', data_ida: ht.entrada || null, data_volta: ht.saida || null }));
  // carro: as opções da cotação viram um serviço só (o cliente fica com uma delas; ajuste o nome no fechamento)
  if (go) { const cs = ((op.o.carro || {}).opcoes || []).filter(c => c.grupo); if (cs.length) itens.push({ produto: 'Aluguel de carro', custo: null, venda: null, nome: cs.map(c => c.grupo).join(' ou '), destino: d.destino || '', data_ida: op.o.embarque || null, data_volta: op.o.retorno || null }); }
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
    <h1 class="titulo" style="margin-top:6px">${corp ? 'Cotação <em>corporativa</em>' : 'Cotação <em>Maktub Go</em>'}</h1>${faixaCard(X)}${htmlHistorico(X)}
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
    const rk = k.match(/^(.*voos\.\d+)\.rotulo$/); if (rk) { const v = get(rk[1]); if (v) v._rotM = !!String(e.target.value).trim(); }
    const m = k.match(/^opcoes\.(\d+)\.(sites|cartao|parcelas|pix)$/); if (m && $('rv' + m[1])) $('rv' + m[1]).innerHTML = resumoValores(S.opcoes[+m[1]]);
    const vk = S.modelo === 'corp' && k.match(/^(.*voos\.\d+)\.(ocod|dcod|saida|chegada|data|tipo)$/);
    if (vk) { const v = get(vk[1]); completarVoo(v); ['onome', 'dnome', 'duracao'].forEach(c => { const el = f.querySelector(`[data-k="${vk[1]}.${c}"]`); if (el && el !== e.target && el.value !== (v[c] || '')) el.value = v[c] || ''; }); } });
  f.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' && e.target.dataset.k) set(e.target.dataset.k, e.target.value); if (e.target.dataset.hotel) escolherHotel(X, e.target); if (e.target.dataset.foto) fotoUpload(e.target, P, X); if (e.target.dataset.print) printUpload(e.target, P, X); });
  f.addEventListener('click', (e) => {
    const cb = e.target.closest('[data-colar]'); if (cb) { (S.modelo === 'go' ? colarGo : colar)(P, X, cb.dataset.colar); return; }
    const m = e.target.closest('[data-mais]'), t = e.target.closest('[data-tira]'), xv = e.target.closest('[data-xvoo]');
    if (m) { mais(m.dataset.mais); editor(P, X); }
    const vt = xv ? xv.dataset.xvoo : t && /(^|\.)voos#\d+$/.test(t.dataset.tira) ? t.dataset.tira : '';
    if (vt) { tirarVooEd(P, X, vt); return; }
    if (t) { const [lista, i] = t.dataset.tira.split('#'); if (lista === '_print') S.print = ''; else get(lista).splice(+i, 1); editor(P, X); }
  });
  ligarPrint(P, X);
  $('verC').onclick = () => { const w = window.open('', '_blank'); const html = gerar(X); if (w) { w.document.open(); w.document.write(html); w.document.close(); } else X.aviso('Libere as janelas novas para ver a cotação.'); };
  ligarFaixa(P, X);
  $('baixarC').onclick = () => comCardNaCotacao(P, X, () => { enviada(X, 'Arquivo HTML'); salvar(X, true); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([gerar(X)], { type: 'text/html' })); a.download = 'index.html'; document.body.appendChild(a); a.click(); a.remove(); X.aviso('Baixado como index.html, pronto para enviar.'); });
  $('salvarC').onclick = () => comCardNaCotacao(P, X, () => salvar(X));
  $('acervoC').onclick = () => acervo(X);
  $('linkC').onclick = () => comCardNaCotacao(P, X, () => gerarLink(X));
  if ($('duplicarC')) $('duplicarC').onclick = () => { delete S._id; delete S.reuniao_id; delete S.link_slug; delete S.slug; delete S.historico; if (S.modelo === 'go') { S.para = ''; S.nomeZap = ''; } else { S.passageiro = ''; S.codigo = ''; } S.consulta = hoje(); ED = 'novo'; history.replaceState(null, '', '#cotador/novo'); editor(P, X); X.aviso('Cópia criada. Ligue ao card do outro cliente e ajuste.'); };
}

// X de um trecho na Maktub Go (opcoes.N.voos#j) ou na corporativa (voos#j, extras.N.voos#j)
function tirarVooEd(P, X, alvo) {
  const [lista, i] = alvo.split('#'), base = lista.replace(/\.?voos$/, ''), T = base ? get(base) : S, go = S.modelo === 'go';
  const siteK = go ? 'sites' : 'de', porK = go ? 'cartao' : 'por', F = go ? FMT_GO : FMT_C;
  if (!T || !tirarVoo(T, +i, siteK, porK, F)) return;
  if (go) { const ds = T.voos.filter(F.ok).map(v => v.data).filter(Boolean).sort(); T.embarque = ds[0] || ''; T.retorno = ds.length > 1 ? ds[ds.length - 1] : ''; }
  if (T.voos.some(F.ok)) rotular(T.voos, F.o, F.d);
  editor(P, X);
  const cp = X.$('fCot') && X.$('fCot').querySelector(`[data-k="${base ? base + '.' : ''}${porK}"]`); if (cp) cp.focus();
  X.aviso('Trecho removido. Digite o novo valor da Maktub.');
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
    const resumoVoos = vs.length ? `<div style="font-size:13px">${vs.map(v => linhaX(`<b>${h(v.rotulo || 'Voo')}</b> ${ddmm(v.data)} · ${h(v.origem)} ${h(v.saida)} → ${h(v.destino)} ${h(v.chegada)}${dmais(v) ? ` (+${dmais(v)})` : ''} · ${h(v.tipo)}`, `data-xvoo="${b}.voos#${o.voos.indexOf(v)}"`)).join('')}</div>` : '<div class="sub" style="margin:0">Nenhum voo ainda. Cole a tela da companhia acima ou preencha abaixo.</div>';
    return `<div class="grupo">${multi ? `Opção ${i + 1} ${btnTira('opcoes#' + i)}` : 'A viagem'}</div>
      ${multi ? inp(b + '.nome', 'Nome da opção', 'text', 'placeholder="Ex.: Voo direto + hotel no centro"') : ''}
      <div class="sub" style="margin-top:6px"><b>Voos</b></div>
      ${resumoVoos}
      ${dobra(b + '.voos', `Editar voos (${vs.length})`, `${o.voos.map((v, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira(`${b}.voos#${j}`)}
        ${duas(inp(`${b}.voos.${j}.rotulo`, 'Rótulo', 'text', 'placeholder="Ida, Volta, Entre países"'), inp(`${b}.voos.${j}.data`, 'Data', 'date'))}
        ${duas(inp(`${b}.voos.${j}.origem`, 'Saída de', 'text', 'placeholder="Uberlândia" data-aero="cidade" autocomplete="off"'), inp(`${b}.voos.${j}.saida`, 'Horário', 'time'))}
        ${duas(inp(`${b}.voos.${j}.destino`, 'Chegada em', 'text', 'placeholder="Lisboa" data-aero="cidade" autocomplete="off"'), inp(`${b}.voos.${j}.chegada`, 'Horário', 'time'))}
        ${duas(sel(`${b}.voos.${j}.tipo`, 'Tipo', ['Voo direto', 'Com 1 conexão', 'Com 2 conexões', 'Com 3 conexões', 'Com 4 conexões']), sel(`${b}.voos.${j}.periodo`, 'Período', ['', 'Voo diurno', 'Voo noturno']))}
        ${selDias(`${b}.voos.${j}.mais1`)}</div>`).join('')}
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
    <div class="botoes4"><button type="button" class="zap" data-colar="tudo">${S.opcoes[0].voos.some(FMT_GO.ok) ? 'Preencher e somar' : 'Preencher'}</button><button type="button" class="sec" data-colar="nova">Colar como nova opção</button></div>
    ${S.opcoes[0].voos.some(FMT_GO.ok) ? '<div class="sub" style="margin:2px 0 0">Colar outra tela acrescenta os trechos novos e soma o valor do site. Para tirar um trecho, toque no X dele.</div>' : ''}
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
    mais1: dmais(v), tipo: TIPO_GO[v.tipo] || 'Voo direto' });
  let somou = false, dup = 0;
  const aplicar = (o, p) => {
    const rs = somarVoos(o, p.voos.map(conv), p.de, p.por, 'sites', 'cartao', FMT_GO);
    if (rs.somou) somou = true; if (rs.somou && !rs.n) dup++;
    if (p.nome && !o.nome) o.nome = p.nome;
    const ds = o.voos.filter(FMT_GO.ok).map(v => v.data).filter(Boolean).sort();
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
  if (dup && dup === r.opcoes.filter(p => p.voos.length).length) { X.aviso('Esses trechos já estão na cotação.'); return; }
  X.aviso(somou ? 'Trechos acrescentados e valor do site somado. Confira o valor Maktub.' : falta ? 'Voos preenchidos. Digite o valor Maktub de cada opção e, se tiver, escolha o hotel.' : 'Preenchido. Confira, escolha o hotel e gere o link.');
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

function listaCorp(pre) {
  const l = get(pre + 'voos') || [], vs = ordenarVoos(l.filter(FMT_C.ok));
  if (!vs.length) return '';
  return `<div class="config" style="margin:6px 0;font-size:13px">${vs.map(v => linhaX(`<b>${h(v.rotulo || 'Voo')}</b> ${ddmm(v.data)} · ${h(v.ocod)} ${h(v.saida)} → ${h(v.dcod)} ${h(v.chegada)} · ${h(v.tipo)}`, `data-xvoo="${pre}voos#${l.indexOf(v)}"`)).join('')}</div>`;
}
function voosCorp(pre) {
  return `${get(pre + 'voos').map((v, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira(pre + 'voos#' + j)}
      ${duas(inp(`${pre}voos.${j}.rotulo`, 'Rótulo'), inp(`${pre}voos.${j}.data`, 'Data', 'date'))}
      ${duas(inp(`${pre}voos.${j}.ocod`, 'Origem', 'text', 'placeholder="Cidade ou código" data-aero="cod" autocomplete="off" style="text-transform:uppercase"'), inp(`${pre}voos.${j}.onome`, 'Aeroporto', 'text', 'placeholder="Galeão"'))}
      ${duas(inp(`${pre}voos.${j}.dcod`, 'Destino', 'text', 'placeholder="Cidade ou código" data-aero="cod" autocomplete="off" style="text-transform:uppercase"'), inp(`${pre}voos.${j}.dnome`, 'Aeroporto', 'text', 'placeholder="Santiago"'))}
      ${duas(inp(`${pre}voos.${j}.saida`, 'Saída', 'time'), inp(`${pre}voos.${j}.chegada`, 'Chegada', 'time'))}
      ${duas(sel(`${pre}voos.${j}.tipo`, 'Tipo', ['Direto', '1 conexão', '2 conexões', '3 conexões', '4 conexões']), inp(`${pre}voos.${j}.duracao`, 'Duração', 'text', 'placeholder="4h40"'))}
      ${selDias(`${pre}voos.${j}.mais1`)}</div>`).join('')}
    ${btnMais(pre + 'voos|vooc', '+ Trecho')}`;
}
function formCorp() {
  if (!S.extras) S.extras = [];
  const multi = S.extras.length > 0;
  return `<div class="config" style="margin:6px 0 4px"><b>Colar e preencher</b><br>Copie a tela da companhia (do horário até o subtotal) e cole aqui. Ou escreva curto, uma linha por voo:<br><span style="font-family:monospace;font-size:12px">02/12 GIG 12:20 SCL 17:00 direto<br>09/12 SCL 14:10 GIG 21:25 1 parada<br>site 1.670,93 maktub 1.655</span><br>Para várias opções, comece cada uma com "Opção 1", "Opção 2".</div>
    <label class="fl"><textarea id="colaTxt" rows="5" placeholder="Cole aqui"></textarea></label>
    <div class="botoes4"><button type="button" class="zap" data-colar="tudo">${(S.voos || []).some(FMT_C.ok) ? 'Preencher e somar' : 'Preencher'}</button><button type="button" class="sec" data-colar="nova">Colar como nova opção</button></div>
    ${(S.voos || []).some(FMT_C.ok) ? '<div class="sub" style="margin:2px 0 0">Colar outra tela acrescenta os trechos novos e soma o valor do site. Para tirar um trecho, toque no X dele.</div>' : ''}
    <div class="grupo">Cotação</div>
    ${duas(inp('codigo', 'Código', 'text', `placeholder="MC-${hoje().slice(8, 10)}${hoje().slice(5, 7)}-001"`), inp('validade', 'Válida somente em', 'date'))}
    ${duas(inp('passageiro', 'Passageiro', 'text', 'placeholder="Victor"'), inp('pessoas', 'Pessoas', 'num'))}
    ${duas(inp('cia', 'Companhia', 'text', 'placeholder="LATAM"'), inp('destino', 'Destino (acervo)', 'text', 'placeholder="Santiago"'))}
    ${inp('rota', 'Título da rota', 'text', 'placeholder="Rio de Janeiro ⇄ Santiago"')}
    ${sel('marca', 'Marca no topo', ['Maktub Corporativo', 'Maktub Go'])}
    <div class="grupo">${multi ? 'Opção 1' : 'Voos'}</div>
    ${multi ? inp('nome1', 'Nome da Opção 1', 'text', 'placeholder="Ida direta, volta com 1 parada"') : ''}
    ${listaCorp('')}
    ${voosCorp('')}
    ${duas(inp('de', 'De (valor no site)', 'num', 'placeholder="1.670,93"'), inp('por', 'Por (valor Maktub)', 'num', 'placeholder="1.655,00"'))}
    ${S.extras.map((o, i) => `<div class="grupo">Opção ${i + 2} ${btnTira('extras#' + i)}</div>
    ${inp(`extras.${i}.nome`, `Nome da Opção ${i + 2}`, 'text', 'placeholder="Ida e volta em voo direto"')}
    ${listaCorp(`extras.${i}.`)}
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
  if (X.cotSalva) X.cotSalva({ id: r.data.id, titulo: row.titulo, modelo: row.modelo, atualizado_em: row.atualizado_em, reuniao_id: S.reuniao_id || null, hist: S.historico || null });
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
  const ops = modo === 'nova' && (S.voos || []).some(v => v.ocod) ? r.opcoes.map(o => { const n = { nome: o.nome, voos: o.voos, de: o.de, por: o.por }; marcarGrupo(n, n.voos, o.de); ordenarVoos(n.voos); return n; }) : null;
  let somou = false, dup = 0;
  if (ops) { S.extras = S.extras.concat(ops).slice(0, 2); }
  else {
    // colar de novo acrescenta os trechos novos em cada opção (não troca tudo)
    const [p1, ...resto] = r.opcoes;
    const rs = somarVoos(S, p1.voos, p1.de, p1.por, 'de', 'por', FMT_C); if (rs.somou) { somou = true; if (!rs.n && p1.voos.length) dup++; }
    S.nome1 = S.nome1 || p1.nome || '';
    resto.slice(0, 2).forEach((o, i) => { if (!S.extras[i]) S.extras[i] = { nome: '', voos: [], de: '', por: '' };
      const rx = somarVoos(S.extras[i], o.voos, o.de, o.por, 'de', 'por', FMT_C); if (rx.somou) { somou = true; if (!rx.n && o.voos.length) dup++; }
      if (o.nome && !S.extras[i].nome) S.extras[i].nome = o.nome; });
  }
  if (r.cliente && !S.passageiro) S.passageiro = r.cliente;
  if (r.cia && !S.cia) S.cia = r.cia;
  const v0 = (S.voos || [])[0];
  if (v0 && !S.rota) { const a = cidadeDe(v0.ocod) || v0.ocod, b = cidadeDe(v0.dcod) || v0.dcod; S.rota = `${a} ${S.voos.length > 1 ? '⇄' : '→'} ${b}`; }
  if (v0 && !S.destino) S.destino = cidadeDe(v0.dcod) || '';
  editor(P, X);
  const faltaPor = [S.por].concat(S.extras.map(o => o.por)).some(x => !x);
  if (dup && dup === r.opcoes.filter(o => o.voos.length).length) { X.aviso('Esses trechos já estão na cotação.'); return; }
  X.aviso(somou ? 'Trechos acrescentados e valor do site somado. Confira o valor da Maktub (Por).' : faltaPor ? 'Preenchido. Confira e digite o valor da Maktub (Por) de cada opção.' : 'Preenchido. Confira e gere o link.');
}
/* nomes que nunca podem virar link de cotação: páginas e pastas do site e nomes que o site pode usar */
const RESERVADOS = ['acesso', 'admin', 'assets', 'ativos', 'avaliacao', 'c', 'cadastro', 'classe-executiva-com-milhas', 'como-trabalhamos', 'corporativo', 'gestao-de-milhas', 'painel', 'privacidade', 'quem-somos', 'termos', 'trabalheconosco', 'trabalhe-conosco', 'viagens', 'index', 'sitemap', 'robots', '404',
  'fale-conosco', 'contato', 'blog', 'cotacao', 'cotacoes', 'login', 'app', 'site', 'maktub', 'maktubgo', 'servicos', 'sobre', 'politica-de-privacidade', 'termos-de-uso', 'lua-de-mel', 'europa', 'milhas', 'executiva-buenos-aires'];
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
  const row = { html: S.modelo === 'rapida' ? htmlRapida() : gerar(X), titulo: tituloDe(), cliente: clienteDe() || null }; if (slug) row.slug = slug;
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
  enviada(X, atualizar ? 'Link atualizado' : 'Link', url);
  await salvar(X, true);
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
  enviada(X, null); X.aviso('Guardada no acervo, na pasta do destino.');
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
    if (voos.length) s += `<section style="background:#fff"><div class="wrap"><div class="titulo-sec"><div class="kicker">Voos</div><h2>Como ${vcs} ${pax === 1 ? 'chega' : 'chegam'}</h2></div>${voos.map(v => `<div class="card"><div class="card-cab"><span class="rot">${h(v.rotulo)}</span><span class="dt">${dLonga(v.data)}</span></div><div class="card-corpo"><div class="rota"><div><div class="leg">Saída</div><div class="cid">${h(v.origem)}</div><div class="hora">${h(v.saida)}</div></div><div class="seta">→</div><div><div class="leg">Chegada</div><div class="cid">${h(v.destino)}</div><div class="hora">${h(v.chegada)}${dmais(v) ? `<small>+${dmais(v)}</small>` : ''}</div></div></div><div class="tags">${[v.periodo, v.tipo].filter(Boolean).map(t => `<span class="tag">${h(t)}</span>`).join('')}</div></div></div>`).join('')}<p class="nota" style="text-align:center">${o.bagagem ? h(o.bagagem) + '<br>' : ''}Horários sujeitos a alteração pela companhia aérea.</p></div></section>`;
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
<footer><img class="assin-footer" src="${M.rodape}" alt="Maktub Go"><div>${ctLinks()}</div>
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
${vs.map(v => `<div class="voo"><div class="cab"><span>${h(v.rotulo).toUpperCase()}${paxTrecho(v, pax) ? ` · ${paxTrecho(v, pax)} ${paxTrecho(v, pax) === 1 ? 'PASSAGEIRO' : 'PASSAGEIROS'}` : ''}</span><span>${dataCab(v.data)}</span></div><div class="corpo"><div><div class="hora">${h(v.saida)}</div><div class="aer">${h(v.ocod).toUpperCase()} · ${h(v.onome)}</div></div><div class="seta">→</div><div><div class="hora">${h(v.chegada)}${dmais(v) ? `<sup style="font-size:13px;color:var(--d);margin-left:3px">+${dmais(v)}</sup>` : ''}</div><div class="aer">${h(v.dcod).toUpperCase()} · ${h(v.dnome)}</div></div><div class="cia">${h(S.cia)}</div><div class="chips"><span class="chip">${h(v.tipo)}</span></div></div></div>`).join('')}
${multi ? resumo(o, n) + '</section>' : ''}`; }).join('')}
${String(S.obs || '').trim() ? `<div class="caixa obs"><div class="rot">Observação</div><div style="font-weight:700;color:var(--v)">${h(String(S.obs).trim()).replace(/\n/g, '<br>')}</div></div>` : ''}
${S.bagagem ? `<div class="caixa"><div class="rot">Bagagem incluída</div><div style="font-weight:700">${h(S.bagagem)}</div></div>` : ''}
${S.print ? `<div class="caixa print"><div class="rot">Valor no site ${S.cia ? 'da ' + h(S.cia) : 'da companhia'}</div><img src="${S.print}" alt="Valor no site da companhia"></div>` : ''}
${multi ? '' : resumo(OPS[0], 0)}
<p class="cond">${h(S.bagagem ? 'Inclui ' + S.bagagem.charAt(0).toLowerCase() + S.bagagem.slice(1) + '. ' : '')}${h(S.rodape)}</p></div>
<footer><div class="w"><div><b>${GO ? 'MAKTUB GO' : 'MAKTUB CORPORATIVO'}</b><span class="g">${GO ? 'Alfaiataria de Viagens' : 'Viagens a trabalho, resolvidas.'}</span></div><div class="r">${ctLinks()}<br>${S.codigo ? `<span class="g">Cotação ${h(S.codigo)}</span>` : ''}</div></div></footer>${multi ? `<script>document.querySelectorAll('.aba').forEach(function(b){b.onclick=function(){var n=b.dataset.op;document.querySelectorAll('.aba').forEach(function(x){x.setAttribute('aria-selected',x===b)});document.querySelectorAll('.op').forEach(function(s){s.hidden=s.dataset.op!==n});var a=document.querySelector('.abas');if(a)window.scrollTo({top:a.offsetTop-10,behavior:'smooth'})}})</script>` : ''}</body></html>`;
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
// cartão pelo link da InfinitePay com a taxa repassada: o valor do Pix é o que a Maktub recebe líquido.
// total = Pix ÷ (1 − taxa da parcela), arredondado para cima no centavo; parcela = total ÷ parcelas (confere com a calculadora da InfinitePay)
const parcTxt = () => { const pr = precoRapida(S); return pr ? `${brl(pr.cartao.total)} em até ${pr.n}x de ${brl(pr.cartao.parcela)} sem juros` : ''; };
// ordem do calendário: data e horário de saída (trecho sem data fica no fim, na ordem em que entrou)
const chaveTempo = (v) => v && v.data ? v.data + 'T' + (v.saida || '00:00') : '9999';
const ordenarVoos = (vs) => { const L = vs.map((v, i) => [v, i]); L.sort((a, b) => chaveTempo(a[0]).localeCompare(chaveTempo(b[0])) || a[1] - b[1]); L.forEach(([v], i) => { vs[i] = v; }); return vs; };
const rapVoos = () => ordenarVoos((S.voos || []).filter(v => v.ocod));
const VOO_RAP = () => ({ rotulo: '', data: '', ocod: '', onome: '', saida: '', dcod: '', dnome: '', chegada: '', tipo: 'Direto', duracao: '', pax: '' });
// passageiros de um trecho só aparecem quando são diferentes do total da cotação
const paxTrecho = (v, total) => { const n = parseInt(v && v.pax) || 0; return n > 0 && n !== total ? n : 0; };
// rótulos automáticos: Ida, Volta (ou Volta 1, Volta 2 quando a volta é em datas diferentes), Trecho N. O que foi digitado à mão fica.
function rotular(vs, ok = 'ocod', dk = 'dcod') {
  ordenarVoos(vs);
  const ori = vs[0] && vs[0][ok], n = vs.length;
  // uma ida e uma ou mais voltas para a origem (ex.: volta em datas diferentes): Ida, Volta 1, Volta 2
  const voltas = vs.slice(1), soVoltas = n > 1 && ori && voltas.every(v => v[dk] === ori);
  vs.forEach((v, i) => { if (v._rotM) return;
    v.rotulo = n === 1 ? 'Ida' : soVoltas ? (i === 0 ? 'Ida' : voltas.length > 1 ? 'Volta ' + i : 'Volta') : 'Trecho ' + (i + 1); });
}
/* ===== trechos em todas as cotações: colar sempre soma, X tira um trecho ===== */
// formato dos voos: rápida e corporativa (ocod/dcod) ou Maktub Go (origem/destino)
const FMT_C = { ok: v => !!(v && v.ocod), chave: v => [v.data, v.ocod, v.dcod, v.saida].join('|'), desc: v => [v.rotulo, ddmm(v.data), v.ocod && v.dcod ? v.ocod + ' → ' + v.dcod : ''].filter(Boolean).join(' · '), o: 'ocod', d: 'dcod' };
const FMT_GO = { ok: v => !!(v && (v.origem || v.destino)), chave: v => [v.data, v.origem, v.destino, v.saida].join('|'), desc: v => [v.rotulo, ddmm(v.data), v.origem && v.destino ? v.origem + ' → ' + v.destino : ''].filter(Boolean).join(' · '), o: 'origem', d: 'destino' };
// cada tela colada vira um grupo (_g) com o valor do site dela, para descontar quando o último trecho daquela tela sair
function marcarGrupo(T, voos, de) { const g = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); voos.forEach(v => { v._g = g; }); if (!T.site_g) T.site_g = {}; if (num(de)) T.site_g[g] = num(de); }
// cola na opção T: sem voos, entram os da tela; com voos, acrescenta só os trechos novos e soma o valor do site (o valor da Maktub continua um total único)
function somarVoos(T, novosBrutos, de, por, siteK, porK, F) {
  if (!novosBrutos.length) { if (de) T[siteK] = de; if (por) T[porK] = por; return { n: 0, somou: false }; }
  const atuais = (T.voos || []).filter(F.ok);
  if (!atuais.length) { T.voos = novosBrutos; T.site_g = {}; marcarGrupo(T, T.voos, de); if (de) T[siteK] = de; if (por) T[porK] = por; ordenarVoos(T.voos); return { n: novosBrutos.length, somou: false }; }
  const ja = new Set(atuais.map(F.chave)), novos = novosBrutos.filter(v => !ja.has(F.chave(v)));
  if (!novos.length) return { n: 0, somou: true };
  marcarGrupo(T, novos, de);
  T.voos = atuais.concat(novos); rotular(T.voos, F.o, F.d);
  if (num(de)) T[siteK] = String(Math.round(((num(T[siteK]) || 0) + num(de)) * 100) / 100);
  if (por && !num(T[porK])) T[porK] = por;
  return { n: novos.length, somou: true };
}
// tira o trecho i da opção T com confirmação: desconta o site da tela dele (quando sai o último trecho daquela tela) e apaga o valor da Maktub
function tirarVoo(T, i, siteK, porK, F) {
  const v = T.voos[i]; if (!v) return false;
  if (!F.ok(v)) { T.voos.splice(i, 1); return true; }
  const g = v._g, irmaos = g ? T.voos.filter(x => x !== v && x._g === g && F.ok(x)).length : 0, val = g && T.site_g ? T.site_g[g] : 0;
  const lin = [`Tirar o trecho ${F.desc(v)}?`];
  if (val && !irmaos) lin.push(`O valor do site desta tela (${brl(val)}) sai do total.`);
  else if (val && irmaos) lin.push('O valor do site continua: ele é de uma tela com mais trechos e só sai quando o último deles for tirado.');
  else if (num(T[siteK]) && T.voos.filter(F.ok).length > 1) lin.push('O valor do site não muda sozinho. Confira depois.');
  if (num(T[porK])) lin.push('O valor da Maktub será apagado para você digitar o novo total.');
  if (!confirm(lin.join('\n\n'))) return false;
  T.voos.splice(i, 1);
  if (val && !irmaos) { T[siteK] = String(Math.max(0, Math.round(((num(T[siteK]) || 0) - val) * 100) / 100)); delete T.site_g[g]; }
  if (!T.voos.some(F.ok)) { T[siteK] = ''; T.site_g = {}; }
  if (num(T[siteK]) <= 0) T[siteK] = '';
  T[porK] = '';
  return true;
}
const btnX = (attr) => `<button type="button" ${attr} aria-label="Tirar este trecho" style="flex:none;width:32px;height:32px;border:1px solid var(--linha);background:var(--papel, #fff);color:var(--tinta-2, inherit);font-size:18px;line-height:1;cursor:pointer;padding:0">×</button>`;
const linhaX = (conteudo, attr) => `<div style="display:flex;align-items:center;gap:8px;padding:2px 0"><div style="flex:1;min-width:0">${conteudo}</div>${btnX(attr)}</div>`;
function rapRota() { const v = rapVoos()[0]; if (!v) return ''; const a = cidadeDe(v.ocod) || v.onome || v.ocod, b = cidadeDe(v.dcod) || v.dnome || v.dcod; return `${a} ${rapVoos().length > 1 ? '⇄' : '→'} ${b}`; }
// a rápida vira uma cotação corporativa de uma opção para gerar o link
function rapParaCorp() {
  const v0 = rapVoos()[0];
  return { modelo: 'corp', marca: S.marca, codigo: '', passageiro: S.cliente || '', pessoas: S.pessoas || '1', validade: hoje(), cia: S.cia || '', rota: rapRota(),
    destino: v0 ? (cidadeDe(v0.dcod) || v0.dnome || '') : '', voos: rapVoos(), bagagem: S.bagagem || '', print: mostraEco() ? (S.prints[0] || '') : '',
    de: mostraEco() ? S.de : '', por: S.por, forma: [S.forma, parcTxt() ? 'ou ' + parcTxt() : ''].filter(Boolean).join(' · '), obs: S.obs || '', rodape: RAP_RODAPE };
}
// estado da bagagem: o que foi marcado ou, numa cotação antiga, o que está escrito no texto
const bagMao = () => typeof S.bag_mao === 'boolean' ? S.bag_mao : S.bag_mao === 'cabine' || (S.bag_mao === undefined && /cabine|de m[aã]o/i.test(S.bagagem || ''));
const bagDesp = () => S.bag_desp != null ? +S.bag_desp || 0 : +((/(\d)\s*malas?\s*despachada/i.exec(S.bagagem || '') || [, 0])[1]);
function textoBag(mao, desp) {
  const p = ['1 item pessoal'];
  if (mao) p.push('1 mala de mão de até 10 kg');
  if (+desp) p.push(`${desp} ${+desp === 1 ? 'mala despachada' : 'malas despachadas'} de até 23 kg`);
  return p.join(' + ') + ' por passageiro';
}
// o que o vendedor vê ao escolher as parcelas: quanto o cliente paga e quanto a Maktub recebe
// para o vendedor (não vai para o cliente): Pix, cartão sem juros e a tabela de 1x a 12x, já garantindo o mínimo da Maktub
function resumoParc() {
  if (S.so_pix) return `<div class="config" style="margin:0"><b>Só Pix:</b> ${num(S.por) ? `a cotação mostra ${brl(num(S.por))} no Pix` : 'a cotação mostra exatamente o valor digitado no Pix'}, sem cartão de crédito e sem desconto.</div>`;
  const pr = precoRapida(S), R = regraPix();
  if (!pr) return `<div class="sub" style="margin:0">Digite o mínimo que a Maktub quer receber. O app monta o Pix com ${pct1(R.desc)}% de desconto e o cartão em até ${R.n}x sem juros.</div>`;
  const c = pr.cartao, lin = [];
  for (let n = 1; n <= 12; n++) { const t = n <= pr.n ? c.total : cartao(pr.piso, n).total, par = Math.round(t * 100 / n) / 100;
    lin.push(`<div style="display:flex;justify-content:space-between;padding:3px 0;border-top:1px solid var(--linha);${n <= pr.n ? 'font-weight:600' : ''}"><span>${n}x de ${brl(par)}</span><span>${brl(t)}${n <= pr.n ? ' · sem juros' : ''}</span></div>`); }
  return `<div class="config" style="margin:0"><b>Pix:</b> ${brl(pr.pix)} (spread de ${brl(pr.pix - pr.piso)})<br><b>Na cotação:</b> ${brl(c.total)} em até ${pr.n}x de ${brl(c.parcela)} sem juros
    ${dobra('rpTab', 'Cliente pediu mais parcelas? Tabela de 1x a 12x', `<div style="font-size:13px;margin-top:4px">${lin.join('')}</div><div class="sub" style="margin:6px 0 0">Esses valores já garantem os ${brl(pr.piso)} para a Maktub. A cotação enviada continua mostrando só até ${pr.n}x.</div>`)}
    <div class="sub" style="margin:6px 0 0">Link da InfinitePay: o total da linha escolhida, sem repassar a taxa, com o número de parcelas dela.</div></div>`;
}
// colar de novo com voos já na cotação: sempre soma os trechos (ex.: ida de 1 passageiro + ida e volta de 2); para tirar, o X de cada trecho
let RAP_PAXN = '';
function editorRapida(P, X) {
  const { $ } = X;
  if (!S.voos) S.voos = []; if (!S.prints) S.prints = [];
  if (S.pessoas === undefined) S.pessoas = '1'; if (S.bagagem === undefined) S.bagagem = RAP_BAGAGEM;
  const vs = rapVoos(), paxTot = Math.max(1, parseInt(S.pessoas) || 1);
  const listaVoos = () => { const l = rapVoos(), tot = Math.max(1, parseInt(S.pessoas) || 1); return l.length ? l.map(v => { const n = paxTrecho(v, tot); return linhaX(`<b>${h(v.rotulo)}</b> ${ddmm(v.data)} · ${h(v.ocod)} ${h(v.saida)} → ${h(v.dcod)} ${h(v.chegada)} · ${h(v.tipo)}${n ? ` · ${n} ${n === 1 ? 'passageiro' : 'passageiros'}` : ''}`, `data-xv="${S.voos.indexOf(v)}"`); }).join('') : 'Sem voos ainda. Cole a tela acima ou digite à mão abaixo.'; };
  const avisoEco = () => { const a = num(S.de), b = num(S.por); if (!a || !b) return ''; if (b >= a) return '<div class="config" style="margin:4px 0">O valor da Maktub não está abaixo do site. A cotação sai só com o valor, sem comparação.</div>';
    const pc = Math.round((a - b) / a * 100); return `<label class="fc" style="margin:4px 0"><input type="checkbox" id="rpEcoCk" ${mostraEco() ? 'checked' : ''}><span>Mostrar a comparação com o site (economia de ${brl(a - b)}, ${pc}%)${ecoAuto() ? '' : '. Economia pequena: sugerimos deixar desligado'}</span></label>`; };
  P.innerHTML = `<button class="voltar" id="voltar">‹ Cotações</button>
    <h1 class="titulo" style="margin-top:6px">Cotação <em>rápida</em></h1>${faixaCard(X)}${htmlHistorico(X)}
    <div class="sub">Cole a tela da companhia e digite o valor. Serve para somente ida, ida e volta ou até 4 trechos: o visual se ajusta sozinho, em imagem ou em link.</div>
    <form class="form" id="fRap" autocomplete="off" onsubmit="return false">
      ${caixaColar('Copie o print e toque em Colar print, ou cole o texto da tela. Voos, paradas e valor do site vêm sozinhos.', 'ou curto: 02/12 GIG 12:20 SCL 17:00 direto · site 2.100 maktub 1.700')}
      ${vs.length ? `<div class="config" style="margin:6px 0"><div class="sub" style="margin:0 0 4px">Já tem ${vs.length} ${vs.length === 1 ? 'trecho' : 'trechos'} na cotação. Colar outra tela acrescenta os trechos novos. Para tirar um trecho, toque no X dele.</div>
        <label class="fl" style="margin-top:6px"><span>Passageiros nos trechos novos</span><input id="rpPaxN" inputmode="numeric" value="${h(RAP_PAXN)}" placeholder="Ex.: 2"></label><div class="sub" style="margin:2px 0 0">O valor do site também soma. O valor da Maktub continua um total único.</div></div>` : ''}
      <button type="button" class="zap" id="rpColar" style="width:100%">${vs.length ? 'Preencher e somar' : 'Preencher'}</button>
      <div class="config" style="margin:6px 0" id="rpLista">${listaVoos()}</div>${vs.length ? '<button type="button" id="rpLimpa" style="background:none;border:0;color:var(--tinta-3);text-decoration:underline;font:inherit;font-size:12px;padding:0">tirar voos</button>' : ''}
      ${dobra('rpVoosD', S.voos.length ? `Ajustar voos ou incluir trecho (${S.voos.length})` : 'Digitar voo à mão', `${S.voos.map((v, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira('voos#' + j)}
        ${duas(inp(`voos.${j}.rotulo`, 'Rótulo', 'text', 'data-rot="1" placeholder="Ida, Volta 1, Volta 2"'), inp(`voos.${j}.data`, 'Data', 'date'))}
        ${duas(inp(`voos.${j}.ocod`, 'Origem', 'text', 'placeholder="Cidade ou código" data-aero="cod" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"'), inp(`voos.${j}.saida`, 'Saída', 'time'))}
        ${duas(inp(`voos.${j}.dcod`, 'Destino', 'text', 'placeholder="Cidade ou código" data-aero="cod" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"'), inp(`voos.${j}.chegada`, 'Chegada', 'time'))}
        ${duas(sel(`voos.${j}.tipo`, 'Tipo', ['Direto', '1 conexão', '2 conexões', '3 conexões', '4 conexões']), selDias(`voos.${j}.mais1`))}
        ${inp(`voos.${j}.pax`, 'Passageiros neste trecho', 'text', `inputmode="numeric" placeholder="${paxTot} (todos)"`)}</div>`).join('')}
        <button type="button" class="sec" id="rpMais" style="width:100%;margin-top:6px">${S.voos.length ? '+ Trecho (já vem com a rota, só ajustar data e horário)' : '+ Voo'}</button>`)}
      <div class="duas-col">${inp('cliente', 'Cliente (não aparece na cotação)', 'text', 'placeholder="Victor Santiago"')}${inp('pessoas', 'Passageiros', 'text', 'inputmode="numeric"')}</div>
      <div class="duas-col">${inp('cia', 'Companhia', 'text', 'placeholder="LATAM"')}${sel('marca', 'Marca', ['Maktub Go', 'Maktub Corporativo'])}</div>
      <div class="config" style="margin:6px 0 8px"><div class="sub" style="margin:0 0 6px">Bagagem por passageiro · o item pessoal (mochila ou bolsa) já está sempre incluído</div>
        <label class="fc" style="margin:4px 0"><input type="checkbox" id="bagMao" ${bagMao() ? 'checked' : ''}><span>Mala de mão de até 10 kg</span></label>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px"><span>Malas despachadas de até 23 kg</span><span style="display:flex;align-items:center;gap:8px"><button type="button" class="sec" data-bagd="-1" style="width:40px;padding:6px 0">−</button><b style="min-width:18px;text-align:center">${bagDesp()}</b><button type="button" class="sec" data-bagd="1" style="width:40px;padding:6px 0">+</button></span></div></div>
      ${inp('bagagem', 'Bagagem incluída (sai assim na cotação; dá para ajustar)')}
      <div class="seg" id="rpForma" style="margin:8px 0 4px"><button type="button" data-f="ambos" class="${S.so_pix ? '' : 'on'}">Pix e cartão</button><button type="button" data-f="pix" class="${S.so_pix ? 'on' : ''}">Só Pix</button></div>
      ${inp('por', S.so_pix ? 'Valor no Pix (é o que o cliente vê)' : 'Quanto a Maktub quer receber (mínimo)', 'num', 'placeholder="1.000,00"')}
      <div id="rpParc" style="margin:-4px 0 8px">${resumoParc()}</div>
      ${inp('obs', 'Observação (opcional, aparece em destaque)', 'area', 'rows="2" placeholder="Ex.: Volta em datas diferentes: Ana e João em 10/12, Pedro em 15/12."')}
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
    if (k === 'por' && $('rpParc')) $('rpParc').innerHTML = resumoParc();
    previa(); });
  ligarEco();
  const lembrar = () => { try { localStorage.setItem('cotRapPadrao', JSON.stringify({ marca: S.marca, forma: S.forma })); } catch (e) {} };
  // data ou horário mudou à mão: põe os trechos de novo na ordem do calendário
  f.addEventListener('change', (e) => { const k = e.target.dataset.k || ''; if (/^voos\.\d+\.(data|saida)$/.test(k)) { const antes = S.voos.slice(); rotular(S.voos); if (S.voos.some((v, i) => v !== antes[i])) { ABERTOS.add('rpVoosD'); editorRapida(P, X); } } });
  f.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' && /^voos\./.test(e.target.dataset.k || '')) set(e.target.dataset.k, e.target.value); if (/^voos\./.test(e.target.dataset.k || '') && $('rpLista')) $('rpLista').innerHTML = listaVoos(); if (e.target.dataset.k === 'marca') set('marca', e.target.value); if (e.target.dataset.k === 'marca' || e.target.dataset.k === 'forma') lembrar(); previa(); });
  ligarPrint(P, X);
  $('rpColar').onclick = async () => {
    const txt = $('colaTxt').value.trim(); if (!txt) { X.aviso('Cole o texto primeiro.'); return; }
    const r = await lerColado(txt), o = r.opcoes[0];
    if (!o) { X.aviso('Não encontrei voos nem valores no texto.'); return; }
    const somar = rapVoos().length > 0 && o.voos.length;
    if (somar) {
      const chave = (v) => [v.data, v.ocod, v.dcod, v.saida].join('|'), ja = new Set(S.voos.map(chave));
      const novos = o.voos.filter(v => !ja.has(chave(v)));
      if (!novos.length) { X.aviso('Esses trechos já estão na cotação.'); return; }
      if (S.voos.length + novos.length > 4) { X.aviso(`A cotação rápida comporta até 4 trechos. Já tem ${S.voos.length}; esta tela traz ${novos.length}.`); return; }
      const totAntes = Math.max(1, parseInt(S.pessoas) || 1), pn = parseInt(($('rpPaxN') || {}).value) || 0;
      // trechos que já estavam ficam com a quantidade de antes; os novos com a informada (ou a lida da tela)
      S.voos.forEach(v => { if (!(parseInt(v.pax) > 0)) v.pax = String(totAntes); });
      novos.forEach(v => { completarVoo(v); v.pax = String(pn || parseInt(v.pax) || totAntes); });
      marcarGrupo(S, novos, o.de);
      S.voos = S.voos.concat(novos); rotular(S.voos);
      S.pessoas = String(Math.max(totAntes, ...S.voos.map(v => parseInt(v.pax) || 0)));
      if (o.de) S.de = String(Math.round(((num(S.de) || 0) + num(o.de)) * 100) / 100);
      RAP_PAXN = '';
    } else if (o.voos.length) { S.voos = o.voos; S.site_g = {}; marcarGrupo(S, S.voos, o.de); S.voos.forEach(v => completarVoo(v)); rotular(S.voos);
      const mx = Math.max(0, ...S.voos.map(v => parseInt(v.pax) || 0)); if (mx > (parseInt(S.pessoas) || 1)) S.pessoas = String(mx); }
    if (!somar && o.de) S.de = o.de; if (!somar && o.por) S.por = o.por; if (r.cia) S.cia = r.cia; if (r.cliente && !S.cliente) S.cliente = r.cliente;
    if (!o.voos.length) ABERTOS.add('rpVoosD');
    S.eco = undefined; editorRapida(P, X); X.aviso(!o.voos.length ? 'Não achei os voos no texto. Digite à mão em "Digitar voo à mão".' : num(S.por) ? 'Preenchido. Confira e envie.' : 'Preenchido. Digite o valor com a Maktub.');
    if (!num(S.por) && $('fRap').querySelector('[data-k="por"]')) $('fRap').querySelector('[data-k="por"]').focus();
  };
  // tirar um trecho: confirma, desconta o valor do site da tela dele (quando sai o último trecho daquela tela) e apaga o valor da Maktub para digitar o novo total
  const tirarTrecho = (i) => { if (!tirarVoo(S, i, 'de', 'por', FMT_C)) return;
    S.eco = undefined; rotular(S.voos); editorRapida(P, X);
    const cp = $('fRap') && $('fRap').querySelector('[data-k="por"]'); if (cp) cp.focus();
    X.aviso('Trecho removido. Digite o novo valor da Maktub.'); };
  if ($('rpLista')) $('rpLista').onclick = (e) => { const b = e.target.closest('[data-xv]'); if (b) tirarTrecho(+b.dataset.xv); };
  if ($('rpLimpa')) $('rpLimpa').onclick = () => { if (!confirm('Tirar todos os voos desta cotação?\n\nO valor do site e o valor da Maktub também serão apagados.')) return; S.voos = []; S.site_g = {}; S.de = ''; S.por = ''; S.eco = undefined; editorRapida(P, X); };
  if ($('rpForma')) $('rpForma').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; S.so_pix = b.dataset.f === 'pix'; editorRapida(P, X); };
  if ($('rpPaxN')) $('rpPaxN').oninput = (e) => { RAP_PAXN = e.target.value.replace(/\D/g, ''); };
  // bagagem: mala de mão liga e desliga, despachada no + e −; monta o texto da cotação (continua editável)
  const bagTexto = () => { S.bagagem = textoBag(S.bag_mao, S.bag_desp); editorRapida(P, X); };
  if ($('bagMao')) $('bagMao').onchange = (e) => { S.bag_mao = e.target.checked; S.bag_desp = bagDesp(); bagTexto(); };
  P.querySelectorAll('[data-bagd]').forEach(bt => bt.onclick = () => { S.bag_mao = bagMao(); S.bag_desp = Math.max(0, Math.min(9, bagDesp() + +bt.dataset.bagd)); bagTexto(); });
  $('rpMais').onclick = () => { const ult = S.voos[S.voos.length - 1], uma = S.voos.length === 1, n = ult ? { ...VOO_RAP(), ocod: uma ? ult.dcod : ult.ocod, dcod: uma ? ult.ocod : ult.dcod, onome: uma ? ult.dnome : ult.onome, dnome: uma ? ult.onome : ult.dnome, tipo: ult.tipo, data: ult.data } : VOO_RAP();
    S.voos.push(n); rotular(S.voos); ABERTOS.add('rpVoosD'); editorRapida(P, X); };
  P.querySelectorAll('#fRap [data-tira]').forEach(b => b.onclick = () => tirarTrecho(+b.dataset.tira.split('#')[1]));
  if ($('rpPrint')) $('rpPrint').onchange = async (e) => { const novas = (await Promise.all([...e.target.files].slice(0, 4).map(x => reduzir(x, 1400)))).filter(Boolean); S.prints = S.prints.concat(novas); ABERTOS.add('rpPrintD'); editorRapida(P, X); };
  P.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { S.prints.splice(+b.dataset.rm, 1); editorRapida(P, X); });
  P.querySelectorAll('details[data-d]').forEach(d => d.ontoggle = () => { d.open ? ABERTOS.add(d.dataset.d) : ABERTOS.delete(d.dataset.d); });
  const pronto = () => { if (!num(S.por)) { X.aviso('Digite o valor total com a Maktub.'); return false; } return true; };
  ligarFaixa(P, X);
  $('rpEnviar').onclick = () => { if (pronto()) comCardNaCotacao(P, X, enviarImagem); };
  const enviarImagem = async () => {
    enviada(X, 'Imagem no WhatsApp'); salvar(X, true); const blob = await imagemRapida(); const arq = new File([blob], 'cotacao-maktub.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [arq] })) { try { await navigator.share({ files: [arq] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    baixar(blob); X.aviso('Imagem baixada. Anexe no WhatsApp.');
  };
  $('rpBaixar').onclick = () => { if (pronto()) comCardNaCotacao(P, X, async () => { enviada(X, 'Imagem baixada'); salvar(X, true); baixar(await imagemRapida()); }); };
  $('rpSalvar').onclick = () => comCardNaCotacao(P, X, () => salvar(X));
  $('linkC').onclick = () => { if (pronto()) comCardNaCotacao(P, X, () => gerarLink(X)); };
  previa();
}
// cotação entregue ao cliente: o card vai para "Cotação enviada" com o valor cotado (a ligação com o card fica guardada)
// e cada envio vira um registro na própria cotação: quando, por onde, quem e quanto (o link pode ser o mesmo, o histórico fica)
function enviada(X, canal, link) {
  if (!S) return;
  const d = S.modelo === 'go' ? autoGo(S) : S;
  if (canal) {
    const ops = opcoesCotacao(d).map(o => ({ nome: o.nome || '', valor: o.valor || 0 }));
    const reg = { em: new Date().toISOString(), canal, por: (X.D && X.D.eu) || '', opcoes: ops, voos: resumoVoosCot(d), link: '' };
    reg.link = link || (S.link_slug ? 'https://www.maktubgo.com.br/' + S.link_slug : '');
    const H = S.historico = S.historico || [], ult = H[H.length - 1];
    // o mesmo envio repetido em poucos minutos (tocou duas vezes) não vira um registro novo
    if (ult && Date.now() - new Date(ult.em) < 10 * 6e4 && JSON.stringify(ult.opcoes) === JSON.stringify(reg.opcoes) && ult.voos === reg.voos) Object.assign(ult, { em: reg.em, canal: reg.canal, link: reg.link || ult.link });
    else H.push(reg);
    fotoDoEnvio(X, S, H.includes(reg) ? reg : ult);
  }
  if (S.reuniao_id && X.cotacaoEnviada) X.cotacaoEnviada(S.reuniao_id, { valor: valorCotacao(d) });
}
// a "foto" do envio: a imagem (rápida) ou a página (Maktub Go e corporativo) exatamente como o cliente recebeu.
// Vai sozinha para o arquivo privado, sem passo a mais para o time. Se falhar, o registro com os valores continua.
async function fotoDoEnvio(X, alvo, reg) {
  try {
    const rap = alvo.modelo === 'rapida';
    const antes = S; S = alvo; let corpo;
    try { corpo = rap ? await imagemRapida() : new Blob([gerar(X)], { type: 'text/html' }); } finally { S = antes; }
    const path = `cotacao/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${rap ? 'jpg' : 'html'}`;
    const up = await X.sb.storage.from('vendas').upload(path, corpo, { contentType: rap ? 'image/jpeg' : 'text/html', upsert: false });
    if (up.error) return;
    reg.foto = path;
    // espera a cotação existir no banco (o salvar roda junto com o envio) e grava o registro com a foto
    for (let i = 0; i < 20 && !alvo._id; i++) await new Promise(ok => setTimeout(ok, 500));
    if (!alvo._id) return;
    await new Promise(ok => setTimeout(ok, 1500));
    const dados = JSON.parse(JSON.stringify(alvo)); delete dados._id;
    await X.sb.from('propostas').update({ dados }).eq('id', alvo._id);
  } catch (e) { /* sem foto, fica só o registro */ }
}
async function verEnvio(X, path) {
  const w = window.open('', '_blank');
  if (/\.html$/.test(path)) {
    const { data, error } = await X.sb.storage.from('vendas').download(path);
    if (error || !data) { if (w) w.close(); X.aviso('Não abriu o envio.'); return; }
    const html = await data.text(); if (w) { w.document.open(); w.document.write(html); w.document.close(); } return;
  }
  const { data, error } = await X.sb.storage.from('vendas').createSignedUrl(path, 600);
  if (error) { if (w) w.close(); X.aviso('Não abriu o envio.'); return; }
  if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
}
function resumoVoosCot(d) {
  const o = opcoesCotacao(d)[0]; if (!o) return '';
  const vs = d.modelo === 'go' ? (o.o.voos || []).filter(v => v.origem || v.destino).map(v => `${v.origem}-${v.destino}${v.data ? ' ' + ddmm(v.data) : ''}`) : (o.voos || []).filter(v => v.ocod).map(v => `${v.ocod}-${v.dcod}${v.data ? ' ' + ddmm(v.data) : ''}${v.saida ? ' ' + v.saida : ''}`);
  return vs.join(' · ');
}
// histórico de envios, do mais recente para o mais antigo
function htmlHistorico(X) {
  const H = (S.historico || []).slice().reverse(); if (!H.length) return '';
  const dh = (iso) => { const t = new Date(iso); return t.toLocaleDateString('pt-BR') + ' ' + t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  return dobra('histEnv', `Histórico de envios (${H.length})`, H.map((r, i) => `<div style="border-top:${i ? '1px solid var(--linha)' : '0'};padding:6px 0;font-size:13px"><b>${dh(r.em)}</b> · ${X.esc(r.canal)}${r.por ? ' · ' + X.esc(r.por) : ''}
    <div>${r.opcoes.map(o => `${o.nome ? X.esc(o.nome) + ': ' : ''}${o.valor ? brl(o.valor) : 'sem valor'}`).join(' · ')}</div>${r.voos ? `<div style="color:var(--tinta-3)">${X.esc(r.voos)}</div>` : ''}${r.foto ? `<button type="button" data-verenvio="${X.esc(r.foto)}" class="sec" style="margin-top:4px;padding:6px 10px;font-size:12px">Ver como foi enviada</button>` : ''}</div>`).join(''));
}
function baixar(blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cotacao-maktub.jpg'; document.body.appendChild(a); a.click(); a.remove(); }
const carregar = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

/* ================= cotação rápida: modelo aprovado em 16/10/2026 =================
   O mesmo desenho serve para somente ida, ida e volta e multitrecho (até 4 trechos; com mais, a peça cresce).
   A imagem não tem altura fixa: acompanha a quantidade de trechos, sem sobrar espaço em branco.
   Sem duração de voo e sem comparação com o site. */
const EXT = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito'];
const MES3 = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const cap = (t) => t ? t[0].toUpperCase() + t.slice(1) : t;
// taxas do link de pagamento (InfinitePay, recebimento em 1 dia útil), de 1x a 12x. As da configuração do app têm prioridade.
export const TAXAS_PADRAO = [4.2, 6.09, 7.01, 7.91, 8.8, 9.67, 12.59, 13.42, 14.25, 15.06, 15.87, 16.66];
let TAXAS = null;
const taxasCartao = () => Array.isArray(TAXAS) && TAXAS.length === 12 && TAXAS.every(t => t !== null && t !== '' && !isNaN(+t)) ? TAXAS.map(Number) : TAXAS_PADRAO;
// regra padrão da cotação rápida: o vendedor digita o mínimo que a Maktub quer receber.
// Cartão em até N vezes sem juros (calculado com a taxa de N vezes, então a Maktub recebe o mínimo mesmo em N vezes)
// e Pix com X% de desconto sobre o cartão. O que passa do mínimo é o spread da Maktub. Acima de N vezes, só quando o vendedor pede.
let REGRA = null;
const regraPix = () => ({ desc: REGRA && REGRA.desc != null && +REGRA.desc >= 0 && +REGRA.desc < 50 ? +REGRA.desc : 5, n: REGRA && +REGRA.n >= 1 && +REGRA.n <= 12 ? Math.round(+REGRA.n) : 4 });
const pct1 = (v) => String(v).replace('.', ',');
// usado fora do cotador (fechamento e indicadores): aplica as taxas e a regra salvas e diz a taxa de cada parcela
export function configurar(cfg) { cfg = cfg || {}; TAXAS = cfg.taxas_cartao; REGRA = { desc: cfg.pix_desconto, n: cfg.parcelas_sem_juros }; }
export const taxaCartao = (n) => taxasCartao()[n - 1];
// valor certo da venda pela cotação rápida: Pix, ou cartão em n vezes (até as sem juros, o preço do cartão; acima, o da tabela)
// valor pago pelo cliente na forma escolhida, para qualquer modelo (no cartão é o total que passa na maquininha)
export function valorDaOpcao(d, k, forma, n) {
  if (!d) return null;
  if (d.modelo === 'go') {
    const op = opcoesCotacao(d)[k || 0] || opcoesCotacao(d)[0]; if (!op) return null; const p = precos(op.o);
    if (forma === 'pix') return p.pix || null;
    return forma === 'cartao' && p.cartao && n >= 1 && n <= p.parc ? p.cartao : null;
  }
  if (d.modelo === 'corp') { const op = opcoesCotacao(d)[k || 0] || opcoesCotacao(d)[0]; return forma === 'pix' && op ? op.valor || null : null; }
  return valorPelaCotacao(d, forma, n);
}
export function valorPelaCotacao(d, forma, n) {
  const pr = precoRapida(d); if (!pr) return null;
  if (forma === 'pix') return pr.pix;
  if (forma !== 'cartao' || !(n >= 1 && n <= 12)) return null;
  return n <= pr.n ? pr.cartao.total : (cartao(pr.piso, n) || {}).total || null;
}
export function precoRapida(d) {
  // cotação só no Pix: sem cartão e sem o acréscimo que vira desconto; o cliente vê exatamente o valor digitado
  if (d && d.so_pix) return null;
  const piso = num(d && d.por); if (!piso) return null;
  const { desc, n } = regraPix(), c = cartao(piso, n); if (!c) return null;
  const comDesc = Math.round(c.total * (100 - desc)) / 100, pix = Math.max(piso, comDesc);
  const np = parseInt(d.parcelas) || 0, extra = np > n ? cartao(piso, np) : null;
  // se o desconto padrão deixaria o Pix abaixo do mínimo, o Pix fica no mínimo e mostra o desconto real (arredondado para baixo)
  const descMostra = pix === comDesc ? desc : Math.floor((c.total - pix) / c.total * 1000) / 10;
  return { piso, pix, cartao: c, n, desc: descMostra, extra: extra ? { n: np, ...extra } : null };
}
export function cartao(valorPix, n) {
  const t = taxasCartao()[n - 1]; if (!(n >= 1) || t == null || t >= 100 || !(valorPix > 0)) return null;
  const total = Math.ceil(Math.round(valorPix * 100 / (1 - t / 100) * 1e6) / 1e6) / 100;
  return { total, parcela: Math.round(total * 100 / n) / 100, taxa: t };
}
// bagagem em ícones (traço dourado, desenhados no estilo da marca). Só aparece o que a tarifa inclui.
const ICON_BAG = {
  item: '<rect x="5" y="7.5" width="14" height="13.5" rx="3.5"/><path d="M9 7.5V6a3 3 0 0 1 6 0v1.5"/><rect x="8" y="13.5" width="8" height="4.5" rx="1.5"/><path d="M5 12h14"/>',
  mao: '<rect x="7" y="8.5" width="10" height="11.5" rx="2"/><path d="M10 8.5V3.5h4v5"/><path d="M10.5 11.5v5.5M13.5 11.5v5.5"/><circle cx="9.5" cy="21.6" r="1"/><circle cx="14.5" cy="21.6" r="1"/>',
  desp: '<rect x="4.5" y="6.5" width="15" height="14" rx="2.5"/><path d="M9.5 6.5V4h5v2.5"/><path d="M8.5 9.5v8M12 9.5v8M15.5 9.5v8"/><circle cx="7.5" cy="22" r="1"/><circle cx="16.5" cy="22" r="1"/>'
};
const svgBag = (k, px) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="#A88B4A" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${ICON_BAG[k]}</svg>`;
function itensBag() {
  const d = bagDesp(), tx = String(S.bagagem || '');
  // o peso vem do texto quando foi ajustado à mão (ex.: 32 kg na executiva)
  const kgM = (/m[aã]o de até (\d+)\s*kg/i.exec(tx) || /cabine de até (\d+)\s*kg/i.exec(tx) || [, '10'])[1], kgD = (/despachadas? de até (\d+)\s*kg/i.exec(tx) || [, '23'])[1];
  const L = [['item', 'Item pessoal', 'mochila ou bolsa', '']];
  if (bagMao()) L.push(['mao', 'Mala de mão', `até ${kgM} kg`, '']);
  if (d > 0) L.push(['desp', 'Despachada', `até ${kgD} kg`, d > 1 ? d + 'x' : '']);
  // o que o texto disser além dos ícones (caso fora do padrão) aparece embaixo deles
  const esperado = textoBag(bagMao(), d).replace('de até 10 kg', `de até ${kgM} kg`).replace(/(despachadas? de até )23( kg)/, `$1${kgD}$2`);
  const extra = tx.trim() && !/cabine/i.test(tx) && tx.trim() !== esperado ? tx.trim() : '';
  return { L, extra };
}
function rapInfo() {
  const vs = rapVoos(), n = vs.length, pax = Math.max(1, parseInt(S.pessoas) || 1);
  const cid = (v, k) => cidadeDe(v[k + 'cod']) || v[k + 'nome'] || String(v[k + 'cod'] || '').toUpperCase();
  const seq = []; vs.forEach((v, i) => { if (!i) seq.push(cid(v, 'o')); seq.push(cid(v, 'd')); });
  const uni = [...new Set(seq.filter(Boolean))];
  const ida = n === 1, iv = n === 2 && vs[1].dcod === vs[0].ocod && vs[1].ocod === vs[0].dcod;
  const titulo = !n ? 'Sua viagem' : ida ? `${uni[0]} → ${uni[1] || ''}` : uni.length <= 2 ? uni.join(' & ') : uni.slice(0, -1).join(', ') + ' & ' + uni[uni.length - 1];
  const tipo = ida ? 'Somente ida' : iv ? 'Ida e volta' : `${cap(EXT[n] || String(n))} trechos`;
  const total = ida ? 'Somente ida' : iv ? 'Ida e volta' : `Os ${EXT[n] || n} trechos`;
  const paxT = `${pax} ${pax === 1 ? 'passageiro' : 'passageiros'}`;
  // com cartão na cotação, o Pix aparece como o desconto
  // o valor grande é o do Pix; embaixo, o cartão de crédito por extenso (e o parcelamento maior, se o vendedor pediu)
  const pr = precoRapida(S), cc = pr;
  // a cotação nunca anuncia mais que as parcelas sem juros; parcelamento maior o vendedor passa na conversa (tabela no editor)
  // "taxas de embarque inclusas" fica no bloco do que está incluído na passagem, junto da bagagem
  const pagto = pr ? [`No cartão de crédito: ${brl(pr.cartao.total)}${pr.n > 1 ? ` em até ${pr.n}x de ${brl(pr.cartao.parcela)} sem juros` : ' à vista'}`] : [S.so_pix ? 'Pagamento à vista no Pix' : (S.forma || 'À vista via Pix')];
  const totalLbl = `${pr || S.so_pix ? 'No Pix · ' : ''}${total}`, valor = pr ? pr.pix : num(S.por);
  const descTxt = pr && pr.desc > 0 ? `${pct1(pr.desc)}% de desconto por pagar no Pix` : '';
  const trechos = vs.map((v, i) => { const d = dt(v.data), np = parseInt(v.pax) || pax;
    return { v, rot: v.rotulo || 'Trecho ' + (i + 1), dia: d ? SEMANA[d.getDay()] : '', dataC: d ? `${String(d.getDate()).padStart(2, '0')} ${MES3[d.getMonth()]}` : '', dataL: d ? v.data.split('-').reverse().join('/') : '',
      tipo: (v.tipo || 'Direto'), o: String(v.ocod || '').toUpperCase(), d: String(v.dcod || '').toUpperCase(), onome: v.onome || cidadeDe(v.ocod) || '', dnome: v.dnome || cidadeDe(v.dcod) || '', pax: np }; });
  const corp = S.marca === 'Maktub Corporativo';
  // mensagem do botão "Quero fechar esta viagem": a Maktub já sabe qual cotação é
  const per = trechos.length ? (trechos.length > 1 && trechos[trechos.length - 1].dataL ? ` (${ddmm(trechos[0].v.data)} a ${ddmm(trechos[trechos.length - 1].v.data)})` : trechos[0].dataL ? ` (${ddmm(trechos[0].v.data)})` : '') : '';
  const zapTxt = `Olá, Maktub! Quero fechar a viagem ${titulo}${per}${S.cliente ? ', em nome de ' + String(S.cliente).trim() : ''}.${S.slug ? ' Cotação: maktubgo.com.br/' + S.slug : ''}`;
  return { vs, n, pax, titulo, tipo, total: totalLbl, paxT, pagto, cc, descTxt, valor, zapTxt, trechos, corp, sub: [S.cia, tipo, paxT].filter(Boolean), rota: n ? `${trechos[0].o} ${n > 1 ? '⇄' : '→'} ${trechos[0].d}` : '' };
}
// página do link (mesmo visual da imagem, em versão para celular)
function htmlRapida() {
  const I = rapInfo(), R = RAPM || {}, agora = new Date();
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), hoje = agora.toLocaleDateString('pt-BR');
  const tr = I.trechos.map(t => `
      <div class="tr">
        <div class="tr-top"><span class="tr-rot">${h(t.rot)}</span><span class="tr-data">${h(t.dia)}${t.dataL ? ' · ' + t.dataL : ''}</span></div>
        <div class="tr-body">
          <div class="pt"><div class="h">${h(t.v.saida || '')}</div><div class="a">${h(t.o)}${t.onome ? ' · ' + h(t.onome) : ''}</div></div>
          <div class="mid"><div class="seta">&#8594;</div><div class="tipo">${h(t.tipo)}</div></div>
          <div class="pt fim"><div class="h">${h(t.v.chegada || '')}${dmais(t.v) ? `<sup>+${dmais(t.v)}</sup>` : ''}</div><div class="a">${h(t.d)}${t.dnome ? ' · ' + h(t.dnome) : ''}</div></div>
          <div class="pax">${t.pax} ${t.pax === 1 ? 'passageiro' : 'passageiros'}</div>
        </div>
      </div>`).join('');
  const obs = String(S.obs || '').trim();
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(I.titulo)} · ${I.corp ? 'Maktub Corporativo' : 'Maktub Go'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Jost:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--verde:#1B4332;--dourado:#A88B4A;--creme:#EBE0C4;--papel:#F4F2ED;--branco:#fff;--texto:#3A3A34;--suave:#8A877E;--linha:#E4DFD2}
body{font-family:'Jost',sans-serif;background:#E9E6DD;color:var(--texto);line-height:1.6;-webkit-font-smoothing:antialiased;padding:18px 12px 34px}
.peca{max-width:600px;margin:0 auto;background:var(--papel);box-shadow:0 2px 24px rgba(27,67,50,.1);overflow:hidden}
.topo{background:var(--creme);padding:20px 26px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.topo .ass img{height:50px;width:auto;display:block}
.topo .marca{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:var(--verde);letter-spacing:1px}
.topo .tag{font-size:9.5px;letter-spacing:2.6px;text-transform:uppercase;color:rgba(27,67,50,.6);margin-top:5px;margin-left:3px}
.topo .ct{text-align:right;font-size:11px;color:var(--verde);line-height:1.9}
.topo .ct b{font-weight:500}
.faixa{background:var(--verde);display:grid;grid-template-columns:1fr 1fr 1fr}
.faixa > div{padding:13px 18px;border-left:1px solid rgba(235,224,196,.16)}
.faixa > div:first-child{border-left:none}
.faixa .k{font-size:8px;letter-spacing:2.6px;text-transform:uppercase;color:var(--dourado);font-weight:500}
.faixa .v{font-size:12.5px;color:var(--creme);margin-top:4px;letter-spacing:.3px}
.corpo{padding:34px 26px 28px;position:relative}
.corpo::before{content:'';position:absolute;top:18px;left:50%;transform:translateX(-50%);width:216px;height:227px;opacity:.05;background:url('${R.marcaDagua || ''}') no-repeat center/contain;pointer-events:none}
.corpo > *{position:relative}
.rota-tt{font-family:'Cormorant Garamond',serif;font-size:31px;font-weight:500;color:var(--verde);text-align:center;line-height:1.25;letter-spacing:.5px}
.rota-sub{text-align:center;font-size:9.5px;letter-spacing:3.4px;text-transform:uppercase;color:var(--dourado);margin-top:9px;font-weight:500}
.fio{width:38px;height:1px;background:var(--dourado);margin:20px auto 26px}
.tr{background:var(--branco);border:1px solid var(--linha);margin-bottom:12px}
.tr-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:11px 18px;border-bottom:1px solid var(--linha);background:#FBFAF6}
.tr-rot{font-size:8.5px;letter-spacing:2.8px;text-transform:uppercase;color:var(--dourado);font-weight:500}
.tr-data{font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:var(--verde);font-weight:500}
.tr-body{padding:20px 18px 16px;display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap}
.pt{flex:1;min-width:104px}
.pt.fim{text-align:right}
.pt .h{font-family:'Cormorant Garamond',serif;font-size:37px;font-weight:600;color:var(--verde);line-height:1;letter-spacing:.5px;font-variant-numeric:lining-nums;font-feature-settings:'lnum' 1,'tnum' 0}
.pt .h sup{font-family:'Jost',sans-serif;font-size:11px;color:var(--dourado);font-weight:500;margin-left:2px;vertical-align:top}
.pt .a{font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:var(--suave);margin-top:6px}
.mid{flex:0 0 auto;text-align:center;padding:8px 6px 0}
.mid .seta{color:var(--dourado);font-size:17px;line-height:1}
.mid .tipo{font-size:8px;letter-spacing:1.8px;text-transform:uppercase;color:var(--suave);margin-top:6px;white-space:nowrap}
.pax{flex:1 0 100%;margin-top:15px;padding-top:11px;border-top:1px solid var(--linha);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--suave);text-align:center}
.bag,.obs{border:1px solid var(--linha);background:var(--branco);padding:15px 18px;margin:16px 0 0;text-align:center}
.obs{border-color:var(--dourado);background:#FBF7EC}
.bag{margin-bottom:22px;padding:16px 10px 14px}
.bagrow{display:flex;justify-content:center;gap:18px;margin-top:12px}.bagit{width:104px}.bagic{position:relative;display:inline-block}
.bagq{position:absolute;top:-3px;right:-14px;background:var(--verde);color:var(--creme);font-size:9px;font-weight:500;border-radius:20px;padding:2px 6px}
.bagt{font-size:12px;color:var(--verde);margin-top:6px;font-weight:500}.bags{font-size:9.5px;color:var(--suave);letter-spacing:.5px;margin-top:2px}
.bagtx{font-size:10px;color:var(--suave);margin-top:12px;padding-top:10px;border-top:1px solid var(--linha)}
.bag .k,.obs .k{font-size:8px;letter-spacing:2.8px;text-transform:uppercase;color:var(--dourado);font-weight:500}
.bag .v,.obs .v{font-size:12.5px;color:var(--verde);margin-top:7px;white-space:pre-line}
.valor{background:var(--verde);padding:32px 24px;text-align:center}
.valor .k{font-size:8.5px;letter-spacing:3.6px;text-transform:uppercase;color:var(--dourado);font-weight:500}
.valor .n{font-family:'Cormorant Garamond',serif;font-size:56px;font-weight:500;color:var(--creme);line-height:1.08;margin:12px 0 2px;letter-spacing:1px;font-variant-numeric:lining-nums;font-feature-settings:'lnum' 1}
.valor .p{font-size:10.5px;letter-spacing:3px;text-transform:uppercase;color:rgba(235,224,196,.72)}
.valor .desc{display:inline-block;margin-top:12px;padding:6px 14px;border:1px solid var(--dourado);border-radius:20px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dourado);font-weight:500}
.valor .cta{display:block;margin:22px auto 0;max-width:340px;background:var(--creme);color:var(--verde);text-decoration:none;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:500;padding:15px 18px}
.valor .cta-sub{font-size:9.5px;color:rgba(235,224,196,.55);margin-top:8px;letter-spacing:.3px}
.valor .d{margin-top:16px;padding-top:14px;border-top:1px solid rgba(235,224,196,.18);font-size:11px;color:rgba(235,224,196,.65);letter-spacing:.3px}
.nota{padding:20px 26px 24px;font-size:10px;line-height:1.95;color:var(--suave);text-align:center}
.rodape{background:var(--verde);padding:28px 24px 24px;text-align:center}
.rodape .selo img{height:66px;width:auto;opacity:.92}
.rodape .lt img{height:34px;width:auto;margin-top:14px;opacity:.95}
.rodape .ct{margin-top:16px;padding-top:14px;border-top:1px solid rgba(235,224,196,.16);font-size:10.5px;color:rgba(235,224,196,.8);line-height:1.95;letter-spacing:.4px}
@media(max-width:470px){body{padding:0}.topo{justify-content:center;text-align:center}.topo .ct{text-align:center}.faixa > div{padding:11px 12px}.faixa .v{font-size:11.5px}.rota-tt{font-size:25px}.valor .n{font-size:44px}.pt .h{font-size:30px}}
</style></head><body>
<div class="peca">
  <div class="topo">
    <div>
      ${I.corp || !R.assin ? `<div class="marca">${I.corp ? 'Maktub Corporativo' : 'Maktub Go'}</div>` : `<div class="ass"><img src="${R.assin}" alt="Maktub Go"></div>`}
      <div class="tag">${I.corp ? 'Viagens a trabalho, resolvidas.' : 'Alfaiataria de Viagens'}</div>
    </div>
    <div class="ct"><b>${EMAIL}</b><br>${ZAP_TXT}</div>
  </div>
  <div class="faixa">
    <div><div class="k">Passageiros</div><div class="v">${I.pax} ${I.pax === 1 ? 'pessoa' : 'pessoas'}</div></div>
    <div><div class="k">Trecho</div><div class="v">${h(I.rota)}</div></div>
    <div><div class="k">Consulta</div><div class="v">${hoje}</div></div>
  </div>
  <div class="corpo">
    <div class="rota-tt">${h(I.titulo)}</div>
    <div class="rota-sub">${I.sub.map(h).join(' &nbsp;·&nbsp; ')}</div>
    <div class="fio"></div>
${tr}
    ${obs ? `<div class="obs"><div class="k">Observação</div><div class="v">${h(obs)}</div></div>` : ''}
    ${(B => `<div class="bag"><div class="k">Bagagem por passageiro</div><div class="bagrow">${B.L.map(([k, t, sb, q]) => `<div class="bagit"><div class="bagic">${svgBag(k, 40)}${q ? `<span class="bagq">${q}</span>` : ''}</div><div class="bagt">${t}</div><div class="bags">${sb}</div></div>`).join('')}</div>${B.extra ? `<div class="v" style="margin-top:10px">${h(B.extra)}</div>` : ''}<div class="bagtx">Taxas de embarque inclusas</div></div>`)(itensBag())}
  </div>
  <div class="valor">
    <div class="k">Valor total</div>
    <div class="n">${brl(I.valor)}</div>
    <div class="p">${h(I.total)}</div>
    ${I.descTxt ? `<div class="desc">${h(I.descTxt)}</div>` : ''}
    <div class="d">${I.cc ? I.pagto.map(t => `<b style="color:var(--creme);font-weight:500">${h(t)}</b>`).join('<br>') : I.pagto.map(h).join(' &nbsp;·&nbsp; ')}</div>
    <a class="cta" href="https://wa.me/${ZAP}?text=${encodeURIComponent(I.zapTxt)}" target="_blank" rel="noopener">Quero fechar esta viagem</a>
    <div class="cta-sub">Abre o WhatsApp da Maktub com a sua mensagem pronta</div>
  </div>
  <div class="nota">
    Valores consultados em ${hoje} às ${hora}.<br>
    Tarifa sujeita à confirmação no momento da emissão. Horários locais.<br>
    Alterações podem ser feitas pela companhia aérea.
  </div>
  <div class="rodape">
    ${R.selo ? `<div class="selo"><img src="${R.selo}" alt="Maktub Go"></div>` : ''}
    ${R.letreiro ? `<div class="lt"><img src="${R.letreiro}" alt="Seu destino começa aqui"></div>` : ''}
    <div class="ct">${ctLinks()}</div>
  </div>
</div>
</body></html>`;
}
// fontes do desenho: Jost do app e a Cormorant com algarismos alinhados (iguais aos do modelo)
let FONTES = null;
function fontesProntas() {
  if (FONTES) return FONTES;
  FONTES = (async () => {
    try { for (const w of ['500', '600']) { const f = new FontFace('Cormorant Maktub', `url(/admin/app/fontes/cormorant-lnum-${w}.woff2)`, { weight: w }); await f.load(); document.fonts.add(f); } } catch (e) { /* cai na Cormorant comum */ }
    try { await Promise.all(['400 16px Jost', '500 16px Jost'].map(x => document.fonts.load(x))); } catch (e) {}
  })();
  return FONTES;
}
// imagem para o WhatsApp: 1080 de largura, altura conforme os trechos
async function imagemRapida() {
  await fontesProntas();
  const I = rapInfo(), R = RAPM || {}, W = 1080, M = 56, por = num(S.por);
  const [assin, marcaD, selo, letreiro] = await Promise.all([I.corp ? null : R.assin, R.marcaDagua, R.selo, R.letreiro].map(u => u ? carregar(u) : null));
  const VERDE = '#1B4332', DOUR = '#A88B4A', CREME = '#EBE0C4', PAPEL = '#F4F2ED', SUAVE = '#8A877E', LINHA = '#E2DDD0';
  const obs = String(S.obs || '').trim();
  const c = document.createElement('canvas'); c.width = W; c.height = 3000; const g = c.getContext('2d');
  const corm = (px, w = '500') => `${w} ${px}px "Cormorant Maktub", "Cormorant Garamond", Georgia, serif`;
  const jost = (px, w = '400') => `${w} ${px}px Jost, "Helvetica Neue", Arial, sans-serif`;
  const larg = (t, sp) => [...t].reduce((a, ch) => a + g.measureText(ch).width + sp, -sp);
  const esp = (t, x, y, sp, al = 'left') => { const w = larg(t, sp); let cx = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x; for (const ch of t) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; } return w; };
  const quebra = (t, max) => { const out = []; String(t || '').split('\n').forEach(par => { let l = ''; par.split(/\s+/).forEach(p => { const n = l ? l + ' ' + p : p; if (g.measureText(n).width > max && l) { out.push(l); l = p; } else l = n; }); if (l) out.push(l); }); return out; };
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = PAPEL; g.fillRect(0, 0, W, c.height);
  // topo creme: assinatura, "Alfaiataria de Viagens" e contato
  const TOPO = 158; g.fillStyle = CREME; g.fillRect(0, 0, W, TOPO);
  if (assin) { const lh = 74, lw = assin.width * lh / assin.height; g.drawImage(assin, M, 30, lw, lh); }
  else { g.font = corm(46, '600'); g.fillStyle = VERDE; g.fillText(I.corp ? 'Maktub Corporativo' : 'Maktub Go', M, 92); }
  g.font = jost(14); g.fillStyle = 'rgba(27,67,50,.6)'; esp((I.corp ? 'Viagens a trabalho, resolvidas.' : 'Alfaiataria de Viagens').toUpperCase(), M + 5, 126, 4.4);
  g.font = jost(17); g.fillStyle = VERDE; g.textAlign = 'right'; g.fillText(EMAIL, W - M, 70); g.fillText(ZAP_TXT, W - M, 103); g.textAlign = 'left';
  // marca d'água
  if (marcaD) { g.save(); g.globalAlpha = 0.05; const mw = 330, mh = marcaD.height * mw / marcaD.width; g.drawImage(marcaD, (W - mw) / 2, TOPO + 26, mw, mh); g.restore(); }
  // título e subtítulo
  let fs = 60; g.font = corm(fs); while (fs > 36 && larg(I.titulo, 1) > W - M * 2) { fs -= 2; g.font = corm(fs); }
  g.fillStyle = VERDE; esp(I.titulo, W / 2, 255, 1, 'center');
  g.font = jost(15, '500'); g.fillStyle = DOUR; esp(I.sub.join('  ·  ').toUpperCase(), W / 2, 298, 6, 'center');
  g.fillRect(W / 2 - 30, 333, 60, 1.5);
  // um cartão por trecho
  let y = 370; const CH = 122;
  I.trechos.forEach(t => {
    g.fillStyle = '#fff'; g.fillRect(M, y, W - M * 2, CH); g.strokeStyle = LINHA; g.lineWidth = 1.5; g.strokeRect(M + .75, y + .75, W - M * 2 - 1.5, CH - 1.5);
    g.fillStyle = LINHA; g.fillRect(230, y + 31, 1.5, 60); g.fillRect(909, y + 52, 1.5, 20);
    g.font = jost(13); g.fillStyle = SUAVE; esp(t.dia.toUpperCase(), 146, y + 45, 3, 'center');
    g.font = corm(30, '600'); g.fillStyle = VERDE; esp(t.dataC, 146, y + 82, 1.5, 'center');
    g.font = corm(46, '600'); g.textAlign = 'center'; g.fillText(t.v.saida || '', 430, y + 63); g.fillText(t.v.chegada || '', 710, y + 63); g.textAlign = 'left';
    if (dmais(t.v)) { const wc = g.measureText(t.v.chegada || '').width; g.font = jost(15, '500'); g.fillStyle = DOUR; g.fillText('+' + dmais(t.v), 710 + wc / 2 + 6, y + 36); }
    g.font = jost(14); g.fillStyle = SUAVE; esp(t.o, 430, y + 92, 4, 'center'); esp(t.d, 710, y + 92, 4, 'center');
    g.font = jost(22); g.fillStyle = DOUR; g.textAlign = 'center'; g.fillText('→', 570, y + 58); g.textAlign = 'left';
    g.font = jost(12); g.fillStyle = SUAVE; esp(t.tipo.toUpperCase(), 570, y + 79, 2.6, 'center');
    g.font = jost(15); esp(`${t.pax} PAX`, 964, y + 66, 2.4, 'center');
    y += CH + 16;
  });
  y -= 16;
  // observação (só quando preenchida)
  if (obs) { g.font = jost(17); const ls = quebra(obs, W - M * 2 - 80); const OH = 62 + ls.length * 26;
    y += 26; g.fillStyle = '#FBF7EC'; g.fillRect(M, y, W - M * 2, OH); g.strokeStyle = DOUR; g.lineWidth = 1.5; g.strokeRect(M + .75, y + .75, W - M * 2 - 1.5, OH - 1.5);
    g.font = jost(13, '500'); g.fillStyle = DOUR; esp('OBSERVAÇÃO', W / 2, y + 34, 3.4, 'center');
    g.font = jost(17); g.fillStyle = VERDE; g.textAlign = 'center'; ls.forEach((l, i) => g.fillText(l, W / 2, y + 62 + i * 26)); g.textAlign = 'left'; y += OH; }
  // bagagem
  // bagagem em ícones e taxas de embarque: o que está incluído na passagem
  { const B = itensBag(), ics = await Promise.all(B.L.map(([k]) => carregar('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgBag(k, 128)))));
    g.font = jost(17); const xl = B.extra ? quebra(B.extra, W - M * 2 - 60) : [], BH = 244 + xl.length * 26;
    y += 26; g.fillStyle = '#fff'; g.fillRect(M, y, W - M * 2, BH); g.strokeStyle = LINHA; g.lineWidth = 1.5; g.strokeRect(M + .75, y + .75, W - M * 2 - 1.5, BH - 1.5);
    g.font = jost(13, '500'); g.fillStyle = DOUR; esp('BAGAGEM POR PASSAGEIRO', W / 2, y + 40, 3.4, 'center');
    const k = B.L.length, CW = 190, GAP = 70, x0 = W / 2 - (k * CW + (k - 1) * GAP) / 2 + CW / 2;
    B.L.forEach(([, t, sb, q], i) => { const cx = x0 + i * (CW + GAP);
      if (ics[i]) g.drawImage(ics[i], cx - 32, y + 58, 64, 64);
      if (q) { g.font = jost(13, '500'); const qw = g.measureText(q).width + 16; g.fillStyle = VERDE; g.beginPath(); g.roundRect ? g.roundRect(cx + 22, y + 52, qw, 22, 11) : g.rect(cx + 22, y + 52, qw, 22); g.fill(); g.fillStyle = CREME; g.fillText(q, cx + 30, y + 68); }
      g.textAlign = 'center'; g.font = jost(18, '500'); g.fillStyle = VERDE; g.fillText(t, cx, y + 150); g.font = jost(14); g.fillStyle = SUAVE; g.fillText(sb, cx, y + 172); g.textAlign = 'left'; });
    g.textAlign = 'center'; g.font = jost(17); g.fillStyle = VERDE; xl.forEach((l, i) => g.fillText(l, W / 2, y + 204 + i * 26));
    const yl = y + 192 + xl.length * 26; g.fillStyle = LINHA; g.fillRect(M + 20, yl, W - M * 2 - 40, 1);
    g.font = jost(15); g.fillStyle = SUAVE; g.fillText('Taxas de embarque inclusas', W / 2, yl + 32); g.textAlign = 'left';
    y += BH; }
  y += 40;
  // valor total
  g.font = jost(17); const pl = I.cc ? I.pagto.flatMap(t => quebra(t, W - M * 2)) : quebra(I.pagto.join('  ·  '), W - M * 2), VH = 274 + (pl.length - 1) * 28 + (I.descTxt ? 58 : 0), DO = I.descTxt ? 58 : 0;
  g.fillStyle = VERDE; g.fillRect(0, y, W, VH);
  g.font = jost(14, '500'); g.fillStyle = DOUR; esp('VALOR TOTAL', W / 2, y + 49, 6, 'center');
  g.font = corm(92); g.fillStyle = CREME; esp(brl(I.valor), W / 2, y + 147, 2, 'center');
  g.font = jost(15); g.fillStyle = 'rgba(235,224,196,.7)'; esp(I.total.toUpperCase(), W / 2, y + 183, 4.6, 'center');
  // selo do desconto no Pix
  if (I.descTxt) { g.font = jost(14, '500'); const tw = larg(I.descTxt.toUpperCase(), 2.4) + 40, tx = (W - tw) / 2, ty = y + 205;
    g.strokeStyle = DOUR; g.lineWidth = 1.5; g.beginPath(); g.roundRect ? g.roundRect(tx, ty, tw, 40, 20) : g.rect(tx, ty, tw, 40); g.stroke();
    g.fillStyle = DOUR; esp(I.descTxt.toUpperCase(), W / 2, ty + 26, 2.4, 'center'); }
  g.fillStyle = 'rgba(235,224,196,.2)'; g.fillRect(M, y + 205 + DO, W - M * 2, 1);
  g.textAlign = 'center'; pl.forEach((l, i) => { const forte = !!I.cc; g.font = jost(forte ? 19 : 17, forte ? '500' : '400'); g.fillStyle = forte ? CREME : 'rgba(235,224,196,.72)'; g.fillText(l, W / 2, y + 239 + DO + i * 28); }); g.textAlign = 'left';
  y += VH;
  // rodapé: selo, "Seu destino começa aqui" e contato
  const PE = 143; g.fillStyle = VERDE; g.fillRect(0, y, W, PE); g.fillStyle = 'rgba(235,224,196,.18)'; g.fillRect(0, y, W, 1);
  g.font = jost(16); const ctW = Math.max(g.measureText(`WhatsApp ${ZAP_TXT}`).width, g.measureText('@' + INSTA).width, g.measureText(SITE).width);
  let sw = 0; if (selo) { const sh = 86; sw = selo.width * sh / selo.height; g.drawImage(selo, M, y + 28, sw, sh); }
  // como no modelo: o letreiro fica no meio do espaço entre o selo e o contato
  if (letreiro) { const lh = 56, lw = letreiro.width * lh / letreiro.height, cx = (M + sw + W - M - ctW) / 2; g.drawImage(letreiro, cx - lw / 2, y + 43, lw, lh); }
  g.font = jost(16); g.fillStyle = 'rgba(235,224,196,.85)'; g.textAlign = 'right'; g.fillText(`WhatsApp ${ZAP_TXT}`, W - M, y + 48); g.fillText('@' + INSTA, W - M, y + 76); g.fillText(SITE, W - M, y + 104); g.textAlign = 'left';
  y += PE;
  const out = document.createElement('canvas'); out.width = W; out.height = Math.ceil(y); out.getContext('2d').drawImage(c, 0, 0);
  return new Promise(ok => out.toBlob(ok, 'image/jpeg', 0.92));
}
// gera a imagem e a página de uma cotação rápida salva (usado para conferir o modelo)
export async function pecaRapida(dados) {
  if (!RAPM) { try { const m = await import('/admin/app/cot-marca.js?v=2'); MARCA = MARCA || m.MARCA; RAPM = m.RAP || null; } catch (e) {} }
  await carregarAero();
  const antes = S; S = dados;
  try { return { imagem: await imagemRapida(), html: htmlRapida() }; } finally { S = antes; }
}
