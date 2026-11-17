/* ============================================================
   MOVIMENTO MAKTUB GO
   Um módulo só, usado por todas as páginas públicas.

   COMO APLICAR EM UMA SEÇÃO NOVA (sem escrever código):
   - class="reveal"              o bloco sobe e aparece ao entrar na tela
                                 (some com d1 a d6 para dar atraso: class="reveal d2")
   - class="reveal mov-lote"     itens vizinhos entram em sequência, um depois do outro
   - class="split-reveal"        título que surge palavra por palavra
                                 (todos os H2 dentro de <main> já recebem isso sozinhos;
                                 para um H2 ficar parado, use class="mov-sem")
   - class="image-reveal"        foto que abre como uma cortina
   - data-parallax="-6,6,1.12"   foto que se move devagar dentro da moldura, só no computador
                                 (de onde parte, até onde vai, e o zoom da foto)
   - data-linha="topo" ou "base" na lista: cada item ganha uma linha dourada que cresce
   - data-hero-foto e data-hero-texto no topo da página: a foto abre em cortina e,
     ao rolar, ganha cantos arredondados enquanto o texto sobe e esmaece (só no computador)

   Fotos de casos, equipe, listas de etapas e números que já existem no site
   recebem as classes acima automaticamente (ver MAPA logo abaixo).

   Garantias:
   - quem pede menos movimento no aparelho vê tudo pronto, parado, sem rolagem suave;
   - sem JavaScript, tudo aparece (as animações dependem da classe "mov" no <html>);
   - blocos .so-rascunho continuam escondidos no modo publicado: o módulo nunca mexe em display;
   - GSAP, ScrollTrigger e Lenis só carregam no computador, depois que a página terminou de carregar.
   ============================================================ */
