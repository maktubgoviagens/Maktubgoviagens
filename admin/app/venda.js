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

// o que falta para um serviço poder ir para a planilha
export function pendenciasItem(x) {
  const f = [];
  if (!x.venda) f.push('valor de venda');
  if (!custoDe(x) && x.produto !== 'Taxa de Planejamento') f.push('custo');
  if (!x.fornecedor && !usaMilhas(x)) f.push('onde comprou');
  if (ehVoo(x)) {
    if (!x.localizador) f.push('localizador');
    if (!x.passageiros) f.push('passageiros');
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
  const base = `${dupla(inp(X, 'custo', i, usaMilhas(x) ? 'Custo (calculado)' : 'Custo (R$)', usaMilhas(x) && (x.milhas || x.taxas) ? custoMilhas(x) : x.custo, 'n', usaMilhas(x) && (x.milhas || x.taxas) ? 'readonly' : ''), inp(X, 'venda', i, 'Venda (R$)', x.venda, 'n'))}`;
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
      <div class="duas-col" style="grid-template-columns:1fr 1fr 1fr">${inp(X, 'milhas', i, 'Milhas', x.milhas, 'n')}${inp(X, 'milheiro', i, 'Milheiro (R$)', x.milheiro, 'n')}${inp(X, 'taxas', i, 'Taxas (R$)', x.taxas, 'n')}</div>` : ''}
      ${dupla(inp(X, 'localizador', i, 'Localizador', x.localizador, 's', 'style="text-transform:uppercase"'), inp(X, 'passageiros', i, 'Passageiros', x.passageiros ?? ctx.pax, 'n', 'inputmode="numeric"'))}
      <div class="sub" style="margin:6px 0 0">Bagagem despachada por passageiro</div>${seg('bagagem', i, [['0', 'Não tem'], ['1', '1 mala'], ['2', '2 malas'], ['3', '3 malas']], x.bagagem)}
      <div class="emchk" style="margin:4px 0 8px"><button type="button" data-print="${i}" class="${x.print ? 'ok' : ''}"><span class="cx">${x.print ? '✓' : '+'}</span><span>${x.print ? 'Print da tarifa anexado (tocar para ver)' : 'Anexar print da tarifa (obrigatório)'}</span></button>${x.print && !trava ? `<button type="button" data-printtroca="${i}" style="font-size:12px;text-decoration:underline;color:var(--tinta-2)">trocar</button>` : ''}</div>
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
    el.innerHTML = IT.length ? `<datalist id="dlFornV">${X.fornecedores().map(n => `<option value="${X.esc(n)}">`).join('')}</datalist><div class="bloco" style="margin:8px 0 4px;padding:10px 12px">${IT.map((x, i) => `<div style="${i ? 'border-top:1px solid var(--linha);padding-top:8px;margin-top:8px' : ''}"><div style="font-weight:600;font-size:13px">${X.esc(x.produto)}${x.nome ? ' · ' + X.esc(x.nome) : ''}</div>${htmlItem(X, x, i, ctx)}</div>`).join('')}<div id="reTot" style="margin-top:8px"></div></div>` : '<div class="sub">Marque pelo menos um produto.</div>';
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
    el.querySelectorAll('[data-print]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.print]; x.print ? verArquivo(X, x.print) : anexar(X, 'print', x, desenha); });
    el.querySelectorAll('[data-printtroca]').forEach(b => b.onclick = () => anexar(X, 'print', IT[+b.dataset.printtroca], desenha));
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
export function anexar(X, tipo, alvo, depois) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*,application/pdf';
  i.onchange = async () => {
    const file = i.files && i.files[0]; if (!file) return;
    if (file.size > 15 * 1024 * 1024) { X.aviso('Arquivo acima de 15 MB.'); return; }
    X.aviso('Enviando...');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${tipo}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await X.sb.storage.from('vendas').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (up.error) { X.aviso('Não enviou: ' + up.error.message + (/bucket/i.test(up.error.message) ? ' (rode o SQL do processo de cotação)' : '')); return; }
    alvo[tipo] = path; X.aviso(tipo === 'print' ? 'Print anexado. Salve o atendimento.' : 'Comprovante anexado. Salve o atendimento.'); depois();
  };
  i.click();
}

// bloco do fechamento: pagamento, link, comprovante, conferência do financeiro
export function editorFechamento(X, el, F, ctx) {
  const pixGuardado = () => { try { return localStorage.getItem('mk_pix') || ''; } catch (_) { return ''; } };
  const desenha = () => {
    const t = ctx.total();
    const cartao = F.forma === 'cartao';
    el.innerHTML = `<div class="bloco" style="margin:8px 0;padding:10px 12px">
      <div class="lin"><span>Valor total da venda</span><b>${X.brl2(t.v)}</b></div>
      <div class="sub" style="margin:8px 0 0">Forma de pagamento</div>
      <div class="seg" style="margin:6px 0 8px"><button type="button" data-fp="pix" class="${F.forma === 'pix' ? 'on' : ''}">Pix</button><button type="button" data-fp="cartao" class="${cartao ? 'on' : ''}">Cartão</button></div>
      ${cartao ? `<div class="duas-col"><label class="fl"><span>Em quantas vezes</span><input id="fParc" inputmode="numeric" value="${X.esc(F.parcelas || '')}" placeholder="10"></label><label class="fl"><span>Valor da parcela</span><input readonly value="${F.parcelas && t.v ? X.brl2(t.v / F.parcelas) : ''}"></label></div>
      <label class="fl"><span>Link de pagamento do cartão</span><input id="fLink" inputmode="url" value="${X.esc(F.link || '')}" placeholder="Cole o link gerado"></label>` : F.forma === 'pix' ? `<label class="fl"><span>Dados do Pix para o cliente</span><input id="fPix" value="${X.esc(F.pix || pixGuardado())}" placeholder="Chave Pix e nome do recebedor"></label>` : ''}
      ${F.forma ? `<button type="button" class="zap" id="fEnviar" style="width:100%;margin-top:8px">${F.enviado_em ? 'Enviar de novo ao cliente' : 'Enviar o pagamento ao cliente'}</button>${F.enviado_em ? `<div class="sub">Enviado em ${new Date(F.enviado_em).toLocaleDateString('pt-BR')}.</div>` : ''}` : ''}
      <div class="emchk" style="margin:10px 0 4px;border-top:1px solid var(--linha)"><button type="button" id="fComp" class="${F.comprovante ? 'ok' : ''}"><span class="cx">${F.comprovante ? '✓' : '+'}</span><span>${F.comprovante ? 'Comprovante anexado (tocar para ver)' : 'Anexar comprovante de pagamento'}</span></button>${F.comprovante ? '<button type="button" id="fCompT" style="font-size:12px;text-decoration:underline;color:var(--tinta-2)">trocar</button>' : ''}</div>
      <div class="sub" style="margin-top:0">${F.comprovante ? (F.conferido ? `Conferido pelo financeiro${F.conferido_por ? ' (' + X.esc(X.nomeTime(F.conferido_por) || '') + ')' : ''}.` : 'Aparece no Início dos administradores para conferir.') : 'Com o comprovante, a venda vai como paga para a planilha.'}</div>
      ${F.comprovante && X.ADMIN ? `<label class="fc" style="margin:6px 0"><input type="checkbox" id="fConf" ${F.conferido ? 'checked' : ''}><span>Conferido pelo financeiro</span></label>` : ''}
    </div>`;
    el.querySelectorAll('[data-fp]').forEach(b => b.onclick = () => { F.forma = b.dataset.fp; desenha(); });
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
      'Observações': [numCard(r), ehVoo(x) && x.tipo_trecho === 'multi' && x.trechos ? 'Multitrecho: ' + String(x.trechos).replace(/\n/g, ' | ') : '', ehVoo(x) ? `Bagagem: ${x.bagagem === '0' ? 'sem mala despachada' : x.bagagem + ' mala(s) por passageiro'}` : '', ehVoo(x) && x.pago_em === 'pagante' && x.fornecedor ? 'Comprado em ' + x.fornecedor : ''].filter(Boolean).join(' · '),
      'Forma de pagamento': F.forma === 'cartao' ? 'Cartão de crédito' : F.forma === 'pix' ? 'Pix' : '',
      'Quantas vezes': F.forma === 'cartao' && F.parcelas ? +F.parcelas : '',
      'Serviço': servicoPlanilha(x), 'Vendedor': vendedor, 'ID sistema': id
    } };
  });
  if (!linhas.length) return { ok: true, n: 0 };
  const { error } = await X.sb.from('fila_planilha').insert(linhas);
  if (error) return { ok: false, erro: error.message };
  const agora = new Date().toISOString();
  linhas.forEach(l => { IT[l.item].planilha_id = l.id; IT[l.item].enviado_em = agora; });
  return { ok: true, n: linhas.length };
}
