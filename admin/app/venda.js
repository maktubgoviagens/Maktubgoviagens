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
  if (F.forma === 'pix_cartao') {
    if (!+F.pix_valor) f.push('valor recebido no Pix');
    if (!+F.cartao_liq) f.push('valor recebido no cartão');
    if (!+F.parcelas) f.push('em quantas vezes no cartão');
  }
  if (!F.comprovante) f.push('comprovante de pagamento');
  IT.filter(x => !enviado(x)).forEach(x => { const p = pendenciasItem(x); if (p.length) f.push(`${x.produto}: ${p.join(', ')}`); });
  return f;
}
export const concluida = (r) => r.resultado === 'Fechou' && (r.itens || []).length > 0 && (r.itens || []).every(enviado) && !!(r.fech || {}).comprovante;

const seg = (k, i, ops, v) => `<div class="seg" style="margin:6px 0 8px">${ops.map(([val, l]) => `<button type="button" data-it="${i}" data-k="${k}" data-set="${val}" class="${String(v ?? '') === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const inp = (X, k, i, rot, v, t = 's', extra = '') => `<label class="fl"><span>${rot}</span><input data-it="${i}" data-k="${k}" data-t="${t}" value="${X.esc(v ?? '')}" ${t === 'n' ? 'inputmode="decimal"' : ''} ${t === 'd' ? 'type="date"' : ''} ${t === 'h' ? 'type="time"' : ''} ${extra}></label>`;
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
      ${dupla(inp(X, 'origem', i, 'Origem', x.origem, 's', 'maxlength="40" placeholder="Cidade ou código" data-aero="cod" autocomplete="off"'), inp(X, 'destino', i, 'Destino', x.destino, 's', 'maxlength="40" placeholder="Cidade ou código" data-aero="cod" autocomplete="off"'))}
      ${(x.tipo_trecho || ctx.tipoPadrao) === 'multi' ? `<label class="fl"><span>Trechos (um por linha)</span><textarea data-it="${i}" data-k="trechos" rows="3" placeholder="GIG-LIS 10/11&#10;LIS-MAD 15/11&#10;MAD-GIG 22/11">${X.esc(x.trechos || '')}</textarea></label>` : ''}
      ${dupla(inp(X, 'data_ida', i, 'Data da ida', x.data_ida ?? ctx.ida, 'd'), (x.tipo_trecho || ctx.tipoPadrao) === 'ida' ? '<div></div>' : inp(X, 'data_volta', i, 'Data da volta', x.data_volta ?? ctx.volta, 'd'))}
      ${(m => dupla(inp(X, 'hora_ida', i, m ? 'Saída do 1º trecho' : 'Horário de saída da ida', x.hora_ida, 'h'), (x.tipo_trecho || ctx.tipoPadrao) === 'ida' ? '<div></div>' : inp(X, 'hora_volta', i, m ? 'Saída do último trecho' : 'Horário de saída da volta', x.hora_volta, 'h')))((x.tipo_trecho || ctx.tipoPadrao) === 'multi')}
      <div class="sub" style="margin:-2px 0 6px">O horário de saída faz o aviso de check-in chegar 24 h antes do voo.</div>
      <div class="sub" style="margin:6px 0 0">Como foi pago</div>${seg('pago_em', i, [['milhas', 'Milhas'], ['pagante', 'Pagante']], x.pago_em || 'milhas')}
      ${dupla(inp(X, 'cia_emissora', i, 'Emitido na cia', x.cia_emissora, 's', 'placeholder="Azul"'), inp(X, 'cia_voo', i, 'Voa de (se for aliança)', x.cia_voo, 's', 'placeholder="Turkish"'))}
      ${x.cia_voo && x.cia_emissora && x.cia_voo.trim().toLowerCase() !== x.cia_emissora.trim().toLowerCase() ? `<div class="config" style="margin:4px 0 8px">Aliança: emitido na ${X.esc(x.cia_emissora)}, voa de ${X.esc(x.cia_voo)}. O check-in e o bilhete são pela ${X.esc(x.cia_voo)}.</div>` : ''}
      ${usaMilhas(x) ? `${dupla(inp(X, 'conta', i, 'Conta usada', x.conta), inp(X, 'gestor', i, 'Gestor da conta', x.gestor))}
      <div class="duas-col" style="grid-template-columns:1fr 1fr 1fr">${inp(X, 'milhas', i, x.ct_on ? 'Milhas (soma)' : 'Milhas', x.milhas, 'n', x.ct_on ? 'readonly' : '')}${inp(X, 'milheiro', i, x.ct_on ? 'Milheiro (média)' : 'Milheiro (R$)', x.milheiro, 'n', x.ct_on && (x.ct || []).some(l => l.milheiro != null && l.milheiro !== '') ? 'readonly' : '')}${inp(X, 'taxas', i, x.ct_on ? 'Taxas (soma)' : 'Taxas (R$)', x.taxas, 'n', x.ct_on ? 'readonly' : '')}</div>` : ''}
      ${htmlTrechos(X, x, i, trava, ctx)}
      ${dupla(inp(X, 'localizador', i, 'Localizador', x.localizador, 's', 'style="text-transform:uppercase"'), inp(X, 'passageiros', i, 'Passageiros', x.passageiros ?? ctx.pax, 'n', 'inputmode="numeric"'))}
      ${htmlPax(X, x, i, trava, ctx)}
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

