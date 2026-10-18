// Maktub Go: emissão B2B (agências e revendedores que compram o bilhete direto, sem card e sem cotação).
// Uma tela só: agência, voo, custo em milhas e preço. Ao salvar, vai para a fila da planilha
// (aba Maktub GO) como "Passagens (Milhas)", com "B2B" na Cidade e nas Observações.
// Comissão B2B: valor fixo em reais por emissão, pela tabela de milhas da antiga planilha B2B:
// R$ 0,50 + R$ 0,50 a cada 10 mil milhas (arredonda para cima), teto de R$ 6,50; cancelada = R$ 2,00.
// Sócios (administradores) não recebem comissão. O check-in é da agência: o app não cobra.

export const MARCA = 'B2B';
export const MARCA_OBS = 'B2B (check-in pela agência)';
export const ehB2B = (e) => !!e && (/^B2B\b/.test(String(e.observacoes || '')) || String(e.cidade || '').trim().toUpperCase() === MARCA);
export function comissaoB2B(milhas, cancelada) {
  if (cancelada) return 2;
  const m = +milhas || 0;
  if (m <= 0) return 0;
  return Math.min(0.5 + 0.5 * Math.ceil(m / 10000), 6.5);
}

const r2 = (n) => Math.round((+n || 0) * 100) / 100;
const nb = (v) => { let x = String(v ?? '').trim(); if (x.includes(',')) x = x.replace(/\./g, '').replace(',', '.'); return x === '' || isNaN(+x) ? null : +x; };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const unicos = (arr) => [...new Set(arr.map(x => String(x || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

// X: { D, sb, $, esc, aviso, brl2, nomeTime, ADMIN, voltar, rotuloVoltar }
export function tela(P, X) {
  const { D, esc } = X;
  const EM = D.emissoes || [];
  const agencias = unicos(EM.filter(ehB2B).map(e => e.comprador));
  const contas = unicos(EM.map(e => e.conta));
  const gestores = unicos(EM.map(e => e.gestor));
  const cias = unicos(['Azul', 'Gol', 'Latam', ...EM.map(e => e.cia)]);
  const socio = !!X.ADMIN;
  const S = { modo: 'milheiro', volta: true, pago: false };
  const dl = (id, L) => `<datalist id="${id}">${L.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;
  const inp = (n, rot, extra = '', tipo = 'text') => `<label class="fl"><span>${rot}</span><input name="${n}" type="${tipo}" ${tipo === 'text' && /milhas|milheiro|taxas|valor|pax/.test(n) ? 'inputmode="decimal"' : ''} ${extra}></label>`;
  P.innerHTML = `
    <button class="voltar" id="voltar">‹ ${esc(X.rotuloVoltar || 'Emissões')}</button>
    <h1 class="titulo" style="margin-top:6px">Emissão <em>B2B</em></h1>
    <div class="sub" style="margin-top:6px">Sem card e sem cotação. Vai direto para a planilha, com imposto, lucro e comissão calculados.</div>
    <form id="fB2B" class="form" autocomplete="off">
      <div class="grupo">Agência</div>
      ${inp('comprador', 'Quem comprou', 'required list="dlAgB2B" placeholder="Nome da agência ou do revendedor"')}${dl('dlAgB2B', agencias)}
      ${inp('contato', 'WhatsApp (opcional)', 'inputmode="tel"')}

      <div class="grupo">Voo</div>
      <div class="duas-col">${inp('localizador', 'Localizador', 'required style="text-transform:uppercase"')}${inp('cia', 'Companhia', 'required list="dlCiaB2B"')}</div>${dl('dlCiaB2B', cias)}
      <div class="duas-col">${inp('origem', 'Origem', 'maxlength="40" placeholder="Cidade ou código" data-aero="cod" style="text-transform:uppercase"')}${inp('destino', 'Destino', 'maxlength="40" placeholder="Cidade ou código" data-aero="cod" style="text-transform:uppercase"')}</div>
      <div class="seg" id="b2bIV"><button type="button" data-v="1" class="on">Ida e volta</button><button type="button" data-v="0">Só ida</button></div>
      <div class="duas-col">${inp('data_ida', 'Data da ida', '', 'date')}<div id="b2bBlVolta">${inp('data_volta', 'Data da volta', '', 'date')}</div></div>
      <div class="duas-col">${inp('sobrenome', 'Sobrenome do passageiro')}${inp('pax', 'Passageiros', 'value="1" inputmode="numeric"')}</div>

      <div class="grupo">Custo</div>
      <div class="duas-col">${inp('gestor', 'Gestor da conta', 'list="dlGesB2B"')}${inp('conta', 'Conta usada', 'list="dlContaB2B"')}</div>${dl('dlGesB2B', gestores)}${dl('dlContaB2B', contas)}
      <div class="duas-col" style="grid-template-columns:1fr 1fr 1fr">${inp('milhas', 'Milhas', 'required')}${inp('milheiro', 'Milheiro (R$)', 'required')}${inp('taxas', 'Taxas (R$)')}</div>

      <div class="grupo">Preço para a agência</div>
      <div class="seg" id="b2bModo"><button type="button" data-m="milheiro" class="on">Milheiro vendido</button><button type="button" data-m="valor">Valor fechado</button></div>
      <div id="b2bBlMil">${inp('milheiro_venda', 'Milheiro vendido (R$)', 'placeholder="17,00"')}<div class="sub" style="margin-top:2px">Valor = milhas × milheiro vendido ÷ 1.000 + taxas.</div></div>
      <div id="b2bBlVal" hidden>${inp('valor', 'Valor total do bilhete (R$)')}</div>
      <label class="fc" style="margin:12px 0 4px"><input type="checkbox" name="pago"><span>A agência já pagou</span></label>
      <label class="fl"><span>Observações (opcional)</span><textarea name="obs" rows="2"></textarea></label>
      <div class="resumo" id="b2bRes"></div>
      <button class="zap grande" type="submit" id="b2bSalvar" style="width:100%;margin-top:12px">Lançar emissão B2B</button>
      <div class="sub" id="b2bMsg" style="margin-top:8px"></div>
    </form>`;
  const f = P.querySelector('#fB2B'), $ = (s) => P.querySelector(s);
  const g = (n) => (f.elements[n].value || '').trim();
  const calc = () => {
    const milhas = nb(g('milhas')) || 0, mil = nb(g('milheiro')) || 0, taxas = nb(g('taxas')) || 0;
    const custo = r2(milhas * mil / 1000 + taxas);
    let valor, milVenda;
    if (S.modo === 'milheiro') { milVenda = nb(g('milheiro_venda')); valor = milVenda != null ? r2(milhas * milVenda / 1000 + taxas) : 0; }
    else { valor = r2(nb(g('valor')) || 0); milVenda = milhas ? r2((valor - taxas) * 1000 / milhas) : null; }
    const imp = Number((D.cfg && D.cfg.imposto_pct) ?? 6) / 100;
    const bruto = r2(valor - custo), imposto = r2(Math.max(bruto, 0) * imp);
    const comissao = socio ? 0 : comissaoB2B(milhas);
    return { milhas, mil, taxas, custo, valor, milVenda, bruto, imposto, comissao, liquido: r2(bruto - imposto - comissao) };
  };
  const resumo = () => {
    const c = calc();
    $('#b2bRes').innerHTML = !c.milhas && !c.valor ? '' : `
      <div class="lin"><span>Custo</span><span>${X.brl2(c.custo)}</span></div>
      <div class="lin"><span>Valor para a agência</span><span>${X.brl2(c.valor)}${S.modo === 'valor' && c.milVenda ? ` <small>(milheiro ${X.brl2(c.milVenda)})</small>` : ''}</span></div>
      <div class="lin"><span>Lucro bruto</span><span>${X.brl2(c.bruto)}</span></div>
      <div class="lin"><span>Imposto</span><span>− ${X.brl2(c.imposto)}</span></div>
      <div class="lin"><span>Comissão B2B${socio ? ' (sócio)' : ''}</span><span>− ${X.brl2(c.comissao)}</span></div>
      ${X.ADMIN ? `<div class="lin forte"><span>Lucro líquido</span><span>${X.brl2(c.liquido)}</span></div>` : `<div class="lin forte"><span>Sua comissão</span><span>${X.brl2(c.comissao)}</span></div>`}
      ${c.valor && c.bruto < 0 ? '<div class="sub" style="color:var(--alerta)">Atenção: o valor está abaixo do custo.</div>' : ''}`;
  };
  f.oninput = resumo; resumo();
  $('#b2bModo').onclick = (ev) => { const b = ev.target.closest('button'); if (!b) return; S.modo = b.dataset.m; $('#b2bModo').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('#b2bBlMil').hidden = S.modo !== 'milheiro'; $('#b2bBlVal').hidden = S.modo !== 'valor'; resumo(); };
  $('#b2bIV').onclick = (ev) => { const b = ev.target.closest('button'); if (!b) return; S.volta = b.dataset.v === '1'; $('#b2bIV').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('#b2bBlVolta').hidden = !S.volta; if (!S.volta) f.elements.data_volta.value = ''; };
  // agência já usada: puxa o WhatsApp da última emissão dela
  f.elements.comprador.addEventListener('change', () => {
    const ult = EM.filter(ehB2B).find(e => String(e.comprador || '').trim().toLowerCase() === g('comprador').toLowerCase());
    if (ult && !g('contato') && ult.contato) f.elements.contato.value = ult.contato;
  });
  $('#voltar').onclick = () => X.voltar();
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const c = calc(), falta = [];
    if (!g('comprador')) falta.push('quem comprou');
    if (!g('localizador')) falta.push('localizador');
    if (!g('cia')) falta.push('companhia');
    if (!c.milhas) falta.push('milhas');
    if (!c.mil) falta.push('milheiro de custo');
    if (!c.valor) falta.push(S.modo === 'milheiro' ? 'milheiro vendido' : 'valor do bilhete');
    if (falta.length) { $('#b2bMsg').innerHTML = '<b style="color:var(--alerta)">Falta:</b> ' + falta.join(', '); return; }
    if (c.bruto < 0 && !confirm(`O valor (${X.brl2(c.valor)}) está abaixo do custo (${X.brl2(c.custo)}). Lançar mesmo assim?`)) return;
    const id = uuid();
    const obs = [MARCA_OBS, S.modo === 'milheiro' ? `milheiro vendido ${X.brl2(c.milVenda)}` : '', g('obs')].filter(Boolean).join(' · ');
    const dados = {
      'Gestor': g('gestor') || 'Maktub', 'Conta': g('conta'), 'Email ou Produto': '', 'Cidade': MARCA,
      'Cia': g('cia'), 'Sobrenome': g('sobrenome'), 'CPF (NF)': '', 'Origem': g('origem').toUpperCase(), 'Destino': g('destino').toUpperCase(),
      'Comprador': g('comprador'), 'Passageiros': parseInt(g('pax'), 10) || 1, 'Contato': g('contato'), 'Indicação': '',
      'Localizador': g('localizador').toUpperCase(), 'Data da negociação': hojeISO(),
      'Milhas': c.milhas, 'Milheiro': c.mil, 'Taxas': c.taxas, 'Valor a receber': c.valor, 'Pago': !!f.elements.pago.checked,
      'Comissão': c.comissao,
      'Data do Voo (Ida)': g('data_ida'), 'Data do Voo (Volta)': S.volta ? g('data_volta') : '',
      'Observações': obs, 'Serviço': 'Passagens (Milhas)', 'Vendedor': X.nomeTime(D.meuId) || '', 'ID sistema': id
    };
    $('#b2bSalvar').disabled = true; $('#b2bMsg').textContent = 'Lançando...';
    const { error } = await X.sb.from('fila_planilha').insert({ id, atendimento_id: null, item: 0, dados });
    $('#b2bSalvar').disabled = false;
    if (error) { $('#b2bMsg').textContent = 'Não lançou: ' + error.message + (/null value|not-null|atendimento_id|item/.test(error.message) ? ' (falta rodar o SQL da emissão B2B no Supabase)' : ''); return; }
    X.aviso(`Emissão B2B lançada. Vai para a planilha em até 5 minutos.${socio ? '' : ` Comissão: ${X.brl2(c.comissao)}.`}`);
    X.voltar();
  };
}

// ---------- cancelamento (qualquer emissão: B2C e B2B) ----------
// Mês aberto: a própria linha da planilha é ajustada pelo script "script-vendas-do-app" (ação "atualizar"
// pelo ID sistema). Valor e custo passam a ser só o que ficou (multa recebida e custo que não voltou).
// Comissão: B2B vira R$ 2,00 fixos (sócio R$ 0); B2C recalcula pelo percentual da venda sobre o que ficou.
// Mês fechado: a linha original não muda. Entra uma linha de ajuste no mês atual com as diferenças
// (venda, custo, comissão e parceiro), e o fechamento do mês antigo fica intacto.
const REF = (id) => `ref ${id}`;
const ajusteDe = (e, D) => (D.emissoes || []).find(x => x.id !== e.id && String(x.observacoes || '').includes('CANCELAMENTO') && String(x.observacoes || '').includes(REF(e.id)));
export const ehCancelada = (e, D) => /CANCELADA/.test(String((e && e.observacoes) || '')) || !!(D && e && ajusteDe(e, D));
export const ehAjuste = (e) => /CANCELAMENTO|AJUSTE ESTORNO/.test(String((e && e.observacoes) || ''));
const pctVend = (e, X) => e.vendedor_id === X.D.meuId ? (+(X.D.perfil || {}).comissao_pct || 0) : (+((X.D.equipe || []).find(x => x.user_id === e.vendedor_id) || {}).comissao_pct || 0);
const custoDe = (e) => r2((+e.milhas || 0) * (+e.milheiro || 0) / 1000 + (+e.taxas || 0));

// comissão e parceiro depois do cancelamento, sobre o que ficou
function novosValores(e, X, val, cus) {
  if (ehB2B(e)) return { com: pctVend(e, X) === 0 ? 0 : comissaoB2B(0, true), rep: 0 };
  const t = Number((X.D.cfg && X.D.cfg.imposto_pct) ?? 6) / 100, m = val - cus, imp = Math.max(m, 0) * t;
  const com = r2(Math.max(m - imp, 0) * (+e.comissao_pct || 0) / 100);
  const rep = r2(Math.max(m - imp - com, 0) * (+e.parceiro_pct || 0) / 100);
  return { com, rep };
}

export function blocoCancelar(e, X) {
  const tipo = ehB2B(e) ? 'B2B' : '';
  const sec = (t, txt) => `<section class="bloco" style="margin-top:12px"><h2>${t}</h2><div class="sub" style="margin:0">${txt}</div></section>`;
  if (ehAjuste(e)) return /AJUSTE ESTORNO/.test(e.observacoes || '') ? sec('Ajuste de estorno (no-show)', 'Lançado no mês do estorno porque a venda original é de um mês fechado. O custo negativo é o valor que a companhia devolveu.') : sec('Ajuste de cancelamento', 'Lançado no mês do cancelamento porque a venda original é de um mês fechado. Os valores negativos descontam a venda, o custo e a comissão.');
  const aj = ajusteDe(e, X.D);
  if (aj) return sec(`Emissão ${tipo} cancelada`.replace('  ', ' '), `Mês fechado: o ajuste entrou em ${String(aj.data_negociacao || '').slice(0, 7).split('-').reverse().join('/')}.`);
  if (ehCancelada(e)) return sec(`Emissão ${tipo} cancelada`.replace('  ', ' '), `Comissão depois do cancelamento: ${X.brl2(e.comissao)}.`);
  if (!(X.ADMIN || e.vendedor_id === X.D.meuId)) return '';
  if ((X.D.cancPend || {})[e.id]) return sec(X.D.cancPend[e.id] === 'est' ? 'Estorno enviado' : 'Cancelamento enviado', 'A planilha atualiza em até 5 minutos.');
  const est = blocoEstorno(e, X);
  const regra = tipo ? `A comissão vira ${X.brl2(2)} fixos${pctVend(e, X) === 0 ? ' (sócio: fica R$ 0,00)' : ''}.` : X.fechado ? 'Comissão: a 1ª metade, já paga, fica com o vendedor; a 2ª metade (do voado) é cancelada.' : 'A comissão é recalculada pelo percentual da venda sobre o que ficou.';
  const quem = tipo ? 'A agência paga' : 'O cliente paga';
  return `<details class="bloco" style="margin-top:12px" id="cancEm"><summary style="cursor:pointer;color:var(--alerta);font-weight:600">Cancelar esta emissão</summary>
    <div class="sub" style="margin-top:6px">A venda passa a ser só o que o cancelamento rendeu. ${regra}${X.fechado ? ' <b>Esta venda é de um mês fechado: ele não muda. A diferença entra como ajuste no mês atual.</b>' : ''}</div>
    <div class="seg" id="cancTipo"><button type="button" data-t="sem" class="on">Sem custo (até 24 h)</button><button type="button" data-t="com">Com custo</button></div>
    <div id="cancCom" hidden>
      <label class="fl"><span>Custo do cancelamento na companhia (R$)</span><input id="cancCus" inputmode="decimal" value="0"></label>
      <div class="sub" style="margin-top:2px">Multa, taxa para devolver as milhas ou parte da tarifa que não volta. Varia pela companhia e pelo acordo.</div>
      <label class="fl"><span>${quem} pelo cancelamento (R$)</span><input id="cancVal" inputmode="decimal" value="0"></label>
      <div class="sub" style="margin-top:2px">O que a Maktub cobra. Pode ser maior que o custo: a diferença é lucro do cancelamento.</div>
    </div>
    <div class="resumo" id="cancRes"></div>
    <label class="fl"><span>Motivo</span><input id="cancMot" placeholder="Ex.: passageiro desistiu, mudança de data"></label>
    <button type="button" class="sec grande" id="cancOk" style="width:100%;margin-top:10px;color:var(--alerta)">Confirmar cancelamento</button></details>${est}`;
}

// ---------- no-show / estorno de taxas ----------
// A venda continua (o passageiro não voou, mas não é cancelamento). A cia devolve parte do custo (ex.: taxa de embarque).
// Fica com a Maktub: o custo cai e o lucro sobe. Devolvido ao cliente: custo e venda caem juntos.
// Mês aberto: ajusta a própria linha. Mês fechado: linha de ajuste no mês atual, como no cancelamento.
export const ehEstorno = (e) => /ESTORNO/.test(String((e && e.observacoes) || ''));
function blocoEstorno(e, X) {
  if (ehAjuste(e)) return '';
  return `<details class="bloco" style="margin-top:8px" id="estEm"><summary style="cursor:pointer;color:var(--verde);font-weight:600">No-show: registrar estorno recebido</summary>
    <div class="sub" style="margin-top:6px">Para quando o passageiro não voou e a companhia devolveu parte do custo, como a taxa de embarque. A venda continua.${X.fechado ? ' <b>Mês fechado: a diferença entra como ajuste no mês atual.</b>' : ''}</div>
    <label class="fl"><span>Valor estornado pela companhia (R$)</span><input id="estVal" inputmode="decimal"></label>
    <div class="seg" id="estDest"><button type="button" data-d="maktub" class="on">Fica com a Maktub</button><button type="button" data-d="cliente">Devolvido ao ${ehB2B(e) ? 'comprador' : 'cliente'}</button></div>
    <label class="fl"><span>Observação (opcional)</span><input id="estObs" placeholder="Ex.: no-show no trecho de volta"></label>
    <button type="button" class="sec grande" id="estOk" style="width:100%;margin-top:10px">Registrar estorno</button></details>`;
}
function ligarEstorno(P, e, X, depois) {
  const b = P.querySelector('#estOk'); if (!b) return;
  let dest = 'maktub';
  P.querySelector('#estDest').onclick = (ev) => { const x = ev.target.closest('button'); if (!x) return; dest = x.dataset.d; P.querySelectorAll('#estDest button').forEach(y => y.classList.toggle('on', y === x)); };
  b.onclick = async () => {
    const est = nb(P.querySelector('#estVal').value) || 0;
    if (est <= 0) { X.aviso('Informe o valor estornado.'); return; }
    if (est > custoDe(e) + 0.009) { X.aviso(`O estorno (${X.brl2(est)}) passa do custo da emissão (${X.brl2(custoDe(e))}).`); return; }
    const devolve = dest === 'cliente' ? est : 0;
    const val = r2((+e.valor_receber || 0) - devolve), cus = r2(custoDe(e) - est);
    if (!confirm(`Registrar estorno de ${X.brl2(est)} (${dest === 'cliente' ? 'devolvido' : 'fica com a Maktub'})? Custo passa para ${X.brl2(cus)} e venda para ${X.brl2(val)}.`)) return;
    const d = new Date(), quando = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const nota = `ESTORNO no-show em ${quando}: ${X.brl2(est)} ${dest === 'cliente' ? 'devolvido' : 'fica com a Maktub'}`;
    const obsx = P.querySelector('#estObs').value.trim(), b2b = ehB2B(e);
    // comissão: B2B não muda; B2C recalcula pelo percentual sobre o novo lucro
    const nv = b2b ? { com: +e.comissao || 0, rep: +e.repasse || 0 } : novosValores(e, X, val, cus);
    let dados;
    if (X.fechado) {
      const mes = String(e.data_negociacao || '').slice(0, 7).split('-').reverse().join('/');
      dados = { 'Gestor': e.gestor || 'Maktub', 'Conta': e.conta || e.fornecedor || '', 'Email ou Produto': e.produto || '', 'Cidade': b2b ? MARCA : (e.destino || ''), 'Cia': e.cia || '',
        'Sobrenome': e.sobrenome || '', 'CPF (NF)': e.cpf_nf || '', 'Origem': e.origem || '', 'Destino': e.destino || '', 'Comprador': e.comprador || '', 'Passageiros': +e.passageiros || 1,
        'Contato': e.contato || '', 'Indicação': '', 'Localizador': String(e.localizador || '').toUpperCase(), 'Data da negociação': hojeISO(),
        'Milhas': 0, 'Milheiro': 0, 'Taxas': r2(-est), 'Valor a receber': r2(-devolve), 'Pago': true,
        'Comissão': r2(nv.com - (+e.comissao || 0)), 'Data do Voo (Ida)': '', 'Data do Voo (Volta)': '',
        'Observações': [b2b ? MARCA_OBS : '', `AJUSTE ${nota} da venda de ${mes} (${REF(e.id)})`, obsx].filter(Boolean).join(' · '),
        'Serviço': e.servico || 'Passagens (Milhas)', 'Vendedor': X.nomeTime(e.vendedor_id) || '' };
      if (+e.repasse) dados['Repasse do parceiro'] = r2(nv.rep - (+e.repasse || 0));
    } else {
      dados = { _acao: 'atualizar', _alvo: e.id, 'Taxas': r2((+e.taxas || 0) - est), 'Valor a receber': val,
        'Observações': [e.observacoes || (b2b ? MARCA_OBS : ''), nota, obsx].filter(Boolean).join(' · ') };
    }
    b.disabled = true; b.textContent = 'Enviando...';
    const nid = uuid(); if (X.fechado) dados['ID sistema'] = nid;
    const { error } = await X.sb.from('fila_planilha').insert({ id: nid, atendimento_id: null, item: 0, dados });
    if (error) { b.disabled = false; b.textContent = 'Registrar estorno'; X.aviso('Não registrou: ' + error.message); return; }
    X.D.cancPend = X.D.cancPend || {}; X.D.cancPend[e.id] = 'est';
    X.aviso('Estorno registrado. A planilha atualiza em até 5 minutos.'); depois();
  };
}

// cancelamento ou estorno já enviado e ainda não sincronizado com a planilha (vale em qualquer aparelho):
// some o botão para não mandar duas vezes
async function jaEnviado(X, e) {
  try {
    // só o que entrou na fila nos últimos 20 minutos (a planilha sincroniza em até 5)
    const desde = new Date(Date.now() - 20 * 6e4).toISOString();
    const [a, b] = await Promise.all([
      X.sb.from('fila_planilha').select('id,dados').eq('dados->>_alvo', String(e.id)).gte('created_at', desde).limit(5),
      X.sb.from('fila_planilha').select('id,dados').ilike('dados->>Observações', `%${REF(e.id)}%`).gte('created_at', desde).limit(5)]);
    const L = [...(a.data || []), ...(b.data || [])].map(r => String((r.dados || {})['Observações'] || ''));
    return L.some(o => /CANCELAD|CANCELAMENTO/.test(o)) ? 'canc' : L.some(o => /ESTORNO/.test(o)) ? 'est' : null;
  } catch (_) { return null; }
}
export function ligarCancelar(P, e, X, depois) {
  if (!ehAjuste(e) && !ehCancelada(e, X.D) && !(X.D.cancPend || {})[e.id]) jaEnviado(X, e).then(k => {
    if (!k) return; X.D.cancPend = X.D.cancPend || {}; X.D.cancPend[e.id] = k;
    const c = P.querySelector('#cancEm'), es = P.querySelector('#estEm');
    const aviso = `<section class="bloco" style="margin-top:12px"><h2>${k === 'canc' ? 'Cancelamento enviado' : 'Estorno enviado'}</h2><div class="sub" style="margin:0">A planilha atualiza em até 5 minutos.</div></section>`;
    if (c) { c.insertAdjacentHTML('beforebegin', aviso); c.remove(); if (es) es.remove(); } else if (es) { es.insertAdjacentHTML('beforebegin', aviso); es.remove(); }
  });
  ligarEstorno(P, e, X, depois);
  const b = P.querySelector('#cancOk'); if (!b) return;
  let comCusto = false;
  const ler = () => comCusto ? { val: nb(P.querySelector('#cancVal').value) || 0, cus: nb(P.querySelector('#cancCus').value) || 0 } : { val: 0, cus: 0 };
  const resumo = () => {
    const { val, cus } = ler(), nv = novosValores(e, X, val, cus), res = r2(val - cus);
    P.querySelector('#cancRes').innerHTML = `<div class="lin"><span>Recebe pelo cancelamento</span><span>${X.brl2(val)}</span></div>
      <div class="lin"><span>Paga à companhia</span><span>− ${X.brl2(cus)}</span></div>
      <div class="lin forte"><span>${res >= 0 ? 'Lucro' : 'Prejuízo'} do cancelamento</span><span style="${res < 0 ? 'color:var(--alerta)' : ''}">${X.brl2(res)}</span></div>
      <div class="lin"><span>Comissão depois do cancelamento</span><span>${X.brl2(X.fechado && !ehB2B(e) ? r2(nv.com + r2((+e.comissao || 0) / 2)) : nv.com)}</span></div>`;
  };
  P.querySelector('#cancTipo').onclick = (ev) => { const x = ev.target.closest('button'); if (!x) return; comCusto = x.dataset.t === 'com'; P.querySelectorAll('#cancTipo button').forEach(y => y.classList.toggle('on', y === x)); P.querySelector('#cancCom').hidden = !comCusto; resumo(); };
  P.querySelector('#cancCom').oninput = resumo; resumo();
  b.onclick = async () => {
    const { val, cus } = ler();
    const mot = P.querySelector('#cancMot').value.trim();
    if (!mot) { X.aviso('Informe o motivo do cancelamento.'); P.querySelector('#cancMot').focus(); return; }
    if (!confirm(`Cancelar a emissão ${e.localizador || ''} de ${e.comprador || ''}? Venda fica em ${X.brl2(val)} e custo em ${X.brl2(cus)}.`)) return;
    const d = new Date(), quando = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const nv = novosValores(e, X, val, cus), b2b = ehB2B(e);
    const det = comCusto ? `custo na cia ${X.brl2(cus)}, cobrado ${X.brl2(val)}, resultado ${X.brl2(val - cus)}` : 'sem custo';
    let dados;
    if (X.fechado) {
      // mês fechado não muda: linha nova no mês atual com as diferenças
      const mes = String(e.data_negociacao || '').slice(0, 7).split('-').reverse().join('/');
      dados = { 'Gestor': e.gestor || 'Maktub', 'Conta': e.conta || e.fornecedor || '', 'Email ou Produto': e.produto || '', 'Cidade': b2b ? MARCA : (e.destino || ''), 'Cia': e.cia || '',
        'Sobrenome': e.sobrenome || '', 'CPF (NF)': e.cpf_nf || '', 'Origem': e.origem || '', 'Destino': e.destino || '', 'Comprador': e.comprador || '', 'Passageiros': +e.passageiros || 1,
        'Contato': e.contato || '', 'Indicação': '', 'Localizador': String(e.localizador || '').toUpperCase(), 'Data da negociação': hojeISO(),
        'Milhas': 0, 'Milheiro': 0, 'Taxas': r2(cus - custoDe(e)), 'Valor a receber': r2(val - (+e.valor_receber || 0)), 'Pago': true,
        // B2C: a 1ª metade já paga fica; sai só a 2ª metade (do voado), e entra a comissão sobre o que o cancelamento rendeu
        'Comissão': r2(nv.com - (b2b ? (+e.comissao || 0) : (+e.comissao || 0) - r2((+e.comissao || 0) / 2))), 'Data do Voo (Ida)': '', 'Data do Voo (Volta)': '',
        'Observações': [b2b ? MARCA_OBS : '', `CANCELAMENTO em ${quando} da venda de ${mes} (${REF(e.id)}), ${det}`, mot].filter(Boolean).join(' · '),
        'Serviço': e.servico || 'Passagens (Milhas)', 'Vendedor': X.nomeTime(e.vendedor_id) || '' };
      if (+e.repasse) dados['Repasse do parceiro'] = r2(nv.rep - (+e.repasse || 0));
    } else {
      const obs = [e.observacoes || (b2b ? MARCA_OBS : ''), `CANCELADA em ${quando}, ${det}`, mot].filter(Boolean).join(' · ');
      dados = { _acao: 'atualizar', _alvo: e.id, 'Milhas': 0, 'Milheiro': 0, 'Taxas': r2(cus), 'Valor a receber': r2(val), 'Observações': obs };
      if (b2b) dados['Comissão'] = nv.com; // B2C: a comissão continua pelo percentual e se recalcula sozinha
    }
    b.disabled = true; b.textContent = 'Enviando...';
    const nid = uuid(); if (X.fechado) dados['ID sistema'] = nid;
    const { error } = await X.sb.from('fila_planilha').insert({ id: nid, atendimento_id: null, item: 0, dados });
    if (error) { b.disabled = false; b.textContent = 'Confirmar cancelamento'; X.aviso('Não cancelou: ' + error.message + (/null value|not-null/.test(error.message) ? ' (falta rodar o SQL da emissão B2B no Supabase)' : '')); return; }
    X.D.cancPend = X.D.cancPend || {}; X.D.cancPend[e.id] = 'canc';
    X.aviso('Cancelamento enviado. A planilha atualiza em até 5 minutos.'); depois();
  };
}
