// Maktub Go: "Vendas a conferir".
// A venda sobe para a planilha no Fechou só com o mínimo. O resto (comprovante conferido com o extrato, passageiros,
// CPF, nascimento, bagagem, print, companhia, carta do hotel e, nas milhas do cliente, valor pagante e taxas) é
// completado aqui, no próprio lugar. O que tem coluna na planilha atualiza a mesma linha (pelo ID sistema).
// Com tudo completo, a venda vira "Conferida", com quem e quando. Só para administradores e quem tem "Conferir vendas".

const nb = (v) => { let x = String(v ?? '').trim(); if (x.includes(',')) x = x.replace(/\./g, '').replace(',', '.'); return x === '' || isNaN(+x) ? null : +x; };
const r2 = (n) => Math.round((+n || 0) * 100) / 100;
const up = (t) => String(t || '').trim().toUpperCase();

// vendas do Comercial em "A conferir" e as antigas com comprovante ainda não conferido (a conferência de comprovante vem para cá)
export function lista(D, ehGestao) {
  const quando = (r) => String(r.conferencia_desde || r.fechado_em || (r.fech || {}).enviado_em || r.data || '');
  return (D.reunioes || []).filter(r => !ehGestao(r) && r.resultado === 'Fechou' && !r.arquivado_em
    && (r.conferencia_status === 'a_conferir' || (!r.conferencia_status && r.fech && r.fech.comprovante && !r.fech.conferido)))
    .sort((a, b) => quando(a).localeCompare(quando(b)));
}

// bloco do Início: "Vendas a conferir (N)" com as mais antigas primeiro e "ver mais" (nunca a lista inteira de uma vez)
export function htmlBloco(X, L, mostrar) {
  const { V, esc } = X, hoje = new Date(new Date().toDateString());
  const ha = (iso) => { if (!iso) return ''; const n = Math.max(0, Math.round((hoje - new Date(new Date(iso).toDateString())) / 864e5)); return n === 0 ? 'hoje' : n === 1 ? 'há 1 dia' : `há ${n} dias`; };
  const lin = (r) => {
    const f = V.faltasConferencia(r), so = f.length === 1 && f[0].k === 'comprovante';
    const dias = ha(r.conferencia_desde || r.fechado_em), velha = r.conferencia_desde && Date.now() - new Date(r.conferencia_desde) > 3 * 864e5;
    return `<button type="button" class="vc-l" data-vconf="${esc(r.id)}"><span><b>${V.numCard(r) ? esc(V.numCard(r)) + ' · ' : ''}${esc(r.cliente || 'Cliente')}</b><small>${esc([r.trecho || r.produto, dias].filter(Boolean).join(' · '))}</small></span>
      <span class="vc-n${velha ? ' alerta' : ''}">${so ? 'comprovante' : f.length ? f.length + (f.length === 1 ? ' item' : ' itens') : 'revisar'}</span></button>`;
  };
  const vis = L.slice(0, mostrar);
  return `<div class="secao">Vendas a conferir (${L.length})</div>
    ${L.length ? `<div class="vc-lista">${vis.map(lin).join('')}</div>${L.length > vis.length ? `<button type="button" class="vc-mais" id="vcMais">ver mais (${L.length - vis.length})</button>` : ''}` : '<div class="vazio">Nenhuma venda para conferir.</div>'}`;
}

