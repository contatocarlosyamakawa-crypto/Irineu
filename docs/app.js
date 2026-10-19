const CATS=['Alimentação','Mercado','Delivery','Transporte','Casa','Saúde','Lazer','Vestuário','Educação','Assinaturas','Presentes','Outros'];
let CARDS=['Nubank','C6','Santander','Dinheiro','Outro'];
function userCards(){const c=S.profile&&Array.isArray(S.profile.cartoes)&&S.profile.cartoes.length?S.profile.cartoes:['Nubank','C6','Santander'];return c.filter(x=>x!=='Dinheiro'&&x!=='Outro')}
function syncCards(){CARDS=[...userCards(),'Dinheiro','Outro']}
function cardEnum(cash){return CARDS.filter(c=>cash||c!=='Dinheiro').map(c=>'"'+c+'"').join('|')}
const FORMAS=['crédito','débito','pix','dinheiro'];
const CARD_DOT={Nubank:'#A646E0',C6:'#C9C7BF',Santander:'#EC2B2B',Dinheiro:'#8FE3AE',Outro:'#6E6C66'};
const MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MES3=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const STEPS=[
  {key:'renda',tag:'01 · Quanto entra',q:'Quanto você ganha por mês?',ex:'Recebo 6.500 de salário todo dia 5 e uns 800 de freela.',label:'Entra por mês'},
  {key:'fixas',tag:'02 · O que é fixo',q:'Quais contas chegam todo mês?',ex:'Aluguel 1.800 dia 10, condomínio 450, internet 120, academia 99 e streaming 55.',label:'Fixo por mês',skip:'Não tenho contas fixas'},
  {key:'parcelas',tag:'03 · O que está parcelado',q:'Tem compra parcelada rolando?',ex:'Notebook 320 por mês no Nubank, faltam 6. Fone 133 no C6, faltam 2.',label:'Parcelas por mês',skip:'Não tenho parcelas'}
];
const MIC='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const XI='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const S={ready:false,profile:null,gastos:[],tab:'home',mode:'app',ob:0,draft:{renda:[],fixas:[],variaveis:[],parcelas:[]},obText:'',obItems:null,obSaid:'',obTom:'amigo',busy:false,err:'',
  sheet:false,addText:'',pending:null,gedit:null,gSure:false,edit:null,editSure:false,call:null,callText:'',lastUndo:null,confirmWipe:false,setup:false,keyMsg:'',impMsg:'',medit:null,cardSure:null,pv:null,fatOpen:new Set(),fatJust:null,redo:false,
  locked:false,lockMsg:'',lockForgot:false,pinMsg:'',bk:false,bkMsg:'',impRaw:''};
let DB=null,UID=null,SAMPLE=null;

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const brl=n=>(n<0?'− ':'')+'R$ '+fmt(n);
const ymOf=d=>d.getFullYear()*12+d.getMonth();
const NOW=()=>new Date();
function num(s){s=String(s).trim();if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))s=s.replace(/\./g,'');return parseFloat(s.replace(',','.'))||0}
function toast(t,label,fn){const el=$('#toast'),sp=document.createElement('span');sp.textContent=t;el.replaceChildren(sp);
  if(label){const b=document.createElement('button');b.dataset.act='toastAct';b.textContent=label;el.append(b)}toast.fn=fn||null;el.classList.toggle('up',S.mode==='call');el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>{el.hidden=true;toast.fn=null},label?5000:2800)}

/* ---------- storage ---------- */
function profRef(){return DB.doc('data/users/'+UID+'/irineu')}
async function boot(){
  const k=getKey();if(k)SAMPLE=makeAI(k);
  if('serviceWorker' in navigator){try{navigator.serviceWorker.register('sw.js')}catch(e){}}
  try{await load()}catch(e){S.err='Não consegui abrir seus dados agora. Tente recarregar.'}
  syncCards();S.ready=true;
  if(pinInfo())S.locked=true;
  if(!getKey()&&!S.profile)S.setup=true;
  if(!S.profile||!S.profile.onboarded){S.mode='ob';S.ob=0}
  clearCall();
  render();
}
async function load(){
  if(DB){
    const s=await profRef().get();S.profile=s.exists?{...s.data()}:null;
    const q=await profRef().collection('gastos').orderBy('ts','desc').limit(500).get();
    S.gastos=q.docs.map(d=>({id:d.id,...d.data()}));
  }else{
    try{const j=JSON.parse(localStorage.getItem('irineu')||'null');if(j){S.profile=j.profile;S.gastos=j.gastos||[]}}catch(e){}
  }
}
function saveLocal(){try{localStorage.setItem('irineu',JSON.stringify({profile:S.profile,gastos:S.gastos}))}catch(e){}}
async function saveProfile(p){S.profile=p;syncCards();if(DB){await profRef().set(p)}else saveLocal()}
async function addGasto(g){
  if(DB){const ref=profRef().collection('gastos').doc();await ref.set(g);S.gastos.unshift({id:ref.id,...g})}
  else{S.gastos.unshift({id:'l'+Date.now(),...g});saveLocal()}
}
async function delGasto(id){
  if(DB)await profRef().collection('gastos').doc(id).delete();
  S.gastos=S.gastos.filter(g=>g.id!==id);if(!DB)saveLocal();
}
async function wipe(){
  if(DB){for(const g of S.gastos)await profRef().collection('gastos').doc(g.id).delete();await profRef().delete()}
  else{try{localStorage.removeItem('irineu')}catch(e){}}
  S.profile=null;S.gastos=[];
}

/* ---------- money math ---------- */
function activeParcelas(off){
  const ym=ymOf(NOW())+off,out=[];
  for(const p of (S.profile?.parcelas||[])){const r=p.restantes-(ym-p.base);if(r>=1&&!(p.desde&&ym<p.desde))out.push({nome:p.nome,valor:p.valor,cartao:p.cartao,rest:r,total:null,origem:'intro'})}
  for(const g of S.gastos){if(g.entrada||!(g.parcelas>1))continue;const r=g.parcelas-(ym-g.ym);if(r>=1&&r<=g.parcelas)out.push({nome:g.descricao,valor:g.valor_total/g.parcelas,cartao:g.cartao,rest:r,total:g.parcelas,origem:'voz'})}
  return out;
}
function ativo(x,ym){return (!x.fim||ym<=x.fim)&&(!x.desde||ym>=x.desde)}
function sumAt(list,ym){return (list||[]).filter(x=>ativo(x,ym)).reduce((a,x)=>a+x.valor,0)}
function ymLabel(ym){return MES3[ym%12]+'/'+String(Math.floor(ym/12)).slice(2)}
function metaGuardado(m){return (m.aportes||[]).reduce((a,x)=>a+x.valor,0)}
function guardadoNo(ym){return ((S.profile&&S.profile.metas)||[]).reduce((a,m)=>a+(m.aportes||[]).filter(x=>x.ym===ym).reduce((b,x)=>b+x.valor,0),0)}
function monthAt(off){const ym=ymOf(NOW())+off;
  if(off===0){const m=month();return {ym,entra:m.entra,comp:m.fixas+m.parc+m.gasto+m.guardado,livre:m.livre}}
  const gm=S.gastos.filter(g=>g.ym===ym),p=S.profile||{};
  const entra=sumAt(p.renda,ym)+gm.filter(g=>g.entrada).reduce((a,g)=>a+g.valor_total,0);
  const comp=sumAt(p.fixas,ym)+sumAt(p.variaveis,ym)+activeParcelas(off).reduce((a,x)=>a+x.valor,0)+gm.filter(g=>!g.entrada&&!(g.parcelas>1)).reduce((a,g)=>a+g.valor_total,0)+guardadoNo(ym);
  return {ym,entra,comp,livre:entra-comp}}
function climaOf(pct,entra){return entra<=0?{nome:'sem renda',cor:'var(--dim)'}:pct<=60?{nome:'leve',cor:'var(--lime)'}:pct<=80?{nome:'atenção',cor:'#FFB547'}:{nome:'apertado',cor:'var(--warn)'}}
function month(extra){
  const now=NOW(),ym=ymOf(now);
  const gm=S.gastos.filter(g=>g.ym===ym);
  if(extra)gm.push(extra);
  const renda=sumAt(S.profile?.renda,ym);
  const entradas=gm.filter(g=>g.entrada).reduce((a,g)=>a+g.valor_total,0);
  const fixas=sumAt(S.profile?.fixas,ym)+sumAt(S.profile?.variaveis,ym);
  let parc=activeParcelas(0).reduce((a,p)=>a+p.valor,0);
  if(extra&&!extra.entrada&&extra.parcelas>1)parc+=extra.valor_total/extra.parcelas;
  const gasto=gm.filter(g=>!g.entrada&&!(g.parcelas>1)).reduce((a,g)=>a+g.valor_total,0);
  const guardado=guardadoNo(ym),entra=renda+entradas,livre=entra-fixas-parc-gasto-guardado;
  const dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),left=dim-now.getDate()+1;
  return {entra,fixas,parc,gasto,guardado,livre,left,perDay:livre/left,gm};
}

/* ---------- AI parsing ---------- */
async function askJSON(prompt){
  if(!SAMPLE)return null;
  try{return await SAMPLE.json(prompt,{modelTier:'quick'})}
  catch(e){const c=e&&e.code;if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(c))SAMPLE=null;return null}
}
function splitSegs(t){return t.split(/[;\n]|\.\s+|,(?!\s*(?:faltam|falta|dia|\d))|\se\s(?=[^,]*\d)/i).map(s=>s.trim()).filter(Boolean)}
function firstNum(s){const m=s.match(/\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?/);return m?num(m[0]):0}
function cardOf(s){const l=normKey(String(s).replace(/\bc6\b/gi,'cseis'));
  for(const c of CARDS){if(c==='Dinheiro'||c==='Outro')continue;const k=normKey(c);if(k&&k!=='c6'&&new RegExp('(^| )'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'( |$)').test(l))return c}
  if(/(^| )nu( |$)/.test(l)&&CARDS.includes('Nubank'))return'Nubank';if(/cseis/.test(l)&&CARDS.includes('C6'))return'C6';if(/dinheiro|especie/.test(l))return'Dinheiro';return'Outro'}
