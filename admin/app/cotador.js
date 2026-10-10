// Maktub Go: montador de cotações.
// Dois modelos: "Maktub Go" (proposta de experiência, com opções, roteiro, voos, hotel, carro e investimento)
// e "Maktub Corporativo" (cotação objetiva de voos). Gera o HTML pronto, no visual aprovado, sem mostrar custo.

let LISTA = null, ED = null, S = null, MARCA = null, PRE = null;
// atendimento do funil de onde a cotação saiu: nome, destino e o id para mover o card
export function novaRapida() { PRE = null; S = NOVO_RAP(); ED = 'novo'; }
export function preparar(pre) { PRE = pre || null; ED = null; S = null; }
const comPre = (d) => { if (!PRE) return d; d.reuniao_id = PRE.id; d.destino = d.destino || PRE.destino || ''; if (d.modelo === 'go') { d.para = PRE.cliente || ''; d.nomeZap = String(PRE.cliente || '').split(' ')[0]; } else if (d.modelo === 'corp') d.passageiro = PRE.cliente || ''; else d.cliente = PRE.cliente || ''; return d; };
const ZAP = '5521976275225', ZAP_TXT = '(21) 97627-5225', EMAIL = 'contato@maktubgo.com.br';
const SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const h = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
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
const NOVO_CORP = () => ({ modelo: 'corp', codigo: '', passageiro: '', pessoas: '1', validade: hoje(), cia: '', destino: '',
  voos: [{ rotulo: 'Ida', data: '', ocod: '', onome: '', saida: '', dcod: '', dnome: '', chegada: '', tipo: 'Direto', duracao: '' }, { rotulo: 'Volta', data: '', ocod: '', onome: '', saida: '', dcod: '', dnome: '', chegada: '', tipo: 'Direto', duracao: '' }],
  bagagem: '1 item pessoal + 1 mala de cabine de até 10 kg por passageiro', print: '', de: '', por: '', forma: 'À vista via Pix',
  rodape: 'Sem bagagem despachada. Taxas inclusas. Alterações e cancelamentos têm custo e devem ser solicitados à Maktub. Tarifa válida apenas na data de emissão e sujeita à confirmação no momento da compra. Horários locais. Check-in realizado por nossa equipe. Suporte humanizado e pós-venda. Você fala sempre com uma pessoa.' });

const NOVO_RAP = () => ({ modelo: 'rapida', marca: 'Maktub Go', cliente: '', prints: [], de: '', por: '', forma: 'à vista no Pix', parcelas: '', obs: '' });

/* ================= telas ================= */
export function rota(hh) { ED = hh[1] || null; if (!ED) S = null; }
export async function tela(P, X) {
  if (!MARCA) { try { MARCA = (await import('/admin/app/cot-marca.js?v=1')).MARCA; } catch (e) { MARCA = { selo: '', ornato: '', assin: '', rodape: '' }; } }
  if (ED) return editor(P, X);
  return lista(P, X);
}
function ir(X, id) { ED = id; history.pushState(null, '', '#cotador' + (id ? '/' + id : '')); tela(X.$('pagina'), X); scrollTo(0, 0); }

