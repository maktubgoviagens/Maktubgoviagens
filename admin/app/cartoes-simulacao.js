// Maktub Go: simulação de caminhos de cartão para o estudo da Gestão (Etapa 5).
// Só fórmulas, sem IA: os números vêm da Base de cartões, das salas, dos segmentos dos bancos,
// das regras da casa (bônus de transferência) e do valor do milheiro. A IA (Etapa 6) só compara e explica.
// Gasto considerado: o gasto total no cartão do perfil, todo como gasto nacional.

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

/* Entrada:
   perfil (cliente_perfil), cartoesCli (cartoes do cliente), base (cartoes_catalogo), salas (cartoes_salas_vip),
   salasAero (salas_aeroportos do aeroporto de saída), bancosCli (cliente_bancos), segmentos (bancos_segmentos),
   regras (regras_estrategia), refs (valor do milheiro por chave de programa), cotacao (dólar), calc (função das contas da base). */
export function simular(E) {
  const { perfil, cartoesCli, base, salas, salasAero, bancosCli, segmentos, regras, refs, cotacao, calc, normProg } = E;
  const gasto = n(perfil.gasto_cartao_mes) || 0;
  const pref = familia(perfil.programa_preferido || perfil.companhia_preferida);
  const prefNome = NOME_FAM[pref] || perfil.programa_preferido || perfil.companhia_preferida || '';
  const avisos = [];
  // bônus de transferência: regra da casa ativa do programa preferido
  const rb = (regras || []).find(r => r.ativa && r.tipo === 'transferencia' && r.aplica_tipo === 'programa' && familia(r.aplica_a) === pref && n(r.valor) !== null);
  const bonus = rb ? n(rb.valor) : 0;
  if (!rb && ['smiles', 'latam', 'azul'].includes(pref)) avisos.push(`Sem bônus de transferência cadastrado para ${prefNome}: pontos de banco contam 1 para 1.`);
  // milheiro de referência do programa preferido
  const kRef = Object.keys(refs || {}).find(k => familia(k) === pref);
  const milheiro = kRef ? refs[kRef] : null;
  if (milheiro === null) avisos.push(`Sem valor do milheiro de ${prefNome || 'programa preferido'}: valor em reais não calculado.`);
  if (!(cotacao > 0)) avisos.push('Sem cotação do dólar na Base de cartões: pontos por dólar não calculados.');
  const porId = Object.fromEntries(base.map(b => [b.id, b]));
  const salasDe = (id) => salas.filter(s => s.catalogo_id === id);
  const meusIds = new Set(cartoesCli.map(k => k.catalogo_id).filter(Boolean));

  // sala VIP do cartão no aeroporto de saída: redes globais do cartão x salas do aeroporto
  const salaNoAeroporto = (b, g) => {
    const S = salasDe(b.id), redes = S.filter(s => s.tipo === 'rede_global');
    const L = (salasAero || []).filter(a => !['restaurante', 'outro'].includes(a.tipo));
    const porRede = REDES.map(([k, rot, re]) => {
      const r = redes.filter(s => re.test(s.rede_ou_sala || '')); if (!r.length) return null;
      const ac = r.some(s => n(s.acessos_titular_ano) === -1) ? -1 : Math.max(0, ...r.map(s => n(s.acessos_titular_ano) || 0));
      return { rede: rot, acessos: ac, salas: L.filter(a => a[k] === true).length };
    }).filter(Boolean);
    const gm = S.filter(s => n(s.gasto_minimo_rs) > 0).map(s => { const f = n(s.gasto_minimo_faturas) || 1, mes = n(s.gasto_minimo_rs) / f; return { sala: s.rede_ou_sala, pede_mes: mes, cumpre: g >= mes }; });
    return { redes: porRede, salas_no_aeroporto: porRede.reduce((t, x) => t + x.salas, 0), ilimitado: porRede.some(x => x.acessos === -1 && x.salas > 0), gasto_minimo: gm };
  };
  // conta de um cartão com um gasto mensal
  const conta = (b, g, jaTem) => {
    const k = calc({ gasto_medio_mes: g }, b, cotacao, refs, normProg), d = destino(b, pref), notas = [], fontes = ['base de cartões'];
    const pts = n(b.pts_nacional) ?? n(b.pontos_por);
    let pontos = null, milhas = 0, valor = null;
    if (d.modo === 'cashback') { valor = k.valor; notas.push('cartão de cashback: retorno em dinheiro, não gera milhas'); }
    else if (pts && g > 0) {
      pontos = b.pontos_moeda === 'BRL' ? g * 12 * pts : cotacao > 0 ? g * 12 * pts / cotacao : null;
      if (pontos !== null) {
        if (d.modo === 'direto') milhas = pontos;
        else if (d.modo === 'transferido') { milhas = pontos * (1 + bonus / 100); if (bonus) fontes.push('regra da casa (bônus de transferência)'); if (d.premissa) notas.push(`considerado que ${/esfera/.test(chave(b.destino_pontos || b.programa)) ? 'Esfera' : 'Livelo'} transfere para ${prefNome}`); }
        else notas.push(d.modo === 'nenhum' ? 'sem programa de pontos' : `os pontos vão para ${d.programa || 'outro programa'}, não para ${prefNome}`);
        if (milheiro !== null) { valor = milhas * milheiro / 1000; fontes.push('valor do milheiro'); }
      }
    } else if (!pts && d.modo !== 'nenhum') notas.push('pontuação não informada na base');
    if (n(b.pts_condicional) === null && b.pts_condicional) notas.push('pontuação com condição: ' + b.pts_condicional);
    if (b.a_confirmar) notas.push('cartão com dados a confirmar na base');
    const sala = salaNoAeroporto(b, g); if (sala.redes.length) fontes.push('salas VIP');
    return { pontos, milhas: Math.round(milhas), valor, anuidade: k.custo, isenta: k.isentaGasto, reduzida: k.reduzida, saldo: valor !== null && k.custo !== null ? valor - k.custo : null, sala, notas, fontes, pedir: podePedir(b, perfil, bancosCli, jaTem) };
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

  // candidatos: os do cliente, os liberados pelos segmentos dele (e o seguinte), os da companhia preferida e os dos bancos dele
  const segIds = new Set(); bancosCli.forEach(x => { const s = segmentos.find(y => y.id === x.segmento_id); if (!s) return; (s.cartoes_ids || []).forEach(i => segIds.add(i));
    const prox = segmentos.filter(y => y.banco === s.banco && n(y.posicao_regua) === n(s.posicao_regua) + 1)[0]; if (prox) (prox.cartoes_ids || []).forEach(i => segIds.add(i)); });
  const bancosNomes = new Set(bancosCli.map(x => chave(x.banco)));
  const elegivel = (b) => b.ativo !== false && (b.vendido_hoje !== false || meusIds.has(b.id));
  let cand = base.filter(b => elegivel(b) && (meusIds.has(b.id) || segIds.has(b.id) || (pref && familia(String(b.programa || b.destino_pontos || '').split(/[(;]/)[0]) === pref) || bancosNomes.has(chave(b.banco))));
  // mais os 8 de melhor saldo no mercado que não pedem convite (para não perder uma rota boa fora dos bancos do cliente)
  const fora = base.filter(b => elegivel(b) && !cand.includes(b) && !b.somente_convite).map(b => ({ b, c: conta(b, gasto, false) })).filter(x => x.c.saldo !== null).sort((a, c) => c.c.saldo - a.c.saldo).slice(0, 8).map(x => x.b);
  cand = cand.concat(fora);

  const caminhos = cand.map(b => ({ id: b.id, cartao: `${b.banco} ${b.nome}`.trim(), ja_tem: meusIds.has(b.id), somente_convite: !!b.somente_convite, fora_dos_bancos: fora.includes(b), degrau: degrau(b), ...conta(b, gasto, meusIds.has(b.id)) }))
    .sort((a, c) => (c.saldo ?? -Infinity) - (a.saldo ?? -Infinity));

  // carteira de hoje: cada cartão com o gasto dele
  const hoje = cartoesCli.map(k => { const b = porId[k.catalogo_id]; if (!b) return { cartao: [k.banco, k.categoria].filter(Boolean).join(' '), fora_da_base: true };
    const g = n(k.gasto_medio_mes) || 0, c = conta(b, g, true); return { cartao: `${b.banco} ${b.nome}`.trim(), gasto: g, milhas: c.milhas, valor: c.valor, anuidade: c.anuidade, saldo: c.saldo }; });
  const soma = (k) => hoje.reduce((t, x) => t + (n(x[k]) || 0), 0);
  const atual = { cartoes: hoje, milhas: Math.round(soma('milhas')), anuidade: soma('anuidade'), valor: milheiro !== null ? soma('valor') : null, saldo: milheiro !== null ? soma('valor') - soma('anuidade') : null };

  return { programa: prefNome, gasto_mes: gasto, bonus_transferencia: bonus, milheiro, aeroporto: perfil.aeroporto_saida, atual, caminhos, avisos };
}
