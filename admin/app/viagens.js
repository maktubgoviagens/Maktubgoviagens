// Maktub Go: viagens e roteiros do cliente da Gestão (ficha do app) e subida automática das emissões para o painel.
// Toda emissão de passagem de um cliente da Gestão vira viagem e voos no painel dele; mudança de data, horário ou
// localizador atualiza o painel e gera uma novidade (o sino do painel). Roteiros só aparecem depois de publicados.

const dataBR = (d) => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '';
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const normNome = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const hhmm = (h) => h ? String(h).slice(0, 5) : null;
const ehPassagem = (e) => /passag/i.test(String(e.servico || e.produto || '')) && !!e.data_ida;

// emissões de passagem em que o cliente é o comprador ou um dos passageiros (pelo cadastro do CRM)
export function emissoesDoCliente(X, c) {
  const pf = (X.D.pessoas || []).find(p => p.cliente_id === c.id);
  if (!pf) return [];
  return X.CRM.emissoesDe(X.D, pf.id).filter(e => ehPassagem(e) && !X.B2B.ehAjuste(e) && !X.B2B.ehCancelada(e, X.D));
}
// trechos da emissão: os voos registrados no fechamento; sem eles, ida e volta da própria emissão
function trechosDe(X, e) {
  const R = ((X.D.trechos || {})[String(e.id)] || []).slice().sort((a, b) => a.n - b.n);
  if (R.length) return R.map(r => ({ n: r.n, origem: r.origem, destino: r.destino, data: r.data, hora: hhmm(r.hora) }));
  const h = (X.D.horas || {})[String(e.id)] || {};
  const L = [{ n: 1, origem: e.origem, destino: e.destino, data: String(e.data_ida).slice(0, 10), hora: hhmm(h.hora_ida) }];
  if (e.data_volta) L.push({ n: 2, origem: e.destino, destino: e.origem, data: String(e.data_volta).slice(0, 10), hora: hhmm(h.hora_volta) });
  return L;
}
const cidade = (X, cod) => X.cidadeDe(cod) || String(cod || '').toUpperCase();
const linhaViagem = (X, c, e) => ({ cliente_id: c.id, emissao_id: String(e.id), destino: cidade(X, e.destino) || 'Viagem', data_viagem: String(e.data_ida).slice(0, 10),
  data_retorno: e.data_volta ? String(e.data_volta).slice(0, 10) : null, status: 'emitida', detalhes: [e.cia, e.localizador ? 'localizador ' + e.localizador : ''].filter(Boolean).join(' · ') || null });
const linhaVoo = (X, c, e, t, viagemId) => ({ cliente_id: c.id, viagem_id: viagemId, emissao_id: String(e.id), emissao_trecho: t.n, status: 'confirmado', data_voo: t.data,
  hora_partida: t.hora || null, origem_codigo: String(t.origem || '').toUpperCase() || null, origem_cidade: cidade(X, t.origem) || null,
  destino_codigo: String(t.destino || '').toUpperCase() || null, destino_cidade: cidade(X, t.destino) || null, companhia: e.cia || null, localizador: e.localizador || null, passageiros: e.passageiros || null });

// novidade no painel do cliente; a chave impede repetir a mesma novidade
async function novidade(X, cid, chave, tipo, titulo, texto, link) {
  const { error } = await X.sb.from('painel_novidades').insert({ cliente_id: cid, chave, tipo, titulo, texto: texto || null, link: link || null });
  return !error || /duplicate|23505/.test(error.message || '') ? null : error;
}

