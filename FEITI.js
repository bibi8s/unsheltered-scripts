(function () {
  'use strict';
  var DB_FEIT        = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var ADMINS_FEITICO = ['1', '2', '3', '4', '6'];
  var ANOS           = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano'];

  function fkeyF(uid) { return 'u' + String(uid).replace(/^u/i, ''); }
  function fpGet(p)    { return fetch(DB_FEIT + p + '.json').then(function(r){ return r.json(); }); }
  function fpPut(p, d) { return fetch(DB_FEIT + p + '.json', { method: 'PUT',    body: JSON.stringify(d) }); }
  function fpDel(p)    { return fetch(DB_FEIT + p + '.json', { method: 'DELETE' }); }

  function getFeiticoUID() {
    var el = document.getElementById('inv-uid');
    if (el) return el.textContent.trim();
    var match = window.location.pathname.match(/\/u(\d+)/i);
    if (match) return match[1];
    return typeof _userdata !== 'undefined' ? String(_userdata.user_id) : null;
  }

  function podeGerenciar() {
    if (typeof _userdata === 'undefined') return false;
    return ADMINS_FEITICO.indexOf(String(_userdata.user_id)) !== -1;
  }

  function fpToast(msg, erro) {
    var t = document.getElementById('feitico-toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'feitico-toast' + (erro ? ' feitico-toast-erro' : '');
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
    setTimeout(function() {
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
    }, 3500);
  }

   
  function anoLiberado(anosLiberados, numAno) {
    var n = parseInt(numAno);
    if (Array.isArray(anosLiberados)) return anosLiberados[n] === true;
    return anosLiberados && anosLiberados[String(n)] === true;
  }

  function montarCard(slug, dados, podeGer) {
    var nome          = dados.nome          || slug;
    var efeito        = dados.efeito        || '';
    var classificacao = dados.classificacao || '';
    var dano          = dados.dano          || '';
    var dificuldade   = dados.dificuldade   || '';
    var energia       = dados.energia       || '';
    var verbalidade   = dados.verbalidade   || '';
    var ano           = dados.ano           || '';
    var idColapse     = 'feit-col-' + slug;

    var detalhes = '';
    if (classificacao) detalhes += '<div class="feit-detalhe"><span class="feit-label">Classificação</span><span class="feit-val">' + classificacao + '</span></div>';
    if (ano)           detalhes += '<div class="feit-detalhe"><span class="feit-label">Ano</span><span class="feit-val">' + ano + '</span></div>';
    if (dificuldade)   detalhes += '<div class="feit-detalhe"><span class="feit-label">Dificuldade</span><span class="feit-val">' + dificuldade + '</span></div>';
    if (verbalidade)   detalhes += '<div class="feit-detalhe"><span class="feit-label">Verbalidade</span><span class="feit-val">' + verbalidade + '</span></div>';
    if (energia)       detalhes += '<div class="feit-detalhe"><span class="feit-label">Energia</span><span class="feit-val">' + energia + '</span></div>';
    if (dano)          detalhes += '<div class="feit-detalhe"><span class="feit-label">Dano</span><span class="feit-val">' + dano + '</span></div>';

    var btnRemover = podeGer
      ? '<button class="feit-btn-rm" onclick="window._feitRemover(\'' + slug + '\')" title="Remover">✕</button>'
      : '';

    var _textoCopia = nome;
    if (efeito)        _textoCopia += '\nEfeito: ' + efeito;
    if (ano)           _textoCopia += '\nAno: ' + ano;
    if (classificacao) _textoCopia += '\nClassificação: ' + classificacao;
    if (dificuldade)   _textoCopia += '\nDificuldade: ' + dificuldade;
    if (verbalidade)   _textoCopia += '\nVerbalidade: ' + verbalidade;
    if (energia)       _textoCopia += '\nEnergia: ' + energia;
    if (dano)          _textoCopia += '\nDano: ' + dano;

    var btnCopiar = '<button class="feit-btn-copiar" data-texto="' + encodeURIComponent(_textoCopia) + '" onclick="window._feitCopiar(this)" title="Copiar"><i class="fa-regular fa-copy"></i></button>';

    var btnToggle = detalhes
      ? '<button class="feit-btn-toggle" onclick="' +
          'var c=document.getElementById(\'' + idColapse + '\');' +
          'c.classList.toggle(\'feit-aberto\');' +
          'this.querySelector(\'i\').classList.toggle(\'ph-caret-down\');' +
          'this.querySelector(\'i\').classList.toggle(\'ph-caret-up\');">' +
          '<i class="ph ph-caret-down"></i></button>'
      : '';

    return '<div class="feit-card" data-slug="' + slug + '">' +
      '<div class="feit-card-topo">' +
        '<div class="feit-card-esq">' +
          '<span class="feit-nome">' + nome + '</span>' +
          (efeito ? '<span class="feit-efeito">' + efeito + '</span>' : '') +
        '</div>' +
        '<div class="feit-card-acoes">' + btnCopiar + btnToggle + btnRemover + '</div>' +
      '</div>' +
      (detalhes ? '<div id="' + idColapse + '" class="feit-detalhes">' + detalhes + '</div>' : '') +
    '</div>';
  }

  function renderBotoesAnos(uid, anos, catalogo, podeGer) {
    var wrap = document.getElementById('feit-anos-wrap'); if (!wrap) return;
    var html = '';
    ANOS.forEach(function(ano, i) {
      var num      = i + 1;
      var liberado = anoLiberado(anos, num);
      var label    = num + 'º Ano';
      if (liberado) {
        if (podeGer) {
          html +=
            '<div class="feit-ano-item">' +
              '<button class="feit-ano-btn feit-ano-liberado" onclick="window._feitAbrirModalAno(' + num + ')" title="' + ano + '">' + label + '</button>' +
              '<button class="feit-ano-toggle" onclick="window._feitToggleAno(\'' + uid + '\',' + num + ',true)" title="Bloquear ano"><i class="fa-solid fa-lock-open"></i></button>' +
            '</div>';
        } else {
          html += '<button class="feit-ano-btn feit-ano-liberado" onclick="window._feitAbrirModalAno(' + num + ')" title="' + ano + '">' + label + '</button>';
        }
      } else if (podeGer) {
        html +=
          '<div class="feit-ano-item">' +
            '<button class="feit-ano-btn feit-ano-bloqueado" onclick="window._feitAbrirModalAno(' + num + ')" title="' + ano + '">' + label + '</button>' +
            '<button class="feit-ano-toggle" onclick="window._feitToggleAno(\'' + uid + '\',' + num + ',false)" title="Liberar ano"><i class="fa-solid fa-lock"></i></button>' +
          '</div>';
      }
    });
    wrap.innerHTML = html;
    wrap._catalogo = catalogo;
  }

  window._feitAbrirModalAno = function(num) {
    var wrap     = document.getElementById('feit-anos-wrap');
    var catalogo = wrap ? wrap._catalogo : null;
    if (!catalogo) return;
    var anoLabel = num + 'º Ano';

    
    var itensDeste = Object.keys(catalogo).filter(function(slug) {
      return (catalogo[slug].ano || '').toLowerCase() === anoLabel.toLowerCase();
    });

     
    var grupos = {};
    itensDeste.forEach(function(slug) {
      var dif = catalogo[slug].dificuldade || 'Sem dificuldade';
      if (!grupos[dif]) grupos[dif] = [];
      grupos[dif].push(slug);
    });

 
    Object.keys(grupos).forEach(function(dif) {
      grupos[dif].sort(function(a, b) {
        var nA = (catalogo[a].nome || a).toLowerCase();
        var nB = (catalogo[b].nome || b).toLowerCase();
        return nA < nB ? -1 : nA > nB ? 1 : 0;
      });
    });

    
    var ordemDif = ['Fácil', 'Médio', 'Difícil', 'Muito Difícil', 'Sem dificuldade'];
    var difOrdenadas = Object.keys(grupos).sort(function(a, b) {
      var iA = ordemDif.indexOf(a);
      var iB = ordemDif.indexOf(b);
      if (iA === -1) iA = 99;
      if (iB === -1) iB = 99;
      return iA - iB;
    });

    
    var abaIds = difOrdenadas.map(function(dif) {
      return 'feit-dif-' + dif.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_');
    });

    var abasHtml = '';
    var conteudoHtml = '';

    if (difOrdenadas.length === 0) {
      conteudoHtml = '<div class="feit-vazio">Nenhum feitiço cadastrado para este ano.</div>';
    } else {
       
      abasHtml += '<div class="feit-anos-wrap" id="feit-dif-tabs" style="margin-bottom:14px">';
      difOrdenadas.forEach(function(dif, idx) {
        var ativo = idx === 0 ? ' feit-ano-liberado' : '';
        abasHtml += '<button class="feit-ano-btn' + ativo + '" onclick="window._feitMudarDif(\'' + abaIds[idx] + '\')">' + dif + '</button>';
      });
      abasHtml += '</div>';

      difOrdenadas.forEach(function(dif, idx) {
        var display = idx === 0 ? '' : 'display:none;';
        conteudoHtml += '<div id="' + abaIds[idx] + '" style="' + display + '">';
        grupos[dif].forEach(function(slug) {
          conteudoHtml += montarCard(slug, catalogo[slug], false);
        });
        conteudoHtml += '</div>';
      });
    }

    
    window._feitDifAbaIds = abaIds;

    var anterior = document.getElementById('feit-modal-ano');
    if (anterior) anterior.remove();

    var modal = document.createElement('div');
    modal.id        = 'feit-modal-ano';
    modal.className = 'feit-modal-overlay';
    modal.innerHTML =
      '<div class="feit-modal-box">' +
        '<div class="feit-modal-header">' +
          '<span class="feit-modal-titulo">' + anoLabel + ' — Feitiços</span>' +
          '<button class="feit-modal-fechar" onclick="document.getElementById(\'feit-modal-ano\').remove()">✕</button>' +
        '</div>' +
        '<div class="feit-modal-corpo">' +
          abasHtml +
          conteudoHtml +
        '</div>' +
      '</div>';

    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
  };
 
  window._feitMudarDif = function(abaAtiva) {
    var ids = window._feitDifAbaIds || [];
    // oculta todos os painéis
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
 
    var elAtivo = document.getElementById(abaAtiva);
    if (elAtivo) elAtivo.style.display = '';

 
    var tabs = document.querySelectorAll('#feit-dif-tabs .feit-ano-btn');
    tabs.forEach(function(btn) {
      btn.classList.remove('feit-ano-liberado');
    });
 
    tabs.forEach(function(btn) {
      if (btn.getAttribute('onclick') && btn.getAttribute('onclick').indexOf(abaAtiva) !== -1) {
        btn.classList.add('feit-ano-liberado');
      }
    });
  };

  window._feitToggleAno = function(uid, num, liberadoAtual) {
    if (!podeGerenciar()) return;
    var novoValor = !liberadoAtual;
    var path = DB_FEIT + '/feiticos-anos/' + fkeyF(uid) + '/' + String(num) + '.json';
    var op = novoValor
      ? fetch(path, { method: 'PUT', body: 'true' })
      : fetch(path, { method: 'DELETE' });
    op.then(function() {
      fpToast(num + 'º Ano ' + (novoValor ? 'liberado' : 'bloqueado') + '.');
      carregarFeiticos();
    }).catch(function() { fpToast('Erro ao atualizar ano.', true); });
  };

  function bindSeletor(uid, aprendidos, catalogo) {
    var btnAbrir  = document.getElementById('feit-btn-abrir-seletor');
    var seletor   = document.getElementById('feit-seletor');
    var btnFechar = document.getElementById('feit-fechar-seletor');
    var input     = document.getElementById('feit-busca-input');
    var lista     = document.getElementById('feit-lista-opcoes');
    if (!btnAbrir || !seletor) return;

    var slugsAprendidos = aprendidos
      ? Object.keys(aprendidos).filter(function(k) { return aprendidos[k]; })
      : [];

    function renderOpcoes(filtro) {
      var html = '';
      Object.keys(catalogo).sort().forEach(function(slug) {
        if (slugsAprendidos.indexOf(slug) !== -1) return;
        var nome = catalogo[slug].nome || slug;
        if (filtro && nome.toLowerCase().indexOf(filtro.toLowerCase()) === -1) return;
        html +=
          '<div class="feit-opcao">' +
            '<span class="feit-opcao-nome">' + nome + '</span>' +
            '<button class="feit-btn-add-opcao" data-slug="' + slug + '">+ Adicionar</button>' +
          '</div>';
      });
      lista.innerHTML = html || '<div class="feit-vazio" style="padding:8px">Nenhum resultado.</div>';
      lista.querySelectorAll('.feit-btn-add-opcao').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var s = btn.dataset.slug;
          fpPut('/feiticos-aprendidos/' + fkeyF(uid) + '/' + s, true).then(function() {
            fpToast((catalogo[s] && catalogo[s].nome ? catalogo[s].nome : s) + ' adicionado!');
            carregarFeiticos();
          }).catch(function() { fpToast('Erro ao adicionar.', true); });
        });
      });
    }

    btnAbrir.addEventListener('click', function() {
      var aberto = seletor.style.display !== 'none';
      seletor.style.display = aberto ? 'none' : 'block';
      if (!aberto) { renderOpcoes(''); input.focus(); }
    });
    btnFechar.addEventListener('click', function() { seletor.style.display = 'none'; });
    input.addEventListener('input', function() { renderOpcoes(input.value); });
  }

  function renderFeiticos(uid, aprendidos, anos, catalogo, podeGer) {
    var el = document.querySelector('.divfeiti'); if (!el) return;
    var slugs = aprendidos
      ? Object.keys(aprendidos).filter(function(k) { return aprendidos[k]; })
      : [];

    var btnAdd = podeGer
      ? '<button class="feit-btn-add" id="feit-btn-abrir-seletor"><i class="ph ph-plus"></i> Adicionar feitiço</button>'
      : '';
    var seletorHtml = podeGer
      ? '<div class="feit-seletor" id="feit-seletor" style="display:none">' +
          '<input class="feit-busca" id="feit-busca-input" type="text" placeholder="Buscar feitiço...">' +
          '<div class="feit-lista-opcoes" id="feit-lista-opcoes"></div>' +
          '<button class="feit-btn-fechar-sel" id="feit-fechar-seletor">Fechar</button>' +
        '</div>'
      : '';

    var toast   = '<div id="feitico-toast" class="feitico-toast"></div>';
    var anosBar = '<div id="feit-anos-wrap" class="feit-anos-wrap"></div>';
    var conteudo = slugs.length
      ? '<div class="feit-lista">' +
          slugs.map(function(slug) {
            return montarCard(slug, catalogo[slug] || { nome: slug }, podeGer);
          }).join('') +
        '</div>'
      : '<div class="feit-vazio">Nenhum feitiço aprendido.</div>';

    el.innerHTML = toast + anosBar + btnAdd + seletorHtml + conteudo;
    renderBotoesAnos(uid, anos, catalogo, podeGer);
    if (podeGer) bindSeletor(uid, aprendidos, catalogo);
  }

  window._feitCopiar = function(btn) {
    var texto = decodeURIComponent(btn.dataset.texto || '');
    if (!texto) return;
    var icon = btn.querySelector('i');
    function confirmar() {
      if (icon) { icon.className = 'fa-solid fa-check'; }
      setTimeout(function() { if (icon) { icon.className = 'fa-regular fa-copy'; } }, 1800);
    }
    navigator.clipboard.writeText(texto).then(confirmar).catch(function() {
      var ta = document.createElement('textarea');
      ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta); confirmar();
    });
  };

  window._feitRemover = function(slug) {
    if (!podeGerenciar()) return;
    var uid = getFeiticoUID(); if (!uid) return;
    if (!window.confirm('Remover este feitiço do perfil?')) return;
    fpDel('/feiticos-aprendidos/' + fkeyF(uid) + '/' + slug).then(function() {
      fpToast('Feitiço removido.');
      carregarFeiticos();
    }).catch(function() { fpToast('Erro ao remover.', true); });
  };

  function carregarFeiticos() {
    var el = document.querySelector('.divfeiti'); if (!el) return;
    var uid = getFeiticoUID();
    if (!uid) { el.innerHTML = '<div class="feit-vazio">UID não identificado.</div>'; return; }
    var podeGer = podeGerenciar();
    el.innerHTML = '<div class="feit-carregando">Carregando...</div>';
    Promise.all([
      fpGet('/feiticos-aprendidos/' + fkeyF(uid)),
      fpGet('/feiticos-anos/'       + fkeyF(uid)),
      fpGet('/feiticos')
    ]).then(function(res) {
      renderFeiticos(uid, res[0] || {}, res[1] || {}, res[2] || {}, podeGer);
    }).catch(function() {
      el.innerHTML = '<div class="feit-vazio">Erro ao carregar feitiços.</div>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregarFeiticos);
  } else {
    carregarFeiticos();
  }
})();