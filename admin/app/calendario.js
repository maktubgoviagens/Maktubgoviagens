// Maktub Go: calendário do app (o mesmo desenho do calendário do Marketing), usado pelo Comercial e pela Gestão.
// Só desenha: quem chama monta os itens, define os tipos (nome e cor) e diz o que abrir ao tocar.
// Mês ou semana. No celular, cada dia mostra bolinhas por item e o toque no dia abre a lista daquele dia;
// no computador, cada dia mostra os itens escritos e a lista do dia fica ao lado da grade.
// Item: { d: 'AAAA-MM-DD', hora: 'HH:MM' ou '', tipo, t: título, s: detalhe, atr: atrasado, cont: só contorno, passado }

const SEM = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dt = (iso) => new Date(iso + 'T12:00:00');
export const hoje = () => isoDe(new Date());
export const somaDias = (iso, n) => { const d = dt(iso); d.setDate(d.getDate() + n); return isoDe(d); };
export const segunda = (iso) => { const d = dt(iso); return somaDias(iso, -((d.getDay() + 6) % 7)); };
const mesDe = (iso) => iso.slice(0, 7);
const mesSoma = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return isoDe(d).slice(0, 7); };
const mesNome = (k) => { const [y, m] = k.split('-').map(Number); const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const diaLongo = (iso) => dt(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const diaCurto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const ordem = (a, b) => (b.atr ? 1 : 0) - (a.atr ? 1 : 0) || String(a.hora || '99').localeCompare(String(b.hora || '99')) || String(a.t).localeCompare(String(b.t));

/* período que está na tela: o mês inteiro (com as semanas completas) ou a semana */
export function periodo(st) {
  if (st.modo === 'semana') { const de = segunda(st.sem || hoje()); return { de, ate: somaDias(de, 6) }; }
  const de = segunda(st.mes + '-01'), [y, m] = st.mes.split('-').map(Number), fim = isoDe(new Date(y, m, 0));
  return { de, ate: somaDias(segunda(fim), 6) };
}

export function estilos() {
  if (document.getElementById('calCss')) return;
  const s = document.createElement('style'); s.id = 'calCss';
  s.textContent = `
.cal-barra{display:flex;gap:8px;align-items:center;margin-top:12px}
.cal-barra .seg{flex:1;margin:0}
.cal-barra .cal-hoje{background:var(--branco);border:1px solid var(--linha);padding:0 16px;min-height:44px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:var(--verde);cursor:pointer}
.cal-cm{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid var(--linha);border-top:1px solid var(--linha);margin:10px -10px 0;background:var(--branco)}
.cal-cm .h{font-size:14px;text-transform:lowercase;color:var(--tinta-2);text-align:center;padding:6px 0;border-right:1px solid var(--linha);border-bottom:1px solid var(--linha);background:var(--creme-2)}
.cal-cm .d{min-height:62px;border-right:1px solid var(--linha);border-bottom:1px solid var(--linha);padding:3px 2px 5px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;min-width:0}
.cal-cm .d.fora{background:var(--creme-2);cursor:default}
.cal-cm .d.fora .n{color:var(--tinta-3)}
.cal-cm .d.hj .n{background:var(--dourado);color:#fff;border-radius:11px;padding:0 6px}
.cal-cm .d.sel{outline:2px solid var(--verde);outline-offset:-2px}
.cal-cm .n{font-size:14px;color:var(--tinta-2);line-height:20px}
.cal-dots{display:flex;gap:3px;flex-wrap:wrap;justify-content:center;max-width:44px}
.cal-dots i{width:8px;height:8px;border-radius:50%;background:var(--c)}
.cal-dots i.cont{background:var(--branco);box-shadow:inset 0 0 0 2px var(--c)}
.cal-dots i.atr{box-shadow:0 0 0 2px var(--branco),0 0 0 3.5px var(--alerta)}
.cal-dots b{font-size:14px;font-weight:500;color:var(--tinta-2);line-height:8px}
.cal-chips{display:none;width:100%;flex-direction:column;gap:3px}
.cal-chip{display:block;width:100%;border:0;border-radius:3px;padding:3px 6px;font-size:14px;line-height:1.3;text-align:left;color:#fff;background:var(--c);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;font-family:inherit}
.cal-chip.cont{background:var(--branco);color:var(--c);box-shadow:inset 0 0 0 1.5px var(--c)}
.cal-chip.atr{box-shadow:inset 4px 0 0 var(--alerta);padding-left:9px}
.cal-chip.passado{opacity:.6}
.cal-mais{font-size:14px;color:var(--tinta-3);padding-left:3px}
.cal-leg{display:flex;gap:6px 14px;flex-wrap:wrap;font-size:14px;color:var(--tinta-2);margin-top:10px}
.cal-leg i{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:5px;vertical-align:-1px;background:var(--c)}
.cal-leg i.cont{background:var(--branco);box-shadow:inset 0 0 0 2px var(--c)}
.cal-leg i.atr{background:var(--branco);box-shadow:inset 0 0 0 2px var(--alerta)}
.cal-dia{font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:var(--dourado);font-weight:600;margin:20px 0 8px}
.cal-dia small{letter-spacing:.04em;text-transform:none;color:var(--tinta-3);font-weight:400;font-size:14px}
.cal-it{display:flex;flex-wrap:wrap;align-items:stretch;background:var(--branco);border:1px solid var(--linha);border-left:5px solid var(--c);margin-bottom:6px}
.cal-it.cont{border-left-style:dashed}
.cal-it>button{flex:1 1 200px;min-width:0;background:none;border:0;padding:11px 12px;text-align:left;font:inherit;color:inherit;cursor:pointer}
.cal-it .t{display:block;font-size:16px;color:var(--verde);line-height:1.3}
.cal-it .s{display:block;font-size:14px;color:var(--tinta-2);margin-top:3px;line-height:1.4}
.cal-it .q{display:inline-block;font-size:14px;color:var(--tinta-3);margin-right:6px}
.cal-it .atr{display:inline-block;font-size:14px;color:var(--alerta);font-weight:600;margin-right:6px}
.cal-it .ac{display:flex;align-items:center;padding:0 12px 12px}
@media (min-width:420px){.cal-it .ac{padding:8px 10px 8px 0}}
.cal-it .ac a{white-space:nowrap;font-size:14px;padding:10px 12px;min-width:auto;flex:none;letter-spacing:.08em}
.cal-vazio{color:var(--tinta-3);font-size:14px;padding:10px 0}
.cal-tipos button{font-size:14px;display:inline-flex;align-items:center;min-height:40px}
.cal-tipos button i{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--c);margin-right:7px;box-shadow:0 0 0 1.5px var(--branco)}
.cal-tipos button:not(.on){color:var(--tinta-3);text-decoration:line-through}
.cal-tipos button:not(.on) i{background:var(--branco);box-shadow:inset 0 0 0 2px var(--c)}
.cal-filtros select{min-height:44px}
.cal-sem{display:block}
.cal-sem .cal-semc{display:none}
.cal-largo-lado{display:block}
@media (min-width:700px){
  .cal-cm{margin:10px 0 0}
  .cal-cm .d{min-height:118px;padding:4px;align-items:stretch}
  .cal-cm .n{align-self:flex-end}
  .cal-cm .cal-dots{display:none}
  .cal-cm .cal-chips{display:flex}
  .cal-sem .cal-semlista{display:none}
  .cal-sem .cal-semc{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-left:1px solid var(--linha);border-top:1px solid var(--linha);background:var(--branco);margin-top:10px}
  .cal-semc .col{border-right:1px solid var(--linha);border-bottom:1px solid var(--linha);min-height:300px;padding:4px;display:flex;flex-direction:column;gap:3px;min-width:0}
  .cal-semc .col.hj{background:rgba(168,139,74,.08)}
  .cal-semc .cab{font-size:14px;color:var(--tinta-2);text-align:center;padding:4px 0 6px;border-bottom:1px solid var(--linha);margin:-4px -4px 4px;background:var(--creme-2)}
  .cal-semc .col.hj .cab{color:var(--verde);font-weight:600}
  .cal-semc .cal-chip{white-space:normal}
  .cal-cm .cal-chip{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}
  .cal-filtros .fl{max-width:360px}
}
body.cal-largo .pagina{max-width:1180px}
@media (min-width:1100px){
  .cal-duas{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start}
  .cal-duas .cal-lado{position:sticky;top:76px;max-height:calc(100vh - 96px);overflow:auto}
  .cal-duas .cal-lado .cal-dia:first-child{margin-top:10px}
}
@media (prefers-reduced-motion:no-preference){.cal-cm .d,.cal-chip{transition:background-color .15s ease}}
`;
  document.head.appendChild(s);
}

/* o desenho inteiro. st: { modo, mes, sem, dia }. o: { itens, tipos: [[chave, nome, cor, contorno]], esc, linha, extra, legendaExtra, rodape } */
export function html(st, o) {
  const esc = o.esc, hj = hoje();
  const cor = (it) => ((o.tipos.find(t => t[0] === it.tipo) || [])[2]) || 'var(--tinta-3)';
  const porDia = {}; o.itens.forEach(it => (porDia[it.d] = porDia[it.d] || []).push(it));
  Object.values(porDia).forEach(L => L.sort(ordem));
  const idx = new Map(o.itens.map((it, i) => [it, i]));
  const chip = (it) => `<button type="button" class="cal-chip ${it.cont ? 'cont' : ''} ${it.atr ? 'atr' : ''} ${it.passado ? 'passado' : ''}" data-cal-it="${idx.get(it)}" style="--c:${cor(it)}" title="${esc(it.t + (it.s ? ': ' + it.s : ''))}">${it.atr ? '! ' : ''}${it.hora ? esc(it.hora) + ' ' : ''}${esc(it.t)}</button>`;
  const ponto = (it) => `<i class="${it.cont ? 'cont' : ''} ${it.atr ? 'atr' : ''}" style="--c:${cor(it)}"></i>`;
  const linha = (it) => `<div class="cal-it ${it.cont ? 'cont' : ''}" style="--c:${cor(it)}"><button type="button" data-cal-it="${idx.get(it)}">
      <span class="t">${esc(it.t)}</span>
      <span class="s">${it.atr ? `<span class="atr">${esc(it.atrTxt || 'Atrasado')}</span>` : ''}${it.hora ? `<span class="q">${esc(it.hora)}</span>` : ''}${esc(it.s || '')}</span>
    </button>${o.extra && o.extra(it) ? `<span class="ac">${o.extra(it)}</span>` : ''}</div>`;
  const lista = (iso) => { const L = porDia[iso] || []; return L.length ? L.map(linha).join('') : '<div class="cal-vazio">Nada neste dia.</div>'; };
  const qtd = (n) => n + (n === 1 ? ' item' : ' itens');
  const barra = `<div class="cal-barra"><div class="seg" id="calModo"><button type="button" data-m="mes" class="${st.modo === 'mes' ? 'on' : ''}">Mês</button><button type="button" data-m="semana" class="${st.modo === 'semana' ? 'on' : ''}">Semana</button></div><button type="button" class="cal-hoje" id="calHoje">Hoje</button></div>`;
  const leg = `<div class="cal-leg">${o.tipos.map(([k, n, c, ct]) => `<span><i class="${ct ? 'cont' : ''}" style="--c:${c}"></i>${esc(n)}</span>`).join('')}<span><i class="atr"></i>Atrasado (aparece em hoje)</span>${o.legendaExtra || ''}</div>`;
  let corpo = '', lado = '';
  if (st.modo === 'semana') {
    const de = segunda(st.sem || hj), dias = [0, 1, 2, 3, 4, 5, 6].map(i => somaDias(de, i)), ate = dias[6];
    const rot = `${diaCurto(de)} a ${diaCurto(ate)}${de.slice(0, 4) !== String(new Date().getFullYear()) ? ' de ' + de.slice(0, 4) : ''}`;
    corpo = `<div class="mesnav" id="calNav"><button type="button" data-n="-1" aria-label="Semana anterior">‹</button><span>${rot}</span><button type="button" data-n="1" aria-label="Próxima semana">›</button></div>
      <div class="cal-sem">
        <div class="cal-semlista">${dias.map(iso => `<div class="cal-dia">${esc(diaLongo(iso))}${iso === hj ? ' · hoje' : ''} <small>${qtd((porDia[iso] || []).length)}</small></div>${lista(iso)}`).join('')}</div>
        <div class="cal-semc">${dias.map(iso => `<div class="col ${iso === hj ? 'hj' : ''}"><div class="cab">${SEM[(dt(iso).getDay() + 6) % 7]} ${iso.slice(8, 10)}</div>${(porDia[iso] || []).map(chip).join('')}</div>`).join('')}</div>
      </div>`;
  } else {
    const k = st.mes, [y, m] = k.split('-').map(Number), prim = (new Date(y, m - 1, 1).getDay() + 6) % 7, n = new Date(y, m, 0).getDate();
    let cel = SEM.map(d => `<div class="h">${d}</div>`).join('');
    for (let i = 0; i < prim; i++) cel += '<div class="d fora"></div>';
    for (let d = 1; d <= n; d++) {
      const iso = `${k}-${String(d).padStart(2, '0')}`, L = porDia[iso] || [];
      cel += `<div role="button" tabindex="0" class="d ${iso === hj ? 'hj' : ''} ${iso === st.dia ? 'sel' : ''}" data-dia="${iso}" aria-label="${esc(diaLongo(iso))}, ${qtd(L.length)}"><span class="n">${d}</span>
        <span class="cal-dots">${L.slice(0, 6).map(ponto).join('')}${L.length > 6 ? `<b>+${L.length - 6}</b>` : ''}</span>
        <span class="cal-chips">${L.slice(0, 3).map(chip).join('')}${L.length > 3 ? `<span class="cal-mais">+${L.length - 3} no dia</span>` : ''}</span></div>`;
    }
    const resto = (prim + n) % 7; if (resto) for (let i = resto; i < 7; i++) cel += '<div class="d fora"></div>';
    corpo = `<div class="mesnav" id="calNav"><button type="button" data-n="-1" aria-label="Mês anterior">‹</button><span>${mesNome(k)}</span><button type="button" data-n="1" aria-label="Próximo mês">›</button></div>
      <div class="cal-cm">${cel}</div>`;
    lado = st.dia ? `<div class="cal-dia" id="calDiaLista">${esc(diaLongo(st.dia))}${st.dia === hj ? ' · hoje' : ''} <small>${qtd((porDia[st.dia] || []).length)}</small></div>${lista(st.dia)}` : '<div class="cal-vazio" id="calDiaLista">Toque em um dia para ver tudo dele.</div>';
  }
  return `${barra}<div class="cal-duas"><div>${corpo}${leg}${o.dica ? `<div class="cal-vazio" style="padding-top:6px">${o.dica}</div>` : ''}</div><div class="cal-lado">${lado}${o.rodape || ''}</div></div>`;
}

/* liga os toques. Muda st e chama redesenhar(); ao tocar num item, chama abrir(item) */
export function ligar(raiz, st, o, redesenhar, abrir) {
  const q = (s) => raiz.querySelector(s);
  if (q('#calModo')) q('#calModo').onclick = (e) => { const b = e.target.closest('button'); if (!b || b.dataset.m === st.modo) return; st.modo = b.dataset.m; if (st.modo === 'semana') st.sem = segunda(st.dia || hoje()); else st.mes = mesDe(st.sem || hoje()); redesenhar(); };
  if (q('#calHoje')) q('#calHoje').onclick = () => { st.mes = mesDe(hoje()); st.sem = segunda(hoje()); st.dia = hoje(); redesenhar(); };
  if (q('#calNav')) q('#calNav').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const n = +b.dataset.n; if (st.modo === 'semana') st.sem = somaDias(segunda(st.sem || hoje()), 7 * n); else { st.mes = mesSoma(st.mes, n); st.dia = mesDe(hoje()) === st.mes ? hoje() : null; } redesenhar(); };
  raiz.querySelectorAll('.cal-cm [data-dia]').forEach(c => c.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); c.click(); } });
  raiz.querySelectorAll('.cal-cm [data-dia]').forEach(c => c.onclick = (e) => {
    const it = e.target.closest('[data-cal-it]');
    if (it) { e.stopPropagation(); return abrir(o.itens[+it.dataset.calIt]); }
    st.dia = c.dataset.dia; redesenhar();
    // no celular a lista do dia fica embaixo da grade: rola até ela
    if (innerWidth < 1100) { const el = raiz.querySelector('#calDiaLista'); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  });
  raiz.querySelectorAll('.cal-it [data-cal-it], .cal-semc [data-cal-it]').forEach(b => b.onclick = () => abrir(o.itens[+b.dataset.calIt]));
}
