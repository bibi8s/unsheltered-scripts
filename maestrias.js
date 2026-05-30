(function () {
  'use strict';

  var DB_MAEST     = 'https://unsheltered-72d40-default-rtdb.firebaseio.com';
  var ADMINS_MAEST = ['1', '2', '3', '4', '6'];

  var GRUPOS = [
    { id: 'corporais',     label: 'Corporais',     max: 700 },
    { id: 'eruditas',      label: 'Eruditas',      max: 400 },
    { id: 'influencia',    label: 'Influência',     max: 500 },
    { id: 'sobrevivencia', label: 'Sobrevivência',  max: 350 },
    { id: 'oficios',       label: 'Ofícios',        max: 500 }
  ];

  var NIVEIS_PCT = [0,5,10,15,20,25,35,40,50,60,70,80,85,90,95,100];
  var POSTS_NECESSARIOS = {0:1,5:1,10:1,15:2,20:2,25:3,35:3,40:3,50:4,60:4,70:5,80:5,85:5,90:6,95:8,100:0};

  var GRAUS_ESP  = ['Zero','Aprendiz','Iniciante','Entendido','Mestre','Especialista'];
  var BONUS_ESP  = {Zero:0,Aprendiz:2,Iniciante:6,Entendido:10,Mestre:12,Especialista:15};

  function fkeyM(uid) { return 'u' + String(uid).replace(/^u/i,''); }
  function mpGet(p)    { return fetch(DB_MAEST+p+'.json').then(function(r){ return r.json(); }); }
  function mpPut(p,d)  { return fetch(DB_MAEST+p+'.json',{method:'PUT',   body:JSON.stringify(d)}); }
  function mpPatch(p,d){ return fetch(DB_MAEST+p+'.json',{method:'PATCH', body:JSON.stringify(d)}); }
  function mpDel(p)    { return fetch(DB_MAEST+p+'.json',{method:'DELETE'}); }

  function getMaestUID() {
    var el = document.getElementById('inv-uid');
    if (el) return el.textContent.trim();
    var m = window.location.pathname.match(/\/u(\d+)/i);
    if (m) return m[1];
    return typeof _userdata !== 'undefined' ? String(_userdata.user_id) : null;
  }

  function podeGerenciar() {
    if (typeof _userdata === 'undefined') return false;
    return ADMINS_MAEST.indexOf(String(_userdata.user_id)) !== -1;
  }

  function mpToast(msg, erro) {
    var t = document.getElementById('maest-toast'); if (!t) return;
    t.textContent = msg;
    t.className = 'maest-toast' + (erro ? ' maest-toast-erro' : '');
    t.style.opacity = '1'; t.style.transform = 'translateY(0)';
    setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateY(8px)'; }, 3500);
  }

  function proximoNivel(pct) {
    for (var i=0; i<NIVEIS_PCT.length; i++) if (NIVEIS_PCT[i]>pct) return NIVEIS_PCT[i];
    return 100;
  }

  function nomeResumido(nome) {
    return nome.replace(/^Maestria\s+(em|de|do|da)\s+/i,'').trim();
  }

  function totalGrupo(slugs, personagem) {
    return slugs.reduce(function(acc,s){ return acc+((personagem[s]&&personagem[s].porcentagem)||0); }, 0);
  }

  function montarCard(slug, catalogo, dados, podeGer) {
    var cat   = catalogo[slug] || {};
    var nome  = cat.nome  || slug;
    var pct   = (dados&&dados.porcentagem) || 0;
    var pCur  = (dados&&dados.posts_cur)   || 0;
    var pMax  = (dados&&dados.posts_max)   || POSTS_NECESSARIOS[pct] || 1;
    var cor   = pct>=80?'#4caf65':pct>=50?'#9cb84c':pct>=25?'#c9a84c':'#9b6fc9';
    var resumo = nomeResumido(nome);

    var esps = dados&&dados.especializacoes ? dados.especializacoes : {};
    var espHtml = '';
    Object.keys(esps).forEach(function(eKey){
      var e = esps[eKey];
      if (!e||!e.grau||e.grau==='Zero') return;
      var bonus = BONUS_ESP[e.grau]||0;
      espHtml +=
        '<div class="maest-esp-item">'+
          '<span class="maest-esp-seta">↳</span>'+
          '<span class="maest-esp-nome">'+eKey+'</span>'+
          '<span class="maest-esp-grau">'+e.grau+'</span>'+
          '<span class="maest-esp-bonus">+'+bonus+'%</span>'+
          (podeGer?'<button class="maest-btn-editar-esp" onclick="window._maestEditarEsp(\''+slug+'\',\''+eKey+'\')" title="Editar"><i class="fa-solid fa-pen"></i></button>':'')+
        '</div>';
    });

    var btnAdmin = podeGer
      ? '<div class="maest-card-admin">'+
          '<button class="maest-btn-editar" onclick="window._maestEditarPct(\''+slug+'\')" title="Editar"><i class="fa-solid fa-pen"></i></button>'+
          '<button class="maest-btn-rm"     onclick="window._maestRemover(\''+slug+'\')"   title="Remover">✕</button>'+
          (Object.keys(cat.especializacoes||{}).length
            ?'<button class="maest-btn-esp" onclick="window._maestAdicionarEsp(\''+slug+'\')" title="Especialização"><i class="fa-solid fa-plus"></i> esp</button>':'')+
        '</div>'
      : '';

    return '<div class="maest-card" data-slug="'+slug+'">'+
      '<div class="maest-card-topo">'+
        '<div class="maest-card-esq" onclick="window._maestAbrirModal(\''+slug+'\')">'+
          '<div class="maest-card-nome-row">'+
            '<span class="maest-nome">'+resumo+'</span>'+
            '<span class="maest-posts-inline" style="color:'+cor+'">('+pCur+'/'+pMax+')</span>'+
          '</div>'+
          '<div class="maest-barra-wrap">'+
            '<div class="maest-barra-track"><div class="maest-barra-fill" style="width:'+pct+'%;background:'+cor+'"></div></div>'+
            '<span class="maest-pct-label">'+pct+'%</span>'+
          '</div>'+
        '</div>'+
        btnAdmin+
      '</div>'+
      (espHtml?'<div class="maest-esps">'+espHtml+'</div>':'')+
    '</div>';
  }

  function renderMaestrias(uid, catalogo, personagem, podeGer) {
    var el = document.querySelector('.divmaest'); if (!el) return;

    var tabsHtml = '<div class="maest-tabs">';
    GRUPOS.forEach(function(g,i){
      tabsHtml += '<button class="maest-tab'+(i===0?' maest-tab-ativo':'')+'" data-grupo="'+g.id+'">'+g.label+'</button>';
    });
    tabsHtml += '</div>';

    var toast  = '<div id="maest-toast" class="maest-toast"></div>';
    var btnAdd = podeGer ? '<button class="maest-btn-add" id="maest-btn-abrir-seletor"><i class="ph ph-plus"></i> Adicionar maestria</button>' : '';
    var seletor = podeGer
      ? '<div class="maest-seletor" id="maest-seletor" style="display:none">'+
          '<input class="maest-busca" id="maest-busca-input" type="text" placeholder="Buscar maestria...">'+
          '<div class="maest-lista-opcoes" id="maest-lista-opcoes"></div>'+
          '<button class="maest-btn-fechar-sel" id="maest-fechar-seletor">Fechar</button>'+
        '</div>'
      : '';

    var paineis = '';
    GRUPOS.forEach(function(g,i){
      var slugsGrupo = Object.keys(catalogo).filter(function(s){ return catalogo[s]&&catalogo[s].grupo===g.id; });
      var slugsPerso = slugsGrupo.filter(function(s){ return personagem[s]; });
      var total      = totalGrupo(slugsPerso, personagem);

      var conteudo = slugsPerso.length
        ? slugsPerso.map(function(s){ return montarCard(s,catalogo,personagem[s],podeGer); }).join('')
        : '<div class="maest-vazio">Nenhuma maestria neste grupo.</div>';

      paineis +=
        '<div class="maest-painel'+(i===0?'':' maest-oculto')+'" data-grupo="'+g.id+'">'+
          '<div class="maest-grupo-total">'+total+' / '+g.max+'%</div>'+
          conteudo+
        '</div>';
    });

    el.innerHTML = toast+tabsHtml+btnAdd+seletor+'<div class="maest-paineis">'+paineis+'</div>';

    el.querySelectorAll('.maest-tab').forEach(function(btn){
      btn.addEventListener('click',function(){
        el.querySelectorAll('.maest-tab').forEach(function(b){ b.classList.remove('maest-tab-ativo'); });
        el.querySelectorAll('.maest-painel').forEach(function(p){ p.classList.add('maest-oculto'); });
        btn.classList.add('maest-tab-ativo');
        el.querySelector('.maest-painel[data-grupo="'+btn.dataset.grupo+'"]').classList.remove('maest-oculto');
      });
    });

    if (podeGer) bindSeletorMaest(uid, catalogo, personagem);

    window._maest_catalogo   = catalogo;
    window._maest_personagem = personagem;
    window._maest_uid        = uid;
  }

  function bindSeletorMaest(uid, catalogo, personagem) {
    var btnAbrir  = document.getElementById('maest-btn-abrir-seletor');
    var seletor   = document.getElementById('maest-seletor');
    var btnFechar = document.getElementById('maest-fechar-seletor');
    var input     = document.getElementById('maest-busca-input');
    var lista     = document.getElementById('maest-lista-opcoes');
    if (!btnAbrir||!seletor) return;

    function renderOpcoes(filtro) {
      var html = '';
      Object.keys(catalogo).sort().forEach(function(slug){
        if (personagem[slug]) return;
        var nome = catalogo[slug].nome||slug;
        if (filtro&&nome.toLowerCase().indexOf(filtro.toLowerCase())===-1) return;
        var g = (GRUPOS.filter(function(x){ return x.id===catalogo[slug].grupo; })[0]||{}).label||'';
        html +=
          '<div class="maest-opcao">'+
            '<div class="maest-opcao-info">'+
              '<span class="maest-opcao-nome">'+nome+'</span>'+
              '<span class="maest-opcao-grupo">'+g+'</span>'+
            '</div>'+
            '<button class="maest-btn-add-opcao" data-slug="'+slug+'">+ Adicionar</button>'+
          '</div>';
      });
      lista.innerHTML = html||'<div class="maest-vazio" style="padding:8px">Nenhum resultado.</div>';
      lista.querySelectorAll('.maest-btn-add-opcao').forEach(function(btn){
        btn.addEventListener('click',function(){
          var s = btn.dataset.slug;
          mpPut('/maestrias-personagem/'+fkeyM(uid)+'/'+s,{
            porcentagem:0, posts_cur:0, posts_max:POSTS_NECESSARIOS[0]||1, especializacoes:{}
          }).then(function(){
            mpToast((catalogo[s]&&catalogo[s].nome?catalogo[s].nome:s)+' adicionada!');
            carregarMaestrias();
          }).catch(function(){ mpToast('Erro ao adicionar.',true); });
        });
      });
    }

    btnAbrir.addEventListener('click',function(){
      var aberto = seletor.style.display!=='none';
      seletor.style.display = aberto?'none':'block';
      if (!aberto){ renderOpcoes(''); input.focus(); }
    });
    btnFechar.addEventListener('click',function(){ seletor.style.display='none'; });
    input.addEventListener('input',function(){ renderOpcoes(input.value); });
  }

  window._maestAbrirModal = function(slug) {
    var cat   = (window._maest_catalogo||{})[slug]||{};
    var dados = (window._maest_personagem||{})[slug]||{};
    var nome  = cat.nome||slug;
    var esps  = dados.especializacoes||{};

    var anterior = document.getElementById('maest-modal');
    if (anterior) anterior.remove();

    var espTexto = '';
    if (cat.especializacoes) {
      espTexto = Object.keys(cat.especializacoes).map(function(k){
        var grau = (esps[k]&&esps[k].grau)||'ZERO';
        return k+' ('+grau.toUpperCase()+')';
      }).join('; ');
    }

    var modal = document.createElement('div');
    modal.id = 'maest-modal'; modal.className = 'maest-modal-overlay';
    modal.innerHTML =
      '<div class="maest-modal-box">'+
        '<div class="maest-modal-header">'+
          '<span class="maest-modal-titulo">'+nome+'</span>'+
          '<button class="maest-modal-fechar" onclick="document.getElementById(\'maest-modal\').remove()">✕</button>'+
        '</div>'+
        '<div class="maest-modal-corpo">'+
          '<div class="maest-modal-linha"><span class="maest-modal-label">Nome</span><span>'+nome+'</span></div>'+
          '<div class="maest-modal-linha"><span class="maest-modal-label">Descrição</span><span>'+(cat.descricao||'—')+'</span></div>'+
          '<div class="maest-modal-linha"><span class="maest-modal-label">Bônus</span><span>'+(cat.bonus||'—')+'</span></div>'+
          (espTexto?'<div class="maest-modal-linha"><span class="maest-modal-label">Especialização</span><span>'+espTexto+'</span></div>':'')+
          '<div class="maest-modal-linha"><span class="maest-modal-label">Gasto</span><span>'+(cat.gasto||'Nenhum')+'</span></div>'+
          '<div class="maest-modal-linha"><span class="maest-modal-label">Dano</span><span>'+(cat.dano||'Nenhum')+'</span></div>'+
        '</div>'+
      '</div>';
    modal.addEventListener('click',function(e){ if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
  };

  window._maestEditarPct = function(slug) {
    if (!podeGerenciar()) return;
    var uid   = window._maest_uid;
    var dados = (window._maest_personagem||{})[slug]||{};
    var pct   = dados.porcentagem||0;
    var pCur  = dados.posts_cur||0;
    var pMax  = dados.posts_max||POSTS_NECESSARIOS[pct]||1;

    var anterior = document.getElementById('maest-modal-edit');
    if (anterior) anterior.remove();

    var modal = document.createElement('div');
    modal.id = 'maest-modal-edit'; modal.className = 'maest-modal-overlay';

    var nomeCat = ((window._maest_catalogo||{})[slug]||{}).nome||slug;

    modal.innerHTML =
      '<div class="maest-modal-box">'+
        '<div class="maest-modal-header">'+
          '<span class="maest-modal-titulo">Editar — '+nomeCat+'</span>'+
          '<button class="maest-modal-fechar" onclick="document.getElementById(\'maest-modal-edit\').remove()">✕</button>'+
        '</div>'+
        '<div class="maest-modal-corpo">'+
          '<div class="maest-edit-info">'+
            '<span class="maest-edit-pct-display" id="edit-pct-display">'+pct+'%</span>'+
            '<span class="maest-edit-posts-display" id="edit-posts-display">'+pCur+' / '+pMax+' posts</span>'+
          '</div>'+
          '<div class="maest-edit-controles">'+
            '<button class="maest-btn-ctrl" id="btn-minus"><i class="fa-solid fa-minus"></i></button>'+
            '<div class="maest-ctrl-label">Posts atuais</div>'+
            '<button class="maest-btn-ctrl" id="btn-plus"><i class="fa-solid fa-plus"></i></button>'+
          '</div>'+
          '<div class="maest-edit-row" style="margin-top:10px">'+
            '<label class="maest-edit-label">Porcentagem (manual)</label>'+
            '<select class="maest-edit-input" id="maest-edit-pct">'+
              NIVEIS_PCT.map(function(n){ return '<option value="'+n+'"'+(n===pct?' selected':'')+'>'+n+'%</option>'; }).join('')+
            '</select>'+
          '</div>'+
          '<div class="maest-edit-row">'+
            '<label class="maest-edit-label">Posts necessários</label>'+
            '<input class="maest-edit-input" id="maest-edit-pmax" type="number" min="1" value="'+pMax+'">'+
          '</div>'+
          '<button class="maest-btn-confirmar" id="maest-edit-salvar">Salvar</button>'+
        '</div>'+
      '</div>';

    modal.addEventListener('click',function(e){ if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);

    var _pct  = pct;
    var _pCur = pCur;
    var _pMax = pMax;

    function atualizarDisplay() {
      document.getElementById('edit-pct-display').textContent  = _pct+'%';
      document.getElementById('edit-posts-display').textContent = _pCur+' / '+_pMax+' posts';
      document.getElementById('maest-edit-pct').value = _pct;
    }

    document.getElementById('btn-plus').addEventListener('click',function(){
      _pCur++;
      if (_pCur >= _pMax && _pct < 100) {
        var prox = proximoNivel(_pct);
        _pct  = prox;
        _pCur = 0;
        _pMax = POSTS_NECESSARIOS[prox]||1;
        document.getElementById('maest-edit-pmax').value = _pMax;
      }
      atualizarDisplay();
    });

    document.getElementById('btn-minus').addEventListener('click',function(){
      if (_pCur > 0) { _pCur--; atualizarDisplay(); }
    });

    document.getElementById('maest-edit-pct').addEventListener('change',function(){
      _pct  = parseInt(this.value)||0;
      _pCur = 0;
      _pMax = parseInt(document.getElementById('maest-edit-pmax').value)||POSTS_NECESSARIOS[_pct]||1;
      atualizarDisplay();
    });

    document.getElementById('maest-edit-pmax').addEventListener('input',function(){
      _pMax = parseInt(this.value)||1;
      atualizarDisplay();
    });

    document.getElementById('maest-edit-salvar').addEventListener('click',function(){
      mpPatch('/maestrias-personagem/'+fkeyM(uid)+'/'+slug,{
        porcentagem:_pct, posts_cur:_pCur, posts_max:_pMax
      }).then(function(){
        modal.remove(); mpToast('Maestria atualizada!'); carregarMaestrias();
      }).catch(function(){ mpToast('Erro ao salvar.',true); });
    });
  };

  window._maestAdicionarEsp = function(slug) {
    if (!podeGerenciar()) return;
    var uid  = window._maest_uid;
    var cat  = (window._maest_catalogo||{})[slug]||{};
    var dados= (window._maest_personagem||{})[slug]||{};
    var espsDisp = cat.especializacoes||{};

    var anterior = document.getElementById('maest-modal-esp');
    if (anterior) anterior.remove();

    var modal = document.createElement('div');
    modal.id = 'maest-modal-esp'; modal.className = 'maest-modal-overlay';
    modal.innerHTML =
      '<div class="maest-modal-box">'+
        '<div class="maest-modal-header">'+
          '<span class="maest-modal-titulo">Especialização — '+cat.nome+'</span>'+
          '<button class="maest-modal-fechar" onclick="document.getElementById(\'maest-modal-esp\').remove()">✕</button>'+
        '</div>'+
        '<div class="maest-modal-corpo">'+
          '<div class="maest-edit-row"><label class="maest-edit-label">Especialização</label>'+
            '<select class="maest-edit-input" id="maest-esp-nome">'+
              Object.keys(espsDisp).map(function(k){ return '<option value="'+k+'">'+k+'</option>'; }).join('')+
            '</select></div>'+
          '<div class="maest-edit-row"><label class="maest-edit-label">Grau</label>'+
            '<select class="maest-edit-input" id="maest-esp-grau">'+
              GRAUS_ESP.map(function(g){ return '<option value="'+g+'">'+g+'</option>'; }).join('')+
            '</select></div>'+
          '<div class="maest-edit-row"><label class="maest-edit-label">Posts atuais</label>'+
            '<input class="maest-edit-input" id="maest-esp-pcur" type="number" min="0" value="0"></div>'+
          '<div class="maest-edit-row"><label class="maest-edit-label">Posts necessários</label>'+
            '<input class="maest-edit-input" id="maest-esp-pmax" type="number" min="1" value="2"></div>'+
          '<button class="maest-btn-confirmar" id="maest-esp-salvar">Salvar</button>'+
        '</div>'+
      '</div>';
    modal.addEventListener('click',function(e){ if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);

    document.getElementById('maest-esp-salvar').addEventListener('click',function(){
      var eNome = document.getElementById('maest-esp-nome').value;
      var eGrau = document.getElementById('maest-esp-grau').value;
      var eCur  = parseInt(document.getElementById('maest-esp-pcur').value)||0;
      var eMax  = parseInt(document.getElementById('maest-esp-pmax').value)||2;
      mpPut('/maestrias-personagem/'+fkeyM(uid)+'/'+slug+'/especializacoes/'+eNome,{
        grau:eGrau, posts_cur:eCur, posts_max:eMax
      }).then(function(){ modal.remove(); mpToast('Especialização salva!'); carregarMaestrias(); })
        .catch(function(){ mpToast('Erro ao salvar.',true); });
    });
  };

  window._maestEditarEsp = function(slug, eKey) {
    if (!podeGerenciar()) return;
    var uid  = window._maest_uid;
    var dados= (window._maest_personagem||{})[slug]||{};
    var esp  = (dados.especializacoes||{})[eKey]||{};

    var anterior = document.getElementById('maest-modal-esp');
    if (anterior) anterior.remove();

    var modal = document.createElement('div');
    modal.id = 'maest-modal-esp'; modal.className = 'maest-modal-overlay';
    modal.innerHTML =
      '<div class="maest-modal-box">'+
        '<div class="maest-modal-header">'+
          '<span class="maest-modal-titulo">'+eKey+'</span>'+
          '<button class="maest-modal-fechar" onclick="document.getElementById(\'maest-modal-esp\').remove()">✕</button>'+
        '</div>'+
        '<div class="maest-modal-corpo">'+
          '<div class="maest-edit-row"><label class="maest-edit-label">Grau</label>'+
            '<select class="maest-edit-input" id="maest-esp-grau">'+
              GRAUS_ESP.map(function(g){ return '<option value="'+g+'"'+(g===esp.grau?' selected':'')+'>'+g+'</option>'; }).join('')+
            '</select></div>'+
          '<div class="maest-edit-row"><label class="maest-edit-label">Posts atuais</label>'+
            '<input class="maest-edit-input" id="maest-esp-pcur" type="number" min="0" value="'+(esp.posts_cur||0)+'"></div>'+
          '<div class="maest-edit-row"><label class="maest-edit-label">Posts necessários</label>'+
            '<input class="maest-edit-input" id="maest-esp-pmax" type="number" min="1" value="'+(esp.posts_max||2)+'"></div>'+
          '<div style="display:flex;gap:8px;margin-top:4px">'+
            '<button class="maest-btn-confirmar" id="maest-esp-salvar">Salvar</button>'+
            '<button class="maest-btn-rm" id="maest-esp-rm" style="padding:6px 12px">Remover</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    modal.addEventListener('click',function(e){ if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);

    document.getElementById('maest-esp-salvar').addEventListener('click',function(){
      var eGrau = document.getElementById('maest-esp-grau').value;
      var eCur  = parseInt(document.getElementById('maest-esp-pcur').value)||0;
      var eMax  = parseInt(document.getElementById('maest-esp-pmax').value)||2;
      mpPut('/maestrias-personagem/'+fkeyM(uid)+'/'+slug+'/especializacoes/'+eKey,{
        grau:eGrau, posts_cur:eCur, posts_max:eMax
      }).then(function(){ modal.remove(); mpToast('Especialização atualizada!'); carregarMaestrias(); })
        .catch(function(){ mpToast('Erro.',true); });
    });

    document.getElementById('maest-esp-rm').addEventListener('click',function(){
      if (!window.confirm('Remover especialização '+eKey+'?')) return;
      mpDel('/maestrias-personagem/'+fkeyM(uid)+'/'+slug+'/especializacoes/'+eKey)
        .then(function(){ modal.remove(); mpToast('Especialização removida.'); carregarMaestrias(); })
        .catch(function(){ mpToast('Erro.',true); });
    });
  };

  window._maestRemover = function(slug) {
    if (!podeGerenciar()) return;
    var uid = window._maest_uid;
    if (!window.confirm('Remover esta maestria do perfil?')) return;
    mpDel('/maestrias-personagem/'+fkeyM(uid)+'/'+slug)
      .then(function(){ mpToast('Maestria removida.'); carregarMaestrias(); })
      .catch(function(){ mpToast('Erro ao remover.',true); });
  };

  function carregarMaestrias() {
    var el = document.querySelector('.divmaest'); if (!el) return;
    var uid = getMaestUID();
    if (!uid){ el.innerHTML='<div class="maest-vazio">UID não identificado.</div>'; return; }
    el.innerHTML='<div class="maest-carregando">Carregando...</div>';
    Promise.all([
      mpGet('/maestrias'),
      mpGet('/maestrias-personagem/'+fkeyM(uid))
    ]).then(function(res){
      renderMaestrias(uid, res[0]||{}, res[1]||{}, podeGerenciar());
    }).catch(function(){
      el.innerHTML='<div class="maest-vazio">Erro ao carregar maestrias.</div>';
    });
  }

  function tentarCarregar(n) {
    var el = document.querySelector('.divmaest');
    if (el){ carregarMaestrias(); return; }
    if (n<=0) return;
    setTimeout(function(){ tentarCarregar(n-1); }, 500);
  }

  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded',function(){ tentarCarregar(20); });
  } else {
    tentarCarregar(20);
  }

})();