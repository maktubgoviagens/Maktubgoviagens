// Maktub Go: motor de contas de um cartão, por fórmula e sem IA.
// O mesmo motor serve o estudo de cartões (cartoes-simulacao.js) e a calculadora de cartões (cartoes-calculadora.js):
// uma conta só para pontos, milhas, valor em reais, anuidade efetiva e saldo.
// A anuidade efetiva vem da função calc da Base de cartões (cartoes.js), recebida em ctx.calc.

export const n = (x) => x === null || x === undefined || x === '' ? null : Number(x);
export const chave = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
// família do programa: as três companhias pelo nome; os programas de banco pelo próprio nome
export const familia = (t) => { const k = chave(t); return /smiles|^gol/.test(k) ? 'smiles' : /latam/.test(k) ? 'latam' : /azul/.test(k) ? 'azul' : k; };
export const NOME_FAM = { smiles: 'Smiles', latam: 'LATAM Pass', azul: 'Azul Fidelidade' };
// premissa declarada: Livelo e Esfera transferem para as três companhias
const TRANSFERE_PARA_AS_TRES = /livelo|esfera/;
// nome do programa próprio do cartão: o nome antes da lista de parceiros, ex.: "Curtaí (LATAM Pass, Smiles...)" é Curtaí
export const progProprio = (b) => String(b.programa || b.destino_pontos || '').split(/[(;]/)[0].trim();

// para onde vão os pontos do cartão e se chegam no programa preferido
export function destino(b, pref) {
  const tipo = b.tipo_destino, txt = chave((b.destino_pontos || '') + ' ' + (b.programa || ''));
  if (tipo === 'cashback' || b.pontos_moeda === 'PCT') return { modo: 'cashback' };
  if (tipo === 'nenhum') return { modo: 'nenhum' };
  const proprio = familia(String(b.programa || b.destino_pontos || '').split(/[(;]/)[0]);
  if (proprio && proprio === pref) return { modo: 'direto' };
  const vai = (pref === 'smiles' && /smiles/.test(txt)) || (pref === 'latam' && /latam/.test(txt)) || (pref === 'azul' && /azul/.test(txt))
    || (['smiles', 'latam', 'azul'].includes(pref) && TRANSFERE_PARA_AS_TRES.test(txt)) || (pref && txt.includes(pref));
  if (tipo === 'aerea_direta' || tipo === 'companhia_aerea') return { modo: 'outro', programa: b.destino_pontos || b.programa };
  // a premissa (Livelo e Esfera transferem para as três companhias) só vale quando o destino é uma companhia
  return vai ? { modo: 'transferido', premissa: ['smiles', 'latam', 'azul'].includes(pref) && !/smiles|latam|azul/.test(txt) && TRANSFERE_PARA_AS_TRES.test(txt) } : { modo: 'outro', programa: b.destino_pontos || b.programa };
}

// milheiro de referência de qualquer programa (tabela valores_milheiro, já em { chave: valor })
export const refDe = (refs, prog) => { const f = familia(String(prog || '').split(/[(;]/)[0]); const k = Object.keys(refs || {}).find(x => familia(x) === f); return k ? refs[k] : null; };

// bônus de transferência: regra da casa ativa do programa preferido
export const bonusDe = (regras, pref) => { const rb = (regras || []).find(r => r.ativa && r.tipo === 'transferencia' && r.aplica_tipo === 'programa' && familia(r.aplica_a) === pref && n(r.valor) !== null); return rb ? n(rb.valor) : 0; };

/* Conta de um cartão com um gasto mensal nacional (gNac) e internacional (gInt), os dois em R$.
   ctx: { calc, cotacao, refs, normProg, pref (família do programa de destino, ou '' para "o que o cartão usar"),
          prefNome, bonus (% de bônus de transferência para o pref), milheiro (do pref), anuidadePaga (negociada, se houver),
          livre (true quando o destino é "o que o cartão usar": as notas não falam em programa preferido) }
   Pontos por ano: gasto nacional convertido pelo dólar de referência x pontuação nacional + gasto internacional convertido x
   pontuação no exterior, x 12. Cartão em R$ não converte. Cashback: retorno em reais, sem pontos.
   A anuidade efetiva usa o gasto total do mês (a isenção olha a fatura toda). */
export function contaCartao(b, gNac, gInt, ctx) {
  const { calc, cotacao, refs, normProg, pref, prefNome, bonus, milheiro } = ctx;
  const g = gNac + gInt;
  const cart = ctx.anuidadePaga !== undefined && ctx.anuidadePaga !== null ? { gasto_medio_mes: g, anuidade_paga: ctx.anuidadePaga } : { gasto_medio_mes: g };
  const k = calc(cart, b, cotacao, refs, normProg), d = destino(b, pref), notas = [], fontes = ['base de cartões'];
  const pts = n(b.pts_nacional) ?? n(b.pontos_por);
  let ptsI = n(b.pts_internacional), extNacional = false;
  if (gInt > 0 && ptsI === null && pts) { ptsI = pts; extNacional = true; }
  let pontos = null, milhas = 0, valor = null, outro = null;
  if (d.modo === 'cashback') { valor = k.valor; notas.push('cartão de cashback: retorno em dinheiro, não gera milhas'); }
  else if (pts && g > 0) {
    // com gasto internacional zero a conta é exatamente a do estudo de cartões
    const parteInt = (div) => gInt > 0 ? gInt * 12 * ptsI / div : 0;
    pontos = b.pontos_moeda === 'BRL' ? gNac * 12 * pts + parteInt(1) : cotacao > 0 ? gNac * 12 * pts / cotacao + parteInt(cotacao) : null;
    if (pontos !== null) {
      if (extNacional) notas.push('pontuação no exterior não está na base: usada a nacional');
      if (d.modo === 'direto') milhas = pontos;
      else if (d.modo === 'transferido') { milhas = pontos * (1 + bonus / 100); if (bonus) fontes.push('regra da casa (bônus de transferência)'); if (d.premissa) notas.push(`considerado que ${/esfera/.test(chave(b.destino_pontos || b.programa)) ? 'Esfera' : 'Livelo'} transfere para ${prefNome}`); }
      if (milheiro !== null && milhas) { valor = milhas * milheiro / 1000; fontes.push('valor do milheiro'); }
      if (d.modo === 'outro') {
        // pontos que vão para outro programa: valem pelo milheiro de referência desse programa
        const ref = refDe(refs, d.programa); outro = { programa: d.programa || 'outro programa', pontos: Math.round(pontos), valor: ref !== null ? pontos * ref / 1000 : null };
        if (outro.valor !== null) { valor = outro.valor; fontes.push('valor do milheiro'); }
        notas.push(ctx.livre ? (outro.valor === null ? `sem valor do milheiro de ${progProprio(b) || 'programa não informado'}` : '')
          : `os pontos vão para ${outro.programa}, não para ${prefNome}` + (outro.valor === null ? ' (sem milheiro de referência desse programa)' : ''));
      }
      if (d.modo === 'nenhum') notas.push('sem programa de pontos');
    }
  } else if (!pts && d.modo !== 'nenhum') notas.push('pontuação não informada na base');
  if (n(b.pts_condicional) === null && b.pts_condicional) notas.push('pontuação com condição: ' + b.pts_condicional);
  return { pontos, milhas: Math.round(milhas), outro, valor, anuidade: k.custo, cheia: k.cheia, isenta: k.isentaGasto, minimo: k.minimo, reduzida: k.reduzida, redPct: k.redPct,
    saldo: valor !== null && k.custo !== null ? valor - k.custo : null, notas: notas.filter(Boolean), fontes, modo: d.modo, extNacional };
}
