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

// X: { D, sb, $, esc, aviso, brl2, nomeTime, ADMIN, voltar }
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
    <button class="voltar" id="voltar">‹ Emissões</button>
    <h1 class="titulo" style="margin-top:6px">Emissão <em>B2B</em></h1>
    <div class="sub" style="margin-top:6px">Sem card e sem cotação. Vai direto para a planilha, com imposto, lucro e comissão calculados.</div>
    <form id="fB2B" class="form" autocomplete="off">
      <div class="grupo">Agência</div>
      ${inp('comprador', 'Quem comprou', 'required list="dlAgB2B" placeholder="Nome da agência ou do revendedor"')}${dl('dlAgB2B', agencias)}
      ${inp('contato', 'WhatsApp (opcional)', 'inputmode="tel"')}

      <div class="grupo">Voo</div>
      <div class="duas-col">${inp('localizador', 'Localizador', 'required style="text-transform:uppercase"')}${inp('cia', 'Companhia', 'required list="dlCiaB2B"')}</div>${dl('dlCiaB2B', cias)}
      <div class="duas-col">${inp('origem', 'Origem', 'maxlength="40" placeholder="CNF" style="text-transform:uppercase"')}${inp('destino', 'Destino', 'maxlength="40" placeholder="GRU" style="text-transform:uppercase"')}</div>
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

// ---------- cancelamento ----------
// A linha da planilha é ajustada pelo script "script-vendas-do-app" (ação "atualizar" pelo ID sistema):
// valor e custo passam a ser só o que ficou (multa recebida e taxa que não voltou) e a comissão vira R$ 2,00.
// Venda de mês já fechado: a linha original não muda. Entra uma linha de ajuste no mês atual
// (diferenças negativas de venda, custo e comissão), e o fechamento do mês antigo fica intacto.
const REF = (id) => `ref ${id}`;
const ajusteDe = (e, D) => (D.emissoes || []).find(x => x.id !== e.id && String(x.observacoes || '').includes('CANCELAMENTO') && String(x.observacoes || '').includes(REF(e.id)));
export const ehCancelada = (e, D) => /CANCELADA/.test(String((e && e.observacoes) || '')) || !!(D && e && ajusteDe(e, D));
export const ehAjuste = (e) => /CANCELAMENTO/.test(String((e && e.observacoes) || ''));

export function blocoCancelar(e, X) {
  if (!ehB2B(e)) return '';
  if (ehAjuste(e)) return `<section class="bloco" style="margin-top:12px"><h2>Ajuste de cancelamento B2B</h2><div class="sub" style="margin:0">Lançado no mês do cancelamento porque a venda original é de um mês fechado. Os valores negativos descontam a venda, o custo e a comissão.</div></section>`;
  const pode = X.ADMIN || e.vendedor_id === X.D.meuId;
  const aj = ajusteDe(e, X.D);
  if (aj) return `<section class="bloco" style="margin-top:12px"><h2>Emissão B2B cancelada</h2><div class="sub" style="margin:0">Mês fechado: o ajuste entrou em ${String(aj.data_negociacao || '').slice(0, 7).split('-').reverse().join('/')}.</div></section>`;
  if (ehCancelada(e)) return `<section class="bloco" style="margin-top:12px"><h2>Emissão B2B cancelada</h2><div class="sub" style="margin:0">Comissão de cancelamento: ${X.brl2(e.comissao)}.</div></section>`;
  if (!pode) return '';
  const pendente = (X.D.b2bCanc || {})[e.id];
  if (pendente) return `<section class="bloco" style="margin-top:12px"><h2>Cancelamento enviado</h2><div class="sub" style="margin:0">A planilha atualiza em até 5 minutos.</div></section>`;
  return `<details class="bloco" style="margin-top:12px" id="b2bCanc"><summary style="cursor:pointer;color:var(--alerta);font-weight:600">Cancelar esta emissão B2B</summary>
    <div class="sub" style="margin-top:6px">Valor e custo passam a ser só o que ficou. A comissão vira ${X.brl2(2)} fixos${pctVend(e, X) === 0 ? ' (sócio: fica R$ 0,00)' : ''}.${X.fechado ? ' <b>Esta venda é de um mês fechado: ele não muda. A diferença entra como ajuste no mês atual.</b>' : ''}</div>
    <div class="duas-col"><label class="fl"><span>A agência paga no cancelamento (R$)</span><input id="b2bCVal" inputmode="decimal" value="0"></label><label class="fl"><span>Custo que não voltou (R$)</span><input id="b2bCCus" inputmode="decimal" value="0"></label></div>
    <div class="sub" style="margin-top:2px">Ex.: taxa de embarque não reembolsada. Milhas devolvidas não contam como custo.</div>
    <label class="fl"><span>Motivo (opcional)</span><input id="b2bCMot"></label>
    <button type="button" class="sec grande" id="b2bCOk" style="width:100%;margin-top:10px;color:var(--alerta)">Confirmar cancelamento</button></details>`;
}
const pctVend = (e, X) => e.vendedor_id === X.D.meuId ? (+(X.D.perfil || {}).comissao_pct || 0) : (+((X.D.equipe || []).find(x => x.user_id === e.vendedor_id) || {}).comissao_pct || 0);

