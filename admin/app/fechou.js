// Maktub Go: tela curta do Fechou.
// Ao fechar uma venda, o app confere o mínimo (valor e custo de cada serviço, forma de pagamento, comprovante,
// onde comprou ou gestor/conta das milhas, localizador e data e horário de saída de todos os voos).
// Se faltar algo, abre esta folha só com os campos que faltam, já preenchidos com o que veio da cotação.
// O resto (passageiros, CPF, nascimento, bagagem, print, companhia) não aparece aqui: vira "Vendas a conferir".
// A folha não grava nada: devolve true quando o mínimo está completo e quem chamou lança a venda.

const nb = (v) => { let x = String(v ?? '').trim(); if (x.includes(',')) x = x.replace(/\./g, '').replace(',', '.'); return x === '' || isNaN(+x) ? null : +x; };
const r2 = (n) => Math.round((+n || 0) * 100) / 100;
const up = (t) => String(t || '').trim().toUpperCase();

// X: { esc, brl2, aviso, fornecedores(), V (venda.js), COT (cotador.js) }
// o: { card, IT, F, cot: { dados, k } | null }
export function folhaFechar(X, o) {
  const { V, esc } = X, { IT, F } = o, card = o.card || {};
  return new Promise((fim) => {
    // os campos que faltam são decididos uma vez, ao abrir: nada some nem aparece enquanto a pessoa digita
    const faltas = V.faltasMinimo({ itens: IT, fech: F });
    const pag = new Set(faltas.filter(p => p.i < 0).map(p => p.k));
    // chave: o próprio serviço (ligar "ida e volta com fornecedores diferentes" muda a posição dos serviços na lista)
    const porItem = new Map(); faltas.filter(p => p.i >= 0).forEach(p => { const x = IT[p.i]; if (!porItem.has(x)) porItem.set(x, new Set()); porItem.get(x).add(p.k); });
    // forma de pagamento escolhida aqui: as parcelas e os valores dela entram junto
    const pedeForma = pag.has('forma');
    // custo de voo: quem escolhe "milhas" ou "pagante" aqui vê os campos do jeito escolhido
    // (só quando a forma ainda não foi escolhida no card; escolhida, aparece só o campo que falta)
    porItem.forEach((ks, x) => { if ((ks.has('custo') || ks.has('milhas')) && V.ehVoo(x) && !V.ehCliente(x) && !x.pago_em) ks.add('pago_em'); if (ks.has('fornecedor') || ks.has('gestor') || ks.has('pago_em')) ks.add('onde'); });

    // ida e volta com fornecedores diferentes: cada bloco mostra companhia, forma de compra, custo, fornecedor, localizador e voo
    const KS_BLOCO = ['cia', 'compra', 'custo', 'onde', 'localizador', 'voos'];
    const marcarBlocos = (g) => V.blocosDe(IT, g).forEach(y => { const ks = porItem.get(y) || new Set(); ks.delete('venda'); KS_BLOCO.forEach(k => ks.add(k)); porItem.set(y, ks); });
    IT.forEach(x => { if (x.grupo && porItem.has(x)) marcarBlocos(x.grupo); });
    const podeDividir = (x) => V.ehVoo(x) && !V.ehCliente(x) && !x.grupo && !V.enviado(x) && !x.cancelado_em && (x.tipo_trecho || 'iv') !== 'ida';
    // a parte de cada bloco segue o valor da passagem (dividido pelo custo de cada um)
    const sincGrupos = () => [...new Set(IT.filter(x => x.grupo).map(x => x.grupo))].forEach(g => { const B = V.blocosDe(IT, g); if (!+B[0].grupo_venda) { const t = r2(B.reduce((a, y) => a + (+y.venda || 0), 0)); B.forEach(y => { y.grupo_venda = t || null; }); } V.ratearGrupo(IT, g); });

    const el = document.createElement('div'); el.className = 'folha fch';
    el.innerHTML = '<div class="folha-fundo"></div><div class="folha-caixa" role="dialog" aria-modal="true" aria-labelledby="fchTit"></div>';
    const caixa = el.querySelector('.folha-caixa');
    let fechado = false;
    const sair = (ok) => { if (fechado) return; fechado = true; IT.forEach(x => { if (!ok && x._sugOk) x.custo = null; delete x._sugOk; }); el.remove(); document.removeEventListener('keydown', esc_); fim(ok); };
    const esc_ = (e) => { if (e.key === 'Escape') sair(false); };
    document.addEventListener('keydown', esc_);
    el.querySelector('.folha-fundo').onclick = () => sair(false);

    // valor da venda pela cotação na forma escolhida (no cartão o cliente paga o total da maquininha; a venda é o líquido)
    const alvo = (forma, n) => o.cot && X.COT ? X.COT.valorDaOpcao(o.cot.dados, o.cot.k, forma, n) : null;
    const taxa = (n) => X.COT && n ? +X.COT.taxaCartao(n) || 0 : 0;
    const livres = () => IT.filter(x => !V.enviado(x) && !V.ehCliente(x) && !x.cancelado_em);
    const totalVenda = () => r2(livres().reduce((a, x) => a + (+x.venda || 0), 0));
    const aplicarTotal = (v) => {
      const L = livres(); if (!v || !L.length) return;
      const soma = L.reduce((a, x) => a + (+x.venda || 0), 0); let resto = v;
      L.forEach((x, k) => { const nv = k === L.length - 1 ? r2(resto) : r2((soma ? (+x.venda || 0) / soma : 1 / L.length) * v); resto -= nv; x.venda = nv; });
      // blocos de um grupo: o valor da passagem é a soma das partes, e as partes voltam a seguir o custo de cada um
      [...new Set(L.filter(x => x.grupo).map(x => x.grupo))].forEach(g => { const B = V.blocosDe(IT, g), t = r2(B.reduce((a, y) => a + (+y.venda || 0), 0)); B.forEach(y => { y.grupo_venda = t || null; }); V.ratearGrupo(IT, g); });
    };
    const ajustaPag = () => {
      const n = +F.parcelas || 0;
      if (F.forma === 'cartao') { F.taxa_pct = taxa(n); if (!F.bruto_manual) F.bruto = alvo('cartao', n) || F.bruto || null; if (+F.bruto) aplicarTotal(r2(+F.bruto * (100 - (+F.taxa_pct || 0)) / 100)); }
      else if (F.forma === 'pix') { F.bruto = null; F.bruto_manual = false; F.taxa_pct = 0; aplicarTotal(alvo('pix', 0)); }
      else if (F.forma === 'pix_cartao') {
        const tx = taxa(n), l = +F.cartao_liq || 0, p = +F.pix_valor || 0;
        F.taxa_pct = tx; F.bruto = l && tx < 100 ? r2(l / (1 - tx / 100)) : null; F.bruto_manual = false;
        if (p + l > 0) aplicarTotal(r2(p + l));
      }
    };

    const inp = (attrs, rot, v, extra = '') => `<label class="fl"><span>${rot}</span><input ${attrs} value="${esc(v ?? '')}" ${extra}></label>`;
    const seg = (attr, ops, v) => `<div class="seg" style="margin:6px 0 8px">${ops.map(([val, l]) => `<button type="button" ${attr}="${val}" class="${String(v ?? '') === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const titItem = (x) => {
      if (V.ehCliente(x)) return 'Milhas do cliente da Gestão' + (x.origem || x.destino ? ` · ${up(x.origem)} → ${up(x.destino)}` : '');
      const rota = x.origem || x.destino ? ` · ${up(x.origem)} ${x.tipo_trecho === 'iv' ? '⇄' : '→'} ${up(x.destino)}` : x.nome ? ' · ' + x.nome : '';
      return (x.produto === 'Viagem completa / pacote' ? 'Outro' : x.produto) + rota;
    };

    function htmlPag() {
      if (!pag.size) return '';
      const cartao = F.forma === 'cartao', misto = F.forma === 'pix_cartao';
      const verParc = pag.has('parcelas') || (pedeForma && (cartao || misto));
      const verMisto = pag.has('pix_valor') || pag.has('cartao_liq') || (pedeForma && misto);
      return `<div class="fch-bl"><div class="fch-sec">Pagamento</div>
        ${pedeForma ? seg('data-fp', [['pix', 'Pix'], ['cartao', 'Cartão'], ['pix_cartao', 'Pix + Cartão']], F.forma) : ''}
        ${verMisto ? `<div class="duas-col">${inp('data-f="pix_valor" inputmode="decimal" placeholder="0,00"', 'Recebido no Pix (R$)', F.pix_valor)}${inp('data-f="cartao_liq" inputmode="decimal" placeholder="0,00"', 'Recebido do cartão (R$)', F.cartao_liq)}</div>` : ''}
        ${verParc ? `<div class="duas-col">${inp('data-f="parcelas" inputmode="numeric" placeholder="4"', 'Cartão em quantas vezes', F.parcelas)}<div></div></div>` : ''}
        ${pag.has('comprovante') ? `<div class="emchk fch-comp"><button type="button" data-comp="ver" class="${F.comprovante ? 'ok' : ''}"><span class="cx">${F.comprovante ? '✓' : '+'}</span><span>${F.comprovante ? 'Comprovante anexado' : 'Anexar comprovante'}</span></button>${F.comprovante ? '' : '<button type="button" data-comp="colar"><span class="cx">⎘</span><span>Colar print</span></button>'}</div>` : ''}
        ${livres().length ? `<div class="lin fch-tot"><span>Entra na conta (vai para a planilha)</span><b>${X.brl2(totalVenda())}</b></div>` : ''}</div>`;
    }

    function htmlItem(x, i, ks) {
      const milhas = V.usaMilhas(x), voo = V.ehVoo(x), cli = V.ehCliente(x), h = [];
      const sug = x.custo_dia != null && x.custo_dia !== '' ? +x.custo_dia : null;
      if (podeDividir(x)) h.push(`<label class="fc" style="margin:0 0 8px"><input type="checkbox" data-fbl="${i}"><span>Ida e volta com fornecedores diferentes</span></label>${x.sugere_blocos ? '<div class="sub" style="margin:-4px 0 8px">A ida e a volta estão em companhias diferentes. Se cada uma foi comprada com um fornecedor, ligue esta opção.</div>' : ''}`);
      if (ks.has('venda')) h.push(inp(`data-it="${i}" data-k="venda" inputmode="decimal" placeholder="0,00"`, 'Valor de venda (R$)', x.venda));
      if (x.grupo) {
        h.push(`<div class="duas-col">${inp(`data-it="${i}" data-k="cia_emissora" autocomplete="off" placeholder="Gol"`, 'Companhia', x.cia_emissora)}<div></div></div>`);
        h.push(`<div class="fch-rot">Forma de compra</div><div class="seg-2x2">${seg(`data-compra="${i}"`, V.COMPRAS.map(([v, l]) => [v, l]), V.compraDe(x))}</div>`);
      }
      if (cli) {
        if (ks.has('programa')) h.push(inp(`data-it="${i}" data-k="programa" autocomplete="off"`, 'Programa', x.programa));
        if (ks.has('milhas')) h.push(inp(`data-it="${i}" data-k="milhas" inputmode="numeric"`, 'Milhas usadas', x.milhas));
      } else {
        if (voo && !x.grupo && ks.has('pago_em')) h.push(`<div class="fch-rot">Como foi pago</div>${seg(`data-pago="${i}"`, [['milhas', 'Milhas'], ['pagante', 'Pagante']], x.pago_em || 'milhas')}`);
        if ((ks.has('custo') || ks.has('milhas')) && milhas) {
          h.push(`<div class="fch-3">${inp(`data-it="${i}" data-k="milhas" inputmode="numeric"`, 'Milhas', x.milhas)}${inp(`data-it="${i}" data-k="milheiro" inputmode="decimal"`, 'Milheiro (R$)', x.milheiro)}${inp(`data-it="${i}" data-k="taxas" inputmode="decimal"`, 'Taxas (R$)', x.taxas)}</div>`);
          h.push(`<div class="sub" data-custo="${i}">${V.custoDe(x) ? 'Custo: ' + X.brl2(V.custoDe(x)) : ''}${sug ? `${V.custoDe(x) ? ' · ' : ''}Custo do dia na cotação: ${X.brl2(sug)}` : ''}</div>`);
        } else if (ks.has('custo') || ks.has('milhas')) {
          // custo sugerido: o custo do dia digitado na cotação; quem fecha confirma ou corrige
          if (!+x.custo && sug && !x._sugOk) { x.custo = sug; x._sugOk = true; }
          h.push(inp(`data-it="${i}" data-k="custo" inputmode="decimal" placeholder="0,00"`, 'Custo (R$)', x.custo, x._sugOk ? 'aria-describedby="fchSug' + i + '"' : ''));
          if (x._sugOk) h.push(`<div class="sub" id="fchSug${i}">Sugestão: custo do dia na cotação. Confirme ou corrija.</div>`);
        }
        // bloco com milhas compradas do fornecedor: o fornecedor é quem vendeu as milhas daquele trecho
        if (ks.has('onde') && x.grupo && V.compraDe(x) === 'fornecedor') h.push(`<div class="duas-col">${inp(`data-it="${i}" data-k="fornecedor" list="fchForn" autocomplete="off" placeholder="Buscar ou digitar"`, 'Fornecedor das milhas', x.fornecedor)}${inp(`data-it="${i}" data-k="conta" autocomplete="off"`, 'Conta usada', x.conta)}</div>`);
        else if (ks.has('onde')) h.push(milhas
          ? `<div class="duas-col">${inp(`data-it="${i}" data-k="gestor" autocomplete="off"`, 'Gestor da conta', x.gestor)}${inp(`data-it="${i}" data-k="conta" autocomplete="off"`, 'Conta usada', x.conta)}</div>`
          : inp(`data-it="${i}" data-k="fornecedor" list="fchForn" autocomplete="off" placeholder="Buscar ou digitar"`, 'Onde comprou (fornecedor)', x.fornecedor));
      }
      if (ks.has('localizador')) h.push(inp(`data-it="${i}" data-k="localizador" autocomplete="off" style="text-transform:uppercase"`, 'Localizador', x.localizador));
      if (ks.has('voos')) {
        if (cli) {
          const L = V.voosCliente(x);
          if (!L.length) x.voos = [{ o: '', d: '', data: '', hora: '' }];
          h.push(V.voosCliente(x).map((v, k) => `<div class="fch-voo"><div class="fch-rot">Voo ${k + 1}</div><div class="fch-4">${inp(`data-cv="${i}|${k}|o" maxlength="3" style="text-transform:uppercase"`, 'De', v.o)}${inp(`data-cv="${i}|${k}|d" maxlength="3" style="text-transform:uppercase"`, 'Para', v.d)}${inp(`data-cv="${i}|${k}|data" type="date"`, 'Data', v.data)}${inp(`data-cv="${i}|${k}|hora" type="time"`, 'Saída', v.hora)}</div></div>`).join(''));
        } else {
          h.push(V.voosEditaveis(x).map((v, k) => `<div class="fch-voo"><div class="fch-rot">${esc(x.grupo ? 'Voo' + String(v.rot).replace(/^[^(]*/, ' ') : v.rot)}</div><div class="duas-col">${inp(`data-vd="${i}|${k}" type="date"`, 'Data', v.data)}${inp(`data-vh="${i}|${k}" type="time"`, 'Horário de saída', v.hora)}</div></div>`).join(''));
          h.push('<div class="sub">O horário de saída é o local do aeroporto. É dele que sai o aviso de check-in.</div>');
        }
      }
      if (x.grupo) h.push(`<div class="sub" data-parte="${i}">${parteTxt(x)}</div>`);
      return `${x.grupo && V.blocosDe(IT, x.grupo)[0] === x ? htmlGrupo(x.grupo) : ''}<div class="fch-bl"><div class="fch-sec">${esc(x.grupo ? (V.PARTES[x.parte] || '') + (x.origem || x.destino ? ` · ${up(x.origem)} → ${up(x.destino)}` : '') : titItem(x))}</div>${h.join('')}</div>`;
    }
    const parteTxt = (x) => `Custo ${X.brl2(V.custoDe(x))} · parte do valor ${X.brl2(+x.venda || 0)}`;
    // topo do grupo: desligar e, quando o valor ainda não veio, o valor de venda da passagem inteira
    function htmlGrupo(g) {
      const B = V.blocosDe(IT, g), tot = +B[0].grupo_venda || 0;
      return `<div class="fch-bl"><label class="fc" style="margin:0 0 6px"><input type="checkbox" data-fblg="${esc(g)}" checked><span>Ida e volta com fornecedores diferentes</span></label>
        ${!tot || B.some(y => porItem.get(y) && porItem.get(y).has('gv')) ? inp(`data-fgv="${esc(g)}" inputmode="decimal" placeholder="0,00"`, 'Valor de venda da passagem (R$)', tot || '') : ''}
        <div class="sub">O cliente paga um valor só. Ele é dividido entre os trechos pelo custo de cada um.</div></div>`;
    }

    function desenha(msg) {
      const forn = X.fornecedores ? X.fornecedores() : [];
      caixa.innerHTML = `<div class="ac-ftit" id="fchTit">Fechar venda${card.cliente ? ' · ' + esc(card.cliente) : ''}</div>
        <p class="ac-fl">Falta só isto para lançar. O resto (passageiros, CPF, bagagem, print) dá para completar depois, na conferência.</p>
        <datalist id="fchForn">${forn.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        ${htmlPag()}
        ${IT.filter(x => porItem.has(x)).map(x => htmlItem(x, IT.indexOf(x), porItem.get(x))).join('')}
        <div class="fch-msg" role="alert">${msg ? esc(msg) : ''}</div>
        <button type="button" class="ac-prim" id="fchOk">Fechar venda</button>
        <button type="button" class="ac-sec" id="fchVolta">Voltar sem fechar</button>`;
      liga();
    }
    // atualiza só o que depende da conta (sem redesenhar: o teclado não fecha e a tela não pula)
    const conta = () => {
      sincGrupos(); caixa.querySelectorAll('[data-parte]').forEach(e => { e.textContent = parteTxt(IT[+e.dataset.parte]); });
      const t = caixa.querySelector('.fch-tot b'); if (t) t.textContent = X.brl2(totalVenda());
      caixa.querySelectorAll('[data-custo]').forEach(e => { const x = IT[+e.dataset.custo], sug = x.custo_dia != null && x.custo_dia !== '' ? +x.custo_dia : null; e.textContent = [V.custoDe(x) ? 'Custo: ' + X.brl2(V.custoDe(x)) : '', sug ? 'Custo do dia na cotação: ' + X.brl2(sug) : ''].filter(Boolean).join(' · '); });
    };
    function liga() {
      caixa.querySelectorAll('[data-fp]').forEach(b => b.onclick = () => { F.forma = b.dataset.fp; ajustaPag(); desenha(); });
      caixa.querySelectorAll('input[data-f]').forEach(e => {
        e.oninput = () => { const k = e.dataset.f; if (k === 'parcelas') { const v = parseInt(e.value, 10); F.parcelas = v ? Math.min(Math.max(v, 1), 12) : null; } else F[k] = nb(e.value); };
        e.onchange = () => { ajustaPag(); conta(); };
      });
      caixa.querySelectorAll('[data-comp]').forEach(b => b.onclick = () => {
        const depois = () => desenha();
        if (b.dataset.comp === 'colar') return V.colar(X, 'comprovante', F, depois);
        return F.comprovante ? V.verArquivo(X, F.comprovante) : V.anexar(X, 'comprovante', F, depois);
      });
      // "Como foi pago": o atributo guarda o item; o primeiro botão é Milhas, o segundo é Pagante
      caixa.querySelectorAll('.seg').forEach(s => {
        const bs = [...s.querySelectorAll('button[data-pago]')]; if (!bs.length) return;
        bs.forEach((b, j) => b.onclick = () => { const x = IT[+b.dataset.pago]; x.pago_em = j === 0 ? 'milhas' : 'pagante'; desenha(); });
      });
      // liga: cada trecho vira um bloco com os seus dados
      caixa.querySelectorAll('[data-fbl]').forEach(e => e.onchange = () => {
        if (!e.checked) return; const x = IT[+e.dataset.fbl], ks = porItem.get(x), semValor = !+x.venda;
        V.dividirEmBlocos(IT, IT.indexOf(x)); marcarBlocos(x.grupo); if (semValor || (ks && ks.has('venda'))) porItem.get(x).add('gv');
        desenha();
      });
      // desliga: volta a ser uma emissão só, com os dados do primeiro trecho
      caixa.querySelectorAll('[data-fblg]').forEach(e => e.onchange = () => {
        if (e.checked) return; const g = e.dataset.fblg, B = V.blocosDe(IT, g);
        if (V.grupoTemDados(IT, g) && !confirm('Voltar para um fornecedor só? Ficam os dados do primeiro trecho. O que foi preenchido nos outros será descartado.')) { e.checked = true; return; }
        B.slice(1).forEach(y => porItem.delete(y)); V.juntarBlocos(IT, g); desenha();
      });
      caixa.querySelectorAll('input[data-fgv]').forEach(e => e.oninput = () => { const B = V.blocosDe(IT, e.dataset.fgv), v = nb(e.value); B.forEach(y => { y.grupo_venda = v; delete y.venda_fixa; }); V.ratearGrupo(IT, e.dataset.fgv); conta(); });
      caixa.querySelectorAll('.seg').forEach(s => {
        const bs = [...s.querySelectorAll('button[data-compra]')]; if (!bs.length) return;
        bs.forEach((b, j) => b.onclick = () => { const x = IT[+b.dataset.compra], c = V.COMPRAS[j]; x.compra = c[0]; x.pago_em = c[2]; desenha(); });
      });
      caixa.querySelectorAll('input[data-it]').forEach(e => {
        const x = IT[+e.dataset.it], k = e.dataset.k;
        e.oninput = () => {
          const num = ['venda', 'custo', 'milhas', 'milheiro', 'taxas'].includes(k);
          x[k] = num ? nb(e.value) : k === 'localizador' ? up(e.value) : e.value.trim();
          if (k === 'custo') x._sugOk = false;
          conta();
        };
      });
      caixa.querySelectorAll('input[data-vd],input[data-vh]').forEach(e => {
        const [i, k] = (e.dataset.vd || e.dataset.vh).split('|').map(Number);
        e.oninput = () => { const v = V.voosEditaveis(IT[i])[k]; if (!v) return; if (e.dataset.vd !== undefined) { if (e.value && +e.value.slice(0, 4) < 1990) return; v.setData(e.value); } else v.setHora(e.value); };
      });
      caixa.querySelectorAll('input[data-cv]').forEach(e => {
        const [i, k, c] = e.dataset.cv.split('|');
        e.oninput = () => { const v = IT[+i].voos[+k]; v[c] = c === 'o' || c === 'd' ? up(e.value) : e.value; };
      });
      caixa.querySelector('#fchVolta').onclick = () => sair(false);
      caixa.querySelector('#fchOk').onclick = () => {
        const f = V.pendenciasMinimo({ itens: IT, fech: F });
        if (f.length) { desenha('Ainda falta: ' + f.join('; ') + '.'); const m = caixa.querySelector('.fch-msg'); if (m) m.scrollIntoView({ block: 'center' }); return; }
        sair(true);
      };
    }
    desenha();
    document.body.appendChild(el);
    const pri = caixa.querySelector('input,button'); if (pri && matchMedia('(pointer:fine)').matches) pri.focus();
  });
}
