(function () {
  'use strict';

  var DB     = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var ADMINS = ['1', '2', '3', '4', '6'];
  var ANOS   = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', 'Avançadas'];

  function fkey(uid) { return 'u' + String(uid).replace(/^u/i, ''); }
  function pGet(p)   { return fetch(DB + p + '.json').then(function(r){ return r.json(); }); }
  function rPut(p,d) { return fetch(DB + p + '.json', { method: 'PUT',  body: JSON.stringify(d) }); }
  function rPost(p,d){ return fetch(DB + p + '.json', { method: 'POST', body: JSON.stringify(d) }); }
  function rDel(p)   { return fetch(DB + p + '.json', { method: 'DELETE' }); }

  function getPocaoUID() {
    var el = document.getElementById('inv-uid');
    if (el) return el.textContent.trim();
    var m = window.location.pathname.match(/\/u(\d+)/i);
    if (m) return m[1];
    return typeof _userdata !== 'undefined' ? String(_userdata.user_id) : null;
  }

  function podeGerenciar() {
    if (typeof _userdata === 'undefined') return false;
    return ADMINS.indexOf(String(_userdata.user_id)) !== -1;
  }

  function pToast(msg, erro) {
    var t = document.getElementById('pocao-toast'); if (!t) return;
    t.textContent = msg;
    t.className = 'pocao-toast' + (erro ? ' pocao-toast-erro' : '');
    t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateY(8px)'; }, 3500);
  }

  function montarCard(slug, dados, chave, podeGer) {
    var dadosJson = encodeURIComponent(JSON.stringify(Object.assign({ _slug: slug }, dados)));
    var labelExib = dados.dificuldade_label || dados.dificuldade || '';
    var btnRm = (chave && podeGer)
      ? '<button class="pocao-btn-rm" onclick="window._pocaoRemover(\'' + chave + '\')" title="Remover">✕</button>'
      : '';
    return '<div class="pocao-card" data-slug="' + slug + '">' +
      '<div class="pocao-card-topo" onclick="window._pocaoAbrirModal(\'' + dadosJson + '\')" style="cursor:pointer">' +
        '<span class="pocao-nome">' + (dados.nome || slug) + '</span>' +
        '<span class="pocao-dific">' + labelExib + '</span>' +
      '</div>' +
      (btnRm ? '<div class="pocao-card-acoes">' + btnRm + '</div>' : '') +
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
            linha('Dificuldade',            dados.dificuldade_label || dados.dificuldade) +
          '</div>' +
        '</div>';
      modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
      document.body.appendChild(modal);
    } catch(e) {}
  };

  window._pocaoRemover = function(chave) {
    if (!podeGerenciar()) return;
    var uid = getPocaoUID(); if (!uid) return;
    if (!window.confirm('Remover esta poção do perfil?')) return;
    rDel('/pocoes-personagem/' + fkey(uid) + '/' + chave)
      .then(function(){ pToast('Poção removida.'); carregarPocoes(); })
      .catch(function(){ pToast('Erro ao remover.', true); });
  };

  function bindSeletor(uid, catalogo, obtidos) {
    var btnAbrir  = document.getElementById('pocao-btn-abrir-sel');
    var seletor   = document.getElementById('pocao-seletor');
    var btnFechar = document.getElementById('pocao-fechar-sel');
    var input     = document.getElementById('pocao-busca-input');
    var lista     = document.getElementById('pocao-lista-opcoes');
    var btnUniq   = document.getElementById('pocao-btn-unica');
    var formUniq  = document.getElementById('pocao-form-unica');
    var btnSalvU  = document.getElementById('pocao-salvar-unica');
    var btnFechU  = document.getElementById('pocao-fechar-unica');
    if (!btnAbrir || !seletor) return;

    var slugsObtidos = obtidos ? Object.keys(obtidos) : [];

    function renderOpcoes(filtro) {
      var html = '';
      Object.keys(catalogo).sort().forEach(function(slug) {
        if ((catalogo[slug].dificuldade || '') !== 'Avançadas') return;
        if (slugsObtidos.indexOf(slug) !== -1) return;
        var nome = catalogo[slug].nome || slug;
        if (filtro && nome.toLowerCase().indexOf(filtro.toLowerCase()) === -1) return;
        html += '<div class="pocao-opcao">' +
          '<span class="pocao-opcao-nome">' + nome + '</span>' +
          '<button class="pocao-btn-add-opcao" data-slug="' + slug + '">+ Adicionar</button>' +
        '</div>';
      });
      lista.innerHTML = html || '<div class="pocao-vazio" style="padding:8px">Nenhum resultado.</div>';
      lista.querySelectorAll('.pocao-btn-add-opcao').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var s = btn.dataset.slug;
          rPut('/pocoes-personagem/' + fkey(uid) + '/' + s, Object.assign({}, catalogo[s]))
            .then(function(){ pToast((catalogo[s].nome||s) + ' adicionada!'); carregarPocoes(); })
            .catch(function(){ pToast('Erro ao adicionar.', true); });
        });
      });
    }

    btnAbrir.addEventListener('click', function() {
      var aberto = seletor.style.display !== 'none';
      seletor.style.display = aberto ? 'none' : 'block';
      if (formUniq) formUniq.style.display = 'none';
      if (!aberto) { renderOpcoes(''); input.focus(); }
    });
    btnFechar.addEventListener('click', function(){ seletor.style.display = 'none'; });
    input.addEventListener('input', function(){ renderOpcoes(input.value); });

    if (btnUniq && formUniq) {
      btnUniq.addEventListener('click', function(){
        formUniq.style.display = formUniq.style.display === 'none' ? 'block' : 'none';
        seletor.style.display = 'none';
      });
    }
    if (btnFechU) btnFechU.addEventListener('click', function(){ formUniq.style.display = 'none'; });

    if (btnSalvU) {
      btnSalvU.addEventListener('click', function() {
        var nome = document.getElementById('pau-nome').value.trim();
        if (!nome) { pToast('Nome obrigatório.', true); return; }
        rPost('/pocoes-personagem/' + fkey(uid), {
          nome:        nome,
          descricao:   document.getElementById('pau-desc').value.trim(),
          acao_turnos: document.getElementById('pau-acao').value.trim(),
          frascos:     document.getElementById('pau-frascos').value.trim(),
          ingredientes:document.getElementById('pau-ingr').value.trim(),
          preparo:     document.getElementById('pau-prep').value.trim(),
          dificuldade: document.getElementById('pau-dific').value,
          _unica: true
        }).then(function(){ pToast('Poção única adicionada!'); carregarPocoes(); })
          .catch(function(){ pToast('Erro ao salvar.', true); });
      });
    }
  }

  function renderPocoes(uid, catalogo, obtidos, anosLiberados, podeGer) {
    var el = document.querySelector('.divpocoes'); if (!el) return;

    var grupos = {};
    ANOS.forEach(function(a){ grupos[a] = []; });

    // Poções do catálogo — filtra por ano liberado em feiticos-anos
    Object.keys(catalogo).forEach(function(slug) {
      var item  = catalogo[slug];
      var dific = item.dificuldade || '';
      if (dific === 'Avançadas') return;

      var m      = dific.match(/^(\d+)/);
      var numAno = m ? m[1] : null;
      var liberado = podeGer || (numAno && anosLiberados && anosLiberados[numAno] === true);
      if (!liberado) return;

      if (grupos[dific]) grupos[dific].push(montarCard(slug, item, null, false));
    });

    // Poções manuais do perfil (avançadas + únicas)
    Object.keys(obtidos).forEach(function(chave) {
      var item  = obtidos[chave];
      var dific = item.dificuldade || '';
      if (grupos[dific]) grupos[dific].push(montarCard(chave, item, chave, podeGer));
    });

    var btnAdd = podeGer
      ? '<div class="ritual-add-wrap">' +
          '<button class="ritual-btn-add" id="pocao-btn-abrir-sel"><i class="ph ph-plus"></i> Database</button>' +
          '<button class="ritual-btn-add" id="pocao-btn-unica"><i class="ph ph-plus"></i> Poção única</button>' +
        '</div>'
      : '';

    var seletorHtml = podeGer
      ? '<div class="ritual-seletor" id="pocao-seletor" style="display:none">' +
          '<input class="ritual-busca" id="pocao-busca-input" type="text" placeholder="Buscar poção avançada...">' +
          '<div class="ritual-lista-opcoes" id="pocao-lista-opcoes"></div>' +
          '<button class="ritual-btn-fechar-sel" id="pocao-fechar-sel">Fechar</button>' +
        '</div>' +
        '<div class="ritual-form-unica" id="pocao-form-unica" style="display:none">' +
          '<div class="ritual-edit-row"><label>Nome</label><input class="ritual-input" id="pau-nome" type="text"></div>' +
          '<div class="ritual-edit-row"><label>Descrição</label><textarea class="ritual-input ritual-textarea" id="pau-desc"></textarea></div>' +
          '<div class="ritual-edit-row"><label>Ação em Turnos</label><input class="ritual-input" id="pau-acao" type="text"></div>' +
          '<div class="ritual-edit-row"><label>Frascos por Fabricação</label><input class="ritual-input" id="pau-frascos" type="text"></div>' +
          '<div class="ritual-edit-row"><label>Ingredientes</label><textarea class="ritual-input ritual-textarea" id="pau-ingr"></textarea></div>' +
          '<div class="ritual-edit-row"><label>Modo de Preparo</label><textarea class="ritual-input ritual-textarea" id="pau-prep"></textarea></div>' +
          '<div class="ritual-edit-row"><label>Dificuldade</label>' +
            '<select class="ritual-input" id="pau-dific">' +
              ANOS.map(function(a){ return '<option value="' + a + '">' + a + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="ritual-btn-conf" id="pocao-salvar-unica">Salvar</button>' +
            '<button class="ritual-btn-fechar-sel" id="pocao-fechar-unica">Fechar</button>' +
          '</div>' +
        '</div>'
      : '';

    // Só mostra tabs de anos liberados (admin vê tudo)
    var tabsVisiveis = ANOS.filter(function(a) {
      if (a === 'Avançadas') return true;
      if (podeGer) return true;
      var m = a.match(/^(\d+)/);
      return m && anosLiberados && anosLiberados[m[1]] === true;
    });

    var tabsHtml = '<div class="pocao-tabs">';
    tabsVisiveis.forEach(function(a, i) {
      tabsHtml += '<button class="pocao-tab' + (i === 0 ? ' pocao-tab-ativo' : '') + '" data-ano="' + a + '">' + a + '</button>';
    });
    tabsHtml += '</div>';

    var paineis = '';
    tabsVisiveis.forEach(function(a, i) {
      var inner = grupos[a].length ? grupos[a].join('') : '<div class="pocao-vazio">Nenhuma poção nesta categoria.</div>';
      var extra = (a === 'Avançadas') ? btnAdd + seletorHtml : '';
      paineis += '<div class="pocao-painel' + (i === 0 ? '' : ' pocao-oculto') + '" data-ano="' + a + '">' + extra + inner + '</div>';
    });

    el.innerHTML = '<div id="pocao-toast" class="pocao-toast"></div>' + tabsHtml + '<div class="pocao-paineis">' + paineis + '</div>';

    el.querySelectorAll('.pocao-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        el.querySelectorAll('.pocao-tab').forEach(function(b){ b.classList.remove('pocao-tab-ativo'); });
        el.querySelectorAll('.pocao-painel').forEach(function(p){ p.classList.add('pocao-oculto'); });
        btn.classList.add('pocao-tab-ativo');
        el.querySelector('.pocao-painel[data-ano="' + btn.dataset.ano + '"]').classList.remove('pocao-oculto');
      });
    });

    if (podeGer) bindSeletor(uid, catalogo, obtidos);
  }

  function carregarPocoes() {
    var el = document.querySelector('.divpocoes'); if (!el) return;
    el.innerHTML = '<div class="pocao-vazio">Carregando...</div>';
    var uid = getPocaoUID();
    Promise.all([
      pGet('/pocoes'),
      uid ? pGet('/pocoes-personagem/' + fkey(uid)) : Promise.resolve({}),
      uid ? pGet('/feiticos-anos/'     + fkey(uid)) : Promise.resolve({})
    ]).then(function(res) {
      renderPocoes(uid, res[0] || {}, res[1] || {}, res[2] || {}, podeGerenciar());
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