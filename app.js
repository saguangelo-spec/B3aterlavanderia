const DB = {
  get(chave, padrao){ return JSON.parse(localStorage.getItem(chave)) || padrao; },
  set(chave, valor){ localStorage.setItem(chave, JSON.stringify(valor)); }
};

let osList = DB.get('lp_os', []);
let clientesList = DB.get('lp_clientes', []);
let estoqueList = DB.get('lp_estoque', []);
let empresa = DB.get('lp_empresa', null);

function salvarTudo(){
  DB.set('lp_os', osList);
  DB.set('lp_clientes', clientesList);
  DB.set('lp_estoque', estoqueList);
}

function iniciar(){
  if(empresa){
    document.getElementById('area-login').classList.remove('hidden');
    document.getElementById('area-cadastro').classList.add('hidden');
  } else {
    document.getElementById('area-login').classList.add('hidden');
    document.getElementById('area-cadastro').classList.remove('hidden');
  }
  if(sessionStorage.getItem('lp_logado') === '1'){
    entrarNoApp();
  }
}

function cadastrarEmpresa(){
  const nome = document.getElementById('cad-nome').value.trim();
  const senha = document.getElementById('cad-senha').value.trim();
  if(!nome || !senha){ alert('Preencha nome e senha.'); return; }
  empresa = { nome, senha };
  DB.set('lp_empresa', empresa);
  sessionStorage.setItem('lp_logado','1');
  entrarNoApp();
}

function fazerLogin(){
  const nome = document.getElementById('login-nome').value.trim();
  const senha = document.getElementById('login-senha').value.trim();
  const erro = document.getElementById('erro-login');
  if(nome === empresa.nome && senha === empresa.senha){
    sessionStorage.setItem('lp_logado','1');
    entrarNoApp();
  } else {
    erro.textContent = 'Nome ou senha incorretos.';
    erro.classList.remove('hidden');
  }
}

function sair(){
  sessionStorage.removeItem('lp_logado');
  document.getElementById('tela-app').classList.add('hidden');
  document.getElementById('tela-login').classList.remove('hidden');
  fecharMenu();
}

function entrarNoApp(){
  document.getElementById('tela-login').classList.add('hidden');
  document.getElementById('tela-app').classList.remove('hidden');
  renderTudo();
}

function abrirMenu(){ document.getElementById('menu-lateral').classList.remove('hidden'); }
function fecharMenu(){ document.getElementById('menu-lateral').classList.add('hidden'); }

function mudarAba(nome){
  document.querySelectorAll('.secao').forEach(s => s.classList.add('hidden'));
  document.getElementById('secao-' + nome).classList.remove('hidden');
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('ativo'));
  document.querySelector(`.tab-item[data-secao="${nome}"]`).classList.add('ativo');
}

function renderTudo(){
  renderPainel();
  renderOS();
  renderClientes();
  renderEstoque();
}

function badgeStatus(status){
  const map = {
    'Pendente':'badge-pendente',
    'Em andamento':'badge-andamento',
    'Concluído':'badge-concluido',
    'Entregue':'badge-entregue'
  };
  return `<span class="badge ${map[status]||''}">${status}</span>`;
}

function renderPainel(){
  document.getElementById('num-total').textContent = osList.length;
  document.getElementById('num-pendente').textContent = osList.filter(o=>o.status==='Pendente').length;
  document.getElementById('num-andamento').textContent = osList.filter(o=>o.status==='Em andamento').length;
  document.getElementById('num-concluido').textContent = osList.filter(o=>o.status==='Concluído' || o.status==='Entregue').length;

  const baixo = estoqueList.filter(i => Number(i.quantidade) <= Number(i.minimo));
  const alerta = document.getElementById('alerta-estoque');
  if(baixo.length){
    alerta.classList.remove('hidden');
    alerta.textContent = `⚠️ ${baixo.length} item(ns) com estoque baixo: ${baixo.map(i=>i.nome).join(', ')}`;
  } else {
    alerta.classList.add('hidden');
  }

  const recentes = [...osList].sort((a,b)=> b.criadoEm - a.criadoEm).slice(0,3);
  const box = document.getElementById('lista-recentes');
  if(!recentes.length){
    box.innerHTML = '<div class="vazio">Nenhuma ordem de serviço ainda.</div>';
    return;
  }
  box.innerHTML = recentes.map(o => `
    <div class="item-card">
      <div class="item-topo">
        <div>
          <div class="item-titulo">${o.item} — ${o.cliente}</div>
          <div class="item-sub">${o.descricao || ''}</div>
        </div>
        ${badgeStatus(o.status)}
      </div>
    </div>
  `).join('');
}