// sobe para o painel as emissões dos clientes da Gestão (todas de uma vez, ou só a de um cliente)
export async function sincronizar(X, so) {
  const clientes = (so ? [so] : (X.D.clientes || [])).map(c => ({ c, E: emissoesDoCliente(X, c) })).filter(x => x.E.length);
  if (!clientes.length) return { novas: 0, mudancas: 0 };
  await X.carregarAero();
  const ids = clientes.map(x => x.c.id);
  const [vg, vo] = await Promise.all([
    X.sb.from('viagens').select('id,cliente_id,emissao_id,data_viagem,data_retorno').in('cliente_id', ids).not('emissao_id', 'is', null),
    X.sb.from('voos').select('id,cliente_id,emissao_id,emissao_trecho,data_voo,hora_partida,origem_codigo,destino_codigo,localizador').in('cliente_id', ids).not('emissao_id', 'is', null)
  ]);
  if (vg.error || vo.error) throw new Error((vg.error || vo.error).message);
  let novas = 0, mudancas = 0;
  for (const { c, E } of clientes) {
    for (const e of E) {
      const T = trechosDe(X, e).filter(t => t.data);
      let v = (vg.data || []).find(x => x.cliente_id === c.id && x.emissao_id === String(e.id));
      const lv = linhaViagem(X, c, e), futura = lv.data_viagem >= hoje();
      if (!v) {
        const r = await X.sb.from('viagens').insert(lv).select('id,cliente_id,emissao_id,data_viagem,data_retorno').single();
        if (r.error) { if (/duplicate|23505/.test(r.error.message)) continue; throw new Error(r.error.message); }
        v = r.data; (vg.data = vg.data || []).push(v); novas++;
        // viagem antiga entra no histórico do painel sem virar novidade
        if (futura) await novidade(X, c.id, 'viagem:' + e.id, 'viagem', `Nova viagem no seu painel: ${lv.destino}`, `Ida em ${dataBR(lv.data_viagem)}${lv.data_retorno ? ', volta em ' + dataBR(lv.data_retorno) : ''}.`, '#viagens');
      } else if (v.data_viagem !== lv.data_viagem || (v.data_retorno || null) !== lv.data_retorno) {
        const r = await X.sb.from('viagens').update({ data_viagem: lv.data_viagem, data_retorno: lv.data_retorno }).eq('id', v.id);
        if (r.error) throw new Error(r.error.message);
        Object.assign(v, { data_viagem: lv.data_viagem, data_retorno: lv.data_retorno }); mudancas++;
        if (futura) await novidade(X, c.id, `viagem:${e.id}:${lv.data_viagem}:${lv.data_retorno || ''}`, 'viagem', `Sua viagem para ${lv.destino} mudou de data`, `Agora: ida em ${dataBR(lv.data_viagem)}${lv.data_retorno ? ', volta em ' + dataBR(lv.data_retorno) : ''}.`, '#viagens');
      }
      for (const t of T) {
        const lf = linhaVoo(X, c, e, t, v.id), f = (vo.data || []).find(x => x.emissao_id === String(e.id) && Number(x.emissao_trecho) === t.n);
        if (!f) {
          const r = await X.sb.from('voos').insert(lf);
          if (r.error && !/duplicate|23505/.test(r.error.message)) throw new Error(r.error.message);
          continue;
        }
        const mudou = f.data_voo !== lf.data_voo || hhmm(f.hora_partida) !== lf.hora_partida || f.origem_codigo !== lf.origem_codigo || f.destino_codigo !== lf.destino_codigo || (f.localizador || null) !== lf.localizador;
        if (!mudou) continue;
        const up = { data_voo: lf.data_voo, hora_partida: lf.hora_partida, origem_codigo: lf.origem_codigo, origem_cidade: lf.origem_cidade, destino_codigo: lf.destino_codigo, destino_cidade: lf.destino_cidade, localizador: lf.localizador };
        const r = await X.sb.from('voos').update(up).eq('id', f.id);
        if (r.error) throw new Error(r.error.message);
        Object.assign(f, up); mudancas++;
        if (lf.data_voo >= hoje()) await novidade(X, c.id, `voo:${e.id}:${t.n}:${lf.data_voo}:${lf.hora_partida || ''}:${lf.localizador || ''}`, 'voo',
          `Seu voo ${lf.origem_codigo} para ${lf.destino_codigo} foi atualizado`, `${dataBR(lf.data_voo)}${lf.hora_partida ? ' às ' + lf.hora_partida : ''}${lf.localizador ? ' · localizador ' + lf.localizador : ''}.`, '#viagens');
      }
    }
  }
  return { novas, mudancas };
}

