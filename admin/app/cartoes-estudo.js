// IA de cartões, Etapa 6: estudo com IA na ficha do cliente (só a equipe vê).
// A IA (função estrategia-cartoes do Supabase) só escolhe, compara e explica caminhos da simulação.
// Os números mostrados aqui vêm sempre da simulação guardada no estudo ("entrada"), nunca do texto da IA.

const ACAO = { manter: 'Manter', concentrar_gasto: 'Concentrar o gasto', negociar_anuidade: 'Negociar a anuidade', pedir_upgrade: 'Pedir upgrade',
  cancelar_depois_de_negociar: 'Cancelar, depois de negociar', manter_como_reserva: 'Manter como reserva', avaliar: 'Avaliar' };
const STATUS = { gerando: 'gerando', rascunho: 'rascunho', publicado: 'publicado', arquivado: 'arquivado', erro: 'não gerado' };
const CONF = { alta: 'alta', media: 'média', baixa: 'baixa' };
const n = (v) => v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v);
const brl = (v) => v === null || v === undefined ? 'não calculado' : (v < 0 ? '−' : '') + 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR');
// o estudo com IA ficou guardado: a decisão sai da simulação e o texto do cliente sai dos modelos aprovados.
// Os estudos já gerados continuam visíveis. Para voltar a gerar, troque para true.
const GERAR_COM_IA = false;
const dataHora = (s) => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };

// o que vai para a IA: a simulação já calculada (com códigos C1, C2...), sem nome do cliente nem dados do gerente
export function montarEntrada(ctx, R) {
  const p = ctx.perfil || {}, segPorId = Object.fromEntries((ctx.segs || []).map(s => [s.id, s]));
  const salaTxt = (s) => !s.redes.length ? 'sem rede de sala VIP' : s.redes.map(r => `${r.rede} ${r.acessos === -1 ? 'ilimitado' : r.acessos ? r.acessos + ' por ano' : 'pago'} (${r.por.map(x => `${x.salas} em ${x.aeroporto}${x.a_confirmar ? `, ${x.a_confirmar} a confirmar` : ''}`).join('; ')})`).join('; ');
  const parte = (x) => x && ({ cartao: x.cartao, gasto_mes: Math.round(x.gasto_mes), limite: x.limite, limite_estimado: !!x.limite_estimado, milhas_ano: x.milhas, anuidade: x.anuidade, anuidade_isenta_pelo_gasto: !!x.isenta,
    pontos_em_outro_programa: x.outro ? { programa: x.outro.programa, pontos: x.outro.pontos, valor: x.outro.valor } : null, salas_vip: salaTxt(x.sala), gasto_minimo_sala: (x.sala.gasto_minimo || []).map(g => ({ sala: g.sala, pede_por_mes: Math.round(g.pede_mes), cumpre: g.cumpre })) });
  // os 20 primeiros pela ordem das prioridades, mais os degraus "agora" e "foco" da escada se ficarem de fora
  const L = R.caminhos.slice(0, 20); [R.escada.agora, R.escada.foco, R.escada.a_confirmar].forEach(id => { const c = R.caminhos.find(x => x.id === id); if (c && !L.includes(c)) L.push(c); });
  const cod = Object.fromEntries(L.map((c, i) => [c.id, 'C' + (i + 1)]));
  return {
    hoje: new Date().toLocaleDateString('sv-SE'),
    perfil: { aeroporto_saida: p.aeroporto_saida, aeroportos_frequentes: p.aeroportos_frequentes || [], companhia_preferida: p.companhia_preferida, programa_preferido: p.programa_preferido,
      viagens_nacionais_ano: p.viagens_nacionais_ano, viagens_internacionais_ano: p.viagens_internacionais_ano, pessoas_viagem: p.pessoas_viagem, pessoas_sala: p.pessoas_sala, pessoas_adicionais: p.pessoas_adicionais,
      quer_executiva: p.quer_executiva, gasto_cartao_mes: p.gasto_cartao_mes, pix_credito_mes: p.pix_credito_mes, faixa_renda: p.faixa_renda, observacao_interna: p.observacao_interna || null,
      prioridades_em_ordem: R.objetivos.map(o => o.nome) },
    bancos: (ctx.bancos || []).map(b => ({ banco: b.banco, segmento: (segPorId[b.segmento_id] || {}).segmento || b.segmento_txt || null, correntista_desde: b.correntista_desde,
      faixa_investimento: b.faixa_investimento, recebe_salario: b.recebe_salario, movimenta_pj: b.movimenta_pj, observacao_interna: b.observacao_interna || null })),
    carteira: R.atual.cartoes.map(k => ({ cartao: k.cartao, fora_da_base: !!k.fora_da_base, gasto_mes: k.gasto ?? null, gasto_estimado_pelo_limite: !!k.gasto_estimado, limite: k.limite ?? null, milhas_ano: k.milhas ?? null,
      pontos_em_outro_programa: k.outro ? { programa: k.outro.programa, pontos: k.outro.pontos } : null, valor_pontos: k.valor ?? null, beneficios_usados: (k.beneficios || []).map(b => ({ beneficio: b.descricao, valor_ano: b.valor })),
      retorno: k.retorno ?? null, anuidade: k.anuidade ?? null, anuidade_cheia: k.cheia ?? null, economia_ano: k.economia ?? null, anuidade_maior_que_retorno: !!k.anuidade_maior_que_retorno,
      situacao_anuidade: k.situacao || null, mes_renovacao: k.renovacao || null, negociacao: k.negociacao || null })),
    carteira_total: { milhas_ano: R.atual.milhas, anuidade: R.atual.anuidade, valor_pontos: R.atual.valor, beneficios: R.atual.beneficios, saldo: R.atual.saldo, economia_ano: R.atual.economia },
    previsto_e_realizado_12_meses: R.realizado, visitas_sala_vip_no_ano: R.visitas_sala_ano,
    premissas: { programa: R.programa, gasto_mes_nacional: R.gasto_mes, bonus_transferencia_pct: R.bonus_transferencia, milheiro_referencia: R.milheiro, aeroportos: R.aeroportos, avisos: R.avisos },
    falta_para_escolher_bem: R.falta,
    escada: { agora: cod[R.escada.agora] || null, foco: cod[R.escada.foco] || null, melhor_mas_com_dados_a_confirmar: cod[R.escada.a_confirmar] || null, proximo_passo: R.escada.passos },
    caminhos: L.map(c => ({ codigo: cod[c.id], cartao: c.principal.cartao + (c.apoio ? ' + ' + c.apoio.cartao : ''), principal: parte(c.principal), apoio: parte(c.apoio), gasto_sem_cartao_mes: Math.round(c.sem_cartao),
      ja_tem: c.ja_tem, da_para_pedir: c.pedir.r, motivo_pedir: c.pedir.motivo || null, somente_convite: c.somente_convite, fora_dos_bancos_do_cliente: c.fora_dos_bancos, dados_a_confirmar: c.dados_a_confirmar,
      milhas_ano: c.milhas, anuidade: c.anuidade, anuidade_isenta_pelo_gasto: c.anuidade === 0 && !!c.principal.isenta, valor: c.valor, saldo: c.saldo,
      salas_vip: salaTxt(c.sala), sala_ilimitada_com_gasto_minimo_cumprido: !!(c.sala.ilimitado && c.sala.cumpre), adicionais_com_acesso_proprio: c.sala.adicionais, convidados_por_ano: c.sala.convidados,
      nota_pelas_prioridades: c.nota ?? null, avisos: c.avisos, degrau: c.degrau || null, notas: c.notas, fontes: c.fontes })),
    regras: (ctx.simDados.regras || []).filter(r => r.ativa !== false).map(r => ({ titulo: r.titulo, regra: r.regra, tipo: r.tipo, status: r.status, aplica_tipo: r.aplica_tipo, aplica_a: r.aplica_a, valor: r.valor })),
    diagnostico: ctx.diag && Object.values(ctx.diag).some(Boolean) ? ctx.diag : null,
  };
}