function renderOS(){
  const filtro = document.getElementById('filtro-status').value;
  const lista = osList.filter(o => !filtro || o.status === filtro)
                      .sort((a,b)=> b.criadoEm - a.criadoEm);
  const box = document.getElementById('lista-os');
  if(!lista.length){
    box.innerHTML = '<div class="vazio">Nenhuma ordem encontrada.</div>';
  } else {
    box.innerHTML = lista.map(o => `
      <div class="item-card">
        <div class="item-topo">
          <div>
            <div class="item-titulo">${o.item} — ${o.cliente}</div>
            <div class="item-sub">${o.descricao || ''} ${o.valor ? '• R$ ' + Number(o.valor).toFixed(2) : ''}</div>
            <div class="item-sub">${new Date(o.criadoEm).toLocaleDateString('pt-BR')}</div>
          </div>
          ${badgeStatus(o.status)}
        </div>
        <div class="item-acoes">
          <button onclick="avancarStatus('${o.id}')">Avançar status</button>
          <button onclick="abrirModalOS('${o.id}')">Editar</button>
          <button class="excluir" onclick="excluirOS('${o.id}')">Excluir</button>
        </div>
      </div>
    `).join('');
  }
  renderPainel();
}

function avancarStatus(id){
  const ordem = ['Pendente','Em andamento','Concluído','Entregue'];
  const os = osList.find(o=>o.id===id);
  const idx = ordem.indexOf(os.status);
  if(idx < ordem.length - 1){ os.status = ordem[idx+1]; salvarTudo(); renderOS(); }
}

function excluirOS(id){
  if(!confirm('Excluir esta ordem de serviço?')) return;
  osList = osList.filter(o=>o.id!==id);
  salvarTudo(); renderOS();
}

function abrirModalOS(id){
  const editando = osList.find(o=>o.id===id);
  const opcoesClientes = clientesList.map(c=>`<option value="${c.nome}" ${editando&&editando.cliente===c.nome?'selected':''}>${c.nome}</option>`).join('');
  document.getElementById('modal-caixa').innerHTML = `
    <h3>${editando ? 'Editar ordem de serviço' : 'Nova ordem de serviço'}</h3>
    <label>Cliente</label>
    <select id="os-cliente">
      <option value="">Selecione ou digite abaixo</option>
      ${opcoesClientes}
    </select>
    <label>Ou novo cliente (nome)</label>
    <input id="os-cliente-novo" placeholder="Nome do cliente">
    <label>Item</label>
    <select id="os-item">
      <option ${editando&&editando.item==='Tênis'?'selected':''}>Tênis</option>
      <option ${editando&&editando.item==='Bolsa'?'selected':''}>Bolsa</option>
      <option ${editando&&editando.item==='Boné'?'selected':''}>Boné</option>
      <option ${editando&&editando.item==='Outro'?'selected':''}>Outro</option>
    </select>
    <label>Descrição do serviço</label>
    <textarea id="os-descricao" rows="3">${editando?editando.descricao||'':''}</textarea>
    <label>Valor (R$)</label>
    <input id="os-valor" type="number" step="0.01" value="${editando?editando.valor||'':''}">
    <label>Status</label>
    <select id="os-status">
      <option ${editando&&editando.status==='Pendente'?'selected':''}>Pendente</option>
      <option ${editando&&editando.status==='Em andamento'?'selected':''}>Em andamento</option>
      <option ${editando&&editando.status==='Concluído'?'selected':''}>Concluído</option>
      <option ${editando&&editando.status==='Entregue'?'selected':''}>Entregue</option>
    </select>
    <div class="modal-acoes">
      <button class="btn-cancelar" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primario" onclick="salvarOS('${id||''}')">Salvar</button>
    </div>
  `;
  abrirModal();
}

function salvarOS(id){
  const clienteSelect = document.getElementById('os-cliente').value;
  const clienteNovo = document.getElementById('os-cliente-novo').value.trim();
  const cliente = clienteNovo || clienteSelect;
  if(!cliente){ alert('Informe o cliente.'); return; }

  if(clienteNovo && !clientesList.find(c=>c.nome===clienteNovo)){
    clientesList.push({ id: uid(), nome: clienteNovo, telefone: '', criadoEm: Date.now() });
  }

  const dados = {
    cliente,
    item: document.getElementById('os-item').value,
    descricao: document.getElementById('os-descricao').value.trim(),
    valor: document.getElementById('os-valor').value,
    status: document.getElementById('os-status').value
  };

  if(id){
    const os = osList.find(o=>o.id===id);
    Object.assign(os, dados);
  } else {
    osList.push({ id: uid(), ...dados, criadoEm: Date.now() });
  }
  salvarTudo();
  fecharModal();
  renderOS();
  renderClientes();
}