export function ligarCancelar(P, e, X, depois) {
  const b = P.querySelector('#b2bCOk'); if (!b) return;
  b.onclick = async () => {
    const val = nb(P.querySelector('#b2bCVal').value) || 0, cus = nb(P.querySelector('#b2bCCus').value) || 0;
    const mot = P.querySelector('#b2bCMot').value.trim();
    if (!confirm(`Cancelar a emissão ${e.localizador || ''} de ${e.comprador || ''}? Venda fica em ${X.brl2(val)} e custo em ${X.brl2(cus)}.`)) return;
    const d = new Date(), quando = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const comNova = pctVend(e, X) === 0 ? 0 : comissaoB2B(0, true);
    let dados;
    if (X.fechado) {
      // mês fechado não muda: linha nova no mês atual com as diferenças
      const custoOrig = r2((+e.milhas || 0) * (+e.milheiro || 0) / 1000 + (+e.taxas || 0));
      const mes = String(e.data_negociacao || '').slice(0, 7).split('-').reverse().join('/');
      dados = { 'Gestor': e.gestor || 'Maktub', 'Conta': e.conta || '', 'Email ou Produto': '', 'Cidade': MARCA, 'Cia': e.cia || '',
        'Sobrenome': e.sobrenome || '', 'Origem': e.origem || '', 'Destino': e.destino || '', 'Comprador': e.comprador || '', 'Passageiros': +e.passageiros || 1,
        'Contato': e.contato || '', 'Indicação': '', 'Localizador': String(e.localizador || '').toUpperCase(), 'Data da negociação': hojeISO(),
        'Milhas': 0, 'Milheiro': 0, 'Taxas': r2(cus - custoOrig), 'Valor a receber': r2(val - (+e.valor_receber || 0)), 'Pago': true,
        'Comissão': r2(comNova - (+e.comissao || 0)), 'Data do Voo (Ida)': '', 'Data do Voo (Volta)': '',
        'Observações': [MARCA_OBS, `CANCELAMENTO em ${quando} da venda de ${mes} (${REF(e.id)})`, mot].filter(Boolean).join(' · '),
        'Serviço': e.servico || 'Passagens (Milhas)', 'Vendedor': X.nomeTime(e.vendedor_id) || '' };
    } else {
      const obs = [e.observacoes || MARCA_OBS, `CANCELADA em ${quando}`, mot].filter(Boolean).join(' · ');
      dados = { _acao: 'atualizar', _alvo: e.id, 'Milhas': 0, 'Milheiro': 0, 'Taxas': r2(cus), 'Valor a receber': r2(val), 'Comissão': comNova, 'Observações': obs };
    }
    b.disabled = true; b.textContent = 'Enviando...';
    const nid = uuid(); if (X.fechado) dados['ID sistema'] = nid;
    const { error } = await X.sb.from('fila_planilha').insert({ id: nid, atendimento_id: null, item: 0, dados });
    if (error) { b.disabled = false; b.textContent = 'Confirmar cancelamento'; X.aviso('Não cancelou: ' + error.message); return; }
    X.D.b2bCanc = X.D.b2bCanc || {}; X.D.b2bCanc[e.id] = true;
    X.aviso('Cancelamento enviado. A planilha atualiza em até 5 minutos.'); depois();
  };
}