export async function desenharEstudo(ctx, R) {
  const { X } = ctx, { sb, esc } = X, box = ctx.el.querySelector('#cxEstudo');
  if (!box) return;
  if (!ctx.estudos) {
    const r = await sb.from('estudos_cartoes').select('*').eq('cliente_id', ctx.c.id).order('criado_em', { ascending: false });
    if (!box.isConnected) return;
    if (r.error) { box.innerHTML = '<div class="secao">Estudo com IA</div><section class="bloco" style="margin-top:0">' + X.tec('<div class="config">Rode no Supabase o 69-estudos-cartoes.sql para ativar o estudo com IA.</div>') + '</section>'; return; }
    ctx.estudos = r.data || [];
  }
  const L = ctx.estudos, aberto = L.find(e => e.id === ctx.estudoAberto) || L.find(e => e.status !== 'arquivado' && e.status !== 'erro') || null;
  const podeGerar = GERAR_COM_IA && !!R && R.caminhos.length > 0;
  if (!GERAR_COM_IA && !L.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="secao">${GERAR_COM_IA ? 'Estudo com IA' : 'Estudos com IA anteriores'}</div><section class="bloco" style="margin-top:0">
    ${!GERAR_COM_IA ? '' : podeGerar ? `<button class="zap" type="button" id="esGerar" style="width:100%">Gerar estudo com IA</button>
      <div class="sub" style="font-size:13px">A IA lê a simulação acima, as regras da casa e o perfil, escolhe o melhor caminho e explica. Leva cerca de 1 minuto e custa em torno de R$ 2 por estudo. O estudo nasce como rascunho e o cliente não vê.</div>`
      : '<div class="vazio">Complete o que falta no perfil para gerar o estudo.</div>'}
    <div id="esCorpo">${aberto ? corpo(aberto, esc) : (L.length ? '' : '<div class="vazio" style="margin-top:8px">Nenhum estudo gerado para este cliente.</div>')}</div>
    ${L.length > (aberto ? 1 : 0) ? `<details style="margin-top:10px"><summary class="sub" style="cursor:pointer">Todos os estudos (${L.length})</summary>
      ${L.map(e => `<div class="lin"><span>${dataHora(e.criado_em)} · ${esc(STATUS[e.status] || e.status)}${e.erro ? `<small style="display:block;color:var(--alerta);font-size:13px">${esc(e.erro)}</small>` : ''}</span>
        <span>${e.saida ? `<button class="mini" data-esv="${e.id}">${e.id === (aberto || {}).id ? 'aberto' : 'ver'}</button>` : ''}</span></div>`).join('')}</details>` : ''}
  </section>`;
  box.querySelectorAll('[data-esv]').forEach(b => b.onclick = () => { ctx.estudoAberto = b.dataset.esv; desenharEstudo(ctx, R); });
  const arq = box.querySelector('#esArquivar');
  if (arq) arq.onclick = async () => {
    if (arq.dataset.ok !== '1') { arq.dataset.ok = '1'; arq.textContent = 'Confirmar: arquivar'; return; }
    const { error } = await sb.from('estudos_cartoes').update({ status: 'arquivado', atualizado_por: X.D.meuId || null, atualizado_em: new Date().toISOString() }).eq('id', aberto.id);
    if (error) { X.aviso('Não arquivou: ' + X.limparTec(error.message)); return; }
    aberto.status = 'arquivado'; ctx.estudoAberto = null; X.aviso('Estudo arquivado.'); desenharEstudo(ctx, R);
  };
  const g = box.querySelector('#esGerar');
  if (g) g.onclick = async () => {
    if (g.dataset.ok !== '1') { g.dataset.ok = '1'; g.textContent = 'Confirmar: gerar estudo (cerca de R$ 2)'; return; }
    g.disabled = true; g.textContent = 'Gerando o estudo, leva cerca de 1 minuto...';
    const { data, error } = await sb.functions.invoke('estrategia-cartoes', { body: { cliente_id: ctx.c.id, entrada: montarEntrada(ctx, R) } });
    let msg = data && data.erro;
    if (!msg && error && error.context && error.context.status === 404) msg = 'A função estrategia-cartoes ainda não está publicada no Supabase.';
    if (!msg && error && error.context && typeof error.context.json === 'function') { try { msg = (await error.context.json()).erro; } catch (_) { /* segue */ } }
    ctx.estudos = null; ctx.estudoAberto = data && data.estudo ? data.estudo.id : null;
    if (msg || error || !data || !data.estudo) X.aviso(msg || 'O estudo não foi gerado. Tente de novo.'); else X.aviso('Estudo gerado como rascunho.');
    if (box.isConnected) desenharEstudo(ctx, R);
  };
}

function corpo(e, esc) {
  const s = e.saida || {}, E = e.entrada || {}, cam = Object.fromEntries((E.caminhos || []).map(c => [c.codigo, c]));
  // se a IA citar um código de caminho no texto, mostra o nome do cartão
  const esc0 = esc; esc = (t) => esc0(String(t ?? '').replace(/\bC(\d{1,2})\b/g, (m) => cam[m] ? cam[m].cartao : m));
  const parteTxt = (x, rot) => x ? `<div style="font-size:13px;color:var(--tinta-2)">${rot}: ${esc(x.cartao)} com ${brl(x.gasto_mes)}/mês${x.limite !== null && x.limite !== undefined ? ` (limite ${brl(x.limite)}${x.limite_estimado ? ', estimado' : ''})` : ''}</div>` : '';
  const nums = (c) => !c ? '' : `<div style="font-size:14px;margin-top:2px">${(c.milhas_ano || 0).toLocaleString('pt-BR')} milhas/ano · anuidade ${c.anuidade === 0 ? (c.anuidade_isenta_pelo_gasto ? 'isenta pelo gasto' : 'grátis') : brl(c.anuidade)} · vale ${brl(c.valor)} · <b style="font-weight:600">saldo ${brl(c.saldo)}</b></div>
    ${c.principal ? parteTxt(c.principal, 'Principal') + parteTxt(c.apoio, 'Apoio') : ''}${c.gasto_sem_cartao_mes ? `<div style="font-size:13px;color:var(--alerta)">Sem cartão: ${brl(c.gasto_sem_cartao_mes)}/mês</div>` : ''}
    <div style="font-size:13px;color:var(--tinta-3)">${esc(c.salas_vip)}</div>${(c.avisos || []).length ? `<div style="font-size:13px;color:var(--alerta);line-height:1.5">${c.avisos.map(esc).join('<br>')}</div>` : ''}`;
  const fontes = (f) => f && f.length ? `<div style="font-size:13px;color:var(--tinta-3);margin-top:2px">Fontes: ${esc(f.join(', '))}</div>` : '';
  const lista = (t, L) => L && L.length ? `<div style="margin-top:12px"><b style="font-weight:600">${t}</b><ul style="margin:4px 0 0 18px;padding:0;font-size:16px;line-height:1.5">${L.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
  const rec = cam[(s.recomendado || {}).caminho];
  return `<div style="margin-top:12px;font-size:13px;color:var(--tinta-3)">Estudo de ${dataHora(e.criado_em)} · <span class="tag ${e.status === 'rascunho' ? 'ouro' : ''}">${esc(STATUS[e.status] || e.status)}</span> · confiança ${esc(CONF[s.confianca] || s.confianca || '')}</div>
    ${(s.conferir || []).length ? `<div style="margin-top:8px;padding:8px 12px;border:1px solid var(--alerta);font-size:13px;color:var(--alerta)"><b style="font-weight:600">Conferir antes de usar</b><br>${s.conferir.map(esc).join('<br>')}</div>` : ''}
    <div style="margin-top:10px"><b style="font-weight:600">Objetivo</b><div style="font-size:16px">${esc(s.objetivo)}</div></div>
    <div style="margin-top:10px"><b style="font-weight:600">Estratégia</b><div style="font-size:16px;line-height:1.5">${esc(s.resumo)}</div></div>
    <div style="margin-top:12px;padding:10px 12px;background:var(--creme-2)"><span class="tag ok">recomendado</span> <b style="font-weight:600">${esc(rec ? rec.cartao : (s.recomendado || {}).caminho)}</b>${nums(rec)}
      <div style="font-size:16px;margin-top:6px;line-height:1.5">${esc((s.recomendado || {}).por_que)}</div>${fontes((s.recomendado || {}).fontes)}</div>
    ${(s.alternativas || []).map(a => { const c = cam[a.caminho]; return `<div style="border-top:1px solid var(--linha);padding:10px 0"><span class="tag">alternativa</span> <b style="font-weight:600">${esc(c ? c.cartao : a.caminho)}</b>${nums(c)}
      <div style="font-size:16px;margin-top:4px;line-height:1.5">${esc(a.quando_faz_sentido)}</div>${fontes(a.fontes)}</div>`; }).join('')}
    ${(s.carteira_atual || []).length ? `<div style="margin-top:12px"><b style="font-weight:600">Carteira de hoje</b>${s.carteira_atual.map(k => `<div style="border-top:1px solid var(--linha);padding:8px 0">
      <b style="font-weight:600">${esc(k.cartao)}</b> <span class="tag ouro">${esc(ACAO[k.acao] || k.acao)}</span><div style="font-size:16px;line-height:1.5">${esc(k.motivo)}</div>${fontes(k.fontes)}</div>`).join('')}</div>` : ''}
    ${lista('Próximos passos da equipe', s.passos)}${lista('Riscos', s.riscos)}${lista('Perguntas ao cliente', s.perguntas_ao_cliente)}${lista('Regras da casa usadas', s.regras_usadas)}
    ${s.motivo_confianca ? `<div style="margin-top:10px;font-size:13px;color:var(--tinta-3)">Confiança ${esc(CONF[s.confianca] || '')}: ${esc(s.motivo_confianca)}</div>` : ''}
    <div class="sub" style="font-size:13px;margin-top:10px">Estudo interno: o cliente não vê. Os números vêm da simulação por fórmula do dia do estudo; o texto é da IA e precisa ser conferido. Valor de referência, que varia conforme o resgate. Não é saldo em dinheiro. A aprovação de cartão, limite e upgrade depende do banco.</div>
    ${e.status !== 'arquivado' ? '<button class="mini" type="button" id="esArquivar" style="margin-top:8px">Arquivar este estudo</button>' : ''}`;
}