function renderClientes(){
  const box = document.getElementById('lista-clientes');
  if(!clientesList.length){
    box.innerHTML = '<div class="vazio">Nenhum cliente cadastrado.</div>';
    return;
  }
  box.innerHTML = [...clientesList].sort((a,b)=>a.nome.localeCompare(b.nome)).map(c => `
    <div class="item-card">
      <div class="item-topo">
        <div>
          <div class="item-titulo">${c.nome}</div>
          <div class="item-sub">${c.telefone || 'Sem telefone cadastrado'}</div>
        </div>
      </div>
      <div class="item-acoes">
        <button onclick="abrirModalCliente('${c.id}')">Editar</button>
        <button class="excluir" onclick="excluirCliente('${c.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

function abrirModalCliente(id){
  const editando = clientesList.find(c=>c.id===id);
  document.getElementById('modal-caixa').innerHTML = `
    <h3>${editando ? 'Editar cliente' : 'Novo cliente'}</h3>
    <label>Nome</label>
    <input id="cli-nome" value="${editando?editando.nome:''}">
    <label>Telefone</label>
    <input id="cli-telefone" value="${editando?editando.telefone||'':''}">
    <div class="modal-acoes">
      <button class="btn-cancelar" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primario" onclick="salvarCliente('${id||''}')">Salvar</button>
    </div>
  `;
  abrirModal();
}

function salvarCliente(id){
  const nome = document.getElementById('cli-nome').value.trim();
  if(!nome){ alert('Informe o nome.'); return; }
  const telefone = document.getElementById('cli-telefone').value.trim();
  if(id){
    const c = clientesList.find(c=>c.id===id);
    c.nome = nome; c.telefone = telefone;
  } else {
    clientesList.push({ id: uid(), nome, telefone, criadoEm: Date.now() });
  }
  salvarTudo();
  fecharModal();
  renderClientes();
}

function excluirCliente(id){
  if(!confirm('Excluir este cliente?')) return;
  clientesList = clientesList.filter(c=>c.id!==id);
  salvarTudo(); renderClientes();
}

function renderEstoque(){
  const box = document.getElementById('lista-estoque');
  if(!estoqueList.length){
    box.innerHTML = '<div class="vazio">Nenhum item no estoque.</div>';
    return;
  }
  box.innerHTML = estoqueList.map(i => {
    const baixo = Number(i.quantidade) <= Number(i.minimo);
    return `
    <div class="item-card">
      <div class="item-topo">
        <div>
          <div class="item-titulo">${i.nome}</div>
          <div class="item-sub">Qtd: ${i.quantidade} • Mínimo: ${i.minimo}</div>
        </div>
        ${baixo ? '<span class="badge badge-baixo">Estoque baixo</span>' : ''}
      </div>
      <div class="item-acoes">
        <button onclick="abrirModalEstoque('${i.id}')">Editar</button>
        <button class="excluir" onclick="excluirEstoque('${i.id}')">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function abrirModalEstoque(id){
  const editando = estoqueList.find(i=>i.id===id);
  document.getElementById('modal-caixa').innerHTML = `
    <h3>${editando ? 'Editar item' : 'Novo item de estoque'}</h3>
    <label>Nome do produto</label>
    <input id="est-nome" value="${editando?editando.nome:''}">
    <label>Quantidade</label>
    <input id="est-qtd" type="number" value="${editando?editando.quantidade:''}">
    <label>Quantidade mínima (alerta)</label>
    <input id="est-min" type="number" value="${editando?editando.minimo:''}">
    <div class="modal-acoes">
      <button class="btn-cancelar" onclick="fecharModal()">Cancelar</button>
      <button class="btn-primario" onclick="salvarEstoque('${id||''}')">Salvar</button>
    </div>
  `;
  abrirModal();
}

function salvarEstoque(id){
  const nome = document.getElementById('est-nome').value.trim();
  if(!nome){ alert('Informe o nome do produto.'); return; }
  const quantidade = document.getElementById('est-qtd').value || 0;
  const minimo = document.getElementById('est-min').value || 0;
  if(id){
    const i = estoqueList.find(i=>i.id===id);
    i.nome = nome; i.quantidade = quantidade; i.minimo = minimo;
  } else {
    estoqueList.push({ id: uid(), nome, quantidade, minimo, criadoEm: Date.now() });
  }
  salvarTudo();
  fecharModal();
  renderEstoque();
}

function excluirEstoque(id){
  if(!confirm('Excluir este item?')) return;
  estoqueList = estoqueList.filter(i=>i.id!==id);
  salvarTudo(); renderEstoque();
}

function abrirModal(){ document.getElementById('modal-fundo').classList.remove('hidden'); }
function fecharModal(){ document.getElementById('modal-fundo').classList.add('hidden'); }
function fecharModalFora(e){ if(e.target.id === 'modal-fundo') fecharModal(); }

function exportarBackup(){
  const dados = { empresa, osList, clientesList, estoqueList, exportadoEm: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lavanderia-pro-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importarBackup(evento){
  const arquivo = evento.target.files[0];
  if(!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    try{
      const dados = JSON.parse(leitor.result);
      if(!confirm('Isso vai substituir os dados atuais deste aparelho. Continuar?')) return;
      osList = dados.osList || [];
      clientesList = dados.clientesList || [];
      estoqueList = dados.estoqueList || [];
      salvarTudo();
      renderTudo();
      fecharMenu();
      alert('Backup importado com sucesso.');
    } catch(err){
      alert('Arquivo de backup inválido.');
    }
  };
  leitor.readAsText(arquivo);
}

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

let promptInstalacao;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptInstalacao = e;
  document.getElementById('btn-instalar').style.display = 'block';
});

function instalarApp(){
  if(!promptInstalacao) return;
  promptInstalacao.prompt();
  promptInstalacao.userChoice.then(() => { promptInstalacao = null; });
}

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

iniciar();