// título de cada emissão quando a venda tem mais de uma: rota, companhia e localizador
function tituloVoo(X, x, IT) {
  const n = IT.filter(ehVoo).length; if (n < 2 && !x.localizador) return '';
  const rota = x.origem || x.destino ? ` · ${X.esc(up3(x.origem))} ${x.tipo_trecho === 'iv' ? '⇄' : '→'} ${X.esc(up3(x.destino))}` : '';
  return `<span style="font-weight:400;color:var(--tinta-2)">${n > 1 ? ' · emissão ' + (IT.filter(ehVoo).indexOf(x) + 1) : ''}${rota}${x.cia_emissora ? ' · ' + X.esc(x.cia_emissora) : ''}${x.localizador ? ' · ' + X.esc(String(x.localizador).toUpperCase()) : ''}</span>`;
}
// um trecho que foi emitido à parte (outra companhia, outro localizador) vira outra emissão, com o próprio custo
function separarTrecho(IT, i, k) {
  const x = IT[i], l = x.ct.splice(k, 1)[0];
  const novo = { produto: x.produto, custo: null, venda: null, tipo_trecho: 'ida', origem: up3(l.o), destino: up3(l.d), data_ida: l.data || null, passageiros: +l.pax || null, pago_em: 'milhas' };
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
      <div class="duas-col" style="grid-template-columns:1fr 1fr 1.3fr">${['o', 'd'].map(f => `<label class="fl"><span>${f === 'o' ? 'De' : 'Para'}</span><input data-ct="${i}|${k}|${f}" value="${X.esc(l[f] || '')}" maxlength="3" style="text-transform:uppercase" ${trava ? 'disabled' : ''}></label>`).join('')}<label class="fl"><span>Data</span><input type="date" data-ct="${i}|${k}|data" value="${X.esc(l.data || '')}" ${trava ? 'disabled' : ''}></label></div>
      <div class="duas-col" style="grid-template-columns:${milhas ? '1fr 0.9fr 0.9fr 0.7fr' : '1fr 0.8fr'}">${milhas ? `<label class="fl"><span>Milhas</span><input data-ct="${i}|${k}|milhas" inputmode="decimal" value="${X.esc(l.milhas ?? '')}" ${trava ? 'disabled' : ''}></label><label class="fl"><span>Milheiro (R$)</span><input data-ct="${i}|${k}|milheiro" inputmode="decimal" value="${X.esc(l.milheiro ?? '')}" placeholder="${X.esc(x.milheiro ?? '')}" ${trava ? 'disabled' : ''}></label><label class="fl"><span>Taxas (R$)</span><input data-ct="${i}|${k}|taxas" inputmode="decimal" value="${X.esc(l.taxas ?? '')}" ${trava ? 'disabled' : ''}></label>` : `<label class="fl"><span>Custo do trecho (R$)</span><input data-ct="${i}|${k}|custo" inputmode="decimal" value="${X.esc(l.custo ?? '')}" ${trava ? 'disabled' : ''}></label>`}<label class="fl"><span>Passageiros</span><input data-ct="${i}|${k}|pax" inputmode="numeric" value="${X.esc(l.pax ?? '')}" ${trava ? 'disabled' : ''}></label></div>
      <div class="sub" style="margin:2px 0 0">${c ? `Este trecho: ${X.brl2(c)}${p > 1 ? ` (${X.brl2(c / p)} por passageiro)` : ''}` : ''}${hs.length ? `<br>Já pago em ${X.esc(l.o)} → ${X.esc(l.d)}: ${hs.map(hh => `${X.brl2(hh.pax)}/pax${hh.milhas ? ` (${hh.milhas.toLocaleString('pt-BR')} milhas)` : ''}${hh.cia ? ' · ' + X.esc(hh.cia) : ''}${hh.data ? ' · ' + dd(hh.data) : ''}`).join(' | ')}` : ''}</div>
      ${trava || x.ct.length < 2 ? '' : `<button type="button" data-ctsep="${i}|${k}" style="background:none;border:0;color:var(--verde);text-decoration:underline;font:inherit;font-size:12px;padding:0;margin-right:12px">emitido à parte: virar outra emissão</button><button type="button" data-cttira="${i}|${k}" style="background:none;border:0;color:var(--tinta-3);text-decoration:underline;font:inherit;font-size:12px;padding:0">tirar trecho</button>`}</div>`; }).join('')}
    ${trava ? '' : `<button type="button" class="sec" data-ctmais="${i}" style="width:100%;margin:2px 0 8px">+ Trecho</button>`}`;
}

