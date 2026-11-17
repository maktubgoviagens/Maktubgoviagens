/* ============================================================
   MOVIMENTO MAKTUB GO
   Um módulo só, usado por todas as páginas públicas. Segue a mesma lógica da
   referência de movimento: rolagem suave (Lenis), títulos palavra por palavra,
   fotos que se movem devagar dentro da moldura enquanto se rola (GSAP + ScrollTrigger,
   em qualquer tela) e, no computador, o topo da home que encolhe ao rolar.

   COMO APLICAR EM UMA SEÇÃO NOVA (sem escrever código):
   - class="reveal"              o bloco sobe e aparece ao entrar na tela (d1 a d6 dão atraso)
   - class="split-reveal"        título que surge palavra por palavra
                                 (os H2 dentro de <main> já recebem sozinhos; para um ficar parado: class="mov-sem")
   - class="image-reveal"        foto que abre como cortina
   - data-parallax="-4,4,1.1"    foto que se move dentro da moldura ao rolar (de, até, zoom)
   - class="mov-lote"            cartões vizinhos que entram em sequência

   Fotos, cartões, etapas e números que já existem no site recebem isso
   automaticamente (ver MAPA logo abaixo).

   Garantias:
   - quem pede menos movimento no aparelho vê tudo pronto, parado, sem rolagem suave;
   - sem JavaScript, tudo aparece (as animações dependem da classe "mov" no <html>);
   - blocos .so-rascunho continuam escondidos no modo publicado: o módulo nunca mexe em display.
   ============================================================ */
