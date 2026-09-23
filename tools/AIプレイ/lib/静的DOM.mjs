// ゲームのHTML生成とクリックを実行する小さなDOM。レイアウト・描画は検査しない。
const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
export class Element {
  constructor(tag = 'section') { this.tagName = tag.toUpperCase(); this.attributes = {}; this.dataset = {}; this.children = []; this.parentElement = null; this.style = {setProperty(){}}; }
  get className() { return this.attributes.class || ''; }
  set className(value) { this.attributes.class = value; }
  get id() { return this.attributes.id || ''; }
  set id(value) { this.attributes.id = value; }
  get classList() { return { contains: c => this.className.split(/\s+/).includes(c), add: c => { this.className += ' ' + c; }, remove: c => {this.className = this.className.split(/\s+/).filter(v=>v!==c).join(' ');} }; }
  get disabled() { return 'disabled' in this.attributes; }
  set disabled(v) { if(v)this.attributes.disabled='';else delete this.attributes.disabled; }
  setAttribute(k,v) { this.attributes[k] = String(v); if(k.startsWith('data-'))this.dataset[camel(k.slice(5))] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  get textContent() { return this.children.map(c=>typeof c==='string'?c:c.textContent).join(''); }
  set textContent(value) { this.children = [String(value)]; }
  get lastElementChild() { return this.children.filter(c=>typeof c!=='string').at(-1); }
  set innerHTML(html) {
    this.children=[]; const stack=[this];
    for(const token of html.match(/<[^>]*>|[^<]+/g)||[]) {
      if(token.startsWith('</')) { stack.pop(); continue; }
      if(token.startsWith('<')) {
        const name=token.match(/^<([\w-]+)/)?.[1]; if(!name)continue;
        const el=new Element(name);
        for(const m of token.slice(name.length+1,-1).matchAll(/([\w:-]+)(?:="([^"]*)"|='([^']*)')?/g))el.setAttribute(m[1],m[2]??m[3]??'');
        stack.at(-1).append(el);
        if(!['input','br','hr','img','meta','link'].includes(name)&&!token.endsWith('/>'))stack.push(el);
      } else stack.at(-1).children.push(token);
    }
  }
  append(...els) { for(const el of els){el.parentElement=this;this.children.push(el);} }
  remove() { this.removed=true; if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this); }
  addEventListener(event,cb) { this['on'+event]=cb; }
  focus() {}
  click() { if(!this.disabled)this.onclick?.({target:this}); }
  matches(selector) {
    for(const m of selector.matchAll(/:not\(([^)]+)\)/g))if(this.matches(m[1]))return false;
    selector=selector.replace(/:not\([^)]+\)/g,'');
    const tag=selector.match(/^[a-z][\w-]*/i)?.[0]; if(tag&&this.tagName!==tag.toUpperCase())return false;
    for(const m of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)){if(!(m[1] in this.attributes)||m[2]!==undefined&&this.attributes[m[1]]!==m[2])return false;}
    selector=selector.replace(/\[[^\]]+\]/g,'');
    for(const m of selector.matchAll(/([.#])([\w-]+)/g)){if(m[1]==='.'?!this.classList.contains(m[2]):this.id!==m[2])return false;}
    return true;
  }
  querySelectorAll(selector) {
    const branches=selector.split(',').map(s=>s.trim().split(/\s+(?![^[]*\])/));
    const matches=(el,parts)=>{if(!el.matches(parts.at(-1)))return false;let parent=el.parentElement;for(let i=parts.length-2;i>=0;i--){while(parent&&!parent.matches(parts[i]))parent=parent.parentElement;if(!parent)return false;parent=parent.parentElement;}return true;};
    const found=[];const visit=el=>{for(const c of el.children)if(typeof c!=='string'){if(branches.some(b=>matches(c,b)))found.push(c);visit(c);}};visit(this);return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0]||null; }
}
export function staticDocument() {
  const body=new Element('body');
  return { body, head:new Element('head'), createElement:tag=>new Element(tag), querySelector:s=>s.startsWith('link')?{}:body.querySelector(s), querySelectorAll:s=>body.querySelectorAll(s) };
}