// um bloco por passageiro: nome (puxa da ficha), CPF e nascimento
function htmlPax(X, x, i, trava, ctx) {
  const L = paxAjustado(x); if (!L.length) return '';
  const cli = ctx && ctx.cliente ? String(ctx.cliente).trim() : '';
  return `<div class="sub" style="margin:6px 0 0">Dados dos passageiros (${L.length})</div>${cli && !trava ? `<label class="fc" style="margin:6px 0"><input type="checkbox" data-clipax="${i}" ${x.cliente_pax ? 'checked' : ''}><span>O cliente (${X.esc(cli.split(' ')[0])}) é o passageiro 1</span></label>` : ''}${L.map((p, k) => {
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
    el.innerHTML = IT.length ? `<datalist id="dlPaxV">${(X.D.pessoas || []).slice(0, 3000).map(p => `<option value="${X.esc(p.nome)}">`).join('')}</datalist><datalist id="dlFornV">${X.fornecedores().map(n => `<option value="${X.esc(n)}">`).join('')}</datalist><div class="bloco" style="margin:8px 0 4px;padding:10px 12px">${IT.map((x, i) => `<div style="${i ? 'border-top:1px solid var(--linha);padding-top:8px;margin-top:8px' : ''}"><div style="font-weight:600;font-size:13px">${X.esc(x.produto)}${x.nome ? ' · ' + X.esc(x.nome) : ''}${ehVoo(x) ? tituloVoo(X, x, IT) : ''}</div>${htmlItem(X, x, i, ctx)}${ehVoo(x) && !enviado(x) ? `<button type="button" class="sec" data-outraem="${i}" style="width:100%;margin:6px 0 2px;font-size:12px">+ Outra emissão (outro localizador, companhia ou forma de pagamento)</button>` : ''}</div>`).join('')}<div id="reTot" style="margin-top:8px"></div></div>` : '<div class="sub">Marque pelo menos um produto.</div>';
    el.querySelectorAll('input[data-it],textarea[data-it]').forEach(e => {
      const set = () => { const x = IT[+e.dataset.it], k = e.dataset.k, t = e.dataset.t; x[k] = t === 'b' ? e.checked : t === 'n' ? nb(e.value) : e.value.trim(); };
      if (e.type === 'checkbox') e.onchange = () => {
        const x = IT[+e.dataset.it];
        if (e.dataset.k === 'emitido' && e.checked && ehVoo(x) && !x.print) { e.checked = false; X.aviso('Anexe o print da tarifa antes de marcar como emitido.'); return; }
        set(); desenha();
      };
      // milhas, milheiro e taxas: atualiza só o custo calculado, sem redesenhar a tela (não fecha o teclado nem pula a página)
      else { e.oninput = () => { set(); resumo(); if (['milhas', 'milheiro', 'taxas'].includes(e.dataset.k)) { const x = IT[+e.dataset.it], c = el.querySelector(`input[data-it="${e.dataset.it}"][data-k="custo"]`); if (c && usaMilhas(x) && (x.milhas || x.taxas)) c.value = custoMilhas(x); } }; e.onchange = () => { if (['cia_voo', 'cia_emissora'].includes(e.dataset.k)) desenha(); }; }
    });
    el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { IT[+b.dataset.it][b.dataset.k] = b.dataset.set; desenha(); });
    // custo por trecho
    el.querySelectorAll('[data-ctliga]').forEach(e => e.onchange = () => { const x = IT[+e.dataset.ctliga]; x.ct_on = e.checked; if (e.checked && !(x.ct || []).length) x.ct = null; desenha(); });
    el.querySelectorAll('[data-ctmais]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.ctmais], u = x.ct[x.ct.length - 1] || {}; x.ct.push({ o: u.d || '', d: '', data: '', pax: u.pax || '' }); desenha(); });
    const avisaMudou = () => el.dispatchEvent(new Event('change', { bubbles: true }));
    el.querySelectorAll('[data-ctsep]').forEach(b => b.onclick = () => { const [i, k] = b.dataset.ctsep.split('|'); separarTrecho(IT, +i, +k); desenha(); avisaMudou(); X.aviso('Trecho virou outra emissão: preencha companhia, forma de pagamento, custo e localizador dela.'); });
    el.querySelectorAll('[data-outraem]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.outraem]; IT.splice(+b.dataset.outraem + 1, 0, { produto: x.produto, custo: null, venda: null, tipo_trecho: 'ida', pago_em: 'milhas' }); desenha(); avisaMudou(); });
    el.querySelectorAll('[data-cttira]').forEach(b => b.onclick = () => { const [i, k] = b.dataset.cttira.split('|'); IT[+i].ct.splice(+k, 1); desenha(); });
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
    if (!f) return; e.preventDefault(); const d = a(); if (d) subir(X, d.tipo, d.alvo, d.depois, f.getAsFile());
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

// manda os serviços emitidos para a fila da planilha. Devolve os itens atualizados.
export async function enviarParaPlanilha(X, r, IT, F) {
  // passageiros primeiro: o CPF digitado no fechamento já vale para a nota (cliente novo não fica sem CPF)
  await salvarPassageiros(X, IT.filter(x => !enviado(x)));
  const p = r.pessoa_id ? (X.D.pessoas || []).find(x => x.id === r.pessoa_id) : null;
  const nrm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const paxComprador = IT.flatMap(x => (x.pax || [])).find(q => q && cpfValido(q.cpf) && (nrm(q.nome) === nrm(r.cliente) || (p && q.pessoa_id === p.id)));
  const doc0 = p ? (X.D.docs || []).find(d => d.pessoa_id === p.id) : null;
  const doc = doc0 && doc0.cpf ? doc0 : paxComprador ? { cpf: paxComprador.cpf } : doc0;
  const vendedor = X.nomeTime(r.assumido_por || r.responsavel_id) || '';
  const hoje = new Date(); const dataNeg = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const novos = IT.filter(x => !enviado(x));
  const linhas = novos.map(x => {
    const id = uuid(), milhas = usaMilhas(x);
    return { id, atendimento_id: r.id, item: IT.indexOf(x), dados: {
      // Gestor nunca vai vazio: as fórmulas de lucro da planilha e a sincronização com o app só leem linhas com Gestor
      'Gestor': (milhas && x.gestor) || 'Maktub', 'Conta': milhas ? (x.conta || '') : (x.fornecedor || ''),
      'Email ou Produto': ehVoo(x) ? '' : (x.nome || x.produto), 'Cidade': x.destino || '',
      'Cia': ehVoo(x) ? (x.cia_voo && x.cia_voo !== x.cia_emissora ? `${x.cia_emissora} (voa ${x.cia_voo})` : (x.cia_emissora || '')) : (x.fornecedor || ''),
      'Sobrenome': sobrenome(r.cliente), 'CPF (NF)': doc && doc.cpf ? (d => d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : doc.cpf)(String(doc.cpf).replace(/\D/g, '')) : '',
      'Origem': x.origem || '', 'Destino': x.destino || '', 'Comprador': r.cliente || '', 'Passageiros': +x.passageiros || 1,
      'Contato': r.contato && !/@/.test(r.contato) ? r.contato : (p && p.celular) || '', 'Indicação': '',
      'Localizador': String(x.localizador || '').toUpperCase(), 'Data da negociação': dataNeg,
      'Milhas': milhas ? (+x.milhas || 0) : 0, 'Milheiro': milhas ? (+x.milheiro || 0) : 0, 'Taxas': milhas ? (+x.taxas || 0) : r2(custoDe(x)),
      'Valor a receber': r2(x.venda), 'Pago': !!F.comprovante,
      'Data do Voo (Ida)': x.data_ida || '', 'Data do Voo (Volta)': x.tipo_trecho === 'ida' ? '' : (x.data_volta || ''),
'Observações': [numCard(r), ehVoo(x) && (x.pax || []).length ? 'Passageiros: ' + paxAjustado(x).map(p => p.nome).join('; ') : '', ehVoo(x) && x.ct_on && (x.ct || []).length ? 'Custo por trecho: ' + x.ct.map(l => `${up3(l.o)}-${up3(l.d)}${l.data ? ' ' + l.data.split('-').reverse().slice(0, 2).join('/') : ''} R$ ${custoLinha(x, l).toFixed(2).replace('.', ',')}${+l.pax > 1 ? ' (' + l.pax + ' pax)' : ''}`).join('; ') : '', ehVoo(x) && x.tipo_trecho === 'multi' && x.trechos ? 'Multitrecho: ' + String(x.trechos).replace(/\n/g, ' | ') : '', ehVoo(x) && (x.hora_ida || x.hora_volta) ? 'Horário de saída: ' + [x.hora_ida ? 'ida ' + x.hora_ida : '', x.tipo_trecho !== 'ida' && x.hora_volta ? (x.tipo_trecho === 'multi' ? 'último trecho ' : 'volta ') + x.hora_volta : ''].filter(Boolean).join(', ') : '', ehVoo(x) ? `Bagagem: ${x.bagagem === '0' ? 'sem mala despachada' : x.bagagem + ' mala(s) por passageiro'}` : '', ehVoo(x) && x.pago_em === 'pagante' && x.fornecedor ? 'Comprado em ' + x.fornecedor : '', F.forma === 'cartao' && +F.bruto ? `Cliente pagou ${'R$ ' + (+F.bruto).toFixed(2).replace('.', ',')} no cartão em ${F.parcelas || 1}x (taxa da maquininha ${String(+F.taxa_pct || 0).replace('.', ',')}%)` : '',
        F.forma === 'pix_cartao' ? (rs => `Pix + Cartão: ${rs(F.pix_valor)} no Pix + ${rs(F.cartao_liq)} recebido do cartão em ${F.parcelas || 1}x (cliente pagou ${rs(F.bruto)} no cartão; taxa da maquininha ${String(+F.taxa_pct || 0).replace('.', ',')}%: ${rs((+F.bruto || 0) - (+F.cartao_liq || 0))})`)(v => 'R$ ' + (+v || 0).toFixed(2).replace('.', ',')) : ''].filter(Boolean).join(' · '),
      'Forma de pagamento': F.forma === 'cartao' ? 'Cartão de crédito' : F.forma === 'pix' ? 'Pix' : F.forma === 'pix_cartao' ? 'Pix + Cartão' : '',
      'Quantas vezes': (F.forma === 'cartao' || F.forma === 'pix_cartao') && F.parcelas ? +F.parcelas : '',
      'Serviço': servicoPlanilha(x), 'Vendedor': vendedor, 'ID sistema': id
    } };
  });
  if (!linhas.length) return { ok: true, n: 0 };
  const { error } = await X.sb.from('fila_planilha').insert(linhas);
  if (error) return { ok: false, erro: error.message };
  await salvarHorarios(X, linhas.map(l => ({ id: l.id, x: IT[l.item] })));
  await salvarVoos(X, linhas.map(l => ({ id: l.id, x: IT[l.item] })));
  const agora = new Date().toISOString();
  linhas.forEach(l => { IT[l.item].planilha_id = l.id; IT[l.item].enviado_em = agora; });
  return { ok: true, n: linhas.length };
}

// horário de saída de cada emissão de voo (ida e volta/último trecho): é o que faz o aviso de check-in sair 24 h antes.
// Sem horário, o aviso sai à meia-noite do dia anterior. Fica numa tabela própria, ligada pelo ID sistema da emissão.
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
    // rota e datas como estão no fechamento (podem ter mudado desde a cotação); o horário de cada voo vem da cotação quando bate a rota
    const ct = Array.isArray(x.ct) ? x.ct : [];
    let ls = (x.ct_on && ct.length ? ct : linhasPadrao(x, { tipoPadrao: x.tipo_trecho || 'iv' })).map(l => ({ o: up3(l.o), d: up3(l.d), data: l.data || '', hora: l.hora || '' }));
    ls.forEach(l => { if (!l.hora) { const c = ct.find(q => up3(q.o) === l.o && up3(q.d) === l.d && (!q.data || !l.data || q.data === l.data)); if (c && c.hora) l.hora = c.hora; } });
    ls = ls.filter(l => l.data);
    if (!ls.length) continue;
    // horário digitado no fechamento vale para o primeiro e o último voo
    if (x.hora_ida) ls[0].hora = x.hora_ida;
    if (ls.length > 1 && x.tipo_trecho !== 'ida' && x.hora_volta) ls[ls.length - 1].hora = x.hora_volta;
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
