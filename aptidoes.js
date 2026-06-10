(function () {
  'use strict';

  var DB_APTI     = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var ADMINS_APTI = ['1', '2', '3', '4', '6'];

  function apGet(p)   { return fetch(DB_APTI+p+'.json').then(function(r){ return r.json(); }); }
  function apPost(p,d){ return fetch(DB_APTI+p+'.json',{method:'POST', body:JSON.stringify(d)}); }
  function apDel(p)   { return fetch(DB_APTI+p+'.json',{method:'DELETE'}); }

  function getAptiUID() {
    var el = document.getElementById('inv-uid');
    if (el) return el.textContent.trim();
    var m = window.location.pathname.match(/\/u(\d+)/i);
    if (m) return m[1];
    return typeof _userdata !== 'undefined' ? String(_userdata.user_id) : null;
  }

  function fkeyA(uid) { return 'u' + String(uid).replace(/^u/i,''); }

  function podeGerenciar() {
    if (typeof _userdata === 'undefined') return false;
    return ADMINS_APTI.indexOf(String(_userdata.user_id)) !== -1;
  }

  function getTipoPersonagem() {
    var especie  = document.querySelector('#field_id2 .field_uneditable');
    var maldicao = document.querySelector('#field_id6 .field_uneditable');
    var especieTexto  = especie  ? especie.textContent.trim().toLowerCase().replace('.','') : '';
    var maldicaoTexto = maldicao ? maldicao.textContent.trim().toLowerCase() : '';
    if (maldicaoTexto.indexOf('licantropia') !== -1) return 'meio-criatura';
    if (especieTexto.indexOf('meio-') !== -1) return 'meio-criatura';
    if (especieTexto === 'bruxo' || especieTexto === 'bruxa' || especieTexto === 'desconhecida') return 'bruxo';
    return 'criatura';
  }

  function getEspecieSlug() {
    var el = document.querySelector('#field_id2 .field_uneditable');
    if (!el) return null;
    return el.textContent.trim().toLowerCase()
      .replace('.','')
      .replace(/[àáâã]/g,'a').replace(/[éê]/g,'e')
      .replace(/[í]/g,'i').replace(/[óô]/g,'o')
      .replace(/[ú]/g,'u').replace(/[ç]/g,'c')
      .replace(/\s+/g,'-');
  }

  function apToast(msg, erro) {
    var t = document.getElementById('apti-toast'); if (!t) return;
    t.textContent = msg;
    t.className = 'apti-toast' + (erro ? ' apti-toast-erro' : '');
    t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateY(8px)'; }, 3500);
  }

  function montarCard(dados, chave, tipo, podeGer) {
    var tag = tipo === 'geral'
      ? '<span class="apt-tag apt-tag-geral">Geral</span>'
      : '<span class="apt-tag apt-tag-unica">\u00danica</span>';

    var btnRm = (podeGer && tipo === 'unica')
      ? '<button class="apt-btn-rm" onclick="window._aptiRemover(\''+chave+'\')" title="Remover">\u2715</button>'
      : '';

    var idCol = 'apti-col-' + chave;

    return '<div class="apt-card" data-chave="'+chave+'">'+
      '<div class="apt-topo">'+
        '<div class="apt-esq">'+
          tag+
          '<span class="apt-nome">'+dados.nome+'</span>'+
        '</div>'+
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

  function renderAptidoes(uid, aptiEspecie, aptiPerso, podeGer) {
    var el = document.querySelector('.divapti'); if (!el) return;

    var toast = '<div id="apti-toast" class="apti-toast"></div>';

    var btnAdd = podeGer
      ? '<button class="apt-btn-add" id="apti-btn-add"><i class="ph ph-plus"></i> Adicionar aptid\u00e3o</button>'
      : '';

    var seletor = podeGer
      ? '<div class="apt-seletor" id="apti-seletor" style="display:none">'+
          '<div class="apt-edit-row"><label class="apt-lbl-edit">Nome</label><input class="apt-input" id="apti-in-nome" type="text"></div>'+
          '<div class="apt-edit-row"><label class="apt-lbl-edit">Descri\u00e7\u00e3o</label><textarea class="apt-input apt-textarea" id="apti-in-desc"></textarea></div>'+
          '<div class="apt-edit-row"><label class="apt-lbl-edit">Energia</label><input class="apt-input" id="apti-in-energia" type="text" value="Nenhum."></div>'+
          '<div class="apt-edit-row"><label class="apt-lbl-edit">Dano</label><input class="apt-input" id="apti-in-dano" type="text" value="Nenhum."></div>'+
          '<div style="display:flex;gap:8px">'+
            '<button class="apt-btn-conf" id="apti-salvar">Salvar</button>'+
            '<button class="apt-btn-fechar" id="apti-fechar">Fechar</button>'+
          '</div>'+
        '</div>'
      : '';

    var cardsGeral = aptiEspecie
      ? Object.keys(aptiEspecie).map(function(k){ return montarCard(aptiEspecie[k], k, 'geral', podeGer); }).join('')
      : '';

    var cardsUnica = aptiPerso
      ? Object.keys(aptiPerso).map(function(k){ return montarCard(aptiPerso[k], k, 'unica', podeGer); }).join('')
      : '';

    var vazio = (!cardsGeral && !cardsUnica)
      ? '<div class="apti-vazio">Nenhuma aptid\u00e3o.</div>'
      : '';

    el.innerHTML = toast + btnAdd + seletor +
      '<div class="apt-lista">' + cardsGeral + cardsUnica + vazio + '</div>';

    if (podeGer) {
      document.getElementById('apti-btn-add').addEventListener('click', function(){
        var s = document.getElementById('apti-seletor');
        s.style.display = s.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('apti-fechar').addEventListener('click', function(){
        document.getElementById('apti-seletor').style.display = 'none';
      });
      document.getElementById('apti-salvar').addEventListener('click', function(){
        var nome    = document.getElementById('apti-in-nome').value.trim();
        var desc    = document.getElementById('apti-in-desc').value.trim();
        var energia = document.getElementById('apti-in-energia').value.trim();
        var dano    = document.getElementById('apti-in-dano').value.trim();
        if (!nome) { apToast('Nome obrigatório.', true); return; }
        apPost('/aptidoes-personagem/'+fkeyA(uid), { nome:nome, descricao:desc, energia:energia, dano:dano })
          .then(function(){ apToast('Aptidão adicionada!'); carregarAptidoes(); })
          .catch(function(){ apToast('Erro ao salvar.', true); });
      });
    }

    window._aptiRemover = function(chave) {
      if (!podeGerenciar()) return;
      if (!window.confirm('Remover esta aptidão?')) return;
      apDel('/aptidoes-personagem/'+fkeyA(uid)+'/'+chave)
        .then(function(){ apToast('Aptidão removida.'); carregarAptidoes(); })
        .catch(function(){ apToast('Erro.', true); });
    };
  }

  function carregarAptidoes() {
    var el = document.querySelector('.divapti'); if (!el) return;
    var uid = getAptiUID();
    if (!uid) { el.innerHTML='<div class="apti-vazio">UID n\u00e3o identificado.</div>'; return; }

    if (getTipoPersonagem() === 'bruxo') {
      el.innerHTML = '<div class="apti-vazio">Bruxos n\u00e3o possuem aptid\u00f5es.</div>';
 
      var tabs = document.querySelectorAll('.pfcon-tab');
      tabs.forEach(function(t){ if (t.dataset.alvo === 'pfcon-aptidoes') t.style.display = 'none'; });
      return;
    }

    el.innerHTML = '<div class="apti-vazio">Carregando...</div>';
    var slug = getEspecieSlug();

    Promise.all([
      slug ? apGet('/aptidoes/'+slug) : Promise.resolve(null),
      apGet('/aptidoes-personagem/'+fkeyA(uid))
    ]).then(function(res){
      renderAptidoes(uid, res[0]||null, res[1]||null, podeGerenciar());
    }).catch(function(){
      el.innerHTML = '<div class="apti-vazio">Erro ao carregar.</div>';
    });
  }

  function tentarCarregar(n) {
    var el = document.querySelector('.divapti');
    if (el) { carregarAptidoes(); return; }
    if (n <= 0) return;
    setTimeout(function(){ tentarCarregar(n-1); }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ tentarCarregar(20); });
  } else {
    tentarCarregar(20);
  }

})();