(function(){
  'use strict';
  window.movPronto = true;

  var d = document.documentElement;
  var MOV = d.classList.contains('mov');
  var reduz = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var publicado = d.getAttribute('data-modo') === 'publicado';
  var esteScript = document.currentScript;
  var base = (esteScript && esteScript.src ? esteScript.src : '/assets/movimento/movimento.js').replace(/[^\/]*$/, '');
  var COMPUTADOR = '(min-width: 1101px) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

  /* Elementos que já existem no site e ganham movimento sem precisar editar o HTML. */
  var MAPA = [
    ['.figura-caso, .figura-pessoa, .figura-retrato, .membro-foto, .caso-foto', 'image-reveal'],
    ['.casos > .caso, .time > .pessoa, .depoimentos > .depo, .publicos > .publico, .areas > .area,' +
     ' .grade > .item, .servicos > .servico, .beneficios > .beneficio-col, .cuidados > li,' +
     ' .jornada > .passo, .prateleira > .etapa, .processo > .passo, .lista > .linha, .seguranca-lista > li', 'reveal mov-lote'],
    ['.prova-grid > .prova-item', 'reveal mov-lote mov-num']
  ];
  var LINHAS = [['.jornada, .processo', 'topo'], ['.prateleira, .passos', 'base']];
  var PARALLAX = [
    ['.casos .figura-caso, .figura-pessoa, .membro-foto', '-4,4,1.1'],
    ['.caso-foto', '-6,6,1.16'],
    ['.figura-retrato', '-9,9,1.22']
  ];

  function cada(sel, fn, raiz){ Array.prototype.forEach.call((raiz || document).querySelectorAll(sel), fn); }
  function escondido(el){
    if(publicado && el.closest('.so-rascunho')) return true;
    return !el.getClientRects().length || el.offsetWidth < 4;
  }
  /* itens dentro de carrossel deslizante (celular) ficam como estão */
  function emCarrossel(el){
    for(var p = el.parentElement; p && p !== document.body; p = p.parentElement){
      var o = getComputedStyle(p).overflowX;
      if(o === 'auto' || o === 'scroll') return true;
    }
    return false;
  }
  function naTela(el){ var r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }
  function noTopo(el){ return !!el.closest('[data-hero-texto], [data-hero-foto], .entra-topo'); }

  /* ---------------- Cabeçalho e barra de progresso (todas as páginas) ---------------- */
  var topo = document.getElementById('navbar');
  var barra = document.createElement('div');
  barra.className = 'mov-progresso';
  barra.setAttribute('aria-hidden', 'true');
  document.body.appendChild(barra);
  var barraCSS = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
  function menuAberto(){ return !!document.querySelector('#menu[data-aberto="true"], #navLinks.open'); }
  var refY = window.scrollY, pedido = false;
  function aoRolar(){
    pedido = false;
    var y = window.scrollY;
    if(topo){
      var rolou = y > 40;
      topo.classList.toggle('rolou', rolou);
      topo.classList.toggle('scrolled', rolou);
      if(reduz || y < 350 || menuAberto() || topo.contains(document.activeElement)){
        topo.classList.remove('mov-escondido'); refY = y;
      } else if(y > refY + 8){
        topo.classList.add('mov-escondido'); refY = y;
      } else if(y < refY - 8){
        topo.classList.remove('mov-escondido'); refY = y;
      }
    }
    if(!barraCSS){
      var h = d.scrollHeight - innerHeight;
      barra.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, Math.max(0, y / h)) : 0) + ')';
    }
  }
  addEventListener('scroll', function(){ if(!pedido){ pedido = true; requestAnimationFrame(aoRolar); } }, {passive:true});
  addEventListener('resize', aoRolar, {passive:true});
  if(topo) topo.addEventListener('focusin', function(){ topo.classList.remove('mov-escondido'); });
  aoRolar();

  /* menu do computador: texto que rola no hover (só efeito visual) */
  cada('.mk-links a:not(.mk-cta), .nav-links a:not(.nav-cta)', function(a){
    if(a.children.length || !a.textContent.trim()) return;
    var t = a.textContent.trim();
    var fora = document.createElement('span'); fora.className = 'mov-rola';
    var dentro = document.createElement('span'); dentro.textContent = t; dentro.setAttribute('data-t', t);
    fora.appendChild(dentro);
    a.textContent = '';
    a.appendChild(fora);
  });

  if(!MOV) return;

  /* ---------------- Quebra de títulos em palavras ---------------- */
  function quebra(el, classe){
    if(el.hasAttribute('data-mov-quebrado')) return;
    el.setAttribute('data-mov-quebrado', '');
    var texto = (el.innerText || el.textContent).replace(/\s+/g, ' ').trim();
    var i = 0;
    (function anda(no){
      Array.prototype.slice.call(no.childNodes).forEach(function(n){
        if(n.nodeType === 3){
          if(!n.textContent.trim()) return;
          var frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach(function(p){
            if(!p) return;
            if(/^[ \t\n\r]+$/.test(p)){ frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'mov-palavra';
            w.setAttribute('aria-hidden', 'true');
            w.style.setProperty('--i', i++);
            var s = document.createElement('span');
            s.textContent = p;
            w.appendChild(s);
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if(n.nodeType === 1 && n.tagName !== 'BR' && n.tagName !== 'SVG'){
          anda(n);
        }
      });
    })(el);
    /* o leitor de tela lê o texto original, inteiro, uma vez só */
    Array.prototype.forEach.call(el.children, function(c){ if(c.tagName !== 'BR') c.setAttribute('aria-hidden', 'true'); });
    el.setAttribute('aria-label', texto);
    el.classList.add(classe);
  }

  /* ---------------- Observador único de entrada na tela ---------------- */
  var io = new IntersectionObserver(function(es){
    var k = 0;
    es.sort(function(a, b){ return a.target.compareDocumentPosition(b.target) & 4 ? -1 : 1; });
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      if(e.intersectionRatio < .13 && e.intersectionRect.height < 120) return;
      var el = e.target;
      io.unobserve(el);
      /* a cortina é observada pela moldura (ver observa) */
      if(el.__movAlvos){ el.__movAlvos.forEach(function(a){ a.classList.add('is-visible'); }); el.__movAlvos = null; }
      if(!/\b(reveal|split-reveal|mov-linha)\b/.test(el.className)) return;
      if(el.classList.contains('mov-lote') && !/\bd[1-6]\b/.test(el.className)){
        el.style.setProperty('--d', (k++ * 0.11).toFixed(2) + 's');
      }
      el.classList.add('is-visible');
      if(el.classList.contains('split-reveal')){
        setTimeout(function(){ el.classList.add('is-settled'); }, 1800);
      }
    });
  }, {threshold:[0, .02, .05, .13], rootMargin:'0px 0px -5% 0px'});
  /* uma foto em cortina começa recortada por inteiro, e o navegador não a enxerga na tela;
     por isso quem é observado é o elemento em volta dela */
  function observa(el){
    if(el.classList.contains('image-reveal') && el.parentElement){
      var p = el.parentElement;
      (p.__movAlvos = p.__movAlvos || []).push(el);
      io.observe(p);
    } else {
      io.observe(el);
    }
  }

  var computador = !!(window.matchMedia && matchMedia(COMPUTADOR).matches);

  /* H1 do topo: entra palavra por palavra assim que a página abre (só no computador) */
  var telaGrande = !!(window.matchMedia && matchMedia('(min-width: 1101px)').matches);
  cada('main h1', function(h){
    if(h.classList.contains('mov-sem') || !telaGrande) return;
    if(escondido(h)){ h.classList.add('mov-sem'); return; }
    quebra(h, 'mov-titulo');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ h.classList.add('is-visible'); }); });
    setTimeout(function(){ h.classList.add('is-settled'); }, 2400);
  });

  /* H2 das seções */
  cada('main h2', function(h){
    if(h.classList.contains('oculto') || h.classList.contains('mov-sem')) return;
    if(escondido(h)){ h.classList.add('mov-sem'); return; }
    h.classList.remove('reveal', 'titulo-entra');
    quebra(h, 'split-reveal');
    observa(h);
  });
  /* outros títulos marcados à mão */
  cada('.split-reveal:not([data-mov-quebrado])', function(el){
    if(escondido(el)) return;
    quebra(el, 'split-reveal');
    observa(el);
  });

  /* classes automáticas para o que já existe no site */
  MAPA.forEach(function(m){
    cada(m[0], function(el){
      if(escondido(el) || noTopo(el) || emCarrossel(el) || naTela(el)) return;
      el.className += ' ' + m[1];
    });
  });
  LINHAS.forEach(function(m){
    cada(m[0], function(lista){ if(!lista.hasAttribute('data-linha')) lista.setAttribute('data-linha', m[1]); });
  });
  cada('[data-linha]', function(lista){
    var lado = lista.getAttribute('data-linha') === 'base' ? 'linha-base' : 'linha-topo';
    Array.prototype.forEach.call(lista.children, function(item){
      if(escondido(item) || naTela(item)) return;
      item.classList.add('mov-linha', lado);
      if(!item.classList.contains('reveal')) item.classList.add('mov-lote');
    });
  });

  /* foto do topo: cortina na abertura, só no computador (no celular ela aparece pronta) */
  cada('[data-hero-foto]', function(f){
    if(computador && !escondido(f)){
      f.classList.add('image-reveal');
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ f.classList.add('is-visible'); }); });
    } else {
      f.classList.add('is-visible');
    }
  });

  cada('.reveal, .image-reveal, .mov-linha', function(el){
    if(el.classList.contains('is-visible') || el.hasAttribute('data-hero-foto')) return;
    if(escondido(el)){ return; }
    observa(el);
  });

  /* ---------------- Computador: rolagem suave, parallax e scrub ---------------- */
  if(!computador) return;

  function script(src){
    return new Promise(function(ok, erro){
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = ok; s.onerror = erro;
      document.head.appendChild(s);
    });
  }
  function carrega(){
    ['vendor/gsap.min.js', 'vendor/ScrollTrigger.min.js', 'vendor/lenis.min.js']
      .reduce(function(p, f){ return p.then(function(){ return script(base + f); }); }, Promise.resolve())
      .then(liga)
      .catch(function(){});
  }
  function espera(){
    if('requestIdleCallback' in window) requestIdleCallback(carrega, {timeout:1500});
    else setTimeout(carrega, 200);
  }
  if(document.readyState === 'complete') espera(); else addEventListener('load', espera);

  function camada(box){
    var c = box.querySelector(':scope > .mov-camada');
    if(c) return c;
    /* a camada se posiciona pela própria moldura */
    if(getComputedStyle(box).position === 'static') box.style.position = 'relative';
    c = document.createElement('span');
    c.className = 'mov-camada';
    c.setAttribute('aria-hidden', 'true');
    box.insertBefore(c, box.firstChild);
    return c;
  }

  /* a moldura que recorta o movimento: a própria caixa, ou o <picture> da foto */
  function moldura(alvo, box){
    return alvo.parentElement && alvo.parentElement.tagName === 'PICTURE' ? alvo.parentElement : box;
  }

  function liga(){
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if(!gsap || !ST) return;
    gsap.registerPlugin(ST);

    if(window.Lenis){
      var lenis = new window.Lenis({
        duration:1.18, smoothWheel:true, wheelMultiplier:.88, touchMultiplier:1.05,
        anchors:{duration:1.25}, autoRaf:false   /* o recuo do cabeçalho vem do scroll-margin-top do CSS */
      });
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function(t){ lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      var menu = document.querySelector('#menu, #navLinks');
      if(menu){
        new MutationObserver(function(){ if(menuAberto()) lenis.stop(); else lenis.start(); })
          .observe(menu, {attributes:true, attributeFilter:['data-aberto', 'class']});
      }
      window.movLenis = lenis;
    }

    /* parallax automático nas fotos que já existem */
    PARALLAX.forEach(function(m){
      cada(m[0], function(el){
        if(!el.hasAttribute('data-parallax') && !el.hasAttribute('data-hero-foto')) el.setAttribute('data-parallax', m[1]);
      });
    });
    cada('[data-parallax]', function(box){
      if(escondido(box) || box.classList.contains('galeria') || box.classList.contains('figura-alterna') || box.classList.contains('caso-alterna')) return;
      var v = (box.getAttribute('data-parallax') || '-6,6,1.12').split(',').map(Number);
      var alvo = box.querySelector(':scope > img, :scope > picture > img') || camada(box);
      moldura(alvo, box).classList.add('mov-parallax');
      gsap.fromTo(alvo, {yPercent:v[0], scale:v[2]}, {
        yPercent:v[1], scale:v[2], ease:'none',
        scrollTrigger:{trigger:box, start:'top bottom', end:'bottom top', scrub:1.1}
      });
    });

    /* topo: ao rolar, a foto ganha cantos e se move por dentro; o texto sobe e esmaece */
    cada('[data-hero-foto]', function(foto){
      if(escondido(foto)) return;
      var sec = foto.closest('section') || foto.parentElement;
      var texto = sec.querySelector('[data-hero-texto]');
      var alvo = foto.querySelector('img') || camada(foto);
      var mold = moldura(alvo, foto);
      mold.classList.add('mov-parallax');
      var tl = gsap.timeline({scrollTrigger:{trigger:sec, start:'top top', end:'bottom top', scrub:1}});
      tl.fromTo(alvo, {yPercent:0, scale:1}, {yPercent:6, scale:1.12, ease:'none'}, 0)
        .to(mold, {borderRadius:22, ease:'none'}, 0);
      if(texto) tl.to(texto, {y:-60, opacity:.2, ease:'none'}, 0);
    });

    /* etapas: cada linha desliza de um lado, alternando */
    cada('.prateleira > .etapa', function(li, i){
      if(li.classList.contains('is-visible') || naTela(li) || escondido(li)) return;
      li.classList.remove('reveal', 'mov-lote');
      gsap.fromTo(li, {x:i % 2 ? 34 : -34, opacity:0}, {
        x:0, opacity:1, ease:'none',
        scrollTrigger:{trigger:li, start:'top bottom', end:'top 62%', scrub:.65}
      });
    });

    if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ ST.refresh(); });
    addEventListener('load', function(){ ST.refresh(); });
  }
})();