// folha da conferência de uma venda. Devolve true quando salvou.
// X: ctxVenda do app + { V, nomeTime, dataBR, mesFechado(k), depoisCliente(ids), abrirCard(id) }
export function folha(X, r0) {
  const { V, esc } = X;
  const r = r0, IT = JSON.parse(JSON.stringify(r.itens || [])), F = JSON.parse(JSON.stringify(r.fech || {}));
  // como cada linha está na planilha (retrato guardado no serviço): só o que for mexido vai para a planilha
  V.garantirRetrato(X, r, IT, F);
  // quantidade de passageiros vazia: vem dos trechos (a mudança vai para a planilha ao salvar)
  V.paxPelosTrechos(IT);
  // o que aparece é decidido ao abrir (o que estava em aberto); o check de cada item muda enquanto a pessoa corrige
  const f0 = V.faltasConferencia({ itens: IT, fech: F });
  const comp = f0.some(p => p.i < 0);
  const porItem = new Map(); f0.filter(p => p.i >= 0).forEach(p => { if (!porItem.has(p.i)) porItem.set(p.i, new Set()); porItem.get(p.i).add(p.k); });
  return new Promise((fim) => {
    const el = document.createElement('div'); el.className = 'folha vc';
    el.innerHTML = '<div class="folha-fundo"></div><div class="folha-caixa" role="dialog" aria-modal="true" aria-labelledby="vcTit"></div>';
    const caixa = el.querySelector('.folha-caixa');
    let fechado = false;
    const sair = (ok) => { if (fechado) return; fechado = true; el.remove(); document.removeEventListener('keydown', tecla); fim(ok); };
    const tecla = (e) => { if (e.key === 'Escape') sair(false); };
    document.addEventListener('keydown', tecla);
    el.querySelector('.folha-fundo').onclick = () => sair(false);

    const inp = (attrs, rot, v, extra = '') => `<label class="fl"><span>${rot}</span><input ${attrs} value="${esc(v ?? '')}" ${extra}></label>`;
    const linha = (i, k, rot, corpo) => `<div class="vc-it" data-row="${i}|${k}"><div class="vc-rot"><span class="vc-ck" aria-hidden="true"></span><span>${rot}</span></div>${corpo}</div>`;
    const tit = (x) => {
      const rota = x.origem || x.destino ? ` · ${up(x.origem)} ${x.tipo_trecho === 'iv' ? '⇄' : '→'} ${up(x.destino)}` : x.nome ? ' · ' + x.nome : '';
      return (V.ehCliente(x) ? 'Milhas do cliente' : x.produto === 'Viagem completa / pacote' ? 'Outro' : x.produto) + rota + (x.localizador ? ' · ' + up(x.localizador) : '');
    };
    const htmlPax = (x, i) => V.paxAjustado(x).map((p, k) => `<div class="vc-pax"><label class="fl"><span>Passageiro ${k + 1}: nome completo</span><input data-pax="${i}|${k}|nome" value="${esc(p.nome || '')}" list="vcPax" autocomplete="off"></label>
      <div class="duas-col"><label class="fl"><span>CPF</span><input data-pax="${i}|${k}|cpf" inputmode="numeric" value="${esc(p.cpf || '')}"></label><label class="fl"><span>Nascimento</span><input data-pax="${i}|${k}|nasc" inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10" value="${esc(p.nasc ? V.isoBr(p.nasc) : (p.nasc_txt || ''))}"></label></div></div>`).join('');
    const seg = (i, k, ops, v) => `<div class="seg" style="margin:6px 0 4px">${ops.map(([val, l]) => `<button type="button" data-seg="${i}|${k}|${val}" class="${String(v ?? '') === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const anexo = (i, x, rot) => `<div class="emchk vc-anexo"><button type="button" data-print="${i}" class="${x.print ? 'ok' : ''}"><span class="cx">${x.print ? '✓' : '+'}</span><span>${x.print ? rot + ' anexado' : 'Anexar ' + rot.toLowerCase()}</span></button>${x.print ? '' : `<button type="button" data-printcola="${i}"><span class="cx">⎘</span><span>Colar print</span></button>`}</div>`;

    function htmlItem(x, i, ks) {
      const h = [];
      if (ks.has('passageiros')) h.push(linha(i, 'passageiros', 'Quantidade de passageiros', inp(`data-k="passageiros" data-it="${i}" inputmode="numeric"`, 'Passageiros', x.passageiros)));
      if (ks.has('pax') || (ks.has('passageiros') && +x.passageiros > 0)) h.push(linha(i, 'pax', 'Nome completo, CPF e nascimento de cada passageiro', htmlPax(x, i)));
      if (ks.has('bagagem')) h.push(linha(i, 'bagagem', 'Bagagem despachada por passageiro', seg(i, 'bagagem', [['0', 'Não tem'], ['1', '1 mala'], ['2', '2 malas'], ['3', '3 malas']], x.bagagem)));
      if (ks.has('cia_emissora')) h.push(linha(i, 'cia_emissora', 'Companhia', inp(`data-k="cia_emissora" data-it="${i}" autocomplete="off"`, 'Emitido na cia', x.cia_emissora)));
      if (ks.has('print')) h.push(linha(i, 'print', V.ehCliente(x) ? 'Print da emissão' : 'Print da tarifa', anexo(i, x, V.ehCliente(x) ? 'Print da emissão' : 'Print da tarifa')));
      if (ks.has('carta')) h.push(linha(i, 'carta', 'Carta de boas-vindas ao hotel', `<label class="fc" style="margin:8px 0"><input type="checkbox" data-carta="${i}" ${x.carta ? 'checked' : ''}><span>Carta de boas-vindas enviada ao hotel</span></label>`));
      if (ks.has('data_emissao')) h.push(linha(i, 'data_emissao', 'Data da emissão', inp(`data-k="data_emissao" data-it="${i}" type="date"`, 'Data da emissão', x.data_emissao)));
      if (ks.has('pagante')) h.push(linha(i, 'pagante', 'Valor pagante (base da economia no painel do cliente)', `<div class="duas-col">${inp(`data-k="pagante" data-it="${i}" inputmode="decimal"`, 'Valor pagante (R$)', x.pagante)}${inp(`data-k="rex" data-it="${i}" inputmode="decimal"`, 'Tarifa REX (R$, opcional)', x.rex)}</div>`));
      if (ks.has('taxas')) h.push(linha(i, 'taxas', 'Taxas pagas pela Maktub', inp(`data-k="taxas" data-it="${i}" inputmode="decimal"`, 'Taxas (R$)', x.taxas)));
      if (ks.has('taxas_pago_em')) h.push(linha(i, 'taxas_pago_em', 'Data em que a Maktub pagou as taxas', inp(`data-k="taxas_pago_em" data-it="${i}" type="date"`, 'Pago em', x.taxas_pago_em)));
      return h.join('');
    }
    // corrigir valor ou custo de um serviço já lançado: vai para a planilha (mês fechado: ajuste no mês atual)
    function htmlValores(x, i) {
      const milhas = V.usaMilhas(x) && !x.ct_on;
      return `<details class="vc-val"><summary>Corrigir valor ou custo</summary>
        <div class="duas-col">${inp(`data-k="venda" data-it="${i}" inputmode="decimal"`, 'Valor de venda (R$)', x.venda)}${milhas || x.ct_on ? '<div></div>' : inp(`data-k="custo" data-it="${i}" inputmode="decimal"`, 'Custo (R$)', x.custo)}</div>
        ${milhas ? `<div class="vc-3">${inp(`data-k="milhas" data-it="${i}" inputmode="numeric"`, 'Milhas', x.milhas)}${inp(`data-k="milheiro" data-it="${i}" inputmode="decimal"`, 'Milheiro (R$)', x.milheiro)}${inp(`data-k="taxas" data-it="${i}" inputmode="decimal"`, 'Taxas (R$)', x.taxas)}</div>` : ''}
        ${x.ct_on ? '<div class="sub">Custo separado por trecho: corrija no card.</div>' : ''}
        <div class="sub">Corrigir valor ou custo atualiza o app, as metas e a planilha. Venda de mês de comissão já fechado: a diferença entra como ajuste no mês atual.</div></details>`;
    }
    function desenha(msg) {
      const quem = X.nomeTime(r.responsavel_id || r.assumido_por);
      const vendidos = IT.map((x, i) => [x, i]).filter(([x]) => V.enviado(x) && !V.ehCliente(x) && !x.cancelado_em);
      caixa.innerHTML = `<div class="ac-ftit" id="vcTit">${V.numCard(r) ? esc(V.numCard(r)) + ' · ' : ''}${esc(r.cliente || 'Cliente')}</div>
        <p class="ac-fl">${[r.fechado_em ? 'Fechada em ' + X.dataBR(String(r.fechado_em).slice(0, 10)) : '', quem ? 'por ' + esc(quem) : ''].filter(Boolean).join(' ')}${r.valor_fechado ? ' · ' + X.brl2(r.valor_fechado) : ''}</p>
        <p class="ac-fl vc-dica">Corrija no próprio lugar. Os itens em aberto estão marcados; o que tiver coluna na planilha atualiza a mesma linha.</p>
        <datalist id="vcPax">${(X.D.pessoas || []).slice(0, 3000).map(p => `<option value="${esc(p.nome)}">`).join('')}</datalist>
        ${comp ? `<div class="vc-bl"><div class="vc-sec">Pagamento</div>${linha(-1, 'comprovante', 'Comprovante conferido com o extrato', `<div class="vc-bts"><button type="button" class="ac-sec" id="vcVerComp">Ver comprovante</button><label class="fc" style="margin:8px 0"><input type="checkbox" id="vcComp" ${F.conferido ? 'checked' : ''}><span>Conferido com o extrato</span></label></div>`)}</div>` : ''}
        ${[...porItem.entries()].map(([i, ks]) => `<div class="vc-bl"><div class="vc-sec">${esc(tit(IT[i]))}</div>${htmlItem(IT[i], i, ks)}</div>`).join('')}
        ${vendidos.length ? `<div class="vc-bl"><div class="vc-sec">Valores</div>${vendidos.map(([x, i]) => `${vendidos.length > 1 ? `<div class="vc-rot" style="margin-top:8px"><span>${esc(tit(x))}</span></div>` : ''}${htmlValores(x, i)}`).join('')}</div>` : ''}
        <div class="fch-msg" role="alert">${msg ? esc(msg) : ''}</div>
        <button type="button" class="ac-prim" id="vcSalvar">Salvar conferência</button>
        <button type="button" class="ac-sec" id="vcCard">Abrir o card</button>
        <button type="button" class="ac-sec" id="vcVolta">Voltar</button>`;
      liga(); marca();
    }
    // check de cada item, refeito a cada mudança (sem redesenhar: o teclado não fecha)
    function marca() {
      const L = V.faltasConferencia({ itens: IT, fech: F }), aberto = new Set(L.map(p => p.i + '|' + p.k));
      caixa.querySelectorAll('[data-row]').forEach(e => { const ok = !aberto.has(e.dataset.row); e.classList.toggle('ok', ok); const c = e.querySelector('.vc-ck'); if (c) c.textContent = ok ? '✓' : '○'; });
      const b = caixa.querySelector('#vcSalvar'); if (b) b.textContent = L.length ? 'Salvar conferência' : 'Salvar: venda conferida';
    }
    function liga() {
      caixa.querySelectorAll('input[data-it]').forEach(e => {
        const x = IT[+e.dataset.it], k = e.dataset.k;
        e.oninput = () => { x[k] = ['passageiros', 'pagante', 'rex', 'taxas', 'venda', 'custo', 'milhas', 'milheiro'].includes(k) ? nb(e.value) : e.value.trim(); marca(); };
        if (k === 'passageiros') e.onchange = () => desenha();
      });
      caixa.querySelectorAll('[data-pax]').forEach(e => {
        const [i, k, c] = e.dataset.pax.split('|'), x = IT[+i];
        e.oninput = () => { V.paxAjustado(x); const p = x.pax[+k];
          if (c === 'nasc') { const m = V.mascaraData(e.value); if (m !== e.value) e.value = m; p.nasc_txt = m; p.nasc = V.brIso(m); if (p.nasc) delete p.nasc_txt; }
          else p[c] = e.value.trim();
          marca(); };
        e.onchange = () => {
          V.paxAjustado(x); const p = x.pax[+k];
          if (c === 'cpf' && V.cpfValido(p.cpf)) { p.cpf = V.fmtCpf(p.cpf); e.value = p.cpf; }
          // nome de quem já tem ficha traz CPF e nascimento
          if (c === 'nome') { const n = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
            const f = (X.D.pessoas || []).find(o => n(o.nome) === n(p.nome));
            if (f) { p.pessoa_id = f.id; const d = (X.D.docs || []).find(o => o.pessoa_id === f.id); if (!p.cpf && d && d.cpf) p.cpf = V.fmtCpf(d.cpf); if (!p.nasc && f.nascimento) p.nasc = f.nascimento; desenha(); return; } }
          marca();
        };
      });
      caixa.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => { const [i, k, v] = b.dataset.seg.split('|'); IT[+i][k] = v; desenha(); });
      caixa.querySelectorAll('[data-carta]').forEach(c => c.onchange = () => { IT[+c.dataset.carta].carta = c.checked; marca(); });
      caixa.querySelectorAll('[data-print]').forEach(b => b.onclick = () => { const x = IT[+b.dataset.print]; return x.print ? V.verArquivo(X, x.print) : V.anexar(X, 'print', x, () => desenha()); });
      caixa.querySelectorAll('[data-printcola]').forEach(b => b.onclick = () => V.colar(X, 'print', IT[+b.dataset.printcola], () => desenha()));
      const vc = caixa.querySelector('#vcVerComp'); if (vc) vc.onclick = () => F.comprovante ? V.verArquivo(X, F.comprovante) : X.aviso('Esta venda não tem comprovante anexado.');
      const cc = caixa.querySelector('#vcComp'); if (cc) cc.onchange = () => { F.conferido = cc.checked; F.conferido_por = cc.checked ? X.meuId : null; F.conferido_em = cc.checked ? new Date().toISOString() : null; marca(); };
      caixa.querySelector('#vcVolta').onclick = () => sair(false);
      caixa.querySelector('#vcCard').onclick = () => { sair(false); X.abrirCard(r.id); };
      caixa.querySelector('#vcSalvar').onclick = salvar;
    }
    async function salvar() {
      const b = caixa.querySelector('#vcSalvar'); b.disabled = true; b.textContent = 'Salvando...';
      const erros = [], clientes = []; let nFila = 0;
      try {
        // passageiros viram (ou atualizam) fichas no CRM com CPF e nascimento
        await V.salvarPassageiros(X, IT.filter(x => V.ehVoo(x) && !x.cancelado_em));
        for (let i = 0; i < IT.length; i++) {
          const x = IT[i]; if (x.cancelado_em) continue;
          if (V.ehCliente(x)) {
            // milhas do cliente: o que mudou vai para a ficha da Gestão (economia no painel, reembolso das taxas)
            if (x.gestao_em && x.gestao_snap !== V.snapCliente(x)) { const z = await V.lancarCliente(X, r, x, null); if (!z.ok) erros.push('Gestão: ' + z.erro); else clientes.push(z.cliente_id); }
            continue;
          }
          const z = await V.atualizarNaPlanilha(X, r, IT, F, x, { fechado: X.mesFechado });
          if (!z.ok) erros.push('Planilha: ' + z.erro); else nFila += z.n;
        }
      } catch (e) { erros.push(String(e && e.message || e)); }
      if (erros.length) { b.disabled = false; desenha('Não salvou tudo: ' + erros.join(' ') + ' Tente de novo.'); return; }
      const est = V.estadoConferencia({ itens: IT, fech: F }, X.meuId), soCli = IT.filter(x => !x.cancelado_em).every(V.ehCliente);
      const tot = r2(IT.reduce((a, x) => a + V.vendaDe(x), 0));
      const upd = { itens: IT, fech: F, ...est, ...(soCli ? {} : { valor_fechado: tot || r.valor_fechado || null }), ...(r.conferencia_desde ? {} : { conferencia_desde: r.fechado_em || new Date().toISOString() }) };
      const { data, error } = await X.sb.from('atendimentos').update(upd).eq('id', r.id).select().single();
      if (error) { b.disabled = false; desenha('Não salvou: ' + X.limparTec(error.message)); return; }
      // o app pode ter recarregado a lista enquanto a folha estava aberta: atualiza o card que está nela
      Object.assign(r, data); { const k = (X.D.reunioes || []).findIndex(x => x.id === r.id); if (k >= 0 && X.D.reunioes[k] !== r) Object.assign(X.D.reunioes[k], data); }
      if (clientes.length && X.depoisCliente) await X.depoisCliente(clientes);
      const n = V.faltasConferencia({ itens: IT, fech: F }).length;
      X.aviso([est.conferencia_status === 'conferida' ? 'Venda conferida.' : 'Conferência salva. Ainda falta' + (n === 1 ? ' 1 item.' : 'm ' + n + ' itens.'), nFila ? 'A planilha atualiza em até 5 minutos.' : ''].filter(Boolean).join(' '));
      sair(true);
    }
    desenha();
    document.body.appendChild(el);
  });
}
