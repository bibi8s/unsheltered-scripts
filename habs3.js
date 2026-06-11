(function () {
  'use strict';

  var DB     = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var ADMINS = ['1', '2', '3', '4', '6'];

  function hGet(p)    { return fetch(DB+p+'.json').then(function(r){ return r.json(); }); }
  function hPost(p,d) { return fetch(DB+p+'.json',{method:'POST',body:JSON.stringify(d)}); }
  function hDel(p)    { return fetch(DB+p+'.json',{method:'DELETE'}); }
  function fkey(uid)  { return 'u'+String(uid).replace(/^u/i,''); }

  function getUID() {
    var el = document.getElementById('inv-uid');
    if (el) return el.textContent.trim();
    var m = window.location.pathname.match(/\/u(\d+)/i);
    if (m) return m[1];
    return typeof _userdata !== 'undefined' ? String(_userdata.user_id) : null;
  }

  function isAdmin() {
    if (typeof _userdata === 'undefined') return false;
    return ADMINS.indexOf(String(_userdata.user_id)) !== -1;
  }

  function normalizar(s) {
    return String(s).toLowerCase()
      .replace(/[àáâã]/g,'a').replace(/[éê]/g,'e')
      .replace(/[í]/g,'i').replace(/[óô]/g,'o')
      .replace(/[ú]/g,'u').replace(/[ç]/g,'c')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  function getFieldSlug(id) {
    var el = document.querySelector('#'+id+' .field_uneditable');
    if (!el) return null;
    var txt = el.textContent.trim();
    if (!txt || txt.toLowerCase() === 'nenhuma.' || txt.toLowerCase() === 'nenhum.') return null;
    return normalizar(txt);
  }

  function getNivelMagia() {
    var el = document.getElementById('rpg-reserva-de-magia');
    if (!el) return 0;
    return parseInt(el.textContent.trim()) || 0;
  }

  function hToast(msg, erro) {
    var t = document.getElementById('hab-toast'); if (!t) return;
    t.textContent = msg;
    t.className = 'apti-toast' + (erro ? ' apti-toast-erro' : '');
    t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateY(8px)'; }, 3500);
  }

  function montarCard(dados, chave, tipo, admin) {
    var tagCor = tipo === 'extra' ? 'apt-tag-extra' : tipo === 'unica' ? 'apt-tag-unica' : 'apt-tag-geral';
    var tagTxt = tipo === 'extra' ? 'Extra' : tipo === 'unica' ? '\u00danica' : (dados.grau||'Geral');
    var tag = '<span class="apt-tag '+tagCor+'">'+tagTxt+'</span>';

    var btnRm = (admin && (tipo === 'unica' || tipo === 'extra'))
      ? '<button class="apt-btn-rm" onclick="window._habRemover(\''+chave+'\')" title="Remover">\u2715</button>'
      : '';

    var idCol = 'hab-col-'+chave;

    return '<div class="apt-card">'+
      '<div class="apt-topo">'+
        '<div class="apt-esq">'+tag+'<span class="apt-nome">'+dados.nome+'</span></div>'+
        '<div class="apt-acoes">'+
          '<button class="apt-btn-tog" onclick="'+
            'var c=document.getElementById(\''+idCol+'\');'+
            'c.classList.toggle(\'apt-aberto\');'+
            'this.querySelector(\'i\').classList.toggle(\'ph-caret-down\');'+
            'this.querySelector(\'i\').classList.toggle(\'ph-caret-up\');'+
          '"><i class="ph ph-caret-down"></i></button>'+
          btnRm+
        '</div>'+
      '</div>'+
      '<div id="'+idCol+'" class="apt-det">'+
        '<div class="apt-linha"><span class="apt-lbl">Descri\u00e7\u00e3o</span><span class="apt-val">'+dados.descricao+'</span></div>'+
        '<div class="apt-linha"><span class="apt-lbl">Energia</span><span class="apt-val">'+dados.energia+'</span></div>'+
        '<div class="apt-linha"><span class="apt-lbl">Dano</span><span class="apt-val">'+dados.dano+'</span></div>'+
      '</div>'+
    '</div>';
  }

  function montarSeletorUnico(id) {
    return '<div class="apt-seletor" id="'+id+'" style="display:none">'+
      '<div class="apt-edit-row"><label class="apt-lbl-edit">Nome</label><input class="apt-input" id="'+id+'-nome" type="text"></div>'+
      '<div class="apt-edit-row"><label class="apt-lbl-edit">Grau</label><input class="apt-input" id="'+id+'-grau" type="text" placeholder="ex: Inicial, Avan\u00e7ada..."></div>'+
      '<div class="apt-edit-row"><label class="apt-lbl-edit">Descri\u00e7\u00e3o</label><textarea class="apt-input apt-textarea" id="'+id+'-desc"></textarea></div>'+
      '<div class="apt-edit-row"><label class="apt-lbl-edit">Energia</label><input class="apt-input" id="'+id+'-energia" type="text" value="Nenhum."></div>'+
      '<div class="apt-edit-row"><label class="apt-lbl-edit">Dano</label><input class="apt-input" id="'+id+'-dano" type="text" value="Nenhum."></div>'+
      '<div style="display:flex;gap:8px">'+
        '<button class="apt-btn-conf" id="'+id+'-salvar">Salvar</button>'+
        '<button class="apt-btn-fechar" id="'+id+'-fechar">Fechar</button>'+
      '</div>'+
    '</div>';
  }

  function montarSeletorExtra(id, catalogo, persoExtras) {
    var slugsPerso = persoExtras ? Object.keys(persoExtras) : [];
    var opcoes = '';
    if (catalogo) {
      Object.keys(catalogo).sort().forEach(function(slug){
        if (slugsPerso.indexOf(slug) !== -1) return;
        var nome = catalogo[slug].nome || slug;
        opcoes += '<div class="apt-opcao">'+
          '<span class="apt-opcao-nome">'+nome+'</span>'+
          '<button class="apt-btn-add-opcao" data-slug="'+slug+'" data-nome="'+nome+'">+ Adicionar</button>'+
        '</div>';
      });
    }
    if (!opcoes) opcoes = '<div class="apti-vazio" style="padding:8px">Nenhum dispon\u00edvel.</div>';

    return '<div class="apt-seletor" id="'+id+'" style="display:none">'+
      '<input class="apt-input" id="'+id+'-busca" type="text" placeholder="Buscar..." style="margin-bottom:8px">'+
      '<div class="apt-lista-opcoes" id="'+id+'-lista" style="max-height:180px;overflow-y:auto;">'+opcoes+'</div>'+
      '<button class="apt-btn-fechar" id="'+id+'-fechar" style="margin-top:8px">Fechar</button>'+
    '</div>';
  }

function montarSecao(titulo, cards, btnUnicoId, selUnicoId, btnExtraId, selExtraId) {
    return '<div class="hab-secao">'+
      '<div class="hab-secao-tit">'+titulo+'</div>'+
      (btnUnicoId ? '<button class="apt-btn-add" id="'+btnUnicoId+'"><i class="ph ph-pencil"></i> Adicionar \u00fanica</button>' : '')+
      (selUnicoId ? montarSeletorUnico(selUnicoId) : '')+
      (btnExtraId ? '<button class="apt-btn-add" id="'+btnExtraId+'" style="margin-left:6px"><i class="ph ph-plus"></i> Adicionar extra</button>' : '')+
      (selExtraId ? '<div id="'+selExtraId+'"></div>' : '')+
      '<div class="apt-lista">'+cards+'</div>'+
    '</div>';
  }

  function bindSeletorUnico(btnId, selId, uid, tipo) {
    var btn = document.getElementById(btnId);
    var sel = document.getElementById(selId);
    if (!btn || !sel) return;
    btn.addEventListener('click', function(){
      sel.style.display = sel.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById(selId+'-fechar').addEventListener('click', function(){
      sel.style.display = 'none';
    });
    document.getElementById(selId+'-salvar').addEventListener('click', function(){
      var nome    = document.getElementById(selId+'-nome').value.trim();
      var grau    = document.getElementById(selId+'-grau').value.trim();
      var desc    = document.getElementById(selId+'-desc').value.trim();
      var energia = document.getElementById(selId+'-energia').value.trim();
      var dano    = document.getElementById(selId+'-dano').value.trim();
      if (!nome) { hToast('Nome obrigat\u00f3rio.', true); return; }
      hPost('/habilidades-personagem/'+fkey(uid)+'/'+tipo, {
        nome:nome, grau:grau, descricao:desc, energia:energia, dano:dano
      }).then(function(){ hToast('Adicionado!'); carregarHabilidades(); })
        .catch(function(){ hToast('Erro.', true); });
    });
  }

  function bindSeletorExtra(btnId, wrapId, uid, tipo, catalogo, persoExtras) {
    var btn  = document.getElementById(btnId);
    var wrap = document.getElementById(wrapId);
    if (!btn || !wrap) return;

    var selId = btnId+'-sel';
    wrap.innerHTML = montarSeletorExtra(selId, catalogo, persoExtras);
    var sel = document.getElementById(selId);

    btn.addEventListener('click', function(){
      sel.style.display = sel.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById(selId+'-fechar').addEventListener('click', function(){
      sel.style.display = 'none';
    });

    var busca = document.getElementById(selId+'-busca');
    var lista = document.getElementById(selId+'-lista');

    busca.addEventListener('input', function(){
      var filtro = busca.value.toLowerCase();
      lista.querySelectorAll('.apt-opcao').forEach(function(op){
        var nome = op.querySelector('.apt-opcao-nome').textContent.toLowerCase();
        op.style.display = nome.indexOf(filtro) !== -1 ? '' : 'none';
      });
    });

    lista.querySelectorAll('.apt-btn-add-opcao').forEach(function(b){
      b.addEventListener('click', function(){
        var slug  = b.dataset.slug;
        var dados = catalogo[slug];
        if (!dados) return;
        hPost('/habilidades-personagem/'+fkey(uid)+'/extras-'+tipo, dados)
          .then(function(){ hToast(dados.nome+' adicionado!'); carregarHabilidades(); })
          .catch(function(){ hToast('Erro.', true); });
      });
    });
  }

  window._habRemover = function(chave) {
    if (!isAdmin()) return;
    var uid = getUID();
    if (!window.confirm('Remover?')) return;
    hDel('/habilidades-personagem/'+fkey(uid)+'/'+chave)
      .then(function(){ hToast('Removido.'); carregarHabilidades(); })
      .catch(function(){ hToast('Erro.', true); });
  };

  function renderHabilidades(uid, habCat, maldCat, perso, extrasHab, extrasMald, persoExtrasHab, persoExtrasMald, nivel, admin) {
    var el = document.querySelector('.divhabs'); if (!el) return;

    var toast = '<div id="hab-toast" class="apti-toast"></div>';

    var cardsHab = '';
    if (habCat) {
      Object.keys(habCat).forEach(function(k){
        var d = habCat[k];
        if ((d.nivel_min||0) <= nivel) cardsHab += montarCard(d, k, 'geral', admin);
      });
    }
    if (perso && perso.habilidade) {
      Object.keys(perso.habilidade).forEach(function(k){
        cardsHab += montarCard(perso.habilidade[k], 'hpu-'+k, 'unica', admin);
      });
    }
    if (perso && perso['extras-habilidade']) {
      Object.keys(perso['extras-habilidade']).forEach(function(k){
        cardsHab += montarCard(perso['extras-habilidade'][k], 'hex-'+k, 'extra', admin);
      });
    }

    var cardsMald = '';
    if (maldCat) {
      Object.keys(maldCat).forEach(function(k){
        var d = maldCat[k];
        if ((d.nivel_min||0) <= nivel) cardsMald += montarCard(d, k, 'geral', admin);
      });
    }
    if (perso && perso.maldicao) {
      Object.keys(perso.maldicao).forEach(function(k){
        cardsMald += montarCard(perso.maldicao[k], 'mpu-'+k, 'unica', admin);
      });
    }
    if (perso && perso['extras-maldicao']) {
      Object.keys(perso['extras-maldicao']).forEach(function(k){
        cardsMald += montarCard(perso['extras-maldicao'][k], 'mex-'+k, 'extra', admin);
      });
    }

    var temHab  = !!(cardsHab);
    var temMald = !!(cardsMald);

    if (!temHab && !temMald) {
      el.innerHTML = '<div class="apti-vazio">Nenhuma habilidade ou maldi\u00e7\u00e3o.</div>';
      document.querySelectorAll('.pfcon-tab').forEach(function(t){
        if (t.dataset.alvo === 'pfcon-habilidades') t.style.display = 'none';
      });
      return;
    }

    var html = toast;
    if (temHab)  html += montarSecao('Habilidade', cardsHab, admin?'btn-unico-hab':null, admin?'sel-unico-hab':null, admin?'btn-extra-hab':null, admin?'wrap-extra-hab':null);
    if (temMald) html += montarSecao('Maldi\u00e7\u00e3o', cardsMald, admin?'btn-unico-mald':null, admin?'sel-unico-mald':null, admin?'btn-extra-mald':null, admin?'wrap-extra-mald':null);
    if (admin && !temHab)  html += montarSecao('Habilidade', '<div class="apti-vazio">Nenhuma.</div>', 'btn-unico-hab', 'sel-unico-hab', 'btn-extra-hab', 'wrap-extra-hab');
    if (admin && !temMald) html += montarSecao('Maldi\u00e7\u00e3o', '<div class="apti-vazio">Nenhuma.</div>', 'btn-unico-mald', 'sel-unico-mald', 'btn-extra-mald', 'wrap-extra-mald');

    el.innerHTML = html;

    if (admin) {
      bindSeletorUnico('btn-unico-hab',  'sel-unico-hab',  uid, 'habilidade');
      bindSeletorUnico('btn-unico-mald', 'sel-unico-mald', uid, 'maldicao');
      bindSeletorExtra('btn-extra-hab',  'wrap-extra-hab', uid, 'habilidade', extrasHab,  persoExtrasHab);
      bindSeletorExtra('btn-extra-mald', 'wrap-extra-mald', uid, 'maldicao',  extrasMald, persoExtrasMald);
    }
  }

  function carregarHabilidades() {
    var el = document.querySelector('.divhabs'); if (!el) return;
    var uid = getUID();
    if (!uid) { el.innerHTML='<div class="apti-vazio">UID n\u00e3o identificado.</div>'; return; }

    el.innerHTML = '<div class="apti-vazio">Carregando...</div>';

    var slugHab  = getFieldSlug('field_id5');
    var slugMald = getFieldSlug('field_id6');
    var nivel    = getNivelMagia();

    Promise.all([
      slugHab  ? hGet('/habilidades/'+slugHab)   : Promise.resolve(null),
      slugMald ? hGet('/maldicoes/'+slugMald)     : Promise.resolve(null),
      hGet('/habilidades-personagem/'+fkey(uid)),
      hGet('/habilidades-extras'),
      hGet('/maldicoes-extras')
    ]).then(function(res){
      var perso          = res[2] || {};
      var extrasHab      = res[3] || {};
      var extrasMald     = res[4] || {};
      var persoExtrasHab  = perso['extras-habilidade'] || {};
      var persoExtrasMald = perso['extras-maldicao']   || {};
      renderHabilidades(uid, res[0], res[1], perso, extrasHab, extrasMald, persoExtrasHab, persoExtrasMald, nivel, isAdmin());
    }).catch(function(){
      el.innerHTML = '<div class="apti-vazio">Erro ao carregar.</div>';
    });
  }

  function tentarCarregar(n) {
    var el = document.querySelector('.divhabs');
    if (el) { carregarHabilidades(); return; }
    if (n <= 0) return;
    setTimeout(function(){ tentarCarregar(n-1); }, 500);
  }

  window._recarregarHabilidades = carregarHabilidades;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ tentarCarregar(20); }, 3000); });
  } else {
    setTimeout(function(){ tentarCarregar(20); }, 3000);
  }

})();