// Maktub Go: simulação de caminhos de cartão para o estudo da Gestão.
// Só fórmulas, sem IA: os números vêm da Base de cartões, das salas, dos segmentos dos bancos,
// das regras da casa (bônus de transferência e valores de referência) e do valor do milheiro. A IA só compara e explica.
// Gasto considerado: o gasto total no cartão do perfil, todo como gasto nacional.
// Cada caminho é uma combinação: o cartão principal recebe o gasto até o limite; o que passa vai para o
// melhor cartão de apoio que o cliente já tem. As prioridades da equipe (em ordem) definem a ordem dos caminhos.

const n = (x) => x === null || x === undefined || x === '' ? null : Number(x);
const chave = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
// família do programa: as três companhias pelo nome; os programas de banco pelo próprio nome
const familia = (t) => { const k = chave(t); return /smiles|^gol/.test(k) ? 'smiles' : /latam/.test(k) ? 'latam' : /azul/.test(k) ? 'azul' : k; };
const NOME_FAM = { smiles: 'Smiles', latam: 'LATAM Pass', azul: 'Azul Fidelidade' };
// premissa declarada: Livelo e Esfera transferem para as três companhias
const TRANSFERE_PARA_AS_TRES = /livelo|esfera/;
const FAIXA_RENDA = { ate_15k: [0, 15000], '15k_30k': [15000, 30000], '30k_50k': [30000, 50000], '50k_100k': [50000, 100000], acima_100k: [100000, Infinity] };
const FAIXA_INV = { ate_50k: [0, 50000], '50k_250k': [50000, 250000], '250k_1m': [250000, 1e6], '1m_5m': [1e6, 5e6], acima_5m: [5e6, Infinity] };
const REDES = [['priority_pass', 'Priority Pass', /priority/i], ['loungekey', 'LoungeKey', /loungekey|airport experiences/i], ['dragonpass', 'DragonPass', /dragon|airport companion/i]];
const brl = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');

