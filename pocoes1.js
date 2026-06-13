(function () {
  'use strict';

  var DB     = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var ANOS   = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', 'Avançadas'];

  function pGet(p) { return fetch(DB + p + '.json').then(function(r){ return r.json(); }); }

  function montarCard(slug, dados) {
    var dadosJson = encodeURIComponent(JSON.stringify(Object.assign({ _slug: slug }, dados)));
    var labelExib = dados.dificuldade_label || dados.dificuldade || '';
    return '<div class="pocao-card" data-slug="' + slug + '" onclick="window._pocaoAbrirModal(\'' + dadosJson + '\')" style="cursor:pointer">' +
      '<div class="pocao-card-topo">' +
        '<span class="pocao-nome">' + (dados.nome || slug) + '</span>' +
        '<span class="pocao-dific">' + labelExib + '</span>' +
      '</div>' +
    '</div>';
  }

  window._pocaoAbrirModal = function(dadosJson) {
    try {
      var dados = JSON.parse(decodeURIComponent(dadosJson));
      var ant = document.getElementById('pocao-modal'); if (ant) ant.remove();
      var modal = document.createElement('div');
      modal.id = 'pocao-modal';
      modal.className = 'pocao-modal-overlay';

      function linha(label, val) {
        if (!val) return '';
        return '<div class="pocao-modal-linha"><span class="pocao-modal-label">' + label + '</span><span class="pocao-modal-val">' + val + '</span></div>';
      }

      var labelDific = dados.dificuldade_label || dados.dificuldade || '';

      modal.innerHTML =
        '<div class="pocao-modal-box">' +
          '<div class="pocao-modal-header">' +
            '<span class="pocao-modal-titulo">' + (dados.nome || '—') + '</span>' +
            '<button class="pocao-modal-fechar" onclick="document.getElementById(\'pocao-modal\').remove()">✕</button>' +
          '</div>' +
          '<div class="pocao-modal-corpo">' +
            linha('Descrição',              dados.descricao) +
            linha('Ação em Turnos',         dados.acao_turnos) +
            linha('Frascos por Fabricação', dados.frascos) +
            linha('Ingredientes',           dados.ingredientes) +
            linha('Modo de Preparo',        dados.preparo) +
            linha('Dificuldade',            labelDific) +
          '</div>' +
        '</div>';

      modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
      document.body.appendChild(modal);
    } catch(e) {}
  };

  function renderPocoes(catalogo) {
    var el = document.querySelector('.divpocoes'); if (!el) return;

    var grupos = {};
    ANOS.forEach(function(a){ grupos[a] = []; });

    Object.keys(catalogo).forEach(function(slug) {
      var item = catalogo[slug];
      var dific = item.dificuldade || '';
      if (grupos[dific]) {
        grupos[dific].push(montarCard(slug, item));
      }
    });

    var tabsHtml = '<div class="pocao-tabs">';
    ANOS.forEach(function(a, i) {
      tabsHtml += '<button class="pocao-tab' + (i === 0 ? ' pocao-tab-ativo' : '') + '" data-ano="' + a + '">' + a + '</button>';
    });
    tabsHtml += '</div>';

    var paineis = '';
    ANOS.forEach(function(a, i) {
      var conteudo = grupos[a].length
        ? grupos[a].join('')
        : '<div class="pocao-vazio">Nenhuma poção nesta categoria.</div>';
      paineis += '<div class="pocao-painel' + (i === 0 ? '' : ' pocao-oculto') + '" data-ano="' + a + '">' + conteudo + '</div>';
    });

    el.innerHTML = tabsHtml + '<div class="pocao-paineis">' + paineis + '</div>';

    el.querySelectorAll('.pocao-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        el.querySelectorAll('.pocao-tab').forEach(function(b){ b.classList.remove('pocao-tab-ativo'); });
        el.querySelectorAll('.pocao-painel').forEach(function(p){ p.classList.add('pocao-oculto'); });
        btn.classList.add('pocao-tab-ativo');
        el.querySelector('.pocao-painel[data-ano="' + btn.dataset.ano + '"]').classList.remove('pocao-oculto');
      });
    });
  }

  function carregarPocoes() {
    var el = document.querySelector('.divpocoes'); if (!el) return;
    el.innerHTML = '<div class="pocao-vazio">Carregando...</div>';
    pGet('/pocoes').then(function(data) {
      renderPocoes(data || {});
    }).catch(function() {
      el.innerHTML = '<div class="pocao-vazio">Erro ao carregar poções.</div>';
    });
  }

  window.carregarPocoes = carregarPocoes;

  function tentarCarregar(n) {
    var el = document.querySelector('.divpocoes');
    if (el) { carregarPocoes(); return; }
    if (n <= 0) return;
    setTimeout(function(){ tentarCarregar(n-1); }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ tentarCarregar(20); });
  } else {
    tentarCarregar(20);
  }

})();