function cleanName(s){
  const n=s.replace(/\bc6\b|cseis/gi,' ').replace(/r\$|\d+(?:[.,]\d+)*/gi,' ').replace(/(^|\s)(reais|por|m[eê]s|todo|dia|faltam?|parcelas?|no|na|do|da|de|em|recebo|ganho|uns|umas|mais|ou|menos|nubank|santander|c6|cart[aã]o|cr[eé]dito|d[eé]bito|pix|x|e|o|a)(?=\s|$|[.,])/gi,' ')
    .replace(/[.,;]/g,' ').replace(/\s+/g,' ').trim();
  return n.length>1?n:'';
}
const ISNUM=/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/;
const FILL=new Set('e o a os as de do da dos das no na em um uma uns umas deu dá da foi é ficou fica esse essa este esta isso mês mes tá ta tô to com pra para meu minha meus minhas tenho tem pago pagando paguei gasto gastei r$ reais real por ainda mais ou menos que aí ai também tambem agora eu ele mensal todo toda cada valor vem vence sai recebo recebi ganho ganhei comprei salário_'.split(' '));
const MODS=/^(dia|faltam|falta|faltando|restam|x|vezes|parcelas?|cancelei|cancelou|quitei|quitou|acabou|terminou|tira|tirar|remove|remover)$/;
function chunks(t){
  /* lê a fala palavra a palavra: cada valor fecha um item; "dia 10", "faltam 6", "no Nubank" grudam no item certo */
  const tk=t.replace(/\bc6\b/gi,'cseis').split(/\s+/).map(w=>w.replace(/^[(“"']+|[,.;:!?)”"']+$/g,'')).filter(Boolean);
  const items=[];let cur={words:[],raw:[],valor:0};
  const close=()=>{if(cur.valor>0||cur.remove)items.push(cur);cur={words:[],raw:[],valor:0}};
  const target=()=>cur.valor>0||cur.words.length||!items.length?cur:items[items.length-1];
  for(let i=0;i<tk.length;i++){
    const w=tk[i],lw=w.toLowerCase(),prev=(tk[i-1]||'').toLowerCase(),next=(tk[i+1]||'').toLowerCase();
    let m;
    if((m=lw.match(/^(\d+)x$/))){const tg=target();tg.parc=+m[1];tg.raw.push(w);continue}
    if(ISNUM.test(w)){const n=num(w),tg=target();
      if(prev==='dia'){tg.dia=n;tg.raw.push(w);continue}
      if(/^(faltam|falta|faltando|restam)$/.test(prev)){tg.rest=n;tg.raw.push(w);continue}
      if(/^(x|vezes|parcelas?)$/.test(next)&&n<=48&&!(cur.valor===0&&prev==='de')){tg.parc=n;tg.raw.push(w);continue}
      if(cur.valor>0)close();
      cur.valor=n;cur.raw.push(w);continue}
    if(/^(nubank|nu|cseis|santander)$/.test(lw)){const tg=target();tg.cartao=cardOf(lw);tg.raw.push(w);continue}
    if(MODS.test(lw)){const tg=target();if(/cancel|quit|acab|termin|tira|remov/.test(lw))tg.remove=true;tg.raw.push(w);continue}
    if(FILL.has(lw)){(cur.valor>0?{raw:[]}:cur).raw.push(w);continue}
    if(cur.valor>0&&!(cur.words.length===0&&/^(de|do|da|com|em|no|na)$/.test(prev)))close();
    cur.words.push(w);cur.raw.push(w);
  }
  close();
  return items.map(c=>{let nome=c.words.join(' ').replace(/cseis/gi,'C6').slice(0,40);nome=nome?nome.charAt(0).toUpperCase()+nome.slice(1):'';
    return {text:c.raw.join(' ').replace(/cseis/gi,'c6'),nome,valor:c.valor,dia:c.dia||null,rest:c.rest||null,parc:c.parc||null,cartao:c.cartao||null,remove:!!c.remove}});
}
function localList(key,t){
  return chunks(t).filter(c=>c.valor>0).map(c=>{const it={nome:c.nome||'Item',valor:c.valor};
    if(key==='parcelas'){it.restantes=c.rest||c.parc||1;it.cartao=c.cartao||'Outro'}else it.dia=c.dia;
    return it});
}
async function parseList(key,t){
  const shapes={
    renda:'{"itens":[{"nome":string,"valor":number,"dia":inteiro ou null}]} — cada fonte de renda mensal (salário, freela, etc.), valor em reais por mês.',
    fixas:'{"itens":[{"nome":string,"valor":number,"dia":inteiro ou null}]} — cada conta fixa mensal, valor em reais por mês, dia de vencimento se dito.',
    parcelas:'{"itens":[{"nome":string,"valor":number,"cartao":'+cardEnum()+',"restantes":inteiro}]} — cada compra parcelada: valor de CADA parcela em reais e quantas parcelas ainda faltam pagar contando a deste mês.'
  };
  const r=await askJSON('Extraia dados financeiros desta frase em português do Brasil: "'+t+'"\nResponda só com JSON no formato '+shapes[key]+' Nomes curtos com inicial maiúscula. Números como 1.800 significam mil e oitocentos.');
  const loc=localList(key,t);
  if(r&&Array.isArray(r.itens)&&r.itens.length>=loc.length){
    return r.itens.map(x=>({nome:String(x.nome||'Item').slice(0,40),valor:Number(x.valor)||0,dia:x.dia?Number(x.dia):null,cartao:x.cartao?String(x.cartao):undefined,restantes:x.restantes?Math.max(1,Math.round(Number(x.restantes))):undefined})).filter(x=>x.valor>0).map(x=>{if(key==='parcelas'){x.restantes=x.restantes||1;x.cartao=CARDS.includes(x.cartao)?x.cartao:'Outro';delete x.dia}else{delete x.cartao;delete x.restantes}return x});
  }
  return loc;
}
function localGasto(t){
  const l=t.toLowerCase();
  const x=l.match(/(\d+)\s*x\s*(?:de\s*)?(?:r\$\s*)?(\d[\d.,]*)/);
  let parcelas=1,total=firstNum(t);
  if(x){parcelas=+x[1];total=num(x[2])*parcelas}
  else{const p=l.match(/(?:em\s*)?(\d+)\s*(?:x|vezes|parcelas)/);if(p&&+p[1]!==total){parcelas=+p[1]}}
  let desc=cleanName(userCards().reduce((x,c)=>x.replace(new RegExp('(cart[aã]o\\s+d[aoe]\\s+)?\\b'+c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','gi'),' '),t).replace(/(gastei|comprei|paguei|recebi|ganhei|um|uma|em\s*\d+\s*x)/gi,' ')).slice(0,32)||'Gasto';
  desc=desc.charAt(0).toUpperCase()+desc.slice(1);
  const forma=/pix/.test(l)?'pix':/d[eé]bito/.test(l)?'débito':/dinheiro/.test(l)?'dinheiro':'crédito';
  return {descricao:desc,valor_total:total,parcelas,cartao:cardOf(t),forma,categoria:'Outros',entrada:/receb|ganhei|entrou|caiu/.test(l)};
}
async function parseGasto(t){
  const r=await askJSON('Você interpreta um gasto falado em português do Brasil.\nFrase: "'+t+'"\nCartões e contas do usuário: '+userCards().join(', ')+'.\nResponda só com JSON: {"descricao": string curta (ex.: "Tênis", "Mercado"), "valor_total": number em reais, "parcelas": inteiro >= 1, "cartao": '+cardEnum(1)+', "forma": "crédito"|"débito"|"pix"|"dinheiro", "categoria": um de '+JSON.stringify(CATS)+', "entrada": boolean (true se for dinheiro que o usuário recebeu)}.\nRegras: "4x de 150" significa valor_total 600 e parcelas 4. "600 em 4x" significa valor_total 600. Sem parcelamento dito, parcelas 1. Pix recebido é entrada.');
  if(r&&Number(r.valor_total)>0){
    return {descricao:String(r.descricao||'Gasto').slice(0,40),valor_total:Number(r.valor_total),parcelas:Math.max(1,Math.round(Number(r.parcelas)||1)),
      cartao:CARDS.includes(r.cartao)?r.cartao:'Outro',forma:FORMAS.includes(r.forma)?r.forma:'crédito',categoria:CATS.includes(r.categoria)?r.categoria:'Outros',entrada:!!r.entrada};
  }
  return localGasto(t);
}

/* ---------- bloco de anotações: tudo de uma vez ---------- */
const KEYS={renda:'Renda',fixas:'Conta fixa',variaveis:'Conta variável',parcelas:'Parcela'};
const TIPO2KEY={renda:'renda',fixa:'fixas',variavel:'variaveis',parcela:'parcelas'};
function prof(){const p=S.profile||{};return {...p,renda:p.renda||[],fixas:p.fixas||[],variaveis:p.variaveis||[],parcelas:p.parcelas||[]}}
function restOf(x){return x.restantes-(ymOf(NOW())-(x.base??ymOf(NOW())))}
function guessTipo(seg){const l=seg.toLowerCase();
  if(/faltam?|parcela|\d+\s*x\b|vezes/.test(l))return'parcela';
  if(/sal[aá]rio|recebo|ganho|freela|renda|entra/.test(l))return'renda';
  if(/varia|obra|reforma|mais ou menos|em m[eé]dia|\buns\b|\bumas\b|luz|[aá]gua|g[aá]s|energia|mercado/.test(l))return'variavel';
  return'fixa'}
function localBatch(t){
  return chunks(t).map(c=>{const tipo=c.rest||c.parc?'parcela':guessTipo(c.text);
    const a={acao:c.remove?'remover':'adicionar',tipo,nome:c.nome||'Item',valor:c.valor||null};
    if(tipo==='parcela'){a.restantes=c.rest||c.parc||1;a.cartao=c.cartao||'Outro'}else a.dia=c.dia;
    return a})}
async function parseBatch(t){
  const p=prof(),known={renda:p.renda.map(x=>x.nome),fixas:p.fixas.map(x=>x.nome),variaveis:p.variaveis.map(x=>x.nome),parcelas:p.parcelas.map(x=>x.nome)};
  const loc=localBatch(t);
  const r=await askJSON('Você é o assistente de anotações de um app de finanças pessoais. O usuário falou, em português do Brasil, possivelmente sem pontuação porque foi ditado: "'+t+'"\n'+
    'O que ele já tem cadastrado: '+JSON.stringify(known)+'\n'+
    'Transforme a fala em uma lista de ações, UMA para cada item mencionado (não junte itens). Responda só com JSON: {"acoes":[{"acao":"adicionar"|"atualizar"|"remover","tipo":"renda"|"fixa"|"variavel"|"parcela","nome":string,"valor":number|null,"dia":inteiro|null,"restantes":inteiro|null,"cartao":'+cardEnum()+'|null}]}\n'+
    'Regras: fixa = mesmo valor todo mês (aluguel, internet, academia, streaming). variavel = compromisso mensal cujo valor muda de um mês pro outro (obra, reforma, luz, água, gás, mesada); valor é o deste mês. parcela = compra parcelada: valor é o de CADA parcela e restantes é quantas faltam contando a deste mês. renda = dinheiro que entra. '+
    'Use "atualizar" quando ele mudar valor, dia ou parcelas de algo que já existe, repetindo exatamente o nome cadastrado. Use "remover" quando disser que acabou, quitou ou cancelou. Números como 1.800 significam mil e oitocentos. Nomes curtos com inicial maiúscula.');
  if(r&&Array.isArray(r.acoes)&&r.acoes.length>=Math.min(loc.length,1)&&r.acoes.length>=loc.length-1){
    return r.acoes.map(a=>({acao:['adicionar','atualizar','remover'].includes(a.acao)?a.acao:'adicionar',tipo:TIPO2KEY[a.tipo]?a.tipo:'fixa',nome:String(a.nome||'Item').slice(0,40),
      valor:a.valor==null?null:Number(a.valor),dia:a.dia?Number(a.dia):null,restantes:a.restantes?Math.max(1,Math.round(Number(a.restantes))):null,cartao:CARDS.includes(a.cartao)?a.cartao:null}))
      .filter(a=>a.acao==='remover'||a.valor>0||(a.acao==='atualizar'&&(a.dia||a.restantes)));
  }
  return loc;
}
function findItem(p,nome,prefer){const n=nome.toLowerCase().trim(),order=[prefer,...Object.keys(KEYS).filter(k=>k!==prefer)];
  for(const k of order){const i=p[k].findIndex(x=>x.nome.toLowerCase().trim()===n);if(i>=0)return{k,i}}
  for(const k of order){const i=p[k].findIndex(x=>x.nome.toLowerCase().includes(n)||n.includes(x.nome.toLowerCase()));if(i>=0)return{k,i}}
  return null}
function applyActions(acts,base){
  const p=JSON.parse(JSON.stringify(base||prof())),lines=[],ym=ymOf(NOW());
  for(const a of acts){const key=TIPO2KEY[a.tipo]||'fixas',hit=findItem(p,a.nome,key);
    if(a.acao==='remover'){if(hit){lines.push({op:'−',txt:p[hit.k][hit.i].nome+' saiu de '+KEYS[hit.k].toLowerCase()});p[hit.k].splice(hit.i,1)}else lines.push({op:'?',txt:'Não achei "'+a.nome+'" pra remover'});continue}
    if(hit&&(a.acao==='atualizar'||hit.k===key)){const x=p[hit.k][hit.i],ch=[];
      if(a.valor>0&&a.valor!==x.valor){ch.push(brl(x.valor)+' → '+brl(a.valor));x.valor=a.valor}
      if(a.dia&&hit.k!=='parcelas'){x.dia=a.dia;ch.push('dia '+a.dia)}
      if(a.restantes&&hit.k==='parcelas'){x.restantes=a.restantes;x.base=ym;ch.push('faltam '+a.restantes)}
      if(a.cartao&&hit.k==='parcelas')x.cartao=a.cartao;
      lines.push({op:'~',txt:x.nome+(ch.length?': '+ch.join(', '):' sem mudança')});continue}
    const it={nome:a.nome,valor:a.valor||0};
    if(key==='parcelas'){it.restantes=a.restantes||1;it.cartao=a.cartao||'Outro';it.base=ym}else it.dia=a.dia||null;
    p[key].push(it);
    lines.push({op:'+',txt:it.nome+' · '+brl(it.valor)+(key==='parcelas'?' por mês, faltam '+it.restantes:'')+' · '+KEYS[key].toLowerCase()});
  }
  return {p,lines};
}

/* ---------- IA pela sua chave (API do Claude) ---------- */
const MODEL='claude-haiku-5-5';
function getKey(){try{return localStorage.getItem('irineu_key')||''}catch(e){return ''}}
function setKey(k){try{k?localStorage.setItem('irineu_key',k):localStorage.removeItem('irineu_key')}catch(e){}}
function parseLoose(t){t=String(t||'').trim();try{return JSON.parse(t)}catch(e){}
  const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f){try{return JSON.parse(f[1])}catch(e){}}
  const a=t.search(/[\[{]/),b=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']'));if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(e){}}
  throw {code:'invalid_json',message:'resposta sem JSON'}}
let aiWarned=0;
function makeAI(key){return {json:async(prompt)=>{
  let r;
  try{r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:MODEL,max_tokens:1200,messages:[{role:'user',content:prompt+'\n\nResponda só com o JSON, sem texto antes ou depois.'}]})})}
  catch(e){throw {code:'upstream_error',message:'sem internet'}}
  if(!r.ok){let m='';try{m=(await r.json()).error.message||''}catch(e){}
    const code=r.status===401||r.status===403?'not_granted':r.status===429?'rate_limited':/credit/i.test(m)?'no_credit':'upstream_error';
    if(Date.now()-aiWarned>20000){aiWarned=Date.now();toast(code==='not_granted'?'A chave da API não funcionou. Confere em Metas, nos Ajustes.':code==='no_credit'?'Acabou o crédito da API. Dá pra recarregar no console da Anthropic.':code==='rate_limited'?'Muita coisa de uma vez. Tenta de novo em instantes.':'A IA não respondeu agora. Usei a leitura simples.')}
    throw {code,message:m}}
  const j=await r.json();return parseLoose((j.content||[]).map(c=>c.text||'').join(''))}}}

/* ---------- microfone do próprio app (reconhecimento de voz do Chrome) ---------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const MICST={on:false,listening:false,buf:'',timer:null,rec:null,target:null,fails:0};
let SPEAKING=false,spkT=null,spkId=0;
function micStart(target){if(!SR){toast('Este navegador não reconhece voz. Abre o Irineu pelo Chrome.');return}
  MICST.target=target;MICST.on=true;MICST.fails=0;micUI();listen()}
function micStop(){MICST.on=false;clearTimeout(MICST.timer);try{MICST.rec&&MICST.rec.abort()}catch(e){}MICST.listening=false;micUI()}
function listen(){
  if(!MICST.on||MICST.listening||SPEAKING||document.hidden)return;
  const r=new SR();MICST.rec=r;r.lang='pt-BR';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
  r.onstart=()=>{MICST.listening=true;micUI()};
  r.onspeechstart=()=>{clearTimeout(MICST.timer)};
  r.onresult=e=>{let interim='',fin='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)fin+=t;else interim+=t}
    if(fin){MICST.buf=(MICST.buf+' '+fin).trim();MICST.fails=0}
    showLive((MICST.buf+' '+interim).trim())};
  r.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){MICST.on=false;toast('Libera o microfone pro Irineu nas permissões do Chrome.')}else if(e.error==='no-speech')MICST.fails++};
  r.onend=()=>{MICST.listening=false;
    if(MICST.buf){clearTimeout(MICST.timer);MICST.timer=setTimeout(flushMic,MICST.target==='sheet'?700:1400)}
    if(MICST.on&&MICST.target==='call'){if(MICST.fails>=3)MICST.on=false;else setTimeout(listen,250)}
    else if(MICST.target==='sheet'&&!MICST.buf)MICST.on=false;
    micUI()};
  try{r.start()}catch(e){}
}
function showLive(t){const ta=$(MICST.target==='sheet'?'#addtxt':'#calltxt');if(ta&&MICST.on){ta.value=t;if(MICST.target==='call')S.callText=t;else S.addText=t}}
function flushMic(){const t=MICST.buf.trim();MICST.buf='';if(!t)return;
  if(MICST.target==='call'){const ta=$('#calltxt');if(ta){ta.value='';ta.style.height=''}S.callText='';sendText(t)}
  else if(MICST.target==='sheet'){MICST.on=false;const ta=$('#addtxt');if(ta)ta.value=t;S.addText=t;micUI();A.quickAdd()}}
function statusText(){const c=S.call;if(!c)return '';return (c.busy?'anotando…':SPEAKING?'falando':MICST.listening?'te ouvindo':'em chamada')+(SAMPLE?'':' · sem IA')}
function micUI(){const b=$('#call-mic');if(b){b.classList.toggle('on',MICST.on&&MICST.target==='call');b.classList.toggle('live',MICST.listening&&MICST.target==='call');b.setAttribute('aria-label',MICST.on?'Pausar o microfone':'Falar com o Irineu')}
  const s=$('#sheet-mic');if(s){s.classList.toggle('on',MICST.on&&MICST.target==='sheet');s.classList.toggle('live',MICST.listening&&MICST.target==='sheet')}
  const st=$('#call-st');if(st)st.textContent=statusText()}

/* ---------- configuração: chave da IA e dados ---------- */
function viewSetup(){return '<div class="sheet" role="dialog" aria-label="Configurar"><div class="wrap"><div class="top"><span class="eyebrow acc">Configurar</span><button class="close" aria-label="Fechar" data-act="setupClose">'+XI+'</button></div>'+
  '<h1 class="h1">Deixa o Irineu <span class="pill-word">esperto</span>.</h1>'+
  '<section class="sec" style="gap:8px"><h2 class="sech">1. Chave da API do Claude</h2><p class="sub" style="margin:0">Crie em console.anthropic.com, em API Keys. Ela fica guardada só neste celular.</p>'+
  '<div class="field wide"><label for="k-key">Chave</label><input id="k-key" type="password" autocomplete="off" placeholder="'+(getKey()?'Chave salva. Cole outra pra trocar.':'sk-ant-…')+'"></div>'+
  '<div class="btns"><button class="btn" data-act="keyClear">Apagar chave</button><button class="btn pri" data-act="keySave" '+(S.busy?'disabled':'')+'>'+(S.busy?'Testando…':'Salvar e testar')+'</button></div>'+
  (S.keyMsg?'<span class="sub">'+esc(S.keyMsg)+'</span>':'')+'</section>'+
  '<section class="sec" style="gap:8px"><h2 class="sech">2. Trazer meus dados</h2><p class="sub" style="margin:0">No Irineu antigo, em Seu mês, toque em "Copiar meus dados pro app novo" e cole aqui. Também aceita um arquivo de backup.</p>'+
  '<textarea id="imp-txt" placeholder="Cole aqui"></textarea><input id="imp-file" type="file" accept=".json,application/json" aria-label="Arquivo de backup">'+
  '<div class="field wide"><label for="imp-pass">Senha do backup (se ele tiver senha)</label><input id="imp-pass" type="password" autocomplete="off"></div>'+
  '<button class="btn pri" data-act="importDo">Importar</button>'+(S.impMsg?'<span class="sub">'+esc(S.impMsg)+'</span>':'')+'</section>'+
  '<button class="btn" data-act="setupClose">'+(S.profile?'Voltar':'Pular por enquanto')+'</button></div></div>'}

/* ---------- jeito do Irineu ---------- */
const TONS={
  amigo:{nome:'Amigo',regra:'Tom amigo: acolhedor, direto e encorajador, sem sermão.',
    ok:(l,d)=>'Você tem '+l+' livres até o fim do mês, uns '+d+' por dia.',neg:x=>'Já passou '+x+' do mês. Bora ver juntos onde dá pra segurar?',
    alo:'Oi! Tô na linha. Gastou algo, mudou alguma conta ou quer saber como tá o mês?'},
  rispido:{nome:'Ríspido',regra:'Tom ríspido: seco, curto, sem rodeios e sem elogio, cobra disciplina como um treinador exigente.',
    ok:(l,d)=>'Livre: '+l+'. Dá '+d+' por dia. Não inventa moda.',neg:x=>'Estourou '+x+'. Corta agora.',
    alo:'Fala. Gasto, conta ou pergunta?'},
  zoeiro:{nome:'Zoeiro',regra:'Tom zoeiro: tira sarro dos exageros como amigo de longa data, com gírias brasileiras leves e piadas curtas.',
    ok:(l,d)=>'Sobrou '+l+' pro mês, uns '+d+' por dia. Dá pra viver, mas sem ostentação, beleza?',neg:x=>'Ih, estourou '+x+'. O Irineu tá suando frio aqui.',
    alo:'Alô, alô! Irineu na escuta. Gastou o quê dessa vez?'}
};
function tom(){const t=S.profile&&S.profile.tom;return TONS[t]?t:(TONS[S.obTom]?S.obTom:'amigo')}
function greeting(){const m=month(),T=TONS[tom()];return m.livre<0?T.neg(brl(-m.livre)):T.ok(brl(m.livre),brl(m.perDay))}

const PHONE='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
const SEND='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const CHK='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
const DOWN='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const ARW='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';
const CHEV='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="color:var(--dim);flex-shrink:0"><path d="M9 6l6 6-6 6"/></svg>';
const MICBIG='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

/* ---------- categorias: lista + o que você corrigiu ---------- */
const CAT_DICT=[
 [/mercado|supermercado|atacad|\bassai\b|carrefour|pao de acucar|hortifruti|sacolao|\bfeira\b/,'Mercado'],
 [/ifood|delivery|rappi|ze delivery|aiqfome/,'Delivery'],
 [/\buber\b|99 ?pop|99 ?taxi|\btaxi\b|\bmetro\b|onibus|gasolina|\bposto\b|combustivel|estacionamento|pedagio|bilhete unico/,'Transporte'],
 [/padaria|restaurante|lanche|lanchonete|\bcafe\b|almoco|jantar|pizza|hamburguer|burger|\bacai\b|sorvete|\bbar\b|boteco|marmita/,'Alimentação'],
 [/farmacia|drogaria|drogasil|\braia\b|remedio|medico|consulta|dentista|\bexame|hospital|academia|smart ?fit/,'Saúde'],
 [/netflix|spotify|prime video|amazon prime|disney|\bhbo\b|globoplay|youtube|assinatura|icloud|google one/,'Assinaturas'],
 [/cinema|\bshow\b|ingresso|viagem|passeio|hotel|airbnb|steam|playstation|xbox|nintendo|balada|\bfesta\b/,'Lazer'],
 [/roupa|\btenis\b|camisa|camiseta|\bcalca\b|sapato|vestido|bermuda|jaqueta|renner|\bzara\b|riachuelo|shein|\bnike\b|adidas/,'Vestuário'],
 [/\bcurso\b|\blivro|faculdade|escola|udemy|alura/,'Educação'],
 [/presente|aniversario/,'Presentes'],
 [/\bluz\b|energia|\benel\b|sabesp|\bagua\b|\bgas\b|internet|aluguel|condominio|moveis|reforma|\bobra\b|material de construcao|leroy|telhanorte/,'Casa']
];
function normKey(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function catOf(desc,text){const m=(S.profile&&S.profile.cats)||{},k=normKey(desc);if(k&&m[k])return m[k];const t=normKey((desc||'')+' '+(text||''));for(const [rx,c] of CAT_DICT)if(rx.test(t))return c;return 'Outros'}

/* ---------- gasto rápido: o app lê primeiro, a IA só se não achar o valor ---------- */
async function quickParse(t){
  let g=localGasto(t);
  if(!(g.valor_total>0)){const ai=await parseGasto(t);if(ai&&ai.valor_total>0)g=ai}
  if(!(g.valor_total>0))return null;
  if(!g.categoria||g.categoria==='Outros')g.categoria=g.entrada?'Outros':catOf(g.descricao,t);
  return g;
}
function recFrom(g,t){const now=NOW();return {descricao:(g.descricao||'Gasto').slice(0,40),valor_total:g.valor_total,parcelas:g.entrada?1:Math.max(1,g.parcelas|0),cartao:g.cartao||'Outro',forma:g.forma||'crédito',
  categoria:g.categoria||'Outros',entrada:!!g.entrada,fala:(t||'').slice(0,300),ts:now.getTime(),ym:ymOf(now)}}
async function registrar(g,t){const rec=recFrom(g,t);await addGasto(rec);const id=S.gastos[0].id;
  toast((rec.entrada?'Entrada: ':'Registrado: ')+(rec.parcelas>1?rec.parcelas+'x de '+brl(rec.valor_total/rec.parcelas):brl(rec.valor_total))+' · '+(rec.entrada?rec.cartao:rec.categoria),'Desfazer',
    async()=>{try{await delGasto(id);toast('Desfeito.')}catch(e){toast('Não consegui desfazer agora.')}render()})}
async function updateGasto(id,rec){if(DB)await profRef().collection('gastos').doc(id).set(rec);const i=S.gastos.findIndex(g=>g.id===id);if(i>=0)S.gastos[i]={id,...rec};if(!DB)saveLocal()}

/* ---------- ligação (removida na versão 5; restos guardados só pra limpar dados antigos) ---------- */
function callLists(){return prof()}
async function setCallLists(p){return saveProfile({...prof(),...p})}
async function saveCall(){}
async function clearCall(){try{localStorage.removeItem('irineu_call');localStorage.removeItem('irineu_calltxt')}catch(e){}}
function fitDock(){}

/* ---------- telas ---------- */
function tipHtml(){return '<div class="tip">'+MIC+'<span>Toque no microfone do teclado do celular e fale. Se preferir, digite.</span></div>'}
function itemsTotal(items){return (items||[]).reduce((a,x)=>a+x.valor,0)}
function meter(total,parts){
  if(total<=0)return '<div class="meter"><span style="flex:1;background:var(--line)"></span></div>';
  let used=0;const segs=parts.filter(p=>p[0]>0).map(([v,c])=>{const w=Math.min(100-used,v/total*100);used+=w;return '<span style="width:'+w.toFixed(2)+'%;background:'+c+'"></span>'}).join('');
  return '<div class="meter">'+segs+'<span style="flex:1;background:var(--line)"></span></div>';
}
function viewOb(){
  if(S.ob===0){
    return '<div class="welcome-bg"><div class="wrap welcome"><div class="top"><span class="mark">irineu<i>.</i></span>'+
    '<span class="badge" aria-hidden="true"><svg class="ring" viewBox="0 0 116 116"><defs><path id="bp" d="M58,58 m-43,0 a43,43 0 1,1 86,0 a43,43 0 1,1 -86,0"/></defs><text font-family="Manrope,sans-serif" font-size="11.5" font-weight="700" letter-spacing="2.2" fill="#111113"><textPath href="#bp">O IRINEU SABE • O IRINEU SABE • </textPath></text></svg>'+
    '<span style="font-family:var(--display);font-weight:700;font-size:30px;letter-spacing:-.04em">i<span style="color:var(--violet)">.</span></span></span></div>'+
    '<div class="sec" style="gap:22px"><h1 class="h1" style="font-size:clamp(46px,14vw,64px)">Prazer, eu sou o <span class="pill-word">Irineu</span>.</h1>'+
    '<p style="font-size:17px;margin:0;color:rgba(255,255,255,.82)">Em 3 passos você me conta quanto entra, o que é fixo e o que está parcelado. Depois é só mandar áudio dos gastos que eu anoto e organizo tudo.</p>'+
    '<div class="tilt"><span>Quanto entra</span><span>O que é fixo e o que varia</span><span>O que está parcelado</span></div></div>'+
    '<div class="sec" style="gap:6px"><button class="btn pri go" data-act="obStart">Começar<span class="arw">'+ARW+'</span></button>'+(getKey()?'':'<button class="link" style="color:#fff;text-align:center" data-act="setupOpen">Colar a chave da IA e trazer meus dados</button>')+'</div></div></div>';
  }
  if(S.ob<=3){
    const st=STEPS[S.ob-1];
    let h='<div class="wrap"><div class="prog">'+[1,2,3].map(i=>'<span class="'+(i<=S.ob?'on':'')+'"></span>').join('')+'</div>'+
      '<div class="sec" style="gap:10px"><span class="eyebrow acc">'+st.tag+'</span><h1 class="h1">'+st.q+'</h1></div>';
    if(S.obItems===null){
      h+='<div class="sec"><label for="obtxt" class="sub">Por exemplo: "'+esc(st.ex)+'"</label>'+
        '<textarea id="obtxt" data-bind="obText" placeholder="Fale ou digite aqui">'+esc(S.obText)+'</textarea>'+tipHtml()+
        (S.err?'<span class="err">'+esc(S.err)+'</span>':'')+'</div>'+
        '<div class="sec" style="gap:10px"><button class="btn pri" data-act="obParse" '+(S.busy?'disabled':'')+'>'+(S.busy?'Entendendo…':'Entender')+'</button>'+
        (st.skip?'<button class="btn" data-act="obSkip">'+st.skip+'</button>':'')+
        (S.ob>1?'<button class="link" data-act="obBack">Voltar</button>':'')+'</div>';
    }else{
      const it=S.obItems;
      h+='<p class="said" style="margin:0">"'+esc(S.obSaid)+'"</p><div class="card" style="padding:6px 18px 12px"><div class="list">'+
        (it.length?it.map((x,i)=>{
          const meta=st.key==='parcelas'?(x.cartao+' · faltam '+x.restantes):(x.dia?'dia '+x.dia:'mensal');
          return '<div class="row"><div class="txt"><strong>'+esc(x.nome)+'</strong><small>'+esc(meta)+'</small></div><span class="val">'+brl(x.valor)+'</span><button class="x" aria-label="Remover '+esc(x.nome)+'" data-act="obRm" data-arg="'+i+'">'+XI+'</button></div>'}).join('')
        :'<p class="empty">Não entendi nenhum valor. Toque em Corrigir e tente de novo.</p>')+
        '</div><div class="total"><span class="sub">'+st.label+'</span><b>'+brl(itemsTotal(it))+'</b></div></div>'+
        '<div class="btns"><button class="btn" data-act="obRedo">Corrigir</button><button class="btn pri" data-act="obOk" '+(it.length?'':'disabled')+'>Isso mesmo</button></div>';
    }
    return h+'</div>';
  }
  const d=S.draft,R=itemsTotal(d.renda),F=itemsTotal(d.fixas)+itemsTotal(d.variaveis),P=itemsTotal(d.parcelas),L=R-F-P;
  const pct=R>0?Math.round((F+P)/R*100):0,dim=new Date(NOW().getFullYear(),NOW().getMonth()+1,0).getDate();
  const msg=R<=0?'Sem renda informada eu não consigo calcular quanto sobra. Dá pra voltar e me contar.':
    pct<=50?pct+'% do que entra já tem dono. Tá saudável. Se passar de 60%, eu te aviso antes de você parcelar mais alguma coisa.':
    pct<=70?pct+'% do que entra já tem dono. Dá pra viver, mas eu vou ficar de olho antes de você parcelar mais.':
    pct+'% do que entra já tem dono. Tá apertado. Antes de qualquer parcela nova, me pergunta se cabe.';
  const dg=(S.call&&S.call.draftGastos)||[],np=['renda','fixas','variaveis','parcelas'].reduce((a,k)=>a+(d[k]||[]).filter(x=>x.pendente).length,0);
  return '<div class="wrap"><span class="eyebrow acc">Seu mês, organizado</span>'+
    '<div class="hero'+(L<0?' neg':'')+'"><span class="sub">Sobra pra viver, depois de tudo</span><div class="hero-num"><span class="cur">R$</span><span class="big">'+Math.trunc(Math.abs(L)).toLocaleString('pt-BR')+'</span><span class="cur">,'+fmt(L).split(',')[1]+'</span></div>'+
    '<span class="sub">Cerca de <b>'+brl(L/dim)+'</b> por dia</span></div>'+
    meter(R,[[F,'var(--fg)'],[P,'var(--accent)']])+
    '<div class="list">'+
      '<div class="row"><div class="txt"><strong>Entra por mês</strong></div><span class="val">'+brl(R)+'</span></div>'+
      '<div class="row"><span class="dot" style="background:var(--fg)"></span><div class="txt"><strong>Contas fixas e variáveis</strong></div><span class="val">'+brl(-F)+'</span></div>'+
      '<div class="row"><span class="dot" style="background:var(--accent)"></span><div class="txt"><strong>Parcelas</strong></div><span class="val">'+brl(-P)+'</span></div>'+
      (dg.length?'<div class="row"><div class="txt"><strong>Gastos contados na ligação</strong><small>'+dg.length+(dg.length>1?' lançamentos entram':' lançamento entra')+' no Início</small></div><span class="val">'+brl(dg.reduce((a,g)=>a+(g.entrada?0:g.valor_total),0))+'</span></div>':'')+'</div>'+
    '<button class="link" data-act="obBack">Voltar e corrigir</button>'+
    '<div class="bubble ir" style="max-width:100%">'+esc(msg)+'</div>'+
    '<div class="sec" style="gap:8px"><span class="sub">Como você quer que eu fale com você? Dá pra trocar depois.</span><div class="tons" role="radiogroup" aria-label="Jeito do Irineu">'+
    Object.keys(TONS).map(k=>'<button role="radio" aria-checked="'+(S.obTom===k)+'" class="'+(S.obTom===k?'on':'')+'" data-act="obTom" data-arg="'+k+'">'+TONS[k].nome+'</button>').join('')+'</div></div>'+
    '<button class="btn pri" data-act="obFinish" '+(S.busy?'disabled':'')+'>'+(S.busy?'Salvando…':'Fechou, Irineu')+'</button></div>';
}

function dayLabel(ts){const d=new Date(ts),n=NOW(),a=new Date(n.getFullYear(),n.getMonth(),n.getDate()),b=new Date(d.getFullYear(),d.getMonth(),d.getDate()),diff=Math.round((a-b)/864e5);
  if(diff===0)return 'Hoje';if(diff===1)return 'Ontem';return ['dom','seg','ter','qua','qui','sex','sáb'][d.getDay()]+', '+d.getDate()+' '+MES3[d.getMonth()]}
function listByDay(list){const out=[];let cur=null;for(const g of list){const k=dayLabel(g.ts);if(!cur||cur.k!==k){cur={k,items:[],tot:0};out.push(cur)}cur.items.push(g);if(!g.entrada)cur.tot+=g.valor_total}
  return out.map(d=>'<div class="dayh"><span>'+d.k+'</span><span>'+(d.tot?'− '+brl(d.tot):'')+'</span></div>'+d.items.map(rowGasto).join('')).join('')}
const AV={Nubank:['Nu','#8A3FD1','#fff'],C6:['C6','#2C2C34','#F4F3F8'],Santander:['S','#E0262B','#fff'],Dinheiro:['R$','#8FE3AE','#111113'],Outro:['•','#2C2C34','#A6A4B0']};
function avatar(c){const a=AV[c]||[String(c||'•').slice(0,2),['#2F7D6B','#B2541F','#3D5AFE','#8E3B59','#5B6B1F'][[...String(c||'')].reduce((h,ch)=>h+ch.charCodeAt(0),0)%5],'#fff'];return '<span class="av" aria-hidden="true" style="background:'+a[1]+';color:'+a[2]+'">'+esc(a[0])+'</span>'}
function rowGasto(g){
  const meta=[g.cartao+(g.entrada?'':' · '+g.forma),g.parcelas>1?g.parcelas+'x de '+brl(g.valor_total/g.parcelas):null,g.entrada?null:g.categoria].filter(Boolean).join(' · ');
  return '<button class="row rowbtn" data-act="geditOpen" data-arg="'+esc(g.id)+'">'+avatar(g.cartao)+'<span class="txt"><strong>'+esc(g.descricao)+'</strong><small>'+esc(meta)+'</small></span>'+
    '<span class="val'+(g.entrada?' in':'')+'">'+(g.entrada?'+ ':'− ')+'R$ '+fmt(g.valor_total)+'</span></button>';
}
function startOff(){const now=ymOf(NOW()),p=S.profile||{};
  const ds=[...(p.renda||[]),...(p.fixas||[]),...(p.variaveis||[]),...(p.parcelas||[])].map(x=>x.desde||0).filter(d=>d>now);
  if(!ds.length)return 0;const m=monthAt(0);return (m.entra>0||m.comp>0)?0:Math.min(...ds)-now}
const PAL=['#7A4DF5','#F4F3F8','#A78BFF','#FFB547','#5BC0EB','#FF8A70','#C9C7BF','#8FE3AE','#E07BB5','#6C7BFF'];
function destinos(off){const ym=ymOf(NOW())+off,p=S.profile||{},out=[];
  const add=(nome,v)=>{if(v>0.004)out.push({nome,valor:v})};
  add('Variáveis',sumAt(p.variaveis,ym));add('Fixas',sumAt(p.fixas,ym));
  const pc={};activeParcelas(off).forEach(x=>{const k=x.cartao||'Outro';pc[k]=(pc[k]||0)+x.valor});
  Object.entries(pc).forEach(([k,v])=>add(k==='Outro'?'Outras parcelas':'Cartão '+k,v));
  const gm=S.gastos.filter(g=>g.ym===ym&&!g.entrada&&!(g.parcelas>1));
  if(off>0)add('Previstos',gm.reduce((a,g)=>a+g.valor_total,0));
  else{const c={};gm.forEach(g=>{c[g.categoria]=(c[g.categoria]||0)+g.valor_total});Object.entries(c).forEach(([k,v])=>add(k,v))}
  add('Guardado nas metas',guardadoNo(ym));
  out.sort((a,b)=>b.valor-a.valor);out.forEach((x,i)=>x.cor=PAL[i%PAL.length]);
  const x=monthAt(off);if(x.livre>0.004)out.push({nome:'Sobra',valor:x.livre,cor:'var(--lime)'});
  return {lista:out,entra:x.entra,livre:x.livre}}
function viewDestinos(off){const d=destinos(off),ym=ymOf(NOW())+off;if(!d.lista.length)return '';
  const tot=Math.max(d.entra,d.lista.reduce((a,x)=>a+x.valor,0),1);
  return '<section class="card sec"><div class="sec-h"><h2>Pra onde vai o dinheiro</h2><span class="sub">'+MES[ym%12]+'</span></div>'+
    '<div class="dbar" role="img" aria-label="Divisão do dinheiro de '+MES[ym%12]+': '+esc(d.lista.map(x=>x.nome+' '+brl(x.valor)).join(', '))+'">'+d.lista.map(x=>'<span style="width:'+(x.valor/tot*100).toFixed(2)+'%;background:'+x.cor+'"></span>').join('')+'</div>'+
    '<div class="list">'+d.lista.map(x=>'<div class="drow"><i style="background:'+x.cor+'"></i><span class="dn">'+esc(x.nome)+'</span><span class="dp">'+(d.entra>0?Math.round(x.valor/d.entra*100)+'%':'')+'</span><b>'+brl(x.valor)+'</b></div>').join('')+'</div>'+
    (d.livre<0?'<p class="sub" style="margin:0;color:var(--warn)">Passa do que entra em '+brl(-d.livre)+'.</p>':'')+'</section>'}
function viewHome(){
  const now=NOW(),ym0=ymOf(now),off=offOf(),ymv=ym0+off,m=month();
  const list=(off>0?S.gastos.filter(g=>g.ym===ymv):m.gm).slice().sort((a,b)=>b.ts-a.ts);
  const E=Math.max(m.entra,1),w=v=>Math.max(0,Math.min(100,v/E*100)).toFixed(2)+'%';
  const seg=monthStrip(off);
  let card;
  if(off>0){const pv=monthAt(off),dim=new Date(Math.floor(ymv/12),ymv%12+1,0).getDate(),pct=pv.entra>0?Math.round(pv.comp/pv.entra*100):0;
    card='<section class="lime-card'+(pv.livre<0?' neg':'')+'"><div class="top"><span class="chip-date">Prévia</span></div>'+
      '<span style="font-size:13px;font-weight:700">'+(pv.livre<0?'Vai faltar em '+MES[ymv%12]:'Sobra prevista em '+MES[ymv%12])+'</span>'+
      '<div class="ratio"><span class="big">'+Math.trunc(Math.abs(pv.livre)).toLocaleString('pt-BR')+'</span><span class="of">/ '+Math.round(pv.entra).toLocaleString('pt-BR')+'</span></div>'+
      '<span class="sub">'+pct+'% do que entra já tem dono'+(pv.livre>0?' · uns <b>'+brl(pv.livre/dim)+'</b> por dia':'')+'</span></section>'}
  else card='<section class="lime-card'+(m.livre<0?' neg':'')+'"><div class="top"><span class="chip-date"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'+m.left+' dias até virar o mês</span></div>'+
    '<span style="font-size:13px;font-weight:700">'+(m.livre<0?'Passou do mês em':'Livre até o fim do mês')+'</span>'+
    '<div class="ratio"><span class="big">'+Math.trunc(Math.abs(m.livre)).toLocaleString('pt-BR')+'</span><span class="of">/ '+Math.round(m.entra).toLocaleString('pt-BR')+'</span></div>'+
    '<div class="bar" role="img" aria-label="Do que entra: contas '+brl(m.fixas)+', parcelas '+brl(m.parc)+', gasto '+brl(m.gasto)+'">'+
      (m.fixas>0?'<span style="width:'+w(m.fixas)+';background:var(--ink)"></span>':'')+
      (m.parc>0?'<span class="stripe" style="width:'+w(m.parc)+'"></span>':'')+
      (m.gasto>0?'<span style="width:'+w(m.gasto)+';background:rgba(17,17,19,.45)"></span>':'')+'</div>'+
    '<div class="legend"><div><small><i style="background:var(--ink)"></i>Contas do mês</small><strong>'+brl(m.fixas)+'</strong></div>'+
    '<div><small><i class="stripe"></i>Parcelas do mês</small><strong>'+brl(m.parc)+'</strong></div>'+
    '<div><small><i style="background:rgba(17,17,19,.45)"></i>Gasto no mês</small><strong>'+brl(m.gasto)+'</strong></div>'+
    '<div><small>Por dia</small><strong>'+(m.livre>0?brl(m.perDay):'R$ 0,00')+'</strong></div></div>'+
    (m.guardado>0?'<span class="sub" style="font-size:12px">O livre já desconta os '+brl(m.guardado)+' que você guardou nas metas.</span>':'')+'</section>';
  return '<div class="wrap">'+
  '<div class="top"><div style="display:flex;flex-direction:column;gap:2px"><span class="sub">'+(['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][now.getDay()])+', '+now.getDate()+' de '+MES[now.getMonth()]+'</span><span class="mark">irineu<i>.</i></span></div>'+
    '<button class="iconbtn" aria-label="Mandar áudio de um gasto" data-act="openSheet">'+MICBIG.replace(/26/g,'20')+'</button></div>'+
  '<h1 class="h1">'+(off>0?'Prévia de<br>'+MES[ymv%12]:'Seu mês<br>de '+MES[now.getMonth()])+'</h1>'+seg+card+
  (off===0&&S.profile?'<div class="bubble ir" style="max-width:100%">'+esc(greeting())+'</div>':'')+
  viewDestinos(off)+viewTermo(off)+
  '<button class="callbar" data-act="tab" data-arg="parc">Ver os cartões de '+MES[ymv%12]+'<b>Contas →</b></button>'+
  '<section class="sec" style="gap:0"><div class="sec-h"><h2>'+(off>0?'Previstos':'Lançamentos')+'</h2><span class="sub">'+list.length+' em '+MES[ymv%12]+'</span></div><div class="list">'+
    (list.length?listByDay(list):'<p class="empty">'+(off>0?'Nenhum gasto avulso previsto pra '+MES[ymv%12]+'. As parcelas e contas desse mês estão na aba Contas.':'Nada lançado ainda. Toque no microfone verde e conta pro Irineu o que você gastou.')+'</p>')+
  '</div></section></div>';
}
function viewTermo(sel){
  const s0=startOff(),it=[0,1,2,3,4,5].map(i=>{const o=s0+i,x=monthAt(o),pct=x.entra>0?Math.round(x.comp/x.entra*100):0;return {...x,o,pct,c:climaOf(pct,x.entra)}});
  const fut=it.filter(x=>x.o>0&&x.entra>0),best=fut.length?fut.reduce((a,b)=>b.livre>a.livre?b:a):null,worst=fut.length?fut.reduce((a,b)=>b.pct>a.pct?b:a):null;
  const msg=[];if(worst&&worst.pct>80)msg.push('<b>Atenção em '+MES[worst.ym%12]+':</b> '+worst.pct+'% já tem dono, sobra '+brl(worst.livre)+'.');
  if(best)msg.push('<b>Mais leve: '+MES[best.ym%12]+'</b>, sobra '+brl(best.livre)+'.');
  return '<section class="card sec"><div class="sec-h"><h2>Termômetro</h2><button class="pilllink" data-act="tab" data-arg="parc">Ver contas</button></div>'+
    '<div class="tgrid">'+it.map(x=>'<button class="tcol'+(x.o===sel?' sel':'')+'" data-act="pvSet" data-arg="'+x.o+'" aria-label="Ver '+MES[x.ym%12]+': '+x.pct+'% comprometido, '+x.c.nome+'"><span class="tpct">'+(x.entra>0?x.pct+'%':'–')+'</span><span class="ttube"><span style="height:'+Math.max(4,Math.min(100,x.pct))+'%;background:'+x.c.cor+'"></span></span><b>'+MES3[x.ym%12]+'</b><small>'+x.c.nome+'</small></button>').join('')+'</div>'+
    (msg.length?'<p class="sub" style="margin:0;color:var(--fg)">'+msg.join(' ')+'</p>':'')+
    '<p class="sub" style="margin:0;font-size:12px">Toque num mês pra ver a prévia dele. O mês atual inclui o que você já gastou.</p></section>';
}
function viewEdit(){
  const e=S.edit,d=e.d,k=d.key,isNew=e.i<0;
  const opts=Object.keys(KEYS).map(x=>'<option value="'+x+'"'+(x===k?' selected':'')+'>'+KEYS[x]+'</option>').join('');
  const valLabel=k==='parcelas'?'Valor de cada parcela (R$)':k==='variaveis'?'Valor deste mês (R$)':'Valor por mês (R$)';
  return '<div class="sheet" role="dialog" aria-label="Editar"><div class="wrap"><div class="top"><span class="eyebrow acc">'+(isNew?'Novo item':'Editar')+'</span><button class="close" aria-label="Fechar" data-act="editClose">'+XI+'</button></div>'+
  '<h1 class="h1">'+(isNew?'Novo '+KEYS[k].toLowerCase():esc(d.nome||KEYS[k]))+'</h1>'+
  (d.pendente?'<div class="qnote"><b>Dúvida do Irineu:</b> '+esc(d.pendente)+'<br><span class="sub">Salvar resolve a dúvida.</span></div>':'')+
  '<div class="fields">'+
    '<div class="field wide"><label for="e-tipo">Tipo</label><select id="e-tipo">'+opts+'</select></div>'+
    '<div class="field wide"><label for="e-nome">Nome</label><input id="e-nome" value="'+esc(d.nome||'')+'" placeholder="Ex.: Evolução de obra"></div>'+
    '<div class="field"><label for="e-valor">'+valLabel+'</label><input id="e-valor" inputmode="decimal" value="'+(d.valor?fmt(d.valor).replace(/\./g,''):'')+'"></div>'+
    (k==='parcelas'?'<div class="field"><label for="e-rest">Faltam (com a deste mês)</label><input id="e-rest" inputmode="numeric" value="'+esc(d.rest||1)+'"></div>'+
      '<div class="field wide"><label for="e-cartao">Cartão</label><select id="e-cartao">'+CARDS.map(c=>'<option'+(c===d.cartao?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></div>'
     :'<div class="field"><label for="e-dia">Dia (opcional)</label><input id="e-dia" inputmode="numeric" value="'+esc(d.dia||'')+'"></div>'+
     '<div class="field wide"><label for="e-fim">Acaba em</label><select id="e-fim"><option value="">Não tem fim</option>'+Array.from({length:37},(_,i)=>{const y=ymOf(NOW())+i;return '<option value="'+y+'"'+(d.fim===y?' selected':'')+'>'+MES[y%12]+' de '+Math.floor(y/12)+'</option>'}).join('')+'</select></div>')+
  '</div>'+
  (k==='variaveis'?'<p class="sub" style="margin:0">Variável é o que vem todo mês com valor diferente. Dá pra atualizar aqui ou falar na ligação: "a obra esse mês deu 2.300".</p>':'')+
  (S.err?'<span class="err">'+esc(S.err)+'</span>':'')+
  '<div class="btns">'+(isNew?'<button class="btn" data-act="editClose">Cancelar</button>':'<button class="btn" style="'+(S.editSure?'background:var(--warn);border-color:var(--warn);color:var(--ink)':'color:var(--warn)')+'" data-act="editDel">'+(S.editSure?'Confirmar':'Apagar')+'</button>')+
  '<button class="btn pri" data-act="editSave">Salvar</button></div></div></div>';
}
function viewMetas(){
  const ms=(S.profile&&S.profile.metas)||[],now=ymOf(NOW()),m0=month();
  const perMes=m=>{const f=Math.max(0,m.alvo-metaGuardado(m)),me=Math.max(1,(m.prazo||now+11)-now+1);return f/me};
  const need=ms.reduce((a,m)=>a+perMes(m),0);
  let dica;
  if(!ms.length){const r=sumAt(S.profile&&S.profile.renda,now);dica='Uma regra comum é guardar pelo menos 10% do que entra'+(r>0?': uns <b>'+brl(r*.1)+'</b> por mês':'')+'. Cria uma meta, tipo reserva de emergência ou viagem, que eu calculo quanto guardar.'}
  else if(need<=0)dica='Todas as metas estão concluídas. Bora criar a próxima?';
  else if(m0.livre>=need)dica='Pra bater suas metas, guarda <b>'+brl(need)+'</b> por mês. Este mês cabe: ainda sobram '+brl(m0.livre-need)+' depois disso.';
  else{let ok=null;for(let o=1;o<=11;o++){const x=monthAt(o);if(x.livre>=need){ok=x;break}}
    dica='Pra bater suas metas, o ideal é guardar <b>'+brl(need)+'</b> por mês, mas este mês só sobram '+brl(Math.max(0,m0.livre))+'. '+(ok?'A partir de <b>'+MES[ok.ym%12]+'</b> cabe tranquilo, e dá pra compensar lá.':'Talvez valha esticar o prazo de alguma meta.')}
  return '<section class="sec" style="gap:10px"><div class="sec-h"><h2>Suas metas</h2><button class="pilllink" data-act="metaNew">+ nova meta</button></div>'+
    '<div class="bubble ir" style="max-width:100%;white-space:normal">'+dica+'</div>'+
    ms.map((m,i)=>{const g=metaGuardado(m),f=Math.max(0,m.alvo-g),pct=m.alvo>0?Math.min(100,g/m.alvo*100):0;
      return '<div class="meta"><div class="sec-h"><strong>'+esc(m.nome)+'</strong><button class="pilllink" data-act="metaEdit" data-arg="'+i+'">editar</button></div>'+
        '<div class="mbar" role="img" aria-label="'+Math.round(pct)+'% guardado"><span style="width:'+pct.toFixed(1)+'%"></span></div>'+
        '<div class="sec-h"><span class="sub"><b>'+brl(g)+'</b> de '+brl(m.alvo)+'</span><span class="sub">'+(f>0?(m.prazo?'até '+ymLabel(m.prazo):'sem prazo'):'concluída')+'</span></div>'+
        (f>0?'<p class="sub" style="margin:0">Guarda <b>'+brl(perMes(m))+'</b> por mês pra chegar lá.</p>':'')+
        '<div class="ask"><input id="ap-'+i+'" inputmode="decimal" placeholder="Quanto você guardou" aria-label="Quanto você guardou em '+esc(m.nome)+'"><button class="btn pri" data-act="metaAporte" data-arg="'+i+'">Guardei</button></div></div>'}).join('')+
    '<p class="sub" style="margin:0;font-size:12px">O Irineu sugere quanto guardar, não onde investir. O que você guarda sai do livre do mês.</p></section>';
}
function viewMetaEdit(){const e=S.medit,isNew=e.i<0;
  return '<div class="sheet" role="dialog" aria-label="Meta"><div class="wrap"><div class="top"><span class="eyebrow acc">'+(isNew?'Nova meta':'Editar meta')+'</span><button class="close" aria-label="Fechar" data-act="metaClose">'+XI+'</button></div>'+
  '<h1 class="h1">'+(isNew?'O que você quer conquistar?':esc(e.nome))+'</h1>'+
  '<div class="fields"><div class="field wide"><label for="m-nome">Nome</label><input id="m-nome" value="'+esc(e.nome||'')+'" placeholder="Ex.: Reserva de emergência"></div>'+
  '<div class="field"><label for="m-alvo">Quanto (R$)</label><input id="m-alvo" inputmode="decimal" value="'+(e.alvo?fmt(e.alvo).replace(/\./g,''):'')+'"></div>'+
  '<div class="field"><label for="m-prazo">Até quando</label><select id="m-prazo"><option value="">Sem prazo</option>'+Array.from({length:60},(_,i)=>ymOf(NOW())+i+1).map(y=>'<option value="'+y+'"'+(e.prazo===y?' selected':'')+'>'+MES3[y%12]+' de '+Math.floor(y/12)+'</option>').join('')+'</select></div></div>'+
  (S.err?'<span class="err">'+esc(S.err)+'</span>':'')+
  '<div class="btns">'+(isNew?'<button class="btn" data-act="metaClose">Cancelar</button>':'<button class="btn" style="'+(S.editSure?'background:var(--warn);border-color:var(--warn);color:var(--ink)':'color:var(--warn)')+'" data-act="metaDel">'+(S.editSure?'Confirmar':'Apagar')+'</button>')+
  '<button class="btn pri" data-act="metaSave">Salvar</button></div></div></div>'}
async function tryAporte(t){const m=t.match(/guardei\s+(?:r\$\s*)?(\d[\d.,]*)\s*(?:reais)?\s*(?:na|no|pra|para|em)\s+(?:a |o |minha |meu )?(.+)/i);if(!m)return null;
  const ms=(S.profile&&S.profile.metas)||[],k=normKey(m[2]),i=ms.findIndex(x=>{const n=normKey(x.nome);return n.includes(k)||k.includes(n)||n.split(' ').some(w=>w.length>3&&k.includes(w))});if(i<0)return null;
  return addAporte(i,num(m[1]))}
async function addAporte(i,v){if(!(v>0))return null;const p=JSON.parse(JSON.stringify(prof())),m=p.metas[i];m.aportes=(m.aportes||[]).concat({ym:ymOf(NOW()),valor:v,ts:Date.now()});
  await saveProfile(p);const f=Math.max(0,m.alvo-metaGuardado(m));return 'Guardado: '+brl(v)+' em '+m.nome+'. '+(f>0?'Faltam '+brl(f)+'.':'Meta concluída!')}
function viewSheet(){
  const g=S.pending;
  let h='<div class="sheet" role="dialog" aria-label="Contar gasto"><div class="wrap"><div class="top"><span class="eyebrow acc">'+(g?'Só mais uma coisa':'Novo gasto')+'</span><button class="close" aria-label="Fechar" data-act="closeSheet">'+XI+'</button></div>';
  if(!g){
    h+='<h1 class="h1">Conta pro <span class="pill-word">Irineu</span> o que você gastou.</h1>'+
    '<label for="addtxt" class="sub">Ex.: "42 no mercado no débito do Santander" ou "tênis de 600 em 4x no Nubank"</label>'+
    '<div class="ask">'+(SR?'<button class="micbtn" id="sheet-mic" data-act="micSheet" aria-label="Falar o gasto">'+MICBIG+'</button>':'')+'<textarea id="addtxt" data-bind="addText" placeholder="Fale ou digite aqui">'+esc(S.addText)+'</textarea></div>'+
    (SR?'<div class="tipline">'+MIC+'<span>Fala o gasto. Quando você para, ele registra sozinho.</span></div>':tipHtml())+
    (S.err?'<span class="err">'+esc(S.err)+'</span>':'')+
    '<button class="btn pri" data-act="quickAdd" '+(S.busy?'disabled':'')+'>'+(S.busy?'Entendendo…':'Registrar')+'</button>';
  }else{
    h+='<div class="card sec"><div class="hero-num" style="align-items:center;gap:10px"><span class="big" style="font-size:clamp(42px,13vw,56px)">'+brl(g.valor_total)+'</span>'+(g.parcelas>1?'<span class="chip-date" style="color:var(--lime)">'+g.parcelas+'x de '+brl(g.valor_total/g.parcelas)+'</span>':'')+'</div>'+
      '<span class="sub">'+esc(g.descricao)+(g.entrada?' · entrada':' · '+esc(g.categoria))+'</span></div>'+
    '<h1 class="h1" style="font-size:clamp(30px,9vw,38px)">'+(g.entrada?'Em qual conta caiu?':g.forma==='pix'||g.forma==='débito'?'De qual conta saiu?':'Em qual cartão?')+'</h1>'+
    '<div class="qr">'+CARDS.map(c=>'<button class="qchip" data-act="pickCard" data-arg="'+esc(c)+'">'+esc(c)+'</button>').join('')+'</div>';
  }
  return h+'</div></div>';
}
function viewGEdit(){
  const g=S.gedit,opt=(arr,v)=>arr.map(o=>'<option'+(o===v?' selected':'')+'>'+esc(o)+'</option>').join('');
  return '<div class="sheet" role="dialog" aria-label="Editar lançamento"><div class="wrap"><div class="top"><span class="eyebrow acc">Editar lançamento</span><button class="close" aria-label="Fechar" data-act="geditClose">'+XI+'</button></div>'+
  '<h1 class="h1">'+(g.id?esc(g.descricao):'Gasto previsto')+'</h1>'+(g.fala?'<p class="said" style="margin:0">"'+esc(g.fala)+'"</p>':'')+
  '<div class="fields">'+
    '<div class="field wide"><label for="f-desc">Descrição</label><input id="f-desc" value="'+esc(g.descricao)+'"></div>'+
    '<div class="field"><label for="f-valor">Valor total (R$)</label><input id="f-valor" inputmode="decimal" value="'+(g.valor_total?fmt(g.valor_total).replace(/\./g,''):'')+'"></div>'+
    '<div class="field"><label for="f-mes">Mês</label><select id="f-mes">'+Array.from({length:13},(_,i)=>ymOf(NOW())+i).concat(g.ym<ymOf(NOW())?[g.ym]:[]).map(y=>'<option value="'+esc(y)+'"'+(y===g.ym?' selected':'')+'>'+esc(MES[y%12])+' de '+esc(Math.floor(y/12))+'</option>').join('')+'</select></div>'+
    '<div class="field"><label for="f-parc">Parcelas</label><select id="f-parc">'+Array.from({length:24},(_,i)=>'<option value="'+(i+1)+'"'+(i+1===g.parcelas?' selected':'')+'>'+(i===0?'À vista':(i+1)+'x')+'</option>').join('')+'</select></div>'+
    '<div class="field"><label for="f-cartao">Cartão ou conta</label><select id="f-cartao">'+opt(CARDS,g.cartao)+'</select></div>'+
    '<div class="field"><label for="f-forma">Forma</label><select id="f-forma">'+opt(FORMAS,g.forma)+'</select></div>'+
    '<div class="field"><label for="f-cat">Categoria</label><select id="f-cat">'+opt(CATS,g.categoria)+'</select></div>'+
    '<div class="field"><label for="f-tipo">Tipo</label><select id="f-tipo"><option value="0"'+(g.entrada?'':' selected')+'>Gasto</option><option value="1"'+(g.entrada?' selected':'')+'>Entrada</option></select></div>'+
  '</div>'+
  '<p class="sub" style="margin:0">Mudou a categoria? Da próxima vez que você falar "'+esc(g.descricao)+'", eu já acerto.</p>'+
  '<div class="btns">'+(g.id?'<button class="btn" style="'+(S.gSure?'background:var(--warn);border-color:var(--warn);color:var(--ink)':'color:var(--warn)')+'" data-act="geditDel">'+(S.gSure?'Confirmar':'Apagar')+'</button>':'<button class="btn" data-act="geditClose">Cancelar</button>')+'<button class="btn pri" data-act="geditSave">Salvar</button></div></div></div>';
}

/* ---------- meses: faixa compartilhada por Início e Contas ---------- */
function offOf(){return S.pv==null?startOff():S.pv}
function monthStrip(sel){let h='<div class="mstrip" role="tablist" aria-label="Escolher o mês">';
  for(let o=0;o<12;o++){const ym=ymOf(NOW())+o,x=monthAt(o),pct=x.entra>0?Math.round(x.comp/x.entra*100):0,c=climaOf(pct,x.entra),y=Math.floor(ym/12);
    h+='<button role="tab" aria-selected="'+(o===sel)+'" class="mchip'+(o===sel?' on':'')+'" data-act="pvSet" data-arg="'+o+'" aria-label="'+MES[ym%12]+' de '+y+', '+c.nome+'"><i style="background:'+c.cor+'"></i><b>'+MES3[ym%12]+'</b><small>'+(o===0?'agora':ym%12===0?String(y):'')+'</small></button>'}
  return h+'</div>'}
function centerStrip(){document.querySelectorAll('.mstrip').forEach(st=>{const on=st.querySelector('.on');if(on)st.scrollLeft=on.offsetLeft-st.clientWidth/2+on.clientWidth/2})}

/* ---------- Contas: o que sai em cada mês, por cartão ---------- */
function contasAt(off){const ym=ymOf(NOW())+off,p=prof(),groups={};
  const G=k=>groups[k]||(groups[k]={key:k,itens:[],tot:0});
  const push=(k,it)=>{const g=G(k);g.itens.push(it);g.tot+=it.valor};
  p.parcelas.forEach((x,i)=>{const r=x.restantes-(ym-x.base);if(r>=1&&!(x.desde&&ym<x.desde))
    push(x.cartao||'Outro',{nome:x.nome,valor:x.valor,meta:r===1?'última parcela':'faltam '+r+' · até '+MES3[(ym+r-1)%12],act:'editOpen',arg:'parcelas:'+i,q:!!x.pendente})});
  S.gastos.forEach(g=>{if(g.entrada)return;
    if(g.parcelas>1){const k=ym-g.ym+1;if(k>=1&&k<=g.parcelas)push(g.cartao||'Outro',{nome:g.descricao,valor:g.valor_total/g.parcelas,meta:'parcela '+k+' de '+g.parcelas,act:'geditOpen',arg:g.id});return}
    if(g.ym!==ym)return;
    const cred=g.forma==='crédito'&&g.cartao!=='Dinheiro';
    push(cred?(g.cartao||'Outro'):'Pix e débito',{nome:g.descricao,valor:g.valor_total,meta:(off>0?'previsto':dayLabel(g.ts))+(cred?'':' · '+g.forma+(g.cartao&&g.cartao!=='Outro'?' · '+g.cartao:'')),act:'geditOpen',arg:g.id})});
  const list=Object.values(groups).sort((a,b)=>(a.key==='Pix e débito')-(b.key==='Pix e débito')||b.tot-a.tot);
  const fixas=p.fixas.map((x,i)=>({...x,i})).filter(x=>ativo(x,ym)),vars=p.variaveis.map((x,i)=>({...x,i})).filter(x=>ativo(x,ym));
  return {ym,list,fixas,vars,F:itemsTotal(fixas),V:itemsTotal(vars),C:list.reduce((a,g)=>a+g.tot,0)}}
function viewContas(){
  const off=offOf(),c=contasAt(off),ym=c.ym,T=c.F+c.V+c.C,w=v=>(T>0?v/T*100:0).toFixed(2)+'%',p=prof();
  const np=[...p.renda,...p.fixas,...p.variaveis,...p.parcelas].filter(x=>x.pendente).length;
  const row=(k,x,meta)=>'<button class="row rowbtn" data-act="editOpen" data-arg="'+k+':'+x.i+'"><span class="txt"><strong>'+esc(x.nome)+'</strong><small>'+esc(x.pendente?'Dúvida: '+x.pendente:meta+(x.fim?' · até '+ymLabel(x.fim):''))+'</small></span>'+
    (x.pendente?'<span class="qb" aria-label="Com dúvida">?</span>':'')+'<span class="val">'+brl(x.valor)+'</span>'+CHEV+'</button>';
  const fat=g=>{const open=S.fatOpen.has(g.key),nome=g.key==='Outro'?'Outros cartões':g.key==='Pix e débito'?'Pix e débito':'Cartão '+g.key;
    return '<div class="fat'+(open?' open':'')+'"><button class="fathead" data-act="fatToggle" data-arg="'+esc(g.key)+'" aria-expanded="'+open+'">'+avatar(g.key==='Pix e débito'?'Dinheiro':g.key)+
      '<span class="txt"><strong>'+esc(nome)+'</strong><small>'+g.itens.length+(g.itens.length>1?' itens':' item')+'</small></span><span class="val">'+brl(g.tot)+'</span><span class="fchev" aria-hidden="true">'+DOWN+'</span></button>'+
      (open?'<div class="fatbody'+(S.fatJust===g.key?' fresh':'')+'">'+g.itens.sort((a,b)=>b.valor-a.valor).map(it=>'<button class="row rowbtn" data-act="'+it.act+'" data-arg="'+esc(it.arg)+'"><span class="txt"><strong>'+esc(it.nome)+'</strong><small>'+esc(it.meta)+'</small></span>'+(it.q?'<span class="qb">?</span>':'')+'<span class="val">'+brl(it.valor)+'</span>'+CHEV+'</button>').join('')+'</div>':'')+'</div>'};
  return '<div class="wrap"><h1 class="h1">Contas de<br>'+MES[ym%12]+'</h1>'+monthStrip(off)+
  '<section class="violet-panel" style="gap:10px"><span style="font-size:13px;font-weight:700">Sai em '+MES[ym%12]+'</span><span class="big" style="font-size:clamp(46px,14vw,60px)">'+brl(T)+'</span>'+
    '<div class="bar" style="height:22px;background:rgba(255,255,255,.16)">'+(c.F>0?'<span style="width:'+w(c.F)+';background:#fff"></span>':'')+(c.V>0?'<span style="width:'+w(c.V)+';background:rgba(255,255,255,.5)"></span>':'')+(c.C>0?'<span style="width:'+w(c.C)+';background:repeating-linear-gradient(-45deg,var(--lime) 0 7px,#BFDB45 7px 13px)"></span>':'')+'</div>'+
    '<div class="legend" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div><small><i style="background:#fff"></i>Fixas</small><strong>'+brl(c.F)+'</strong></div><div><small><i style="background:rgba(255,255,255,.5)"></i>Variáveis</small><strong>'+brl(c.V)+'</strong></div><div><small><i style="background:var(--lime)"></i>Cartões e Pix</small><strong>'+brl(c.C)+'</strong></div></div></section>'+
  (np?'<div class="qnote"><b>'+np+(np>1?' itens com dúvida':' item com dúvida')+'.</b> Toca no que tem <span class="qb">?</span> pra resolver.</div>':'')+
  '<section class="sec" style="gap:10px"><div class="sec-h"><h2>Cartões e Pix</h2><span style="display:flex;gap:6px"><button class="pilllink" data-act="editNew" data-arg="parcelas">+ parcela</button><button class="pilllink" data-act="geditNew">+ gasto</button></span></div>'+
    (c.list.length?c.list.map(fat).join(''):'<p class="empty">Nada nos cartões em '+MES[ym%12]+'.</p>')+'</section>'+
  '<section class="sec" style="gap:4px"><div class="sec-h"><h2>Fixas · '+brl(c.F)+'</h2><button class="pilllink" data-act="editNew" data-arg="fixas">+ adicionar</button></div><div class="list">'+
    (c.fixas.length?c.fixas.map(x=>row('fixas',x,x.dia?'todo dia '+x.dia:'mesmo valor todo mês')).join(''):'<p class="empty">Aluguel, internet, academia… o que tem o mesmo valor todo mês.</p>')+'</div></section>'+
  '<section class="sec" style="gap:4px"><div class="sec-h"><h2>Variáveis · '+brl(c.V)+'</h2><button class="pilllink" data-act="editNew" data-arg="variaveis">+ adicionar</button></div><div class="list">'+
    (c.vars.length?c.vars.map(x=>row('variaveis',x,'valor do mês · toque pra atualizar')).join(''):'<p class="empty">Obra, luz, água… o que vem todo mês com valor diferente.</p>')+'</div></section></div>';
}

/* ---------- Metas: dá vontade de guardar ---------- */
const MARCOS=[500,1000,2500,5000,10000,25000,50000,100000,250000,500000];
const DESEJOS0=[{nome:'Fim de semana na praia',valor:1500},{nome:'Notebook novo',valor:5000},{nome:'Viagem pra fora',valor:12000}];
function totalGuardado(){return ((S.profile&&S.profile.metas)||[]).reduce((a,m)=>a+metaGuardado(m),0)}
function custoMensal(){/* o mês mais pesado entre os próximos 3: conta conservadora de quanto custa o seu mês */
  let c=0;for(let o=0;o<3;o++){const x=monthAt(o);c=Math.max(c,x.comp-guardadoNo(x.ym))}return c}
function kBRL(v){return v>=1000?'R$ '+(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil':brl(v)}
function mesesTxt(m){if(m<1){const d=Math.round(m*30);return d+(d===1?' dia':' dias')}const r=Math.round(m*10)/10;return r.toLocaleString('pt-BR')+(r<2?' mês':' meses')}
function comparativo(tot,custo){
  const fonte='<span class="fonte">Fonte: Raio X do Investidor Brasileiro, Anbima, 9ª edição (abril de 2026).</span>';
  if(custo<=0)return '';
  const m=tot/custo;let big,of,txt;
  if(tot<=0){big='31%';of='dos brasileiros';txt='não têm nenhum dinheiro guardado. O primeiro real que você guardar já te tira desse grupo.'}
  else if(m<1){big=String(Math.round(m*30));of=Math.round(m*30)===1?'dia de contas coberto':'dias de contas cobertos';txt='Você já saiu dos <b>31% que não têm reserva nenhuma</b>. Juntando mais <b>'+brl(custo-tot)+'</b>, sua reserva cobre 1 mês e você passa da metade dos brasileiros.'}
  else if(m<=6){big=(Math.round(m*10)/10).toLocaleString('pt-BR');of=m<2?'mês de contas coberto':'meses de contas cobertos';txt='Você está à frente de <b>mais da metade dos brasileiros</b>: 51% não têm reserva ou ela dura no máximo 1 mês. Com mais <b>'+brl(custo*6-tot)+'</b>, você entra nos 26% que aguentam mais de 6 meses.'}
  else{big=(Math.round(m*10)/10).toLocaleString('pt-BR');of='meses de contas cobertos';txt='Só <b>26% dos brasileiros</b> aguentam mais de 6 meses sem renda. Você está nesse grupo.'}
  return '<section class="lime-card"><div class="top"><span class="chip-date">Você e o Brasil</span></div><div class="ratio"><span class="big">'+big+'</span><span class="of">'+of+'</span></div>'+
    '<p class="sub" style="margin:0">'+txt+'</p>'+fonte+'</section>'}
function ring(pct,label){const r=46,C=2*Math.PI*r,off=C*(1-Math.max(0,Math.min(1,pct)));
  return '<svg class="ring2" viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="'+r+'" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="12"/>'+
    '<circle class="arc" cx="56" cy="56" r="'+r+'" fill="none" stroke="var(--lime)" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" style="--c:'+C.toFixed(1)+'" transform="rotate(-90 56 56)"/>'+
    '<text x="56" y="62" text-anchor="middle" font-family="Bricolage Grotesque,sans-serif" font-size="22" fill="#fff">'+label+'</text></svg>'}
function viewMetasPage(){
  const p=prof(),tot=totalGuardado(),custo=custoMensal(),nx=MARCOS.find(x=>x>tot)||tot,pv=[0,...MARCOS].filter(x=>x<=tot).pop()||0;
  const pct=nx>pv?(tot-pv)/(nx-pv):1,des=(p.desejos||DESEJOS0).slice().sort((a,b)=>a.valor-b.valor);
  const prox=MARCOS.filter(x=>x>tot).slice(0,2);
  const frase=v=>{const parts=[];if(custo>0)parts.push('cobre <b>'+mesesTxt(v/custo)+'</b> das suas contas');const d=des.filter(x=>x.valor<=v).pop();if(d)parts.push('dá pra '+esc(d.nome.charAt(0).toLowerCase()+d.nome.slice(1)));return parts.join(' e ')};
  return '<div class="wrap"><h1 class="h1">Metas</h1>'+
  '<section class="violet-panel cofre"><div class="cofre-top"><div style="display:flex;flex-direction:column;gap:6px;min-width:0"><span style="font-size:13px;font-weight:700">Você já guardou</span>'+
    '<span class="big" style="font-size:clamp(34px,10vw,46px);white-space:nowrap">'+brl(tot)+'</span>'+
    '<span class="sub">'+(tot>=MARCOS[MARCOS.length-1]?'Todos os marcos batidos.':'Faltam <b style="color:#fff">'+brl(nx-tot)+'</b> pro marco de '+kBRL(nx)+'.')+'</span></div>'+ring(pct,Math.round(pct*100)+'%')+'</div>'+
    '<button class="btn pri" data-act="'+(p.metas&&p.metas.length?'goGuardar':'metaNew')+'">'+(p.metas&&p.metas.length?'Guardei dinheiro':'Criar minha primeira meta')+'</button></section>'+
  comparativo(tot,custo)+
  (prox.length?'<section class="sec" style="gap:10px"><div class="sec-h"><h2>Se você juntar…</h2></div>'+prox.map(v=>'<div class="nextm"><b>'+kBRL(v)+'</b><span>'+frase(v)+'.</span><small>faltam '+brl(v-tot)+'</small></div>').join('')+'</section>':'')+
  viewMetas()+
  '<section class="sec" style="gap:10px"><div class="sec-h"><h2>Seus desejos</h2></div>'+
    des.map(d=>{const ok=tot>=d.valor,i=(p.desejos||DESEJOS0).indexOf(d);return '<div class="wish'+(ok?' ok':'')+'"><div class="sec-h"><strong>'+esc(d.nome)+'</strong><span style="display:flex;gap:8px;align-items:center"><b>'+kBRL(d.valor)+'</b><button class="x" aria-label="Tirar '+esc(d.nome)+'" data-act="wishDel" data-arg="'+(p.desejos?i:'d'+i)+'">'+XI+'</button></span></div>'+
      '<div class="mbar"><span style="width:'+Math.min(100,d.valor>0?tot/d.valor*100:0).toFixed(1)+'%"></span></div><small>'+(ok?'Seu guardado já cobre. Só não esvazia a reserva!':'faltam '+brl(d.valor-tot))+'</small></div>'}).join('')+
    (p.desejos?'':'<p class="sub" style="margin:0;font-size:12px">Valores de exemplo, aproximados. Troca pelos seus.</p>')+
    '<div class="ask"><input id="w-nome" placeholder="Um desejo (ex.: Moto)" aria-label="Nome do desejo"><input id="w-val" inputmode="decimal" placeholder="R$" aria-label="Quanto custa" style="flex:0 0 96px"><button class="btn" data-act="wishAdd">+</button></div></section>'+
  '<section class="sec" style="gap:10px"><div class="sec-h"><h2>Conquistas</h2><span class="sub">'+MARCOS.filter(x=>x<=tot).length+' de '+MARCOS.length+'</span></div><div class="badges">'+
    MARCOS.map(x=>'<span class="bdg'+(tot>=x?' on':'')+'">'+(tot>=x?CHK:'')+kBRL(x)+'</span>').join('')+'</div></section></div>'}

/* ---------- Ajustes ---------- */
function viewConfig(){
  const p=prof();
  const rows=p.renda.length?p.renda.map((x,i)=>'<button class="row rowbtn" data-act="editOpen" data-arg="renda:'+i+'"><span class="txt"><strong>'+esc(x.nome)+'</strong><small>'+esc(x.pendente?'Dúvida: '+x.pendente:x.dia?'todo dia '+x.dia:'mensal')+'</small></span>'+(x.pendente?'<span class="qb">?</span>':'')+'<span class="val">'+brl(x.valor)+'</span>'+CHEV+'</button>').join(''):'<p class="empty">Nada informado.</p>';
  return '<div class="wrap"><h1 class="h1">Ajustes</h1>'+
    '<section class="sec" style="gap:8px"><div class="sec-h"><h2>Jeito do Irineu</h2></div><div class="tons" role="radiogroup" aria-label="Jeito do Irineu">'+
      Object.keys(TONS).map(k=>'<button role="radio" aria-checked="'+(tom()===k)+'" class="'+(tom()===k?'on':'')+'" data-act="setTom" data-arg="'+k+'">'+TONS[k].nome+'</button>').join('')+'</div></section>'+
    '<section class="sec" style="gap:4px"><div class="sec-h"><h2>Renda · '+brl(itemsTotal(p.renda))+'</h2><button class="pilllink" data-act="editNew" data-arg="renda">+ adicionar</button></div><div class="list">'+rows+'</div></section>'+
    '<section class="sec" style="gap:8px"><div class="sec-h"><h2>Cartões</h2></div><div class="qr">'+userCards().map(c=>'<button class="qchip ghost" data-act="cardDel" data-arg="'+esc(c)+'" aria-label="Remover '+esc(c)+'">'+esc(c)+(S.cardSure===c?' · remover?':' ×')+'</button>').join('')+'</div>'+
    '<div class="ask"><input id="card-new" placeholder="Novo cartão (ex.: Inter)" aria-label="Nome do novo cartão"><button class="btn" data-act="cardAdd">Adicionar</button></div></section>'+
    '<section class="sec" style="gap:8px"><div class="sec-h"><h2>Inteligência</h2><span class="sub">'+(SAMPLE?'ligada':'desligada')+'</span></div>'+
    '<p class="sub" style="margin:0">'+(getKey()?'Sua chave da API está salva só neste celular. Ela só é usada quando a leitura simples não entende o áudio.':'Sem chave, o Irineu usa a leitura simples, que já entende a maioria dos gastos. Com a chave da API do Claude, ele entende frases mais soltas.')+'</p>'+
    '<button class="btn" data-act="setupOpen">'+(getKey()?'Trocar ou testar a chave':'Colar minha chave')+'</button></section>'+
    viewTrava()+
    '<section class="sec" style="gap:8px"><div class="sec-h"><h2>Seus dados</h2></div><p class="sub" style="margin:0">Tudo fica só neste celular. Baixa um backup com senha de vez em quando.</p>'+
    (S.bk?viewBackup():'<div class="btns"><button class="btn" data-act="bkOpen">Baixar backup</button><button class="btn" data-act="setupOpen" data-arg="import">Importar</button></div>')+
    '<div class="tip">'+ARW+'<span><b style="color:var(--fg)">Levar pra outro celular:</b> toque em Baixar backup aqui, mande o arquivo pra você mesmo e, no celular novo, abra o Irineu e use Importar com a mesma senha.</span></div></section>'+
    '<section class="sec" style="gap:4px"><button class="btn" data-act="redoOb">Refazer introdução</button><span class="sub" style="padding-top:6px">Passa de novo pelos 3 passos, já com o que você tem, pra revisar tudo.</span></section>'+
    '<section class="sec" style="gap:4px"><button class="link" style="color:var(--warn)" data-act="wipe">'+(S.confirmWipe?'Toque de novo para apagar tudo':'Apagar todos os dados')+'</button></section>'+
    '<p class="sub" style="margin:0;font-size:11px;opacity:.6;text-align:center">Irineu · versão '+VERSAO+'</p></div>'}
function obEnter(){const st=STEPS[S.ob-1];if(!st){S.obItems=null;return}const l=S.draft[st.key]||[];
  if(l.length){S.obItems=JSON.parse(JSON.stringify(l));S.obSaid='(o que você já tinha)'}else S.obItems=null}
const NAV=[['home','Início','<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>','tab'],['parc','Contas','<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>','tab'],null,
  ['metas','Metas','<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>','tab'],['ajustes','Ajustes','<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>','tab']];
function navHtml(){
  return '<nav class="nav" aria-label="Navegação"><div class="nav-in">'+NAV.map(n=>n?'<button class="'+(S.tab===n[0]?'on':'')+'" data-act="'+n[3]+'" data-arg="'+n[0]+'"'+(S.tab===n[0]?' aria-current="page"':'')+'><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+n[2]+'</svg>'+n[1]+'</button>'
    :'<button class="mic" aria-label="Contar um gasto" data-act="openSheet">'+MICBIG+'</button>').join('')+'</div></nav>';
}
function render(){
  if(!S.ready)return;
  clearInterval(render.lt);
  if(S.locked){$('#toast').hidden=true;$('#app').innerHTML=viewLock();MK={};
    if(pinWait())render.lt=setInterval(()=>{const w=pinWait(),b=$('[data-act="unlock"]');if(!S.locked||!w){clearInterval(render.lt);if(S.locked)render();return}if(b)b.textContent='Espera '+Math.ceil(w/1000)+' s'},1000);
    return}
  if(S.mode==='call')S.mode='app';
  let h;
  if(S.err&&!S.profile&&S.mode!=='ob')h='<div class="wrap"><span class="mark">irineu<i>.</i></span><p class="err">'+esc(S.err)+'</p></div>';
  else if(S.mode==='ob')h=viewOb()+(S.setup?viewSetup():'');
  else h=({home:viewHome,parc:viewContas,metas:viewMetasPage,ajustes:viewConfig}[S.tab]||viewHome)()+navHtml()+(S.sheet?viewSheet():'')+(S.gedit?viewGEdit():'')+(S.edit?viewEdit():'')+(S.medit?viewMetaEdit():'')+(S.setup?viewSetup():'');
  $('#app').innerHTML=h;
  centerStrip();
  motion();
}
function focusNow(sel){const go=()=>{const el=$(sel);if(el&&document.activeElement!==el){el.focus();try{const n=el.value.length;el.setSelectionRange(n,n)}catch(e){}}};go();setTimeout(go,80)}
function readEdit(){const g=id=>{const el=$('#'+id);return el?el.value:null},d=S.edit.d;
  d.nome=g('e-nome')??d.nome;const v=g('e-valor');if(v!=null)d.valor=num(v);
  const di=g('e-dia');if(di!=null)d.dia=Math.min(31,Math.max(0,parseInt(di)||0))||null;
  const r=g('e-rest');if(r!=null)d.rest=parseInt(r)||1;const fm=g('e-fim');if(fm!=null)d.fim=fm?+fm:null;const c=g('e-cartao');if(c!=null)d.cartao=c}

/* ---------- movimento ---------- */
const VERSAO='6 · 19 out';
const RM=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
let MK={},CLOSING=false;
function sheetKey(){return S.setup?'setup':S.medit?'meta':S.edit?'edit':S.gedit?'gedit':S.sheet?'sheet':''}
function countUp(el){
  const t=el.textContent,i=t.search(/\d/);if(i<0)return;
  const pre=t.slice(0,i),cents=/,\d\d$/.test(t),v=parseFloat(t.slice(i).replace(/\./g,'').replace(',','.'));
  if(!(v>=1))return;
  const f=x=>pre+(cents?x.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):Math.round(x).toLocaleString('pt-BR'));
  const t0=performance.now(),D=650;
  const step=n=>{if(!el.isConnected)return;const k=Math.min(1,(n-t0)/D),e=1-Math.pow(1-k,3);
    if(k<1){el.textContent=f(v*e);requestAnimationFrame(step)}else el.textContent=t};
  el.textContent=f(0);requestAnimationFrame(step)}
function motion(){
  const app=$('#app'),first=app.firstElementChild,view=S.mode+':'+(S.mode==='ob'?S.ob:S.tab),sk=sheetKey();
  if(!RM.matches&&first){
    if(view!==MK.view){
      first.classList.add('v-in','grow');
      first.querySelectorAll('.ttube span').forEach((x,i)=>x.style.animationDelay=(.12+i*.05)+'s');
      first.querySelectorAll('.big').forEach(countUp);
    }else if(S.mode==='app'&&(S.tab==='home'||S.tab==='parc')&&S.pv!==MK.pv){
      const a=S.pv==null?0:S.pv,b=MK.pv==null?0:MK.pv,dx=(a>=b?28:-28)+'px';
      first.querySelectorAll('.h1,.lime-card,.wrap>.bubble,.card,.violet-panel,.fat').forEach((x,i)=>{x.style.setProperty('--dx',dx);x.style.animationDelay=(i*.04)+'s';x.classList.add('sx')});
      first.querySelectorAll('.big').forEach(countUp);
    }
    if(sk&&sk!==MK.sheet){
      const sh=app.querySelectorAll('.sheet'),last=sh[sh.length-1];
      if(last){last.classList.add('in');const sc=document.createElement('div');sc.className='scrim';last.before(sc);
        last.addEventListener('animationend',()=>{last.classList.remove('in');sc.remove()},{once:true})}
    }
  }
  MK={view,pv:S.pv,sheet:sk};
}
const CLOSERS=new Set(['closeSheet','editClose','metaClose','geditClose','setupClose']);
const LOCK_ACTS=new Set(['unlock','lockForgot','lockForgotBack','lockWipe']);
function animClose(run){
  const sh=document.querySelectorAll('#app .sheet'),last=sh[sh.length-1];
  if(RM.matches||!last||CLOSING)return run();
  CLOSING=true;const sc=document.createElement('div');sc.className='scrim out';last.before(sc);last.classList.add('out');
  let done=false;const fin=()=>{if(done)return;done=true;CLOSING=false;sc.remove();run()};
  last.addEventListener('animationend',fin,{once:true});setTimeout(fin,320)}

/* ---------- importação: números viram números, ids estranhos são trocados ---------- */
const NUMF=new Set(['valor','valor_total','parcelas','restantes','base','dia','desde','fim','ts','ym','alvo','prazo','criado']);
function limpaDados(j){
  const walk=v=>{if(Array.isArray(v))return v.map(walk);
    if(v&&typeof v==='object'){const o={};for(const [k,x] of Object.entries(v)){if(k==='__proto__'||k==='constructor'||k==='prototype')continue;
      o[k]=NUMF.has(k)&&x!=null&&typeof x!=='object'?(typeof x==='string'?num(x):Number.isFinite(+x)?+x:null):walk(x)}return o}
    return v};
  const out=walk(j);
  if(!out.profile||typeof out.profile!=='object'||Array.isArray(out.profile))out.profile=null;
  out.gastos=(Array.isArray(out.gastos)?out.gastos:[]).filter(g=>g&&typeof g==='object').map((g,i)=>({...g,id:/^[A-Za-z0-9_-]{1,40}$/.test(String(g.id||''))?String(g.id):'i'+Date.now().toString(36)+i}));
  return out}

/* ---------- backup com senha: AES-GCM com chave tirada da senha (PBKDF2) ---------- */
const KDF_IT=600000;
function b64(buf){const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
function unb64(s){const b=atob(String(s||'')),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
async function chaveDe(senha,salt,it){const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(senha),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function fecharBackup(obj,senha){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const k=await chaveDe(senha,salt,KDF_IT),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify(obj)));
  return {irineu:'backup-cifrado',v:2,cifra:'AES-256-GCM',kdf:'PBKDF2-SHA256',it:KDF_IT,salt:b64(salt),iv:b64(iv),dados:b64(ct)}}
async function abrirBackup(j,senha){const it=Math.min(5000000,Math.max(1,j.it|0));
  const k=await chaveDe(senha,unb64(j.salt),it),pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(j.iv)},k,unb64(j.dados));
  return JSON.parse(new TextDecoder().decode(pt))}
function viewBackup(){
  return '<div class="fields"><div class="field wide"><label for="bk-p1">Senha do backup</label><input id="bk-p1" type="password" autocomplete="new-password"></div>'+
    '<div class="field wide"><label for="bk-p2">Repete a senha</label><input id="bk-p2" type="password" autocomplete="new-password"></div></div>'+
    '<p class="sub" style="margin:0">Pelo menos 8 caracteres. Sem essa senha ninguém abre o arquivo, nem você. Guarda num lugar seguro.</p>'+
    (S.bkMsg?'<span class="err">'+esc(S.bkMsg)+'</span>':'')+
    '<div class="btns"><button class="btn" data-act="bkCancel">Cancelar</button><button class="btn pri" data-act="exportFile" '+(S.busy?'disabled':'')+'>'+(S.busy?'Cifrando…':'Baixar com senha')+'</button></div>'}

/* ---------- trava com PIN ao abrir ---------- */
/* É uma porta na frente do app, não uma cifra: os dados continuam no armazenamento do navegador. */
const PIN_IT=150000,RELOCK_MS=120000;
function pinInfo(){try{const j=JSON.parse(localStorage.getItem('irineu_pin')||'null');return j&&j.salt&&j.hash?j:null}catch(e){return null}}
async function pinHash(pin,salt,it){const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
  return b64(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},base,256))}
async function pinSet(pin){const salt=crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem('irineu_pin',JSON.stringify({salt:b64(salt),it:PIN_IT,hash:await pinHash(pin,salt,PIN_IT)}))}
async function pinOk(pin){const p=pinInfo();if(!p)return true;return (await pinHash(pin,unb64(p.salt),(p.it|0)||PIN_IT))===p.hash}
function pinWait(){try{return Math.max(0,(+localStorage.getItem('irineu_pin_ate')||0)-Date.now())}catch(e){return 0}}
function viewLock(){const w=pinWait();
  return '<div class="wrap lock"><span class="mark">irineu<i>.</i></span>'+
    '<div class="sec" style="gap:10px"><h1 class="h1">Digita seu PIN.</h1><p class="sub" style="margin:0">O Irineu fica trancado pra ninguém ver suas contas.</p></div>'+
    (S.lockForgot
      ?'<div class="qnote">Sem o PIN, a única saída é apagar os dados deste celular e trazer tudo de volta pelo backup com senha.</div>'+
        '<div class="btns"><button class="btn" data-act="lockForgotBack">Voltar</button><button class="btn" style="'+(S.confirmWipe?'background:var(--warn);border-color:var(--warn);color:var(--ink)':'color:var(--warn)')+'" data-act="lockWipe">'+(S.confirmWipe?'Confirmar: apagar':'Apagar dados')+'</button></div>'
      :'<div class="field wide"><label for="pin-in">PIN</label><input id="pin-in" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div>'+
        (S.lockMsg?'<span class="err">'+esc(S.lockMsg)+'</span>':'')+
        '<button class="btn pri" data-act="unlock" '+(S.busy||w?'disabled':'')+'>'+(w?'Espera '+Math.ceil(w/1000)+' s':S.busy?'Conferindo…':'Entrar')+'</button>'+
        '<button class="link" style="text-align:center" data-act="lockForgot">Esqueci o PIN</button>')+'</div>'}
function viewTrava(){const on=!!pinInfo();
  return '<section class="sec" style="gap:8px"><div class="sec-h"><h2>Trava ao abrir</h2><span class="sub">'+(on?'ligada':'desligada')+'</span></div>'+
    '<p class="sub" style="margin:0">'+(on?'O Irineu pede o PIN quando abre e quando você volta depois de 2 minutos fora dele.':'Com a trava, o Irineu pede um PIN de 4 a 8 números quando abre. Se esquecer o PIN, a única saída é apagar os dados deste celular, então baixa um backup com senha antes.')+'</p>'+
    '<div class="fields">'+(on?'<div class="field wide"><label for="pin-cur">PIN atual</label><input id="pin-cur" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div>'
      :'<div class="field"><label for="pin-n1">Novo PIN</label><input id="pin-n1" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div>'+
       '<div class="field"><label for="pin-n2">Repete o PIN</label><input id="pin-n2" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div>')+'</div>'+
    (S.pinMsg?'<span class="sub">'+esc(S.pinMsg)+'</span>':'')+
    '<button class="btn'+(on?'':' pri')+'" data-act="'+(on?'pinOff':'pinOn')+'" '+(S.busy?'disabled':'')+'>'+(on?'Desligar trava':'Ligar trava')+'</button></section>'}

/* ---------- ações ---------- */
const A={
  obStart(){S.ob=1;obEnter();S.obText='';S.err='';render();focusNow('#obtxt')},
  async obParse(){const t=S.obText.trim();if(!t){S.err='Fala ou escreve antes de tocar em Entender.';return render()}
    S.busy=true;S.err='';render();const st=STEPS[S.ob-1];S.obItems=await parseList(st.key,t);S.obSaid=t;S.busy=false;render()},
  obSkip(){S.draft[STEPS[S.ob-1].key]=[];S.ob++;obEnter();S.obText='';render();focusNow('#obtxt')},
  obBack(){S.ob--;obEnter();S.obText='';render()},
  obRm(i){S.obItems.splice(+i,1);render()},
  obTom(k){S.obTom=k;render()},
  obRedo(){S.obItems=null;S.obText=S.obSaid.startsWith('(')?'':S.obSaid;render();focusNow('#obtxt')},
  obOk(){S.draft[STEPS[S.ob-1].key]=S.obItems;S.ob++;obEnter();S.obText='';render();focusNow('#obtxt')},
  async obFinish(){S.busy=true;render();const base=ymOf(NOW()),d=S.draft;
    const p={...(S.profile||{}),onboarded:true,criado:(S.profile&&S.profile.criado)||Date.now(),tom:S.obTom,renda:d.renda||[],fixas:d.fixas||[],
      variaveis:(S.profile&&S.profile.variaveis)||[],parcelas:(d.parcelas||[]).map(x=>({...x,base:x.base??base}))};
    try{await saveProfile(p);
      S.redo=false;S.mode='app';S.tab='home';toast('Pronto. Agora é só me contar os gastos.')}catch(e){toast('Não consegui salvar. Tente de novo.')}
    S.busy=false;render();window.scrollTo(0,0)},
  tab(t){S.tab=t;S.confirmWipe=false;render();window.scrollTo(0,0)},
  openSheet(){S.sheet=true;S.pending=null;S.addText='';S.err='';render();if(SR)micStart('sheet');else focusNow('#addtxt')},
  closeSheet(){micStop();S.sheet=false;S.pending=null;render()},
  async quickAdd(){micStop();const ta=$('#addtxt'),t=((ta&&ta.value)||S.addText||'').trim();if(!t){S.err='Fala ou escreve o gasto antes.';return render()}
    const ap=await tryAporte(t);if(ap){S.sheet=false;S.addText='';toast(ap);return render()}
    S.addText=t;S.busy=true;S.err='';render();
    let g=null;try{g=await quickParse(t)}catch(e){g=null}S.busy=false;
    if(!g){S.err='Não achei o valor. Tenta algo como "42 no mercado no débito do Santander".';return render()}
    if(g.cartao==='Outro'&&g.forma!=='dinheiro'){S.pending=g;return render()}
    try{await registrar(g,t);S.sheet=false;S.pending=null;S.tab='home'}catch(e){S.err='Não consegui salvar. Tenta de novo.'}
    render()},
  async pickCard(c){const g=S.pending;if(!g)return;g.cartao=c;if(c==='Dinheiro')g.forma='dinheiro';
    try{await registrar(g,S.addText);S.sheet=false;S.pending=null;S.tab='home'}catch(e){toast('Não consegui salvar agora.')}render()},
  geditOpen(id){const g=S.gastos.find(x=>x.id===id);if(!g)return;S.gedit={...g};S.gSure=false;render()},
  geditClose(){S.gedit=null;S.gSure=false;render()},
  async geditSave(){const g=S.gedit;if(!g)return;const v=num($('#f-valor').value);if(!(v>0)){toast('Confere o valor antes de salvar.');return}
    if(!$('#f-desc').value.trim()){toast('Dá um nome pro gasto.');return}
    const ymSel=+(($('#f-mes')||{}).value||g.ym),tsSel=ymSel===g.ym?g.ts:(ymSel===ymOf(NOW())?Date.now():new Date(Math.floor(ymSel/12),ymSel%12,1,12).getTime());
    const rec={descricao:($('#f-desc').value.trim()||'Gasto').slice(0,40),valor_total:v,parcelas:+$('#f-parc').value,cartao:$('#f-cartao').value,forma:$('#f-forma').value,
      categoria:$('#f-cat').value,entrada:$('#f-tipo').value==='1',fala:g.fala||'',ts:tsSel,ym:ymSel};
    if(rec.entrada)rec.parcelas=1;
    try{if(g.id)await updateGasto(g.id,rec);else await addGasto(rec);
      if(!rec.entrada&&rec.categoria!==g.categoria){const p=prof();p.cats={...(p.cats||{}),[normKey(rec.descricao)]:rec.categoria};await saveProfile(p)}
      S.gedit=null;toast('Lançamento salvo.')}catch(e){toast('Não consegui salvar agora.')}render()},
  async geditDel(){const g=S.gedit;if(!g)return;if(!S.gSure){S.gSure=true;return render()}
    try{await delGasto(g.id);S.gedit=null;S.gSure=false;toast('Lançamento apagado.')}catch(e){toast('Não consegui apagar agora.')}render()},
  geditNew(){const o=offOf(),y=ymOf(NOW())+(o>0?o:0);S.gSure=false;S.gedit={id:null,descricao:'',valor_total:0,parcelas:1,cartao:'Outro',forma:'pix',categoria:'Outros',entrada:false,fala:'',ym:y,ts:new Date(Math.floor(y/12),y%12,1,12).getTime()};render();focusNow('#f-desc')},
  metaNew(){S.err='';S.editSure=false;S.medit={i:-1,nome:'',alvo:0,prazo:null};render();focusNow('#m-nome')},
  metaEdit(i){const m=((S.profile&&S.profile.metas)||[])[+i];if(!m)return;S.err='';S.editSure=false;S.medit={i:+i,nome:m.nome,alvo:m.alvo,prazo:m.prazo||null};render()},
  metaClose(){S.medit=null;S.err='';render()},
  async metaSave(){const nome=($('#m-nome').value||'').trim(),alvo=num($('#m-alvo').value),pz=$('#m-prazo').value;
    if(!nome){S.err='Dá um nome pra meta.';return render()}if(!(alvo>0)){S.err='Confere o valor da meta.';return render()}
    const p=JSON.parse(JSON.stringify(prof()));p.metas=p.metas||[];const e=S.medit;
    if(e.i<0)p.metas.push({id:'m'+Date.now(),nome:nome.slice(0,40),alvo,prazo:pz?+pz:null,aportes:[]});else Object.assign(p.metas[e.i],{nome:nome.slice(0,40),alvo,prazo:pz?+pz:null});
    try{await saveProfile(p);S.medit=null;S.err='';toast('Meta salva.')}catch(x){S.err='Não consegui salvar agora.'}render()},
  async metaDel(){if(!S.editSure){S.editSure=true;return render()}const p=JSON.parse(JSON.stringify(prof()));p.metas.splice(S.medit.i,1);
    try{await saveProfile(p);S.medit=null;S.editSure=false;toast('Meta apagada.')}catch(x){toast('Não consegui apagar agora.')}render()},
  async metaAporte(i){const el=$('#ap-'+i),v=num((el&&el.value)||'');if(!(v>0)){toast('Digita quanto você guardou.');return}
    try{toast(await addAporte(+i,v))}catch(x){toast('Não consegui salvar agora.')}render()},
  async cardAdd(){const el=$('#card-new'),n=((el&&el.value)||'').trim().slice(0,20);if(!n)return;
    if(userCards().some(c=>normKey(c)===normKey(n))){toast('Esse cartão já existe.');return}
    const p=JSON.parse(JSON.stringify(prof()));p.cartoes=[...userCards(),n];await saveProfile(p);toast('Cartão '+n+' adicionado.');render()},
  async cardDel(c){if(S.cardSure!==c){S.cardSure=c;return render()}S.cardSure=null;
    const p=JSON.parse(JSON.stringify(prof()));p.cartoes=userCards().filter(x=>x!==c);await saveProfile(p);toast('Cartão '+c+' removido. Os lançamentos dele continuam.');render()},
  editNew(k){S.err='';S.editSure=false;S.edit={src:'prof',k,i:-1,d:{key:k,nome:'',valor:0,dia:null,rest:1,cartao:userCards()[0]||'Outro',pendente:'',fim:null}};render();focusNow('#e-nome')},
  editOpen(arg){const pr=arg.split(':'),src=pr[0]==='call'?'call':'prof',k=src==='call'?pr[1]:pr[0],i=+(src==='call'?pr[2]:pr[1]);
    const x=(src==='call'?callLists():prof())[k][i];if(!x)return;S.err='';S.editSure=false;
    S.edit={src,k,i,d:{key:k,nome:x.nome,valor:x.valor,dia:x.dia||null,rest:k==='parcelas'?(x.desde&&x.desde>ymOf(NOW())?x.restantes:Math.max(1,restOf(x))):1,cartao:x.cartao||'Outro',pendente:x.pendente||'',fim:x.fim||null}};render()},
  editClose(){S.edit=null;S.editSure=false;S.err='';render()},
  async editSave(){readEdit();const e=S.edit,d=e.d;
    if(!d.nome.trim()){S.err='Dá um nome pro item.';return render()}
    if(!(d.valor>0)){S.err='Confere o valor.';return render()}
    const base=e.src==='call'?callLists():prof(),p=JSON.parse(JSON.stringify(base)),old=e.i>=0?base[e.k][e.i]:null;
    const it={nome:d.nome.trim().slice(0,40),valor:d.valor};
    if(d.key==='parcelas'){it.restantes=Math.max(1,d.rest|0);it.base=ymOf(NOW());it.cartao=d.cartao}else{it.dia=d.dia||null;if(d.fim)it.fim=d.fim}
    {const od=e.i>=0?base[e.k][e.i]:null;if(od&&od.desde&&od.desde>ymOf(NOW())){it.desde=od.desde;if(d.key==='parcelas')it.base=od.desde}}
    if(e.i>=0&&d.key===e.k)p[e.k][e.i]=it;else{if(e.i>=0)p[e.k].splice(e.i,1);p[d.key].push(it)}
    try{if(e.src==='call')await setCallLists(p);else await saveProfile(p);
      if(S.call&&old){const a=normKey(old.nome),b=normKey(it.nome);S.call.duvidas=(S.call.duvidas||[]).filter(q=>{const n=normKey(q.item);return n!==a&&n!==b});await saveCall()}
      S.edit=null;S.lastUndo=null;S.err='';toast(it.nome+' salvo.')}catch(x){S.err='Não consegui salvar agora.'}render()},
  async editDel(){const e=S.edit;if(!S.editSure){S.editSure=true;return render()}
    const base=e.src==='call'?callLists():prof(),p=JSON.parse(JSON.stringify(base)),nome=p[e.k][e.i].nome;p[e.k].splice(e.i,1);
    try{if(e.src==='call')await setCallLists(p);else await saveProfile(p);
      if(S.call){const a=normKey(nome);S.call.duvidas=(S.call.duvidas||[]).filter(q=>normKey(q.item)!==a);await saveCall()}
      S.edit=null;S.editSure=false;S.lastUndo=null;toast(nome+' apagado.')}catch(x){S.err='Não consegui apagar agora.'}render()},
  async setTom(k){if(!S.profile||!TONS[k])return;const p={...S.profile,tom:k};try{await saveProfile(p);toast('Irineu agora no modo '+TONS[k].nome.toLowerCase()+'.')}catch(e){toast('Não consegui salvar o jeito dele agora.')}render()},
  redoOb(){const p=prof();S.redo=true;S.mode='ob';S.ob=0;S.obTom=tom();S.draft=JSON.parse(JSON.stringify({renda:p.renda,fixas:p.fixas,variaveis:p.variaveis,parcelas:p.parcelas}));S.obItems=null;render();window.scrollTo(0,0)},
  async wipe(){if(!S.confirmWipe){S.confirmWipe=true;return render()}
    try{await wipe();S.mode='ob';S.ob=0;toast('Tudo apagado.')}catch(e){toast('Não consegui apagar tudo agora.')}S.confirmWipe=false;render()},
  toastAct(){const f=toast.fn;$('#toast').hidden=true;toast.fn=null;if(f)f()},
  micSheet(){if(MICST.on&&MICST.target==='sheet')micStop();else micStart('sheet')},
  setupOpen(arg){S.setup=true;S.keyMsg='';S.impMsg='';render();if(arg==='import')setTimeout(()=>{const el=$('#imp-txt');if(el)el.scrollIntoView({block:'center'})},60)},
  setupClose(){S.setup=false;S.impRaw='';render()},
  async keySave(){const k=(($('#k-key')||{}).value||'').trim();if(!k){S.keyMsg=getKey()?'A chave atual continua salva. Pra trocar, cola a nova.':'Cola a chave primeiro.';return render()}
    S.busy=true;S.keyMsg='';render();const ai=makeAI(k);
    try{const r=await ai.json('Responda só com JSON: {"ok":true}');setKey(k);SAMPLE=ai;S.keyMsg=r&&r.ok?'Funcionou! A IA está ligada.':'Chave salva.'}
    catch(e){if(e.code==='not_granted')S.keyMsg='Essa chave não funcionou. Confere se copiou ela inteira.';
      else{setKey(k);SAMPLE=ai;S.keyMsg=e.code==='no_credit'?'A chave funciona, mas falta crédito na conta da API.':'Não consegui testar agora. Salvei a chave mesmo assim.'}}
    S.busy=false;render()},
  keyClear(){setKey('');SAMPLE=null;S.keyMsg='Chave apagada.';render()},
  async importDo(){let t=(($('#imp-txt')||{}).value||'');const f=$('#imp-file');if(!t.trim()&&f&&f.files&&f.files[0])t=await f.files[0].text();
    if(!t.trim()&&S.impRaw)t=S.impRaw;
    let j=null;try{j=JSON.parse(t.trim())}catch(e){}
    if(j&&j.irineu==='backup-cifrado'){const pw=(($('#imp-pass')||{}).value||'');S.impRaw=t;
      if(!pw){S.impMsg='Esse backup tem senha. Digita a senha dele e toca em Importar.';return render()}
      S.busy=true;S.impMsg='';render();
      try{j=await abrirBackup(j,pw)}catch(e){j=null;S.impMsg='Senha errada ou arquivo estragado. Confere e tenta de novo.'}
      S.busy=false;if(!j)return render()}
    try{if(!j||(!j.profile&&!j.gastos))throw 0;j=limpaDados(j);S.impRaw='';
      if(j.profile)S.profile=j.profile;S.gastos=j.gastos.sort((a,b)=>b.ts-a.ts);saveLocal();syncCards();
      S.impMsg='Pronto! '+S.gastos.length+(S.gastos.length===1?' lançamento importado.':' lançamentos importados.');
      if(S.profile&&S.profile.onboarded&&S.mode==='ob'){S.mode='app';S.tab='home'}}
    catch(e){S.impMsg='Não consegui ler esses dados. Copia de novo no Irineu antigo e cola aqui.'}
    render()},
  async exportFile(){const p1=(($('#bk-p1')||{}).value||''),p2=(($('#bk-p2')||{}).value||'');
    if(p1.length<8){S.bkMsg='A senha precisa de pelo menos 8 caracteres.';return render()}
    if(p1!==p2){S.bkMsg='As duas senhas não batem.';return render()}
    S.busy=true;S.bkMsg='';render();
    try{const data=JSON.stringify(await fecharBackup({v:1,exportado:new Date().toISOString(),profile:S.profile,gastos:S.gastos},p1));
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download='irineu-backup-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);S.bk=false;toast('Backup com senha baixado.')}
    catch(e){S.bkMsg='Não consegui cifrar o backup neste navegador.'}
    S.busy=false;render()},
  bkOpen(){S.bk=true;S.bkMsg='';render();focusNow('#bk-p1')},
  bkCancel(){S.bk=false;S.bkMsg='';render()},
  async pinOn(){const a=(($('#pin-n1')||{}).value||'').trim(),b=(($('#pin-n2')||{}).value||'').trim();
    if(!/^\d{4,8}$/.test(a)){S.pinMsg='Use de 4 a 8 números.';return render()}
    if(a!==b){S.pinMsg='Os dois PINs não batem.';return render()}
    S.busy=true;render();try{await pinSet(a);S.pinMsg='';toast('Trava ligada. Na próxima vez que abrir, ele pede o PIN.')}catch(e){S.pinMsg='Não consegui ligar a trava neste navegador.'}
    S.busy=false;render()},
  async pinOff(){const c=(($('#pin-cur')||{}).value||'').trim();if(!c){S.pinMsg='Digita o PIN atual pra desligar.';return render()}
    S.busy=true;render();let ok=false;try{ok=await pinOk(c)}catch(e){}S.busy=false;
    if(!ok){S.pinMsg='PIN errado.';return render()}
    try{localStorage.removeItem('irineu_pin')}catch(e){}S.pinMsg='';toast('Trava desligada.');render()},
  async unlock(){if(pinWait())return render();const el=$('#pin-in'),pin=((el&&el.value)||'').trim();
    if(!pin){S.lockMsg='Digita o PIN.';render();return focusNow('#pin-in')}
    S.busy=true;S.lockMsg='';render();let ok=false;try{ok=await pinOk(pin)}catch(e){}S.busy=false;
    if(ok){S.locked=false;S.lockForgot=false;try{localStorage.removeItem('irineu_pin_erros');localStorage.removeItem('irineu_pin_ate')}catch(e){}render();window.scrollTo(0,0);return}
    let n=1;try{n=(+localStorage.getItem('irineu_pin_erros')||0)+1;localStorage.setItem('irineu_pin_erros',n);
      if(n>=5)localStorage.setItem('irineu_pin_ate',Date.now()+Math.min(900000,30000*2**(n-5)))}catch(e){}
    S.lockMsg=n>=5?'PIN errado. Espera um pouco pra tentar de novo.':'PIN errado.';render();
    if(!pinWait())focusNow('#pin-in')},
  lockForgot(){S.lockForgot=true;S.confirmWipe=false;render()},
  lockForgotBack(){S.lockForgot=false;S.confirmWipe=false;render();focusNow('#pin-in')},
  async lockWipe(){if(!S.confirmWipe){S.confirmWipe=true;return render()}
    try{await wipe();setKey('');SAMPLE=null;['irineu_pin','irineu_pin_erros','irineu_pin_ate'].forEach(k=>localStorage.removeItem(k))}catch(e){}
    S.confirmWipe=false;S.locked=false;S.lockForgot=false;S.mode='ob';S.ob=0;S.setup=true;render();toast('Dados apagados. Dá pra importar o backup com senha agora.')},
  pvSet(o){S.pv=+o;S.fatJust=null;render()},
  fatToggle(k){if(S.fatOpen.has(k)){S.fatOpen.delete(k);S.fatJust=null}else{S.fatOpen.add(k);S.fatJust=k}render()},
  goGuardar(){const el=$('#ap-0');if(el){el.scrollIntoView({block:'center',behavior:RM.matches?'auto':'smooth'});setTimeout(()=>el.focus(),350)}},
  async wishAdd(){const n=(($('#w-nome')||{}).value||'').trim().slice(0,40),v=num(($('#w-val')||{}).value||'');if(!n||!(v>0)){toast('Escreve o desejo e quanto custa.');return}
    const p=JSON.parse(JSON.stringify(prof()));p.desejos=(p.desejos||DESEJOS0.slice()).concat({nome:n,valor:v});await saveProfile(p);toast(n+' entrou nos desejos.');render()},
  async wishDel(a){const p=JSON.parse(JSON.stringify(prof()));p.desejos=p.desejos||DESEJOS0.slice();const i=+String(a).replace('d','');p.desejos.splice(i,1);await saveProfile(p);render()},
};

/* ---------- eventos ---------- */
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.bind;if(k)S[k]=e.target.value;
});
document.addEventListener('change',e=>{if(e.target.id==='e-tipo'&&S.edit){readEdit();S.edit.d.key=e.target.value;render()}});
['pointerdown','mousedown'].forEach(ev=>document.addEventListener(ev,e=>{const a=document.activeElement;if(a&&a.id==='calltxt'&&e.target.closest&&e.target.closest('[data-keep]'))e.preventDefault()},true));
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;e.preventDefault();if(S.locked&&!LOCK_ACTS.has(b.dataset.act))return;const f=A[b.dataset.act];if(!f)return;if(CLOSERS.has(b.dataset.act))animClose(()=>f(b.dataset.arg,b));else f(b.dataset.arg,b)});

document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='pin-in'){e.preventDefault();A.unlock()}});
let HID=0;
document.addEventListener('visibilitychange',()=>{if(document.hidden){HID=Date.now();try{MICST.rec&&MICST.rec.abort()}catch(e){}return}
  if(S.ready&&!S.locked&&pinInfo()&&HID&&Date.now()-HID>RELOCK_MS){micStop();S.locked=true;S.lockMsg='';render();return}
  if(MICST.on)setTimeout(listen,300)});

boot();