// para onde vão os pontos do cartão e se chegam no programa preferido
function destino(b, pref) {
  const tipo = b.tipo_destino, txt = chave((b.destino_pontos || '') + ' ' + (b.programa || ''));
  if (tipo === 'cashback' || b.pontos_moeda === 'PCT') return { modo: 'cashback' };
  if (tipo === 'nenhum') return { modo: 'nenhum' };
  // programa próprio do cartão: o nome antes da lista de parceiros, ex.: "Curtaí (LATAM Pass, Smiles...)" é Curtaí
  const proprio = familia(String(b.programa || b.destino_pontos || '').split(/[(;]/)[0]);
  if (proprio && proprio === pref) return { modo: 'direto' };
  const vai = (pref === 'smiles' && /smiles/.test(txt)) || (pref === 'latam' && /latam/.test(txt)) || (pref === 'azul' && /azul/.test(txt))
    || (['smiles', 'latam', 'azul'].includes(pref) && TRANSFERE_PARA_AS_TRES.test(txt)) || (pref && txt.includes(pref));
  if (tipo === 'aerea_direta' || tipo === 'companhia_aerea') return { modo: 'outro', programa: b.destino_pontos || b.programa };
  return vai ? { modo: 'transferido', premissa: !/smiles|latam|azul/.test(txt) && TRANSFERE_PARA_AS_TRES.test(txt) } : { modo: 'outro', programa: b.destino_pontos || b.programa };
}
// o cliente consegue pedir hoje? Pelas exigências do cartão contra as faixas do perfil e dos bancos (só indicação: quem aprova é o banco)
function podePedir(b, perfil, bancosCli, jaTem) {
  if (jaTem) return { r: 'já tem', motivo: '' };
  const renda = FAIXA_RENDA[perfil.faixa_renda], inv = bancosCli.map(x => FAIXA_INV[x.faixa_investimento]).filter(Boolean).sort((a, c) => c[1] - a[1])[0];
  const M = []; let r = 'sim';
  const exR = n(b.exige_renda), exI = n(b.exige_invest);
  const pior = (x) => { r = r === 'não' || x === 'não' ? 'não' : 'depende'; };
  if (exR) { if (!renda) { pior('depende'); M.push(`pede renda de ${brl(exR)} (renda do cliente não informada)`); } else if (renda[1] <= exR) { pior('não'); M.push(`pede renda de ${brl(exR)}`); } else if (renda[0] < exR) { pior('depende'); M.push(`pede renda de ${brl(exR)}`); } }
  if (exI) { if (!inv) { pior('depende'); M.push(`pede ${brl(exI)} investidos (investimento não informado)`); } else if (inv[1] <= exI) { pior('não'); M.push(`pede ${brl(exI)} investidos`); } else if (inv[0] < exI) { pior('depende'); M.push(`pede ${brl(exI)} investidos`); } }
  if (b.somente_convite) { pior('depende'); M.push('só por convite'); }
  if (b.exige_outro) { if (r === 'sim') r = 'depende'; M.push(b.exige_outro); }
  return { r, motivo: M.join('; ') };
}

export const OBJETIVOS = [['mais_milhas', 'Mais milhas no programa preferido'], ['sala_vip', 'Sala VIP ilimitada'], ['cortar_anuidade', 'Cortar anuidade']];
const PESOS = [3, 2, 1];
// facilidade de conseguir o cartão: 0 já tem, 1 banco do cliente e dá para pedir, 2 banco do cliente e depende do banco, 3 outro banco e dá para pedir, 4 o resto
export const facilidade = (c) => c.ja_tem ? 0 : c.relacionamento && c.pedir.r === 'sim' ? 1 : c.relacionamento ? 2 : c.pedir.r === 'sim' ? 3 : 4;
const NOME_OBJ = Object.fromEntries(OBJETIVOS);

/* Entrada:
   perfil (cliente_perfil), cartoesCli (cartoes do cliente), base (cartoes_catalogo), salas (cartoes_salas_vip),
   salasAero (salas_aeroportos dos aeroportos do cliente), bancosCli (cliente_bancos), segmentos (bancos_segmentos),
   regras (regras_estrategia), refs (valor do milheiro por chave de programa), cotacao (dólar), calc (contas da base),
   beneficiosUso (cliente_beneficios_uso), usoSalas (cliente_salas_uso do ano), extrato (extrato_milhas dos últimos 12 meses). */
export function simular(E) {
  const { perfil, cartoesCli, base, salas, salasAero, bancosCli, segmentos, regras, refs, cotacao, calc, normProg } = E;
  const beneficiosUso = E.beneficiosUso || [], usoSalas = E.usoSalas || [], extrato = E.extrato || [];
  const gasto = n(perfil.gasto_cartao_mes) || 0;
  const pref = familia(perfil.programa_preferido || perfil.companhia_preferida);
  const prefNome = NOME_FAM[pref] || perfil.programa_preferido || perfil.companhia_preferida || '';
  const aeroportos = [...new Set([perfil.aeroporto_saida, ...(perfil.aeroportos_frequentes || [])].filter(Boolean).map(a => String(a).trim().toUpperCase()))];
  const objetivos = (perfil.objetivos_ordem || []).filter(o => NOME_OBJ[o]);
  const avisos = [];
  const regra = (re) => (regras || []).find(r => r.ativa !== false && re.test(r.titulo || ''));
  // bônus de transferência: regra da casa ativa do programa preferido
  const rb = (regras || []).find(r => r.ativa && r.tipo === 'transferencia' && r.aplica_tipo === 'programa' && familia(r.aplica_a) === pref && n(r.valor) !== null);
  const bonus = rb ? n(rb.valor) : 0;
  if (!rb && ['smiles', 'latam', 'azul'].includes(pref)) avisos.push(`Sem bônus de transferência cadastrado para ${prefNome}: pontos de banco contam 1 para 1.`);
  // milheiro de referência de qualquer programa (o preferido e os outros, para pontos que vão para outro programa)
  const refDe = (prog) => { const f = familia(String(prog || '').split(/[(;]/)[0]); const k = Object.keys(refs || {}).find(x => familia(x) === f); return k ? refs[k] : null; };
  const milheiro = refDe(pref);
  if (milheiro === null) avisos.push(`Sem valor do milheiro de ${prefNome || 'programa preferido'}: valor em reais não calculado.`);
  if (!(cotacao > 0)) avisos.push('Sem cotação do dólar na Base de cartões: pontos por dólar não calculados.');
  const porId = Object.fromEntries(base.map(b => [b.id, b]));
  const salasDe = (id) => salas.filter(s => s.catalogo_id === id);
  const meus = cartoesCli.filter(k => porId[k.catalogo_id]);
  const meusIds = new Set(meus.map(k => k.catalogo_id));
  const maiorLimite = Math.max(0, ...cartoesCli.map(k => n(k.limite) || 0)) || null;

  // limite de um cartão: o do cliente; senão o de referência da base; senão o maior limite que o cliente já tem
  const limiteDe = (b) => {
    const k = cartoesCli.find(x => x.catalogo_id === b.id);
    if (k && n(k.limite) !== null) return { v: n(k.limite), estimado: false };
    if (n(b.limite_referencia)) return { v: n(b.limite_referencia), estimado: true, origem: 'limite de referência da base' };
    if (maiorLimite) return { v: maiorLimite, estimado: true, origem: 'maior limite que o cliente já tem' };
    return { v: null, estimado: true, origem: 'sem limite informado' };
  };

  // sala VIP do cartão nos aeroportos do cliente: redes globais do cartão x salas de cada aeroporto
  const pessoasSala = n(perfil.pessoas_sala) || 0, adicionaisPossiveis = Math.min(n(perfil.pessoas_adicionais) || 0, pessoasSala);
  const salaInfo = (b, g) => {
    const S = salasDe(b.id), redes = S.filter(s => s.tipo === 'rede_global');
    const L = (salasAero || []).filter(a => !['restaurante', 'outro'].includes(a.tipo));
    const porRede = REDES.map(([k, rot, re]) => {
      const r = redes.filter(s => re.test(s.rede_ou_sala || '')); if (!r.length) return null;
      const ac = r.some(s => n(s.acessos_titular_ano) === -1) ? -1 : Math.max(0, ...r.map(s => n(s.acessos_titular_ano) || 0));
      const por = aeroportos.map(a => ({ aeroporto: a, salas: L.filter(x => x.aeroporto_iata === a && x[k] === true).length, a_confirmar: L.filter(x => x.aeroporto_iata === a && (x[k] === null || x[k] === undefined)).length }));
      return { rede: rot, acessos: ac, salas: por.reduce((t, x) => t + x.salas, 0), por };
    }).filter(Boolean);
    const gm = S.filter(s => n(s.gasto_minimo_rs) > 0).map(s => { const f = n(s.gasto_minimo_faturas) || 1, mes = n(s.gasto_minimo_rs) / f; return { sala: s.rede_ou_sala, pede_mes: mes, cumpre: g >= mes }; });
    const ilimitado = porRede.some(x => x.acessos === -1 && x.salas > 0);
    const cumpre = !gm.length || gm.some(x => x.cumpre);
    const adicionais = b.vip_adicional_proprio ? adicionaisPossiveis : 0, convidados = n(b.vip_convidados_ano) || 0;
    // cobertura da família: titular, adicionais com acesso próprio e, se houver convidados no ano, mais um acompanhante
    const cobertura = Math.min(1, (1 + adicionais + (convidados > 0 && pessoasSala > adicionais ? 1 : 0)) / (1 + pessoasSala));
    const limitado = porRede.some(x => x.acessos > 0 && x.salas > 0);
    return { redes: porRede, salas_no_aeroporto: porRede.reduce((t, x) => t + x.salas, 0), ilimitado, cumpre, gasto_minimo: gm, adicionais, convidados, cobertura,
      nota: ilimitado && cumpre ? 0.5 + 0.5 * cobertura : limitado ? 0.2 : 0 };
  };

  // conta de um cartão com um gasto mensal
  const conta = (b, g, jaTem) => {
    const k = calc({ gasto_medio_mes: g }, b, cotacao, refs, normProg), d = destino(b, pref), notas = [], fontes = ['base de cartões'];
    const pts = n(b.pts_nacional) ?? n(b.pontos_por);
    let pontos = null, milhas = 0, valor = null, outro = null;
    if (d.modo === 'cashback') { valor = k.valor; notas.push('cartão de cashback: retorno em dinheiro, não gera milhas'); }
    else if (pts && g > 0) {
      pontos = b.pontos_moeda === 'BRL' ? g * 12 * pts : cotacao > 0 ? g * 12 * pts / cotacao : null;
      if (pontos !== null) {
        if (d.modo === 'direto') milhas = pontos;
        else if (d.modo === 'transferido') { milhas = pontos * (1 + bonus / 100); if (bonus) fontes.push('regra da casa (bônus de transferência)'); if (d.premissa) notas.push(`considerado que ${/esfera/.test(chave(b.destino_pontos || b.programa)) ? 'Esfera' : 'Livelo'} transfere para ${prefNome}`); }
        if (milheiro !== null && milhas) { valor = milhas * milheiro / 1000; fontes.push('valor do milheiro'); }
        if (d.modo === 'outro') {
          // pontos que vão para outro programa: valem pelo milheiro de referência desse programa
          const ref = refDe(d.programa); outro = { programa: d.programa || 'outro programa', pontos: Math.round(pontos), valor: ref !== null ? pontos * ref / 1000 : null };
          if (outro.valor !== null) { valor = outro.valor; fontes.push('valor do milheiro'); }
          notas.push(`os pontos vão para ${outro.programa}, não para ${prefNome}` + (outro.valor === null ? ' (sem milheiro de referência desse programa)' : ''));
        }
        if (d.modo === 'nenhum') notas.push('sem programa de pontos');
      }
    } else if (!pts && d.modo !== 'nenhum') notas.push('pontuação não informada na base');
    if (n(b.pts_condicional) === null && b.pts_condicional) notas.push('pontuação com condição: ' + b.pts_condicional);
    const sala = salaInfo(b, g); if (sala.redes.length) fontes.push('salas VIP');
    return { pontos, milhas: Math.round(milhas), outro, valor, anuidade: k.custo, cheia: k.cheia, isenta: k.isentaGasto, minimo: k.minimo, reduzida: k.reduzida,
      saldo: valor !== null && k.custo !== null ? valor - k.custo : null, sala, notas, fontes, pedir: podePedir(b, perfil, bancosCli, jaTem) };
  };

  // próximo degrau: segmento atual do cliente no banco do cartão e o seguinte; e o próximo cartão da família
  const degrau = (b) => {
    const T = [];
    if (b.proximo_degrau && !/topo/i.test(b.proximo_degrau)) T.push('próximo cartão da família: ' + b.proximo_degrau);
    const meuSeg = bancosCli.map(x => segmentos.find(s => s.id === x.segmento_id)).find(s => s && chave(s.banco) === chave(b.banco));
    if (meuSeg) {
      const prox = segmentos.filter(s => chave(s.banco) === chave(meuSeg.banco) && n(s.posicao_regua) > n(meuSeg.posicao_regua)).sort((a, c) => a.posicao_regua - c.posicao_regua)[0];
      if (prox) T.push(`próximo segmento no ${prox.banco}: ${prox.segmento}` + [n(prox.renda_minima) ? `renda ${brl(prox.renda_minima)}` : '', n(prox.investimento_minimo) ? `investimento ${brl(prox.investimento_minimo)}` : ''].filter(Boolean).map((x, i) => (i ? ' ou ' : ' (pede ') + x).join('') + ([n(prox.renda_minima), n(prox.investimento_minimo)].some(Boolean) ? ')' : ''));
    }
    return T.join(' · ');
  };

  // candidatos a principal: os do cliente, os liberados pelos segmentos dele (e o seguinte), os do programa preferido, os dos bancos dele
  const segIds = new Set(); bancosCli.forEach(x => { const s = segmentos.find(y => y.id === x.segmento_id); if (!s) return; (s.cartoes_ids || []).forEach(i => segIds.add(i));
    const prox = segmentos.filter(y => y.banco === s.banco && n(y.posicao_regua) === n(s.posicao_regua) + 1)[0]; if (prox) (prox.cartoes_ids || []).forEach(i => segIds.add(i)); });
  const bancosNomes = new Set(bancosCli.map(x => chave(x.banco)).concat(meus.map(k => chave(porId[k.catalogo_id].banco))));
  const elegivel = (b) => b.ativo !== false && (b.vendido_hoje !== false || meusIds.has(b.id));
  let cand = base.filter(b => elegivel(b) && (meusIds.has(b.id) || segIds.has(b.id) || (pref && familia(String(b.programa || b.destino_pontos || '').split(/[(;]/)[0]) === pref) || bancosNomes.has(chave(b.banco))));
  // mais os de melhor saldo no mercado que não pedem convite, e os que dão sala ilimitada nos aeroportos do cliente
  const resto = base.filter(b => elegivel(b) && !cand.includes(b) && !b.somente_convite).map(b => ({ b, c: conta(b, gasto, false) }));
  const fora = [...resto.filter(x => x.c.saldo !== null).sort((a, c) => c.c.saldo - a.c.saldo).slice(0, 8), ...(objetivos.includes('sala_vip') ? resto.filter(x => x.c.sala.ilimitado).sort((a, c) => (c.c.saldo ?? -1e9) - (a.c.saldo ?? -1e9)).slice(0, 6) : [])].map(x => x.b);
  cand = cand.concat([...new Set(fora)]);
  const foraSet = new Set(fora);

  // combinação: principal até o limite; o que passa vai para o melhor cartão de apoio que o cliente já tem
  const combinar = (P) => {
    const LP = limiteDe(P), gP = LP.v === null ? gasto : Math.min(gasto, LP.v), resto2 = Math.max(0, gasto - gP);
    const cP = conta(P, gP, meusIds.has(P.id));
    let apoio = null;
    if (resto2 > 0) {
      for (const k of meus) {
        const A = porId[k.catalogo_id]; if (A.id === P.id) continue;
        const LA = limiteDe(A), gA = LA.v === null ? resto2 : Math.min(resto2, LA.v), cA = conta(A, gA, true);
        const sc = (cA.valor ?? 0) - (cA.anuidade ?? 0);
        if (!apoio || sc > apoio.sc) apoio = { b: A, g: gA, c: cA, L: LA, sc };
      }
    }
    const sobra = Math.max(0, resto2 - (apoio ? apoio.g : 0));
    const soma = (f) => f(cP) + (apoio ? f(apoio.c) : 0);
    const temValor = cP.valor !== null || (apoio && apoio.c.valor !== null);
    const anu = (cP.anuidade ?? 0) + (apoio ? apoio.c.anuidade ?? 0 : 0), valor = temValor ? soma(c => c.valor ?? 0) : null;
    const salaBoa = (cP.sala.ilimitado && cP.sala.cumpre) ? cP.sala : apoio && apoio.c.sala.ilimitado && apoio.c.sala.cumpre ? apoio.c.sala : (cP.sala.nota >= (apoio ? apoio.c.sala.nota : 0) ? cP.sala : apoio.c.sala);
    // avisos calculados por fórmula (a IA precisa explicar os do recomendado)
    const AV = [], nomeP = `${P.banco} ${P.nome}`.trim();
    if (cP.anuidade > 0 && n(P.isencao_gasto_mes) > 0 && !cP.isenta) AV.push(`A anuidade do ${nomeP} não fica isenta com ${brl(gP)} por mês: a isenção pede ${brl(n(P.isencao_gasto_mes))}.`);
    cP.sala.gasto_minimo.filter(x => !x.cumpre).forEach(x => AV.push(`${x.sala}: o banco pede ${brl(x.pede_mes)} por mês para liberar a sala e o cartão recebe ${brl(gP)}.`));
    if (LP.v === null) AV.push(`Limite do ${nomeP} não informado: a conta coloca todo o gasto nele.`);
    else if (LP.estimado) AV.push(`Limite do ${nomeP} estimado em ${brl(LP.v)} (${LP.origem}).`);
    if (sobra > 0) AV.push(`${brl(sobra)} do gasto por mês não cabem nos limites dos cartões desta combinação.`);
    if (cP.outro) AV.push(`Os pontos do ${nomeP} vão para ${cP.outro.programa}, não para ${prefNome}.`);
    if (P.a_confirmar) AV.push(`${nomeP} tem dados a confirmar na base: não pode ser o recomendado.`);
    if (P.somente_convite) AV.push(`${nomeP} é só por convite.`);
    cP.sala.redes.forEach(r => r.por.filter(x => !x.salas && x.a_confirmar).forEach(x => AV.push(`Em ${x.aeroporto}, ${x.a_confirmar} ${x.a_confirmar === 1 ? 'sala aceita' : 'salas aceitam'} ${r.rede} só "a confirmar" na base.`)));
    return {
      id: P.id + (apoio ? '|' + apoio.b.id : ''), principal: { id: P.id, cartao: nomeP, banco: P.banco, gasto_mes: gP, limite: LP.v, limite_estimado: LP.estimado, ...cP },
      apoio: apoio ? { id: apoio.b.id, cartao: `${apoio.b.banco} ${apoio.b.nome}`.trim(), gasto_mes: apoio.g, limite: apoio.L.v, limite_estimado: apoio.L.estimado, ...apoio.c } : null,
      sem_cartao: sobra, milhas: soma(c => c.milhas), outros_pontos: [cP.outro, apoio && apoio.c.outro].filter(Boolean), valor, anuidade: anu, saldo: valor === null ? null : valor - anu,
      sala: salaBoa, ja_tem: meusIds.has(P.id), pedir: cP.pedir, somente_convite: !!P.somente_convite, fora_dos_bancos: foraSet.has(P), relacionamento: bancosNomes.has(chave(P.banco)),
      dados_a_confirmar: !!(P.a_confirmar || (apoio && apoio.b.a_confirmar)), degrau: degrau(P), avisos: AV,
      notas: [...cP.notas, ...(apoio ? apoio.c.notas.map(x => 'apoio: ' + x) : [])], fontes: [...new Set([...cP.fontes, ...(apoio ? apoio.c.fontes : [])])],
    };
  };
  let caminhos = cand.map(combinar);

  // ordem: pelas prioridades da equipe (pesos 3, 2 e 1 pela posição); sem prioridades, pelo saldo
  if (objetivos.length) {
    const maxM = Math.max(1, ...caminhos.map(c => c.milhas)), anus = caminhos.map(c => c.anuidade), minA = Math.min(...anus), maxA = Math.max(...anus);
    const nota = { mais_milhas: (c) => c.milhas / maxM, sala_vip: (c) => c.sala.nota, cortar_anuidade: (c) => maxA === minA ? 1 : (maxA - c.anuidade) / (maxA - minA) };
    const somaP = objetivos.reduce((t, _, i) => t + PESOS[i], 0);
    caminhos.forEach(c => { c.notas_objetivos = Object.fromEntries(objetivos.map(o => [o, Math.round(nota[o](c) * 100) / 100])); c.nota = Math.round(objetivos.reduce((t, o, i) => t + PESOS[i] * nota[o](c), 0) / somaP * 100); });
    caminhos.sort((a, c) => c.nota - a.nota || (c.saldo ?? -Infinity) - (a.saldo ?? -Infinity));
  } else caminhos.sort((a, c) => (c.saldo ?? -Infinity) - (a.saldo ?? -Infinity));

  // escada por prazo: agora (já tem ou dá para pedir hoje), próximo passo e foco (o melhor pelas prioridades)
  // foco: o melhor pelas prioridades que o cliente consegue alcançar (sem "ainda não dá" e sem convite) e sem dados a confirmar
  const valido = (c) => !c.dados_a_confirmar, alcancavel = (c) => c.pedir.r !== 'não' && (!c.somente_convite || c.ja_tem);
  // agora: o que ele já tem ou dá para pedir hoje (cartão que ele já tem vale mesmo com dados a confirmar na base)
  const agora = caminhos.find(c => (valido(c) || c.ja_tem) && ['já tem', 'sim'].includes(c.pedir.r)) || null;
  const pos = (c) => caminhos.indexOf(c);
  // entre os que passam o "agora", vem primeiro o mais fácil de conseguir: banco em que o cliente já tem relacionamento
  // e "dá para pedir"; depois banco do cliente que depende do banco; depois os outros bancos
  // cartão de outro banco que depende do banco (renda, investimento, convite) não vira recomendado sozinho: a equipe escolhe se quiser
  const melhores = caminhos.filter(c => valido(c) && alcancavel(c) && facilidade(c) <= 3 && (!agora || pos(c) < pos(agora)));
  let foco = melhores.slice().sort((a, c) => facilidade(a) - facilidade(c) || pos(a) - pos(c))[0] || agora;
  // a equipe pode escolher outro caminho como recomendado (fica salvo no perfil do cliente)
  const escolhido = E.focoEscolhido ? caminhos.find(c => String(c.principal.id) === String(E.focoEscolhido)) || null : null;
  if (escolhido) foco = escolhido;
  // o melhor alcançável pode estar barrado só por dados a confirmar: a equipe confere na Base e ele passa a valer
  const barrado = caminhos.find(alcancavel);
  const aConfirmar = barrado && barrado.dados_a_confirmar && (!foco || barrado.id !== foco.id) ? barrado.id : null;
  const passos = [];
  if (foco && agora && foco.id !== agora.id) {
    const bF = porId[foco.principal.id], bA = porId[agora.principal.id];
    if (foco.pedir.motivo) passos.push(`Para o ${foco.principal.cartao}: ${foco.pedir.motivo}.`);
    if (agora.degrau) passos.push(`Degrau a partir do ${agora.principal.cartao}: ${agora.degrau}.`);
    const mesmoBanco = bF && bA && chave(bF.banco) === chave(bA.banco), rs = regra(/^Subir no mesmo banco/i);
    if (mesmoBanco && rs) passos.push(`Regra da casa "${rs.titulo}": ${rs.regra}`);
  }
  if (escolhido && escolhido.dados_a_confirmar) passos.unshift(`Conferir o ${escolhido.principal.cartao} na Base de cartões: tem dados a confirmar.`);
  const escada = { agora: agora ? agora.id : null, foco: foco ? foco.id : null, a_confirmar: escolhido ? null : aConfirmar, passos, escolhido: !!escolhido };

  // carteira de hoje: cada cartão com o gasto dele, os benefícios que o cliente usa e a economia de anuidade no ano
  const rSala = regra(/^Valor de referência: visita a sala VIP/i), rSeguro = regra(/^Valor de referência: seguro viagem/i);
  const vSala = rSala ? n(rSala.valor) : null, vSeguro = rSeguro ? n(rSeguro.valor) : null;
  const viagensInt = n(perfil.viagens_internacionais_ano) || 0;
  const faltaValor = new Set();
  // gasto de cada cartão: o lançado; quando falta, o que sobra do gasto total é dividido pelos limites (cartão sem limite pesa a média)
  const semGasto = cartoesCli.filter(k => n(k.gasto_medio_mes) === null);
  const sobraGasto = Math.max(0, gasto - cartoesCli.reduce((t, k) => t + (n(k.gasto_medio_mes) || 0), 0));
  const lims = semGasto.map(k => n(k.limite)).filter(v => v > 0), mediaLim = lims.length ? lims.reduce((t, v) => t + v, 0) / lims.length : 1;
  const peso = (k) => n(k.limite) > 0 ? n(k.limite) : mediaLim, somaPeso = semGasto.reduce((t, k) => t + peso(k), 0);
  const gastoDe = (k) => n(k.gasto_medio_mes) !== null ? { g: n(k.gasto_medio_mes), estimado: false } : { g: somaPeso ? Math.round(sobraGasto * peso(k) / somaPeso) : 0, estimado: true };
  const hoje = cartoesCli.map(k => {
    const b = porId[k.catalogo_id], nome = b ? `${b.banco} ${b.nome}`.trim() : [k.banco, k.categoria].filter(Boolean).join(' ');
    if (!b) return { id: k.id, cartao: nome, fora_da_base: true };
    const { g, estimado: gastoEstimado } = gastoDe(k), c = conta(b, g, true);
    const paga = n(k.anuidade_paga), efetiva = paga !== null ? paga : c.anuidade, cheia = n(b.anuidade_anual);
    const BU = beneficiosUso.filter(x => x.cartao_id === k.id && x.usa !== false);
    const visitas = usoSalas.filter(u => u.cartao_id === k.id).reduce((t, u) => t + (n(u.pessoas) || 1), 0);
    const beneficios = BU.map(x => {
      let v = n(x.valor_ano), como = 'valor informado pela equipe';
      if (v === null && /sala/.test(chave(x.categoria))) { if (vSala !== null) { v = visitas * vSala; como = `${visitas} ${visitas === 1 ? 'visita' : 'visitas'} no ano pelo valor de referência`; } else faltaValor.add('valor de referência da visita a sala VIP (Regras)'); }
      else if (v === null && /seguro/.test(chave(x.categoria + ' ' + x.descricao)) && /viagem/.test(chave(x.descricao))) { if (vSeguro !== null) { v = viagensInt * vSeguro; como = `${viagensInt} viagens internacionais pelo valor de referência`; } else faltaValor.add('valor de referência do seguro viagem (Regras)'); }
      return { descricao: x.descricao, valor: v, como: v === null ? 'sem valor definido' : como };
    });
    const vBen = beneficios.reduce((t, x) => t + (x.valor || 0), 0), retorno = (c.valor || 0) + vBen;
    return { id: k.id, catalogo_id: b.id, cartao: nome, gasto: g, gasto_estimado: gastoEstimado, limite: n(k.limite), milhas: c.milhas, outro: c.outro, valor: c.valor, beneficios, valor_beneficios: vBen, retorno,
      anuidade: efetiva, cheia, economia: cheia !== null && efetiva !== null ? Math.max(0, cheia - efetiva) : null, saldo: efetiva !== null ? retorno - efetiva : null,
      anuidade_maior_que_retorno: efetiva !== null && efetiva > retorno, situacao: k.anuidade_situacao || null, renovacao: n(k.anuidade_mes_renovacao), negociacao: k.anuidade_negociacao || null };
  });
  const somaH = (f) => hoje.reduce((t, x) => t + (n(x[f]) || 0), 0);
  const atual = { cartoes: hoje, milhas: Math.round(somaH('milhas')), anuidade: somaH('anuidade'), valor: somaH('valor'), beneficios: somaH('valor_beneficios'),
    saldo: somaH('retorno') - somaH('anuidade'), economia: somaH('economia') };

  // previsto e realizado: pontos que entraram por programa nos últimos 12 meses (extrato) contra o previsto pela fórmula
  const progDe = (b) => familia(String(b.programa || b.destino_pontos || '').split(/[(;]/)[0]);
  const prev = {}; hoje.filter(x => !x.fora_da_base).forEach(x => { const b = porId[x.catalogo_id], c = conta(b, x.gasto, true); if (c.pontos) prev[progDe(b)] = (prev[progDe(b)] || 0) + c.pontos; });
  const real = {}; extrato.filter(m => ['acumulo', 'clube', 'bonus'].includes(m.tipo) && n(m.quantidade) > 0).forEach(m => { const f = familia(m.programa); real[f] = (real[f] || 0) + n(m.quantidade); });
  const nomeProg = (f) => NOME_FAM[f] || (extrato.find(m => familia(m.programa) === f) || {}).programa || String((base.find(b => progDe(b) === f) || {}).programa || f).split(/[(;]/)[0].trim();
  // só faz sentido comparar quando há extrato lançado
  const realizado = !Object.keys(real).length ? [] : [...new Set([...Object.keys(prev), ...Object.keys(real)])].filter(Boolean).map(f => ({ programa: nomeProg(f), previsto: prev[f] ? Math.round(prev[f]) : null, realizado: real[f] ?? null }));
  const visitasAno = usoSalas.reduce((t, u) => t + (n(u.pessoas) || 1), 0);

  // carteira ideal: fica o cartão rentável ou com papel na estratégia; sai o que não é rentável, não progride e quase não tem benefício
  const rMax = regra(/^Carteira ideal: máximo de cartões/i), rFolga = regra(/^Carteira ideal: folga do limite/i);
  const maxCartoes = rMax && n(rMax.valor) > 0 ? Math.round(n(rMax.valor)) : 6, folga = rFolga && n(rFolga.valor) > 0 ? n(rFolga.valor) : 1.5;
  const cAgora = caminhos.find(c => c.id === escada.agora) || null, cFoco = caminhos.find(c => c.id === escada.foco) || null;
  const naBase = hoje.filter(x => !x.fora_da_base);
  const bandeira = (b) => /visa/i.test(b.bandeira || '') && !/master/i.test(b.bandeira || '') ? 'visa' : /master/i.test(b.bandeira || '') && !/visa/i.test(b.bandeira || '') ? 'master' : null;
  const bPrincipal = cAgora ? porId[cAgora.principal.id] : null;
  // o melhor cartão de sala VIP nos aeroportos do cliente e a reserva sem anuidade de outra bandeira
  const notaSala = (x) => salaInfo(porId[x.catalogo_id], x.gasto).nota;
  const melhorSala = naBase.filter(x => notaSala(x) > 0).sort((a, c) => notaSala(c) - notaSala(a) || (c.saldo ?? -1e9) - (a.saldo ?? -1e9))[0] || null;
  const reserva = naBase.filter(x => x.anuidade === 0 && (!bPrincipal || !bandeira(bPrincipal) || bandeira(porId[x.catalogo_id]) !== bandeira(bPrincipal)) && (!cAgora || x.catalogo_id !== cAgora.principal.id))
    .sort((a, c) => (c.limite || 0) - (a.limite || 0))[0] || null;
  // relacionamento no banco do foco: um cartão só, e nenhum se o principal de agora já é desse banco
  const bancoFoco = cFoco ? chave(cFoco.principal.banco) : null;
  const relacao = bancoFoco && !(cAgora && chave(cAgora.principal.banco) === bancoFoco)
    ? naBase.filter(x => chave(porId[x.catalogo_id].banco) === bancoFoco && x.catalogo_id !== cFoco.principal.id).sort((a, c) => (c.saldo ?? -1e9) - (a.saldo ?? -1e9))[0] || null : null;
  const itens = hoje.map(x => {
    if (x.fora_da_base) return { id: x.id, cartao: x.cartao, acao: 'avaliar', motivos: ['cartão fora da base: confira a anuidade e os benefícios'], limite: x.limite ?? null };
    const b = porId[x.catalogo_id], papel = [], motivos = [];
    if (cAgora && cAgora.principal.id === b.id) papel.push('cartão principal de agora');
    if (cAgora && cAgora.apoio && cAgora.apoio.id === b.id) papel.push('cartão de apoio');
    if (relacao && relacao.id === x.id) papel.push(`relacionamento no ${b.banco}, caminho para o ${cFoco.principal.cartao}`);
    if (cFoco && cFoco.principal.id === b.id) papel.push('é o cartão do foco');
    if (melhorSala && melhorSala.id === x.id) papel.push('melhor sala VIP nos aeroportos do cliente');
    if (reserva && reserva.id === x.id) papel.push('reserva sem anuidade de outra bandeira');
    const rentavel = x.saldo === null ? null : x.saldo >= 0;
    // progride só o que leva ao foco do plano: cartão do mesmo banco do foco
    // (se o principal de agora já é do banco do foco, outro cartão desse banco não leva a nada a mais)
    const progride = !!(bancoFoco && chave(b.banco) === bancoFoco && !(cAgora && chave(cAgora.principal.banco) === bancoFoco && cAgora.principal.id !== b.id));
    // benefício que conta: sala VIP ilimitada nos aeroportos dele (com o gasto mínimo) ou benefício que ele usa de verdade
    const si = salaInfo(b, x.gasto), salaBoa = si.ilimitado && si.cumpre, usaBenef = (x.valor_beneficios || 0) > 0 || (x.beneficios || []).length > 0;
    const beneficio = salaBoa || usaBenef;
    let acao;
    if (papel.length) { acao = rentavel === false ? 'negociar' : 'manter'; motivos.push(...papel); }
    else if (rentavel === false && !progride && !beneficio) { acao = 'cortar'; motivos.push('anuidade maior que o retorno', 'não leva ao cartão do foco', 'quase sem benefício para este cliente'); }
    else if (rentavel === false) { acao = 'negociar'; motivos.push('anuidade maior que o retorno', progride ? `é do banco do foco (${cFoco.principal.cartao})` : salaBoa ? 'tem sala VIP ilimitada nos aeroportos do cliente' : 'tem benefício que o cliente usa'); }
    else if (rentavel && !(x.retorno > 0) && !beneficio) { acao = 'cortar'; motivos.push('não tem anuidade, mas também não rende nada', 'não leva ao cartão do foco'); }
    else { acao = 'manter'; motivos.push(rentavel === null ? 'anuidade não informada' : 'rentável para o cliente'); }
    if (acao === 'negociar') motivos.push('negociar a anuidade para ele passar a se pagar');
    // frase curta para o documento do cliente (sem números)
    const nomeFoco = cFoco ? cFoco.principal.cartao : '';
    let frase = rentavel === null ? '' : 'Rende mais do que custa.';
    if (cFoco && cFoco.principal.id === b.id) frase = 'É o cartão do seu objetivo.';
    else if (cAgora && cAgora.principal.id === b.id) frase = cFoco && cFoco.principal.id !== b.id && chave(cFoco.principal.banco) === chave(b.banco) ? `É o caminho para o ${nomeFoco}.` : 'É o seu cartão principal agora.';
    else if (cAgora && cAgora.apoio && cAgora.apoio.id === b.id) frase = 'Recebe o que passar do limite do cartão principal.';
    else if (relacao && relacao.id === x.id) frase = `Mantém o relacionamento com o ${b.banco} para chegar ao ${nomeFoco}.`;
    else if (melhorSala && melhorSala.id === x.id) frase = 'Dá acesso a sala VIP nos aeroportos que você usa.';
    else if (reserva && reserva.id === x.id) frase = 'Não tem anuidade e fica como reserva.';
    else if (acao === 'negociar') frase = 'A anuidade hoje é maior que o retorno.';
    else if (acao === 'cortar') frase = rentavel && !(x.retorno > 0) ? 'Não rende nada e não faz parte do plano.' : 'Custa mais do que rende e não faz parte do plano.';
    return { id: x.id, cartao: x.cartao, acao, motivos, frase, papel: papel.length > 0, saldo: x.saldo, anuidade: x.anuidade, limite: x.limite ?? null };
  });
  // máximo de cartões: passando do máximo, saem primeiro os sem papel que menos rendem
  const ficam = () => itens.filter(i => i.acao !== 'cortar');
  ficam().filter(i => !i.papel && i.acao !== 'avaliar').sort((a, c) => (a.saldo ?? 0) - (c.saldo ?? 0)).forEach(i => {
    if (ficam().length > maxCartoes) { i.acao = 'cortar'; i.motivos.push(`passa do máximo de ${maxCartoes} cartões e é dos que menos rendem`); i.frase = 'Fica de fora para a carteira ficar enxuta.'; }
  });
  // trava do limite: o que fica precisa cobrir o gasto do mês com a folga
  const limiteNecessario = gasto * folga, somaLim = () => ficam().reduce((t, i) => t + (i.limite || 0), 0);
  const avisosCarteira = [];
  itens.filter(i => i.acao === 'cortar').sort((a, c) => (c.limite || 0) - (a.limite || 0)).forEach(i => {
    if (somaLim() < limiteNecessario) { i.acao = 'negociar'; i.motivos.push('o limite dele faz falta: pedir aumento de limite no principal antes de cortar'); i.frase = 'O limite dele ainda faz falta.'; }
  });
  if (somaLim() < limiteNecessario) avisosCarteira.push(`Os cartões que ficam somam ${brl(somaLim())} de limite e o gasto pede ${brl(limiteNecessario)}: pedir aumento de limite.`);
  if (itens.some(i => i.limite === null)) avisosCarteira.push('Há cartões sem limite informado: a conta do limite pode estar baixa.');
  const carteiraIdeal = { max: maxCartoes, folga, itens, total: itens.length, ficam: ficam().length, limite_que_fica: somaLim(), limite_necessario: limiteNecessario, avisos: avisosCarteira };

  // para escolher bem, falta (a IA transforma em perguntas; o estudo pode ser gerado mesmo assim)
  const falta = [];
  if (!objetivos.length) falta.push('ordem das prioridades do cliente');
  cartoesCli.filter(k => n(k.limite) === null).forEach(k => falta.push(`limite do ${[k.banco, k.categoria].filter(Boolean).join(' ')}`));
  if (objetivos.includes('sala_vip')) {
    if (n(perfil.viagens_nacionais_ano) === null && n(perfil.viagens_internacionais_ano) === null) falta.push('viagens por ano');
    if (n(perfil.pessoas_sala) === null) falta.push('quantas pessoas usam sala VIP junto com o cliente');
    else if (pessoasSala > 0 && n(perfil.pessoas_adicionais) === null) falta.push('quantas dessas pessoas podem ter cartão adicional');
  }
  if (objetivos.includes('cortar_anuidade')) { const sem = cartoesCli.filter(k => !k.anuidade_situacao).length; if (sem) falta.push(`situação da anuidade de ${sem === 1 ? '1 cartão' : sem + ' cartões'}`); }
  if (semGasto.length) falta.push(`gasto por mês de ${semGasto.length === 1 ? '1 cartão' : semGasto.length + ' cartões'} (estimado dividindo o gasto total pelos limites)`);
  faltaValor.forEach(f => falta.push(f));

  return { programa: prefNome, gasto_mes: gasto, bonus_transferencia: bonus, milheiro, aeroporto: perfil.aeroporto_saida, aeroportos, objetivos: objetivos.map(o => ({ chave: o, nome: NOME_OBJ[o] })),
    atual, caminhos, escada, falta, realizado, visitas_sala_ano: visitasAno, carteira_ideal: carteiraIdeal, avisos };
}
