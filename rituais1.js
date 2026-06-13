(function () {
  'use strict';

  var DB           = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var ADMINS       = ['1', '2', '3', '4', '6'];
  var CLASSIFICACOES = ['Fácil', 'Mediano', 'Avançado', 'Complexo'];

  function fkey(uid)  { return 'u' + String(uid).replace(/^u/i, ''); }
  function rGet(p)    { return fetch(DB + p + '.json').then(function(r){ return r.json(); }); }
  function rPut(p, d) { return fetch(DB + p + '.json', { method: 'PUT',    body: JSON.stringify(d) }); }
  function rPost(p,d) { return fetch(DB + p + '.json', { method: 'POST',   body: JSON.stringify(d) }); }
  function rDel(p)    { return fetch(DB + p + '.json', { method: 'DELETE' }); }

  function getRitualUID() {
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

  function rToast(msg, erro) {
    var t = document.getElementById('ritual-toast'); if (!t) return;
    t.textContent = msg;
    t.className = 'ritual-toast' + (erro ? ' ritual-toast-erro' : '');
    t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateY(8px)'; }, 3500);
  }

  function abrirModalRitual(dados) {
    var ant = document.getElementById('ritual-modal'); if (ant) ant.remove();
    var modal = document.createElement('div');
    modal.id = 'ritual-modal';
    modal.className = 'ritual-modal-overlay';

    function linha(label, val) {
      if (!val) return '';
      return '<div class="ritual-modal-linha"><span class="ritual-modal-label">' + label + '</span><span class="ritual-modal-val">' + val + '</span></div>';
    }

    modal.innerHTML =
      '<div class="ritual-modal-box">' +
        '<div class="ritual-modal-header">' +
          '<span class="ritual-modal-titulo">' + (dados.nome || '—') + '</span>' +
          '<button class="ritual-modal-fechar" onclick="document.getElementById(\'ritual-modal\').remove()">✕</button>' +
        '</div>' +
        '<div class="ritual-modal-corpo">' +
          linha('Descrição',        dados.descricao) +
          linha('Itens Necessários', dados.itens) +
          linha('Modo de Execução',  dados.execucao) +
          linha('Classificação',     dados.classificacao) +
          linha('Gasto',             dados.gasto) +
          linha('Dano',              dados.dano) +
          linha('Restrição',         dados.restricao) +
          linha('Obtenção',          dados.obtencao) +
        '</div>' +
      '</div>';

    modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  function montarCard(dados, chave, podeGer) {
    var btnRm = podeGer
      ? '<button class="ritual-btn-rm" onclick="window._ritualRemover(\'' + chave + '\')" title="Remover">✕</button>'
      : '';

    var dadosJson = encodeURIComponent(JSON.stringify(dados));

    return '<div class="ritual-card" data-chave="' + chave + '">' +
      '<div class="ritual-card-topo" onclick="window._ritualAbrirModal(\'' + dadosJson + '\')" style="cursor:pointer">' +
        '<div class="ritual-card-esq">' +
          '<span class="ritual-nome">' + (dados.nome || '—') + '</span>' +
          '<span class="ritual-classif">' + (dados.classificacao || '') + '</span>' +
        '</div>' +
        (podeGer ? '<div class="ritual-card-acoes">' + btnRm + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  window._ritualAbrirModal = function(dadosJson) {
    try { abrirModalRitual(JSON.parse(decodeURIComponent(dadosJson))); } catch(e) {}
  };

  window._ritualRemover = function(chave) {
    if (!podeGerenciar()) return;
    var uid = getRitualUID(); if (!uid) return;
    if (!window.confirm('Remover este ritual do perfil?')) return;
    rDel('/rituais-personagem/' + fkey(uid) + '/' + chave)
      .then(function(){ rToast('Ritual removido.'); carregarRituais(); })
      .catch(function(){ rToast('Erro ao remover.', true); });
  };

  function bindSeletor(uid, catalogo, obtidos) {
    var btnAbrir  = document.getElementById('ritual-btn-abrir-sel');
    var seletor   = document.getElementById('ritual-seletor');
    var btnFechar = document.getElementById('ritual-fechar-sel');
    var input     = document.getElementById('ritual-busca-input');
    var lista     = document.getElementById('ritual-lista-opcoes');
    var btnUniq   = document.getElementById('ritual-btn-unica');
    var formUniq  = document.getElementById('ritual-form-unica');
    var btnSalvU  = document.getElementById('ritual-salvar-unica');
    var btnFechU  = document.getElementById('ritual-fechar-unica');
    if (!btnAbrir || !seletor) return;

    var slugsObtidos = obtidos ? Object.keys(obtidos) : [];

    function renderOpcoes(filtro) {
      var html = '';
      Object.keys(catalogo).sort().forEach(function(slug) {
        if (slugsObtidos.indexOf(slug) !== -1) return;
        var nome = catalogo[slug].nome || slug;
        if (filtro && nome.toLowerCase().indexOf(filtro.toLowerCase()) === -1) return;
        var classif = catalogo[slug].classificacao || '';
        html +=
          '<div class="ritual-opcao">' +
            '<div class="ritual-opcao-info">' +
              '<span class="ritual-opcao-nome">' + nome + '</span>' +
              '<span class="ritual-opcao-classif">' + classif + '</span>' +
            '</div>' +
            '<button class="ritual-btn-add-opcao" data-slug="' + slug + '">+ Adicionar</button>' +
          '</div>';
      });
      lista.innerHTML = html || '<div class="ritual-vazio" style="padding:8px">Nenhum resultado.</div>';
      lista.querySelectorAll('.ritual-btn-add-opcao').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var s = btn.dataset.slug;
          var item = Object.assign({}, catalogo[s]);
          rPut('/rituais-personagem/' + fkey(uid) + '/' + s, item)
            .then(function(){ rToast((item.nome||s) + ' adicionado!'); carregarRituais(); })
            .catch(function(){ rToast('Erro ao adicionar.', true); });
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
        var nome     = document.getElementById('ru-nome').value.trim();
        var desc     = document.getElementById('ru-desc').value.trim();
        var itens    = document.getElementById('ru-itens').value.trim();
        var exec     = document.getElementById('ru-exec').value.trim();
        var classif  = document.getElementById('ru-classif').value;
        var gasto    = document.getElementById('ru-gasto').value.trim();
        var dano     = document.getElementById('ru-dano').value.trim();
        var rest     = document.getElementById('ru-rest').value.trim();
        var obtenc   = document.getElementById('ru-obtenc').value.trim();
        if (!nome) { rToast('Nome obrigatório.', true); return; }
        rPost('/rituais-personagem/' + fkey(uid), {
          nome: nome, descricao: desc, itens: itens, execucao: exec,
          classificacao: classif, gasto: gasto, dano: dano,
          restricao: rest, obtencao: obtenc, _unico: true
        }).then(function(){ rToast('Ritual único adicionado!'); carregarRituais(); })
          .catch(function(){ rToast('Erro ao salvar.', true); });
      });
    }
  }

  function renderRituais(uid, catalogo, obtidos, podeGer) {
    var el = document.querySelector('.divrituais'); if (!el) return;

    var toast = '<div id="ritual-toast" class="ritual-toast"></div>';

    var btnAdd = podeGer
      ? '<div class="ritual-add-wrap">' +
          '<button class="ritual-btn-add" id="ritual-btn-abrir-sel"><i class="ph ph-plus"></i> Database</button>' +
          '<button class="ritual-btn-add" id="ritual-btn-unica"><i class="ph ph-plus"></i> Ritual único</button>' +
        '</div>'
      : '';

    var seletorHtml = podeGer
      ? '<div class="ritual-seletor" id="ritual-seletor" style="display:none">' +
          '<input class="ritual-busca" id="ritual-busca-input" type="text" placeholder="Buscar ritual...">' +
          '<div class="ritual-lista-opcoes" id="ritual-lista-opcoes"></div>' +
          '<button class="ritual-btn-fechar-sel" id="ritual-fechar-sel">Fechar</button>' +
        '</div>' +
        '<div class="ritual-form-unica" id="ritual-form-unica" style="display:none">' +
          '<div class="ritual-edit-row"><label>Nome</label><input class="ritual-input" id="ru-nome" type="text"></div>' +
          '<div class="ritual-edit-row"><label>Descrição</label><textarea class="ritual-input ritual-textarea" id="ru-desc"></textarea></div>' +
          '<div class="ritual-edit-row"><label>Itens Necessários</label><textarea class="ritual-input ritual-textarea" id="ru-itens"></textarea></div>' +
          '<div class="ritual-edit-row"><label>Modo de Execução</label><textarea class="ritual-input ritual-textarea" id="ru-exec"></textarea></div>' +
          '<div class="ritual-edit-row"><label>Classificação</label>' +
            '<select class="ritual-input" id="ru-classif">' +
              CLASSIFICACOES.map(function(c){ return '<option value="' + c + '">' + c + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="ritual-edit-row"><label>Gasto</label><input class="ritual-input" id="ru-gasto" type="text"></div>' +
          '<div class="ritual-edit-row"><label>Dano</label><input class="ritual-input" id="ru-dano" type="text" value="Nenhum."></div>' +
          '<div class="ritual-edit-row"><label>Restrição</label><input class="ritual-input" id="ru-rest" type="text" value="Nenhuma."></div>' +
          '<div class="ritual-edit-row"><label>Obtenção</label><input class="ritual-input" id="ru-obtenc" type="text"></div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="ritual-btn-conf" id="ritual-salvar-unica">Salvar</button>' +
            '<button class="ritual-btn-fechar-sel" id="ritual-fechar-unica">Fechar</button>' +
          '</div>' +
        '</div>'
      : '';

    var grupos = {};
    CLASSIFICACOES.forEach(function(c){ grupos[c] = []; });
    grupos['Obtidos'] = [];

    if (obtidos) {
      Object.keys(obtidos).forEach(function(chave) {
        var item = obtidos[chave];
        var c = item.classificacao || '';
        if (grupos[c]) {
          grupos[c].push(montarCard(item, chave, podeGer));
        } else {
          grupos['Obtidos'].push(montarCard(item, chave, podeGer));
        }
      });
    }

    var todasAbas = CLASSIFICACOES.concat(['Obtidos']);
    var primeiraAtiva = null;

    var abasVisiveis = todasAbas.filter(function(c) {
      return podeGer || grupos[c].length > 0;
    });

    if (abasVisiveis.length) primeiraAtiva = abasVisiveis[0];

    var tabsHtml = '<div class="ritual-tabs">';
    abasVisiveis.forEach(function(c) {
      var ativo = c === primeiraAtiva;
      tabsHtml += '<button class="ritual-tab' + (ativo ? ' ritual-tab-ativo' : '') + '" data-grupo="' + c + '">' + c + '</button>';
    });
    tabsHtml += '</div>';

    var paineis = '';
    abasVisiveis.forEach(function(c) {
      var ativo = c === primeiraAtiva;
      var conteudo = grupos[c].length
        ? grupos[c].join('')
        : '<div class="ritual-vazio">Nenhum ritual nesta classificação.</div>';
      paineis += '<div class="ritual-painel' + (ativo ? '' : ' ritual-oculto') + '" data-grupo="' + c + '">' + conteudo + '</div>';
    });

    el.innerHTML = toast + btnAdd + seletorHtml + tabsHtml + '<div class="ritual-paineis">' + paineis + '</div>';

    el.querySelectorAll('.ritual-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        el.querySelectorAll('.ritual-tab').forEach(function(b){ b.classList.remove('ritual-tab-ativo'); });
        el.querySelectorAll('.ritual-painel').forEach(function(p){ p.classList.add('ritual-oculto'); });
        btn.classList.add('ritual-tab-ativo');
        el.querySelector('.ritual-painel[data-grupo="' + btn.dataset.grupo + '"]').classList.remove('ritual-oculto');
      });
    });

    if (podeGer) bindSeletor(uid, catalogo, obtidos);
  }

  function carregarRituais() {
    var el = document.querySelector('.divrituais'); if (!el) return;
    var uid = getRitualUID();
    if (!uid) { el.innerHTML = '<div class="ritual-vazio">UID não identificado.</div>'; return; }
    el.innerHTML = '<div class="ritual-vazio">Carregando...</div>';
    Promise.all([
      rGet('/rituais'),
      rGet('/rituais-personagem/' + fkey(uid))
    ]).then(function(res) {
      renderRituais(uid, res[0] || {}, res[1] || {}, podeGerenciar());
    }).catch(function() {
      el.innerHTML = '<div class="ritual-vazio">Erro ao carregar rituais.</div>';
    });
  }

  window.carregarRituais = carregarRituais;

  function tentarCarregar(n) {
    var el = document.querySelector('.divrituais');
    if (el) { carregarRituais(); return; }
    if (n <= 0) return;
    setTimeout(function(){ tentarCarregar(n-1); }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ tentarCarregar(20); });
  } else {
    tentarCarregar(20);
  }

})();