(function(){
  'use strict';
  window.movPronto = true;

  var d = document.documentElement;
  var MOV = d.classList.contains('mov');
  var reduz = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var publicado = d.getAttribute('data-modo') === 'publicado';

  /* O que já existe no site e ganha movimento sem precisar editar o HTML. */
  var MAPA = {
    reveal: 'main .olho, main .intro, .casos > .caso, .time > .pessoa, .depoimentos > .depo, .caso-bloco',
    lote: '.publicos > .publico, .areas > .area, .grade > .item, .servicos > .servico, .beneficios > .beneficio-col,' +
          ' .cuidados > li, .seguranca-lista > li, .lista > .linha, .lista-gestao > li, .processo > .passo',
    fotos: [
      ['.casos .figura-caso, .figura-pessoa, .membro-foto', '-4,4,1.1'],
      ['.caso-foto', '-6,6,1.16'],
      ['.figura-retrato, .inicio-foto', '-9,9,1.22']
    ]
  };

  function cada(sel, fn, raiz){ Array.prototype.forEach.call((raiz || document).querySelectorAll(sel), fn); }
  function escondido(el){
    if(publicado && el.closest('.so-rascunho')) return true;
    return !el.getClientRects().length || el.offsetWidth < 4;
  }
  function naTela(el){ var r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }
  function noTopo(el){ return !!el.closest('.hero, .topo-tela, .primeira, .topo, .abertura, .entra-topo'); }
  function emCarrossel(el){
    for(var p = el.parentElement; p && p !== document.body; p = p.parentElement){
      var o = getComputedStyle(p).overflowX;
      if(o === 'auto' || o === 'scroll') return true;
    }
    return false;
  }

  /* ---------------- Cabeçalho e barra de leitura (todas as páginas) ---------------- */
  var topo = document.getElementById('navbar');
  var barra = document.createElement('div');
  barra.className = 'mov-progresso';
  barra.setAttribute('aria-hidden', 'true');
  document.body.appendChild(barra);
  function menuAberto(){ return !!document.querySelector('#menu[data-aberto="true"], #navLinks.open'); }
  var refY = window.scrollY, pedido = false;
  function aoRolar(){
    pedido = false;
    var y = window.scrollY, h = d.scrollHeight - innerHeight;
    barra.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, Math.max(0, y / h)) : 0) + ')';
    if(!topo) return;
    topo.classList.toggle('rolou', y > 40);
    topo.classList.toggle('scrolled', y > 40);
    /* some ao descer depois de 350px e volta ao subir */
    if(reduz || y < 350 || menuAberto() || topo.contains(document.activeElement)){
      topo.classList.remove('mov-escondido'); refY = y;
    } else if(y > refY + 8){
      topo.classList.add('mov-escondido'); refY = y;
    } else if(y < refY - 8){
      topo.classList.remove('mov-escondido'); refY = y;
    }
  }
  addEventListener('scroll', function(){ if(!pedido){ pedido = true; requestAnimationFrame(aoRolar); } }, {passive:true});
  addEventListener('resize', aoRolar, {passive:true});
  if(topo) topo.addEventListener('focusin', function(){ topo.classList.remove('mov-escondido'); });
  aoRolar();

  /* menu do computador: o nome do link rola para cima no hover */
  cada('.mk-links a:not(.mk-cta), .nav-links a:not(.nav-cta)', function(a){
    var no = Array.prototype.filter.call(a.childNodes, function(n){ return n.nodeType === 3 && n.textContent.trim(); })[0];
    if(!no) return;
    var t = no.textContent.trim();
    var fora = document.createElement('span'); fora.className = 'mov-rola';
    var dentro = document.createElement('span'); dentro.textContent = t; dentro.setAttribute('data-t', t);
    fora.appendChild(dentro);
    a.replaceChild(fora, no);
  });

  if(!MOV) return;

  /* ---------------- Títulos palavra por palavra ---------------- */
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
            w.className = 'word';
            w.setAttribute('aria-hidden', 'true');
            w.style.setProperty('--i', i++);
            var s = document.createElement('span');
            s.textContent = p;
            w.appendChild(s);
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if(n.nodeType === 1 && n.tagName !== 'BR'){
          anda(n);
        }
      });
    })(el);
    /* o leitor de tela lê o texto original, inteiro, uma vez só */
    Array.prototype.forEach.call(el.children, function(c){ if(c.tagName !== 'BR') c.setAttribute('aria-hidden', 'true'); });
    el.setAttribute('aria-label', texto);
    el.classList.add(classe);
  }

  /* ---------------- Observador de entrada na tela ----------------
     Anima toda vez que o elemento aparece, em qualquer direção: quando sai por
     completo da tela ele volta ao estado inicial e, ao reaparecer, anima de novo.
     Quem entra pelo alto da tela (rolando para cima) desce no lugar de subir. */
  var saida = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting) return;
      var el = e.target;
      clearTimeout(el.__movAssenta);
      el.classList.remove('is-visible', 'is-settled');
    });
  /* só reinicia quando o elemento já está bem longe da borda (150px), para o
     deslocamento de partida não o empurrar de volta para a tela e fazê-lo piscar */
  }, {threshold:0, rootMargin:'150px 0px 150px 0px'});
  var io = new IntersectionObserver(function(es){
    var k = 0;
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      var el = e.target;
      if(el.classList.contains('is-visible')) return;
      var r = e.boundingClientRect, alto = e.rootBounds ? e.rootBounds.height : innerHeight;
      var deCima = r.top + r.height / 2 < alto / 2;
      if(el.classList.contains('mov-de-cima') !== deCima){
        /* troca o lado de partida sem animar a troca, e só depois anima a entrada */
        el.classList.add('mov-sem-transicao');
        el.classList.toggle('mov-de-cima', deCima);
        void el.offsetWidth;
        el.classList.remove('mov-sem-transicao');
      }
      if(el.classList.contains('mov-lote') && !/\bd[1-6]\b/.test(el.className)) el.style.setProperty('--d', (k++ * 0.08).toFixed(2) + 's');
      el.classList.add('is-visible');
      if(el.classList.contains('split-reveal')){
        clearTimeout(el.__movAssenta);
        el.__movAssenta = setTimeout(function(){ el.classList.add('is-settled'); }, 1800);
      }
    });
  }, {threshold:.13, rootMargin:'0px 0px -5% 0px'});
  function observa(el){ io.observe(el); saida.observe(el); }

  /* título do topo: entra palavra por palavra assim que a página abre (no computador;
     no celular ele aparece com a entrada leve de sempre, para não atrasar a primeira tela) */
  var telaGrande = !!(window.matchMedia && matchMedia('(min-width: 1101px)').matches);
  cada('main h1', function(h){
    if(h.classList.contains('mov-sem') || !telaGrande) return;
    if(escondido(h)){ h.classList.add('mov-sem'); return; }
    quebra(h, 'mov-titulo');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ h.classList.add('is-visible'); }); });
    setTimeout(function(){ h.classList.add('is-settled'); }, 2400);
  });

  /* títulos das seções */
  cada('main h2', function(h){
    if(h.classList.contains('oculto') || h.classList.contains('mov-sem')) return;
    if(escondido(h)){ h.classList.add('mov-sem'); return; }
    h.classList.remove('reveal', 'titulo-entra');
    quebra(h, 'split-reveal');
  });
  cada('.split-reveal:not([data-mov-quebrado])', function(el){ if(!escondido(el)) quebra(el, 'split-reveal'); });

  /* blocos que sobem ao entrar na tela */
  cada(MAPA.reveal, function(el){
    if(escondido(el) || noTopo(el) || emCarrossel(el) || naTela(el) || el.classList.contains('reveal')) return;
    el.classList.add('reveal');
  });
  /* cartões vizinhos entram em sequência, subindo */
  cada(MAPA.lote, function(el){
    if(escondido(el) || noTopo(el) || emCarrossel(el) || naTela(el) || el.classList.contains('reveal')) return;
    el.classList.add('reveal', 'mov-lote');
  });
  /* etapas do processo: o texto sobe em sequência e a linha dourada cresce */
  cada('.jornada > .passo', function(el){
    if(escondido(el) || noTopo(el) || naTela(el)) return;
    el.classList.add('reveal', 'mov-lote', 'mov-sobe');
  });
  /* números entram crescendo */
  cada('.prova-num', function(el){
    if(escondido(el) || naTela(el)) return;
    el.classList.add('reveal', 'mov-lote', 'mov-num');
  });

  cada('.reveal, .split-reveal, .image-reveal', function(el){
    if(!escondido(el)) observa(el);
  });

  /* ---------------- GSAP + ScrollTrigger + Lenis ----------------
     As bibliotecas chegam logo depois que a página termina de abrir, para não
     disputarem a rede com a primeira tela. */
  if(reduz){ d.classList.add('mov-sem-gsap'); return; }
  var esteScript = document.currentScript;
  var base = (esteScript && esteScript.src ? esteScript.src : '/assets/movimento/movimento.js').replace(/[^\/]*$/, '');
  function script(src){
    return new Promise(function(ok, erro){
      var s = document.createElement('script');
      s.src = src; s.async = false; s.onload = ok; s.onerror = erro;
      document.head.appendChild(s);
    });
  }
  var carregou = false;
  function carrega(){
    if(carregou) return;
    carregou = true;
    if(window.gsap && window.ScrollTrigger) return liga();
    ['vendor/gsap.min.js', 'vendor/ScrollTrigger.min.js', 'vendor/lenis.min.js']
      .reduce(function(p, f){ return p.then(function(){ return script(base + f); }); }, Promise.resolve())
      .then(liga)
      .catch(function(){ d.classList.add('mov-sem-gsap'); });
  }
  /* entra assim que a pessoa começa a rolar, ou um segundo depois de a página abrir */
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function(ev){ addEventListener(ev, carrega, {once:true, passive:true}); });
  function depois(){ setTimeout(carrega, 1000); }
  if(document.readyState === 'complete') depois(); else addEventListener('load', depois);

  function liga(){
  var gsap = window.gsap, ST = window.ScrollTrigger;
  if(!gsap || !ST){ d.classList.add('mov-sem-gsap'); return; }
  gsap.registerPlugin(ST);

  if(window.Lenis){
    var lenis = new window.Lenis({
      duration:1.18, smoothWheel:true, wheelMultiplier:.88, touchMultiplier:1.05,
      anchors:{duration:1.25}   /* o recuo do cabeçalho vem do scroll-margin-top do CSS */
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

  /* topo da home, só no computador: a foto encolhe para o centro, o texto desce e some
     e as duas fotos laterais entram (mesma linha do tempo da referência) */
  gsap.matchMedia().add('(min-width: 1101px)', function(){
    var palco = document.querySelector('.topo-palco');
    if(!palco) return;
    var tl = gsap.timeline({defaults:{ease:'none'}, scrollTrigger:{trigger:palco, start:'top top', end:'bottom bottom', scrub:true, invalidateOnRefresh:true}});
    tl.fromTo('.topo-pe', {yPercent:0, autoAlpha:1}, {yPercent:55, autoAlpha:0, duration:.2, immediateRender:false}, 0)
      .fromTo('.topo-conteudo', {yPercent:0, autoAlpha:1}, {yPercent:82, autoAlpha:0, duration:.44, immediateRender:false}, .04)
      .to('.topo-sombra', {autoAlpha:0, duration:.42}, .08)
      .to('.topo-midia', {scale:.45, yPercent:-2.5, borderRadius:22, duration:1}, 0)
      .to('.topo-midia > img', {scale:1, yPercent:0, duration:1}, 0)
      .to('.topo-lateral', {autoAlpha:1, x:0, scaleX:1, scaleY:1, duration:.62, stagger:.05}, .33);
    return function(){ tl.kill(); };
  });

  /* fotos: movimento contínuo dentro da moldura enquanto se rola, em qualquer tela */
  function camada(box){
    var c = box.querySelector(':scope > .mov-camada');
    if(c) return c;
    if(getComputedStyle(box).position === 'static') box.style.position = 'relative';
    c = document.createElement('span');
    c.className = 'mov-camada';
    c.setAttribute('aria-hidden', 'true');
    box.insertBefore(c, box.firstChild);
    return c;
  }
  MAPA.fotos.forEach(function(m){
    cada(m[0], function(el){ if(!el.hasAttribute('data-parallax')) el.setAttribute('data-parallax', m[1]); });
  });
  cada('[data-parallax]', function(box){
    if(escondido(box)) return;
    var v = (box.getAttribute('data-parallax') || '-4,4,1.1').split(',').map(Number);
    var camadas = box.querySelectorAll(':scope > .camada');
    var alvo = box.querySelector(':scope > img, :scope > picture > img');
    var alvos = camadas.length ? camadas : (alvo ? [alvo] : [camada(box)]);
    gsap.fromTo(alvos, {yPercent:v[0], scale:v[2]}, {
      yPercent:v[1], scale:v[2], ease:'none',
      scrollTrigger:{trigger:box, start:'top bottom', end:'bottom top', scrub:1.1}
    });
  });

  /* lista de etapas: cada linha desliza de um lado, alternando */
  cada('.prateleira > .etapa', function(li, i){
    if(escondido(li) || noTopo(li)) return;
    gsap.fromTo(li, {x:i % 2 ? -34 : 34, autoAlpha:0}, {
      x:0, autoAlpha:1, ease:'none',
      scrollTrigger:{trigger:li, start:'top 94%', end:'top 58%', scrub:.65}
    });
  });

  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ ST.refresh(); });
  ST.refresh();
  }
})();
