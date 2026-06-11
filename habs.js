(function () {
  'use strict';

  var DB       = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var ADMINS   = ['1', '2', '3', '4', '6'];

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
    var tag = tipo === 'geral'
      ? '<span class="apt-tag apt-tag-geral">'+(dados.grau||'Geral')+'</span>'
      : '<span class="apt-tag apt-tag-unica">\u00danica</span>';

    var btnRm = (admin && tipo === 'unica')
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

  function montarSecao(titulo, cards, btnAddId, seletorId) {
    return '<div class="hab-secao">'+
      '<div class="hab-secao-tit">'+titulo+'</div>'+
      (btnAddId ? '<button class="apt-btn-add" id="'+btnAddId+'"><i class="ph ph-plus"></i> Adicionar</button>' : '')+
      (seletorId ? montarSeletor(seletorId) : '')+
      '<div class="apt-lista">'+(cards||'<div class="apti-vazio">Nenhuma.</div>')+'</div>'+
    '</div>';
  }

  function montarSeletor(id) {
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

  function bindSeletor(btnId, selId, uid, tipo) {
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

  window._habRemover = function(chave) {
    if (!isAdmin()) return;
    var uid = getUID();
    if (!window.confirm('Remover?')) return;
    hDel('/habilidades-personagem/'+fkey(uid)+'/'+chave)
      .then(function(){ hToast('Removido.'); carregarHabilidades(); })
      .catch(function(){ hToast('Erro.', true); });
  };

  function renderHabilidades(uid, habCat, maldCat, habPerso, maldPerso, nivel, admin) {
    var el = document.querySelector('.divhab'); if (!el) return;

    var toast = '<div id="hab-toast" class="apti-toast"></div>';

    var cardsHab = '';
    if (habCat) {
      Object.keys(habCat).forEach(function(k){
        var d = habCat[k];
        if ((d.nivel_min||0) <= nivel) cardsHab += montarCard(d, k, 'geral', admin);
      });
    }
    if (habPerso && habPerso.habilidade) {
      Object.keys(habPerso.habilidade).forEach(function(k){
        cardsHab += montarCard(habPerso.habilidade[k], 'hpu-'+k, 'unica', admin);
      });
    }

    var cardsMald = '';
    if (maldCat) {
      Object.keys(maldCat).forEach(function(k){
        var d = maldCat[k];
        if ((d.nivel_min||0) <= nivel) cardsMald += montarCard(d, k, 'geral', admin);
      });
    }
    if (habPerso && habPerso.maldicao) {
      Object.keys(habPerso.maldicao).forEach(function(k){
        cardsMald += montarCard(habPerso.maldicao[k], 'mpu-'+k, 'unica', admin);
      });
    }

    var secHab  = montarSecao('Habilidade',  cardsHab  || null, admin ? 'btn-add-hab'  : null, admin ? 'sel-hab'  : null);
    var secMald = montarSecao('Maldi\u00e7\u00e3o', cardsMald || null, admin ? 'btn-add-mald' : null, admin ? 'sel-mald' : null);

    el.innerHTML = toast + secHab + secMald;

    if (admin) {
      bindSeletor('btn-add-hab',  'sel-hab',  uid, 'habilidade');
      bindSeletor('btn-add-mald', 'sel-mald', uid, 'maldicao');
    }
  }

  function carregarHabilidades() {
    var el = document.querySelector('.divhab'); if (!el) return;
    var uid = getUID();
    if (!uid) { el.innerHTML='<div class="apti-vazio">UID n\u00e3o identificado.</div>'; return; }

    el.innerHTML = '<div class="apti-vazio">Carregando...</div>';

    var slugHab  = getFieldSlug('field_id5');
    var slugMald = getFieldSlug('field_id6');
    var nivel    = getNivelMagia();

    Promise.all([
      slugHab  ? hGet('/habilidades/'+slugHab)   : Promise.resolve(null),
      slugMald ? hGet('/maldicoes/'+slugMald)     : Promise.resolve(null),
      hGet('/habilidades-personagem/'+fkey(uid))
    ]).then(function(res){
      renderHabilidades(uid, res[0], res[1], res[2], res[2], nivel, isAdmin());
    }).catch(function(){
      el.innerHTML = '<div class="apti-vazio">Erro ao carregar.</div>';
    });
  }

  function tentarCarregar(n) {
    var el = document.querySelector('.divhab');
    if (el) { carregarHabilidades(); return; }
    if (n <= 0) return;
    setTimeout(function(){ tentarCarregar(n-1); }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ tentarCarregar(20); });
  } else {
    tentarCarregar(20);
  }

})();