/* ---------------- ficha do cliente: aba Viagens ---------------- */
export async function fichaViagens(el, c, X) {
  const { sb, esc, aviso } = X;
  el.innerHTML = '<div class="vazio" style="margin-top:14px">Carregando as viagens...</div>';
  let erroSync = '';
  try { await sincronizar(X, c); } catch (e) { erroSync = String(e.message || e); }
  const [vg, vo] = await Promise.all([sb.from('viagens').select('*').eq('cliente_id', c.id).order('data_viagem'), sb.from('voos').select('*').eq('cliente_id', c.id).order('data_voo')]);
  if (!el.isConnected) return;
  if (vg.error) { el.innerHTML = `<div class="vazio">${esc(X.limparTec('Não carregou as viagens: ' + vg.error.message))}</div>`; return; }
  const V = vg.data || [], F = vo.data || [], hj = hoje();
  const prox = V.filter(v => String(v.data_retorno || v.data_viagem) >= hj), passadas = V.filter(v => String(v.data_retorno || v.data_viagem) < hj).reverse();
  const semCrm = !(X.D.pessoas || []).some(p => p.cliente_id === c.id);
  const card = (v) => {
    const fs = F.filter(f => String(f.viagem_id) === String(v.id));
    return `<article class="card" style="margin-bottom:8px">
      <div class="cab"><div><div class="nome">${esc(v.destino || 'Viagem')}${v.destino_complemento ? ' <em>' + esc(v.destino_complemento) + '</em>' : ''}</div>
        <span class="tag ${v.status === 'emitida' ? 'ok' : 'ouro'}">${esc({ emitida: 'Emitida', planejamento: 'Planejamento', estrategia: 'Estratégia' }[v.status] || v.status || '')}</span>${v.emissao_id ? ' <span class="tag">veio da emissão</span>' : ''}</div>
        <span class="quando">${dataBR(v.data_viagem)}${v.data_retorno ? ' a ' + dataBR(v.data_retorno) : ''}</span></div>
      ${fs.length ? `<div class="info">${fs.map(f => `<div>${esc(dataBR(f.data_voo))}${f.hora_partida ? ' ' + esc(hhmm(f.hora_partida)) : ''} · ${esc(f.origem_codigo || '')} → ${esc(f.destino_codigo || '')}${f.companhia ? ' · ' + esc(f.companhia) : ''}${f.localizador ? ' · <b>' + esc(f.localizador) + '</b>' : ''}</div>`).join('')}</div>` : ''}
      ${v.detalhes && !v.emissao_id ? `<div class="info"><div>${esc(v.detalhes)}</div></div>` : ''}
    </article>`;
  };
  el.innerHTML = `
    <div class="sub" style="margin-top:12px">Tudo o que está aqui aparece na aba Viagens do painel do cliente. Emissão registrada no app para este cliente sobe sozinha, com os voos, e o cliente recebe uma novidade no painel.</div>
    ${semCrm ? '<div class="config" style="margin-top:10px">Esta ficha ainda não está ligada ao cadastro do cliente no CRM. Sem a ligação, as emissões dele não sobem sozinhas para o painel.</div>' : ''}
    ${erroSync ? `<div class="config" style="margin-top:10px">${esc(X.limparTec(/emissao_id|painel_novidades/.test(erroSync) ? X.tec('Rode o 62-viagens-roteiros-novidades.sql no Supabase.') : 'A subida automática falhou: ' + erroSync))}</div>` : ''}
    <div class="secao">Próximas viagens · ${prox.length}</div>
    ${prox.length ? prox.map(card).join('') : '<div class="vazio">Nenhuma viagem marcada.</div>'}
    ${passadas.length ? `<details style="margin-top:14px"><summary class="sub" style="cursor:pointer">Viagens feitas · ${passadas.length}</summary><div style="margin-top:8px">${passadas.map(card).join('')}</div></details>` : ''}
    <div class="acoes" style="display:flex;gap:8px;margin-top:14px"><a class="sec" style="flex:1" href="${X.adminLink(c.id, 'viagens')}">Editar viagens na Administração</a></div>`;
  if (erroSync && !/emissao_id|painel_novidades/.test(erroSync)) aviso('A subida automática falhou. Tente de novo em instantes.');
}

