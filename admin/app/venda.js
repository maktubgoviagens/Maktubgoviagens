// Maktub Go: detalhes de cada serviço do atendimento, fechamento (pagamento, comprovante)
// e envio das vendas fechadas para a planilha B2C.
// Cada serviço vira uma linha da planilha. O ID da linha (planilha_id) é gerado aqui e
// vai para a coluna "ID sistema", então a emissão sincronizada já nasce ligada ao card.

export const VOO = ['Passagens', 'Maktub Corporativo'];
export const HOTEL = 'Hotelaria';
const ehVoo = (x) => VOO.includes(x.produto);
const ehHotel = (x) => x.produto === HOTEL;
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
const usaMilhas = (x) => ehVoo(x) && x.pago_em !== 'pagante';
export const custoDe = (x) => usaMilhas(x) && (x.milhas || x.taxas) ? custoMilhas(x) : (+x.custo || 0);
export const enviado = (x) => !!x.planilha_id;

// passageiros do voo: nome, CPF e nascimento de cada um (B2C). A quantidade tem que bater com "Passageiros".
const soDig = (v) => String(v || '').replace(/\D/g, '');
export function cpfValido(v) {
  const c = soDig(v); if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n) => { let t = 0; for (let i = 0; i < n; i++) t += +c[i] * (n + 1 - i); const r = (t * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === +c[9] && dv(10) === +c[10];
}
const fmtCpf = (v) => { const d = soDig(v); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : v; };
// nascimento digitado só com números: a barra entra sozinha (dd/mm/aaaa); também aceita colar 21/02/2002, 21022002 ou 2002-02-21
const isoBr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
function mascaraData(v) {
  const t = String(v || '').trim(), iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  const d = iso ? iso[3] + iso[2] + iso[1] : t.replace(/\D/g, '').slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
function brIso(txt) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt || ''); if (!m) return '';
  const [dd, mm, aa] = [+m[1], +m[2], +m[3]], dt = new Date(aa, mm - 1, dd);
  if (aa < 1900 || dt > new Date() || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}
const nPax = (x) => Math.max(parseInt(x.passageiros, 10) || 0, 0);
function paxAjustado(x) {
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

// o que falta para um serviço poder ir para a planilha
export function pendenciasItem(x) {
  const f = [];
  if (!x.venda) f.push('valor de venda');
  if (!custoDe(x) && x.produto !== 'Taxa de Planejamento') f.push('custo');
  if (!x.fornecedor && !usaMilhas(x)) f.push('onde comprou');
  if (ehVoo(x)) {
    if (!x.localizador) f.push('localizador');
    if (!x.passageiros) f.push('passageiros');
    else f.push(...pendenciasPax(x));
    if (x.bagagem == null || x.bagagem === '') f.push('bagagem despachada');
    if (!x.print) f.push('print da tarifa');
    if (!x.cia_emissora) f.push('companhia');
  }
  if (!x.emitido) f.push('marcar como emitido');
  return f;
}
export function pendenciasFechamento(r) {
  const F = r.fech || {}, IT = r.itens || [];
  const f = [];
  if (!F.forma) f.push('forma de pagamento');
  // sem as parcelas não dá para medir o custo da maquininha
  if (F.forma === 'cartao' && !+F.parcelas) f.push('em quantas vezes no cartão');
  if (!F.comprovante) f.push('comprovante de pagamento');
  IT.filter(x => !enviado(x)).forEach(x => { const p = pendenciasItem(x); if (p.length) f.push(`${x.produto}: ${p.join(', ')}`); });
  return f;
}
export const concluida = (r) => r.resultado === 'Fechou' && (r.itens || []).length > 0 && (r.itens || []).every(enviado) && !!(r.fech || {}).comprovante;

const seg = (k, i, ops, v) => `<div class="seg" style="margin:6px 0 8px">${ops.map(([val, l]) => `<button type="button" data-it="${i}" data-k="${k}" data-set="${val}" class="${String(v ?? '') === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const inp = (X, k, i, rot, v, t = 's', extra = '') => `<label class="fl"><span>${rot}</span><input data-it="${i}" data-k="${k}" data-t="${t}" value="${X.esc(v ?? '')}" ${t === 'n' ? 'inputmode="decimal"' : ''} ${t === 'd' ? 'type="date"' : ''} ${extra}></label>`;
const dupla = (a, b) => `<div class="duas-col">${a}${b}</div>`;
const chk = (X, k, i, rot, v, dis) => `<label class="fc" style="margin:8px 0"><input type="checkbox" data-it="${i}" data-k="${k}" data-t="b" ${v ? 'checked' : ''} ${dis ? 'disabled' : ''}><span>${rot}</span></label>`;

// detalhes de um serviço (dentro do atendimento)
function htmlItem(X, x, i, ctx) {
  const trava = enviado(x);
  somarTrechos(x);
  const base = `${dupla(inp(X, 'custo', i, usaMilhas(x) ? 'Custo (calculado)' : x.ct_on ? 'Custo (soma dos trechos)' : 'Custo (R$)', usaMilhas(x) && (x.milhas || x.taxas) ? custoMilhas(x) : x.custo, 'n', (usaMilhas(x) && (x.milhas || x.taxas)) || x.ct_on ? 'readonly' : ''), inp(X, 'venda', i, ctx.vendaTotal ? 'Venda (rateada do total)' : 'Venda (R$)', x.venda, 'n', ctx.vendaTotal && !trava ? 'readonly' : ''))}`;
  if (!ctx.detalhes) return base;
  let det = '';
  if (ehVoo(x)) {
    det += `<div class="sub" style="margin:6px 0 0">Trecho</div>${seg('tipo_trecho', i, [['iv', 'Ida e volta'], ['ida', 'Só ida'], ['multi', 'Multitrecho']], x.tipo_trecho || ctx.tipoPadrao)}
      ${dupla(inp(X, 'origem', i, 'Origem', x.origem, 's', 'maxlength="40" placeholder="GIG"'), inp(X, 'destino', i, 'Destino', x.destino, 's', 'maxlength="40" placeholder="LIS"'))}
      ${(x.tipo_trecho || ctx.tipoPadrao) === 'multi' ? `<label class="fl"><span>Trechos (um por linha)</span><textarea data-it="${i}" data-k="trechos" rows="3" placeholder="GIG-LIS 10/11&#10;LIS-MAD 15/11&#10;MAD-GIG 22/11">${X.esc(x.trechos || '')}</textarea></label>` : ''}
      ${dupla(inp(X, 'data_ida', i, 'Data da ida', x.data_ida ?? ctx.ida, 'd'), (x.tipo_trecho || ctx.tipoPadrao) === 'ida' ? '<div></div>' : inp(X, 'data_volta', i, 'Data da volta', x.data_volta ?? ctx.volta, 'd'))}
      <div class="sub" style="margin:6px 0 0">Como foi pago</div>${seg('pago_em', i, [['milhas', 'Milhas'], ['pagante', 'Pagante']], x.pago_em || 'milhas')}
      ${dupla(inp(X, 'cia_emissora', i, 'Emitido na cia', x.cia_emissora, 's', 'placeholder="Azul"'), inp(X, 'cia_voo', i, 'Voa de (se for aliança)', x.cia_voo, 's', 'placeholder="Turkish"'))}
      ${x.cia_voo && x.cia_emissora && x.cia_voo.trim().toLowerCase() !== x.cia_emissora.trim().toLowerCase() ? `<div class="config" style="margin:4px 0 8px">Aliança: emitido na ${X.esc(x.cia_emissora)}, voa de ${X.esc(x.cia_voo)}. O check-in e o bilhete são pela ${X.esc(x.cia_voo)}.</div>` : ''}
      ${usaMilhas(x) ? `${dupla(inp(X, 'conta', i, 'Conta usada', x.conta), inp(X, 'gestor', i, 'Gestor da conta', x.gestor))}
      <div class="duas-col" style="grid-template-columns:1fr 1fr 1fr">${inp(X, 'milhas', i, x.ct_on ? 'Milhas (soma)' : 'Milhas', x.milhas, 'n', x.ct_on ? 'readonly' : '')}${inp(X, 'milheiro', i, 'Milheiro (R$)', x.milheiro, 'n')}${inp(X, 'taxas', i, x.ct_on ? 'Taxas (soma)' : 'Taxas (R$)', x.taxas, 'n', x.ct_on ? 'readonly' : '')}</div>` : ''}
      ${htmlTrechos(X, x, i, trava, ctx)}
      ${dupla(inp(X, 'localizador', i, 'Localizador', x.localizador, 's', 'style="text-transform:uppercase"'), inp(X, 'passageiros', i, 'Passageiros', x.passageiros ?? ctx.pax, 'n', 'inputmode="numeric"'))}
      ${htmlPax(X, x, i, trava)}
      <div class="sub" style="margin:6px 0 0">Bagagem despachada por passageiro</div>${seg('bagagem', i, [['0', 'Não tem'], ['1', '1 mala'], ['2', '2 malas'], ['3', '3 malas']], x.bagagem)}
      <div class="emchk" style="margin:4px 0 8px"><button type="button" data-print="${i}" class="${x.print ? 'ok' : ''}"><span class="cx">${x.print ? '✓' : '+'}</span><span>${x.print ? 'Print da tarifa anexado (tocar para ver)' : 'Anexar print da tarifa (obrigatório)'}</span></button>${!x.print && !trava ? `<button type="button" data-printcola="${i}"><span class="cx">⎘</span><span>Colar print</span></button>` : ''}${x.print && !trava ? `<button type="button" data-printtroca="${i}" style="font-size:12px;text-decoration:underline;color:var(--tinta-2)">trocar</button>` : ''}</div>
      <div class="sub" style="margin:-4px 0 8px">Confira no print se a tarifa inclui a mala despachada. Às vezes o bilhete não mostra.</div>`;
  } else if (ehHotel(x)) {
    det += `${inp(X, 'nome', i, 'Hotel', x.nome)}${dupla(inp(X, 'data_ida', i, 'Check-in', x.data_ida ?? ctx.ida, 'd'), inp(X, 'data_volta', i, 'Check-out', x.data_volta ?? ctx.volta, 'd'))}
      ${dupla(inp(X, 'destino', i, 'Cidade', x.destino), inp(X, 'localizador', i, 'Nº da reserva', x.localizador))}
      ${chk(X, 'carta', i, 'Carta de boas-vindas enviada ao hotel', x.carta)}`;
  } else {
    det += `${dupla(inp(X, 'nome', i, 'Descrição', x.nome, 's', 'placeholder="O que foi comprado"'), inp(X, 'data_ida', i, 'Data', x.data_ida ?? ctx.ida, 'd'))}${inp(X, 'localizador', i, 'Código ou reserva', x.localizador)}`;
  }
  det += `<label class="fl"><span>${usaMilhas(x) ? 'Fornecedor (se comprou milhas de alguém)' : 'Onde comprou (fornecedor)'}</span><input data-it="${i}" data-k="fornecedor" value="${X.esc(x.fornecedor || '')}" list="dlFornV"></label>`;
  det += chk(X, 'emitido', i, ehVoo(x) ? 'Emitido (bilhete gerado)' : 'Comprado / reservado', x.emitido, trava);
  const pend = pendenciasItem(x);
  det += trava ? `<div class="sub" style="color:var(--verde)">Enviado para a planilha${x.enviado_em ? ' em ' + new Date(x.enviado_em).toLocaleDateString('pt-BR') : ''}.</div>` : ctx.fechou && pend.length ? `<div class="sub" style="color:var(--alerta)">Falta: ${pend.join(', ')}.</div>` : '';
  return base + `<details ${ctx.fechou && !trava ? 'open' : ''} style="margin-top:4px"><summary style="cursor:pointer;font-size:13px;color:var(--verde);font-weight:600;padding:6px 0">Detalhes ${ehVoo(x) ? 'do voo' : ehHotel(x) ? 'do hotel' : 'do serviço'}${trava ? ' · na planilha' : x.emitido ? ' · emitido' : ''}</summary>${det}</details>`;
}

// ---------- custo por trecho ----------
// cada trecho com o seu custo (milhas e taxas, ou valor pagante) e passageiros; o custo do serviço vira a soma.
// Fica guardado no atendimento, e o app mostra quanto já se pagou no mesmo trecho em vendas anteriores.
const up3 = (t) => String(t || '').trim().toUpperCase().slice(0, 3);
export const custoLinha = (x, l) => r2(usaMilhas(x) ? (+l.milhas || 0) * (+x.milheiro || 0) / 1000 + (+l.taxas || 0) : (+l.custo || 0));
function linhasPadrao(x, ctx) {
  const o = up3(x.origem), d = up3(x.destino), tipo = x.tipo_trecho || ctx.tipoPadrao, pax = String(x.passageiros || ctx.pax || '');
  if (tipo === 'multi' && x.trechos) return String(x.trechos).split('\n').map(t => t.trim()).filter(Boolean).map(t => {
    const m = /([A-Za-z]{3})\s*[-–>→ ]+\s*([A-Za-z]{3})(?:\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?)?/.exec(t) || [];
    const ano = m[5] ? (m[5].length === 2 ? '20' + m[5] : m[5]) : String(new Date().getFullYear());
    return { o: up3(m[1]), d: up3(m[2]), data: m[3] ? `${ano}-${m[4].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '', pax };
  });
  const L = [{ o, d, data: x.data_ida || ctx.ida || '', pax }];
  if (tipo !== 'ida') L.push({ o: d, d: o, data: x.data_volta || ctx.volta || '', pax });
  return L;
}
function somarTrechos(x) {
  if (!x.ct_on || !Array.isArray(x.ct)) return;
  if (usaMilhas(x)) { x.milhas = x.ct.reduce((a, l) => a + (+l.milhas || 0), 0) || null; x.taxas = r2(x.ct.reduce((a, l) => a + (+l.taxas || 0), 0)) || null; }
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
  if (!Array.isArray(x.ct) || !x.ct.length) x.ct = linhasPadrao(x, ctx);
  const dd = (v) => v ? v.split('-').reverse().slice(0, 2).join('/') : '';
  return `<label class="fc" style="margin:6px 0"><input type="checkbox" data-ctliga="${i}" checked ${trava ? 'disabled' : ''}><span>Separar o custo por trecho</span></label>
    ${x.ct.map((l, k) => { const hs = histTrecho(X, up3(l.o), up3(l.d), x), c = custoLinha(x, l), p = +l.pax || 1;
      return `<div style="border-left:3px solid var(--linha);padding-left:8px;margin:6px 0">
      <div class="duas-col" style="grid-template-columns:1fr 1fr 1.3fr">${['o', 'd'].map(f => `<label class="fl"><span>${f === 'o' ? 'De' : 'Para'}</span><input data-ct="${i}|${k}|${f}" value="${X.esc(l[f] || '')}" maxlength="3" style="text-transform:uppercase" ${trava ? 'disabled' : ''}></label>`).join('')}<label class="fl"><span>Data</span><input type="date" data-ct="${i}|${k}|data" value="${X.esc(l.data || '')}" ${trava ? 'disabled' : ''}></label></div>
      <div class="duas-col" style="grid-template-columns:${milhas ? '1fr 1fr 0.8fr' : '1fr 0.8fr'}">${milhas ? `<label class="fl"><span>Milhas</span><input data-ct="${i}|${k}|milhas" inputmode="decimal" value="${X.esc(l.milhas ?? '')}" ${trava ? 'disabled' : ''}></label><label class="fl"><span>Taxas (R$)</span><input data-ct="${i}|${k}|taxas" inputmode="decimal" value="${X.esc(l.taxas ?? '')}" ${trava ? 'disabled' : ''}></label>` : `<label class="fl"><span>Custo do trecho (R$)</span><input data-ct="${i}|${k}|custo" inputmode="decimal" value="${X.esc(l.custo ?? '')}" ${trava ? 'disabled' : ''}></label>`}<label class="fl"><span>Passageiros</span><input data-ct="${i}|${k}|pax" inputmode="numeric" value="${X.esc(l.pax ?? '')}" ${trava ? 'disabled' : ''}></label></div>
      <div class="sub" style="margin:2px 0 0">${c ? `Este trecho: ${X.brl2(c)}${p > 1 ? ` (${X.brl2(c / p)} por passageiro)` : ''}` : ''}${hs.length ? `<br>Já pago em ${X.esc(l.o)} → ${X.esc(l.d)}: ${hs.map(hh => `${X.brl2(hh.pax)}/pax${hh.milhas ? ` (${hh.milhas.toLocaleString('pt-BR')} milhas)` : ''}${hh.cia ? ' · ' + X.esc(hh.cia) : ''}${hh.data ? ' · ' + dd(hh.data) : ''}`).join(' | ')}` : ''}</div>
      ${trava || x.ct.length < 2 ? '' : `<button type="button" data-cttira="${i}|${k}" style="background:none;border:0;color:var(--tinta-3);text-decoration:underline;font:inherit;font-size:12px;padding:0">tirar trecho</button>`}</div>`; }).join('')}
    ${trava ? '' : `<button type="button" class="sec" data-ctmais="${i}" style="width:100%;margin:2px 0 8px">+ Trecho</button>`}`;
}

// um bloco por passageiro: nome (puxa da ficha), CPF e nascimento
function htmlPax(X, x, i, trava) {
  const L = paxAjustado(x); if (!L.length) return '';
  return `<div class="sub" style="margin:6px 0 0">Dados dos passageiros (${L.length})</div>${L.map((p, k) => {
    const ok = String(p.nome || '').trim().includes(' ') && cpfValido(p.cpf) && p.nasc;
    return `<div style="border-left:3px solid ${ok ? 'var(--verde)' : 'var(--linha)'};padding-left:8px;margin:6px 0">
      <label class="fl"><span>Passageiro ${k + 1}: nome completo</span><input data-pax="${i}|${k}|nome" value="${X.esc(p.nome || '')}" list="dlPaxV" ${trava ? 'disabled' : ''}></label>
      <div class="duas-col"><label class="fl"><span>CPF</span><input data-pax="${i}|${k}|cpf" inputmode="numeric" value="${X.esc(p.cpf || '')}" ${trava ? 'disabled' : ''}>${p.cpf && !cpfValido(p.cpf) ? '<small style="color:var(--alerta)">CPF inválido</small>' : ''}</label>
      <label class="fl"><span>Nascimento</span><input data-pax="${i}|${k}|nasc" inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10" value="${X.esc(p.nasc ? isoBr(p.nasc) : (p.nasc_txt || ''))}" ${trava ? 'disabled' : ''}>${p.nasc_txt && !p.nasc ? '<small style="color:var(--alerta)">data incompleta ou inválida</small>' : ''}</label></div></div>`;
  }).join('')}`;
}

// editor dos serviços: devolve funções para ler o estado
export function editorItens(X, el, IT, ctx, aoMudar) {
  const tot = () => ({ v: r2(IT.reduce((a, x) => a + (+x.venda || 0), 0)), c: r2(IT.reduce((a, x) => a + custoDe(x), 0)) });
  const resumo = () => { const t = tot(); const e = el.querySelector('#reTot'); if (e) e.innerHTML = IT.length && (t.v || t.c) ? `<div class="lin"><span>Venda total</span><b>${X.brl2(t.v)}</b></div><div class="lin"><span>Custo total</span><span>${X.brl2(t.c)}</span></div><div class="lin"><span>Lucro bruto</span><b style="color:var(--verde)">${X.brl2(t.v - t.c)}</b></div>` : ''; if (aoMudar) aoMudar(t); };
  const padroes = () => IT.forEach(x => {
    if (enviado(x)) return;
    if (ehVoo(x)) { if (!x.tipo_trecho) x.tipo_trecho = ctx.tipoPadrao; if (!x.pago_em) x.pago_em = 'milhas'; }
    if (x.data_ida == null && ctx.ida) x.data_ida = ctx.ida;
    if (x.data_volta == null && ctx.volta && (ehVoo(x) || ehHotel(x)) && x.tipo_trecho !== 'ida') x.data_volta = ctx.volta;
  });
  const desenha = () => {
    if (ctx.detalhes) padroes();
    el.innerHTML = IT.length ? `<datalist id="dlPaxV">${(X.D.pessoas || []).slice(0, 3000).map(p => `<option value="${X.esc(p.nome)}">`).join('')}</datalist><datalist id="dlFornV">${X.fornecedores().map(n => `<option value="${X.esc(n)}">`).join('')}</datalist><div class="bloco" style="margin:8px 0 4px;padding:10px 12px">${IT.map((x, i) => `<div style="${i ? 'border-top:1px solid var(--linha);padding-top:8px;margin-top:8px' : ''}"><div style="font-weight:600;font-size:13px">${X.esc(x.produto)}${x.nome ? ' · ' + X.esc(x.nome) : ''}</div>${htmlItem(X, x, i, ctx)}</div>`).join('')}<div id="reTot" style="margin-top:8px"></div></div>` : '<div class="sub">Marque pelo menos um produto.</div>';
    el.querySelectorAll('input[data-it],textarea[data-it]').forEach(e => {
      const set = () => { const x = IT[+e.dataset.it], k = e.dataset.k, t = e.dataset.t; x[k] = t === 'b' ? e.checked : t === 'n' ? nb(e.value) : e.value.trim(); };
      if (e.type === 'checkbox') e.onchange = () => {
        const x = IT[+e.dataset.it];
        if (e.dataset.k === 'emitido' && e.checked && ehVoo(x) && !x.print) { e.checked = false; X.aviso('Anexe o print da tarifa antes de marcar como emitido.'); return; }
        set(); desenha();
      };
      else { e.oninput = () => { set(); resumo(); }; e.onchange = () => { if (['milhas', 'milheiro', 'taxas', 'cia_voo', 'cia_emissora'].includes(e.dataset.k)) desenha(); }; }
    });
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { IT[+b.dataset.it][b.dataset.k] = b.dataset.set; desenha(); });
    // custo por trecho
    el.querySelectorAll('[data-ctliga]').forEach(e => e.onchange = () => { const x = IT[+e.dataset.ctliga]; x.ct_on = e.checked; if (e.checked && !(x.ct || []).length) x.ct = null; desenha(); });
    el.querySelectorAll('[data-ctmais]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.ctmais], u = x.ct[x.ct.length - 1] || {}; x.ct.push({ o: u.d || '', d: '', data: '', pax: u.pax || '' }); desenha(); });
    el.querySelectorAll('[data-cttira]').forEach(b => b.onclick = () => { const [i, k] = b.dataset.cttira.split('|'); IT[+i].ct.splice(+k, 1); desenha(); });
    el.querySelectorAll('[data-ct]').forEach(e => {
      const [i, k, campo] = e.dataset.ct.split('|'), x = IT[+i];
      e.oninput = () => { const l = x.ct[+k]; l[campo] = /^(o|d)$/.test(campo) ? e.value.trim().toUpperCase() : /^(milhas|taxas|custo|pax)$/.test(campo) ? nb(e.value) : e.value; somarTrechos(x);
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
    el.querySelectorAll('[data-print]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.print]; x.print ? verArquivo(X, x.print) : anexar(X, 'print', x, desenha); });
    el.querySelectorAll('[data-printtroca]').forEach(b => b.onclick = () => anexar(X, 'print', IT[+b.dataset.printtroca], desenha));
    el.querySelectorAll('[data-printcola]').forEach(b => b.onclick = () => colar(X, 'print', IT[+b.dataset.printcola], desenha));
    IT._proxAnexo = () => { const x = IT.find(y => ehVoo(y) && !y.print && !enviado(y)); return x ? { tipo: 'print', alvo: x, depois: desenha } : null; };
    resumo();
  };
  desenha();
  return { desenha, tot };
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
  alvo[tipo] = path; X.aviso(tipo === 'print' ? 'Print anexado. Salve o atendimento.' : 'Comprovante anexado. Salve o atendimento.'); depois();
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
    if (!f) return; e.preventDefault(); const d = a(); if (d) subir(X, d.tipo, d.alvo, d.depois, f.getAsFile());
  };
  document.addEventListener('paste', colarCard);
}

// bloco do fechamento: pagamento, link, comprovante, conferência do financeiro
export function editorFechamento(X, el, F, ctx) {
  const pixGuardado = () => { try { return localStorage.getItem('mk_pix') || ''; } catch (_) { return ''; } };
  const desenha = () => {
    const t = ctx.total();
    const cartao = F.forma === 'cartao';
    el.innerHTML = `<div class="bloco" style="margin:8px 0;padding:10px 12px">
      <div class="sub" style="margin:0">Forma de pagamento${F.forma ? '' : ': escolha primeiro, o valor da venda se ajusta sozinho'}</div>
      <div class="seg" style="margin:6px 0 8px"><button type="button" data-fp="pix" class="${F.forma === 'pix' ? 'on' : ''}">Pix</button><button type="button" data-fp="cartao" class="${cartao ? 'on' : ''}">Cartão</button></div>
      ${cartao ? `<div class="duas-col"><label class="fl"><span>Em quantas vezes</span><input id="fParc" inputmode="numeric" value="${X.esc(F.parcelas || '')}" placeholder="10"></label><label class="fl"><span>Valor da parcela</span><input readonly value="${F.parcelas && t.v ? X.brl2(t.v / F.parcelas) : ''}"></label></div>
      <label class="fl"><span>Link de pagamento do cartão</span><input id="fLink" inputmode="url" value="${X.esc(F.link || '')}" placeholder="Cole o link gerado"></label>` : F.forma === 'pix' ? `<label class="fl"><span>Dados do Pix para o cliente</span><input id="fPix" value="${X.esc(F.pix || pixGuardado())}" placeholder="Chave Pix e nome do recebedor"></label>` : ''}
      ${(() => { const alvo = ctx.alvo ? ctx.alvo(F.forma, +F.parcelas || 0) : null; return alvo && Math.abs(alvo - t.v) > 0.009 ? `<div class="config" style="margin:4px 0 8px">Pela cotação, ${F.forma === 'pix' ? 'no Pix' : `no cartão em ${F.parcelas}x`} o total é <b>${X.brl2(alvo)}</b>.<button type="button" class="zap" id="fUsarAlvo" style="width:100%;margin-top:6px">Usar ${X.brl2(alvo)} na venda</button></div>` : ''; })()}
      <div class="lin" style="margin-top:6px"><span>Valor total da venda</span><b>${X.brl2(t.v)}</b></div>
      ${F.forma ? `<button type="button" class="zap" id="fEnviar" style="width:100%;margin-top:8px">${F.enviado_em ? 'Enviar de novo ao cliente' : 'Enviar o pagamento ao cliente'}</button>${F.enviado_em ? `<div class="sub">Enviado em ${new Date(F.enviado_em).toLocaleDateString('pt-BR')}.</div>` : ''}` : ''}
      <div class="emchk" style="margin:10px 0 4px;border-top:1px solid var(--linha)"><button type="button" id="fComp" class="${F.comprovante ? 'ok' : ''}"><span class="cx">${F.comprovante ? '✓' : '+'}</span><span>${F.comprovante ? 'Comprovante anexado (tocar para ver)' : 'Anexar comprovante de pagamento'}</span></button>${F.comprovante ? '<button type="button" id="fCompT" style="font-size:12px;text-decoration:underline;color:var(--tinta-2)">trocar</button>' : '<button type="button" id="fCompC"><span class="cx">⎘</span><span>Colar print</span></button>'}</div>
      <div class="sub" style="margin-top:0">${F.comprovante ? (F.conferido ? `Conferido pelo financeiro${F.conferido_por ? ' (' + X.esc(X.nomeTime(F.conferido_por) || '') + ')' : ''}.` : 'Aparece no Início dos administradores para conferir.') : 'Com o comprovante, a venda vai como paga para a planilha.'}</div>
      ${F.comprovante && X.ADMIN ? `<label class="fc" style="margin:6px 0"><input type="checkbox" id="fConf" ${F.conferido ? 'checked' : ''}><span>Conferido pelo financeiro</span></label>` : ''}
    </div>`;
    // troca de forma ou de parcelas: se a venda estava num valor da cotação, já passa para o valor certo da nova escolha
    const ajusta = () => {
      F.taxa_pct = F.forma === 'cartao' && F.parcelas && ctx.taxa ? ctx.taxa(+F.parcelas) : (F.forma === 'pix' ? 0 : F.taxa_pct);
      const alvo = ctx.alvo ? ctx.alvo(F.forma, +F.parcelas || 0) : null, atual = ctx.total().v;
      if (alvo && ctx.aplicarTotal && Math.abs(alvo - atual) > 0.009 && (ctx.presets ? ctx.presets() : []).some(v => Math.abs(v - atual) < 0.01)) { ctx.aplicarTotal(alvo); X.aviso(`Venda ajustada para ${X.brl2(alvo)}, o valor da cotação ${F.forma === 'pix' ? 'no Pix' : `em ${F.parcelas}x`}.`); }
      desenha();
    };
    el.querySelectorAll('[data-fp]').forEach(b => b.onclick = () => { F.forma = b.dataset.fp; ajusta(); });
    const usar = el.querySelector('#fUsarAlvo'); if (usar) usar.onclick = () => { const alvo = ctx.alvo(F.forma, +F.parcelas || 0); if (alvo && ctx.aplicarTotal) { ctx.aplicarTotal(alvo); desenha(); } };
    const fp = el.querySelector('#fParc'); if (fp) fp.onchange = () => ajusta();
    const liga = (id, k, fn) => { const e = el.querySelector('#' + id); if (e) e.oninput = () => { F[k] = fn ? fn(e.value) : e.value.trim(); if (id === 'fParc') { const v = el.querySelector('#fParc').parentElement.parentElement.querySelectorAll('input')[1]; v.value = F.parcelas && t.v ? X.brl2(t.v / F.parcelas) : ''; } }; };
    liga('fParc', 'parcelas', v => parseInt(v, 10) || null); liga('fLink', 'link'); liga('fPix', 'pix');
    const pix = el.querySelector('#fPix'); if (pix) { if (!F.pix && pix.value) F.pix = pix.value; pix.onchange = () => { try { localStorage.setItem('mk_pix', pix.value.trim()); } catch (_) {} }; }
    const env = el.querySelector('#fEnviar'); if (env) env.onclick = () => {
      const nome = String(ctx.cliente() || '').split(' ')[0];
      if (cartao && !F.link) { X.aviso('Cole o link de pagamento antes de enviar.'); return; }
      if (cartao && !F.parcelas) { X.aviso('Informe em quantas vezes.'); return; }
      if (!cartao && !F.pix) { X.aviso('Informe os dados do Pix.'); return; }
      const txt = cartao
        ? `Oi, ${nome}! Tudo pronto para garantir a sua viagem. O investimento total ficou em ${X.brl2(t.v)}, em ${F.parcelas}x de ${X.brl2(t.v / F.parcelas)} no cartão. É só pagar por este link:\n${F.link}\nAssim que o pagamento cair, a gente emite e te manda tudo.`
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

// manda os serviços emitidos para a fila da planilha. Devolve os itens atualizados.
export async function enviarParaPlanilha(X, r, IT, F) {
  const p = r.pessoa_id ? (X.D.pessoas || []).find(x => x.id === r.pessoa_id) : null;
  const doc = p ? (X.D.docs || []).find(d => d.pessoa_id === p.id) : null;
  const vendedor = X.nomeTime(r.assumido_por || r.responsavel_id) || '';
  const hoje = new Date(); const dataNeg = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const novos = IT.filter(x => !enviado(x));
  const linhas = novos.map(x => {
    const id = uuid(), milhas = usaMilhas(x);
    return { id, atendimento_id: r.id, item: IT.indexOf(x), dados: {
      'Gestor': milhas ? (x.gestor || '') : '', 'Conta': milhas ? (x.conta || '') : (x.fornecedor || ''),
      'Email ou Produto': ehVoo(x) ? '' : (x.nome || x.produto), 'Cidade': x.destino || '',
      'Cia': ehVoo(x) ? (x.cia_voo && x.cia_voo !== x.cia_emissora ? `${x.cia_emissora} (voa ${x.cia_voo})` : (x.cia_emissora || '')) : (x.fornecedor || ''),
      'Sobrenome': sobrenome(r.cliente), 'CPF (NF)': doc && doc.cpf ? (d => d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : doc.cpf)(String(doc.cpf).replace(/\D/g, '')) : '',
      'Origem': x.origem || '', 'Destino': x.destino || '', 'Comprador': r.cliente || '', 'Passageiros': +x.passageiros || 1,
      'Contato': r.contato && !/@/.test(r.contato) ? r.contato : (p && p.celular) || '', 'Indicação': '',
      'Localizador': String(x.localizador || '').toUpperCase(), 'Data da negociação': dataNeg,
      'Milhas': milhas ? (+x.milhas || 0) : 0, 'Milheiro': milhas ? (+x.milheiro || 0) : 0, 'Taxas': milhas ? (+x.taxas || 0) : r2(custoDe(x)),
      'Valor a receber': r2(x.venda), 'Pago': !!F.comprovante,
      'Data do Voo (Ida)': x.data_ida || '', 'Data do Voo (Volta)': x.tipo_trecho === 'ida' ? '' : (x.data_volta || ''),
'Observações': [numCard(r), ehVoo(x) && (x.pax || []).length ? 'Passageiros: ' + paxAjustado(x).map(p => p.nome).join('; ') : '', ehVoo(x) && x.ct_on && (x.ct || []).length ? 'Custo por trecho: ' + x.ct.map(l => `${up3(l.o)}-${up3(l.d)}${l.data ? ' ' + l.data.split('-').reverse().slice(0, 2).join('/') : ''} R$ ${custoLinha(x, l).toFixed(2).replace('.', ',')}${+l.pax > 1 ? ' (' + l.pax + ' pax)' : ''}`).join('; ') : '', ehVoo(x) && x.tipo_trecho === 'multi' && x.trechos ? 'Multitrecho: ' + String(x.trechos).replace(/\n/g, ' | ') : '', ehVoo(x) ? `Bagagem: ${x.bagagem === '0' ? 'sem mala despachada' : x.bagagem + ' mala(s) por passageiro'}` : '', ehVoo(x) && x.pago_em === 'pagante' && x.fornecedor ? 'Comprado em ' + x.fornecedor : ''].filter(Boolean).join(' · '),
      'Forma de pagamento': F.forma === 'cartao' ? 'Cartão de crédito' : F.forma === 'pix' ? 'Pix' : '',
      'Quantas vezes': F.forma === 'cartao' && F.parcelas ? +F.parcelas : '',
      'Serviço': servicoPlanilha(x), 'Vendedor': vendedor, 'ID sistema': id
    } };
  });
  if (!linhas.length) return { ok: true, n: 0 };
  await salvarPassageiros(X, novos);
  const { error } = await X.sb.from('fila_planilha').insert(linhas);
  if (error) return { ok: false, erro: error.message };
  const agora = new Date().toISOString();
  linhas.forEach(l => { IT[l.item].planilha_id = l.id; IT[l.item].enviado_em = agora; });
  return { ok: true, n: linhas.length };
}

// cada passageiro vira (ou atualiza) uma ficha no CRM com papel de passageiro, CPF e nascimento
export async function salvarPassageiros(X, itens) {
  const n = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const todos = itens.filter(ehVoo).flatMap(x => paxAjustado(x).map(p => ({ x, p }))).filter(({ p }) => String(p.nome || '').trim().includes(' '));
  for (const { p } of todos) {
    try {
      let f = p.pessoa_id ? (X.D.pessoas || []).find(o => o.id === p.pessoa_id) : (X.D.pessoas || []).find(o => n(o.nome) === n(p.nome));
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
