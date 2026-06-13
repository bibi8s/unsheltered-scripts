(function () {
  'use strict';

  var DB     = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var ANOS   = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', 'Avançadas'];
  var ADMINS = ['1', '2', '3', '4', '6'];

  function fkey(uid) { return 'u' + String(uid).replace(/^u/i, ''); }
  function pGet(p)    { return fetch(DB + p + '.json').then(function(r){ return r.json(); }); }
  function rPut(p, d) { return fetch(DB + p + '.json', { method: 'PUT',  body: JSON.stringify(d) }); }
  function rPost(p,d) { return fetch(DB + p + '.json', { method: 'POST', body: JSON.stringify(d) }); }
  function rDel(p)    { return fetch(DB + p + '.json', { method: 'DELETE' }); }

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
    t.className = 'ritual-toast' + (erro ? ' ritual-toast-erro' : '');
    t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateY(8px)'; }, 3500);
  }

  function montarCard(dados, chave, podeGer) {
    var labelExib = dados.dificuldade_label || dados.dificuldade || '';
    var btnRm = podeGer
      ? '<button class="ritual-btn-rm" onclick="window._pocaoRemover(\'' + chave + '\')" title="Remover">✕</button>'
      : '';
    var dadosJson = encodeURIComponent(JSON.stringify(dados));
    return '<div class="pocao-card" data-chave="' + chave + '">' +
      '<div class="pocao-card-topo" onclick="window._pocaoAbrirModal(\'' + dadosJson + '\')" style="cursor:pointer">' +
        '<div class="ritual-card-esq">' +
          '<span class="pocao-nome">' + (dados.nome || '—') + '</span>' +
          '<span class="pocao-dific">' + labelExib + '</span>' +
        '</div>' +
        (podeGer ? '<div class="ritual-card-acoes">' + btnRm + '</div>' : '') +
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

  window._pocaoRemover = function(chave) {
    if (!podeGerenciar()) return;
    var uid = getPocaoUID(); if (!uid) return;
    if (!window.confirm('Remover esta poção do perfil?')) return;
    rDel('/pocoes-personagem/' + fkey(uid) + '/' + chave)
      .then(function(){ pToast('Poção removida.'); carregarPocoes(); })
      .catch(function(){ pToast('Erro ao remover.', true); });
  };

  function bindSeletor(uid, catalogo, obtidas) {
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

    var slugsObtidas = obtidas ? Object.keys(obtidas) : [];

    function renderOpcoes(filtro) {
      var html = '';
      Object.keys(catalogo).sort().forEach(function(slug) {
        if (slugsObtidas.indexOf(slug) !== -1) return;
        var nome = catalogo[slug].nome || slug;
        if (filtro && nome.toLowerCase().indexOf(filtro.toLowerCase()) === -1) return;
        var label = catalogo[slug].dificuldade_label || catalogo[slug].dificuldade || '';
        html +=
          '<div class="ritual-opcao">' +
            '<div class="ritual-opcao-info">' +
              '<span class="ritual-opcao-nome">' + nome + '</span>' +
              '<span class="ritual-opcao-classif">' + label + '</span>' +
            '</div>' +
            '<button class="ritual-btn-add-opcao" data-slug="' + slug + '">+ Adicionar</button>' +
          '</div>';
      });
      lista.innerHTML = html || '<div class="ritual-vazio" style="padding:8px">Nenhum resultado.</div>';
      lista.querySelectorAll('.ritual-btn-add-opcao').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var s = btn.dataset.slug;
          var item = Object.assign({}, catalogo[s]);
          rPut('/pocoes-personagem/' + fkey(uid) + '/' + s, item)
            .then(function(){ pToast((item.nome||s) + ' adicionada!'); carregarPocoes(); })
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
      });
    }
    if (btnFechU && formUniq) {
      btnFechU.addEventListener('click', function(){ formUniq.style.display = 'none'; });
    }

    if (btnSalvU) {
      btnSalvU.addEventListener('click', function() {
        var nome  = document.getElementById('pu-nome').value.trim();
        var desc  = document.getElementById('pu-desc').value.trim();
        var acao  = document.getElementById('pu-acao').value.trim();
        var frasc = document.getElementById('pu-frascos').value.trim();
        var ingr  = document.getElementById('pu-ingred').value.trim();
        var prep  = document.getElementById('pu-preparo').value.trim();
        var dific = document.getElementById('pu-dific').value;
        var dlabel= document.getElementById('pu-dific-label').value.trim();
        if (!nome) { pToast('Nome obrigatório.', true); return; }
        rPost('/pocoes-personagem/' + fkey(uid), {
          nome: nome, descricao: desc, acao_turnos: acao, frascos: frasc,
          ingredientes: ingr, preparo: prep, dificuldade: dific,
          dificuldade_label: dlabel || dific, _unica: true
        }).then(function(){ pToast('Poção única adicionada!'); carregarPocoes(); })
          .catch(function(){ pToast('Erro ao salvar.', true); });
      });
    }
  }

  function renderPocoes(uid, catalogo, obtidas, podeGer) {
    var el = document.querySelector('.divpocoes'); if (!el) return;

    var toast = '<div id="pocao-toast" class="ritual-toast"></div>';

    var btnAdd = podeGer
      ? '<div class="ritual-add-wrap">' +
          '<button class="ritual-btn-add" id="pocao-btn-abrir-sel"><i class="ph ph-plus"></i> Database</button>' +
          '<button class="ritual-btn-add" id="pocao-btn-unica"><i class="ph ph-plus"></i> Poção única</button>' +
        '</div>'
      : '';

    var seletorHtml = podeGer
      ? '<div class="ritual-seletor" id="pocao-seletor" style="display:none">' +
          '<input class="ritual-busca" id="pocao-busca-input" type="text" placeholder="Buscar poção...">' +
          '<div class="ritual-lista-opcoes" id="pocao-lista-opcoes"></div>' +
          '<button class="ritual-btn-fechar-sel" id="pocao-fechar-sel">Fechar</button>' +
        '</div>' +
        '<div class="ritual-form-unica" id="pocao-form-unica" style="display:none">' +
          '<div class="ritual-edit-row"><label>Nome</label><input class="ritual-input" id="pu-nome" type="text"></div>' +
          '<div class="ritual-edit-row"><label>Descrição</label><textarea class="ritual-input ritual-textarea" id="pu-desc"></textarea></div>' +
          '<div class="ritual-edit-row"><label>Ação em Turnos</label><input class="ritual-input" id="pu-acao" type="text"></div>' +
          '<div class="ritual-edit-row"><label>Frascos por Fabricação</label><input class="ritual-input" id="pu-frascos" type="text"></div>' +
          '<div class="ritual-edit-row"><label>Ingredientes</label><textarea class="ritual-input ritual-textarea" id="pu-ingred"></textarea></div>' +
          '<div class="ritual-edit-row"><label>Modo de Preparo</label><textarea class="ritual-input ritual-textarea" id="pu-preparo"></textarea></div>' +
          '<div class="ritual-edit-row"><label>Dificuldade (aba)</label>' +
            '<select class="ritual-input" id="pu-dific">' +
              ANOS.map(function(a){ return '<option value="' + a + '">' + a + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="ritual-edit-row"><label>Dificuldade (exibição)</label><input class="ritual-input" id="pu-dific-label" type="text" placeholder="ex: Avançado, Principiante..."></div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="ritual-btn-conf" id="pocao-salvar-unica">Salvar</button>' +
            '<button class="ritual-btn-fechar-sel" id="pocao-fechar-unica">Fechar</button>' +
          '</div>' +
        '</div>'
      : '';

    var grupos = {};
    ANOS.forEach(function(a){ grupos[a] = []; });
    grupos['Obtidas'] = [];

    if (obtidas) {
      Object.keys(obtidas).forEach(function(chave) {
        var item = obtidas[chave];
        var d = item.dificuldade || '';
        if (grupos[d]) {
          grupos[d].push(montarCard(item, chave, podeGer));
        } else {
          grupos['Obtidas'].push(montarCard(item, chave, podeGer));
        }
      });
    }

    var todasAbas = ANOS.concat(['Obtidas']);
    var abasVisiveis = todasAbas.filter(function(a){ return podeGer || grupos[a].length > 0; });
    var primeiraAtiva = abasVisiveis[0] || null;

    var tabsHtml = '<div class="pocao-tabs">';
    abasVisiveis.forEach(function(a) {
      tabsHtml += '<button class="pocao-tab' + (a === primeiraAtiva ? ' pocao-tab-ativo' : '') + '" data-ano="' + a + '">' + a + '</button>';
    });
    tabsHtml += '</div>';

    var paineis = '';
    abasVisiveis.forEach(function(a) {
      var conteudo = grupos[a].length
        ? grupos[a].join('')
        : '<div class="pocao-vazio">Nenhuma poção nesta categoria.</div>';
      paineis += '<div class="pocao-painel' + (a === primeiraAtiva ? '' : ' pocao-oculto') + '" data-ano="' + a + '">' + conteudo + '</div>';
    });

    el.innerHTML = toast + btnAdd + seletorHtml + tabsHtml + '<div class="pocao-paineis">' + paineis + '</div>';

    el.querySelectorAll('.pocao-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        el.querySelectorAll('.pocao-tab').forEach(function(b){ b.classList.remove('pocao-tab-ativo'); });
        el.querySelectorAll('.pocao-painel').forEach(function(p){ p.classList.add('pocao-oculto'); });
        btn.classList.add('pocao-tab-ativo');
        el.querySelector('.pocao-painel[data-ano="' + btn.dataset.ano + '"]').classList.remove('pocao-oculto');
      });
    });

    if (podeGer) bindSeletor(uid, catalogo, obtidas);
  }

  function carregarPocoes() {
    var el = document.querySelector('.divpocoes'); if (!el) return;
    var uid = getPocaoUID();
    if (!uid) { el.innerHTML = '<div class="pocao-vazio">UID não identificado.</div>'; return; }
    el.innerHTML = '<div class="pocao-vazio">Carregando...</div>';
    Promise.all([
      pGet('/pocoes'),
      pGet('/pocoes-personagem/' + fkey(uid))
    ]).then(function(res) {
      renderPocoes(uid, res[0] || {}, res[1] || {}, podeGerenciar());
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