/* ---------------- ficha do cliente: aba Roteiros ---------------- */
export async function fichaRoteiros(el, c, X) {
  const { sb, esc, aviso } = X;
  el.innerHTML = '<div class="vazio" style="margin-top:14px">Carregando os roteiros...</div>';
  const r = await sb.from('roteiros').select('*').order('criado_em', { ascending: false });
  if (!el.isConnected) return;
  if (r.error) { el.innerHTML = `<div class="vazio" style="margin-top:14px">${esc(X.limparTec(/cliente_id|publicado_painel/.test(r.error.message) ? X.tec('Rode o 62-viagens-roteiros-novidades.sql no Supabase.') : 'Não carregou os roteiros: ' + r.error.message))}</div>`; return; }
  const R = (r.data || []).filter(x => x.tipo !== 'proposta');
  const meus = R.filter(x => x.cliente_id === c.id);
  // sugestão: roteiros guardados no Acervo com o nome deste cliente e ainda sem cliente ligado
  const nome = normNome(c.nome_completo), partes = nome.split(' '), curto = partes.length > 1 ? partes[0] + ' ' + partes[partes.length - 1] : nome;
  const sug = R.filter(x => !x.cliente_id && x.cliente && (normNome(x.cliente).includes(curto) || normNome(x.cliente) === partes[0] + ' ' + (partes[1] || '')));
  const linha = (x, ligado) => `<article class="card" style="margin-bottom:8px">
      <div class="cab"><div><div class="nome">${esc(x.titulo || 'Roteiro')}</div>${ligado ? (x.publicado_painel ? '<span class="tag ok">no painel do cliente</span>' : '<span class="tag ouro">ainda não publicado</span>') : ''}</div>
        <span class="quando">${x.dias ? x.dias + (Number(x.dias) === 1 ? ' dia' : ' dias') : ''}</span></div>
      <div class="info">${[['Destino', x.destino], ['No Acervo como', x.cliente]].filter(y => y[1]).map(([k, v]) => `<div><span>${k}:</span> ${esc(v)}</div>`).join('')}</div>
      <div class="acoes">${x.arquivo_path || x.link ? `<button class="sec" data-rt-ver="${x.id}">Abrir</button>` : ''}
        ${ligado ? (x.publicado_painel ? `<button class="sec" data-rt-pub="${x.id}" data-v="0">Tirar do painel</button>` : `<button class="zap" data-rt-pub="${x.id}" data-v="1">Conferi, publicar no painel</button>`) + `<button class="sec" data-rt-lig="${x.id}" data-v="0">Desligar</button>`
          : `<button class="zap" data-rt-lig="${x.id}" data-v="1">Ligar a ${esc(String(c.nome_completo || '').split(' ')[0])}</button>`}</div>
    </article>`;
  el.innerHTML = `
    <div class="sub" style="margin-top:12px">Roteiros do Acervo ligados a este cliente. O roteiro só aparece na aba Roteiros do painel depois que a equipe confere e publica.</div>
    <div class="secao">Roteiros do cliente · ${meus.length}</div>
    ${meus.length ? meus.map(x => linha(x, true)).join('') : '<div class="vazio">Nenhum roteiro ligado ainda.</div>'}
    ${sug.length ? `<div class="secao">Encontrados no Acervo com o nome dele · ${sug.length}</div>${sug.map(x => linha(x, false)).join('')}` : ''}
    <div class="sub" style="margin-top:12px">Para guardar um roteiro novo, use o Acervo de viagens e escreva o nome do cliente: ele aparece aqui para ligar.</div>`;
  const achar = (id) => R.find(x => String(x.id) === String(id));
  el.querySelectorAll('[data-rt-lig]').forEach(b => b.onclick = async () => {
    const x = achar(b.dataset.rtLig), liga = b.dataset.v === '1';
    const up = liga ? { cliente_id: c.id } : { cliente_id: null, publicado_painel: false };
    const { error } = await sb.from('roteiros').update(up).eq('id', x.id);
    if (error) { aviso('Não salvou: ' + error.message); return; }
    aviso(liga ? 'Roteiro ligado. Confira e publique quando estiver pronto.' : 'Roteiro desligado deste cliente.'); fichaRoteiros(el, c, X);
  });
  el.querySelectorAll('[data-rt-pub]').forEach(b => b.onclick = async () => {
    const x = achar(b.dataset.rtPub), pub = b.dataset.v === '1';
    const { error } = await sb.from('roteiros').update({ publicado_painel: pub, publicado_em: pub ? new Date().toISOString() : null }).eq('id', x.id);
    if (error) { aviso('Não salvou: ' + error.message); return; }
    if (pub) await novidade(X, c.id, 'roteiro:' + x.id, 'roteiro', `Novo roteiro no seu painel: ${x.titulo || x.destino || 'roteiro'}`, x.destino ? `Destino: ${x.destino}.` : '', '#roteiros');
    aviso(pub ? 'Publicado. O cliente vê o roteiro e recebe uma novidade no painel.' : 'Roteiro tirado do painel.'); fichaRoteiros(el, c, X);
  });
  el.querySelectorAll('[data-rt-ver]').forEach(b => b.onclick = async () => {
    const x = achar(b.dataset.rtVer);
    if (!x.arquivo_path) { window.open(x.link, '_blank', 'noopener'); return; }
    const { data, error } = await sb.storage.from('roteiros').download(x.arquivo_path);
    if (error) { aviso('Não abriu: ' + error.message); return; }
    abrirArquivo(data, x.arquivo_path);
  });
}
// HTML abre isolado num quadro sem scripts nem acesso à sessão; PDF abre direto
export function abrirArquivo(blob, path) {
  const w = window.open('', '_blank');
  if (!w) return;
  if (/\.pdf$/i.test(path)) { w.location = URL.createObjectURL(blob); return; }
  blob.text().then(html => {
    w.document.write('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Roteiro</title><style>html,body,iframe{margin:0;border:0;width:100%;height:100%}</style><iframe sandbox="allow-popups"></iframe>');
    w.document.close();
    w.document.querySelector('iframe').srcdoc = html;
  });
}