async function lista(P, X) {
  const { $, sb, esc } = X;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Comercial</button><h1 class="titulo" style="margin-top:6px"><em>Cotações</em></h1>
    <div class="sub">Preencha só o que muda; o visual, a economia e as parcelas saem prontos. Nunca mostra o custo.</div>
    <button class="zap grande" id="novoRap" style="width:100%;margin-top:12px">Cotação rápida: print + valor ›</button>
    <div class="botoes4" style="margin-top:8px"><button class="sec" id="novoGo">+ Maktub Go</button><button class="sec" id="novoCorp">+ Corporativo</button></div>
    ${PRE ? `<div class="config" style="margin-top:10px">Cotação para <b>${esc(PRE.cliente || '')}</b>${PRE.destino ? ' · ' + esc(PRE.destino) : ''}. Ao enviar, o atendimento vai para "Cotação enviada" no funil.</div>` : ''}
    <div class="lista" id="lsC"><div class="vazio">Carregando...</div></div>`;
  $('voltar').onclick = () => X.ir('reunioes');
  $('novoGo').onclick = () => { S = comPre(NOVO_GO()); PRE = null; ir(X, 'novo'); };
  $('novoCorp').onclick = () => { S = comPre(NOVO_CORP()); PRE = null; ir(X, 'novo'); };
  $('novoRap').onclick = () => { S = comPre(NOVO_RAP()); PRE = null; ir(X, 'novo'); };
  const r = await sb.from('propostas').select('id,modelo,titulo,cliente,destino,atualizado_em,dados').order('atualizado_em', { ascending: false }).limit(300);
  if (!$('lsC')) return;
  if (r.error) { $('lsC').innerHTML = '<div class="config">Rode o 1-cotador.sql no Supabase para guardar as cotações. Dá para montar e baixar mesmo sem ele.</div>'; LISTA = []; return; }
  LISTA = r.data || [];
  $('lsC').innerHTML = LISTA.length ? LISTA.map(c => `<button class="cli" data-c="${c.id}"><div><div class="nome">${esc(c.titulo || 'Sem título')}</div><div class="meta">${c.modelo === 'corp' ? 'Corporativo' : c.modelo === 'rapida' ? 'Rápida' : 'Maktub Go'}${c.cliente ? ' · ' + esc(c.cliente) : ''}${c.destino ? ' · ' + esc(c.destino) : ''}</div></div><div class="val"><span>${new Date(c.atualizado_em).toLocaleDateString('pt-BR')}</span></div></button>`).join('')
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
    <h1 class="titulo" style="margin-top:6px">${corp ? 'Cotação <em>corporativa</em>' : 'Cotação <em>Maktub Go</em>'}</h1>
    <form class="form" id="fCot" autocomplete="off" onsubmit="return false">${corp ? formCorp(X) : formGo(X)}</form>
    <div class="botoes4" style="margin-top:14px"><button class="zap" id="verC">Ver como o cliente</button><button class="sec" id="baixarC">Baixar HTML</button></div>
    <div class="botoes4" style="margin-top:6px"><button class="sec" id="salvarC">Salvar rascunho</button><button class="sec" id="acervoC">Guardar no acervo</button></div>
    ${S._id ? '<button class="sec" id="duplicarC" style="width:100%;margin-top:6px">Duplicar para outro cliente</button>' : ''}
    <div class="sub" id="msgC"></div>`;
  $('voltar').onclick = () => { S = null; ir(X, null); };
  const f = $('fCot');
  f.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; set(k, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    const m = k.match(/^opcoes\.(\d+)\.(sites|cartao|parcelas|pix)$/); if (m && $('rv' + m[1])) $('rv' + m[1]).innerHTML = resumoValores(S.opcoes[+m[1]]); });
  f.addEventListener('change', (e) => { if (e.target.dataset.hotel) escolherHotel(X, e.target); if (e.target.dataset.foto) fotoUpload(e.target, P, X); if (e.target.dataset.print) printUpload(e.target, P, X); });
  f.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mais]'), t = e.target.closest('[data-tira]');
    if (m) { mais(m.dataset.mais); editor(P, X); }
    if (t) { const [lista, i] = t.dataset.tira.split('#'); if (lista === '_print') S.print = ''; else get(lista).splice(+i, 1); editor(P, X); }
  });
  $('verC').onclick = () => { const w = window.open('', '_blank'); const html = gerar(X); if (w) { w.document.open(); w.document.write(html); w.document.close(); } else X.aviso('Libere as janelas novas para ver a cotação.'); };
  $('baixarC').onclick = () => { enviada(X); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([gerar(X)], { type: 'text/html' })); a.download = 'index.html'; document.body.appendChild(a); a.click(); a.remove(); X.aviso('Baixado como index.html, pronto para arrastar no Netlify.'); };
  $('salvarC').onclick = () => salvar(X);
  $('acervoC').onclick = () => acervo(X);
  if ($('duplicarC')) $('duplicarC').onclick = () => { delete S._id; if (S.modelo === 'go') { S.para = ''; S.nomeZap = ''; } else { S.passageiro = ''; S.codigo = ''; } S.consulta = hoje(); ED = 'novo'; history.replaceState(null, '', '#cotador/novo'); editor(P, X); X.aviso('Cópia criada. Ajuste o cliente e salve.'); };
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
  const op = S.opcoes.map((o, i) => {
    const b = `opcoes.${i}`;
    return `<div class="grupo">${S.opcoes.length > 1 ? `Opção ${i + 1} ${btnTira('opcoes#' + i)}` : 'A viagem'}</div>
      ${duas(inp(b + '.nome', S.opcoes.length > 1 ? 'Nome da opção' : 'Nome da viagem', 'text', 'placeholder="Ex.: Navegando por Portugal"'), inp(b + '.resumo', 'Resumo curto', 'text', 'placeholder="Lisboa e Fátima · 6 noites"'))}
      ${duas(inp(b + '.embarque', 'Embarque', 'date'), inp(b + '.retorno', 'Retorno', 'date'))}
      ${inp(b + '.hotelaria', 'Hotelaria (resumo)', 'text', 'placeholder="6 noites em Lisboa"')}
      <details ${o.dias.length ? 'open' : ''}><summary class="sub" style="cursor:pointer">Sugestão de roteiro (${o.dias.length} ${o.dias.length === 1 ? 'dia' : 'dias'})</summary>
        ${o.dias.map((d, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px"><b>Dia ${j + 1}</b>${btnTira(`${b}.dias#${j}`)}${duas(inp(`${b}.dias.${j}.data`, 'Data', 'date'), inp(`${b}.dias.${j}.titulo`, 'Título do dia'))}${inp(`${b}.dias.${j}.destaque`, 'Dia em destaque', 'check')}</div>`).join('')}
        ${btnMais(`${b}.dias|dia`, '+ Dia')}</details>
      <div class="sub" style="margin-top:10px"><b>Voos</b></div>
      ${o.voos.map((v, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira(`${b}.voos#${j}`)}
        ${duas(inp(`${b}.voos.${j}.rotulo`, 'Rótulo', 'text', 'placeholder="Ida, Volta, Entre países"'), inp(`${b}.voos.${j}.data`, 'Data', 'date'))}
        ${duas(inp(`${b}.voos.${j}.origem`, 'Saída de', 'text', 'placeholder="Uberlândia"'), inp(`${b}.voos.${j}.saida`, 'Horário', 'time'))}
        ${duas(inp(`${b}.voos.${j}.destino`, 'Chegada em', 'text', 'placeholder="Lisboa"'), inp(`${b}.voos.${j}.chegada`, 'Horário', 'time'))}
        ${duas(sel(`${b}.voos.${j}.tipo`, 'Tipo', ['Voo direto', 'Com 1 conexão', 'Com 2 conexões', 'Com 3 conexões']), sel(`${b}.voos.${j}.periodo`, 'Período', ['', 'Voo diurno', 'Voo noturno']))}
        ${inp(`${b}.voos.${j}.mais1`, 'Chega no dia seguinte (+1)', 'check')}</div>`).join('')}
      ${btnMais(`${b}.voos|voo`, '+ Trecho')}
      ${inp(b + '.bagagem', 'Bagagem', 'text', 'placeholder="Para cada um: 1 mala despachada, 1 mala de bordo de 10 kg e 1 mochila, ida e volta"')}
      <div class="sub" style="margin-top:10px"><b>Hotelaria</b></div>
      ${o.hoteis.map((ht, j) => { const c = `${b}.hoteis.${j}`; return `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira(`${b}.hoteis#${j}`)}
        <label class="fl"><span>Hotel (da base de fornecedores ou novo)</span><input data-k="${c}.nome" data-hotel="${c}" list="dlHot" value="${h(ht.nome)}"></label>
        ${duas(inp(c + '.cidade', 'Cidade'), inp(c + '.estrelas', 'Estrelas', 'num'))}
        ${duas(inp(c + '.entrada', 'Check-in', 'date'), inp(c + '.saida', 'Check-out', 'date'))}
        ${inp(c + '.descricao', 'Descrição para o cliente', 'area', 'placeholder="O que faz esse hotel especial para eles"')}
        ${inp(c + '.itens', 'O que está incluso (uma linha cada)', 'area', 'placeholder="Quarto standard\nCafé da manhã incluso"')}
        ${inp(c + '.fotos', 'Fotos (um link por linha)', 'area', 'placeholder="https://site-do-hotel/foto.jpg"')}
        <label class="fl"><span>Ou envie fotos do celular</span><input type="file" accept="image/*" multiple data-foto="${c}.fotos"></label>
        <div class="sub" style="margin:0">Use fotos do site do hotel, enviadas pelo hotel ou da equipe. Fotos do Google não podem ir para material de cliente.</div>
        ${inp(c + '.nota', 'Observação', 'text')}</div>`; }).join('')}
      ${btnMais(`${b}.hoteis|hotel`, '+ Hotel')}
      <details ${o.carro.opcoes.length ? 'open' : ''}><summary class="sub" style="cursor:pointer">Aluguel de carro (${o.carro.opcoes.length ? o.carro.opcoes.length + ' opções' : 'sem carro'})</summary>
        ${inp(b + '.carro.intro', 'Retirada e devolução', 'area', 'placeholder="Retirada e devolução no Aeroporto de Porto Alegre. Retirada em 18/02 às 11:00 e devolução em 21/02 às 11:00, com 3 diárias."')}
        ${o.carro.opcoes.map((c, j) => `<div style="border-top:1px solid var(--linha);padding-top:6px;margin-top:6px">${btnTira(`${b}.carro.opcoes#${j}`)}${duas(inp(`${b}.carro.opcoes.${j}.grupo`, 'Grupo', 'text', 'placeholder="SUV"'), inp(`${b}.carro.opcoes.${j}.valor`, 'Valor total (R$)', 'num'))}${inp(`${b}.carro.opcoes.${j}.modelos`, 'Modelos', 'text', 'placeholder="Volkswagen Nivus ou Fiat Pulse"')}${inp(`${b}.carro.opcoes.${j}.desc`, 'Detalhe', 'text', 'placeholder="Câmbio automático · mais espaço para a serra"')}</div>`).join('')}
        ${btnMais(`${b}.carro.opcoes|carro`, '+ Opção de carro')}</details>
      <div class="sub" style="margin-top:10px"><b>Investimento</b> (para ${h(S.pessoas || '?')} ${+S.pessoas === 1 ? 'pessoa' : 'pessoas'})</div>
      ${inp(b + '.sites', 'Ancoragem: valor nos sites (pagante ou REX, o mais caro)', 'num', 'placeholder="3.799,00"')}
      ${duas(inp(b + '.cartao', o.carro.opcoes.length ? 'Total voos + hotel no cartão' : 'Total no cartão', 'num', 'placeholder="3.388,00"'), inp(b + '.parcelas', 'Parcelas sem juros', 'num'))}
      ${inp(b + '.pix', 'Desconto no Pix (%)', 'num', 'placeholder="5"')}
      <div id="rv${i}">${resumoValores(o)}</div>
      ${inp(b + '.incluso', 'Incluso (uma linha cada)', 'area')}
      ${inp(b + '.cta', 'Texto do botão')}`;
  }).join('');
  return `<div class="grupo">Capa</div>
    ${inp('kicker', 'Rótulo de cima')}
    ${inp('titulo', 'Título', 'text', 'placeholder="Um sonho em família,"')}
    ${inp('sub', 'Complemento em itálico', 'text', 'placeholder="e a Maktub vai te levar."')}
    ${inp('linha', 'Linha de datas ou rota', 'text', 'placeholder="Maio de 2027 · Portugal"')}
    ${duas(inp('para', 'Desenhada para', 'text', 'placeholder="Verônica e Helena"'), inp('pessoas', 'Pessoas', 'num'))}
    ${duas(inp('nomeZap', 'Quem fala no WhatsApp', 'text', 'placeholder="Verônica"'), inp('destino', 'Destino principal (acervo)', 'text', 'placeholder="Lisboa"'))}
    ${inp('carta', 'Texto de abertura (opcional)', 'area', 'placeholder="Proposta inicial para vocês terem clareza do investimento..."')}
    <datalist id="dlHot">${hoteis.map(f => `<option value="${esc(f.nome)}">${esc(f.cidade || '')}</option>`).join('')}</datalist>
    ${op}
    ${btnMais('x|opcao', '+ Outra opção para o cliente escolher')}
    <div class="grupo">Fechamento</div>
    ${inp('porque', 'Frase de "Por que a Maktub" (opcional)', 'area', 'placeholder="Primeira viagem internacional não precisa ser motivo de preocupação..."')}
    ${inp('consulta', 'Valores consultados em', 'date')}
    ${inp('avisos', 'Condições (uma linha cada)', 'area', 'rows="5"')}`;
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
  return `<div class="grupo">Cotação</div>
    ${duas(inp('codigo', 'Código', 'text', `placeholder="MC-${hoje().slice(8, 10)}${hoje().slice(5, 7)}-001"`), inp('validade', 'Válida somente em', 'date'))}
    ${duas(inp('passageiro', 'Passageiro', 'text', 'placeholder="Victor"'), inp('pessoas', 'Pessoas', 'num'))}
    ${duas(inp('cia', 'Companhia', 'text', 'placeholder="LATAM"'), inp('destino', 'Destino (acervo)', 'text', 'placeholder="Santiago"'))}
    ${inp('rota', 'Título da rota', 'text', 'placeholder="Rio de Janeiro ⇄ Santiago"')}
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
  if (!ht.itens && f.cafe) ht.itens = f.cafe === 'incluso' ? 'Café da manhã incluso' : 'Café da manhã não incluso';
  if (!ht.fotos && f.fotos_maktub && f.fotos_maktub.length) ht.fotos = f.fotos_maktub.join('\n');
  editor(X.$('pagina'), X);
}
function reduzir(file, max = 1200) {
  return new Promise((ok) => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.74)); URL.revokeObjectURL(img.src); }; img.onerror = () => ok(null); img.src = URL.createObjectURL(file); });
}
async function fotoUpload(el, P, X) {
  const novas = (await Promise.all([...el.files].slice(0, 6).map(f => reduzir(f)))).filter(Boolean);
  set(el.dataset.foto, linhas(get(el.dataset.foto)).concat(novas).join('\n')); editor(P, X);
}
async function printUpload(el, P, X) { const f = el.files[0]; if (!f) return; S.print = await reduzir(f, 1400) || ''; editor(P, X); }

/* ================= salvar e acervo ================= */
function tituloDe() { if (S.modelo === 'rapida') return 'Rápida' + (S.cliente ? ' · ' + S.cliente : '') + (S.por ? ' · ' + brl(num(S.por)) : ''); return S.modelo === 'corp' ? `${S.codigo || 'Corporativo'} · ${S.passageiro || ''}`.trim() : [S.titulo, S.sub].filter(Boolean).join(' ').replace(/[,.]\s*$/, '') || S.opcoes[0].nome || 'Cotação'; }
function clienteDe() { return S.modelo === 'rapida' ? S.cliente : S.modelo === 'corp' ? S.passageiro : S.para; }
async function salvar(X) {
  const dados = JSON.parse(JSON.stringify(S)); delete dados._id;
  const row = { modelo: S.modelo, titulo: tituloDe(), cliente: clienteDe() || null, destino: S.destino || null, dados, atualizado_em: new Date().toISOString() };
  const r = S._id ? await X.sb.from('propostas').update(row).eq('id', S._id).select().single() : await X.sb.from('propostas').insert(row).select().single();
  if (r.error) { X.aviso('Não salvou: ' + r.error.message + (/relation|does not exist/.test(r.error.message) ? ' (rode o 1-cotador.sql)' : '')); return false; }
  S._id = r.data.id; ED = String(r.data.id); history.replaceState(null, '', '#cotador/' + ED);
  // fotos de hotel entram no banco de fotos do fornecedor
  if (S.modelo === 'go') for (const o of S.opcoes) for (const ht of o.hoteis) { const urls = linhas(ht.fotos).filter(u => /^https?:/.test(u)); const f = ht.fornecedor_id && X.fornecedores && X.fornecedores.lista().find(x => x.id === ht.fornecedor_id); if (f && urls.length) { const todas = [...new Set([...(f.fotos_maktub || []), ...urls])].slice(0, 30); if (todas.length !== (f.fotos_maktub || []).length) { const u = await X.sb.from('fornecedores').update({ fotos_maktub: todas }).eq('id', f.id); if (!u.error) f.fotos_maktub = todas; } } }
  X.aviso('Rascunho salvo.'); return true;
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

function gerar(X) { return S.modelo === 'corp' ? gerarCorp(X) : gerarGo(X); }

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
  const multi = OPS.length > 1;
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
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${h(S.codigo || 'Cotação')} · Maktub Corporativo</title>
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
.print img{max-width:100%;display:block;margin-top:10px;border-radius:4px}.resumo{background:var(--v);color:#fff;border-radius:10px;padding:22px 18px;margin-top:20px}.resumo .p{font-size:11px;letter-spacing:.1em;font-weight:700;margin-top:8px;color:#EBE0C4}
.de{margin-top:12px;color:#EBE0C4}.de s{text-decoration-color:var(--d)}.por{font-size:32px;font-weight:800;margin-top:4px}.forma{font-weight:700;color:#EBE0C4;font-size:13px}.resumo hr{border:0;border-top:1px solid var(--d);margin:14px 0 10px}.resumo small{color:#EBE0C4;font-size:11.5px}
.opcao{margin-top:34px;padding-top:18px;border-top:2px solid var(--d);color:var(--s);font-size:13px;font-weight:700}.opcao span{display:inline-block;background:var(--d);color:#fff;border-radius:4px;padding:3px 10px;margin-right:10px;font-size:11px;letter-spacing:.12em}
.eco{display:inline-block;margin-top:10px;border:1px solid var(--d);border-radius:20px;padding:4px 14px;font-size:12.5px;font-weight:700;color:#EBE0C4}
.cta{display:block;text-align:center;background:var(--d);color:var(--v);font-weight:800;letter-spacing:.08em;padding:16px;border-radius:8px;margin-top:16px;text-decoration:none;font-size:13px}
.cond{color:var(--s);font-size:11.5px;margin:16px 0 26px}footer{background:var(--v);color:#EBE0C4;padding:22px 0}footer .w{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}footer b{display:block;letter-spacing:.06em}footer .g{color:var(--d);font-size:12px}footer .r{text-align:right;font-size:12px}
@media (max-width:560px){.faixa .w{grid-template-columns:1fr 1fr}.voo .corpo{grid-template-columns:1fr auto 1fr}.cia{grid-column:1/-1;padding:0}.cont{text-align:left}}</style></head><body>
<header><div class="w"><div><div class="marca">MAKTUB <b>CORPORATIVO</b></div><div class="slog">Viagens a trabalho, resolvidas.</div></div><div class="cont"><a href="mailto:${EMAIL}">${EMAIL}</a><b><a href="https://wa.me/${ZAP}">${ZAP_TXT}</a></b></div></div></header>
<div class="faixa"><div class="w"><div><div class="l">COTAÇÃO</div><div class="v">${h(S.codigo)}</div></div><div><div class="l">PASSAGEIRO</div><div class="v">${S.passageiro ? h(S.passageiro) + ' · ' : ''}${pax} ${pax === 1 ? 'pessoa' : 'pessoas'}</div></div><div><div class="l">TRECHO</div><div class="v">${h(trecho)}</div></div><div><div class="l">VALIDADE</div><div class="v">${val}</div></div></div></div>
<div class="w">
${val ? `<div class="caixa"><div class="rot">Validade da tarifa</div><div>Cotação válida somente em ${val}. Após essa data, os valores precisam ser consultados novamente.</div></div>` : ''}
${OPS.map((o, i) => { const vs = o.voos, b = vs[1], n = i + 1;
  return `${multi ? `<div class="opcao"><span>OPÇÃO ${n}</span>${o.nome ? h(o.nome) : ''}</div>` : ''}<div class="tit"><div><h1>${titDe(vs)}</h1><div class="subt">${[h(S.cia), b ? 'ida e volta' : 'só ida', vs.every(v => v.tipo === 'Direto') ? 'voos diretos' : 'com conexão'].filter(Boolean).join(' · ')}</div></div><div class="r">${vs.slice(0, 2).map(v => `${h(v.rotulo).toUpperCase()}: ${h(v.ocod).toUpperCase()} → ${h(v.dcod).toUpperCase()}`).join('<br>')}</div></div>
${vs.map(v => `<div class="voo"><div class="cab"><span>${h(v.rotulo).toUpperCase()}</span><span>${dataCab(v.data)}</span></div><div class="corpo"><div><div class="hora">${h(v.saida)}</div><div class="aer">${h(v.ocod).toUpperCase()} · ${h(v.onome)}</div></div><div class="seta">→</div><div><div class="hora">${h(v.chegada)}</div><div class="aer">${h(v.dcod).toUpperCase()} · ${h(v.dnome)}</div></div><div class="cia">${h(S.cia)}</div><div class="chips"><span class="chip">${h(v.tipo)}</span>${v.duracao ? `<span class="chip">Duração ${h(v.duracao)}</span>` : ''}</div></div></div>`).join('')}
${multi ? resumo(o, n) : ''}`; }).join('')}
${S.bagagem ? `<div class="caixa"><div class="rot">Bagagem incluída</div><div style="font-weight:700">${h(S.bagagem)}</div></div>` : ''}
${S.print ? `<div class="caixa print"><div class="rot">Valor no site ${S.cia ? 'da ' + h(S.cia) : 'da companhia'}</div><img src="${S.print}" alt="Valor no site da companhia"></div>` : ''}
${multi ? '' : resumo(OPS[0], 0)}
<p class="cond">${h(S.bagagem ? 'Inclui ' + S.bagagem.charAt(0).toLowerCase() + S.bagagem.slice(1) + '. ' : '')}${h(S.rodape)}</p></div>
<footer><div class="w"><div><b>MAKTUB CORPORATIVO</b><span class="g">Viagens a trabalho, resolvidas.</span></div><div class="r">${EMAIL} · ${ZAP_TXT}<br>${S.codigo ? `<span class="g">Cotação ${h(S.codigo)}</span>` : ''}</div></div></footer></body></html>`;
}
// usado em testes e para gerar a partir de dados salvos
export function gerarHTML(dados) { const antes = S; S = dados; try { return gerar({}); } finally { S = antes; } }
export { NOVO_GO, NOVO_CORP };

/* ================= cotação rápida: print + valor, vira imagem para o WhatsApp ================= */
function editorRapida(P, X) {
  const { $ } = X;
  const de = num(S.de), por = num(S.por), eco = de > por && por ? de - por : 0;
  P.innerHTML = `<button class="voltar" id="voltar">‹ Cotações</button>
    <h1 class="titulo" style="margin-top:6px">Cotação <em>rápida</em></h1>
    <div class="sub">Digite o valor do site e o da Maktub e envie a imagem pronta no WhatsApp. O print é opcional.</div>
    <form class="form" id="fRap" autocomplete="off" onsubmit="return false">
      <label class="fl"><span>1. Print do site (opcional)</span><input type="file" accept="image/*" multiple id="rpPrint"></label>
      ${S.prints.map((u, i) => `<div style="position:relative;margin:6px 0"><img src="${u}" style="max-width:100%;border:1px solid var(--linha)"><button type="button" data-rm="${i}" style="position:absolute;top:6px;right:6px;background:#fff;border:1px solid var(--linha);padding:4px 8px;font-size:12px">remover</button></div>`).join('')}
      <div class="duas-col">${inp('de', '2. Valor no site', 'num', 'placeholder="2.100,00"')}${inp('por', '3. Valor com a Maktub', 'num', 'placeholder="1.700,00"')}</div>
      <div id="rpEco">${eco ? `<div class="config" style="margin:4px 0">Economia de ${brl(eco)} para o cliente.</div>` : de && por && por >= de ? '<div class="config" style="margin:4px 0">Atenção: o valor da Maktub não está abaixo do site.</div>' : ''}</div>
      <div class="duas-col">${inp('forma', 'Forma de pagamento')}${inp('parcelas', 'Ou parcelado (opcional)', 'text', 'placeholder="4x de R$ 450,00 sem juros"')}</div>
      <div class="duas-col">${inp('cliente', 'Cliente (opcional)', 'text', 'placeholder="Victor"')}${sel('marca', 'Marca', ['Maktub Go', 'Maktub Corporativo'])}</div>
      ${inp('obs', 'Observação (opcional)', 'text', 'placeholder="Inclui mala de mão de 10 kg"')}
    </form>
    <button class="zap grande" id="rpEnviar" style="width:100%;margin-top:12px">Enviar no WhatsApp</button>
    <div class="botoes4" style="margin-top:6px"><button class="sec" id="rpBaixar">Baixar imagem</button><button class="sec" id="rpSalvar">Salvar</button></div>
    <div id="rpPrevia" style="margin-top:12px"></div>`;
  $('voltar').onclick = () => { S = null; ir(X, null); };
  const f = $('fRap');
  f.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; set(k, e.target.value);
    if (k === 'de' || k === 'por') { const a = num(S.de), b = num(S.por); $('rpEco').innerHTML = a > b && b ? `<div class="config" style="margin:4px 0">Economia de ${brl(a - b)} para o cliente.</div>` : a && b ? '<div class="config" style="margin:4px 0">Atenção: o valor da Maktub não está abaixo do site.</div>' : ''; } });
  f.addEventListener('change', (e) => { if (e.target.dataset.k === 'marca') set('marca', e.target.value); });
  $('rpPrint').onchange = async (e) => { const novas = (await Promise.all([...e.target.files].slice(0, 4).map(x => reduzir(x, 1400)))).filter(Boolean); S.prints = S.prints.concat(novas); editorRapida(P, X); };
  P.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { S.prints.splice(+b.dataset.rm, 1); editorRapida(P, X); });
  const pronto = () => { if (!num(S.por)) { X.aviso('Digite o valor com a Maktub.'); return false; } return true; };
  $('rpEnviar').onclick = async () => {
    if (!pronto()) return;
    enviada(X); const blob = await imagemRapida(); const arq = new File([blob], 'cotacao-maktub.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [arq] })) { try { await navigator.share({ files: [arq] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    baixar(blob); X.aviso('Imagem baixada. Anexe no WhatsApp.');
  };
  $('rpBaixar').onclick = async () => { if (pronto()) baixar(await imagemRapida()); };
  $('rpSalvar').onclick = () => salvar(X);
  if (num(S.por)) imagemRapida().then(b => { if ($('rpPrevia')) $('rpPrevia').innerHTML = `<div class="sub">Prévia</div><img src="${URL.createObjectURL(b)}" style="max-width:100%;border:1px solid var(--linha)">`; });
}
function enviada(X) { if (S && S.reuniao_id && X.cotacaoEnviada) { X.cotacaoEnviada(S.reuniao_id); S.reuniao_id = null; } }
function baixar(blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cotacao-maktub.jpg'; document.body.appendChild(a); a.click(); a.remove(); }
const carregar = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

async function imagemRapida() {
  const W = 1080, PAD = 40, corp = S.marca === 'Maktub Corporativo';
  const prints = (await Promise.all(S.prints.map(carregar))).filter(Boolean);
  const logo = !corp && MARCA && MARCA.rodape ? await carregar(MARCA.rodape) : null;
  const de = num(S.de), por = num(S.por), eco = de > por ? de - por : 0;
  const alturas = prints.map(i => Math.round(i.height * (W - PAD * 2) / i.width));
  const CAB = 150, BOX = 350 + (S.parcelas ? 46 : 0) + (eco ? 100 : 0) + (S.obs ? 44 : 0), ROD = 150;
  const H = CAB + PAD + alturas.reduce((a, b) => a + b + 20, 0) + BOX + ROD;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const VERDE = '#1B4332', DOUR = '#A88B4A', CREME = '#EBE0C4', PAPEL = '#FAF6EC';
  const serif = (px, w = '400') => `${w} ${px}px "Cormorant Garamond", Georgia, serif`, sans = (px, w = '500') => `${w} ${px}px Montserrat, "Helvetica Neue", Arial, sans-serif`;
  const espac = (t, x, y, sp) => { let cx = x; for (const ch of t) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; } return cx - x - sp; };
  const largEsp = (t, sp) => [...t].reduce((a, ch) => a + g.measureText(ch).width + sp, -sp);
  const centro = (t, y, sp = 0) => { if (!sp) { g.textAlign = 'center'; g.fillText(t, W / 2, y); g.textAlign = 'left'; } else espac(t, (W - largEsp(t, sp)) / 2, y, sp); };
  g.fillStyle = PAPEL; g.fillRect(0, 0, W, H);
  // cabeçalho
  g.fillStyle = corp ? VERDE : CREME; g.fillRect(0, 0, W, CAB);
  if (logo) { const lh = 90, lw = logo.width * lh / logo.height; g.drawImage(logo, (W - lw) / 2, (CAB - lh) / 2, lw, lh); }
  else { g.font = sans(38, '700'); g.fillStyle = corp ? CREME : VERDE; const t1 = 'MAKTUB ', t2 = corp ? 'CORPORATIVO' : 'GO'; const w1 = largEsp(t1, 4), w2 = largEsp(t2, 4); let x = (W - w1 - w2) / 2; espac(t1, x, 92, 4); g.fillStyle = DOUR; espac(t2, x + w1, 92, 4); }
  // prints
  let y = CAB + PAD;
  if (prints.length) { g.font = sans(20, '600'); g.fillStyle = DOUR; espac('VALOR NO SITE', PAD, y + 4, 3); y += 22; }
  prints.forEach((im, i) => { g.drawImage(im, PAD, y, W - PAD * 2, alturas[i]); g.strokeStyle = 'rgba(168,139,74,.45)'; g.lineWidth = 2; g.strokeRect(PAD, y, W - PAD * 2, alturas[i]); y += alturas[i] + 20; });
  // caixa de valores
  y += 10; g.fillStyle = VERDE; const bx = PAD, bw = W - PAD * 2, bh = BOX - 40;
  g.beginPath(); g.roundRect ? g.roundRect(bx, y, bw, bh, 14) : g.rect(bx, y, bw, bh); g.fill();
  let yy = y + 62;
  g.fillStyle = DOUR; g.font = sans(20, '600'); centro((S.cliente ? 'COTAÇÃO PARA ' + S.cliente : 'SUA COTAÇÃO').toUpperCase(), yy, 3); yy += 54;
  if (de > por) { g.fillStyle = 'rgba(235,224,196,.75)'; g.font = sans(28, '400'); const t = 'No site: ' + brl(de); centro(t, yy); const tw = g.measureText(t).width; g.strokeStyle = DOUR; g.lineWidth = 3; g.beginPath(); g.moveTo((W - tw) / 2 + g.measureText('No site: ').width, yy - 9); g.lineTo((W + tw) / 2, yy - 9); g.stroke(); yy += 78; }
  if (de > por) { g.fillStyle = DOUR; g.font = sans(20, '600'); centro('COM A MAKTUB', yy - 18, 3); yy += 62; }
  g.fillStyle = '#fff'; g.font = serif(96, '500'); centro(brl(por), yy); yy += 50;
  g.fillStyle = CREME; g.font = sans(24, '500'); centro(S.forma || '', yy); yy += 6;
  if (S.parcelas) { yy += 40; g.font = sans(22, '400'); g.fillStyle = 'rgba(235,224,196,.85)'; centro('ou ' + S.parcelas, yy); }
  if (eco) { yy += 62; const t = 'Economia de ' + brl(eco); g.font = sans(24, '600'); const tw = g.measureText(t).width + 48; g.strokeStyle = DOUR; g.lineWidth = 2; g.beginPath(); g.roundRect ? g.roundRect((W - tw) / 2, yy - 34, tw, 50, 25) : g.rect((W - tw) / 2, yy - 34, tw, 50); g.stroke(); g.fillStyle = CREME; centro(t, yy); }
  if (S.obs) { yy += 52; g.font = sans(20, '400'); g.fillStyle = 'rgba(235,224,196,.8)'; centro(S.obs, yy); }
  // rodapé
  y += bh + 50; g.fillStyle = '#6E6A5E'; g.font = sans(19, '400');
  const agora = new Date(); centro(`Valores consultados em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Tarifa confirmada só na emissão.`, y);
  g.fillStyle = VERDE; g.font = sans(22, '600'); centro(`WhatsApp ${ZAP_TXT}  ·  @maktubgo_`, y + 44);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
}
